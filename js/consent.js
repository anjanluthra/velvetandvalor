/* ============================================================
   VELVET & VALOR — Cookie Consent + Conditional Tracking
   Loads Microsoft Clarity & GA4 only after user accepts.
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'vv_cookie_consent_v1';
  var GA4_ID = 'G-HEE1L1XD1K';
  var CLARITY_ID = 'wlcdwpd1dv';

  function getConsent() {
    try { return localStorage.getItem(STORAGE_KEY); }
    catch (e) { return null; }
  }
  function setConsent(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
  }

  /* ── Tracker loaders ──────────────────────────────────────── */
  function loadGA4() {
    if (window.__vvGa4Loaded) return;
    window.__vvGa4Loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA4_ID);
  }

  function loadClarity() {
    if (window.__vvClarityLoaded) return;
    window.__vvClarityLoaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
  }

  function loadTrackers() {
    loadGA4();
    loadClarity();
  }

  /* ── Banner ───────────────────────────────────────────────── */
  function hideBanner() {
    var b = document.getElementById('vv-cookie-banner');
    if (b) {
      b.classList.add('vv-cookie-leaving');
      setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 280);
    }
  }

  function showBanner() {
    if (document.getElementById('vv-cookie-banner')) return;
    var html =
      '<div id="vv-cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie preferences">' +
        '<div class="vv-cookie-inner">' +
          '<p class="vv-cookie-text">' +
            'We use cookies to enhance your experience and understand how you use our site. ' +
            '<a href="/cookies">Learn more</a>.' +
          '</p>' +
          '<div class="vv-cookie-actions">' +
            '<button type="button" class="vv-cookie-btn vv-cookie-reject" aria-label="Reject non-essential cookies">Reject</button>' +
            '<button type="button" class="vv-cookie-btn vv-cookie-accept" aria-label="Accept all cookies">Accept All</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);

    document.querySelector('.vv-cookie-accept').addEventListener('click', function () {
      setConsent('accepted');
      hideBanner();
      loadTrackers();
    });
    document.querySelector('.vv-cookie-reject').addEventListener('click', function () {
      setConsent('rejected');
      hideBanner();
    });
  }

  /* ── Public API: re-open banner from a "Manage cookies" link ── */
  window.vvOpenCookieSettings = function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    showBanner();
  };

  /* ── Init ─────────────────────────────────────────────────── */
  var consent = getConsent();
  if (consent === 'accepted') {
    loadTrackers();
  } else if (consent === 'rejected') {
    // honour their choice — no tracking
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
