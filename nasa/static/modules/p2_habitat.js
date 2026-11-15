/**
 * ARES-NAV Phase P2.2 — Habitat Suitability & Site Selection Client Module
 * Multi-Criteria Decision Analysis (MCDA), Saaty AHP Weighting, HLS Plume Blast
 * Exclusion Standoff (800m - 2000m), and Directional Horizon Sky-View Masking.
 */

const P2_HABITAT = (() => {
  'use strict';

  let _state = {
    siteId: 'jezero',
    data: null,
    loading: false,
    showOverlayOnAllLayers: false,
    maxSlopeDeg: 8.0,
    minBlastBufferM: 800.0,
    regolithShieldingM: 2.0,
    weightProfile: 'ahp_default',
    selectedRank: 1
  };

  const WEIGHT_PROFILES = {
    ahp_default: null, // Uses verified Saaty AHP pairwise matrix
    radiation_focus: {
      slope: 0.20,
      terrain_roughness: 0.12,
      horizon_masking: 0.38,
      isru_proximity: 0.12,
      comm_coverage: 0.09,
      thermal_inertia: 0.09
    },
    isru_focus: {
      slope: 0.20,
      terrain_roughness: 0.12,
      horizon_masking: 0.10,
      isru_proximity: 0.40,
      comm_coverage: 0.09,
      thermal_inertia: 0.09
    },
    solar_focus: {
      slope: 0.22,
      terrain_roughness: 0.13,
      horizon_masking: 0.08,
      isru_proximity: 0.12,
      comm_coverage: 0.10,
      thermal_inertia: 0.35
    }
  };

  function init() {
    _injectCard();
    _hookSiteSelector();
    fetchSuitability(_state.siteId);
    console.log('[ARES-NAV P2.2] Habitat Suitability & Site Selection module initialized');
  }

  function onSiteChange(siteId) {
    if (!siteId || siteId === 'custom') return;
    _state.siteId = siteId;
    fetchSuitability(siteId);
  }

  async function fetchSuitability(siteId) {
    const sid = siteId || _state.siteId || 'jezero';
    _state.siteId = sid;
    _state.loading = true;

    try {
      const payload = {
        site_id: sid,
        weights: WEIGHT_PROFILES[_state.weightProfile] || null,
        thresholds: {
          max_slope_deg: _state.maxSlopeDeg,
          max_boulder_pct: 20.0,
          min_blast_buffer_m: _state.minBlastBufferM,
          max_logistics_buffer_m: 2000.0
        },
        regolith_shielding_m: _state.regolithShieldingM
      };

      const res = await fetch('/api/habitat_suitability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      _state.data = data;
      _state.loading = false;

      // Attach 80x80 grid into window.state.siteData.layers.habitat_suitability for native Canvas rendering
      if (window.state && window.state.siteData && window.state.siteData.layers && data.suitability_grid_80x80) {
        window.state.siteData.layers.habitat_suitability = data.suitability_grid_80x80;
        if (window.state.activeLayer === 'habitat_suitability') {
          if (typeof window.bake2DTerrainLayer === 'function') window.bake2DTerrainLayer();
          if (typeof window.renderScene === 'function') window.renderScene();
        }
      }

      _renderCard();
      if (typeof window.renderScene === 'function') window.renderScene();
    } catch (err) {
      console.warn('[P2.2 Habitat Suitability] Error fetching suitability:', err);
      _state.loading = false;
    }
  }

  function activateHabitatLayer() {
    if (!window.state) return;
    if (_state.data && _state.data.suitability_grid_80x80 && window.state.siteData && window.state.siteData.layers) {
      window.state.siteData.layers.habitat_suitability = _state.data.suitability_grid_80x80;
    }
    window.state.activeLayer = 'habitat_suitability';

    // Sync Beginner & Expert layer buttons
    document.querySelectorAll('#beginner-layer-picker .blp-btn, #layer-buttons .layer-btn').forEach(btn => {
      const isAct = btn.getAttribute('data-layer') === 'habitat_suitability';
      btn.classList.toggle('active', isAct);
      btn.setAttribute('aria-pressed', isAct ? 'true' : 'false');
    });

    if (typeof window.updateLegendUI === 'function') window.updateLegendUI();
    if (typeof window.bake2DTerrainLayer === 'function') window.bake2DTerrainLayer();
    if (typeof window.renderScene === 'function') window.renderScene();
    if (typeof window.P0_PROVENANCE !== 'undefined') {
      window.P0_PROVENANCE.updateCoverageIndicator(_state.siteId, 'habitat_suitability');
    }
  }

  function _hookSiteSelector() {
    const sel = document.getElementById('site-selector');
    if (sel) {
      sel.addEventListener('change', (e) => {
        if (e.target.value && e.target.value !== 'custom') {
          onSiteChange(e.target.value);
        }
      });
    }

    let lastSite = _state.siteId;
    setInterval(() => {
      if (window.state && window.state.siteId && window.state.siteId !== lastSite) {
        lastSite = window.state.siteId;
        onSiteChange(lastSite);
      } else if (
        window.state &&
        window.state.siteData &&
        window.state.siteData.layers &&
        !window.state.siteData.layers.habitat_suitability &&
        _state.data &&
        _state.data.site_id === window.state.siteId
      ) {
        window.state.siteData.layers.habitat_suitability = _state.data.suitability_grid_80x80;
      }
    }, 600);
  }

  function _injectCard() {
    if (document.getElementById('p2-habitat-card')) return;
    const hbCard = document.getElementById('hazard-breakdown-card');
    const parent = (hbCard && hbCard.parentNode) || document.querySelector('.panel-right .panel-section');
    if (!parent) return;

    const card = document.createElement('div');
    card.id = 'p2-habitat-card';
    card.style.cssText = `
      margin-top: 14px;
      border: 1px solid rgba(16, 185, 129, 0.38);
      background: rgba(6, 16, 24, 0.90);
      border-radius: 6px;
      padding: 10px;
      font-size: 11px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
    `;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(16, 185, 129, 0.2); padding-bottom:5px;">
        <span style="color:#18e299; font-weight:bold; letter-spacing:0.6px;">05.C HABITAT SUITABILITY &amp; SITE SELECTION</span>
        <span class="prov-badge prov-calculated" id="hab-score-badge">MCDA: --</span>
      </div>

      <div style="display:flex; gap:6px; margin-bottom:8px;">
        <button id="btn-hab-view-layer" class="btn-tactical" style="flex:1; background:rgba(16,185,129,0.18); border-color:#18e299; color:#fff; font-size:10px; padding:5px 8px; cursor:pointer;">
          🏠 View Suitability Layer on Map
        </button>
        <button id="btn-hab-route-opt" class="btn-tactical" style="background:rgba(39,215,255,0.15); border-color:#27d7ff; color:#27d7ff; font-size:10px; padding:5px 8px; cursor:pointer;" title="Add Optimal Habitat Site as EVA Waypoint">
          + Route to Optimal Hab
        </button>
      </div>

      <!-- Interactive Engineering Constraints & AHP Profile -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px; background:rgba(0,0,0,0.3); padding:6px; border-radius:4px;">
        <div>
          <label style="font-size:9px; color:#8b9bb4; display:block;">MCDA Priority Profile:</label>
          <select id="hab-weight-profile" style="width:100%; background:#0a1520; color:#edf2f8; border:1px solid rgba(255,255,255,0.15); border-radius:3px; font-size:9.5px; padding:2px 4px; margin-top:2px;">
            <option value="ahp_default">Saaty AHP Balanced (CR=0.002)</option>
            <option value="radiation_focus">Radiation Horizon Shielding</option>
            <option value="isru_focus">ISRU Water Proximity (&lt;1.5km)</option>
            <option value="solar_focus">Solar Array Insolation Max</option>
          </select>
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:9px; color:#8b9bb4;">
            <span>Max Slope Cutoff:</span>
            <strong id="hab-lbl-slope" style="color:#18e299;">8.0°</strong>
          </div>
          <input type="range" id="hab-rng-slope" min="5" max="12" step="0.5" value="8.0" style="width:100%; margin-top:3px;" />
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:9px; color:#8b9bb4;">
            <span>HLS Blast Standoff:</span>
            <strong id="hab-lbl-blast" style="color:#ffab2e;">800 m</strong>
          </div>
          <input type="range" id="hab-rng-blast" min="600" max="1400" step="100" value="800" style="width:100%; margin-top:3px;" />
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:9px; color:#8b9bb4;">
            <span>Regolith Roof Overburden:</span>
            <strong id="hab-lbl-regolith" style="color:#27d7ff;">2.0 m</strong>
          </div>
          <input type="range" id="hab-rng-regolith" min="0.2" max="3.0" step="0.2" value="2.0" style="width:100%; margin-top:3px;" />
        </div>
      </div>

      <!-- Optimal Infrastructure Triad -->
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:5px; margin-bottom:8px; text-align:center;">
        <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.35); border-radius:4px; padding:4px;">
          <div style="font-size:8.5px; color:#8b9bb4;">HABITAT [HAB-OPT]</div>
          <strong id="hab-opt-cell" style="color:#18e299; font-size:11px;">[--, --]</strong>
          <div id="hab-opt-sub" style="font-size:8.5px; color:#aaa;">--m from LZ</div>
        </div>
        <div style="background:rgba(255,171,46,0.12); border:1px solid rgba(255,171,46,0.35); border-radius:4px; padding:4px;">
          <div style="font-size:8.5px; color:#8b9bb4;">SOLAR FARM [SOL]</div>
          <strong id="hab-sol-cell" style="color:#ffab2e; font-size:11px;">[--, --]</strong>
          <div id="hab-sol-sub" style="font-size:8.5px; color:#aaa;">-- Wh/m²/sol</div>
        </div>
        <div style="background:rgba(39,215,255,0.12); border:1px solid rgba(39,215,255,0.35); border-radius:4px; padding:4px;">
          <div style="font-size:8.5px; color:#8b9bb4;">FISSION [FSP-PWR]</div>
          <strong id="hab-fsp-cell" style="color:#27d7ff; font-size:11px;">[--, --]</strong>
          <div id="hab-fsp-sub" style="font-size:8.5px; color:#aaa;">&ge;500m Standoff</div>
        </div>
      </div>

      <!-- Top Ranked Candidate Breakdown -->
      <div id="hab-candidates-list" style="display:flex; flex-direction:column; gap:5px; margin-bottom:8px;"></div>

      <!-- Radiation Horizon Masking vs Bulk Overburden Box -->
      <div id="hab-shielding-box" style="background:rgba(0,0,0,0.35); border-left:3px solid #27d7ff; padding:5px 7px; border-radius:3px; font-size:9px; color:#cbd5e1; line-height:1.35;">
        Loading horizon sky-view factor &amp; bulk regolith shielding audit...
      </div>
    `;

    parent.appendChild(card);

    // Event bindings
    document.getElementById('btn-hab-view-layer')?.addEventListener('click', () => {
      activateHabitatLayer();
    });

    document.getElementById('btn-hab-route-opt')?.addEventListener('click', () => {
      if (!_state.data || !_state.data.optimal_habitat_cell || !window.state) return;
      const [gx, gy] = _state.data.optimal_habitat_cell;
      window.state.waypoints.push({ gx, gy, label: `HAB-OPT Candidate (${gx},${gy})` });
      if (typeof window.updateWaypointListUI === 'function') window.updateWaypointListUI();
      if (typeof window.requestRoutePlan === 'function') window.requestRoutePlan();
    });

    document.getElementById('hab-weight-profile')?.addEventListener('change', (e) => {
      _state.weightProfile = e.target.value;
      fetchSuitability(_state.siteId);
    });

    document.getElementById('hab-rng-slope')?.addEventListener('input', (e) => {
      _state.maxSlopeDeg = parseFloat(e.target.value);
      const lbl = document.getElementById('hab-lbl-slope');
      if (lbl) lbl.textContent = `${_state.maxSlopeDeg.toFixed(1)}°`;
      fetchSuitability(_state.siteId);
    });

    document.getElementById('hab-rng-blast')?.addEventListener('input', (e) => {
      _state.minBlastBufferM = parseFloat(e.target.value);
      const lbl = document.getElementById('hab-lbl-blast');
      if (lbl) lbl.textContent = `${_state.minBlastBufferM.toFixed(0)} m`;
      fetchSuitability(_state.siteId);
    });

    document.getElementById('hab-rng-regolith')?.addEventListener('input', (e) => {
      _state.regolithShieldingM = parseFloat(e.target.value);
      const lbl = document.getElementById('hab-lbl-regolith');
      if (lbl) lbl.textContent = `${_state.regolithShieldingM.toFixed(1)} m`;
      fetchSuitability(_state.siteId);
    });
  }

  function _renderCard() {
    const d = _state.data;
    if (!d) return;

    const badge = document.getElementById('hab-score-badge');
    if (badge) {
      badge.textContent = `MAX ${d.suitability_score_max.toFixed(1)}/100 (${d.hard_constraint_pass_rate_pct}% PASS)`;
    }

    const habCellEl = document.getElementById('hab-opt-cell');
    const habSubEl = document.getElementById('hab-opt-sub');
    const top1 = d.top_candidates && d.top_candidates[0];
    if (habCellEl && d.optimal_habitat_cell) {
      habCellEl.textContent = `[${d.optimal_habitat_cell[0]}, ${d.optimal_habitat_cell[1]}]`;
    }
    if (habSubEl && top1) {
      habSubEl.textContent = `${top1.distance_to_lz_m.toFixed(0)}m LZ · ${top1.slope_deg}°`;
    }

    const solCellEl = document.getElementById('hab-sol-cell');
    const solSubEl = document.getElementById('hab-sol-sub');
    if (solCellEl && d.optimal_solar_farm_cell) {
      solCellEl.textContent = `[${d.optimal_solar_farm_cell[0]}, ${d.optimal_solar_farm_cell[1]}]`;
    }
    if (solSubEl && top1) {
      solSubEl.textContent = `${top1.daily_insolation_wh_m2.toFixed(0)} Wh/m²`;
    }

    const fspCellEl = document.getElementById('hab-fsp-cell');
    const fspSubEl = document.getElementById('hab-fsp-sub');
    if (fspCellEl && d.optimal_fission_power_cell) {
      fspCellEl.textContent = `[${d.optimal_fission_power_cell[0]}, ${d.optimal_fission_power_cell[1]}]`;
      if (fspSubEl && d.optimal_habitat_cell) {
        const distFsp = Math.hypot(
          d.optimal_fission_power_cell[0] - d.optimal_habitat_cell[0],
          d.optimal_fission_power_cell[1] - d.optimal_habitat_cell[1]
        ) * 25.0;
        fspSubEl.textContent = `${distFsp.toFixed(0)}m from Hab`;
      }
    }

    const listEl = document.getElementById('hab-candidates-list');
    if (listEl) {
      const cands = (d.top_candidates || []).slice(0, 3);
      if (cands.length === 0) {
        listEl.innerHTML = `<div style="color:#ff7a90; font-size:9.5px; padding:4px;">No cells passed all Boolean constraints. Increase Max Slope or adjust Blast Buffer.</div>`;
      } else {
        listEl.innerHTML = cands.map(c => {
          const rs = c.radar_scores || {};
          return `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:4px; padding:5px 7px;">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; margin-bottom:3px;">
                <strong style="color:#18e299;">#${c.rank} Cell [${c.cell[0]}, ${c.cell[1]}] — Score ${c.score.toFixed(1)}</strong>
                <span style="color:#8b9bb4; font-size:9px;">Slope ${c.slope_deg}° · Rock ${c.boulder_pct}% · ISRU ${c.isru_distance_m.toFixed(0)}m</span>
              </div>
              <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:3px; font-size:8px; color:#9aa5be;">
                <div>Slp: <strong style="color:#fff">${Math.round(rs.slope_score || 0)}</strong></div>
                <div>Bld: <strong style="color:#fff">${Math.round(rs.boulder_score || 0)}</strong></div>
                <div>Sol: <strong style="color:#fff">${Math.round(rs.solar_insolation_score || 0)}</strong></div>
                <div>H₂O: <strong style="color:#fff">${Math.round(rs.isru_proximity_score || 0)}</strong></div>
                <div>Sky: <strong style="color:#fff">${Math.round(rs.horizon_masking_score || 0)}</strong></div>
                <div>RF: <strong style="color:#fff">${Math.round(rs.comm_los_score || 0)}</strong></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    const shieldBox = document.getElementById('hab-shielding-box');
    if (shieldBox && d.radiation_shielding_analysis) {
      const rsa = d.radiation_shielding_analysis;
      const warnColor = rsa.secondary_neutron_spallation_hazard ? '#ff5e2b' : '#18e299';
      shieldBox.style.borderLeftColor = warnColor;
      shieldBox.innerHTML = `
        <div style="color:${warnColor}; font-weight:700; margin-bottom:2px;">${rsa.shielding_verdict}</div>
        <div style="color:#94a3b8; font-size:8.5px;">
          Horizon Sky-View Factor <strong>F<sub>sky</sub> = ${rsa.geometric_sky_view_factor}</strong> (${rsa.geometric_gcr_reduction_pct}% geometric GCR solid-angle reduction).
          ${d.uncertainty_disclosures.missing_data_penalty_applied ? '<span style="color:#ffab2e;">[6% Regional Proxy Uncertainty Applied]</span>' : '<span style="color:#18e299;">[Verified HiRISE/MOLA Coverage]</span>'}
        </div>
      `;
    }
  }

  function render2D(ctx, cellToPx) {
    if (!_state.data || !window.state) return;
    // Draw overlays when activeLayer is habitat_suitability
    if (window.state.activeLayer !== 'habitat_suitability' && !_state.showOverlayOnAllLayers) return;

    const d = _state.data;
    const [lzGx, lzGy] = d.landing_zone_cell || [40, 40];
    const lzPt = cellToPx(lzGx, lzGy);
    const pEdge = cellToPx(lzGx + 1, lzGy);
    const pxPerCell = Math.abs(pEdge.x - lzPt.x);
    const pxPerMeter = pxPerCell / 25.0;

    ctx.save();

    // 1. Draw HLS Plume Blast Exclusion Zone Ring (default 800m)
    const minBlastR = (d.thresholds_applied?.min_blast_buffer_m || 800.0) * pxPerMeter;
    ctx.beginPath();
    ctx.arc(lzPt.x, lzPt.y, minBlastR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 65, 85, 0.85)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 4]);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 65, 85, 0.9)';
    ctx.font = "bold 9.5px 'JetBrains Mono', monospace";
    ctx.fillText(`HLS BLAST EXCLUSION (${d.thresholds_applied?.min_blast_buffer_m || 800}m)`, lzPt.x - 75, lzPt.y - minBlastR + 12);

    // 2. Draw Specialized Infrastructure Markers: [HAB-OPT], [SOL-ARR], [FSP-PWR]
    const drawMarker = (cell, label, color, sub) => {
      if (!cell) return;
      const pt = cellToPx(cell[0], cell[1]);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(5, 12, 20, 0.88)';
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = color;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = color;
      ctx.fillText(label, pt.x + 12, pt.y - 2);
      if (sub) {
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(sub, pt.x + 12, pt.y + 9);
      }
    };

    drawMarker(d.optimal_solar_farm_cell, '[SOL-ARR]', '#ffab2e', 'Solar Array');
    drawMarker(d.optimal_fission_power_cell, '[FSP-PWR]', '#27d7ff', 'Kilopower Reactor');
    drawMarker(d.optimal_habitat_cell, '[HAB-OPT #1]', '#18e299', `Score ${d.suitability_score_max.toFixed(1)}`);

    ctx.restore();
  }

  function render3D(ctx, project3D, layers) {
    if (!_state.data || !window.state || window.state.activeLayer !== 'habitat_suitability') return;
    const d = _state.data;
    if (!d.optimal_habitat_cell) return;
    const [hx, hy] = d.optimal_habitat_cell;
    const zSurf = layers.elevation[hy][hx];
    const pBase = project3D(hx, hy, zSurf);
    const pTop = project3D(hx, hy, zSurf + 35);

    ctx.save();
    ctx.strokeStyle = '#18e299';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pBase.x, pBase.y);
    ctx.lineTo(pTop.x, pTop.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pTop.x, pTop.y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#18e299';
    ctx.fill();
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.fillStyle = '#18e299';
    ctx.fillText(`HAB-OPT (${d.suitability_score_max.toFixed(1)})`, pTop.x + 8, pTop.y + 3);
    ctx.restore();
  }

  return {
    init,
    onSiteChange,
    fetchSuitability,
    activateHabitatLayer,
    render2D,
    render3D,
    getState: () => _state
  };
})();

window.P2_HABITAT = P2_HABITAT;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => P2_HABITAT.init());
} else {
  P2_HABITAT.init();
}
