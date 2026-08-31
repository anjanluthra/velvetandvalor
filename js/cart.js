/**
 * Velvet & Valor — Cart
 * localStorage-backed multi-item bag + slide-out drawer + nav button.
 * Prices reuse js/currency.js (window.vvCurrency); checkout reuses
 * window.vvGoToCheckout (in-app-browser safe). Loaded on every page.
 */
(function () {
  'use strict';

  var KEY = 'vv_cart_v1';
  var MAX_QTY = 10;
  var mem = null; // in-memory fallback (Safari private mode)

  /* ── Store ─────────────────────────────────────────────────── */
  function read() {
    if (mem) return mem.slice();
    try {
      var raw = localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (i) {
        return i && i.collectionId && i.design && i.model &&
          typeof i.unitAmountCents === 'number';
      });
    } catch (e) { return mem ? mem.slice() : []; }
  }
  function write(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); mem = null; }
    catch (e) { mem = arr.slice(); }
  }
  function skuOf(i) {
    return [i.collectionId, i.design, i.model, i.finish || 'Glossy'].join('|');
  }
  function clampQty(q) {
    q = Math.floor(Number(q) || 1);
    return Math.max(1, Math.min(MAX_QTY, q));
  }
  function count() {
    return read().reduce(function (s, i) { return s + clampQty(i.qty); }, 0);
  }
  function subtotalCents() {
    return read().reduce(function (s, i) { return s + i.unitAmountCents * clampQty(i.qty); }, 0);
  }

  function add(item) {
    if (!item || !item.collectionId) return;
    var arr = read();
    var sku = skuOf(item);
    var found = null;
    for (var n = 0; n < arr.length; n++) { if (skuOf(arr[n]) === sku) { found = arr[n]; break; } }
    if (found) { found.qty = clampQty(clampQty(found.qty) + clampQty(item.qty || 1)); }
    else {
      arr.push({
        collectionId: item.collectionId,
        design: item.design,
        model: item.model,
        finish: item.finish || 'Glossy',
        unitAmountCents: item.unitAmountCents,
        qty: clampQty(item.qty || 1),
        image: item.image || '',
        name: item.name || (item.design + ' — ' + item.model),
      });
    }
    write(arr); changed();
  }
  function setQty(sku, qty) {
    var arr = read();
    qty = Math.floor(Number(qty) || 0);
    if (qty < 1) { arr = arr.filter(function (i) { return skuOf(i) !== sku; }); }
    else { arr.forEach(function (i) { if (skuOf(i) === sku) i.qty = clampQty(qty); }); }
    write(arr); changed();
  }
  function remove(sku) {
    write(read().filter(function (i) { return skuOf(i) !== sku; })); changed();
  }
  function clear() { write([]); changed(); }

  /* ── Price formatting (reuse currency.js) ──────────────────── */
  function fmtCents(cents) {
    var usd = cents / 100;
    if (window.vvCurrency && typeof window.vvCurrency.format === 'function') {
      return window.vvCurrency.format(usd);
    }
    return '$' + usd.toFixed(2);
  }

  /* ── DOM ───────────────────────────────────────────────────── */
  var els = {}; // refs
  var lastFocused = null;

  function buildNavButton() {
    var actions = document.querySelector('.nav-actions');
    if (!actions || actions.querySelector('.nav-cart')) return;
    var btn = document.createElement('button');
    btn.className = 'nav-icon nav-cart';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open bag');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
      '<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>' +
      '<span class="nav-cart-count" aria-hidden="true">0</span>';
    btn.addEventListener('click', open);
    actions.insertBefore(btn, actions.firstChild);
    els.navBtn = btn;
    els.badge = btn.querySelector('.nav-cart-count');
  }

  function buildDrawer() {
    if (document.querySelector('.cart-drawer')) return;
    var backdrop = document.createElement('div');
    backdrop.className = 'cart-backdrop';
    backdrop.addEventListener('click', close);

    var drawer = document.createElement('aside');
    drawer.className = 'cart-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Shopping bag');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML =
      '<div class="cart-head">' +
        '<span class="cart-title">Your bag</span>' +
        '<button class="cart-close" type="button" aria-label="Close bag">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="cart-body"></div>' +
      '<div class="cart-foot">' +
        '<div class="cart-subtotal-row"><span>Subtotal</span><span class="cart-subtotal" aria-live="polite">$0.00</span></div>' +
        '<p class="cart-foot-note">Shipping calculated at checkout · charged in USD</p>' +
        '<button class="cart-checkout btn-primary" type="button">Checkout</button>' +
        '<button class="cart-keep" type="button">Keep shopping</button>' +
      '</div>';

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    els.backdrop = backdrop;
    els.drawer = drawer;
    els.body = drawer.querySelector('.cart-body');
    els.subtotal = drawer.querySelector('.cart-subtotal');
    els.checkout = drawer.querySelector('.cart-checkout');
    drawer.querySelector('.cart-close').addEventListener('click', close);
    drawer.querySelector('.cart-keep').addEventListener('click', close);
    els.checkout.addEventListener('click', checkout);
    drawer.addEventListener('keydown', onKeydown);
  }

  function render() {
    if (!els.body) return;
    var arr = read();
    els.body.innerHTML = '';
    if (!arr.length) {
      var empty = document.createElement('div');
      empty.className = 'cart-empty';
      empty.innerHTML =
        '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>' +
        '<p>Your bag is empty.</p>';
      els.body.appendChild(empty);
      if (els.checkout) els.checkout.disabled = true;
    } else {
      arr.forEach(function (i) {
        var sku = skuOf(i);
        var row = document.createElement('div');
        row.className = 'cart-line';
        row.innerHTML =
          '<div class="cart-line-img">' + (i.image ? '<img alt="">' : '') + '</div>' +
          '<div class="cart-line-info">' +
            '<p class="cart-line-name"></p>' +
            '<p class="cart-line-meta"></p>' +
            '<div class="cart-qty" role="group" aria-label="Quantity">' +
              '<button type="button" class="cart-qty-btn" data-act="dec" aria-label="Decrease quantity">&minus;</button>' +
              '<span class="cart-qty-val"></span>' +
              '<button type="button" class="cart-qty-btn" data-act="inc" aria-label="Increase quantity">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="cart-line-right">' +
            '<span class="cart-line-price" data-price-usd=""></span>' +
            '<button type="button" class="cart-line-remove" aria-label="Remove item">Remove</button>' +
          '</div>';
        // dynamic text via textContent (XSS-safe)
        if (i.image) row.querySelector('img').src = i.image;
        row.querySelector('.cart-line-name').textContent = i.name || (i.design + ' — ' + i.model);
        row.querySelector('.cart-line-meta').textContent = i.model + ' · ' + (i.finish || 'Glossy');
        row.querySelector('.cart-qty-val').textContent = clampQty(i.qty);
        var priceEl = row.querySelector('.cart-line-price');
        priceEl.setAttribute('data-price-usd', ((i.unitAmountCents * clampQty(i.qty)) / 100).toFixed(2));
        priceEl.textContent = fmtCents(i.unitAmountCents * clampQty(i.qty));
        row.querySelector('[data-act="dec"]').addEventListener('click', function () { setQty(sku, clampQty(i.qty) - 1); });
        row.querySelector('[data-act="inc"]').addEventListener('click', function () { setQty(sku, clampQty(i.qty) + 1); });
        row.querySelector('.cart-line-remove').addEventListener('click', function () { remove(sku); });
        els.body.appendChild(row);
      });
      if (els.checkout) els.checkout.disabled = false;
    }
    if (els.subtotal) els.subtotal.textContent = fmtCents(subtotalCents());
    // Re-run currency conversion over the freshly-rendered price nodes.
    if (window.vvCurrency && typeof window.vvCurrency.apply === 'function') window.vvCurrency.apply();
  }

  function updateBadge() {
    if (!els.badge) return;
    var c = count();
    els.badge.textContent = c > 9 ? '9+' : String(c);
    els.badge.classList.toggle('has-items', c > 0);
  }

  function changed() {
    updateBadge();
    render();
    try { window.dispatchEvent(new CustomEvent('vv:cartchange', { detail: { count: count() } })); } catch (e) {}
  }

  /* ── Open / close + focus management ───────────────────────── */
  function open() {
    if (!els.drawer) return;
    render();
    lastFocused = document.activeElement;
    els.backdrop.classList.add('is-open');
    els.drawer.classList.add('is-open');
    els.drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-open');
    var first = els.drawer.querySelector('.cart-close');
    if (first) first.focus();
  }
  function close() {
    if (!els.drawer) return;
    els.backdrop.classList.remove('is-open');
    els.drawer.classList.remove('is-open');
    els.drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-open');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  function onKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    var f = els.drawer.querySelectorAll('button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ── Checkout ──────────────────────────────────────────────── */
  /**
   * Hand the bag to our on-domain checkout.
   *
   * Deliberately NOT a redirect to checkout.stripe.com: that is what breaks
   * inside the Instagram in-app browser. Payment now happens on
   * velvet-valor.com via the embedded Stripe Payment Element, same as Buy Now.
   *
   * Prices are not sent — /api/create-payment-intent re-derives every one of
   * them from the server-side table. The cart is passed through sessionStorage
   * (not the querystring) so a long bag can't blow the URL length limit.
   */
  function checkout() {
    var arr = read();
    if (!arr.length) return;
    var btn = els.checkout;
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Processing…';

    var payload = {
      items: arr.map(function (i) {
        return {
          collectionId: i.collectionId,
          collection: i.name || '',
          design: i.design,
          model: i.model,
          finish: i.finish || 'Glossy',
          qty: clampQty(i.qty),
          image: i.image || '',
          unitAmountCents: i.unitAmountCents,
        };
      }),
    };

    try {
      sessionStorage.setItem('vvCheckoutCart', JSON.stringify(payload));
    } catch (e) {
      // Private mode — /checkout can't read the bag, so fall back to the
      // hosted flow rather than stranding the customer on an empty page.
      fallbackToHostedCheckout(payload, btn, label);
      return;
    }
    window.location.href = '/checkout';
  }

  /** Last-resort hosted Stripe Checkout when sessionStorage is unavailable. */
  function fallbackToHostedCheckout(payload, btn, label) {
    fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: payload.items.map(function (i) {
          return { collectionId: i.collectionId, design: i.design, model: i.model, finish: i.finish, qty: i.qty };
        }),
      }),
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.url) {
        if (typeof window.vvGoToCheckout === 'function') window.vvGoToCheckout(data.url);
        else window.location.href = data.url;
      } else { throw new Error((data && data.error) || 'Checkout failed'); }
    }).catch(function (err) {
      console.error('Cart checkout error:', err);
      btn.disabled = false; btn.textContent = 'Try again';
      setTimeout(function () { btn.textContent = label; }, 2500);
    });
  }

  /* ── Public API ────────────────────────────────────────────── */
  window.vvCart = {
    add: add, remove: remove, setQty: setQty, clear: clear,
    count: count, subtotalCents: subtotalCents, items: read,
    open: open, close: close,
  };

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    buildNavButton();
    buildDrawer();
    updateBadge();
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Re-render prices when currency becomes ready or changes.
  window.addEventListener('vv:currencyready', render);
  window.addEventListener('vv:currencychange', render);
  // Sync badge if cart changes in another tab.
  window.addEventListener('storage', function (e) { if (e.key === KEY) { updateBadge(); render(); } });
})();
