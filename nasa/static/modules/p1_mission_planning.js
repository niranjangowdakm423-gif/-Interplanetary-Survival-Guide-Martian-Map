/**
 * ARES-NAV P1 Mission Planning Module
 * Provides: Multi-objective route mode selector, route comparison matrix,
 * explainability dossier, and mission feasibility / PNR widget.
 *
 * Integrates with existing app.js state.routeResult which is populated by
 * /api/plan_route. All new P1 data is in routeResult.route_comparison_matrix,
 * routeResult.explainability, and routeResult.feasibility.
 */

const P1_MISSION_PLANNING = (() => {
  // ─── State ────────────────────────────────────────────────────────────────
  let _panelVisible = { comparison: false, explainability: false, feasibility: false };

  // ─── Route Mode Metadata ──────────────────────────────────────────────────
  const MODE_META = {
    shortest:       { icon: '📐', label: 'Shortest',       desc: 'Minimum distance traverse' },
    fastest:        { icon: '⚡', label: 'Fastest',        desc: 'Minimum mission clock time' },
    safest:         { icon: '🛡️', label: 'Safest',         desc: 'Maximum hazard avoidance' },
    lowest_resource:{ icon: '🔋', label: 'Min Resource',   desc: 'Lowest O₂ & energy draw' },
    min_radiation:  { icon: '☢️', label: 'Min Radiation',  desc: 'Radiation-shielded corridors' },
    comm_aware:     { icon: '📡', label: 'Comm Aware',     desc: 'Sustain habitat LOS comms' },
    science:        { icon: '🔬', label: 'Max Science',    desc: 'CRISM mineralogy corridors' },
    balanced:       { icon: '⚖️', label: 'Balanced',       desc: 'Multi-criteria equilibrium' }
  };

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    _injectStyles();
    _injectExpertModes();
    _injectPanelHooks();
    _injectFeasibilityBanner();
    console.log('[P1] Mission planning module initialized');
  }

  // ─── Extended Expert Mode Pills ────────────────────────────────────────────
  function _injectExpertModes() {
    const selector = document.getElementById('mode-selector');
    if (!selector) return;

    // Add missing expert modes (lowest_resource, min_radiation, comm_aware) if not present
    const existing = [...selector.querySelectorAll('[data-mode]')].map(b => b.dataset.mode);
    const extraModes = ['lowest_resource', 'min_radiation', 'comm_aware'];
    extraModes.forEach(m => {
      if (!existing.includes(m)) {
        const meta = MODE_META[m];
        const btn = document.createElement('button');
        btn.className = 'mode-pill';
        btn.dataset.mode = m;
        btn.setAttribute('aria-pressed', 'false');
        btn.title = meta.desc;
        btn.textContent = `${meta.icon} ${meta.label.toUpperCase()}`;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          if (window.state) window.state.routeMode = m;
          document.querySelectorAll('#beginner-route-modes .brm-btn').forEach(b => {
            const isAct = b.getAttribute('data-mode') === m;
            b.classList.toggle('active', isAct);
            b.setAttribute('aria-pressed', isAct ? 'true' : 'false');
          });
          if (typeof window.requestRoutePlan === 'function') window.requestRoutePlan();
        });
        selector.appendChild(btn);
      }
    });

    // Similarly for beginner mode buttons
    const brmContainer = document.getElementById('beginner-route-modes');
    const brmGrid = brmContainer ? (brmContainer.querySelector('.brm-grid') || brmContainer) : null;
    if (brmGrid) {
      const existingBrm = [...brmGrid.querySelectorAll('[data-mode]')].map(b => b.dataset.mode);
      if (!existingBrm.includes('lowest_resource')) {
        const btn = document.createElement('button');
        btn.className = 'brm-btn';
        btn.dataset.mode = 'lowest_resource';
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML = `<span>🔋</span><strong>Save Resources</strong><small>Minimize oxygen & energy</small>`;
        btn.addEventListener('click', () => {
          if (window.state) window.state.routeMode = 'lowest_resource';
          brmGrid.querySelectorAll('.brm-btn').forEach(b => {
            const isAct = b === btn;
            b.classList.toggle('active', isAct);
            b.setAttribute('aria-pressed', isAct ? 'true' : 'false');
          });
          document.querySelectorAll('#mode-selector .mode-pill').forEach(p => {
            const isAct = p.getAttribute('data-mode') === 'lowest_resource';
            p.classList.toggle('active', isAct);
            p.setAttribute('aria-pressed', isAct ? 'true' : 'false');
          });
          if (typeof window.requestRoutePlan === 'function') window.requestRoutePlan();
        });
        brmGrid.appendChild(btn);
      }
    }
  }

  // ─── Panel Toggle Hooks ────────────────────────────────────────────────────
  function _injectPanelHooks() {
    // Create the P1 action bar
    const actionBar = document.createElement('div');
    actionBar.id = 'p1-action-bar';
    actionBar.className = 'p1-action-bar';
    actionBar.innerHTML = `
      <button class="p1-panel-btn" id="btn-compare-routes" title="Compare all 7 route optimization modes">
        📊 Compare Routes
      </button>
      <button class="p1-panel-btn" id="btn-explain-route" title="View route rationale and NASA STD-3001 compliance">
        🔍 Explain Route
      </button>
      <button class="p1-panel-btn" id="btn-feasibility" title="Mission feasibility and Point of No Return analysis">
        ✅ Feasibility
      </button>
    `;

    // Insert after the waypoint box or kpi grid
    const wpBox = document.querySelector('.waypoint-box') || document.querySelector('.kpi-grid');
    if (wpBox && wpBox.parentNode) {
      wpBox.parentNode.insertBefore(actionBar, wpBox.nextSibling);
    } else {
      const leftPanel = document.querySelector('.panel-left') || document.querySelector('.left-panel') || document.querySelector('.sidebar');
      if (leftPanel) leftPanel.appendChild(actionBar);
    }

    // Build panels
    _buildComparisonPanel();
    _buildExplainabilityPanel();
    _buildFeasibilityPanel();

    // Wire toggle buttons
    document.getElementById('btn-compare-routes')?.addEventListener('click', () => togglePanel('comparison'));
    document.getElementById('btn-explain-route')?.addEventListener('click', () => togglePanel('explainability'));
    document.getElementById('btn-feasibility')?.addEventListener('click', () => togglePanel('feasibility'));
  }

  function _buildComparisonPanel() {
    const panel = document.createElement('div');
    panel.id = 'p1-comparison-panel';
    panel.className = 'p1-panel hidden';
    panel.innerHTML = `
      <div class="p1-panel-header">
        <span class="p1-panel-title">📊 Route Comparison Matrix</span>
        <button class="p1-panel-close" onclick="P1_MISSION_PLANNING.togglePanel('comparison')">✕</button>
      </div>
      <div class="p1-panel-body" id="p1-comparison-body">
        <div class="p1-empty">Plan a route first to see multi-objective comparison.</div>
      </div>
    `;
    document.body.appendChild(panel);
  }

  function _buildExplainabilityPanel() {
    const panel = document.createElement('div');
    panel.id = 'p1-explain-panel';
    panel.className = 'p1-panel hidden';
    panel.innerHTML = `
      <div class="p1-panel-header">
        <span class="p1-panel-title">🔍 Route Explainability Dossier</span>
        <button class="p1-panel-close" onclick="P1_MISSION_PLANNING.togglePanel('explainability')">✕</button>
      </div>
      <div class="p1-panel-body" id="p1-explain-body">
        <div class="p1-empty">Plan a route first to view the explainability dossier.</div>
      </div>
    `;
    document.body.appendChild(panel);
  }

  function _buildFeasibilityPanel() {
    const panel = document.createElement('div');
    panel.id = 'p1-feasibility-panel';
    panel.className = 'p1-panel hidden';
    panel.innerHTML = `
      <div class="p1-panel-header">
        <span class="p1-panel-title">✅ Mission Feasibility Report</span>
        <button class="p1-panel-close" onclick="P1_MISSION_PLANNING.togglePanel('feasibility')">✕</button>
      </div>
      <div class="p1-panel-body" id="p1-feasibility-body">
        <div class="p1-empty">Plan a route to see mission feasibility and PNR analysis.</div>
      </div>
    `;
    document.body.appendChild(panel);
  }

  // ─── Feasibility inline banner (always visible after route plan) ───────────
  function _injectFeasibilityBanner() {
    const banner = document.createElement('div');
    banner.id = 'p1-feasibility-banner';
    banner.className = 'p1-feasibility-banner hidden';
    banner.innerHTML = `
      <span id="p1-verdict-icon">✅</span>
      <span id="p1-verdict-text">FEASIBLE</span>
      <span id="p1-verdict-detail" class="p1-verdict-detail"></span>
      <button class="p1-verdict-btn" onclick="P1_MISSION_PLANNING.togglePanel('feasibility')">Details →</button>
    `;

    const compBody = document.getElementById('comp-body-text');
    if (compBody && compBody.parentNode) {
      compBody.parentNode.insertBefore(banner, compBody.nextSibling);
    }
  }

  // ─── Public API: Called by app.js after every route plan ──────────────────
  function onRouteResult(routeResult) {
    if (!routeResult) return;

    if (routeResult.route_comparison_matrix) {
      _renderComparisonMatrix(routeResult.route_comparison_matrix, routeResult.mode);
    }
    if (routeResult.explainability) {
      _renderExplainability(routeResult.explainability);
    }
    if (routeResult.feasibility) {
      _renderFeasibility(routeResult.feasibility);
      _renderFeasibilityBanner(routeResult.feasibility);
    }

    // Show action bar buttons
    document.getElementById('p1-action-bar')?.classList.add('p1-active');
  }

  // ─── Comparison Matrix Renderer ────────────────────────────────────────────
  function _renderComparisonMatrix(matrix, currentMode) {
    const body = document.getElementById('p1-comparison-body');
    if (!body) return;

    const scoreBar = (val, max = 100) => {
      const pct = Math.round(Math.min(100, Math.max(0, (val / max) * 100)));
      const color = pct >= 70 ? '#10b981' : pct >= 45 ? '#f59e0b' : '#ef4444';
      return `<div class="p1-score-bar-wrap"><div class="p1-score-bar" style="width:${pct}%;background:${color}"></div></div>`;
    };

    const rows = matrix.map(m => {
      const meta = MODE_META[m.mode] || { icon: '🔵', label: m.mode };
      const isSelected = m.mode === currentMode;
      const selClass = isSelected ? 'p1-row-selected' : '';
      const statusIcons = [
        m.safety_index >= 75 ? '🛡️' : m.safety_index >= 55 ? '⚠️' : '🔴',
        m.o2_liters < 100 ? '🔋' : m.o2_liters < 200 ? '⚡' : '⛽',
        m.min_comm_los_pct >= 70 ? '📡' : '📶',
      ].join(' ');

      return `
        <tr class="p1-matrix-row ${selClass}" title="${meta.desc}">
          <td class="p1-mode-cell">${meta.icon} ${meta.label} ${isSelected ? '<span class="p1-selected-badge">ACTIVE</span>' : ''}</td>
          <td>${m.distance_km} km</td>
          <td>${m.duration_min} min</td>
          <td>${m.o2_liters} L</td>
          <td>${m.safety_index}%</td>
          <td>${m.radiation_dose_uSv} µSv</td>
          <td>${m.min_comm_los_pct}%</td>
          <td>
            ${scoreBar(m.composite_score)}
            <span class="p1-score-val">${m.composite_score}</span>
          </td>
          <td>${statusIcons}</td>
        </tr>`;
    }).join('');

    body.innerHTML = `
      <p class="p1-matrix-note">Comparison of 7 multi-objective route modes for the same waypoints. Active mode highlighted.</p>
      <div class="p1-table-wrap">
        <table class="p1-matrix-table">
          <thead>
            <tr>
              <th>Mode</th>
              <th>Dist</th>
              <th>Time</th>
              <th>O₂</th>
              <th>Safety</th>
              <th>Radiation</th>
              <th>Min Comm</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="p1-matrix-note">Score = weighted composite (30% safety + 20% O₂ efficiency + 20% speed + 15% comms + 15% slope). Higher is better.</p>
    `;
  }

  // ─── Explainability Renderer ───────────────────────────────────────────────
  function _renderExplainability(ex) {
    const body = document.getElementById('p1-explain-body');
    if (!body) return;

    const tradeoffItems = (ex.key_tradeoffs || []).map(t => `<li>${t}</li>`).join('');
    const constraintItems = (ex.hard_constraints || []).map(c => `<li>${c}</li>`).join('');
    const prefItems = (ex.soft_preferences || []).map(p => `<li>${p}</li>`).join('');

    const complianceRows = (ex.nasa_compliance || []).map(nc => {
      const color = nc.status === 'PASS' ? '#10b981' : nc.status === 'WARNING' ? '#f59e0b' : nc.status === 'CAUTION' ? '#f59e0b' : '#ef4444';
      const icon = nc.status === 'PASS' ? '✅' : nc.status === 'WARNING' ? '⚠️' : nc.status === 'CAUTION' ? '⚡' : '🚨';
      return `
        <tr>
          <td style="color:#8b9bb4;font-size:10px">${nc.standard}</td>
          <td>${nc.metric}</td>
          <td style="font-weight:600;color:#cdd6f4">${nc.value}</td>
          <td style="color:#6b7a9d;font-size:10px">${nc.limit}</td>
          <td style="color:${color};font-weight:700">${icon} ${nc.status}</td>
        </tr>`;
    }).join('');

    body.innerHTML = `
      <div class="p1-ex-title">${ex.title || ex.mode?.toUpperCase()}</div>
      <div class="p1-ex-section">
        <div class="p1-ex-label">Scientific Rationale</div>
        <p class="p1-ex-text">${ex.rationale}</p>
      </div>

      <div class="p1-ex-section">
        <div class="p1-ex-label">Key Trade-offs vs Shortest Path</div>
        <ul class="p1-ex-list">${tradeoffItems}</ul>
      </div>

      <div class="p1-ex-cols">
        <div>
          <div class="p1-ex-label">Hard Constraints</div>
          <ul class="p1-ex-list p1-ex-hard">${constraintItems}</ul>
        </div>
        <div>
          <div class="p1-ex-label">Soft Preferences</div>
          <ul class="p1-ex-list p1-ex-soft">${prefItems}</ul>
        </div>
      </div>

      <div class="p1-ex-section">
        <div class="p1-ex-label">NASA STD-3001 Compliance</div>
        <div class="p1-table-wrap">
          <table class="p1-compliance-table">
            <thead><tr><th>Standard</th><th>Metric</th><th>Value</th><th>Limit</th><th>Status</th></tr></thead>
            <tbody>${complianceRows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ─── Feasibility Renderer ─────────────────────────────────────────────────
  function _renderFeasibility(feas) {
    const body = document.getElementById('p1-feasibility-body');
    if (!body) return;

    const color = feas.status_color || (feas.verdict === 'FEASIBLE' ? '#10b981' : feas.verdict === 'MARGINAL' ? '#f59e0b' : '#ef4444');
    const rtrip = feas.total_roundtrip || {};
    const pnr = feas.pnr || {};
    const checks = feas.nasa_std_3001_checks || {};

    const o2MarginBar = _marginBar(rtrip.remaining_o2_pct || 0, feas.reserve_margin_pct || 20);
    const batMarginBar = _marginBar(rtrip.remaining_battery_pct || 0, feas.reserve_margin_pct || 20);

    const pnrColor = pnr.pnr_reached ? '#ef4444' : '#10b981';
    const pnrIcon = pnr.pnr_reached ? '🚨' : '✅';

    const recItems = (feas.recommendations || []).map(r => `<li class="p1-rec-item">${r}</li>`).join('');

    const marginRows = (feas.waypoint_margins || []).map((wm, i) => {
      const warn = wm.breaches_reserve;
      const rowClass = warn ? 'p1-margin-warn' : '';
      return `
        <tr class="${rowClass}">
          <td>${wm.name || `WP-${i+1}`}</td>
          <td>${wm.cumulative_o2_l} L</td>
          <td>${wm.return_o2_l} L</td>
          <td style="color:${warn ? '#ef4444' : '#10b981'};font-weight:600">${wm.o2_margin_pct}%</td>
          <td style="color:${warn ? '#ef4444' : '#10b981'};font-weight:600">${wm.battery_margin_pct}%</td>
          <td>${wm.return_duration_min} min</td>
          <td>${warn ? '🚨 BREACH' : '✅ OK'}</td>
        </tr>`;
    }).join('');

    const stdChecks = Object.entries({
      'O₂ Contingency': checks.o2_contingency_met,
      'Battery Reserve': checks.battery_contingency_met,
      'EVA Duration': checks.max_eva_time_met,
      'Metabolic Rate': checks.metabolic_rate_acceptable
    }).map(([k, v]) => `
      <span class="p1-std-check ${v ? 'p1-std-ok' : 'p1-std-fail'}">
        ${v ? '✅' : '❌'} ${k}
      </span>`).join('');

    body.innerHTML = `
      <div class="p1-verdict-block" style="border-color:${color}">
        <div class="p1-verdict-label" style="color:${color}">${feas.verdict}</div>
        <div class="p1-verdict-title">${feas.title}</div>
        <div class="p1-std-checks">${stdChecks}</div>
      </div>

      <div class="p1-feas-section">
        <div class="p1-ex-label">Round-Trip Consumable Budget</div>
        <div class="p1-feas-grid">
          <div class="p1-feas-cell">
            <div class="p1-feas-metric">O₂ Total</div>
            <div class="p1-feas-val">${rtrip.o2_liters} L</div>
            <div class="p1-feas-sub">outbound + return</div>
          </div>
          <div class="p1-feas-cell">
            <div class="p1-feas-metric">O₂ Remaining</div>
            <div class="p1-feas-val" style="color:${color}">${rtrip.remaining_o2_liters} L</div>
            ${o2MarginBar}
            <div class="p1-feas-sub">${rtrip.remaining_o2_pct}% of capacity</div>
          </div>
          <div class="p1-feas-cell">
            <div class="p1-feas-metric">Battery Total</div>
            <div class="p1-feas-val">${rtrip.battery_wh} Wh</div>
            <div class="p1-feas-sub">PLSS avionics + traverse</div>
          </div>
          <div class="p1-feas-cell">
            <div class="p1-feas-metric">Battery Remaining</div>
            <div class="p1-feas-val" style="color:${color}">${rtrip.remaining_battery_wh} Wh</div>
            ${batMarginBar}
            <div class="p1-feas-sub">${rtrip.remaining_battery_pct}% of capacity</div>
          </div>
          <div class="p1-feas-cell">
            <div class="p1-feas-metric">Total Duration</div>
            <div class="p1-feas-val">${rtrip.duration_hr} hr</div>
            <div class="p1-feas-sub">${rtrip.duration_min} min round-trip</div>
          </div>
          <div class="p1-feas-cell">
            <div class="p1-feas-metric">Total Distance</div>
            <div class="p1-feas-val">${rtrip.distance_km} km</div>
            <div class="p1-feas-sub">outbound + return leg</div>
          </div>
          <div class="p1-feas-cell">
            <div class="p1-feas-metric">Radiation Dose</div>
            <div class="p1-feas-val">${rtrip.radiation_uSv} µSv</div>
            <div class="p1-feas-sub">round-trip total dose</div>
          </div>
          <div class="p1-feas-cell">
            <div class="p1-feas-metric">Time Remaining</div>
            <div class="p1-feas-val">${rtrip.remaining_time_min} min</div>
            <div class="p1-feas-sub">before EVA hard limit</div>
          </div>
        </div>
      </div>

      <div class="p1-feas-section">
        <div class="p1-ex-label" style="color:${pnrColor}">${pnrIcon} Point of No Return</div>
        <div class="p1-pnr-desc">${pnr.description}</div>
      </div>

      ${marginRows ? `
      <div class="p1-feas-section">
        <div class="p1-ex-label">Per-Waypoint Return Margin</div>
        <div class="p1-table-wrap">
          <table class="p1-matrix-table">
            <thead>
              <tr><th>Waypoint</th><th>O₂ Used</th><th>Return O₂</th><th>O₂ Margin</th><th>Bat Margin</th><th>Return Time</th><th>Status</th></tr>
            </thead>
            <tbody>${marginRows}</tbody>
          </table>
        </div>
      </div>` : ''}

      <div class="p1-feas-section">
        <div class="p1-ex-label">Mission Controller Recommendations</div>
        <ul class="p1-ex-list p1-rec-list">${recItems}</ul>
      </div>
    `;
  }

  function _marginBar(pct, threshold) {
    const capped = Math.max(0, Math.min(100, pct));
    const color = pct >= threshold + 10 ? '#10b981' : pct >= threshold ? '#f59e0b' : '#ef4444';
    const threshPos = Math.min(98, threshold);
    return `
      <div class="p1-margin-bar-outer">
        <div class="p1-margin-bar-fill" style="width:${capped}%;background:${color}"></div>
        <div class="p1-margin-bar-thresh" style="left:${threshPos}%"></div>
      </div>`;
  }

  // ─── Feasibility Banner (inline summary) ──────────────────────────────────
  function _renderFeasibilityBanner(feas) {
    const banner = document.getElementById('p1-feasibility-banner');
    if (!banner) return;
    banner.classList.remove('hidden');

    const color = feas.status_color || '#10b981';
    const icons = { FEASIBLE: '✅', MARGINAL: '⚠️', CRITICAL: '🚨' };
    const rtrip = feas.total_roundtrip || {};

    document.getElementById('p1-verdict-icon').textContent = icons[feas.verdict] || '✅';
    const vt = document.getElementById('p1-verdict-text');
    vt.textContent = feas.verdict;
    vt.style.color = color;

    const detail = document.getElementById('p1-verdict-detail');
    if (feas.pnr?.pnr_reached) {
      detail.textContent = `PNR at "${feas.pnr.pnr_waypoint_name}"`;
      detail.style.color = '#ef4444';
    } else {
      detail.textContent = `O₂: ${rtrip.remaining_o2_pct}%  Bat: ${rtrip.remaining_battery_pct}% reserve`;
      detail.style.color = '#8b9bb4';
    }
  }

  // ─── Panel Toggle ─────────────────────────────────────────────────────────
  function togglePanel(name) {
    const panelIds = { comparison: 'p1-comparison-panel', explainability: 'p1-explain-panel', feasibility: 'p1-feasibility-panel' };
    const btnIds = { comparison: 'btn-compare-routes', explainability: 'btn-explain-route', feasibility: 'btn-feasibility' };

    _panelVisible[name] = !_panelVisible[name];

    Object.entries(panelIds).forEach(([k, id]) => {
      const panel = document.getElementById(id);
      if (!panel) return;
      if (k === name && _panelVisible[name]) {
        panel.classList.remove('hidden');
        panel.classList.add('p1-panel-open');
        _positionPanel(panel);
      } else {
        panel.classList.add('hidden');
        panel.classList.remove('p1-panel-open');
        _panelVisible[k] = false;
      }
    });

    Object.entries(btnIds).forEach(([k, id]) => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.toggle('p1-btn-active', _panelVisible[k]);
    });
  }

  function _positionPanel(panel) {
    // Position floating panel near the action bar
    const bar = document.getElementById('p1-action-bar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 8}px`;
    panel.style.left = `${Math.max(8, rect.left)}px`;
  }

  // ─── CSS Injection ────────────────────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('p1-styles')) return;
    const style = document.createElement('style');
    style.id = 'p1-styles';
    style.textContent = `
      /* ── P1 Action Bar ── */
      .p1-action-bar {
        display: none;
        gap: 4px;
        padding: 6px 8px 4px;
        border-top: 1px solid rgba(255,255,255,0.08);
        background: rgba(10,15,30,0.5);
        flex-wrap: wrap;
      }
      .p1-action-bar.p1-active { display: flex; }
      .p1-panel-btn {
        flex: 1;
        min-width: 90px;
        padding: 5px 8px;
        background: rgba(24, 226, 153, 0.08);
        border: 1px solid rgba(24, 226, 153, 0.25);
        border-radius: 5px;
        color: #18e299;
        font-size: 10px;
        font-family: 'JetBrains Mono', monospace;
        cursor: pointer;
        transition: all 0.15s;
        letter-spacing: 0.03em;
      }
      .p1-panel-btn:hover, .p1-panel-btn.p1-btn-active {
        background: rgba(24, 226, 153, 0.18);
        border-color: #18e299;
        color: #fff;
      }

      /* ── Feasibility Banner ── */
      .p1-feasibility-banner {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 5px 8px;
        background: rgba(10,15,30,0.7);
        border-top: 1px solid rgba(255,255,255,0.08);
        font-size: 10px;
        font-family: 'JetBrains Mono', monospace;
      }
      .p1-feasibility-banner.hidden { display: none; }
      #p1-verdict-text { font-weight: 700; letter-spacing: 0.08em; }
      .p1-verdict-detail { flex: 1; color: #8b9bb4; }
      .p1-verdict-btn {
        padding: 3px 8px;
        background: transparent;
        border: 1px solid rgba(139,155,180,0.3);
        border-radius: 4px;
        color: #8b9bb4;
        font-size: 10px;
        cursor: pointer;
        font-family: 'JetBrains Mono', monospace;
      }
      .p1-verdict-btn:hover { border-color: #18e299; color: #18e299; }

      /* ── Floating Panels ── */
      .p1-panel {
        position: fixed;
        z-index: 9800;
        width: min(680px, 95vw);
        max-height: 75vh;
        background: #0d1117;
        border: 1px solid rgba(24, 226, 153, 0.3);
        border-radius: 10px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.6);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: opacity 0.15s;
      }
      .p1-panel.hidden { display: none; }
      .p1-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: rgba(24, 226, 153, 0.07);
        border-bottom: 1px solid rgba(24, 226, 153, 0.15);
        flex-shrink: 0;
      }
      .p1-panel-title {
        font-size: 11px;
        font-weight: 700;
        color: #18e299;
        letter-spacing: 0.06em;
        font-family: 'JetBrains Mono', monospace;
      }
      .p1-panel-close {
        background: transparent;
        border: none;
        color: #8b9bb4;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        padding: 2px 4px;
        border-radius: 3px;
      }
      .p1-panel-close:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
      .p1-panel-body {
        overflow-y: auto;
        padding: 12px 14px;
        font-size: 11px;
        color: #cdd6f4;
        font-family: 'JetBrains Mono', monospace;
        flex: 1;
      }
      .p1-empty { color: #4a5568; text-align: center; padding: 24px 0; }

      /* ── Matrix Table ── */
      .p1-table-wrap { overflow-x: auto; border-radius: 6px; }
      .p1-matrix-table, .p1-compliance-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
      }
      .p1-matrix-table th, .p1-compliance-table th {
        background: rgba(255,255,255,0.05);
        color: #8b9bb4;
        padding: 5px 8px;
        text-align: left;
        font-weight: 600;
        white-space: nowrap;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .p1-matrix-table td, .p1-compliance-table td {
        padding: 5px 8px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        white-space: nowrap;
        vertical-align: middle;
      }
      .p1-matrix-row:hover td { background: rgba(255,255,255,0.03); }
      .p1-row-selected td { background: rgba(24,226,153,0.07); }
      .p1-row-selected .p1-mode-cell { color: #18e299; font-weight: 700; }
      .p1-selected-badge {
        background: rgba(24,226,153,0.15);
        color: #18e299;
        border-radius: 3px;
        padding: 1px 5px;
        font-size: 9px;
        letter-spacing: 0.05em;
        margin-left: 4px;
      }
      .p1-score-bar-wrap { background: rgba(255,255,255,0.08); border-radius: 3px; height: 6px; width: 60px; overflow: hidden; display: inline-block; vertical-align: middle; }
      .p1-score-bar { height: 100%; border-radius: 3px; transition: width 0.3s; }
      .p1-score-val { font-size: 10px; color: #cdd6f4; margin-left: 4px; }
      .p1-matrix-note { color: #4a5568; font-size: 9px; margin: 6px 0 2px; }
      .p1-margin-warn td { background: rgba(239,68,68,0.06); }

      /* ── Explainability ── */
      .p1-ex-title {
        font-size: 13px;
        font-weight: 700;
        color: #18e299;
        margin-bottom: 10px;
        letter-spacing: 0.04em;
      }
      .p1-ex-section { margin-bottom: 12px; }
      .p1-ex-label {
        font-size: 9px;
        font-weight: 700;
        color: #39d0ff;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 5px;
        border-bottom: 1px solid rgba(57,208,255,0.15);
        padding-bottom: 3px;
      }
      .p1-ex-text { color: #9aa5be; line-height: 1.6; margin: 0; font-size: 10.5px; }
      .p1-ex-list { margin: 0; padding-left: 16px; color: #9aa5be; line-height: 1.8; }
      .p1-ex-hard li::marker { color: #ef4444; }
      .p1-ex-soft li::marker { color: #f59e0b; }
      .p1-ex-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }

      /* ── Feasibility ── */
      .p1-verdict-block {
        border: 1.5px solid #10b981;
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 12px;
        background: rgba(16,185,129,0.05);
      }
      .p1-verdict-label { font-size: 15px; font-weight: 900; letter-spacing: 0.12em; }
      .p1-verdict-title { font-size: 10px; color: #9aa5be; margin-top: 2px; }
      .p1-std-checks { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      .p1-std-check { font-size: 9px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
      .p1-std-ok { background: rgba(16,185,129,0.12); color: #10b981; }
      .p1-std-fail { background: rgba(239,68,68,0.12); color: #ef4444; }
      .p1-feas-section { margin-bottom: 12px; }
      .p1-feas-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
      .p1-feas-cell { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 6px; padding: 7px 8px; }
      .p1-feas-metric { font-size: 8px; color: #6b7a9d; text-transform: uppercase; letter-spacing: 0.08em; }
      .p1-feas-val { font-size: 14px; font-weight: 700; color: #cdd6f4; margin: 2px 0; }
      .p1-feas-sub { font-size: 8px; color: #4a5568; }
      .p1-pnr-desc { color: #9aa5be; line-height: 1.6; font-size: 10.5px; padding: 6px 0; }
      .p1-rec-list { }
      .p1-rec-item { color: #9aa5be; margin-bottom: 4px; line-height: 1.6; }
      .p1-margin-bar-outer { position: relative; background: rgba(255,255,255,0.08); border-radius: 3px; height: 4px; margin: 3px 0; overflow: visible; }
      .p1-margin-bar-fill { height: 100%; border-radius: 3px; }
      .p1-margin-bar-thresh { position: absolute; top: -3px; bottom: -3px; width: 2px; background: rgba(255,255,255,0.3); border-radius: 1px; }

      /* ── Responsive ── */
      @media (max-width: 600px) {
        .p1-feas-grid { grid-template-columns: repeat(2, 1fr); }
        .p1-ex-cols { grid-template-columns: 1fr; }
        .p1-panel { width: 97vw; left: 1.5vw !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return { init, onRouteResult, togglePanel };
})();

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', P1_MISSION_PLANNING.init);
} else {
  P1_MISSION_PLANNING.init();
}
