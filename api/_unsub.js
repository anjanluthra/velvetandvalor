/**
 * Velvet & Valor — signed unsubscribe tokens.
 * Shared by the email layer (to build List-Unsubscribe links) and /api/submit
 * (to verify a one-click unsubscribe). Underscore-prefixed so Vercel does not
 * deploy it as its own serverless function.
 */
const crypto = require('crypto');

const SITE = process.env.SITE_URL || 'https://www.velvet-valor.com';
const SECRET = process.env.UNSUB_SECRET || process.env.CRON_SECRET || 'vv-unsub-default-change-me';

const lc = (email) => String(email || '').trim().toLowerCase();

function token(email) {
  return crypto.createHmac('sha256', SECRET).update(lc(email)).digest('base64url').slice(0, 24);
}

function verify(email, t) {
  if (!t) return false;
  const expected = token(email);
  // constant-time compare on equal-length buffers
  if (t.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(t), Buffer.from(expected));
  } catch {
    return false;
  }
}

function unsubUrl(email) {
  const e = encodeURIComponent(lc(email));
  return `${SITE}/api/submit?action=unsubscribe&e=${e}&t=${token(email)}`;
}

module.exports = { token, verify, unsubUrl, SITE };
