/**
 * Velvet & Valor — In-App Browser detection (legacy, now minimal)
 *
 * Historically this file showed a big banner asking customers to
 * switch out of Instagram's WebView because Stripe Checkout (the
 * hosted checkout.stripe.com page) broke there.
 *
 * As of the embedded Payment Element rollout, checkout happens
 * ON velvet-valor.com. There's no redirect to Stripe's domain, so
 * IG's in-app browser is no longer a blocker — card, Apple Pay,
 * Google Pay all work inline. The banner would now be a lie.
 *
 * File kept as a shim so any lingering callers of window.vvGoToCheckout
 * still work (fall through to a plain navigation). No banner, no
 * overlay, no scheme escapes.
 */
(function () {
  'use strict';

  var IAB_REGEX = /Instagram|FBAN|FBAV|FB_IAB|FB4A|FBIOS|Snapchat|LinkedInApp|Twitter|Pinterest|Line\/|KAKAOTALK|TikTok|Musically|MicroMessenger/i;
  var ua = navigator.userAgent || navigator.vendor || '';
  window.vvIsInAppBrowser = IAB_REGEX.test(ua);

  // Legacy shim — any old caller that still hands us a URL just navigates.
  window.vvGoToCheckout = function (url) {
    if (url) window.location.href = url;
  };
})();
