/**
 * QuickQR — main.js
 * Handles: QR generation, download, theme toggle,
 *          mobile nav, smooth scroll, navbar scroll state
 */

/* ============================================================
   DOM REFERENCES
   ============================================================ */
const urlInput      = document.getElementById('url-input');
const generateBtn   = document.getElementById('generate-btn');
const downloadBtn   = document.getElementById('download-btn');
const shareBtn      = document.getElementById('share-btn');
const qrCanvas      = document.getElementById('qr-canvas');
const qrDisplay     = document.getElementById('qr-display');
const qrPlaceholder = document.getElementById('qr-placeholder');
const themeToggle   = document.getElementById('theme-toggle');
const hamburger     = document.getElementById('hamburger');
const navLinks      = document.getElementById('nav-links');
const navbar        = document.getElementById('navbar');
const toastEl       = document.getElementById('toast');

/* ============================================================
   STATE
   ============================================================ */
let currentQR   = null;   // QRCode instance
let currentText = '';     // Last generated text
let toastTimer  = null;

/* ============================================================
   1. THEME — Dark / Light Mode
   ============================================================ */
(function initTheme() {
  // Load persisted preference, fall back to system preference
  const saved  = localStorage.getItem('quickqr-theme');
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme  = saved || system;

  document.documentElement.setAttribute('data-theme', theme);
})();

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('quickqr-theme', next);
});

/* ============================================================
   2. NAVBAR — Scroll shadow & active link highlighting
   ============================================================ */
window.addEventListener('scroll', () => {
  // Add shadow on scroll
  navbar.classList.toggle('scrolled', window.scrollY > 20);

  // Highlight active nav link based on scroll position
  const sections = ['hero', 'features', 'how-it-works', 'stats', 'pricing'];
  let currentSection = 'hero';

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top <= 100) currentSection = id;
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href').replace('#', '');
    link.classList.toggle('active', href === currentSection);
  });
}, { passive: true });

/* ============================================================
   3. MOBILE HAMBURGER MENU
   ============================================================ */
// Create mobile overlay
const overlay = document.createElement('div');
overlay.className = 'nav-mobile-overlay';
document.body.appendChild(overlay);

function openMobileNav() {
  navLinks.classList.add('open');
  hamburger.classList.add('open');
  hamburger.setAttribute('aria-expanded', 'true');
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  navLinks.classList.remove('open');
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  overlay.classList.remove('show');
  document.body.style.overflow = '';
}

hamburger.addEventListener('click', () => {
  const isOpen = navLinks.classList.contains('open');
  isOpen ? closeMobileNav() : openMobileNav();
});

overlay.addEventListener('click', closeMobileNav);

// Close mobile menu when a nav link is clicked
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', closeMobileNav);
});

/* ============================================================
   4. SMOOTH SCROLL — for all anchor nav links
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href').replace('#', '');
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();

    const navHeight = navbar.offsetHeight;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  });
});

/* ============================================================
   5. QR CODE GENERATION
   ============================================================ */
function generateQR(text) {
  if (!text || !text.trim()) return;

  const trimmed = text.trim();

  // Clear previous instance
  qrCanvas.innerHTML = '';
  currentQR = null;

  // Build new QR code (220×220 px rendered into the 244px display)
  currentQR = new QRCode(qrCanvas, {
    text:         trimmed,
    width:        220,
    height:       220,
    colorDark:    '#000000',
    colorLight:   '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });

  currentText = trimmed;

  // Switch display state
  qrDisplay.classList.add('generated');
  qrPlaceholder.style.display = 'none';

  // Enable action buttons
  downloadBtn.disabled = false;

  // Ensure the canvas/img is actually rendered (qrcode.js is async-ish)
  setTimeout(() => {
    const el = qrCanvas.querySelector('canvas') || qrCanvas.querySelector('img');
    if (el) {
      el.style.width  = '100%';
      el.style.height = '100%';
    }
  }, 50);
}

/* Generate button click */
generateBtn.addEventListener('click', () => {
  const val = urlInput.value.trim();
  if (!val) {
    showToast('⚠️  Please enter a URL or text');
    urlInput.focus();
    return;
  }
  generateQR(val);
  showToast('✅  QR code generated!');
});

/* Enter key in input */
urlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    generateBtn.click();
  }
});

/* Live preview — debounced 500ms */
let liveTimer = null;
urlInput.addEventListener('input', () => {
  clearTimeout(liveTimer);
  const val = urlInput.value.trim();

  if (!val) {
    // Reset to placeholder
    qrCanvas.innerHTML = '';
    qrDisplay.classList.remove('generated');
    qrPlaceholder.style.display = '';
    downloadBtn.disabled = true;
    currentText = '';
    return;
  }

  liveTimer = setTimeout(() => generateQR(val), 500);
});

/* ============================================================
   6. DOWNLOAD QR AS PNG
   ============================================================ */
downloadBtn.addEventListener('click', () => {
  if (!currentText) return;

  // QRCode.js may produce a <canvas> or an <img> depending on browser
  const canvas = qrCanvas.querySelector('canvas');
  const img    = qrCanvas.querySelector('img');

  if (canvas) {
    triggerDownload(canvas.toDataURL('image/png'));
    return;
  }

  if (img) {
    // Draw the img to a temporary canvas for PNG export
    const tmp   = document.createElement('canvas');
    tmp.width   = img.naturalWidth  || 220;
    tmp.height  = img.naturalHeight || 220;
    const ctx   = tmp.getContext('2d');
    ctx.drawImage(img, 0, 0);
    triggerDownload(tmp.toDataURL('image/png'));
    return;
  }

  showToast('⚠️  Nothing to download yet');
});

function triggerDownload(dataUrl) {
  const a      = document.createElement('a');
  a.href       = dataUrl;
  a.download   = 'QuickQR-' + Date.now() + '.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('✅  QR code downloaded!');
}

/* ============================================================
   7. SHARE / COPY LINK
   ============================================================ */
shareBtn.addEventListener('click', async () => {
  if (!currentText) {
    showToast('⚠️  Generate a QR code first');
    return;
  }

  // Use Web Share API if available, else copy to clipboard
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'QuickQR',
        text:  'Check out my QR code!',
        url:   currentText
      });
      return;
    } catch {
      /* User cancelled — fall through to clipboard */
    }
  }

  try {
    await navigator.clipboard.writeText(currentText);
    showToast('📋  Link copied to clipboard!');
  } catch {
    // Fallback for older browsers
    const ta        = document.createElement('textarea');
    ta.value        = currentText;
    ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋  Link copied to clipboard!');
  }
});

/* ============================================================
   8. INTERSECTION OBSERVER — Animate sections on scroll
   ============================================================ */
const observerOpts = { threshold: 0.12 };

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      sectionObserver.unobserve(entry.target);
    }
  });
}, observerOpts);

// Apply initial hidden state and observe
['.step-card', '.feature-card', '.stat-item'].forEach(selector => {
  document.querySelectorAll(selector).forEach((el, i) => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(24px)';
    el.style.transition = `opacity .5s ease ${i * 0.08}s, transform .5s ease ${i * 0.08}s`;
    sectionObserver.observe(el);
  });
});

/* ============================================================
   9. TOAST NOTIFICATION HELPER
   ============================================================ */
function showToast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
}

/* ============================================================
   10. CTA “Get Started” → scroll to hero & focus input
   ============================================================ */
document.querySelectorAll('.btn-cta, .nav-cta').forEach(btn => {
  btn.addEventListener('click', () => {
    setTimeout(() => urlInput.focus(), 600);
  });
});

/* ============================================================
   11. DYNAMIC COPYRIGHT YEAR
       Automatically updates — no manual change needed ever.
   ============================================================ */
(function setDynamicYear() {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
