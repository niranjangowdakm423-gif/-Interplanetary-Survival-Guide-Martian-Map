# ARES-NAV — P1 Implementation Plan
## Intelligent Mission Planning, Survival & Autonomous Decision Support

**Document Version:** 1.0  
**Phase:** P1 — Intelligent Mission Planning  
**Target Completion:** November 15, 2026  
**Status:** In Progress (Active Implementation)  

---

## 1. Executive Overview

Phase P1 extends ARES-NAV from a scientific visualization and basic $A^*$ routing system into an explainable, data-driven mission-planning and survival intelligence platform. P1 directly answers the core operational questions faced by Martian EVA astronauts and flight planners:
1. *Which route is safest and optimal under specific operational priorities?*
2. *Will the astronaut have enough $O_2$ and battery to complete the mission AND return safely with contingency reserves intact?*
3. *Where is the Point of No Return (PNR) along the traverse?*
4. *Why was a specific route selected over its alternatives?*

---

## 2. Feature Descriptions

### Feature 1: Explainable Multi-Objective Route Optimization
- **Optimization Objectives:**
  - `shortest` / `fastest`: Minimizes geodesic traverse distance and travel time.
  - `safest`: Maximum penalty against steep slopes, boulder fields, radiation, and cliff drops.
  - `lowest_resource`: Minimizes metabolic power (Pandolf bioenergetics), terrain friction, and slope grade.
  - `min_radiation`: Prioritizes topographic shadowing, cliff overhangs, and thick CO₂ column depressions.
  - `comm_aware`: Prioritizes direct Line-of-Sight (LOS) UHF link quality to habitat antenna.
  - `balanced`: Operational equilibrium between speed, safety, consumables, and comms.
- **Configurable Weights:** Users or automated systems can tune relative importance weights:
  $W = \{w_{\text{dist}}, w_{\text{slope}}, w_{\text{boulder}}, w_{\text{rad}}, w_{\text{comm}}, w_{\text{energy}}\}$.
- **Multi-Route Generation & Comparison:** Concurrently generates the primary route plus key comparative alternatives (`shortest`, `safest`, `lowest_resource`, `comm_aware`) and provides an interactive comparison matrix (distance, time, $O_2$, battery, max slope, radiation dose, comm LOS, composite score).
- **Explainability Dossier:** Provides natural language and quantitative explanations of trade-offs, advantages, and constraints compliance for every route.
- **Hard Constraints vs Soft Preferences:** Enforces NASA STD-3001 physical limits (slope $> \text{max\_slope\_deg}$ as impassable or heavily penalized) while treating scientific POI discovery as soft preferences.

### Feature 2: Mission Feasibility & Resource Reserve Checker
- **Inputs & Parameters:**
  - Initial oxygen supply ($O_2$ liters, default $580.0\,\text{L}$).
  - Initial suit battery capacity (default $1850.0\,\text{Wh}$).
  - Maximum mission duration (default $480\,\text{min}$ / 8 hrs).
  - Configurable emergency contingency reserve (default $20\%$ or 45 minutes of life support).
  - Return journey requirement (round-trip traverse back to habitat airlock).
- **Consumable Budget & Point of No Return (PNR):**
  - Segment-by-segment consumption and return budget calculation.
  - Calculation of Point of No Return (PNR): the farthest waypoint where remaining consumables equal return requirements plus emergency contingency buffer.
- **Feasibility Verdict:**
  - `FEASIBLE` (Nominal): All reserves remain above contingency thresholds.
  - `MARGINAL` (Warning): Traverse completes but breaches the 20% emergency reserve margin during return.
  - `CRITICAL` (Infeasible): Complete life support exhaustion prior to safe return.
- **Actionable AI Recommendations:** Specific recommendations to resolve infeasible traverses (reduce speed, change route mode, prune outer waypoints past PNR, divert to intermediate shelter).

---

## 3. Architecture & Module Reuse

### Existing Modules Reused:
- `nasa/server.py`:
  - `extract_real_raster_grids`: 8 spatial grids per site ($80 \times 80$).
  - `astar_segment`: Core 8-directional priority queue pathfinding.
  - `evaluate_traverse_telemetry`: Pandolf metabolic model ($0.38g$), $O_2$ burn rate, battery drain.
  - `compute_emergency_abort`: Fast shelter routing.
- `nasa/static/app.js`:
  - `state` management, `mars-canvas` rendering, 2D/3D toggle, waypoint manager.
- `nasa/static/modules/p0_user_layers.js`:
  - User hazard extraction and avoidance.

### New Modules & Extensions:
- `nasa/server.py` Extensions:
  - Extended `astar_segment` with configurable multi-objective weights and hard constraint filtering.
  - Multi-alternative route generator (`generate_alternative_routes`).
  - Explainability and comparative trade-off analyzer (`generate_route_explanation`).
  - Mission Feasibility Engine (`evaluate_mission_feasibility`).
  - New API endpoint: `POST /api/check_feasibility`.
- New Frontend Module: `nasa/static/modules/p1_mission_planning.js`:
  - Route mode selector (with `lowest_resource`, `min_radiation`, `comm_aware`).
  - Route Comparison Modal & Drawer showing trade-offs between modes.
  - Explainability Card detailing why the chosen route won and its specific trade-offs.
  - Mission Feasibility & Emergency Reserve widget with PNR indicator and recommendations.

---

## 4. Dependencies and Scientific Datasets

- **Topography & Elevation:** MGS MOLA 128 px/deg DEM (`Mars_MGS_MOLA_ClrShade_merge_global_463m`).
- **Roughness & Boulders:** MRO HiRISE RDRV11 sub-meter spatial gradient variance.
- **Radiation:** MSL RAD calibrated surface baseline ($26.67\,\mu\text{Sv/hr}$ GCR nominal / $195.0\,\mu\text{Sv/hr}$ SEP peak) modulated by MOLA atmospheric column mass.
- **Communications:** 3D ray-marched viewshed from habitat antenna mast.
- **Bioenergetics:** Pandolf et al. metabolic equation adapted for Martian gravity ($0.38g$):
  $$M = 1.5 W + 2.0 (W + L) \left(\frac{L}{W}\right)^2 + \eta (W + L) (1.5 V^2 + 0.35 V \cdot G)$$

---

## 5. Testing Criteria & Quality Gates

1. **Multi-Objective Routing Tests:**
   - Verify that `lowest_resource` reduces metabolic kcal and $O_2$ consumption compared to `fastest`.
   - Verify that `safest` reduces max slope and boulder exposure compared to `shortest`.
   - Verify that `comm_aware` maximizes Line-of-Sight visibility compared to canyon shadow routes.
   - Verify that custom weights are respected during path evaluation.
2. **Alternative Route Comparison Tests:**
   - Verify that 4 alternative routes are generated, evaluated, and scored against normalized criteria.
3. **Mission Feasibility Tests:**
   - Verify correct verdict (`FEASIBLE`) for safe short traverses.
   - Verify detection of `MARGINAL` when reserve drops below 20%.
   - Verify detection of `CRITICAL` when consumable limits are exceeded.
   - Verify Point of No Return (PNR) waypoint indexing.
4. **Automated Test Suite:**
   - Implement `nasa/test_p1_planning.py` with 100% assertions passing.

---

## 6. Implementation Order

1. **Step 1:** Author `P1_IMPLEMENTATION_PLAN.md` and document requirements.
2. **Step 2:** Extend `nasa/server.py` with multi-objective weighting, alternative route generation, explainability scoring, and the `/api/check_feasibility` endpoint.
3. **Step 3:** Implement `nasa/static/modules/p1_mission_planning.js` for client-side mode selection, comparison UI, explainability dossiers, and feasibility indicators.
4. **Step 4:** Integrate P1 UI elements and stylesheet rules into `index.html` and `p0_styles.css`.
5. **Step 5:** Write and run automated unit & integration tests (`test_p1_planning.py`).
6. **Step 6:** Update `PROJECT_STATUS.md` and report results.
