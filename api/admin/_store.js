/**
 * Velvet & Valor — Admin user store (Vercel KV / Upstash Redis over REST).
 * No npm dependency: talks to the Upstash REST API with fetch.
 * Configure with KV_REST_API_URL + KV_REST_API_TOKEN (Vercel KV integration),
 * or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 */
const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const USERS_KEY = 'vv:users'; // Redis hash: field=email(lowercase), value=JSON

function isConfigured() {
  return Boolean(REST_URL && REST_TOKEN);
}

const lc = (email) => String(email || '').trim().toLowerCase();

async function cmd(args) {
  if (!isConfigured()) {
    throw new Error('User store not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN.');
  }
  const r = await fetch(REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`KV error ${r.status}: ${t}`);
  }
  const data = await r.json();
  return data.result;
}

async function getUser(email) {
  const v = await cmd(['HGET', USERS_KEY, lc(email)]);
  if (!v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

async function putUser(user) {
  user.email = lc(user.email);
  await cmd(['HSET', USERS_KEY, user.email, JSON.stringify(user)]);
  return user;
}

async function deleteUser(email) {
  await cmd(['HDEL', USERS_KEY, lc(email)]);
}

async function listUsers() {
  const flat = await cmd(['HGETALL', USERS_KEY]);
  const out = [];
  if (Array.isArray(flat)) {
    for (let i = 0; i < flat.length; i += 2) {
      try {
        out.push(JSON.parse(flat[i + 1]));
      } catch {
        /* skip malformed */
      }
    }
  }
  return out;
}

async function putInvite(token, email, ttlSeconds) {
  await cmd(['SET', `vv:invite:${token}`, lc(email), 'EX', String(ttlSeconds)]);
}

async function getInvite(token) {
  if (!token) return null;
  return await cmd(['GET', `vv:invite:${token}`]);
}

async function deleteInvite(token) {
  await cmd(['DEL', `vv:invite:${token}`]);
}

module.exports = {
  isConfigured,
  getUser,
  putUser,
  deleteUser,
  listUsers,
  putInvite,
  getInvite,
  deleteInvite,
};
