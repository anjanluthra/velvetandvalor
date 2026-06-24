/**
 * Single serverless function for all /api/admin/* routes.
 * Consolidated to stay within Vercel's per-deployment function limit.
 * Handlers live in underscore-prefixed siblings (not routed individually).
 * Static requires so Vercel's bundler includes every handler.
 */
// Load each handler defensively: if one module fails to load (e.g. a require
// that Vercel didn't bundle), only THAT route degrades to a 500 — the rest of
// the admin panel keeps working instead of the whole dispatcher crashing.
function load(name) {
  try {
    return require(name);
  } catch (e) {
    console.error('[admin] handler failed to load: ' + name + ' — ' + (e && e.message));
    return (req, res) => res.status(500).json({ error: 'This admin feature is temporarily unavailable.' });
  }
}

const handlers = {
  login: load('./_login'),
  logout: load('./_logout'),
  me: load('./_me'),
  orders: load('./_orders'),
  ship: load('./_ship'),
  user: load('./_user'),
  users: load('./_users'),
  'set-password': load('./_set-password'),
  submissions: load('./_submissions'),
  flows: load('./_flows'),
  catalog: load('./_catalog'),
  publish: load('./_publish'),
  engine: load('./_engine'),
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
