# 🚀 ARES-NAV — Interplanetary Survival Guide: Martian Map

**NASA Space Apps Challenge — Real NASA PDS / ODE / WMTS / NAIF SPICE Planetary Intelligence & EVA Navigation Platform**

**ARES-NAV** (*Adaptive Route & Environment Survival Navigation*) is an integrated Martian exploration, extra-vehicular activity (EVA) navigation, survival telemetry, and habitat-siting platform. It consolidates multimodal NASA planetary datasets—orbital altimetry, sub-meter imagery, spectral mineralogy, in-situ radiation dosimetry, weather station archives, and NAIF SPICE ephemerides—into a physics-based spatial analysis and autonomous mission-planning system.

---

## ⚡ Quick Start

### 1. Install Dependencies
Ensure **Python 3.10+** is installed:
```bash
pip install -r requirements.txt
```
*(Dependencies: `Pillow` for raster processing; `spiceypy` for NASA NAIF SPICE kernel evaluation with automatic calibrated Keplerian fallback if unavailable.)*

### 2. Start the Local Server
```bash
python3 nasa/server.py
```
Open **`http://localhost:8765`** in your browser.

### 3. Run Automated Verification Suites
```bash
# P0 & Server REST API suite
python3 nasa/test_server.py

# P1 Intelligent Mission Planning unit tests (25 tests)
python3 nasa/test_p1_planning.py

# P1 End-to-End Scientific Integrity Audit (9 sections)
python3 nasa/test_p1_final_audit.py

# P2.1 Planetary Ephemeris & In-Situ Weather tests
python3 nasa/test_p2_ephemeris.py

# P2.2 Habitat Suitability & MCDA/AHP Siting tests
python3 nasa/test_p2_habitat.py
```

---

## 🛰️ Implemented Architecture & Feature Milestones

### Phase P0 — Core Martian GIS, 10 Exploration Sites & Data Provenance
- **10 Martian Exploration Sectors:** Jezero Crater, Melas Chasma, Arcadia Planitia, Gale Crater, Olympus Mons, NE Syrtis Major, Mawrth Vallis, Hellas Planitia, Gusev Crater, and Elysium Planitia (`80×80` spatial grids at `25m/cell` covering `2.0 km × 2.0 km` per sector).
- **Dual 2D / 3D Native HTML5 Canvas Engine:**
  - **2D Sector GIS Map (`mars-canvas`):** Bilinearly interpolated offscreen raster baking with 15m MOLA topographic contours, red-zone hazard hatching, Mars Trek WMTS MOLA/CTX tile blending, and MRO HiRISE RDRV11 swath overlays.
  - **3D Topographic Hologram:** Interactive painter's-algorithm 3D terrain projection with yaw/pitch/zoom orbit controls, 3D route ribbons, and vertical beacon pins.
- **9 Scientific & Tactical Map Views:**
  1. `composite` — Tactical Survival Composite (MOLA Hillshade + Slope/Boulder Hazards)
  2. `habitat_suitability` — **P2.2** MCDA / Saaty AHP Basecamp Suitability & HLS Blast Exclusion
  3. `risk_heatmap` — **P1.3** Dynamic Multi-Hazard Environmental Risk Heatmap
  4. `elevation` — MGS MOLA Laser Altimeter Digital Elevation Model (DEM)
  5. `slope` — Horn $3\times 3$ Geodesic Slope Inclination (`NASA-STD-3001` traversability)
  6. `boulder` — MRO HiRISE Sub-Meter Boulder & Talus Roughness
  7. `mineral` — MRO CRISM Spectral Mineralogy (Smectite Clays, Carbonates, Sulfates)
  8. `hydration` — SHARAD / Neutron Spectrometer Subsurface $\text{H}_2\text{O}$ Ice Equivalent
  9. `comm_los` — 3D Ray-Marched UHF Antenna Line-of-Sight Coverage
- **Mars Data Explorer & 5-Stage User Dataset Upload:** Ingests custom `CSV`, `JSON`, `GeoJSON`, and `PNG/JPG` observations with coordinate validation, disk persistence (`real_nasa_data/user_datasets.json`), and active $A^*$ hazard circumvention around user-flagged hazards.
- **Dual-Mode Accessibility:** Instant **🌱 Beginner / ⚙️ Expert Mode** toggle, 9-step interactive onboarding tutorial, and 13-term Mars Science Knowledge Centre.

---

### Phase P1 — Intelligent Mission Planning & Autonomous Operations
- **P1.1 Explainable Multi-Objective Route Optimization:**
  - Anisotropic $A^*$ pathfinder across **8 operational modes** (`shortest`, `fastest`, `safest`, `lowest_resource`, `min_radiation`, `comm_aware`, `science`, `balanced`) plus custom weight vectors.
  - Multi-route comparison matrix, natural-language trade-off explainability dossier, and **NASA-STD-3001 Vol 2** compliance verification.
  - **SPE Solar Storm Emergency Abort (`/api/emergency_abort`):** Computes fastest escape vectors to habitat airlocks or natural terrain shelters under X-class coronal mass ejection events.
- **P1.2 Mission Feasibility & Consumable Reserve Checker:**
  - Martian $0.38g$ Pandolf bioenergetic metabolic model computing $\text{O}_2$ draw (`580 L` PLSS tank), suit battery drain (`1850 Wh`), and kcal burn.
  - **Point of No Return (PNR)** turnaround waypoint detection and `FEASIBLE` / `MARGINAL` / `CRITICAL` mission verdicts.
- **P1.3 Dynamic Multi-Hazard Environmental Risk Heatmap (`/api/risk_heatmap`):**
  - Composite risk index combining normalized slope (35%), boulder abundance (25%), ionizing radiation (20%), and RF shadow (20%), shifting radiation weight to 45% during SPE storms, with a strict **100% penalty on unmapped/corrupted (`NaN`) cells**.
- **P1.4 Atmospheric Modeling & Scout Drone Flight Envelope (`/api/environmental_assessment`):**
  - 24-hour diurnal surface temperature harmonic model, optical depth ($\tau$) dust storm risk, barometric column mass ($\sigma = P/g$ in $\text{g/cm}^2$), and JPL Ingenuity coaxial rotorcraft flight feasibility (blade tip Mach & air density thresholding).
- **P1.5 Communication-Aware Pathfinding & Portable UHF Relay Topology (`/api/comm_topology`, `/api/relay_topology`):**
  - 3D ray-marched NASA Proximity-1 (`401.58 MHz`) UHF link budget with Free-Space Path Loss (FSPL) and knife-edge terrain diffraction.
  - Greedy dual-visibility set-cover optimizer placing 1–2 astronaut-deployable tripod relays (`[R-α]`, `[R-β]`) on safe slopes ($\le 18^\circ$) to restore dead-zone coverage.

---

### Phase P2 — Advanced Planetary Intelligence & Expedition Siting
- **P2.1 Planetary Ephemeris & In-Situ Environmental Foundation (`/api/planetary_ephemeris`):**
  - **NASA NAIF SPICE Integration:** Uses official SPICE kernels (`de440s.bsp`, `mar099s.bsp`, `pck00010.tpc`, `naif0012.tls`) with calibrated Keplerian fallback to compute areocentric solar longitude ($L_s$), Martian season, sub-solar latitude, True Local Solar Time (LTST), and topocentric solar elevation/insolation.
  - **Astronomical OWLT vs. Operational Latency:** Strictly separates physical One-Way Light Time ($OWLT = d/c$, `3.1–22.3 min`) from configurable Deep Space Network (DSN) scheduling and orbiter relay buffers.
  - **Calibrated In-Situ Weather Archives:** Real NASA PDS observations for **Mars 2020 Perseverance MEDA** (Jezero Sols 89, 370, 600) and **MSL Curiosity REMS** (Gale Sols 1000, 2000), and analytical hydrostatic barometric modeling ($P = 610.5 \exp(-z / 10800)$) for secondary sites.
- **P2.2 Habitat Suitability & Site Selection (`/api/habitat_suitability`):**
  - **Multi-Criteria Decision Analysis (MCDA) & Saaty AHP:** Evaluates $80\times 80$ sector grids using a verified $6\times 6$ Analytic Hierarchy Process pairwise matrix ($\lambda_{\max} = 6.0138, CR = 0.0022 < 0.10$).
  - **Engineering Constraints & HLS Blast Exclusion:** Enforces configurable foundation slope limits ($\le 8.0^\circ$ default, $<5^\circ$ optimal), boulder clearance ($\le 20\%$), and an **$800\,\text{m} - 2000\,\text{m}$ HLS landing plume blast exclusion standoff** around the landing pad.
  - **Directional Horizon Sky-View Masking vs. Bulk Shielding:** Computes 8-azimuth solid-angle sky view factor $F_{\text{sky}} = \cos^2(\theta_{\text{rim}})$ while explicitly distinguishing geometric horizon masking ($\sim 2\%–15\%$ primary GCR reduction) from physical regolith mass overburden ($\text{g/cm}^2$, flagging secondary albedo neutron spallation hazards when roof shielding is $< 50\,\text{g/cm}^2$).
  - **Infrastructure Triad Siting:** Automatically locates the optimal **Habitat Basecamp `[HAB-OPT #1]`**, **Solar Array Farm `[SOL-ARR]`**, and **Kilopower Fission Surface Power Reactor `[FSP-PWR]`** ($\ge 500\,\text{m}$ crew radiation standoff).

---

## 📊 Transparent Data Provenance Summary

Every layer and telemetry stream in ARES-NAV carries an explicit provenance badge and uncertainty budget (documented in [DATA_SOURCE_CATALOG.md](DATA_SOURCE_CATALOG.md)):

| Dataset / Layer | Provenance Tag | Source Archive & Calibration |
| :--- | :--- | :--- |
| **MGS MOLA & MRO CTX Mosaics** | `VERIFIED` / `PARTIAL` | Real Mars Trek WMTS tiles stitched for Jezero, Melas, and Arcadia (`nasa/static/nasa_tiles/`); deterministic MOLA datum synthesis for 7 secondary sites. |
| **MRO HiRISE Sub-Meter Boulders** | `PARTIAL` | 24 ODE product records (`ode_pds_products.json`) + real HiRISE RDR strips (`PSP_008650_1990_COLOR`) for Jezero; slope-roughness proxy elsewhere. |
| **Curiosity MSL RAD Dosimetry** | `CALCULATED_CALIBRATED` | 5,570 indexed PDS PPI RDR records (`MSL-M-RAD-3-RDR-V1.0` in `msl_rad_pds.json`) anchored to `26.67 µSv/hr` surface GCR baseline. |
| **Perseverance MEDA & Curiosity REMS** | `VERIFIED_NASA_PDS_OBSERVATION` | Real daily PDS pressure, temperature, wind, and optical depth records for Jezero and Gale; analytical hydrostatic model for uninstrumented sites. |
| **NAIF SPICE Ephemerides** | `VERIFIED_NAIF_SPICE_KERNEL` | Official JPL/NAIF kernels (`de440s.bsp`, `mar099s.bsp`, `pck00010.tpc`, `naif0012.tls`) with calibrated analytical fallback (`FALLBACK_CALIBRATED_KEPLERIAN`). |
| **CRISM Mineralogy & SHARAD Ice** | `SIMULATED_FROM_CATALOG` | Real ODE CRISM spectral cube catalog footprints (`20 products`) with spatial synthesis around cataloged science/ISRU POIs. |

---

## 📂 Repository Structure

```text
├── README.md                          # Project overview, architecture & quick-start guide
├── DATA_SOURCE_CATALOG.md             # Formal NASA PDS/WMTS provenance & uncertainty catalog
├── PROJECT_STATUS.md                  # Audited feature matrix & milestone status
├── P1_IMPLEMENTATION_PLAN.md          # Phase P1 engineering specification
├── P2_ARCHITECTURE_DESIGN.md          # Phase P2 system architecture & REST API schemas
├── P2_IMPLEMENTATION_PLAN.md          # Phase P2 mathematical & physics formulations
├── NEXT_DEVELOPER_START_HERE.md       # Quick-start developer onboarding guide
├── requirements.txt                   # Python dependencies (Pillow, spiceypy)
└── nasa/
    ├── server.py                      # Standard-library HTTP server & REST APIs (port 8765)
    ├── ingest_real_nasa_data.py       # Offline NASA PDS / ODE / WMTS dataset downloader
    ├── p2/
    │   ├── ephemeris_engine.py        # P2.1 NAIF SPICE & Keplerian orbital ephemeris engine
    │   ├── environmental_engine.py    # P2.1 MEDA/REMS PDS archives & hydrostatic climatology
    │   ├── habitat_suitability.py     # P2.2 MCDA, Saaty AHP, blast standoff & SVF masking
    │   └── habitat_siting.py          # P2.2 alias module
    ├── real_nasa_data/                # Indexed NASA PDS catalogs, WMTS XMLs & SPICE kernels
    ├── static/
    │   ├── index.html                 # Mission Control web application dashboard
    │   ├── app.js                     # Core 2D/3D Canvas renderer & route planner client
    │   ├── styles.css                 # Tactical HUD styling
    │   ├── p0_styles.css              # Dual-mode UI, wizard & modal styles
    │   ├── nasa_tiles/                # Pre-downloaded MOLA, CTX & HiRISE raster tiles
    │   └── modules/                   # Modular ES6 frontend controllers (P0, P1, P2.1, P2.2)
    ├── test_server.py                 # REST endpoint & P0 automated test suite
    ├── test_p1_planning.py            # P1 25-test unit suite
    ├── test_p1_final_audit.py         # P1 9-section end-to-end scientific audit
    ├── test_p2_ephemeris.py           # P2.1 ephemeris & provenance test suite
    └── test_p2_habitat.py             # P2.2 habitat suitability & AHP test suite
```
