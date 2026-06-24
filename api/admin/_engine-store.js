/**
 * Velvet & Valor — Content Engine store (Vercel KV / Upstash Redis over REST).
 * Operational state only (the editorial plan, generation jobs, engine settings).
 * Published articles are NOT here — they are committed as content/posts/<slug>.md.
 *
 * Mirrors the env + transport of api/admin/_store.js:
 *   KV_REST_API_URL + KV_REST_API_TOKEN  (or UPSTASH_REDIS_REST_URL/TOKEN)
 *
 * Keys (all namespaced under vv:engine:*):
 *   vv:engine:plan      Redis hash  field=id   value=JSON plan item
 *   vv:engine:jobs      Redis hash  field=jobId value=JSON job
 *   vv:engine:settings  Redis string           value=JSON settings
 */
const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const PLAN_KEY = 'vv:engine:plan';
const JOBS_KEY = 'vv:engine:jobs';
const SETTINGS_KEY = 'vv:engine:settings';

function isConfigured() {
  return Boolean(REST_URL && REST_TOKEN);
}

async function cmd(args) {
  if (!isConfigured()) {
    throw new Error('Engine store not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN.');
  }
  const r = await fetch(REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`KV error ${r.status}: ${t}`);
  }
  const data = await r.json();
  return data.result;
}

const parse = (v) => { try { return JSON.parse(v); } catch { return null; } };

/** Unflatten a HGETALL [field, value, field, value, ...] into parsed JSON values. */
function hgetallValues(flat) {
  const out = [];
  if (Array.isArray(flat)) {
    for (let i = 0; i < flat.length; i += 2) {
      const obj = parse(flat[i + 1]);
      if (obj) out.push(obj);
    }
  }
  return out;
}

/* ─────────────────────────── content plan ─────────────────────────── */

/**
 * Seed the plan from content-plan.seed.js. Idempotent: only inserts items whose
 * id isn't already present (HSETNX), so live status/scheduling is never clobbered.
 * Returns { added, skipped }.
 */
async function seedPlan(rawPlan) {
  let added = 0, skipped = 0;
  for (const item of rawPlan) {
    const record = {
      ...item,
      status: 'Outstanding',   // Outstanding | Live | Cancelled
      scheduledDate: item.scheduledDate || '',
      publishedDate: '',
      slug: item.id,
      createdAt: Date.now(),
    };
    // HSETNX returns 1 if the field was set (new), 0 if it already existed.
    const set = await cmd(['HSETNX', PLAN_KEY, item.id, JSON.stringify(record)]);
    if (set === 1 || set === '1') added++; else skipped++;
  }
  return { added, skipped };
}

async function listPlan() {
  return hgetallValues(await cmd(['HGETALL', PLAN_KEY]));
}

async function getPlanItem(id) {
  const v = await cmd(['HGET', PLAN_KEY, id]);
  return v ? parse(v) : null;
}

/** Insert or replace a plan item (used by add-to-plan from research). */
async function putPlanItem(item) {
  const id = item.id || item.slug;
  if (!id) throw new Error('plan item needs an id');
  const existing = await getPlanItem(id);
  const record = {
    status: 'Outstanding', scheduledDate: '', publishedDate: '', slug: id, createdAt: Date.now(),
    ...existing, ...item, id, slug: id,
  };
  await cmd(['HSET', PLAN_KEY, id, JSON.stringify(record)]);
  return record;
}

/** Patch a plan item's fields (e.g. status, scheduledDate, publishedDate). */
async function patchPlanItem(id, patch) {
  const cur = await getPlanItem(id);
  if (!cur) return null;
  const next = { ...cur, ...patch };
  await cmd(['HSET', PLAN_KEY, id, JSON.stringify(next)]);
  return next;
}

async function deletePlanItem(id) {
  await cmd(['HDEL', PLAN_KEY, id]);
}

/* ─────────────────────────── generation jobs ─────────────────────────── */

const JOB_STAGES = ['queued', 'enrich', 'draft', 'synthesize', 'validate', 'citations', 'publish', 'done'];
const STAGE_PCT = { queued: 3, enrich: 15, draft: 40, synthesize: 62, validate: 74, citations: 85, publish: 96, done: 100 };

async function putJob(job) {
  const record = { notes: [], status: 'running', startedAt: Date.now(), ...job };
  await cmd(['HSET', JOBS_KEY, record.id, JSON.stringify(record)]);
  return record;
}

async function getJob(id) {
  const v = await cmd(['HGET', JOBS_KEY, id]);
  return v ? parse(v) : null;
}

async function updateJob(id, patch) {
  const cur = await getJob(id);
  if (!cur) return null;
  const next = { ...cur, ...patch };
  if (patch.stage && STAGE_PCT[patch.stage] != null && patch.progress == null) {
    next.progress = STAGE_PCT[patch.stage];
  }
  if (patch.note) next.notes = [...(cur.notes || []), { t: Date.now(), m: patch.note }];
  delete next.note;
  await cmd(['HSET', JOBS_KEY, id, JSON.stringify(next)]);
  return next;
}

async function listJobs() {
  const jobs = hgetallValues(await cmd(['HGETALL', JOBS_KEY]));
  return jobs.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
}

/** Flip stale `running` jobs (older than maxAgeMs) to failed — UI hygiene.
 *  6 min covers the longest a function can run (Hobby 60s, Pro up to 300s). */
async function reapStaleJobs(maxAgeMs = 6 * 60 * 1000) {
  const now = Date.now();
  const jobs = await listJobs();
  for (const j of jobs) {
    if (j.status === 'running' && now - (j.startedAt || 0) > maxAgeMs) {
      await updateJob(j.id, { status: 'failed', error: 'timed out', stage: j.stage });
    }
  }
}

/* ─────────────────────────── settings ─────────────────────────── */

const DEFAULT_SETTINGS = { paused: true, batchSize: 1, cadencePerDay: 2, lastSeededAt: 0 };

async function getSettings() {
  const v = await cmd(['GET', SETTINGS_KEY]);
  return { ...DEFAULT_SETTINGS, ...(v ? parse(v) : {}) };
}

async function putSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await cmd(['SET', SETTINGS_KEY, JSON.stringify(next)]);
  return next;
}

module.exports = {
  isConfigured,
  JOB_STAGES, STAGE_PCT,
  seedPlan, listPlan, getPlanItem, putPlanItem, patchPlanItem, deletePlanItem,
  putJob, getJob, updateJob, listJobs, reapStaleJobs,
  getSettings, putSettings,
};
