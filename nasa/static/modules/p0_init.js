// p0_init.js — ARES-NAV P0 Initialization Coordinator
window.addEventListener('DOMContentLoaded', () => {
  // Wait for app.js to call initApp() first (it uses DOMContentLoaded too)
  // Use a small delay to ensure app.js runs first
  setTimeout(() => {
    // Check if app is ready
    const isReady = typeof state !== 'undefined';
    
    // Initialize all P0 modules
    if (typeof P0_UI !== 'undefined') P0_UI.init();
    if (typeof P0_TUTORIAL !== 'undefined') P0_TUTORIAL.init();
    if (typeof P0_KNOWLEDGE !== 'undefined') P0_KNOWLEDGE.init();
    if (typeof P0_DATA_EXPLORER !== 'undefined') P0_DATA_EXPLORER.init();
    if (typeof P0_USER_LAYERS !== 'undefined') P0_USER_LAYERS.init();
    if (typeof P0_PROVENANCE !== 'undefined') P0_PROVENANCE.init && P0_PROVENANCE.init();
    
    // Wire up wizard
    initWizard();
    
    // Patch app.js loadSite to call P0 hooks after each site load
    patchLoadSite();
    
    console.log('[ARES-NAV P0] All modules initialized');
  }, 150);
});

function initWizard() {
  // Show wizard only on first visit
  const wizardDone = localStorage.getItem('aresNavWizardDone');
  const overlay = document.getElementById('wizard-overlay');
  if (!overlay) return;
  
  if (wizardDone) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
    return;
  }
  
  overlay.style.display = 'flex';
  
  // Wire wizard choice buttons (all lead to step 2 by default)
  document.querySelectorAll('.wizard-choice[data-next="2"]').forEach(btn => {
    btn.addEventListener('click', () => showWizardStep('wiz-step-2'));
  });
  document.getElementById('wiz-choice-habitat')?.addEventListener('click', () => showWizardStep('wiz-step-habitat'));
  document.getElementById('wiz-choice-learn')?.addEventListener('click', () => showWizardStep('wiz-step-learn'));
  
  // Mode selection
  document.getElementById('wiz-mode-beginner')?.addEventListener('click', () => {
    P0_UI?.setMode('beginner');
    dismissWizard();
  });
  document.getElementById('wiz-mode-expert')?.addEventListener('click', () => {
    P0_UI?.setMode('expert');
    dismissWizard();
  });
  
  // Skip
  document.getElementById('wiz-skip-wizard')?.addEventListener('click', dismissWizard);
  document.getElementById('wiz-habitat-continue')?.addEventListener('click', () => {
    dismissWizard();
    setTimeout(() => {
      if (typeof P2_HABITAT !== 'undefined' && typeof P2_HABITAT.activateHabitatLayer === 'function') {
        P2_HABITAT.activateHabitatLayer();
      }
    }, 250);
  });
  document.getElementById('wiz-skip-to-app')?.addEventListener('click', dismissWizard);
  
  // Learn options
  document.getElementById('wiz-start-tutorial')?.addEventListener('click', () => {
    dismissWizard();
    setTimeout(() => P0_TUTORIAL?.start(), 300);
  });
  document.getElementById('wiz-open-glossary')?.addEventListener('click', () => {
    dismissWizard();
    setTimeout(() => P0_KNOWLEDGE?.open(null), 300);
  });
}

function showWizardStep(stepId) {
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById(stepId);
  if (step) step.classList.add('active');
}

function dismissWizard() {
  localStorage.setItem('aresNavWizardDone', 'true');
  const overlay = document.getElementById('wizard-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transform = 'scale(0.97)';
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
  }
}

function patchLoadSite() {
  // Monkey-patch the existing loadSite to also call P0 hooks
  if (typeof window.loadSite !== 'function') return;
  const origLoadSite = window.loadSite;
  window.loadSite = async function(siteId) {
    await origLoadSite.call(this, siteId);
    // After site loads, update P0 components
    if (typeof P0_UI !== 'undefined') P0_UI.updateBeginnerSiteCard();
    if (typeof P0_PROVENANCE !== 'undefined') {
      const st = typeof state !== 'undefined' ? state : {};
      P0_PROVENANCE.updateCoverageIndicator(siteId, st.activeLayer || 'composite');
    }
    if (typeof P0_USER_LAYERS !== 'undefined') P0_USER_LAYERS.redrawUserObsCanvas();
  };
}
