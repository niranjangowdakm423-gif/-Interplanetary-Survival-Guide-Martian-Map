"""
ARES-NAV Phase P2.2 Automated Test Suite
Habitat Suitability & Site Selection (MCDA, AHP, Blast Exclusion, Horizon Sky-View Factor)
"""

import unittest
import math
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from p2.habitat_suitability import (
    compute_ahp_weights,
    compute_directional_sky_view_factor,
    compute_slope_factor_score,
    compute_boulder_factor_score,
    compute_daily_solar_insolation_score,
    compute_isru_proximity_score,
    compute_horizon_masking_score,
    evaluate_habitat_suitability,
)
import server


class TestHabitatSuitabilityEngine(unittest.TestCase):

    def test_01_ahp_pairwise_consistency_ratio(self):
        """Verify Saaty AHP priority vector and Consistency Ratio CR < 0.10."""
        ahp = compute_ahp_weights()
        self.assertTrue(ahp["is_consistent"], f"AHP matrix must be consistent: {ahp}")
        self.assertLess(ahp["consistency_ratio_cr"], 0.10)
        self.assertAlmostEqual(sum(ahp["weights"].values()), 1.0, places=3)
        # Slope is the highest priority weight (~0.3106 exact eigenvector, ~0.292 column-approx)
        self.assertAlmostEqual(ahp["weights"]["slope"], 0.30, delta=0.025)
        self.assertGreater(ahp["lambda_max"], 6.0)
        self.assertLess(ahp["lambda_max"], 6.15)
        print(
            f"\n  [PASS] AHP Consistency verified: lambda_max={ahp['lambda_max']}, "
            f"CI={ahp['consistency_index_ci']}, CR={ahp['consistency_ratio_cr']} (< 0.10)"
        )

    def test_02_slope_and_boulder_hard_thresholds(self):
        """Test slope (<5 deg optimal, >max_slope disqualified) and boulder (<15% optimal) scoring."""
        # Slope < 5 deg -> high score (85 - 100)
        self.assertEqual(compute_slope_factor_score(0.0, max_slope_deg=12.0), 100.0)
        self.assertGreaterEqual(compute_slope_factor_score(4.5, max_slope_deg=12.0), 85.0)
        # Slope between 5 and 12 deg -> intermediate positive score
        mid_slope = compute_slope_factor_score(8.0, max_slope_deg=12.0)
        self.assertGreater(mid_slope, 30.0)
        self.assertLess(mid_slope, 85.0)
        # Slope > 12 deg -> hard 0.0 disqualification
        self.assertEqual(compute_slope_factor_score(12.5, max_slope_deg=12.0), 0.0)
        self.assertEqual(compute_slope_factor_score(8.5, max_slope_deg=8.0), 0.0)

        # Boulder < 15% -> >= 75 score
        self.assertEqual(compute_boulder_factor_score(0.0, max_boulder_pct=20.0), 100.0)
        self.assertGreaterEqual(compute_boulder_factor_score(14.0, max_boulder_pct=20.0), 75.0)
        # Boulder > max_boulder_pct -> hard 0.0 disqualification
        self.assertEqual(compute_boulder_factor_score(21.0, max_boulder_pct=20.0), 0.0)
        print("  [PASS] Slope (<5° optimal, >threshold disqualified) and boulder (<15% optimal) scoring verified.")

    def test_03_landing_blast_exclusion_buffer_enforcement(self):
        """Test 800m - 2000m HLS plume blast exclusion buffer strictly zeros inner cells."""
        jezero = server.PRECOMPUTED_SITES["jezero"]
        lz_gx, lz_gy = jezero["site"]["habitat"]["gx"], jezero["site"]["habitat"]["gy"]

        res = evaluate_habitat_suitability(
            site_data=jezero,
            thresholds={
                "max_slope_deg": 12.0,
                "max_boulder_pct": 25.0,
                "min_blast_buffer_m": 800.0,
                "max_logistics_buffer_m": 2000.0,
            },
            landing_zone_cell=[lz_gx, lz_gy],
        )

        grid = res["suitability_grid_80x80"]
        # Every cell within 800m (32 grid cells * 25m = 800m) must have suitability == 0.0
        for gy in range(80):
            for gx in range(80):
                dist_m = math.hypot(gx - lz_gx, gy - lz_gy) * 25.0
                if dist_m < 800.0 or dist_m > 2000.0:
                    self.assertEqual(
                        grid[gy][gx],
                        0.0,
                        f"Cell ({gx},{gy}) at {dist_m:.1f}m violated blast/logistics buffer [800m, 2000m]!",
                    )

        self.assertGreater(res["suitability_score_max"], 50.0)
        self.assertGreater(len(res["top_candidates"]), 0)
        best = res["top_candidates"][0]
        self.assertGreaterEqual(best["distance_to_lz_m"], 800.0)
        self.assertLessEqual(best["distance_to_lz_m"], 2000.0)
        print(
            f"  [PASS] Blast exclusion buffer [800m, 2000m] enforced: optimal habitat at {best['cell']} "
            f"(d_lz={best['distance_to_lz_m']}m, score={best['score']})"
        )

    def test_04_directional_sky_view_factor_and_bulk_shielding(self):
        """Verify F_sky = cos^2(theta_rim) horizon masking and secondary neutron spallation disclaimer."""
        # Synthetic flat grid vs deep crater wall grid
        flat_grid = [[-2500.0 for _ in range(30)] for _ in range(30)]
        f_sky_flat, rim_flat, _ = compute_directional_sky_view_factor(flat_grid, 15, 15)
        self.assertEqual(f_sky_flat, 1.0)
        self.assertEqual(rim_flat, 0.0)

        # Surround (15, 15) with 100m high crater rim at 5 cells (125m) distance -> tan(theta) = 100/125 = 0.8
        crater_grid = [[-2400.0 for _ in range(30)] for _ in range(30)]
        for y in range(11, 20):
            for x in range(11, 20):
                crater_grid[y][x] = -2500.0
        f_sky_crater, rim_crater, _ = compute_directional_sky_view_factor(crater_grid, 15, 15)
        self.assertLess(f_sky_crater, 0.75)
        self.assertGreater(rim_crater, 30.0)

        # Verify thin regolith (< 0.33m -> < 50 g/cm^2) triggers spallation warning
        jezero = server.PRECOMPUTED_SITES["jezero"]
        res_thin = evaluate_habitat_suitability(jezero, regolith_shielding_m=0.2)
        self.assertTrue(res_thin["radiation_shielding_analysis"]["secondary_neutron_spallation_hazard"])
        self.assertIn("WARNING_SPALLATION", res_thin["radiation_shielding_analysis"]["shielding_verdict"])

        # Verify 2.0m regolith (304 g/cm^2) passes bulk shielding
        res_thick = evaluate_habitat_suitability(jezero, regolith_shielding_m=2.0)
        self.assertFalse(res_thick["radiation_shielding_analysis"]["secondary_neutron_spallation_hazard"])
        self.assertEqual(res_thick["radiation_shielding_analysis"]["regolith_mass_overburden_g_cm2"], 304.0)
        print(
            f"  [PASS] Sky-view factor F_sky={f_sky_crater:.3f} (rim={rim_crater:.1f}°) and bulk shielding "
            f"(304.0 g/cm² vs <50 g/cm² spallation warning) verified."
        )

    def test_05_solar_insolation_aspect_and_custom_mcda_weights(self):
        """Test solar insolation equatorward tilt boost and custom MCDA weight sensitivity."""
        # Equator-facing slope (South = pi in northern hemisphere) vs pole-facing (North = 0)
        score_south, wh_south = compute_daily_solar_insolation_score(
            base_insolation_w_m2=500.0,
            site_lat_deg=18.4,
            subsolar_lat_deg=0.0,
            slope_deg=7.0,
            aspect_rad=math.pi,  # South-facing
            f_sky=0.95,
        )
        score_north, wh_north = compute_daily_solar_insolation_score(
            base_insolation_w_m2=500.0,
            site_lat_deg=18.4,
            subsolar_lat_deg=0.0,
            slope_deg=7.0,
            aspect_rad=0.0,  # North-facing
            f_sky=0.95,
        )
        self.assertGreater(wh_south, wh_north)
        self.assertGreater(score_south, score_north)

        # Custom weight test on Arcadia Planitia (high ISRU weight vs high slope weight)
        arcadia = server.PRECOMPUTED_SITES["arcadia"]
        res_isru = evaluate_habitat_suitability(
            arcadia,
            weights={"isru_proximity": 0.80, "slope": 0.05, "terrain_roughness": 0.05, "horizon_masking": 0.04, "comm_coverage": 0.03, "thermal_inertia": 0.03},
        )
        self.assertAlmostEqual(res_isru["active_weights"]["isru_proximity"], 0.80, places=2)
        self.assertTrue(res_isru["uncertainty_disclosures"]["missing_data_penalty_applied"])
        print(
            f"  [PASS] Solar aspect boost ({wh_south} vs {wh_north} Wh/m²/sol) and custom MCDA weights verified."
        )

    def test_06_bounding_box_and_infrastructure_standoff(self):
        """Test candidate bounding box restriction and Fission Power >= 500m standoff from Habitat."""
        jezero = server.PRECOMPUTED_SITES["jezero"]
        bbox = {"gx_min": 5, "gx_max": 35, "gy_min": 5, "gy_max": 35}
        res = evaluate_habitat_suitability(
            jezero,
            bounding_box=bbox,
            thresholds={"max_slope_deg": 12.0, "max_boulder_pct": 25.0, "min_blast_buffer_m": 800.0, "max_logistics_buffer_m": 2500.0},
        )
        grid = res["suitability_grid_80x80"]
        # Outside bounding box must be strictly 0.0
        self.assertEqual(grid[60][60], 0.0)
        self.assertEqual(grid[10][60], 0.0)

        hab_cell = res["optimal_habitat_cell"]
        self.assertGreaterEqual(hab_cell[0], 5)
        self.assertLessEqual(hab_cell[0], 35)
        self.assertGreaterEqual(hab_cell[1], 5)
        self.assertLessEqual(hab_cell[1], 35)

        fsp_cell = res["optimal_fission_power_cell"]
        fsp_dist_m = math.hypot(fsp_cell[0] - hab_cell[0], fsp_cell[1] - hab_cell[1]) * 25.0
        self.assertGreaterEqual(fsp_dist_m, 500.0, f"Fission power reactor too close to habitat: {fsp_dist_m}m")
        print(
            f"  [PASS] Bounding box restriction and Fission Reactor standoff ({fsp_dist_m:.0f}m >= 500m) verified."
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
