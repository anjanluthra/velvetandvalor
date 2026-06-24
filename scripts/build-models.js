#!/usr/bin/env node
/**
 * Velvet & Valor — per-model variant page generator (Tier 2).
 *
 *   node scripts/build-models.js              → build all 24 model pages
 *   node scripts/build-models.js --only iphone-17-pro-max
 *
 * Each page is a search-results listing of every case that fits the model
 * (all 17 today), pre-locked to that iPhone. Built with the shared renderer in
 * scripts/lib/search-page.js so the variant, collection and hub tiers match.
 * Per-model copy (name, fit specs, FAQ) keeps each page out of thin/duplicate
 * territory. Add next year's line in content/iphone-models.js, then rerun.
 */

const fs = require('fs');
const path = require('path');
const { series } = require('../content/iphone-models');
const { catalogue, renderSearchPage } = require('./lib/search-page');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'collections');
const BASE = 'https://www.velvet-valor.com';
const BRAND = 'Velvet & Valor';

const models = series.flatMap(s => s.models.map(m => ({ ...m, series: s.name, year: s.year })));
const PRODUCTS = catalogue();

function pageFor(m) {
  const cam = m.cameras.toLowerCase();
  return renderSearchPage({
    title: `Horse ${m.name} Cases — Luxury Equestrian Phone Cases | ${BRAND}`,
    desc: `Shop ${PRODUCTS.length} artist-designed horse & equestrian ${m.name} cases from $40. Cut for the ${m.name} (${m.display}, ${cam}), MagSafe compatible. Worldwide shipping.`,
    canonical: `${BASE}/collections/${m.slug}-cases`,
    h1: `Horse ${m.name} Cases`,
    intro: `Artist-designed equestrian cases, cut for the ${m.name} — ${m.display} display, MagSafe compatible, premium glossy finish.`,
    breadcrumb: [
      { label: 'Home', href: '/' },
      { label: 'iPhone Cases', href: '/collections/iphone-cases' },
      { label: m.name },
    ],
    lock: { label: m.name },
    products: PRODUCTS,
    showCollectionFilter: true,
    buyDevice: m.device,
    modelNav: { series, current: m.slug, mode: 'nav' },
    seoTitle: `Horse cases for the ${m.name}`,
    seoLead: `Every Velvet &amp; Valor case on this page is cut specifically for the <b style="color:#fff;font-weight:500">${m.name}</b> — precise cut-outs for the ${m.display} display, ${cam} array and side buttons, with full MagSafe alignment. Each design is an original equestrian portrait, hand-finished in a premium glossy finish.`,
    seoBody: `Choose a signature <a href="/collections/noble-steed">Noble Steed</a> horse portrait in ten colourways, or a quote-edition <a href="/collections/riders-motto">Rider&rsquo;s Motto</a> case. Prefer your own horse? Turn any photograph into a one-of-one <a href="/custom">custom portrait case</a> for the ${m.name}.`,
    faq: [
      { q: `Will these cases fit my ${m.name}?`, a: `Yes — every case here is made specifically for the ${m.name} (${m.display} display, ${cam}), with exact cut-outs for the ports, buttons and camera array.` },
      { q: 'Are they MagSafe compatible?', a: `All cases support full MagSafe magnetic alignment and wireless charging on the ${m.name}.` },
      { q: 'How long does delivery take?', a: 'Cases typically ship within 3–5 days, worldwide. Expedited options appear at checkout.' },
      { q: `Can I put my own horse on a ${m.name} case?`, a: `Yes — our <a href="/custom">custom portrait</a> service turns a photo of your horse into a hand-finished case cut for the ${m.name}.` },
    ],
  });
}

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;
const targets = only ? models.filter(m => m.slug === only) : models;

if (only && targets.length === 0) {
  console.error(`No model "${only}". Valid: ${models.map(m => m.slug).join(', ')}`);
  process.exit(1);
}

let n = 0;
for (const m of targets) {
  fs.writeFileSync(path.join(OUT_DIR, `${m.slug}-cases.html`), pageFor(m));
  console.log(`  ✓ collections/${m.slug}-cases.html  →  ${m.primaryKw}`);
  n++;
}
console.log(`\nBuilt ${n} model page${n === 1 ? '' : 's'}.  Each lists ${PRODUCTS.length} products.`);
