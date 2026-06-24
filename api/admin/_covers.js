/**
 * Velvet & Valor — server-side AI cover generator ("Nano Banana Pro" / Gemini 3 Pro Image).
 * Used by the content engine so articles published from the admin panel get an
 * on-brand hero/cover image automatically (no separate `npm run generate:covers`).
 *
 * Talks to the Gemini REST API directly (no @google/genai dependency, which lives
 * in devDependencies and isn't guaranteed in the serverless runtime bundle).
 *
 * Env: GEMINI_API_KEY (or GOOGLE_API_KEY). Optional: GEMINI_IMAGE_MODEL.
 * Fail-soft by design: any error returns null so publishing still succeeds.
 */
const fs = require('fs');
const path = require('path');
const config = require('../../content/blog.config.js');

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
// Cheaper image model to fall back to when the primary (Pro) returns 429/quota —
// free-tier keys typically can't call Nano Banana Pro but CAN call this one.
// Set to '' to disable the fallback. Skipped if it equals the primary model.
const FALLBACK_MODEL = process.env.GEMINI_IMAGE_FALLBACK_MODEL || 'gemini-2.5-flash-image';
const ASPECT = '4:3'; // matches the split hero panel
// Hard ceiling so a slow image gen can't push the publish function past Hobby's
// 60s limit — on timeout we fall back to publishing with no cover.
const TIMEOUT_MS = parseInt(process.env.COVER_TIMEOUT_MS || '40000', 10);
const { categories, featuredProduct, site } = config;
const catName = (slug) => categories[slug] || slug;

function isConfigured() {
  return Boolean(API_KEY);
}

// Shared "house style" anchor — keep in lockstep with scripts/generate-covers.js
// so admin-generated covers match the hand-run batch.
const BRAND_STYLE = [
  'Editorial still-life photography for a luxury equestrian leather-goods house (Velvet & Valor).',
  'Quiet-luxury, heritage-craftsmanship mood — think a high-end print journal.',
  'Palette: deep obsidian navy and warm cream / ivory, with restrained teal-green (hex #1A9090) and aged-brass accents.',
  'Full-grain Italian leather with visible natural grain; subtle equestrian cues (saddle stitching, bridle leather, stable light, brass hardware).',
  'Soft directional natural light, gentle shadows, shallow depth of field, generous negative space, refined magazine-cover composition.',
  'Photorealistic, tasteful, understated — never garish or busy.',
  'Absolutely NO text, words, letters, numerals, logos, captions or watermarks anywhere in the image.',
  'No human faces unless clearly required by the subject.',
].join(' ');

function buildPrompt({ title, excerpt, category }) {
  const subject = `Create a ${ASPECT} landscape cover photograph for a journal article titled "${title}" — category: ${catName(category)}.`;
  const theme = excerpt ? ` Editorial theme to evoke: ${excerpt}` : '';
  const refNote =
    ' A reference image of our actual leather phone case is provided: use it ONLY to match leather texture, colour palette and brand mood — do not force the product into frame unless it fits the subject naturally.';
  return `${BRAND_STYLE}\n\n${subject}${theme}${refNote}`;
}

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// Best-effort: load the featured product photo as a brand reference part. Returns
// null if the file isn't bundled into the function — generation still works.
function referencePart() {
  try {
    if (!featuredProduct || !featuredProduct.image) return null;
    const rel = decodeURIComponent(featuredProduct.image.replace(/^\//, ''));
    const abs = path.join(process.cwd(), rel);
    if (!fs.existsSync(abs)) return null;
    const mimeType = MIME[path.extname(abs).toLowerCase()] || 'image/jpeg';
    return { inline_data: { mime_type: mimeType, data: fs.readFileSync(abs).toString('base64') } };
  } catch {
    return null;
  }
}

/**
 * Surgically set cover/coverAlt in a post's frontmatter WITHOUT re-dumping the
 * YAML (preserves faq:, keyTakeaways:, key order). Mirrors generate-covers.js.
 */
function patchFrontmatter(raw, coverPath, alt) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return raw;
  let fm = m[1];
  const coverLine = `cover: "${coverPath}"`;
  const altLine = `coverAlt: ${JSON.stringify(alt)}`;
  fm = /^cover:.*$/m.test(fm) ? fm.replace(/^cover:.*$/m, coverLine) : `${fm}\n${coverLine}`;
  fm = /^coverAlt:.*$/m.test(fm) ? fm.replace(/^coverAlt:.*$/m, altLine) : `${fm}\n${altLine}`;
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${fm}\n---`);
}

/**
 * Generate one cover image. Returns { data (base64), ext, mimeType } or null
 * (never throws — publishing must proceed even if image generation fails).
 */
async function generateCover({ title, excerpt, category }) {
  if (!isConfigured()) return { error: 'GEMINI_API_KEY not set' };
  try {
    const parts = [];
    const ref = referencePart();
    if (ref) parts.push(ref);
    parts.push({ text: buildPrompt({ title, excerpt, category }) });

    const body = JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: ASPECT } },
    });
    const attempt = (model) => fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctrl.signal }
    );
    // Try the primary (Pro) model first; on a non-ok response (esp. 429/quota) fall
    // back to the cheaper model, which free-tier keys can usually call. One shared
    // deadline across all attempts so a retry can never push us past the 60s budget;
    // never retry after a timeout/abort, which means we're out of time.
    const models = [MODEL, FALLBACK_MODEL].filter((m, i, a) => m && a.indexOf(m) === i);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let r;
    try {
      for (let i = 0; i < models.length; i++) {
        try {
          r = await attempt(models[i]);
        } catch (err) {
          if (ctrl.signal.aborted) throw err; // timed out — no budget to keep trying
          console.warn('covers: Gemini fetch error', models[i], err && err.message);
          continue;
        }
        if (r.ok || ctrl.signal.aborted) break;
        console.warn('covers: Gemini', models[i], r.status, (await r.clone().text().catch(() => '')).slice(0, 160), i < models.length - 1 ? '— falling back' : '');
      }
    } finally {
      clearTimeout(timer);
    }
    if (!r) return { error: 'no response from Gemini (network error or timeout)' };
    if (!r.ok) {
      const bodyText = (await r.text().catch(() => '')).slice(0, 300);
      console.warn('covers: Gemini', r.status, bodyText);
      return { error: `Gemini HTTP ${r.status}${bodyText ? ': ' + bodyText : ''}` };
    }
    const data = await r.json();
    const out = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    const img = out.find((p) => (p.inlineData && p.inlineData.data) || (p.inline_data && p.inline_data.data));
    if (!img) {
      // No image part — usually a safety block or a text-only response. Surface why.
      const finish = ((data.candidates || [])[0] || {}).finishReason;
      const block = (data.promptFeedback || {}).blockReason;
      return { error: `Gemini returned no image${finish ? ` (finishReason=${finish})` : ''}${block ? ` (blocked=${block})` : ''}` };
    }
    const inline = img.inlineData || img.inline_data;
    const srcMime = inline.mimeType || inline.mime_type || 'image/png';
    // Optimise to a small WebP (resize + compress) so the hero is super light.
    // Fail-soft: if sharp isn't available we commit the original raster instead.
    const webp = await toWebp(inline.data);
    if (webp) return webp;
    const ext = srcMime.split('/')[1].replace('jpeg', 'jpg');
    return { data: inline.data, ext, mimeType: srcMime };
  } catch (e) {
    const reason = (e && e.name === 'AbortError') ? `timed out after ${TIMEOUT_MS}ms` : (e && e.message) || 'unknown error';
    console.warn('covers: error', reason);
    return { error: reason };
  }
}

// Convert a base64 raster (PNG/JPEG from Gemini) into a small, optimised WebP.
// Lazy-require sharp so a missing/broken native binary can't crash publishing —
// returns null on any failure and the caller commits the original instead.
async function toWebp(base64) {
  try {
    const sharp = require('sharp');
    const out = await sharp(Buffer.from(base64, 'base64'))
      .resize({ width: 1200, withoutEnlargement: true }) // hero never renders wider than this
      .webp({ quality: 68, effort: 4 })
      .toBuffer();
    return { data: out.toString('base64'), ext: 'webp', mimeType: 'image/webp' };
  } catch (e) {
    console.warn('covers: webp conversion unavailable, using original —', e && e.message);
    return null;
  }
}

const coverAltFor = (title, category) => `${title} — ${catName(category)} · ${site.brand}`;

module.exports = { isConfigured, generateCover, patchFrontmatter, coverAltFor, MODEL };
