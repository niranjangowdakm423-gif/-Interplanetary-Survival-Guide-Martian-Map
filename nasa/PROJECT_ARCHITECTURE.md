# ARES-NAV — Project Architecture

## Overview

ARES-NAV (Adaptive Route & Environment Survival Navigation) is a Martian exploration and EVA mission planning web application built for the NASA Space Apps Challenge. It processes real NASA planetary datasets and combines them with a physics-based A* pathfinding engine.

---

## Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend | Python 3 (`http.server`) | No framework; pure stdlib + Pillow |
| Frontend | Vanilla HTML5 / CSS3 / ES6 JS | No frameworks; Canvas-based map |
| Map rendering | HTML5 Canvas 2D + 3D (custom) | Painter's algorithm for 3D terrain |
| Routing | Python A* (`heapq`) | Multi-objective anisotropic |
| Data storage | JSON files (`real_nasa_data/`) | No database |
| Image processing | Pillow (PIL) | MOLA/HiRISE raster extraction |
| Geospatial tiles | NASA Mars Trek WMTS / ArcGIS | Fetched at startup + live CTX stream |

---

## Directory Structure

```
nasa/
├── server.py                   # Python HTTP server + all backend logic
├── ingest_real_nasa_data.py    # One-time NASA data download script
├── README.md
├── real_nasa_data/             # Persistent NASA datasets (JSON/XML)
│   ├── ode_pds_products.json   # MRO HiRISE + CRISM ODE catalog
│   ├── msl_rad_pds.json        # Curiosity MSL RAD PDS archive index
│   ├── mars_trek_manifest.json # Mars Trek WMTS tile metadata
│   ├── mola_hillshade_WMTSCapabilities.xml
│   └── ctx_5m_WMTSCapabilities.xml
├── static/
│   ├── index.html              # Single-page application shell
│   ├── styles.css              # All application styles
│   ├── app.js                  # All frontend JavaScript (~1500 lines)
│   └── nasa_tiles/             # Pre-downloaded NASA raster tiles (JPG)
│       ├── jezero_mola_hillshade_z5.jpg   # Real MOLA stitched mosaic
│       ├── melas_mola_hillshade_z5.jpg
│       ├── arcadia_mola_hillshade_z5.jpg
│       ├── hirise_jezero_0_PSP_008650_1990_COLOR.jpg
│       ├── hirise_jezero_1_PSP_008650_1990_RED.jpg
│       └── hirise_jezero_2_ESP_022680_1985_COLOR.jpg
```

---

## Backend Architecture (`server.py`)

### Data Loading (startup)
- `load_json_safe()` — Safe JSON loader with fallback
- `ODE_CATALOG` — MRO HiRISE + CRISM product records from ODE REST API
- `RAD_ARCHIVE` — MSL RAD PDS archive (5,570 indexed RDR files)
- `TREK_MANIFEST` — Mars Trek WMTS tile endpoint metadata

### Sites Database (in-memory)
- `SITES` dict — 10 exploration sites: Jezero, Melas, Arcadia, Gale, Olympus, Syrtis, Mawrth, Hellas, Gusev, Elysium
- Each site has: coordinates, bbox, elevation range, gravity, atmospheric pressure, radiation, temperature range, habitat position, POIs

### Raster Grid Extraction (`extract_real_raster_grids`)
- Processes real MOLA JPG mosaics → 80×80 elevation grid
- Derives slope from Horn gradient (3×3 kernel)
- Processes real HiRISE JPGs → boulder/roughness density
- Processes CRISM browse PNGs (if present) → mineralogy/hydration grids
- Fallback: synthesizes mineral/hydration from POI data when tiles missing
- Computes radiation: MSL RAD baseline × sky-view attenuation × shelter shielding
- Computes temperature: diurnal model from aspect and elevation
- Computes UHF comm viewshed: 3D ray-marching from habitat antenna

### Pre-computation
- `PRECOMPUTED_SITES` — All 10 sites extracted at server startup

### API Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/sites` | List all sites with summaries |
| GET | `/api/site?id={id}` | Full site data + all 8 layer grids |
| POST | `/api/plan_route` | A* route planning with telemetry |
| POST | `/api/emergency_abort` | Emergency shelter abort routing |
| GET | `/` | Serves `static/index.html` |
| GET | `/nasa_tiles/*` | Serves NASA tile images |
| GET | `/*.js`, `/*.css` | Static file serving |

### Route Planning Engine
- **Algorithm**: Anisotropic A* (8-directional, Euclidean heuristic × 0.45)
- **Modes**: safest, balanced, science, fastest (different cost weights)
- **Penalties**: slope², boulder density, radiation flux, comm dead zones
- **Telemetry**: Pandolf metabolic model (0.38g), O₂ consumption, battery drain
- **Comparison**: A* vs. direct Bresenham line baseline
- **Emergency abort**: fast A* to nearest shelter POI from current position

---

## Frontend Architecture (`static/`)

### Application State (`state` object)
Single global state object tracking:
- Site ID, site data, active layer
- View mode (2D/3D), route mode
- Max slope, suit mass, SPE storm flag
- Waypoints, route result, abort route
- Selected POI, profile tab, hover cell
- Simulation state (playing, step index, timer)
- 3D camera (yaw, pitch, zoom)
- Cached layer canvas, NASA image references

### Rendering Pipeline
1. `bake2DTerrainLayer()` — Renders 400×400 offscreen canvas with bilinear interpolation
2. `render2DMap()` — Composites terrain + NASA tiles + routes + POI markers
3. `render3DTerrain()` — Painter's algorithm 3D with projected quads
4. `renderProfileChart()` — Bottom telemetry chart (3 tab views)

### Map Layers (7 total)
1. **Composite** — MOLA hillshade + slope/boulder hazard tint
2. **Elevation** — MOLA DEM hypsometric coloring
3. **Slope** — Geodesic slope with NASA STD-3001 safe/dangerous zones
4. **Boulder** — HiRISE sub-meter roughness/talus density
5. **Mineral** — CRISM spectral mineralogy index
6. **Hydration** — SHARAD/Neutron water-ice equivalent %
7. **Radiation** — MSL RAD calibrated ionizing flux
8. **Comm LOS** — UHF 3D viewshed from habitat antenna

---

## Data Sources and Provenance

| Dataset | Source | Type | Coverage |
|---|---|---|---|
| MOLA Hillshade | Mars Trek WMTS (`trek.nasa.gov`) | Real + pre-downloaded | Jezero, Melas, Arcadia |
| CTX 5m Mosaic | ArcGIS WMTS (`astro.arcgis.com`) | Real + live stream | Global |
| HiRISE RDRV11 | NASA PDS ODE (`oderest.rsl.wustl.edu`) | Real + pre-downloaded | Jezero only |
| CRISM MTRDR | NASA PDS ODE + PDS Geosciences | Real catalog, no browse tiles | Jezero (ODE records only) |
| MSL RAD | PDS PPI (`pds-ppi.igpp.ucla.edu`) | Real archive index (5,570 files) | Gale Crater calibration |
| Elevation grids (7 other sites) | Synthesized from MOLA color | Derived/calculated | All sites |
| Mineral/hydration (7 sites) | POI-based synthesis | Calculated | All sites |
| Radiation model | MSL RAD baseline × physics model | Calculated | All sites |
| UHF Comm viewshed | 3D ray-march from elevation | Calculated | All sites |
| Pandolf metabolic model | Published formula (0.38g Mars) | Calculated | All |
| Temperature | Diurnal insolation model | Simulated | All sites |

---

## Real vs. Simulated Functionality

### Real NASA Data
- MOLA hillshade mosaics for Jezero, Melas, Arcadia (pre-downloaded)
- 24 HiRISE RDRV11 product records queried via ODE REST API
- 20 CRISM MTRDR product records (catalog only; browse tiles not downloaded)
- 5,570 MSL RAD RDR file index records from PDS PPI
- Live CTX 5m tile streaming from ArcGIS WMTS

### Calculations from Real Data
- Elevation grids derived from MOLA pixel luminance
- Slope derived from Horn gradient on elevation grid
- Boulder density from HiRISE spatial gradient variance (Jezero only)
- Radiation calibrated to MSL RAD 26.67 µSv/hr surface measurement

### Simulated/Modeled
- Mineral/hydration grids for 7 non-MOLA sites (synthesized from POI locations)
- Boulder roughness for non-Jezero sites (from elevation variation only)
- Temperature model (diurnal insolation, not from InSight data)
- UHF comm viewshed (physics model, not from actual MRO/MAVEN data)
- Gravity anomaly values (from published GMM-3 model, not live telemetry)

---

## External Dependencies

| Dependency | Purpose | Required |
|---|---|---|
| Pillow (PIL) | MOLA/HiRISE image processing | Yes |
| `http.server` | HTTP server | Built-in |
| `heapq` | A* priority queue | Built-in |
| ArcGIS WMTS | Live CTX tile streaming | Optional (graceful fallback) |
| Google Fonts (Inter, JetBrains Mono) | Typography | Optional (fallback fonts) |

---

## P0 Implementation Status

| Feature | Status |
|---|---|
| P0.1 – Beginner/Expert UI | ✅ Completed |
| P0.1 – Mission setup wizard | ✅ Completed |
| P0.1 – Responsive layout | ✅ Completed |
| P0.2 – Interactive tutorial | ✅ Completed |
| P0.2 – Mars knowledge centre | ✅ Completed |
| P0.3 – NASA Data Explorer | ✅ Completed |
| P0.3 – User data upload | ✅ Completed |
| P0.3 – Map layer integration | ✅ Completed |
| P0.4 – Data provenance system | ✅ Completed |
| P0.4 – Validation status badges | ✅ Completed |
| P0.5 – Upload → map integration | ✅ Completed |
| P0.5 – Route planner preservation | ✅ Completed |
