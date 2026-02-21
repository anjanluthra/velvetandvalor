/* ============================================================
   VELVET & VALOR — Product Page JavaScript
   Gallery, colours, device, engraving, quantity, bag, accordion
   ============================================================ */

'use strict';

/* ── Color configuration ─────────────────────────────────────── */
const COLOR_CONFIG = {
  burgundy: {
    name:       'Midnight Burgundy',
    bg:         'linear-gradient(155deg, #1A0618 0%, #350A30 50%, #1A0618 100%)',
    emblem:     'rgba(200, 168, 75, 0.75)',
    thumbBg:    'linear-gradient(155deg, #1A0618, #350A30)',
    accent:     '#6B1840',
  },
  forest: {
    name:       'Forest & Brass',
    bg:         'linear-gradient(155deg, #0A1C10 0%, #18341A 50%, #0A1C10 100%)',
    emblem:     'rgba(180, 148, 60, 0.75)',
    thumbBg:    'linear-gradient(155deg, #0A1C10, #18341A)',
    accent:     '#2A5A30',
  },
  champagne: {
    name:       'Champagne',
    bg:         'linear-gradient(155deg, #281C08 0%, #4A3010 50%, #281C08 100%)',
    emblem:     'rgba(220, 188, 80, 0.85)',
    thumbBg:    'linear-gradient(155deg, #281C08, #4A3010)',
    accent:     '#8A6A1A',
  },
  obsidian: {
    name:       'Obsidian',
    bg:         'linear-gradient(155deg, #06060F 0%, #141424 50%, #06060F 100%)',
    emblem:     'rgba(200, 168, 75, 0.7)',
    thumbBg:    'linear-gradient(155deg, #06060F, #141424)',
    accent:     '#C8A84B',
  },
};


/* ── Colour Selector ─────────────────────────────────────────── */
(function initColorSelector() {
  const swatches    = document.querySelectorAll('.color-swatch');
  const colorNameEl = document.getElementById('colorName');
  if (!swatches.length) return;

  function applyColor(colorKey) {
    const cfg = COLOR_CONFIG[colorKey];
    if (!cfg) return;

    if (colorNameEl) colorNameEl.textContent = cfg.name;

    swatches.forEach(s => s.classList.remove('active'));
    const activeEl = document.querySelector(`.color-swatch[data-color="${colorKey}"]`);
    if (activeEl) activeEl.classList.add('active');
  }

  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      applyColor(swatch.dataset.color);
    });
  });

  const initialActive = document.querySelector('.color-swatch.active');
  if (initialActive) applyColor(initialActive.dataset.color);
})();


/* ── Device Selector ─────────────────────────────────────────── */
(function initDeviceSelector() {
  const options = document.querySelectorAll('.device-option:not(:disabled)');
  if (!options.length) return;

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });
})();


/* ── Gallery Thumbnails ───────────────────────────────────────── */
(function initGallery() {
  const thumbs  = document.querySelectorAll('.gallery-thumb');
  const mainImg = document.getElementById('galleryMainImg');
  if (!thumbs.length || !mainImg) return;

  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const src = thumb.dataset.img;
      if (src) mainImg.src = src;
    });
  });
})();


/* ── Engraving Toggle ─────────────────────────────────────────── */
(function initEngraving() {
  const toggle        = document.getElementById('engravingToggle');
  const inputArea     = document.querySelector('.engraving-input-area');
  const textarea      = document.getElementById('engravingText');
  const charCurrent   = document.querySelector('.char-current');
  const priceEl       = document.getElementById('atbPrice');
  const basePriceEl   = document.getElementById('basePrice');
  if (!toggle || !inputArea) return;

  const BASE_PRICE = 295;
  const ENGRAVE_PRICE = 25;

  toggle.addEventListener('change', () => {
    const on = toggle.checked;
    inputArea.classList.toggle('open', on);
    if (on && textarea) {
      setTimeout(() => textarea.focus(), 100);
    }
    // Update price
    if (priceEl) {
      priceEl.textContent = '£' + (on ? BASE_PRICE + ENGRAVE_PRICE : BASE_PRICE);
    }
  });

  // Character counter
  if (textarea && charCurrent) {
    textarea.addEventListener('input', () => {
      charCurrent.textContent = textarea.value.length;
    });
  }
})();




/* ── Buy Now ─────────────────────────────────────────────────── */
(function initBuyNow() {
  const btn = document.getElementById('buyNow');
  if (!btn) return;

  // TODO: Replace STRIPE_CHECKOUT_URL with your actual Stripe Checkout link.
  // Example: https://buy.stripe.com/your_link_here
  const STRIPE_CHECKOUT_URL = '#stripe-checkout';

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (STRIPE_CHECKOUT_URL === '#stripe-checkout') {
      // Dev placeholder — show a brief visual cue
      const textEl = btn.querySelector('.btn-atb-text');
      if (textEl) {
        textEl.textContent = 'Checkout coming soon…';
        setTimeout(() => { textEl.textContent = 'Buy Now'; }, 2500);
      }
      return;
    }
    window.location.href = STRIPE_CHECKOUT_URL;
  });
})();


/* ── Accordion ───────────────────────────────────────────────── */
(function initAccordion() {
  const triggers = document.querySelectorAll('.accordion-trigger');
  if (!triggers.length) return;

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item  = trigger.closest('.accordion-item');
      const panel = item.querySelector('.accordion-panel');
      const isOpen = trigger.classList.contains('open');

      // Close all others
      document.querySelectorAll('.accordion-trigger.open').forEach(t => {
        if (t !== trigger) {
          t.classList.remove('open');
          t.closest('.accordion-item').querySelector('.accordion-panel').classList.remove('open');
        }
      });

      // Toggle current
      trigger.classList.toggle('open', !isOpen);
      panel.classList.toggle('open', !isOpen);
    });
  });

  // Open first by default
  const first = triggers[0];
  if (first) {
    first.classList.add('open');
    first.closest('.accordion-item').querySelector('.accordion-panel').classList.add('open');
  }
})();


/* ── Scroll progress (product page) ─────────────────────────── */
(function initScrollProgress() {
  const bar = document.createElement('div');
  bar.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    height: 2px;
    background: linear-gradient(90deg, #C8A84B, #DDB85E);
    z-index: 99999;
    width: 0%;
    transition: width 0.1s linear;
    pointer-events: none;
  `;
  document.body.appendChild(bar);

  window.addEventListener('scroll', () => {
    const scrollTop  = window.scrollY;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = pct + '%';
  }, { passive: true });
})();
