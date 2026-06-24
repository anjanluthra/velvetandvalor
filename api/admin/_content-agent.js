/**
 * Velvet & Valor — Content generation agent (Claude).
 * Produces a publish-ready Markdown post (YAML frontmatter + body) in the exact
 * shape content/posts/*.md uses, so `npm run build:blog` renders it unchanged.
 *
 * Pipeline (manual / "Generate now"):
 *   3 parallel angle drafts → judge synthesis → mechanical quality gate → 1 fix pass.
 *
 * Output uses a delimiter format (not JSON-wrapped) so quotes/markup in the body
 * never break parsing. Key-gated: throws a clear error if ANTHROPIC_API_KEY is unset.
 *
 * Env: ANTHROPIC_API_KEY, CLAUDE_MODEL (default claude-sonnet-4-6).
 */
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
const AUTHOR_SLUG = 'kate-luthra';

function isConfigured() {
  return Boolean(API_KEY);
}

/* ─────────────────────────── Claude call ─────────────────────────── */

async function callClaude(system, user, { maxTokens = 4096, temperature = 0.7 } = {}) {
  if (!isConfigured()) throw new Error('ANTHROPIC_API_KEY not set — server-side generation unavailable');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Anthropic ${r.status}: ${t.slice(0, 300)}`);
  }
  const data = await r.json();
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

/* ─────────────────────────── voice + rules ─────────────────────────── */

const BANNED_PHRASES = [
  "in today's digital landscape", 'in todays digital landscape',
  'never been more important', 'game-changer', 'game changer',
  "it's not just", 'is crucial', 'is essential in', 'navigating the world of',
  'when it comes to', 'in the ever-evolving', 'unlock the', 'elevate your',
  'dive into', 'in conclusion', 'at the end of the day',
];

const ANGLES = [
  { key: 'comprehensive', label: 'comprehensive/authoritative',
    note: 'Cover the topic thoroughly and definitively. Anticipate every reasonable question a reader has and answer it.' },
  { key: 'practical', label: 'practical/actionable',
    note: 'Lead with what to actually do. Concrete steps, specifics, and a clear "what to do this week".' },
  { key: 'opinionated', label: 'opinionated/experience-led',
    note: 'Write from lived equestrian + atelier experience. Take a clear point of view a content farm could not.' },
];

function buildSystemPrompt({ item, cluster, enrichment, relatedLinks }) {
  const secondary = (enrichment && enrichment.secondaryKeywords || [])
    .slice(0, 12).map((k) => k.keyword).filter(Boolean);
  const competitors = (enrichment && enrichment.competitors || [])
    .slice(0, 6).map((c) => `- ${c.title} (${c.url})`).join('\n');
  const related = (relatedLinks || []).slice(0, 4)
    .map((l) => `- ${l.title} → ${l.url}`).join('\n');
  const kw = item.targetKeyword;
  const isBrand = !kw;

  return `You are a senior content writer for Velvet & Valor, a luxury equestrian brand that makes artist-designed, handcrafted full-grain leather iPhone cases. Voice: refined, knowledgeable, warm; British English; address the reader as "you". Data-backed but NEVER fabricated. You write for The Equestrian Journal.

ARTICLE BRIEF
- Title (working): ${item.title}
- Cluster: ${cluster ? cluster.name : item.cluster} — ${cluster ? cluster.brief : ''}
- Category slug: ${cluster ? cluster.categorySlug : ''}
${isBrand ? '- This is a BRAND/STORYTELLING piece with minimal search demand — write for the existing audience (email/social), prioritise voice and usefulness over keyword optimisation.' : `- Primary keyword (US): "${kw}"  ${enrichment && enrichment.searchVolume ? `(vol ${enrichment.searchVolume}, KD ${enrichment.kd})` : ''}`}
- Target length: ~${item.wordCount} words
- Reader intent: ${item.intent}
${secondary.length ? `- Secondary/semantic keywords to weave in naturally: ${secondary.join(', ')}` : ''}
${competitors ? `- Page-1 competitors (do better, find the gap they miss):\n${competitors}` : ''}

INTERNAL LINKING (use EXACT URLs, never invent one)
- Link ONCE to the money page with a natural anchor in the first half: ${item.moneyPage}
${related ? `- Link to 2–3 related Journal articles where relevant:\n${related}` : ''}
- Where a horse-bond / personalisation angle fits, link to /custom.

STRUCTURE (Markdown body)
- Start with a paragraph — NO H1 (the title is added by the template).
${isBrand ? '- 4–6 H2 sections (##).' : `- Answer the keyword's question in the first ~100 words, using the exact phrase "${kw}".`}
- ${isBrand ? '' : `Put "${kw}" in the title, the opening, and at least one H2.`}
- 6–8 H2 (##) sections; use ### sub-headings, bullet lists, and **bold** where genuinely useful.
- End the body with an "## FAQ" section is NOT needed in the body — FAQ goes in the FAQ field below.
- Concrete, observational opening. Do NOT open with a statistic.

FACTUAL INTEGRITY (non-negotiable)
- Never invent a statistic and attribute it to a real organisation. No real source → use directional language, no fake number or link.
- Every specific number you cite must be real and verifiable.
- Include at least one genuine insight a practising equestrian/leather atelier would know.

BANNED PHRASES (never use, opening or anywhere): ${BANNED_PHRASES.slice(0, 12).join('; ')}.

OUTPUT FORMAT — output EXACTLY this, nothing before or after:
META: <meta description, <=155 chars, ${isBrand ? 'compelling' : `includes "${kw}"`}>
EXCERPT: <1–2 sentence excerpt for cards/sidebar>
TAGS: <3–5 comma-separated tags>
KEYTAKEAWAYS:
- <takeaway 1>
- <takeaway 2>
- <takeaway 3>
- <takeaway 4>
FAQ:
Q: <question 1>
A: <answer 1>
Q: <question 2>
A: <answer 2>
Q: <question 3>
A: <answer 3>
===ARTICLE===
<full Markdown body, starting with a paragraph>`;
}

/* ─────────────────────────── parse + assemble ─────────────────────────── */

function field(text, label) {
  const re = new RegExp(`^${label}:\\s*(.*)$`, 'mi');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function parseDraft(text) {
  const [head, ...rest] = text.split(/^===ARTICLE===\s*$/m);
  const body = rest.join('===ARTICLE===').trim();
  const meta = field(head, 'META');
  const excerpt = field(head, 'EXCERPT');
  const tags = field(head, 'TAGS').split(',').map((t) => t.trim()).filter(Boolean);

  const ktBlock = (head.match(/KEYTAKEAWAYS:\s*([\s\S]*?)(?:\nFAQ:|$)/i) || [])[1] || '';
  const keyTakeaways = ktBlock.split('\n').map((l) => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);

  const faqBlock = (head.match(/FAQ:\s*([\s\S]*)$/i) || [])[1] || '';
  const faq = [];
  const qRe = /Q:\s*(.+?)\s*\nA:\s*([\s\S]*?)(?=\nQ:|\n*$)/g;
  let m;
  while ((m = qRe.exec(faqBlock))) faq.push({ q: m[1].trim(), a: m[2].trim() });

  return { meta, excerpt, tags, keyTakeaways, faq, body };
}

const yamlStr = (s) => `"${String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

function assembleMarkdown(item, cluster, parsed, dateISO) {
  const fm = [];
  fm.push('---');
  fm.push(`title: ${yamlStr(item.title)}`);
  fm.push(`description: ${yamlStr(parsed.meta)}`);
  if (parsed.excerpt) fm.push(`excerpt: ${yamlStr(parsed.excerpt)}`);
  fm.push(`category: ${cluster ? cluster.categorySlug : 'equestrian-life'}`);
  fm.push(`tags: [${parsed.tags.map(yamlStr).join(', ')}]`);
  fm.push(`author: ${AUTHOR_SLUG}`);
  fm.push(`date: ${dateISO}`);
  fm.push(`featured: false`);
  if (parsed.keyTakeaways.length) {
    fm.push('keyTakeaways:');
    parsed.keyTakeaways.forEach((k) => fm.push(`  - ${yamlStr(k)}`));
  }
  if (parsed.faq.length) {
    fm.push('faq:');
    parsed.faq.forEach((f) => { fm.push(`  - q: ${yamlStr(f.q)}`); fm.push(`    a: ${yamlStr(f.a)}`); });
  }
  fm.push('---');
  fm.push('');
  return fm.join('\n') + '\n' + parsed.body.trim() + '\n';
}

/* ─────────────────────────── quality gate ─────────────────────────── */

function wordCount(s) { return (s.match(/[A-Za-z0-9’'-]+/g) || []).length; }

function validateArticle(item, parsed) {
  const failures = [];
  const bodyLc = parsed.body.toLowerCase();
  const kw = (item.targetKeyword || '').toLowerCase();

  if (kw) {
    const first200 = bodyLc.split(/\s+/).slice(0, 200).join(' ');
    if (!first200.includes(kw)) failures.push(`target keyword "${item.targetKeyword}" missing from opening ~200 words`);
    const h2s = (parsed.body.match(/^##\s+.*$/gm) || []).join(' ').toLowerCase();
    const rootWords = kw.split(/\s+/).filter((w) => w.length > 3);
    const inH2 = h2s.includes(kw) || rootWords.filter((w) => h2s.includes(w)).length >= Math.min(2, rootWords.length);
    if (!inH2) failures.push('target keyword (or its root words) missing from any H2');
    if (parsed.meta && !parsed.meta.toLowerCase().includes(kw)) failures.push('target keyword missing from meta description');
  }

  const wc = wordCount(parsed.body);
  if (wc < item.wordCount * 0.8) failures.push(`too short: ${wc} words (target ~${item.wordCount}, min ${Math.round(item.wordCount * 0.8)})`);

  if (item.moneyPage && !parsed.body.includes(item.moneyPage)) failures.push(`money-page link ${item.moneyPage} missing from body`);

  const hay = (parsed.body + ' ' + parsed.meta).toLowerCase();
  const hitBanned = BANNED_PHRASES.filter((p) => hay.includes(p));
  if (hitBanned.length) failures.push(`banned phrase(s): ${hitBanned.join(', ')}`);

  if (!parsed.faq.length) failures.push('no FAQ generated');
  if (!parsed.keyTakeaways.length) failures.push('no key takeaways generated');

  return { ok: failures.length === 0, failures, wordCount: wc };
}

/* ─────────────────────────── orchestration ─────────────────────────── */

/**
 * Generate one article. ctx: { item, cluster, enrichment, relatedLinks, dateISO, onStage }
 * Returns { markdown, parsed, gate, slug }.
 */
async function generate(ctx) {
  const { item, cluster, enrichment, relatedLinks, dateISO } = ctx;
  const onStage = ctx.onStage || (() => {});
  const system = buildSystemPrompt({ item, cluster, enrichment, relatedLinks });

  // draft — 3 angles in parallel
  onStage('draft', `drafting 3 angles with ${MODEL}`);
  const drafts = (await Promise.all(ANGLES.map((a) =>
    callClaude(system, `Write the article now with a ${a.label} angle. ${a.note}`, { maxTokens: 5000, temperature: 0.8 })
      .then((t) => ({ angle: a.key, text: t }))
      .catch(() => null)
  ))).filter(Boolean);
  if (!drafts.length) throw new Error('all drafts failed');

  // synthesize — judge writes one superior article
  let finalText;
  if (drafts.length === 1) {
    finalText = drafts[0].text;
  } else {
    onStage('synthesize', `judging + synthesising ${drafts.length} drafts`);
    const judgeUser = `Below are ${drafts.length} independent drafts of the same article. Write ONE superior final article that takes the strongest material, structure, and insight from each. Keep the exact output format (META/EXCERPT/TAGS/KEYTAKEAWAYS/FAQ/===ARTICLE===).\n\n` +
      drafts.map((d, i) => `=== DRAFT ${i + 1} (${d.angle}) ===\n${d.text}`).join('\n\n');
    finalText = await callClaude(system, judgeUser, { maxTokens: 5000, temperature: 0.6 });
  }

  let parsed = parseDraft(finalText);

  // validate + one fix pass
  onStage('validate', 'quality gate');
  let gate = validateArticle(item, parsed);
  if (!gate.ok) {
    const fixUser = `Your article failed these mechanical checks:\n- ${gate.failures.join('\n- ')}\n\nRewrite the FULL article fixing every issue, keeping the exact output format. Here is your draft:\n\n${finalText}`;
    try {
      const fixed = await callClaude(system, fixUser, { maxTokens: 5000, temperature: 0.5 });
      const reparsed = parseDraft(fixed);
      const regate = validateArticle(item, reparsed);
      if (regate.failures.length <= gate.failures.length) { parsed = reparsed; gate = regate; }
    } catch { /* keep original */ }
  }

  const markdown = assembleMarkdown(item, cluster, parsed, dateISO);
  return { markdown, parsed, gate, slug: item.id || item.slug };
}

/**
 * Turn a batch of keywords into compelling, editorial article titles (not just
 * the keyword title-cased). One Claude call for the whole batch. Returns a map
 * keyword(lowercased) → title. Fails soft to {} so callers fall back gracefully.
 */
async function suggestTitles(items, cluster) {
  if (!isConfigured() || !items || !items.length) return {};
  const list = items.map((it, i) => `${i + 1}. ${it.targetKeyword}`).join('\n');
  const system = `You are the editor of The Equestrian Journal by Velvet & Valor, a luxury equestrian leather brand. You write compelling, accurate article titles — the kind a real editor writes, NOT the keyword repeated back. Keep the keyword's search intent, be specific and inviting, Title Case, ~40–65 characters, no clickbait or fabricated numbers. Examples: "girl horse names" → "Girl Horse Names: 200+ Ideas for Your Mare"; "equestrian meaning" → "What Does \\"Equestrian\\" Actually Mean?"; "how to clean a silicone phone case" → "How to Clean a Silicone Phone Case (Without Wrecking It)".`;
  const user = `Cluster: ${cluster ? cluster.name : 'General'}.\nWrite ONE title for each keyword below. Return ONLY a JSON array of {"keyword","title"} objects, same order, no prose:\n${list}`;
  try {
    const txt = await callClaude(system, user, { maxTokens: 1800, temperature: 0.7 });
    const arr = JSON.parse(txt.slice(txt.indexOf('['), txt.lastIndexOf(']') + 1));
    const map = {};
    for (const r of arr) if (r && r.keyword && r.title) map[String(r.keyword).toLowerCase()] = String(r.title).trim();
    return map;
  } catch {
    return {};
  }
}

module.exports = {
  isConfigured, MODEL, generate, suggestTitles, validateArticle, parseDraft, assembleMarkdown, buildSystemPrompt,
  BANNED_PHRASES,
};
