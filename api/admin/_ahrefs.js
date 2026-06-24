/**
 * Velvet & Valor — Ahrefs API v3 client (server-side keyword research).
 * Direct REST calls with AHREFS_API_KEY. Every method fails soft: on a missing
 * key, timeout, or API error it returns an empty result + a log line, so research
 * and generation never break because Ahrefs hiccuped.
 *
 * Monetary fields (cpc, traffic value) come back in USD cents — divide by 100.
 * Docs: https://docs.ahrefs.com/docs/api/reference/introduction
 */
const API_KEY = process.env.AHREFS_API_KEY;
const BASE = 'https://api.ahrefs.com/v3';

function isConfigured() {
  return Boolean(API_KEY);
}

async function get(path, params, log) {
  if (!isConfigured()) {
    log && log.push('ahrefs: AHREFS_API_KEY not set — skipped');
    return null;
  }
  const qs = new URLSearchParams(params).toString();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(`${BASE}${path}?${qs}`, {
      headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      log && log.push(`ahrefs ${path} → ${r.status}: ${t.slice(0, 160)}`);
      return null;
    }
    return await r.json();
  } catch (e) {
    log && log.push(`ahrefs ${path} → ${e.name === 'AbortError' ? 'timeout' : e.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Pick the dominant intent label from Ahrefs' intents object. */
function topIntent(intents) {
  if (!intents || typeof intents !== 'object') return '';
  const order = ['transactional', 'commercial', 'informational', 'navigational', 'local', 'branded'];
  for (const k of order) if (intents[k]) return k;
  return '';
}

/**
 * Volume + difficulty (+ intent, parent topic) for up to ~100 keywords in one call.
 * Returns a Map keyword(lowercased) → { volume, kd, cpc, intent, parentTopic }.
 */
async function overview(keywords, country = 'us', log = []) {
  const list = (keywords || []).map((k) => String(k).trim()).filter(Boolean);
  if (!list.length) return new Map();
  const data = await get('/keywords-explorer/overview', {
    select: 'keyword,volume,difficulty,cpc,intents,parent_topic',
    country,
    keywords: list.join(', '),
  }, log);
  const map = new Map();
  for (const row of (data && data.keywords) || []) {
    map.set(String(row.keyword || '').toLowerCase(), {
      keyword: row.keyword,
      volume: row.volume || 0,
      kd: row.difficulty == null ? null : row.difficulty,
      cpc: row.cpc == null ? null : row.cpc,         // USD cents
      intent: topIntent(row.intents),
      parentTopic: row.parent_topic || '',
    });
  }
  log.push(`ahrefs overview: ${map.size}/${list.length} keywords enriched`);
  return map;
}

/**
 * Keyword ideas containing a seed term, sorted by volume. Good source of
 * secondary/semantic keywords for the brief. Returns [{ keyword, volume, kd }].
 */
async function matchingTerms(seed, country = 'us', { limit = 40, maxKd = 100 } = {}, log = []) {
  if (!seed) return [];
  const data = await get('/keywords-explorer/matching-terms', {
    select: 'keyword,volume,difficulty',
    country,
    keywords: seed,
    match_mode: 'terms',
    order_by: 'volume:desc',
    limit: String(limit),
    where: JSON.stringify({ field: 'difficulty', is: ['lte', maxKd] }),
  }, log);
  const out = ((data && data.keywords) || [])
    .map((r) => ({ keyword: r.keyword, volume: r.volume || 0, kd: r.difficulty == null ? null : r.difficulty }))
    .filter((r) => r.keyword);
  log.push(`ahrefs matching-terms("${seed}"): ${out.length} ideas`);
  return out;
}

/**
 * Top organic SERP results for a keyword — the pages we're competing with.
 * Returns [{ position, url, title, domainRating, traffic, pageType }].
 */
async function serpOverview(keyword, country = 'us', topN = 10, log = []) {
  if (!keyword) return [];
  const data = await get('/serp-overview/serp-overview', {
    select: 'position,url,title,domain_rating,traffic,top_keyword,page_type,type',
    country,
    keyword,
    top_positions: String(topN),
  }, log);
  const rows = ((data && data.positions) || [])
    .filter((p) => Array.isArray(p.type) ? p.type.includes('organic') : true)
    .map((p) => ({
      position: p.position,
      url: p.url,
      title: p.title || '',
      domainRating: p.domain_rating,
      traffic: p.traffic || 0,
      pageType: p.page_type || '',
    }))
    .filter((p) => p.url);
  log.push(`ahrefs serp-overview("${keyword}"): ${rows.length} organic results`);
  return rows;
}

module.exports = { isConfigured, overview, matchingTerms, serpOverview, topIntent };
