# ARES-NAV — Data Source Catalogue & Provenance Reference

**Project:** ARES-NAV (NASA Space Apps Challenge 2026)  
**Document Status:** Approved Scientific Reference  
**Last Updated:** November 15, 2026  
**Standards Compliance:** NASA Planetary Data System (PDS) Standards v4, Open Geospatial Consortium (OGC) WMTS 1.0.0, Space Apps Challenge Challenge Resource Requirements.

---

## 1. Overview and Provenance Taxonomy

To ensure rigorous scientific integrity, ARES-NAV strictly classifies every piece of spatial, environmental, and physical data into five unambiguous provenance categories:

1. **Official NASA Dataset [VERIFIED]:** Direct, unmodified or calibrated observation products acquired by NASA spacecraft missions and served by NASA facilities (PDS, Mars Trek, JPL, USGS Astrogeology).
2. **Official Space Agency Partner Dataset [VERIFIED]:** Calibrated observation products from international partner missions (e.g. ESA Mars Express HRSC, OMEGA).
3. **Derived / Calculated Scientific Dataset [CALCULATED]:** Deterministic physical or mathematical transformations computed directly from verified NASA source data (e.g. Horn gradient slope derived from MOLA elevation, Pandolf bioenergetic model, viewshed ray-marching).
4. **Calibrated Model / Synthetic Baseline [SIMULATED]:** Phenomenological or empirical models calibrated to published planetary literature and landing site ground-truth (e.g. diurnal insolation thermal models, atmospheric column radiation modulation).
5. **User-Uploaded Dataset [UNVERIFIED / USER_UPLOAD]:** External observation or hazard data supplied via CSV, JSON, GeoJSON, or raster upload. **Never classified as NASA-verified.**

---

## 2. Dataset Catalogue

---

### DS-01: Mars Global Surveyor MOLA Digital Elevation Model (DEM) & Hillshade
- **Dataset Name:** Mars Global Surveyor (MGS) Mars Orbiter Laser Altimeter (MOLA) Megadr 128 Pixels/Degree Global Topography
- **Original Source URL:** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/` and `https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/`
- **Responsible Agency & Mission:** NASA / Goddard Space Flight Center (GSFC) — Mars Global Surveyor
- **Instrument / Sensor:** MOLA (Mars Orbiter Laser Altimeter)
- **License / Usage Restrictions:** Public Domain (NASA Open Data Policy)
- **File Format & Access Method:** OGC WMTS 1.0.0 Tile Matrix Set (`image/jpeg`, `image/png`), PDS3 IMG/LBL raster format
- **Geographic & Temporal Coverage:** Global coverage ($90^\circ\text{S}$ to $90^\circ\text{N}$, $0^\circ$ to $360^\circ\text{E}$); Acquired 1997–2001
- **Spatial Resolution:** $463\,\text{m/pixel}$ at equator (128 pixels/degree); vertical accuracy $\pm 1\,\text{m}$ (relative), $\pm 3\,\text{m}$ (absolute)
- **Units & Coordinate Reference System:** Meters relative to Mars areoid (zero elevation defined by 610.5 Pa atmospheric pressure boundary); IAU 2000 Mars Planetocentric coordinate system
- **Processing Requirements:** Bicubic spatial downsampling/interpolation to $80 \times 80$ cell exploration grids; $3 \times 3$ Gaussian smoothing to eliminate JPEG quantization artifacts
- **Current Integration Status:** Active. Pre-downloaded 4-tile stitched mosaics for Jezero, Melas, and Arcadia; indexed in `mars_trek_manifest.json` and served from `static/nasa_tiles/`
- **Data Classification:** Official NASA Dataset [VERIFIED] (for tiled sites); Derived Topographic Heightfield [CALCULATED] (for secondary sites)
- **Verification Status:** Verified against NASA Mars Trek WMTS Capabilities XML

---

### DS-02: Mars Reconnaissance Orbiter CTX 5m Global Mosaic
- **Dataset Name:** Context Camera (CTX) Controlled Global Mosaic (Caltech Bruce Murray Laboratory for Planetary Visualization)
- **Original Source URL:** `https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{TileMatrix}/{TileRow}/{TileCol}`
- **Responsible Agency & Mission:** NASA / JPL-Caltech / Malin Space Science Systems (MSSS) — Mars Reconnaissance Orbiter (MRO)
- **Instrument / Sensor:** CTX (Context Camera)
- **License / Usage Restrictions:** Open Data / Creative Commons Attribution (Caltech / NASA / MSSS)
- **File Format & Access Method:** Esri REST Tile Map Service / OGC WMTS, 8-bit panchromatic JPEG
- **Geographic & Temporal Coverage:** Near-global ($>99.5\%$ Mars surface coverage); Acquired 2006–Present
- **Spatial Resolution:** $\sim 5.0\,\text{m/pixel}$; signal-to-noise ratio $>100:1$
- **Units & Coordinate Reference System:** Radiance / reflectance factor (DN 0–255); IAU 2000 Mars Equirectangular projection
- **Processing Requirements:** Real-time tile streaming and dynamic client-side raster blending on `mars-canvas`
- **Current Integration Status:** Active. Live WMTS streaming enabled in `app.js` with pre-downloaded local zoom-5 mosaics for offline failover
- **Data Classification:** Official NASA Dataset [VERIFIED]
- **Verification Status:** Verified against Caltech / ArcGIS REST MapServer Capabilities

---

### DS-03: Mars Reconnaissance Orbiter HiRISE High-Resolution Orthoimagery
- **Dataset Name:** High Resolution Imaging Science Experiment (HiRISE) Reduced Data Record (RDRV11)
- **Original Source URL:** `https://oderest.rsl.wustl.edu/live2/` and `https://hirise.lpl.arizona.edu/`
- **Responsible Agency & Mission:** NASA / University of Arizona / JPL — Mars Reconnaissance Orbiter (MRO)
- **Instrument / Sensor:** HiRISE (High Resolution Imaging Science Experiment)
- **License / Usage Restrictions:** Public Domain (NASA PDS Open Access)
- **File Format & Access Method:** JPEG 2000 (`.JP2`) and calibrated PDS browse products via Washington University in St. Louis Orbital Data Explorer (ODE) REST API
- **Geographic & Temporal Coverage:** Targeted surface footprints over Jezero Crater, Melas Chasma, Arcadia Planitia; Acquired 2006–Present
- **Spatial Resolution:** $0.25\,\text{m/pixel}$ to $0.50\,\text{m/pixel}$
- **Units & Coordinate Reference System:** I/F (radiance factor); Planetocentric coordinates
- **Processing Requirements:** High-frequency spatial gradient variance extraction via $3 \times 3$ Sobel/difference convolution to derive surface boulder density and micro-roughness percentages
- **Current Integration Status:** Active. 24 product records cataloged in `ode_pds_products.json`; sub-meter sample imagery integrated for Jezero (`PSP_008650_1990`, `ESP_022680_1985`)
- **Data Classification:** Official NASA Dataset [VERIFIED]
- **Verification Status:** Verified via NASA PDS ODE REST API query responses

---

### DS-04: Mars Reconnaissance Orbiter CRISM Targeted Mineral Spectroscopy
- **Dataset Name:** Compact Reconnaissance Imaging Spectrometer for Mars (CRISM) Map-Projected Targeted Reduced Data Record (MTRDR)
- **Original Source URL:** `https://pds-geosciences.wustl.edu/mro/mro-m-crism-3-rdr-targeted-v1/` and `https://oderest.rsl.wustl.edu/`
- **Responsible Agency & Mission:** NASA / Johns Hopkins University Applied Physics Laboratory (JHU/APL) — MRO
- **Instrument / Sensor:** CRISM (VNIR & IR spectrometers, 362–3920 nm)
- **License / Usage Restrictions:** Public Domain (NASA PDS Open Access)
- **File Format & Access Method:** PDS3 binary spectral image cubes (`.IMG`) with browse summary parameter PNG products (`brcarj`, `brphyj`, `brhyj`)
- **Geographic & Temporal Coverage:** Targeted footprints covering Jezero Delta (`hrl000040ff`, `frt000047a3`, `frt00005850`); Acquired 2006–2020
- **Spatial Resolution:** $18\,\text{m/pixel}$ to $36\,\text{m/pixel}$
- **Units & Coordinate Reference System:** Summary parameter indices (dimensionless, scaled 0–100 representing absorption band depths at $1.9\,\mu\text{m}$, $2.3\,\mu\text{m}$, and $2.5\,\mu\text{m}$)
- **Processing Requirements:** Extraction of hydrous phyllosilicate and magnesium carbonate absorption strengths mapped into the `mineral` and `hydration` raster grids
- **Current Integration Status:** Active. 20 MTRDR product records indexed in `ode_pds_products.json`; spectral centroids integrated into Jezero, Melas, and Arcadia
- **Data Classification:** Official NASA Dataset [VERIFIED] (catalog & footprints); Derived Mineral Grid [CALCULATED]
- **Verification Status:** Verified against NASA PDS Geosciences Node records

---

### DS-05: Mars Odyssey THEMIS Daytime Infrared Global Thermal Mosaic
- **Dataset Name:** 2001 Mars Odyssey Thermal Emission Imaging System (THEMIS) Daytime Infrared 100m Global Mosaic v12
- **Original Source URL:** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MO_THEMIS-IR-Day_mosaic_global_100m_v12/`
- **Responsible Agency & Mission:** NASA / Arizona State University (ASU) / JPL — 2001 Mars Odyssey
- **Instrument / Sensor:** THEMIS (Thermal Emission Imaging System, Band 9, $12.57\,\mu\text{m}$)
- **License / Usage Restrictions:** Public Domain (NASA Open Access)
- **File Format & Access Method:** OGC WMTS tile service (`image/jpeg`)
- **Geographic & Temporal Coverage:** Global ($85^\circ\text{S}$ to $85^\circ\text{N}$); Acquired 2002–Present
- **Spatial Resolution:** $100\,\text{m/pixel}$
- **Units & Coordinate Reference System:** Brightness temperature (Kelvin) normalized to standard local time ($\sim 17:00$); IAU 2000 Mars
- **Processing Requirements:** Downsampled tile integration in `static/nasa_tiles/`
- **Current Integration Status:** Active. Zoom-5 mosaics downloaded for Jezero, Melas, and Arcadia; indexed in `mars_trek_manifest.json`
- **Data Classification:** Official NASA Dataset [VERIFIED]
- **Verification Status:** Verified against ASU / Mars Trek WMTS Capabilities

---

### DS-06: Mars Science Laboratory Curiosity RAD Surface Dosimetry Time-Series
- **Dataset Name:** Mars Science Laboratory (MSL) Radiation Assessment Detector (RAD) Calibrated Science Observation Data Records
- **Original Source URL:** `https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/`
- **Responsible Agency & Mission:** NASA / Southwest Research Institute (SwRI) / DLR — Curiosity Rover
- **Instrument / Sensor:** MSL RAD (Silicon detector telescope B-C-D + CsI/plastic scintillators)
- **License / Usage Restrictions:** Public Domain (NASA PDS PPI Open Access)
- **File Format & Access Method:** PDS3 ASCII tables (`.TAB`) with detached ASCII labels (`.LBL`)
- **Geographic & Temporal Coverage:** Gale Crater floor traverse ($4.5^\circ\text{S}$, $137.4^\circ\text{E}$); Sol 0 through Sol 4000+ (2012–Present)
- **Spatial Resolution:** In-situ point measurement along rover traverse ($<1\,\text{m}$ point resolution)
- **Units & Coordinate Reference System:** Absorbed dose rate ($\mu\text{Gy/hr}$) in silicon and tissue-equivalent plastic; Dose equivalent rate in micro-Sieverts per hour ($\mu\text{Sv/hr}$)
- **Processing Requirements:** Baseline GCR dose rate calibration ($26.67\,\mu\text{Sv/hr} \equiv 640\,\mu\text{Sv/day}$) coupled with MOLA atmospheric column mass attenuation and cliff-overhang sky-view shielding factors
- **Current Integration Status:** Active. 5,570 indexed RDR product records stored in `msl_rad_pds.json`; calibrated baseline used across all 10 sites
- **Data Classification:** Official NASA Dataset [VERIFIED] (in-situ measurements); Atmospheric/Topographic Dosimetry Model [CALCULATED]
- **Verification Status:** Verified against UCLA PDS-PPI Archive INDEX.TAB

---

### DS-07: Shallow Radar (SHARAD) Subsurface Water Ice Mapping
- **Dataset Name:** MRO Shallow Subsurface Radar (SHARAD) Subsurface Dielectric and Water Ice Mapping
- **Original Source URL:** `https://pds-geosciences.wustl.edu/mro/mro-m-sharad-5-radargram-v1/` and SWIM Project (Planetary Science Institute)
- **Responsible Agency & Mission:** NASA / Italian Space Agency (ASI) — MRO
- **Instrument / Sensor:** SHARAD (15–25 MHz chirp radar sounding)
- **License / Usage Restrictions:** Public Domain (NASA / ASI)
- **File Format & Access Method:** PDS binary radargrams and SWIM composite ice consistency GeoTIFFs
- **Geographic & Temporal Coverage:** Mid-to-high latitudes ($>30^\circ\text{N/S}$), especially Arcadia Planitia and Utopia Planitia
- **Spatial Resolution:** $0.3–1.0\,\text{km}$ along-track horizontal; $15\,\text{m}$ vertical in Martian regolith / $8\,\text{m}$ in pure water ice
- **Units & Coordinate Reference System:** Dielectric permittivity ($\varepsilon'$) and Water-Equivalent Ice Percentage ($\%$)
- **Processing Requirements:** POI and regional hydration percentage interpolation in `hydration` raster layer
- **Current Integration Status:** Active. Incorporated into Arcadia Planitia site profile and regional ISRU targets
- **Data Classification:** Official NASA / ASI Partner Dataset [VERIFIED]
- **Verification Status:** Verified against published SWIM / SHARAD subsurface ice products

---

### DS-08: USGS / NASA Mars Geologic Framework
- **Dataset Name:** Geologic Map of Mars (USGS Scientific Investigations Map 3292)
- **Original Source URL:** `https://pubs.usgs.gov/sim/3292/`
- **Responsible Agency & Mission:** U.S. Geological Survey (USGS) in cooperation with NASA
- **Instrument / Sensor:** Synthesis of Viking, MGS MOLA, MRO CTX, and Mars Odyssey THEMIS datasets
- **License / Usage Restrictions:** Public Domain (U.S. Government Work)
- **File Format & Access Method:** GIS Shapefiles / PDF / GeoTIFF
- **Geographic & Temporal Coverage:** Global; Published 2014
- **Spatial Resolution:** 1:20,000,000 scale map
- **Units & Coordinate Reference System:** Chronostratigraphic units (Noachian, Hesperian, Amazonian); IAU 2000
- **Processing Requirements:** Categorization of candidate landing sites and geological formation designations
- **Current Integration Status:** Active. Site summaries, stratigraphic designations, and rock age contexts cataloged in `server.py` SITES dictionary
- **Data Classification:** Official NASA / USGS Dataset [VERIFIED]
- **Verification Status:** Verified against USGS SIM 3292 publication records

---

### DS-09: User-Uploaded Observations & Hazard Overlays
- **Dataset Name:** User-Contributed Spatial Ingestion (CSV, GeoJSON, JSON, Raster)
- **Original Source URL:** Client-side local file upload via ARES-NAV Mars Data Explorer
- **Responsible Agency & Mission:** User-Declared Provenance (Mission Astronaut / Scientific Researcher)
- **Instrument / Sensor:** User Defined (e.g. Rover Navigation Camera, Drone LiDAR, Manual Annotation)
- **License / Usage Restrictions:** User defined
- **File Format & Access Method:** Multi-format ingestion: RFC 7946 GeoJSON, RFC 4180 CSV, JSON Array, PNG/JPEG raster with coordinate bounding box
- **Geographic & Temporal Coverage:** User specified
- **Spatial Resolution:** Variable (dependent on upload metadata)
- **Units & Coordinate Reference System:** WGS84 / Mars Planetocentric lat/lon; custom physical units
- **Processing Requirements:** Server and client validation engine (coordinate range validation, required field checks, bounding box verification)
- **Current Integration Status:** Active. Uploaded via `POST /api/upload_dataset`, rendered on `user-obs-canvas`, optionally fed into $A^*$ route avoidance
- **Data Classification:** User-Uploaded Dataset [UNVERIFIED / USER_UPLOAD]. **Strictly isolated from NASA verified datasets.**
- **Verification Status:** Tagged as `Unverified` by system default.

---

## 3. Data Integrity & Uncertainty Budget

| Dataset Layer | Primary Sensor | Horizontal Res | Vertical / Numerical Accuracy | Primary Uncertainty Source |
|---|---|---|---|---|
| **Elevation** | MGS MOLA | $463\,\text{m/px}$ | $\pm 1.0\,\text{m}$ (vertical) | Altimeter shot footprint spacing ($300\,\text{m}$) |
| **Slope** | Horn Gradient (MOLA) | $25\,\text{m/cell}$ | $\pm 1.5^\circ$ | Micro-topography below $463\,\text{m}$ grid resolution |
| **Boulders** | MRO HiRISE | $0.25\,\text{m/px}$ | $\pm 5\%$ area fraction | Solar phase angle shadowing effects |
| **Mineralogy** | MRO CRISM | $18\,\text{m/px}$ | Qualitative band depth ($\pm 10\%$) | Atmospheric dust / aerosol opacity |
| **Radiation** | MSL RAD | In-situ | $\pm 10.5\%$ (dosimetric flux) | GCR solar cycle variation & instrument background |
| **Comm LOS** | Ray-March (3D DEM) | $25\,\text{m/cell}$ | Optical horizon limit | Tropospheric ducting / diffraction along crater rims |
| **User Uploads** | User Sensor | Unconstrained | Declared by user | Uncalibrated sensor drift / coordinate misregistration |

---

## 4. NASA Space Apps Challenge 2026 Compliance

- **Mandatory Challenge Resource:** Utilizes **NASA Mars Trek WMTS** (`trek.nasa.gov`) and **NASA PDS Orbital Data Explorer** (`oderest.rsl.wustl.edu`), both officially listed challenge resources.
- **Partner Space Agency Integration:** Incorporates ASI / NASA SHARAD subsurface radar data and DLR / NASA MSL RAD instrumentation.
- **Citation Requirement:** All data layers cite original NASA missions, instrument PI institutions, and PDS product IDs in application HUD tooltips, dataset cards, and exported mission JSON files.
