#!/usr/bin/env node
/**
 * Velvet & Valor — gifting pillar generator (Tier 4).
 *
 *   node scripts/build-gifts.js                 → build the gift hub + all guides
 *   node scripts/build-gifts.js --only horse-lovers
 *
 * Writes gifts/<slug>.html (hub = gifts/index.html → /gifts). Now built on the
 * SHARED search-results renderer (scripts/lib/search-page.js) so the gifting
 * tier looks like the collection/variant tiers — same cards, filters, value +
 * discovery + guides modules and footer — with each page's unique gift copy,
 * FAQ and keyword. Gifts aren't model-specific, so there's no iPhone Model
 * filter (the recipient's model is chosen on the product page).
 */

const fs = require('fs');
const path = require('path');
const { gifts } = require('../content/gifts');
const { catalogue, renderSearchPage } = require('./lib/search-page');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'gifts');
const BASE = 'https://www.velvet-valor.com';
const PRODUCTS = catalogue();

const urlFor = g => `${BASE}/gifts${g.slug === 'index' ? '' : '/' + g.slug}`;
const stripTags = s => String(s).replace(/<[^>]+>/g, '');

// Cross-links across the gifting cluster (preserves internal linking the old
// "More gift guides" row provided) — appended to each page's SEO copy.
const SUBS = gifts.filter(g => !g.isHub);
function moreGuides(currentSlug) {
  const links = SUBS.filter(g => g.slug !== currentSlug).slice(0, 5)
    .map(g => `<a href="/gifts/${g.slug}">${g.h1}</a>`).join(' &middot; ');
  return `\n      <p><strong style="color:#fff;font-weight:500">More gift guides:</strong> ${links} &middot; <a href="/gifts">all gifts</a>.</p>`;
}

function pageFor(g) {
  const url = urlFor(g);
  return renderSearchPage({
    title: g.title,
    desc: stripTags(g.intro).slice(0, 158),
    canonical: url,
    h1: g.h1,
    intro: g.intro,
    breadcrumb: g.isHub
      ? [{ label: 'Home', href: '/' }, { label: 'Gifts' }]
      : [{ label: 'Home', href: '/' }, { label: 'Gifts', href: '/gifts' }, { label: g.h1 }],
    lock: null,
    products: PRODUCTS,
    showCollectionFilter: true,
    buyDevice: null,
    seoTitle: g.h1,
    seoLead: g.seo.lead,
    seoBody: g.seo.body + moreGuides(g.slug),
    faq: g.faq,
  });
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;
const targets = only ? gifts.filter(g => g.slug === only) : gifts;

if (only && targets.length === 0) {
  console.error(`No gift page "${only}". Valid: ${gifts.map(g => g.slug).join(', ')}`);
  process.exit(1);
}

let n = 0;
for (const g of targets) {
  fs.writeFileSync(path.join(OUT_DIR, `${g.slug}.html`), pageFor(g));
  console.log(`  ✓ gifts/${g.slug}.html  →  ${g.kw}`);
  n++;
}
console.log(`\nBuilt ${n} gift page${n === 1 ? '' : 's'} (search-results template).`);
