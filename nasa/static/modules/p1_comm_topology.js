/**
 * ARES-NAV P1 Feature 5: Communication-Aware Pathfinding & Portable UHF Relay Topology
 * Provides: Dynamic UHF link budget, knife-edge diffraction line-of-sight modeling,
 * portable tripod relay deployment set-cover planner, and tactical 2D/3D map visualization.
 */

const P1_COMM_TOPOLOGY = (() => {
  // ─── Module State ──────────────────────────────────────────────────────────
  let _state = {
    siteId: 'jezero',
    topology: null,
    showRelays: true,
    loading: false,
    selectedRelayId: null
  };

  // ─── Public API ────────────────────────────────────────────────────────────
  function init() {
    _injectDOM();
    _bindEvents();
    console.log('[P1] Communication-Aware Topology & Relay Planner initialized');
  }

  function onSiteChange(siteId) {
    if (!siteId) return;
    _state.siteId = siteId;
    _state.topology = null;
    _state.selectedRelayId = null;
    fetchTopology(siteId);
  }

  function onRouteResult(routeResult) {
    if (!routeResult) return;
    if (routeResult.comm_topology) {
      _state.topology = routeResult.comm_topology;
      _renderCard();
    } else if (routeResult.path && routeResult.path.length > 0) {
      // If route result does not embed comm_topology, recalculate via API
      fetchTopology(_state.siteId, routeResult.path);
    }
  }

  // ─── Data Fetching ─────────────────────────────────────────────────────────
  async function fetchTopology(siteId, path) {
    const sid = siteId || _state.siteId || 'jezero';
    _state.siteId = sid;
    _state.loading = true;
    _renderCard();

    try {
      let res;
      if (path && Array.isArray(path) && path.length > 0) {
        res = await fetch('/api/relay_topology', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: sid,
            path: path,
            max_relays: 2
          })
        });
      } else {
        res = await fetch(`/api/comm_topology?site_id=${encodeURIComponent(sid)}&max_relays=2`);
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      _state.topology = data;
      _state.loading = false;
      _renderCard();

      // Request scene redraw if renderScene is available
      if (typeof renderScene === 'function') {
        renderScene();
      }
    } catch (err) {
      console.warn('[P1 Comm Topology] Failed to fetch relay topology:', err);
      _state.loading = false;
      _renderCard();
    }
  }

  // ─── DOM Injection ─────────────────────────────────────────────────────────
  function _injectDOM() {
    if (document.getElementById('comm-relay-topology-card')) return;

    const parent = document.getElementById('hazard-breakdown-card') ||
                   document.querySelector('.panel-right .panel-section');
    if (!parent || !parent.parentNode) return;

    const card = document.createElement('div');
    card.id = 'comm-relay-topology-card';
    card.className = 'comm-relay-topology-card';
    card.innerHTML = `
      <div class="crt-header">
        <div class="crt-title-group">
          <span class="crt-icon">📡</span>
          <span class="crt-title expert-label" data-expert="PORTABLE UHF RELAY TOPOLOGY" data-beginner="RADIO COMM &amp; RELAYS">PORTABLE UHF RELAY TOPOLOGY</span>
        </div>
        <span class="crt-verdict-badge" id="crt-verdict-badge">DIRECT LOS NOMINAL</span>
      </div>

      <div class="crt-kpi-grid">
        <div class="crt-kpi-item">
          <span class="crt-kpi-label">DIRECT COMM</span>
          <strong class="crt-kpi-val" id="crt-direct-val">--%</strong>
          <span class="crt-kpi-sub" id="crt-direct-sub">No Dead Zones</span>
        </div>
        <div class="crt-kpi-item">
          <span class="crt-kpi-label">RESTORED COMM</span>
          <strong class="crt-kpi-val val-emerald" id="crt-restored-val">--%</strong>
          <span class="crt-kpi-sub val-cyan" id="crt-boost-sub">+0.0% Boost</span>
        </div>
        <div class="crt-kpi-item">
          <span class="crt-kpi-label">RELAYS NEEDED</span>
          <strong class="crt-kpi-val" id="crt-relays-val">0</strong>
          <span class="crt-kpi-sub">Tripod (2.5m Mast)</span>
        </div>
      </div>

      <div class="crt-controls-row">
        <label class="crt-check-label">
          <input type="checkbox" id="crt-chk-show-relays" checked />
          <span>Show Relays &amp; RF Beams on Map</span>
        </label>
        <button id="crt-btn-recalc" class="crt-btn-recalc" title="Recalculate relay positions for current route">↻ Recalculate</button>
      </div>

      <div class="crt-relays-list" id="crt-relays-list">
        <div class="crt-empty-state">Calculating Proximity-1 UHF line-of-sight &amp; viewshed...</div>
      </div>

      <div class="crt-rationale-box" id="crt-rationale-box">
        <span class="crt-rationale-text" id="crt-rationale-text">Direct Line-of-Sight is evaluated via 3D ray-marching against MOLA DEM.</span>
      </div>

      <div class="crt-provenance-box">
        <div class="crt-prov-title">PROXIMITY-1 RF LINK BUDGET SPECIFICATION</div>
        <div class="crt-prov-grid">
          <div><span>Frequency:</span> <strong>401.58 MHz UHF</strong></div>
          <div><span>TX Power:</span> <strong>5.0 W (+37 dBm)</strong></div>
          <div><span>RX Sensitivity:</span> <strong>-110.0 dBm</strong></div>
          <div><span>Antenna Gains:</span> <strong>TX +6dBi / RX +2dBi</strong></div>
          <div><span>Diffraction:</span> <strong>Knife-Edge + Bulk Rock</strong></div>
          <div><span>Mast Deploy:</span> <strong>Tripod (H=2.5m, Slope≤18°)</strong></div>
        </div>
      </div>
    `;

    // Insert right after atmospheric-drone-card if present, otherwise after hazard card
    const atmoCard = document.getElementById('atmospheric-drone-card');
    if (atmoCard && atmoCard.nextSibling) {
      atmoCard.parentNode.insertBefore(card, atmoCard.nextSibling);
    } else if (parent.nextSibling) {
      parent.parentNode.insertBefore(card, parent.nextSibling);
    } else {
      parent.parentNode.appendChild(card);
    }
  }

  // ─── Event Binding ─────────────────────────────────────────────────────────
  function _bindEvents() {
    const chk = document.getElementById('crt-chk-show-relays');
    if (chk) {
      chk.addEventListener('change', (e) => {
        _state.showRelays = e.target.checked;
        if (typeof renderScene === 'function') renderScene();
      });
    }

    const btnRecalc = document.getElementById('crt-btn-recalc');
    if (btnRecalc) {
      btnRecalc.addEventListener('click', () => {
        const path = (window.state && state.routeResult && state.routeResult.path) ? state.routeResult.path : null;
        fetchTopology(_state.siteId, path);
      });
    }
  }

  // ─── UI Rendering ──────────────────────────────────────────────────────────
  function _renderCard() {
    const badge = document.getElementById('crt-verdict-badge');
    const directVal = document.getElementById('crt-direct-val');
    const directSub = document.getElementById('crt-direct-sub');
    const restoredVal = document.getElementById('crt-restored-val');
    const boostSub = document.getElementById('crt-boost-sub');
    const relaysVal = document.getElementById('crt-relays-val');
    const relaysList = document.getElementById('crt-relays-list');
    const rationaleText = document.getElementById('crt-rationale-text');

    if (!badge || !directVal) return;

    if (_state.loading) {
      badge.textContent = 'EVALUATING RF...';
      badge.className = 'crt-verdict-badge badge-loading';
      if (relaysList) relaysList.innerHTML = '<div class="crt-empty-state">Running ray-marched terrain obstruction analysis...</div>';
      return;
    }

    const topo = _state.topology;
    if (!topo) {
      badge.textContent = 'NO DATA';
      badge.className = 'crt-verdict-badge';
      return;
    }

    // Verdict Badge
    const verdict = topo.verdict || 'RELAYS_UNNECESSARY';
    let badgeClass = 'crt-verdict-badge';
    if (verdict === 'FULL_RESTORE') {
      badgeClass += ' badge-emerald';
    } else if (verdict === 'PARTIAL_RESTORE') {
      badgeClass += ' badge-amber';
    } else if (verdict === 'RELAYS_UNNECESSARY') {
      badgeClass += ' badge-cyan';
    } else {
      badgeClass += ' badge-rose';
    }
    badge.textContent = topo.verdict_label || verdict;
    badge.className = badgeClass;

    // KPIs
    const directPct = topo.initial_comm_coverage_pct != null ? topo.initial_comm_coverage_pct : 100.0;
    const restoredPct = topo.restored_comm_coverage_pct != null ? topo.restored_comm_coverage_pct : directPct;
    const boostPct = topo.coverage_boost_pct != null ? topo.coverage_boost_pct : 0.0;
    const relaysCount = topo.recommended_relays ? topo.recommended_relays.length : 0;
    const shadowedCount = topo.shadowed_step_count != null ? topo.shadowed_step_count : 0;

    directVal.textContent = `${directPct.toFixed(1)}%`;
    directSub.textContent = shadowedCount > 0 ? `${shadowedCount} steps in dead zone` : 'Direct LOS clear';

    restoredVal.textContent = `${restoredPct.toFixed(1)}%`;
    boostSub.textContent = boostPct > 0 ? `+${boostPct.toFixed(1)}% Boost` : 'Optimal coverage';

    relaysVal.textContent = String(relaysCount);

    // Explainability Rationale
    if (rationaleText) {
      rationaleText.textContent = topo.explainability || 'Direct UHF Line-of-Sight to Habitat mast is maintained.';
    }

    // Relays Detail List
    if (relaysList) {
      if (!topo.recommended_relays || topo.recommended_relays.length === 0) {
        if (verdict === 'RELAYS_UNNECESSARY') {
          relaysList.innerHTML = `
            <div class="crt-nominal-note">
              <span>✓</span> Direct line-of-sight to the Habitat comm mast is verified across ≥ 92% of the traverse. No portable relay deployment required.
            </div>
          `;
        } else {
          relaysList.innerHTML = `
            <div class="crt-warning-note">
              <span>⚠️</span> Deep canyon/scarp walls obstruct radio viewshed. No safe tripod deployment position (slope ≤ 18°) was found that provides dual optical visibility to both the habitat mast and shadowed cells.
            </div>
          `;
        }
      } else {
        relaysList.innerHTML = topo.recommended_relays.map((r, i) => {
          const isSelected = _state.selectedRelayId === r.id;
          const lat = r.coordinates ? r.coordinates.lat.toFixed(4) : '--';
          const lon = r.coordinates ? r.coordinates.lon.toFixed(4) : '--';
          const slopeSafe = r.slope_deg <= 12.0 ? 'SAFE' : 'CAUTION';
          const backhaulMargin = r.backhaul ? r.backhaul.link_margin_db : (r.backhaul_link_margin_db || 0);

          return `
            <div class="crt-relay-item ${isSelected ? 'selected' : ''}" data-relay-id="${r.id}" data-gx="${r.gx}" data-gy="${r.gy}">
              <div class="cr-item-head">
                <div class="cr-head-left">
                  <span class="cr-badge">[R-${i === 0 ? 'α' : 'β'}]</span>
                  <strong class="cr-name">${r.name || r.id}</strong>
                </div>
                <button class="cr-btn-pan" data-gx="${r.gx}" data-gy="${r.gy}" title="Pan map to this relay candidate">📍 Pan</button>
              </div>

              <div class="cr-item-meta">
                <span>Grid: (${r.gx}, ${r.gy})</span>
                <span>Lat/Lon: ${lat}°, ${lon}°</span>
                <span>Elev: ${r.elevation_m}m</span>
              </div>

              <div class="cr-item-metrics">
                <div class="cr-metric">
                  <span class="crm-label">SLOPE / BOULDER</span>
                  <strong class="crm-val">${r.slope_deg}° · ${r.boulder_pct || 0}% <span class="badge-tag">${slopeSafe}</span></strong>
                </div>
                <div class="cr-metric">
                  <span class="crm-label">HABITAT BACKHAUL</span>
                  <strong class="crm-val val-cyan">+${backhaulMargin} dB (NOMINAL)</strong>
                </div>
                <div class="cr-metric">
                  <span class="crm-label">RESTORES</span>
                  <strong class="crm-val val-emerald">${r.supported_steps_count || (r.covered_steps ? r.covered_steps.length : 0)} route steps</strong>
                </div>
              </div>

              <div class="cr-item-rationale">${r.tactical_rationale || ''}</div>
            </div>
          `;
        }).join('');

        // Bind pan buttons
        relaysList.querySelectorAll('.cr-btn-pan').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const gx = parseInt(btn.getAttribute('data-gx'), 10);
            const gy = parseInt(btn.getAttribute('data-gy'), 10);
            _panToCell(gx, gy);
          });
        });

        // Click on relay row to select
        relaysList.querySelectorAll('.crt-relay-item').forEach((item) => {
          item.addEventListener('click', () => {
            const rid = item.getAttribute('data-relay-id');
            _state.selectedRelayId = (_state.selectedRelayId === rid) ? null : rid;
            _renderCard();
            if (typeof renderScene === 'function') renderScene();
          });
        });
      }
    }
  }

  function _panToCell(gx, gy) {
    if (window.state) {
      state.cam2d = state.cam2d || { panX: 0, panY: 0, zoom: 1 };
      const W = (window.marsCanvas ? marsCanvas.width : 600);
      const H = (window.marsCanvas ? marsCanvas.height : 600);
      const N = (state.siteData && state.siteData.site) ? state.siteData.site.grid_size : 80;
      const cellSize = (Math.min(W, H) / N) * state.cam2d.zoom;
      state.cam2d.panX = W * 0.5 - gx * cellSize;
      state.cam2d.panY = H * 0.5 - gy * cellSize;
      if (typeof renderScene === 'function') renderScene();
    }
  }

  // ─── 2D Map Canvas Rendering ───────────────────────────────────────────────
  function render2D(ctx, cellToPx) {
    if (!_state.showRelays || !_state.topology || !_state.topology.recommended_relays) return;
    const relays = _state.topology.recommended_relays;
    if (!relays || relays.length === 0) return;

    if (!window.state || !state.siteData || !state.siteData.site) return;
    const hab = state.siteData.site.habitat;
    const habPx = cellToPx(hab.gx, hab.gy);

    ctx.save();

    relays.forEach((r, idx) => {
      const rPx = cellToPx(r.gx, r.gy);
      const isSelected = _state.selectedRelayId === r.id;
      const relaySymbol = idx === 0 ? 'α' : 'β';

      // 1. Draw RF Backhaul line between Habitat and Relay
      ctx.beginPath();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(39, 215, 255, 0.75)';
      ctx.lineWidth = isSelected ? 2.5 : 1.6;
      ctx.moveTo(habPx.x, habPx.y);
      ctx.lineTo(rPx.x, rPx.y);
      ctx.stroke();

      // Draw RF link margin tag along midpoint
      const midX = (habPx.x + rPx.x) * 0.5;
      const midY = (habPx.y + rPx.y) * 0.5;
      const margin = r.backhaul ? r.backhaul.link_margin_db : (r.backhaul_link_margin_db || 0);

      ctx.setLineDash([]);
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      const tagText = `UHF +${margin}dB`;
      const textW = ctx.measureText(tagText).width;
      ctx.fillStyle = 'rgba(10, 16, 28, 0.88)';
      ctx.fillRect(midX - textW * 0.5 - 3, midY - 6, textW + 6, 12);
      ctx.strokeStyle = 'rgba(39, 215, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(midX - textW * 0.5 - 3, midY - 6, textW + 6, 12);
      ctx.fillStyle = '#27d7ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, midX, midY);

      // 2. Draw Coverage links to supported route steps
      if (r.covered_steps && state.routeResult && state.routeResult.path) {
        ctx.strokeStyle = 'rgba(24, 226, 153, 0.35)';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([2, 4]);
        r.covered_steps.forEach((stepIdx) => {
          if (stepIdx < state.routeResult.path.length) {
            const stepCell = state.routeResult.path[stepIdx];
            const sPx = cellToPx(stepCell.gx, stepCell.gy);
            ctx.beginPath();
            ctx.moveTo(rPx.x, rPx.y);
            ctx.lineTo(sPx.x, sPx.y);
            ctx.stroke();
          }
        });
        ctx.setLineDash([]);
      }

      // 3. Draw Relay Tripod Beacon Marker
      // Radiating RF wave arcs
      const timeMs = Date.now();
      const wavePhase = (timeMs % 1600) / 1600.0;
      const waveR = 8 + wavePhase * 14;
      ctx.beginPath();
      ctx.arc(rPx.x, rPx.y, waveR, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.strokeStyle = `rgba(39, 215, 255, ${0.8 * (1 - wavePhase)})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Tripod base icon
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(rPx.x, rPx.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = isSelected ? '#ffab2e' : '#27d7ff';
      ctx.stroke();

      // Mast center symbol
      ctx.fillStyle = isSelected ? '#ffab2e' : '#27d7ff';
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(relaySymbol, rPx.x, rPx.y);

      // Label Pill
      const lbl = `[R-${relaySymbol}]`;
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(9, 13, 20, 0.9)';
      ctx.fillRect(rPx.x + 11, rPx.y - 7, 34, 14);
      ctx.strokeStyle = isSelected ? '#ffab2e' : 'rgba(39, 215, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rPx.x + 11, rPx.y - 7, 34, 14);
      ctx.fillStyle = isSelected ? '#ffab2e' : '#27d7ff';
      ctx.fillText(lbl, rPx.x + 13, rPx.y + 1);
    });

    ctx.restore();
  }

  // ─── 3D Map Canvas Rendering ───────────────────────────────────────────────
  function render3D(ctx, project3D, layers) {
    if (!_state.showRelays || !_state.topology || !_state.topology.recommended_relays) return;
    const relays = _state.topology.recommended_relays;
    if (!relays || relays.length === 0) return;

    if (!window.state || !state.siteData || !state.siteData.site) return;
    const site = state.siteData.site;
    const [zMin, zMax] = site.elevation_range_m;
    const zSpan = Math.max(1, zMax - zMin);

    ctx.save();
    relays.forEach((r, idx) => {
      const zSurf = layers.elevation[r.gy][r.gx];
      const pBase = project3D(r.gx, r.gy, zSurf);
      const pTop = project3D(r.gx, r.gy, zSurf + zSpan * 0.14);
      const relaySymbol = idx === 0 ? 'R-α' : 'R-β';

      // Vertical mast
      ctx.strokeStyle = '#27d7ff';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(pBase.x, pBase.y);
      ctx.lineTo(pTop.x, pTop.y);
      ctx.stroke();

      // Beacon tip
      ctx.beginPath();
      ctx.arc(pTop.x, pTop.y, 4.0, 0, Math.PI * 2);
      ctx.fillStyle = '#27d7ff';
      ctx.fill();

      // Label
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#ffffff';
      ctx.fillText(relaySymbol, pTop.x + 6, pTop.y + 3);
    });
    ctx.restore();
  }

  return {
    init,
    onSiteChange,
    onRouteResult,
    fetchTopology,
    render2D,
    render3D
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', P1_COMM_TOPOLOGY.init);
} else {
  P1_COMM_TOPOLOGY.init();
}
