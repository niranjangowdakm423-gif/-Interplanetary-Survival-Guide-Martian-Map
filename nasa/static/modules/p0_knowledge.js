/**
 * ARES-NAV — Mars Science Knowledge Centre Module (P0.2)
 * Self-contained glossary of planetary instruments, operational terminology,
 * environmental conditions, and geospatial data types.
 *
 * Full self-contained ES6, global scope, no imports.
 */

// ════════════════════════════════════════════════════════════════════════════
// 1. KNOWLEDGE TERMS DATASET (13 NASA / MARS EXPLORATION TERMS)
// ════════════════════════════════════════════════════════════════════════════

const KNOWLEDGE_TERMS = [
  {
    id: 'mola',
    term: 'MOLA',
    icon: '📡',
    category: 'Instruments',
    what: 'Mars Orbiter Laser Altimeter — a laser rangefinder aboard the Mars Global Surveyor spacecraft that measured the precise elevation of every point on Mars by bouncing laser pulses off the surface and timing the returns.',
    why: 'MOLA gave us the most accurate global topographic map of any planet in the solar system. Without it, we could not calculate safe walking routes or predict where water would flow.',
    feature: 'ARES-NAV uses real MOLA hillshade mosaic images as the base terrain map and derives the 80×80 elevation grid that drives all slope, route, and viewshed calculations.'
  },
  {
    id: 'hirise',
    term: 'HiRISE',
    icon: '🔭',
    category: 'Instruments',
    what: 'High Resolution Imaging Science Experiment — a camera aboard the Mars Reconnaissance Orbiter capable of photographing the Martian surface at 25 cm per pixel, fine enough to see individual boulders and rover tracks.',
    why: 'HiRISE imagery reveals surface hazards like loose boulders, dune fields, and cliff edges that could injure an astronaut or trap a rover. It is the finest publicly available surface imagery of Mars.',
    feature: 'ARES-NAV downloads real HiRISE RDR images for Jezero Crater and uses spatial gradient variance to compute boulder and roughness density for route safety scoring.'
  },
  {
    id: 'crism',
    term: 'CRISM',
    icon: '🌈',
    category: 'Instruments',
    what: 'Compact Reconnaissance Imaging Spectrometer for Mars — a spectrometer aboard MRO that measures light reflected from the surface across 544 wavelengths to identify specific minerals.',
    why: 'Different minerals form in different conditions. Clay minerals indicate ancient water. Sulfates indicate evaporated brines. By mapping minerals, we can find the most scientifically valuable and potentially habitable locations.',
    feature: 'ARES-NAV queries real CRISM MTRDR product records from the NASA PDS ODE API and displays mineralogy index maps derived from real or synthesized CRISM data.'
  },
  {
    id: 'sharad',
    term: 'SHARAD',
    icon: '📻',
    category: 'Instruments',
    what: 'Shallow Radar — a ground-penetrating radar instrument on MRO that can detect buried ice, rock layers and voids to depths of about 1 km below the surface.',
    why: 'Water ice is the most critical resource for sustaining human Mars missions. SHARAD maps where ice is buried near the surface, which is essential for planning ISRU (resource extraction) operations.',
    feature: 'ARES-NAV uses SHARAD-derived water ice estimates in the Hydration layer, particularly for Arcadia Planitia which has known shallow subsurface ice detected by SHARAD.'
  },
  {
    id: 'msl-rad',
    term: 'MSL RAD',
    icon: '☢️',
    category: 'Instruments',
    what: 'Mars Science Laboratory Radiation Assessment Detector — an instrument aboard the Curiosity rover that has continuously measured surface radiation at Gale Crater since 2012. It records dose rates from cosmic rays and solar particles.',
    why: 'Radiation is one of the greatest health hazards for Mars astronauts. MSL RAD is the only direct, long-duration measurement of Martian surface radiation. It established the baseline of 26.67 µSv/hr (640 µSv/day) that all planning must work from.',
    feature: 'ARES-NAV calibrates its entire radiation model to the real MSL RAD measurement of 26.67 µSv/hr. All site radiation layers are scaled from this real reference value.'
  },
  {
    id: 'eva',
    term: 'EVA',
    icon: '🧑🚀',
    category: 'Operations',
    what: 'Extravehicular Activity — any mission where an astronaut leaves the pressurized habitat in a spacesuit to work on the surface. On Mars, every EVA is against an atmosphere 100x thinner than Earth and with no breathable oxygen.',
    why: 'Every minute of EVA consumes life support resources (oxygen, battery power, metabolic energy) that cannot be replenished until returning to the habitat. Planning efficient and safe EVA routes is critical for crew survival.',
    feature: 'ARES-NAV models a complete EVA traverse, estimating oxygen consumed (from real PLSS parameters), battery drain, caloric expenditure, radiation dose, and time to complete the mission.'
  },
  {
    id: 'isru',
    term: 'ISRU',
    icon: '⛏️',
    category: 'Operations',
    what: 'In-Situ Resource Utilization — the practice of using local Martian materials (water ice, CO₂, regolith) to produce life-support consumables, rocket propellant, and construction materials rather than bringing everything from Earth.',
    why: 'Launching materials from Earth costs approximately $1 million per kilogram to reach Mars. ISRU is essential for making Mars exploration economically viable and for sustaining a permanent human presence.',
    feature: 'ARES-NAV marks ISRU-relevant targets (water ice deposits, hydrated clay sites) with 💧 markers and calculates the hydration percentage from real CRISM/SHARAD data to help mission planners find resource-rich areas.'
  },
  {
    id: 'spe',
    term: 'Solar Particle Event (SPE)',
    icon: '⚡',
    category: 'Environment',
    what: 'A sudden burst of high-energy particles from a solar flare or coronal mass ejection that travels across the inner solar system. On Mars, without a global magnetic field or thick atmosphere to deflect them, SPEs dramatically increase surface radiation.',
    why: 'A major SPE can deliver a radiation dose that exceeds astronaut career limits in a matter of hours. Without shelter, an unprotected EVA during an X-class SPE could be fatal.',
    feature: 'ARES-NAV simulates an X4.2-class SPE event using the ⚡ SIMULATE SPE button, which triggers the emergency shelter abort routing system to find the fastest path to a radiation-shielding location.'
  },
  {
    id: 'rad-shield',
    term: 'Radiation Shielding',
    icon: '🛡️',
    category: 'Environment',
    what: 'Any physical mass placed between an astronaut and radiation sources. On Mars this can be: regolith piled on top of a habitat, natural cave overhangs, lava tube ceilings, or canyon walls.',
    why: 'The thicker and denser the shielding material, the more radiation it absorbs. Even a metre of Martian soil reduces GCR (cosmic ray) dose by about 50%. Finding natural shelters (cave overhangs, canyons) is a key goal of EVA planning.',
    feature: 'ARES-NAV marks natural radiation shelters (🛡️) on the map and calculates shielding factors from each shelter POI. The emergency abort route always leads to the nearest shelter with the best shielding factor.'
  },
  {
    id: 'dem',
    term: 'Digital Elevation Model (DEM)',
    icon: '⛰️',
    category: 'Data Types',
    what: 'A 3D representation of a surface created from satellite measurements. For Mars, DEMs are built from MOLA laser altimeter readings and stereo HiRISE image pairs. They record the elevation of every point on the surface.',
    why: 'DEMs are the foundation of all terrain analysis. Without knowing the shape of the ground, you cannot calculate slope, predict water flow, model radio line-of-sight, or find the safest walking route.',
    feature: 'ARES-NAV builds an 80×80 elevation grid for each site from the MOLA DEM, which is used for slope calculation, 3D visualization, viewshed analysis, and all A* route cost computations.'
  },
  {
    id: 'slope',
    term: 'Terrain Slope',
    icon: '📐',
    category: 'Data Types',
    what: 'The steepness of the ground, measured as the angle between the surface and horizontal. A slope of 0° is completely flat; a slope of 90° is a vertical cliff.',
    why: 'NASA standard STD-3001 recommends a maximum walking slope of 15° for suited astronauts. Steeper slopes risk falls, suit damage, and uncontrollable sliding in Mars gravity (0.38g). The A* route planner penalizes routes through slopes exceeding the configured limit.',
    feature: 'ARES-NAV derives a geodesic slope map (°) from the MOLA elevation grid using a 3×3 Horn gradient kernel. The slope layer and red hazard hatching on the map both use this calculated slope grid.'
  },
  {
    id: 'los',
    term: 'Line of Sight (LoS)',
    icon: '📡',
    category: 'Data Types',
    what: 'Whether there is an unobstructed straight-line path between two points. For radio communications, if terrain blocks the line of sight between an astronaut and the habitat antenna, the radio link becomes weak or fails entirely.',
    why: 'Loss of radio contact during an EVA is an emergency. Without communication, an astronaut cannot call for help, receive updated radiation warnings, or be tracked by mission control.',
    feature: 'ARES-NAV computes a 3D ray-marched UHF radio viewshed from the habitat antenna mast across the full terrain grid. The Comm LoS layer shows link quality (%) at every position, and the A* algorithm penalizes dead zones.'
  },
  {
    id: 'sol',
    term: 'Martian Sol',
    icon: '🌅',
    category: 'Environment',
    what: 'A Martian day — approximately 24 hours and 39 minutes long (2.7% longer than an Earth day). Mars also has seasons like Earth because it has a similar axial tilt, but each Martian year lasts 687 Earth days.',
    why: 'EVA planning must account for the Martian day/night cycle. Surface temperatures can swing 70°C between midday and midnight. Dust storms tend to peak in certain seasons. All time-based resource calculations in ARES-NAV use Mars Local Mean Solar Time (LMST).',
    feature: 'ARES-NAV displays the current Sol and LMST in the top bar and uses the diurnal temperature model to estimate surface temperature at each grid cell based on aspect and local time.'
  }
];

// Expose terms globally
window.KNOWLEDGE_TERMS = KNOWLEDGE_TERMS;

// ════════════════════════════════════════════════════════════════════════════
// 2. P0_KNOWLEDGE CONTROLLER OBJECT
// ════════════════════════════════════════════════════════════════════════════

const P0_KNOWLEDGE = {
  currentTermId: null,
  initialized: false,
  rendered: false,

  /**
   * Inject CSS styles for modal layout and cards if not already injected
   */
  ensureStyles() {
    if (document.getElementById('p0-knowledge-styles')) return;

    const style = document.createElement('style');
    style.id = 'p0-knowledge-styles';
    style.textContent = `
      /* Knowledge Centre Modal & Layout */
      #knowledge-modal .modal-card.modal-wide {
        width: min(980px, 94vw);
        max-width: 980px;
        height: 82vh;
        max-height: 740px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 20px 24px;
        background: #0e1420;
        border: 1px solid var(--mars-orange, #ff5e2b);
        border-radius: 10px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85);
      }

      .knowledge-layout {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 18px;
        flex: 1;
        min-height: 0;
        overflow: hidden;
        margin-top: 8px;
      }

      /* Sidebar Navigation */
      .knowledge-nav {
        background: rgba(9, 14, 22, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 10px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 0;
      }

      .knowledge-nav::-webkit-scrollbar {
        width: 5px;
      }
      .knowledge-nav::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.16);
        border-radius: 4px;
      }

      .knowledge-cat-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .knowledge-cat-title {
        font-family: var(--font-mono, monospace);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.8px;
        color: var(--mars-amber, #ffab2e);
        text-transform: uppercase;
        padding: 4px 6px;
        border-bottom: 1px solid rgba(255, 171, 46, 0.22);
        margin-bottom: 2px;
      }

      .knowledge-nav-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        background: rgba(19, 27, 40, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 5px;
        padding: 7px 10px;
        text-align: left;
        cursor: pointer;
        color: var(--text-main, #edf2f8);
        font-family: var(--font-sans, sans-serif);
        font-size: 11.5px;
        transition: all 0.15s ease;
        outline: none;
      }

      .knowledge-nav-btn:hover {
        background: var(--bg-card-hover, #192436);
        border-color: rgba(39, 215, 255, 0.35);
        transform: translateX(2px);
      }

      .knowledge-nav-btn.active {
        background: rgba(39, 215, 255, 0.16);
        border-color: var(--cyan-hud, #27d7ff);
        box-shadow: inset 3px 0 0 var(--cyan-hud, #27d7ff), 0 0 10px rgba(39, 215, 255, 0.15);
        color: #ffffff;
      }

      .knowledge-nav-icon {
        font-size: 15px;
        flex-shrink: 0;
        width: 20px;
        text-align: center;
      }

      .knowledge-nav-text {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .knowledge-nav-label {
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Content Area */
      .knowledge-content {
        background: rgba(10, 15, 23, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 22px 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 18px;
        min-height: 0;
      }

      .knowledge-content::-webkit-scrollbar {
        width: 6px;
      }
      .knowledge-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.18);
        border-radius: 4px;
      }

      .k-detail-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .k-detail-icon {
        font-size: 42px;
        line-height: 1;
        padding: 12px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        flex-shrink: 0;
      }

      .k-detail-titles {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .k-category-pill {
        display: inline-block;
        font-family: var(--font-mono, monospace);
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        padding: 2px 8px;
        border-radius: 4px;
        width: fit-content;
        background: rgba(39, 215, 255, 0.12);
        color: var(--cyan-hud, #27d7ff);
        border: 1px solid rgba(39, 215, 255, 0.3);
      }

      .k-detail-title {
        font-size: 22px;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: 0.5px;
        margin: 0;
      }

      .k-sections-grid {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .k-section-card {
        background: rgba(19, 27, 40, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 8px;
        padding: 14px 18px;
        transition: border-color 0.16s ease;
      }

      .k-section-card:hover {
        border-color: rgba(255, 255, 255, 0.16);
      }

      .k-section-card-feature {
        border-left: 3px solid var(--emerald-safe, #18e299);
        background: linear-gradient(90deg, rgba(24, 226, 153, 0.08) 0%, rgba(19, 27, 40, 0.65) 100%);
      }

      .k-section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .k-sec-icon {
        font-size: 14px;
      }

      .k-section-badge {
        font-family: var(--font-mono, monospace);
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        margin: 0;
      }

      .k-badge-what {
        color: var(--cyan-hud, #27d7ff);
      }
      .k-badge-why {
        color: var(--mars-amber, #ffab2e);
      }
      .k-badge-feature {
        color: var(--emerald-safe, #18e299);
      }

      .k-section-text {
        font-size: 13px;
        line-height: 1.6;
        color: #d6e2f0;
        margin: 0;
      }

      @media (max-width: 768px) {
        .knowledge-layout {
          grid-template-columns: 1fr;
        }
        .knowledge-nav {
          max-height: 170px;
        }
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * Initializes event listeners and pre-renders glossary contents
   */
  init() {
    this.ensureStyles();

    // Wire up trigger: #btn-knowledge (top navigation)
    const btnKnowledge = document.getElementById('btn-knowledge');
    if (btnKnowledge && !btnKnowledge._p0Bound) {
      btnKnowledge.addEventListener('click', () => this.open());
      btnKnowledge._p0Bound = true;
    }

    // Wire up trigger: #btn-close-knowledge (modal header)
    const btnClose = document.getElementById('btn-close-knowledge');
    if (btnClose && !btnClose._p0Bound) {
      btnClose.addEventListener('click', () => this.close());
      btnClose._p0Bound = true;
    }

    // Wire up trigger: #wiz-open-glossary (setup wizard learn step)
    const btnWizGlossary = document.getElementById('wiz-open-glossary');
    if (btnWizGlossary && !btnWizGlossary._p0Bound) {
      btnWizGlossary.addEventListener('click', () => this.open());
      btnWizGlossary._p0Bound = true;
    }

    // Backdrop click to close modal
    const modal = document.getElementById('knowledge-modal');
    if (modal && !modal._p0Bound) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.close();
        }
      });
      modal._p0Bound = true;
    }

    // Escape key closes modal
    if (!this._escBound) {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const kModal = document.getElementById('knowledge-modal');
          if (kModal && !kModal.classList.contains('hidden')) {
            this.close();
          }
        }
      });
      this._escBound = true;
    }

    // Pre-render navigation and initial selection
    this.render();
    if (!this.currentTermId && KNOWLEDGE_TERMS.length > 0) {
      this.selectTerm(KNOWLEDGE_TERMS[0].id);
    }

    this.initialized = true;
  },

  /**
   * Opens the Knowledge Centre modal and selects a term
   * @param {string|null} termId Optional term identifier to select; defaults to first term
   */
  open(termId = null) {
    const modal = document.getElementById('knowledge-modal');
    if (!modal) return;

    this.ensureStyles();
    modal.classList.remove('hidden');

    if (!this.rendered) {
      this.render();
    }

    const targetId = termId || this.currentTermId || (KNOWLEDGE_TERMS[0] ? KNOWLEDGE_TERMS[0].id : null);
    if (targetId) {
      this.selectTerm(targetId);
    }
  },

  /**
   * Hides the Knowledge Centre modal
   */
  close() {
    const modal = document.getElementById('knowledge-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  },

  /**
   * Builds the navigation sidebar grouped by category and prepares content area
   */
  render() {
    const nav = document.getElementById('knowledge-nav');
    if (!nav) return;

    // Distinct category order matching planetary domain hierarchy
    const preferredOrder = ['Instruments', 'Operations', 'Environment', 'Data Types'];
    const categories = [];

    preferredOrder.forEach((c) => {
      if (KNOWLEDGE_TERMS.some((t) => t.category === c)) {
        categories.push(c);
      }
    });

    KNOWLEDGE_TERMS.forEach((t) => {
      if (!categories.includes(t.category)) {
        categories.push(t.category);
      }
    });

    nav.innerHTML = '';

    categories.forEach((cat) => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'knowledge-cat-group';

      const header = document.createElement('div');
      header.className = 'knowledge-cat-title';
      header.textContent = cat;
      groupDiv.appendChild(header);

      const catTerms = KNOWLEDGE_TERMS.filter((t) => t.category === cat);
      catTerms.forEach((t) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'knowledge-nav-btn';
        btn.dataset.termId = t.id;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', 'false');
        btn.title = `${t.term} (${t.category})`;

        btn.innerHTML = `
          <span class="knowledge-nav-icon" aria-hidden="true">${t.icon}</span>
          <span class="knowledge-nav-text">
            <span class="knowledge-nav-label">${t.term}</span>
          </span>
        `;

        btn.addEventListener('click', () => {
          this.selectTerm(t.id);
        });

        groupDiv.appendChild(btn);
      });

      nav.appendChild(groupDiv);
    });

    this.rendered = true;
  },

  /**
   * Selects a term by ID, highlights its nav item, and displays its detailed sections
   * @param {string} id The term identifier
   */
  selectTerm(id) {
    const term = KNOWLEDGE_TERMS.find((t) => t.id === id) || KNOWLEDGE_TERMS[0];
    if (!term) return;

    this.currentTermId = term.id;

    // Highlight nav item and set aria-selected
    const navBtns = document.querySelectorAll('#knowledge-nav .knowledge-nav-btn');
    navBtns.forEach((btn) => {
      const isSelected = btn.dataset.termId === term.id;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      if (isSelected) {
        btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });

    // Populate right content area
    const content = document.getElementById('knowledge-content');
    if (!content) return;

    content.innerHTML = `
      <div class="k-detail-header">
        <div class="k-detail-icon" aria-hidden="true">${term.icon}</div>
        <div class="k-detail-titles">
          <span class="k-category-pill">${term.category}</span>
          <h2 class="k-detail-title">${term.term}</h2>
        </div>
      </div>

      <div class="k-sections-grid">
        <!-- Section 1: What it is -->
        <section class="k-section-card" aria-labelledby="k-head-what">
          <div class="k-section-header">
            <span class="k-sec-icon" aria-hidden="true">📖</span>
            <h3 id="k-head-what" class="k-section-badge k-badge-what">WHAT IT IS</h3>
          </div>
          <p class="k-section-text">${term.what}</p>
        </section>

        <!-- Section 2: Why it matters -->
        <section class="k-section-card" aria-labelledby="k-head-why">
          <div class="k-section-header">
            <span class="k-sec-icon" aria-hidden="true">🚀</span>
            <h3 id="k-head-why" class="k-section-badge k-badge-why">WHY IT MATTERS FOR MARS EXPLORATION</h3>
          </div>
          <p class="k-section-text">${term.why}</p>
        </section>

        <!-- Section 3: Feature in ARES-NAV -->
        <section class="k-section-card k-section-card-feature" aria-labelledby="k-head-feature">
          <div class="k-section-header">
            <span class="k-sec-icon" aria-hidden="true">⚡</span>
            <h3 id="k-head-feature" class="k-section-badge k-badge-feature">FEATURE IN ARES-NAV</h3>
          </div>
          <p class="k-section-text">${term.feature}</p>
        </section>
      </div>
    `;

    content.scrollTop = 0;
  }
};

// Expose controller globally
window.P0_KNOWLEDGE = P0_KNOWLEDGE;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => P0_KNOWLEDGE.init());
} else {
  P0_KNOWLEDGE.init();
}
