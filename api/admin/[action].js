/**
 * Single serverless function for all /api/admin/* routes.
 * Consolidated to stay within Vercel's per-deployment function limit.
 * Handlers live in underscore-prefixed siblings (not routed individually).
 * Static requires so Vercel's bundler includes every handler.
 */
// Load each handler defensively: if one module fails to load (e.g. a require
// that Vercel didn't bundle), only THAT route degrades to a 500 — the rest of
// the admin panel keeps working instead of the whole dispatcher crashing.
// IMPORTANT: keep require() calls STATIC literals (inside a thunk) so Vercel's
// bundler still traces and includes every handler. A dynamic require(variable)
// silently breaks bundling for ALL handlers. The thunk is wrapped in try/catch
// so a single handler that fails to load degrades only its own route.
function safe(thunk) {
  try {
    return thunk();
  } catch (e) {
    console.error('[admin] handler failed to load — ' + (e && e.message));
    return (req, res) => res.status(500).json({ error: 'This admin feature is temporarily unavailable.' });
  }
}

const handlers = {
  login: safe(() => require('./_login')),
  logout: safe(() => require('./_logout')),
  me: safe(() => require('./_me')),
  orders: safe(() => require('./_orders')),
  ship: safe(() => require('./_ship')),
  user: safe(() => require('./_user')),
  users: safe(() => require('./_users')),
  'set-password': safe(() => require('./_set-password')),
  submissions: safe(() => require('./_submissions')),
  flows: safe(() => require('./_flows')),
  catalog: safe(() => require('./_catalog')),
  publish: safe(() => require('./_publish')),
  engine: safe(() => require('./_engine')),
};

module.exports = async (req, res) => {
  const action = req.query && req.query.action;
  const handler = handlers[action];
  if (!handler) return res.status(404).json({ error: 'Not found' });
  return handler(req, res);
};

// Content-engine generation (drafts + judge) needs longer than the 10s default.
// 60s is the Vercel Hobby ceiling; Pro allows up to 300s for larger batches.
module.exports.config = { maxDuration: 60 };
