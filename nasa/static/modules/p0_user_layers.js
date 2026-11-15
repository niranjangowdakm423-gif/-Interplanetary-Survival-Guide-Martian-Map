/**
 * ARES-NAV // p0_user_layers.js
 * Canvas overlay and layer management for user-uploaded observation datasets.
 * Self-contained ES6, global scope.
 */

const P0_USER_LAYERS = {
  userDatasets: [],
  activeUserLayers: new Set(),
  routingDatasetIds: new Set(),

  init() {
    this.loadRoutingPreferences();
    this.ensureCanvasOverlay();

    window.addEventListener('resize', () => {
      this.syncCanvasSize();
      this.redrawUserObsCanvas();
    });

    // Listen for tab changes to hide/show canvas
    ['tab-2d', 'tab-3d', 'tab-global'].forEach((tabId) => {
      document.getElementById(tabId)?.addEventListener('click', () => {
        setTimeout(() => this.redrawUserObsCanvas(), 50);
      });
    });

    this.refresh();
    console.log('[ARES-NAV P0] User Layers initialized');
  },

  loadRoutingPreferences() {
    try {
      const stored = localStorage.getItem('aresNavRoutingDatasets');
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          this.routingDatasetIds = new Set(arr);
        }
      }
    } catch (e) {
      this.routingDatasetIds = new Set();
    }
  },

  saveRoutingPreferences() {
    try {
      localStorage.setItem('aresNavRoutingDatasets', JSON.stringify(Array.from(this.routingDatasetIds)));
    } catch (e) {
      console.warn('Could not save routing preferences:', e);
    }
  },

  ensureCanvasOverlay() {
    let canvas = document.getElementById('user-obs-canvas');
    if (!canvas) {
      const wrapper = document.getElementById('canvas-wrapper') || document.querySelector('.canvas-wrapper');
      if (wrapper) {
        canvas = document.createElement('canvas');
        canvas.id = 'user-obs-canvas';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '5';
        wrapper.appendChild(canvas);
      }
    }
    this.syncCanvasSize();
    return canvas;
  },

  syncCanvasSize() {
    const userCanvas = document.getElementById('user-obs-canvas');
    const marsCanvas = document.getElementById('mars-canvas');
    if (userCanvas && marsCanvas) {
      userCanvas.width = marsCanvas.width;
      userCanvas.height = marsCanvas.height;
    }
  },

  async refresh() {
    try {
      const res = await fetch('/api/user_datasets');
      const data = await res.json();
      this.userDatasets = (data && data.datasets) || [];

      // Auto-activate new datasets if activeUserLayers is empty and datasets exist
      if (this.activeUserLayers.size === 0 && this.userDatasets.length > 0) {
        this.userDatasets.forEach((ds) => this.activeUserLayers.add(ds.id));
      }

      this.buildUserLayerButtons();
      this.redrawUserObsCanvas();
    } catch (err) {
      console.error('[ARES-NAV P0] Failed to fetch user datasets for overlay:', err);
      this.userDatasets = [];
      this.buildUserLayerButtons();
    }
  },

  buildUserLayerButtons() {
    const section = document.getElementById('user-layer-section');
    const container = document.getElementById('user-layer-buttons');
    if (!section || !container) return;

    if (this.userDatasets.length === 0) {
      section.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    section.classList.remove('hidden');

    const typeColors = {
      hazard: '#ff3355',
      resource: '#27d7ff',
      science: '#b56bff',
      radiation: '#ffcc00',
      temperature: '#ff9933',
      terrain: '#18e299',
      aerial: '#00e5ff',
      other: '#edf2f8'
    };

    container.innerHTML = this.userDatasets.map((ds) => {
      const obsType = (ds.observation_type || ds.type || 'other').toLowerCase();
      const dotColor = typeColors[obsType] || '#edf2f8';
      const isActive = this.activeUserLayers.has(ds.id);
      const isRouting = this.routingDatasetIds.has(ds.id) || ds.use_in_routing;
      const count = ds.features ? ds.features.length : (ds.data ? ds.data.length : 1);

      return `
        <div class="user-layer-item-wrapper" style="margin-bottom: 4px;">
          <button class="layer-btn ${isActive ? 'active' : ''}" data-user-layer="${ds.id}" aria-pressed="${isActive ? 'true' : 'false'}" style="width:100%;">
            <span class="layer-dot" style="background:${dotColor}; box-shadow:0 0 6px ${dotColor};" aria-hidden="true"></span>
            <div class="layer-meta">
              <strong>${ds.name}</strong>
              <span>${obsType.toUpperCase()} • ${count} pts</span>
            </div>
            <span class="prov-badge prov-unverified" title="User observation data: unverified">Unverified</span>
          </button>
          ${obsType === 'hazard' ? `
            <label class="check-row" style="font-size:10px; margin: 3px 0 6px 12px; color:var(--text-muted); cursor:pointer;">
              <input type="checkbox" class="user-route-avoid-chk" data-id="${ds.id}" ${isRouting ? 'checked' : ''} />
              <span>Avoid hazard in EVA pathfinding</span>
            </label>
          ` : ''}
        </div>
      `;
    }).join('');

    // Wire up layer toggle clicks
    container.querySelectorAll('.layer-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-user-layer');
        if (id) this.toggleLayer(id);
      });
    });

    // Wire up hazard routing checkboxes
    container.querySelectorAll('.user-route-avoid-chk').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        e.stopPropagation();
        const id = chk.getAttribute('data-id');
        if (id) {
          if (chk.checked) {
            this.includeInRoutePlanning(id);
          } else {
            this.routingDatasetIds.delete(id);
            this.saveRoutingPreferences();
            this.showToast('Hazard excluded from routing calculations');
          }
        }
      });
    });
  },

  toggleLayer(id) {
    if (this.activeUserLayers.has(id)) {
      this.activeUserLayers.delete(id);
    } else {
      this.activeUserLayers.add(id);
    }

    const btns = document.querySelectorAll(`button[data-user-layer="${id}"]`);
    btns.forEach((btn) => {
      const isActive = this.activeUserLayers.has(id);
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    this.redrawUserObsCanvas();
  },

  getCanvasPos(lat, lon) {
    const marsCanvas = document.getElementById('mars-canvas');
    if (!marsCanvas) return { x: 0, y: 0, inBounds: false };

    const W = marsCanvas.width;
    const H = marsCanvas.height;
    const pad = 26;
    const size = Math.min(W - pad * 2, H - pad * 2);
    const ox = Math.floor((W - size) / 2);
    const oy = Math.floor((H - size) / 2);

    if (typeof state === 'undefined' || !state.siteData || !state.siteData.site) {
      return { x: 0, y: 0, inBounds: false };
    }

    const site = state.siteData.site;
    const bbox = site.bbox;
    if (!bbox) {
      return { x: 0, y: 0, inBounds: false };
    }

    let wLon = bbox.westlon;
    let eLon = bbox.eastlon;
    let ptLon = Number(lon);
    let ptLat = Number(lat);

    // Normalize longitude wrapping
    if (eLon < wLon) eLon += 360;
    if (ptLon < wLon && ptLon + 360 <= eLon) ptLon += 360;

    const u = (ptLon - wLon) / (eLon - wLon);
    const v = (bbox.maxlat - ptLat) / (bbox.maxlat - bbox.minlat);

    const x = ox + u * size;
    const y = oy + v * size;
    const inBounds = (u >= -0.05 && u <= 1.05 && v >= -0.05 && v <= 1.05);

    return { x, y, u, v, inBounds };
  },

  redrawUserObsCanvas() {
    const userCanvas = this.ensureCanvasOverlay();
    if (!userCanvas) return;

    const ctx = userCanvas.getContext('2d');
    ctx.clearRect(0, 0, userCanvas.width, userCanvas.height);

    // Only render overlay when in 2D sector map mode
    const viewMode = typeof state !== 'undefined' ? state.viewMode : '2d';
    if (viewMode !== '2d') {
      userCanvas.style.display = 'none';
      return;
    }
    userCanvas.style.display = 'block';

    if (this.activeUserLayers.size === 0 || this.userDatasets.length === 0) {
      return;
    }

    const activeDatasets = this.userDatasets.filter((ds) => this.activeUserLayers.has(ds.id));

    activeDatasets.forEach((ds) => {
      const obsType = (ds.observation_type || ds.type || 'other').toLowerCase();
      const points = this.extractDatasetPoints(ds);

      points.forEach((pt, pIdx) => {
        if (pt.lat == null || pt.lon == null) return;
        const pos = this.getCanvasPos(pt.lat, pt.lon);
        if (!pos.inBounds) return;

        this.drawObservationMarker(ctx, pos.x, pos.y, obsType, pt.label || ds.name);
      });
    });
  },

  extractDatasetPoints(ds) {
    const points = [];

    if (Array.isArray(ds.features) && ds.features.length > 0) {
      ds.features.forEach((feat, idx) => {
        let lat = feat.lat ?? feat.latitude ?? feat._lat;
        let lon = feat.lon ?? feat.lng ?? feat.longitude ?? feat._lon;

        if (lat == null && feat.geometry && Array.isArray(feat.geometry.coordinates)) {
          lon = feat.geometry.coordinates[0];
          lat = feat.geometry.coordinates[1];
        }

        if (lat == null && ds.lat != null) lat = ds.lat;
        if (lon == null && ds.lon != null) lon = ds.lon;

        const label = feat.name || feat.id || (feat.properties && feat.properties.name) || `${ds.name} #${idx + 1}`;
        if (lat != null && lon != null) {
          points.push({ lat: Number(lat), lon: Number(lon), label });
        }
      });
    } else if (Array.isArray(ds.data) && ds.data.length > 0) {
      ds.data.forEach((item, idx) => {
        const lat = item.lat ?? item.latitude ?? ds.lat;
        const lon = item.lon ?? item.lng ?? ds.lon;
        const label = item.name || `${ds.name} #${idx + 1}`;
        if (lat != null && lon != null) {
          points.push({ lat: Number(lat), lon: Number(lon), label });
        }
      });
    } else if (ds.lat != null && ds.lon != null) {
      points.push({ lat: Number(ds.lat), lon: Number(ds.lon), label: ds.name });
    } else if (ds.coordinates && ds.coordinates.lat != null && ds.coordinates.lon != null) {
      points.push({ lat: Number(ds.coordinates.lat), lon: Number(ds.coordinates.lon), label: ds.name });
    }

    return points;
  },

  drawObservationMarker(ctx, x, y, type, label) {
    ctx.save();

    // Style configs by type
    const configs = {
      hazard: { color: '#ff3355', glow: 'rgba(255, 51, 85, 0.4)', icon: '⚠', radius: 11 },
      resource: { color: '#27d7ff', glow: 'rgba(39, 215, 255, 0.4)', icon: '💧', radius: 10 },
      science: { color: '#b56bff', glow: 'rgba(181, 107, 255, 0.4)', icon: '🔬', radius: 10 },
      radiation: { color: '#ffcc00', glow: 'rgba(255, 204, 0, 0.4)', icon: '☢', radius: 10 },
      temperature: { color: '#ff9933', glow: 'rgba(255, 153, 51, 0.4)', icon: '🌡️', radius: 9 },
      terrain: { color: '#18e299', glow: 'rgba(24, 226, 153, 0.4)', icon: '▲', radius: 9 },
      aerial: { color: '#00e5ff', glow: 'rgba(0, 229, 255, 0.4)', icon: '🚁', radius: 10 },
      other: { color: '#ffffff', glow: 'rgba(255, 255, 255, 0.3)', icon: '●', radius: 8 }
    };

    const cfg = configs[type] || configs.other;

    // Outer glow halo
    ctx.beginPath();
    ctx.arc(x, y, cfg.radius + 6, 0, Math.PI * 2);
    ctx.fillStyle = cfg.glow;
    ctx.fill();

    // Pin circle
    ctx.beginPath();
    ctx.arc(x, y, cfg.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8, 12, 19, 0.88)';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = cfg.color;
    ctx.stroke();

    // Inner icon
    ctx.font = `${cfg.radius + 1}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cfg.color;
    ctx.fillText(cfg.icon, x, y + 0.5);

    // Label tag
    if (label) {
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const cleanLabel = label.length > 20 ? label.slice(0, 18) + '...' : label;
      const textWidth = ctx.measureText(cleanLabel).width;

      ctx.fillStyle = 'rgba(8, 12, 19, 0.85)';
      ctx.fillRect(x - textWidth / 2 - 3, y + cfg.radius + 3, textWidth + 6, 13);
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x - textWidth / 2 - 3, y + cfg.radius + 3, textWidth + 6, 13);

      ctx.fillStyle = '#edf2f8';
      ctx.fillText(cleanLabel, x, y + cfg.radius + 12);
    }

    ctx.restore();
  },

  getActiveHazardCells() {
    if (typeof state === 'undefined' || !state.siteData || !state.siteData.site) return [];
    const site = state.siteData.site;
    const bbox = site.bbox || {};
    const wlon = Number(bbox.westlon || -180);
    const elon = Number(bbox.eastlon || 180);
    const minlat = Number(bbox.minlat || -90);
    const maxlat = Number(bbox.maxlat || 90);
    const N = Number(site.grid_size || 80);

    const hazardCells = [];

    this.userDatasets.forEach((ds) => {
      const isRouting = this.routingDatasetIds.has(ds.id) || ds.use_in_routing;
      const isHazard = ds.type === 'hazard' || ds.observation_type === 'hazard';
      if (!isRouting && !isHazard) return;

      const pts = this.extractPoints(ds);
      pts.forEach((pt) => {
        if (pt.gx != null && pt.gy != null) {
          hazardCells.push({ gx: Math.round(pt.gx), gy: Math.round(pt.gy), radius_cells: 3.0 });
        } else if (pt.lat != null && pt.lon != null) {
          const lat = Number(pt.lat);
          const lon = Number(pt.lon);
          if (lat >= minlat && lat <= maxlat && lon >= wlon && lon <= elon) {
            const gx = Math.round(((lon - wlon) / Math.max(0.0001, (elon - wlon))) * N);
            const gy = Math.round(((maxlat - lat) / Math.max(0.0001, (maxlat - minlat))) * N);
            hazardCells.push({
              gx: Math.max(0, Math.min(N - 1, gx)),
              gy: Math.max(0, Math.min(N - 1, gy)),
              radius_cells: 3.0
            });
          }
        }
      });
    });

    return hazardCells;
  },

  includeInRoutePlanning(datasetId) {
    this.routingDatasetIds.add(datasetId);
    this.saveRoutingPreferences();
    this.showToast('Hazard observations will be considered in next route calculation');

    // Trigger route re-plan if site loaded
    if (typeof requestRoutePlan === 'function') {
      requestRoutePlan();
    } else if (typeof state !== 'undefined' && state.siteData && typeof planRoute === 'function') {
      planRoute();
    }
  },

  showToast(message) {
    const existing = document.querySelector('.ares-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'ares-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }
};

window.P0_USER_LAYERS = P0_USER_LAYERS;
