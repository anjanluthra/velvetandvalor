/* ============================================================
   VELVET & VALOR — Shared JavaScript
   Custom cursor, nav, scroll reveal, grain
   ============================================================ */

'use strict';

/* ── Global Error Containment ──────────────────────────────────
   Never let an unhandled JS error tear down the page. Errors get
   logged to console for our debugging but customers see no Red-X.
   ─────────────────────────────────────────────────────────────── */
window.addEventListener('error', function (e) {
  // Don't suppress; just keep the page alive. Browsers won't show a UI
  // for thrown errors but our handlers continue.
  if (window.console && console.warn) {
    console.warn('[V&V] handled JS error:', e.message, e.filename + ':' + e.lineno);
  }
}, true);
window.addEventListener('unhandledrejection', function (e) {
  if (window.console && console.warn) {
    console.warn('[V&V] unhandled promise:', e.reason && (e.reason.message || e.reason));
  }
  // Stop the default 'Uncaught (in promise)' noise
  e.preventDefault();
});

/* ── Custom Cursor ─────────────────────────────────────────── */
(function initCursor() {
  const dot  = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  let mouseX = 0, mouseY = 0;
  let ringX  = 0, ringY  = 0;
  let rafId;

  // Track mouse
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top  = mouseY + 'px';
  });

  // Linear interpolation helper
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Lagging ring animation
  function animateRing() {
    ringX = lerp(ringX, mouseX, 0.11);
    ringY = lerp(ringY, mouseY, 0.11);
    ring.style.left = ringX + 'px';
    ring.style.top  = ringY + 'px';
    rafId = requestAnimationFrame(animateRing);
  }
  animateRing();

  // Hover state — expand ring, hide dot
  const hoverTargets = 'a, button, .btn-primary, .btn-ghost, .btn-atb, .collection-card, .gallery-thumb, .color-swatch, .device-option, .accordion-trigger, .related-card, .engraving-toggle-row';

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverTargets)) {
      document.body.classList.add('cursor-hover');
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverTargets)) {
      document.body.classList.remove('cursor-hover');
    }
  });

  // Hide cursor when leaving window
  document.addEventListener('mouseleave', () => {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity  = '1';
    ring.style.opacity = '1';
  });
})();


/* ── Navigation — sticky nav + condense-on-scroll ──────────────── */
(function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const root = document.documentElement;
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 50);
    // Once past the announcement bar, collapse it and slim the nav so the
    // sticky nav (and cart) stays reachable without the full three-bar stack.
    root.classList.toggle('header-condensed', y > 24);
    nav.classList.remove('nav-hidden');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


/* ── Mobile Menu Toggle ─────────────────────────────────────── */
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

  // Close menu when clicking a link
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
    });
  });
})();


/* ── Announcement bar — rotate on mobile + click-to-copy promo ─── */
(function initBanner() {
  const inner = document.querySelector('.top-banner-inner');
  if (!inner) return;
  const items = Array.from(inner.querySelectorAll('.top-banner-item'))
    .filter(el => !el.classList.contains('top-banner-currency'));

  // Click-to-copy the promo code
  const promo = inner.querySelector('.top-banner-promo');
  if (promo) {
    const code = (promo.querySelector('strong') || {}).textContent || 'FIRST10';
    promo.setAttribute('role', 'button');
    promo.setAttribute('tabindex', '0');
    promo.setAttribute('aria-label', `Copy promo code ${code}`);
    if (!promo.querySelector('.promo-copy-icon')) {
      const icon = document.createElement('span');
      icon.className = 'promo-copy-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
      promo.appendChild(icon);
    }
    const original = promo.innerHTML;
    let resetT;
    const doCopy = () => {
      const done = () => {
        promo.classList.add('is-copied');
        promo.innerHTML = `<strong>${code}</strong> copied ✓`;
        clearTimeout(resetT);
        resetT = setTimeout(() => {
          promo.classList.remove('is-copied');
          promo.innerHTML = original;
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done).catch(done);
      } else {
        const ta = document.createElement('textarea');
        ta.value = code; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta); done();
      }
    };
    promo.addEventListener('click', doCopy);
    promo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doCopy(); }
    });
  }

  // NOTE: Mobile message rotation removed. It set `display = ''` to reveal an
  // item, which cleared the inline style and fell back to the mobile CSS rule
  // (only the 2nd item shows) — so two of three rotation states displayed no
  // message, producing a visible flicker between blank and "Rated Excellent".
  // The banner now stays static; CSS decides what shows at each breakpoint.
})();


/* ── Dismissible shipping alert (remembers dismissal) ──────────── */
(function initShippingAlert() {
  const alert = document.querySelector('.shipping-alert');
  if (!alert) return;
  const KEY = 'vv_alert_hormuz_dismissed';
  let dismissed = false;
  try { dismissed = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (dismissed) { alert.style.display = 'none'; return; }

  if (!alert.querySelector('.shipping-alert-close')) {
    const btn = document.createElement('button');
    btn.className = 'shipping-alert-close';
    btn.setAttribute('aria-label', 'Dismiss shipping notice');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    btn.addEventListener('click', () => {
      alert.classList.add('is-dismissing');
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      setTimeout(() => { alert.style.display = 'none'; }, 300);
    });
    const inner = alert.querySelector('.shipping-alert-inner') || alert;
    inner.appendChild(btn);
  }
})();


/* ── Mega-menu for iPhone Cases ────────────────────────────────── */
(function initMegaMenu() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const trigger = nav.querySelector('.nav-links a[href*="iphone-cases"], .nav-links a[href*="collections"]');
  if (!trigger) return;
  const li = trigger.closest('li') || trigger.parentElement;
  li.classList.add('has-mega');

  const series = [
    { label: 'iPhone 17', q: 'iphone-17' },
    { label: 'iPhone 16', q: 'iphone-16' },
    { label: 'iPhone 15', q: 'iphone-15' },
    { label: 'iPhone 14', q: 'iphone-14' },
  ];
  const collections = [
    { name: 'Noble Steed', sub: 'Artist equestrian cases', href: '/collections/iphone-cases#noble-steed-collection' },
    { name: "The Rider's Motto", sub: 'Quote editions', href: '/collections/iphone-cases#riders-motto-heading' },
  ];
  const panel = document.createElement('div');
  panel.className = 'mega-menu';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'iPhone cases menu');
  panel.innerHTML = `
    <div class="mega-inner">
      <div class="mega-col">
        <p class="mega-head">Shop by model</p>
        ${series.map(s => `<a class="mega-link" href="/collections/iphone-cases?model=${s.q}">${s.label}</a>`).join('')}
      </div>
      <div class="mega-col">
        <p class="mega-head">Shop by collection</p>
        ${collections.map(c => `<a class="mega-collection" href="${c.href}"><span class="mega-collection-name">${c.name}</span><span class="mega-collection-sub">${c.sub}</span></a>`).join('')}
      </div>
      <a class="mega-feature" href="/custom">
        <span class="mega-feature-kicker">Make it yours</span>
        <span class="mega-feature-title">Custom horse portrait</span>
        <span class="mega-feature-cta">Start a portrait →</span>
      </a>
    </div>`;
  li.appendChild(panel);

  let hideT;
  const open = () => { clearTimeout(hideT); li.classList.add('mega-open'); trigger.setAttribute('aria-expanded', 'true'); };
  const close = () => { hideT = setTimeout(() => { li.classList.remove('mega-open'); trigger.setAttribute('aria-expanded', 'false'); }, 120); };
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  li.addEventListener('mouseenter', open);
  li.addEventListener('mouseleave', close);
  trigger.addEventListener('focus', open);
  li.addEventListener('focusout', (e) => { if (!li.contains(e.relatedTarget)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { li.classList.remove('mega-open'); } });
})();


/* ── Scroll Reveal (Intersection Observer) ───────────────────── */
(function initReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target); // once only
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -48px 0px'
  });

  elements.forEach(el => observer.observe(el));
})();


/* ── Rating Bars Reveal ──────────────────────────────────────── */
(function initRatingBars() {
  const bars = document.querySelectorAll('.rating-bar-fill');
  if (!bars.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        bar.style.width = bar.dataset.width || '0%';
        observer.unobserve(bar);
      }
    });
  }, { threshold: 0.5 });

  // Set initial width to 0 before animating
  bars.forEach(bar => {
    const target = bar.style.width;
    bar.dataset.width = target;
    bar.style.width = '0%';
    observer.observe(bar);
  });
})();


/* ── Newsletter Form ─────────────────────────────────────────── */
(function initNewsletter() {
  const form = document.querySelector('.newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('.newsletter-btn');
    const input = form.querySelector('.newsletter-input');

    btn.textContent = 'Subscribed ✓';
    btn.style.background = '#1A3A1A';
    btn.style.color = '#6EC46E';
    input.value = '';
    input.disabled = true;

    setTimeout(() => {
      btn.textContent = 'Subscribe';
      btn.style.background = '';
      btn.style.color = '';
      input.disabled = false;
    }, 4000);
  });
})();
