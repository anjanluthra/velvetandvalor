/* ============================================================
   VELVET & VALOR — Product Page JavaScript
   Design selector, model selector, gallery, accordion
   ============================================================ */

'use strict';

/* ── Design Data ─────────────────────────────────────────────── */
const DESIGNS = {
  'champagne-nude': { name: 'Champagne Nude', image: 'images/nude product image.webp' },
  'blush-rose':     { name: 'Blush Rose',     image: 'images/pink product image.webp' },
  'royal-plum':     { name: 'Royal Plum',     image: 'images/plum product image.webp' },
  'emerald-teal':   { name: 'Emerald Teal',   image: 'images/teal product image.webp' },
};

/* ── State ───────────────────────────────────────────────────── */
let currentDesign = 'champagne-nude';
let currentFinish = 'glossy';
let currentModel  = 'iphone-17-pro-max';

/* ── URL Params — preselect design from query string ─────────── */
(function initFromURL() {
  const params = new URLSearchParams(window.location.search);
  const designParam = params.get('design');
  if (designParam && DESIGNS[designParam]) {
    currentDesign = designParam;
  }
})();


/* ── SKU Generator ───────────────────────────────────────────── */
function generateSKU() {
  const d = currentDesign.toUpperCase();
  const m = currentModel.toUpperCase();
  const f = currentFinish === 'glossy' ? 'GLO' : 'MAT';
  return `VV-${d}-${m}-${f}`;
}

function updateSKU() {
  const el = document.getElementById('skuDisplay');
  if (el) el.textContent = 'SKU: ' + generateSKU();
}


/* ── Design Selector ─────────────────────────────────────────── */
(function initDesignSelector() {
  const swatches = document.querySelectorAll('.color-swatch[data-design]');
  const nameEl = document.getElementById('designName');
  const mainImg = document.getElementById('galleryMainImg');
  const firstThumb = document.querySelector('.gallery-thumb[data-img]');
  if (!swatches.length) return;

  function applyDesign(designKey) {
    const cfg = DESIGNS[designKey];
    if (!cfg) return;
    currentDesign = designKey;

    if (nameEl) nameEl.textContent = cfg.name;
    if (mainImg) mainImg.src = cfg.image;

    // Update first thumbnail to match design
    if (firstThumb) {
      firstThumb.dataset.img = cfg.image;
      const thumbImg = firstThumb.querySelector('.thumb-img');
      if (thumbImg) thumbImg.src = cfg.image;
    }

    swatches.forEach(s => {
      s.classList.remove('active');
      s.setAttribute('aria-checked', 'false');
    });
    const active = document.querySelector(`.color-swatch[data-design="${designKey}"]`);
    if (active) {
      active.classList.add('active');
      active.setAttribute('aria-checked', 'true');
    }

    updateSKU();
  }

  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => applyDesign(swatch.dataset.design));
  });

  // Apply from URL or default
  applyDesign(currentDesign);
})();


/* ── Finish Selector ─────────────────────────────────────────── */
(function initFinishSelector() {
  const options = document.querySelectorAll('.device-option[data-finish]');
  const nameEl = document.getElementById('finishName');
  if (!options.length) return;

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      currentFinish = opt.dataset.finish;
      if (nameEl) nameEl.textContent = opt.dataset.finish === 'glossy' ? 'Glossy' : 'Matte';
      updateSKU();
    });
  });
})();


/* ── Model Generation Tabs ───────────────────────────────────── */
(function initModelSelector() {
  const genTabs = document.querySelectorAll('.gen-tab');
  const modelButtons = document.querySelectorAll('.device-option[data-model]');
  const nameEl = document.getElementById('modelName');
  if (!genTabs.length) return;

  function showGeneration(gen) {
    modelButtons.forEach(btn => {
      if (btn.dataset.gen === gen) {
        btn.style.display = '';
      } else {
        btn.style.display = 'none';
      }
    });

    genTabs.forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.gen-tab[data-gen="${gen}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Select first visible model in this generation
    const firstVisible = document.querySelector(`.device-option[data-gen="${gen}"]`);
    if (firstVisible) {
      modelButtons.forEach(b => b.classList.remove('active'));
      firstVisible.classList.add('active');
      currentModel = firstVisible.dataset.model;
      if (nameEl) nameEl.textContent = firstVisible.textContent.trim();
      updateSKU();
    }
  }

  genTabs.forEach(tab => {
    tab.addEventListener('click', () => showGeneration(tab.dataset.gen));
  });

  modelButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modelButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentModel = btn.dataset.model;
      if (nameEl) nameEl.textContent = btn.textContent.trim();
      updateSKU();
    });
  });
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


/* ── Buy Now ─────────────────────────────────────────────────── */
(function initBuyNow() {
  const btn = document.getElementById('buyNow');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const textEl = btn.querySelector('.btn-atb-text');
    if (textEl) {
      textEl.textContent = 'Coming Soon';
      setTimeout(() => { textEl.textContent = 'Buy Now'; }, 2500);
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
