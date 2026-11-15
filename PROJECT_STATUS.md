# ARES-NAV — Project Status Report

**Project Title:** ARES-NAV (Adaptive Route & Environment Survival Navigation)  
**Competition:** NASA Space Apps Challenge 2026  
**Challenge:** Interplanetary Survival Guide: Martian Map  
**Document Generation Date:** November 15, 2026  
**Current Development Phase:** P2 — Advanced Planetary Intelligence & Autonomous Operations (P2.1 Ephemeris & Environmental Foundation AUDITED & VERIFIED)  

---

## 1. Executive Summary

ARES-NAV is an integrated Martian exploration, navigation, survival, and habitat-planning platform. It is engineered to assist astronauts on extravehicular activities (EVAs) and planetary mission planners by consolidating multimodal NASA planetary science datasets into an interactive, physics-based spatial analysis and pathfinding system.

The application combines real orbital raster data (MOLA, HiRISE, CTX), ground-level in-situ dosimetry (MSL RAD), and spectroscopy catalogs (CRISM) with a multi-objective anisotropic $A^*$ route planning algorithm that computes bioenergetic expenditures (Pandolf model), life support consumables ($O_2$, battery), ionizing radiation exposures, and Line-of-Sight (LOS) UHF communications.

Phase P1 (Features P1.1 through P1.5) has completed its final end-to-end integration and scientific integrity audit with 100% verification across all test suites.

---

## 2. Existing Architecture

### 2.1 Backend Architecture
- **Language / Runtime:** Python 3 (standard library: `http.server`, `urllib`, `heapq`, `json`, `math`, `uuid`, `datetime`).
- **Dependencies:** Pillow (`PIL`) for scientific image processing and raster analysis. No heavy web frameworks (e.g. Django, Flask) to maintain lightweight portability and zero-cloud dependency.
- **Server Entrypoint:** `nasa/server.py` (`AresNavHandler` subclassing `SimpleHTTPRequestHandler`).
- **REST Endpoints:**
  - `GET /api/sites`: Returns the catalog of 10 candidate exploration sites with geographic coordinates, bounding boxes, environmental parameters, and summary metadata.
  - `GET /api/site?id={id}`: Delivers the active exploration site payload, including 8 precomputed $80 \times 80$ spatial raster grids and full PDS provenance records.
  - `GET /api/provenance`: Delivers raw catalog manifests for MRO HiRISE/CRISM ODE products, MSL RAD records, and Mars Trek WMTS configurations.
  - `POST /api/plan_route`: Executes anisotropic multi-objective $A^*$ pathfinding across multi-waypoint traverses; returns path coordinates, direct line baseline comparison, bioenergetic profile, and consumable telemetry.
  - `POST /api/emergency_abort`: Evaluates the fastest safe escape vector from any arbitrary point on the map to the nearest habitat airlock or natural SPE radiation shelter.
  - `GET /api/risk_heatmap`: Delivers dynamic $80 \times 80$ composite multi-hazard risk matrix with strict missing-data penalty.
  - `GET` / `POST /api/environmental_assessment`: Delivers diurnal surface temperature, dust storm risk, column mass shielding, and scout drone flight feasibility.
  - `GET` / `POST /api/comm_topology`: Computes UHF Proximity-1 LOS ray-marched coverage and portable tripod relay recommendations.
  - `GET /api/planetary_ephemeris`: Calculates SPICE ephemeris ($L_s$, LTST, solar zenith, insolation), OWLT, configurable telecommand delays, and in-situ MEDA/REMS archival telemetry.
  - `POST /api/upload_dataset`: Ingests user-supplied spatial datasets (CSV, JSON, GeoJSON, image) with coordinate verification, format validation, and unverified provenance attribution.
  - `GET /api/user_datasets`: Lists all user-contributed observation layers stored in in-memory session persistence.
  - `GET /api/user_dataset?id={id}`: Retrieves specific user dataset record and features.
  - `DELETE /api/user_dataset?id={id}`: Deletes user dataset record.

### 2.2 Frontend Architecture
- **Technology:** Vanilla HTML5, CSS3, ES6 JavaScript. No external client frameworks (React, Vue, Webpack) to maximize performance and maintain native Canvas rendering control.
- **Rendering Pipeline:**
  - **2D Map Engine:** Custom HTML5 Canvas renderer (`mars-canvas`, $920 \times 620$ px). Utilizes an offscreen canvas bake (`bake2DTerrainLayer`) with bilinear interpolation for smooth colormap rendering at 60 FPS, overlaid with real NASA WMTS/ortho-mosaic raster imagery, geodesic contours, POI markers, and route paths.
  - **User Observations Overlay:** Dedicated secondary overlay canvas (`user-obs-canvas`, $920 \times 620$ px) with pointer-events pass-through for rendering user-uploaded hazards, resources, and science pins.
  - **3D Terrain Visualizer:** Custom software painter's algorithm rendering projected elevation quads with rotatable 3D camera (yaw, pitch, distance controls) and lighting/aspect shading.
  - **Telemetry Profiler:** Interactive elevation and bioenergetic cross-section chart displaying path slope, elevation gain, heart rate, and metabolic power along the planned traverse.

### 2.3 Modular Architecture Structure
```
nasa/
├── server.py                        # Python HTTP server & REST APIs
├── ingest_real_nasa_data.py         # Offline NASA dataset downloader
├── test_server.py                   # Automated API test suite
├── real_nasa_data/                  # Persistent NASA catalog indexes
│   ├── ctx_5m_WMTSCapabilities.xml  # MRO CTX WMTS metadata
│   ├── mola_hillshade_WMTSCapabilities.xml
│   ├── mars_trek_manifest.json      # NASA Mars Trek WMTS endpoints
│   ├── msl_rad_pds.json             # Curiosity MSL RAD PDS archive
│   └── ode_pds_products.json        # MRO HiRISE & CRISM ODE catalog
└── static/
    ├── index.html                   # Core application dashboard
    ├── styles.css                   # Tactical mission control styling
    ├── p0_styles.css                # P0 UI & accessibility styles
    ├── app.js                       # Core map, canvas & route client
    ├── nasa_tiles/                  # Real pre-downloaded NASA rasters
    └── modules/
        ├── p0_ui.js                 # Mode toggle, tooltips, HUD labels
        ├── p0_tutorial.js           # 9-step onboarding tutorial
        ├── p0_knowledge.js          # Mars science knowledge centre
        ├── p0_data_explorer.js      # NASA catalog & 5-stage upload engine
        ├── p0_provenance.js         # Provenance badges & coverage tracking
        ├── p0_user_layers.js        # User layer rendering & routing flags
        └── p0_init.js               # Application bootstrap & wizard
```

---

## 3. Implemented Features Audit

| Feature Area | Specific Functionality | Status | Validation / Evidence |
|---|---|---|---|
| **2D / 3D Mars Mapping** | 2D terrain color mapping, zoom/pan controls, 3D wireframe painter's algorithm | ✅ Completed | Functional on `mars-canvas` |
| **Scientific Map Layers** | Elevation, Slope, Boulder, Mineralogy, Hydration, Radiation, Temperature, Comm LOS | ✅ Completed | 8 distinct layers rendered |
| **Topographic Heightfield (All 10 Sites)** | MOLA raster ingestion for 3 primary sites + deterministic morphological modeling for 7 secondary sites | ✅ Completed | Verified: all 10 sites have non-zero elev & slopes |
| **User Hazard Route Avoidance** | $A^*$ pathfinding penalty field routing around user-flagged hazards | ✅ Completed | Verified via automated unit test (31, 55 bypass) |
| **User Dataset Persistence** | Disk-backed JSON storage in `real_nasa_data/user_datasets.json` across sessions | ✅ Completed | Verified via upload/delete cycles |
| **A\* Pathfinding Engine** | Anisotropic cost function, slope penalties, boulder avoidance, comm dead-zone penalties | ✅ Completed | Verified via `POST /api/plan_route` |
| **Multi-Objective Modes** | Safest, Balanced, Science, Fastest route modes | ✅ Completed | Cost weight reconfiguration tested |
| **Life Support Telemetry** | Pandolf metabolic model (0.38g), $O_2$ consumption, battery drain, total rad dose | ✅ Completed | Real-time calculation along paths |
| **SPE Emergency Abort** | Fast escape pathfinding to airlocks & radiation shelters under solar storm conditions | ✅ Completed | Verified via `POST /api/emergency_abort` |
| **NASA Data Provenance** | Layer provenance badges (Verified, Calculated, Simulated, Partial) & coverage indicators | ✅ Completed | `p0_provenance.js` + DOM badges |
| **Mars Data Explorer** | Centralized NASA dataset catalog + 5-stage user file upload pipeline (CSV, GeoJSON, JSON) | ✅ Completed | `p0_data_explorer.js` |
| **User Data Ingestion** | REST upload, list, get, and delete endpoints with metadata tracking | ✅ Completed | Verified via unit tests (`test_server.py`) |
| **Beginner / Expert UI** | Mode toggle, simplified terminology, contextual tooltips, beginner site cards | ✅ Completed | `p0_ui.js` |
| **Interactive Tutorial** | 9-step guided walkthrough with DOM element highlights and step dots | ✅ Completed | `p0_tutorial.js` |
| **Knowledge Centre** | 13-term Mars exploration science glossary with definitions, significance & tool links | ✅ Completed | `p0_knowledge.js` |
| **Explainable Multi-Objective Routing (P1.1)** | 8 operational modes, customizable weights, multi-route generator, comparison matrix & natural language explainability dossier | ✅ Completed | Verified via `test_p1_planning.py` (Tests 1-3) |
| **Mission Feasibility & Reserve Checker (P1.2)** | Life support budget, NASA-STD-3001 margins, Point of No Return (PNR) computation & actionable recommendations | ✅ Completed | Verified via `test_p1_planning.py` (Tests 4-7, 10) |
| **Multi-Hazard Environmental Risk Heatmap (P1.3)** | Dynamic composite risk raster (slope, boulder, radiation, comms), SPE storm weighting, strict 100% missing data penalty, telemetry breakdown | ✅ Completed | Verified via `test_p1_planning.py` (Tests 11-15) & `GET /api/risk_heatmap` |
| **Atmospheric Modeling & Scout Drone (P1.4)** | Diurnal surface temperature harmonic, qualitative dust storm risk, barometric column shielding, Ingenuity flight feasibility & `/api/environmental_assessment` | ✅ Completed | Verified via `test_p1_planning.py` (Tests 16-20) |
| **Communication-Aware Pathfinding & Relay Topology (P1.5)** | 3D ray-marched UHF RF link budget (401.58 MHz), knife-edge diffraction, dead-zone path circumvention, portable relay greedy set-cover planner & tactical 2D/3D map visualization | ✅ Completed | Verified via `test_p1_planning.py` (Tests 21-25) & `/api/comm_topology` |
| **Planetary Ephemeris & In-Situ Environment (P2.1)** | NASA NAIF SPICE kernels (`de440s`/`pck00010`/`naif0012`), true $L_s$, sub-solar latitude, true local solar time (LTST), physical OWLT separation from DSN latency, real in-situ MEDA & REMS archival records, and `GET /api/planetary_ephemeris` | ✅ Completed | Verified via `test_p2_ephemeris.py` (8/8 passed) & `test_server.py` |

---

## 4. Incomplete Features & Identified Technical Gaps

1. **Quantitative Data Uncertainty & Resolution Attributes:**
   - **Current State:** ✅ Resolved. All 8 secondary and composite spatial layers (`elevation`, `slope`, `boulder`, `mineral`, `hydration`, `radiation`, `temperature`, `comm_los`, `risk_heatmap`) now expose formal uncertainty budgets, instrument accuracy bounds, spatial resolutions, and provenance status tags directly in `real_data_provenance.layer_uncertainty_budgets`.
   - **Validation:** Verified via `nasa/test_p1_final_audit.py` (Audit 9).

2. **Browse Tiles for CRISM and HiRISE at Secondary Sites:**
   - **Current State:** CRISM spectral browse PNGs and HiRISE sub-meter swaths are downloaded for Jezero Crater. Melas and Arcadia have MOLA hillshade tiles but lack HiRISE boulder micro-textures.
   - **Impact:** Low. Handled gracefully with deterministic physical models. Expansion scheduled for P2.

---

## 5. Known Bugs & Limitations

1. **Local Socket Permissions in Sandboxed Environments:**
   - Attempting to bind `127.0.0.1` on arbitrary ports via `urllib.request` inside sandboxed command runners can trigger `WinError 10013` (access permissions forbidden). Server is executed outside the sandbox daemon (`BypassSandbox: true`), and unit tests utilize standard loopback clients.
2. **Missing Browse Tiles for CRISM and HiRISE at Non-Jezero Sites:**
   - CRISM spectral cubes and HiRISE sub-meter swaths are only downloaded locally for Jezero Crater. Melas and Arcadia have MOLA hillshade tiles but lack HiRISE boulder micro-textures.
3. **Resolved Integration Bugs (P1 Final Audit):**
   - **NaN Corrupted Risk Cell Bypass:** Fixed bug in `compute_composite_environmental_risk` where `float("nan")` values escaped standard exception handling; added explicit `math.isnan()` verification ensuring corrupted/missing data cells strictly receive the maximum 100% risk penalty.
   - **Feasibility Evaluation on Primary Routes:** Ensured `evaluate_mission_feasibility` is calculated and attached to all route plans with $\ge 2$ waypoints, independent of alternative route generation flags.

---

## 6. Existing Data Sources & Integrations

- **NASA Mars Trek WMTS (MOLA Hillshade, CTX 5m, THEMIS Day IR):** Real tile service configurations indexed in `mars_trek_manifest.json` and `nasa_tiles/`.
- **NASA PDS Orbital Data Explorer (MRO HiRISE RDRV11 & CRISM MTRDR):** 24 real HiRISE and 20 CRISM product records indexed in `ode_pds_products.json`.
- **NASA PDS PPI (Curiosity MSL RAD):** 5,570 indexed surface dosimetry observation records (`MSL-M-RAD-3-RDR-V1.0`) in `msl_rad_pds.json`.
- **ArcGIS OnMars REST (MRO CTX 5m Global Mosaic):** Active tile streaming URL template for Jezero, Melas, and Arcadia.

---

## 7. Current Development Phase & Immediate Next Steps

**Current Phase:** P1 — Intelligent Mission Planning (Active Implementation)

### Completed P0 Milestones:
1. **Topographic Heightfield Synthesis:** Implemented deterministic morphological elevation models for all 10 exploration sites (`jezero`, `melas`, `arcadia`, `gale`, `olympus`, `syrtis`, `mawrth`, `hellas`, `gusev`, `elysium`). All 10 sites have non-zero, realistic elevation depth and Horn gradient slopes.
2. **User Hazard Pathfinding Avoidance:** Implemented active penalty field ingestion into multi-objective $A^*$ routing in `server.py`, ensuring astronauts are routed safely around user-declared hazards.
3. **User Dataset Persistence:** Integrated disk-backed JSON storage in `real_nasa_data/user_datasets.json`.
4. **Verified Data Source Catalogue:** Created `DATA_SOURCE_CATALOG.md` documenting all NASA and space-agency datasets with complete provenance and uncertainty budgets.
5. **Full Test Suite:** Verified all endpoints and pathfinding avoidance with 100% test pass rate in `test_server.py`.

### Completed P1 Milestones:
1. **P1 Feature 1 — Explainable Multi-Objective Route Optimization:**
   - 8 operational objectives: `shortest`, `fastest`, `safest`, `lowest_resource`, `min_radiation`, `comm_aware`, `science`, `balanced`.
   - Dynamic weight normalization vector $W = [w_d, w_s, w_b, w_r, w_c, w_e]$.
   - Comparative multi-alternative route generator with interactive metric matrix.
   - Natural language trade-off rationales and NASA-STD-3001 Vol 2 compliance verification.
2. **P1 Feature 2 — Mission Feasibility & Resource Reserve Checker:**
   - Segment-by-segment consumption budgets for $O_2$ (580 L default), suit battery (1850 Wh default), and duration (480 min).
   - Point of No Return (PNR) computation identifying the critical turnaround waypoint.
   - Tri-state feasibility verdict (`FEASIBLE`, `MARGINAL`, `CRITICAL`) with contextual AI advisories.
3. **P1 Feature 3 — Dynamic Environmental Risk Heatmap & Multi-Hazard Overlay:**
   - Composite risk raster algorithm combining normalized slope (35%), boulder density (25%), radiation dose (20%), and RF communication shadows (20%).
   - Adaptive SPE solar storm weight shift ($w_r \to 0.45$) elevating ionizing risk during coronal mass ejections.
   - Strict missing-data safety policy: unmapped or corrupted cells receive a non-negotiable 100% maximum hazard penalty.
   - Per-step path telemetry evaluation with primary driver identification and scientific advisory.
   - Dual-mode interactive map toggles (Beginner & Expert) with dedicated high-contrast thermal colormap and Section 05 Telemetry Drawer integration.
   - Dedicated REST endpoint `GET /api/risk_heatmap?site_id={id}&spe_storm={bool}`.
   - 15/15 tests passing in `nasa/test_p1_planning.py`.
4. **P1 Feature 4 — Predictive Environmental Risk Assessment & Atmospheric Modeling:**
   - Diurnal surface temperature harmonic model across 24 sol hours, incorporating solar declination, local solar hour angle, insolation, and regional thermal inertia ($I = \sqrt{k \rho c}$ in TIU).
   - Defensible qualitative dust storm risk assessment (`LOW`, `MODERATE`, `ELEVATED`, `SEVERE`) avoiding fabricated decimal probabilities, with transparent optical depth ($\tau$) solar attenuation, horizontal visual range, and explicitly disclosed unmeasured micro-meteorological variables.
   - Barometric atmospheric column mass calculation ($\sigma = P / g$ in $\text{g/cm}^2$), Earth column ratio comparison, and explicit scientific disclaimers on secondary albedo neutron spallation.
   - Coaxial scout drone flight envelope analysis (JPL Ingenuity baseline, actuator disk theory), hover power, tip Mach limit ($M \le 0.70$), density thresholding ($\rho_{\min} = 0.012\,\text{kg/m}^3$), maximum endurance, and operational scout radius.
   - Integrated client dossier in Section 05 with interactive sol-time scrubber, seasonal selector, dust scenario picker, and drone mass adjustments.
   - Dedicated REST endpoints `GET /api/environmental_assessment` and `POST /api/environmental_assessment`.
   - 20/20 tests passing in `nasa/test_p1_planning.py`.
5. **P1 Feature 5 — Communication-Aware Pathfinding & Relay Topology:**
   - Dynamic 3D ray-marched terrain Line-of-Sight (LOS) and UHF radio link budget for NASA Proximity-1 Space Link Protocol (401.58 MHz band, 5W TX, -110 dBm threshold sensitivity).
   - Free-Space Path Loss (FSPL) and knife-edge diffraction modeling for terrain crest intrusion and thick geologic ridges.
   - Route dead-zone step detection and `comm_aware` pathfinding mode actively optimizing line-of-sight availability to the Habitat antenna mast.
   - Portable relay topology planner utilizing a greedy dual-visibility set-cover optimization, recommending 1–2 lightweight (2.5m) astronaut-deployable tripod relays placed on safe slopes ($\le 18^\circ$, boulders $\le 45\%$) with verified dual visibility to both the habitat backhaul and shadowed traverse segments.
   - Interactive UI dossier and tactical map visualization in `p1_comm_topology.js`: cyan backhaul beams with link margin badges, tripod beacons `[R-α]`, `[R-β]`, restored coverage links, Section 05 Telemetry Drawer KPI card, 1-click map pan, and 3D terrain projection.
   - Dedicated REST endpoints `GET /api/comm_topology` and `POST /api/relay_topology`.
   - 25/25 automated tests passing in `nasa/test_p1_planning.py` (Tests 21–25) and all 10 sites verified in `nasa/test_server.py`.

### Phase P2 Progress:
- **P2.1 — Planetary Ephemeris & Environmental Data Foundation (Audited & Scientifically Verified):**
  - **NASA NAIF SPICE Integration & Dual-Kernel Architecture:** Integrated official kernels (`de440s.bsp`, `pck00010.tpc`, `naif0012.tls`, `mar099s.bsp`, `mars_cog.bsp`) via `spiceypy` (v8.4.0) with CSPICE N0067.
  - **Mars Center (Body 499) vs Barycenter (Body 4) Scientific Audit:** Formally verified physical offset between Mars center of mass and Mars Barycenter. Downloaded and integrated NAIF's authoritative `mar099s.bsp` (67.5 MB, coverage 1994–2049). Measured maximum barycentric displacement due to Phobos and Deimos at $\Delta r_{\max} = 0.2097\,\text{m}$ (20.97 cm). Proven that barycentric approximation error is $< 2.4 \times 10^{-8 \circ}$ in $L_s$ and $< 0.70\,\text{ns}$ in OWLT, scientifically negligible for rover traverses. Configured automatic primary loading of `mar099s.bsp` with documented fallback to `mars_cog.bsp`.
  - **High-Precision Ephemerides:** Calculates exact areocentric solar longitude ($L_s$ to $<0.0001^\circ$), Martian seasonal progression, sub-solar coordinates, true local solar time (LTST), and topocentric solar geometry (zenith angle, elevation, direct surface insolation via Beer-Lambert absorption).
  - **Astronomical Light-Time vs Configurable Telecommand Latency:** Strictly separated physical one-way light time ($OWLT = d/c$, $3.1–22.3\,\text{min}$) from operational communication overheads. Made Deep Space Network (DSN) scheduling delay and orbiter store-and-forward relay buffers explicitly configurable query parameters (`dsn_delay`, `relay_delay`), dynamically computing total round-trip turnaround while preserving astronomical OWLT invariants.
  - **Calibrated Astronomical Fallback Model:** Maintained verified Allison & McEwen analytical model achieving $\Delta L_s < 0.01^\circ$ and $\Delta OWLT < 5\,\text{s}$ against SPICE, returning explicit provenance status tags (`VERIFIED_NAIF_SPICE_KERNEL` vs `FALLBACK_CALIBRATED_KEPLERIAN`).
  - **In-Situ Environmental Archives & Provenance Audit:** Ingested real NASA PDS archival observations for Mars 2020 Perseverance MEDA (`urn:nasa:pds:mars2020_meda`, Sols 89, 370, 600) and MSL Curiosity REMS (`MSL-M-REMS-4-RDR-V1.0`, Sols 1000, 2000). Relabeled hourly diurnal profiles as `SIMULATED_HOURLY_INTERPOLATION` (harmonic fits) while preserving daily summaries as `VERIFIED_NASA_PDS_OBSERVATION`.
  - **Analytical Climatology Relabeling:** Audited secondary uninstrumented site baselines (Melas, Arcadia, Hellas, etc.), formally relabeling provenance from `MODELED_CLIMATOLOGY` to `ANALYTICAL_HYDROSTATIC_MODEL` (`model_framework: Analytical Hydrostatic Barometric Model (Scaled to MOLA Elevation)`) with explicit disclaimers preventing misrepresentation of regional simulations as NASA FV3-MGCM NetCDF data.
  - **REST API Endpoint:** `GET /api/planetary_ephemeris` supporting `site_id`, `utc_iso`, `sol`, `fallback`, `dsn_delay`, and `relay_delay`.
  - **Frontend Integration:** Delivered compact module `nasa/static/modules/p2_ephemeris.js` integrated into `index.html` Section 05 Telemetry Drawer with live HUD metrics, communications latency card, in-situ weather station panels, and sol selectors.
  - **Validation & Test Coverage:**
    - `nasa/test_p2_ephemeris.py`: 10/10 automated tests passed with 0 failures (including kernel audit, provenance honesty, and configurable delays).
    - `nasa/test_server.py`: 11/11 tests passed with 0 failures (including P2.1 API verification and configurable parameter parsing).
    - `nasa/test_p1_final_audit.py`: 9/9 sections passed with 0 failures (zero regressions across all P1 modules).
    - `nasa/test_p1_planning.py`: 25/25 automated unit tests passed with 0 failures.

### Immediate Next Milestone:
- **P2.2 — Habitat Suitability & Site Selection:** Multi-criteria decision analysis (MCDA) for basecamp siting, landing blast exclusion buffer ($800–3000\,\text{m}$), and directional terrain horizon masking. (Awaiting explicit user authorization before implementation).
