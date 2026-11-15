/**
 * ARES-NAV // p0_provenance.js
 * Data provenance display helpers, verification badges, and real-time coverage indicator.
 * Self-contained ES6, global scope.
 */

const LAYER_PROVENANCE = {
  composite: {
    status: 'verified',
    source: 'Mars Trek WMTS + MGS MOLA + MRO CTX',
    instrument: 'MOLA laser altimeter + CTX 5m camera',
    notes: 'Real stitched MOLA hillshade raster tiles for Jezero, Melas, Arcadia; synthetic base for others.'
  },
  elevation: {
    status: 'verified',
    source: 'NASA Mars Global Surveyor MOLA',
    instrument: 'MGS MOLA Laser Altimeter (463m/px)',
    notes: 'Precision topographic DEM with 15m contour intervals; 25m grid per site.'
  },
  slope: {
    status: 'calculated',
    source: 'Calculated in ARES-NAV',
    instrument: 'Derived from MOLA DEM',
    notes: 'Horn gradient algorithm slope in degrees; traverses >15° flagged per NASA STD-3001.'
  },
  boulder: {
    status: 'partial',
    source: 'NASA PDS ODE / MRO HiRISE',
    instrument: 'MRO HiRISE RDRV11 (0.25m/px)',
    notes: 'Real HiRISE sub-meter image variance for Jezero; terrain-roughness proxy for other sites.'
  },
  mineral: {
    status: 'partial',
    source: 'NASA PDS ODE + Geosciences Node',
    instrument: 'MRO CRISM MTRDR Spectral Cubes',
    notes: 'Real CRISM catalog footprints for Jezero; POI-derived synthesis for other sites.'
  },
  hydration: {
    status: 'simulated',
    source: 'NASA PDS / Campbell et al.',
    instrument: 'MRO SHARAD + Neutron Spectrometer',
    notes: 'Subsurface water ice equivalent modeled from published SHARAD radar detections.'
  },
  radiation: {
    status: 'calculated',
    source: 'NASA PDS PPI / Curiosity RAD',
    instrument: 'MSL Curiosity RAD (MSL-M-RAD-3-RDR-V1.0)',
    notes: 'Calibrated to 26.67 µSv/hr MSL baseline, attenuated by atmospheric pressure column and terrain sky-view factor.'
  },
  comm_los: {
    status: 'calculated',
    source: 'Calculated in ARES-NAV',
    instrument: '3D Ray-Marching Engine',
    notes: 'Line-of-sight viewshed computed from habitat antenna mast (16-22m) across MOLA DEM.'
  },
  risk_heatmap: {
    status: 'calculated',
    source: 'Calculated in ARES-NAV',
    instrument: 'Multi-Hazard Composite Engine',
    notes: 'Weighted composite across MOLA slope (35%), HiRISE boulders (25%), MSL RAD (20%), and UHF shadows (20%).'
  },
  habitat_suitability: {
    status: 'calculated',
    source: 'Calculated in ARES-NAV (P2.2 MCDA / AHP)',
    instrument: 'Saaty AHP + HLS Blast Exclusion + SVF Ray-Marching',
    notes: 'Multi-criteria basecamp suitability with 800m HLS plume standoff and cos²(θ) horizon sky-view masking.'
  }
};

const P0_PROVENANCE = {
  LAYER_PROVENANCE,

  getStatusBadge(status) {
    const s = String(status || 'unverified').toLowerCase();
    const labels = {
      verified: 'Verified',
      calculated: 'Calculated',
      simulated: 'Simulated',
      partial: 'Partial',
      unverified: 'Unverified',
      outdated: 'Outdated'
    };
    const label = labels[s] || s.toUpperCase();
    return `<span class="prov-badge prov-${s}">${label}</span>`;
  },

  getLayerInfo(layerId) {
    return LAYER_PROVENANCE[layerId] || {
      status: 'unverified',
      source: 'User / Unknown',
      instrument: 'External Observation',
      notes: 'Custom or uncatalogued layer.'
    };
  },

  updateCoverageIndicator(siteId, layerId) {
    const indicator = document.getElementById('coverage-indicator');
    const textEl = document.getElementById('coverage-text') || indicator;
    if (!indicator || !textEl) return;

    const currentSite = String(siteId || (typeof state !== 'undefined' ? state.siteId : 'jezero')).toLowerCase();
    const currentLayer = String(layerId || (typeof state !== 'undefined' ? state.activeLayer : 'composite')).toLowerCase();

    const realTileSites = ['jezero', 'melas', 'arcadia'];
    const hasRealTiles = realTileSites.includes(currentSite);

    let label = 'MOLA + Synthesized';
    let theme = 'grey'; // 'green' | 'amber' | 'orange' | 'grey'

    if (currentLayer === 'elevation' || currentLayer === 'composite') {
      if (hasRealTiles) {
        label = 'Real MOLA Tiles';
        theme = 'green';
      } else {
        label = 'Synthesized from MOLA';
        theme = 'grey';
      }
    } else if (currentLayer === 'boulder') {
      if (currentSite === 'jezero') {
        label = 'Real HiRISE Data';
        theme = 'green';
      } else {
        label = 'Estimated from Terrain';
        theme = 'grey';
      }
    } else if (currentLayer === 'mineral') {
      if (currentSite === 'jezero') {
        label = 'Real CRISM Catalog';
        theme = 'amber';
      } else {
        label = 'Modeled from POI Data';
        theme = 'orange';
      }
    } else if (currentLayer === 'hydration') {
      if (currentSite === 'arcadia') {
        label = 'Modeled Ice (SHARAD)';
        theme = 'amber';
      } else {
        label = 'Modeled from POI Data';
        theme = 'orange';
      }
    } else if (currentLayer === 'radiation') {
      label = 'MSL RAD Calibrated Model';
      theme = 'amber';
    } else if (currentLayer === 'comm_los') {
      label = 'Physics Model (3D Ray-March)';
      theme = 'amber';
    } else if (currentLayer === 'slope') {
      label = hasRealTiles ? 'Derived from MOLA DEM' : 'Synthesized Slope Model';
      theme = hasRealTiles ? 'amber' : 'grey';
    } else if (currentLayer === 'risk_heatmap') {
      label = 'Multi-Hazard Composite';
      theme = 'amber';
    } else if (currentLayer === 'habitat_suitability') {
      label = 'MCDA / AHP Siting Model';
      theme = 'green';
    }

    textEl.textContent = label;

    // Apply color and border styling
    if (theme === 'green') {
      indicator.style.borderColor = 'rgba(24, 226, 153, 0.6)';
      indicator.style.color = '#18e299';
      indicator.style.background = 'rgba(8, 12, 19, 0.9)';
    } else if (theme === 'amber') {
      indicator.style.borderColor = 'rgba(255, 171, 46, 0.6)';
      indicator.style.color = '#ffab2e';
      indicator.style.background = 'rgba(8, 12, 19, 0.9)';
    } else if (theme === 'orange') {
      indicator.style.borderColor = 'rgba(255, 94, 43, 0.6)';
      indicator.style.color = '#ff9966';
      indicator.style.background = 'rgba(8, 12, 19, 0.9)';
    } else {
      indicator.style.borderColor = 'rgba(154, 163, 178, 0.4)';
      indicator.style.color = '#9aa3b2';
      indicator.style.background = 'rgba(8, 12, 19, 0.9)';
    }
  },

  init() {
    // Hook layer selection buttons
    const bindLayerButtons = () => {
      document.querySelectorAll('.layer-btn, .blp-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const layerId = btn.getAttribute('data-layer');
          if (layerId) {
            const siteId = typeof state !== 'undefined' ? state.siteId : 'jezero';
            this.updateCoverageIndicator(siteId, layerId);
          }
        });
      });
    };

    bindLayerButtons();

    // Initial update
    const siteId = typeof state !== 'undefined' ? (state.siteId || 'jezero') : 'jezero';
    const layerId = typeof state !== 'undefined' ? (state.activeLayer || 'composite') : 'composite';
    this.updateCoverageIndicator(siteId, layerId);

    console.log('[ARES-NAV P0] Provenance module initialized');
  }
};

window.P0_PROVENANCE = P0_PROVENANCE;
window.LAYER_PROVENANCE = LAYER_PROVENANCE;
