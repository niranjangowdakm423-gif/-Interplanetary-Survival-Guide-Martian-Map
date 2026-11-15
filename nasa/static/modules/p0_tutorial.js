/**
 * ARES-NAV — Interplanetary Survival Guide: Martian Map
 * Module: P0_TUTORIAL (static/modules/p0_tutorial.js)
 * 
 * Interactive 9-Step Onboarding Tutorial & Guide for ARES-NAV
 * 
 * ============================================================================
 * RESTART BEHAVIOR DOCUMENTATION:
 * The "📖 Tutorial" button (#btn-tutorial) in the top navigation bar ALWAYS
 * restarts the tutorial from Step 1 (index 0) whenever clicked, even if the
 * tutorial was previously marked complete and saved in localStorage.
 * Calling P0_TUTORIAL.start() explicitly resets currentStep to 0, clears any
 * suppression flags, and renders Step 1.
 * ============================================================================
 * 
 * Storage Key: 'aresNavTutorialDone' ('true' when completed)
 */

'use strict';

/**
 * 9-step interactive tutorial sequence.
 * Each step defines its icon, title, rich HTML description, CSS target selector,
 * and vertical positioning preference ('top' | 'bottom' | 'center').
 */
const TUTORIAL_STEPS = [
  {
    icon: '🚀',
    title: 'Welcome to ARES-NAV',
    body: 'ARES-NAV uses real NASA planetary data to help you plan safe human exploration missions on Mars. This tutorial will walk you through all the key features in about 5 minutes.',
    highlight: null,
    position: 'center'
  },
  {
    icon: '🌍',
    title: 'Choose a Martian Region',
    body: 'Use the <strong>SELECT EXPLORATION SITE</strong> dropdown in the left panel to choose one of 10 candidate Mars exploration sites, each with real NASA data coverage. Jezero Crater has the richest real data (actual HiRISE and MOLA imagery).',
    highlight: '#site-selector',
    position: 'bottom'
  },
  {
    icon: '🗺️',
    title: 'Understanding the Map',
    body: 'The central map shows your selected site. Use the layer buttons to switch between views: <strong>Terrain, Steepness, Radiation, Water Ice, Minerals, and Radio Link</strong>. Each layer is sourced from a real NASA instrument.',
    highlight: '#section-layers',
    position: 'bottom'
  },
  {
    icon: '⚠️',
    title: 'Hazards & Science Targets',
    body: 'Coloured markers on the map show <span style="color:#ff3355">⚠️ hazards</span>, <span style="color:#b56bff">🔬 science targets</span>, <span style="color:#27d7ff">💧 resource sites</span> and <span style="color:#18e299">🛡️ radiation shelters</span>. Click any marker to see full details in the right panel.',
    highlight: '#poi-directory',
    position: 'top'
  },
  {
    icon: '📍',
    title: 'Adding Waypoints',
    body: 'Click any location on the map to add it as a waypoint. You can also click <strong>+ ROUTE</strong> next to any target in the right panel. The route planner will find the safest path between your waypoints.',
    highlight: '#waypoint-list',
    position: 'top'
  },
  {
    icon: '🛣️',
    title: 'Route Planning',
    body: 'ARES-NAV uses a multi-objective A* algorithm to calculate the optimal route. Choose your priority: <strong>Safest</strong> (avoid steep slopes and radiation), <strong>Balanced</strong>, <strong>Science First</strong>, or <strong>Fastest</strong>.',
    highlight: '#beginner-route-modes',
    position: 'bottom'
  },
  {
    icon: '🧑‍🚀',
    title: 'Astronaut Life Support',
    body: 'The right panel shows real-time estimates of <strong>Oxygen consumed</strong>, <strong>Battery used</strong>, and <strong>Calories burned</strong> for the planned route, using the Pandolf metabolic model adjusted for Mars gravity (0.38g).',
    highlight: '.consumables-box',
    position: 'top'
  },
  {
    icon: '🚨',
    title: 'Emergency Shelter Routing',
    body: 'In a Solar Particle Event (radiation storm), you need to reach a shelter quickly. Use the <strong>🚨 EMERGENCY ABORT</strong> button to calculate the fastest safe route to the nearest radiation shelter from your current position.',
    highlight: '#btn-abort-shelter',
    position: 'bottom'
  },
  {
    icon: '▶️',
    title: 'Running a Marswalk Simulation',
    body: 'Click <strong>▶ SIMULATE MARSWALK</strong> to animate an astronaut walking your planned route. Watch the telemetry charts at the bottom update in real time. Use the bottom chart tabs to view Elevation, Oxygen, and Radiation profiles.',
    highlight: '#btn-play-eva',
    position: 'bottom'
  }
];

/**
 * P0_TUTORIAL Controller Object
 */
const P0_TUTORIAL = {
  steps: TUTORIAL_STEPS,
  currentStep: 0,
  isInitialized: false,
  suppressAutoStart: false,
  _completeTimer: null,
  _highlightedElement: null,

  /**
   * Initialize tutorial listeners, keyboard shortcuts, and check auto-start.
   * Reads localStorage 'aresNavTutorialDone'. If not set, starts tutorial automatically.
   * Wires up #btn-tutorial, #wiz-start-tutorial, and dialog controls.
   */
  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Wire up topbar Tutorial button (always restarts)
    const btnTutorial = document.getElementById('btn-tutorial');
    if (btnTutorial) {
      btnTutorial.addEventListener('click', (e) => {
        e.preventDefault();
        this.start();
      });
    }

    // 2. Wire up Wizard integration (#wiz-start-tutorial)
    const wizStartBtn = document.getElementById('wiz-start-tutorial');
    if (wizStartBtn) {
      wizStartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.start();
      });
    }

    // Optional: Wizard step 1 "Learn How ARES-NAV Works" button
    const wizChoiceLearn = document.getElementById('wiz-choice-learn');
    if (wizChoiceLearn) {
      wizChoiceLearn.addEventListener('click', () => {
        const stepLearn = document.getElementById('wiz-step-learn');
        const step1 = document.getElementById('wiz-step-1');
        if (stepLearn && step1) {
          step1.classList.remove('active');
          stepLearn.classList.add('active');
        }
      });
    }

    // 3. Wire up Navigation buttons (#tut-prev, #tut-next, #tut-close)
    const btnPrev = document.getElementById('tut-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.currentStep > 0) {
          this.goTo(this.currentStep - 1);
        }
      });
    }

    const btnNext = document.getElementById('tut-next');
    if (btnNext) {
      btnNext.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.currentStep >= this.steps.length - 1) {
          this.complete();
        } else {
          this.goTo(this.currentStep + 1);
        }
      });
    }

    const btnClose = document.getElementById('tut-close');
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
      });
    }

    // 4. Backdrop click dismisses
    const backdrop = document.querySelector('.tutorial-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.close();
        }
      });
    }

    // 5. Keyboard Navigation (Escape, ArrowLeft, ArrowRight, Enter)
    window.addEventListener('keydown', (e) => {
      const overlay = document.getElementById('tutorial-overlay');
      if (!overlay || overlay.classList.contains('hidden')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (this.currentStep >= this.steps.length - 1) {
          this.complete();
        } else {
          this.goTo(this.currentStep + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (this.currentStep > 0) {
          this.goTo(this.currentStep - 1);
        }
      }
    });

    // 6. Check localStorage: if not set and auto-start not suppressed, start tutorial
    let isDone = false;
    try {
      isDone = localStorage.getItem('aresNavTutorialDone') === 'true';
    } catch (err) {
      console.warn('[P0_TUTORIAL] Unable to read localStorage:', err);
    }

    if (!isDone && !this.suppressAutoStart) {
      // Auto-start tutorial on first visit
      // Give UI components a brief frame to render
      setTimeout(() => {
        if (!this.suppressAutoStart) {
          let checkDone = false;
          try {
            checkDone = localStorage.getItem('aresNavTutorialDone') === 'true';
          } catch (_) {}
          if (!checkDone) {
            this.start();
          }
        }
      }, 350);
    }
  },

  /**
   * Start or restart the tutorial from step 0.
   * RESTART BEHAVIOR:
   * Always resets step index to 0 and removes any auto-start suppression.
   * Wires into #btn-tutorial to allow users to revisit the tutorial anytime.
   */
  start() {
    this.suppressAutoStart = false;

    if (this._completeTimer) {
      clearTimeout(this._completeTimer);
      this._completeTimer = null;
    }

    // Hide Mission Setup Wizard if currently open, ensuring clear view
    const wizardOverlay = document.getElementById('wizard-overlay');
    if (wizardOverlay) {
      wizardOverlay.classList.add('hidden');
    }

    // Reveal tutorial overlay
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }

    // Reset step to 0 and render
    this.currentStep = 0;
    this.goTo(0);
  },

  /**
   * Close tutorial overlay and clear all active element highlights.
   */
  close() {
    if (this._completeTimer) {
      clearTimeout(this._completeTimer);
      this._completeTimer = null;
    }

    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }

    this.clearHighlight();
  },

  /**
   * Navigate to a specific step index.
   * @param {number} stepIndex - 0-based step index
   */
  goTo(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.steps.length) return;
    this.currentStep = stepIndex;
    const step = this.steps[stepIndex];
    this.renderStep(step, stepIndex);
  },

  /**
   * Render a step: update DOM elements, navigation buttons, dots, positioning, and highlight.
   * @param {object} step - The step definition object
   * @param {number} stepIndex - 0-based index
   */
  renderStep(step, stepIndex) {
    // 1. Update text & icon elements
    const iconEl = document.getElementById('tut-icon');
    if (iconEl) iconEl.textContent = step.icon || '🚀';

    const titleEl = document.getElementById('tut-title');
    if (titleEl) titleEl.textContent = step.title || '';

    const bodyEl = document.getElementById('tut-body');
    if (bodyEl) bodyEl.innerHTML = step.body || '';

    const badgeEl = document.getElementById('tut-step-badge');
    if (badgeEl) {
      badgeEl.textContent = `Step ${stepIndex + 1} of ${this.steps.length}`;
    }

    // 2. Update navigation buttons
    const btnPrev = document.getElementById('tut-prev');
    if (btnPrev) {
      btnPrev.disabled = (stepIndex === 0);
    }

    const btnNext = document.getElementById('tut-next');
    if (btnNext) {
      btnNext.disabled = false;
      if (stepIndex === this.steps.length - 1) {
        btnNext.textContent = 'Finish ✓';
      } else {
        btnNext.textContent = 'Next →';
      }
    }

    // 3. Update dots
    this._renderDots(stepIndex);

    // 4. Position the tutorial panel
    this._positionPanel(step.position || 'bottom');

    // 5. Highlight target element
    this.highlightElement(step.highlight);
  },

  /**
   * Position the tutorial panel dynamically according to 'top' | 'bottom' | 'center'.
   * @param {'top'|'bottom'|'center'} position
   * @private
   */
  _positionPanel(position) {
    const panel = document.getElementById('tutorial-panel');
    if (!panel) return;

    panel.classList.remove('tut-pos-top', 'tut-pos-bottom', 'tut-pos-center');
    panel.classList.add(`tut-pos-${position}`);

    if (position === 'top') {
      panel.style.top = '32px';
      panel.style.bottom = 'auto';
      panel.style.left = '50%';
      panel.style.transform = 'translateX(-50%)';
    } else if (position === 'center') {
      panel.style.top = '50%';
      panel.style.bottom = 'auto';
      panel.style.left = '50%';
      panel.style.transform = 'translate(-50%, -50%)';
    } else {
      // Default: 'bottom'
      panel.style.top = 'auto';
      panel.style.bottom = '32px';
      panel.style.left = '50%';
      panel.style.transform = 'translateX(-50%)';
    }
  },

  /**
   * Render or update the step indicator dots in #tut-dots.
   * @param {number} activeIndex
   * @private
   */
  _renderDots(activeIndex) {
    const container = document.getElementById('tut-dots');
    if (!container) return;

    // Check if dots already exist and count matches
    if (container.children.length !== this.steps.length) {
      container.innerHTML = '';
      this.steps.forEach((step, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'tutorial-dot' + (idx === activeIndex ? ' active' : '');
        dot.setAttribute('aria-label', `Go to Step ${idx + 1}: ${step.title}`);
        dot.setAttribute('title', `Step ${idx + 1}: ${step.title}`);
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          this.goTo(idx);
        });
        container.appendChild(dot);
      });
    } else {
      Array.from(container.children).forEach((dot, idx) => {
        dot.classList.toggle('active', idx === activeIndex);
      });
    }
  },

  /**
   * Highlight a target element by CSS selector, removing previous highlights.
   * Smoothly scrolls the element into view.
   * @param {string|null} selector - CSS selector of element to highlight
   * @returns {HTMLElement|null}
   */
  highlightElement(selector) {
    this.clearHighlight();

    if (!selector) return null;

    try {
      const el = document.querySelector(selector);
      if (el) {
        // If element is temporarily hidden via .hidden class, unhide for this step
        if (el.classList.contains('hidden')) {
          el.classList.remove('hidden');
          el.setAttribute('data-tut-unhidden', 'true');
        }

        el.classList.add('tutorial-highlight');
        this._highlightedElement = el;

        try {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        } catch (_) {
          el.scrollIntoView(false);
        }

        return el;
      }
    } catch (err) {
      console.warn(`[P0_TUTORIAL] highlightElement error for selector "${selector}":`, err);
    }

    return null;
  },

  /**
   * Remove tutorial-highlight class from all DOM elements and restore any temporarily unhidden elements.
   */
  clearHighlight() {
    try {
      const highlighted = document.querySelectorAll('.tutorial-highlight');
      highlighted.forEach(el => el.classList.remove('tutorial-highlight'));

      const unhidden = document.querySelectorAll('[data-tut-unhidden="true"]');
      unhidden.forEach(el => {
        el.removeAttribute('data-tut-unhidden');
        el.classList.add('hidden');
      });

      this._highlightedElement = null;
    } catch (err) {
      console.warn('[P0_TUTORIAL] clearHighlight error:', err);
    }
  },

  /**
   * Mark tutorial complete, persist to localStorage, show completion confirmation, and auto-close after 1.5s.
   */
  complete() {
    try {
      localStorage.setItem('aresNavTutorialDone', 'true');
    } catch (err) {
      console.warn('[P0_TUTORIAL] Failed to save aresNavTutorialDone to localStorage:', err);
    }

    this.clearHighlight();

    // Show completion state in tutorial card
    const iconEl = document.getElementById('tut-icon');
    const titleEl = document.getElementById('tut-title');
    const bodyEl = document.getElementById('tut-body');
    const badgeEl = document.getElementById('tut-step-badge');
    const btnNext = document.getElementById('tut-next');
    const btnPrev = document.getElementById('tut-prev');
    const dotsContainer = document.getElementById('tut-dots');

    if (badgeEl) badgeEl.textContent = 'Mission Ready';
    if (iconEl) iconEl.textContent = '🎉';
    if (titleEl) titleEl.textContent = 'Tutorial Complete!';
    if (bodyEl) {
      bodyEl.innerHTML = 'You are now ready to explore Mars with ARES-NAV. You can restart this tutorial at any time by clicking <strong>📖 Tutorial</strong> in the top navigation bar.';
    }
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) {
      btnNext.disabled = true;
      btnNext.textContent = 'Finished ✓';
    }
    if (dotsContainer) {
      Array.from(dotsContainer.children).forEach(dot => dot.classList.add('active'));
    }

    // Close after 1.5 seconds
    if (this._completeTimer) clearTimeout(this._completeTimer);
    this._completeTimer = setTimeout(() => {
      this.close();
      this._completeTimer = null;
    }, 1500);
  }
};

// Export to global context
window.TUTORIAL_STEPS = TUTORIAL_STEPS;
window.P0_TUTORIAL = P0_TUTORIAL;

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      P0_TUTORIAL.init();
    });
  } else {
    // Schedule on next tick to allow other modules to configure if needed
    setTimeout(() => {
      P0_TUTORIAL.init();
    }, 0);
  }
}
