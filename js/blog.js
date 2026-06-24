/* Velvet & Valor — Journal article behaviours
 * Reading-progress bar, scrollspy table of contents, and copy-link share.
 * All features are defensive: they no-op on pages that don't include them. */
(function () {
  'use strict';

  /* ── Reading progress bar ─────────────────────────────── */
  var bar = document.getElementById('readingProgressBar');
  var article = document.querySelector('.article-body');
  if (bar && article) {
    var update = function () {
      var rect = article.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var scrolled = -rect.top;
      var pct = total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0;
      bar.style.width = (pct * 100).toFixed(2) + '%';
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  /* ── Scrollspy table of contents ──────────────────────── */
  var tocItems = Array.prototype.slice.call(document.querySelectorAll('.article-toc-item'));
  if (tocItems.length && 'IntersectionObserver' in window) {
    var headings = tocItems
      .map(function (a) {
        var id = a.getAttribute('href').slice(1);
        return document.getElementById(id);
      })
      .filter(Boolean);

    var byId = {};
    tocItems.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

    var setActive = function (id) {
      tocItems.forEach(function (a) { a.classList.remove('active'); });
      if (byId[id]) byId[id].classList.add('active');
    };

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

    headings.forEach(function (h) { observer.observe(h); });
  }

  /* ── Copy-link share button ───────────────────────────── */
  var copyBtn = document.querySelector('[data-copy-link]');
  if (copyBtn && navigator.clipboard) {
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(window.location.href).then(function () {
        copyBtn.classList.add('copied');
        setTimeout(function () { copyBtn.classList.remove('copied'); }, 1600);
      });
    });
  }

  /* ── Journal search (homepage) ────────────────────────── */
  var search = document.getElementById('journalSearch');
  if (search) {
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-search]'));
    var hideOnSearch = Array.prototype.slice.call(document.querySelectorAll('[data-hide-on-search]'));
    var empty = document.getElementById('journalSearchEmpty');
    var apply = function () {
      var q = search.value.trim().toLowerCase();
      if (!q) {
        cards.forEach(function (c) { c.hidden = false; });
        hideOnSearch.forEach(function (el) { el.hidden = false; });
        if (empty) empty.hidden = true;
        return;
      }
      hideOnSearch.forEach(function (el) { el.hidden = true; });
      var any = false;
      cards.forEach(function (c) {
        var match = (c.getAttribute('data-search') || '').indexOf(q) !== -1;
        c.hidden = !match;
        if (match) any = true;
      });
      if (empty) empty.hidden = any;
    };
    search.addEventListener('input', apply);
  }
})();
