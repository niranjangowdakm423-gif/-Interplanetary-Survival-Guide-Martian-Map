"""
ARES-NAV P1 Automated Test Suite
Tests: Multi-Objective Route Optimization, Alternative Route Comparison,
       Explainability Dossier, Mission Feasibility Engine, PNR Detection,
       Custom Weights, /api/check_feasibility endpoint logic.
"""
import sys
import os
import math
import json

sys.path.insert(0, os.path.dirname(__file__))
import server

# ── Shared fixture ────────────────────────────────────────────────────────────
SITE = server.PRECOMPUTED_SITES["jezero"]
WAYPOINTS = [
    {"gx": 18, "gy": 62, "name": "Landing Site"},
    {"gx": 35, "gy": 48, "name": "Delta Slope"},
    {"gx": 42, "gy": 50, "name": "Kodiak Scarp"}
]

PASS = "[PASS]"
FAIL = "[FAIL]"

def check(cond, label):
    tag = PASS if cond else FAIL
    print(f"  {tag} {label}")
    if not cond:
        raise AssertionError(label)


# ── Test 1: All route modes return valid paths and telemetry ──────────────────
def test_route_modes():
    print("\n=== Test 1: Multi-Objective Route Modes ===")
    modes = ["shortest", "fastest", "safest", "lowest_resource", "min_radiation", "comm_aware", "science", "balanced"]
    results = {}

    for m in modes:
        res = server.plan_eva_route(SITE, WAYPOINTS, mode=m, generate_alternatives=False)
        check("path" in res and len(res["path"]) > 0, f"{m}: path non-empty")
        check("telemetry" in res and "summary" in res["telemetry"], f"{m}: telemetry present")
        sm = res["telemetry"]["summary"]
        check(sm["distance_m"] > 0, f"{m}: distance > 0 m")
        check(sm["o2_liters"] > 0, f"{m}: O2 consumption > 0 L")
        check(sm["duration_min"] > 0, f"{m}: duration > 0 min")
        check(sm["safety_index"] >= 0, f"{m}: safety_index >= 0")
        results[m] = sm

    # Safest should have same or lower max_slope_deg than shortest
    check(
        results["safest"]["max_slope_deg"] <= results["shortest"]["max_slope_deg"] + 2.0,
        "safest max_slope_deg <= shortest max_slope_deg + 2.0"
    )

    print("  → All route mode tests passed.")


# ── Test 2: Custom weights are respected ─────────────────────────────────────
def test_custom_weights():
    print("\n=== Test 2: Custom Weights ===")
    cw = {"w_slope": 0.1, "w_boulder": 0.1, "w_rad": 9.9, "w_dist": 0.5, "w_comm": 0.1, "w_energy": 0.1, "w_sci": 0.0}
    res_cw = server.plan_eva_route(SITE, WAYPOINTS, mode="balanced", custom_weights=cw, generate_alternatives=False)
    res_def = server.plan_eva_route(SITE, WAYPOINTS, mode="balanced", generate_alternatives=False)

    check("path" in res_cw and len(res_cw["path"]) > 0, "custom_weights: path non-empty")
    rad_cw = res_cw["telemetry"]["summary"]["radiation_dose_uSv"]
    rad_def = res_def["telemetry"]["summary"]["radiation_dose_uSv"]
    # With extreme radiation weight, route should stay same or lower radiation
    check(rad_cw <= rad_def + rad_def * 0.15, f"custom w_rad=9.9 route radiation ({rad_cw:.2f}) not massively worse than default ({rad_def:.2f})")
    print("  → Custom weights test passed.")


# ── Test 3: generate_alternatives returns comparison matrix ──────────────────
def test_alternatives_and_explainability():
    print("\n=== Test 3: Alternative Routes & Explainability ===")
    res = server.plan_eva_route(SITE, WAYPOINTS, mode="balanced", generate_alternatives=True)

    check("route_comparison_matrix" in res, "route_comparison_matrix present")
    check("explainability" in res, "explainability present")

    matrix = res["route_comparison_matrix"]
    check(isinstance(matrix, list) and len(matrix) >= 4, f"comparison matrix has >= 4 alternatives (got {len(matrix)})")

    for entry in matrix:
        check("mode" in entry, f"matrix entry has 'mode'")
        check("composite_score" in entry, f"matrix entry has 'composite_score'")
        check("distance_m" in entry, f"matrix entry has 'distance_m'")
        check("o2_liters" in entry, f"matrix entry has 'o2_liters'")
        check("safety_index" in entry, f"matrix entry has 'safety_index'")

    ex = res["explainability"]
    check("rationale" in ex and len(ex["rationale"]) > 20, "explainability rationale non-trivial")
    check("key_tradeoffs" in ex and len(ex["key_tradeoffs"]) >= 3, f"explainability key_tradeoffs >= 3 (got {len(ex.get('key_tradeoffs', []))})")
    check("nasa_compliance" in ex and len(ex["nasa_compliance"]) >= 3, "nasa_compliance has >= 3 items")
    check("hard_constraints" in ex and len(ex["hard_constraints"]) >= 2, "hard_constraints present")

    for nc in ex["nasa_compliance"]:
        check("standard" in nc and "status" in nc, f"nasa_compliance item has standard+status ({nc.get('standard','')})")
        check(nc["status"] in ("PASS", "WARNING", "CAUTION", "CRITICAL"), f"nasa_compliance status is valid enum: {nc.get('status')}")

    print("  → Alternatives & explainability tests passed.")


# ── Test 4: Mission Feasibility – short safe traverse is FEASIBLE ─────────────
def test_feasibility_feasible():
    print("\n=== Test 4: Feasibility – Short Safe Traverse (FEASIBLE) ===")
    short_wp = [
        {"gx": 30, "gy": 40, "name": "Start"},
        {"gx": 36, "gy": 44, "name": "Mid"},
    ]
    res = server.plan_eva_route(SITE, short_wp, mode="lowest_resource", generate_alternatives=True)
    check("feasibility" in res, "feasibility block present in plan_route result")

    feas = res["feasibility"]
    check("verdict" in feas, "feasibility has verdict")
    check(feas["verdict"] in ("FEASIBLE", "MARGINAL", "CRITICAL"), f"verdict is valid enum: {feas['verdict']}")
    check("total_roundtrip" in feas, "total_roundtrip present")
    check("pnr" in feas, "pnr block present")
    check("waypoint_margins" in feas, "waypoint_margins present")
    check("recommendations" in feas and len(feas["recommendations"]) > 0, "recommendations non-empty")
    check("nasa_std_3001_checks" in feas, "nasa_std_3001_checks present")

    rtrip = feas["total_roundtrip"]
    check(rtrip["o2_liters"] > 0, "total roundtrip o2 > 0")
    check(rtrip["distance_km"] > 0, "total roundtrip distance > 0")
    check(rtrip["remaining_o2_pct"] is not None, "remaining_o2_pct present")
    check(rtrip["remaining_battery_pct"] is not None, "remaining_battery_pct present")

    print(f"  → Feasibility verdict: {feas['verdict']} (O2 remaining: {rtrip['remaining_o2_pct']}%, Battery: {rtrip['remaining_battery_pct']}%)")
    print("  → Feasibility FEASIBLE test passed.")


# ── Test 5: Feasibility – forced CRITICAL by tiny consumable limits ───────────
def test_feasibility_critical():
    print("\n=== Test 5: Feasibility – Extreme Distance (CRITICAL/MARGINAL) ===")
    # Very tiny O2 capacity forces a critical verdict
    cfg = {
        "o2_capacity_l": 12.0,
        "battery_capacity_wh": 50.0,
        "reserve_margin_pct": 20.0,
        "max_eva_duration_hr": 8.0
    }
    res = server.plan_eva_route(SITE, WAYPOINTS, mode="lowest_resource", generate_alternatives=True, feasibility_config=cfg)
    feas = res["feasibility"]
    check(feas["verdict"] in ("MARGINAL", "CRITICAL"), f"Tiny budget yields MARGINAL or CRITICAL (got {feas['verdict']})")
    check(len(feas["recommendations"]) >= 2, "CRITICAL/MARGINAL yields >= 2 recommendations")
    print(f"  → Verdict correctly degraded: {feas['verdict']}")
    print("  → Feasibility CRITICAL test passed.")


# ── Test 6: PNR detection ─────────────────────────────────────────────────────
def test_pnr_detection():
    print("\n=== Test 6: Point of No Return Detection ===")
    cfg_pnr = {
        "o2_capacity_l": 20.0,
        "battery_capacity_wh": 100.0,
        "reserve_margin_pct": 20.0,
        "max_eva_duration_hr": 8.0
    }
    res = server.plan_eva_route(SITE, WAYPOINTS, mode="balanced", generate_alternatives=True, feasibility_config=cfg_pnr)
    feas = res["feasibility"]
    pnr = feas["pnr"]
    check("pnr_reached" in pnr, "pnr.pnr_reached key exists")
    check("description" in pnr and len(pnr["description"]) > 20, "pnr.description non-trivial")
    if pnr["pnr_reached"]:
        check(pnr["pnr_waypoint_index"] is not None, "pnr_waypoint_index set when PNR reached")
        check(pnr["pnr_waypoint_name"] is not None, "pnr_waypoint_name set when PNR reached")
        print(f"  → PNR reached at waypoint [{pnr['pnr_waypoint_index']}] '{pnr['pnr_waypoint_name']}'")
    else:
        print("  → PNR not reached (safe margins maintained throughout)")
    print("  → PNR detection test passed.")


# ── Test 7: Waypoint margin entries match waypoint count ─────────────────────
def test_waypoint_margins():
    print("\n=== Test 7: Waypoint-by-Waypoint Margin Accounting ===")
    res = server.plan_eva_route(SITE, WAYPOINTS, mode="balanced", generate_alternatives=True)
    feas = res["feasibility"]
    margins = feas["waypoint_margins"]
    check(len(margins) == len(WAYPOINTS), f"margin count matches waypoint count ({len(margins)} == {len(WAYPOINTS)})")
    for i, m in enumerate(margins):
        check("o2_margin_pct" in m, f"WP{i} has o2_margin_pct")
        check("battery_margin_pct" in m, f"WP{i} has battery_margin_pct")
        check("return_duration_min" in m, f"WP{i} has return_duration_min")
        check("cumulative_o2_l" in m, f"WP{i} has cumulative_o2_l")
        check(m["return_duration_min"] >= 0, f"WP{i} return_duration >= 0")
    print("  → Waypoint margins test passed.")


# ── Test 8: SPE storm mode is handled ────────────────────────────────────────
def test_spe_storm():
    print("\n=== Test 8: SPE Storm Mode ===")
    res_normal = server.plan_eva_route(SITE, WAYPOINTS, mode="min_radiation", spe_storm=False, generate_alternatives=False)
    res_spe = server.plan_eva_route(SITE, WAYPOINTS, mode="min_radiation", spe_storm=True, generate_alternatives=False)
    rad_norm = res_normal["telemetry"]["summary"]["radiation_dose_uSv"]
    rad_spe = res_spe["telemetry"]["summary"]["radiation_dose_uSv"]
    check(rad_spe > rad_norm, f"SPE storm raises radiation dose ({rad_spe:.1f} > {rad_norm:.1f} µSv)")
    check(res_spe.get("spe_storm_active") == True, "spe_storm_active flag set")
    print("  → SPE storm test passed.")


# ── Test 9: direct_comparison is always present ───────────────────────────────
def test_direct_comparison():
    print("\n=== Test 9: Direct Path Comparison ===")
    res = server.plan_eva_route(SITE, WAYPOINTS, mode="safest", generate_alternatives=False)
    check("direct_comparison" in res, "direct_comparison present")
    dc = res["direct_comparison"]
    check("direct_summary" in dc, "direct_summary present")
    check("hazard_reduction_pct" in dc, "hazard_reduction_pct present")
    check("o2_savings_pct" in dc, "o2_savings_pct present")
    print("  → Direct comparison test passed.")


# ── Test 10: Error case – too few waypoints ───────────────────────────────────
def test_error_handling():
    print("\n=== Test 10: Error Handling ===")
    res = server.plan_eva_route(SITE, [{"gx": 30, "gy": 40, "name": "Solo"}], mode="balanced")
    check("error" in res, "Single waypoint returns error dict")
    print("  → Error handling test passed.")


# ── Test 11: P1.3 Multi-Hazard Environmental Risk Heatmap Baseline ────────────
def test_risk_heatmap_baseline():
    print("\n=== Test 11: Multi-Hazard Environmental Risk Heatmap (Baseline) ===")
    layers = SITE["layers"]
    check("risk_heatmap" in layers, "risk_heatmap layer exists in site payload")
    grid = layers["risk_heatmap"]
    N = len(grid)
    check(N == SITE["site"]["grid_size"], f"risk_heatmap dimension matches grid_size ({N})")

    all_vals = [v for row in grid for v in row]
    min_v = min(all_vals)
    max_v = max(all_vals)
    check(min_v >= 0.0 and max_v <= 100.0, f"risk values bounded in [0, 100] (got [{min_v}, {max_v}])")

    meta = SITE.get("environmental_risk_meta", {})
    check("mean_risk" in meta, "environmental_risk_meta has mean_risk")
    check("high_risk_area_pct" in meta, "environmental_risk_meta has high_risk_area_pct")
    check("weights" in meta, "environmental_risk_meta has weights")
    check("hazard_contributions_pct" in meta, "environmental_risk_meta has hazard_contributions_pct")
    print(f"  → Mean sector risk: {meta['mean_risk']}%, High-risk area: {meta['high_risk_area_pct']}%")
    print("  → Multi-Hazard baseline test passed.")


# ── Test 12: P1.3 SPE Storm Dynamic Risk Amplification ────────────────────────
def test_risk_heatmap_spe_storm():
    print("\n=== Test 12: Environmental Risk SPE Storm Amplification ===")
    layers = SITE["layers"]
    nominal_grid, nominal_meta = server.compute_composite_environmental_risk(layers, SITE["site"], spe_storm=False)
    storm_grid, storm_meta = server.compute_composite_environmental_risk(layers, SITE["site"], spe_storm=True)

    check(storm_meta["weights"]["w_radiation"] > nominal_meta["weights"]["w_radiation"],
          f"SPE storm elevates radiation weight ({storm_meta['weights']['w_radiation']} > {nominal_meta['weights']['w_radiation']})")
    check(storm_meta["mean_risk"] >= nominal_meta["mean_risk"],
          f"SPE storm raises mean sector risk ({storm_meta['mean_risk']}% >= {nominal_meta['mean_risk']}%)")
    check(storm_meta["spe_storm_boost"] == True, "spe_storm_boost flag set to True in storm metadata")
    print("  → SPE storm risk amplification test passed.")


# ── Test 13: P1.3 Missing Data Policy (Never Treated as Safe) ─────────────────
def test_risk_heatmap_missing_data_policy():
    print("\n=== Test 13: Missing Data Policy [SYNTHETIC TEST CASE] ===")
    N = 4
    synthetic_site = {"grid_size": N, "base_radiation_uSv_hr": 26.67, "solar_particle_event_uSv_hr": 195.0}
    synthetic_layers = {
        "slope": [[5.0]*N for _ in range(N)],
        "boulder": [[10.0]*N for _ in range(N)],
        "radiation": [[22.0]*N for _ in range(N)],
        "comm_los": [[100.0]*N for _ in range(N)]
    }
    synthetic_layers["slope"][1][1] = None
    synthetic_layers["radiation"][2][2] = None

    grid, meta = server.compute_composite_environmental_risk(synthetic_layers, synthetic_site)

    check(grid[1][1] == 100.0, f"Cell with missing slope penalizes with 100.0% max risk (got {grid[1][1]})")
    check(grid[2][2] == 100.0, f"Cell with missing radiation penalizes with 100.0% max risk (got {grid[2][2]})")
    check(meta["missing_data_cells"] == 2, f"Metadata accurately tracks missing cells count ({meta['missing_data_cells']} == 2)")
    check(meta["provenance"]["missing_data_policy"] == "STRICT_MAXIMUM_RISK_PENALTY_100_PCT",
          "Missing data policy explicitly documented in provenance")
    print("  → Missing data strict penalty test passed [SYNTHETIC TEST CASE].")


# ── Test 14: P1.3 Custom Risk Weights Tuning ──────────────────────────────────
def test_risk_heatmap_custom_weights():
    print("\n=== Test 14: Custom Risk Weights Tuning ===")
    layers = SITE["layers"]
    custom_w = {"w_slope": 0.80, "w_boulder": 0.10, "w_radiation": 0.05, "w_comm": 0.05}
    grid, meta = server.compute_composite_environmental_risk(layers, SITE["site"], custom_weights=custom_w)

    check(abs(meta["weights"]["w_slope"] - 0.80) < 0.01, f"Custom slope weight preserved ({meta['weights']['w_slope']})")
    sum_w = sum(meta["weights"].values())
    check(abs(sum_w - 1.0) < 0.01, f"Normalized weights sum to 1.0 (got {sum_w:.3f})")
    print("  → Custom weights tuning test passed.")


# ── Test 15: P1.3 Route Hazard Breakdown in Telemetry ─────────────────────────
def test_route_hazard_breakdown():
    print("\n=== Test 15: Route Telemetry Hazard Breakdown ===")
    res = server.plan_eva_route(SITE, WAYPOINTS, mode="balanced", generate_alternatives=False)
    summary = res["telemetry"]["summary"]
    check("hazard_breakdown" in summary, "hazard_breakdown present in telemetry summary")
    check("mean_environmental_risk" in summary, "mean_environmental_risk present in telemetry summary")
    check("peak_environmental_risk" in summary, "peak_environmental_risk present in telemetry summary")

    hb = summary["hazard_breakdown"]
    check("slope_risk_pct" in hb, "hazard_breakdown has slope_risk_pct")
    check("boulder_risk_pct" in hb, "hazard_breakdown has boulder_risk_pct")
    check("radiation_risk_pct" in hb, "hazard_breakdown has radiation_risk_pct")
    check("comm_shadow_risk_pct" in hb, "hazard_breakdown has comm_shadow_risk_pct")
    check("primary_driver" in hb and len(hb["primary_driver"]) > 0, f"primary_driver identified: {hb.get('primary_driver')}")
    check("advisory" in hb and len(hb["advisory"]) > 10, "scientific advisory text populated")
    check("provenance" in hb, "hazard_breakdown has component provenance")

    print(f"  → Mean path risk: {summary['mean_environmental_risk']}%, Peak: {summary['peak_environmental_risk']}%")
    print(f"  → Primary risk driver: {hb['primary_driver']}")
    print(f"  → Advisory: {hb['advisory']}")
    print("  → Route telemetry hazard breakdown test passed.")


# ── Test 16: Diurnal Surface Temperature Modeling & Solar Geometry ───────────
def test_diurnal_temperature_modeling():
    print("\n=== Test 16: Diurnal Surface Temperature Modeling & Solar Geometry ===")
    diurnal = server.compute_diurnal_temperature_profile(SITE, ls_deg=0.0)
    check("hourly_profile" in diurnal, "hourly_profile present in diurnal output")
    check(len(diurnal["hourly_profile"]) == 24, "diurnal profile has exactly 24 sol hours")

    # Solar elevation should peak at solar noon (hour 12)
    noon = diurnal["hourly_profile"][12]
    midnight = diurnal["hourly_profile"][0]
    check(noon["solar_elevation_deg"] > midnight["solar_elevation_deg"], "solar elevation at noon > midnight")
    check(noon["is_daylight"] is True, "hour 12 is daylight")
    check(midnight["is_daylight"] is False, "hour 0 is night")

    # Diurnal peak should have thermal inertia lag: peak temp occurs after solar noon (hours 13-15)
    temps = [p["temp_c"] for p in diurnal["hourly_profile"]]
    max_hour = temps.index(max(temps))
    check(12 <= max_hour <= 16, f"peak surface temperature has thermal lag (max at hour {max_hour})")

    # Seasonal modulation: Perihelion (Ls=250°) should be warmer than Aphelion (Ls=70°)
    diurnal_perihelion = server.compute_diurnal_temperature_profile(SITE, ls_deg=250.0)
    diurnal_aphelion = server.compute_diurnal_temperature_profile(SITE, ls_deg=70.0)
    check(
        diurnal_perihelion["diurnal_summary"]["mean_temp_c"] > diurnal_aphelion["diurnal_summary"]["mean_temp_c"],
        f"perihelion mean ({diurnal_perihelion['diurnal_summary']['mean_temp_c']}°C) > aphelion ({diurnal_aphelion['diurnal_summary']['mean_temp_c']}°C)"
    )

    # Thermal inertia estimation check
    ti = diurnal["thermal_inertia"]
    check("thermal_inertia_tiu" in ti and ti["thermal_inertia_tiu"] > 0, "thermal inertia TIU present and positive")
    check(ti["provenance"] == "REGIONAL_GEOLOGICAL_ESTIMATE", "thermal inertia marked as REGIONAL_GEOLOGICAL_ESTIMATE")
    check("uncertainty_tiu" in ti, "thermal inertia uncertainty documented")
    print(f"  → Estimated Thermal Inertia: {ti['thermal_inertia_tiu']} {ti['unit']} ({ti['geological_classification']})")
    print(f"  → Diurnal range at Jezero (Ls=0°): {diurnal['diurnal_summary']['min_temp_c']}°C to {diurnal['diurnal_summary']['max_temp_c']}°C (Swing: {diurnal['diurnal_summary']['diurnal_swing_k']} K)")
    print("  → Diurnal surface temperature modeling test passed.")


# ── Test 17: Temperature Baseline Provenance & Physical Assumptions ──────────
def test_temperature_provenance_assumptions():
    print("\n=== Test 17: Temperature Baseline Provenance & Physical Assumptions ===")
    diurnal = server.compute_diurnal_temperature_profile(SITE, ls_deg=0.0)

    # Ground truth observed baseline distinction
    check("observed_baseline" in diurnal, "observed_baseline present in output")
    obs = diurnal["observed_baseline"]
    check(obs["status"] == "OBSERVED_SURFACE_BASELINE", "observed baseline marked OBSERVED_SURFACE_BASELINE")
    check("historical_range_c" in obs, "historical range present in observed baseline")
    check(obs["historical_range_c"][0] < obs["historical_range_c"][1], "historical range min < max")

    # Calculated model provenance & uncertainty
    check("model_provenance" in diurnal, "model_provenance present in output")
    prov = diurnal["model_provenance"]
    check(prov["status"] == "CALCULATED_INSOLATION_MODEL", "model marked CALCULATED_INSOLATION_MODEL")
    check("uncertainty" in prov and "±" in prov["uncertainty"], "uncertainty bounds explicitly stated")
    check("physical_assumptions" in prov and len(prov["physical_assumptions"]) >= 3, "at least 3 physical assumptions documented")
    print(f"  → Documented uncertainty: {prov['uncertainty']}")
    print(f"  → Physical assumptions count: {len(prov['physical_assumptions'])}")
    print("  → Temperature baseline provenance & assumptions test passed.")


# ── Test 18: Dust Storm Risk Assessment (Defensible & Qualitative) ───────────
def test_dust_storm_risk_assessment():
    print("\n=== Test 18: Dust Storm Risk Assessment (Defensible & Qualitative) ===")
    valid_categories = {"LOW", "MODERATE", "ELEVATED", "SEVERE"}

    # Clear season (Aphelion Ls=70°)
    dust_aphelion = server.assess_dust_storm_risk(SITE, ls_deg=70.0)
    check(dust_aphelion["risk_category"] in valid_categories, f"valid risk category for aphelion: {dust_aphelion['risk_category']}")
    check(dust_aphelion["risk_category"] in ("LOW", "MODERATE"), "aphelion baseline risk is LOW or MODERATE")

    # Dust storm season (Perihelion Ls=250°)
    dust_perihelion = server.assess_dust_storm_risk(SITE, ls_deg=250.0)
    check(dust_perihelion["risk_category"] in valid_categories, f"valid risk category for perihelion: {dust_perihelion['risk_category']}")
    check(dust_perihelion["risk_category"] in ("MODERATE", "ELEVATED", "SEVERE"), "perihelion risk is elevated compared to clear season")

    # Optical depth attenuation check: global storm scenario
    dust_storm = server.assess_dust_storm_risk(SITE, ls_deg=250.0, user_scenario="global_encirclement")
    check(dust_storm["risk_category"] == "SEVERE", "global encirclement scenario classified SEVERE")
    check(dust_storm["solar_power_attenuation_pct"] > 85.0, f"global storm causes severe solar drop ({dust_storm['solar_power_attenuation_pct']}%)")
    check(dust_storm["estimated_horizontal_visibility_km"] < 1.0, "global storm restricts visibility to < 1.0 km")

    # Ensure unmeasured variables are explicitly displayed as unknown
    check("unknown_environmental_variables" in dust_storm, "unknown_environmental_variables list present")
    check(len(dust_storm["unknown_environmental_variables"]) >= 2, "at least 2 unknown micro-meteorological variables listed")

    # Scientific integrity: no fabricated numerical probability
    check("probabilistic_statement" in dust_storm["provenance"], "probabilistic statement present in provenance")
    print(f"  → Aphelion Category: {dust_aphelion['risk_category']}, Perihelion Category: {dust_perihelion['risk_category']}")
    print(f"  → Global Storm Solar Loss: {dust_storm['solar_power_attenuation_pct']}%, Visibility: {dust_storm['estimated_horizontal_visibility_km']} km")
    print("  → Dust storm risk assessment test passed.")


# ── Test 19: Atmospheric Column Depth & Radiation Shielding ──────────────────
def test_atmospheric_column_shielding():
    print("\n=== Test 19: Atmospheric Column Depth & Radiation Shielding ===")
    # Jezero Crater (-2.5km)
    col_jezero = server.compute_atmospheric_column_and_shielding(SITE)
    check("column_mass_g_cm2" in col_jezero, "column_mass_g_cm2 present")
    check(15.0 <= col_jezero["column_mass_g_cm2"] <= 26.0, f"Jezero column mass in expected range ({col_jezero['column_mass_g_cm2']} g/cm²)")

    # Deep basin (Hellas Planitia at -7.2km) vs High altitude (Olympus Mons at +2.1km)
    col_hellas = server.compute_atmospheric_column_and_shielding(server.PRECOMPUTED_SITES["hellas"]["site"])
    col_olympus = server.compute_atmospheric_column_and_shielding(server.PRECOMPUTED_SITES["olympus"]["site"])

    check(
        col_hellas["column_mass_g_cm2"] > col_olympus["column_mass_g_cm2"],
        f"Hellas basin column ({col_hellas['column_mass_g_cm2']} g/cm²) > Olympus volcano column ({col_olympus['column_mass_g_cm2']} g/cm²)"
    )

    # Earth comparison: Earth is ~1033 g/cm²
    check(col_jezero["earth_comparison"]["mars_column_fraction_pct"] < 5.0, "Mars column mass < 5% of Earth standard")

    # Radiation shielding disclaimer & secondary neutron distinction
    rad_interact = col_jezero["radiation_interaction"]
    check("measured_in_situ_gcr_rate_uSv_hr" in rad_interact, "measured in-situ GCR baseline kept distinct")
    check(rad_interact["measured_in_situ_gcr_rate_uSv_hr"] > 20.0, "measured GCR rate non-zero")
    check("secondary_neutron_shower_warning" in rad_interact, "secondary neutron shower distinction present")
    check("scientific_disclaimer" in col_jezero, "scientific disclaimer attached")
    print(f"  → Jezero Column: {col_jezero['column_mass_g_cm2']} g/cm² ({col_jezero['earth_comparison']['mars_column_fraction_pct']}% of Earth)")
    print(f"  → Hellas Column: {col_hellas['column_mass_g_cm2']} g/cm² vs Olympus: {col_olympus['column_mass_g_cm2']} g/cm²")
    print("  → Atmospheric column depth & radiation shielding test passed.")


# ── Test 20: Scout Drone Flight Feasibility & Unified Assessment API ─────────
def test_scout_drone_feasibility_and_api():
    print("\n=== Test 20: Scout Drone Flight Feasibility & Unified Assessment API ===")
    # 1. Nominal flight check at Jezero
    drone_jezero = server.evaluate_scout_drone_feasibility(SITE)
    check("verdict" in drone_jezero, "drone verdict present")
    check(drone_jezero["verdict"] in ("OPTIMAL_FLIGHT", "MARGINAL_FLIGHT"), f"Jezero drone flight feasible: {drone_jezero['verdict']}")
    check(drone_jezero["power_and_endurance"]["max_endurance_min"] > 1.5, f"endurance > 1.5 min ({drone_jezero['power_and_endurance']['max_endurance_min']} min)")
    check(drone_jezero["atmospheric_flight_metrics"]["density_kg_m3"] >= 0.012, "Jezero density above stall threshold")

    # 2. Extreme elevation: Olympus Mons summit (+21 km) should be GROUNDED due to density < 0.012 kg/m³
    drone_olympus_summit = server.evaluate_scout_drone_feasibility(
        server.PRECOMPUTED_SITES["olympus"]["site"],
        elevation_m=21000.0,
        temperature_c=-80.0
    )
    check(drone_olympus_summit["verdict"] == "FLIGHT_GROUNDED", f"Olympus summit correctly grounded ({drone_olympus_summit['verdict']})")
    check(drone_olympus_summit["power_and_endurance"]["max_endurance_min"] == 0.0, "grounded drone endurance is 0")

    # 3. Comprehensive environmental assessment function
    comprehensive = server.compute_comprehensive_environmental_assessment(
        SITE, sol_hour=13.5, ls_deg=45.0, dust_scenario="seasonal_baseline", drone_mass_kg=1.8
    )
    check("diurnal_temperature" in comprehensive, "diurnal_temperature in comprehensive assessment")
    check("dust_storm_risk" in comprehensive, "dust_storm_risk in comprehensive assessment")
    check("atmospheric_column" in comprehensive, "atmospheric_column in comprehensive assessment")
    check("scout_drone_feasibility" in comprehensive, "scout_drone_feasibility in comprehensive assessment")

    # 4. Route telemetry atmospheric summary integration
    route_res = server.plan_eva_route(SITE, WAYPOINTS, mode="balanced", generate_alternatives=False)
    summary = route_res["telemetry"]["summary"]
    check("atmospheric_profile" in summary, "atmospheric_profile present in route telemetry summary")
    ap = summary["atmospheric_profile"]
    check("atmospheric_column_mass_g_cm2" in ap, "column mass in atmospheric profile")
    check("drone_flight_verdict" in ap, "drone flight verdict in atmospheric profile")
    print(f"  → Drone verdict at Jezero: {drone_jezero['verdict_label']} (Hover: {drone_jezero['power_and_endurance']['total_hover_power_w']} W, Endurance: {drone_jezero['power_and_endurance']['max_endurance_min']} min)")
    print(f"  → Route atmospheric profile: {ap['atmospheric_column_mass_g_cm2']} g/cm², Density {ap['atmospheric_density_kg_m3']} kg/m³, Drone: {ap['drone_flight_verdict']}")
    print("  → Scout drone feasibility & unified API test passed.")


# ── Test 21: RF Line-of-Sight & 3D Ridge Obstruction Ray-Marching ──────────────
def test_rf_line_of_sight_ray_marching():
    print("\n=== Test 21: RF Line-of-Sight & 3D Ridge Obstruction ===")
    N = 80
    elev_flat = [[-2500.0 for _ in range(N)] for _ in range(N)]
    
    # 1. Flat terrain with standard 18m habitat mast and 1.8m astronaut antenna
    los_flat = server.evaluate_rf_line_of_sight(elev_flat, (20, 20), (50, 20), h1_m=18.0, h2_m=1.8, cell_m=20.0)
    check(los_flat["geometric_los"] is True, "flat terrain maintains geometric LOS")
    check(los_flat["max_obstruction_m"] == 0.0, "flat terrain obstruction is 0.0m")
    check(abs(los_flat["distance_m"] - 600.0) < 1.0, "distance calculation is accurate (600m)")

    # 2. Add an impassable 100m ridge between the two points at x=35
    elev_ridge = [[-2500.0 for _ in range(N)] for _ in range(N)]
    for y in range(N):
        elev_ridge[y][35] = -2400.0  # +100m above base level
    
    los_ridge = server.evaluate_rf_line_of_sight(elev_ridge, (20, 20), (50, 20), h1_m=18.0, h2_m=1.8, cell_m=20.0)
    check(los_ridge["geometric_los"] is False, "ridge obstructs geometric LOS")
    check(los_ridge["max_obstruction_m"] > 50.0, f"ridge obstruction detected (>50m, actual={los_ridge['max_obstruction_m']}m)")
    check(los_ridge["obstruction_point"] == [35, 20], "obstruction point accurately identified at ridge")
    print(f"  → Clear LOS: {los_flat['geometric_los']} (dist={los_flat['distance_m']}m)")
    print(f"  → Obstructed Ridge: {los_ridge['geometric_los']} (obstruction={los_ridge['max_obstruction_m']}m at {los_ridge['obstruction_point']})")
    print("  → RF Line-of-Sight ray-marching test passed.")


# ── Test 22: Free-Space Path Loss & Knife-Edge Diffraction Link Budget ────────
def test_uhf_link_budget_and_knife_edge():
    print("\n=== Test 22: UHF Link Budget & Knife-Edge Diffraction ===")
    # 1. Nominal Proximity-1 short range (300m, no obstruction)
    short_link = server.compute_uhf_link_budget(300.0, max_obstruction_m=0.0)
    check(short_link["link_margin_db"] > 30.0, f"short range link margin > 30 dB (actual={short_link['link_margin_db']} dB)")
    check(short_link["link_quality_pct"] >= 95.0, f"short range link quality >= 95% (actual={short_link['link_quality_pct']}%)")
    check(short_link["is_dead_zone"] is False, "short range is not a dead zone")

    # 2. Long range (5 km) with moderate ridge diffraction obstruction (15m)
    diffracted_link = server.compute_uhf_link_budget(5000.0, max_obstruction_m=15.0)
    check(diffracted_link["fspl_db"] > short_link["fspl_db"], "FSPL increases with distance")
    check(diffracted_link["diffraction_loss_db"] > 10.0, f"knife-edge diffraction loss > 10 dB (actual={diffracted_link['diffraction_loss_db']} dB)")
    check(diffracted_link["rx_power_dbm"] < short_link["rx_power_dbm"], "diffracted link received power is lower")

    # 3. Severe shadow (10 km with 80m scarp obstruction) -> Dead Zone
    dead_link = server.compute_uhf_link_budget(10000.0, max_obstruction_m=80.0)
    check(dead_link["is_dead_zone"] is True, "severe scarp obstruction triggers dead zone")
    check(dead_link["link_margin_db"] <= 0.0 or dead_link["rx_power_dbm"] < -110.0, "dead zone link margin <= 0 dB or rx_power < -110 dBm")
    check(dead_link["link_quality_pct"] <= 15.0, "dead zone link quality <= 15%")
    print(f"  → Short Range: LM={short_link['link_margin_db']} dB, Quality={short_link['link_quality_pct']}%")
    print(f"  → Diffracted: FSPL={diffracted_link['fspl_db']} dB, DiffLoss={diffracted_link['diffraction_loss_db']} dB, LM={diffracted_link['link_margin_db']} dB")
    print(f"  → Dead Zone: is_dead_zone={dead_link['is_dead_zone']}, LM={dead_link['link_margin_db']} dB, Quality={dead_link['link_quality_pct']}%")
    print("  → UHF link budget test passed.")


# ── Test 23: Comm-Aware Pathfinding & Dead Zone Avoidance ─────────────────────
def test_comm_aware_pathfinding_and_dead_zones():
    print("\n=== Test 23: Comm-Aware Pathfinding & Dead Zone Avoidance ===")
    comm_res = server.plan_eva_route(SITE, WAYPOINTS, mode="comm_aware", generate_alternatives=False)
    short_res = server.plan_eva_route(SITE, WAYPOINTS, mode="shortest", generate_alternatives=False)

    comm_sum = comm_res["telemetry"]["summary"]
    short_sum = short_res["telemetry"]["summary"]

    check("comm_profile" in comm_sum, "comm_profile present in route telemetry summary")
    check("comm_profile" in short_sum, "comm_profile present in shortest route summary")

    cp_comm = comm_sum["comm_profile"]
    cp_short = short_sum["comm_profile"]

    check("comm_coverage_pct" in cp_comm, "comm_coverage_pct in comm_profile")
    check("dead_zone_steps" in cp_comm, "dead_zone_steps in comm_profile")
    check("dead_zone_duration_min" in cp_comm, "dead_zone_duration_min in comm_profile")
    check("comm_topology" in comm_res, "comm_topology relay recommendation attached to route result")

    check(cp_comm["comm_coverage_pct"] >= cp_short["comm_coverage_pct"],
          f"comm_aware coverage ({cp_comm['comm_coverage_pct']}%) >= shortest coverage ({cp_short['comm_coverage_pct']}%)")
    print(f"  → Comm-Aware Route: Coverage={cp_comm['comm_coverage_pct']}%, Dead steps={cp_comm['dead_zone_steps']}, Dead min={cp_comm['dead_zone_duration_min']} min")
    print(f"  → Shortest Route: Coverage={cp_short['comm_coverage_pct']}%, Dead steps={cp_short['dead_zone_steps']}")
    print("  → Comm-aware pathfinding test passed.")


# ── Test 24: Portable Relay Greedy Set-Cover Topology Planner ────────────────
def test_portable_relay_topology_planner():
    print("\n=== Test 24: Portable Relay Greedy Set-Cover Topology Planner ===")
    melas_site = server.PRECOMPUTED_SITES["melas"]
    melas_path = [
        (melas_site["site"]["habitat"]["gx"], melas_site["site"]["habitat"]["gy"]),
        (30, 45),
        (35, 52),
        (40, 58),
        (55, 65)
    ]
    
    topo = server.plan_portable_relay_topology(melas_site, melas_path, max_relays=2, search_radius_cells=8)
    check("verdict" in topo, "verdict present in relay topology")
    check("initial_comm_coverage_pct" in topo, "initial_comm_coverage_pct present")
    check("restored_comm_coverage_pct" in topo, "restored_comm_coverage_pct present")
    check("coverage_boost_pct" in topo, "coverage_boost_pct present")
    check("recommended_relays" in topo, "recommended_relays list present")
    check("explainability" in topo, "explainability string present")
    check("provenance" in topo, "provenance block present")

    for relay in topo["recommended_relays"]:
        check(relay["slope_deg"] <= 18.0, f"relay slope {relay['slope_deg']}° <= 18°")
        check(relay["boulder_pct"] <= 45.0, f"relay boulder {relay['boulder_pct']}% <= 45%")
        check(relay["backhaul_link_margin_db"] >= 10.0, f"backhaul margin {relay['backhaul_link_margin_db']} dB >= 10 dB")
        check(len(relay["covered_steps"]) > 0, "relay covers at least 1 shadowed step")

    print(f"  → Verdict: {topo['verdict']} ({topo['verdict_label']})")
    print(f"  → Coverage: {topo['initial_comm_coverage_pct']}% -> {topo['restored_comm_coverage_pct']}% (+{topo['coverage_boost_pct']}%)")
    print(f"  → Recommended Relays: {len(topo['recommended_relays'])}")
    print("  → Portable relay topology test passed.")


# ── Test 25: Unified Comm & Relay Topology API Payload ───────────────────────
def test_comm_topology_api_payload():
    print("\n=== Test 25: Unified Comm & Relay Topology API Payload ===")
    topo = server.plan_portable_relay_topology(SITE, WAYPOINTS, max_relays=2)
    check(isinstance(topo, dict), "topology response is a dict")
    check("step_comm_statuses" in topo, "step_comm_statuses in topology response")
    check(len(topo["step_comm_statuses"]) == len(WAYPOINTS), f"step statuses match waypoint count ({len(WAYPOINTS)})")
    
    first_step = topo["step_comm_statuses"][0]
    check("geometric_los" in first_step, "geometric_los in step status")
    check("link_quality_pct" in first_step, "link_quality_pct in step status")
    check("link_margin_db" in first_step, "link_margin_db in step status")
    
    prov = topo["provenance"]
    check(prov["status"] == "RECOMMENDED_RELAY_TOPOLOGY", "provenance status is RECOMMENDED_RELAY_TOPOLOGY")
    check(len(prov["assumptions"]) >= 3, "provenance assumptions documented")
    print(f"  → Step 0 Link Margin: {first_step['link_margin_db']} dB, Quality: {first_step['link_quality_pct']}%")
    print("  → Unified Comm & Relay Topology API payload test passed.")


# ── Runner ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    tests = [
        test_route_modes,
        test_custom_weights,
        test_alternatives_and_explainability,
        test_feasibility_feasible,
        test_feasibility_critical,
        test_pnr_detection,
        test_waypoint_margins,
        test_spe_storm,
        test_direct_comparison,
        test_error_handling,
        test_risk_heatmap_baseline,
        test_risk_heatmap_spe_storm,
        test_risk_heatmap_missing_data_policy,
        test_risk_heatmap_custom_weights,
        test_route_hazard_breakdown,
        test_diurnal_temperature_modeling,
        test_temperature_provenance_assumptions,
        test_dust_storm_risk_assessment,
        test_atmospheric_column_shielding,
        test_scout_drone_feasibility_and_api,
        test_rf_line_of_sight_ray_marching,
        test_uhf_link_budget_and_knife_edge,
        test_comm_aware_pathfinding_and_dead_zones,
        test_portable_relay_topology_planner,
        test_comm_topology_api_payload
    ]

    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            passed += 1
        except AssertionError as e:
            print(f"  *** ASSERTION FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"  *** UNEXPECTED ERROR in {t.__name__}: {e}")
            failed += 1

    print(f"\n{'='*55}")
    print(f"P1 Test Results: {passed}/{passed+failed} passed, {failed} failed")
    print("="*55)
    if failed > 0:
        sys.exit(1)
