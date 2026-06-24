#!/usr/bin/env node
/**
 * Velvet & Valor — AI cover-image generator ("Nano Banana Pro" / Gemini 3 Pro Image)
 * ---------------------------------------------------------------------------------
 * Generates on-brand 4:3 hero/cover images for blog posts, using Google's
 * Gemini 3 Pro Image model, then patches each post's frontmatter with `cover:` +
 * `coverAlt:` so `npm run build:blog` picks them up (fills the split hero + OG image).
 *
 * Setup:
 *   npm install                          # installs @google/genai (added to devDeps)
 *   export GEMINI_API_KEY=...            # key from Google AI Studio (aistudio.google.com)
 *
 * Run:
 *   npm run generate:covers                       # only posts missing a cover
 *   npm run generate:covers -- --all              # (re)generate every post
 *   npm run generate:covers -- --slug=<post-slug> # one specific post
 *   npm run generate:covers -- --dry-run          # print the prompts, no API calls, no cost
 *   npm run generate:covers -- --model=gemini-3-pro-image --size=4K
 *
 * Output: images/blog/<slug>.png — committed static files, zero runtime cost.
 * Every Gemini image carries an invisible SynthID watermark (Google policy).
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const config = require('../content/blog.config.js');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OUT_DIR = path.join(ROOT, 'images', 'blog');
const { categories, featuredProduct, site } = config;
const catName = (slug) => categories[slug] || slug;

/* ─────────────────────────── CLI ─────────────────────────── */
const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const val = (n, d) => {
  const a = argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const ALL = has('all');
const DRY = has('dry-run');
const ONLY_SLUG = val('slug', null);
const MODEL = val('model', process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview');
const ASPECT = val('aspect', '4:3');     // hero panel is 4:3
const SIZE = val('size', '2K');          // Nano Banana Pro: 1K | 2K | 4K

/* ──────────────────── brand "house style" anchor ──────────────────── */
// This prefix is the consistency engine: every cover shares it, so the set
// looks like one art-directed series rather than random stock.
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

function buildPrompt(data) {
  const cat = catName(data.category);
  const subject = `Create a ${ASPECT} landscape cover photograph for a journal article titled "${data.title}" — category: ${cat}.`;
  const theme = data.excerpt ? ` Editorial theme to evoke: ${data.excerpt}` : '';
  const refNote =
    ' A reference image of our actual leather phone case is provided: use it ONLY to match leather texture, colour palette and brand mood — do not force the product into frame unless it fits the subject naturally.';
  return `${BRAND_STYLE}\n\n${subject}${theme}${refNote}`;
}

/* ─────────────────────────── helpers ─────────────────────────── */
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'image/jpeg';

// Load the featured product photo as an inline reference part (brand anchor).
function referencePart() {
  if (!featuredProduct || !featuredProduct.image) return null;
  const rel = decodeURIComponent(featuredProduct.image.replace(/^\//, ''));
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.warn(`  ! reference image not found: ${rel} (continuing without it)`);
    return null;
  }
  return { inlineData: { mimeType: mimeOf(abs), data: fs.readFileSync(abs).toString('base64') } };
}

// Surgically set cover/coverAlt in the frontmatter WITHOUT re-dumping the whole
// YAML block (preserves faq:, keyTakeaways:, date formatting, key order, etc.).
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

function loadTargets() {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const filePath = path.join(POSTS_DIR, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(raw);
      const slug = data.slug || file.replace(/\.md$/, '');
      return { file, filePath, raw, data, slug };
    })
    .filter((p) => {
      if (ONLY_SLUG) return p.slug === ONLY_SLUG;
      if (ALL) return true;
      return !p.data.cover; // default: only posts missing a cover
    });
}

/* ─────────────────────────── main ─────────────────────────── */
async function main() {
  const targets = loadTargets();
  if (!targets.length) {
    console.log('Nothing to do — all posts already have a cover (use --all to regenerate, or --slug=<slug>).');
    return;
  }

  console.log(`Cover generator · model=${MODEL} · ${ASPECT} · ${SIZE} · ${DRY ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Targets (${targets.length}): ${targets.map((t) => t.slug).join(', ')}\n`);

  if (DRY) {
    targets.forEach((t) => {
      console.log(`── ${t.slug} ──\n${buildPrompt(t.data)}\n`);
    });
    console.log('Dry run complete — no API calls made, no images written.');
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('✗ Missing GEMINI_API_KEY (or GOOGLE_API_KEY). Get one at https://aistudio.google.com/apikey');
    process.exit(1);
  }

  let GoogleGenAI;
  try {
    ({ GoogleGenAI } = require('@google/genai'));
  } catch (e) {
    console.error('✗ @google/genai is not installed. Run: npm install');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const ref = referencePart();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const t of targets) {
    process.stdout.write(`• ${t.slug} … `);
    try {
      const parts = [];
      if (ref) parts.push(ref);
      parts.push({ text: buildPrompt(t.data) });

      const resp = await ai.models.generateContent({
        model: MODEL,
        contents: parts,
        config: {
          responseModalities: ['Image'],
          imageConfig: { aspectRatio: ASPECT, imageSize: SIZE },
        },
      });

      const out = (resp.candidates && resp.candidates[0] && resp.candidates[0].content && resp.candidates[0].content.parts) || [];
      const img = out.find((p) => p.inlineData && p.inlineData.data);
      if (!img) throw new Error('no image part in response');

      const ext = (img.inlineData.mimeType || 'image/png').split('/')[1].replace('jpeg', 'jpg');
      const fileName = `${t.slug}.${ext}`;
      fs.writeFileSync(path.join(OUT_DIR, fileName), Buffer.from(img.inlineData.data, 'base64'));

      const coverPath = `/images/blog/${fileName}`;
      const alt = `${t.data.title} — ${catName(t.data.category)} · ${site.brand}`;
      fs.writeFileSync(t.filePath, patchFrontmatter(t.raw, coverPath, alt));

      console.log(`✓ ${coverPath}`);
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }

  console.log('\nDone. Review the images in images/blog/, then run: npm run build:blog');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
