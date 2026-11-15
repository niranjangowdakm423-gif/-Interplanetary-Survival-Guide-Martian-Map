# ARES-NAV — Developer Team Handover Document
**Project:** Adaptive Route & Environment Survival Navigation (ARES-NAV)  
**Competition:** NASA Space Apps Challenge 2026 — *Interplanetary Survival Guide: Martian Map*  
**Handover Checkpoint:** Milestone P2.1 Sealed, Verified, and Audited  
**Document Date:** November 15, 2026  
**Target Recipient:** Inbound Developer Continuing P2.2 (Habitat Suitability & Site Selection)  

---

## 1. Project Overview & Objectives

ARES-NAV is an astronaut survival navigation, route planning, and planetary intelligence system developed for human and robotic Mars surface operations. Built to address the NASA Space Apps Challenge 2026 theme *"Interplanetary Survival Guide: Martian Map"*, the platform integrates multimodal NASA orbital and in-situ planetary science data into an interactive, physics-grounded decision-support tool.

### Core Mission Objectives:
- **Astronaut Survivability:** Anisotropic bioenergetics modeling (Pandolf 0.38g metabolic expenditure, metabolic rate $W$, heart rate, consumable oxygen liters, and suit battery depletion).
- **Planetary Hazard Avoidance:** Multi-hazard avoidance encompassing steep slopes ($>22^\circ$ locomotion limit), dangerous boulder fields, solar particle event (SPE) ionizing radiation spikes, and communication dead zones.
- **Explainable Autonomous Navigation:** 8 distinct multi-objective route optimization profiles with trade-off matrices, Point-of-No-Return (PNR) computation, and NASA-STD-3001 Vol 2 flight-rule compliance checks.
- **Planetary Ephemeris & Astronomical Realism:** Authoritative NASA NAIF SPICE kernel astronomical calculations ($L_s$, sub-solar coordinates, true local solar time, direct insolation, and physical One-Way Light Time).
- **Zero-Cloud Portability:** Standard Python HTTP backend with vanilla HTML5/Canvas 2D/3D visualization designed to run entirely locally without external cloud dependencies.

---

## 2. Implemented Features Catalogue (P0, P1, P2.1)

### Phase P0 — Core Foundations & Verified NASA Data Architecture
- **2D Canvas Map Engine:** High-performance HTML5 Canvas (`mars-canvas`, $920 \times 620$ px) with offscreen raster pre-baking (`bake2DTerrainLayer`) and bilinear interpolation rendering 8 spatial layers at 60 FPS.
- **3D Interactive Wireframe Visualizer:** Custom software painter's algorithm rendering projected elevation quads with rotatable 3D camera (yaw, pitch, distance controls) and dynamic aspect shading.
- **Topographic Heightfield Synthesis (All 10 Sites):** Real MOLA raster ingestion for 3 primary sites (`jezero`, `melas`, `arcadia`) + deterministic morphological elevation heightfields for 7 secondary sites (`gale`, `olympus`, `syrtis`, `mawrth`, `hellas`, `gusev`, `elysium`).
- **User Observations & Hazard Avoidance:** Dedicated overlay canvas (`user-obs-canvas`) supporting dynamic placement of user-flagged hazards with real-time $A^*$ pathfinding avoidance.
- **NASA Data Explorer & Upload Pipeline:** Ingestion of user-supplied spatial datasets (CSV, JSON, GeoJSON) with coordinate verification, format validation, and disk-backed persistence (`real_nasa_data/user_datasets.json`).
- **Beginner / Expert Dual UI:** Mode toggle switching between simplified terminology with plain-English summaries and comprehensive quantitative physics telemetry.
- **Educational Knowledge Centre & Tutorial:** 9-step guided interactive onboarding tutorial and a 13-term Mars exploration science glossary.

### Phase P1 — Intelligent Mission Planning & Environmental Modeling
- **P1.1 — Explainable Multi-Objective Routing:** 8 operational modes (`shortest`, `fastest`, `safest`, `lowest_resource`, `min_radiation`, `comm_aware`, `science`, `balanced`), customizable priority weights, multi-route generator, comparative metric matrix, and natural language explainability dossiers.
- **P1.2 — Mission Feasibility & Reserve Checker:** Segment-by-segment consumption budgets for $O_2$ (580 L), suit battery (1850 Wh), and duration (480 min); Point of No Return (PNR) computation; and NASA-STD-3001 Vol 2 safety verdicts (`FEASIBLE`, `MARGINAL`, `CRITICAL`).
- **P1.3 — Dynamic Multi-Hazard Risk Heatmap:** Composite risk raster algorithm combining slope (35%), boulders (25%), radiation (20%), and RF shadows (20%), featuring adaptive SPE storm weighting and a strict 100% risk penalty for unmapped or corrupted cells.
- **P1.4 — Predictive Atmospheric Modeling & Scout Drone Feasibility:** Diurnal surface temperature harmonic model (24 sol hours), qualitative dust storm risk assessment, barometric column mass shielding ($\sigma = P/g$), and JPL Ingenuity-class coaxial scout drone aerodynamic flight envelope analysis ($M \le 0.70$, $\rho \ge 0.012\,\text{kg/m}^3$).
- **P1.5 — Communication-Aware Pathfinding & Portable Relay Topology:** 3D ray-marched terrain Line-of-Sight (LOS) and UHF radio link budget for NASA Proximity-1 Space Link Protocol (401.58 MHz band, 5W TX, -110 dBm sensitivity); Free-Space Path Loss (FSPL) and knife-edge diffraction; `comm_aware` pathfinding; and greedy dual-visibility set-cover portable tripod relay planner.

### Phase P2.1 — Planetary Ephemeris & Environmental Data Foundation
- **NASA NAIF SPICE Integration:** Multi-kernel ephemeris engine leveraging `spiceypy` (v8.4.0, CSPICE N0067) loading `de440s.bsp`, `mar099s.bsp`, `pck00010.tpc`, and `naif0012.tls`.
- **High-Precision Ephemerides:** Exact areocentric solar longitude ($L_s$ to $<0.0001^\circ$), Martian seasonal classification, sub-solar coordinates, true local solar time (LTST), and solar topocentric geometry (zenith angle, elevation, direct surface insolation).
- **Physical OWLT vs Operational Latency:** Strict separation of astronomical One-Way Light Time ($OWLT = d/c$, $3.1–22.3\,\text{min}$) from ground telecommand delays (configurable DSN schedule delays and orbiter store-and-forward relay buffers).
- **Calibrated Astronomical Fallback Model:** Independent Allison & McEwen analytical model achieving $\Delta L_s < 0.01^\circ$ and $\Delta OWLT < 5\,\text{s}$ against SPICE, returning explicit provenance status tags (`VERIFIED_NAIF_SPICE_KERNEL` vs `FALLBACK_CALIBRATED_KEPLERIAN`).
- **In-Situ Environmental Archives:** Ingested real NASA PDS archival observations for Mars 2020 Perseverance MEDA at Jezero Crater (`urn:nasa:pds:mars2020_meda`, Sols 89, 370, 600) and MSL Curiosity REMS at Gale Crater (`MSL-M-REMS-4-RDR-V1.0`, Sols 1000, 2000), clearly distinguishing verified daily summaries from simulated hourly harmonic fits.
- **Analytical Climatology Relabeling:** Audited secondary uninstrumented site baselines, formally relabeling provenance from `MODELED_CLIMATOLOGY` to `ANALYTICAL_HYDROSTATIC_MODEL` to prevent simulation overclaiming.
- **REST API Endpoint:** `GET /api/planetary_ephemeris` supporting `site_id`, `utc_iso`, `sol`, `fallback`, `dsn_delay`, and `relay_delay`.
- **Frontend Integration:** Module `p2_ephemeris.js` integrated into `index.html` Section 05 Telemetry Drawer with live HUD metrics, communications latency card, in-situ weather station panels, and sol selectors.

---

## 3. Project Architecture & Folder Structure

```
c:\Users\HP\Downloads\nasa1\
├── DATA_SOURCE_CATALOG.md           # Master planetary datasets catalogue & provenance
├── P1_IMPLEMENTATION_PLAN.md        # Detailed P1 engineering specifications
├── P2_ARCHITECTURE_DESIGN.md        # P2 system architecture & research methodologies
├── P2_DATA_SOURCE_RESEARCH.md       # P2 data source manifests & API specifications
├── P2_IMPLEMENTATION_PLAN.md        # P2 engineering implementation plan (P2.1–P2.6)
├── P2_RESEARCH_OPPORTUNITIES.md     # Extended research frontiers for ARES-NAV
├── PROJECT_STATUS.md                # Live project milestone tracking & audit status
├── TEAM_HANDOVER.md                 # This master handover document
├── NEXT_DEVELOPER_START_HERE.md     # Fast onboarding guide for incoming developer
├── requirements.txt                 # Python PIP dependencies
└── nasa/
    ├── requirements.txt             # Nested pip requirements
    ├── server.py                    # Core HTTP server, REST routing, and A* pathfinder
    ├── ingest_real_nasa_data.py     # Offline downloader for NASA PDS catalogs & tiles
    ├── test_server.py               # Automated server endpoints test suite (11/11 tests)
    ├── test_p1_planning.py          # Automated P1 planning unit tests (25/25 tests)
    ├── test_p1_final_audit.py       # P1 final integration audit test suite (9/9 sections)
    ├── test_p2_ephemeris.py         # Automated P2.1 ephemeris & environmental tests (10/10 tests)
    ├── p2/                          # Phase 2 Python Intelligence Modules
    │   ├── __init__.py              # Package marker
    │   ├── ephemeris_engine.py      # NASA NAIF SPICE ephemeris & Allison-McEwen fallback
    │   └── environmental_engine.py  # In-situ PDS telemetry (MEDA/REMS) & hydrostatic model
    ├── real_nasa_data/              # Local persistent NASA catalogs & SPICE kernels
    │   ├── ctx_5m_WMTSCapabilities.xml
    │   ├── mola_hillshade_WMTSCapabilities.xml
    │   ├── mars_trek_manifest.json
    │   ├── msl_rad_pds.json         # 5,570 MSL RAD surface dosimetry records
    │   ├── ode_pds_products.json    # MRO HiRISE & CRISM PDS products index
    │   ├── user_datasets.json       # Session storage for user observations
    │   ├── environmental/           # PDS environmental observation samples
    │   │   ├── meda_jezero_samples.json   # Mars 2020 MEDA calibrated records (Sols 89, 370, 600)
    │   │   └── rems_gale_samples.json     # MSL REMS calibrated records (Sols 1000, 2000)
    │   └── spice/                   # NASA NAIF SPICE Kernels (~100 MB total)
    │       ├── naif0012.tls         # Generic leapseconds kernel
    │       ├── pck00010.tpc         # Planetary physical constants & IAU orientation
    │       ├── de440s.bsp           # JPL Planetary Ephemeris (Inner solar system)
    │       ├── mar099s.bsp          # NAIF Mars Satellite Ephemeris (Authoritative Mars Center)
    │       └── mars_cog.bsp         # SPK Type 8 Barycenter segment (Lightweight fallback)
    └── static/                      # Web Client Assets
        ├── index.html               # Main tactical mission control dashboard
        ├── styles.css               # Tactical UI styles & Canvas layouts
        ├── p0_styles.css            # P0 UI & accessibility styles
        ├── app.js                   # Map rendering, layer blending, and route client
        ├── nasa_tiles/              # Local WMTS MOLA, CTX, and HiRISE sample tiles
        └── modules/                 # Modular ES6 client components
            ├── p0_ui.js             # Beginner/Expert mode toggle, HUD, tooltips
            ├── p0_tutorial.js       # 9-step guided interactive walkthrough
            ├── p0_knowledge.js      # Mars science knowledge centre & glossary
            ├── p0_data_explorer.js  # NASA catalog explorer & 5-stage upload engine
            ├── p0_provenance.js     # Data provenance badges & coverage tracking
            ├── p0_user_layers.js    # User-uploaded hazard/resource overlay renderer
            ├── p0_init.js           # Client bootstrap & wizard coordinator
            ├── p1_mission_planning.js # P1.1 Route alternatives & P1.2 Feasibility UI
            ├── p1_atmospheric.js    # P1.4 Thermal, dust, column & drone telemetry UI
            ├── p1_comm_topology.js  # P1.5 UHF RF link budget & portable relay UI
            └── p2_ephemeris.js      # P2.1 Ephemeris, solar geometry, and MEDA/REMS UI
```

---

## 4. Key Python & JavaScript Modules

### Backend Python Modules:
- **`nasa/server.py`:** Main HTTP request handler (`AresNavHandler`). Manages all REST endpoints, serves static assets, executes anisotropic $A^*$ multi-objective pathfinding, evaluates traverse telemetry (Pandolf metabolic model, O2, battery), computes emergency abort vectors, and coordinates relay topology.
- **`nasa/p2/ephemeris_engine.py`:** NAIF SPICE kernel manager (`load_spice_kernels`) with dual-kernel resolution (`mar099s.bsp` primary, `mars_cog.bsp` fallback). Computes solar longitude ($L_s$), true local solar time (`et2lst`), sub-solar point (`reclat`), solar zenith/elevation, direct insolation, and one-way light time (`spkpos`). Houses Allison & McEwen (2000) calibrated analytical fallback model.
- **`nasa/p2/environmental_engine.py`:** Ingestion and retrieval engine for Mars 2020 MEDA (`urn:nasa:pds:mars2020_meda`) and MSL Curiosity REMS (`MSL-M-REMS-4-RDR-V1.0`). Dispatches real PDS daily summaries for Jezero and Gale, and barometrically scaled hydrostatic atmospheric baselines for secondary exploration sites.

### Frontend JavaScript Modules:
- **`nasa/static/app.js`:** Core application canvas engine. Controls 2D layer blending, offscreen canvas pre-baking (`bake2DTerrainLayer`), 3D projected wireframe rendering, user waypoint placement, route path drawing, and Section 05 Telemetry Drawer synchronization.
- **`nasa/static/modules/p1_mission_planning.js`:** Renders multi-objective route comparisons, trade-off radar matrices, Point-of-No-Return (PNR) waypoint markers, consumable reserve gauges, and NASA-STD-3001 compliance badges.
- **`nasa/static/modules/p1_comm_topology.js`:** Renders cyan UHF communication backhaul vectors, tripod relay beacons `[R-α]` and `[R-β]`, RF link margin badges, and dead-zone traversal warnings.
- **`nasa/static/modules/p1_atmospheric.js`:** Renders diurnal thermal oscillation curves, qualitative dust storm advisory cards, atmospheric column mass, and scout drone flight feasibility indicators.
- **`nasa/static/modules/p2_ephemeris.js`:** Section 05 Telemetry Drawer component displaying real-time SPICE ephemeris (solar longitude, true local solar time, sub-solar coordinates, surface insolation), operational telecommand turnaround (OWLT + configurable DSN/relay delays), and in-situ weather station panels.

---

## 5. Technology Stack & Dependencies

- **Platform:** Windows, macOS, or Linux.
- **Python Version:** Python 3.10, 3.11, or 3.12 (standard CPython).
- **Core Python Dependencies:**
  - `Pillow>=10.0.0` (scientific image handling and raster manipulation).
  - `spiceypy>=8.4.0` (NASA NAIF CSPICE N0067 C-library bindings for Python).
- **Standard Library Modules Used:** `http.server`, `urllib`, `heapq`, `json`, `math`, `uuid`, `datetime`, `os`, `sys`, `unittest`, `typing`.
- **Frontend Technologies:** Vanilla HTML5, CSS3, ES6 JavaScript, HTML5 Canvas 2D / Software 3D.
- **Zero Heavy Frameworks:** No React, Angular, Vue, Node.js, Webpack, Django, Flask, or external database required.

---

## 6. Step-by-Step Setup Instructions for Another Laptop

1. **Extract ZIP Archive:**
   Extract `ARES-NAV-P2.1-HANDOVER.zip` into any directory (e.g. `C:\Users\Username\Projects\ARES-NAV`).
2. **Open Terminal / PowerShell:**
   Navigate into the extracted project root:
   ```powershell
   cd C:\Users\Username\Projects\ARES-NAV
   ```
3. **Set Up Python Environment:**
   Ensure Python 3.10+ is installed (`python --version`). Create and activate a virtual environment (optional but recommended):
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
4. **Install Required Packages:**
   ```powershell
   pip install -r requirements.txt
   ```
   *(Installs `Pillow` and `spiceypy`)*
5. **Verify SPICE Installation:**
   ```powershell
   python -c "import spiceypy as sp; print('CSPICE Version:', sp.tkvrsn('TOOLKIT'))"
   ```
   *(Expected output: `CSPICE Version: CSPICE_N0067`)*
6. **Start the ARES-NAV Server:**
   ```powershell
   python nasa/server.py
   ```
   *(Console will print: `[ARES-NAV] Server running at http://127.0.0.1:8000/`)*
7. **Open the Web Application:**
   Open any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox) and navigate to:
   ```
   http://127.0.0.1:8000/
   ```

---

## 7. NASA Datasets & SPICE Kernels Manifest

All required kernels and dataset catalogs are **already pre-staged** in the `nasa/real_nasa_data/` directory. No external downloads are required to run the project. However, for audit, verification, or re-downloading, official NASA sources are listed below:

| File Name | Size | Local Relative Path | Official NASA / NAIF Source URL | Purpose |
|---|---|---|---|---|
| `naif0012.tls` | 5.3 KB | `nasa/real_nasa_data/spice/` | [NAIF Generic Kernels LSK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls) | Generic leapseconds kernel for UTC to ET/TDB conversion. |
| `pck00010.tpc` | 126 KB | `nasa/real_nasa_data/spice/` | [NAIF Generic Kernels PCK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00010.tpc) | Planetary physical constants and IAU_MARS body-fixed frame orientation. |
| `de440s.bsp` | 32.7 MB | `nasa/real_nasa_data/spice/` | [NAIF Generic Kernels SPK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp) | JPL Planetary Ephemeris (Sun, Earth, Mars Barycenter 1900–2050). |
| `mar099s.bsp` | 67.5 MB | `nasa/real_nasa_data/spice/` | [NAIF Mars Satellite SPK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/mar099s.bsp) | Authoritative Mars satellite ephemeris (Body 499, Phobos, Deimos 1994–2049). |
| `mars_cog.bsp` | 4.0 KB | `nasa/real_nasa_data/spice/` | Locally generated by `ephemeris_engine.py` | SPK Type 8 segment defining Body 499 at Body 4 barycenter (fallback). |
| `meda_jezero_samples.json` | 4.5 KB | `nasa/real_nasa_data/environmental/` | [NASA PDS Atmospheres Node](https://pds-atmospheres.nmsu.edu/) (`urn:nasa:pds:mars2020_meda`) | In-situ calibrated environmental records for Jezero Crater (Sols 89, 370, 600). |
| `rems_gale_samples.json` | 2.1 KB | `nasa/real_nasa_data/environmental/` | [NASA PDS Atmospheres Node](https://pds-atmospheres.nmsu.edu/) (`MSL-M-REMS-4-RDR-V1.0`) | In-situ calibrated environmental records for Gale Crater (Sols 1000, 2000). |
| `msl_rad_pds.json` | 5.5 KB | `nasa/real_nasa_data/` | [NASA PDS PPI Node](https://pds-ppi.igpp.ucla.edu/) (`MSL-M-RAD-3-RDR-V1.0`) | Surface dosimetry calibration records from MSL Curiosity. |
| `ode_pds_products.json` | 28.5 KB | `nasa/real_nasa_data/` | [NASA PDS Geosciences ODE](https://ode.rsl.wustl.edu/mars/) | Metadata for 44 MRO HiRISE RDRV11 and CRISM MTRDR products. |
| `mars_trek_manifest.json` | 4.4 KB | `nasa/real_nasa_data/` | [NASA Mars Trek WMTS](https://trek.nasa.gov/mars/) | WMTS endpoint definitions for global MOLA, CTX, and THEMIS layers. |

---

## 8. Complete Backend API Endpoints Reference

| Method | Endpoint | Query / Body Parameters | Purpose & Output Description |
|---|---|---|---|
| `GET` | `/api/sites` | None | Returns list of all 10 candidate exploration sites with lat/lon, bounding boxes, and environmental parameters. |
| `GET` | `/api/site` | `?id={site_id}` (e.g. `jezero`, `melas`) | Returns $80 \times 80$ cell spatial rasters (elevation, slope, boulder, mineral, hydration, radiation, temperature, comm LOS) + POIs and metadata. |
| `GET` | `/api/provenance` | None | Returns catalog manifests for MRO HiRISE/CRISM ODE products, MSL RAD archive, and Mars Trek WMTS endpoints. |
| `POST` | `/api/plan_route` | JSON: `{"site_id": str, "mode": str, "waypoints": [[x,y],...], "suit_mass_kg": float, "spe_storm": bool, "user_hazards": [...]}` | Executes anisotropic multi-objective $A^*$ routing across waypoints; returns path, telemetry, direct comparison, and P1.2 feasibility check. |
| `POST` | `/api/emergency_abort` | JSON: `{"site_id": str, "current_cell": [x,y]}` | Evaluates fastest safe escape route to nearest habitat airlock or natural SPE overhang radiation shelter. |
| `GET` | `/api/risk_heatmap` | `?site_id={id}&spe_storm={bool}` | Computes and returns dynamic $80 \times 80$ composite multi-hazard risk matrix with strict missing-data safety penalty. |
| `GET` / `POST` | `/api/environmental_assessment` | `?site_id={id}&sol_hour={0..23}&season={str}&dust_scenario={str}` | Delivers diurnal temperature harmonic, qualitative dust storm risk, barometric column mass, and scout drone flight feasibility. |
| `GET` | `/api/comm_topology` | `?site_id={id}&max_relays={1..2}` | Returns UHF Proximity-1 LOS ray-marched coverage, link budgets, and greedy set-cover portable tripod relay recommendations. |
| `POST` | `/api/relay_topology` | JSON: `{"site_id": str, "traverse_cells": [[x,y],...], "max_relays": int}` | Evaluates portable tripod relay topology specifically along a custom user-defined traverse path. |
| `GET` | `/api/planetary_ephemeris` | `?site_id={id}&utc_iso={str}&sol={int}&fallback={bool}&dsn_delay={float}&relay_delay={float}` | Computes exact SPICE planetary ephemeris ($L_s$, LTST, solar zenith, insolation), OWLT, configurable telecommand delays, and in-situ MEDA/REMS records. |
| `POST` | `/api/upload_dataset` | JSON: `{"id": str, "name": str, "type": str, "data": {...}}` | Ingests user-supplied spatial dataset (hazards, resources, points) with coordinate validation and session persistence. |
| `GET` | `/api/user_datasets` | None | Returns array of all active user-contributed observation layers. |
| `GET` | `/api/user_dataset` | `?id={dataset_id}` | Retrieves specific user dataset record and feature elements. |
| `DELETE` | `/api/user_dataset` | `?id={dataset_id}` | Deletes user dataset from persistent session storage. |

---

## 9. Automated Testing Commands & Verification

Run these commands from the project root (`c:\Users\HP\Downloads\nasa1`) to verify system integrity:

```powershell
# 1. P2.1 Ephemeris & In-Situ Environmental Engine (10 tests)
python nasa/test_p2_ephemeris.py

# 2. Server REST APIs & P0 Core Functionality (11 tests)
# Note: Ensure server is running or start it in background
python nasa/test_server.py

# 3. P1 Final Integration & Scientific Integrity Audit (9 audit sections)
python nasa/test_p1_final_audit.py

# 4. P1 Intelligent Mission Planning Comprehensive Unit Tests (25 tests)
python nasa/test_p1_planning.py
```

### Expected Test Results:
- `test_p2_ephemeris.py`: **10 / 10 PASS** (SPICE kernel loading, seasonal dates, OWLT bounds, obliquity limits, LTST longitudinal scaling, insolation, fallback comparison, MEDA/REMS provenance, barycentric offset $\le 0.21\,\text{m}$, configurable DSN latency).
- `test_server.py`: **11 / 11 PASS** (10 sites topography, user hazard circumvention, emergency abort, dataset upload/retrieval/deletion, ephemeris REST API).
- `test_p1_final_audit.py`: **9 / 9 PASS** (8 route modes, feasibility engine, risk heatmap, atmospheric column, Proximity-1 link budget, tripod relays, abort integration, UI schemas, uncertainty budgets).
- `test_p1_planning.py`: **25 / 25 PASS** (All P1.1–P1.5 functional requirements verified).

---

## 10. Scientific Limitations, Assumptions & Provenance Distinctions

To ensure NASA Space Apps competition compliance and scientific honesty, strictly adhere to these established definitions:

1. **SPICE Body 499 (Mars Center) vs Body 4 (Mars Barycenter):**
   - Mars center of mass is displaced by at most $0.2097\,\text{meters}$ from the Mars barycenter by Phobos and Deimos.
   - For rover traverses, this induces $\Delta L_s \le 2.4 \times 10^{-8 \circ}$ and $\Delta \text{OWLT} \le 0.70\,\text{nanoseconds}$.
   - Authoritative `mar099s.bsp` is loaded primarily; `mars_cog.bsp` serves as a documented fallback.
2. **In-Situ Weather vs Climatology:**
   - **Jezero Crater (MEDA) & Gale Crater (REMS):** Daily summaries are `VERIFIED_NASA_PDS_OBSERVATION`. Hourly diurnal curves are harmonic fits between extrema, labeled `SIMULATED_HOURLY_INTERPOLATION`.
   - **Secondary Exploration Sites (Melas, Arcadia, Hellas, etc.):** No surface weather station exists. Atmospheric pressure is calculated via the hydrostatic barometric equation ($P = 610.5 \exp(-z / 10800)$). Labeled `ANALYTICAL_HYDROSTATIC_MODEL` with explicit disclaimers; **never** claim raw NASA Ames FV3-MGCM NetCDF data.
3. **One-Way Light Time vs Operational Telecommand Latency:**
   - Physical astronomical OWLT ($d/c = 3.1–22.3\,\text{min}$) is strictly invariant for a given epoch.
   - Ground scheduling (DSN antenna pass allocation $\sim 8\,\text{min}$) and orbiter relay buffers (MRO/Odyssey store-and-forward $\sim 15\,\text{min}$) are operational delays. Total telecommand latency is $(2 \times \text{OWLT}) + \text{DSN} + \text{Relay}$.
   - Direct real-time manual joysticking from Earth is physically impossible.
4. **Radiation Dosimetry & Horizon Shielding:**
   - MSL RAD surface Galactic Cosmic Ray (GCR) baseline is calibrated at $26.67\,\mu\text{Sv/hr}$ ($233.6\,\text{mGy/yr}$).
   - Terrain depression do NOT reduce GCR linearly with depth. True solid-angle sky shielding is governed by $F_{\text{sky}} = \cos^2(\theta_{\text{rim}})$.

---

## 11. Current Implementation Status & Technical Debt

- **Completed & Verified:** P0 (Core UI & 2D/3D map engine), P1.1 (Multi-objective routing), P1.2 (Feasibility checker), P1.3 (Risk heatmap), P1.4 (Atmospheric modeling & drone), P1.5 (UHF RF & tripod relay topology), P2.1 (SPICE ephemeris & in-situ environmental foundation).
- **Unfinished Work:** Milestones P2.2 through P2.6 have **not** been implemented yet.
- **Identified Technical Debt:**
  - *HiRISE Boulder Micro-Textures:* Detailed HiRISE color browse swaths are downloaded for Jezero; secondary sites rely on MOLA hillshade and synthetic boulder spatial distributions.
  - *Single Process Loopback Server:* Python's `http.server` handles requests sequentially. Fine for local single-user operations, but long route computations hold the thread. (Sufficient for competition demo).

---

## 12. Instructions for Implementing P2.2 (Habitat Suitability & Site Selection)

The incoming developer should proceed with **P2.2**. Here are the exact implementation specifications:

### Objective of P2.2:
Implement an automated multi-criteria decision analysis (MCDA) tool for evaluating and ranking candidate basecamp and habitat sites across the Martian terrain.

### Key Components to Implement:
1. **Multi-Criteria Decision Analysis (MCDA) Engine (`nasa/p2/habitat_suitability.py`):**
   - Weighted linear combination across 6 physical terrain criteria:
     1. *Slope Stability ($C_{\text{slope}}$):* Preference for slopes $< 5^\circ$; hard reject for $> 12^\circ$.
     2. *Boulder Clearance ($C_{\text{boulder}}$):* Minimization of landing gear collision risk ($< 15\%$ areal coverage).
     3. *Solar Insolation Potential ($C_{\text{solar}}$):* Maximization of diurnal energy yield based on SPICE solar geometry and local terrain slope/aspect.
     4. *Subsurface Resource Proximity ($C_{\text{isru}}$):* Distance to CRISM hydration/clay POIs ($< 1500\,\text{m}$ preferred).
     5. *Terrain Horizon Radiation Masking ($C_{\text{shielding}}$):* Solid-angle sky fraction obstruction ($F_{\text{sky}} = \cos^2(\theta_{\text{rim}})$) offering passive GCR/SPE shielding.
     6. *UHF Communications Line-of-Sight ($C_{\text{comm}}$):* Visibility to prospective relay masts or landing corridors.
2. **Blast & Debris Exclusion Buffer:**
   - Implement landing pad standoff buffer ($800\,\text{m}$ minimum, $2000\,\text{m}$ nominal) based on NASA human landing system (HLS) plume-surface interaction (PSI) studies to protect the habitat habitat shell from high-velocity ejecta.
3. **Directional Horizon Obstruction Profile:**
   - 16-ray azimuthal horizon mask from candidate habitat centers calculating solar shading angles and antenna look angles.
4. **Backend REST API:**
   - `POST /api/habitat_suitability`: Accepts candidate coordinates or bounding box, weights vector, and returns ranked suitability scores, constraint masks, and radar chart metrics.
5. **Frontend UI Module (`nasa/static/modules/p2_habitat.js`):**
   - Interactive suitability heatmap toggle, habitat placement pin tool, and Section 05 evaluation card.

---

## 13. Remaining P2 Roadmap (P2.3 – P2.6)

Following completion of P2.2, the remaining development sequence is:
- **P2.3 — Subsurface Intelligence & ISRU Water Extraction Modeling:**
  - Ingestion of SHARAD dielectric permittivity profiles and SWIM ice depth maps.
  - Thermal energy extraction model (sensible heat $\int_{T_{\text{ice}}}^{273} c_p dT \approx 138\,\text{kJ/kg}$ + latent heat $334\,\text{kJ/kg}$ + extraction efficiency factor $\approx 787\,\text{kJ/kg}$ total).
- **P2.4 — Multi-Agent Fleet Coordination (Rover + Drone + Astronaut):**
  - Cooperative multi-vehicle task allocation (rover for heavy drilling, scout drone for aerial reconnaissance, astronaut for selective sampling).
- **P2.5 — Autonomous Tactical Replanning & Dynamic Hazard Interception:**
  - Real-time mid-traverse replanning responding to sudden dust storms, telemetry degradation, or unexpected obstacle detection.
- **P2.6 — Autonomous Science Prioritization & Value Maximization:**
  - Knapsack-constrained science target prioritization maximizing CRISM spectral diversity under strict consumable budgets.

---

## 14. Preservation of Existing Functionality & Anti-Regression Rules

The incoming developer must maintain strict adherence to these architectural rules:
1. **Never Rebuild or Replace Working Modules:** Do not replace vanilla HTML5/Canvas with heavy client frameworks (React, Angular). Do not replace the Python standard library server with Django or Flask.
2. **Never Break Existing APIs:** Existing endpoints (`/api/sites`, `/api/site`, `/api/plan_route`, `/api/emergency_abort`, `/api/risk_heatmap`, `/api/environmental_assessment`, `/api/comm_topology`, `/api/planetary_ephemeris`) have contracts with the frontend. Any new feature should be an additive endpoint or optional parameter.
3. **Always Run Existing Regression Tests:** After making any backend changes, run:
   - `python nasa/test_p2_ephemeris.py`
   - `python nasa/test_p1_final_audit.py`
   - `python nasa/test_server.py`
   All must pass with 100% success rate.
4. **Honest Data Provenance:** Never label synthetic or analytical values as verified NASA PDS or Ames MGCM observations. Always include explicit provenance tags.

---

## 15. UI Redesign Policy: Backend-First, Aesthetics-Second

> [!IMPORTANT]
> **STRICT DIRECTIVE ON UI REDESIGN:**  
> A complete visual and UI polish is planned for the final presentation. However, **the major UI redesign must happen ONLY AFTER all backend intelligence and scientific features (P2.2 through P2.6) are fully implemented, verified, and audited.**  
>
> Attempting to redesign or rewrite CSS and HTML layouts prematurely will disrupt working Canvas drawing routines, break element IDs relied upon by telemetry drawers, and create severe merge and regression issues. Focus on the scientific algorithms first; polish the visual styling once the system is complete.

---

## Handover Sign-Off

- **Handing-Off Developer:** Antigravity AI Assistant & Engineering Team
- **Milestone Reached:** P2.1 Sealed (Ephemeris & Environmental Data Foundation)
- **Status of Working Copy:** 100% Tested, 0 Regressions, Fully Self-Contained.
- **Ready for Next Developer:** YES. Proceed directly to `NEXT_DEVELOPER_START_HERE.md`.
