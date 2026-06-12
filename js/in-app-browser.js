/**
 * Velvet & Valor — In-App Browser Detector + Checkout Guard
 *
 * Detects Instagram / Facebook / TikTok / Snapchat / LinkedIn / Twitter
 * in-app browsers (WebViews) and:
 *
 *   1. Shows a soft top banner on page load asking the user to switch
 *      to their main browser (Safari / Chrome) before checkout.
 *
 *   2. HARD-BLOCKS the checkout button itself when clicked from inside
 *      an in-app browser. Stripe Checkout reliably breaks in IG/FB/TikTok
 *      WebViews (blank pages, failed 3DS redirects, broken Apple Pay) and
 *      we can't risk customers tapping "Buy" only to lose them to a blank
 *      page. The block-modal can't be dismissed away — the only paths
 *      forward are "Open in real browser" (with a deep-link attempt) or
 *      "Copy link".
 *
 * Exposed on window:
 *   - window.vvIsInAppBrowser  → boolean
 *   - window.vvOpenExternal()  → attempt platform-appropriate deep-link
 */
(function () {
  'use strict';

  function isInAppBrowser() {
    var ua = navigator.userAgent || navigator.vendor || '';
    return /Instagram|FBAN|FBAV|FB_IAB|FB4A|FBIOS|Snapchat|LinkedInApp|Twitter|Pinterest|Line\/|KAKAOTALK|TikTok|Musically|MicroMessenger/i.test(ua);
  }

  function detectPlatform() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'other';
  }

  // Expose flag early so other scripts can read it
  window.vvIsInAppBrowser = isInAppBrowser();

  // Bail out if not in an in-app browser
  if (!window.vvIsInAppBrowser) return;

  var platform = detectPlatform();
  var currentUrl = window.location.href;

  /* ── Deep-link attempt: try to pop the user into Safari / Chrome ── */
  function openExternal() {
    if (platform === 'android') {
      // Chrome intent: forces the system to open the URL in Chrome.
      // If Chrome isn't installed, S.browser_fallback_url falls back to
      // the system browser chooser.
      var noScheme = currentUrl.replace(/^https?:\/\//, '');
      var intent = 'intent://' + noScheme +
        '#Intent;scheme=https;package=com.android.chrome;' +
        'S.browser_fallback_url=' + encodeURIComponent(currentUrl) + ';end';
      window.location.href = intent;
      return true;
    }
    if (platform === 'ios') {
      // x-safari-https:// jump-out works inside Instagram, FB, and most
      // other iOS WebViews. If it silently fails the modal stays open
      // and "Copy link" is still available.
      var safariUrl = currentUrl.replace(/^https?:\/\//, 'x-safari-https://');
      window.location.href = safariUrl;
      return true;
    }
    return false;
  }
  window.vvOpenExternal = openExternal;

  /* ── Copy current URL to clipboard (used by both banner & modal) ── */
  function copyUrl(btn, originalText) {
    function done() {
      btn.textContent = 'Copied ✓';
      setTimeout(function () { btn.textContent = originalText; }, 1800);
    }
    function fail() {
      btn.textContent = 'Hold ' + (platform === 'ios' ? 'address bar' : 'URL') + ' to copy';
      setTimeout(function () { btn.textContent = originalText; }, 2500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentUrl).then(done).catch(fail);
    } else {
      try {
        var ta = document.createElement('textarea');
        ta.value = currentUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      } catch (e) { fail(); }
    }
  }

  /* ============================================================
     SOFT BANNER — shown on page load, dismissible
     ============================================================ */
  function buildBanner() {
    // Banner can be dismissed for the session; the modal will still
    // catch them at checkout if they ignore it.
    try { if (sessionStorage.getItem('vv_iab_dismissed') === '1') return; } catch (e) {}

    var iosLine = 'Tap the <strong>···</strong> menu at the top right, then choose <strong>"Open in browser"</strong> or <strong>"Open in Safari"</strong>.';
    var androidLine = 'Tap the <strong>⋮</strong> menu at the top right, then choose <strong>"Open in Chrome"</strong> or <strong>"Open in browser"</strong>.';
    var fallbackLine = 'Tap the menu icon in this browser and select <strong>Open in your main browser</strong>.';
    var instruction = platform === 'ios' ? iosLine : platform === 'android' ? androidLine : fallbackLine;

    var html =
      '<div id="vv-iab-banner" role="dialog" aria-live="polite" aria-label="Open in browser for best experience">' +
        '<div class="vv-iab-inner">' +
          '<button class="vv-iab-close" aria-label="Dismiss">&times;</button>' +
          '<div class="vv-iab-content">' +
            '<p class="vv-iab-title">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/>' +
              '</svg>' +
              '<span>For the smoothest checkout experience</span>' +
            '</p>' +
            '<p class="vv-iab-body">' + instruction + '</p>' +
            '<div class="vv-iab-actions">' +
              '<button class="vv-iab-copy" type="button">Copy link</button>' +
              '<button class="vv-iab-dismiss" type="button">Continue here</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);

    function dismiss() {
      var b = document.getElementById('vv-iab-banner');
      if (!b) return;
      b.classList.add('vv-iab-leaving');
      try { sessionStorage.setItem('vv_iab_dismissed', '1'); } catch (e) {}
      setTimeout(function () { b.parentNode && b.parentNode.removeChild(b); }, 280);
    }

    document.querySelector('.vv-iab-close').addEventListener('click', dismiss);
    document.querySelector('.vv-iab-dismiss').addEventListener('click', dismiss);
    document.querySelector('.vv-iab-copy').addEventListener('click', function () {
      copyUrl(this, 'Copy link');
    });
  }

  /* ============================================================
     HARD MODAL — shown when user tries to check out
     Not dismissible. Only paths: Open externally / Copy link.
     ============================================================ */
  function buildBlockModal() {
    if (document.getElementById('vv-iab-modal')) return;

    var openBtnLabel = platform === 'ios' ? 'Open in Safari' :
                       platform === 'android' ? 'Open in Chrome' :
                       'Open in browser';

    var iosFallback = 'If that didn\'t switch browsers automatically: tap the <strong>···</strong> at the top right, then <strong>"Open in Safari"</strong>.';
    var androidFallback = 'If that didn\'t switch browsers automatically: tap the <strong>⋮</strong> at the top right, then <strong>"Open in Chrome"</strong>.';
    var otherFallback = 'Use your browser\'s menu to open this page in your main browser.';
    var fallbackHtml = platform === 'ios' ? iosFallback :
                      platform === 'android' ? androidFallback :
                      otherFallback;

    var html =
      '<div id="vv-iab-modal" role="dialog" aria-modal="true" aria-labelledby="vv-iab-modal-title">' +
        '<div class="vv-iab-modal-card">' +
          '<div class="vv-iab-modal-icon" aria-hidden="true">' +
            '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M15 3h6v6"/><path d="M10 14L21 3"/>' +
              '<path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>' +
            '</svg>' +
          '</div>' +
          '<h2 id="vv-iab-modal-title" class="vv-iab-modal-title">One quick step before checkout</h2>' +
          '<p class="vv-iab-modal-body">Secure card payment doesn\'t work reliably inside Instagram\'s in-app browser. Please open this page in <strong>' +
          (platform === 'ios' ? 'Safari' : platform === 'android' ? 'Chrome' : 'your main browser') +
          '</strong> to complete your order safely.</p>' +
          '<div class="vv-iab-modal-actions">' +
            '<button class="vv-iab-modal-open" type="button">' + openBtnLabel + ' →</button>' +
            '<button class="vv-iab-modal-copy" type="button">Copy link instead</button>' +
          '</div>' +
          '<p class="vv-iab-modal-hint">' + fallbackHtml + '</p>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);

    document.querySelector('.vv-iab-modal-open').addEventListener('click', function () {
      openExternal();
    });
    document.querySelector('.vv-iab-modal-copy').addEventListener('click', function () {
      copyUrl(this, 'Copy link instead');
    });

    // Lock body scroll while modal is open
    document.body.style.overflow = 'hidden';
  }

  /* ── Capture-phase intercept on checkout actions ────────────── */
  function installCheckoutGuard() {
    function shouldBlock(target) {
      if (!target || !target.closest) return false;
      // Buy Now button (product page + Rider's Motto variants)
      if (target.closest('#buyNow')) return true;
      // Custom order page submit
      if (target.closest('#customSubmit')) return true;
      return false;
    }

    document.addEventListener('click', function (e) {
      if (!shouldBlock(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      buildBlockModal();
    }, true); // capture-phase so we win against page-level handlers

    // Custom page submits via form submit — catch that too
    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (form && form.id === 'customForm') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        buildBlockModal();
      }
    }, true);
  }

  function init() {
    buildBanner();
    installCheckoutGuard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
