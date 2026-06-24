/* Velvet & Valor — search-results collection filtering.
   Operates on server-rendered .sr-prod cards (data-design / data-colour /
   data-price / data-new / data-idx) so crawlers index every product and the
   page works without JS; this layer adds client-side filter + sort + chips.
   Shared by the variant, collection and hub tiers. */
(function () {
  var root = document.querySelector('.sr-collection');
  if (!root) return;

  var cards = [].slice.call(root.querySelectorAll('.sr-grid .sr-prod'));
  var grid = root.querySelector('.sr-grid');
  var countEl = root.querySelector('#sr-count');
  var activeEl = root.querySelector('#sr-active');
  var clearEl = root.querySelector('#sr-clear');
  var emptyEl = root.querySelector('.sr-empty');
  var priceEl = root.querySelector('#sr-price');
  var priceOut = root.querySelector('#sr-price-out');
  var sortEl = root.querySelector('#sr-sort');
  var colBoxes = [].slice.call(root.querySelectorAll('.sr-f-col'));
  var swatches = [].slice.call(root.querySelectorAll('.sr-cw'));
  var priceMax = priceEl ? +priceEl.max : Infinity;
  var applyCount = root.querySelector('#sr-apply-count');
  var filterToggle = root.querySelector('#sr-filter-toggle');

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function apply() {
    var cols = colBoxes.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
    var colours = swatches.filter(function (s) { return s.classList.contains('on'); }).map(function (s) { return s.dataset.k; });
    var maxP = priceEl ? +priceEl.value : Infinity;
    var shown = 0;

    cards.forEach(function (card) {
      var ok = (!cols.length || cols.indexOf(card.dataset.design) > -1) &&
               (!colours.length || colours.indexOf(card.dataset.colour) > -1) &&
               (+card.dataset.price <= maxP);
      card.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });

    if (countEl) countEl.textContent = shown;
    if (emptyEl) emptyEl.style.display = shown ? 'none' : '';

    if (activeEl) {
      activeEl.innerHTML = '';
      cols.forEach(function (v) { add(activeEl, v, 'col', v); });
      colours.forEach(function (v) { add(activeEl, cap(v), 'colour', v); });
      if (priceEl && +priceEl.value < priceMax) add(activeEl, 'Up to $' + priceEl.value, 'price', '');
    }
    var any = cols.length || colours.length || (priceEl && +priceEl.value < priceMax);
    if (clearEl) clearEl.style.display = any ? 'inline' : 'none';
    if (applyCount) applyCount.textContent = shown;
    if (filterToggle) {
      var nFilters = cols.length + colours.length + (priceEl && +priceEl.value < priceMax ? 1 : 0);
      filterToggle.querySelector('.sr-fcount') && filterToggle.querySelector('.sr-fcount').remove();
      if (nFilters) { var b = document.createElement('span'); b.className = 'sr-fcount'; b.textContent = '(' + nFilters + ')'; filterToggle.appendChild(b); }
    }
    sortNow();
  }

  function add(parent, label, kind, val) {
    var c = document.createElement('span');
    c.className = 'sr-chip';
    c.innerHTML = '<b>' + label + '</b>';
    var x = document.createElement('x');
    x.textContent = '✕';
    x.onclick = function () {
      if (kind === 'col') { colBoxes.forEach(function (b) { if (b.value === val) b.checked = false; }); }
      else if (kind === 'colour') { swatches.forEach(function (s) { if (s.dataset.k === val) s.classList.remove('on'); }); }
      else if (kind === 'price') { priceEl.value = priceMax; if (priceOut) priceOut.textContent = '$' + priceMax; }
      apply();
    };
    c.appendChild(x);
    parent.appendChild(c);
  }

  function sortNow() {
    if (!sortEl || !grid) return;
    var mode = sortEl.value;
    var vis = cards.filter(function (c) { return c.style.display !== 'none'; });
    vis.sort(function (a, b) {
      if (mode === 'price-asc') return a.dataset.price - b.dataset.price || a.dataset.idx - b.dataset.idx;
      if (mode === 'price-desc') return b.dataset.price - a.dataset.price || a.dataset.idx - b.dataset.idx;
      if (mode === 'new') return (b.dataset.new - a.dataset.new) || a.dataset.idx - b.dataset.idx;
      return a.dataset.idx - b.dataset.idx;
    });
    vis.forEach(function (c) { grid.appendChild(c); });
    // keep the in-grid custom promo after the 2nd row of visible products
    var promo = grid.querySelector('.sr-custom');
    if (promo) { var ref = vis[6]; if (ref) grid.insertBefore(promo, ref); else grid.appendChild(promo); }
  }

  function clearAll() {
    colBoxes.forEach(function (b) { b.checked = false; });
    swatches.forEach(function (s) { s.classList.remove('on'); });
    if (priceEl) { priceEl.value = priceMax; if (priceOut) priceOut.textContent = '$' + priceMax; }
    apply();
  }

  colBoxes.forEach(function (b) { b.addEventListener('change', apply); });
  swatches.forEach(function (s) { s.addEventListener('click', function () { s.classList.toggle('on'); apply(); }); });
  if (priceEl) priceEl.addEventListener('input', function () { if (priceOut) priceOut.textContent = '$' + priceEl.value; apply(); });
  if (sortEl) sortEl.addEventListener('change', sortNow);
  if (clearEl) clearEl.addEventListener('click', clearAll);
  if (emptyEl) emptyEl.addEventListener('click', function (e) { if (e.target.tagName === 'B') clearAll(); });

  /* ---- Mobile filter drawer ---- */
  var sideEl = root.querySelector('#sr-side');
  var backdrop = root.querySelector('#sr-backdrop');
  var closeBtn = root.querySelector('#sr-side-close');
  var applyBtn = root.querySelector('#sr-side-apply');
  function openDrawer() { if (sideEl) sideEl.classList.add('open'); if (backdrop) backdrop.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { if (sideEl) sideEl.classList.remove('open'); if (backdrop) backdrop.classList.remove('open'); document.body.style.overflow = ''; }
  if (filterToggle) filterToggle.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (applyBtn) applyBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  cards.forEach(function (c, i) { if (!c.dataset.idx) c.dataset.idx = i; });

  /* ---- Per-card image carousel (cards with >1 image) ---- */
  [].slice.call(root.querySelectorAll('.sr-prod-img[data-imgs]')).forEach(function (box) {
    var n = +box.getAttribute('data-imgs');
    if (n < 2) return;
    var imgs = [].slice.call(box.querySelectorAll('.sr-imgs img'));
    var dots = [].slice.call(box.querySelectorAll('.sr-img-dots span'));
    var i = 0;
    function show(k) {
      i = (k + n) % n;
      imgs.forEach(function (im, j) { im.classList.toggle('on', j === i); });
      dots.forEach(function (d, j) { d.classList.toggle('on', j === i); });
    }
    var prev = box.querySelector('.sr-img-prev'), next = box.querySelector('.sr-img-next');
    if (prev) prev.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); show(i - 1); });
    if (next) next.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); show(i + 1); });
  });

  /* ---- Recently viewed / You may also like ---- */
  var KEY = 'vv_recent';
  function readRecent() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }

  // Record a product whenever any card is clicked (grid or discovery rail).
  root.addEventListener('click', function (e) {
    var card = e.target.closest && e.target.closest('.sr-prod');
    if (!card || !card.dataset.href) return;
    var item = { href: card.dataset.href.split('?')[0], name: card.dataset.name, image: card.dataset.image, design: card.dataset.design, price: card.dataset.price };
    var list = readRecent().filter(function (x) { return x.href !== item.href; });
    list.unshift(item);
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 12))); } catch (e2) {}
  });

  // Render the "Recently viewed" rail from storage (excludes the current page).
  var recentRail = root.querySelector('#sr-disc-recent');
  var recentTab = root.querySelector('#sr-recent-tab');
  var alsoRail = root.querySelector('#sr-disc-also');
  if (recentRail && recentTab) {
    var here = location.pathname.replace(/\/$/, '');
    var recent = readRecent().filter(function (x) { return x.href.replace(/\/$/, '') !== here; }).slice(0, 4);
    if (recent.length) {
      recentRail.innerHTML = recent.map(function (p) {
        return '<div class="sr-prod"><div class="sr-prod-img"><a class="sr-prod-link" href="' + p.href + '"><div class="sr-imgs"><img class="on" src="' + p.image + '" alt="' + (p.name || '') + '" loading="lazy"></div></a></div>' +
          '<a class="sr-prod-link" href="' + p.href + '"><div class="sr-prod-info"><div class="d">' + (p.design || '') + '</div><div class="n">' + (p.name || '') + '</div><div class="p">$' + (p.price || '') + '.00<span class="mag">&middot; MagSafe</span></div></div></a></div>';
      }).join('');
      recentTab.removeAttribute('hidden');
    }
  }

  // Tab switching
  [].slice.call(root.querySelectorAll('.sr-disc-tab')).forEach(function (tab) {
    tab.addEventListener('click', function () {
      [].slice.call(root.querySelectorAll('.sr-disc-tab')).forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var show = tab.dataset.disc;
      if (alsoRail) alsoRail.hidden = show !== 'also';
      if (recentRail) recentRail.hidden = show !== 'recent';
    });
  });

  /* ---- Hub model selector: filter in place via ?size= (no navigation) ---- */
  var modelDetails = root.querySelector('[data-model-mode]');
  var modelMode = modelDetails ? modelDetails.getAttribute('data-model-mode') : 'nav';
  var modelChip = root.querySelector('#sr-model-chip');

  function applyModel(slug, device, name, pushUrl) {
    [].slice.call(root.querySelectorAll('.sr-model-link')).forEach(function (a) { a.classList.toggle('active', a.dataset.model === slug); });
    // carry the chosen model into every product link so it reaches the PDP
    [].slice.call(root.querySelectorAll('a.sr-prod-link, a.sr-add')).forEach(function (a) {
      var base = a.getAttribute('href').split('?')[0];
      if (base.indexOf('/products/') === 0) a.setAttribute('href', (slug && device) ? base + '?variant=' + device + '-glossy' : base);
    });
    if (modelChip) {
      if (slug) { modelChip.innerHTML = '<span class="sr-chip lock">' + name + ' <x id="sr-model-x">✕</x></span>'; modelChip.style.display = ''; }
      else { modelChip.innerHTML = ''; modelChip.style.display = 'none'; }
    }
    if (pushUrl) {
      var url = new URL(location.href);
      if (slug) url.searchParams.set('size', slug); else url.searchParams.delete('size');
      history.pushState({}, '', url.toString());
    }
  }

  if (modelMode === 'filter') {
    [].slice.call(root.querySelectorAll('.sr-model-link')).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        applyModel(a.dataset.model, a.dataset.device, a.dataset.name || a.textContent.trim(), true);
      });
    });
    if (modelChip) modelChip.addEventListener('click', function (e) { if (e.target.id === 'sr-model-x') applyModel(null, null, null, true); });
    var sz = new URL(location.href).searchParams.get('size');
    if (sz) {
      var link = root.querySelector('.sr-model-link[data-model="' + sz + '"]');
      if (link) { applyModel(sz, link.dataset.device, link.dataset.name, false); if (modelDetails) modelDetails.open = true; }
    }
  }
})();
