/* =================================================================
   QuickQR — js/main.js
   QR Rendering Engine + all UI logic for the beautifully restored
   white-theme landing page with premium customizable features.
   ================================================================= */

'use strict';

/* ─── STATE ─────────────────────────────────────────────────────── */
const state = {
  text:          '',
  dotShape:      'square',       // square | rounded | dots | extra-rounded
  fgColor:       '#000000',
  bgColor:       '#ffffff',
  bgTransparent: false,
  useGradient:   false,
  gradStart:     '#7c3aed',
  gradEnd:       '#06b6d4',
  cornerStyle:   'square',       // square | rounded | bold
  labelEnabled:  false,
  frameLabel:    'Scan Me',
  logoImg:       null,           // HTMLImageElement or null
  logoSize:      0.25,           // 0.10 – 0.40 (fraction of QR size)
  logoBg:        'square',       // none | square | circle
  logoBorder:    true,
  template:      'classic',
};

/* ─── TEMPLATES ─────────────────────────────────────────────────── */
const TEMPLATES = {
  classic: {
    dotShape:'square', fgColor:'#000000', bgColor:'#ffffff',
    bgTransparent:false, useGradient:false, cornerStyle:'square',
    gradStart:'#000000', gradEnd:'#000000',
  },
  purple: {
    dotShape:'rounded', fgColor:'#ffffff', bgColor:'#0f0225',
    bgTransparent:false, useGradient:true,
    gradStart:'#9d5cf6', gradEnd:'#ec4899', cornerStyle:'rounded',
  },
  neon: {
    dotShape:'dots', fgColor:'#00ffff', bgColor:'#041212',
    bgTransparent:false, useGradient:false, cornerStyle:'bold',
    gradStart:'#00ffff', gradEnd:'#00ffff',
  },
  sunset: {
    dotShape:'extra-rounded', fgColor:'#ff6b35', bgColor:'#fff5f0',
    bgTransparent:false, useGradient:true,
    gradStart:'#ff6b35', gradEnd:'#ec4899', cornerStyle:'rounded',
  },
  business: {
    dotShape:'square', fgColor:'#1e40af', bgColor:'#eff6ff',
    bgTransparent:false, useGradient:false, cornerStyle:'bold',
    gradStart:'#1e40af', gradEnd:'#1e40af',
  },
  rosegold: {
    dotShape:'dots', fgColor:'#c2847a', bgColor:'#fff5f5',
    bgTransparent:false, useGradient:true,
    gradStart:'#c2847a', gradEnd:'#e8b4b8', cornerStyle:'rounded',
  },
};

/* ─── DOM REFS ──────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const urlInput      = $('url-input');
const generateBtn   = $('generate-btn');
const downloadBtn   = $('download-btn');
const dlDropdown    = $('dl-dropdown');
const shareBtn      = $('share-btn');
const canvas        = $('qr-canvas');
const ctx           = canvas.getContext('2d');
const qrDisplay     = $('qr-display');
const qrPlaceholder = $('qr-placeholder');
const themeToggle   = $('theme-toggle');
const toastEl       = $('toast');

// Accordion & Customizer Elements
const customizeToggle = $('customize-toggle');
const customizePanel  = $('customize-panel');
const shapeGrid       = $('shape-grid');
const fgColorIn       = $('fg-color');
const bgColorIn       = $('bg-color');
const gradStartIn     = $('grad-start');
const gradEndIn       = $('grad-end');
const fgChip          = $('fg-chip');
const bgChip          = $('bg-chip');
const gsChip          = $('gs-chip');
const geChip          = $('ge-chip');
const gradTog         = $('gradient-tog');
const transpTog       = $('transp-tog');
const gradPickers     = $('gradient-pickers');
const cornerGrid      = $('corner-grid');
const labelEnabled    = $('label-enabled');
const frameLabel      = $('frame-label');
const logoFile        = $('logo-file');
const uploadZone      = $('upload-zone');
const logoBar         = $('logo-bar');
const logoThumb       = $('logo-thumb');
const logoFilename    = $('logo-filename');
const removeLogo      = $('remove-logo');
const logoSizeIn      = $('logo-size');
const logoSizeVal     = $('logo-size-val');
const logoBgGroup     = $('logo-bg-group');
const logoBorder      = $('logo-border');
const tplPills        = $('tpl-pills');

/* ─── TOAST NOTIFICATION ────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg, ms = 2400) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

/* ─── THEME HANDLING ────────────────────────────────────────────── */
function initTheme() {
  const saved  = localStorage.getItem('quickqr-theme');
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme  = saved || system;
  document.documentElement.setAttribute('data-theme', theme);
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('quickqr-theme', next);
  showToast(next === 'dark' ? '🌙 Dark Mode Activated' : '☀️ Light Mode Activated');
});

/* ─── SMOOTH SCROLL & NAVIGATION ────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href').replace('#', '');
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();

    const navbar = $('navbar');
    const navHeight = navbar ? navbar.offsetHeight : 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  });
});

/* ─── CANVAS HELPER: roundRect polyfill ────────────────────────── */
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/* ─── QR MATRIX EXTRACTION ──────────────────────────────────────── */
function getMatrix(text) {
  if (!text || !text.trim()) return null;

  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none';
  document.body.appendChild(div);

  let modules = null, moduleCount = 0;

  try {
    const qr = new QRCode(div, {
      text:         text,
      width:        512,
      height:       512,
      correctLevel: QRCode.CorrectLevel.H,
    });

    const internal = qr._oQRCode;
    if (internal && internal.modules && internal.moduleCount) {
      modules     = internal.modules;
      moduleCount = internal.moduleCount;
    } else {
      const src = div.querySelector('canvas');
      if (src) {
        const result = extractMatrixFromCanvas(src);
        modules     = result.modules;
        moduleCount = result.moduleCount;
      }
    }
  } catch (e) {
    console.warn('QR generation error:', e);
  }

  document.body.removeChild(div);
  return modules && moduleCount ? { modules, moduleCount } : null;
}

function extractMatrixFromCanvas(src) {
  const w   = src.width;
  const sc  = src.getContext('2d');
  const dat = sc.getImageData(0, 0, w, w).data;

  const isDark = (x, y) => {
    const i = (y * w + x) * 4;
    return dat[i] < 180 && dat[i + 3] > 100;
  };

  let start = -1, end = -1;
  for (let x = 0; x < w; x++) {
    if (isDark(x, Math.floor(w * 0.1))) { start = x; break; }
  }
  if (start === -1) return { modules: null, moduleCount: 0 };
  for (let x = start; x < w; x++) {
    if (!isDark(x, Math.floor(w * 0.1))) { end = x; break; }
  }

  const modSz = end - start;
  const quiet = Math.round(start / modSz);
  const count = Math.round((w - 2 * quiet * modSz) / modSz);

  const mods = [];
  for (let r = 0; r < count; r++) {
    mods[r] = [];
    for (let c = 0; c < count; c++) {
      const px = Math.floor((quiet + c + 0.5) * modSz);
      const py = Math.floor((quiet + r + 0.5) * modSz);
      mods[r][c] = isDark(px, py);
    }
  }
  return { modules: mods, moduleCount: count };
}

/* ─── RENDERING HELPERS ─────────────────────────────────────────── */
function isFinder(r, c, N) {
  const inTL = r <= 7 && c <= 7;
  const inTR = r <= 7 && c >= N - 8;
  const inBL = r >= N - 8 && c <= 7;
  return inTL || inTR || inBL;
}

function drawDot(ctx, x, y, ms, shape) {
  const pad = ms * 0.08;
  const s   = ms - pad * 2;
  const cx  = x + ms / 2;
  const cy  = y + ms / 2;

  ctx.beginPath();
  switch (shape) {
    case 'square':
      ctx.rect(x + pad, y + pad, s + 0.08, s + 0.08); // Slight subpixel overlap to fix anti-aliasing dark lines
      break;
    case 'rounded':
      rrect(ctx, x + pad, y + pad, s, s, s * 0.28);
      break;
    case 'dots':
      ctx.arc(cx, cy, s / 2, 0, Math.PI * 2);
      break;
    case 'extra-rounded':
      rrect(ctx, x + pad, y + pad, s, s, s / 2);
      break;
    default:
      ctx.rect(x + pad, y + pad, s + 0.08, s + 0.08);
  }
  ctx.fill();
}

function drawFinder(ctx, ox, oy, ms, style, fg, bg) {
  const total = 7 * ms;
  const r_outer = style === 'rounded' ? ms * 1.4 : style === 'bold' ? ms * 0.5 : 0;
  const r_center= style === 'rounded' ? ms * 0.7 : 0;

  // Clear background area if not transparent
  if (bg && bg !== 'rgba(0,0,0,0)' && bg !== 'transparent') {
    ctx.fillStyle = bg;
    ctx.fillRect(ox, oy, total, total);
  }

  // CRITICAL SCAN BUG FIX: Always draw the inner gap/ring as solid background color (or white fallback if transparent) 
  // so that QR scanners can successfully read the contrast patterns!
  const innerBg = (bg && bg !== 'rgba(0,0,0,0)' && bg !== 'transparent') ? bg : '#ffffff';

  // Outer border
  ctx.fillStyle = fg;
  if (style === 'bold') {
    rrect(ctx, ox, oy, total, total, ms * 0.5);
    ctx.fill();
    ctx.fillStyle = innerBg;
    ctx.fillRect(ox + ms * 1.5, oy + ms * 1.5, total - ms * 3, total - ms * 3);
  } else {
    rrect(ctx, ox, oy, total, total, r_outer);
    ctx.fill();
    ctx.fillStyle = innerBg;
    rrect(ctx, ox + ms, oy + ms, total - ms * 2, total - ms * 2, r_outer * 0.5);
    ctx.fill();
  }

  // Center 3×3 square
  ctx.fillStyle = fg;
  rrect(ctx, ox + 2 * ms, oy + 2 * ms, 3 * ms, 3 * ms, r_center);
  ctx.fill();
}

function buildFill(ctx, size) {
  if (state.useGradient) {
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, state.gradStart);
    g.addColorStop(1, state.gradEnd);
    return g;
  }
  return state.fgColor;
}

function drawLogo(ctx, qrSize, labelH) {
  if (!state.logoImg) return;

  const logoAreaSize = qrSize * state.logoSize;
  const cx = qrSize / 2;
  const cy = (qrSize + labelH) / 2 - labelH / 2; // Center inside the QR code square itself
  
  // ASPECT RATIO PRESERVING SCALE BUG FIX: Determine native dimensions of the uploaded image
  // to avoid squashing or stretching portrait/landscape business logos!
  const imgW = state.logoImg.naturalWidth || state.logoImg.width;
  const imgH = state.logoImg.naturalHeight || state.logoImg.height;
  let logoW = logoAreaSize;
  let logoH = logoAreaSize;
  if (imgW > imgH) {
    logoH = logoAreaSize * (imgH / imgW);
  } else if (imgH > imgW) {
    logoW = logoAreaSize * (imgW / imgH);
  }
  
  const halfW = logoW / 2;
  const halfH = logoH / 2;
  const maxDim = Math.max(logoW, logoH);
  const borderPad = state.logoBorder ? maxDim * 0.12 : 0;
  const bgSizeW  = logoW + borderPad * 2;
  const bgSizeH  = logoH + borderPad * 2;
  const bgHalfW  = bgSizeW / 2;
  const bgHalfH  = bgSizeH / 2;

  ctx.save();

  // Subtle logo shadow
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur  = qrSize * 0.02; // Scale blur dynamically with resolution

  // Draw logo background card
  if (state.logoBg === 'circle') {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(bgHalfW, bgHalfH), 0, Math.PI * 2);
    ctx.fill();
  } else if (state.logoBg === 'square') {
    ctx.fillStyle = 'white';
    rrect(ctx, cx - bgHalfW, cy - bgHalfH, bgSizeW, bgSizeH, Math.min(bgSizeW, bgSizeH) * 0.18);
    ctx.fill();
  }

  ctx.shadowColor = 'transparent';

  // Draw and clip the logo image
  ctx.save();
  if (state.logoBg === 'circle') {
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(halfW, halfH), 0, Math.PI * 2);
    ctx.clip();
  } else if (state.logoBg === 'square') {
    rrect(ctx, cx - halfW, cy - halfH, logoW, logoH, Math.min(logoW, logoH) * 0.18);
    ctx.clip();
  }

  ctx.drawImage(state.logoImg, cx - halfW, cy - halfH, logoW, logoH);
  ctx.restore();

  ctx.restore();
}

function drawFrameLabel(ctx, qrSize, labelH, text) {
  if (!text) return;
  const y = qrSize + labelH / 2;

  ctx.save();
  ctx.fillStyle = state.fgColor;
  ctx.font = `bold ${Math.round(labelH * 0.42)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '2px';
  ctx.fillText(text.toUpperCase(), qrSize / 2, y);
  ctx.restore();
}

/* ─── MAIN QR CODE RENDER ────────────────────────────────────────── */
const CANVAS_BASE = 600;
const LABEL_H     = 64;

function renderQR() {
  const text = state.text.trim();

  // If text is empty, show placeholder and disable downloads
  if (!text) {
    qrPlaceholder.style.display = 'flex';
    canvas.style.display = 'none';
    downloadBtn.disabled = true;
    dlDropdown.setAttribute('hidden', '');
    return;
  }

  // Hide placeholder and show canvas
  qrPlaceholder.style.display = 'none';
  canvas.style.display = 'block';
  downloadBtn.disabled = false;

  const matrix = getMatrix(text);
  const labelH = state.labelEnabled ? LABEL_H : 0;
  const qrSize = CANVAS_BASE;
  const totalH = qrSize + labelH;

  if (canvas.width !== qrSize || canvas.height !== totalH) {
    canvas.width  = qrSize;
    canvas.height = totalH;
  }

  ctx.clearRect(0, 0, qrSize, totalH);

  // Render Background
  if (!state.bgTransparent) {
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, qrSize, totalH);
  }

  if (!matrix) {
    showToast('⚠️ Too much data. Try short links!');
    return;
  }

  const { modules, moduleCount } = matrix;
  const QUIET   = 4;
  const totMods = moduleCount + QUIET * 2;
  const modSz   = qrSize / totMods;
  const offX    = QUIET * modSz;
  const offY    = QUIET * modSz;

  const finderBg = state.bgTransparent ? 'rgba(0,0,0,0)' : state.bgColor;
  const finderFg = state.useGradient   ? state.gradStart  : state.fgColor;

  // Set dots color
  ctx.fillStyle = buildFill(ctx, qrSize);

  // Draw data modules
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!modules[r][c]) continue;
      if (isFinder(r, c, moduleCount)) continue;
      drawDot(ctx, offX + c * modSz, offY + r * modSz, modSz, state.dotShape);
    }
  }

  // Draw 3 finder corners
  const N = moduleCount;
  drawFinder(ctx, offX,                          offY,                          modSz, state.cornerStyle, finderFg, finderBg); // TL
  drawFinder(ctx, offX + (N - 7) * modSz,        offY,                          modSz, state.cornerStyle, finderFg, finderBg); // TR
  drawFinder(ctx, offX,                          offY + (N - 7) * modSz,        modSz, state.cornerStyle, finderFg, finderBg); // BL

  // Draw logo overlay
  if (state.logoImg) {
    drawLogo(ctx, qrSize, labelH);
  }

  // Draw Frame label
  if (state.labelEnabled && state.frameLabel) {
    // Fill the frame label section background
    if (!state.bgTransparent) {
      ctx.fillStyle = state.bgColor;
      ctx.fillRect(0, qrSize, qrSize, labelH);
    }
    // Subtle separator line
    ctx.strokeStyle = (state.bgColor === '#ffffff' || state.bgColor === '#fff') ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(24, qrSize);
    ctx.lineTo(qrSize - 24, qrSize);
    ctx.stroke();

    drawFrameLabel(ctx, qrSize, labelH, state.frameLabel);
  }
}

/* ─── LIVE DEBOUNCED RENDERING ──────────────────────────────────── */
let renderTimer = null;
function scheduleRender(delay = 150) {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderQR, delay);
}

/* ─── RENDERING AT HIGH RESOLUTION FOR DOWNLOADS ────────────────── */
function renderAtScale(scale) {
  const labelH = state.labelEnabled ? LABEL_H : 0;
  const qrSize = CANVAS_BASE * scale;
  const totalH = qrSize + labelH * scale;

  const offCanvas = document.createElement('canvas');
  offCanvas.width  = qrSize;
  offCanvas.height = totalH;
  const oc = offCanvas.getContext('2d');

  oc.clearRect(0, 0, qrSize, totalH);

  if (!state.bgTransparent) {
    oc.fillStyle = state.bgColor;
    oc.fillRect(0, 0, qrSize, totalH);
  }

  const text = state.text.trim();
  const matrix = getMatrix(text);
  if (!matrix) return offCanvas;

  const { modules, moduleCount } = matrix;
  const QUIET  = 4;
  const totM   = moduleCount + QUIET * 2;
  const modSz  = qrSize / totM;
  const offX   = QUIET * modSz;
  const offY   = QUIET * modSz;
  const finderBg = state.bgTransparent ? 'rgba(0,0,0,0)' : state.bgColor;
  const finderFg = state.useGradient   ? state.gradStart : state.fgColor;

  // Scale dot rendering fill
  if (state.useGradient) {
    const g = oc.createLinearGradient(0, 0, qrSize, qrSize);
    g.addColorStop(0, state.gradStart);
    g.addColorStop(1, state.gradEnd);
    oc.fillStyle = g;
  } else {
    oc.fillStyle = state.fgColor;
  }

  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!modules[r][c]) continue;
      if (isFinder(r, c, moduleCount)) continue;
      drawDot(oc, offX + c * modSz, offY + r * modSz, modSz, state.dotShape);
    }
  }

  const N = moduleCount;
  drawFinder(oc, offX,                   offY,                   modSz, state.cornerStyle, finderFg, finderBg);
  drawFinder(oc, offX + (N-7)*modSz,   offY,                   modSz, state.cornerStyle, finderFg, finderBg);
  drawFinder(oc, offX,                   offY + (N-7)*modSz,   modSz, state.cornerStyle, finderFg, finderBg);

  // Centered logo overlay
  if (state.logoImg) {
    drawLogo(oc, qrSize, labelH * scale);
  }

  // Frame label
  if (state.labelEnabled && state.frameLabel) {
    if (!state.bgTransparent) {
      oc.fillStyle = state.bgColor;
      oc.fillRect(0, qrSize, qrSize, labelH * scale);
    }
    oc.strokeStyle = (state.bgColor === '#ffffff' || state.bgColor === '#fff') ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.08)';
    oc.lineWidth = scale * 1.5;
    oc.beginPath();
    oc.moveTo(24 * scale, qrSize);
    oc.lineTo(qrSize - 24 * scale, qrSize);
    oc.stroke();

    oc.fillStyle = state.fgColor;
    oc.font = `bold ${Math.round(labelH * scale * 0.42)}px Inter, system-ui`;
    oc.textAlign = 'center';
    oc.textBaseline = 'middle';
    oc.letterSpacing = `${2 * scale}px`;
    oc.fillText(state.frameLabel.toUpperCase(), qrSize / 2, qrSize + (labelH * scale) / 2);
  }

  return offCanvas;
}

/* ─── VECTOR SVG EXPORT ─────────────────────────────────────────── */
function generateSVG() {
  const text = state.text.trim();
  const matrix = getMatrix(text);
  if (!matrix) return null;

  const { modules, moduleCount } = matrix;
  const labelH = state.labelEnabled ? LABEL_H : 0;
  const SIZE = 600;
  const QUIET = 4;
  const totM  = moduleCount + QUIET * 2;
  const modSz = SIZE / totM;
  const offX  = QUIET * modSz;
  const offY  = QUIET * modSz;
  const N = moduleCount;

  const fgFill = state.useGradient ? 'url(#qrGrad)' : state.fgColor;
  const bgRect = state.bgTransparent ? '' : `<rect width="${SIZE}" height="${SIZE + labelH}" fill="${state.bgColor}"/>`;

  let gradDef = '';
  if (state.useGradient) {
    gradDef = `<defs>
      <linearGradient id="qrGrad" x1="0" y1="0" x2="${SIZE}" y2="${SIZE}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${state.gradStart}"/>
        <stop offset="100%" stop-color="${state.gradEnd}"/>
      </linearGradient>
    </defs>`;
  }

  let dots = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!modules[r][c]) continue;
      if (isFinder(r, c, N)) continue;

      const x  = offX + c * modSz;
      const y  = offY + r * modSz;
      const pad = modSz * 0.08;
      const s  = modSz - pad * 2;
      const cx = x + modSz / 2;
      const cy = y + modSz / 2;

      switch (state.dotShape) {
        case 'square':
          dots += `<rect x="${x+pad}" y="${y+pad}" width="${s}" height="${s}" fill="${fgFill}"/>`;
          break;
        case 'rounded':
          dots += `<rect x="${x+pad}" y="${y+pad}" width="${s}" height="${s}" rx="${s*0.28}" fill="${fgFill}"/>`;
          break;
        case 'dots':
          dots += `<circle cx="${cx}" cy="${cy}" r="${s/2}" fill="${fgFill}"/>`;
          break;
        case 'extra-rounded':
          dots += `<rect x="${x+pad}" y="${y+pad}" width="${s}" height="${s}" rx="${s/2}" fill="${fgFill}"/>`;
          break;
      }
    }
  }

  function svgFinder(ox, oy) {
    const total = 7 * modSz;
    const fg = state.useGradient ? state.gradStart : state.fgColor;
    const bg = state.bgTransparent ? 'none' : state.bgColor;
    const ro = state.cornerStyle === 'rounded' ? modSz * 1.4 : state.cornerStyle === 'bold' ? modSz * 0.5 : 0;
    const rc = state.cornerStyle === 'rounded' ? modSz * 0.7 : 0;

    let out = `<rect x="${ox}" y="${oy}" width="${total}" height="${total}" fill="${bg}"/>`;
    if (state.cornerStyle === 'bold') {
      out += `<rect x="${ox}" y="${oy}" width="${total}" height="${total}" rx="${modSz*0.5}" fill="${fg}"/>`;
      out += `<rect x="${ox+modSz*1.5}" y="${oy+modSz*1.5}" width="${total-modSz*3}" height="${total-modSz*3}" fill="${bg}"/>`;
    } else {
      out += `<rect x="${ox}" y="${oy}" width="${total}" height="${total}" rx="${ro}" fill="${fg}"/>`;
      out += `<rect x="${ox+modSz}" y="${oy+modSz}" width="${total-modSz*2}" height="${total-modSz*2}" rx="${ro*0.5}" fill="${bg}"/>`;
    }
    out += `<rect x="${ox+2*modSz}" y="${oy+2*modSz}" width="${3*modSz}" height="${3*modSz}" rx="${rc}" fill="${fg}"/>`;
    return out;
  }

  dots += svgFinder(offX, offY);
  dots += svgFinder(offX + (N-7)*modSz, offY);
  dots += svgFinder(offX, offY + (N-7)*modSz);

  let labelSVG = '';
  if (state.labelEnabled && state.frameLabel) {
    const ly = SIZE + labelH / 2;
    const separatorStroke = (state.bgColor === '#ffffff' || state.bgColor === '#fff') ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.08)';
    if (!state.bgTransparent) {
      labelSVG += `<rect x="0" y="${SIZE}" width="${SIZE}" height="${labelH}" fill="${state.bgColor}"/>`;
    }
    labelSVG += `<line x1="24" y1="${SIZE}" x2="${SIZE-24}" y2="${SIZE}" stroke="${separatorStroke}" stroke-width="1.5"/>`;
    labelSVG += `<text x="${SIZE/2}" y="${ly}" font-family="Inter, system-ui, sans-serif" font-size="${Math.round(labelH*0.42)}" font-weight="bold" fill="${state.fgColor}" text-anchor="middle" dominant-baseline="middle" letter-spacing="2">${state.frameLabel.toUpperCase()}</text>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE + labelH}" viewBox="0 0 ${SIZE} ${SIZE + labelH}">
  ${gradDef}
  ${bgRect}
  ${dots}
  ${labelSVG}
</svg>`;
}

/* ─── DOWNLOAD EXPORTS ──────────────────────────────────────────── */
function downloadPNG(scale) {
  const off = renderAtScale(scale);
  const link = document.createElement('a');
  link.download = `QuickQR-${scale}x-${Date.now()}.png`;
  link.href = off.toDataURL('image/png', 1.0);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`✅ PNG ${scale}× Downloaded!`);
}

function downloadSVG() {
  const svg = generateSVG();
  if (!svg) return;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `QuickQR-${Date.now()}.svg`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  showToast('✅ SVG Vector Downloaded!');
}

function downloadPDF() {
  if (!window.jspdf) {
    showToast('⚠️ jsPDF is loading, please try again.');
    return;
  }
  const off = renderAtScale(2);
  const imgData = off.toDataURL('image/png', 1.0);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const imgMM = 150;
  const x = (pageW - imgMM) / 2;

  // Background filled (white PDF page)
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, 297, 'F');

  // Insert QR code centered
  doc.addImage(imgData, 'PNG', x, 40, imgMM, imgMM, '', 'FAST');

  // Branding watermark
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 170);
  doc.text('Generated with QuickQR', pageW / 2, 205, { align: 'center' });

  doc.save(`QuickQR-${Date.now()}.pdf`);
  showToast('✅ PDF Print-ready Downloaded!');
}

/* ─── TEMPLATE APPLICATION ──────────────────────────────────────── */
function applyTemplate(name) {
  const t = TEMPLATES[name];
  if (!t) return;

  Object.assign(state, t);
  state.template = name;

  syncUIFromState();
  scheduleRender();
  showToast(`✨ Template "${name.toUpperCase()}" Applied`);
}

function syncUIFromState() {
  // Foreground/Background inputs & chips
  fgColorIn.value = state.fgColor;
  bgColorIn.value = state.bgColor;
  fgChip.style.background = state.fgColor;
  bgChip.style.background = state.bgColor;

  gradStartIn.value = state.gradStart;
  gradEndIn.value   = state.gradEnd;
  gsChip.style.background = state.gradStart;
  geChip.style.background = state.gradEnd;

  // Gradient & transparent toggles
  gradTog.dataset.active   = String(state.useGradient);
  transpTog.dataset.active = String(state.bgTransparent);
  if (state.useGradient) {
    gradPickers.removeAttribute('hidden');
  } else {
    gradPickers.setAttribute('hidden', '');
  }

  // Shape button active class
  document.querySelectorAll('.shape-btn').forEach(b => {
    const active = b.dataset.shape === state.dotShape;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  });

  // Corner button active class
  document.querySelectorAll('.corner-btn').forEach(b => {
    const active = b.dataset.corner === state.cornerStyle;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  });

  // Template pills active class
  document.querySelectorAll('.tpl-pill').forEach(b => {
    b.classList.toggle('active', b.dataset.template === state.template);
  });
}

/* ─── LOGO FILE LOADING ─────────────────────────────────────────── */
function loadLogoFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      state.logoImg = img;
      logoThumb.src = e.target.result;
      logoFilename.textContent = file.name.length > 20 ? file.name.slice(0, 17) + '…' : file.name;
      uploadZone.setAttribute('hidden', '');
      logoBar.removeAttribute('hidden');
      $('logo-options').removeAttribute('hidden');
      scheduleRender();
      showToast('📸 Business Logo Loaded!');
    };
    img.onerror = () => showToast('❌ Failed to load logo image');
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ─── UI EVENT HANDLERS & WIRING ────────────────────────────────── */
function initUI() {
  // 1. URL / Input change (Live rendering)
  urlInput.addEventListener('input', () => {
    state.text = urlInput.value;
    scheduleRender();
  });

  // 2. Generate button click
  generateBtn.addEventListener('click', () => {
    state.text = urlInput.value;
    if (!state.text.trim()) {
      showToast('⚠️ Please enter text or URL first!');
      urlInput.focus();
      return;
    }
    renderQR();
    showToast('🚀 QR Code Generated!');
  });

  // 3. Customize Accordion Toggle
  customizeToggle.addEventListener('click', () => {
    const isHidden = customizePanel.hasAttribute('hidden');
    if (isHidden) {
      customizePanel.removeAttribute('hidden');
      customizeToggle.setAttribute('aria-expanded', 'true');
    } else {
      customizePanel.setAttribute('hidden', '');
      customizeToggle.setAttribute('aria-expanded', 'false');
    }
  });


  // 4. Style templates
  document.querySelectorAll('.tpl-pill').forEach(pill => {
    pill.addEventListener('click', () => applyTemplate(pill.dataset.template));
  });

  // 5. Dot shapes
  document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.dotShape = btn.dataset.shape;
      document.querySelectorAll('.shape-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.shape === state.dotShape);
      });
      scheduleRender();
    });
  });

  // 6. Color pickers
  fgColorIn.addEventListener('input', () => {
    state.fgColor = fgColorIn.value;
    fgChip.style.background = state.fgColor;
    scheduleRender();
  });
  bgColorIn.addEventListener('input', () => {
    state.bgColor = bgColorIn.value;
    bgChip.style.background = state.bgColor;
    scheduleRender();
  });

  // 7. Gradient Toggles & pickers
  gradTog.addEventListener('click', () => {
    state.useGradient = !state.useGradient;
    gradTog.dataset.active = String(state.useGradient);
    if (state.useGradient) {
      gradPickers.removeAttribute('hidden');
    } else {
      gradPickers.setAttribute('hidden', '');
    }
    scheduleRender();
  });
  gradStartIn.addEventListener('input', () => {
    state.gradStart = gradStartIn.value;
    gsChip.style.background = state.gradStart;
    scheduleRender();
  });
  gradEndIn.addEventListener('input', () => {
    state.gradEnd = gradEndIn.value;
    geChip.style.background = state.gradEnd;
    scheduleRender();
  });

  // 8. Transparency Toggle
  transpTog.addEventListener('click', () => {
    state.bgTransparent = !state.bgTransparent;
    transpTog.dataset.active = String(state.bgTransparent);
    scheduleRender();
  });

  // 9. Corner finder pattern style
  document.querySelectorAll('.corner-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.cornerStyle = btn.dataset.corner;
      document.querySelectorAll('.corner-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.corner === state.cornerStyle);
      });
      scheduleRender();
    });
  });

  // 10. Frame Label toggle & inputs
  labelEnabled.addEventListener('change', () => {
    state.labelEnabled = labelEnabled.checked;
    frameLabel.disabled = !state.labelEnabled;
    scheduleRender();
  });
  frameLabel.addEventListener('input', () => {
    state.frameLabel = frameLabel.value;
    scheduleRender(300);
  });

  // 11. Business Logo file picker
  uploadZone.addEventListener('click', () => logoFile.click());
  uploadZone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      logoFile.click();
    }
  });
  logoFile.addEventListener('change', () => {
    if (logoFile.files[0]) {
      loadLogoFile(logoFile.files[0]);
    }
  });

  // Drag & drop logo
  uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadLogoFile(file);
    }
  });

  // Remove Logo
  removeLogo.addEventListener('click', () => {
    state.logoImg = null;
    logoFile.value = '';
    logoBar.setAttribute('hidden', '');
    $('logo-options').setAttribute('hidden', '');
    uploadZone.removeAttribute('hidden');
    scheduleRender();
    showToast('🗑️ Logo Removed');
  });

  // Logo Options Size
  logoSizeIn.addEventListener('input', () => {
    state.logoSize = parseInt(logoSizeIn.value, 10) / 100;
    logoSizeVal.textContent = `${logoSizeIn.value}%`;
    scheduleRender();
  });

  // Logo Background Shape
  document.querySelectorAll('[data-logobg]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.logoBg = btn.dataset.logobg;
      document.querySelectorAll('[data-logobg]').forEach(b => {
        b.classList.toggle('active', b.dataset.logobg === state.logoBg);
      });
      scheduleRender();
    });
  });

  // Logo Border
  logoBorder.addEventListener('change', () => {
    state.logoBorder = logoBorder.checked;
    scheduleRender();
  });

  // 12. Downloads Dropdown Trigger
  downloadBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isHidden = dlDropdown.hasAttribute('hidden');
    if (isHidden) {
      dlDropdown.removeAttribute('hidden');
    } else {
      dlDropdown.setAttribute('hidden', '');
    }
  });

  document.addEventListener('click', () => {
    dlDropdown.setAttribute('hidden', '');
  });

  // Download item click handlers
  document.querySelectorAll('.dl-opt').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      dlDropdown.setAttribute('hidden', '');
      const format = btn.dataset.dl;
      switch (format) {
        case 'png1': downloadPNG(1); break;
        case 'png2': downloadPNG(2); break;
        case 'png3': downloadPNG(3); break;
        case 'svg':  downloadSVG(); break;
        case 'pdf':  downloadPDF(); break;
      }
    });
  });

  // 13. Share Button
  shareBtn.addEventListener('click', async () => {
    if (!state.text.trim()) {
      showToast('⚠️ Generate a QR code first!');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'QuickQR Code',
          text: 'Scan this QR code!',
          url: state.text
        });
        return;
      } catch (err) {
        // User cancelled, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(state.text);
      showToast('📋 Link copied to clipboard!');
    } catch {
      showToast('❌ Copy to clipboard not supported.');
    }
  });
}

/* ─── DYNAMIC FOOTER YEAR ───────────────────────────────────────── */
function setYear() {
  const el = $('footer-year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ─── INITIALIZATION ────────────────────────────────────────────── */
function init() {
  initTheme();
  initUI();
  setYear();

  // Set default live text if user typed anything in input
  if (urlInput && urlInput.value) {
    state.text = urlInput.value;
  } else {
    state.text = 'https://github.com/grchetan';
    if (urlInput) urlInput.value = state.text;
  }

  // Pre-load default values and sync UI controls
  syncUIFromState();
  renderQR();
}

document.addEventListener('DOMContentLoaded', init);
