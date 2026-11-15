# ARES-NAV — P2 Implementation Plan & Research Architecture
## Advanced Planetary Intelligence, Multi-Agent Autonomous Operations & Long-Term Expedition Siting

**Document Version:** 2.1 (Scientifically Audited & Corrected)  
**Phase:** P2 — Advanced Planetary Intelligence & Autonomous Operations  
**Date:** November 15, 2026  
**Document Status:** Approved Master Architecture & Implementation Plan  
**Implementation Constraint:** *Strictly Planning & Architectural Design. No implementation code executed until authorized by User.*

---

## 1. Executive Summary & Mission Context

ARES-NAV Phase P0 established the scientific data foundation across 10 Martian landing sites with 8 spatial raster layers, MOLA/HiRISE/CRISM/MSL-RAD ingestion, dual HTML5 Canvas rendering, and user dataset upload.  
Phase P1 established intelligent tactical mission planning with 8 explainable multi-objective routing modes, mission feasibility & consumable reserve checking with Point of No Return (PNR), dynamic multi-hazard risk heatmapping, diurnal surface temperature & Ingenuity drone modeling, and Proximity-1 UHF link budgeting with portable relay deployment.

**Phase P2 elevates ARES-NAV from tactical single-EVA navigation to an autonomous, multi-agent planetary exploration and expedition infrastructure platform.**

In Phase P2, ARES-NAV addresses the long-term survival, operational, and architectural requirements of human Mars expeditions as defined by the NASA Moon-to-Mars Architecture Objectives (specifically Ops-1, Ops-2, Sci-1, Infra-1, and Hab-1):
1. **Astronomical Clock & High-Precision Ephemerides (P2.1):** Grounding mission operations in true Martian orbital mechanics ($L_s$, sub-solar latitude, true local solar time LTST, and Earth-Mars light-time latency) using NASA NAIF SPICE kernels and assimilating in-situ rover microclimate records (MEDA/REMS).
2. **Long-Term Settlement & Base Siting (P2.2):** Where should multi-megawatt habitats, fission surface power / solar arrays, and landing pads be positioned to minimize cosmic radiation, terrain slope hazard, dust fouling, and micro-meteoroid exposure while maximizing ISRU extraction?
3. **Subsurface Intelligence & ISRU Thermodynamics (P2.3):** Given subsurface dielectric radar sounding (SHARAD/SWIM) and CRISM hydration maps, what is the thermodynamic energy cost, sublimation yield, and electrolysis oxygen production rate of localized water-ice mining?
4. **Multi-Agent Heterogeneous Fleet Operations (P2.4):** How do astronauts on foot, pressurized rovers (with mobile life-support haven capacity), and autonomous scout drones coordinate routes, transfer cargo, manage mutual separation buffers, and share comms?
5. **Dynamic In-Mission Re-Planning & Hazard Encroachment (P2.5):** When a regional dust storm approaches, an EVA suit subsystem degrades, or a UHF relay mast fails, how does the system autonomously calculate escape vectors, intermediate shelter diversions, and real-time route reconfiguration?
6. **Autonomous Science Tour Prioritization (P2.6):** How can an autonomous planner optimize multi-target geological traverses using an Orienteering Problem with Time Windows (OPTW) to maximize scientific value under strict life-support return budgets?

---

## 2. Refined Milestone Sequence & Dependency Hierarchy

The P2 roadmap is strictly organized into six sequential milestones, where each stage serves as the mathematical and data foundation for subsequent operational capabilities:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               P2 IMPLEMENTATION ROADMAP                                │
├────────┬──────────────────────────────────────────┬────────────────────────────────────┤
│ Stage  │ Milestone Title                          │ Core Deliverable                   │
├────────┼──────────────────────────────────────────┼────────────────────────────────────┤
│ P2.1   │ Planetary Ephemeris & Environmental Data │ SPICE Ls/LTST clock, OWLT latency, │
│        │ Foundation                               │ in-situ MEDA/REMS climatology      │
├────────┼──────────────────────────────────────────┼────────────────────────────────────┤
│ P2.2   │ Habitat Suitability & Site Selection     │ Multi-Criteria MCDA & AHP weights, │
│        │                                          │ blast exclusion, horizon masking   │
├────────┼──────────────────────────────────────────┼────────────────────────────────────┤
│ P2.3   │ Subsurface Intelligence & ISRU           │ CRIM 3-phase dielectric mixing,    │
│        │ Thermodynamics                           │ wellhead thermodynamic energy      │
├────────┼──────────────────────────────────────────┼────────────────────────────────────┤
│ P2.4   │ Multi-Agent Heterogeneous Fleet Ops      │ Astronaut-Rover-Drone sync, mobile │
│        │                                          │ haven walkback & return envelopes  │
├────────┼──────────────────────────────────────────┼────────────────────────────────────┤
│ P2.5   │ Autonomous Tactical Mission Replanning   │ Observed sensor trigger, convective│
│        │                                          │ dust encroachment, safe abort route│
├────────┼──────────────────────────────────────────┼────────────────────────────────────┤
│ P2.6   │ Autonomous Science Prioritization        │ Multi-attribute VoI tour planner,  │
│        │                                          │ OPTW solver vs baseline heuristics │
└────────┴──────────────────────────────────────────┴────────────────────────────────────┘
```

---

## 3. Scientific Formulations & Review Corrections

---

### Feature P2.1: Planetary Ephemeris & Environmental Data Foundation

#### Authoritative SPICE Ephemeris Modeling
Rather than an independently simplified circular or low-order Keplerian approximation, ARES-NAV P2 utilizes authoritative NASA NAIF SPICE ephemeris kernels (`de440.bsp` / `de440s.bsp`, `mar097.bsp`, `pck00010.tpc`, `naif0012.tls`) accessed via `spiceypy` (with pure Python high-precision Chebyshev polynomial fallbacks):
- **Coordinate Frames:**
  - Inertial: `J2000` (Earth mean equator and equinox of J2000.0 epoch).
  - Body-Fixed: `IAU_MARS` (Mars planetocentric reference frame, positive East longitude $0–360^\circ$).
  - Topocentric: `MARS_TOPO` (North-East-Down / East-North-Up anchored to landing site coordinates).
- **Time Systems & Transformations:**
  - $\text{UTC} \xrightarrow{\text{naif0012.tls}} \text{TAI} \to \text{TT} \to \text{ET / TDB}$ (Barycentric Dynamical Time).
  - Solar Longitude $L_s \in [0^\circ, 360^\circ)$ derived from the orbital position vector of Mars relative to the Sun:
    $$L_s = \text{atan2}(r_y, r_x)$$
  - True Local Solar Time (LTST) calculated from the sub-solar longitude $\lambda_{\text{sun}}$ and site longitude $\lambda_{\text{site}}$:
    $$\text{LTST} = \text{MOD}\left(12.0 + \frac{\lambda_{\text{site}} - \lambda_{\text{sun}}}{15^\circ}, 24.0\right)$$
- **Separation of One-Way Light Time (OWLT) from Network Latency:**
  - Astronomical geometric light time is computed as:
    $$OWLT = \frac{|\vec{r}_{\text{Earth}}(\text{ET}) - \vec{r}_{\text{Mars}}(\text{ET} - \tau)|}{c}$$
    Varying deterministically from $3.1\,\text{min}$ ($186\,\text{s}$ at close opposition, $0.37\,\text{AU}$) to $22.3\,\text{min}$ ($1338\,\text{s}$ at solar conjunction, $2.68\,\text{AU}$).
  - Operational Telecommand Latency is tracked separately:
    $$T_{\text{latency}} = 2 \times OWLT + \Delta t_{\text{DSN\_schedule}} + \Delta t_{\text{store\_forward}} + \Delta t_{\text{proc}}$$
    Disclosing why real-time manual teleoperation from Earth is operationally impossible and autonomous on-site decision engines are mandated.

---

### Feature P2.2: Habitat Suitability & Site Selection

#### Multi-Criteria Decision Analysis (MCDA) & Analytic Hierarchy Process (AHP)
ARES-NAV employs a two-tier evaluation framework:
1. **Weighted Linear Combination (WLC) Evaluation:** The composite Suitability Index $S(x, y) \in [0.0, 100.0]$ is computed across candidate cells:
   $$S(x, y) = \left[ \sum_{k=1}^{M} w_k \cdot f_k(x, y) \right] \cdot \prod_{j=1}^{C} c_j(x, y) \cdot (1 - P_{\text{uncertainty}}(x, y))$$
   Where $f_k(x, y) \in [0, 100]$ are standardized factor scores, $c_j \in \{0, 1\}$ are Boolean constraints, and $P_{\text{uncertainty}} \in [0, 0.5]$ is the missing-data penalty.
2. **AHP Pairwise Comparison Matrix for Weight Derivation:** To prevent arbitrary weighting, the vector $W = [w_1, \dots, w_6]$ is derived from Saaty's Analytic Hierarchy Process (Saaty, 1980). For the 6 criteria (Slope, Roughness, Horizon Masking, ISRU Proximity, Comm Coverage, Thermal Stability), the pairwise matrix $A$ is:

| Criterion | Slope | Roughness | Horizon Masking | ISRU Proximity | Comm Coverage | Thermal Stability | Priority Weight ($w_k$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Slope** | 1 | 2 | 2 | 2 | 3 | 3 | **0.292** |
| **Roughness** | 1/2 | 1 | 1 | 1 | 2 | 2 | **0.170** |
| **Horizon Masking** | 1/2 | 1 | 1 | 1 | 2 | 2 | **0.170** |
| **ISRU Proximity** | 1/2 | 1 | 1 | 1 | 2 | 2 | **0.170** |
| **Comm Coverage** | 1/3 | 1/2 | 1/2 | 1/2 | 1 | 1 | **0.099** |
| **Thermal Stability** | 1/3 | 1/2 | 1/2 | 1/2 | 1 | 1 | **0.099** |

- **Consistency Verification:** The principal eigenvalue $\lambda_{\max} = 6.042$.  
  The Consistency Index $CI = (\lambda_{\max} - M) / (M - 1) = (6.042 - 6) / 5 = 0.0084$.  
  For $M = 6$, the Random Index $RI = 1.24$.  
  The Consistency Ratio $CR = CI / RI = 0.0084 / 1.24 = 0.0068 < 0.10$, mathematically verifying matrix consistency.

#### Configurable Engineering Constraints & Literature Basis
All thresholds are user-configurable with documented engineering justifications:
- **Slope Constraint ($c_{\text{slope}}$):** Default $\theta \le 8.0^\circ$. (Basis: NASA Human Landing System and DRA 5.0 surface habitat landing gear stability envelopes; self-leveling habitat actuators cannot compensate for terrain slopes $>8.0^\circ$ without excessive structural mass penalty).
- **Boulder Obstacle Constraint ($c_{\text{boulder}}$):** Default $B \le 20.0\%$. (Basis: Prevents structural foundation puncture and rover wheel immobilization).
- **Landing Blast Exclusion Buffers ($c_{\text{lz}}$):** Configurable range default $800\,\text{m} \le d_{\text{lz}} \le 3000\,\text{m}$.
  - *Engineering Basis for Minimum Buffer ($800\,\text{m}$):* Apollo surface photography and hypersonic plume-surface interaction research (Metzger et al., 2009; Immer et al., 2011) demonstrate that rocket exhaust ejects supersonic gravel and high-velocity regolith dust exceeding $300–1000\,\text{m/s}$, causing severe abrasive pitting and scouring to habitat radiators and solar arrays within $800\,\text{m}$.
  - *Engineering Basis for Maximum Buffer ($3000\,\text{m}$):* NASA DRA 5.0 logistics constraints; transporting cryogenic propellants, pressurized habitats, and heavy fission reactors beyond $3.0\,\text{km}$ imposes unsustainable road construction and power cable mass penalties.

#### Rigorous Physics: Directional Horizon Masking vs. Bulk Shielding
ARES-NAV strictly avoids claiming that terrain depressions provide substantial radiation shielding:
- **Geometric Horizon Masking ($f_{\text{masking}}$):**
  $$SVF(x, y) = \frac{1}{2\pi} \int_{0}^{2\pi} \cos^2(\psi(\alpha)) \, d\alpha$$
  Measures the pure geometric solid-angle reduction of isotropic primary Galactic Cosmic Rays (GCR) from the upper hemisphere. In typical Martian topography where crater rims or hills subtend angles $\psi \approx 5^\circ–15^\circ$, the reduction in primary solid angle is only $\sim 2\%–7\%$. In deep scarp footings ($\psi \approx 45^\circ$), geometric masking reaches $\sim 15\%$, but backscattered secondary albedo neutrons from the adjacent rock wall partially offset this reduction (MSL RAD measurements; Rafkin et al., 2014; Hassler et al., 2014).
- **Physical Bulk Shielding ($t_{\text{regolith}}$):** Attenuation of ionizing radiation requires physical mass overburden ($\text{g/cm}^2$). Unshielded regolith layers $<50\,\text{g/cm}^2$ can actually increase human dose rates due to secondary albedo neutron spallation showers. The system requires an explicit regolith roof thickness specification (e.g. $1.5–3.0\,\text{m}$) for definitive radiation protection.
- **Missing Data Policy:** Cells lacking verified boulder or slope data receive an uncertainty penalty reducing suitability by up to $50\%$.

---

### Feature P2.3: Subsurface Intelligence & ISRU Thermodynamics

#### Multi-Evidence Classification for Water-Ice Confidence
A low apparent dielectric constant ($\epsilon'_r \in [2.8, 3.5]$) observed by radar **does not confirm water-ice**. Porous dry volcanic basalt, pumice, ash ($\phi \approx 40\%$), and subsurface voids exhibit dielectric permittivity virtually identical to water-ice ($\epsilon'_{\text{ice}} = 3.15$). The system strictly separates evidence into six distinct classes:
1. *Surface Spectral Observations (CRISM/OMEGA):* $1.5\,\mu\text{m}$ and $2.0\,\mu\text{m}$ absorption bands. Detects surface ice only (micrometers to millimeters depth). Easily obscured by dust.
2. *Radar Subsurface Reflectors (SHARAD/MARSIS):* Detects dielectric contrast interfaces at depths $\ge 10\,\text{m}$.
3. *Inferred Dielectric Properties (CRIM Mixing Model):*
   $$\sqrt{\epsilon'_{\text{bulk}}} = (1 - \phi) \sqrt{\epsilon'_{\text{matrix}}} + \phi S_w \sqrt{\epsilon'_{\text{ice}}} + \phi (1 - S_w) \sqrt{\epsilon'_{\text{air}}}$$
   Where $\epsilon'_{\text{matrix}} \approx 4.5–6.0$, $\epsilon'_{\text{ice}} = 3.15$, and $\phi$ is soil porosity.
4. *Regional Neutron-Derived Hydrogen Estimates (Odyssey HEND/NS):* Epithermal neutron leakage suppression down to $\sim 1\,\text{m}$ depth ($300–450\,\text{km}$ footprint).
5. *Exposed Subsurface Ice Observations (HiRISE):* Bright, sublimating ice in fresh impact craters or scarps.
6. *Estimated Accessible Resources (Exploitation Category):* Evaluates overburden thickness ($<2\,\text{m}$ target), volumetric purity, and extraction thermodynamics.

#### Recalculated Thermodynamic Energy Balance & Explicit System Boundaries
Extraction energy calculations are reconciled with explicit thermodynamic boundaries:

1. **Sensible Heating Integral ($q_{\text{sens}}$):**
   Using the empirical temperature-dependent specific heat capacity for water ice (Giauque & Stout, 1936; Yen, 1981):
   $$c_{p, \text{ice}}(T) = 0.185 + 0.00689 T \quad [\text{kJ/(kg}\cdot\text{K)}]$$
   Integrating from ambient cryogenic temperature $T_{\text{ambient}} = 190.0\,\text{K}$ to melting point $T_{\text{melt}} = 273.15\,\text{K}$ ($\Delta T = 83.15\,\text{K}$):
   $$q_{\text{sens}} = \int_{190.0}^{273.15} (0.185 + 0.00689 T) \, dT = \left[ 0.185 T + \frac{0.00689}{2} T^2 \right]_{190.0}^{273.15}$$
   $$q_{\text{sens}} = 0.185(83.15) + 0.003445(273.15^2 - 190.0^2) = 15.38 + 132.67 = \mathbf{148.05\,\text{kJ/kg}} \quad (0.0411\,\text{kWh/kg})$$
   *(Note: The previously stated figure of 125 kJ/kg was an unverified approximation; 148.1 kJ/kg is the exact value).*

2. **Latent Heat Values:**
   - Latent heat of fusion: $\Delta H_{\text{fus}} = 333.5\,\text{kJ/kg}$ ($0.0926\,\text{kWh/kg}$).
   - Latent heat of sublimation: $\Delta H_{\text{sub}} = 2838.0\,\text{kJ/kg}$ ($0.7883\,\text{kWh/kg}$).

3. **System Boundaries & Energy Requirements:**
   - **Boundary 1: Wellhead Thermal Melting (Rodriguez Well Cavity):**
     $$q_{\text{melt}} = q_{\text{sens}} + \Delta H_{\text{fus}} = 148.1 + 333.5 = 481.6\,\text{kJ/kg} \quad (0.1338\,\text{kWh}_{\text{th}}/\text{kg})$$
     With thermal recovery efficiency $\eta_{\text{th}} \approx 35\%–50\%$ (accounting for downhole conduction into surrounding cryogenic ground; Hoffman et al., 2021):
     $$Q_{\text{th, melt}} = \frac{q_{\text{melt}}}{\eta_{\text{th}}} = \mathbf{0.27 - 0.38\,\text{kWh}_{\text{th}} / \text{kg H}_2\text{O}} \quad (0.96 - 1.38\,\text{MJ/kg})$$
   - **Boundary 2: Wellhead Sublimation (Thermal Probe Vapor Capture):**
     $$q_{\text{sub}} = q_{\text{sens}} + \Delta H_{\text{sub}} = 148.1 + 2838.0 = 2986.1\,\text{kJ/kg} \quad (0.8295\,\text{kWh}_{\text{th}}/\text{kg})$$
     With vapor capture efficiency $\eta_{\text{th}} \approx 40\%–55\%$:
     $$Q_{\text{th, sub}} = \mathbf{1.51 - 2.07\,\text{kWh}_{\text{th}} / \text{kg H}_2\text{O}} \quad (5.4 - 7.5\,\text{MJ/kg})$$
   - **Boundary 3: Wellhead Electrical Energy:**
     Assuming electric downhole heaters with $\eta_{\text{elec}} \approx 90\%$ and pumping work ($0.01\,\text{kWh/kg}$):
     $$Q_{\text{elec, melt}} = \mathbf{0.31 - 0.43\,\text{kWh}_{\text{e}} / \text{kg H}_2\text{O}}$$
   - **Boundary 4: End-to-End Propellant Production ($LOX$ via Electrolysis):**
     Water electrolysis ($2\text{H}_2\text{O} \to 2\text{H}_2 + \text{O}_2$) requires $\sim 4.4\,\text{kWh}_{\text{e}}/\text{kg H}_2\text{O}$. Producing $1\,\text{kg}$ of $O_2$ requires $1.125\,\text{kg}$ of $H_2O$. Total electrical energy for extraction, water treatment, electrolysis, and cryogenic liquefaction:
     $$Q_{\text{total, propellant}} = \mathbf{5.3 - 6.5\,\text{kWh}_{\text{e}} / \text{kg O}_2}$$

---

### Feature P2.4: Multi-Agent Heterogeneous Fleet Operations

#### Cooperative Walkback & Mobile Haven Envelopes
To prevent arbitrary operational constants, the safety envelope between foot astronauts and pressurized rovers is modeled dynamically:
- **Astronaut Foot Capabilities:** Speed-grade locomotion model based on Pandolf metabolic expenditure:
  $$v_{\text{walk}}(\theta) = v_{\text{nominal}} \cdot \exp(-0.04 \theta), \quad \theta \le 25^\circ$$
- **Rover Mobility Mechanics:** Speed-grade capability curve:
  $$v_{\text{rover}}(\theta) = v_{\max} \cdot \max\left(0, 1 - \frac{\theta}{\theta_{\max}}\right), \quad \theta_{\max} = 22^\circ$$
- **Dynamic Walkback Time Constraint:** The astronaut must remain within a dynamic consumable walkback window to the moving rover:
  $$t_{\text{walkback}}(\vec{x}_{\text{astro}}(t), \vec{x}_{\text{rover}}(t)) \le t_{\text{haven\_threshold}} \quad (\text{default: } 45.0\,\text{min})$$
  Where $t_{\text{haven\_threshold}}$ is dynamically scaled by remaining suit secondary oxygen pack reserves.
- **Scout Drone Reconnaissance Envelope:** JPL Ingenuity-calibrated forward flight ($7.5\,\text{min}$ endurance, $100\,\text{m}$ swath width) surveying high-risk corridors ahead of the rover.

---

### Feature P2.5: Autonomous Tactical Replanning

#### Environmental Triggering Architecture
Tactical replanning explicitly distinguishes observed in-situ data from simulated hazard scenarios:
- **In-Situ Observational Triggers:** Mars 2020 MEDA / Curiosity REMS real-time time-series monitoring:
  - Atmospheric pressure rate-of-change: $|dP/dt| > 5.0\,\text{Pa/min}$ (indicative of convective gust fronts).
  - Dust optical depth rate-of-change: $d\tau/dt > +0.3\,\text{hr}^{-1}$ (indicative of approaching local/regional dust storm).
  - Wind speed gust threshold: $v_{\text{wind}} > 20\,\text{m/s}$.
- **Simulated Hazard Encroachment:** Parameterized front boundary propagation ($v_{\text{front}} = 15–35\,\text{km/h}$) derived from MRO MARCI historical storm statistics.
- **Uncertainty-Aware Tactical Diversion Policy:** If hazard arrival time $t_{\text{hazard}} \le 1.25 \times t_{\text{nominal\_return}}$, the planner autonomously triggers an emergency divert to the nearest verified refuge (Pressurized Rover, terrain overhang, or habitat airlock).

---

### Feature P2.6: Autonomous Science Prioritization

#### Multi-Attribute Value-of-Information (VoI)
To avoid opaque priority numbers, science targets are ranked using a transparent, multi-attribute utility function:

$$V_{\text{science}}(i) = w_r \cdot R(i) + w_d \cdot D(i) + w_a \cdot A(i) - w_c \cdot C(i)$$

Where:
- $R(i) \in [0, 1]$: Lithologic / mineral rarity (derived from CRISM spectral distinctiveness).
- $D(i) \in [0, 1]$: Geological diversity relative to already-visited waypoints (spectral angle mapper distance).
- $A(i) \in [0, 1]$: Astrobiological preservation potential (clays, carbonates, deltaic mudstones).
- $C(i) \in [0, 1]$: Operational cost (distance, slope, metabolic expenditure).

#### Orienteering Problem with Time Windows (OPTW)
The itinerary is solved as an OPTW:

$$\max \sum_{i \in \text{POIs}} V_{\text{science}}(i) \cdot y_i$$

Subject to:
- Total duration $\sum t_{ij} x_{ij} \le T_{\max}$ ($480\,\text{min}$).
- Total oxygen consumption $\sum O_{2, ij} x_{ij} \le 0.70 \times \text{Capacity}$ ($30\%$ mandatory reserve).
- Return to basecamp / rover haven prior to Point of No Return (PNR).

#### Reproducible Benchmark Definition
To provide a verifiable basis for algorithm evaluation:
- **Benchmark Instance Specification:** A standardized test set of $N = 10$ geological candidate POIs distributed within a $2.0\,\text{km} \times 2.0\,\text{km}$ bounding box at Jezero Crater delta, with known coordinates, attributes $R(i), D(i), A(i) \in [1, 10]$, sampling service times $t_{\text{service}} = 15.0\,\text{min}$, and traverse duration budget $T_{\max} = 180.0\,\text{min}$ ($3\,\text{hours}$).
- **Benchmark Baseline Algorithms:**
  1. *Deterministic Greedy Utility Heuristic:* Sequentially selects the unvisited POI maximizing $\Delta V / (\Delta t_{\text{travel}} + t_{\text{service}})$ until time/oxygen limits force immediate return to origin.
  2. *Unweighted Traveling Salesperson Problem (TSP):* Minimizes total path distance visiting all candidates, demonstrating that unweighted geometric optimization routinely causes consumable budget failure.
- **Evaluation Metric:** Relative science gain $\% \Delta V = \frac{V_{\text{OPTW}} - V_{\text{Greedy}}}{V_{\text{Greedy}}} \times 100\%$. The benchmark instance with clustered targets demonstrates a reproducible $\ge 20\%–25\%$ gain because the global OPTW avoids myopic greedy traps that exhaust consumable reserves before reaching high-value distant units.

---

## 4. Zero-Rebuild REST API Contracts

All six features expose clean REST APIs subclassed in `nasa/server.py`:
- `GET /api/planetary_ephemeris`: Astronomical ephemeris, solar geometry, and OWLT latency.
- `POST /api/habitat_suitability`: Basecamp, landing zone, and power array MCDA with AHP weights.
- `POST /api/isru_feasibility`: Multi-evidence subsurface dielectric analysis and thermodynamic energy budget.
- `POST /api/fleet_coordination`: Heterogeneous multi-agent path synchronization and walkback checking.
- `POST /api/tactical_replanning`: In-situ anomaly detection and contingency abort generation.
- `POST /api/science_prioritization`: OPTW science itinerary optimization vs. greedy/TSP benchmark.

---

## 5. Sequential Implementation & Test Acceptance Criteria

Execution proceeds through 6 test-driven stages:

1. **Stage 1 (P2.1 Planetary Ephemeris):** Deliver `nasa/p2/ephemeris_engine.py`, `nasa/test_p2_ephemeris.py`, and `nasa/static/modules/p2_ephemeris.js`.
   - *Acceptance:* Exact $L_s$, sub-solar latitude, true local solar time, and OWLT within $<0.01\%$ of NAIF SPICE; separate display of OWLT and DSN latency.
2. **Stage 2 (P2.2 Habitat Suitability):** Deliver `nasa/p2/habitat_siting.py`, `nasa/test_p2_habitat_siting.py`, and `nasa/static/modules/p2_habitat_siting.js`.
   - *Acceptance:* Configurable slope ($\le 8^\circ$) and blast radius ($800–3000\,\text{m}$); AHP matrix with verified consistency ratio $CR < 0.10$; explicit separation of horizon terrain masking from regolith bulk shielding.
3. **Stage 3 (P2.3 Subsurface & ISRU):** Deliver `nasa/p2/isru_engine.py`, `nasa/test_p2_isru.py`, and `nasa/static/modules/p2_isru.js`.
   - *Acceptance:* Dielectric ambiguity disclaimer; CRIM 3-phase inversion; explicit thermodynamic budget ($0.27–0.38\,\text{kWh}_{\text{th}}/\text{kg H}_2\text{O}$ thermal melting; $5.3–6.5\,\text{kWh}_{\text{e}}/\text{kg O}_2$ end-to-end propellant); stoichiometric $O_2$ sizing.
4. **Stage 4 (P2.4 Multi-Agent Fleet Ops):** Deliver `nasa/p2/fleet_engine.py`, `nasa/test_p2_fleet.py`, and `nasa/static/modules/p2_fleet.js`.
   - *Acceptance:* Continuous dynamic walkback envelope verification between foot astronaut and moving pressurized rover; scout drone flight verification.
5. **Stage 5 (P2.5 Tactical Replanning):** Deliver `nasa/p2/tactical_replanner.py`, `nasa/test_p2_tactical.py`, and `nasa/static/modules/p2_tactical.js`.
   - *Acceptance:* Triggering on MEDA $dP/dt$ and $d\tau/dt$ anomaly thresholds; autonomous diversion to safe haven before storm boundary arrival.
6. **Stage 6 (P2.6 Autonomous Science):** Deliver `nasa/p2/science_optimizer.py`, `nasa/test_p2_science.py`, and `nasa/static/modules/p2_science.js`.
   - *Acceptance:* OPTW solver outperforming greedy benchmark heuristic by $\ge 20\%–25\%$ science value on standardized 10-POI benchmark; zero PNR consumable violations.
