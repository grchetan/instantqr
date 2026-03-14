/**
 * QRForge — Professional QR Code Generator
 * script.js
 *
 * Features:
 *  - Instant QR generation via QRCode.js
 *  - Custom QR + background colors
 *  - Size slider
 *  - Error correction level selector
 *  - Logo overlay on QR canvas
 *  - Download as PNG
 *  - Copy image to clipboard
 *  - History (last 8 QR codes, stored in localStorage)
 *  - Dark / Light mode toggle
 *  - Toast notifications
 *  - Drag-and-drop logo upload
 */

/* ══════════════════════════════════════════════
   STATE
══════════════════════════════════════════════ */
const state = {
  qrColor: '#00e5ff', // QR module color
  bgColor: '#0a0f1e', // QR background color
  size: 256, // QR canvas size in px
  ecLevel: 'M', // Error correction: L / M / Q / H
  logoDataUrl: null, // Base64 data URL of uploaded logo
  lastInput: '', // Last generated input text/URL
  history: [], // Array of { input, dataUrl, timestamp }
};

/* ══════════════════════════════════════════════
   DOM REFERENCES
══════════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);

const qrInput = $('qrInput');
const clearBtn = $('clearBtn');
const charCount = $('charCount');
const qrColor = $('qrColor');
const bgColor = $('bgColor');
const qrSize = $('qrSize');
const sizeLabel = $('sizeLabel');
const ecGroup = $('ecLevel');
const colorPresets = $('colorPresets');
const uploadZone = $('uploadZone');
const logoUpload = $('logoUpload');
const removeLogoBtn = $('removeLogoBtn');
const generateBtn = $('generateBtn');
const qrStage = $('qrStage');
const emptyState = $('emptyState');
const qrOutput = $('qrOutput');
const spinner = $('spinner');
const actionRow = $('actionRow');
const downloadBtn = $('downloadBtn');
const copyBtn = $('copyBtn');
const qrMeta = $('qrMeta');
const qrMetaText = $('qrMetaText');
const historySection = $('historySection');
const historyGrid = $('historyGrid');
const clearHistoryBtn = $('clearHistoryBtn');
const themeToggle = $('themeToggle');
const toast = $('toast');

/* ══════════════════════════════════════════════
   THEME TOGGLE (Dark / Light)
══════════════════════════════════════════════ */
// Load saved theme preference
const savedTheme = localStorage.getItem('qrforge-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('qrforge-theme', next);

  // Update default colors to suit theme if not custom-set
  if (next === 'light' && state.bgColor === '#0a0f1e') {
    bgColor.value = '#ffffff';
    state.bgColor = '#ffffff';
  } else if (next === 'dark' && state.bgColor === '#ffffff') {
    bgColor.value = '#0a0f1e';
    state.bgColor = '#0a0f1e';
  }
});

/* ══════════════════════════════════════════════
   INPUT — Character counter & clear button
══════════════════════════════════════════════ */
qrInput.addEventListener('input', () => {
  const len = qrInput.value.length;
  charCount.textContent = `${len} character${len !== 1 ? 's' : ''}`;

  // Show char count warning when approaching QR data limit
  charCount.style.color = len > 800 ? '#f43f5e' : '';
});

clearBtn.addEventListener('click', () => {
  qrInput.value = '';
  charCount.textContent = '0 characters';
  qrInput.focus();
});

// Allow generating QR code by pressing Enter
qrInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') generateQR();
});

/* ══════════════════════════════════════════════
   COLOR CONTROLS
══════════════════════════════════════════════ */
// QR color swatch picker
qrColor.addEventListener('input', (e) => {
  state.qrColor = e.target.value;
});

// Background color swatch picker
bgColor.addEventListener('input', (e) => {
  state.bgColor = e.target.value;
});

// Color preset dots — handles both qr & bg targets
document.querySelectorAll('.preset-dot').forEach((dot) => {
  dot.addEventListener('click', () => {
    const color = dot.dataset.color;
    const target = dot.dataset.target; // 'bg' or undefined (= qr color)

    if (target === 'bg') {
      bgColor.value = color === 'transparent' ? '#000000' : color;
      state.bgColor = color; // keep 'transparent' string for our renderer
    } else {
      qrColor.value = color;
      state.qrColor = color;
    }
  });
});

/* ══════════════════════════════════════════════
   SIZE SLIDER
══════════════════════════════════════════════ */
qrSize.addEventListener('input', (e) => {
  state.size = parseInt(e.target.value, 10);
  sizeLabel.textContent = `${state.size} px`;
});

/* ══════════════════════════════════════════════
   ERROR CORRECTION LEVEL PILLS
══════════════════════════════════════════════ */
ecGroup.querySelectorAll('.pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    ecGroup
      .querySelectorAll('.pill')
      .forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    state.ecLevel = pill.dataset.ec;
  });
});

/* ══════════════════════════════════════════════
   LOGO UPLOAD (click + drag & drop)
══════════════════════════════════════════════ */
// File-picker triggered by clicking the zone label
logoUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleLogoFile(file);
});

// Drag-and-drop events
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});
uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleLogoFile(file);
});

/** Convert the uploaded image file to a base64 data URL */
function handleLogoFile(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    state.logoDataUrl = ev.target.result;
    $('uploadText').textContent = `✔ ${file.name}`;
    removeLogoBtn.style.display = 'block';
    showToast('Logo loaded! Regenerate to apply.');
  };
  reader.readAsDataURL(file);
}

// Remove logo button
removeLogoBtn.addEventListener('click', () => {
  state.logoDataUrl = null;
  $('uploadText').innerHTML = 'Click or drag &amp; drop an image';
  removeLogoBtn.style.display = 'none';
  logoUpload.value = '';
  showToast('Logo removed.');
});

/* ══════════════════════════════════════════════
   GENERATE QR CODE
══════════════════════════════════════════════ */
generateBtn.addEventListener('click', generateQR);

async function generateQR() {
  const input = qrInput.value.trim();

  // Validation
  if (!input) {
    qrInput.focus();
    qrInput.style.borderColor = '#f43f5e';
    qrInput.style.boxShadow = '0 0 0 3px rgba(244,63,94,0.2)';
    showToast('⚠️ Please enter a URL or text first.');
    setTimeout(() => {
      qrInput.style.borderColor = '';
      qrInput.style.boxShadow = '';
    }, 1600);
    return;
  }

  // Show spinner, hide previous QR
  showSpinner(true);

  // Small delay so the spinner renders before heavy canvas work
  await sleep(60);

  try {
    // Clear previous QR
    qrOutput.innerHTML = '';

    // Resolve effective background color
    const effectiveBg =
      state.bgColor === 'transparent' ? '#ffffff' : state.bgColor;

    // ── Build QR via QRCode.js ──
    new QRCode(qrOutput, {
      text: input,
      width: state.size,
      height: state.size,
      colorDark: state.qrColor,
      colorLight: effectiveBg,
      correctLevel: QRCode.CorrectLevel[state.ecLevel],
    });

    // QRCode.js renders async (appends <canvas> to #qrOutput)
    // Wait a tick for it to appear, then apply logo / transparent bg
    await sleep(80);

    const canvas = qrOutput.querySelector('canvas');
    if (!canvas) throw new Error('QR canvas not found');

    // ── Optional: transparent background ──
    if (state.bgColor === 'transparent') {
      makeCanvasBgTransparent(canvas, effectiveBg);
    }

    // ── Optional: overlay logo ──
    if (state.logoDataUrl) {
      await overlayLogo(canvas, state.logoDataUrl);
    }

    // Show results
    state.lastInput = input;
    emptyState.style.display = 'none';
    qrOutput.style.display = 'flex';
    showSpinner(false);
    actionRow.style.display = 'flex';
    qrMeta.style.display = 'block';
    qrMetaText.textContent = `"${input.length > 60 ? input.slice(0, 57) + '…' : input}" · ${state.size}px`;

    // Add to history
    const dataUrl = canvas.toDataURL('image/png');
    addToHistory(input, dataUrl);
  } catch (err) {
    showSpinner(false);
    showToast(`❌ Error: ${err.message}`);
    console.error('[QRForge]', err);
  }
}

/** Replace the white QR background with transparency */
function makeCanvasBgTransparent(canvas, bgHex) {
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Convert hex → RGB to detect which pixels are "background"
  const r = parseInt(bgHex.slice(1, 3), 16);
  const g = parseInt(bgHex.slice(3, 5), 16);
  const b = parseInt(bgHex.slice(5, 7), 16);

  for (let i = 0; i < data.length; i += 4) {
    // If pixel is close to background color, set transparent
    if (
      Math.abs(data[i] - r) < 20 &&
      Math.abs(data[i + 1] - g) < 20 &&
      Math.abs(data[i + 2] - b) < 20
    ) {
      data[i + 3] = 0; // alpha = 0
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Overlay a logo image at the center of the QR canvas.
 * Adds a white circular badge behind the logo for readability.
 */
function overlayLogo(canvas, logoSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      const cw = canvas.width;
      const ch = canvas.height;

      // Logo occupies ~22% of QR width
      const logoSize = Math.round(cw * 0.22);
      const x = Math.round((cw - logoSize) / 2);
      const y = Math.round((ch - logoSize) / 2);
      const pad = 10;

      // White circular badge behind logo
      ctx.save();
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, logoSize / 2 + pad, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();

      // Clip logo to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x, y, logoSize, logoSize);
      ctx.restore();

      resolve();
    };
    img.onerror = () => reject(new Error('Logo image failed to load'));
    img.src = logoSrc;
  });
}

/* ══════════════════════════════════════════════
   DOWNLOAD & COPY
══════════════════════════════════════════════ */
downloadBtn.addEventListener('click', () => {
  const canvas = qrOutput.querySelector('canvas');
  if (!canvas) return;

  // Build a safe filename from the input
  const safeName =
    state.lastInput
      .replace(/https?:\/\//g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 40) || 'qrcode';

  const link = document.createElement('a');
  link.download = `qrforge_${safeName}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  showToast('✅ Downloaded!');
});

copyBtn.addEventListener('click', async () => {
  const canvas = qrOutput.querySelector('canvas');
  if (!canvas) return;

  try {
    // Clipboard API — convert canvas to Blob
    canvas.toBlob(async (blob) => {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      showToast('✅ Copied to clipboard!');
    }, 'image/png');
  } catch (err) {
    showToast('❌ Copy not supported in this browser.');
  }
});

/* ══════════════════════════════════════════════
   HISTORY
══════════════════════════════════════════════ */
// Load history from localStorage on startup
function loadHistory() {
  try {
    const saved = localStorage.getItem('qrforge-history');
    if (saved) state.history = JSON.parse(saved);
    renderHistory();
  } catch (_) {
    state.history = [];
  }
}

/** Add an entry to history (max 8 items) */
function addToHistory(input, dataUrl) {
  // Avoid consecutive duplicates
  if (state.history.length > 0 && state.history[0].input === input) return;

  state.history.unshift({
    input,
    dataUrl,
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  });

  // Keep only the last 8 entries
  if (state.history.length > 8) state.history.pop();

  localStorage.setItem('qrforge-history', JSON.stringify(state.history));
  renderHistory();
}

/** Render history grid from state.history[] */
function renderHistory() {
  historyGrid.innerHTML = '';

  if (state.history.length === 0) {
    historySection.style.display = 'none';
    return;
  }

  historySection.style.display = 'block';

  state.history.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'history-item';
    card.title = item.input;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Load: ${item.input}`);

    // Thumbnail image from saved dataUrl
    const img = document.createElement('img');
    img.src = item.dataUrl;
    img.alt = 'QR Code thumbnail';
    img.width = 120;
    img.height = 120;

    // Label (truncated URL/text)
    const label = document.createElement('p');
    label.className = 'history-label';
    label.textContent = item.input;

    // Timestamp
    const time = document.createElement('span');
    time.className = 'history-time';
    time.textContent = item.timestamp;

    card.append(img, label, time);

    // Clicking a history item re-loads input and regenerates
    const loadItem = () => {
      qrInput.value = item.input;
      charCount.textContent = `${item.input.length} characters`;
      generateQR();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    card.addEventListener('click', loadItem);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loadItem();
    });

    historyGrid.appendChild(card);
  });
}

clearHistoryBtn.addEventListener('click', () => {
  state.history = [];
  localStorage.removeItem('qrforge-history');
  renderHistory();
  showToast('🗑️ History cleared.');
});

/* ══════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════ */
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ══════════════════════════════════════════════
   SPINNER HELPER
══════════════════════════════════════════════ */
function showSpinner(show) {
  spinner.style.display = show ? 'flex' : 'none';
  qrOutput.style.display = show ? 'none' : state.lastInput ? 'flex' : 'none';
  emptyState.style.display = show ? 'none' : state.lastInput ? 'none' : 'flex';
}

/* ══════════════════════════════════════════════
   UTILITY
══════════════════════════════════════════════ */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
(function init() {
  // Set initial values on controls from state
  sizeLabel.textContent = `${state.size} px`;
  qrColor.value = state.qrColor;
  bgColor.value = state.bgColor;

  // Load stored history
  loadHistory();

  // Focus input
  qrInput.focus();
})();
