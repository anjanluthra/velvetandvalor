/**
 * Velvet & Valor — In-App Browser Checkout Redirect
 *
 * Stripe Checkout doesn't work reliably inside Instagram/Facebook/TikTok
 * in-app browsers. We try to silently relaunch the Stripe Checkout URL
 * in the customer's real browser (Safari on iOS, Chrome on Android).
 *
 * Key reliability detail: when the silent attempt fails (Apple has been
 * locking down x-safari-https:// in newer iOS), the fallback button is
 * a REAL anchor with the deep-link as its href — user-initiated taps on
 * anchors get OS-level navigation privileges that a JS-set
 * window.location.href doesn't have, so they actually open the scheme
 * handler. As a last-resort guarantee, a Copy-link button always works.
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

  /* Build the platform deep-link that opens `url` in the real browser. */
  function externalLink(url) {
    if (platform === 'ios') {
      // x-safari-https:// pops the user out of Instagram/FB into Safari
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

  /* Copy URL to clipboard. */
  function copyToClipboard(text, btn, originalLabel) {
    function done() {
      btn.textContent = '✓ Copied — paste in Safari';
      setTimeout(function () { btn.textContent = originalLabel; }, 2400);
    }
    function fail() {
      btn.textContent = 'Hold the address bar to copy';
      setTimeout(function () { btn.textContent = originalLabel; }, 2400);
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
    var deepLink = externalLink(targetUrl);
    var menuLine = platform === 'ios'
      ? 'Or tap the <strong>···</strong> at the top right of Instagram → <strong>"Open in Safari"</strong>'
      : platform === 'android'
      ? 'Or tap the <strong>⋮</strong> at the top right → <strong>"Open in Chrome"</strong>'
      : 'Or use your browser\'s menu to open this page in your main browser';

    // Note: the fallback button is a real <a href="deep-link"> with no
    // preventDefault on click, so the user-initiated tap is processed by
    // the OS as a true scheme navigation (works where JS-set
    // location.href silently fails on iOS 17+).
    var html =
      '<div id="vv-checkout-overlay" role="status" aria-live="polite">' +
        '<div class="vv-co-card">' +
          '<div class="vv-co-spinner" aria-hidden="true"></div>' +
          '<p class="vv-co-title">Opening secure checkout…</p>' +
          '<p class="vv-co-sub">Switching to ' + browserLabel + ' for safe payment</p>' +
          '<div class="vv-co-actions">' +
            '<a id="vv-co-open" class="vv-co-open" href="' + deepLink + '">Open in ' + browserLabel + ' →</a>' +
            '<button id="vv-co-copy" class="vv-co-copy" type="button">Copy link instead</button>' +
            '<p class="vv-co-hint">' + menuLine + '</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.body.style.overflow = 'hidden';

    var copyBtn = document.getElementById('vv-co-copy');
    copyBtn.addEventListener('click', function () {
      copyToClipboard(targetUrl, copyBtn, 'Copy link instead');
    });

    // Surface the fallback action set after a short delay (the silent
    // attempt should have succeeded by then if it's going to). 1.2s
    // feels instant for success cases, and quick recovery for failures.
    setTimeout(function () {
      var actions = document.querySelector('.vv-co-actions');
      if (actions) actions.classList.add('vv-co-actions-show');
    }, 1200);
  }

  /* ── Public helper — wired into all Buy/Submit handlers ────── */
  window.vvGoToCheckout = function (stripeUrl) {
    if (!stripeUrl) return;
    if (!inApp) {
      // Normal browser: straight to Stripe
      window.location.href = stripeUrl;
      return;
    }
    // In-app browser: show overlay first (so user sees something happen),
    // then fire silent deep-link. If that fails, the user can tap the
    // visible "Open in Safari" anchor for a privileged retry.
    showOverlay(stripeUrl);
    setTimeout(function () {
      try { window.location.href = externalLink(stripeUrl); } catch (e) {}
    }, 80);
  };
})();
