/**
 * Velvet & Valor — Content Engine handler.
 * One admin handler, sub-routed by `op`, so the whole engine costs ZERO extra
 * Vercel functions (it rides inside api/admin/[action].js). Manager+ only.
 *
 *   GET  ?action=engine&op=config            → clusters, settings, capabilities
 *   GET  ?action=engine&op=plan              → the editorial plan (from KV)
 *   GET  ?action=engine&op=jobs              → generation jobs (newest first)
 *   POST {op:'seed'}                         → import content-plan.seed.js into KV
 *   POST {op:'research', cluster, seeds?}    → Ahrefs keyword candidates
 *   POST {op:'plan-add', items:[...]}        → add researched keywords to the plan
 *   POST {op:'plan-update', id, patch}       → patch status / scheduledDate
 *   POST {op:'settings', patch}              → update engine settings
 *   POST {op:'generate', id, publish?}       → draft (+ optionally publish) an article
 */
const { requireUser } = require('./_auth');
const store = require('./_engine-store');
const ahrefs = require('./_ahrefs');
const clusters = require('../../content/clusters');
const { RAW_PLAN } = require('../../content/content-plan.seed');

const titleCase = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());
const jaccard = (a, b) => {
  const A = new Set(a.toLowerCase().split(/\s+/)), B = new Set(b.toLowerCase().split(/\s+/));
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / (A.size + B.size - inter || 1);
};

function capabilities() {
  return { ahrefs: ahrefs.isConfigured(), kv: store.isConfigured(), anthropic: require('./_content-agent').isConfigured(), github: require('./_github').isConfigured() };
}

/* ─────────────────────────── research ─────────────────────────── */

async function deriveSeeds(clusterId, plan) {
  // Use this cluster's existing plan target-keywords as seeds (already on-topic),
  // falling back to the cluster name. Research then finds adjacent NEW terms.
  const inCluster = plan.filter((p) => p.cluster === clusterId && p.targetKeyword);
  const seeds = inCluster.slice(0, 3).map((p) => p.targetKeyword);
  const c = clusters.byId(clusterId);
  if (!seeds.length && c) seeds.push(c.name.toLowerCase());
  return seeds;
}

async function research({ cluster, seeds, country = 'us' }) {
  const log = [];
  const c = clusters.byId(cluster);
  const plan = await store.listPlan();
  const seedList = (seeds && seeds.length ? seeds : await deriveSeeds(cluster, plan))
    .map((s) => String(s).trim()).filter(Boolean).slice(0, 4);

  // Gather keyword ideas (volume + KD come back with matching-terms).
  const seen = new Map();
  for (const s of seedList) {
    for (const idea of await ahrefs.matchingTerms(s, country, { limit: 30, maxKd: 35 }, log)) {
      const key = idea.keyword.toLowerCase();
      if (!seen.has(key) || (idea.volume || 0) > (seen.get(key).volume || 0)) seen.set(key, idea);
    }
  }

  // Drop anything already in the plan (exact or near-variant).
  const planKw = plan.map((p) => (p.targetKeyword || '').toLowerCase()).filter(Boolean);
  const planTitles = plan.map((p) => p.title.toLowerCase());
  let candidates = [...seen.values()].filter((idea) => {
    const k = idea.keyword.toLowerCase();
    if (planKw.includes(k)) return false;
    if (planKw.some((pk) => jaccard(pk, k) >= 0.8)) return false;
    return true;
  });

  // Enrich top survivors with intent in one batched overview call.
  candidates.sort((a, b) => (b.volume || 0) - (a.volume || 0));
  const top = candidates.slice(0, 25);
  const intentMap = await ahrefs.overview(top.map((c) => c.keyword), country, log);

  const out = top.map((idea) => {
    const en = intentMap.get(idea.keyword.toLowerCase());
    return {
      targetKeyword: idea.keyword,
      volume: idea.volume || 0,
      kd: idea.kd,
      intent: en ? en.intent : (c && c.id === 'iphone-case-guides' ? 'commercial' : 'informational'),
      articleTitle: titleCase(idea.keyword), // editorial title applied below if Claude is available
      cluster,
    };
  });

  // Personalised, editorial titles (not just the keyword title-cased) — one
  // batched Claude call; falls back to the title-cased keyword if unavailable.
  const titleMap = await require('./_content-agent').suggestTitles(out, c);
  for (const o of out) {
    const t = titleMap[o.targetKeyword.toLowerCase()];
    if (t) o.articleTitle = t;
  }

  // Drop near-duplicate titles vs the existing plan (now that titles are final).
  const final = out.filter((o) => !planTitles.some((t) => jaccard(t, o.articleTitle.toLowerCase()) >= 0.6));

  return { cluster, seeds: seedList, candidates: final, log };
}

/* ─────────────────────────── plan ─────────────────────────── */

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

async function planAdd(items) {
  const c = (id) => clusters.byId(id);
  const added = [];
  for (const it of items || []) {
    const clusterId = it.cluster;
    const cl = c(clusterId);
    const id = it.id || slugify(it.title || it.targetKeyword);
    if (!id) continue;
    const rec = await store.putPlanItem({
      id,
      title: it.title || titleCase(it.targetKeyword),
      cluster: clusterId,
      targetKeyword: it.targetKeyword || '',
      volume: it.volume || 0,
      kd: it.kd == null ? null : it.kd,
      intent: it.intent || 'informational',
      moneyPage: it.moneyPage || (cl ? cl.defaultMoneyPage : '/collections/iphone-cases'),
      wordCount: it.wordCount || 1500,
      priority: it.priority || 'P2',
    });
    added.push(rec);
  }
  return { added: added.length, items: added };
}

/* ─────────────────────────── generate ─────────────────────────── */

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

async function relatedLinksFor(item, plan) {
  // Prefer Live articles in the same cluster as internal-link suggestions.
  return plan
    .filter((p) => p.cluster === item.cluster && p.id !== item.id && p.status === 'Live')
    .slice(0, 4)
    .map((p) => ({ title: p.title, url: `/blog/${p.id}` }));
}

async function generate({ id, publish }) {
  const agent = require('./_content-agent');
  const github = require('./_github');
  const item = await store.getPlanItem(id);
  if (!item) return { status: 404, body: { error: `plan item "${id}" not found` } };
  if (!agent.isConfigured()) {
    return { status: 400, body: { error: 'ANTHROPIC_API_KEY not set — server-side generation is unavailable. Add the key in Vercel, or generate this article in a Claude Code session.' } };
  }

  const jobId = `${id}.${Date.now()}`;
  await store.putJob({ id: jobId, slug: id, title: item.title, stage: 'queued', note: 'queued' });
  const onStage = (stage, note) => store.updateJob(jobId, { stage, note }).catch(() => {});

  try {
    const cluster = clusters.byId(item.cluster);
    const plan = await store.listPlan();

    // enrich (Ahrefs, fail-soft) — only if there's a keyword to research.
    await onStage('enrich', item.targetKeyword ? `Ahrefs: ${item.targetKeyword}` : 'brand piece — no keyword');
    const log = [];
    let enrichment = { searchVolume: item.volume, kd: item.kd, secondaryKeywords: [], competitors: [] };
    if (item.targetKeyword) {
      enrichment.secondaryKeywords = await ahrefs.matchingTerms(item.targetKeyword, 'us', { limit: 15, maxKd: 60 }, log);
      enrichment.competitors = await ahrefs.serpOverview(item.targetKeyword, 'us', 8, log);
    }

    const relatedLinks = await relatedLinksFor(item, plan);
    const result = await agent.generate({ item, cluster, enrichment, relatedLinks, dateISO: isoToday(), onStage });

    if (!publish) {
      await store.updateJob(jobId, { stage: 'validate', status: 'done', progress: 100, gate: result.gate, note: 'preview generated (not published)' });
      return { status: 200, body: { jobId, slug: id, title: item.title, gate: result.gate, markdown: result.markdown, parsed: result.parsed, published: false } };
    }

    // publish — commit content/posts/<slug>.md (Vercel deploy rebuilds the blog).
    await onStage('publish', 'committing markdown');
    const commit = await github.commitFiles(
      [{ path: `content/posts/${id}.md`, content: result.markdown }],
      `Content engine: publish "${item.title}"`
    );
    await store.patchPlanItem(id, { status: 'Live', publishedDate: isoToday() });
    await store.updateJob(jobId, { stage: 'done', status: 'done', progress: 100, gate: result.gate, commit: commit.url, note: 'published' });
    return { status: 200, body: { jobId, slug: id, gate: result.gate, published: true, commit: commit.url } };
  } catch (e) {
    await store.updateJob(jobId, { status: 'failed', error: e.message, note: `error: ${e.message}` }).catch(() => {});
    return { status: 500, body: { error: e.message, jobId } };
  }
}

/* ─────────────────────────── handler ─────────────────────────── */

module.exports = async (req, res) => {
  const me = await requireUser(req, res, 'manager');
  if (!me) return;

  try {
    if (req.method === 'GET') {
      const op = req.query.op || 'config';
      if (op === 'config') {
        return res.status(200).json({
          clusters: clusters.CLUSTERS,
          settings: await store.getSettings(),
          capabilities: capabilities(),
          seedCount: RAW_PLAN.length,
        });
      }
      if (op === 'plan') {
        await store.reapStaleJobs();
        const plan = (await store.listPlan()).sort((a, b) =>
          (a.priority || 'P9').localeCompare(b.priority || 'P9') || (b.volume || 0) - (a.volume || 0));
        return res.status(200).json({ plan });
      }
      if (op === 'jobs') return res.status(200).json({ jobs: await store.listJobs() });
      return res.status(400).json({ error: `unknown op "${op}"` });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const op = body.op;
      switch (op) {
        case 'seed': {
          const r = await store.seedPlan(RAW_PLAN);
          await store.putSettings({ lastSeededAt: Date.now() });
          return res.status(200).json(r);
        }
        case 'research':
          return res.status(200).json(await research(body));
        case 'plan-add':
          return res.status(200).json(await planAdd(body.items));
        case 'plan-update': {
          if (!body.id) return res.status(400).json({ error: 'id required' });
          const next = await store.patchPlanItem(body.id, body.patch || {});
          return res.status(next ? 200 : 404).json(next || { error: 'not found' });
        }
        case 'plan-delete': {
          if (!body.id) return res.status(400).json({ error: 'id required' });
          await store.deletePlanItem(body.id);
          return res.status(200).json({ ok: true, id: body.id });
        }
        case 'settings':
          return res.status(200).json(await store.putSettings(body.patch || {}));
        case 'generate': {
          if (!body.id) return res.status(400).json({ error: 'id required' });
          const out = await generate({ id: body.id, publish: !!body.publish });
          return res.status(out.status).json(out.body);
        }
        default:
          return res.status(400).json({ error: `unknown op "${op}"` });
      }
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
