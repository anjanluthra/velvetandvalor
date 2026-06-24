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


/* ── Header dropdowns: iPhone Cases mega-menu + Gifts dropdown ──── */
(function initNavDropdowns() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const SERIES = [
    { name: 'iPhone 17', models: [['iPhone 17', 'iphone-17'], ['iPhone 17 Air', 'iphone-17-air'], ['iPhone 17 Pro', 'iphone-17-pro'], ['iPhone 17 Pro Max', 'iphone-17-pro-max']] },
    { name: 'iPhone 16', models: [['iPhone 16', 'iphone-16'], ['iPhone 16 Pro', 'iphone-16-pro'], ['iPhone 16 Pro Max', 'iphone-16-pro-max'], ['iPhone 16 Plus', 'iphone-16-plus']] },
    { name: 'iPhone 15', models: [['iPhone 15', 'iphone-15'], ['iPhone 15 Pro', 'iphone-15-pro'], ['iPhone 15 Pro Max', 'iphone-15-pro-max'], ['iPhone 15 Plus', 'iphone-15-plus']] },
    { name: 'iPhone 14', models: [['iPhone 14', 'iphone-14'], ['iPhone 14 Pro', 'iphone-14-pro'], ['iPhone 14 Pro Max', 'iphone-14-pro-max'], ['iPhone 14 Plus', 'iphone-14-plus']] },
    { name: 'iPhone 13', models: [['iPhone 13', 'iphone-13'], ['iPhone 13 mini', 'iphone-13-mini'], ['iPhone 13 Pro', 'iphone-13-pro'], ['iPhone 13 Pro Max', 'iphone-13-pro-max']] },
    { name: 'iPhone 12', models: [['iPhone 12', 'iphone-12'], ['iPhone 12 mini', 'iphone-12-mini'], ['iPhone 12 Pro', 'iphone-12-pro'], ['iPhone 12 Pro Max', 'iphone-12-pro-max']] },
  ];
  const GIFTS = [
    ['Gifts for Horse Lovers', '/gifts/horse-lovers'],
    ['Horse Gifts for Girls', '/gifts/horse-gifts-for-girls'],
    ['Equestrian Gifts', '/gifts/equestrian-gifts'],
    ['Luxury Equestrian Gifts', '/gifts/luxury-equestrian-gifts'],
    ['Personalized Horse Gifts', '/gifts/personalized-horse-gifts'],
    ['Year of the Horse 2026', '/gifts/year-of-the-horse'],
  ];

  function attach(trigger, variant, html, label) {
    if (!trigger) return;
    const li = trigger.closest('li') || trigger.parentElement;
    li.classList.add('has-mega');
    const panel = document.createElement('div');
    panel.className = 'mega-menu ' + variant;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', label);
    panel.innerHTML = html;
    li.appendChild(panel);

    // Mous-style left rail: hovering a rail item swaps the right panel.
    const railItems = panel.querySelectorAll('.mega-rail-item');
    if (railItems.length) {
      const subPanels = panel.querySelectorAll('.mega-panel');
      railItems.forEach((item) => {
        const activate = () => {
          railItems.forEach((r) => r.classList.toggle('active', r === item));
          subPanels.forEach((p) => p.classList.toggle('active', p.dataset.panel === item.dataset.panel));
        };
        item.addEventListener('mouseenter', activate);
        item.addEventListener('focus', activate);
      });
    }

    const isFixed = variant === 'mega-menu-cases';
    let hideT;
    const open = () => {
      clearTimeout(hideT);
      if (!li.dataset.imgsLoaded) {
        panel.querySelectorAll('img[data-src]').forEach(function (im) { im.src = im.getAttribute('data-src'); });
        li.dataset.imgsLoaded = '1';
      }
      if (isFixed) panel.style.top = (nav.getBoundingClientRect().bottom + 10) + 'px';
      li.classList.add('mega-open');
      trigger.setAttribute('aria-expanded', 'true');
    };
    const close = () => { hideT = setTimeout(() => { li.classList.remove('mega-open'); trigger.setAttribute('aria-expanded', 'false'); }, 120); };
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    li.addEventListener('mouseenter', open);
    li.addEventListener('mouseleave', close);
    trigger.addEventListener('focus', open);
    li.addEventListener('focusout', (e) => { if (!li.contains(e.relatedTarget)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') li.classList.remove('mega-open'); });
  }

  const phoneIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/></svg>';
  const collIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>';
  const customIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 13.8 10.2 21 12 13.8 13.8 12 21 10.2 13.8 3 12 10.2 10.2Z"/></svg>';
  const casesTrigger = nav.querySelector('.nav-links a[href*="iphone-cases"]');
  attach(casesTrigger, 'mega-menu-cases', `
    <div class="mega-inner mega-cases">
      <div class="mega-rail">
        <button class="mega-rail-item active" data-panel="iphone" type="button">
          <span class="mega-rail-ico">${phoneIco}</span><span class="mega-rail-label">Shop by iPhone</span><span class="mega-rail-arrow">&rsaquo;</span>
        </button>
        <button class="mega-rail-item" data-panel="collection" type="button">
          <span class="mega-rail-ico">${collIco}</span><span class="mega-rail-label">Shop by Collection</span><span class="mega-rail-arrow">&rsaquo;</span>
        </button>
        <button class="mega-rail-item" data-panel="custom" type="button">
          <span class="mega-rail-ico">${customIco}</span><span class="mega-rail-label">Custom Portrait</span><span class="mega-rail-arrow">&rsaquo;</span>
        </button>
      </div>
      <div class="mega-panels">
        <div class="mega-panel active" data-panel="iphone">
          <div class="mega-series-grid">
            ${SERIES.map(s => `<div class="mega-series">
              <p class="mega-series-name">${s.name}</p>
              ${s.models.map(m => `<a class="mega-link" href="/collections/${m[1]}-cases">${m[0]}</a>`).join('')}
            </div>`).join('')}
          </div>
          <a class="mega-seeall" href="/collections/iphone-cases">See all iPhone cases &rarr;</a>
        </div>
        <div class="mega-panel" data-panel="collection">
          <div class="mega-split">
            <div class="mega-coll-stack">
              <a class="mega-coll-card" href="/collections/noble-steed">
                <span class="mega-coll-name">Noble Steed</span>
                <span class="mega-coll-sub">Artist equestrian portraits &middot; 10 colourways</span>
              </a>
              <a class="mega-coll-card" href="/collections/riders-motto">
                <span class="mega-coll-name">The Rider&rsquo;s Motto</span>
                <span class="mega-coll-sub">Quote editions &middot; 7 colourways</span>
              </a>
            </div>
            <a class="mega-img-fill" href="/collections/iphone-cases" aria-label="Shop all iPhone cases">
              <img data-src="/images/cavalry-lifestyle.jpg" alt="Velvet &amp; Valor equestrian lifestyle" />
            </a>
          </div>
        </div>
        <div class="mega-panel" data-panel="custom">
          <div class="mega-split">
            <a class="mega-custom" href="/custom">
              <span class="mega-coll-kicker">Most popular &middot; Bespoke</span>
              <span class="mega-custom-title">Your Horse. Your Custom Case.</span>
              <span class="mega-custom-text">Send us a photo and our artists turn your own horse into a one-of-one portrait case, made to order for any iPhone.</span>
              <span class="mega-custom-cta">Create your custom case &rarr;</span>
            </a>
            <a class="mega-img-fill" href="/custom" aria-label="Create your custom case">
              <img data-src="/images/custom-case-prompt.jpg" alt="Custom horse portrait phone case with monogram" />
            </a>
          </div>
        </div>
      </div>
    </div>`, 'iPhone cases menu');

  const giftsTrigger = nav.querySelector('.nav-links a[href$="/gifts"]');
  attach(giftsTrigger, 'mega-menu-gifts', `
    <div class="mega-inner mega-gifts">
      <div class="mega-gifts-list">
        <p class="mega-head">Gift guides</p>
        ${GIFTS.map(g => `<a class="mega-link" href="${g[1]}">${g[0]}</a>`).join('')}
        <a class="mega-link mega-link-all" href="/gifts">All gifts &rarr;</a>
      </div>
      <a class="mega-img-fill mega-gifts-img" href="/gifts/year-of-the-horse" aria-label="Year of the Horse 2026 gift edit">
        <img data-src="/images/cavalry-hero.jpg" alt="Velvet &amp; Valor horse iPhone case, gift-ready" />
        <span class="mega-img-cap">
          <span class="mega-img-cap-kicker">2026 &middot; Fire Horse</span>
          <span class="mega-img-cap-title">Year of the Horse edit &rarr;</span>
        </span>
      </a>
    </div>`, 'Gifts menu');
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


/* ── Newsletter signup forms ─────────────────────────────────────
   Note: the homepage .mid-cta-form is handled in home.js — only handle
   .newsletter-form here to avoid double submissions. */
(function initNewsletter() {
  const forms = document.querySelectorAll('.newsletter-form');
  forms.forEach((form) => {
    const btn = form.querySelector('.newsletter-btn, button[type="submit"], button');
    const input = form.querySelector('.newsletter-input, input[type="email"]');
    const doneLabel = 'Subscribed ✓';
    const restoreLabel = btn ? btn.textContent : '';

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = input ? input.value.trim() : '';
      if (email) {
        fetch('/api/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'newsletter', email: email, source: form.className }),
        }).catch(() => {});
      }
      if (btn) { btn.textContent = doneLabel; btn.style.background = '#1A3A1A'; btn.style.color = '#6EC46E'; }
      if (input) { input.value = ''; input.disabled = true; }
      setTimeout(() => {
        if (btn) { btn.textContent = restoreLabel; btn.style.background = ''; btn.style.color = ''; }
        if (input) input.disabled = false;
      }, 4000);
    });
  });
})();
