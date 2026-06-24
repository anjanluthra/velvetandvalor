const { requireUser } = require('./_auth');
const store = require('./_store');

/**
 * Product catalog (collections → colourways → photos), manager+.
 * Source of truth is KV; seeded once from a bundled JSON snapshot of
 * content/collections.js (kept inside /api so Vercel always bundles it, and
 * loaded lazily in try/catch so this module can never crash the dispatcher).
 *   GET  → { collections: [...] }
 *   POST → { collections: [...] }  saves the edited catalog to KV
 */
let SEED = null;
function seed() {
  if (SEED === null) {
    try { SEED = require('./_catalog-seed.json') || []; } catch (e) { SEED = []; }
  }
  return SEED;
}

module.exports = async (req, res) => {
  const me = await requireUser(req, res, 'manager');
  if (!me) return;

  if (req.method === 'GET') {
    try {
      let collections = await store.getCatalog();
      if (!collections) {
        collections = JSON.parse(JSON.stringify(seed()));
        if (collections.length) await store.putCatalog(collections);
      }
      return res.status(200).json({ collections });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { collections } = req.body || {};
    if (!Array.isArray(collections)) {
      return res.status(400).json({ error: 'collections array required' });
    }
    try {
      await store.putCatalog(collections);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
