# ARES-NAV — Quick-Start Guide for Next Developer

Welcome to the **ARES-NAV** team! This guide will get you up and running in under 3 minutes and guide you directly into **Milestone P2.2 (Habitat Suitability & Site Selection)**.

---

## 1. Quick Setup & Run Instructions

### Step 1: Install Python Dependencies
Ensure you have **Python 3.10+** installed. From the project root, run:
```powershell
pip install -r requirements.txt
```
*(Dependencies: `Pillow` for image/raster processing, `spiceypy` for NASA NAIF SPICE ephemerides)*

### Step 2: Start the Local Server
```powershell
python nasa/server.py
```
*(The server binds to `http://127.0.0.1:8000/` using Python's standard library `http.server`)*

### Step 3: Access the Mission Control Web App
Open your browser and navigate to:
```
http://127.0.0.1:8000/
```

### Step 4: Run the Test Suites
Verify that everything is working 100% on your machine:
```powershell
# Ephemeris, SPICE & In-situ environmental tests
python nasa/test_p2_ephemeris.py

# Server REST endpoints & P0 core tests
python nasa/test_server.py

# P1 full integration audit suite
python nasa/test_p1_final_audit.py

# P1 comprehensive unit tests
python nasa/test_p1_planning.py
```
*Expected: 100% PASS on all tests (no failures).*

---

## 2. Where the Project Currently Stands

- **Current Completed Milestone:** **P2.1 — Planetary Ephemeris & Environmental Data Foundation** (Audited & Verified).
  - NASA NAIF SPICE kernel integration (`mar099s.bsp`, `de440s.bsp`, `pck00010.tpc`, `naif0012.tls`).
  - Sub-solar coordinates, true local solar time (LTST), solar longitude ($L_s$), and direct insolation.
  - One-Way Light Time ($OWLT = d/c$) separated from configurable DSN scheduling and orbiter relay delays.
  - Real in-situ calibrated data from Perseverance MEDA (Jezero Crater) and Curiosity REMS (Gale Crater).
  - 10 candidate Martian exploration sites with MOLA topographic heightfields and active hazard circumvention.
- **Next Milestone to Implement:** **P2.2 — Habitat Suitability & Site Selection**.

---

## 3. Your First Tasks for Milestone P2.2

Do not modify existing P0/P1/P2.1 modules. Build P2.2 in a clean, modular fashion:

### Task 1: Create `nasa/p2/habitat_suitability.py`
Implement a multi-criteria decision analysis (MCDA) engine evaluating site suitability:
1. **Terrain Slope Score:** Optimal slopes $< 5^\circ$; hard disqualification for slopes $> 12^\circ$.
2. **Boulder Density Score:** Minimal rock abundance ($< 15\%$) to prevent structural foundation puncture.
3. **Solar Insolation Score:** Utilize `compute_spice_ephemeris` to calculate daily cumulative solar insolation adjusted for local slope and aspect.
4. **ISRU Proximity Score:** Distance to water/hydration POIs ($< 1500\,\text{m}$ preferred).
5. **Radiation Topographic Shielding Score:** Solid-angle sky obstruction ($F_{\text{sky}} = \cos^2(\theta_{\text{rim}})$) from surrounding crater walls/cliffs.
6. **Communications Line-of-Sight Score:** UHF LOS availability to habitat backhaul / orbiter relay tracks.
7. **Landing Blast Exclusion Buffer:** Enforce an $800\,\text{m} - 2000\,\text{m}$ safety standoff buffer from the landing site (HLS plume-surface interaction criteria) to prevent ejecta damage.

### Task 2: Expose Endpoint in `nasa/server.py`
- Add route `POST /api/habitat_suitability` accepting site ID, candidate bounding box, and MCDA weights, returning ranked suitability rasters and radar score breakdowns.

### Task 3: Create Automated Test Suite `nasa/test_p2_habitat.py`
- Test slope thresholds, blast exclusion buffer enforcement, solar insolation weighting, and composite scoring.

### Task 4: Add Frontend Visualization `nasa/static/modules/p2_habitat.js`
- Integrate suitability layer toggle and habitat site evaluation cards into Section 05 Telemetry Drawer.

---

## 4. Critical Scientific Constraints & Assumptions

1. **SPICE Kernels are Pre-Loaded:** Kernels are already in `nasa/real_nasa_data/spice/`. Do not delete `mar099s.bsp` or `de440s.bsp`.
2. **Provenance Honesty:**
   - Jezero MEDA and Gale REMS are `VERIFIED_NASA_PDS_OBSERVATION`.
   - Secondary sites are `ANALYTICAL_HYDROSTATIC_MODEL` ($P = 610.5 \exp(-z / 10800)$).
   - Never claim raw Ames FV3-MGCM NetCDF data unless real `.nc` files are ingested.
3. **Physical Light Time vs DSN Delay:**
   - Always keep astronomical OWLT distinct from operational ground queuing delays.
4. **Radiation Masking:**
   - Do NOT assume crater depth linearly shields Galactic Cosmic Rays. Use solid-angle sky fraction $F_{\text{sky}} = \cos^2(\theta_{\text{rim}})$.

---

## 5. What MUST NOT Be Changed (Preservation Rules)

- **Do NOT rebuild the web framework:** Keep vanilla HTML5 Canvas + ES6 modules. Do not add React, Vue, Angular, or Node.js.
- **Do NOT rebuild the backend:** Keep standard library `http.server` in Python. Do not introduce Django or Flask.
- **Do NOT alter existing API schemas:** `/api/sites`, `/api/site`, `/api/plan_route`, `/api/emergency_abort`, `/api/risk_heatmap`, `/api/environmental_assessment`, `/api/comm_topology`, and `/api/planetary_ephemeris` are live contracts with the frontend.
- **Do NOT begin UI visual redesign yet:** The major UI aesthetic overhaul is reserved for the final presentation stage, **after** all P2 backend scientific features (P2.2 through P2.6) are completed and tested.

---

## 6. Detailed Reference Documents

- **Master Handover Document:** Read `TEAM_HANDOVER.md` for complete technical details.
- **Data Catalog:** Read `DATA_SOURCE_CATALOG.md` for PDS product numbers and calibration details.
- **P2 Implementation Plan:** Read `P2_IMPLEMENTATION_PLAN.md` for detailed algorithms of P2.2 through P2.6.
- **Live Project Status:** Read `PROJECT_STATUS.md` for current verified state.

Good luck with P2.2!
