# ARES-NAV — Development Roadmap

## P0 — Foundation, Accessibility & Data Integration (Current)

### P0.1 – Beginner-Friendly Interface Redesign
- [x] Beginner Mode and Expert Mode toggle
- [x] Mission setup wizard (startup screen)
- [x] Reorganized layout: top nav, left sidebar, center map, right sidebar, bottom telemetry
- [x] Expandable sections with contextual tooltips
- [x] Readable labels replacing NASA instrument abbreviations in Beginner Mode
- [x] Responsive design across screen sizes
- [x] Emergency warnings remain prominent
- [x] Expert Mode preserves all existing advanced controls

### P0.2 – Interactive User Guide & Mars Knowledge Centre
- [x] First-time onboarding tutorial (9 steps)
- [x] Interactive step-by-step tutorial with highlight overlay
- [x] Skip tutorial option with localStorage persistence
- [x] Restart tutorial button
- [x] Mars science knowledge centre (glossary)
- [x] Terms: MOLA, HiRISE, CRISM, SHARAD, MSL RAD, EVA, ISRU, SPE, Radiation Shielding, DEM, Terrain Slope, Line of Sight, Martian Sol
- [x] Each term: what it means, why it matters, which ARES-NAV feature uses it

### P0.3 – Mars Data Explorer
- [x] Centralized NASA dataset catalogue (Terrain, Geology, Resources, Environment, Communication)
- [x] Dataset cards with provenance and coverage info
- [x] User data upload panel (CSV, JSON, GeoJSON, image)
- [x] Upload → Validate → Preview → Assign location → Process → Add to map pipeline
- [x] Format and size validation
- [x] Required field checking
- [x] Coordinate validity checking
- [x] Useful error messages
- [x] Data preview before import
- [x] Uploaded observations as additional map layers
- [x] Layer enable/disable, filter by type/source
- [x] Select observation to view details
- [x] Remove uploaded datasets

### P0.4 – Data Provenance, Validation & Uncertainty
- [x] Four validation statuses: Verified, Unverified, Simulated, Outdated
- [x] Dataset metadata: name, source, instrument, observation date, upload date, coordinates, resolution, units, processing method, type
- [x] Coverage indicators on map layers
- [x] Clear distinction: NASA observations vs. calculations vs. simulations vs. user uploads
- [x] No fabricated NASA data or endpoints

### P0.5 – Integration with Existing Functionality
- [x] Uploaded observations appear on existing Mars map
- [x] Uploaded hazards optionally includable in route planner
- [x] New scientific observations accessible in target dossier
- [x] Existing A* route planning preserved
- [x] Existing emergency shelter routing preserved
- [x] Existing SPE simulation preserved
- [x] Existing telemetry and mission export preserved

---

## P1 — Intelligent Exploration & Survival (Future)

> **Status: Not started. Document only.**

### Dependencies
- P0 must be fully complete
- Uploaded dataset pipeline must be stable
- Route planning API must be stable

### Features
1. **Explainable Route Optimization** — Show why each path segment was chosen (slope/radiation/boulder cost breakdown per cell)
2. **Mission Feasibility Checker** — Pre-flight check: O₂ reserve, battery reserve, EVA duration vs. life support limits
3. **Dynamic Risk Heatmap** — Composite terrain+radiation+comm risk map updated as conditions change
4. **Predictive Environmental Risk Assessment** — Dust storm probability, SPE forecast integration with NOAA/MAVEN data
5. **Communication Failure Detection & Recovery** — Detect dead zones mid-route; auto-reroute for comm coverage
6. **Delayed Emergency Message Queue** — Log emergency messages with timestamp for relay when comm restored
7. **Offline-First Application** — Service Worker + IndexedDB for cached site data and route planning without internet
8. **Mission Memory & Observation Logs** — Persist route history, observations, and EVA journal across sessions
9. **Temporal Map Comparison** — Side-by-side or slider comparison of same area at different epochs (HiRISE change detection)
10. **Communication-Aware Route Planning** — Add UHF comm quality as hard constraint (not just soft penalty) in A*

### Implementation Order
1. Mission Feasibility Checker (depends on existing telemetry API)
2. Explainable Route Optimization (depends on A* cost logging)
3. Dynamic Risk Heatmap (depends on existing layer system)
4. Communication-Aware Route Planning (extends existing A* weights)
5. Offline-First Application (new Service Worker layer)
6. Mission Memory (new localStorage/IndexedDB layer)
7. Temporal Map Comparison (new raster comparison module)
8. Predictive Environmental Risk (new external data integration)
9. Communication Failure Detection (extends route planning)
10. Delayed Emergency Message Queue (new message persistence layer)

---

## P2 — Advanced Exploration & Habitat Development (Future)

> **Status: Not started. Document only.**

### Dependencies
- P1 fully complete
- Multi-dataset support stable
- Offline operation available

### Features
1. **Habitat Suitability Analysis** — Score candidate sites for radiation, slope, ISRU proximity, comm coverage, thermal stability
2. **Multi-Habitat Network Planning** — Route planning between multiple habitats; shared resource and comm network
3. **ISRU Resource Feasibility Calculator** — Water extraction rate, electrolysis O₂ yield, power requirements given real CRISM/SHARAD data
4. **Multi-Rover Coordination** — Assign routes to multiple rovers; collision avoidance; task scheduling
5. **Habitat Construction Simulator** — Timeline and resource estimate for pressurized habitat given ISRU and terrain data
6. **Autonomous Exploration Decision System** — Priority queue of science targets; autonomous EVA itinerary generation
7. **Advanced AI Mission Assistant** — Natural language query interface for mission data, route rationale and risk assessment
8. **Robotic Reconnaissance & Human Expedition Decision Support** — Pre-send rover to survey; use rover data to refine human EVA route

### Implementation Order
1. Habitat Suitability Analysis (foundation for all habitat features)
2. ISRU Resource Feasibility Calculator (foundation for habitat and rover features)
3. Multi-Rover Coordination (foundation for autonomous systems)
4. Multi-Habitat Network Planning (depends on habitat suitability + multi-rover)
5. Autonomous Exploration Decision System (depends on multi-rover + mission memory from P1)
6. Habitat Construction Simulator (depends on ISRU calculator + suitability analysis)
7. Robotic Reconnaissance Decision Support (depends on multi-rover + autonomous system)
8. Advanced AI Mission Assistant (depends on all data integration complete)

---

## Module Dependency Map

```
P0.1 (UI) ──────────────────────────────────────────────────────► All features
P0.2 (Guide) ───────────────────────────────────────────────────► User onboarding
P0.3 (Data Explorer) ──► P0.5 (Integration) ──► P1.3 (Heatmap) ──► P2.3 (ISRU)
                     ├──► P1.9 (Temporal) ──────────────────────────────────────
                     └──► P2.4 (Multi-rover)
P0.4 (Provenance) ──────────────────────────────────────────────► All data features
P0.5 (Integration) ─────────────────────────────────────────────► P1 route features
P1.1 (Explain) ──────────────────────────────────────────────────► P2.6 (Autonomous)
P1.2 (Feasibility) ─────────────────────────────────────────────► P2.1 (Habitat)
P1.6 (Offline) ──────────────────────────────────────────────────► P2 (all features)
P2.1 (Habitat) ─────────────────────────────────────────────────► P2.2, P2.5
P2.4 (Multi-rover) ─────────────────────────────────────────────► P2.6, P2.7, P2.8
```

---

## Known Limitations

### Data Coverage Limitations
- Real MOLA raster tiles only available for Jezero, Melas, Arcadia; other 7 sites use synthesized grids
- Real HiRISE imagery only for Jezero Crater; other sites use Jezero HiRISE as roughness proxy
- CRISM mineralogy: ODE catalog records loaded, but no browse tile images downloaded; mineral grids synthesized from POI data
- MSL RAD data provides calibration baseline only; not site-specific for non-Gale sites
- CTX tile streaming requires internet access; graceful degradation if unavailable

### Technical Limitations
- No persistent database; user uploads lost on server restart (P1: add IndexedDB/file persistence)
- No authentication; all users share the same session state server-side
- 80×80 grid resolution limits spatial precision to ~25m/cell
- 3D renderer uses painter's algorithm (no true Z-buffer); artifacts possible at extreme viewing angles
- No GeoTIFF support in current stack (would require rasterio/GDAL)
