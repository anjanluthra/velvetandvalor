const { createSession, setSessionCookie, safeEqual, verifyPassword } = require('./_auth');
const store = require('./_store');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ADMIN_SESSION_SECRET) {
    return res.status(500).json({ error: 'ADMIN_SESSION_SECRET not configured' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    await delay(400);
    return res.status(401).json({ error: 'Email and password required' });
  }
  const lc = String(email).trim().toLowerCase();

  // Owner bootstrap account (always available, even without KV).
  const ownerEmail = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
  const ownerPw = process.env.ADMIN_PASSWORD;
  if (ownerEmail && ownerPw && lc === ownerEmail && safeEqual(password, ownerPw)) {
    setSessionCookie(res, createSession({ email: ownerEmail, role: 'owner', name: 'Owner' }));
    return res.status(200).json({ ok: true, role: 'owner' });
  }

  // Store-backed users.
  let u = null;
  try {
    u = await store.getUser(lc);
  } catch {
    /* KV unavailable — fall through to generic failure */
  }
  if (!u || u.status !== 'active' || !verifyPassword(password, u.passwordHash)) {
    await delay(600);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Best-effort last-login stamp.
  try {
    u.lastLogin = Date.now();
    await store.putUser(u);
  } catch {
    /* non-fatal */
  }

  setSessionCookie(res, createSession(u));
  return res.status(200).json({ ok: true, role: u.role });
};
