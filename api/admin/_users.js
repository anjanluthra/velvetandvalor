const crypto = require('crypto');
const { requireUser, ROLES } = require('./_auth');
const store = require('./_store');
const { sendInviteEmail } = require('./_email');

const INVITE_TTL_SEC = 7 * 24 * 3600;

function sanitize(u) {
  return {
    email: u.email,
    name: u.name || '',
    role: u.role,
    status: u.status,
    createdAt: u.createdAt || null,
    lastLogin: u.lastLogin || null,
  };
}

module.exports = async (req, res) => {
  const me = await requireUser(req, res, 'owner');
  if (!me) return;

  // ── List users ──
  if (req.method === 'GET') {
    try {
      const users = await store.listUsers();
      return res.status(200).json({ users: users.map(sanitize) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Invite a new user ──
  if (req.method === 'POST') {
    const { email, name, role } = req.body || {};
    const lc = String(email || '').trim().toLowerCase();
    if (!lc || !/.+@.+\..+/.test(lc)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    const r = ROLES.includes(role) ? role : 'staff';

    const ownerEmail = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
    if (lc === ownerEmail) {
      return res.status(400).json({ error: 'That email is the primary owner account' });
    }

    try {
      const existing = await store.getUser(lc);
      if (existing) return res.status(409).json({ error: 'A user with that email already exists' });

      const user = {
        email: lc,
        name: String(name || '').trim(),
        role: r,
        status: 'invited',
        createdAt: Date.now(),
        createdBy: me.email,
      };
      await store.putUser(user);

      const token = crypto.randomBytes(32).toString('hex');
      await store.putInvite(token, lc, INVITE_TTL_SEC);

      const base = req.headers.origin || `https://${req.headers.host}`;
      const link = `${base}/admin/set-password?token=${token}`;

      let emailed = false;
      let emailError = null;
      try {
        await sendInviteEmail({ to: lc, name: user.name, link, inviter: me.name || me.email });
        emailed = true;
      } catch (e) {
        emailError = e.message;
      }

      return res.status(200).json({ ok: true, user: sanitize(user), emailed, emailError, link });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
