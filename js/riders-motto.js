/* ============================================================
   VELVET & VALOR — The Rider's Motto product page
   Variant routing, swatch swap, Stripe checkout
   ============================================================ */
'use strict';

const RM_DESIGNS = {
  'pink':           { name: 'Navy & Baby Pink',     image: '/images/riders-motto-inside-leg-pink.jpg' },
  'baby-blue':      { name: 'Navy & Baby Blue',     image: '/images/riders-motto-inside-leg-baby-blue.jpg' },
  'teal':           { name: 'Navy & Teal',          image: '/images/riders-motto-inside-leg-teal.jpg' },
  'orange':         { name: 'Navy & Orange',        image: '/images/riders-motto-inside-leg-orange.jpg' },
  'purple-green':   { name: 'Purple & Green',       image: '/images/riders-motto-inside-leg-wimbledon.jpg' },
  'burgundy':       { name: 'Navy & Burgundy',      image: '/images/riders-motto-inside-leg-burgundy.jpg' },
  'emerald-green':  { name: 'Navy & Emerald Green', image: '/images/riders-motto-inside-leg-emerald-green.jpg' },
};

const RM_COLLECTION = "The Rider's Motto — Inside Leg, Outside Rein";
const RM_UNIT_AMOUNT_CENTS = 4000; // $40.00

let currentVariant = 'pink';
let currentDevice = 'iPhone 17';

/* ── Parse URL for variant ─────────────────────────────────── */
(function initFromURL() {
  const match = window.location.pathname.match(/\/products\/riders-motto-([\w-]+)/);
  if (match && RM_DESIGNS[match[1]]) {
    currentVariant = match[1];
  }
})();

/* ── Apply variant (image + active swatch + name + URL) ────── */
function applyVariant() {
  const cfg = RM_DESIGNS[currentVariant];
  if (!cfg) return;

  const img = document.getElementById('galleryMainImg');
  if (img) {
    img.src = cfg.image;
    img.alt = `The Rider's Motto — ${cfg.name}`;
  }
  const nameEl = document.getElementById('designName');
  if (nameEl) nameEl.textContent = cfg.name;

  document.querySelectorAll('.rm-swatch').forEach(s => {
    const isActive = s.dataset.color === currentVariant;
    s.classList.toggle('active', isActive);
    s.setAttribute('aria-checked', String(isActive));
  });

  // Keep URL pretty
  const newUrl = `/products/riders-motto-${currentVariant}`;
  if (window.location.pathname !== newUrl) {
    try { window.history.replaceState(null, '', newUrl); } catch (e) {}
  }
}

/* ── Swatch clicks ─────────────────────────────────────────── */
document.querySelectorAll('.rm-swatch').forEach(s => {
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

/* ── Model confirm checkbox gates the Buy Now button ───────── */
(function initBuyGate() {
  const cb = document.getElementById('modelConfirmCheckbox');
  const btn = document.getElementById('buyNow');
  if (!cb || !btn) return;
  function refresh() {
    if (cb.checked) {
      btn.classList.remove('btn-atb-disabled');
    } else {
      btn.classList.add('btn-atb-disabled');
    }
  }
  cb.addEventListener('change', refresh);
  refresh();
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

    const variantName = (RM_DESIGNS[currentVariant] || RM_DESIGNS.pink).name;
    const modelLabel = deviceSelect ? deviceSelect.value : 'iPhone 17';

    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection: RM_COLLECTION,
          design: variantName,
          model: modelLabel,
          finish: 'Glossy',
          unit_amount_cents: RM_UNIT_AMOUNT_CENTS,
        }),
      });
      const data = await res.json();
      if (data && data.url) {
        window.location.href = data.url;
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
