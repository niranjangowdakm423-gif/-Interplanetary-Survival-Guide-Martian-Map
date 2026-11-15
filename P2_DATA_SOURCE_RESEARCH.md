# ARES-NAV — P2 Planetary Data Source Research & Feasibility Analysis

**Document Version:** 2.1 (Scientifically Audited & Corrected)  
**Phase:** P2 — Advanced Planetary Intelligence & Autonomous Operations  
**Date:** November 15, 2026  
**Status:** Approved Dataset Research Reference  

---

## 1. Executive Overview

Phase P2 of ARES-NAV extends mission planning capabilities from tactical single-EVA navigation to expedition-scale infrastructure siting, multi-agent operations, and autonomous planetary science. This extension requires rigorous integration with advanced planetary science datasets and ephemerides tools.

To maintain strict scientific credibility, this document provides an exhaustive, evidence-based verification of every candidate NASA, ESA, and academic planetary dataset. It explicitly establishes:
1. Official archive availability, permanent PDS repository links, and exact product/bundle identifiers.
2. Actual downloadable product types, file formats, and internal structures.
3. Native spatial, temporal, and spectral resolutions and physical footprints.
4. Geographic and mission temporal coverage.
5. Ingestion and processing pipelines compatible with standard Python environments.
6. Storage footprints and computational profiles without fabricated figures.
7. Intrinsic scientific limitations, noise characteristics, and unmeasured variables.

> [!IMPORTANT]
> **Zero Live API Assumption:** Deep-space planetary archives do not provide transactional REST APIs for dynamic mission navigation. ARES-NAV operates on verified, pre-indexed, locally staged PDS product extracts, high-resolution regional grids, and authoritative NAIF SPICE kernel files.

---

## 2. Exhaustive Dataset Ingestion Profiles

---

### DS-P2-01: NASA NAIF SPICE Ephemeris Kernels
- **Exact PDS Product / Bundle Identifiers:**
  - LSK: `naif0012.tls` (Generic Leapseconds Kernel).
  - Planetary Ephemeris SPK: `de440.bsp` (Full planetary ephemeris 1550–2650, $\sim 115\,\text{MB}$) or `de440s.bsp` (Inner solar system ephemeris 1849–2150, $\sim 32\,\text{MB}$).
  - Mars System SPK: `mar097.bsp` (Mars barycenter, Phobos, Deimos 1900–2100, $\sim 12\,\text{MB}$).
  - PCK: `pck00010.tpc` (IAU 2009/2015 orientation and physical constants).
  - Topocentric Frame Kernel: Site-specific topocentric frame definitions (`mars_topo.tf`).
- **Official Archive Location:** NASA Navigation and Ancillary Information Facility (NAIF) / PDS NAIF Node (`https://naif.jpl.nasa.gov/pub/naif/generic_kernels/` and `https://naif.jpl.nasa.gov/pub/naif/pds/data/`). Metadata verified: November 15, 2026.
- **Product Format & Processing Level:** NAIF binary double-precision DAF/SPK and formatted ASCII text kernels; Calibrated Spacecraft & Planetary Geometry Ancillary Data.
- **Coordinate Reference Systems & Frames:**
  - Inertial Frame: `J2000` (Earth mean equator and equinox of J2000.0 epoch).
  - Body-Fixed Frame: `IAU_MARS` (Mars planetocentric coordinates, East longitude $0–360^\circ$).
  - Local Topocentric Frame: `MARS_TOPO` (North-East-Down / East-North-Up anchored to landing site coordinates).
- **Time Systems & Transformations:**
  - $\text{UTC} \xrightarrow{\text{naif0012.tls}} \text{TAI} \to \text{TT} \to \text{ET / TDB}$ (Barycentric Dynamical Time).
  - Solar Longitude $L_s \in [0^\circ, 360^\circ)$ derived from Mars orbital position vector relative to Sun: $L_s = \text{atan2}(r_y, r_x)$.
  - True Local Solar Time (LTST) and Local True Solar Time Angle ($\omega$).
- **One-Way Light Time (OWLT) vs. End-to-End Latency:**
  - *OWLT Calculation:* Geometric light time $OWLT = |\vec{r}_{\text{Earth}}(\text{ET}) - \vec{r}_{\text{Mars}}(\text{ET} - \tau)| / c$. Varies deterministically from $186\,\text{s}$ ($3.1\,\text{min}$ at close opposition, $d \approx 0.37\,\text{AU}$) to $1338\,\text{s}$ ($22.3\,\text{min}$ at solar conjunction, $d \approx 2.68\,\text{AU}$).
  - *Operational Total Latency:* $T_{\text{latency}} = 2 \times OWLT + \Delta t_{\text{DSN\_view}} + \Delta t_{\text{store\_forward}} + \Delta t_{\text{proc}}$.
- **Python Compatibility & Storage:**
  - Supported via `spiceypy` (Python wrapper for NAIF CSPICE).
  - Zero-dependency fallback: Precomputed Chebyshev polynomial lookup tables ($0.05^\circ L_s$ resolution) for standard Python libraries where dynamic C-libraries cannot be compiled.
  - Operational kernel footprint: $\sim 45\,\text{MB}$ total for `de440s.bsp`, `mar097.bsp`, `pck00010.tpc`, and `naif0012.tls`.
- **Known Limitations & Uncertainty:**
  - SPK barycentric accuracy is $<10\,\text{m}$.
  - PCK orientation uncertainty introduces $<5\,\text{m}$ surface displacement over decadal intervals.
  - Does not account for Deep Space Network (DSN) ground station scheduling gaps, solar plasma scintillation during conjunction, or packet store-and-forward delays on Mars Odyssey / MRO relay orbiters.

---

### DS-P2-02: Mars 2020 MEDA In-Situ Microclimate Observations
- **Exact PDS Product / Bundle Identifiers:** `urn:nasa:pds:mars2020_meda` (PDS4 Bundle). Specifically:
  - `data_derived_env`: Calibrated ambient environmental time-series tables (CSV).
  - `data_calibrated`: Sensor-level calibrated physical measurements.
- **Official Archive Location:** NASA PDS Atmospheres Node (`https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/`). Metadata verified: November 15, 2026.
- **Product Format & Processing Level:** PDS4 XML labels with detached comma-separated ASCII tables (`.CSV`). Level 3 Calibrated and Level 4 Derived Data Records.
- **Spatial & Temporal Coverage:**
  - Spatial: In-situ point measurement along the Perseverance rover traverse in Jezero Crater ($18.44^\circ\text{N}, 77.45^\circ\text{E}$).
  - Temporal: Sol 0 to present (Sol 1200+); discontinuous seasonal coverage based on mission operations.
- **Sensor-Specific Sampling Strategies:**
  - **Pressure Sensor (PS):** Nominal sampling at **$1\,\text{Hz}$ or $2\,\text{Hz}$** continuous; automated burst mode at **$8\,\text{Hz}$** triggered during rapid convective pressure drops (dust devils). Accuracy $\pm 3\,\text{Pa}$, precision $0.1\,\text{Pa}$.
  - **Thermal Infrared Sensor (TIRS):** Samples at **$1\,\text{Hz}$** via upward- and downward-looking thermopiles measuring surface skin brightness temperature ($T_g$) and atmospheric air temperature at 40m altitude. Accuracy $\pm 1.5\,\text{K}$.
  - **Wind Sensors (WS1 & WS2):** Two cylindrical booms on the rover remote sensing mast, sampling at **$1\,\text{Hz}$ or $2\,\text{Hz}$** via heated thermal anemometer detector boards. Accuracy $\pm 1.0\,\text{m/s}$ speed, $\pm 15^\circ$ azimuth.
  - **Radiation and Dust Sensor (RDS):** 8 zenith-facing and 8 off-axis photodiodes. **Sampled at $0.1\,\text{Hz}$ (once every 10 seconds)** to manage telemetry volume and power. Measures sky radiance and column optical depth ($\tau$ at 880 nm).
  - **Relative Humidity Sensor (HS):** Capacitive thin-film polymer inside the mast neck. **Sampled at $0.05\,\text{Hz}$ to $0.1\,\text{Hz}$ (once every 10–20 seconds)**.
  - **Ambient Temperature Sensors (ATS):** 5 platinum resistance sensors on the mast and front rover deck, sampled at **$1\,\text{Hz}$**.
- **Known Limitations & Uncertainty:**
  - Highly localized point measurement subject to the rover's thermal wake, ground shadowing, and micro-topography.
  - Wind sensor 1 experienced partial sensor board damage from saltating sand grains on Sol 313, requiring calibration adjustments.
  - Cannot be generalized across Mars without barometric scaling ($z$-elevation) and thermal inertia corrections.

---

### DS-P2-03: MSL Curiosity REMS In-Situ Microclimate Observations
- **Exact PDS Product / Bundle Identifiers:** PDS3 Dataset `MSL-M-REMS-4-RDR-V1.0`.
- **Official Archive Location:** NASA PDS Atmospheres Node (`https://pds-atmospheres.nmsu.edu/data/msl-m-rems-4-rdr-v1.0/`). Metadata verified: November 15, 2026.
- **Product Format & Processing Level:** PDS3 ASCII tables (`.TAB`) with detached label files (`.LBL`). Level 4 Derived Data Records.
- **Spatial & Temporal Coverage:**
  - Spatial: Point measurements along the Curiosity rover traverse in Gale Crater ($-4.59^\circ\text{S}, 137.44^\circ\text{E}$).
  - Temporal: Over 4,200 Martian sols of continuous climatological time-series ($2012–\text{present}$).
- **Sampling Strategy:**
  - Nominal REMS strategy samples at **$1\,\text{Hz}$ for 5 minutes at the beginning of each Martian hour**, supplemented by occasional continuous 24-hour monitoring sessions (Gómez-Elvira et al., 2012).
- **Known Limitations & Uncertainty:**
  - Gale Crater microclimate features strong thermal katabatic winds driven by Mount Sharp topography that do not represent global plain winds.
  - Boom 1 wind sensor suffered electrical degradation shortly after landing on Sol 1.

---

### DS-P2-04: NASA Ames Mars Global Climate Model (AmesCAP / FV3-MGCM)
- **Model Framework Distinction:**
  - *Legacy MGCM:* Traditional finite-difference dynamical core (Haberle et al., 2019).
  - *Modern FV3-MGCM:* NASA Ames Mars Global Climate Model utilizing the NOAA GFDL Finite-Volume Cubed-Sphere dynamical core (FV3; Montmessin et al., Wilson et al., Kahre et al.).
  - *AmesCAP:* Ames Climate Analysis Package, the official open-source Python post-processing and analysis toolkit.
- **Exact Simulation Selection & Structure:**
  - Simulation Baseline: FV3-MGCM climatological simulation run with a C48 cubed-sphere grid (approximately $1.875^\circ \times 1.875^\circ$ equivalent longitude-latitude resolution) or high-resolution C96 ($0.9375^\circ \times 0.9375^\circ$).
  - Vertical Discretization: 30 to 60 vertical hybrid log-pressure ($\sigma-p$) layers extending from surface ($z = 0$) up to $\sim 80\,\text{km}$.
  - Temporal Sampling: Climatological diurnal cycle averaged across 24 sol hours (sampled at 1 or 2 sol-hour increments) for 12 seasonal solar longitude bins ($L_s = 0^\circ, 30^\circ, \dots, 330^\circ$).
  - NetCDF-4 Classic Structure: Dimensions `(time: 24, lev: 30, lat: 96, lon: 192)`. Variables:
    - `ps`: Surface atmospheric pressure ($\text{Pa}$).
    - `tsurf`: Surface skin temperature ($\text{K}$).
    - `ucomp`, `vcomp`: Near-surface zonal and meridional horizontal winds at lowest model layer ($z \approx 1.5–5\,\text{m}$ in $\text{m/s}$).
    - `taudust`: Integrated column visible optical depth.
- **Python Compatibility & Storage:**
  - Standard reading via `scipy.io.netcdf` or `netCDF4`.
  - For zero-external-dependency deployment: Extract $80 \times 80$ regional bounding-box climatology slices into lightweight JSON lookup grids ($\sim 4.5\,\text{MB}$ total for all 10 exploration sites).
- **Known Limitations & Uncertainty:**
  - Grid resolution ($1^\circ \approx 59\,\text{km}$) cannot resolve micro-scale crater slope winds, convective dust devils, or terrain boundary-layer separation in canyons.

---

### DS-P2-05: MRO Mars Climate Sounder (MCS)
- **Exact PDS Product / Bundle Identifiers:** PDS4 Product `urn:nasa:pds:mro_mcs:data_derived_profile` (MCS Derived Data Record, DDR).
- **Official Archive Location:** NASA PDS Atmospheres Node (`https://pds-atmospheres.nmsu.edu/data/mro-m-mcs-5-ddr-v1.0/`). Metadata verified: November 15, 2026.
- **Product Format & Processing Level:** PDS4 XML / ASCII and binary profile tables. Level 4 Derived Vertical Profiles.
- **Resolution & Measurement Footprint:**
  - Instrument: 9-channel thermal infrared filter radiometer (A1–A6, B1–B3, $0.3–45\,\mu\text{m}$).
  - Limb Viewing Geometry: Detector array has 21 elements per channel, each subtending $0.082^\circ$, providing a **$5\,\text{km}$ vertical resolution** at the Mars limb from surface up to $80\,\text{km}$.
  - Horizontal Measurement Footprint:
    - *Limb Line-of-Sight Footprint:* In-track limb line-of-sight integrates through an atmospheric chord **$\sim 100–200\,\text{km}$ along-track and $\sim 10\,\text{km}$ cross-track**.
    - *Off-Nadir / Cross-Track Scanning:* Measures swaths of **$2 \times 10\,\text{km}$ to $5 \times 20\,\text{km}$**.
- **Role in P2:**
  - Constrains vertical atmospheric density scale height $H = k_B T / (m g) \approx 10.8\,\text{km}$ and seasonal dust layer aloft.
- **Known Limitations & Uncertainty:**
  - Limb sounding geometry has poor vertical sensitivity within the lowest $0–2\,\text{km}$ planetary boundary layer due to surface obscuration and high dust opacity.

---

### DS-P2-06: MRO MARCI Daily Global Weather Maps
- **Exact PDS Product / Bundle Identifiers:** PDS3 Dataset `MRO-M-MARCI-5-RDR-V1.0`.
- **Official Archive Location:** NASA PDS Geosciences Node / Malin Space Science Systems (`https://pds-geosciences.wustl.edu/mro/mro-m-marci-5-rdr-v1.0/`). Metadata verified: November 15, 2026.
- **Product Format & Processing Level:** PDS3 IMG format with detached labels; processed to Level 4 calibrated and map-projected daily global mosaics.
- **Resolution & Coverage:**
  - Spatial: $1–8\,\text{km/pixel}$ global daily coverage across 5 visible and 2 UV bands.
  - Temporal: Continuous daily global monitoring from 2006 to present.
- **Role in P2:**
  - Historical catalog of local, regional, and planet-encircling dust storms (e.g. 2018 Global Dust Storm).
  - Supplies statistical dust front boundary propagation velocities ($v_{\text{front}} \approx 15–35\,\text{km/h}$) used to parameterize the autonomous tactical replanning engine.
- **Known Limitations & Uncertainty:**
  - No operational real-time push feed from Mars. Data serves strictly as an empirical baseline for storm front parameterization.

---

### DS-P2-07: Mars 2020 RIMFAX Subsurface Ground-Penetrating Radar
- **Exact PDS Product / Bundle Identifiers:** PDS4 Bundle `urn:nasa:pds:mars2020_rimfax`. Specifically:
  - `data_calibrated`: Calibrated GPR radar traces (radargrams).
- **Official Archive Location:** NASA PDS Geosciences Node (`https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rimfax/`). Metadata verified: November 15, 2026.
- **Product Format & Processing Level:** PDS4 XML labels with binary and ASCII radargram tables. Level 3 Calibrated Data.
- **Resolution, Depth & Measurement Footprint:**
  - Frequency: Frequency-Modulated Continuous Wave (FMCW) sweep from 150 MHz to 1200 MHz.
  - Vertical Resolution: **$15–30\,\text{cm}$ in regolith** ($\epsilon'_r \approx 3$).
  - Along-Track Horizontal Sampling: **$\sim 10\,\text{cm}$ along the rover wheel traverse**.
  - Measurement Footprint Width: **Extremely narrow swath ($<1\,\text{m}$ cross-track Fresnel width)** directly beneath the rover rear mast.
  - Penetration Depth: $0–10\,\text{m}$ in low-loss dry sediments/sandstone; $<3\,\text{m}$ in conductive, clay-rich or iron-rich volcanic soils.
- **Strict Methodological Boundary:**
  - **Zero Site-Wide Extrapolation:** RIMFAX radargrams cover strictly a 1D line along the rover's wheel track. RIMFAX data **must never be extrapolated across an entire landing site**. It serves solely as a ground-truth calibration point for shallow regolith dielectric permittivity and bedrock depth.

---

### DS-P2-08: 2001 Mars Odyssey GRS / HEND / Neutron Spectrometer Suite
- **Exact PDS Product / Bundle Identifiers:**
  - Gamma Ray Spectrometer (GRS): PDS3 Dataset `ODY-M-GRS-5-DDR-MOLA-ELEVATION-V1.0`.
  - High Energy Neutron Detector (HEND): PDS3 Dataset `ODY-M-HEND-5-RDR-V1.0`.
  - Neutron Spectrometer (NS): PDS3 Dataset `ODY-M-NS-5-RDR-V1.0`.
- **Official Archive Location:** NASA PDS Geosciences Node (`https://pds-geosciences.wustl.edu/missions/odyssey/grs.html`). Metadata verified: November 15, 2026.
- **Product Format & Processing Level:** PDS3 ASCII tables, binary map matrices, and derived global elemental abundance maps (Level 5 Derived Products).
- **Instrument Separation & Hydrogen Sensitivity:**
  - **GRS (Gamma Ray Spectrometer):** Active cryocooler failed in 2007. Measured discrete gamma-ray line emissions from radioactive decay and neutron capture (Fe, Si, K, Th, Cl).
  - **HEND & NS (Neutron Detectors):** Primary source for **Water-Equivalent Hydrogen (WEH wt%)** (Feldman et al., 2002, 2004; Maurice et al., 2011; Boynton et al., 2007). Epithermal neutron leakage flux ($0.4\,\text{eV} - 100\,\text{keV}$) is selectively suppressed by hydrogen moderation (since hydrogen nuclei have roughly equal mass to neutrons).
- **Resolution & Depth:**
  - Spatial Footprint: **Very coarse resolution ($5^\circ \times 5^\circ$, roughly $300\,\text{km} \times 300\,\text{km}$)**.
  - Sensing Depth: Sensitive only to the **top $\sim 1.0\,\text{m}$ of surface regolith**.
- **Known Limitations & Uncertainty:**
  - Measures total atomic hydrogen: cannot distinguish water-ice, adsorbed water, or hydrated minerals (phyllosilicates/sulfates).
  - Extremely coarse footprint cannot resolve localized ice deposits, glacier tongues, or individual crater floor units.

---

### DS-P2-09: MRO SHARAD Shallow Subsurface Radar Sounder
- **Exact PDS Product / Bundle Identifiers:** PDS3 Dataset `MRO-M-SHARAD-5-RDR-V1.0` and SWIM (Subsurface Water Ice Mapping) derived synthesis products.
- **Official Archive Location:** NASA PDS Geosciences Node (`https://pds-geosciences.wustl.edu/mro/mro-m-sharad-5-rdr-v1.0/`). Metadata verified: November 15, 2026.
- **Product Format & Processing Level:** PDS3 binary radargrams and ASCII track tables. Level 4 Calibrated and SAR-processed Data Records.
- **Resolution, Depth & Footprint:**
  - Chirp Bandwidth: 15–25 MHz chirp (10 MHz bandwidth centered at 20 MHz).
  - Vertical Resolution:
    - Free space: $\Delta z_0 = c / (2 B) = 15.0\,\text{m}$.
    - In pure water-ice ($\epsilon'_r = 3.15$): $\Delta z = 15.0 / \sqrt{3.15} \approx \mathbf{8.4\,\text{m}}$.
    - In dense basalt ($\epsilon'_r = 8.0$): $\Delta z = 15.0 / \sqrt{8.0} \approx \mathbf{5.3\,\text{m}}$.
  - Horizontal Measurement Footprint:
    - Along-track (after Synthetic Aperture Radar processing): **$0.3–1.0\,\text{km}$**.
    - Cross-track (unfocused Fresnel zone): **$3–6\,\text{km}$ wide**.
  - Penetration Depth: Up to **$1000\,\text{m}$ in pure, low-loss water-ice** (e.g. polar layered deposits or thick lobate debris aprons in Arcadia Planitia), but $<50–100\,\text{m}$ in lossy, iron-rich basaltic soils.
- **Known Limitations & Uncertainty:**
  - Topographic surface clutter (off-nadir reflections from crater rims and scarps) can closely mimic subsurface interfaces. Requires synthetic clutter simulation for verification.
  - Cannot resolve regolith overburden layers thinner than $\sim 8\,\text{m}$.

---

## 3. Multi-Evidence Water-Ice Confidence Classification

To prevent false claims of "confirmed water-ice", ARES-NAV enforces an evidence-based classification hierarchy that separates observational detections from resource inferences:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      WATER-ICE EVIDENCE CLASSIFICATION TAXONOMY                        │
├───────────────────────────────┬──────────────────────────────────┬─────────────────────┤
│ Evidence Class                │ Sensor / Dataset                 │ Physical Domain     │
├───────────────────────────────┼──────────────────────────────────┼─────────────────────┤
│ 1. Surface Spectral           │ CRISM / OMEGA SWIR Spectroscopy  │ Optical surface     │
│    Observations               │ (1.5 µm, 2.0 µm absorption)      │ (microns to mm)     │
├───────────────────────────────┼──────────────────────────────────┼─────────────────────┤
│ 2. Subsurface Radar           │ SHARAD / MARSIS                  │ Deep stratigraphy   │
│    Reflectors                 │ (15–25 MHz reflections)          │ (depth > 8–10 m)    │
├───────────────────────────────┼──────────────────────────────────┼─────────────────────┤
│ 3. Inferred Dielectric        │ Complex Refractive Index Model   │ Inferred bulk matrix│
│    Properties (CRIM)          │ (ε' ~ 2.8–3.5 anomaly)           │ (ambiguous)         │
├───────────────────────────────┼──────────────────────────────────┼─────────────────────┤
│ 4. Regional Hydrogen          │ Odyssey Neutron Spectrometer /   │ Top 1.0 m regolith  │
│    Estimates                  │ HEND (Epithermal neutron count)  │ (300 km footprint)  │
├───────────────────────────────┼──────────────────────────────────┼─────────────────────┤
│ 5. Exposed Subsurface         │ HiRISE High-Resolution Scarp &   │ Physical ice        │
│    Ice Observations           │ Fresh Impact Crater Monitoring   │ exposures           │
├───────────────────────────────┼──────────────────────────────────┼─────────────────────┤
│ 6. Estimated Accessible       │ Coupled Overburden &             │ Exploitable resource│
│    Resources                  │ Thermodynamic Mining Model       │ candidate           │
└───────────────────────────────┴──────────────────────────────────┴─────────────────────┘
```

### Multi-Evidence Integration Rules:
1. **Surface Spectral Detections Alone:** CRISM detections of water-ice absorption bands confirm only surface frost, snow, or optically exposed ice scarps. They **do not confirm** deep buried accessible reserves, as a $10\,\mu\text{m}$ dust mantle obscures underlying deposits, while surface frost can be sub-millimeter thick.
2. **Dielectric Anomaly Inferences Alone:** Apparent permittivity $\epsilon'_r \approx 3.15$ derived from SHARAD radargrams indicates a low-dielectric material. Porous volcanic pumice, dry basaltic ash ($\phi \approx 40\%$), and vesicular lava tubes produce dielectric signatures identical to pure water-ice.
3. **High-Confidence Classification Standard:** A candidate location is classified as `High-Confidence Water Ice` **only when** at least three independent lines of evidence are mutually consistent (e.g. SWIM methodology):
   - Inferred dielectric constant $\epsilon'_r \in [2.8, 3.5]$ from SHARAD.
   - Regional hydrogen enrichment ($WEH > 7\,\text{wt}\%$) from Odyssey Neutron Spectrometer.
   - Low thermal inertia ($I < 200\,\text{TIU}$) or visible glacial/lobate debris apron morphology in HiRISE.
4. **Accessible Resource Determination:** Even high-confidence ice is classified as `Operationally Inaccessible` if the regolith overburden exceeds the mechanical drilling envelope ($>2.0\,\text{m}$) or if thermodynamic melting energy exceeds the basecamp power budget.

---

## 4. Dataset Integration Priority Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              P2 DATASET INTEGRATION TIERS                              │
├─────────┬─────────────────────────┬────────────────────────────────┬───────────────────┤
│ Tier 1  │ ESSENTIAL FOUNDATION    │ NAIF SPICE Kernels             │ DS-P2-01          │
│         │ (Immediate Execution)   │ MEDA In-Situ Sol Summaries     │ DS-P2-02          │
├─────────┼─────────────────────────┼────────────────────────────────┼───────────────────┤
│ Tier 2  │ RESOURCE & SITE SITING  │ SHARAD / SWIM Ice Products     │ DS-P2-09          │
│         │ (High Impact)           │ Odyssey NS/HEND WEH Regional   │ DS-P2-08          │
├─────────┼─────────────────────────┼────────────────────────────────┼───────────────────┤
│ Tier 3  │ ENVIRONMENTAL DYNAMICS  │ AmesCAP FV3-MGCM Wind/Pressure │ DS-P2-04          │
│         │ (Tactical Operations)   │ REMS Gale Comparative Climate  │ DS-P2-03          │
├─────────┼─────────────────────────┼────────────────────────────────┼───────────────────┤
│ Tier 4  │ SPECIALIZED REFERENCE   │ MARCI Dust Velocity Statistics │ DS-P2-06          │
│         │ (Analytical Baselines)  │ RIMFAX Along-Track FMCW Radar  │ DS-P2-07          │
│         │                         │ MCS Vertical Atmospheric Sound │ DS-P2-05          │
└─────────┴─────────────────────────┴────────────────────────────────┴───────────────────┘
```
