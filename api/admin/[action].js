/**
 * Single serverless function for all /api/admin/* routes.
 * Consolidated to stay within Vercel's per-deployment function limit.
 * Handlers live in underscore-prefixed siblings (not routed individually).
 * Static requires so Vercel's bundler includes every handler.
 */
const handlers = {
  login: require('./_login'),
  logout: require('./_logout'),
  me: require('./_me'),
  orders: require('./_orders'),
  ship: require('./_ship'),
  user: require('./_user'),
  users: require('./_users'),
  'set-password': require('./_set-password'),
};

module.exports = async (req, res) => {
  const action = req.query && req.query.action;
  const handler = handlers[action];
  if (!handler) return res.status(404).json({ error: 'Not found' });
  return handler(req, res);
};
