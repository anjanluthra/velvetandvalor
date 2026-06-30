/* ============================================================
   VELVET & VALOR — The Cowgirl Collection product page
   Variant routing, swatch swap, Stripe checkout
   ============================================================ */
'use strict';

const CG_DESIGNS = {
  'redhead':  { name: 'Cowgirl & Mare — Redhead',  image: '/images/cowgirl-redhead product image.jpg' },
  'brunette': { name: 'Cowgirl & Mare — Brunette', image: '/images/cowgirl-brunette product image.jpg' },
  'auburn':   { name: 'Cowgirl & Mare — Auburn',   image: '/images/cowgirl-auburn product image.jpg' },
};

const CG_COLLECTION = 'The Cowgirl Collection';
const CG_UNIT_AMOUNT_CENTS = 4800; // $48.00 (matches Noble Steed)

let currentVariant = 'redhead';
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
    const cfg = CG_DESIGNS[currentVariant] || CG_DESIGNS.redhead;
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

/* ── Buy Now → Stripe Checkout ─────────────────────────────── */
(function initBuy() {
  const btn = document.getElementById('buyNow');
  if (!btn) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (btn.classList.contains('btn-atb-disabled')) return;

    const original = btn.querySelector('.btn-atb-text').textContent;
    btn.querySelector('.btn-atb-text').textContent = 'Opening checkout…';
    btn.classList.add('btn-atb-disabled');

    const variantName = (CG_DESIGNS[currentVariant] || CG_DESIGNS.redhead).name;
    const modelLabel = deviceSelect ? deviceSelect.value : 'iPhone 17';

    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: 'cowgirl',
          collection: CG_COLLECTION,
          design: variantName,
          model: modelLabel,
          finish: 'Glossy',
          unit_amount_cents: CG_UNIT_AMOUNT_CENTS,
        }),
      });
      const data = await res.json();
      if (data && data.url) {
        if (typeof window.vvGoToCheckout === 'function') {
          window.vvGoToCheckout(data.url);
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error((data && data.error) || 'No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      btn.querySelector('.btn-atb-text').textContent = original;
      btn.classList.remove('btn-atb-disabled');
      alert('Sorry — we couldn’t open checkout. Please try again, or email info@velvet-valor.com.');
    }
  });
})();

/* ── Init ──────────────────────────────────────────────────── */
applyVariant();
