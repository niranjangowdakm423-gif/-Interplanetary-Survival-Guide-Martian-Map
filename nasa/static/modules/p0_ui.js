/**
 * ARES-NAV // NASA Space Apps Challenge
 * Module: p0_ui.js
 * 
 * Handles the Beginner/Expert interface mode toggle, mode-dependent UI switching,
 * contextual help tooltips, synchronized beginner/expert controls (layer picker,
 * route mode pills, slope slider), beginner site summary card, and target manifest
 * category filtering.
 *
 * Exposes:
 *  - window.P0_UI: Controller object with init, setMode, applyMode, updateLabelsForMode, etc.
 *  - window.p0State.interfaceMode: 'beginner' | 'expert'
 */

// Initialize global p0State without touching existing app.js state
window.p0State = window.p0State || {};
var p0State = window.p0State;
p0State.interfaceMode = p0State.interfaceMode || "beginner";
p0State.manifestFilter = p0State.manifestFilter || "all";

(function () {
  "use strict";

  const STORAGE_KEY = "ares_nav_interface_mode";

  // ---------------------------------------------------------------------------
  // 1. INJECT STYLES FOR P0 UI COMPONENTS (Self-contained HUD Styling)
  // ---------------------------------------------------------------------------
  function injectP0Styles() {
    if (document.getElementById("p0-ui-injected-styles")) return;

    const styleEl = document.createElement("style");
    styleEl.id = "p0-ui-injected-styles";
    styleEl.textContent = `
      /* Mode Toggle Container in Top Navigation Bar */
      .mode-toggle-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(13, 19, 29, 0.85);
        padding: 3px 6px;
        border: 1px solid rgba(255, 120, 70, 0.28);
        border-radius: 6px;
      }
      .mode-toggle-label {
        font-family: var(--font-mono, 'JetBrains Mono', monospace);
        font-size: 9.5px;
        font-weight: 800;
        letter-spacing: 0.8px;
        color: var(--mars-amber, #ffab2e);
      }
      .mode-toggle {
        display: flex;
        gap: 3px;
      }
      .mode-toggle-btn {
        background: transparent;
        color: var(--text-muted, #8b9bb4);
        border: 1px solid transparent;
        padding: 4px 9px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.16s ease;
        line-height: 1.2;
      }
      .mode-toggle-btn:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.08);
      }
      .mode-toggle-btn.active {
        background: linear-gradient(135deg, rgba(255, 94, 43, 0.25), rgba(255, 171, 46, 0.18));
        color: #ffffff;
        border-color: var(--mars-orange, #ff5e2b);
        box-shadow: 0 0 10px rgba(255, 94, 43, 0.35);
      }

      /* Section Help Tooltip Trigger Button */
      .section-help-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: var(--text-muted, #8b9bb4);
        width: 17px;
        height: 17px;
        border-radius: 50%;
        font-size: 10px;
        font-weight: 800;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        margin-left: auto;
        padding: 0;
        transition: all 0.15s ease;
        flex-shrink: 0;
      }
      .section-help-btn:hover,
      .section-help-btn.active {
        background: rgba(39, 215, 255, 0.22);
        color: #ffffff;
        border-color: var(--cyan-hud, #27d7ff);
        box-shadow: 0 0 8px rgba(39, 215, 255, 0.4);
      }

      /* Global Contextual Help Tooltip */
      .global-tooltip {
        position: fixed;
        z-index: 10000;
        background: rgba(10, 15, 24, 0.96);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid var(--cyan-hud, #27d7ff);
        border-radius: 6px;
        padding: 9px 12px;
        color: #edf2f8;
        font-size: 11px;
        line-height: 1.45;
        max-width: 280px;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.8), 0 0 14px rgba(39, 215, 255, 0.25);
        pointer-events: auto;
        transition: opacity 0.15s ease, transform 0.15s ease;
      }

      /* Beginner Mode Simplified Layer Picker */
      .beginner-layer-picker {
        margin-bottom: 8px;
      }
      .blp-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .blp-btn {
        background: #0d131d;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        padding: 7px 8px;
        text-align: left;
        cursor: pointer;
        color: var(--text-main, #edf2f8);
        display: flex;
        flex-direction: column;
        gap: 2px;
        transition: all 0.15s ease;
      }
      .blp-btn:hover {
        background: var(--bg-card-hover, #192436);
        border-color: rgba(39, 215, 255, 0.35);
      }
      .blp-btn.active {
        background: rgba(255, 94, 43, 0.14);
        border-color: var(--mars-orange, #ff5e2b);
        box-shadow: inset 2px 0 0 var(--mars-orange, #ff5e2b);
      }
      .blp-icon {
        font-size: 14px;
        line-height: 1;
        margin-bottom: 2px;
      }
      .blp-btn strong {
        font-size: 11px;
        font-weight: 700;
        color: #fff;
      }
      .blp-btn span {
        font-size: 9.5px;
        color: var(--text-muted, #8b9bb4);
      }

      /* Beginner Mode Simplified Route Mode Selector */
      .beginner-route-modes {
        margin-bottom: 9px;
      }
      .beginner-hint {
        font-size: 10px;
        color: var(--text-muted, #8b9bb4);
        margin-bottom: 6px;
        font-weight: 500;
      }
      .brm-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .brm-btn {
        background: #0d131d;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        padding: 7px 8px;
        text-align: left;
        cursor: pointer;
        color: var(--text-main, #edf2f8);
        display: flex;
        flex-direction: column;
        gap: 2px;
        transition: all 0.15s ease;
      }
      .brm-btn:hover {
        background: var(--bg-card-hover, #192436);
        border-color: rgba(24, 226, 153, 0.35);
      }
      .brm-btn.active {
        background: rgba(24, 226, 153, 0.14);
        color: var(--emerald-safe, #18e299);
        border-color: var(--emerald-safe, #18e299);
      }
      .brm-btn span {
        font-size: 13px;
        line-height: 1;
        margin-bottom: 2px;
      }
      .brm-btn strong {
        font-size: 11px;
        font-weight: 700;
      }
      .brm-btn small {
        font-size: 9px;
        color: var(--text-muted, #8b9bb4);
        line-height: 1.3;
      }
      .brm-btn.active small {
        color: #c9f5e3;
      }

      /* Beginner Mode Sliders */
      .beginner-sliders {
        margin-bottom: 8px;
      }

      /* Beginner Mode Site Context Card */
      .beginner-site-card {
        background: #0a0f17;
        border: 1px solid rgba(39, 215, 255, 0.22);
        border-radius: 6px;
        padding: 8px 10px;
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .bsc-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        padding-bottom: 4px;
      }
      .bsc-row:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .bsc-label {
        color: var(--text-muted, #8b9bb4);
        font-weight: 500;
        font-size: 10px;
        flex-shrink: 0;
      }
      .bsc-val {
        font-weight: 700;
        color: var(--text-main, #edf2f8);
        text-align: right;
        font-size: 10.5px;
      }
      .bsc-hazard {
        color: #ff7a90;
      }
      .bsc-water {
        color: var(--cyan-hud, #27d7ff);
      }
      .bsc-rad {
        color: var(--mars-amber, #ffab2e);
      }

      /* Target Manifest Category Filters */
      .manifest-filter {
        display: flex;
        gap: 4px;
        margin-left: auto;
      }
      .mf-btn {
        background: #0d131d;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        padding: 2px 7px;
        font-size: 10px;
        font-weight: 600;
        color: var(--text-muted, #8b9bb4);
        cursor: pointer;
        transition: all 0.14s ease;
      }
      .mf-btn:hover {
        color: #ffffff;
        border-color: rgba(39, 215, 255, 0.4);
      }
      .mf-btn.active {
        background: rgba(39, 215, 255, 0.16);
        border-color: var(--cyan-hud, #27d7ff);
        color: var(--cyan-hud, #27d7ff);
        font-weight: 700;
      }

      /* Wizard Setup Experience Modal Mode Buttons */
      .wizard-mode-btn.active {
        border-color: var(--mars-orange, #ff5e2b) !important;
        background: rgba(255, 94, 43, 0.12) !important;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // ---------------------------------------------------------------------------
  // 2. CORE P0_UI OBJECT
  // ---------------------------------------------------------------------------
  const P0_UI = {
    _initialized: false,
    _activeTooltipBtn: null,

    /**
     * Initializes the P0 UI subsystem.
     * Reads saved mode from localStorage, sets up listeners, applies mode.
     */
    init: function () {
      if (this._initialized) {
        this.applyMode();
        return;
      }
      injectP0Styles();

      // Read saved mode or default to 'beginner'
      let savedMode = "beginner";
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "expert" || stored === "beginner") {
          savedMode = stored;
        }
      } catch (err) {
        console.warn("[ARES-NAV P0_UI] Could not access localStorage:", err);
      }

      p0State.interfaceMode = savedMode;

      // Wire up DOM event listeners
      this._wireModeToggleButtons();
      this._wireBeginnerLayerPicker();
      this._wireBeginnerRouteModes();
      this._wireSlopeSliderSync();
      this._wireTooltips();
      this._wireManifestFilter();
      this._wireSiteLoadHooks();

      // Apply mode to all elements
      this.applyMode();

      // Update beginner site card once site data is ready
      this.updateBeginnerSiteCard();
      if (!window.state || !window.state.siteData) {
        let attempts = 0;
        const checkSiteReady = setInterval(() => {
          attempts++;
          if (window.state && window.state.siteData) {
            clearInterval(checkSiteReady);
            P0_UI.updateBeginnerSiteCard();
            P0_UI.filterManifest(p0State.manifestFilter || "all");
          } else if (attempts > 30) {
            clearInterval(checkSiteReady);
          }
        }, 150);
      }

      this._initialized = true;
    },

    /**
     * Sets the active interface mode ('beginner' | 'expert').
     * Saves to localStorage and updates all mode-dependent UI components.
     * @param {string} mode - 'beginner' or 'expert'
     */
    setMode: function (mode) {
      const targetMode = mode === "expert" ? "expert" : "beginner";
      p0State.interfaceMode = targetMode;

      try {
        localStorage.setItem(STORAGE_KEY, targetMode);
      } catch (err) {
        console.warn("[ARES-NAV P0_UI] Could not save mode to localStorage:", err);
      }

      this.applyMode();
    },

    /**
     * Gets the currently active mode ('beginner' | 'expert').
     * @returns {string}
     */
    getMode: function () {
      return p0State.interfaceMode || "beginner";
    },

    /**
     * Applies mode visibility classes, aria states, and dynamic label updates.
     */
    applyMode: function () {
      const mode = this.getMode();
      const isBeginner = mode === "beginner";

      // 1. Toggle root body classes
      if (document.body) {
        document.body.classList.toggle("mode-beginner", isBeginner);
        document.body.classList.toggle("mode-expert", !isBeginner);
      }

      // 2. Update Top Bar Mode Toggle Buttons
      const btnBeg = document.getElementById("btn-mode-beginner");
      const btnExp = document.getElementById("btn-mode-expert");
      if (btnBeg) {
        btnBeg.classList.toggle("active", isBeginner);
        btnBeg.setAttribute("aria-pressed", isBeginner ? "true" : "false");
      }
      if (btnExp) {
        btnExp.classList.toggle("active", !isBeginner);
        btnExp.setAttribute("aria-pressed", !isBeginner ? "true" : "false");
      }

      // Sync wizard buttons if present
      const wizBeg = document.getElementById("wiz-mode-beginner");
      const wizExp = document.getElementById("wiz-mode-expert");
      if (wizBeg) wizBeg.classList.toggle("active", isBeginner);
      if (wizExp) wizExp.classList.toggle("active", !isBeginner);

      // 3. Toggle elements with .beginner-only and .expert-only
      document.querySelectorAll(".beginner-only").forEach((el) => {
        el.classList.toggle("hidden", !isBeginner);
      });
      document.querySelectorAll(".expert-only").forEach((el) => {
        el.classList.toggle("hidden", isBeginner);
      });

      // 4. Toggle specific beginner containers and their expert counterparts
      const begLayerPicker = document.getElementById("beginner-layer-picker");
      const expLayerGrid = document.getElementById("layer-buttons");
      if (begLayerPicker) begLayerPicker.classList.toggle("hidden", !isBeginner);
      if (expLayerGrid) expLayerGrid.classList.toggle("hidden", isBeginner);

      const begRouteModes = document.getElementById("beginner-route-modes");
      const expModeSelector = document.getElementById("mode-selector");
      if (begRouteModes) begRouteModes.classList.toggle("hidden", !isBeginner);
      if (expModeSelector) expModeSelector.classList.toggle("hidden", isBeginner);

      const begSliders = document.getElementById("beginner-sliders");
      if (begSliders) begSliders.classList.toggle("hidden", !isBeginner);

      const begSiteCard = document.getElementById("beginner-site-card");
      if (begSiteCard) begSiteCard.classList.toggle("hidden", !isBeginner);

      // 5. Update labels for the active mode
      this.updateLabelsForMode();

      // 6. Synchronize control values between beginner and expert controls
      this._syncControls();

      // 7. Update beginner site card if in beginner mode
      if (isBeginner) {
        this.updateBeginnerSiteCard();
      }
    },

    /**
     * Updates textContent for elements with data-beginner and data-expert attributes,
     * including cursor-hud probe telemetry spans, preserving nested child elements (e.g. <strong>).
     */
    updateLabelsForMode: function () {
      const mode = this.getMode();
      const isBeginner = mode === "beginner";

      // Select all candidate label elements
      const elements = document.querySelectorAll(
        "[data-beginner][data-expert], .beginner-label, .expert-label"
      );

      elements.forEach((el) => {
        const beginnerAttr = el.getAttribute("data-beginner");
        const expertAttr = el.getAttribute("data-expert");

        // Target text based on current mode
        let targetText = isBeginner ? beginnerAttr : expertAttr;
        if (!targetText) {
          targetText = isBeginner ? (beginnerAttr || expertAttr) : (expertAttr || beginnerAttr);
        }
        if (targetText === null || targetText === undefined) return;

        // If the element has child nodes (such as the cursor-hud labels with <strong>),
        // we must preserve the strong element while updating the preceding label text.
        const strongChild = el.querySelector("strong");
        if (strongChild) {
          let labelText = targetText;
          if (!labelText.endsWith(" ")) labelText += " ";

          if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
            el.firstChild.textContent = labelText;
          } else {
            el.insertBefore(document.createTextNode(labelText), strongChild);
          }
        } else {
          el.textContent = targetText;
        }
      });
    },

    /**
     * Updates the Beginner Site Card (#bsc-why, #bsc-hazard, #bsc-water, #bsc-rad)
     * using current site data from window.state.siteData.
     */
    updateBeginnerSiteCard: function () {
      if (!window.state || !window.state.siteData || !window.state.siteData.site) return;
      const site = window.state.siteData.site;
      const pois = site.pois || [];

      // #bsc-why: first science POI description truncated to 60 chars
      const whyEl = document.getElementById("bsc-why");
      if (whyEl) {
        const sciPoi = pois.find((p) => p.category === "science");
        let whyDesc = "";
        if (sciPoi && sciPoi.description) {
          whyDesc = sciPoi.description;
        } else if (site.summary) {
          whyDesc = site.summary;
        }
        if (whyDesc.length > 60) {
          whyDesc = whyDesc.slice(0, 57).trim() + "...";
        }
        whyEl.textContent = whyDesc || "Ancient geological and astrobiology target";
      }

      // #bsc-hazard: first hazard POI
      const hazEl = document.getElementById("bsc-hazard");
      if (hazEl) {
        const hazPoi = pois.find((p) => p.category === "hazard");
        if (hazPoi) {
          hazEl.textContent = hazPoi.name || hazPoi.description || "Steep slope scarp >25°";
        } else {
          hazEl.textContent = "Nominal terrain (no critical traps)";
        }
      }

      // #bsc-water: check if any ISRU POI has hydration_pct > 10 -> 'Good'; else 'Moderate'
      const waterEl = document.getElementById("bsc-water");
      if (waterEl) {
        const hasGoodWater = pois.some(
          (p) => p.category === "isru" && Number(p.hydration_pct) > 10
        );
        waterEl.textContent = hasGoodWater ? "Good" : "Moderate";
      }

      // #bsc-rad: base_radiation_uSv_hr
      const radEl = document.getElementById("bsc-rad");
      if (radEl) {
        const rad = site.base_radiation_uSv_hr;
        if (rad !== undefined && rad !== null) {
          radEl.textContent = `${Number(rad).toFixed(1)} µSv/hr`;
        } else {
          radEl.textContent = "26.7 µSv/hr";
        }
      }
    },

    /**
     * Filters the POI directory by category ('all' | 'science' | 'isru' | 'shelter' | 'hazard').
     * @param {string} category
     */
    filterManifest: function (category) {
      const filterCat = category || p0State.manifestFilter || "all";
      p0State.manifestFilter = filterCat;

      // Update active state on manifest filter buttons
      document.querySelectorAll("#manifest-filter .mf-btn").forEach((btn) => {
        const isActive = btn.getAttribute("data-filter") === filterCat;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      const dir = document.getElementById("poi-directory");
      if (!dir) return;

      const items = dir.querySelectorAll(".dir-item");
      const pois =
        (window.state &&
          window.state.siteData &&
          window.state.siteData.site &&
          window.state.siteData.site.pois) ||
        [];

      items.forEach((item, index) => {
        let cat = item.getAttribute("data-category");

        // Try extracting category from item DOM or matched POI
        if (!cat) {
          const strong = item.querySelector("strong");
          if (strong) {
            const idMatch = strong.textContent.split(":")[0].trim();
            const foundPoi = pois.find((p) => p.id === idMatch);
            if (foundPoi) {
              cat = foundPoi.category;
              item.setAttribute("data-category", cat);
            }
          }
          if (!cat && pois[index]) {
            cat = pois[index].category;
            item.setAttribute("data-category", cat);
          }
        }

        // Apply visibility
        if (filterCat === "all" || cat === filterCat) {
          item.style.display = "";
        } else {
          item.style.display = "none";
        }
      });
    },

    /**
     * Displays a contextual help tooltip positioned near buttonEl.
     * @param {HTMLElement} buttonEl
     * @param {string} text
     */
    showTooltip: function (buttonEl, text) {
      const tooltip = document.getElementById("global-tooltip");
      if (!tooltip || !buttonEl || !text) return;

      this._activeTooltipBtn = buttonEl;
      tooltip.textContent = text;
      tooltip.classList.remove("hidden");
      tooltip.style.display = "block";

      // Position tooltip near the trigger button without overflowing the viewport
      const rect = buttonEl.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const pad = 10;

      let left = rect.right + 10;
      let top = rect.top - 4;

      // Flip to left if overflowing viewport right
      if (left + tooltipRect.width > window.innerWidth - pad) {
        left = rect.left - tooltipRect.width - 10;
      }
      // Ensure left bounds
      if (left < pad) {
        left = pad;
        top = rect.bottom + 8;
      }
      // Ensure bottom bounds
      if (top + tooltipRect.height > window.innerHeight - pad) {
        top = Math.max(pad, window.innerHeight - tooltipRect.height - pad);
      }

      tooltip.style.left = `${Math.round(left)}px`;
      tooltip.style.top = `${Math.round(top)}px`;
    },

    /**
     * Hides the active contextual help tooltip.
     */
    hideTooltip: function () {
      const tooltip = document.getElementById("global-tooltip");
      if (tooltip) {
        tooltip.classList.add("hidden");
        tooltip.style.display = "none";
      }
      this._activeTooltipBtn = null;
    },

    // -------------------------------------------------------------------------
    // 3. PRIVATE EVENT BINDERS & SYNCHRONIZERS
    // -------------------------------------------------------------------------

    /**
     * Synchronizes control values between beginner and expert views.
     */
    _syncControls: function () {
      if (!window.state) return;

      // Sync active layer
      const curLayer = window.state.activeLayer || "composite";
      document.querySelectorAll("#beginner-layer-picker .blp-btn").forEach((b) => {
        const isActive = b.getAttribute("data-layer") === curLayer;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
      document.querySelectorAll("#layer-buttons .layer-btn").forEach((b) => {
        const isActive = b.getAttribute("data-layer") === curLayer;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      // Sync route mode
      const curMode = window.state.routeMode || "safest";
      document.querySelectorAll("#beginner-route-modes .brm-btn").forEach((b) => {
        const isActive = b.getAttribute("data-mode") === curMode;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
      document.querySelectorAll("#mode-selector .mode-pill").forEach((p) => {
        const isActive = p.getAttribute("data-mode") === curMode;
        p.classList.toggle("active", isActive);
        p.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      // Sync slope sliders
      const curSlope = window.state.maxSlopeDeg !== undefined ? window.state.maxSlopeDeg : 15;
      const rngB = document.getElementById("rng-max-slope-b");
      const rngExp = document.getElementById("rng-max-slope");
      const lblB = document.getElementById("lbl-max-slope-b");
      const lblExp = document.getElementById("lbl-max-slope");
      if (rngB && rngB.value != curSlope) rngB.value = curSlope;
      if (rngExp && rngExp.value != curSlope) rngExp.value = curSlope;
      if (lblB) lblB.textContent = `${curSlope}°`;
      if (lblExp) lblExp.textContent = `${curSlope}°`;
    },

    /**
     * Wires mode toggle buttons (#btn-mode-beginner, #btn-mode-expert, wizard buttons).
     */
    _wireModeToggleButtons: function () {
      const btnBeg = document.getElementById("btn-mode-beginner");
      const btnExp = document.getElementById("btn-mode-expert");

      if (btnBeg) {
        btnBeg.addEventListener("click", () => {
          this.setMode("beginner");
        });
      }
      if (btnExp) {
        btnExp.addEventListener("click", () => {
          this.setMode("expert");
        });
      }

      // Wire setup wizard mode selection buttons if present
      const wizBeg = document.getElementById("wiz-mode-beginner");
      const wizExp = document.getElementById("wiz-mode-expert");
      if (wizBeg) {
        wizBeg.addEventListener("click", () => {
          this.setMode("beginner");
        });
      }
      if (wizExp) {
        wizExp.addEventListener("click", () => {
          this.setMode("expert");
        });
      }
    },

    /**
     * Wires up the beginner layer picker buttons with bidirectional sync to expert layer buttons.
     */
    _wireBeginnerLayerPicker: function () {
      const blpBtns = document.querySelectorAll("#beginner-layer-picker .blp-btn");
      blpBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const layer = btn.getAttribute("data-layer");
          if (!layer) return;

          if (window.state) {
            window.state.activeLayer = layer;
          }

          // Update active state on beginner buttons
          blpBtns.forEach((b) => {
            const isActive = b === btn;
            b.classList.toggle("active", isActive);
            b.setAttribute("aria-pressed", isActive ? "true" : "false");
          });

          // Sync expert buttons
          document.querySelectorAll("#layer-buttons .layer-btn").forEach((expBtn) => {
            const isActive = expBtn.getAttribute("data-layer") === layer;
            expBtn.classList.toggle("active", isActive);
            expBtn.setAttribute("aria-pressed", isActive ? "true" : "false");
          });

          // Trigger map and legend updates defined in app.js
          if (typeof window.updateLegendUI === "function") window.updateLegendUI();
          if (typeof window.bake2DTerrainLayer === "function") window.bake2DTerrainLayer();
          if (typeof window.renderScene === "function") window.renderScene();
        });
      });

      // Reverse sync: when expert buttons are clicked, update beginner layer buttons
      document.querySelectorAll("#layer-buttons .layer-btn").forEach((expBtn) => {
        expBtn.addEventListener("click", () => {
          const layer = expBtn.getAttribute("data-layer");
          document.querySelectorAll("#beginner-layer-picker .blp-btn").forEach((b) => {
            const isActive = b.getAttribute("data-layer") === layer;
            b.classList.toggle("active", isActive);
            b.setAttribute("aria-pressed", isActive ? "true" : "false");
          });
        });
      });
    },

    /**
     * Wires up beginner route mode buttons with bidirectional sync to expert mode pills.
     */
    _wireBeginnerRouteModes: function () {
      const brmBtns = document.querySelectorAll("#beginner-route-modes .brm-btn");
      brmBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const mode = btn.getAttribute("data-mode");
          if (!mode) return;

          if (window.state) {
            window.state.routeMode = mode;
          }

          // Update active state on beginner route mode buttons
          brmBtns.forEach((b) => {
            const isActive = b === btn;
            b.classList.toggle("active", isActive);
            b.setAttribute("aria-pressed", isActive ? "true" : "false");
          });

          // Sync expert pills
          document.querySelectorAll("#mode-selector .mode-pill").forEach((pill) => {
            const isActive = pill.getAttribute("data-mode") === mode;
            pill.classList.toggle("active", isActive);
            pill.setAttribute("aria-pressed", isActive ? "true" : "false");
          });

          // Trigger route re-planning defined in app.js
          if (typeof window.requestRoutePlan === "function") {
            window.requestRoutePlan();
          }
        });
      });

      // Reverse sync: when expert mode pills are clicked, update beginner buttons
      document.querySelectorAll("#mode-selector .mode-pill").forEach((pill) => {
        pill.addEventListener("click", () => {
          const mode = pill.getAttribute("data-mode");
          document.querySelectorAll("#beginner-route-modes .brm-btn").forEach((b) => {
            const isActive = b.getAttribute("data-mode") === mode;
            b.classList.toggle("active", isActive);
            b.setAttribute("aria-pressed", isActive ? "true" : "false");
          });
        });
      });
    },

    /**
     * Wires up bidirectional sync between #rng-max-slope-b and #rng-max-slope.
     */
    _wireSlopeSliderSync: function () {
      const rngB = document.getElementById("rng-max-slope-b");
      const rngExp = document.getElementById("rng-max-slope");
      const lblB = document.getElementById("lbl-max-slope-b");
      const lblExp = document.getElementById("lbl-max-slope");

      if (rngB) {
        rngB.addEventListener("input", (e) => {
          const val = parseInt(e.target.value, 10);
          if (window.state) {
            window.state.maxSlopeDeg = val;
          }
          if (lblB) lblB.textContent = `${val}°`;
          if (lblExp) lblExp.textContent = `${val}°`;
          if (rngExp && rngExp.value != val) rngExp.value = val;

          if (typeof window.updateLegendUI === "function") window.updateLegendUI();
          if (typeof window.bake2DTerrainLayer === "function") window.bake2DTerrainLayer();
          if (typeof window.requestRoutePlan === "function") window.requestRoutePlan();
        });
      }

      if (rngExp) {
        rngExp.addEventListener("input", (e) => {
          const val = parseInt(e.target.value, 10);
          if (lblB) lblB.textContent = `${val}°`;
          if (rngB && rngB.value != val) rngB.value = val;
        });
      }
    },

    /**
     * Wires up contextual help tooltips for all .section-help-btn elements.
     */
    _wireTooltips: function () {
      // Click handler on all section-help-btn elements
      document.querySelectorAll(".section-help-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const text = btn.getAttribute("data-tooltip");
          if (!text) return;

          const tooltip = document.getElementById("global-tooltip");
          if (
            this._activeTooltipBtn === btn &&
            tooltip &&
            !tooltip.classList.contains("hidden")
          ) {
            this.hideTooltip();
          } else {
            this.showTooltip(btn, text);
          }
        });
      });

      // Dismiss tooltip when clicking anywhere outside
      document.addEventListener("click", (e) => {
        const tooltip = document.getElementById("global-tooltip");
        if (!tooltip || tooltip.classList.contains("hidden")) return;

        if (
          e.target.closest(".section-help-btn") ||
          e.target.closest("#global-tooltip")
        ) {
          return;
        }
        this.hideTooltip();
      });

      // Dismiss tooltip on Escape key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.hideTooltip();
        }
      });
    },

    /**
     * Wires up Target Manifest category filter buttons (#manifest-filter .mf-btn).
     */
    _wireManifestFilter: function () {
      document.querySelectorAll("#manifest-filter .mf-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const filter = btn.getAttribute("data-filter") || "all";
          this.filterManifest(filter);
        });
      });
    },

    /**
     * Hooks into site load events to update beginner site card and re-apply manifest filters.
     */
    _wireSiteLoadHooks: function () {
      // 1. Wrap window.loadSite if defined in app.js
      if (typeof window.loadSite === "function") {
        const originalLoadSite = window.loadSite;
        window.loadSite = async function (...args) {
          const res = await originalLoadSite.apply(this, args);
          P0_UI.updateBeginnerSiteCard();
          P0_UI.filterManifest(p0State.manifestFilter || "all");
          return res;
        };
      }

      // 2. Wrap window.updatePoiDirectory if defined in app.js
      if (typeof window.updatePoiDirectory === "function") {
        const originalUpdatePoiDir = window.updatePoiDirectory;
        window.updatePoiDirectory = function (...args) {
          const res = originalUpdatePoiDir.apply(this, args);
          P0_UI.filterManifest(p0State.manifestFilter || "all");
          return res;
        };
      }

      // 3. Fallback listener on site-selector change
      const siteSelector = document.getElementById("site-selector");
      if (siteSelector) {
        siteSelector.addEventListener("change", () => {
          setTimeout(() => {
            P0_UI.updateBeginnerSiteCard();
            P0_UI.filterManifest(p0State.manifestFilter || "all");
          }, 350);
        });
      }
    }
  };

  // Expose P0_UI globally
  window.P0_UI = P0_UI;

  // Auto-initialize when document is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (!P0_UI._initialized) {
        P0_UI.init();
      }
    });
  } else {
    P0_UI.init();
  }
})();
