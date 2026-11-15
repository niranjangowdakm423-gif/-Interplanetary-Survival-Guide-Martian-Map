"""
ARES-NAV Phase P2.2 — Habitat Suitability & Site Selection Engine
Multi-Criteria Decision Analysis (MCDA), Analytic Hierarchy Process (AHP),
HLS Plume Blast Exclusion Standoff, and Directional Horizon Sky-View Masking.
"""

import math
from typing import Dict, Any, List, Optional, Tuple

from p2.ephemeris_engine import get_planetary_ephemeris

# Standard Saaty Random Consistency Index (RI) for matrix dimension M = 1..10
SAATY_RI_TABLE = {
    1: 0.00,
    2: 0.00,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
}

# Default 6x6 AHP Pairwise Comparison Matrix (Saaty 1980 scale)
# Order: [slope, terrain_roughness, horizon_masking, isru_proximity, comm_coverage, thermal_stability]
DEFAULT_AHP_MATRIX_6X6 = [
    [1.0,   2.0,   2.0,   2.0,   3.0, 3.0],  # Slope
    [0.5,   1.0,   1.0,   1.0,   2.0, 2.0],  # Terrain Roughness (Boulders)
    [0.5,   1.0,   1.0,   1.0,   2.0, 2.0],  # Horizon Masking (Radiation topo shielding)
    [0.5,   1.0,   1.0,   1.0,   2.0, 2.0],  # ISRU Water Proximity
    [1/3.0, 0.5,   0.5,   0.5,   1.0, 1.0],  # Comm LOS Coverage
    [1/3.0, 0.5,   0.5,   0.5,   1.0, 1.0],  # Solar Insolation & Thermal Stability
]

CRITERIA_KEYS = [
    "slope",
    "terrain_roughness",
    "horizon_masking",
    "isru_proximity",
    "comm_coverage",
    "thermal_inertia",
]


def compute_ahp_weights(pairwise_matrix: Optional[List[List[float]]] = None) -> Dict[str, Any]:
    """
    Computes priority weights and Saaty Consistency Ratio (CR) from a pairwise
    comparison matrix using power iteration / column-normalized eigenvector method.
    Verifies CR < 0.10.
    """
    mat = pairwise_matrix if pairwise_matrix is not None else DEFAULT_AHP_MATRIX_6X6
    m = len(mat)
    if m == 0 or any(len(row) != m for row in mat):
        raise ValueError("AHP pairwise matrix must be non-empty and square.")

    # Power iteration for principal right eigenvector
    vec = [1.0 / m] * m
    for _ in range(30):
        nxt = [0.0] * m
        for i in range(m):
            s = 0.0
            for j in range(m):
                s += float(mat[i][j]) * vec[j]
            nxt[i] = s
        total = sum(nxt)
        if total <= 0:
            break
        vec = [v / total for v in nxt]

    # Compute principal eigenvalue lambda_max = mean((A * w)_i / w_i)
    aw = [sum(float(mat[i][j]) * vec[j] for j in range(m)) for i in range(m)]
    lambda_max = sum(aw[i] / max(1e-12, vec[i]) for i in range(m)) / float(m)

    ci = (lambda_max - m) / float(max(1, m - 1)) if m > 1 else 0.0
    ri = SAATY_RI_TABLE.get(m, 1.24)
    cr = ci / ri if ri > 0 else 0.0

    weights_dict = {}
    for idx, key in enumerate(CRITERIA_KEYS[:m]):
        weights_dict[key] = round(vec[idx], 4)

    return {
        "weights": weights_dict,
        "matrix_dimension": m,
        "lambda_max": round(lambda_max, 4),
        "consistency_index_ci": round(ci, 5),
        "random_index_ri": round(ri, 4),
        "consistency_ratio_cr": round(cr, 5),
        "is_consistent": bool(cr < 0.10),
    }


def compute_directional_sky_view_factor(
    elevation_grid: List[List[float]],
    gx: int,
    gy: int,
    cell_size_m: float = 25.0,
    max_radius_cells: int = 12,
) -> Tuple[float, float, float]:
    """
    Computes the solid-angle Sky View Factor (SVF) at grid cell (gx, gy) by ray-marching
    along 8 cardinal and intercardinal azimuth directions:
        F_sky = (1 / N_dir) * sum(cos^2(theta_rim_d))
    Returns:
        (f_sky, mean_rim_angle_deg, aspect_rad)
    where f_sky in [0.0, 1.0], mean_rim_angle_deg in [0.0, 90.0],
    and aspect_rad is the local terrain downslope azimuth in radians (0 = North, pi/2 = East).
    """
    n_rows = len(elevation_grid)
    n_cols = len(elevation_grid[0]) if n_rows > 0 else 0
    z0 = float(elevation_grid[gy][gx])

    directions = [
        (0, -1),   # N
        (1, -1),   # NE
        (1, 0),    # E
        (1, 1),    # SE
        (0, 1),    # S
        (-1, 1),   # SW
        (-1, 0),   # W
        (-1, -1),  # NW
    ]

    cos2_sum = 0.0
    rim_angles_deg = []

    for dx, dy in directions:
        step_dist_m = math.hypot(dx, dy) * cell_size_m
        max_angle_rad = 0.0
        for step in range(1, max_radius_cells + 1):
            nx = gx + dx * step
            ny = gy + dy * step
            if nx < 0 or nx >= n_cols or ny < 0 or ny >= n_rows:
                break
            dz = float(elevation_grid[ny][nx]) - z0
            if dz > 0.0:
                dist_m = step * step_dist_m
                ang = math.atan2(dz, dist_m)
                if ang > max_angle_rad:
                    max_angle_rad = ang
        cos_val = math.cos(max_angle_rad)
        cos2_sum += cos_val * cos_val
        rim_angles_deg.append(math.degrees(max_angle_rad))

    f_sky = cos2_sum / float(len(directions))
    mean_rim_deg = sum(rim_angles_deg) / float(len(directions))

    # Local aspect from central differences
    x_left = max(0, gx - 1)
    x_right = min(n_cols - 1, gx + 1)
    y_up = max(0, gy - 1)
    y_down = min(n_rows - 1, gy + 1)
    dz_dx = (float(elevation_grid[gy][x_right]) - float(elevation_grid[gy][x_left])) / max(1.0, (x_right - x_left) * cell_size_m)
    dz_dy = (float(elevation_grid[y_down][gx]) - float(elevation_grid[y_up][gx])) / max(1.0, (y_down - y_up) * cell_size_m)
    # Downslope vector is (-dz_dx, -dz_dy); in grid coords +x is East, +y is South
    aspect_rad = math.atan2(-dz_dx, dz_dy)  # 0 = North, pi/2 = East, pi = South
    return round(f_sky, 4), round(mean_rim_deg, 2), aspect_rad


def compute_slope_factor_score(slope_deg: float, max_slope_deg: float = 8.0) -> float:
    """
    Evaluates terrain slope score in [0, 100]:
    - Optimal flat foundation (< 5.0 deg): 85..100 points (100 at 0 deg, 85 at 5 deg)
    - Acceptable leveling zone (5.0 deg to max_slope_deg): linear ramp 85 -> 40 points
    - Exceeding max_slope_deg: 0.0 (disqualified by hard constraint)
    """
    if math.isnan(slope_deg) or slope_deg < 0.0:
        return 0.0
    if slope_deg > max_slope_deg:
        return 0.0
    if slope_deg <= 5.0:
        return round(100.0 - 3.0 * slope_deg, 2)
    span = max(0.5, max_slope_deg - 5.0)
    ratio = (slope_deg - 5.0) / span
    return round(max(0.0, 85.0 * (1.0 - 0.55 * ratio)), 2)


def compute_boulder_factor_score(boulder_pct: float, max_boulder_pct: float = 20.0) -> float:
    """
    Evaluates boulder density / surface roughness score in [0, 100]:
    - Optimal regolith pad (< 15% rock abundance): 75..100 points
    - Up to max_boulder_pct: linear decay
    - Exceeding max_boulder_pct: 0.0 (disqualified by hard constraint)
    """
    if math.isnan(boulder_pct) or boulder_pct < 0.0:
        return 0.0
    if boulder_pct > max_boulder_pct:
        return 0.0
    if boulder_pct <= 15.0:
        return round(100.0 - (25.0 / 15.0) * boulder_pct, 2)
    span = max(0.5, max_boulder_pct - 15.0)
    ratio = (boulder_pct - 15.0) / span
    return round(max(0.0, 75.0 * (1.0 - 0.65 * ratio)), 2)


def compute_daily_solar_insolation_score(
    base_insolation_w_m2: float,
    site_lat_deg: float,
    subsolar_lat_deg: float,
    slope_deg: float,
    aspect_rad: float,
    f_sky: float,
) -> Tuple[float, float]:
    """
    Computes daily cumulative solar insolation (Wh/m^2/sol) and normalized score [0, 100],
    adjusted for local slope, equator-facing aspect, and horizon sky-view factor.
    """
    # Noon solar zenith angle at horizontal surface
    noon_zenith_rad = math.radians(abs(site_lat_deg - subsolar_lat_deg))
    slope_rad = math.radians(min(45.0, max(0.0, slope_deg)))

    # Equatorward azimuth: South (pi) in Northern hemisphere, North (0) in Southern hemisphere
    equator_azimuth = math.pi if site_lat_deg >= subsolar_lat_deg else 0.0
    aspect_alignment = math.cos(aspect_rad - equator_azimuth)  # +1 if facing sun at noon, -1 if facing away

    # Effective incidence modifier from slope tilt toward/away from sun
    tilt_gain = 1.0 + 0.35 * math.sin(slope_rad) * aspect_alignment
    tilt_gain = max(0.55, min(1.25, tilt_gain))

    # Peak flux ~590 W/m^2 at mean Mars distance, integrated over ~12.3 daylight hours (sinusoidal envelope 2/pi)
    ref_peak_flux = max(320.0, min(680.0, base_insolation_w_m2 if base_insolation_w_m2 > 80.0 else 490.0 * max(0.25, math.cos(noon_zenith_rad))))
    effective_daily_wh_m2 = ref_peak_flux * (2.0 / math.pi) * 12.32 * tilt_gain * (0.35 + 0.65 * f_sky)

    # Normalize against typical Martian clear-sky range [1200, 4200] Wh/m^2/sol
    score = ((effective_daily_wh_m2 - 1000.0) / 3000.0) * 100.0
    score = max(10.0, min(100.0, score))
    return round(score, 2), round(effective_daily_wh_m2, 1)


def compute_isru_proximity_score(dist_to_isru_m: float, local_hydration_pct: float) -> float:
    """
    Evaluates proximity to ISRU water/hydration POIs (< 1500m preferred) combined with
    local subsurface hydration wt%.
    """
    if dist_to_isru_m <= 1500.0:
        dist_score = 100.0 - 25.0 * (dist_to_isru_m / 1500.0)
    else:
        # Decay smoothly beyond 1500m
        dist_score = 75.0 * math.exp(-(dist_to_isru_m - 1500.0) / 1200.0)

    hyd_bonus = min(20.0, max(0.0, local_hydration_pct * 1.2))
    return round(min(100.0, 0.82 * dist_score + 0.18 * (50.0 + hyd_bonus * 2.5)), 2)


def compute_horizon_masking_score(f_sky: float, local_rad_uSv_hr: float, base_rad_uSv_hr: float) -> float:
    """
    Evaluates topographic radiation shielding score from solid-angle sky obstruction
    F_sky = cos^2(theta_rim) and local atmospheric/terrain radiation attenuation.
    Note: Typical Martian terrain provides 2%-15% solid-angle GCR reduction; mapped to a
    normalized [0, 100] comparative siting score across the sector.
    """
    obstruction_frac = max(0.0, min(1.0, 1.0 - f_sky))
    # 12% solid-angle obstruction is near the maximum realistic crater-wall/scarp shielding
    geom_score = min(100.0, (obstruction_frac / 0.10) * 65.0 + 35.0)

    if base_rad_uSv_hr > 0:
        rad_ratio = local_rad_uSv_hr / base_rad_uSv_hr
        rad_score = max(10.0, min(100.0, (1.25 - rad_ratio) / 0.45 * 100.0))
    else:
        rad_score = 50.0

    return round(0.60 * geom_score + 0.40 * rad_score, 2)


def evaluate_habitat_suitability(
    site_data: Dict[str, Any],
    weights: Optional[Dict[str, float]] = None,
    thresholds: Optional[Dict[str, float]] = None,
    landing_zone_cell: Optional[List[int]] = None,
    bounding_box: Optional[Dict[str, int]] = None,
    utc_iso: Optional[str] = None,
    regolith_shielding_m: float = 2.0,
) -> Dict[str, Any]:
    """
    Executes Multi-Criteria Decision Analysis (MCDA) with AHP priority weights across
    the 80x80 exploration grid (or a specified candidate bounding box).
    Enforces Boolean engineering constraints:
      1. Terrain slope <= max_slope_deg (default 8.0 deg; hard cap <= 12.0 deg)
      2. Boulder abundance <= max_boulder_pct (default 20.0%; optimal < 15.0%)
      3. HLS landing blast exclusion buffer: min_blast_buffer_m <= d_lz <= max_logistics_buffer_m
         (default 800m - 2000m/3000m)
    Returns full suitability raster, top candidate breakdowns, specialized infrastructure cells
    (Habitat, Fission Surface Power, Solar Array), AHP consistency audit, and provenance disclosures.
    """
    site = site_data["site"]
    layers = site_data["layers"]
    n_grid = int(site.get("grid_size", 80))
    cell_size_m = 25.0  # 2000m x 2000m sector across 80x80 grid

    # 1. Configure engineering thresholds
    thresh = thresholds if isinstance(thresholds, dict) else {}
    max_slope_deg = float(thresh.get("max_slope_deg", 8.0))
    max_boulder_pct = float(thresh.get("max_boulder_pct", 20.0))
    min_blast_buffer_m = float(thresh.get("min_blast_buffer_m", 800.0))
    max_logistics_buffer_m = float(thresh.get("max_logistics_buffer_m", 2000.0))

    # 2. Compute AHP baseline weights & merge custom overrides
    ahp_audit = compute_ahp_weights(DEFAULT_AHP_MATRIX_6X6)
    active_weights = dict(ahp_audit["weights"])

    if isinstance(weights, dict) and len(weights) > 0:
        # Support aliases between NEXT_DEVELOPER_START_HERE.md and P2_ARCHITECTURE_DESIGN.md
        w_slope = float(weights.get("slope", weights.get("terrain_slope", active_weights["slope"])))
        w_boulder = float(weights.get("terrain_roughness", weights.get("boulder", weights.get("boulder_density", active_weights["terrain_roughness"]))))
        w_mask = float(weights.get("horizon_masking", weights.get("radiation_shielding", active_weights["horizon_masking"])))
        w_isru = float(weights.get("isru_proximity", weights.get("isru", active_weights["isru_proximity"])))
        w_comm = float(weights.get("comm_coverage", weights.get("comm_los", active_weights["comm_coverage"])))
        w_solar = float(weights.get("thermal_inertia", weights.get("solar_insolation", weights.get("thermal_stability", active_weights["thermal_inertia"]))))
        w_sum = max(1e-9, w_slope + w_boulder + w_mask + w_isru + w_comm + w_solar)
        active_weights = {
            "slope": round(w_slope / w_sum, 4),
            "terrain_roughness": round(w_boulder / w_sum, 4),
            "horizon_masking": round(w_mask / w_sum, 4),
            "isru_proximity": round(w_isru / w_sum, 4),
            "comm_coverage": round(w_comm / w_sum, 4),
            "thermal_inertia": round(w_solar / w_sum, 4),
        }

    # 3. Landing zone coordinates
    if isinstance(landing_zone_cell, (list, tuple)) and len(landing_zone_cell) >= 2:
        lz_gx = max(0, min(n_grid - 1, int(landing_zone_cell[0])))
        lz_gy = max(0, min(n_grid - 1, int(landing_zone_cell[1])))
    else:
        lz_gx = int(site["habitat"]["gx"])
        lz_gy = int(site["habitat"]["gy"])

    # 4. Candidate bounding box
    if isinstance(bounding_box, dict):
        gx_min = max(0, int(bounding_box.get("gx_min", 0)))
        gx_max = min(n_grid - 1, int(bounding_box.get("gx_max", n_grid - 1)))
        gy_min = max(0, int(bounding_box.get("gy_min", 0)))
        gy_max = min(n_grid - 1, int(bounding_box.get("gy_max", n_grid - 1)))
    else:
        gx_min, gx_max = 0, n_grid - 1
        gy_min, gy_max = 0, n_grid - 1

    # 5. Query planetary ephemeris for solar geometry & insolation
    site_lat = float(site["coordinates"]["lat"])
    site_lon = float(site["coordinates"]["lon"])
    ephem = get_planetary_ephemeris(
        utc_str=utc_iso or "2026-11-15T12:00:00Z",
        site_lat=site_lat,
        site_lon=site_lon,
        site_id=site["id"],
        allow_fallback=True,
    )
    subsolar_lat = float(ephem["ephemeris"].get("sub_solar_latitude_deg", 0.0))
    base_insolation = float(ephem["ephemeris"].get("surface_insolation_w_m2", 490.0))

    # 6. Identify ISRU / Hydration POIs
    pois = site.get("pois", [])
    isru_pois = [p for p in pois if p.get("category") == "isru" or float(p.get("hydration_pct", 0.0)) >= 8.0]
    if not isru_pois and pois:
        isru_pois = [max(pois, key=lambda p: float(p.get("hydration_pct", 0.0)))]

    # 7. Determine uncertainty penalty based on layer provenance
    site_id_lower = str(site.get("id", "jezero")).lower()
    has_verified_boulder_swath = (site_id_lower == "jezero")
    base_uncertainty_penalty = 0.0 if has_verified_boulder_swath else 0.06
    missing_data_penalty_applied = not has_verified_boulder_swath

    elev_grid = layers["elevation"]
    slope_grid = layers["slope"]
    boulder_grid = layers["boulder"]
    hyd_grid = layers["hydration"]
    rad_grid = layers["radiation"]
    comm_grid = layers["comm_los"]
    base_rad = float(site.get("base_radiation_uSv_hr", 26.67))

    suitability_grid = [[0.0 for _ in range(n_grid)] for _ in range(n_grid)]
    candidates = []
    solar_candidates = []
    fission_candidates = []

    evaluated_cells = 0
    passed_cells = 0

    for gy in range(n_grid):
        for gx in range(n_grid):
            in_bbox = (gx_min <= gx <= gx_max) and (gy_min <= gy <= gy_max)
            if not in_bbox:
                suitability_grid[gy][gx] = 0.0
                continue

            evaluated_cells += 1

            try:
                s_deg = float(slope_grid[gy][gx])
                b_pct = float(boulder_grid[gy][gx])
                hyd_pct = float(hyd_grid[gy][gx])
                rad_val = float(rad_grid[gy][gx])
                comm_pct = float(comm_grid[gy][gx])
                z_val = float(elev_grid[gy][gx])
            except (TypeError, ValueError, IndexError):
                missing_data_penalty_applied = True
                suitability_grid[gy][gx] = 0.0
                continue

            if any(math.isnan(v) for v in (s_deg, b_pct, hyd_pct, rad_val, comm_pct, z_val)):
                missing_data_penalty_applied = True
                suitability_grid[gy][gx] = 0.0
                continue

            # Distance to Landing Zone (m)
            d_lz_m = math.hypot(gx - lz_gx, gy - lz_gy) * cell_size_m

            # Distance to nearest ISRU water source (m)
            if isru_pois:
                d_isru_m = min(math.hypot(gx - int(p["gx"]), gy - int(p["gy"])) * cell_size_m for p in isru_pois)
            else:
                d_isru_m = 1000.0

            # Directional horizon sky-view factor F_sky = cos^2(theta_rim)
            f_sky, mean_rim_deg, aspect_rad = compute_directional_sky_view_factor(
                elev_grid, gx, gy, cell_size_m=cell_size_m, max_radius_cells=10
            )

            # Standardized factor scores [0, 100]
            f_slope = compute_slope_factor_score(s_deg, max_slope_deg=max_slope_deg)
            f_boulder = compute_boulder_factor_score(b_pct, max_boulder_pct=max_boulder_pct)
            f_solar, daily_wh_m2 = compute_daily_solar_insolation_score(
                base_insolation, site_lat, subsolar_lat, s_deg, aspect_rad, f_sky
            )
            f_isru = compute_isru_proximity_score(d_isru_m, hyd_pct)
            f_masking = compute_horizon_masking_score(f_sky, rad_val, base_rad)
            f_comm = round(max(0.0, min(100.0, comm_pct)), 2)

            # Boolean engineering constraints
            c_slope = 1.0 if s_deg <= max_slope_deg else 0.0
            c_boulder = 1.0 if b_pct <= max_boulder_pct else 0.0
            c_lz = 1.0 if (min_blast_buffer_m <= d_lz_m <= max_logistics_buffer_m) else 0.0
            c_all = c_slope * c_boulder * c_lz

            # Weighted Linear Combination (WLC)
            wlc_raw = (
                active_weights["slope"] * f_slope
                + active_weights["terrain_roughness"] * f_boulder
                + active_weights["horizon_masking"] * f_masking
                + active_weights["isru_proximity"] * f_isru
                + active_weights["comm_coverage"] * f_comm
                + active_weights["thermal_inertia"] * f_solar
            )

            final_score = round(wlc_raw * c_all * (1.0 - base_uncertainty_penalty), 2)
            suitability_grid[gy][gx] = final_score

            if c_all > 0.0:
                passed_cells += 1
                candidates.append({
                    "cell": [gx, gy],
                    "score": final_score,
                    "wlc_unconstrained_score": round(wlc_raw, 2),
                    "slope_deg": round(s_deg, 2),
                    "boulder_pct": round(b_pct, 1),
                    "elevation_m": round(z_val, 1),
                    "distance_to_lz_m": round(d_lz_m, 1),
                    "isru_distance_m": round(d_isru_m, 1),
                    "horizon_sky_view_factor": round(f_sky, 4),
                    "sky_obstruction_pct": round((1.0 - f_sky) * 100.0, 2),
                    "mean_horizon_rim_angle_deg": mean_rim_deg,
                    "daily_insolation_wh_m2": daily_wh_m2,
                    "comm_los_pct": round(comm_pct, 1),
                    "radar_scores": {
                        "slope_score": f_slope,
                        "boulder_score": f_boulder,
                        "solar_insolation_score": f_solar,
                        "isru_proximity_score": f_isru,
                        "horizon_masking_score": f_masking,
                        "comm_los_score": f_comm,
                    },
                })

            # Track specialized infrastructure candidates outside blast zone
            if d_lz_m >= min_blast_buffer_m and s_deg <= 10.0 and b_pct <= 25.0:
                solar_score = 0.55 * f_solar + 0.25 * f_slope + 0.20 * (f_sky * 100.0)
                solar_candidates.append(([gx, gy], solar_score, s_deg, daily_wh_m2))
                fission_score = 0.50 * f_masking + 0.30 * f_slope + 0.20 * f_boulder
                fission_candidates.append(([gx, gy], fission_score, f_sky))

    # 8. Rank candidates with minimum spatial separation (150m between top reported candidates)
    candidates.sort(key=lambda c: c["score"], reverse=True)
    top_candidates = []
    for cand in candidates:
        cx, cy = cand["cell"]
        if all(math.hypot(cx - tc["cell"][0], cy - tc["cell"][1]) * cell_size_m >= 150.0 for tc in top_candidates):
            rank_idx = len(top_candidates) + 1
            cand_copy = dict(cand)
            cand_copy["rank"] = rank_idx
            cand_copy["primary_driver"] = (
                f"Low foundation slope ({cand['slope_deg']}°), minimal boulder hazard ({cand['boulder_pct']}%), "
                f"and safe {cand['distance_to_lz_m']:.0f}m HLS blast standoff ({cand['daily_insolation_wh_m2']:.0f} Wh/m²/sol)."
            )
            top_candidates.append(cand_copy)
            if len(top_candidates) >= 5:
                break

    if top_candidates:
        optimal_hab_cell = top_candidates[0]["cell"]
        max_score = top_candidates[0]["score"]
    else:
        optimal_hab_cell = [lz_gx, lz_gy]
        max_score = 0.0

    # 9. Select optimal Solar Farm cell (within 150m - 600m of Habitat, maximizing solar insolation)
    hx, hy = optimal_hab_cell
    valid_solar = [
        sc for sc in solar_candidates
        if 125.0 <= math.hypot(sc[0][0] - hx, sc[0][1] - hy) * cell_size_m <= 650.0
    ]
    if valid_solar:
        valid_solar.sort(key=lambda x: x[1], reverse=True)
        optimal_solar_cell = valid_solar[0][0]
    elif solar_candidates:
        solar_candidates.sort(key=lambda x: x[1], reverse=True)
        optimal_solar_cell = solar_candidates[0][0]
    else:
        optimal_solar_cell = [min(n_grid - 1, hx + 4), hy]

    # 10. Select optimal Fission Surface Power cell (500m - 1200m radiation standoff from Habitat)
    valid_fission = [
        fc for fc in fission_candidates
        if 500.0 <= math.hypot(fc[0][0] - hx, fc[0][1] - hy) * cell_size_m <= 1250.0
    ]
    if valid_fission:
        valid_fission.sort(key=lambda x: x[1], reverse=True)
        optimal_fission_cell = valid_fission[0][0]
    elif fission_candidates:
        fission_candidates.sort(key=lambda x: x[1], reverse=True)
        optimal_fission_cell = fission_candidates[0][0]
    else:
        optimal_fission_cell = [max(0, hx - 10), min(n_grid - 1, hy + 10)]

    pass_rate_pct = round((passed_cells / float(max(1, evaluated_cells))) * 100.0, 2)

    # 11. Regolith bulk shielding calculation (g/cm^2)
    # Martian basaltic regolith bulk density ~ 1.52 g/cm^3 -> 1m = 152 g/cm^2
    regolith_column_g_cm2 = round(max(0.0, regolith_shielding_m) * 152.0, 1)
    spallation_warning = regolith_column_g_cm2 < 50.0

    best_cand = top_candidates[0] if top_candidates else None
    if best_cand:
        eng_rationale = (
            f"Optimal Habitat Basecamp sited at grid {optimal_hab_cell} ({best_cand['distance_to_lz_m']:.0f}m from Landing Pad) "
            f"to prevent hypersonic HLS plume ejecta scouring (>800m standoff) while maintaining {best_cand['slope_deg']}° foundation levelness, "
            f"{best_cand['boulder_pct']}% boulder clearance, and {best_cand['isru_distance_m']:.0f}m proximity to ISRU water feedstock."
        )
    else:
        eng_rationale = (
            "No candidate cells satisfied all strict Boolean engineering thresholds simultaneously. "
            "Relax max_slope_deg, max_boulder_pct, or blast buffer bounds to identify contingency sites."
        )

    return {
        "site_id": site["id"],
        "site_name": site["name"],
        "landing_zone_cell": [lz_gx, lz_gy],
        "optimal_habitat_cell": optimal_hab_cell,
        "optimal_fission_power_cell": optimal_fission_cell,
        "optimal_solar_farm_cell": optimal_solar_cell,
        "suitability_score_max": max_score,
        "hard_constraint_pass_rate_pct": pass_rate_pct,
        "evaluated_cells_count": evaluated_cells,
        "passed_cells_count": passed_cells,
        "active_weights": active_weights,
        "ahp_consistency_audit": ahp_audit,
        "thresholds_applied": {
            "max_slope_deg": max_slope_deg,
            "max_boulder_pct": max_boulder_pct,
            "min_blast_buffer_m": min_blast_buffer_m,
            "max_logistics_buffer_m": max_logistics_buffer_m,
        },
        "top_candidates": top_candidates,
        "suitability_grid_80x80": suitability_grid,
        "engineering_rationale": eng_rationale,
        "radiation_shielding_analysis": {
            "geometric_sky_view_factor": best_cand["horizon_sky_view_factor"] if best_cand else 0.95,
            "geometric_gcr_reduction_pct": best_cand["sky_obstruction_pct"] if best_cand else 5.0,
            "specified_regolith_overburden_m": regolith_shielding_m,
            "regolith_mass_overburden_g_cm2": regolith_column_g_cm2,
            "secondary_neutron_spallation_hazard": spallation_warning,
            "shielding_verdict": (
                "WARNING_SPALLATION_AMPLIFICATION: Regolith roof < 50 g/cm² (~0.33m) increases secondary albedo neutron dose."
                if spallation_warning
                else f"VERIFIED_BULK_SHIELDING: {regolith_shielding_m}m regolith overburden ({regolith_column_g_cm2} g/cm²) suppresses GCR/SPE flux."
            ),
        },
        "uncertainty_disclosures": {
            "missing_data_penalty_applied": missing_data_penalty_applied,
            "uncertainty_penalty_fraction": base_uncertainty_penalty,
            "terrain_masking_vs_bulk_shielding_note": (
                "Horizon masking (F_sky = cos^2(theta_rim)) reduces solid-angle exposure to isotropic primary GCR "
                "by ~2%-15% depending on crater wall / scarp geometry, and is partially offset by backscattered "
                "albedo neutrons (MSL RAD; Hassler et al., 2014). Physical regolith mass overburden (>50 g/cm², "
                "1.5-3.0m) is mandatory for crew habitat radiation protection."
            ),
            "hls_plume_blast_exclusion_basis": (
                f"Minimum {min_blast_buffer_m:.0f}m landing standoff enforced per HLS plume-surface interaction "
                "criteria (Metzger et al., 2009; Immer et al., 2011) to prevent supersonic regolith ejecta pitting."
            ),
        },
        "provenance": {
            "status": "CALCULATED_MCDA_AHP",
            "ephemeris_source": ephem["provenance"]["status"],
            "boulder_layer_source": "VERIFIED_HIRISE_RDRV11" if has_verified_boulder_swath else "PARTIAL_MOLA_ROUGHNESS_PROXY",
            "slope_layer_source": "CALCULATED_HORN_GRADIENT_MOLA",
        },
    }
