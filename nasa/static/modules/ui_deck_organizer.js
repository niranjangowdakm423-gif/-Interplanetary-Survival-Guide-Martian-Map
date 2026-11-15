/**
 * ARES-NAV UI Deck Organizer
 * Reorganizes the workspace into clean, uncluttered segmented tabs:
 * - Left Panel: [Layers] | [Traverse AI] | [Overlays]
 * - Right Panel: [Vitals] | [Hazards] | [Comms/Hab] | [Ephemeris] | [Targets]
 *
 * Automatically relocates dynamically injected cards into their dedicated deck panes.
 */

(function () {
  'use strict';

  function initDeckOrganizer() {
    setupLeftPanelTabs();
    setupRightDeckTabs();
    setupDynamicCardRelocation();
    console.log('[ARES-NAV UI] Deck Organizer initialized with uncluttered multi-deck layout');
  }

  // ---------------------------------------------------------------------------
  // 1. LEFT PANEL TABS
  // ---------------------------------------------------------------------------
  function setupLeftPanelTabs() {
    const tabs = document.querySelectorAll('.panel-nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const paneId = tab.getAttribute('data-pane');
        if (!paneId) return;

        tabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        document.querySelectorAll('.panel-tab-pane').forEach(p => {
          p.classList.remove('active');
        });
        const targetPane = document.getElementById(paneId);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 2. RIGHT PANEL DECK TABS
  // ---------------------------------------------------------------------------
  function setupRightDeckTabs() {
    const deckTabs = document.querySelectorAll('.deck-tab');
    deckTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const deckId = tab.getAttribute('data-deck');
        if (!deckId) return;

        deckTabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        document.querySelectorAll('.deck-pane').forEach(p => {
          p.classList.remove('active');
        });
        const targetDeck = document.getElementById(deckId);
        if (targetDeck) targetDeck.classList.add('active');
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 3. RELOCATE DYNAMIC CARDS TO THEIR PROPER DECK PANES
  // ---------------------------------------------------------------------------
  function relocateCards() {
    // 1. Atmospheric Drone Card -> Deck Hazards
    const atmoCard = document.getElementById('atmospheric-drone-card');
    const atmoSlot = document.getElementById('deck-hazards-slot');
    if (atmoCard && atmoSlot && atmoCard.parentNode !== atmoSlot) {
      atmoSlot.appendChild(atmoCard);
    }

    // 2. Comm Topology Card -> Deck Comms/Hab
    const commCard = document.getElementById('comm-topology-card');
    const commSlot = document.getElementById('deck-comms-slot');
    if (commCard && commSlot && commCard.parentNode !== commSlot) {
      commSlot.appendChild(commCard);
    }

    // 3. Habitat Siting Card -> Deck Comms/Hab
    const habCard = document.getElementById('p2-habitat-card');
    const habSlot = document.getElementById('deck-habitat-slot');
    if (habCard && habSlot && habCard.parentNode !== habSlot) {
      habSlot.appendChild(habCard);
    }

    // 4. Ephemeris Card -> Deck Ephem
    const ephemCard = document.getElementById('ephem-card');
    const ephemSlot = document.getElementById('deck-ephem-slot');
    if (ephemCard && ephemSlot && ephemCard.parentNode !== ephemSlot) {
      ephemSlot.appendChild(ephemCard);
    }
  }

  function setupDynamicCardRelocation() {
    // Run initial relocation
    relocateCards();

    // Check periodically during bootstrap as async scripts inject their DOM
    const interval = setInterval(relocateCards, 350);
    setTimeout(() => clearInterval(interval), 15000);

    // Also observe the right sidebar for added children
    const rightPanel = document.querySelector('.panel-right');
    if (rightPanel && window.MutationObserver) {
      const observer = new MutationObserver(() => {
        relocateCards();
      });
      observer.observe(rightPanel, { childList: true, subtree: true });
    }
  }

  // Public switcher API
  window.UI_DECK_ORGANIZER = {
    init: initDeckOrganizer,
    switchLeftTab: (paneId) => {
      const tab = document.querySelector(`.panel-nav-tab[data-pane="${paneId}"]`);
      if (tab) tab.click();
    },
    switchRightDeck: (deckId) => {
      const tab = document.querySelector(`.deck-tab[data-deck="${deckId}"]`);
      if (tab) tab.click();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDeckOrganizer);
  } else {
    initDeckOrganizer();
  }
})();
