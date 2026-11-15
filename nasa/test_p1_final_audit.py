"""
ARES-NAV — P1 Final Integration & Scientific Integrity Audit
Comprehensive verification across all P1 features (P1.1 – P1.5):
  1. All 8 Multi-Objective Route Modes
  2. Mission Feasibility & PNR across all modes
  3. Dynamic Multi-Hazard Risk Heatmap & Missing-Data Enforcement
  4. Environmental Assessment & Scout Drone across all 10 Sites
  5. Communication-Aware Pathfinding, UHF Link Budget & Relay Topology
  6. Emergency Abort under Environmental & Comm Constraints
  7. User-Uploaded Hazard Routing Avoidance
  8. Beginner / Expert UI Schema Consistency
  9. Scientific Units, Provenance & Uncertainty Disclosures
"""
import sys
import os
import math
import json

sys.path.insert(0, os.path.dirname(__file__))
import server

SITE = server.PRECOMPUTED_SITES["jezero"]
WAYPOINTS = [
    {"gx": 18, "gy": 62, "name": "Octavia E. Butler Landing"},
    {"gx": 35, "gy": 48, "name": "Delta Scarp Promontory"},
    {"gx": 42, "gy": 50, "name": "Kodiak Butte"}
]

PASS = "[PASS]"
FAIL = "[FAIL]"

def check(cond, label):
    tag = PASS if cond else FAIL
    print(f"  {tag} {label}")
    if not cond:
        raise AssertionError(label)


# ── Audit 1: P1.1 Route Optimization Across All Eight Modes ─────────────────
def audit_1_all_eight_modes():
    print("\n=== Audit 1: Route Optimization Across All 8 Modes ===")
    modes = ["shortest", "fastest", "safest", "lowest_resource", "min_radiation", "comm_aware", "science", "balanced"]
    results = {}

    for m in modes:
        res = server.plan_eva_route(SITE, WAYPOINTS, mode=m, generate_alternatives=False)
        check("path" in res and len(res["path"]) > 0, f"{m}: path non-empty ({len(res['path'])} steps)")
        check("telemetry" in res and "summary" in res["telemetry"], f"{m}: telemetry present")
        sm = res["telemetry"]["summary"]
        check(sm["distance_m"] > 0, f"{m}: distance > 0m ({sm['distance_m']}m)")
        check(sm["duration_min"] > 0, f"{m}: duration > 0min ({sm['duration_min']}min)")
        check(sm["o2_liters"] > 0, f"{m}: O2 consumption > 0L ({sm['o2_liters']}L)")
        check(sm["battery_wh"] > 0, f"{m}: battery consumption > 0Wh ({sm['battery_wh']}Wh)")
        check(sm["calories_kcal"] > 0, f"{m}: metabolic burn > 0kcal ({sm['calories_kcal']}kcal)")
        check("comm_profile" in sm, f"{m}: comm_profile included in summary")
        check("atmospheric_profile" in sm, f"{m}: atmospheric_profile included in summary")
        results[m] = sm

    # Cross-mode scientific trade-off assertions
    check(results["safest"]["max_slope_deg"] <= results["shortest"]["max_slope_deg"] + 2.0,
          f"safest max slope ({results['safest']['max_slope_deg']}°) <= shortest ({results['shortest']['max_slope_deg']}°)")
    check(results["comm_aware"]["comm_profile"]["comm_coverage_pct"] >= results["shortest"]["comm_profile"]["comm_coverage_pct"],
          f"comm_aware coverage ({results['comm_aware']['comm_profile']['comm_coverage_pct']}%) >= shortest ({results['shortest']['comm_profile']['comm_coverage_pct']}%)")
    check(results["lowest_resource"]["o2_liters"] <= results["fastest"]["o2_liters"] + 2.0,
          f"lowest_resource O2 ({results['lowest_resource']['o2_liters']}L) <= fastest ({results['fastest']['o2_liters']}L)")
    print("  → All 8 routing modes verified with consistent physical telemetry.")


# ── Audit 2: P1.2 Feasibility Checker Evaluates Every Route Mode ─────────────
def audit_2_feasibility_across_all_modes():
    print("\n=== Audit 2: Feasibility Engine Compatibility Across All Modes ===")
    modes = ["shortest", "fastest", "safest", "lowest_resource", "min_radiation", "comm_aware", "science", "balanced"]

    for m in modes:
        route_res = server.plan_eva_route(SITE, WAYPOINTS, mode=m, generate_alternatives=False)
        check("feasibility" in route_res, f"{m}: feasibility attached to route result")
        feas = route_res["feasibility"]
        check("verdict" in feas, f"{m}: feasibility has verdict ({feas['verdict']})")
        check(feas["verdict"] in ("FEASIBLE", "MARGINAL", "CRITICAL"), f"{m}: valid verdict enum")
        check("pnr" in feas, f"{m}: Point of No Return (PNR) evaluated")
        check("waypoint_margins" in feas, f"{m}: waypoint margins evaluated")
        check("total_roundtrip" in feas, f"{m}: total roundtrip budget evaluated")
        check("recommendations" in feas and isinstance(feas["recommendations"], list), f"{m}: actionable recommendations list present")
        check("nasa_std_3001_checks" in feas, f"{m}: NASA-STD-3001 standard checks present")

    # Verify that severely constrained consumables trigger CRITICAL across modes
    tight_config = {"o2_capacity_l": 10.0, "battery_capacity_wh": 50.0}
    route_critical = server.plan_eva_route(SITE, WAYPOINTS, mode="balanced", generate_alternatives=False)
    crit_feas = server.evaluate_mission_feasibility(
        SITE, [(p["gx"], p["gy"]) for p in route_critical["path"]], WAYPOINTS, config=tight_config
    )
    check(crit_feas["verdict"] == "CRITICAL", f"tight limits correctly trip CRITICAL (got {crit_feas['verdict']})")
    check(crit_feas["total_roundtrip"]["remaining_o2_pct"] < 0.0, "O2 margin negative under exhaustion")
    print("  → Feasibility checker fully integrated across all route modes.")


# ── Audit 3: P1.3 Dynamic Risk Scores & Missing Data Policy ───────────────────
def audit_3_dynamic_risk_and_missing_data():
    print("\n=== Audit 3: Dynamic Risk Heatmap & Strict Missing-Data Policy ===")
    layers = SITE["layers"]
    site_meta = SITE["site"]

    # 1. Baseline risk vs SPE storm risk
    risk_base, meta_base = server.compute_composite_environmental_risk(layers, site_meta, spe_storm=False)
    risk_spe, meta_spe = server.compute_composite_environmental_risk(layers, site_meta, spe_storm=True)

    check(meta_spe["weights"]["w_radiation"] > meta_base["weights"]["w_radiation"],
          f"SPE storm elevates radiation weight ({meta_spe['weights']['w_radiation']} > {meta_base['weights']['w_radiation']})")
    check(meta_spe["mean_risk"] >= meta_base["mean_risk"],
          f"Mean risk increases under SPE storm ({meta_spe['mean_risk']} >= {meta_base['mean_risk']})")

    # 2. Strict 100% missing data policy
    corrupted_layers = {
        "elevation": [[-2500.0] * 80 for _ in range(80)],
        "slope": [[5.0] * 80 for _ in range(80)],
        "boulder": [[10.0] * 80 for _ in range(80)],
        "radiation": [[26.67] * 80 for _ in range(80)],
        "comm_los": [[100.0] * 80 for _ in range(80)]
    }
    # Corrupt cell (20, 20) with None and (21, 21) with NaN
    corrupted_layers["boulder"][20][20] = None
    corrupted_layers["slope"][21][21] = float("nan")

    risk_corr, meta_corr = server.compute_composite_environmental_risk(corrupted_layers, site_meta, spe_storm=False)
    check(risk_corr[20][20] == 100.0, f"Missing (None) data cell strictly penalized to 100% risk (got {risk_corr[20][20]})")
    check(risk_corr[21][21] == 100.0, f"Corrupted (NaN) data cell strictly penalized to 100% risk (got {risk_corr[21][21]})")
    check(meta_corr["missing_data_cells"] == 2, f"Missing cells tracked accurately (got {meta_corr['missing_data_cells']})")
    print("  → Dynamic risk engine and 100% missing-data fail-safe policy verified.")


# ── Audit 4: P1.4 Environmental Assessments Consistent Across All 10 Sites ───
def audit_4_environmental_assessment_all_10_sites():
    print("\n=== Audit 4: Environmental & Scout Drone Assessments Across All 10 Sites ===")
    site_keys = list(server.PRECOMPUTED_SITES.keys())
    check(len(site_keys) == 10, f"All 10 precomputed sites present (got {len(site_keys)})")

    for sid in site_keys:
        sdata = server.PRECOMPUTED_SITES[sid]
        site = sdata["site"]
        assessment = server.compute_comprehensive_environmental_assessment(
            site, sol_hour=14.0, ls_deg=0.0, dust_scenario="seasonal_baseline", drone_mass_kg=1.8
        )
        check("diurnal_temperature" in assessment, f"{sid}: diurnal_temperature present")
        check("dust_storm_risk" in assessment, f"{sid}: dust_storm_risk present")
        check("atmospheric_column" in assessment, f"{sid}: atmospheric_column present")
        check("scout_drone_feasibility" in assessment, f"{sid}: scout_drone_feasibility present")

        # Column mass must be positive
        cm = assessment["atmospheric_column"]["column_mass_g_cm2"]
        check(cm > 5.0, f"{sid}: column mass > 5 g/cm² ({cm} g/cm²)")

        # Drone feasibility must be valid enum
        v = assessment["scout_drone_feasibility"]["verdict"]
        check(v in ("OPTIMAL_FLIGHT", "MARGINAL_FLIGHT", "FLIGHT_GROUNDED"), f"{sid}: valid drone verdict ({v})")

    # Geomorphological contrast: Hellas Planitia (-7.2 km) vs Olympus Mons (+21.0 km)
    hellas_eval = server.compute_comprehensive_environmental_assessment(
        server.PRECOMPUTED_SITES["hellas"]["site"], sol_hour=14.0, drone_mass_kg=1.8
    )
    olympus_summit_eval = server.compute_comprehensive_environmental_assessment(
        server.PRECOMPUTED_SITES["olympus"]["site"], sol_hour=14.0, elevation_m=21000.0, drone_mass_kg=1.8
    )

    check(hellas_eval["atmospheric_column"]["column_mass_g_cm2"] > olympus_summit_eval["atmospheric_column"]["column_mass_g_cm2"] * 2.0,
          f"Hellas column mass ({hellas_eval['atmospheric_column']['column_mass_g_cm2']} g/cm²) > 2x Olympus ({olympus_summit_eval['atmospheric_column']['column_mass_g_cm2']} g/cm²)")
    check(hellas_eval["scout_drone_feasibility"]["verdict"] == "OPTIMAL_FLIGHT", "Hellas basin optimal for drone flight")
    check(olympus_summit_eval["scout_drone_feasibility"]["verdict"] == "FLIGHT_GROUNDED", "Olympus summit correctly grounded (air too thin)")
    print("  → Environmental physics and drone envelope verified across all 10 exploration sites.")


# ── Audit 5: P1.5 UHF Comm Degradation, Dead Zones & Relay Topology ──────────
def audit_5_comm_link_budget_and_relay_topology():
    print("\n=== Audit 5: UHF Link Budget, Dead Zones & Relay Restoration ===")

    # 1. Friis Free-Space Path Loss increases with distance
    fspl_100m = server.compute_uhf_link_budget(100.0)["fspl_db"]
    fspl_1km = server.compute_uhf_link_budget(1000.0)["fspl_db"]
    fspl_10km = server.compute_uhf_link_budget(10000.0)["fspl_db"]
    check(abs(fspl_1km - fspl_100m - 20.0) < 0.2, f"10x distance increases FSPL by exactly ~20 dB ({fspl_1km - fspl_100m:.2f} dB)")
    check(abs(fspl_10km - fspl_1km - 20.0) < 0.2, f"100x distance increases FSPL by another ~20 dB ({fspl_10km - fspl_1km:.2f} dB)")

    # 2. Obstruction knife-edge diffraction
    clear_link = server.compute_uhf_link_budget(2000.0, max_obstruction_m=0.0)
    shallow_diff = server.compute_uhf_link_budget(2000.0, max_obstruction_m=2.0)
    deep_diff = server.compute_uhf_link_budget(2000.0, max_obstruction_m=25.0)
    check(shallow_diff["diffraction_loss_db"] > 6.0, f"shallow obstruction causes diffraction loss > 6 dB ({shallow_diff['diffraction_loss_db']} dB)")
    check(deep_diff["diffraction_loss_db"] > shallow_diff["diffraction_loss_db"] + 15.0,
          f"deep obstruction diffraction ({deep_diff['diffraction_loss_db']} dB) > shallow ({shallow_diff['diffraction_loss_db']} dB)")
    check(deep_diff["is_dead_zone"] is True, "deep rock obstruction triggers dead zone")

    # 3. Relay topology greedy set-cover restoration in Melas Chasma canyon
    melas_site = server.PRECOMPUTED_SITES["melas"]
    canyon_path = [
        (melas_site["site"]["habitat"]["gx"], melas_site["site"]["habitat"]["gy"]),
        (30, 45), (35, 52), (40, 58), (55, 65)
    ]
    topo = server.plan_portable_relay_topology(melas_site, canyon_path, max_relays=2)
    check("initial_comm_coverage_pct" in topo, "initial_comm_coverage_pct in topology result")
    check("restored_comm_coverage_pct" in topo, "restored_comm_coverage_pct in topology result")
    check(topo["restored_comm_coverage_pct"] >= topo["initial_comm_coverage_pct"],
          f"Restored comm ({topo['restored_comm_coverage_pct']}%) >= initial ({topo['initial_comm_coverage_pct']}%)")
    check(topo["coverage_boost_pct"] >= 0.0, f"Coverage boost non-negative ({topo['coverage_boost_pct']}%)")

    # Check relay placement physical constraints
    for r in topo["recommended_relays"]:
        check(r["slope_deg"] <= 18.0, f"Relay slope {r['slope_deg']}° <= 18° astronaut safety limit")
        check(r["boulder_pct"] <= 45.0, f"Relay boulder {r['boulder_pct']}% <= 45% stability limit")
        check(r["backhaul"]["link_margin_db"] >= 10.0, f"Relay backhaul link margin {r['backhaul']['link_margin_db']} dB >= 10 dB")
    print("  → UHF Proximity-1 physics and portable relay optimization verified.")


# ── Audit 6: Emergency Abort Functional Under Comm & Environmental Risk ───────
def audit_6_emergency_abort_integration():
    print("\n=== Audit 6: Emergency Abort Integration Under Environmental Hazards ===")
    origin = (35, 48) # Delta scarp promontory
    abort_res = server.compute_emergency_abort(SITE, from_cell=origin, max_slope_deg=22.0)

    check(abort_res is not None, "abort calculation returned result")
    check("path" in abort_res and len(abort_res["path"]) > 0, "abort path non-empty")
    check("destination" in abort_res, "abort destination identified")
    dest = abort_res["destination"]
    check("name" in dest and "gx" in dest and "gy" in dest, "destination metadata complete")
    check("summary" in abort_res, "abort summary present")
    sm = abort_res["summary"]
    check("distance_m" in sm and sm["distance_m"] > 0, f"abort distance positive ({sm['distance_m']}m)")
    check("duration_min" in sm and sm["duration_min"] > 0, f"escape time positive ({sm['duration_min']}min)")
    check("o2_liters" in sm and sm["o2_liters"] > 0, f"abort O2 positive ({sm['o2_liters']}L)")
    check("radiation_dose_uSv" in sm, "abort radiation dose evaluated")
    print(f"  → Emergency shelter: {dest['name']} in {sm['duration_min']} min ({sm['distance_m']}m)")


# ── Audit 7: User-Uploaded Hazard Routing Avoidance ───────────────────────────
def audit_7_user_hazard_avoidance():
    print("\n=== Audit 7: Active Route Avoidance Around User Hazards ===")
    direct_route = server.plan_eva_route(SITE, [WAYPOINTS[0], WAYPOINTS[1]], mode="shortest", generate_alternatives=False)
    direct_cells = set((s["gx"], s["gy"]) for s in direct_route["path"])

    # Pick a cell directly in the path and declare it as a user hazard
    test_hazard_cell = list(direct_cells)[len(direct_cells) // 2]
    user_hazards_list = [
        {"gx": test_hazard_cell[0], "gy": test_hazard_cell[1], "radius_cells": 3.0, "name": "Synthetic Crevasse"}
    ]

    # Re-route with user hazard map
    diverted_route = server.plan_eva_route(
        SITE, [WAYPOINTS[0], WAYPOINTS[1]], mode="shortest", user_hazards=user_hazards_list, generate_alternatives=False
    )
    diverted_cells = set((s["gx"], s["gy"]) for s in diverted_route["path"])

    check(test_hazard_cell not in diverted_cells, f"Route actively circumvented declared user hazard at {test_hazard_cell}")
    print(f"  → User hazard at {test_hazard_cell} successfully avoided by A* pathfinder.")


# ── Audit 8: Beginner vs Expert Schema Consistency ───────────────────────────
def audit_8_beginner_expert_consistency():
    print("\n=== Audit 8: Beginner / Expert UI Schema Consistency ===")
    route_res = server.plan_eva_route(SITE, WAYPOINTS, mode="balanced")

    # Beginner labels / statuses present
    check("verdict" in route_res["feasibility"], "feasibility verdict present for beginners")
    check(route_res["feasibility"]["verdict"] in ("FEASIBLE", "MARGINAL", "CRITICAL"), "verdict enum standardized")
    check("recommendations" in route_res["feasibility"], "plain English recommendations present for beginners")

    # Expert quantitative metrics present
    sm = route_res["telemetry"]["summary"]
    check("distance_m" in sm and isinstance(sm["distance_m"], (int, float)), "expert exact distance_m present")
    check("calories_kcal" in sm and isinstance(sm["calories_kcal"], (int, float)), "expert exact calories_kcal present")
    check("o2_liters" in sm and isinstance(sm["o2_liters"], (int, float)), "expert exact o2_liters present")
    check("battery_wh" in sm and isinstance(sm["battery_wh"], (int, float)), "expert exact battery_wh present")
    check("comm_profile" in sm and "comm_coverage_pct" in sm["comm_profile"], "expert comm_coverage_pct present")
    check("atmospheric_profile" in sm and "atmospheric_column_mass_g_cm2" in sm["atmospheric_profile"], "expert column mass present")
    check(len(route_res["telemetry"]["profile"]) > 0 and "metabolic_watts" in route_res["telemetry"]["profile"][0], "step metabolic_watts present")
    print("  → API schemas maintain dual-mode accessibility (Beginner summary + Expert quantitative physics).")


# ── Audit 9: Scientific Units, Provenance & Uncertainty Disclosures ───────────
def audit_9_scientific_integrity_and_provenance():
    print("\n=== Audit 9: Scientific Units, Provenance & Uncertainty Budgets ===")
    site_payload = server.PRECOMPUTED_SITES["jezero"]
    prov = site_payload.get("real_data_provenance", {})

    check("elevation_layer" in prov, "elevation_layer provenance present")
    check("msl_rad_pds" in prov, "MSL RAD PDS archive provenance present")
    check(prov["msl_rad_pds"]["total_rdr_files_indexed"] == 5570, "5,570 real MSL RAD RDR files indexed")

    # Uncertainty budget disclosure
    check("layer_uncertainty_budgets" in prov, "formal layer_uncertainty_budgets attached")
    budgets = prov["layer_uncertainty_budgets"]
    for layer_name in ["elevation", "slope", "boulder", "mineral", "hydration", "radiation", "temperature", "comm_los", "risk_heatmap"]:
        check(layer_name in budgets, f"Uncertainty budget disclosed for '{layer_name}'")
        b = budgets[layer_name]
        check("accuracy" in b, f"Accuracy indicator present for '{layer_name}' ({b['accuracy']})")
        check("status" in b, f"Provenance status present for '{layer_name}' ({b['status']})")
        check("resolution_m" in b, f"Spatial resolution disclosed for '{layer_name}' ({b['resolution_m']}m)")

    # Disclaimers on unmeasured micro-meteorological variables
    atmo = server.compute_comprehensive_environmental_assessment(SITE["site"])
    dust_risk = atmo["dust_storm_risk"]
    check("unknown_environmental_variables" in dust_risk, "Transparent disclosure of unknown micro-meteorological variables")
    check(len(dust_risk["unknown_environmental_variables"]) >= 3, "At least 3 unmeasured variables explicitly stated")
    print("  → Formal uncertainty budgets, physical units and scientific disclaimers verified.")


# ── Audit Runner ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    audits = [
        audit_1_all_eight_modes,
        audit_2_feasibility_across_all_modes,
        audit_3_dynamic_risk_and_missing_data,
        audit_4_environmental_assessment_all_10_sites,
        audit_5_comm_link_budget_and_relay_topology,
        audit_6_emergency_abort_integration,
        audit_7_user_hazard_avoidance,
        audit_8_beginner_expert_consistency,
        audit_9_scientific_integrity_and_provenance
    ]

    passed = 0
    failed = 0
    print("=" * 65)
    print("ARES-NAV — P1 FINAL INTEGRATION & SCIENTIFIC INTEGRITY AUDIT")
    print("=" * 65)

    for a in audits:
        try:
            a()
            passed += 1
        except AssertionError as e:
            print(f"  *** AUDIT ASSERTION FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"  *** UNEXPECTED ERROR in {a.__name__}: {e}")
            failed += 1

    print("\n" + "=" * 65)
    print(f"Audit Summary: {passed}/{passed+failed} sections verified, {failed} failures")
    print("=" * 65)
    if failed > 0:
        sys.exit(1)
