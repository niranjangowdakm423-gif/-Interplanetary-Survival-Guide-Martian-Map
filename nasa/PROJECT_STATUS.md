# ARES-NAV — Project Status Report

**Project Title:** ARES-NAV (Adaptive Route & Environment Survival Navigation)  
**Competition:** NASA Space Apps Challenge 2026  
**Challenge:** Interplanetary Survival Guide: Martian Map  
**Document Generation Date:** November 15, 2026  
**Current Development Phase:** P1 — Intelligent Mission Planning (Feature 1 completed)  

---

## 1. Executive Summary

ARES-NAV is an integrated Martian exploration, navigation, survival, and habitat-planning platform. It is engineered to assist astronauts on extravehicular activities (EVAs) and planetary mission planners by consolidating multimodal NASA planetary science datasets into an interactive, physics-based spatial analysis and pathfinding system.

The application combines real orbital raster data (MOLA, HiRISE, CTX), ground-level in-situ dosimetry (MSL RAD), and spectroscopy catalogs (CRISM) with a multi-objective anisotropic $A^*$ route planning algorithm that computes bioenergetic expenditures (Pandolf model), life support consumables ($O_2$, battery), ionizing radiation exposures, and Line-of-Sight (LOS) UHF communications.

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
  - `POST /api/plan_route`: Executes anisotropic multi-objective A* pathfinding. Now returns `route_comparison_matrix` (7-mode comparison), `explainability` (scientific rationale + NASA STD-3001 compliance), and `feasibility` (round-trip budget, PNR detection, waypoint margins). Accepts `generate_alternatives`, `custom_weights`, `feasibility_config`.
  - `POST /api/check_feasibility`: Dedicated feasibility endpoint returning full round-trip resource budget, PNR analysis, waypoint-by-waypoint margins, and mission controller recommendations.
  - `POST /api/emergency_abort`: Evaluates the fastest safe escape vector from any arbitrary point on the map to the nearest habitat airlock or natural SPE radiation shelter.
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
        ├── p1_mission_planning.js   # P1 route comparison, explainability, feasibility
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
| **Multi-Objective Route Modes (P1.1)** | 8 optimization modes: shortest, fastest, safest, lowest_resource, min_radiation, comm_aware, science, balanced. Custom weight support. | ✅ Completed | 10/10 automated tests passed (`test_p1_planning.py`) |
| **Route Comparison Matrix (P1.1)** | 7-mode side-by-side comparison (distance, time, O₂, safety, radiation, comm, composite score) | ✅ Completed | Sorted by composite score, active mode highlighted |
| **Explainability Dossier (P1.1)** | Scientific rationale, key trade-offs vs shortest path, hard constraints, soft preferences, NASA STD-3001 compliance checks | ✅ Completed | 4 NASA standards evaluated per route |
| **Mission Feasibility Engine (P1.1)** | Round-trip O₂ + battery budget, return leg via A*, PNR detection, waypoint-by-waypoint margins, FEASIBLE/MARGINAL/CRITICAL verdicts | ✅ Completed | PNR detection verified in test_p1_planning.py |
| **Frontend P1 Module** | `p1_mission_planning.js`: Compare Routes, Explain Route, Feasibility floating panels + inline feasibility banner | ✅ Completed | Loaded after route plan in app.js |
| **Life Support Telemetry** | Pandolf metabolic model (0.38g), $O_2$ consumption, battery drain, total rad dose | ✅ Completed | Real-time calculation along paths |
| **SPE Emergency Abort** | Fast escape pathfinding to airlocks & radiation shelters under solar storm conditions | ✅ Completed | Verified via `POST /api/emergency_abort` |
| **NASA Data Provenance** | Layer provenance badges (Verified, Calculated, Simulated, Partial) & coverage indicators | ✅ Completed | `p0_provenance.js` + DOM badges |
| **Mars Data Explorer** | Centralized NASA dataset catalog + 5-stage user file upload pipeline (CSV, GeoJSON, JSON) | ✅ Completed | `p0_data_explorer.js` |
| **User Data Ingestion** | REST upload, list, get, and delete endpoints with metadata tracking | ✅ Completed | Verified via unit tests (`test_server.py`) |
| **Beginner / Expert UI** | Mode toggle, simplified terminology, contextual tooltips, beginner site cards | ✅ Completed | `p0_ui.js` |
| **Interactive Tutorial** | 9-step guided walkthrough with DOM element highlights and step dots | ✅ Completed | `p0_tutorial.js` |
| **Knowledge Centre** | 13-term Mars exploration science glossary with definitions, significance & tool links | ✅ Completed | `p0_knowledge.js` |

---

## 4. Incomplete Features & Identified Technical Gaps

1. **Quantitative Data Uncertainty & Resolution Attributes:**
   - **Current State:** Layer metadata now reflects formal uncertainty budgets and provenance statuses (`VERIFIED_MOLA_RASTER`, `CALCULATED_TOPOGRAPHIC_MODEL`), with vertical accuracy indicators ($\pm 1.0\,\text{m}$ vs $\pm 12.0\,\text{m}$). Continued enrichment across the remaining secondary layers (CRISM band SNR, SHARAD dielectric permittivity confidence) is planned for P1.
   - **Impact:** Low (scientific credibility enhancement).
   - **Required Fix:** Expose formal uncertainty budgets in the layer metadata and UI inspector dossiers.

2. **Browse Tiles for CRISM and HiRISE at Secondary Sites:**
   - **Current State:** CRISM spectral browse PNGs and HiRISE sub-meter swaths are downloaded for Jezero Crater. Melas and Arcadia have MOLA hillshade tiles but lack HiRISE boulder micro-textures.
   - **Impact:** Low. Handled gracefully with deterministic physical models.

---

## 5. Known Bugs & Limitations

1. **Local Socket Permissions in Sandboxed Environments:**
   - Attempting to bind `127.0.0.1` on arbitrary ports via `urllib.request` inside sandboxed command runners can trigger `WinError 10013` (access permissions forbidden). Unit tests utilize mock request sockets for 100% deterministic local testing.
2. **Missing Browse Tiles for CRISM and HiRISE at Non-Jezero Sites:**
   - CRISM spectral cubes and HiRISE sub-meter swaths are only downloaded locally for Jezero Crater. Melas and Arcadia have MOLA hillshade tiles but lack HiRISE boulder micro-textures.

---

## 6. Existing Data Sources & Integrations

- **NASA Mars Trek WMTS (MOLA Hillshade, CTX 5m, THEMIS Day IR):** Real tile service configurations indexed in `mars_trek_manifest.json` and `nasa_tiles/`.
- **NASA PDS Orbital Data Explorer (MRO HiRISE RDRV11 & CRISM MTRDR):** 24 real HiRISE and 20 CRISM product records indexed in `ode_pds_products.json`.
- **NASA PDS PPI (Curiosity MSL RAD):** 5,570 indexed surface dosimetry observation records (`MSL-M-RAD-3-RDR-V1.0`) in `msl_rad_pds.json`.
- **ArcGIS OnMars REST (MRO CTX 5m Global Mosaic):** Active tile streaming URL template for Jezero, Melas, and Arcadia.

---

## 7. Current Development Phase & Immediate Next Steps

**Current Phase:** P1 — Intelligent Mission Planning (Feature 1 complete).

### Completed in P0 Milestone:
1. **Topographic Heightfield Synthesis:** Deterministic morphological elevation models for all 7 secondary sites. All 10 sites verified with non-zero elevation and Horn gradient slopes.
2. **User Hazard Pathfinding Avoidance:** Active penalty field ingestion into multi-objective A* routing in `server.py`.
3. **User Dataset Persistence:** Disk-backed JSON storage in `real_nasa_data/user_datasets.json`.
4. **Full P0 Test Suite:** 100% pass rate in `test_server.py`.

### Completed in P1 Milestone (Feature 1 — Explainable Multi-Objective Route Optimization):
1. **Extended `plan_eva_route`** to accept `custom_weights`, `generate_alternatives`, `feasibility_config`.
2. **`generate_route_comparisons_and_explanations`** — runs all 7 route modes, scores them on composite (safety 30%, O₂ 20%, time 20%, comms 15%, slope 15%), produces scientific rationale + NASA STD-3001 compliance checks.
3. **`evaluate_mission_feasibility`** — computes full round-trip budget (outbound + return via A*), waypoint-by-waypoint O₂ and battery margins, PNR detection, FEASIBLE/MARGINAL/CRITICAL verdicts with actionable recommendations.
4. **`POST /api/check_feasibility`** endpoint added.
5. **Frontend `p1_mission_planning.js`** module with 3 floating panels (Compare Routes matrix, Explain Route dossier, Feasibility report) + inline feasibility verdict banner.
6. **10/10 automated P1 tests** pass in `test_p1_planning.py`.

### Transition to P1 Feature 2 — Environmental Risk Heatmaps & Comm-Aware Planning:
- P1.1 is complete and fully tested.
- Next: Environmental risk overlay heatmap, dynamic CRISM update, and offline fallback capabilities.
