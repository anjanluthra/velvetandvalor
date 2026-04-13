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

  // Don't show if already dismissed
  if (localStorage.getItem(POPUP_KEY)) return;

  // Show after 4 seconds
  const timer = setTimeout(() => {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
  }, 4000);

  function closePopup() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    localStorage.setItem(POPUP_KEY, 'true');
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


/* ── Journal Waitlist Popup ────────────────────────────────────── */
(function initJournalPopup() {
  const overlay = document.getElementById('journalPopup');
  const closeBtn = document.getElementById('journalPopupClose');
  const form = document.getElementById('journalPopupForm');
  if (!overlay) return;

  const dismissed = localStorage.getItem('vv_journal_popup_dismissed');
  if (dismissed) return;

  function showPopup() { overlay.classList.add('active'); overlay.setAttribute('aria-hidden', 'false'); }
  function closePopup() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    localStorage.setItem('vv_journal_popup_dismissed', '1');
  }

  // Show after 12 seconds (after discount popup has closed)
  setTimeout(showPopup, 12000);

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
