/**
 * Velvet & Valor — In-App Browser Checkout Redirect
 *
 * Stripe Checkout doesn't work reliably inside Instagram/Facebook/TikTok
 * in-app browsers (blank pages, broken 3DS, no Apple Pay). Rather than
 * asking the customer to take action, we silently relaunch the Stripe
 * Checkout URL in their real browser (Safari on iOS, Chrome on Android)
 * the moment they tap Buy.
 *
 * How:
 *   - Detect in-app browser via UA on page load → window.vvIsInAppBrowser
 *   - Each Buy/Submit handler in product.js / custom.js / riders-motto.js
 *     calls window.vvGoToCheckout(stripeUrl) instead of setting
 *     window.location.href directly.
 *   - In a real browser, that helper just does location.href = url.
 *   - In an in-app browser, it instead fires x-safari-https:// (iOS) or
 *     intent:// with the Chrome package (Android), so the customer lands
 *     directly inside Stripe Checkout in their real browser, on Safari /
 *     Chrome, where 3DS + Apple Pay work properly.
 *   - A small "Opening secure checkout…" overlay shows during the hop
 *     so it doesn't feel like a frozen tap. A safety-net "Tap to
 *     continue" button surfaces after ~2.5s in case the OS blocked the
 *     scheme jump silently.
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

  /* Build deep-link URL that opens `url` in the real browser. */
  function externalLink(url) {
    if (platform === 'ios') {
      // x-safari-https:// pops the user out of Instagram/FB/TikTok into Safari
      return url.replace(/^https?:\/\//, 'x-safari-https://');
    }
    if (platform === 'android') {
      // Chrome intent with fallback to system browser chooser
      var noScheme = url.replace(/^https?:\/\//, '');
      return 'intent://' + noScheme +
        '#Intent;scheme=https;package=com.android.chrome;' +
        'S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
    }
    return url;
  }

  function showOverlay(targetUrl) {
    if (document.getElementById('vv-checkout-overlay')) return;
    var label = platform === 'ios' ? 'Safari' :
                platform === 'android' ? 'Chrome' :
                'your browser';
    var html =
      '<div id="vv-checkout-overlay" role="status" aria-live="polite">' +
        '<div class="vv-co-card">' +
          '<div class="vv-co-spinner" aria-hidden="true"></div>' +
          '<p class="vv-co-title">Opening secure checkout…</p>' +
          '<p class="vv-co-sub">Switching to ' + label + ' for safe payment</p>' +
          '<a id="vv-co-fallback" class="vv-co-fallback" href="#" role="button">Tap to continue</a>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.body.style.overflow = 'hidden';

    var fallback = document.getElementById('vv-co-fallback');
    fallback.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = externalLink(targetUrl);
    });

    // If the silent redirect didn't pull them out within ~2.5s, surface
    // a one-tap button. Lots of iOS Instagram updates have inconsistent
    // x-safari-https:// behaviour; this is the safety net.
    setTimeout(function () {
      fallback.classList.add('vv-co-fallback-show');
    }, 2500);
  }

  /* ── Public helper used by Buy/Submit handlers ─────────────── */
  window.vvGoToCheckout = function (stripeUrl) {
    if (!stripeUrl) return;
    if (!inApp) {
      // Normal browser: straight to Stripe
      window.location.href = stripeUrl;
      return;
    }
    // In-app browser: show overlay, fire deep-link directly to Stripe
    showOverlay(stripeUrl);
    // Use a microtask delay so the overlay paints before navigation
    setTimeout(function () {
      window.location.href = externalLink(stripeUrl);
    }, 60);
  };
})();
