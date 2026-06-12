/**
 * Velvet & Valor — In-App Browser Checkout Redirect
 *
 * Stripe Checkout doesn't work reliably inside Instagram/Facebook/TikTok
 * in-app browsers. Apple has locked down custom-scheme escape routes
 * (x-safari-https://) in recent iOS, so there is NO reliable JS-only
 * way to pop the user out into Safari.
 *
 * Strategy: when the customer taps Buy from inside an in-app browser,
 * immediately show them a clear, visual instruction with the exact
 * tap-path to Safari, plus a Copy-link button as a guaranteed fallback.
 * No spinner, no waiting, no "switching for you" promises we can't keep.
 *
 * We do still fire the deep-link attempt in the background — if it
 * happens to work on the customer's iOS version, great; if not, the
 * instructions are right in front of them.
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
      btn.textContent = '✓ Link copied — paste into Safari';
      setTimeout(function () { btn.textContent = originalLabel; }, 3000);
    }
    function fail() {
      btn.textContent = 'Press & hold the address bar above to copy';
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

  function showOverlay(targetUrl) {
    if (document.getElementById('vv-checkout-overlay')) return;

    var browserLabel = platform === 'ios' ? 'Safari' :
                       platform === 'android' ? 'Chrome' :
                       'your browser';
    var menuChar = platform === 'ios' ? '···' : '⋮';
    var deepLink = externalLink(targetUrl);

    // Plain, urgent instruction — no "we're switching" promise that may
    // fail. The visual arrow points to the top-right of the WebView
    // where Instagram/Facebook/TikTok all put their menu.
    var html =
      '<div id="vv-checkout-overlay" role="dialog" aria-modal="true">' +
        // Arrow pinned to top-right pointing at the IG menu
        '<div class="vv-co-arrow" aria-hidden="true">' +
          '<div class="vv-co-arrow-icon">↗</div>' +
          '<div class="vv-co-arrow-label">Tap ' + menuChar + ' up here</div>' +
        '</div>' +
        '<div class="vv-co-card">' +
          '<h2 class="vv-co-title">One quick step to pay securely</h2>' +
          '<ol class="vv-co-steps">' +
            '<li><strong>Tap ' + menuChar + '</strong> at the top right of this screen</li>' +
            '<li>Choose <strong>"Open in ' + browserLabel + '"</strong></li>' +
            '<li>Your order will be waiting — finish payment in seconds</li>' +
          '</ol>' +
          '<button id="vv-co-copy" class="vv-co-copy" type="button">Or copy checkout link</button>' +
          '<a id="vv-co-open" class="vv-co-open-link" href="' + deepLink + '">Try auto-open in ' + browserLabel + '</a>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.body.style.overflow = 'hidden';

    var copyBtn = document.getElementById('vv-co-copy');
    copyBtn.addEventListener('click', function () {
      copyToClipboard(targetUrl, copyBtn, 'Or copy checkout link');
    });
  }

  /* ── Public helper — wired into all Buy/Submit handlers ────── */
  window.vvGoToCheckout = function (stripeUrl) {
    if (!stripeUrl) return;
    if (!inApp) {
      window.location.href = stripeUrl;
      return;
    }
    // In-app: instant instruction overlay, then fire silent escape
    // attempt in background (it may work on some iOS/Android versions).
    showOverlay(stripeUrl);
    try { window.location.href = externalLink(stripeUrl); } catch (e) {}
  };
})();
