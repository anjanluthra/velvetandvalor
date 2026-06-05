/**
 * Velvet & Valor — In-App Browser Detector
 *
 * Detects Instagram / Facebook / TikTok / Snapchat / LinkedIn / Twitter
 * in-app browsers (WebViews) and shows a polite banner asking the user to
 * open the site in their main browser (Safari / Chrome) before checkout.
 *
 * Why: these in-app browsers have severe issues with Stripe Checkout:
 *  - Pull-to-refresh blanks the page
 *  - Apple Pay / Google Pay often fail
 *  - Payment form autofill broken
 *  - Back-button bounces users out of checkout into the social app
 *
 * Strategy:
 *  - On first visit in an in-app browser → show top banner + 'Open in Safari' CTA
 *  - User can dismiss; preference saved to sessionStorage
 *  - Also blocks pull-to-refresh behaviour with overscroll CSS (in style.css)
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

  // Bail out if not in an in-app browser
  if (!isInAppBrowser()) return;
  // Bail if user already dismissed this session
  try { if (sessionStorage.getItem('vv_iab_dismissed') === '1') return; } catch (e) {}

  var platform = detectPlatform();
  var currentUrl = window.location.href;

  function buildBanner() {
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
      var btn = this;
      var original = btn.textContent;
      function done() { btn.textContent = 'Copied ✓'; setTimeout(function () { btn.textContent = original; }, 1800); }
      function fail() { btn.textContent = 'Hold ' + (platform === 'ios' ? 'address bar' : 'URL') + ' to copy'; setTimeout(function () { btn.textContent = original; }, 2500); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentUrl).then(done).catch(fail);
      } else {
        try {
          var ta = document.createElement('textarea');
          ta.value = currentUrl; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta);
          done();
        } catch (e) { fail(); }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildBanner);
  } else {
    buildBanner();
  }
})();
