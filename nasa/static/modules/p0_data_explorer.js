/**
 * ARES-NAV // p0_data_explorer.js
 * Mars Data Explorer modal with NASA dataset catalogue and user observation upload pipeline.
 * Self-contained ES6, global scope.
 */

const NASA_DATASETS = [
  {
    id: 'mola-dem',
    name: 'MOLA Digital Elevation Model',
    category: 'terrain',
    instrument: 'MGS MOLA',
    source: 'NASA Mars Global Surveyor / Mars Trek WMTS',
    type: 'real',
    coverage: 'Global (463m/px); pre-downloaded tiles for Jezero, Melas, Arcadia',
    resolution: '463m global / 25m grid (site)',
    description: 'Real MOLA hillshade mosaics pre-downloaded from Mars Trek WMTS. Used as the terrain base and for elevation grid extraction.',
    layer: 'elevation',
    validation_status: 'verified'
  },
  {
    id: 'slope-map',
    name: 'Geodesic Slope Map',
    category: 'terrain',
    instrument: 'Derived from MOLA',
    source: 'Calculated in ARES-NAV from MOLA DEM',
    type: 'calculated',
    coverage: 'All 10 sites',
    resolution: '25m/cell',
    description: 'Horn gradient slope in degrees, derived from the MOLA elevation grid. Drives route planning traversability rules.',
    layer: 'slope',
    validation_status: 'calculated'
  },
  {
    id: 'ctx-mosaic',
    name: 'CTX 5m Context Camera Mosaic',
    category: 'terrain',
    instrument: 'MRO CTX',
    source: 'ArcGIS WMTS (astro.arcgis.com)',
    type: 'real',
    coverage: 'Global (5m/px, uncontrolled mosaic)',
    resolution: '5m',
    description: 'Live-streamed Context Camera mosaic from ArcGIS WMTS. Requires internet. Used as an optional map overlay.',
    layer: 'composite',
    validation_status: 'verified'
  },
  {
    id: 'hirise-rdr',
    name: 'HiRISE Sub-Meter RDR Imagery',
    category: 'terrain',
    instrument: 'MRO HiRISE',
    source: 'NASA PDS ODE (oderest.rsl.wustl.edu)',
    type: 'real',
    coverage: 'Jezero Crater only (3 real images downloaded)',
    resolution: '0.25m/px',
    description: 'Real HiRISE RDRV11 images for Jezero. Boulder roughness derived from spatial gradient variance of these real images. Other sites use Jezero as a roughness proxy.',
    layer: 'boulder',
    validation_status: 'partial'
  },
  {
    id: 'crism-mtrdr',
    name: 'CRISM MTRDR Spectral Cubes',
    category: 'geology',
    instrument: 'MRO CRISM',
    source: 'NASA PDS ODE + PDS Geosciences Node',
    type: 'real',
    coverage: '20 real product records (catalog); browse tiles not downloaded',
    resolution: '18-36m/px (product)',
    description: 'Real CRISM MTRDR targeted spectral cubes — ODE catalog records loaded. Mineral index maps for Jezero use real CRISM product footprints; other sites synthesized from POI data.',
    layer: 'mineral',
    validation_status: 'partial'
  },
  {
    id: 'sharad-ice',
    name: 'SHARAD Subsurface Ice Profiles',
    category: 'resources',
    instrument: 'MRO SHARAD',
    source: 'NASA PDS / Published literature (Campbell et al.)',
    type: 'simulated',
    coverage: 'Modeled based on published detections (Arcadia Planitia, hellas edges)',
    resolution: '~1km lateral',
    description: 'Water ice extent modeled from published SHARAD detection maps. Not globally complete. Arcadia site has highest confidence ice estimates.',
    layer: 'hydration',
    validation_status: 'simulated'
  },
  {
    id: 'msl-rad-archive',
    name: 'MSL RAD PDS Archive',
    category: 'environment',
    instrument: 'MSL Curiosity RAD',
    source: 'NASA PDS PPI (pds-ppi.igpp.ucla.edu)',
    type: 'real',
    coverage: 'Gale Crater continuous measurements (2012-present)',
    resolution: 'Point measurement (calibration baseline)',
    description: '5,570 real RDR files indexed from the MSL-M-RAD-3-RDR-V1.0 archive. Provides the 26.67 µSv/hr surface GCR dose calibration point used by all ARES-NAV radiation models.',
    layer: 'radiation',
    validation_status: 'verified'
  },
  {
    id: 'rad-model',
    name: 'Site Radiation Model',
    category: 'environment',
    instrument: 'Derived: MSL RAD + terrain model',
    source: 'Calculated in ARES-NAV',
    type: 'calculated',
    coverage: 'All 10 sites',
    resolution: '25m/cell',
    description: 'Radiation dose rate modeled per cell using MSL RAD baseline × sky-view factor attenuation × shelter POI shielding factors. Physics-based, not direct observation.',
    layer: 'radiation',
    validation_status: 'calculated'
  },
  {
    id: 'temp-model',
    name: 'Diurnal Temperature Model',
    category: 'environment',
    instrument: 'Derived: published Martian climate models',
    source: 'Calculated in ARES-NAV from site parameters',
    type: 'simulated',
    coverage: 'All 10 sites',
    resolution: '25m/cell',
    description: 'Surface temperature estimated from mean, min, max per site combined with aspect-based insolation model. Not sourced from InSight TWINS or REMS sensors.',
    layer: null,
    validation_status: 'simulated'
  },
  {
    id: 'uhf-viewshed',
    name: 'UHF Radio Viewshed',
    category: 'communication',
    instrument: 'Derived: habitat antenna geometry + MOLA terrain',
    source: 'Calculated in ARES-NAV (3D ray-march)',
    type: 'calculated',
    coverage: 'All 10 sites from habitat location',
    resolution: '25m/cell',
    description: '3D ray-marched line-of-sight from the habitat UHF antenna mast. Computes free-space path loss and terrain obstruction penalty per cell. Physics model, not from real radio measurements.',
    layer: 'comm_los',
    validation_status: 'calculated'
  }
];

const P0_DATA_EXPLORER = {
  activeTab: 'nasa',
  activeCategory: 'all',
  currentStage: 1,
  uploadState: {
    file: null,
    fileName: '',
    fileSize: 0,
    fileExt: '',
    format: '', // 'csv'|'json'|'geojson'|'image'
    obsType: 'terrain',
    rawText: '',
    dataUrl: '',
    parsedData: null,
    features: [],
    detectedCoords: [],
    validationErrors: [],
    validationWarnings: [],
    validationChecks: [],
    isValid: false
  },

  init() {
    this.wireModalControls();
    this.wireTabs();
    this.wireCategoryFilter();
    this.wireUploadPipeline();
    this.renderNasaDatasets('all');
    this.loadMyDatasets();
    console.log('[ARES-NAV P0] Data Explorer initialized');
  },

  open(tab = 'nasa') {
    const modal = document.getElementById('data-explorer-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    this.switchTab(tab);
  },

  close() {
    const modal = document.getElementById('data-explorer-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
  },

  wireModalControls() {
    const openBtn = document.getElementById('btn-data-explorer');
    const closeBtn = document.getElementById('btn-close-data-explorer');
    const modal = document.getElementById('data-explorer-modal');

    openBtn?.addEventListener('click', () => this.open());
    closeBtn?.addEventListener('click', () => this.close());

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden') && modal.style.display !== 'none') {
        this.close();
      }
    });

    document.getElementById('go-to-upload-btn')?.addEventListener('click', () => {
      this.switchTab('upload');
    });
  },

  wireTabs() {
    const tabs = document.querySelectorAll('.data-explorer-tabs .dex-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        if (target) this.switchTab(target);
      });
    });
  },

  switchTab(tabKey) {
    this.activeTab = tabKey;
    const tabs = document.querySelectorAll('.data-explorer-tabs .dex-tab');
    tabs.forEach((t) => {
      const match = t.getAttribute('data-tab') === tabKey;
      t.classList.toggle('active', match);
      t.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    const panels = {
      nasa: document.getElementById('dex-panel-nasa'),
      upload: document.getElementById('dex-panel-upload'),
      'my-data': document.getElementById('dex-panel-my-data')
    };

    Object.keys(panels).forEach((k) => {
      if (panels[k]) {
        panels[k].classList.toggle('active', k === tabKey);
      }
    });

    if (tabKey === 'nasa') {
      this.renderNasaDatasets(this.activeCategory);
    } else if (tabKey === 'my-data') {
      this.loadMyDatasets();
    }
  },

  wireCategoryFilter() {
    const filterBtns = document.querySelectorAll('.dex-category-filter .dex-filter-btn');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.getAttribute('data-cat') || 'all';
        this.activeCategory = cat;
        this.renderNasaDatasets(cat);
      });
    });
  },

  renderNasaDatasets(cat = 'all') {
    const grid = document.getElementById('nasa-dataset-grid');
    if (!grid) return;

    const filtered = cat === 'all'
      ? NASA_DATASETS
      : NASA_DATASETS.filter((d) => d.category === cat);

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1; padding:24px; text-align:center; color:var(--text-muted);">No datasets found in category "${cat}".</div>`;
      return;
    }

    grid.innerHTML = filtered.map((ds) => {
      const badgeHtml = (typeof P0_PROVENANCE !== 'undefined' && P0_PROVENANCE.getStatusBadge)
        ? P0_PROVENANCE.getStatusBadge(ds.validation_status)
        : `<span class="prov-badge prov-${ds.validation_status}">${ds.validation_status.toUpperCase()}</span>`;

      const viewBtn = ds.layer
        ? `<div class="dex-card-action">
             <button class="dex-btn-view-layer" data-layer="${ds.layer}">View Layer on Map →</button>
           </div>`
        : '';

      return `
        <div class="dex-dataset-card" data-id="${ds.id}">
          <div class="dex-card-header">
            <div>
              <div class="dex-card-name">${ds.name}</div>
              <div class="dex-card-instrument">${ds.instrument} // ${ds.category.toUpperCase()}</div>
            </div>
            ${badgeHtml}
          </div>
          <p class="dex-card-desc">${ds.description}</p>
          <div class="dex-card-meta">
            <span>Type: <strong style="color:var(--text-main)">${ds.type.toUpperCase()}</strong></span>
            <span>Coverage: <strong style="color:var(--text-main)">${ds.coverage}</strong></span>
            <span>Resolution: <strong style="color:var(--cyan-hud)">${ds.resolution}</strong></span>
            <span>Source: <strong style="color:var(--text-main)">${ds.source}</strong></span>
          </div>
          ${viewBtn}
        </div>
      `;
    }).join('');

    // Wire up layer buttons
    grid.querySelectorAll('.dex-btn-view-layer').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layerId = btn.getAttribute('data-layer');
        if (layerId) {
          this.activateLayerOnMap(layerId);
          this.close();
        }
      });
    });
  },

  activateLayerOnMap(layerId) {
    const layerBtn = document.querySelector(`.layer-btn[data-layer="${layerId}"]`) ||
                     document.querySelector(`.blp-btn[data-layer="${layerId}"]`);
    if (layerBtn) {
      layerBtn.click();
    } else if (typeof state !== 'undefined') {
      state.activeLayer = layerId;
      if (typeof bake2DTerrainLayer === 'function') bake2DTerrainLayer();
      if (typeof renderScene === 'function') renderScene();
      if (typeof updateLegendUI === 'function') updateLegendUI();
    }
  },

  // =========================================================================
  // UPLOAD PIPELINE
  // =========================================================================

  wireUploadPipeline() {
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('upload-file-input');
    const obsTypeSelect = document.getElementById('upload-obs-type');

    dropzone?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) this.processFileSelection(file);
    });

    // Drag / Drop
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone?.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone?.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone?.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt && dt.files && dt.files[0];
      if (file) this.processFileSelection(file);
    });

    // Navigation buttons between stages
    document.getElementById('upload-back-1')?.addEventListener('click', () => this.goToStage(1));
    document.getElementById('upload-proceed-preview')?.addEventListener('click', () => this.goToStage(3));
    document.getElementById('upload-back-2')?.addEventListener('click', () => this.goToStage(2));
    document.getElementById('upload-proceed-metadata')?.addEventListener('click', () => this.goToStage(4));
    document.getElementById('upload-back-3')?.addEventListener('click', () => this.goToStage(3));
    document.getElementById('upload-submit')?.addEventListener('click', () => this.submitUpload());

    // Success buttons
    document.getElementById('upload-view-on-map')?.addEventListener('click', () => {
      this.close();
      const tab2d = document.getElementById('tab-2d');
      if (tab2d) tab2d.click();
    });

    document.getElementById('upload-another')?.addEventListener('click', () => {
      this.resetUpload();
    });

    obsTypeSelect?.addEventListener('change', (e) => {
      this.uploadState.obsType = e.target.value;
    });
  },

  resetUpload() {
    this.uploadState = {
      file: null,
      fileName: '',
      fileSize: 0,
      fileExt: '',
      format: '',
      obsType: document.getElementById('upload-obs-type')?.value || 'terrain',
      rawText: '',
      dataUrl: '',
      parsedData: null,
      features: [],
      detectedCoords: [],
      validationErrors: [],
      validationWarnings: [],
      validationChecks: [],
      isValid: false
    };

    const fileInput = document.getElementById('upload-file-input');
    if (fileInput) fileInput.value = '';

    const errorEl = document.getElementById('upload-error');
    if (errorEl) {
      errorEl.classList.add('hidden');
      errorEl.textContent = '';
    }

    const valContainer = document.getElementById('validation-results');
    if (valContainer) valContainer.innerHTML = '';

    const previewContainer = document.getElementById('data-preview-container');
    if (previewContainer) previewContainer.innerHTML = '';

    // Clear metadata form
    ['meta-name', 'meta-source', 'meta-desc', 'meta-obs-date', 'meta-units', 'meta-lat', 'meta-lon'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const chkRouting = document.getElementById('meta-use-in-routing');
    if (chkRouting) chkRouting.checked = false;

    this.goToStage(1);
  },

  startUpload() {
    this.open('upload');
    this.resetUpload();
  },

  goToStage(stageNum) {
    this.currentStage = stageNum;

    // Update step bubbles
    for (let i = 1; i <= 5; i++) {
      const stepEl = document.getElementById(`ustep-${i}`);
      const stageEl = document.getElementById(`upload-stage-${i}`);
      if (stepEl) {
        stepEl.classList.remove('active', 'done');
        if (i < stageNum) stepEl.classList.add('done');
        else if (i === stageNum) stepEl.classList.add('active');
      }
      if (stageEl) {
        stageEl.classList.toggle('hidden', i !== stageNum);
      }
    }

    if (stageNum === 3) {
      this.renderPreviewStage();
    } else if (stageNum === 4) {
      this.populateMetadataStage();
    }
  },

  // ── Stage 1: File selection & reading ─────────────────────────────────────
  processFileSelection(file) {
    const errorEl = document.getElementById('upload-error');
    if (errorEl) errorEl.classList.add('hidden');

    const maxBytes = 25 * 1024 * 1024; // 25 MB
    if (file.size > maxBytes) {
      this.showUploadError(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 25 MB.`);
      return;
    }

    const name = file.name || 'unnamed';
    const ext = (name.split('.').pop() || '').toLowerCase();
    const allowedExts = ['csv', 'json', 'geojson', 'jpg', 'jpeg', 'png'];

    if (!allowedExts.includes(ext)) {
      this.showUploadError(`Unsupported format ".${ext}". Allowed: CSV, JSON, GeoJSON, JPG, PNG.`);
      return;
    }

    let format = 'json';
    if (ext === 'csv') format = 'csv';
    else if (ext === 'geojson') format = 'geojson';
    else if (ext === 'json') format = 'json';
    else if (['jpg', 'jpeg', 'png'].includes(ext)) format = 'image';

    const obsType = document.getElementById('upload-obs-type')?.value || 'terrain';

    this.uploadState.file = file;
    this.uploadState.fileName = name;
    this.uploadState.fileSize = file.size;
    this.uploadState.fileExt = ext;
    this.uploadState.format = format;
    this.uploadState.obsType = obsType;

    if (format === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadState.dataUrl = e.target.result;
        this.validateCurrentFile();
      };
      reader.onerror = () => this.showUploadError('Failed to read image file.');
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadState.rawText = e.target.result;
        this.validateCurrentFile();
      };
      reader.onerror = () => this.showUploadError('Failed to read text file.');
      reader.readAsText(file);
    }
  },

  showUploadError(msg) {
    const errorEl = document.getElementById('upload-error');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
    }
  },

  // ── Stage 2: Validation ──────────────────────────────────────────────────
  validateCurrentFile() {
    const s = this.uploadState;
    s.validationErrors = [];
    s.validationWarnings = [];
    s.validationChecks = [];
    s.features = [];
    s.detectedCoords = [];

    // Check 1: File size check
    s.validationChecks.push({
      status: 'ok',
      msg: `File size: ${(s.fileSize / 1024).toFixed(1)} KB (under 25 MB limit)`
    });

    if (s.format === 'csv') {
      this.validateCSV(s);
    } else if (s.format === 'geojson') {
      this.validateGeoJSON(s);
    } else if (s.format === 'json') {
      this.validateJSON(s);
    } else if (s.format === 'image') {
      this.validateImage(s);
    }

    s.isValid = s.validationErrors.length === 0;

    // Render results in #validation-results
    const container = document.getElementById('validation-results');
    if (container) {
      container.innerHTML = s.validationChecks.map((chk) => {
        const icon = chk.status === 'ok' ? '✅' : chk.status === 'warn' ? '⚠️' : '❌';
        const color = chk.status === 'ok' ? '#18e299' : chk.status === 'warn' ? '#ffab2e' : '#ff3355';
        return `
          <div class="val-item">
            <span class="val-icon">${icon}</span>
            <span class="val-text" style="color:${color}">${chk.msg}</span>
          </div>
        `;
      }).join('');
    }

    const proceedBtn = document.getElementById('upload-proceed-preview');
    if (proceedBtn) {
      proceedBtn.disabled = !s.isValid;
      proceedBtn.style.opacity = s.isValid ? '1' : '0.4';
      proceedBtn.style.cursor = s.isValid ? 'pointer' : 'not-allowed';
    }

    this.goToStage(2);
  },

  validateCSV(s) {
    const lines = s.rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      s.validationErrors.push('CSV file is empty');
      s.validationChecks.push({ status: 'err', msg: 'CSV file is completely empty' });
      return;
    }

    // Split headers
    const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
    const headers = this.parseCSVLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());

    if (headers.length === 0) {
      s.validationErrors.push('No headers found in CSV');
      s.validationChecks.push({ status: 'err', msg: 'CSV header row could not be parsed' });
      return;
    }

    s.validationChecks.push({
      status: 'ok',
      msg: `Format OK: CSV with ${headers.length} headers detected (${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''})`
    });

    const dataRowCount = lines.length - 1;
    if (dataRowCount < 1) {
      s.validationErrors.push('CSV has no data rows');
      s.validationChecks.push({ status: 'err', msg: 'CSV has header row but 0 data rows' });
      return;
    } else if (dataRowCount < 3) {
      s.validationWarnings.push('Few data rows (< 3)');
      s.validationChecks.push({ status: 'warn', msg: `Notice: Dataset contains only ${dataRowCount} row(s)` });
    } else {
      s.validationChecks.push({ status: 'ok', msg: `Row count: ${dataRowCount} observation rows parsed` });
    }

    // Detect lat / lon column indices
    let latIdx = headers.findIndex((h) => /^(lat|latitude|dec_lat|y|northing)$/i.test(h));
    let lonIdx = headers.findIndex((h) => /^(lon|lng|longitude|dec_lon|x|easting)$/i.test(h));

    if (latIdx === -1) latIdx = headers.findIndex((h) => h.includes('lat'));
    if (lonIdx === -1) lonIdx = headers.findIndex((h) => h.includes('lon') || h.includes('lng'));

    const parsedRows = [];
    let outOfRangeCoords = 0;
    const coordSeen = new Set();
    let duplicates = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCSVLine(lines[i], delimiter);
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx] !== undefined ? cols[idx].trim() : '';
      });

      if (latIdx !== -1 && lonIdx !== -1) {
        const latVal = parseFloat(cols[latIdx]);
        const lonVal = parseFloat(cols[lonIdx]);
        if (!isNaN(latVal) && !isNaN(lonVal)) {
          // Mars coordinates range: Lat -90 to +90, Lon -180 to 360
          if (latVal < -90 || latVal > 90 || lonVal < -180 || lonVal > 360) {
            outOfRangeCoords++;
          } else {
            rowObj._lat = latVal;
            rowObj._lon = lonVal;
            const key = `${latVal.toFixed(4)},${lonVal.toFixed(4)}`;
            if (coordSeen.has(key)) duplicates++;
            else coordSeen.add(key);
            s.detectedCoords.push({ lat: latVal, lon: lonVal });
          }
        }
      }
      parsedRows.push(rowObj);
    }

    s.parsedData = { headers, rows: parsedRows };
    s.features = parsedRows;

    if (latIdx !== -1 && lonIdx !== -1) {
      if (outOfRangeCoords > 0) {
        s.validationErrors.push('Coordinates out of Mars range');
        s.validationChecks.push({
          status: 'err',
          msg: `${outOfRangeCoords} coordinate pair(s) fall outside valid Mars range (Lat: -90° to 90°, Lon: -180° to 360°)`
        });
      } else if (s.detectedCoords.length > 0) {
        s.validationChecks.push({
          status: 'ok',
          msg: `Geospatial coordinates verified: ${s.detectedCoords.length} valid Martian lat/lon points found`
        });
        if (duplicates > 0) {
          s.validationWarnings.push('Duplicate coordinates');
          s.validationChecks.push({ status: 'warn', msg: `Detected ${duplicates} duplicate coordinate pair(s)` });
        }
      } else {
        s.validationWarnings.push('No valid numeric coordinates');
        s.validationChecks.push({ status: 'warn', msg: 'Coordinate columns found but values are empty or non-numeric. Manual coords can be assigned.' });
      }
    } else {
      s.validationWarnings.push('No geospatial columns');
      s.validationChecks.push({
        status: 'warn',
        msg: 'No latitude/longitude columns detected in CSV. You can assign site coordinates manually in Step 4.'
      });
    }
  },

  parseCSVLine(line, delimiter = ',') {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === delimiter && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  },

  validateGeoJSON(s) {
    let json;
    try {
      json = JSON.parse(s.rawText);
    } catch (err) {
      s.validationErrors.push('JSON parse error');
      s.validationChecks.push({ status: 'err', msg: `GeoJSON is not valid JSON: ${err.message}` });
      return;
    }

    if (!json || typeof json !== 'object') {
      s.validationErrors.push('Invalid GeoJSON');
      s.validationChecks.push({ status: 'err', msg: 'GeoJSON root must be an object' });
      return;
    }

    if (json.type !== 'FeatureCollection' && json.type !== 'Feature') {
      s.validationErrors.push('GeoJSON type must be FeatureCollection or Feature');
      s.validationChecks.push({ status: 'err', msg: `Expected GeoJSON type "FeatureCollection" or "Feature", got "${json.type}"` });
      return;
    }

    const featureList = json.type === 'FeatureCollection' ? (json.features || []) : [json];
    s.validationChecks.push({
      status: 'ok',
      msg: `Format OK: Valid GeoJSON ${json.type} with ${featureList.length} feature(s)`
    });

    if (featureList.length === 0) {
      s.validationErrors.push('Features array is empty');
      s.validationChecks.push({ status: 'err', msg: 'GeoJSON has 0 features' });
      return;
    }

    let validCoords = 0;
    let outOfRange = 0;
    const flatFeatures = [];

    featureList.forEach((feat, idx) => {
      const geom = feat.geometry;
      let lat = null;
      let lon = null;

      if (geom && geom.coordinates) {
        if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
          lon = geom.coordinates[0];
          lat = geom.coordinates[1];
        } else if (geom.type === 'LineString' && Array.isArray(geom.coordinates[0])) {
          lon = geom.coordinates[0][0];
          lat = geom.coordinates[0][1];
        } else if (geom.type === 'Polygon' && Array.isArray(geom.coordinates[0]) && Array.isArray(geom.coordinates[0][0])) {
          lon = geom.coordinates[0][0][0];
          lat = geom.coordinates[0][0][1];
        }
      }

      if (lat != null && lon != null) {
        if (typeof lat === 'number' && typeof lon === 'number') {
          if (lat < -90 || lat > 90 || lon < -180 || lon > 360) {
            outOfRange++;
          } else {
            validCoords++;
            s.detectedCoords.push({ lat, lon });
          }
        } else {
          outOfRange++;
        }
      }

      flatFeatures.push({
        id: feat.id || `feat-${idx + 1}`,
        type: feat.geometry ? feat.geometry.type : 'Unknown',
        lat,
        lon,
        properties: feat.properties || {}
      });
    });

    s.parsedData = json;
    s.features = flatFeatures;

    if (outOfRange > 0) {
      s.validationErrors.push('Coordinates out of Mars range');
      s.validationChecks.push({
        status: 'err',
        msg: `${outOfRange} feature(s) have coordinates outside Martian boundaries (Lat: -90°..90°, Lon: -180°..360°)`
      });
    } else if (validCoords > 0) {
      s.validationChecks.push({
        status: 'ok',
        msg: `Martian coordinates verified: ${validCoords} features have valid coordinates`
      });
    } else {
      s.validationWarnings.push('No Point/LineString coordinates');
      s.validationChecks.push({
        status: 'warn',
        msg: 'No numeric Point coordinates extracted from features. Coordinates may be assigned manually.'
      });
    }
  },

  validateJSON(s) {
    let json;
    try {
      json = JSON.parse(s.rawText);
    } catch (err) {
      s.validationErrors.push('JSON parse error');
      s.validationChecks.push({ status: 'err', msg: `File is not valid JSON: ${err.message}` });
      return;
    }

    // Check if it's actually GeoJSON
    if (json && json.type && (json.type === 'FeatureCollection' || json.type === 'Feature')) {
      s.format = 'geojson';
      return this.validateGeoJSON(s);
    }

    if (!Array.isArray(json) && (typeof json !== 'object' || json === null)) {
      s.validationErrors.push('JSON root must be array or object');
      s.validationChecks.push({ status: 'err', msg: 'Root must be an array of records or an object' });
      return;
    }

    const items = Array.isArray(json) ? json : [json];
    s.validationChecks.push({
      status: 'ok',
      msg: `Format OK: Valid JSON data with ${items.length} item(s)`
    });

    if (items.length < 3) {
      s.validationWarnings.push('Few items (< 3)');
      s.validationChecks.push({ status: 'warn', msg: `Dataset contains only ${items.length} record(s)` });
    }

    // Check for lat/lon fields
    let validCoords = 0;
    let outOfRange = 0;

    items.forEach((item) => {
      if (typeof item === 'object' && item !== null) {
        const lat = parseFloat(item.lat ?? item.latitude ?? item.y);
        const lon = parseFloat(item.lon ?? item.lng ?? item.longitude ?? item.x);
        if (!isNaN(lat) && !isNaN(lon)) {
          if (lat < -90 || lat > 90 || lon < -180 || lon > 360) {
            outOfRange++;
          } else {
            validCoords++;
            s.detectedCoords.push({ lat, lon });
          }
        }
      }
    });

    s.parsedData = json;
    s.features = items;

    if (outOfRange > 0) {
      s.validationErrors.push('Coordinates out of Mars range');
      s.validationChecks.push({
        status: 'err',
        msg: `${outOfRange} coordinate pairs fall outside Martian range [-90..90, -180..360]`
      });
    } else if (validCoords > 0) {
      s.validationChecks.push({
        status: 'ok',
        msg: `Martian coordinates verified: ${validCoords} coordinate pairs found`
      });
    } else {
      s.validationWarnings.push('Missing coordinates');
      s.validationChecks.push({
        status: 'warn',
        msg: 'No latitude/longitude properties detected. Manual coordinates can be assigned in Step 4.'
      });
    }
  },

  validateImage(s) {
    s.validationChecks.push({
      status: 'ok',
      msg: `Format OK: Image file loaded (${s.fileExt.toUpperCase()})`
    });
    s.validationWarnings.push('Image has no embedded geospatial metadata');
    s.validationChecks.push({
      status: 'warn',
      msg: 'Imagery does not automatically include Martian coordinates. Please specify latitude and longitude in Step 4.'
    });
    s.parsedData = { type: 'image', name: s.fileName };
    s.features = [{ type: 'image', name: s.fileName }];
  },

  // ── Stage 3: Preview ─────────────────────────────────────────────────────
  renderPreviewStage() {
    const s = this.uploadState;
    const container = document.getElementById('data-preview-container');
    if (!container) return;

    if (s.format === 'image') {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:12px; padding:12px;">
          <img src="${s.dataUrl}" alt="${s.fileName}" style="max-width:100%; max-height:220px; object-fit:contain; border-radius:6px; border:1px solid rgba(255,255,255,0.15);" />
          <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">
            ${s.fileName} • ${(s.fileSize / 1024).toFixed(1)} KB • Image Observation
          </div>
        </div>
      `;
      return;
    }

    if (s.format === 'csv' && s.parsedData && s.parsedData.headers) {
      const headers = s.parsedData.headers;
      const rows = (s.parsedData.rows || []).slice(0, 10);

      const thead = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`;
      const tbody = rows.map((r) => {
        return `<tr>${headers.map((h) => `<td>${r[h] !== undefined ? r[h] : ''}</td>`).join('')}</tr>`;
      }).join('');

      container.innerHTML = `
        <div style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">
          Showing first <strong>${rows.length}</strong> of <strong>${s.parsedData.rows.length}</strong> rows:
        </div>
        <table class="preview-table">
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      `;
      return;
    }

    if (s.format === 'geojson' && s.features) {
      const rows = s.features.slice(0, 10);
      const headers = ['Feature ID', 'Type', 'Latitude', 'Longitude', 'Properties'];
      const thead = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`;
      const tbody = rows.map((f) => {
        const propsStr = JSON.stringify(f.properties || {});
        return `
          <tr>
            <td><strong>${f.id}</strong></td>
            <td>${f.type}</td>
            <td>${f.lat != null ? f.lat.toFixed(4) : '—'}</td>
            <td>${f.lon != null ? f.lon.toFixed(4) : '—'}</td>
            <td title="${propsStr}">${propsStr.slice(0, 50)}${propsStr.length > 50 ? '...' : ''}</td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <div style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">
          Showing first <strong>${rows.length}</strong> of <strong>${s.features.length}</strong> GeoJSON features:
        </div>
        <table class="preview-table">
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      `;
      return;
    }

    if (s.features && Array.isArray(s.features)) {
      const rows = s.features.slice(0, 10);
      const allKeys = Array.from(new Set(rows.flatMap((r) => (typeof r === 'object' && r !== null ? Object.keys(r) : []))));
      const thead = `<tr>${allKeys.map((k) => `<th>${k}</th>`).join('')}</tr>`;
      const tbody = rows.map((r) => {
        return `<tr>${allKeys.map((k) => `<td>${r[k] !== undefined ? JSON.stringify(r[k]) : ''}</td>`).join('')}</tr>`;
      }).join('');

      container.innerHTML = `
        <div style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">
          Showing first <strong>${rows.length}</strong> of <strong>${s.features.length}</strong> records:
        </div>
        <table class="preview-table">
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      `;
      return;
    }

    container.innerHTML = `<div style="color:var(--text-muted); padding:16px;">No structured preview available.</div>`;
  },

  // ── Stage 4: Metadata ────────────────────────────────────────────────────
  populateMetadataStage() {
    const s = this.uploadState;
    const nameEl = document.getElementById('meta-name');
    const dateEl = document.getElementById('meta-obs-date');
    const sourceEl = document.getElementById('meta-source');
    const latEl = document.getElementById('meta-lat');
    const lonEl = document.getElementById('meta-lon');
    const coordSection = document.getElementById('meta-coord-section');

    if (nameEl && !nameEl.value) {
      // Strip extension
      const baseName = s.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      nameEl.value = baseName ? `Observation: ${baseName}` : 'Field Observation';
    }

    if (dateEl && !dateEl.value) {
      dateEl.value = new Date().toISOString().split('T')[0];
    }

    if (sourceEl && !sourceEl.value) {
      sourceEl.value = 'ARES Field Survey Team';
    }

    // Handle coordinates pre-population & hints
    const hasDetectedCoords = s.detectedCoords && s.detectedCoords.length > 0;
    if (hasDetectedCoords) {
      const first = s.detectedCoords[0];
      if (latEl && !latEl.value) latEl.value = first.lat.toFixed(4);
      if (lonEl && !lonEl.value) lonEl.value = first.lon.toFixed(4);

      let hintBox = document.getElementById('meta-coord-hint');
      if (!hintBox && coordSection) {
        hintBox = document.createElement('div');
        hintBox.id = 'meta-coord-hint';
        hintBox.style.cssText = 'grid-column:1/-1; font-size:11px; color:var(--cyan-hud); margin-bottom:4px;';
        coordSection.insertBefore(hintBox, coordSection.firstChild);
      }
      if (hintBox) {
        hintBox.innerHTML = `✅ <strong>${s.detectedCoords.length} Martian coordinate(s)</strong> detected from file. First pair pre-filled below:`;
      }
    } else {
      // Pre-fill with current site coordinates as a helpful suggestion if blank
      if (typeof state !== 'undefined' && state.siteData && state.siteData.site && state.siteData.site.coordinates) {
        const c = state.siteData.site.coordinates;
        if (latEl && !latEl.value) latEl.value = c.lat;
        if (lonEl && !lonEl.value) lonEl.value = c.lon;
      }
      let hintBox = document.getElementById('meta-coord-hint');
      if (!hintBox && coordSection) {
        hintBox = document.createElement('div');
        hintBox.id = 'meta-coord-hint';
        hintBox.style.cssText = 'grid-column:1/-1; font-size:11px; color:var(--mars-amber); margin-bottom:4px;';
        coordSection.insertBefore(hintBox, coordSection.firstChild);
      }
      if (hintBox) {
        hintBox.innerHTML = `⚠️ No coordinates found in file. Pre-filled with current site coordinates (${state?.siteData?.site?.name || 'Mars site'}):`;
      }
    }
  },

  // ── Stage 5: Submit / Import ─────────────────────────────────────────────
  async submitUpload() {
    const s = this.uploadState;
    const name = document.getElementById('meta-name')?.value?.trim();
    const source = document.getElementById('meta-source')?.value?.trim();
    const desc = document.getElementById('meta-desc')?.value?.trim() || '';
    const obsDate = document.getElementById('meta-obs-date')?.value || new Date().toISOString().split('T')[0];
    const units = document.getElementById('meta-units')?.value?.trim() || '';
    const latStr = document.getElementById('meta-lat')?.value?.trim();
    const lonStr = document.getElementById('meta-lon')?.value?.trim();
    const useInRouting = document.getElementById('meta-use-in-routing')?.checked || false;

    if (!name) {
      alert('Dataset name is required.');
      document.getElementById('meta-name')?.focus();
      return;
    }

    if (!source) {
      alert('Source / Observer is required.');
      document.getElementById('meta-source')?.focus();
      return;
    }

    let latVal = latStr ? parseFloat(latStr) : null;
    let lonVal = lonStr ? parseFloat(lonStr) : null;

    if (latVal !== null && (isNaN(latVal) || latVal < -90 || latVal > 90)) {
      alert('Latitude must be a valid number between -90 and +90.');
      document.getElementById('meta-lat')?.focus();
      return;
    }

    if (lonVal !== null && (isNaN(lonVal) || lonVal < -180 || lonVal > 360)) {
      alert('Longitude must be a valid number between -180 and +360.');
      document.getElementById('meta-lon')?.focus();
      return;
    }

    // Build features array
    let featuresPayload = [];
    if (s.format === 'image') {
      featuresPayload = [{
        type: 'image',
        name: s.fileName,
        lat: latVal,
        lon: lonVal,
        data_url: s.dataUrl
      }];
    } else if (s.features && s.features.length > 0) {
      featuresPayload = s.features.map((f, idx) => {
        const item = typeof f === 'object' && f !== null ? { ...f } : { value: f };
        if (item.lat == null && latVal != null) item.lat = latVal;
        if (item.lon == null && lonVal != null) item.lon = lonVal;
        return item;
      });
    } else {
      featuresPayload = [{
        id: 'obs-1',
        lat: latVal,
        lon: lonVal,
        type: s.obsType
      }];
    }

    const payload = {
      name,
      type: s.obsType,
      observation_type: s.obsType,
      file_type: s.format,
      format: s.format,
      source,
      description: desc,
      features: featuresPayload,
      data: featuresPayload,
      lat: latVal,
      lon: lonVal,
      coordinates: latVal != null && lonVal != null ? { lat: latVal, lon: lonVal } : null,
      observation_date: obsDate,
      units,
      use_in_routing: useInRouting
    };

    const submitBtn = document.getElementById('upload-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Importing...';
    }

    try {
      const res = await fetch('/api/upload_dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Server rejected dataset import');
      }

      // Success!
      const successMsg = document.getElementById('upload-success-msg');
      if (successMsg) {
        successMsg.innerHTML = `Dataset <strong>"${name}"</strong> imported successfully with ${featuresPayload.length} observation(s).`;
      }

      this.goToStage(5);
      await this.loadMyDatasets();

      if (typeof P0_USER_LAYERS !== 'undefined') {
        if (data.id) P0_USER_LAYERS.activeUserLayers.add(data.id);
        P0_USER_LAYERS.refresh();
      }
    } catch (err) {
      console.error('[ARES-NAV P0] Upload failed:', err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Import Dataset →';
      }
    }
  },

  // =========================================================================
  // MY DATASETS PANEL
  // =========================================================================

  async loadMyDatasets() {
    const listEl = document.getElementById('my-datasets-list');
    const badgeEl = document.getElementById('my-data-count');

    try {
      const res = await fetch('/api/user_datasets');
      const data = await res.json();
      const datasets = (data && data.datasets) || [];

      if (badgeEl) badgeEl.textContent = String(datasets.length);

      if (!listEl) return datasets;

      if (datasets.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">📂</span>
            <p>No uploaded datasets yet.</p>
            <button class="wizard-btn-secondary" id="go-to-upload-btn-empty">Upload an Observation</button>
          </div>
        `;
        document.getElementById('go-to-upload-btn-empty')?.addEventListener('click', () => {
          this.switchTab('upload');
        });
        return datasets;
      }

      listEl.innerHTML = datasets.map((ds) => {
        const featureCount = ds.features ? ds.features.length : (ds.data ? ds.data.length : 1);
        const obsType = ds.observation_type || ds.type || 'observation';
        const dateStr = ds.upload_date ? new Date(ds.upload_date).toLocaleDateString() : 'Recent';

        return `
          <div class="my-ds-item" data-id="${ds.id}">
            <div class="my-ds-info">
              <div class="my-ds-name">${ds.name}</div>
              <div class="my-ds-meta">
                <span class="prov-badge prov-unverified">Unverified</span>
                <span>Type: <strong>${obsType.toUpperCase()}</strong></span>
                <span>Source: <strong>${ds.source}</strong></span>
                <span>Uploaded: <strong>${dateStr}</strong></span>
                <span>Count: <strong>${featureCount} obs</strong></span>
                ${ds.use_in_routing ? '<span style="color:var(--emerald-safe)">🛡️ Routing Active</span>' : ''}
              </div>
              ${ds.description ? `<div style="font-size:11px; color:var(--text-muted); line-height:1.4;">${ds.description}</div>` : ''}
            </div>
            <div class="my-ds-actions">
              <button class="my-ds-btn my-ds-btn-show" data-id="${ds.id}">Show on Map</button>
              <button class="my-ds-btn my-ds-btn-delete" data-id="${ds.id}">Delete</button>
            </div>
          </div>
        `;
      }).join('');

      // Wire action buttons
      listEl.querySelectorAll('.my-ds-btn-show').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          if (id && typeof P0_USER_LAYERS !== 'undefined') {
            P0_USER_LAYERS.activeUserLayers.add(id);
            P0_USER_LAYERS.redrawUserObsCanvas();
            this.close();
            const tab2d = document.getElementById('tab-2d');
            if (tab2d) tab2d.click();
          }
        });
      });

      listEl.querySelectorAll('.my-ds-btn-delete').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (id && confirm('Delete this uploaded observation dataset?')) {
            await this.deleteDataset(id);
          }
        });
      });

      return datasets;
    } catch (err) {
      console.error('[ARES-NAV P0] Failed to load user datasets:', err);
      if (listEl) {
        listEl.innerHTML = `<div style="padding:16px; color:#ff7a90;">Failed to load datasets: ${err.message}</div>`;
      }
      return [];
    }
  },

  async deleteDataset(id) {
    try {
      const res = await fetch(`/api/user_dataset?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Server returned error on delete');
      }
      if (typeof P0_USER_LAYERS !== 'undefined') {
        P0_USER_LAYERS.activeUserLayers.delete(id);
        P0_USER_LAYERS.refresh();
      }
      await this.loadMyDatasets();
    } catch (err) {
      console.error('[ARES-NAV P0] Delete failed:', err);
      alert(`Delete failed: ${err.message}`);
    }
  }
};

window.P0_DATA_EXPLORER = P0_DATA_EXPLORER;
window.NASA_DATASETS = NASA_DATASETS;
