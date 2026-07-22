/**
 * Velvet & Valor — In-App Browser gate
 *
 * When loaded inside Instagram / Facebook / TikTok / etc. WebViews,
 * shows a full-viewport instruction pointing at the browser's ⋯ menu
 * so customers switch to Safari / Chrome before paying. No auto-open
 * button (unreliable across iOS versions), no dismiss link (defeats
 * the point).
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
    if (document.getElementById('vv-iab-gate')) return;

    var style = document.createElement('style');
    style.textContent = [
      '#vv-iab-gate{position:fixed;inset:0;z-index:2147483647;',
      'background:radial-gradient(circle at 85% 10%, rgba(200,164,92,0.14), rgba(10,15,25,0.98) 55%),#0a0f19;',
      'color:#f4ecd8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '-webkit-font-smoothing:antialiased;display:flex;flex-direction:column;',
      'align-items:center;justify-content:flex-start;padding:0;overflow:hidden;}',

      '#vv-iab-arrow{position:absolute;top:8px;right:14px;',
      'font-size:96px;line-height:1;color:#c8a45c;',
      'text-shadow:0 0 24px rgba(200,164,92,0.6),0 0 4px rgba(0,0,0,0.4);',
      'animation:vvArrowBob 1.05s ease-in-out infinite;pointer-events:none;',
      'transform-origin:center;}',

      '#vv-iab-arrow-label{position:absolute;top:118px;right:20px;',
      'font-size:0.82rem;letter-spacing:0.18em;text-transform:uppercase;',
      'color:#c8a45c;font-weight:700;text-align:right;line-height:1.3;}',

      '#vv-iab-arrow-label span{display:block;font-size:0.68rem;',
      'letter-spacing:0.14em;color:rgba(244,236,216,0.7);font-weight:500;',
      'margin-top:4px;}',

      '#vv-iab-copy{margin-top:220px;padding:0 28px;max-width:520px;text-align:center;}',

      '#vv-iab-copy h1{font-family:"Playfair Display",Georgia,serif;',
      'font-size:1.7rem;line-height:1.25;font-weight:600;margin:0 0 16px;',
      'color:#f4ecd8;}',

      '#vv-iab-copy p{margin:0 0 12px;font-size:1rem;line-height:1.55;',
      'color:rgba(244,236,216,0.88);}',

      '#vv-iab-steps{margin:26px auto 0;padding:0;list-style:none;',
      'max-width:360px;text-align:left;}',

      '#vv-iab-steps li{display:flex;align-items:flex-start;gap:12px;',
      'margin:0 0 14px;font-size:0.95rem;line-height:1.45;',
      'color:rgba(244,236,216,0.92);}',

      '#vv-iab-steps li b{display:inline-flex;align-items:center;justify-content:center;',
      'flex:0 0 26px;width:26px;height:26px;border-radius:50%;',
      'background:#c8a45c;color:#0a0f19;font-weight:700;font-size:0.85rem;',
      'font-family:inherit;}',

      '#vv-iab-steps code{font-family:-apple-system,sans-serif;font-weight:700;',
      'color:#c8a45c;letter-spacing:0.06em;}',

      '@keyframes vvArrowBob{',
      '0%,100%{transform:translate(0,0) rotate(-8deg);}',
      '50%{transform:translate(6px,-10px) rotate(-8deg);}',
      '}',

      '@media (max-height:640px){',
      '#vv-iab-arrow{font-size:72px;}',
      '#vv-iab-arrow-label{top:92px;}',
      '#vv-iab-copy{margin-top:170px;}',
      '#vv-iab-copy h1{font-size:1.4rem;}',
      '}'
    ].join('');
    document.head.appendChild(style);

    var gate = document.createElement('div');
    gate.id = 'vv-iab-gate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.innerHTML = [
      '<div id="vv-iab-arrow" aria-hidden="true">&#x2934;</div>',
      '<div id="vv-iab-arrow-label">Tap the <br>&middot;&middot;&middot; up here<span>Instagram menu</span></div>',
      '<div id="vv-iab-copy">',
      '  <h1>Open in Safari to shop</h1>',
      '  <p>Instagram\'s built-in browser blocks secure payments. It only takes a second to switch.</p>',
      '  <ol id="vv-iab-steps">',
      '    <li><b>1</b><span>Tap the <code>&middot;&middot;&middot;</code> icon at the very top right of this screen</span></li>',
      '    <li><b>2</b><span>Choose <code>Open in External Browser</code></span></li>',
      '  </ol>',
      '</div>'
    ].join('');
    document.body.appendChild(gate);

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
