/**
 * Velvet & Valor — In-App Browser prompt
 *
 * When loaded inside Instagram / Facebook / TikTok / etc. WebViews,
 * shows a small unobtrusive top strip pointing customers at the ⋯
 * menu to open in their real browser. No overlay, no button,
 * no dismiss — just a quiet single-line prompt.
 */
(function () {
  'use strict';

  var IAB_REGEX = /Instagram|FBAN|FBAV|FB_IAB|FB4A|FBIOS|Snapchat|LinkedInApp|Twitter|Pinterest|Line\/|KAKAOTALK|TikTok|Musically|MicroMessenger/i;
  var ua = navigator.userAgent || navigator.vendor || '';
  var inApp = IAB_REGEX.test(ua);

  window.vvIsInAppBrowser = inApp;
  window.vvGoToCheckout = function (url) {
    if (url) window.location.href = url;
  };

  if (!inApp) return;

  function mount() {
    if (document.getElementById('vv-iab-strip')) return;

    var style = document.createElement('style');
    style.textContent = [
      '#vv-iab-strip{position:fixed;top:0;left:0;right:0;z-index:2147483647;',
      'background:#0a0f19;color:#f4ecd8;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '-webkit-font-smoothing:antialiased;',
      'padding:10px 16px;text-align:center;font-size:0.82rem;line-height:1.4;',
      'border-bottom:1px solid rgba(200,164,92,0.35);',
      'box-shadow:0 2px 12px rgba(0,0,0,0.35);}',
      '#vv-iab-strip b{color:#c8a45c;font-weight:700;letter-spacing:0.02em;}',
      '#vv-iab-strip .vv-iab-dots{display:inline-block;font-weight:700;',
      'padding:0 2px;color:#c8a45c;}',
      'body.vv-iab-active{padding-top:44px !important;}',
      '@media (max-width:400px){',
      '#vv-iab-strip{font-size:0.76rem;padding:9px 12px;}',
      'body.vv-iab-active{padding-top:42px !important;}',
      '}'
    ].join('');
    document.head.appendChild(style);

    var strip = document.createElement('div');
    strip.id = 'vv-iab-strip';
    strip.setAttribute('role', 'status');
    strip.innerHTML =
      'For the best shopping experience, tap <span class="vv-iab-dots">&middot;&middot;&middot;</span> above and choose <b>Open in External Browser</b>.';
    document.body.appendChild(strip);
    document.body.classList.add('vv-iab-active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
