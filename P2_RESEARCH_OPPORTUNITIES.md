# ARES-NAV — P2 Planetary Science & Autonomous Operations Research Opportunities

**Document Version:** 2.0  
**Phase:** P2 — Advanced Planetary Intelligence & Autonomous Operations  
**Date:** November 15, 2026  
**Status:** Approved Research Framework Reference  

---

## 1. Context & Academic Rigor

In developing Phase P2 of ARES-NAV, our objective is to ensure that all computational contributions are grounded in established planetary science, aerospace operational literature, and NASA human exploration standards. We avoid unfounded claims of novelty by performing explicit comparisons against published baselines in mission architecture (NASA Design Reference Architecture 5.0, NASA-STD-3001), robotics path planning, and terrestrial glaciology.

This document formulates the **three strongest research opportunities** where ARES-NAV provides a defensible, peer-reviewable contribution to planetary exploration systems engineering.

---

## 2. Research Opportunity 1: Heterogeneous Multi-Agent Traverse Optimization with Dynamic Mobile Haven Safety Envelopes

### 2.1 Research Problem
In human planetary exploration, astronaut Extravehicular Activities (EVAs) are strictly constrained by the **Walkback Limit**: an astronaut exploring on foot or with a light unpressurized rover must always maintain sufficient consumable reserves ($O_2$, cooling water, suit battery, metabolic energy) to walk back to a primary habitat or safe haven if their primary mobility device fails (NASA-STD-3001 Vol 2 §6.5; Apollo Lunar Surface Operations Rule 14-4). 

When a Pressurized Rover (PR)—functioning as a mobile life-support refuge—and an autonomous Scout Drone operate in tandem with foot astronauts, traditional static circular safety buffers become invalid. Terrain slopes, soil mechanics, and energy dissipation drastically alter both foot traverse speed and rover escort capability. No existing planetary exploration system dynamically computes anisotropic, time-varying mobile haven safety envelopes that adapt to real-time agent positions, asymmetric terrain costs, and scout drone forward-reconnaissance.

### 2.2 Formal Research Question
> *How can multi-agent path synchronization dynamically optimize foot astronaut exploration range while guaranteeing that the astronaut remains continuously within a terrain-aware, consumable-bounded walkback envelope to a moving pressurized rover haven?*

### 2.3 Input Datasets & Parameters
- **Topography:** MOLA DEM ($463\,\text{m}$) and HiRISE sub-meter DTM ($1.0\,\text{m}$) providing elevation $z(x, y)$ and Horn slope $\theta(x, y)$.
- **Surface Roughness:** HiRISE boulder fraction $B(x, y)$ and thermal inertia $I(x, y)$.
- **Human Physiological Bounds:** Pandolf metabolic load model adjusted for Martian gravity ($0.38g$):
  $$M = 1.5 W + 2.0(W + L)\left(\frac{L}{W}\right)^2 + \eta(W + L)\left[0.184 v + 0.0545 v^2 + 0.007 v \cdot \text{slope}\right]$$
  Constrained by maximum sustained metabolic rate ($\le 450\,\text{W}$) and oxygen consumption rate ($\approx 1.2–2.5\,\text{L/min}$).
- **Pressurized Rover Dynamics:** Speed-grade capability curve:
  $$v_{\text{rover}}(\theta) = v_{\max} \cdot \max\left(0, 1 - \frac{\theta}{\theta_{\max}}\right), \quad \theta_{\max} = 22.0^\circ, \quad v_{\max} = 10.0\,\text{km/h}$$
- **Scout Drone Envelope:** JPL Ingenuity-derived forward-flight endurance ($7.5\,\text{min}$) and optical reconnaissance swath ($100\,\text{m}$ width).

### 2.4 Proposed Methodology
1. **Time-Expanded Dual-Graph Formulation:** Construct two coupled spatial networks: $G_{\text{foot}}$ (accessible by astronaut on foot, $\theta \le 25^\circ$) and $G_{\text{rover}}$ (accessible by rover, $\theta \le 18^\circ$, boulder fraction $\le 20\%$).
2. **Dynamic Reachability Isochrone Projection:** At time step $t_k$, project the backward isochrone $R_{\text{foot}}(t_k, \vec{x}_{\text{rover}}(t_k))$ representing the maximum terrain distance an astronaut can cover toward the rover's position using their remaining suit contingency oxygen reserve:
   $$R_{\text{walkback}}(t_k) = \left\{ \vec{x} \in \mathbb{R}^2 \;\Big|\; \Delta t_{\text{foot}}(\vec{x} \to \vec{x}_{\text{rover}}(t_k)) \le \frac{C_{\text{reserve, } O_2}}{\dot{V}_{O_2}(\text{Pandolf})} \right\}$$
3. **Cooperative Rendezvous Optimization:** Solve a bilevel mathematical program where the leader (Pressurized Rover) selects waypoint positions along ridgelines to maximize the area of $R_{\text{walkback}}(t)$ overlapping high-value scientific sampling sites, while the follower (Astronaut) traverses interior scientific waypoints.
4. **Scout Drone Uncertainty Reduction:** The drone sorties ahead along the candidate rover path to verify zero boulder entrapment, reducing rover velocity uncertainty from $\pm 30\%$ to $\pm 5\%$.

### 2.5 Baselines & Evaluation Metrics
- **Baselines for Comparison:**
  1. *Apollo 15–17 Static Radius Rule:* Fixed radial distance ($d \le 5.0\,\text{km}$) from fixed basecamp.
  2. *Static Co-located Escort:* Rover forced to strictly mirror astronaut movement within $50\,\text{m}$ radius (severely restricting rover scouting and base logistics).
- **Evaluation Metrics:**
  - *Exploration Surface Area ($km^2$)* accessible within a single 6-hour EVA.
  - *Integrated Science ROI:* Cumulative scientific value of geological waypoints sampled.
  - *Safety Violation Rate ($0.0\%$ target):* Percentage of mission timeline where astronaut position falls outside the instantaneous walkback threshold.

### 2.6 Expected Limitations
- Assumes constant rover mechanical reliability; catastrophic rover immobilization requires fallback to direct habitat abort.
- Terrain micro-roughness below HiRISE resolution ($<0.25\,\text{m}$) can introduce unmodeled foot locomotion delays.

### 2.7 Genuine Contribution
Provides the first open, terrain-calibrated mathematical formulation for dynamic mobile haven walkback envelopes on Mars, transitioning planetary mission planning from static safety circles to anisotropic, multi-agent cooperative reachability fields.

---

## 3. Research Opportunity 2: Coupled Subsurface Dielectric and Thermodynamic Modeling for Operational Mars ISRU Wellhead Siting

### 3.1 Research Problem
In-Situ Resource Utilization (ISRU) of Martian subsurface water-ice is foundational to NASA's Moon-to-Mars Architecture for propellant production ($CH_4 / O_2$) and life support. Prior literature often treats ice discovery and extraction independently: radar geophysicists produce regional dielectric permittivity maps from orbital radar (SHARAD/MARSIS), while mechanical engineers model thermal extraction wells (Rodriguez wells / Sublimation probes) assuming an idealized infinite block of pure ice at constant depth.

In reality, accessible Martian water-ice is covered by a dry, insulating regolith lag deposit of variable depth, possesses unknown volumetric purity, and exists at cryogenic temperatures ($160–210\,\text{K}$). Siting an operational extraction well requires coupling the dielectric inversion of radar and spectroscopy data with the physical thermodynamics of thermal drill melting and downhole energy loss.

### 3.2 Formal Research Question
> *How can orbital radar dielectric inversions, neutron-spectroscopy hydration proxies, and high-resolution thermophysical models be coupled to quantify the net electrical energy cost (kWh/kg $O_2$) and operational feasibility of localized Martian water-ice extraction?*

### 3.3 Input Datasets & Parameters
- **Radar Sounding:** MRO SHARAD calibrated radargrams and SWIM (Subsurface Water Ice Mapping) consistency indices, extracting two-way travel time ($\Delta \tau$) and bulk apparent dielectric constant ($\epsilon'_r$).
- **Neutron Hydration:** 2001 Mars Odyssey GRS/HEND Water-Equivalent Hydrogen (WEH wt%).
- **Mineral Spectroscopy:** CRISM targeted cubes verifying smectite, polyhydrated sulfate, or direct water-ice absorption bands ($1.5\,\mu\text{m}, 2.0\,\mu\text{m}$).
- **Regolith Thermal Properties:** THEMIS-derived thermal inertia ($I = \sqrt{k \rho c}$ in TIU), defining overburden density $\rho_{\text{regolith}} \approx 1600\,\text{kg/m}^3$ and thermal conductivity $k \approx 0.03–0.08\,\text{W/(m}\cdot\text{K)}$.

### 3.4 Proposed Methodology
1. **Three-Phase CRIM Dielectric Deconvolution:** Invert apparent radar permittivity $\epsilon'_{\text{bulk}}$ using the Complex Refractive Index Model (CRIM) to estimate ice volumetric fraction $\phi_{\text{ice}}$ in the presence of regolith matrix and void space:
   $$\sqrt{\epsilon'_{\text{bulk}}} = (1 - \phi) \sqrt{\epsilon'_{\text{matrix}}} + \phi S_w \sqrt{\epsilon'_{\text{ice}}} + \phi (1 - S_w) \sqrt{\epsilon'_{\text{air}}}$$
   Where $\epsilon'_{\text{matrix}} \approx 4.5–6.0$ (basaltic matrix), $\epsilon'_{\text{ice}} = 3.15$, and $\phi$ is soil porosity.
2. **Ambiguity Regularization via Epithermal Neutron Flux:** Penalize low-dielectric solutions where GRS epithermal neutron counts indicate dry porous pumice or ash rather than hydrogen enrichment.
3. **Rigorous Thermodynamic Wellhead Budget:** For candidate deposits, compute the total specific thermal energy $q_{\text{extract}}$ ($\text{kJ/kg}$) required to extract liquid water or vapor via downhole thermal melting:
   $$q_{\text{extract}} = \underbrace{\int_{T_{\text{ambient}}}^{T_{\text{melt}}} c_{p, \text{ice}}(T) \, dT}_{\text{Sensible Heating}} + \underbrace{\Delta H_{\text{fus}}}_{\text{Latent Heat (334 kJ/kg)}} + \underbrace{\frac{2\pi k_{\text{regolith}} (T_{\text{well}} - T_{\infty})}{\ln(r_{\text{far}} / r_{\text{well}})} \Delta t}_{\text{Downhole Conduction Parasitic Loss}}$$
4. **End-to-End Propellant Sizing:** Map extracted $H_2O$ through stoichiometric Sabatier methanation and water electrolysis ($2\text{H}_2\text{O} \to 2\text{H}_2 + \text{O}_2$), calculating total Megawatt-hours (MWh) and fission/solar array mass required to produce the $30\,\text{t}$ of $LOX$ needed for a Mars Ascent Vehicle (MAV).

### 3.5 Baselines & Evaluation Metrics
- **Baselines for Comparison:**
  1. *Uncoupled Dielectric Thresholding:* Assuming all cells with $\epsilon' \le 3.5$ contain pure water ice without depth or thermodynamic modeling.
  2. *Constant Latent Heat Model:* Neglecting cryogenic sensible heating ($c_p(T)$ from $180\,\text{K}$) and regolith conduction losses (underestimating required power by $40–60\%$).
- **Evaluation Metrics:**
  - *Energy Extraction Error (%):* Variance between coupled thermodynamic model vs. full finite-element thermal simulation.
  - *False Positive Siting Rate (%):* Rejection of candidate sites that appear ice-rich on radar but fail energetic extraction feasibility due to excessive overburden depth ($>3\,\text{m}$).

### 3.6 Expected Limitations
- Orbital radar vertical resolution ($15\,\text{m}$ in free space) cannot resolve thin regolith lag layers ($<1.0\,\text{m}$) without thermal inertia extrapolation.
- Subsurface salts (perchlorates) can depress the melting point and alter dielectric loss tangents, creating unmodeled brine conductivity.

### 3.7 Genuine Contribution
Provides a transparent, end-to-end computational pipeline linking orbital radar observations to practical thermodynamic power requirements, preventing the overestimation of ISRU accessibility in human Mars landing site selection.

---

## 4. Research Opportunity 3: Uncertainty-Aware Autonomous Tactical Mission Re-Planning Under Dynamic Martian Environmental Hazard Encroachment

### 4.1 Research Problem
During Martian surface operations, astronauts and autonomous vehicles face rapid environmental degradation: local convective dust storms can reduce optical visibility to $<50\,\text{m}$ and drop solar insolation by $80\%$ in under an hour; Solar Particle Events (SPEs) rapidly elevate ionizing radiation dose rates; and hardware anomalies (suit primary $O_2$ regulator drop) can cut available mission time by half.

Terrestrial GPS and instant ground-control intervention are unavailable due to the $3.1–22.3\,\text{min}$ One-Way Light Time (OWLT) latency. Current planetary path planners plan statically prior to the EVA or reactively stop when an obstacle is encountered. They lack an autonomous, risk-sensitive policy that continually evaluates in-situ meteorological trend data (MEDA pressure and optical depth rate-of-change) to trigger proactive diversions to intermediate terrain shelters before nominal return paths become impassable.

### 4.2 Formal Research Question
> *How can in-situ atmospheric rate-of-change observations be integrated into a real-time stochastic Markov Decision Process (MDP) to balance mission science completion against the probability of safe abort to secondary shelters under dynamic hazard encroachment?*

### 4.3 Input Datasets & Parameters
- **In-Situ Atmospheric Telemetry:** Mars 2020 MEDA time-series providing pressure derivative $dP/dt$ ($\text{Pa/min}$), dust optical depth rate $d\tau/dt$, and wind vector magnitude $v_{\text{wind}}$ ($\text{m/s}$).
- **Historical Climatological Encroachment:** MRO MARCI daily weather tracking establishing convective dust front boundary velocity distributions ($v_{\text{front}} \sim \mathcal{N}(20\,\text{km/h}, 5\,\text{km/h})$).
- **Shelter Topology:** Pre-identified terrain alcoves, crater rim overhangs ($SVF \le 0.70$), pressurized rovers, and habitat airlocks.
- **Astronaut State Vector:** Remaining consumable vector $\vec{C}(t) = [O_{2, \text{rem}}, E_{\text{bat, rem}}, \dot{D}_{\text{rad}}]$.

### 4.4 Proposed Methodology
1. **Dynamic Hazard Encroachment Front Modeling:** Model approaching dust storm or ionizing radiation fronts as moving probabilistic risk manifolds:
   $$P_{\text{hazard}}(\vec{x}, t) = \frac{1}{1 + \exp\left(-\frac{\vec{n}_{\text{front}} \cdot (\vec{x} - \vec{x}_{\text{front}}(t))}{\sigma_{\text{front}}}\right)}$$
   Where front advance velocity $\vec{v}_{\text{front}}$ is continually updated by local MEDA barometric trend vectors ($-\nabla P$).
2. **Constrained Markov Decision Process (CMDP):** Formulate the traverse as a state-space optimization where the policy $\pi$ maximizes collected science reward $R_{\text{science}}$ subject to the hard constraint that survival probability $P_{\text{survival}} \ge 1 - \delta$ ($\delta = 10^{-5}$):
   $$\max_{\pi} \mathbb{E}\left[ \sum_{t=0}^{T} \gamma^t R_{\text{science}}(s_t, a_t) \right] \quad \text{s.t.} \quad \mathbb{P}\left(\exists t \le T : \vec{x}_t \in \text{Shelter} \;\Big|\; \text{Hazard Arrival}\right) \ge 1 - \delta$$
3. **Multi-Option Contingency Branching:** Instead of a single deterministic abort path, the planner continuously maintains two parallel solutions:
   - *Primary Scientific Path:* Iterates toward active research objectives.
   - *Shadow Contingency Abort Tree:* An immediately executable escape trajectory from the *current* coordinate to the nearest feasible shelter, dynamically pruned as consumable reserves diminish.
4. **Autonomous Triggering Mechanism:** If $d\tau/dt > \tau_{\text{threshold}}$ or remaining time-to-shelter $t_{\text{shelter}} \ge 0.8 \times t_{\text{front\_arrival}}$, the system autonomously issues an executive `TACTICAL_ABORT_OVERRIDE`, redirecting the astronaut or rover along the pre-computed shadow branch.

### 4.5 Baselines & Evaluation Metrics
- **Baselines for Comparison:**
  1. *Static Pre-Planned Execution:* Proceeding on initial route until nominal mission end or emergency manual halt.
  2. *Naive Direct Abort:* Rerouting only to the origin basecamp without considering intermediate terrain shelters or pressurized rover intercept.
- **Evaluation Metrics:**
  - *Mission Survival Margin ($min$):* Time elapsed between safe shelter ingress and hazard boundary arrival.
  - *Preserved Science Yield (%):* Percentage of planned scientific samples successfully retained during tactical diversion.
  - *Computational Re-Planning Latency ($ms$):* Time to generate verified contingency route ($<100\,\text{ms}$ required for embedded rover computing).

### 4.6 Expected Limitations
- Meteorological trend extrapolation ($dP/dt$) is susceptible to high-frequency turbulence noise, requiring Kalman filter smoothing.
- Satellite orbital imagery updates occur at best every 12 hours; front tracking relies primarily on local in-situ sensors.

### 4.7 Genuine Contribution
Delivers an autonomous, uncertainty-aware tactical abort decision engine that replaces delayed Earth-based intervention with verifiable, real-time safety guarantees calibrated to in-situ Martian microclimate dynamics.
