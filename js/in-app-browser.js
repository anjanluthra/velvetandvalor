/**
 * Velvet & Valor — In-App Browser detection (minimal shim)
 *
 * The old versions of this file rendered a full-screen or top-panel
 * gate asking customers to switch out of Instagram's WebView because
 * Stripe Checkout (checkout.stripe.com) broke there.
 *
 * As of the embedded Payment Element rollout, checkout happens
 * ON velvet-valor.com. There's no redirect to Stripe's domain, so
 * IG's in-app browser is no longer a blocker — card, Apple Pay,
 * Google Pay all work inline. No banner needed.
 *
 * Kept as a shim so any lingering callers of window.vvGoToCheckout
 * still work.
 */
(function () {
  'use strict';

  var IAB_REGEX = /Instagram|FBAN|FBAV|FB_IAB|FB4A|FBIOS|Snapchat|LinkedInApp|Twitter|Pinterest|Line\/|KAKAOTALK|TikTok|Musically|MicroMessenger/i;
  var ua = navigator.userAgent || navigator.vendor || '';
  window.vvIsInAppBrowser = IAB_REGEX.test(ua);

  window.vvGoToCheckout = function (url) {
    if (url) window.location.href = url;
  };
})();
