const { hashPassword, createSession, setSessionCookie } = require('./_auth');
const store = require('./_store');

module.exports = async (req, res) => {
  // Validate an invite token (for the set-password page to show the email).
  if (req.method === 'GET') {
    const token = req.query && req.query.token;
    if (!token) return res.status(200).json({ valid: false });
    try {
      const email = await store.getInvite(token);
      if (!email) return res.status(200).json({ valid: false });
      return res.status(200).json({ valid: true, email });
    } catch {
      return res.status(200).json({ valid: false });
    }
  }

  // Set the password and activate the account.
  if (req.method === 'POST') {
    const { token, password } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing invite token' });
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    try {
      const email = await store.getInvite(token);
      if (!email) return res.status(400).json({ error: 'This invite link is invalid or has expired' });

      const user = await store.getUser(email);
      if (!user) return res.status(400).json({ error: 'This account no longer exists' });

      user.passwordHash = hashPassword(password);
      user.status = 'active';
      await store.putUser(user);
      await store.deleteInvite(token);

      setSessionCookie(res, createSession(user));
      return res.status(200).json({ ok: true, role: user.role });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
