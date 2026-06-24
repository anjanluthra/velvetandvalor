#!/usr/bin/env node
/**
 * Velvet & Valor — design/collection page generator (Tier 3).
 *
 *   node scripts/build-collections.js            → build all collection pages
 *   node scripts/build-collections.js --only noble-steed
 *
 * Each page is a search-results listing locked to one design (its colourways),
 * built with the shared renderer in scripts/lib/search-page.js so it matches
 * the variant + hub tiers. Replaces the old #anchor sections with real URLs.
 */

const fs = require('fs');
const path = require('path');
const cfg = require('../content/collections');
const { catalogue, renderSearchPage } = require('./lib/search-page');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'collections');
const BASE = cfg.site.baseUrl;
const ALL = catalogue();

function pageFor(c) {
  const products = ALL.filter(p => p.designSlug === c.slug);
  const other = c.slug === 'noble-steed' ? 'riders-motto' : 'noble-steed';
  const otherName = c.slug === 'noble-steed' ? 'The Rider’s Motto' : 'Noble Steed';
  return renderSearchPage({
    title: c.title,
    desc: `Shop the ${c.name} collection — artist-designed horse & equestrian iPhone cases from ${c.price}. ${products.length} colourways, cut for all 24 iPhone models, MagSafe compatible. Worldwide shipping.`,
    canonical: `${BASE}/collections/${c.slug}`,
    h1: c.h1,
    intro: c.intro,
    breadcrumb: [
      { label: 'Home', href: '/' },
      { label: 'iPhone Cases', href: '/collections/iphone-cases' },
      { label: c.name },
    ],
    lock: { label: c.name },
    products,
    showCollectionFilter: false,
    buyDevice: null,
    seoTitle: `${c.name} — luxury equestrian iPhone cases`,
    seoLead: c.seo.lead,
    seoBody: c.seo.body,
    faq: [
      { q: `What is the ${c.name} collection?`, a: `${c.name} is a Velvet &amp; Valor series of artist-designed equestrian iPhone cases, available in ${products.length} colourways, cut for all 24 iPhone models.` },
      { q: 'Which iPhone models do these fit?', a: 'Every case is cut for your exact iPhone — all models from iPhone 12 to iPhone 17. Choose your model on the product page or browse the <a href="/collections/iphone-cases">full collection</a>.' },
      { q: 'Are they MagSafe compatible?', a: 'Yes — every case supports full MagSafe magnetic alignment and wireless charging.' },
      { q: `Can I see other designs?`, a: `Of course — explore the <a href="/collections/${other}">${otherName}</a> series, or commission your own horse as a <a href="/custom">custom portrait case</a>.` },
    ],
  });
}

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;
const targets = only ? cfg.collections.filter(c => c.slug === only) : cfg.collections;

if (only && targets.length === 0) {
  console.error(`No collection "${only}". Valid: ${cfg.collections.map(c => c.slug).join(', ')}`);
  process.exit(1);
}

let n = 0;
for (const c of targets) {
  const products = ALL.filter(p => p.designSlug === c.slug);
  fs.writeFileSync(path.join(OUT_DIR, `${c.slug}.html`), pageFor(c));
  console.log(`  ✓ collections/${c.slug}.html  →  ${c.seo.primaryKw}  (${products.length} colourways)`);
  n++;
}
console.log(`\nBuilt ${n} collection page${n === 1 ? '' : 's'}.`);
