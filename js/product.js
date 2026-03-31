/* ============================================================
   VELVET & VALOR — Product Page JavaScript
   Design selector, surface selector, model selector, gallery,
   accordion, Stripe checkout
   ============================================================ */

'use strict';

/* ── Design Data ─────────────────────────────────────────────── */
const DESIGNS = {
  nude: { name: 'Nude', image: '/images/nude product image.webp' },
  pink: { name: 'Pink', image: '/images/pink product image.webp' },
  plum: { name: 'Plum', image: '/images/plum product image.webp' },
  teal: { name: 'Teal', image: '/images/teal product image.webp' },
};

/* ── State ───────────────────────────────────────────────────── */
let currentDesign = 'nude';
let currentSurface = 'glossy';
let currentDevice = 'iphone17';


/* ── URL Parsing — read design from slug, variant from query ──── */
(function initFromURL() {
  // Parse design from URL path: /products/noble-steed-{color}
  const pathMatch = window.location.pathname.match(/\/products\/noble-steed-(\w+)/);
  if (pathMatch && DESIGNS[pathMatch[1]]) {
    currentDesign = pathMatch[1];
  }

  // Fallback: ?design= query param (for old links)
  const params = new URLSearchParams(window.location.search);
  const d = params.get('design');
  if (d && DESIGNS[d]) {
    currentDesign = d;
  }

  // Parse variant: ?variant=iphone17pro-glossy
  const variant = params.get('variant');
  if (variant) {
    const parts = variant.split('-');
    // Last part is surface
    const surface = parts.pop();
    if (surface === 'glossy' || surface === 'matte') {
      currentSurface = surface;
    }
    // Rest is the device
    const device = parts.join('');
    if (device) {
      currentDevice = device;
    }
  }
})();


/* ── Design Selector (color swatches with data-color) ────────── */
(function initDesignSelector() {
  const swatches = document.querySelectorAll('.color-swatch[data-color]');
  const nameEl = document.getElementById('designName');
  const mainImg = document.getElementById('galleryMainImg');
  if (!swatches.length) return;

  function applyDesign(key) {
    const cfg = DESIGNS[key];
    if (!cfg) return;
    currentDesign = key;

    if (nameEl) nameEl.textContent = cfg.name;
    if (mainImg) mainImg.src = cfg.image;

    // Update first gallery thumbnail to match
    const firstThumb = document.querySelector('.gallery-thumb');
    if (firstThumb) {
      firstThumb.dataset.img = cfg.image;
      const thumbImg = firstThumb.querySelector('.thumb-img');
      if (thumbImg) thumbImg.src = cfg.image;
    }

    swatches.forEach(s => {
      s.classList.remove('active');
      s.setAttribute('aria-checked', 'false');
    });
    const active = document.querySelector(`.color-swatch[data-color="${key}"]`);
    if (active) {
      active.classList.add('active');
      active.setAttribute('aria-checked', 'true');
    }
  }

  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => applyDesign(swatch.dataset.color));
  });

  // Apply from URL or default
  applyDesign(currentDesign);
})();


/* ── Surface Selector (data-surface) ─────────────────────────── */
(function initSurfaceSelector() {
  const options = document.querySelectorAll('[data-surface]');
  const nameEl = document.getElementById('surfaceName');
  if (!options.length) return;

  function applySurface(key) {
    currentSurface = key;
    options.forEach(o => {
      o.classList.remove('active');
      o.setAttribute('aria-checked', 'false');
    });
    const active = document.querySelector(`[data-surface="${key}"]`);
    if (active) {
      active.classList.add('active');
      active.setAttribute('aria-checked', 'true');
    }
    if (nameEl) nameEl.textContent = key === 'glossy' ? 'Glossy' : 'Matte';
  }

  options.forEach(opt => {
    opt.addEventListener('click', () => applySurface(opt.dataset.surface));
  });

  // Apply initial from URL
  applySurface(currentSurface);
})();


/* ── Device Model Selector (data-device) ─────────────────────── */
(function initDeviceSelector() {
  const options = document.querySelectorAll('[data-device]');
  if (!options.length) return;

  function applyDevice(key) {
    currentDevice = key;
    options.forEach(o => o.classList.remove('active'));
    const active = document.querySelector(`[data-device="${key}"]`);
    if (active) active.classList.add('active');
  }

  options.forEach(opt => {
    opt.addEventListener('click', () => applyDevice(opt.dataset.device));
  });

  // Apply initial from URL
  applyDevice(currentDevice);
})();


/* ── Gallery Thumbnails ──────────────────────────────────────── */
(function initGallery() {
  const thumbs = document.querySelectorAll('.gallery-thumb');
  const mainImg = document.getElementById('galleryMainImg');
  if (!thumbs.length || !mainImg) return;

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const src = thumb.dataset.img;
      if (src) mainImg.src = src;
    });
  });
})();


/* ── Accordion ───────────────────────────────────────────────── */
(function initAccordion() {
  const triggers = document.querySelectorAll('.accordion-trigger');
  if (!triggers.length) return;

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.accordion-item');
      const panel = item.querySelector('.accordion-panel');
      const isOpen = trigger.classList.contains('open');

      document.querySelectorAll('.accordion-trigger.open').forEach(t => {
        if (t !== trigger) {
          t.classList.remove('open');
          t.setAttribute('aria-expanded', 'false');
          t.closest('.accordion-item').querySelector('.accordion-panel').classList.remove('open');
        }
      });

      trigger.classList.toggle('open', !isOpen);
      trigger.setAttribute('aria-expanded', !isOpen);
      panel.classList.toggle('open', !isOpen);
    });
  });

  // Open first by default
  const first = triggers[0];
  if (first) {
    first.classList.add('open');
    first.setAttribute('aria-expanded', 'true');
    first.closest('.accordion-item').querySelector('.accordion-panel').classList.add('open');
  }
})();


/* ── Buy Now — Stripe Checkout ───────────────────────────────── */
(function initBuyNow() {
  const btn = document.getElementById('buyNow');
  if (!btn) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const textEl = btn.querySelector('.btn-atb-text');
    const originalText = textEl ? textEl.textContent : 'Buy Now';

    // Show loading state
    if (textEl) textEl.textContent = 'Processing...';
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.7';

    // Get selected values
    const activeSwatch = document.querySelector('.color-swatch.active[data-color]');
    const designLabel = activeSwatch ? activeSwatch.getAttribute('aria-label') : 'Nude';

    const activeDevice = document.querySelector('[data-device].active');
    const modelLabel = activeDevice ? activeDevice.textContent.trim() : 'iPhone 17';

    const activeSurface = document.querySelector('[data-surface].active');
    const finishLabel = activeSurface ? activeSurface.textContent.trim() : 'Glossy';

    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          design: designLabel,
          model: modelLabel,
          finish: finishLabel,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      if (textEl) textEl.textContent = 'Try Again';
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      setTimeout(() => {
        if (textEl) textEl.textContent = originalText;
      }, 2500);
    }
  });
})();


/* ── Mobile Menu Toggle ──────────────────────────────────────── */
(function initMobileMenu() {
  const toggle = document.querySelector('.nav-mobile-toggle');
  const menu = document.querySelector('.nav-mobile-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', !isOpen);
    menu.classList.toggle('open');
    menu.setAttribute('aria-hidden', isOpen);
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
    });
  });
})();


/* ── Scroll progress ─────────────────────────────────────────── */
(function initScrollProgress() {
  const bar = document.createElement('div');
  bar.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--gold-dark), var(--gold));
    z-index: 99999;
    width: 0%;
    transition: width 0.1s linear;
    pointer-events: none;
  `;
  document.body.appendChild(bar);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = pct + '%';
  }, { passive: true });
})();
