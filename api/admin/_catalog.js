const cfg = require('../../content/collections');
const { requireUser } = require('./_auth');
const store = require('./_store');

/**
 * Product catalog (collections → colourways → photos), manager+.
 * Source of truth is KV; seeded once from content/collections.js so it starts
 * with the real Noble Steed + Rider's Motto data.
 *   GET  → { collections: [...] }
 *   POST → { collections: [...] }  saves the edited catalog to KV
 */
module.exports = async (req, res) => {
  const me = await requireUser(req, res, 'manager');
  if (!me) return;

  if (req.method === 'GET') {
    try {
      let collections = await store.getCatalog();
      if (!collections) {
        collections = JSON.parse(JSON.stringify(cfg.collections || []));
        await store.putCatalog(collections);
      }
      return res.status(200).json({ collections, seededFrom: 'kv' });
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
