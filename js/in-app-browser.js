/**
 * Velvet & Valor — In-App Browser Escape
 *
 * Two-layer strategy to stop losing Instagram customers at checkout:
 *
 *   LAYER 1 (page load): the moment we detect an in-app browser we
 *   show a sticky top banner prompting the customer to open the
 *   current URL in Safari BEFORE they add to cart. This is the fix
 *   for the previous flow where customers browsed + built a cart in
 *   Instagram, then hit an "Open in Safari" wall at checkout — and
 *   when they switched browsers, Safari opened the product URL (not
 *   Stripe), forcing them to redo the whole flow.
 *
 *   With the top banner, they switch to Safari at the START, so the
 *   entire browse → cart → checkout flow happens in a real browser
 *   and Stripe just works.
 *
 *   LAYER 2 (checkout tap safety net): if the customer dismissed the
 *   banner and hits Buy Now inside the in-app browser anyway, we
 *   still show the old overlay with instructions + a Try-auto-open
 *   link targeting the Stripe URL directly.
 */
(function () {
  'use strict';

  var IAB_REGEX = /Instagram|FBAN|FBAV|FB_IAB|FB4A|FBIOS|Snapchat|LinkedInApp|Twitter|Pinterest|Line\/|KAKAOTALK|TikTok|Musically|MicroMessenger/i;

  function detectInApp() {
    var ua = navigator.userAgent || navigator.vendor || '';
    return IAB_REGEX.test(ua);
  }
  function detectPlatform() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'other';
  }

  var inApp = detectInApp();
  var platform = detectPlatform();
  window.vvIsInAppBrowser = inApp;

  /* Deep-link scheme that jumps to the OS default browser. On iOS
     x-safari-https:// is unreliable on iOS 17+, but user-initiated
     taps on an <a href="..."> still work more often than JS-set
     window.location.href does. On Android intent:// with the Chrome
     package fallback is very reliable. */
  function externalLink(url) {
    if (platform === 'ios') {
      return url.replace(/^https?:\/\//, 'x-safari-https://');
    }
    if (platform === 'android') {
      var noScheme = url.replace(/^https?:\/\//, '');
      return 'intent://' + noScheme +
        '#Intent;scheme=https;package=com.android.chrome;' +
        'S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
    }
    return url;
  }

  function copyToClipboard(text, btn, originalLabel) {
    function done() {
      btn.textContent = '✓ Link copied';
      setTimeout(function () { btn.textContent = originalLabel; }, 2500);
    }
    function fail() {
      btn.textContent = 'Press & hold the address bar to copy';
      setTimeout(function () { btn.textContent = originalLabel; }, 3000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fail);
    } else {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
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
     LAYER 1 — Sticky top banner on page load
     Prompts the customer to switch to Safari BEFORE they start
     browsing / adding to cart, so the whole flow happens in a
     real browser.
     ============================================================ */
  function buildTopBanner() {
    if (!inApp) return;
    // Respect a session-scoped dismissal so the banner isn't nagging
    // on every page nav. It re-appears in a new session.
    try {
      if (sessionStorage.getItem('vvIabBannerDismissed') === '1') return;
    } catch (e) { /* Safari private mode */ }

    var menuChar = platform === 'ios' ? '···' : '⋮';
    // iOS: no reliable JS scheme escape (Apple locked down
    // x-safari-https://), so we DON'T show an auto-open button —
    // the customer would tap it, nothing would happen, and they'd
    // think the site is broken. Instead we point them at IG's own
    // native menu with a bouncing arrow. Copy Link is the safe
    // fallback.
    // Android: intent:// with the Chrome package is reliable enough
    // to keep as a primary CTA.
    var showAutoOpenBtn = (platform === 'android');
    var deepLink = externalLink(window.location.href);

    var autoBtn = showAutoOpenBtn
      ? '<a class="vv-iab-open" href="' + deepLink + '">Open in Chrome</a>'
      : '';

    var html =
      '<div id="vv-iab-banner" role="region" aria-label="Required — Open in External Browser">' +
        '<div class="vv-iab-inner">' +
          '<div class="vv-iab-arrow" aria-hidden="true">' +
            '<span class="vv-iab-arrow-glyph">↗</span>' +
            '<span class="vv-iab-arrow-label">Tap ' + menuChar + ' up here</span>' +
          '</div>' +
          '<div class="vv-iab-text">' +
            '<strong>Checkout requires an external browser.</strong><br>' +
            'Tap the <strong>' + menuChar + ' menu</strong> at the top right of Instagram, then choose ' +
            '<strong>&ldquo;Open in External Browser&rdquo;</strong>.' +
          '</div>' +
          '<div class="vv-iab-actions">' +
            autoBtn +
            '<button class="vv-iab-copy" type="button" aria-label="Copy link">Copy link to paste in browser</button>' +
          '</div>' +
          '<a href="#" class="vv-iab-continue" role="button" aria-label="Continue browsing here — checkout will not work">Continue browsing here (checkout won\'t work)</a>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('afterbegin', html);
    document.body.classList.add('vv-iab-banner-active');

    var banner = document.getElementById('vv-iab-banner');
    var copyBtn = banner.querySelector('.vv-iab-copy');
    var continueLink = banner.querySelector('.vv-iab-continue');

    copyBtn.addEventListener('click', function () {
      copyToClipboard(window.location.href, copyBtn, 'Copy link to paste in browser');
    });
    continueLink.addEventListener('click', function (e) {
      e.preventDefault();
      banner.remove();
      document.body.classList.remove('vv-iab-banner-active');
      try { sessionStorage.setItem('vvIabBannerDismissed', '1'); } catch (e) {}
    });
  }

  /* ============================================================
     LAYER 2 — Safety-net overlay at checkout tap
     Fires from vvGoToCheckout() below when the customer dismissed
     the banner and hit Buy Now anyway. The overlay's Try-auto-open
     link targets the Stripe URL directly so if the deep-link fires,
     they land straight on payment.
     ============================================================ */
  function showCheckoutOverlay(stripeUrl) {
    if (document.getElementById('vv-checkout-overlay')) return;

    var menuChar = platform === 'ios' ? '···' : '⋮';
    // iOS: no reliable JS scheme escape. On Android intent:// works.
    var showAutoOpenBtn = (platform === 'android');
    var stripeDeepLink = externalLink(stripeUrl);
    var autoBtn = showAutoOpenBtn
      ? '<a id="vv-co-open" class="vv-co-open-primary" href="' + stripeDeepLink + '">Open Payment in Chrome</a>'
      : '';

    var html =
      '<div id="vv-checkout-overlay" role="dialog" aria-modal="true">' +
        '<div class="vv-co-card">' +
          '<div class="vv-iab-arrow vv-co-arrow-alt" aria-hidden="true">' +
            '<span class="vv-iab-arrow-glyph">↗</span>' +
            '<span class="vv-iab-arrow-label">Tap ' + menuChar + ' up here</span>' +
          '</div>' +
          '<h2 class="vv-co-title">Payment requires an external browser</h2>' +
          '<p class="vv-co-sub">Tap the <strong>' + menuChar + ' menu</strong> at the top right of Instagram, then choose ' +
            '<strong>&ldquo;Open in External Browser&rdquo;</strong> to complete payment securely.</p>' +
          autoBtn +
          '<button id="vv-co-copy" class="vv-co-copy" type="button">Or copy payment link to paste in browser</button>' +
          '<p class="vv-co-fallback">Your order details are saved &mdash; you\'ll pick right back up.</p>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.body.style.overflow = 'hidden';

    var copyBtn = document.getElementById('vv-co-copy');
    copyBtn.addEventListener('click', function () {
      copyToClipboard(stripeUrl, copyBtn, 'Or copy payment link');
    });
  }

  /* ============================================================
     Public helper called by every Buy/Submit handler
     ============================================================ */
  window.vvGoToCheckout = function (stripeUrl) {
    if (!stripeUrl) return;
    if (!inApp) {
      // Real browser — straight to Stripe.
      window.location.href = stripeUrl;
      return;
    }
    // In-app browser — show the safety-net overlay AND fire the
    // silent deep-link. If it works, the customer is jumped straight
    // to Stripe in Safari; if not, they've got the overlay controls.
    showCheckoutOverlay(stripeUrl);
    try { window.location.href = externalLink(stripeUrl); } catch (e) {}
  };

  /* Build the top banner as soon as the DOM is ready. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildTopBanner);
  } else {
    buildTopBanner();
  }
})();
