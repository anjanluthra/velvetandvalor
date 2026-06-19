/* ============================================================
   VELVET & VALOR — Homepage JavaScript
   Marquee, popup, mobile menu
   ============================================================ */

'use strict';

/* ── Marquee Pause on Hover ─────────────────────────────────── */
(function initMarquee() {
  const track = document.querySelector('.marquee-track');
  const marquee = document.querySelector('.marquee');
  if (!track || !marquee) return;

  marquee.addEventListener('mouseenter', () => {
    track.style.animationPlayState = 'paused';
  });
  marquee.addEventListener('mouseleave', () => {
    track.style.animationPlayState = 'running';
  });
})();


/* ── Email Popup ───────────────────────────────────────────────── */
(function initPopup() {
  const overlay = document.getElementById('emailPopup');
  const closeBtn = document.getElementById('popupClose');
  const form = document.getElementById('popupForm');
  if (!overlay) return;

  const POPUP_KEY = 'vv_popup_dismissed';

  // Storage helpers — Safari private mode throws on access
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // Don't show if already dismissed
  if (safeGet(POPUP_KEY)) return;

  // Show after 4 seconds
  const timer = setTimeout(() => {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
  }, 4000);

  function closePopup() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    safeSet(POPUP_KEY, 'true');
    clearTimeout(timer);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closePopup);
  }

  // Close on overlay click (not box)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePopup();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closePopup();
    }
  });

  // Handle form submit
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('.popup-input');
      if (input && input.value) {
        form.innerHTML = '<p style="color: var(--gold); font-weight: 600; font-size: 1rem; padding: 16px 0;">Your code: <strong>VELVET10</strong><br><span style="font-weight: 400; font-size: 0.85rem; color: var(--cream-muted); margin-top: 8px; display: block;">Use at checkout for 10% off</span></p>';
        setTimeout(closePopup, 3000);
      }
    });
  }
})();


/* Mobile menu toggle handled by main.js — removed duplicate handler that was
   double-toggling and immediately closing the menu. */


/* ── Scroll progress indicator (thin line at top) ────────────── */
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


/* ── Journal Waitlist Popup (triggered after newsletter signup) ── */
(function initJournalPopup() {
  const overlay = document.getElementById('journalPopup');
  const closeBtn = document.getElementById('journalPopupClose');
  const form = document.getElementById('journalPopupForm');
  if (!overlay) return;

  function showPopup() {
    try { if (localStorage.getItem('vv_journal_popup_dismissed')) return; } catch (e) {}
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
  }
  function closePopup() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    try { localStorage.setItem('vv_journal_popup_dismissed', '1'); } catch (e) {}
  }

  // Expose globally so other forms can trigger it
  window.showJournalPopup = showPopup;

  if (closeBtn) closeBtn.addEventListener('click', closePopup);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePopup(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closePopup();
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.innerHTML = '<p style="color: var(--gold); font-weight: 600; font-size: 1rem; padding: 16px 0;">You\u2019re on the waiting list!<br><span style="font-weight: 400; font-size: 0.85rem; color: var(--cream-muted); margin-top: 8px; display: block;">We\u2019ll let you know as soon as it launches.</span></p>';
      setTimeout(closePopup, 3000);
    });
  }

  // Trigger after newsletter form submission
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.classList && form.classList.contains('newsletter-form')) {
      setTimeout(showPopup, 1500);
    }
    if (form.id === 'popupForm' || form.classList.contains('mid-cta-form')) {
      setTimeout(showPopup, 2500);
    }
  });
})();


/* ── Journal Homepage Form ─────────────────────────────────────── */
(function initJournalForm() {
  const form = document.getElementById('journalWaitlistForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.innerHTML = '<p style="color: var(--gold); font-weight: 600; font-size: 1.125rem; padding: 12px 0;">You\u2019re on the waiting list! \u2728<br><span style="font-weight: 400; font-size: 0.9rem; color: var(--cream-muted); margin-top: 8px; display: block;">We\u2019ll be in touch when The Equestrian Journal launches.</span></p>';
  });
})();


/* ── Hero rotating testimonial bubble ─────────────────────────────
   Cycles through customer reviews every ~7s so visitors see social
   proof above the fold (before they scroll to the full testimonials
   section further down the page). */
(function () {
  'use strict';
  const wrap = document.getElementById('heroTestimonialBubble');
  if (!wrap) return;
  const items = wrap.querySelectorAll('.hero-testimonial-item');
  const dots = wrap.querySelectorAll('.hero-testimonial-dot');
  if (items.length < 2) return;

  // Respect prefers-reduced-motion: leave the first review on, do not cycle.
  const mql = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mql && mql.matches) return;

  let idx = 0;
  const ROTATE_MS = 7000;

  function show(i) {
    items.forEach((el, n) => el.classList.toggle('is-active', n === i));
    dots.forEach((el, n) => el.classList.toggle('is-active', n === i));
  }

  let timer = window.setInterval(() => {
    idx = (idx + 1) % items.length;
    show(idx);
  }, ROTATE_MS);

  // Pause when the tab is hidden so it doesn't drift on resume
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearInterval(timer);
      timer = null;
    } else if (!timer) {
      timer = window.setInterval(() => {
        idx = (idx + 1) % items.length;
        show(idx);
      }, ROTATE_MS);
    }
  });
})();
