/**
 * ARES-NAV Phase P2.1 — Planetary Ephemeris & In-Situ Environmental Client Module
 * Integrates NASA NAIF SPICE ephemerides, solar geometry, and real MEDA/REMS in-situ archives.
 */

(function () {
  'use strict';

  let currentEphemerisData = null;
  let activeSiteId = 'jezero';

  // DOM Elements
  let ephemCardEl = null;

  function initP2Ephemeris() {
    createEphemerisCard();
    hookSiteChanges();
    fetchEphemeris(activeSiteId);
  }

  function createEphemerisCard() {
    const hbCard = document.getElementById('hazard-breakdown-card');
    const parentContainer = (hbCard && hbCard.parentNode) || document.querySelector('.panel-right .panel-section') || document.querySelector('.panel-section');
    if (!parentContainer) return;

    // Check if already injected
    if (document.getElementById('ephem-card')) return;

    ephemCardEl = document.createElement('div');
    ephemCardEl.id = 'ephem-card';
    ephemCardEl.className = 'ephem-card';
    ephemCardEl.style.cssText = `
      margin-top: 14px;
      border: 1px solid rgba(0, 229, 255, 0.3);
      background: rgba(5, 14, 26, 0.85);
      border-radius: 6px;
      padding: 10px;
      font-size: 11px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    `;

    ephemCardEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px; border-bottom: 1px solid rgba(0, 229, 255, 0.15); padding-bottom: 5px;">
        <span style="color:var(--cyan-hud); font-weight:bold; letter-spacing:0.8px;">05.B PLANETARY EPHEMERIS & CLIMATE FOUNDATION</span>
        <span class="prov-badge prov-verified" id="ephem-prov-badge">NAIF SPICE</span>
      </div>

      <!-- Ephemeris Solar & Orbital Geometry -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
        <div style="background:rgba(0, 0, 0, 0.3); padding: 5px; border-radius: 4px;">
          <div style="color:var(--text-muted); font-size:9px; text-transform:uppercase;">Solar Longitude (Ls)</div>
          <strong id="ephem-ls" style="color:var(--cyan-hud); font-size:12px;">--°</strong>
          <div id="ephem-season" style="color:#aaa; font-size:9px; margin-top:2px;">Loading season...</div>
        </div>
        <div style="background:rgba(0, 0, 0, 0.3); padding: 5px; border-radius: 4px;">
          <div style="color:var(--text-muted); font-size:9px; text-transform:uppercase;">True Local Solar Time</div>
          <strong id="ephem-ltst" style="color:#ffb74d; font-size:12px;">--:--:--</strong>
          <div id="ephem-solar-elev" style="color:#aaa; font-size:9px; margin-top:2px;">Elev: --° | -- W/m²</div>
        </div>
      </div>

      <!-- Communications Light Time Latency -->
      <div style="background:rgba(0, 30, 45, 0.4); border: 1px solid rgba(0, 229, 255, 0.2); border-radius: 4px; padding: 6px; margin-bottom: 8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:var(--cyan-hud); font-weight:bold; font-size:10px;">EARTH-MARS COMMS LATENCY</span>
          <span id="ephem-dist-au" style="color:#aaa; font-size:9px;">-- AU</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:3px;">
          <span style="color:#ddd;">Astronomical OWLT:</span>
          <strong id="ephem-owlt" style="color:#00e5ff; font-size:12px;">-- min</strong>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:2px; font-size:9px; color:#aaa;">
          <span>Est. Telecommand Turnaround:</span>
          <span id="ephem-turnaround">-- min (DSN + Orbiter Relay)</span>
        </div>
        <div id="ephem-latency-advisory" style="margin-top:4px; font-size:9px; color:#ffb74d; line-height:1.2;">
          AUTONOMOUS OPERATIONS REQUIRED: Latency prevents real-time teleoperation.
        </div>
      </div>

      <!-- In-Situ Environmental Station Context -->
      <div style="background:rgba(0, 0, 0, 0.3); border-radius: 4px; padding: 6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
          <span style="color:#ffb74d; font-weight:bold; font-size:10px;" id="env-station-title">IN-SITU OBSERVATIONS</span>
          <span class="prov-badge prov-verified" id="env-prov-badge">NASA PDS</span>
        </div>
        <div id="env-station-meta" style="font-size:9px; color:#aaa; margin-bottom: 4px;">Loading environmental context...</div>

        <!-- Metric Grid -->
        <div id="env-metrics-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size:10px;">
          <div style="background:rgba(255,255,255,0.03); padding:4px; border-radius:3px;">
            <span style="color:#888;">Surface Pressure:</span> <strong id="env-pressure" style="color:#eee;">-- Pa</strong>
          </div>
          <div style="background:rgba(255,255,255,0.03); padding:4px; border-radius:3px;">
            <span style="color:#888;">Ground Temp:</span> <strong id="env-temp" style="color:#eee;">-- K</strong>
          </div>
          <div style="background:rgba(255,255,255,0.03); padding:4px; border-radius:3px;">
            <span style="color:#888;">Wind Mean / Gust:</span> <strong id="env-wind" style="color:#eee;">-- m/s</strong>
          </div>
          <div style="background:rgba(255,255,255,0.03); padding:4px; border-radius:3px;">
            <span style="color:#888;">Dust Opacity (τ):</span> <strong id="env-tau" style="color:#eee;">--</strong>
          </div>
        </div>

        <!-- Archival Sol Selector (for in-situ stations) -->
        <div id="env-sol-picker-container" style="margin-top:6px; display:flex; justify-content:space-between; align-items:center; font-size:9px;">
          <span style="color:#888;">Historical Archival Sol:</span>
          <select id="env-sol-select" style="background:#0a192f; color:#00e5ff; border:1px solid #1e3a5f; border-radius:3px; padding:1px 4px; font-size:9px;">
            <option value="89">Sol 89 (Spring Baseline)</option>
          </select>
        </div>

        <div id="env-disclaimer" style="margin-top:6px; font-size:8px; color:#777; line-height:1.2; border-top:1px solid rgba(255,255,255,0.05); padding-top:4px;">
          HISTORICAL ARCHIVE: Real in-situ measurements calibrated from NASA PDS archives. Not live telemetry.
        </div>
      </div>
    `;

    parentContainer.appendChild(ephemCardEl);

    // Event listener for sol picker
    const solSelect = document.getElementById('env-sol-select');
    if (solSelect) {
      solSelect.addEventListener('change', (e) => {
        fetchEphemeris(activeSiteId, e.target.value);
      });
    }
  }

  function hookSiteChanges() {
    // Listen for site switcher change events or hook window.state
    const siteSelect = document.getElementById('site-selector') || document.getElementById('site-select');
    if (siteSelect) {
      siteSelect.addEventListener('change', (e) => {
        activeSiteId = e.target.value;
        fetchEphemeris(activeSiteId);
      });
    }

    // Polling hook if window.state changes site programmatically
    let lastSite = activeSiteId;
    setInterval(() => {
      const curSite = (window.state && window.state.siteId) || (window.AresApp && window.AresApp.currentSite);
      if (curSite && curSite !== lastSite) {
        lastSite = curSite;
        activeSiteId = lastSite;
        fetchEphemeris(activeSiteId);
      }
    }, 1000);
  }

  async function fetchEphemeris(siteId, sol = null) {
    try {
      let url = `/api/planetary_ephemeris?site_id=${encodeURIComponent(siteId)}`;
      if (sol) {
        url += `&sol=${encodeURIComponent(sol)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        console.warn('[P2.1 Ephemeris] API error, falling back:', res.status);
        const fallbackRes = await fetch(`${url}&fallback=true`);
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          renderEphemeris(data);
        }
        return;
      }

      const data = await res.json();
      currentEphemerisData = data;
      renderEphemeris(data);
    } catch (err) {
      console.warn('[P2.1 Ephemeris] Failed fetching planetary ephemeris:', err);
    }
  }

  function renderEphemeris(data) {
    if (!data) return;

    const ephem = data.ephemeris || {};
    const comm = data.communications_latency || {};
    const env = data.environmental_context || {};
    const prov = data.provenance || {};

    // 1. Update Ephemeris Numbers
    const elLs = document.getElementById('ephem-ls');
    const elSeason = document.getElementById('ephem-season');
    const elLtst = document.getElementById('ephem-ltst');
    const elSolarElev = document.getElementById('ephem-solar-elev');
    const elProvBadge = document.getElementById('ephem-prov-badge');

    if (elLs) elLs.textContent = `${ephem.solar_longitude_deg || '--'}° Ls`;
    if (elSeason) elSeason.textContent = ephem.mars_season || '--';
    if (elLtst) elLtst.textContent = `${ephem.true_local_solar_time || '--:--:--'} LTST`;
    if (elSolarElev) {
      elSolarElev.textContent = `Elev: ${ephem.solar_elevation_deg || 0}° | ${ephem.surface_insolation_w_m2 || 0} W/m²`;
    }

    if (elProvBadge) {
      elProvBadge.textContent = prov.status === 'VERIFIED_NAIF_SPICE_KERNEL' ? 'NAIF SPICE' : 'CALIBRATED FALLBACK';
      elProvBadge.className = prov.status === 'VERIFIED_NAIF_SPICE_KERNEL' ? 'prov-badge prov-verified' : 'prov-badge prov-calculated';
    }

    // 2. Update Top HUD Sol Time if element exists
    const hudSolTime = document.getElementById('hud-sol-time');
    if (hudSolTime && ephem.true_local_solar_time) {
      hudSolTime.textContent = `LTST ${ephem.true_local_solar_time} // Ls ${ephem.solar_longitude_deg}°`;
    }

    // 3. Update Comms Latency
    const elDistAu = document.getElementById('ephem-dist-au');
    const elOwlt = document.getElementById('ephem-owlt');
    const elTurnaround = document.getElementById('ephem-turnaround');

    if (elDistAu) elDistAu.textContent = `${comm.earth_mars_distance_au || '--'} AU (${((comm.earth_mars_distance_km || 0) / 1e6).toFixed(1)}M km)`;
    if (elOwlt) elOwlt.textContent = `${comm.one_way_light_time_min || '--'} min (${comm.one_way_light_time_sec || '--'} s)`;
    if (elTurnaround) elTurnaround.textContent = `~${comm.total_estimated_telecommand_turnaround_min || '--'} min roundtrip`;

    // 4. Update Environmental Context
    const elStationTitle = document.getElementById('env-station-title');
    const elEnvBadge = document.getElementById('env-prov-badge');
    const elStationMeta = document.getElementById('env-station-meta');
    const elPressure = document.getElementById('env-pressure');
    const elTemp = document.getElementById('env-temp');
    const elWind = document.getElementById('env-wind');
    const elTau = document.getElementById('env-tau');
    const elPickerContainer = document.getElementById('env-sol-picker-container');
    const elSolSelect = document.getElementById('env-sol-select');
    const elDisclaimer = document.getElementById('env-disclaimer');

    if (env.in_situ_station_present) {
      if (elStationTitle) elStationTitle.textContent = env.station_name || 'IN-SITU STATION';
      if (elEnvBadge) {
        elEnvBadge.textContent = 'NASA PDS';
        elEnvBadge.className = 'prov-badge prov-verified';
      }
      if (elStationMeta) {
        elStationMeta.textContent = `${env.spacecraft} · Archival Sol ${env.historical_sol} (${env.sol_observation?.mars_season || ''})`;
      }

      const summary = env.sol_observation?.diurnal_summary || {};
      if (elPressure) elPressure.textContent = `${summary.pressure_mean_pa || '--'} Pa`;
      if (elTemp) {
        const k = summary.ground_temp_mean_k;
        const c = k ? (k - 273.15).toFixed(1) : '--';
        elTemp.textContent = `${k || '--'} K (${c}°C)`;
      }
      if (elWind) {
        elWind.textContent = `${summary.wind_speed_mean_mps || '--'} / ${summary.wind_speed_max_gust_mps || '--'} m/s`;
      }
      if (elTau) {
        elTau.textContent = summary.optical_depth_tau_880nm !== undefined ? `${summary.optical_depth_tau_880nm}` : 'N/A';
      }

      // Populate Sol Select
      if (elPickerContainer) elPickerContainer.style.display = 'flex';
      if (elSolSelect && env.available_archival_sols) {
        elSolSelect.innerHTML = env.available_archival_sols
          .map((s) => `<option value="${s}" ${s === env.historical_sol ? 'selected' : ''}>Sol ${s}</option>`)
          .join('');
      }
      if (elDisclaimer) {
        elDisclaimer.textContent = env.scientific_disclaimer || 'HISTORICAL ARCHIVE: Verified NASA PDS observations.';
      }
    } else {
      // Modeled climatology for uninstrumented sites
      if (elStationTitle) elStationTitle.textContent = 'MODELED CLIMATOLOGY';
      if (elEnvBadge) {
        elEnvBadge.textContent = 'SIMULATED';
        elEnvBadge.className = 'prov-badge prov-simulated';
      }
      if (elStationMeta) {
        elStationMeta.textContent = `${env.model_framework || 'NASA Ames FV3-MGCM Baseline'} (No Surface Lander)`;
      }

      const clim = env.climatological_summary || {};
      if (elPressure) elPressure.textContent = `~${clim.estimated_surface_pressure_pa || '--'} Pa`;
      if (elTemp) elTemp.textContent = 'Diurnal model (-60°C nominal)';
      if (elWind) elWind.textContent = `~${clim.estimated_wind_speed_mean_mps || 5.0} m/s (Regional)`;
      if (elTau) elTau.textContent = `${clim.optical_depth_tau_baseline || 0.40} (Baseline)`;

      if (elPickerContainer) elPickerContainer.style.display = 'none';
      if (elDisclaimer) {
        elDisclaimer.textContent = env.scientific_disclaimer || 'MODELED: No ground station. Data derived from Ames FV3-MGCM.';
      }
    }
  }

  // Auto-init on DOMContentLoaded or immediate if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initP2Ephemeris);
  } else {
    initP2Ephemeris();
  }

  // Export module to window
  window.AresP2Ephemeris = {
    fetchEphemeris,
    getEphemerisData: () => currentEphemerisData
  };
})();
