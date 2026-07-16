/* ============================================================
   VELVET & VALOR — The Cowgirl Collection product page
   Variant routing, swatch swap, Stripe checkout
   ============================================================ */
'use strict';

const CG_DESIGNS = {
  'auburn':  { name: 'Cowgirl & Mare — Auburn',  image: '/images/cowgirl-auburn product image.jpg' },
};

const CG_COLLECTION = 'The Cowgirl Collection';
const CG_UNIT_AMOUNT_CENTS = 4800; // $48.00 (matches Noble Steed)

let currentVariant = 'auburn';
let currentDevice = 'iPhone 17';

/* ── Parse URL for variant ─────────────────────────────────── */
(function initFromURL() {
  const match = window.location.pathname.match(/\/products\/cowgirl-([\w-]+)/);
  if (match && CG_DESIGNS[match[1]]) {
    currentVariant = match[1];
  }
})();

/* ── Apply variant (image + active swatch + name + URL) ────── */
function applyVariant() {
  const cfg = CG_DESIGNS[currentVariant];
  if (!cfg) return;

  const img = document.getElementById('galleryMainImg');
  if (img) {
    img.src = cfg.image;
    img.alt = `The Cowgirl Collection — ${cfg.name}`;
  }
  const nameEl = document.getElementById('designName');
  if (nameEl) nameEl.textContent = cfg.name;

  document.querySelectorAll('.cg-swatch').forEach(s => {
    const isActive = s.dataset.color === currentVariant;
    s.classList.toggle('active', isActive);
    s.setAttribute('aria-checked', String(isActive));
  });

  const newUrl = `/products/cowgirl-${currentVariant}`;
  if (window.location.pathname !== newUrl) {
    try { window.history.replaceState(null, '', newUrl); } catch (e) {}
  }
}

/* ── Swatch clicks ─────────────────────────────────────────── */
document.querySelectorAll('.cg-swatch').forEach(s => {
  s.addEventListener('click', (e) => {
    e.preventDefault();
    currentVariant = s.dataset.color;
    applyVariant();
  });
});

/* ── Device select ─────────────────────────────────────────── */
const deviceSelect = document.getElementById('deviceSelect');
if (deviceSelect) {
  deviceSelect.addEventListener('change', () => {
    currentDevice = deviceSelect.value;
  });
  currentDevice = deviceSelect.value || currentDevice;
}

/* ── Device help toggle ───────────────────────────────────── */
(function initDeviceHelp() {
  const btn = document.getElementById('deviceHelpToggle');
  const panel = document.getElementById('deviceHelpPanel');
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    if (open) panel.setAttribute('hidden', ''); else panel.removeAttribute('hidden');
  });
})();

/* ── Model confirm checkbox gates Add to Bag + Buy it now ───── */
(function initBuyGate() {
  const cb = document.getElementById('modelConfirmCheckbox');
  const buttons = ['addToBag', 'buyNow']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!cb || !buttons.length) return;
  function refresh() {
    buttons.forEach((b) => b.classList.toggle('btn-atb-disabled', !cb.checked));
  }
  cb.addEventListener('change', refresh);
  refresh();
})();

/* ── Add to Bag ────────────────────────────────────────────── */
(function initAddToBag() {
  const btn = document.getElementById('addToBag');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (btn.classList.contains('btn-atb-disabled') || !window.vvCart) return;
    const cfg = CG_DESIGNS[currentVariant] || CG_DESIGNS.auburn;
    const modelLabel = deviceSelect
      ? deviceSelect.options[deviceSelect.selectedIndex].text
      : 'iPhone 17';
    window.vvCart.add({
      collectionId: 'cowgirl',
      design: cfg.name,
      model: modelLabel,
      finish: 'Glossy',
      unitAmountCents: CG_UNIT_AMOUNT_CENTS,
      image: cfg.image,
      name: 'The Cowgirl Collection — ' + cfg.name,
    });
    window.vvCart.open();
  });
})();

/* ── Buy Now → on-domain /checkout with embedded Payment Element ─── */
(function initBuy() {
  const btn = document.getElementById('buyNow');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (btn.classList.contains('btn-atb-disabled')) return;

    const cfg = CG_DESIGNS[currentVariant] || CG_DESIGNS.auburn;
    const variantName = cfg.name;
    const image = cfg.image || '';
    const modelLabel = deviceSelect ? deviceSelect.value : 'iPhone 17';

    try {
      sessionStorage.setItem('vvCheckoutCart', JSON.stringify({
        collection: CG_COLLECTION,
        collectionId: 'cowgirl',
        design: variantName,
        model: modelLabel,
        finish: 'Glossy',
        unit_amount_cents: CG_UNIT_AMOUNT_CENTS,
        image: image,
      }));
    } catch (err) {}

    window.location.href = '/checkout?collection=' + encodeURIComponent(CG_COLLECTION)
      + '&collectionId=cowgirl'
      + '&design=' + encodeURIComponent(variantName)
      + '&model=' + encodeURIComponent(modelLabel)
      + '&unit_amount_cents=' + CG_UNIT_AMOUNT_CENTS
      + (image ? '&image=' + encodeURIComponent(image) : '');
  });
})();

/* ── Init ──────────────────────────────────────────────────── */
applyVariant();
