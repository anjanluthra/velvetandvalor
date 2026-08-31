/**
 * Velvet & Valor — trusted server-side pricing.
 *
 * Single source of truth for what a case costs. Shared by BOTH checkout
 * flows (hosted Stripe Checkout via _create-checkout, and the on-domain
 * embedded Payment Element via _create-payment-intent) so the two can
 * never drift apart on price.
 *
 * NEVER trust a client-sent price for a catalogue collection — the client
 * sends a collectionId and the price is resolved here.
 *
 * Underscore-prefixed so Vercel does not deploy it as its own function.
 */

// Server-derived prices (cents).
const COLLECTIONS = {
  'noble-steed':  { name: 'Noble Steed',       cents: 4800 },
  'riders-motto': { name: "The Rider's Motto",  cents: 4000 },
};

// Flat worldwide shipping, charged once per order (not per item).
const SHIPPING_CENTS = 549;

// Custom horse portraits are priced separately from the catalogue.
const CUSTOM_PORTRAIT_CENTS = 7300;

/**
 * Resolve a collection to its trusted name + price. Prefer a stable slug
 * (collectionId); fall back to legacy free-text `collection` so existing
 * single-item Buy Now keeps working until all clients send collectionId.
 */
function resolveCollection(collectionId, legacyName) {
  if (collectionId && COLLECTIONS[collectionId]) {
    return { id: collectionId, ...COLLECTIONS[collectionId] };
  }
  if (typeof legacyName === 'string' && /rider/i.test(legacyName)) {
    return { id: 'riders-motto', ...COLLECTIONS['riders-motto'] };
  }
  return { id: 'noble-steed', ...COLLECTIONS['noble-steed'] };
}

/** Strip control characters; cap length. Display use only. */
function clean(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, max || 80);
}

function clampQty(q) {
  const n = Math.floor(Number(q));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 10);
}

module.exports = {
  COLLECTIONS,
  SHIPPING_CENTS,
  CUSTOM_PORTRAIT_CENTS,
  resolveCollection,
  clean,
  clampQty,
};
