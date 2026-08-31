/**
 * Velvet & Valor — In-App Browser prompt
 *
 * Inside Instagram / Facebook / TikTok WebViews, show three simple
 * numbered instructions and an arrow pointing at Instagram's ⋯ menu.
 * No button (deep-link schemes are unreliable), no dismiss link.
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
    if (document.getElementById('vv-iab-panel')) return;

    var style = document.createElement('style');
    style.textContent = [
      '#vv-iab-panel,#vv-iab-panel *{box-sizing:border-box;text-transform:none !important;',
      'letter-spacing:normal !important;font-style:normal !important;}',

      '#vv-iab-panel{position:fixed;top:0;left:0;right:0;z-index:2147483647;',
      'background:#0a0f19;color:#f4ecd8;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '-webkit-font-smoothing:antialiased;',
      'padding:14px 20px 20px;',
      'border-bottom:1px solid rgba(200,164,92,0.35);',
      'box-shadow:0 6px 24px rgba(0,0,0,0.45);}',

      /* arrow anchored to top-right corner, pointing up-right at IG's ⋯ */
      '#vv-iab-arrow{position:absolute;top:-4px;right:14px;',
      'font-size:44px;line-height:1;color:#c8a45c;',
      'animation:vvArrowBob 1.1s ease-in-out infinite;',
      'pointer-events:none;transform-origin:center;}',

      '#vv-iab-arrow-label{position:absolute;top:52px;right:14px;',
      'font-size:0.62rem;letter-spacing:0.18em !important;text-transform:uppercase !important;',
      'color:#c8a45c;font-weight:700;text-align:right;line-height:1.2;',
      'pointer-events:none;}',

      /* main copy — three simple numbered steps */
      '#vv-iab-panel h2{margin:0 90px 12px 0;font-family:"Playfair Display",Georgia,serif;',
      'font-size:1rem;font-weight:600;color:#f4ecd8;line-height:1.3;}',

      '#vv-iab-steps{list-style:none;margin:0 90px 0 0;padding:0;}',
      '#vv-iab-steps li{display:flex;align-items:flex-start;gap:10px;',
      'margin:0 0 8px;font-size:0.86rem;line-height:1.4;',
      'color:rgba(244,236,216,0.94);}',
      '#vv-iab-steps li:last-child{margin-bottom:0;}',

      '#vv-iab-steps li b.num{display:inline-flex;align-items:center;justify-content:center;',
      'flex:0 0 22px;width:22px;height:22px;border-radius:50%;',
      'background:#c8a45c;color:#0a0f19;font-weight:700;font-size:0.78rem;}',

      '#vv-iab-steps code{font-family:-apple-system,sans-serif;font-weight:700;',
      'color:#c8a45c;letter-spacing:0.02em;padding:0 2px;}',

      /* push page content down so the panel doesn\'t hide it */
      'body.vv-iab-open{padding-top:210px !important;}',

      '@keyframes vvArrowBob{',
      '0%,100%{transform:translate(0,0) rotate(0deg);}',
      '50%{transform:translate(6px,-8px) rotate(0deg);}',
      '}',

      /* tighten on very small screens */
      '@media (max-width:380px){',
      '#vv-iab-panel{padding:12px 16px 16px;}',
      '#vv-iab-arrow{font-size:38px;top:-2px;}',
      '#vv-iab-arrow-label{top:44px;font-size:0.58rem;}',
      '#vv-iab-panel h2{font-size:0.92rem;margin-right:80px;}',
      '#vv-iab-steps li{font-size:0.8rem;}',
      'body.vv-iab-open{padding-top:200px !important;}',
      '}',

      /* respect reduced motion */
      '@media (prefers-reduced-motion:reduce){',
      '#vv-iab-arrow{animation:none;}',
      '}'
    ].join('');
    document.head.appendChild(style);

    var panel = document.createElement('div');
    panel.id = 'vv-iab-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Open in external browser');
    panel.innerHTML = [
      '<div id="vv-iab-arrow" aria-hidden="true">&#x2197;</div>',
      '<div id="vv-iab-arrow-label">Tap the<br>&middot;&middot;&middot; up here</div>',
      '<h2>Open this page in your browser to shop securely.</h2>',
      '<ol id="vv-iab-steps">',
      '  <li><b class="num">1</b><span>For secure checkout you must open in your external browser.</span></li>',
      '  <li><b class="num">2</b><span>Tap the <code>&middot;&middot;&middot;</code> icon at the top right of this screen.</span></li>',
      '  <li><b class="num">3</b><span>Choose <code>Open in External Browser</code>.</span></li>',
      '</ol>'
    ].join('');
    document.body.appendChild(panel);
    document.body.classList.add('vv-iab-open');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
