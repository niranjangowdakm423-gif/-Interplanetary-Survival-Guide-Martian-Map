/**
 * ARES-NAV P1 Feature 4: Predictive Environmental Risk Assessment & Atmospheric Modeling
 * Provides: Diurnal surface temperature modeling, qualitative dust storm risk,
 * atmospheric column mass shielding, and Ingenuity-class scout drone flight feasibility.
 */

const P1_ATMOSPHERIC = (() => {
  // ─── Module State ──────────────────────────────────────────────────────────
  let _state = {
    siteId: 'jezero',
    solHour: 14.0,
    seasonLs: 0.0,
    dustScenario: 'seasonal_baseline',
    droneMassKg: 1.8,
    data: null,
    loading: false
  };

  // ─── Public API ────────────────────────────────────────────────────────────
  function init() {
    _injectDOM();
    _bindEvents();
    // Load initial data for Jezero
    fetchAssessment('jezero');
    console.log('[P1] Atmospheric & Scout Drone module initialized');
  }

  function onSiteChange(siteId) {
    if (!siteId) return;
    _state.siteId = siteId;
    fetchAssessment(siteId);
  }

  function onRouteResult(routeResult) {
    if (!routeResult || !routeResult.telemetry || !routeResult.telemetry.summary) return;
    const summary = routeResult.telemetry.summary;
    if (summary.atmospheric_profile) {
      _renderRouteAtmosphericSnippet(summary.atmospheric_profile);
    }
  }

  // ─── Data Fetching ─────────────────────────────────────────────────────────
  async function fetchAssessment(siteId) {
    const sid = siteId || _state.siteId || 'jezero';
    _state.siteId = sid;
    _state.loading = true;

    try {
      const url = `/api/environmental_assessment?site_id=${encodeURIComponent(sid)}` +
                  `&sol_hour=${_state.solHour}&season_ls=${_state.seasonLs}` +
                  `&dust_scenario=${encodeURIComponent(_state.dustScenario)}` +
                  `&drone_mass_kg=${_state.droneMassKg}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      _state.data = data;
      _state.loading = false;
      render();
    } catch (err) {
      console.warn('[P1 Atmospheric] Failed to fetch assessment:', err);
      _state.loading = false;
    }
  }

  // ─── DOM Injection ─────────────────────────────────────────────────────────
  function _injectDOM() {
    // Inject Atmospheric & Drone card right after the Hazard Breakdown card in Section 05
    const hazardCard = document.getElementById('hazard-breakdown-card');
    if (!hazardCard || !hazardCard.parentNode) return;

    // Avoid duplicate injection
    if (document.getElementById('atmospheric-drone-card')) return;

    const card = document.createElement('div');
    card.id = 'atmospheric-drone-card';
    card.className = 'atmospheric-drone-card';
    card.innerHTML = `
      <div class="atmo-header">
        <div class="atmo-title-wrap">
          <span class="atmo-icon">🌪️</span>
          <div>
            <h3 class="atmo-title">ATMOSPHERIC &amp; SCOUT DRONE DOSSIER</h3>
            <span class="atmo-sub">Predictive Diurnal Weather, Column Mass &amp; Aerial Support</span>
          </div>
        </div>
        <span class="atmo-badge" id="atmo-drone-badge">DRONE: READY</span>
      </div>

      <!-- Interactive Parameter Scrubbers -->
      <div class="atmo-controls-grid">
        <div class="atmo-ctrl-group">
          <div class="atmo-ctrl-label-wrap">
            <label for="atmo-sol-hour-slider">Sol Time:</label>
            <strong id="atmo-sol-hour-display">14:00 (Daylight)</strong>
          </div>
          <input type="range" id="atmo-sol-hour-slider" min="0" max="23" step="1" value="14" class="tactical-slider">
        </div>

        <div class="atmo-ctrl-group">
          <label for="atmo-season-select">Season (Solar Longitude Ls):</label>
          <select id="atmo-season-select" class="tactical-select-sm">
            <option value="0">Ls 0° — Vernal Equinox (Clear)</option>
            <option value="70">Ls 70° — Aphelion (Coldest)</option>
            <option value="180">Ls 180° — Autumnal Equinox</option>
            <option value="250">Ls 250° — Perihelion (Dust Storm Season)</option>
          </select>
        </div>

        <div class="atmo-ctrl-group">
          <label for="atmo-dust-select">Dust Optical Scenario:</label>
          <select id="atmo-dust-select" class="tactical-select-sm">
            <option value="seasonal_baseline">Astronomical Seasonal Model</option>
            <option value="local_dust_devil">Local Convective Vortex (τ=0.85)</option>
            <option value="regional_storm">Regional Dust Storm (τ=2.40)</option>
            <option value="global_encirclement">Global Storm / 2018 PEDE (τ=6.0)</option>
          </select>
        </div>

        <div class="atmo-ctrl-group">
          <div class="atmo-ctrl-label-wrap">
            <label for="atmo-drone-mass">Drone Mass:</label>
            <span id="atmo-drone-mass-display">1.8 kg (Ingenuity)</span>
          </div>
          <input type="range" id="atmo-drone-mass" min="1.0" max="4.0" step="0.2" value="1.8" class="tactical-slider">
        </div>
      </div>

      <!-- 4-Quadrant Metric Panel -->
      <div class="atmo-metric-grid">
        <!-- 1. Diurnal Surface Temperature -->
        <div class="atmo-metric-card" id="atmo-card-temp">
          <div class="am-header">
            <span class="am-label">SURFACE TEMPERATURE</span>
            <span class="am-tag tag-model">Calculated Model</span>
          </div>
          <div class="am-main-val">
            <strong id="atmo-cur-temp">-21.9°C</strong>
            <span class="am-unit">251.3 K</span>
          </div>
          <div class="am-stats-row">
            <span>Range: <strong id="atmo-temp-range">-90.1° to -21.9°C</strong></span>
            <span>Swing: <strong id="atmo-temp-swing">68.2 K</strong></span>
          </div>
          <div class="am-sub-info">
            <span>Thermal Inertia: <strong id="atmo-ti-val">380 TIU</strong> (Indurated Deltaic Sandstone)</span>
          </div>
        </div>

        <!-- 2. Atmospheric Column & Shielding -->
        <div class="atmo-metric-card" id="atmo-card-col">
          <div class="am-header">
            <span class="am-label">ATMOSPHERIC COLUMN</span>
            <span class="am-tag tag-calc">Barometric Slab</span>
          </div>
          <div class="am-main-val">
            <strong id="atmo-col-mass">20.02 g/cm²</strong>
            <span class="am-unit" id="atmo-surf-press">745 Pa (7.45 mbar)</span>
          </div>
          <div class="am-stats-row">
            <span>Earth Standard: <strong id="atmo-col-earth">1.94%</strong></span>
            <span>Solar Proton Attenuation: <strong id="atmo-col-atten">16.0%</strong></span>
          </div>
          <div class="am-sub-info alert-text">
            <span>⚠️ Secondary neutron spallation: Mars column generates albedo neutrons (~15-20% surface dose).</span>
          </div>
        </div>

        <!-- 3. Dust Storm Risk Assessment -->
        <div class="atmo-metric-card" id="atmo-card-dust">
          <div class="am-header">
            <span class="am-label">DUST STORM RISK</span>
            <span class="atmo-risk-badge badge-low" id="atmo-dust-badge">LOW</span>
          </div>
          <div class="am-main-val">
            <strong id="atmo-dust-tau">τ = 0.35</strong>
            <span class="am-unit" id="atmo-dust-atten">Solar Loss: 14.8%</span>
          </div>
          <div class="am-stats-row">
            <span>Vis Range: <strong id="atmo-dust-vis">48.9 km</strong></span>
            <span>Season: <strong id="atmo-season-name">Aphelion (Clear)</strong></span>
          </div>
          <div class="am-advisory" id="atmo-dust-advisory">
            Nominal EVA parameters. Routine solar array dust sweep at end of sol.
          </div>
        </div>

        <!-- 4. Scout Drone Flight Envelope -->
        <div class="atmo-metric-card" id="atmo-card-drone">
          <div class="am-header">
            <span class="am-label">SCOUT DRONE (INGENUITY CLASS)</span>
            <span class="atmo-flight-badge badge-optimal" id="atmo-flight-badge">OPTIMAL FLIGHT</span>
          </div>
          <div class="am-main-val">
            <strong id="atmo-drone-density">0.0181 kg/m³</strong>
            <span class="am-unit" id="atmo-density-margin">+51.2% lift margin</span>
          </div>
          <div class="am-stats-row">
            <span>Hover Power: <strong id="atmo-drone-power">282 W</strong></span>
            <span>Rotor Speed: <strong id="atmo-drone-rpm">2500 RPM (M 0.68)</strong></span>
          </div>
          <div class="am-stats-row">
            <span>Max Flight Time: <strong id="atmo-drone-endurance">7.3 min</strong></span>
            <span>Scout Radius: <strong id="atmo-drone-radius">1095 m</strong></span>
          </div>
        </div>
      </div>

      <!-- Route Telemetry Callout (dynamically updated when route planned) -->
      <div class="atmo-route-callout hidden" id="atmo-route-callout">
        <span class="atmo-rc-icon">📍</span>
        <div class="atmo-rc-body">
          <strong>Traverse Flight Coverage:</strong>
          <span id="atmo-route-flight-text">Scout drone can survey 100% of planned traverse path with high margin.</span>
        </div>
      </div>

      <!-- Scientific Provenance & Limitations Block -->
      <div class="atmo-provenance-box">
        <div class="ap-row">
          <span class="prov-badge prov-verified">Observed Ground Truth</span>
          <span class="ap-desc">MSL REMS / Viking Lander 1 &amp; 2 / InSight TWINS measured surface temperature extremes (-88° to -14°C) &amp; MSL RAD in-situ GCR (26.67 µSv/hr).</span>
        </div>
        <div class="ap-row">
          <span class="prov-badge prov-calculated">Physical Modeling</span>
          <span class="ap-desc">Diurnal 1D insolation harmonic (±5.5 K), barometric slab column mass (±15%), actuator disk hover aerodynamics (JPL Ingenuity specs).</span>
        </div>
        <div class="ap-row">
          <span class="prov-badge prov-partial">Unknowns &amp; Disclaimers</span>
          <span class="ap-desc">Micro-meteorological PBL wind shear velocity and regolith electrostatic grain charges are unmeasured. Atmospheric column does NOT replace 3D Monte Carlo nuclear transport (GEANT4/HZETRN).</span>
        </div>
      </div>
    `;

    hazardCard.parentNode.insertBefore(card, hazardCard.nextSibling);
  }

  // ─── Event Binding ─────────────────────────────────────────────────────────
  function _bindEvents() {
    const hourSlider = document.getElementById('atmo-sol-hour-slider');
    const seasonSelect = document.getElementById('atmo-season-select');
    const dustSelect = document.getElementById('atmo-dust-select');
    const massSlider = document.getElementById('atmo-drone-mass');

    if (hourSlider) {
      hourSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        _state.solHour = val;
        const display = document.getElementById('atmo-sol-hour-display');
        const isDay = val >= 6 && val <= 18;
        if (display) {
          const hh = String(Math.floor(val)).padStart(2, '0');
          display.textContent = `${hh}:00 Sol (${isDay ? 'Daylight ☀️' : 'Night 🌙'})`;
        }
        fetchAssessment();
      });
    }

    if (seasonSelect) {
      seasonSelect.addEventListener('change', (e) => {
        _state.seasonLs = parseFloat(e.target.value);
        fetchAssessment();
      });
    }

    if (dustSelect) {
      dustSelect.addEventListener('change', (e) => {
        _state.dustScenario = e.target.value;
        fetchAssessment();
      });
    }

    if (massSlider) {
      massSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        _state.droneMassKg = val;
        const display = document.getElementById('atmo-drone-mass-display');
        if (display) {
          display.textContent = `${val.toFixed(1)} kg ${val === 1.8 ? '(Ingenuity)' : ''}`;
        }
        fetchAssessment();
      });
    }

    // Site change hook via document site selector
    const siteSelect = document.getElementById('site-selector');
    if (siteSelect) {
      siteSelect.addEventListener('change', (e) => {
        onSiteChange(e.target.value);
      });
    }
  }

  // ─── Render UI ─────────────────────────────────────────────────────────────
  function render() {
    const data = _state.data;
    if (!data) return;

    const dTemp = data.diurnal_temperature;
    const dust = data.dust_storm_risk;
    const col = data.atmospheric_column;
    const drone = data.scout_drone_feasibility;

    // 1. Temperature Card
    const curHourIdx = Math.min(23, Math.max(0, Math.floor(_state.solHour)));
    const curHourData = (dTemp.hourly_profile && dTemp.hourly_profile[curHourIdx]) || {};
    const curTempC = curHourData.temp_c != null ? curHourData.temp_c : -50.0;
    const curTempK = curHourData.temp_k != null ? curHourData.temp_k : 223.15;

    const elCurTemp = document.getElementById('atmo-cur-temp');
    if (elCurTemp) elCurTemp.textContent = `${curTempC > 0 ? '+' : ''}${curTempC.toFixed(1)}°C`;

    const elCurTempUnit = document.querySelector('#atmo-card-temp .am-unit');
    if (elCurTempUnit) elCurTempUnit.textContent = `${curTempK.toFixed(1)} K (Flux: ${curHourData.insolation_w_m2 || 0} W/m²)`;

    const elTempRange = document.getElementById('atmo-temp-range');
    if (elTempRange) {
      const sum = dTemp.diurnal_summary || {};
      elTempRange.textContent = `${sum.min_temp_c}° to ${sum.max_temp_c}°C`;
    }

    const elTempSwing = document.getElementById('atmo-temp-swing');
    if (elTempSwing) elTempSwing.textContent = `${dTemp.diurnal_summary?.diurnal_swing_k || 65} K`;

    const elTiVal = document.getElementById('atmo-ti-val');
    if (elTiVal && dTemp.thermal_inertia) {
      elTiVal.textContent = `${dTemp.thermal_inertia.thermal_inertia_tiu} TIU`;
      const tiSub = elTiVal.parentElement;
      if (tiSub) tiSub.innerHTML = `Thermal Inertia: <strong>${dTemp.thermal_inertia.thermal_inertia_tiu} TIU</strong> (${dTemp.thermal_inertia.geological_classification})`;
    }

    // 2. Atmospheric Column Card
    const elColMass = document.getElementById('atmo-col-mass');
    if (elColMass) elColMass.textContent = `${col.column_mass_g_cm2.toFixed(2)} g/cm²`;

    const elSurfPress = document.getElementById('atmo-surf-press');
    if (elSurfPress) elSurfPress.textContent = `${col.surface_pressure_pa} Pa (${col.surface_pressure_mbar} mbar)`;

    const elColEarth = document.getElementById('atmo-col-earth');
    if (elColEarth) elColEarth.textContent = `${col.earth_comparison?.mars_column_fraction_pct || 1.9}% of Earth`;

    const elColAtten = document.getElementById('atmo-col-atten');
    if (elColAtten) elColAtten.textContent = `${col.radiation_interaction?.theoretical_slab_attenuation_pct || 16}%`;

    // 3. Dust Storm Card
    const elDustBadge = document.getElementById('atmo-dust-badge');
    if (elDustBadge) {
      elDustBadge.textContent = dust.risk_category;
      elDustBadge.className = `atmo-risk-badge badge-${dust.risk_category.toLowerCase()}`;
    }

    const elDustTau = document.getElementById('atmo-dust-tau');
    if (elDustTau) elDustTau.textContent = `τ = ${dust.optical_depth_tau.toFixed(2)}`;

    const elDustAtten = document.getElementById('atmo-dust-atten');
    if (elDustAtten) elDustAtten.textContent = `Solar Loss: ${dust.solar_power_attenuation_pct}%`;

    const elDustVis = document.getElementById('atmo-dust-vis');
    if (elDustVis) elDustVis.textContent = `${dust.estimated_horizontal_visibility_km} km`;

    const elSeasonName = document.getElementById('atmo-season-name');
    if (elSeasonName) elSeasonName.textContent = dust.seasonal_context?.is_perihelion_dust_season ? 'Perihelion (Storm)' : 'Aphelion (Clear)';

    const elDustAdv = document.getElementById('atmo-dust-advisory');
    if (elDustAdv) elDustAdv.textContent = dust.operational_advisory;

    // 4. Scout Drone Card
    const elDroneBadge = document.getElementById('atmo-drone-badge');
    const elFlightBadge = document.getElementById('atmo-flight-badge');

    const vColor = drone.verdict_color || 'emerald';
    const vText = drone.verdict_label || drone.verdict;

    if (elDroneBadge) {
      elDroneBadge.textContent = `DRONE: ${drone.verdict === 'OPTIMAL_FLIGHT' ? 'OPTIMAL' : (drone.verdict === 'MARGINAL_FLIGHT' ? 'MARGINAL' : 'GROUNDED')}`;
      elDroneBadge.className = `atmo-badge badge-${vColor}`;
    }

    if (elFlightBadge) {
      elFlightBadge.textContent = vText;
      elFlightBadge.className = `atmo-flight-badge badge-${vColor}`;
    }

    const elDensity = document.getElementById('atmo-drone-density');
    if (elDensity) elDensity.textContent = `${drone.atmospheric_flight_metrics?.density_kg_m3.toFixed(4)} kg/m³`;

    const elMargin = document.getElementById('atmo-density-margin');
    if (elMargin) {
      const margin = drone.atmospheric_flight_metrics?.density_margin_pct || 0;
      elMargin.textContent = `${margin >= 0 ? '+' : ''}${margin.toFixed(1)}% lift margin`;
    }

    const elPower = document.getElementById('atmo-drone-power');
    if (elPower) elPower.textContent = `${Math.round(drone.power_and_endurance?.total_hover_power_w || 0)} W`;

    const elRpm = document.getElementById('atmo-drone-rpm');
    if (elRpm) {
      const rpm = drone.drone_parameters?.rotor_rpm || 2500;
      const mach = drone.drone_parameters?.tip_mach || 0.68;
      elRpm.textContent = `${rpm} RPM (M ${mach.toFixed(2)})`;
    }

    const elEndurance = document.getElementById('atmo-drone-endurance');
    if (elEndurance) elEndurance.textContent = `${drone.power_and_endurance?.max_endurance_min.toFixed(1)} min`;

    const elRadius = document.getElementById('atmo-drone-radius');
    if (elRadius) elRadius.textContent = `${Math.round(drone.power_and_endurance?.max_scout_radius_m || 0)} m`;
  }

  function _renderRouteAtmosphericSnippet(profile) {
    const callout = document.getElementById('atmo-route-callout');
    const textEl = document.getElementById('atmo-route-flight-text');
    if (!callout || !textEl) return;

    callout.classList.remove('hidden');
    textEl.innerHTML = `Traverse column mass: <strong>${profile.atmospheric_column_mass_g_cm2} g/cm²</strong> (${profile.mean_surface_pressure_pa} Pa). Aerial drone verdict: <strong class="color-${profile.drone_flight_verdict === 'OPTIMAL_FLIGHT' ? 'emerald' : 'amber'}">${profile.drone_flight_label}</strong> (max scout radius: ${Math.round(profile.drone_max_scout_radius_m)}m).`;
  }

  return {
    init,
    onSiteChange,
    onRouteResult,
    fetchAssessment,
    getState: () => ({ ..._state })
  };
})();

// Auto-init on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', P1_ATMOSPHERIC.init);
} else {
  P1_ATMOSPHERIC.init();
}
