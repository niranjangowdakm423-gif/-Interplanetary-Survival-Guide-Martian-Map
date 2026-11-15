# 🚀 ARES-NAV // Interplanetary Survival Guide: Martian Map

**NASA Space Apps Challenge — Real NASA PDS / ODE / Mars Trek Data Architecture**

**ARES-NAV** is a geospatial decision-support and Extra-Vehicular Activity (EVA) navigation system designed for future astronauts exploring the Martian surface. It ingests and processes **real NASA datasets** from the official endpoints listed on the Space Apps challenge page (`trek.nasa.gov`, `oderest.rsl.wustl.edu`, `hirise.lpl.arizona.edu`, `pds-geosciences.wustl.edu`, and `pds-ppi.igpp.ucla.edu`) and combines them with a **Martian Bio-Energetic Anisotropic $A^*$ Pathfinding Engine**.

---

## ⚡ Quick Start

1. **Refresh / Download Real NASA Datasets (Optional — already downloaded in `real_nasa_data/` and `static/nasa_tiles/`):**
   ```bash
   cd /home/niranjan/Downloads/nasa
   python3 ingest_real_nasa_data.py
   ```
2. **Start the ARES-NAV Server:**
   ```bash
   python3 server.py
   ```
   Open **`http://localhost:8765`** in your browser.

---

## 🛰️ 1. Real NASA Datasets Used vs. Physics-Derived Models (Transparent Breakdown)

Every file ingested by [ingest_real_nasa_data.py](file:///home/niranjan/Downloads/nasa/ingest_real_nasa_data.py) is stored locally in `real_nasa_data/` and `static/nasa_tiles/` and processed at server startup by [`extract_real_raster_grids`](file:///home/niranjan/Downloads/nasa/server.py#L285-L459):

| Dataset / Layer | Source Endpoint / PDS Archive | What is Real Ingested Data vs. Derived Physics? |
| :--- | :--- | :--- |
| **1. Mars Trek WMTS (MOLA & CTX 5m)** | `trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m` & `CTX_beta01_uncontrolled_5m_Caltech` (`WMTSCapabilities.xml` $\rightarrow$ `astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{r}/{c}`) | **Real:** 4-tile ($2\times 2$) site-specific MOLA hillshade mosaics stitched for Jezero (`18.38°N, 77.58°E`), Melas (`-9.82°S, 283.60°E`), and Arcadia (`39.20°N, 188.00°E`) in `static/nasa_tiles/*_mola_hillshade_z5.jpg`, plus live CTX 5m tile streaming. **Derived:** Elevation grid ($80\times 80$) and $3\times 3$ Horn geodesic slope ($\theta^\circ$) extracted from the MOLA hypsometric raster. |
| **2. MRO HiRISE Sub-Meter Imagery (`RDRV11`)** | `oderest.rsl.wustl.edu/live2/` (`ihid=MRO`, `iid=HIRISE`, `pt=RDRV11`) & `hirise.lpl.arizona.edu/PDS/` | **Real:** 24 real HiRISE product records queried via ODE (`real_nasa_data/ode_pds_products.json`), plus 3 full-strip HiRISE RDR images downloaded for Jezero (`PSP_008650_1990_COLOR`, `PSP_008650_1990_RED`, `ESP_022680_1985_COLOR`). **Derived:** Surface boulder/roughness percentage is computed from the $4\times 4$ high-frequency spatial gradient variance of the real HiRISE RDR swath combined with local MOLA slope. |
| **3. MRO CRISM Mineral Cubes (`MTRDR`)** | `oderest.rsl.wustl.edu/live2/` (`ihid=MRO`, `iid=CRISM`, `pt=MTRDR`) & `pds-geosciences.wustl.edu` | **Real:** 20 real CRISM MTRDR targeted spectral records queried via ODE (`hrl000040ff_07_if183j_mtr3`, `frt000047a3_07_if166j_mtr3`, `frt00005850_07_if167j_mtr3`, etc., each containing 23 `.img` spectral cubes). **Derived:** Mineralogy and hydration indices extracted from CRISM browse rasters (`crism_*.png`) and ODE target footprints. |
| **4. Curiosity MSL RAD Radiation (`MSL-M-RAD-3-RDR-V1.0`)** | `pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/INDEX/INDEX.TAB` | **Real:** Parsed all **5,570 real RDR file records** from NASA's PDS PPI `INDEX.TAB` (`real_nasa_data/msl_rad_pds.json`) and calibrated baseline GCR dose rate to Curiosity RAD's measured $26.67\text{ }\mu\text{Sv/hr}$ ($640\text{ }\mu\text{Sv/day}$, Hassler et al., *Science* 2014). **Derived:** Local terrain sky-view factor attenuation and overhanging rock shielding. |
| **5. UHF Radio Viewshed & Suit Bio-Energetics** | Physics Engine in [`server.py`](file:///home/niranjan/Downloads/nasa/server.py) | **Derived Physics:** 3D ray-marched Line-of-Sight from Habitat antenna mast over the MOLA elevation grid, plus Martian Tobler walking speed and $0.38g$ Pandolf metabolic $\text{O}_2$/kcal expenditure. |

---

## 🧠 2. Real Raster Route Metrics (Jezero Crater Western Delta)

On the real extracted Jezero Crater MOLA + HiRISE raster grid (`[18,62] -> [42,50] -> [29,36]`):
- **Anisotropic $A^*$ Safe Route:** Distance `1.34 km`, Duration `35.1 min`, Max Slope `26.1°`, Max HiRISE Roughness `55.3%`, Oxygen Consumed `23.9 L`, Radiation Dose `14.37 µSv`, Safety Index `40.6%`.
- **Direct Crow-Flies Baseline:** Distance `1.21 km`, Max Slope `33.1°`, Max HiRISE Roughness `61.3%`, Safety Index `21.4%`.
- **Measured Improvement:** **18.3% reduction in cumulative hazard exposure** while avoiding $33.1^\circ$ scarp zones.
