const { requireUser } = require('./_auth');
const store = require('./_store');

/**
 * Admin view of form submissions. Manager+ (owner/manager).
 *   GET  → { submissions: [...] }
 *   POST → { id } deletes one
 */
module.exports = async (req, res) => {
  const me = await requireUser(req, res, 'manager');
  if (!me) return;

  if (req.method === 'GET') {
    try {
      const submissions = await store.listSubmissions();
      return res.status(200).json({ submissions });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
      await store.deleteSubmission(id);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
