/**
 * Single serverless function for both daily cron jobs.
 * Consolidated to stay within Vercel's per-deployment function limit
 * (Hobby allows 12; each non-underscore file under /api counts as one).
 * Handlers live in underscore-prefixed siblings (not routed individually).
 *
 * Scheduled from vercel.json as /api/cron/recover and /api/cron/newsletter.
 * The legacy flat paths /api/cron-recover and /api/cron-newsletter are mapped
 * here by rewrites, so a manual trigger against either still works.
 *
 * Each handler enforces CRON_SECRET itself (Vercel sends it as
 * `Authorization: Bearer <secret>`), so auth is unchanged by this move.
 */
// Static require() literals inside a thunk so Vercel's bundler traces both
// handlers; the try/catch keeps one bad module from taking out the other job.
function safe(thunk) {
  try {
    return thunk();
  } catch (e) {
    console.error('[cron] handler failed to load — ' + (e && e.message));
    return (req, res) => res.status(500).json({ error: 'cron handler unavailable' });
  }
}

const handlers = {
  newsletter: safe(() => require('./_newsletter')),
  recover: safe(() => require('./_recover')),
};

module.exports = async (req, res) => {
  const job = req.query && req.query.job;
  const handler = handlers[job];
  if (!handler) return res.status(404).json({ error: 'Not found' });
  return handler(req, res);
};

// Both jobs page through Stripe and send email; the 10s default is tight for a
// full subscriber walk. 60s is the Vercel Hobby ceiling.
module.exports.config = { maxDuration: 60 };
