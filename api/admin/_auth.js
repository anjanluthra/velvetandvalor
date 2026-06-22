/**
 * Velvet & Valor — Admin auth.
 * Signed HttpOnly session cookies (Node crypto, no external deps) carrying the
 * user's email + role. Passwords are scrypt-hashed. The owner is bootstrapped
 * from env (OWNER_EMAIL + ADMIN_PASSWORD) and always works, even without KV.
 * Files prefixed with "_" are not exposed as routes by Vercel.
 */
const crypto = require('crypto');
const store = require('./_store');

const COOKIE_NAME = 'vv_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const ROLES = ['staff', 'manager', 'owner']; // ascending privilege

// ── Signing ──────────────────────────────────────────────────
function getSecret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error('ADMIN_SESSION_SECRET not configured');
  return s;
}
function hmac(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function createSession(user) {
  const payload = Buffer.from(
    JSON.stringify({
      email: user.email,
      role: user.role,
      name: user.name || '',
      exp: Date.now() + SESSION_TTL_MS,
    })
  ).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

function parseSession(token) {
  if (!token || typeof token !== 'string') return null;
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  let expected;
  try {
    expected = hmac(payload);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
  if (!data || !Number.isFinite(Number(data.exp)) || Number(data.exp) < Date.now()) return null;
  return data;
}

// ── Cookies ──────────────────────────────────────────────────
function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}
function setSessionCookie(res, token) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`
  );
}
function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
  );
}

// ── Passwords ────────────────────────────────────────────────
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function verifyPassword(pw, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const calc = crypto.scryptSync(String(pw), salt, 64);
  const h = Buffer.from(hash, 'hex');
  if (h.length !== calc.length) return false;
  return crypto.timingSafeEqual(h, calc);
}
/** Constant-time string comparison (hash first to avoid length leak). */
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// ── Authorization ────────────────────────────────────────────
function roleRank(r) {
  return ROLES.indexOf(r);
}
function hasRole(user, minRole) {
  return user && roleRank(user.role) >= roleRank(minRole);
}

/**
 * Resolve the authenticated user from the request, re-checking the store so
 * that disabled/removed users lose access immediately. Owner (env) bypasses KV.
 */
async function getSessionUser(req) {
  const data = parseSession(parseCookies(req)[COOKIE_NAME]);
  if (!data || !data.email) return null;

  const ownerEmail = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
  if (ownerEmail && data.email === ownerEmail) {
    return { email: ownerEmail, role: 'owner', name: data.name || 'Owner' };
  }

  let u;
  try {
    u = await store.getUser(data.email);
  } catch {
    return null;
  }
  if (!u || u.status !== 'active') return null;
  return { email: u.email, role: u.role, name: u.name || '' };
}

/** Async: require a logged-in user, optionally with at least `minRole`. */
async function requireUser(req, res, minRole) {
  const u = await getSessionUser(req);
  if (!u) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  if (minRole && !hasRole(u, minRole)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return u;
}

/** Sync: valid signed session only (no store/role check). Kept for simple gates. */
function requireAuth(req, res) {
  if (!parseSession(parseCookies(req)[COOKIE_NAME])) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

module.exports = {
  COOKIE_NAME,
  ROLES,
  createSession,
  parseSession,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  hashPassword,
  verifyPassword,
  safeEqual,
  hasRole,
  getSessionUser,
  requireUser,
  requireAuth,
};
