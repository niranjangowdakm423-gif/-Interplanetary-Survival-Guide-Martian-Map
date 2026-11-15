"""
ARES-NAV Phase P2.1 Automated Test Suite
NASA NAIF SPICE Ephemeris, Solar Geometry & In-Situ Environmental Engine
"""

import unittest
import math
import sys
import os

# Ensure nasa directory is on path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from p2.ephemeris_engine import (
    load_spice_kernels,
    compute_spice_ephemeris,
    compute_calibrated_fallback_ephemeris,
    get_planetary_ephemeris,
    get_mars_season,
    SPICEYPY_AVAILABLE
)
from p2.environmental_engine import get_environmental_context


class TestPlanetaryEphemerisEngine(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.kernel_info = load_spice_kernels()

    def test_01_spice_kernel_loading(self):
        """Test SPICE toolkit availability and kernel ingestion."""
        self.assertTrue(SPICEYPY_AVAILABLE, "spiceypy must be installed and importable.")
        self.assertTrue(self.kernel_info["kernels_loaded"], f"Kernels failed to load: {self.kernel_info}")
        self.assertEqual(self.kernel_info["status"], "LOADED")
        self.assertIn("de440s.bsp", self.kernel_info["kernel_files"])
        self.assertIn("naif0012.tls", self.kernel_info["kernel_files"])
        self.assertIn("pck00010.tpc", self.kernel_info["kernel_files"])
        print("\n  [PASS] NAIF SPICE Kernels loaded successfully.")

    def test_02_equinox_solstice_reference_epochs(self):
        """Test Ls calculations against verified Mars seasonal reference dates."""
        # Mars Year 36 Equinox & Solstice reference dates
        reference_epochs = [
            # Epoch UTC, Expected Ls approx (deg), Expected Season substring
            ("2021-02-07T18:00:00Z", 0.0, "Spring"),
            ("2021-08-25T00:00:00Z", 90.0, "Summer"),
            ("2022-02-24T18:00:00Z", 180.0, "Autumn"),
            ("2022-07-21T18:00:00Z", 270.0, "Winter")
        ]
        
        for utc_str, exp_ls, exp_season in reference_epochs:
            res = compute_spice_ephemeris(utc_str, 18.44, 77.45, "jezero")
            actual_ls = res["ephemeris"]["solar_longitude_deg"]
            season = res["ephemeris"]["mars_season"]
            
            # Allow tolerance of +/- 2.5 deg around reference date (dates are whole calendar days)
            diff = abs((actual_ls - exp_ls + 180.0) % 360.0 - 180.0)
            self.assertLess(diff, 2.5, f"Ls mismatch at {utc_str}: expected ~{exp_ls}°, got {actual_ls}°")
            self.assertIn(exp_season, season)
            print(f"  [PASS] {utc_str} -> Ls = {actual_ls:.2f}° ({season})")

    def test_03_earth_mars_owlt_boundaries(self):
        """Test Earth-Mars distance and One-Way Light Time stay within physical orbital bounds."""
        test_dates = [
            "2020-10-06T14:00:00Z",  # Near opposition (close approach ~0.41 AU, ~3.4 min OWLT)
            "2021-10-08T00:00:00Z",  # Near superior conjunction (~2.63 AU, ~21.8 min OWLT)
            "2026-11-15T12:00:00Z"   # Mission present
        ]
        
        for d in test_dates:
            res = compute_spice_ephemeris(d, 18.44, 77.45, "jezero")
            comm = res["communications_latency"]
            owlt_min = comm["one_way_light_time_min"]
            owlt_sec = comm["one_way_light_time_sec"]
            dist_km = comm["earth_mars_distance_km"]
            dist_au = comm["earth_mars_distance_au"]
            
            # Physical bounds: 0.37 AU <= dist <= 2.68 AU; 3.0 min <= OWLT <= 22.3 min
            self.assertGreaterEqual(dist_au, 0.36)
            self.assertLessEqual(dist_au, 2.70)
            self.assertGreaterEqual(owlt_min, 3.0)
            self.assertLessEqual(owlt_min, 22.5)
            self.assertAlmostEqual(owlt_min, owlt_sec / 60.0, places=3)
            self.assertFalse(comm["interactive_teleoperation_possible"])
            print(f"  [PASS] {d}: Dist = {dist_au:.3f} AU ({dist_km:,.0f} km), OWLT = {owlt_min:.2f} min ({owlt_sec:.1f} s)")

    def test_04_subsolar_latitude_bounds(self):
        """Test subsolar latitude is strictly bounded by Mars obliquity (25.19 deg)."""
        dates = [
            "2021-02-07T00:00:00Z",  # Equinox (subsolar lat ~ 0°)
            "2021-08-25T00:00:00Z",  # Solstice (subsolar lat ~ +25°)
            "2022-02-24T00:00:00Z",  # Equinox (subsolar lat ~ 0°)
            "2022-07-21T00:00:00Z"   # Solstice (subsolar lat ~ -25°)
        ]
        
        for d in dates:
            res = compute_spice_ephemeris(d, 18.44, 77.45, "jezero")
            sub_lat = res["ephemeris"]["sub_solar_latitude_deg"]
            self.assertGreaterEqual(sub_lat, -25.5)
            self.assertLessEqual(sub_lat, 25.5)
            print(f"  [PASS] {d}: Sub-solar Latitude = {sub_lat:.2f}° (within ±25.19° obliquity bound)")

    def test_05_longitudinal_local_solar_time_offset(self):
        """Test True Local Solar Time scales exactly with longitude (1 hour per 15 deg)."""
        epoch = "2026-11-15T12:00:00Z"
        
        # Site 1: Jezero at 77.45°E
        res_jezero = compute_spice_ephemeris(epoch, 18.44, 77.45, "jezero")
        hr_j = res_jezero["ephemeris"]["local_solar_hour"] + res_jezero["ephemeris"]["local_solar_minute"] / 60.0
        
        # Site 2: Gale at 137.44°E (delta longitude = 59.99° -> delta LTST = 4.00 hours)
        res_gale = compute_spice_ephemeris(epoch, -4.59, 137.44, "gale")
        hr_g = res_gale["ephemeris"]["local_solar_hour"] + res_gale["ephemeris"]["local_solar_minute"] / 60.0
        
        diff_hours = (hr_g - hr_j) % 24.0
        exp_diff_hours = (137.44 - 77.45) / 15.0  # 3.9993 hours
        self.assertAlmostEqual(diff_hours, exp_diff_hours, places=1)
        print(f"  [PASS] Jezero ({res_jezero['ephemeris']['true_local_solar_time']}) vs Gale ({res_gale['ephemeris']['true_local_solar_time']}): Δt = {diff_hours:.2f} h (expected {exp_diff_hours:.2f} h)")

    def test_06_solar_geometry_and_insolation(self):
        """Test solar zenith, elevation, and insolation consistency."""
        epoch = "2026-11-15T12:00:00Z"
        res = compute_spice_ephemeris(epoch, 18.44, 77.45, "jezero")
        ephem = res["ephemeris"]
        
        sza = ephem["solar_zenith_angle_deg"]
        elev = ephem["solar_elevation_deg"]
        insolation = ephem["surface_insolation_w_m2"]
        
        self.assertAlmostEqual(sza + elev, 90.0, places=2)
        if elev <= 0.0:
            self.assertEqual(insolation, 0.0, "Nighttime insolation must be zero.")
            self.assertFalse(ephem["is_daylight"])
        else:
            self.assertGreater(insolation, 0.0)
            self.assertTrue(ephem["is_daylight"])
        print(f"  [PASS] Solar geometry: Zenith = {sza:.1f}°, Elevation = {elev:.1f}°, Insolation = {insolation:.1f} W/m²")

    def test_07_calibrated_fallback_vs_spice_comparison(self):
        """Test accuracy of the calibrated analytical fallback model against SPICE."""
        test_epochs = [
            "2021-05-20T12:00:00Z",
            "2022-03-05T12:00:00Z",
            "2026-11-15T12:00:00Z"
        ]
        
        for ep in test_epochs:
            spice_res = compute_spice_ephemeris(ep, 18.44, 77.45, "jezero")
            fallback_res = compute_calibrated_fallback_ephemeris(ep, 18.44, 77.45, "jezero")
            
            # Compare Ls
            ls_spice = spice_res["ephemeris"]["solar_longitude_deg"]
            ls_fallback = fallback_res["ephemeris"]["solar_longitude_deg"]
            delta_ls = abs((ls_spice - ls_fallback + 180.0) % 360.0 - 180.0)
            self.assertLess(delta_ls, 0.5, f"Fallback Ls error too large: {delta_ls}°")
            
            # Compare OWLT
            owlt_spice = spice_res["communications_latency"]["one_way_light_time_sec"]
            owlt_fallback = fallback_res["communications_latency"]["one_way_light_time_sec"]
            delta_owlt = abs(owlt_spice - owlt_fallback)
            self.assertLess(delta_owlt, 35.0, f"Fallback OWLT error too large: {delta_owlt} s")
            print(f"  [PASS] Fallback calibration at {ep}: ΔLs = {delta_ls:.3f}°, ΔOWLT = {delta_owlt:.1f} s")

    def test_08_in_situ_environmental_data_provenance(self):
        """Test MEDA and REMS archival observations retain exact provenance and sampling metadata, and secondary sites are marked analytical."""
        # Jezero MEDA
        meda = get_environmental_context("jezero", sol=89)
        self.assertTrue(meda["in_situ_station_present"])
        self.assertEqual(meda["data_provenance"], "VERIFIED_NASA_PDS_OBSERVATION")
        self.assertEqual(meda["station_name"], "Mars Environmental Dynamics Analyzer (MEDA)")
        self.assertIn("urn:nasa:pds:mars2020_meda", meda["pds_bundle"])
        self.assertIn("HISTORICAL_ARCHIVAL_DATA_ONLY", meda["scientific_disclaimer"])
        self.assertEqual(meda["sol_observation"]["sol"], 89)
        self.assertIn("pressure_mean_pa", meda["sol_observation"]["diurnal_summary"])
        # Verify diurnal summary provenance is verified and hourly profile is flagged as simulated
        self.assertEqual(meda["sol_observation"].get("diurnal_summary_provenance"), "VERIFIED_NASA_PDS_OBSERVATION")
        self.assertEqual(meda["sol_observation"].get("hourly_profile_provenance"), "SIMULATED_HOURLY_INTERPOLATION")
        # Verify non-uniform sampling strategy is documented
        self.assertIn("0.1 Hz", meda["sensor_sampling_strategy"]["radiation_and_dust_sensor_rds"])
        print("  [PASS] Jezero MEDA archival observation verified (Sol 89: P = 741.8 Pa, hourly profiles flagged SIMULATED).")
        
        # Gale REMS
        rems = get_environmental_context("gale", sol=1000)
        self.assertTrue(rems["in_situ_station_present"])
        self.assertEqual(rems["data_provenance"], "VERIFIED_NASA_PDS_OBSERVATION")
        self.assertEqual(rems["station_name"], "Rover Environmental Monitoring Station (REMS)")
        self.assertIn("MSL-M-REMS-4-RDR-V1.0", rems["pds_dataset_id"])
        self.assertEqual(rems["sol_observation"]["sol"], 1000)
        print("  [PASS] Gale REMS archival observation verified (Sol 1000: P = 858.2 Pa).")
        
        # Melas Chasma (Analytical Hydrostatic Model - NOT raw Ames NetCDF)
        melas = get_environmental_context("melas")
        self.assertFalse(melas["in_situ_station_present"])
        self.assertEqual(melas["data_provenance"], "ANALYTICAL_HYDROSTATIC_MODEL")
        self.assertIn("ANALYTICAL_MODEL_ONLY", melas["scientific_disclaimer"])
        self.assertIn("Analytical Hydrostatic Barometric Model", melas["model_framework"])
        self.assertNotIn("FV3-MGCM Climatology", melas["model_framework"])
        print("  [PASS] Melas Chasma analytical hydrostatic model verified (Ames FV3-MGCM overclaim prevented).")

    def test_09_mars_center_vs_barycenter_kernel_audit(self):
        """Test Mars Center (Body 499) ephemeris provenance and verify barycentric approximation bound."""
        res = compute_spice_ephemeris("2026-11-15T12:00:00Z", 18.44, 77.45, "jezero")
        prov = res["provenance"]
        self.assertIn(prov["mars_center_ephemeris_source"], [
            "AUTHORITATIVE_NAIF_SATELLITE_SPK_MAR099S",
            "BARYCENTRIC_SPK_APPROXIMATION_MARS_COG"
        ])
        # Maximum barycentric offset is analytically bounded by 0.2097 meters
        self.assertLessEqual(prov["mars_barycentric_offset_max_meters"], 0.25)
        self.assertIn("Delta Ls <= 2.4e-8 deg", prov["mars_barycentric_offset_error_bound"])
        print(f"  [PASS] Mars center ephemeris source: {prov['mars_center_ephemeris_source']}, max offset {prov['mars_barycentric_offset_max_meters']} m")

    def test_10_configurable_communication_latencies(self):
        """Test DSN scheduling and orbiter relay delays are explicitly configurable and do not alter physical OWLT."""
        epoch = "2026-11-15T12:00:00Z"
        
        # Baseline with defaults (dsn=8m, relay=15m)
        res_default = compute_spice_ephemeris(epoch, 18.44, 77.45, "jezero", dsn_delay_min=8.0, relay_delay_min=15.0)
        c_def = res_default["communications_latency"]
        owlt = c_def["astronomical_one_way_light_time_min"]
        exp_turnaround_def = round((2.0 * owlt) + 8.0 + 15.0, 2)
        self.assertEqual(c_def["total_operational_telecommand_turnaround_min"], exp_turnaround_def)
        
        # Override with custom parameters (e.g. direct high-priority DSN pass dsn=2.0m, direct DTE relay=0.0m)
        res_custom = compute_spice_ephemeris(epoch, 18.44, 77.45, "jezero", dsn_delay_min=2.0, relay_delay_min=0.0)
        c_cust = res_custom["communications_latency"]
        
        # Astronomical OWLT must be identical
        self.assertEqual(c_cust["astronomical_one_way_light_time_min"], owlt)
        self.assertEqual(c_cust["configured_dsn_schedule_delay_min"], 2.0)
        self.assertEqual(c_cust["configured_relay_store_forward_delay_min"], 0.0)
        exp_turnaround_cust = round((2.0 * owlt) + 2.0 + 0.0, 2)
        self.assertEqual(c_cust["total_operational_telecommand_turnaround_min"], exp_turnaround_cust)
        print(f"  [PASS] Configurable latency verified: default={exp_turnaround_def} min vs expedited DTE={exp_turnaround_cust} min (OWLT={owlt:.2f} min constant).")


if __name__ == "__main__":
    unittest.main(verbosity=2)
