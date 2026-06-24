const { requireUser } = require('./_auth');

/**
 * Triggers a production rebuild so saved catalog changes go live.
 * POSTs to a Vercel Deploy Hook (env VERCEL_DEPLOY_HOOK_URL). Owner+manager.
 */
module.exports = async (req, res) => {
  const me = await requireUser(req, res, 'manager');
  if (!me) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) {
    return res.status(200).json({
      ok: false,
      notConfigured: true,
      message: 'Publishing isn’t set up yet. Add a Vercel Deploy Hook URL as VERCEL_DEPLOY_HOOK_URL.',
    });
  }

  try {
    const r = await fetch(hook, { method: 'POST' });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(502).json({ error: 'Deploy hook failed: ' + r.status + ' ' + t.slice(0, 120) });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
};
