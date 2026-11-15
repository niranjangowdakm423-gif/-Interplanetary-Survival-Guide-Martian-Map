/**
 * ARES-NAV // NASA Interplanetary Survival Guide: Martian Map
 * Interactive Multi-Layer GIS, 3D MOLA Topographic Renderer,
 * Anisotropic A* Pathfinding Client, and Astronaut PLSS Telemetry Simulator
 */

const state = {
  siteId: "jezero",
  siteData: null,
  activeLayer: "composite",
  viewMode: "2d", // "2d" | "3d"
  routeMode: "safest", // "safest" | "balanced" | "science" | "fastest"
  maxSlopeDeg: 15,
  suitMassKg: 145,
  speStorm: false,
  showContours: true,
  showHazards: true,
  showDirectPath: true,
  blendTrekTiles: true,
  blendCtxTiles: false,
  overlayHiriseStrip: false,
  waypoints: [],
  routeResult: null,
  abortRoute: null,
  selectedPoi: null,
  profileTab: "elev_slope",
  hoverCell: { gx: 40, gy: 40 },
  // EVA Marswalk Animation State
  simPlaying: false,
  simStepIndex: 0,
  simTimer: null,
  // 3D Camera Orbit Parameters
  cam3d: {
    yaw: -0.62,
    pitch: 0.72,
    zoom: 1.05,
    dragging: false,
    lastX: 0,
    lastY: 0
  },
  // Cached offscreen 2D layer ImageData & Real NASA Imagery
  layerCanvasCache: null,
  trekTileImg: null,
  trekTileLoaded: false,
  ctxTileImg: null,
  ctxTileLoaded: false,
  hiriseStripImg: null,
  hiriseStripLoaded: false
};
window.state = state;

// DOM References
const marsCanvas = document.getElementById("mars-canvas");
const ctx = marsCanvas.getContext("2d");
const profileCanvas = document.getElementById("profile-canvas");
const pctx = profileCanvas.getContext("2d");

function latLonToMarsTile(latDeg, lonDeg, zoom) {
  const nCols = Math.pow(2, zoom + 1);
  const nRows = Math.pow(2, zoom);
  const lonNorm = ((lonDeg + 180.0) % 360.0) - 180.0;
  const col = Math.max(0, Math.min(nCols - 1, Math.floor(((lonNorm + 180.0) / 360.0) * nCols)));
  const row = Math.max(0, Math.min(nRows - 1, Math.floor(((90.0 - latDeg) / 180.0) * nRows)));
  return { row, col };
}

// Load site-specific real stitched MOLA mosaic, live CTX 5m tile, and real downloaded HiRISE RDR strip
function loadSiteRealNasaImagery(siteId, lat, lon) {
  // 1. Local Stitched 4-Tile Mars Trek MOLA Mosaic
  const molaImg = new Image();
  molaImg.onload = () => {
    state.trekTileImg = molaImg;
    state.trekTileLoaded = true;
    renderScene();
  };
  molaImg.src = `nasa_tiles/${siteId}_mola_hillshade_z5.jpg`;

  // 2. Live CTX 5m Global Mosaic (from WMTSCapabilities ResourceURL: astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{r}/{c})
  const { row, col } = latLonToMarsTile(lat, lon, 6);
  const ctxImg = new Image();
  ctxImg.crossOrigin = "anonymous";
  ctxImg.onload = () => {
    state.ctxTileImg = ctxImg;
    state.ctxTileLoaded = true;
    renderScene();
  };
  ctxImg.src = `https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/6/${row}/${col}`;

  // 3. Real Downloaded HiRISE RDR Swath (PSP_008650_1990_COLOR / ESP_022680_1985_COLOR)
  const hImg = new Image();
  hImg.onload = () => {
    state.hiriseStripImg = hImg;
    state.hiriseStripLoaded = true;
    renderScene();
  };
  hImg.src = "nasa_tiles/hirise_jezero_0_PSP_008650_1990_COLOR.jpg";
}

// ============================================================================
// 1. INITIALIZATION & SITE DATA FETCHING
// ============================================================================

async function initApp() {
  setupEventListeners();
  resizeCanvases();
  window.addEventListener("resize", () => {
    resizeCanvases();
    renderScene();
    renderProfileChart();
  });

  await loadSite("jezero");
}

function resizeCanvases() {
  const wrapper = document.getElementById("canvas-wrapper");
  if (wrapper) {
    marsCanvas.width = wrapper.clientWidth;
    marsCanvas.height = wrapper.clientHeight;
  }
  const profDock = profileCanvas.parentElement;
  if (profDock) {
    profileCanvas.width = profDock.clientWidth - 24;
    profileCanvas.height = 132;
  }
}

async function loadSite(siteId) {
  stopSimulation();
  state.siteId = siteId;
  state.abortRoute = null;

  const res = await fetch(`/api/site?id=${encodeURIComponent(siteId)}`);
  state.siteData = await res.json();

  const site = state.siteData.site;
  // Set default mission waypoints: Habitat -> Top 2 Science/ISRU POIs -> Shelter/Return
  const hab = site.habitat;
  const sciPois = site.pois.filter((p) => p.category === "science" || p.category === "isru");
  state.waypoints = [
    { gx: hab.gx, gy: hab.gy, label: `HAB: ${hab.name}` }
  ];
  if (sciPois.length >= 1) {
    state.waypoints.push({ gx: sciPois[0].gx, gy: sciPois[0].gy, label: sciPois[0].name });
  }
  if (sciPois.length >= 2) {
    state.waypoints.push({ gx: sciPois[1].gx, gy: sciPois[1].gy, label: sciPois[1].name });
  }

  state.selectedPoi = site.pois[0] || null;
  loadSiteRealNasaImagery(siteId, site.coordinates.lat, site.coordinates.lon);

  updateTopHeaderHUD();
  updatePoiInspector();
  updatePoiDirectory();
  updateWaypointListUI();
  updateLegendUI();
  updateModalPdsManifest();
  bake2DTerrainLayer();
  if (typeof P1_ATMOSPHERIC !== 'undefined') {
    P1_ATMOSPHERIC.onSiteChange(siteId);
  }
  if (typeof P1_COMM_TOPOLOGY !== 'undefined') {
    P1_COMM_TOPOLOGY.onSiteChange(siteId);
  }
  await requestRoutePlan();
}

async function requestRoutePlan() {
  if (!state.siteData || state.waypoints.length < 2) return;

  const payload = {
    site_id: state.siteId,
    waypoints: state.waypoints,
    mode: state.routeMode,
    suit_mass_kg: state.suitMassKg,
    spe_storm: state.speStorm,
    max_slope_deg: state.maxSlopeDeg
  };

  if (typeof P0_USER_LAYERS !== 'undefined' && typeof P0_USER_LAYERS.getActiveHazardCells === 'function') {
    payload.user_hazards = P0_USER_LAYERS.getActiveHazardCells();
  }

  // P1: include generate_alternatives for comparison matrix, explainability, feasibility
  payload.generate_alternatives = true;

  const res = await fetch("/api/plan_route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  state.routeResult = await res.json();
  state.simStepIndex = 0;

  updateTelemetryKPIs();
  renderScene();
  renderProfileChart();

  // P1: notify mission planning module to render comparison / feasibility panels
  if (typeof P1_MISSION_PLANNING !== 'undefined') {
    P1_MISSION_PLANNING.onRouteResult(state.routeResult);
  }
  if (typeof P1_ATMOSPHERIC !== 'undefined') {
    P1_ATMOSPHERIC.onRouteResult(state.routeResult);
  }
  if (typeof P1_COMM_TOPOLOGY !== 'undefined') {
    P1_COMM_TOPOLOGY.onRouteResult(state.routeResult);
  }
}

// ============================================================================
// 2. COLORMAPS & OFFSCREEN RASTER BAKING FOR 7 NASA DATA LAYERS
// ============================================================================

function getLayerColor(layerName, normVal, slopeDeg, boulderPct, hillshade) {
  let r = 0, g = 0, b = 0;

  if (layerName === "composite") {
    // Martian MOLA + HiRISE Natural Ochre/Basalt terrain shaded with slope/boulder hazard tint
    const baseR = 95 + normVal * 125;
    const baseG = 52 + normVal * 68;
    const baseB = 38 + normVal * 42;
    r = baseR * hillshade;
    g = baseG * hillshade;
    b = baseB * hillshade;

    // Highlight steep slope or boulder hazard zones in tactical crimson/amber
    if (slopeDeg > state.maxSlopeDeg || boulderPct > 52) {
      const hazIntensity = Math.min(1.0, Math.max((slopeDeg - state.maxSlopeDeg) / 14, (boulderPct - 52) / 38));
      r = r * (1 - 0.55 * hazIntensity) + 255 * 0.55 * hazIntensity;
      g = g * (1 - 0.55 * hazIntensity) + 38 * 0.55 * hazIntensity;
      b = b * (1 - 0.55 * hazIntensity) + 65 * 0.55 * hazIntensity;
    }
  } else if (layerName === "elevation") {
    // MOLA Viridis/Hypsometric Rainbow: Deep Blue/Teal -> Emerald -> Amber -> Crimson/White
    if (normVal < 0.33) {
      const t = normVal / 0.33;
      r = 20 + t * 25;
      g = 85 + t * 135;
      b = 155 - t * 45;
    } else if (normVal < 0.66) {
      const t = (normVal - 0.33) / 0.33;
      r = 45 + t * 200;
      g = 220 - t * 50;
      b = 110 - t * 80;
    } else {
      const t = (normVal - 0.66) / 0.34;
      r = 245;
      g = 170 - t * 115;
      b = 30 + t * 150;
    }
    r *= hillshade;
    g *= hillshade;
    b *= hillshade;
  } else if (layerName === "slope") {
    // Geodesic Slope Hazard: Safe Green (<8°) -> Caution Amber (8-15°) -> Critical Red (>15°)
    const sNorm = Math.min(1.0, slopeDeg / 26.0);
    if (sNorm < 0.45) {
      const t = sNorm / 0.45;
      r = 24 + t * 220;
      g = 195 + t * 10;
      b = 120 - t * 90;
    } else {
      const t = (sNorm - 0.45) / 0.55;
      r = 244 + t * 11;
      g = 205 * (1 - t);
      b = 30 + t * 55;
    }
    r *= 0.8 + 0.25 * hillshade;
    g *= 0.8 + 0.25 * hillshade;
    b *= 0.8 + 0.25 * hillshade;
  } else if (layerName === "boulder") {
    // HiRISE Boulder & Talus Roughness
    const bNorm = Math.min(1.0, boulderPct / 85.0);
    r = 35 + bNorm * 220;
    g = 45 + (1 - Math.abs(bNorm - 0.45)) * 115 * (1 - bNorm * 0.6);
    b = 70 * (1 - bNorm);
    r *= hillshade;
    g *= hillshade;
    b *= hillshade;
  } else if (layerName === "mineral") {
    // CRISM Spectral Mineralogy (Violet/Indigo -> Cyan -> Gold for high phyllosilicates/carbonates)
    if (normVal < 0.5) {
      const t = normVal / 0.5;
      r = 38 + t * 95;
      g = 22 + t * 70;
      b = 95 + t * 140;
    } else {
      const t = (normVal - 0.5) / 0.5;
      r = 133 + t * 122;
      g = 92 + t * 145;
      b = 235 - t * 160;
    }
    r *= 0.82 + 0.22 * hillshade;
    g *= 0.82 + 0.22 * hillshade;
    b *= 0.82 + 0.22 * hillshade;
  } else if (layerName === "hydration") {
    // SHARAD / Neutron Spectrometer Water-Ice Equivalent
    r = 15 + (1 - normVal) * 45;
    g = 55 + normVal * 175;
    b = 95 + normVal * 160;
    r *= hillshade;
    g *= hillshade;
    b *= hillshade;
  } else if (layerName === "radiation") {
    // Odyssey / MSL RAD Ionizing Radiation Flux (Cool Shielded Teal -> Magenta/Yellow Hot Zone)
    if (normVal < 0.5) {
      const t = normVal / 0.5;
      r = 25 + t * 165;
      g = 150 - t * 105;
      b = 175 - t * 25;
    } else {
      const t = (normVal - 0.5) / 0.5;
      r = 190 + t * 65;
      g = 45 + t * 185;
      b = 150 - t * 110;
    }
    r *= 0.85 + 0.2 * hillshade;
    g *= 0.85 + 0.2 * hillshade;
    b *= 0.85 + 0.2 * hillshade;
  } else if (layerName === "comm_los") {
    // UHF Radio Viewshed Link Quality (Shadowed Red/Dark -> Strong Emerald/Cyan Signal)
    r = (1 - normVal) * 210 + 18;
    g = normVal * 215 + 25;
    b = normVal * 165 + 40;
    r *= hillshade;
    g *= hillshade;
    b *= hillshade;
  } else if (layerName === "risk_heatmap") {
    // Multi-Hazard Environmental Risk Heatmap (0-100%)
    // 0-30% Nominal (Emerald/Cyan) -> 30-60% Caution (Amber/Gold) -> 60-85% High (Crimson/Orange) -> 85-100% Critical (Neon Magenta/White)
    if (normVal < 0.3) {
      const t = normVal / 0.3;
      r = 16 + t * 40;
      g = 185 + t * 35;
      b = 129 - t * 45;
    } else if (normVal < 0.6) {
      const t = (normVal - 0.3) / 0.3;
      r = 56 + t * 189;
      g = 220 - t * 62;
      b = 84 - t * 74;
    } else if (normVal < 0.85) {
      const t = (normVal - 0.6) / 0.25;
      r = 245 + t * 5;
      g = 158 - t * 120;
      b = 10 - t * 5;
    } else {
      const t = (normVal - 0.85) / 0.15;
      r = 250;
      g = 38 + t * 160;
      b = 80 + t * 160;
    }
    r *= 0.85 + 0.22 * hillshade;
    g *= 0.85 + 0.22 * hillshade;
    b *= 0.85 + 0.22 * hillshade;
  } else if (layerName === "habitat_suitability") {
    // MCDA Habitat Suitability (0% Excluded/Blast Zone -> 50% Marginal Amber -> 80-100% Optimal Emerald/Cyan)
    if (normVal <= 0.02) {
      r = 38 * hillshade;
      g = 24 * hillshade;
      b = 34 * hillshade;
    } else if (normVal < 0.65) {
      const t = (normVal - 0.02) / 0.63;
      r = 120 + t * 125;
      g = 45 + t * 135;
      b = 40 - t * 20;
      r *= 0.85 + 0.2 * hillshade;
      g *= 0.85 + 0.2 * hillshade;
      b *= 0.85 + 0.2 * hillshade;
    } else {
      const t = (normVal - 0.65) / 0.35;
      r = 245 * (1 - t) + 16 * t;
      g = 180 + t * 55;
      b = 20 + t * 150;
      r *= 0.85 + 0.22 * hillshade;
      g *= 0.85 + 0.22 * hillshade;
      b *= 0.85 + 0.22 * hillshade;
    }
  }

  return [
    Math.max(0, Math.min(255, Math.round(r))),
    Math.max(0, Math.min(255, Math.round(g))),
    Math.max(0, Math.min(255, Math.round(b)))
  ];
}

function bake2DTerrainLayer() {
  if (!state.siteData) return;
  const site = state.siteData.site;
  const layers = state.siteData.layers;
  const N = site.grid_size;
  const [zMin, zMax] = site.elevation_range_m;
  const zSpan = Math.max(1, zMax - zMin);

  // Create high-res 400x400 bilinearly-interpolated offscreen canvas for smooth rendering
  const res = 400;
  const off = document.createElement("canvas");
  off.width = res;
  off.height = res;
  const octx = off.getContext("2d");
  const imgData = octx.createImageData(res, res);
  const data = imgData.data;

  // Determine min/max for active layer normalization
  let lMin = zMin, lMax = zMax;
  if (state.activeLayer === "mineral") { lMin = 10; lMax = 95; }
  else if (state.activeLayer === "hydration") { lMin = 0; lMax = site.id === "arcadia" ? 80 : 18; }
  else if (state.activeLayer === "radiation") {
    lMin = site.base_radiation_uSv_hr * 0.15;
    lMax = site.base_radiation_uSv_hr * 1.25;
  } else if (state.activeLayer === "comm_los") { lMin = 0; lMax = 100; }
  else if (state.activeLayer === "risk_heatmap") { lMin = 0; lMax = 100; }
  else if (state.activeLayer === "habitat_suitability") { lMin = 0; lMax = 95; }

  const bilerp = (grid, gx, gy) => {
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const x1 = Math.min(N - 1, x0 + 1), y1 = Math.min(N - 1, y0 + 1);
    const fx = gx - x0, fy = gy - y0;
    const v00 = grid[y0][x0], v10 = grid[y0][x1];
    const v01 = grid[y1][x0], v11 = grid[y1][x1];
    return (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;
  };

  for (let py = 0; py < res; py++) {
    const gy = (py / (res - 1)) * (N - 1);
    for (let px = 0; px < res; px++) {
      const gx = (px / (res - 1)) * (N - 1);

      const z = bilerp(layers.elevation, gx, gy);
      const zRight = bilerp(layers.elevation, Math.min(N - 1, gx + 0.8), gy);
      const zDown = bilerp(layers.elevation, gx, Math.min(N - 1, gy + 0.8));

      // NW Sun illumination hillshade
      const dzdx = (zRight - z) / 20.0;
      const dzdy = (zDown - z) / 20.0;
      const hillshade = Math.max(0.42, Math.min(1.32, 0.92 - dzdx * 0.45 - dzdy * 0.45));

      const sDeg = bilerp(layers.slope, gx, gy);
      const bPct = bilerp(layers.boulder, gx, gy);

      let rawVal = z;
      if (state.activeLayer === "mineral") rawVal = bilerp(layers.mineral, gx, gy);
      else if (state.activeLayer === "hydration") rawVal = bilerp(layers.hydration, gx, gy);
      else if (state.activeLayer === "radiation") rawVal = bilerp(layers.radiation, gx, gy);
      else if (state.activeLayer === "comm_los") rawVal = bilerp(layers.comm_los, gx, gy);
      else if (state.activeLayer === "risk_heatmap") rawVal = layers.risk_heatmap ? bilerp(layers.risk_heatmap, gx, gy) : 50;
      else if (state.activeLayer === "habitat_suitability") rawVal = layers.habitat_suitability ? bilerp(layers.habitat_suitability, gx, gy) : 0;

      const normVal = Math.max(0, Math.min(1, (rawVal - lMin) / Math.max(0.001, lMax - lMin)));
      let [r, g, b] = getLayerColor(state.activeLayer, normVal, sDeg, bPct, hillshade);

      // Topographic contour lines every 15m of MOLA elevation
      if (state.showContours) {
        const contourStep = 15.0;
        const mod = ((z - zMin) % contourStep + contourStep) % contourStep;
        if (mod < 0.75) {
          r = r * 0.62 + 255 * 0.38;
          g = g * 0.62 + 230 * 0.38;
          b = b * 0.62 + 190 * 0.38;
        }
      }

      // Diagonal red hazard hatching over non-traversable slopes/boulder aprons
      if (state.showHazards && (sDeg > state.maxSlopeDeg || bPct > 55)) {
        if ((px + py) % 9 < 2) {
          r = 255;
          g = 45;
          b = 75;
        }
      }

      const idx = (py * res + px) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  octx.putImageData(imgData, 0, 0);
  state.layerCanvasCache = off;
}

// ============================================================================
// 3. SCENE RENDERER (DISPATCHES 2D GIS MAP OR 3D HOLOGRAPHIC TERRAIN)
// ============================================================================

function renderScene() {
  if (!state.siteData) return;
  if (state.viewMode === "3d") {
    render3DTerrain();
  } else {
    render2DMap();
  }
}

function get2DMapViewport() {
  const W = marsCanvas.width;
  const H = marsCanvas.height;
  const pad = 26;
  const size = Math.min(W - pad * 2, H - pad * 2);
  const ox = Math.floor((W - size) / 2);
  const oy = Math.floor((H - size) / 2);
  return { ox, oy, size, W, H };
}

function render2DMap() {
  const { ox, oy, size, W, H } = get2DMapViewport();
  const site = state.siteData.site;
  const N = site.grid_size;

  ctx.fillStyle = "#06090e";
  ctx.fillRect(0, 0, W, H);

  if (state.layerCanvasCache) {
    ctx.drawImage(state.layerCanvasCache, ox, oy, size, size);
  }

  // Optional real stitched NASA Mars Trek MOLA mosaic blend
  if (state.blendTrekTiles && state.trekTileLoaded && state.trekTileImg) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.drawImage(state.trekTileImg, ox, oy, size, size);
    ctx.restore();
  }

  // Optional live CTX 5m tile stream blend
  if (state.blendCtxTiles && state.ctxTileLoaded && state.ctxTileImg) {
    ctx.save();
    ctx.globalAlpha = 0.52;
    ctx.drawImage(state.ctxTileImg, ox, oy, size, size);
    ctx.restore();
  }

  // Optional real MRO HiRISE RDRV11 strip overlay (PSP_008650_1990_COLOR)
  if (state.overlayHiriseStrip && state.hiriseStripLoaded && state.hiriseStripImg) {
    ctx.save();
    ctx.globalAlpha = 0.72;
    const stripW = size * 0.28;
    const stripX = ox + size * 0.36;
    ctx.drawImage(state.hiriseStripImg, stripX, oy, stripW, size);
    ctx.strokeStyle = "#27d7ff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(stripX, oy, stripW, size);
    ctx.fillStyle = "#27d7ff";
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.fillText("HiRISE RDR SWATH: PSP_008650_1990 (0.25m/px)", stripX + 6, oy + 16);
    ctx.restore();
  }

  // Draw planetary coordinate graticule grid (every 250m)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(200, 220, 245, 0.55)";

  for (let i = 0; i <= 8; i++) {
    const pos = (i / 8) * size;
    // Vertical grid line
    ctx.beginPath();
    ctx.moveTo(ox + pos, oy);
    ctx.lineTo(ox + pos, oy + size);
    ctx.stroke();
    // Horizontal grid line
    ctx.beginPath();
    ctx.moveTo(ox, oy + pos);
    ctx.lineTo(ox + size, oy + pos);
    ctx.stroke();

    if (i < 8) {
      const meters = i * 250;
      ctx.fillText(`${meters}m`, ox + pos + 4, oy + 12);
    }
  }

  const cellToPx = (gx, gy) => ({
    x: ox + (gx / (N - 1)) * size,
    y: oy + (gy / (N - 1)) * size
  });

  // 1. Draw Direct Crow-Flies Path (Dashed Crimson Comparison Benchmark)
  if (state.showDirectPath && state.routeResult && state.routeResult.direct_path) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 51, 85, 0.85)";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    state.routeResult.direct_path.forEach((pt, idx) => {
      const p = cellToPx(pt.gx, pt.gy);
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  // 2. Draw Emergency Shelter Abort Route (if active or SPE storm)
  const activeAbort = state.abortRoute || (state.speStorm && state.routeResult ? state.routeResult.emergency_abort : null);
  if (activeAbort && activeAbort.path) {
    ctx.save();
    ctx.strokeStyle = "#27d7ff";
    ctx.lineWidth = 3.2;
    ctx.shadowColor = "#27d7ff";
    ctx.shadowBlur = 10;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    activeAbort.path.forEach((pt, idx) => {
      const p = cellToPx(pt.gx, pt.gy);
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  // 3. Draw Primary Anisotropic A* Safe EVA Route
  if (state.routeResult && state.routeResult.path) {
    ctx.save();
    ctx.strokeStyle = "#18e299";
    ctx.lineWidth = 3.8;
    ctx.shadowColor = "#18e299";
    ctx.shadowBlur = 12;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    state.routeResult.path.forEach((pt, idx) => {
      const p = cellToPx(pt.gx, pt.gy);
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  // 4. Draw Habitat Base Icon
  const habPos = cellToPx(site.habitat.gx, site.habitat.gy);
  ctx.save();
  ctx.beginPath();
  ctx.arc(habPos.x, habPos.y, 16, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(39, 215, 255, 0.18)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#27d7ff";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(habPos.x, habPos.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#27d7ff";
  ctx.fill();
  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("🏠 HABITAT", habPos.x + 12, habPos.y + 4);
  ctx.restore();

  // 5. Draw Science, ISRU, Shelter, and Hazard POI Markers
  site.pois.forEach((poi) => {
    const p = cellToPx(poi.gx, poi.gy);
    let color = "#b56bff";
    let symbol = "🔬";
    if (poi.category === "isru") { color = "#27d7ff"; symbol = "💧"; }
    else if (poi.category === "shelter") { color = "#18e299"; symbol = "🛡️"; }
    else if (poi.category === "hazard") { color = "#ff3355"; symbol = "⚠️"; }

    const isSelected = state.selectedPoi && state.selectedPoi.id === poi.id;

    ctx.save();
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#090d14";
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, p.x, p.y);

    // Label pill
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#090d14";
    const lbl = poi.id;
    ctx.fillRect(p.x + 11, p.y - 7, lbl.length * 6.5 + 6, 14);
    ctx.fillStyle = color;
    ctx.fillText(lbl, p.x + 14, p.y + 1);
    ctx.restore();
  });

  // 6. Draw Numbered Waypoint Flags
  state.waypoints.forEach((wp, idx) => {
    const p = cellToPx(wp.gx, wp.gy);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y - 14, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffab2e";
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(idx + 1), p.x, p.y - 14);
    ctx.restore();
  });

  // 7. Draw Active Simulated Astronaut Position along EVA Route
  if (state.routeResult && state.routeResult.path && state.routeResult.path.length > 0) {
    const idx = Math.min(state.simStepIndex, state.routeResult.path.length - 1);
    const astroCell = state.routeResult.path[idx];
    const ap = cellToPx(astroCell.gx, astroCell.gy);

    ctx.save();
    ctx.beginPath();
    ctx.arc(ap.x, ap.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ap.x, ap.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ff5e2b";
    ctx.stroke();

    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("👨‍🚀 EVA-1", ap.x + 10, ap.y - 8);
    ctx.restore();
  }

  // 8. Render Comm Topology Portable UHF Relays if active
  if (typeof P1_COMM_TOPOLOGY !== 'undefined') {
    P1_COMM_TOPOLOGY.render2D(ctx, cellToPx);
  }
  // 9. Render P2.2 Habitat Suitability Markers & Blast Exclusion Ring if active
  if (typeof P2_HABITAT !== 'undefined') {
    P2_HABITAT.render2D(ctx, cellToPx);
  }
}

// ============================================================================
// 4. INTERACTIVE 3D MOLA TOPOGRAPHIC HOLOGRAM RENDERER
// ============================================================================

function render3DTerrain() {
  const W = marsCanvas.width;
  const H = marsCanvas.height;
  const site = state.siteData.site;
  const layers = state.siteData.layers;
  const N = site.grid_size;
  const [zMin, zMax] = site.elevation_range_m;
  const zSpan = Math.max(1, zMax - zMin);

  ctx.fillStyle = "#05080d";
  ctx.fillRect(0, 0, W, H);

  const yaw = state.cam3d.yaw;
  const pitch = state.cam3d.pitch;
  const zoom = state.cam3d.zoom;
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

  const scale = Math.min(W, H) * 0.0092 * zoom;
  const cx = W * 0.5;
  const cy = H * 0.56;

  const project3D = (gx, gy, zVal) => {
    const nx = gx - (N - 1) / 2;
    const ny = gy - (N - 1) / 2;
    const nz = ((zVal - zMin) / zSpan) * 22.0; // Exaggerated vertical relief for tactical clarity

    const rx = nx * cosY - ny * sinY;
    const ry = nx * sinY + ny * cosY;

    const sx = cx + rx * scale;
    const sy = cy + (ry * cosP - nz * sinP) * scale;
    const depth = ry * sinP + nz * cosP;
    return { x: sx, y: sy, depth };
  };

  // Build painter's algorithm quad list (stride 2 for 60fps smooth interactivity)
  const step = 2;
  const quads = [];
  for (let y = 0; y < N - step; y += step) {
    for (let x = 0; x < N - step; x += step) {
      const z00 = layers.elevation[y][x];
      const z10 = layers.elevation[y][x + step];
      const z11 = layers.elevation[y + step][x + step];
      const z01 = layers.elevation[y + step][x];

      const p00 = project3D(x, y, z00);
      const p10 = project3D(x + step, y, z10);
      const p11 = project3D(x + step, y + step, z11);
      const p01 = project3D(x, y + step, z01);

      const avgDepth = (p00.depth + p10.depth + p11.depth + p01.depth) * 0.25;
      const sDeg = layers.slope[y][x];
      const bPct = layers.boulder[y][x];

      let rawVal = z00;
      let lMin = zMin, lMax = zMax;
      if (state.activeLayer === "mineral") { rawVal = layers.mineral[y][x]; lMin = 10; lMax = 95; }
      else if (state.activeLayer === "hydration") { rawVal = layers.hydration[y][x]; lMin = 0; lMax = site.id === "arcadia" ? 80 : 18; }
      else if (state.activeLayer === "radiation") {
        rawVal = layers.radiation[y][x];
        lMin = site.base_radiation_uSv_hr * 0.15;
        lMax = site.base_radiation_uSv_hr * 1.25;
      } else if (state.activeLayer === "comm_los") { rawVal = layers.comm_los[y][x]; lMin = 0; lMax = 100; }
      else if (state.activeLayer === "risk_heatmap") { rawVal = layers.risk_heatmap ? layers.risk_heatmap[y][x] : 50; lMin = 0; lMax = 100; }
      else if (state.activeLayer === "habitat_suitability") { rawVal = layers.habitat_suitability ? layers.habitat_suitability[y][x] : 0; lMin = 0; lMax = 95; }

      const normVal = Math.max(0, Math.min(1, (rawVal - lMin) / Math.max(0.001, lMax - lMin)));
      const dzdx = (z10 - z00) / 20.0;
      const dzdy = (z01 - z00) / 20.0;
      const hillshade = Math.max(0.45, Math.min(1.3, 0.95 - dzdx * 0.6 - dzdy * 0.6));
      const [r, g, b] = getLayerColor(state.activeLayer, normVal, sDeg, bPct, hillshade);

      quads.push({
        p00, p10, p11, p01,
        depth: avgDepth,
        fill: `rgb(${r},${g},${b})`
      });
    }
  }

  quads.sort((a, b) => a.depth - b.depth);

  ctx.lineWidth = 0.45;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  for (let i = 0; i < quads.length; i++) {
    const q = quads[i];
    ctx.beginPath();
    ctx.moveTo(q.p00.x, q.p00.y);
    ctx.lineTo(q.p10.x, q.p10.y);
    ctx.lineTo(q.p11.x, q.p11.y);
    ctx.lineTo(q.p01.x, q.p01.y);
    ctx.closePath();
    ctx.fillStyle = q.fill;
    ctx.fill();
    ctx.stroke();
  }

  // Draw 3D A* Route Ribbon elevated slightly above terrain
  if (state.routeResult && state.routeResult.path) {
    ctx.save();
    ctx.strokeStyle = "#18e299";
    ctx.lineWidth = 3.5;
    ctx.shadowColor = "#18e299";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    state.routeResult.path.forEach((pt, idx) => {
      const z = layers.elevation[pt.gy][pt.gx] + 2.5;
      const p = project3D(pt.gx, pt.gy, z);
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  // Draw 3D Vertical Beacon Pins for Habitat & POIs
  const drawBeacon3D = (gx, gy, label, color) => {
    const zSurf = layers.elevation[gy][gx];
    const pBase = project3D(gx, gy, zSurf);
    const pTop = project3D(gx, gy, zSurf + zSpan * 0.18);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pBase.x, pBase.y);
    ctx.lineTo(pTop.x, pTop.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pTop.x, pTop.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText(label, pTop.x + 7, pTop.y + 3);
    ctx.restore();
  };

  drawBeacon3D(site.habitat.gx, site.habitat.gy, "HABITAT", "#27d7ff");
  site.pois.forEach((poi) => {
    const c = poi.category === "hazard" ? "#ff3355" : poi.category === "shelter" ? "#18e299" : "#ffab2e";
    drawBeacon3D(poi.gx, poi.gy, poi.id, c);
  });

  if (typeof P1_COMM_TOPOLOGY !== 'undefined') {
    P1_COMM_TOPOLOGY.render3D(ctx, project3D, layers);
  }
  if (typeof P2_HABITAT !== 'undefined') {
    P2_HABITAT.render3D(ctx, project3D, layers);
  }
}

// ============================================================================
// 5. BOTTOM MULTIVARIATE ELEVATION & TELEMETRY PROFILE CHART
// ============================================================================

function renderProfileChart() {
  const W = profileCanvas.width;
  const H = profileCanvas.height;
  pctx.clearRect(0, 0, W, H);

  if (!state.routeResult || !state.routeResult.telemetry || !state.routeResult.telemetry.profile) {
    return;
  }

  const prof = state.routeResult.telemetry.profile;
  if (prof.length < 2) return;

  const padL = 46, padR = 46, padT = 14, padB = 22;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  let primarySeries = [];
  let secondarySeries = [];
  let primaryColor = "#18e299";
  let secondaryColor = "#ff5e2b";
  let unitLeft = "m";
  let unitRight = "°";

  if (state.profileTab === "elev_slope") {
    primarySeries = prof.map((p) => p.elevation_m);
    secondarySeries = prof.map((p) => p.slope_deg);
    primaryColor = "#18e299";
    secondaryColor = "#ff5e2b";
    unitLeft = "m";
    unitRight = "°";
  } else if (state.profileTab === "metabolic_o2") {
    primarySeries = prof.map((p) => p.metabolic_watts);
    secondarySeries = prof.map((p) => p.cum_o2_l);
    primaryColor = "#ffab2e";
    secondaryColor = "#27d7ff";
    unitLeft = "W";
    unitRight = "L O₂";
  } else {
    primarySeries = prof.map((p) => p.radiation_uSv_hr);
    secondarySeries = prof.map((p) => p.comm_los_pct);
    primaryColor = "#b56bff";
    secondaryColor = "#18e299";
    unitLeft = "µSv/h";
    unitRight = "%";
  }

  const min1 = Math.min(...primarySeries);
  const max1 = Math.max(...primarySeries, min1 + 1);
  const min2 = 0;
  const max2 = Math.max(...secondarySeries, 10);

  // Horizontal grid lines
  pctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  pctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = padT + (i / 3) * plotH;
    pctx.beginPath();
    pctx.moveTo(padL, y);
    pctx.lineTo(padL + plotW, y);
    pctx.stroke();
  }

  // Primary area fill + curve
  pctx.save();
  pctx.beginPath();
  primarySeries.forEach((v, idx) => {
    const x = padL + (idx / (prof.length - 1)) * plotW;
    const y = padT + plotH - ((v - min1) / (max1 - min1)) * plotH;
    if (idx === 0) pctx.moveTo(x, y);
    else pctx.lineTo(x, y);
  });
  pctx.strokeStyle = primaryColor;
  pctx.lineWidth = 2.2;
  pctx.stroke();

  pctx.lineTo(padL + plotW, padT + plotH);
  pctx.lineTo(padL, padT + plotH);
  pctx.closePath();
  pctx.fillStyle = "rgba(24, 226, 153, 0.12)";
  pctx.fill();
  pctx.restore();

  // Secondary curve
  pctx.save();
  pctx.beginPath();
  secondarySeries.forEach((v, idx) => {
    const x = padL + (idx / (prof.length - 1)) * plotW;
    const y = padT + plotH - ((v - min2) / (max2 - min2)) * plotH;
    if (idx === 0) pctx.moveTo(x, y);
    else pctx.lineTo(x, y);
  });
  pctx.strokeStyle = secondaryColor;
  pctx.lineWidth = 1.8;
  pctx.stroke();
  pctx.restore();

  // Max safe slope threshold line on elev_slope tab
  if (state.profileTab === "elev_slope") {
    const yThresh = padT + plotH - (state.maxSlopeDeg / max2) * plotH;
    if (yThresh >= padT && yThresh <= padT + plotH) {
      pctx.save();
      pctx.strokeStyle = "rgba(255, 51, 85, 0.65)";
      pctx.setLineDash([4, 4]);
      pctx.beginPath();
      pctx.moveTo(padL, yThresh);
      pctx.lineTo(padL + plotW, yThresh);
      pctx.stroke();
      pctx.restore();
    }
  }

  // Draw active astronaut step vertical playhead
  const astroIdx = Math.min(state.simStepIndex, prof.length - 1);
  const ax = padL + (astroIdx / (prof.length - 1)) * plotW;
  pctx.save();
  pctx.strokeStyle = "#ffffff";
  pctx.lineWidth = 1.5;
  pctx.beginPath();
  pctx.moveTo(ax, padT);
  pctx.lineTo(ax, padT + plotH);
  pctx.stroke();
  pctx.restore();

  // Axis Labels
  pctx.font = "10px 'JetBrains Mono', monospace";
  pctx.fillStyle = primaryColor;
  pctx.fillText(`${Math.round(max1)}${unitLeft}`, 4, padT + 8);
  pctx.fillText(`${Math.round(min1)}${unitLeft}`, 4, padT + plotH);

  pctx.fillStyle = secondaryColor;
  pctx.fillText(`${Math.round(max2)}${unitRight}`, W - padR + 4, padT + 8);
  pctx.fillText(`0${unitRight}`, W - padR + 4, padT + plotH);

  pctx.fillStyle = "#8b9bb4";
  const totalDist = prof[prof.length - 1].dist_m;
  pctx.fillText("0 m (HAB START)", padL, H - 5);
  pctx.fillText(`${Math.round(totalDist * 0.5)} m`, padL + plotW * 0.46, H - 5);
  pctx.fillText(`${Math.round(totalDist)} m (EVA END)`, padL + plotW - 85, H - 5);
}

// ============================================================================
// 6. UI UPDATERS (KPIs, INSPECTOR, DIRECTORY, WAYPOINTS)
// ============================================================================

function updateTopHeaderHUD() {
  const site = state.siteData.site;
  document.getElementById("mission-designation").textContent =
    `${site.mission_designation} — ${site.name.toUpperCase()}`;
  document.getElementById("site-summary").textContent = site.summary;
  document.getElementById("hud-gravity").textContent = `${site.gravity_ms2} m/s² (0.38g)`;
  document.getElementById("hud-temp").textContent = `${site.diurnal_temp_c.mean}°C (${site.diurnal_temp_c.min}°/${site.diurnal_temp_c.max}°)`;
  document.getElementById("hud-pressure").textContent = `${site.atmospheric_pressure_pa} Pa (CO₂)`;

  const radFlux = state.speStorm ? site.solar_particle_event_uSv_hr : site.base_radiation_uSv_hr;
  const radEl = document.getElementById("hud-rad");
  radEl.textContent = `${radFlux} µSv/hr`;
  radEl.style.color = state.speStorm ? "#ff3355" : "#edf2f8";
}

function updateTelemetryKPIs() {
  if (!state.routeResult || !state.routeResult.telemetry) return;
  const sum = state.routeResult.telemetry.summary;
  const comp = state.routeResult.direct_comparison;

  const badge = document.getElementById("badge-safety-score");
  badge.textContent = `SAFETY ${sum.safety_index}%`;
  badge.style.color = sum.safety_index >= 75 ? "#18e299" : sum.safety_index >= 50 ? "#ffab2e" : "#ff3355";
  badge.style.borderColor = badge.style.color;

  document.getElementById("kpi-dist").textContent = `${sum.distance_km} km`;
  document.getElementById("kpi-elev-gain").textContent = `+${sum.elev_gain_m}m / -${sum.elev_loss_m}m`;
  document.getElementById("kpi-time").textContent = `${sum.duration_min} min`;
  const avgSpd = (sum.distance_km / Math.max(0.05, sum.duration_hr)).toFixed(2);
  document.getElementById("kpi-speed").textContent = `Avg ${avgSpd} km/h`;

  document.getElementById("kpi-slope").textContent = `${sum.max_slope_deg}°`;
  document.getElementById("kpi-boulder").textContent = `Max ${sum.max_boulder_pct}% Talus`;
  document.getElementById("kpi-rad").textContent = `${sum.radiation_dose_uSv} µSv`;
  document.getElementById("kpi-comm").textContent = `Min Comm: ${sum.min_comm_los_pct}%`;

  document.getElementById("cons-o2-text").textContent = `${sum.o2_liters} L (${sum.o2_tank_pct}%)`;
  document.getElementById("bar-o2").style.width = `${Math.max(6, sum.o2_tank_pct)}%`;

  document.getElementById("cons-bat-text").textContent = `${sum.battery_wh} Wh (${sum.battery_pct}%)`;
  document.getElementById("bar-bat").style.width = `${Math.max(6, sum.battery_pct)}%`;

  document.getElementById("cons-kcal-text").textContent = `${sum.calories_kcal} kcal`;
  document.getElementById("bar-kcal").style.width = `${Math.min(100, Math.max(8, (sum.calories_kcal / 1200) * 100))}%`;

  if (comp && comp.direct_summary) {
    const dSum = comp.direct_summary;
    document.getElementById("comp-body-text").innerHTML =
      `Cuts hazard exposure by <strong>${comp.hazard_reduction_pct}%</strong> vs. direct route (avoids <strong>${dSum.max_slope_deg}°</strong> scarps &amp; <strong>${dSum.max_boulder_pct}%</strong> boulder traps; Safety <strong>${sum.safety_index}%</strong> vs <strong>${dSum.safety_index}%</strong>).`;
  }

  if (sum.hazard_breakdown) {
    updateHazardBreakdownKPI(sum.hazard_breakdown);
  } else if (state.siteData && state.siteData.environmental_risk_meta) {
    updateHazardBreakdownKPI();
  }
}

function updateHazardBreakdownKPI(breakdown) {
  const card = document.getElementById("hazard-breakdown-card");
  if (!card) return;

  if (!breakdown) {
    if (state.siteData && state.siteData.environmental_risk_meta) {
      const meta = state.siteData.environmental_risk_meta;
      const hc = meta.hazard_contributions_pct || {};
      breakdown = {
        mean_composite_risk: meta.mean_risk,
        peak_composite_risk: meta.max_risk,
        slope_risk_pct: hc.slope || 0,
        boulder_risk_pct: hc.boulder || 0,
        radiation_risk_pct: hc.radiation || 0,
        comm_shadow_risk_pct: hc.comm_shadow || 0,
        primary_driver: "Sector Baseline",
        advisory: `Sector-wide average risk: ${meta.mean_risk}%. High-risk danger zone covers ${meta.high_risk_area_pct}% of terrain grid.`
      };
    } else {
      return;
    }
  }

  const rScore = breakdown.mean_composite_risk || 0;
  const rColor = rScore >= 65 ? "#ef4444" : rScore >= 35 ? "#f59e0b" : "#10b981";
  const rLevel = rScore >= 65 ? "HIGH RISK" : rScore >= 35 ? "MODERATE" : "LOW RISK";

  const meterVal = document.getElementById("hb-composite-val");
  if (meterVal) {
    meterVal.textContent = `${rScore}% [${rLevel}]`;
    meterVal.style.color = rColor;
  }
  const meterBar = document.getElementById("hb-composite-bar");
  if (meterBar) {
    meterBar.style.width = `${Math.min(100, Math.max(5, rScore))}%`;
    meterBar.style.background = rColor;
  }

  const setBar = (id, textId, val) => {
    const el = document.getElementById(id);
    const tel = document.getElementById(textId);
    if (el) el.style.width = `${Math.min(100, Math.max(5, val))}%`;
    if (tel) tel.textContent = `${val}%`;
  };

  setBar("hb-bar-slope", "hb-val-slope", breakdown.slope_risk_pct || 0);
  setBar("hb-bar-boulder", "hb-val-boulder", breakdown.boulder_risk_pct || 0);
  setBar("hb-bar-rad", "hb-val-rad", breakdown.radiation_risk_pct || 0);
  setBar("hb-bar-comm", "hb-val-comm", breakdown.comm_shadow_risk_pct || 0);

  const driverBadge = document.getElementById("hb-driver-badge");
  if (driverBadge && breakdown.primary_driver) {
    driverBadge.textContent = breakdown.primary_driver.toUpperCase();
    driverBadge.style.color = rColor;
  }

  const advEl = document.getElementById("hb-advisory-text");
  if (advEl && breakdown.advisory) {
    advEl.textContent = breakdown.advisory;
  }
}

function updatePoiInspector() {
  const box = document.getElementById("poi-inspector");
  const poi = state.selectedPoi;
  if (!poi) {
    box.innerHTML = `<div class="poi-desc">Select any marker on the Martian map to inspect CRISM mineralogy &amp; sampling protocols.</div>`;
    return;
  }

  const tagClass =
    poi.category === "science" ? "tag-science" :
    poi.category === "isru" ? "tag-isru" :
    poi.category === "shelter" ? "tag-shelter" : "tag-hazard";

  const chips = (poi.minerals || [])
    .map((m) => `<span class="mineral-chip">${m}</span>`)
    .join("");

  box.innerHTML = `
    <span class="poi-tag ${tagClass}">${poi.id} // ${poi.subtype.toUpperCase()}</span>
    <div class="poi-title">${poi.name}</div>
    <div class="poi-desc">${poi.description}</div>
    <div class="mineral-chips">${chips}</div>
    <div style="display:flex; justify-content:space-between; font-size:10px; color:#8b9bb4; border-top:1px solid rgba(255,255,255,0.08); padding-top:5px;">
      <span>Instrument: <strong style="color:#fff">${poi.instrument}</strong></span>
      <span>H₂O Eq: <strong style="color:#27d7ff">${poi.hydration_pct}%</strong></span>
    </div>
    <div style="margin-top:4px; font-size:10px; color:#18e299;">
      Protocol: <strong>${poi.sample_protocol}</strong>
    </div>
  `;
}

function updatePoiDirectory() {
  const dir = document.getElementById("poi-directory");
  const pois = state.siteData.site.pois;
  dir.innerHTML = "";

  pois.forEach((poi) => {
    const item = document.createElement("div");
    item.className = "dir-item";
    item.innerHTML = `
      <div class="dir-left">
        <strong>${poi.id}: ${poi.name}</strong>
        <span>${poi.subtype} • H₂O ${poi.hydration_pct}%</span>
      </div>
      <button class="btn-add-wp" data-poi-id="${poi.id}">+ ROUTE</button>
    `;
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-add-wp")) {
        state.waypoints.push({ gx: poi.gx, gy: poi.gy, label: poi.name });
        updateWaypointListUI();
        requestRoutePlan();
      } else {
        state.selectedPoi = poi;
        updatePoiInspector();
        renderScene();
      }
    });
    dir.appendChild(item);
  });
}

function updateWaypointListUI() {
  const list = document.getElementById("waypoint-list");
  list.innerHTML = "";

  state.waypoints.forEach((wp, idx) => {
    const row = document.createElement("div");
    row.className = "wp-item";
    row.innerHTML = `
      <div>
        <span class="wp-badge">#${idx + 1}</span>
        <span>${wp.label} (${wp.gx}, ${wp.gy})</span>
      </div>
      ${state.waypoints.length > 2 ? `<button class="wp-remove" data-idx="${idx}">✕</button>` : ""}
    `;
    const rmBtn = row.querySelector(".wp-remove");
    if (rmBtn) {
      rmBtn.addEventListener("click", () => {
        state.waypoints.splice(idx, 1);
        updateWaypointListUI();
        requestRoutePlan();
      });
    }
    list.appendChild(row);
  });
}

function updateModalPdsManifest() {
  const el = document.getElementById("modal-pds-manifest");
  if (!el || !state.siteData || !state.siteData.real_data_provenance) return;
  const prov = state.siteData.real_data_provenance;
  const hList = (prov.ode_hirise_products || [])
    .map((p) => `<div>• <strong>HiRISE RDRV11:</strong> <code>${p.pdsid}</code> (${p.Map_scale_m_px}m/px) — <a href="${p.jp2_url || p.thumb_url}" target="_blank" style="color:#27d7ff">PDS JP2/Thumb</a></div>`)
    .join("");
  const cList = (prov.ode_crism_products || [])
    .map((p) => `<div>• <strong>CRISM MTRDR:</strong> <code>${p.pdsid}</code> (${p.image_cube_count} cubes) — <a href="${p.browse_url || p.sample_cube_url}" target="_blank" style="color:#b56bff">PDS MTRDR Cube</a></div>`)
    .join("");
  const rInfo = prov.msl_rad_pds || {};
  const rList = (rInfo.sample_records || [])
    .map((r) => `<div>• <strong>MSL RAD RDR:</strong> <code>${r.product_id}</code> (${r.file_spec})</div>`)
    .join("");

  el.innerHTML = `
    <div style="margin-bottom:8px; color:#ffab2e; font-weight:700;">MRO HiRISE RDRV11 Products (${(prov.ode_hirise_products || []).length} loaded via ODE REST API):</div>
    ${hList}
    <div style="margin:10px 0 8px; color:#b56bff; font-weight:700;">MRO CRISM MTRDR Spectral Cubes (${(prov.ode_crism_products || []).length} loaded via ODE REST API):</div>
    ${cList}
    <div style="margin:10px 0 8px; color:#18e299; font-weight:700;">Curiosity MSL RAD Archive (${rInfo.total_rdr_files_indexed || 5570} RDR files indexed in INDEX.TAB):</div>
    ${rList}
  `;
}

function updateLegendUI() {
  const site = state.siteData.site;
  const [zMin, zMax] = site.elevation_range_m;
  const titleEl = document.getElementById("legend-layer-title");
  const gradEl = document.getElementById("legend-gradient");
  const minEl = document.getElementById("legend-min");
  const midEl = document.getElementById("legend-mid");
  const maxEl = document.getElementById("legend-max");

  const meta = {
    composite: {
      title: "TACTICAL SURVIVAL COMPOSITE (MOLA + HAZARDS)",
      grad: "linear-gradient(90deg, #5c3426, #c67a4b, #ff2644)",
      min: `${zMin} m (Safe)`, mid: "Basalt Bench", max: `>${state.maxSlopeDeg}° Hazard`
    },
    elevation: {
      title: "MOLA LASER ALTIMETER DIGITAL ELEVATION (DEM)",
      grad: "linear-gradient(90deg, #14559b, #2dd4bf, #f59e0b, #f43f5e)",
      min: `${zMin} m`, mid: `${Math.round((zMin + zMax) / 2)} m`, max: `${zMax} m`
    },
    slope: {
      title: "GEODESIC SLOPE INCLINATION (NASA STD-3001)",
      grad: "linear-gradient(90deg, #18c378, #f4cd1e, #ff1e42)",
      min: "0° (Flat)", mid: `${state.maxSlopeDeg}° Limit`, max: "28°+ Scarp"
    },
    boulder: {
      title: "HiRISE SUB-METER BOULDER & TALUS DENSITY",
      grad: "linear-gradient(90deg, #232d46, #d97706, #dc2626)",
      min: "2% Smooth", mid: "35% Rocky", max: "85% Talus Trap"
    },
    mineral: {
      title: "CRISM SPECTRAL MINERALOGY & BIOSIGNATURE INDEX",
      grad: "linear-gradient(90deg, #26165f, #855ceb, #ffdb4d)",
      min: "Basalt Dust", mid: "Carbonates", max: "Smectite/Silica"
    },
    hydration: {
      title: "SHARAD / NEUTRON WATER-ICE EQUIVALENT (wt%)",
      grad: "linear-gradient(90deg, #2d3748, #0284c7, #38bdf8)",
      min: "0.5% Dry", mid: "Hydrated Salt", max: "High H₂O Ice"
    },
    radiation: {
      title: "ODYSSEY / MSL RAD IONIZING FLUX (µSv/hr)",
      grad: "linear-gradient(90deg, #1996af, #be2d96, #ffe628)",
      min: "Shielded", mid: "Nominal GCR", max: "Exposed Ridge"
    },
    comm_los: {
      title: "HABITAT UHF ANTENNA LINE-OF-SIGHT LINK (%)",
      grad: "linear-gradient(90deg, #d2143a, #eab308, #18e299)",
      min: "0% N-LOS Shadow", mid: "55% Diffracted", max: "100% Direct LOS"
    },
    risk_heatmap: {
      title: "DYNAMIC ENVIRONMENTAL RISK HEATMAP (MULTI-HAZARD COMPOSITE 0-100%)",
      grad: "linear-gradient(90deg, #10b981, #eab308, #ea580c, #dc2626, #f43f5e)",
      min: "0% Low Risk", mid: "50% Caution", max: "100% Critical Hazard"
    },
    habitat_suitability: {
      title: "MCDA HABITAT SUITABILITY & HLS BLAST EXCLUSION (AHP CR < 0.10)",
      grad: "linear-gradient(90deg, #261822, #d97706, #eab308, #10b981, #06b6d4)",
      min: "0% Disqualified/Blast", mid: "55% Acceptable", max: "95% Optimal Basecamp"
    }
  }[state.activeLayer];

  if (meta) {
    titleEl.textContent = meta.title;
    gradEl.style.background = meta.grad;
    minEl.textContent = meta.min;
    midEl.textContent = meta.mid;
    maxEl.textContent = meta.max;
  }
}

// ============================================================================
// 7. MARSWALK ANIMATION & EMERGENCY SHELTER ABORT
// ============================================================================

function toggleSimulation() {
  if (state.simPlaying) {
    stopSimulation();
  } else {
    startSimulation();
  }
}

function startSimulation() {
  if (!state.routeResult || !state.routeResult.path || state.routeResult.path.length === 0) return;
  state.simPlaying = true;
  document.getElementById("btn-play-eva").textContent = "⏸ PAUSE MARSWALK";

  state.simTimer = setInterval(() => {
    state.simStepIndex = (state.simStepIndex + 1) % state.routeResult.path.length;
    const pt = state.routeResult.path[state.simStepIndex];
    updateProbeHUD(pt.gx, pt.gy);
    renderScene();
    renderProfileChart();
  }, 95);
}

function stopSimulation() {
  state.simPlaying = false;
  const btn = document.getElementById("btn-play-eva");
  if (btn) btn.textContent = "▶ SIMULATE MARSWALK";
  if (state.simTimer) {
    clearInterval(state.simTimer);
    state.simTimer = null;
  }
}

async function triggerEmergencyShelterAbort() {
  if (!state.routeResult || !state.routeResult.path) return;
  const currentCell = state.routeResult.path[Math.min(state.simStepIndex, state.routeResult.path.length - 1)];

  const res = await fetch("/api/emergency_abort", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      site_id: state.siteId,
      gx: currentCell.gx,
      gy: currentCell.gy
    })
  });
  state.abortRoute = await res.json();

  if (state.abortRoute && state.abortRoute.destination) {
    const dest = state.abortRoute.destination;
    const dSum = state.abortRoute.summary;
    document.getElementById("comp-body-text").innerHTML =
      `<span style="color:#27d7ff; font-weight:800;">🚨 EMERGENCY ABORT LOCKED:</span> Directing EVA-1 to <strong>${dest.name}</strong> (${dest.type}) — <strong>${dSum.distance_m}m</strong> (${dSum.duration_min} min).`;
  }
  renderScene();
}

function updateProbeHUD(gx, gy) {
  if (!state.siteData) return;
  const site = state.siteData.site;
  const layers = state.siteData.layers;
  const N = site.grid_size;
  const x = Math.max(0, Math.min(N - 1, Math.round(gx)));
  const y = Math.max(0, Math.min(N - 1, Math.round(gy)));

  const lat = (site.coordinates.lat + (0.5 - y / N) * 0.035).toFixed(4);
  const lon = (site.coordinates.lon + (x / N - 0.5) * 0.035).toFixed(4);

  document.getElementById("probe-coords").textContent = `${lat}°, ${lon}°`;
  document.getElementById("probe-elev").textContent = `${layers.elevation[y][x]} m`;
  document.getElementById("probe-slope").textContent = `${layers.slope[y][x]}°`;
  document.getElementById("probe-boulder").textContent = `${layers.boulder[y][x]}%`;
  document.getElementById("probe-mineral").textContent = `${layers.mineral[y][x]}`;
  document.getElementById("probe-hydration").textContent = `${layers.hydration[y][x]}%`;
  const rad = state.speStorm
    ? ((layers.radiation[y][x] / site.base_radiation_uSv_hr) * site.solar_particle_event_uSv_hr).toFixed(1)
    : layers.radiation[y][x];
  document.getElementById("probe-rad").textContent = `${rad} µSv/h`;
  document.getElementById("probe-comm").textContent = `${layers.comm_los[y][x]}%`;
}

// ============================================================================
// 8. EVENT LISTENERS & INTERACTION BINDINGS
// ============================================================================

function setupEventListeners() {
  // Site Selector
  document.getElementById("site-selector").addEventListener("change", (e) => {
    loadSite(e.target.value);
  });

  // NASA Layer Buttons
  document.querySelectorAll(".layer-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".layer-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeLayer = btn.dataset.layer;
      updateLegendUI();
      bake2DTerrainLayer();
      renderScene();
    });
  });

  // Overlay Checkboxes
  document.getElementById("chk-contours").addEventListener("change", (e) => {
    state.showContours = e.target.checked;
    bake2DTerrainLayer();
    renderScene();
  });
  document.getElementById("chk-hazards").addEventListener("change", (e) => {
    state.showHazards = e.target.checked;
    bake2DTerrainLayer();
    renderScene();
  });
  document.getElementById("chk-direct-path").addEventListener("change", (e) => {
    state.showDirectPath = e.target.checked;
    renderScene();
  });
  document.getElementById("chk-trek-tiles").addEventListener("change", (e) => {
    state.blendTrekTiles = e.target.checked;
    renderScene();
  });
  const chkCtx = document.getElementById("chk-ctx-tiles");
  if (chkCtx) {
    chkCtx.addEventListener("change", (e) => {
      state.blendCtxTiles = e.target.checked;
      renderScene();
    });
  }
  const chkHirise = document.getElementById("chk-hirise-strip");
  if (chkHirise) {
    chkHirise.addEventListener("change", (e) => {
      state.overlayHiriseStrip = e.target.checked;
      renderScene();
    });
  }

  // Route Mode Pills
  document.querySelectorAll(".mode-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".mode-pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.routeMode = pill.dataset.mode;
      requestRoutePlan();
    });
  });

  // Sliders
  const slopeSlider = document.getElementById("rng-max-slope");
  slopeSlider.addEventListener("input", (e) => {
    state.maxSlopeDeg = parseInt(e.target.value, 10);
    document.getElementById("lbl-max-slope").textContent = `${state.maxSlopeDeg}°`;
    updateLegendUI();
    bake2DTerrainLayer();
    requestRoutePlan();
  });

  const massSlider = document.getElementById("rng-suit-mass");
  massSlider.addEventListener("input", (e) => {
    state.suitMassKg = parseInt(e.target.value, 10);
    document.getElementById("lbl-suit-mass").textContent = `${state.suitMassKg} kg`;
    requestRoutePlan();
  });

  // Reset Waypoints
  document.getElementById("btn-reset-route").addEventListener("click", () => {
    loadSite(state.siteId);
  });

  // 2D / 3D View Tabs
  document.getElementById("tab-2d").addEventListener("click", () => {
    state.viewMode = "2d";
    document.getElementById("tab-2d").classList.add("active");
    document.getElementById("tab-3d").classList.remove("active");
    document.getElementById("hint-3d").classList.add("hidden");
    renderScene();
  });

  document.getElementById("tab-3d").addEventListener("click", () => {
    state.viewMode = "3d";
    document.getElementById("tab-3d").classList.add("active");
    document.getElementById("tab-2d").classList.remove("active");
    document.getElementById("hint-3d").classList.remove("hidden");
    renderScene();
  });

  // Simulation & Emergency Abort Buttons
  document.getElementById("btn-play-eva").addEventListener("click", toggleSimulation);
  document.getElementById("btn-abort-shelter").addEventListener("click", triggerEmergencyShelterAbort);
  document.getElementById("btn-trigger-abort-banner").addEventListener("click", triggerEmergencyShelterAbort);

  // SPE Radiation Storm Simulator Toggle
  const speBtn = document.getElementById("btn-spe-toggle");
  speBtn.addEventListener("click", () => {
    state.speStorm = !state.speStorm;
    speBtn.classList.toggle("active", state.speStorm);
    document.getElementById("spe-banner").classList.toggle("hidden", !state.speStorm);
    updateTopHeaderHUD();
    requestRoutePlan();
    if (state.speStorm) {
      triggerEmergencyShelterAbort();
    } else {
      state.abortRoute = null;
      renderScene();
    }
  });

  // Export Mission Plan JSON
  document.getElementById("btn-export-plan").addEventListener("click", () => {
    if (!state.routeResult) return;
    const exportPayload = {
      mission: "ARES-NAV Interplanetary Survival Guide EVA Plan",
      site: state.siteData.site.name,
      coordinates: state.siteData.site.coordinates,
      suit_mass_kg: state.suitMassKg,
      max_safe_slope_deg: state.maxSlopeDeg,
      waypoints: state.waypoints,
      telemetry_summary: state.routeResult.telemetry.summary,
      direct_comparison: state.routeResult.direct_comparison
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ARES-NAV_${state.siteId}_EVA_Mission_Plan.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Profile Chart Tabs
  document.querySelectorAll(".prof-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".prof-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.profileTab = tab.dataset.prof;
      renderProfileChart();
    });
  });

  // Judge Briefing Modal
  const modal = document.getElementById("judge-modal");
  document.getElementById("btn-judge-modal").addEventListener("click", () => {
    modal.classList.remove("hidden");
  });
  document.getElementById("btn-close-modal").addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  // Canvas Mouse Interaction (2D Waypoint/POI Clicking & Probe + 3D Orbit Dragging)
  marsCanvas.addEventListener("mousedown", (e) => {
    if (state.viewMode === "3d") {
      state.cam3d.dragging = true;
      state.cam3d.lastX = e.clientX;
      state.cam3d.lastY = e.clientY;
      return;
    }

    const rect = marsCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { ox, oy, size } = get2DMapViewport();
    if (mx < ox || mx > ox + size || my < oy || my > oy + size) return;

    const N = state.siteData.site.grid_size;
    const gx = Math.round(((mx - ox) / size) * (N - 1));
    const gy = Math.round(((my - oy) / size) * (N - 1));

    // Check if user clicked near an existing POI
    const clickedPoi = state.siteData.site.pois.find(
      (p) => Math.hypot(p.gx - gx, p.gy - gy) < 3.2
    );

    if (clickedPoi) {
      state.selectedPoi = clickedPoi;
      updatePoiInspector();
      if (clickedPoi.category !== "hazard") {
        state.waypoints.push({ gx: clickedPoi.gx, gy: clickedPoi.gy, label: clickedPoi.name });
        updateWaypointListUI();
        requestRoutePlan();
      } else {
        renderScene();
      }
    } else {
      state.waypoints.push({ gx, gy, label: `EVA Custom (${gx},${gy})` });
      updateWaypointListUI();
      requestRoutePlan();
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (state.viewMode === "3d" && state.cam3d.dragging) {
      const dx = e.clientX - state.cam3d.lastX;
      const dy = e.clientY - state.cam3d.lastY;
      state.cam3d.lastX = e.clientX;
      state.cam3d.lastY = e.clientY;
      state.cam3d.yaw += dx * 0.008;
      state.cam3d.pitch = Math.max(0.25, Math.min(1.35, state.cam3d.pitch + dy * 0.008));
      renderScene();
      return;
    }

    if (state.viewMode === "2d" && state.siteData) {
      const rect = marsCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { ox, oy, size } = get2DMapViewport();
      if (mx >= ox && mx <= ox + size && my >= oy && my <= oy + size) {
        const N = state.siteData.site.grid_size;
        const gx = ((mx - ox) / size) * (N - 1);
        const gy = ((my - oy) / size) * (N - 1);
        updateProbeHUD(gx, gy);
      }
    }
  });

  window.addEventListener("mouseup", () => {
    state.cam3d.dragging = false;
  });

  marsCanvas.addEventListener("wheel", (e) => {
    if (state.viewMode === "3d") {
      e.preventDefault();
      state.cam3d.zoom = Math.max(0.65, Math.min(1.85, state.cam3d.zoom - e.deltaY * 0.001));
      renderScene();
    }
  });
}

window.addEventListener("DOMContentLoaded", initApp);
