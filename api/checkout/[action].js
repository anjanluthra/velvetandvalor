/**
 * Single serverless function for all checkout / order routes.
 * Consolidated to stay within Vercel's per-deployment function limit
 * (Hobby allows 12; each non-underscore file under /api counts as one).
 * Handlers live in underscore-prefixed siblings (not routed individually).
 *
 * The legacy flat paths — /api/create-checkout, /api/create-custom-checkout,
 * /api/create-payment-intent, /api/get-order, /api/stripe-config — are mapped
 * onto this dispatcher by rewrites in vercel.json, so every URL the site and
 * Stripe already use keeps working unchanged.
 */
// Load each handler defensively: if one module fails to load (e.g. a require
// that Vercel didn't bundle), only THAT route degrades to a 500 — the rest of
// checkout keeps working instead of the whole dispatcher crashing.
// IMPORTANT: keep require() calls STATIC literals (inside a thunk) so Vercel's
// bundler still traces and includes every handler. A dynamic require(variable)
// silently breaks bundling for ALL handlers.
function safe(thunk) {
  try {
    return thunk();
  } catch (e) {
    console.error('[checkout] handler failed to load — ' + (e && e.message));
    return (req, res) => res.status(500).json({ error: 'Checkout is temporarily unavailable. Please email info@velvet-valor.com.' });
  }
}

const handlers = {
  'create-checkout': safe(() => require('./_create-checkout')),
  'create-custom-checkout': safe(() => require('./_create-custom-checkout')),
  'create-payment-intent': safe(() => require('./_create-payment-intent')),
  'get-order': safe(() => require('./_get-order')),
  'stripe-config': safe(() => require('./_stripe-config')),
};

module.exports = async (req, res) => {
  const action = req.query && req.query.action;
  const handler = handlers[action];
  if (!handler) return res.status(404).json({ error: 'Not found' });
  return handler(req, res);
};
