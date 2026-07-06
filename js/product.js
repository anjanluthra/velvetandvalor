/* ============================================================
   VELVET & VALOR — Product Page JavaScript
   Mous-style UX: dropdown device, color navigation, URL variants
   ============================================================ */

'use strict';

/* ── Design Data ─────────────────────────────────────────────── */
const DESIGNS = {
  nude:          { name: 'Nude',          image: '/images/nude product image.jpg' },
  pink:          { name: 'Pink',          image: '/images/pink product image.jpg' },
  plum:          { name: 'Plum',          image: '/images/plum product image.webp' },
  teal:          { name: 'Teal',          image: '/images/teal product image.webp' },
  'racing-green':  { name: 'Racing Green',  image: '/images/racing-green product image.png' },
  'charcoal-grey': { name: 'Charcoal Grey', image: '/images/charcoal-grey product image.png' },
  'navy-blue':     { name: 'Navy Blue',     image: '/images/navy-blue product image.png' },
  burgundy:        { name: 'Burgundy',       image: '/images/burgundy product image.jpg' },
  blue:            { name: 'Blue',            image: '/images/blue product image.jpg' },
  'navy-burgundy': { name: 'Navy & Burgundy', image: '/images/navy-burgundy product image.jpg' },
  'raspberry-rose': { name: 'Raspberry & Rose', image: '/images/raspberry-rose product image.jpg' },
  'azure-teal':     { name: 'Azure Teal',       image: '/images/azure-teal product image.jpg' },
};

/* ── State ───────────────────────────────────────────────────── */
let currentDesign = 'nude';
let currentSurface = 'glossy';
let currentDevice = 'iphone17';


/* ── URL Parsing ─────────────────────────────────────────────── */
(function initFromURL() {
  // Parse design from URL path: /products/noble-steed-{color}
  const pathMatch = window.location.pathname.match(/\/products\/noble-steed-([\w-]+)/);
  if (pathMatch && DESIGNS[pathMatch[1]]) {
    currentDesign = pathMatch[1];
  }

  // Fallback: ?design= query param
  const params = new URLSearchParams(window.location.search);
  const d = params.get('design');
  if (d && DESIGNS[d]) {
    currentDesign = d;
  }

  // Parse variant: ?variant=iphone17pro-glossy
  // Glossy is the only finish available — strip any trailing finish from URL
  const variant = params.get('variant');
  if (variant) {
    const parts = variant.split('-');
    const last = parts[parts.length - 1];
    if (last === 'glossy' || last === 'matte') {
      parts.pop();
    }
    const device = parts.join('');
    if (device) {
      currentDevice = device;
    }
  }
  currentSurface = 'glossy';
})();


/* ── Update URL with current variant (without reload) ────────── */
function updateURL() {
  const newUrl = `/products/noble-steed-${currentDesign}?variant=${currentDevice}-${currentSurface}`;
  window.history.replaceState(null, '', newUrl);
}


/* ── Apply Design (set images, active swatch) ────────────────── */
(function initDesign() {
  const swatches = document.querySelectorAll('.color-swatch[data-color]');
  const nameEl = document.getElementById('designName');
  const mainImg = document.getElementById('galleryMainImg');

  function applyDesign() {
    const cfg = DESIGNS[currentDesign];
    if (!cfg) return;

    if (nameEl) nameEl.textContent = cfg.name;
    if (mainImg) mainImg.src = cfg.image;

    // Update detail section image
    const detailImg = document.getElementById('detailSectionImg');
    if (detailImg) detailImg.src = cfg.image;

    // Update gallery thumbs — highlight the active colour
    const allThumbs = document.querySelectorAll('.gallery-thumb');
    allThumbs.forEach(thumb => {
      const label = (thumb.dataset.design || thumb.getAttribute('aria-label') || '')
        .replace('View: ', '')
        .toLowerCase()
        .replace(/\s+/g, '-');
      thumb.classList.toggle('active', label === currentDesign);
      if (label === currentDesign) {
        mainImg.src = thumb.dataset.img;
      }
    });

    // Update active swatch
    swatches.forEach(s => {
      s.classList.remove('active');
      s.setAttribute('aria-checked', 'false');
    });
    const active = document.querySelector(`.color-swatch[data-color="${currentDesign}"]`);
    if (active) {
      active.classList.add('active');
      active.setAttribute('aria-checked', 'true');
    }

    // Hide current color from "You may also like"
    document.querySelectorAll('.also-like-card').forEach(card => {
      card.style.display = card.dataset.also === currentDesign ? 'none' : '';
    });
  }

  // Color swatches navigate to new URL (but update variant params)
  swatches.forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      e.preventDefault();
      currentDesign = swatch.dataset.color;
      applyDesign();
      updateURL();
    });
  });

  applyDesign();
})();


/* ── Device Dropdown ─────────────────────────────────────────── */
(function initDeviceSelect() {
  const select = document.getElementById('deviceSelect');
  if (!select) return;

  // Set initial value from URL
  select.value = currentDevice;

  select.addEventListener('change', () => {
    currentDevice = select.value;
    updateURL();
  });
})();


/* ── Device Help Toggle ('Not sure?') ─────────────────────────── */
(function initDeviceHelp() {
  const btn = document.getElementById('deviceHelpToggle');
  const panel = document.getElementById('deviceHelpPanel');
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    if (open) {
      panel.setAttribute('hidden', '');
    } else {
      panel.removeAttribute('hidden');
    }
  });
})();


/* ── Surface Selector ────────────────────────────────────────── */
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
    if (nameEl) nameEl.textContent = 'Glossy';
    updateURL();
  }

  options.forEach(opt => {
    opt.addEventListener('click', () => applySurface(opt.dataset.surface));
  });

  applySurface(currentSurface);
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

      // Close all others
      document.querySelectorAll('.accordion-trigger.open').forEach(t => {
        if (t !== trigger) {
          t.classList.remove('open');
          t.setAttribute('aria-expanded', 'false');
          const item = t.closest('.accordion-item');
          const otherPanel = item && item.querySelector('.accordion-panel');
          if (otherPanel) otherPanel.classList.remove('open');
        }
      });

      trigger.classList.toggle('open', !isOpen);
      trigger.setAttribute('aria-expanded', !isOpen);
      panel.classList.toggle('open', !isOpen);
    });
  });
})();


/* ── Buy Now — Stripe Checkout ───────────────────────────────── */
(function initBuyNow() {
  const btn = document.getElementById('buyNow');
  if (!btn) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const textEl = btn.querySelector('.btn-atb-text');
    const originalText = textEl ? textEl.textContent : 'Buy Now';

    if (textEl) textEl.textContent = 'Processing...';
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.7';

    const designLabel = DESIGNS[currentDesign]?.name || 'Nude';
    const select = document.getElementById('deviceSelect');
    const modelLabel = select ? select.options[select.selectedIndex].text : 'iPhone 17';
    const finishLabel = 'Glossy';

    // Collect customer insights from sessionStorage (Safari private mode safe)
    let productSuggestion = '', journalWaitlist = 'no';
    try {
      productSuggestion = sessionStorage.getItem('vv_product_suggestion') || '';
      journalWaitlist = sessionStorage.getItem('vv_journal_waitlist') || 'no';
    } catch (e) { /* private mode */ }

    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: 'noble-steed',
          design: designLabel,
          model: modelLabel,
          finish: finishLabel,
          product_suggestion: productSuggestion,
          journal_waitlist: journalWaitlist,
        }),
      });

      const data = await res.json();
      if (data.url) {
        if (typeof window.vvGoToCheckout === 'function') {
          window.vvGoToCheckout(data.url);
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      if (textEl) textEl.textContent = 'Try Again';
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      setTimeout(() => { if (textEl) textEl.textContent = originalText; }, 2500);
    }
  });
})();


/* Mobile menu handled by main.js — removed duplicate handler that was
   double-toggling the menu open then immediately closed. */
(function initMobileMenu() {
  return;
})();


/* ── Scroll Progress ─────────────────────────────────────────── */
(function initScrollProgress() {
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:0;left:0;height:2px;background:linear-gradient(90deg,var(--gold-dark),var(--gold));z-index:99999;width:0%;transition:width .1s linear;pointer-events:none;';
  document.body.appendChild(bar);
  window.addEventListener('scroll', () => {
    const pct = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (pct > 0 ? (window.scrollY / pct) * 100 : 0) + '%';
  }, { passive: true });
})();


/* ── Add to Bag ────────────────────────────────────────────────── */
(function initAddToBag() {
  const btn = document.getElementById('addToBag');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (btn.classList.contains('btn-atb-disabled') || !window.vvCart) return;
    const design = DESIGNS[currentDesign] || { name: 'Nude', image: '' };
    const select = document.getElementById('deviceSelect');
    const modelLabel = select ? select.options[select.selectedIndex].text : 'iPhone 17';
    window.vvCart.add({
      collectionId: 'noble-steed',
      design: design.name,
      model: modelLabel,
      finish: 'Glossy',
      unitAmountCents: 4800,
      image: design.image,
      name: 'Noble Steed — ' + design.name,
    });
    window.vvCart.open();
  });
})();


/* ── Model Confirmation Checkbox ───────────────────────────────── */
(function initModelConfirm() {
  const checkbox = document.getElementById('modelConfirmCheckbox');
  const buttons = ['addToBag', 'buyNow']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!checkbox || !buttons.length) return;

  function updateBtn() {
    buttons.forEach((b) => b.classList.toggle('btn-atb-disabled', !checkbox.checked));
  }

  checkbox.addEventListener('change', updateBtn);
  updateBtn();
})();


/* ── Journal Waitlist (Checkout) ───────────────────────────────── */
(function initJournalWaitlist() {
  const checkbox = document.getElementById('journalWaitlistCheckbox');
  const fields = document.getElementById('journalWaitlistFields');
  const submitBtn = document.getElementById('journalWlSubmit');
  const successDiv = document.getElementById('journalWlSuccess');
  if (!checkbox || !fields) return;

  checkbox.addEventListener('change', () => {
    fields.style.display = checkbox.checked ? 'flex' : 'none';
    if (!checkbox.checked && successDiv) successDiv.style.display = 'none';
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const name = document.getElementById('journalWlName');
      const email = document.getElementById('journalWlEmail');
      if (!name || !email || !name.value || !email.value) return;

      // Log to API (stores + owner notification + customer confirmation)
      try {
        await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'waitlist', name: name.value, email: email.value, source: 'checkout-journal-waitlist' }),
        });
      } catch (e) { /* silent fail */ }

      // Store in sessionStorage for Stripe metadata
      try { sessionStorage.setItem('vv_journal_waitlist', 'yes'); } catch (e) {}

      // Show success with journal image + 15% code
      fields.style.display = 'none';
      if (successDiv) successDiv.style.display = 'block';
    });
  }
})();


/* ── Product Suggestion Box ────────────────────────────────────── */
(function initSuggestionBox() {
  const submitBtn = document.getElementById('suggestionSubmit');
  const textarea = document.getElementById('productSuggestion');
  const thanks = document.getElementById('suggestionThanks');
  if (!submitBtn || !textarea) return;

  submitBtn.addEventListener('click', () => {
    const value = textarea.value.trim();
    if (!value) return;

    // Save to sessionStorage so it gets passed to Stripe metadata on checkout
    try { sessionStorage.setItem('vv_product_suggestion', value); } catch (e) {}

    // Show thanks
    submitBtn.style.display = 'none';
    textarea.disabled = true;
    textarea.style.opacity = '0.5';
    if (thanks) thanks.style.display = 'block';
  });
})();
