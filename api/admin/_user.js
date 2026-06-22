const crypto = require('crypto');
const { requireUser, ROLES } = require('./_auth');
const store = require('./_store');
const { sendInviteEmail } = require('./_email');

const INVITE_TTL_SEC = 7 * 24 * 3600;

/**
 * Owner-only user management. Action-based:
 *   { action: 'set-role', email, role }
 *   { action: 'disable' | 'enable' | 'remove' | 'resend-invite', email }
 */
module.exports = async (req, res) => {
  const me = await requireUser(req, res, 'owner');
  if (!me) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, email, role } = req.body || {};
  const lc = String(email || '').trim().toLowerCase();
  if (!lc) return res.status(400).json({ error: 'email required' });

  const ownerEmail = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
  if (lc === ownerEmail) {
    return res.status(400).json({ error: 'The primary owner account cannot be modified here' });
  }

  try {
    const user = await store.getUser(lc);
    if (!user && action !== 'remove') {
      return res.status(404).json({ error: 'User not found' });
    }

    switch (action) {
      case 'set-role': {
        if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
        user.role = role;
        await store.putUser(user);
        return res.status(200).json({ ok: true });
      }
      case 'disable': {
        user.status = 'disabled';
        await store.putUser(user);
        return res.status(200).json({ ok: true });
      }
      case 'enable': {
        user.status = user.passwordHash ? 'active' : 'invited';
        await store.putUser(user);
        return res.status(200).json({ ok: true, status: user.status });
      }
      case 'remove': {
        await store.deleteUser(lc);
        return res.status(200).json({ ok: true });
      }
      case 'resend-invite': {
        const token = crypto.randomBytes(32).toString('hex');
        await store.putInvite(token, lc, INVITE_TTL_SEC);
        user.status = 'invited';
        await store.putUser(user);

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
        return res.status(200).json({ ok: true, emailed, emailError, link });
      }
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
