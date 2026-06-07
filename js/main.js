/* ============================================================
   VELVET & VALOR — Shared JavaScript
   Custom cursor, nav, scroll reveal, grain
   ============================================================ */

'use strict';

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


/* ── Navigation (smart-sticky: hide on scroll-down, show on scroll-up) ─ */
(function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 50);

    // Smart-sticky: only on mobile (≤768px) — hide nav when user scrolls down,
    // show it again when user scrolls up even a few pixels.
    if (window.innerWidth <= 768) {
      const goingDown = y > lastY;
      // Pad against tiny jitter
      if (Math.abs(y - lastY) > 4) {
        if (goingDown && y > 120) {
          nav.classList.add('nav-hidden');
          // Also close the mobile menu when nav hides
          const menu = document.querySelector('.nav-mobile-menu');
          const toggle = document.querySelector('.nav-mobile-toggle');
          if (menu && menu.classList.contains('open')) {
            menu.classList.remove('open');
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
          }
        } else {
          nav.classList.remove('nav-hidden');
        }
        lastY = y;
      }
    } else {
      nav.classList.remove('nav-hidden');
    }
  }

  function tick() {
    if (!ticking) {
      window.requestAnimationFrame(() => { onScroll(); ticking = false; });
      ticking = true;
    }
  }

  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick, { passive: true });
  onScroll(); // run on init
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
