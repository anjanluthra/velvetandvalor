#!/usr/bin/env node
/**
 * Velvet & Valor — iPhone category hub generator (Tier 1).
 *   node scripts/build-hub.js   → writes collections/iphone-cases.html
 *
 * The hub is a search-results listing of every case (all 17), with NO model
 * lock, plus the "Shop by iPhone Model" router grid that links to all 24
 * per-model pages (internal-linking hub for SEO). Same shared renderer as the
 * variant + collection tiers.
 */

const fs = require('fs');
const path = require('path');
const { series } = require('../content/iphone-models');
const { catalogue, renderSearchPage } = require('./lib/search-page');

const ROOT = path.join(__dirname, '..');
const BASE = 'https://www.velvet-valor.com';
const PRODUCTS = catalogue();

const html = renderSearchPage({
  title: 'Horse iPhone Cases — Luxury Equestrian Phone Cases | Velvet & Valor',
  desc: 'Shop luxury horse & equestrian iPhone cases from $40. Artist-designed horse phone cases for iPhone 17, 16, 15, 14, 13 & 12 in a premium glossy finish. Worldwide shipping.',
  canonical: `${BASE}/collections/iphone-cases`,
  extraHead: '  <meta name="google-site-verification" content="x7mVJoxLwBmsE4siMV3RvWYQhm2_hkhxpUsnyDUf874" />',
  h1: 'Horse & Equestrian iPhone Cases',
  intro: 'Luxury horse phone cases, artist-designed for every iPhone. Equestrian-inspired designs in a premium glossy finish — cut for iPhone 17, 16, 15, 14, 13 &amp; 12. Pick your model on the left for a precise fit.',
  breadcrumb: [
    { label: 'Home', href: '/' },
    { label: 'iPhone Cases' },
  ],
  lock: null,
  products: PRODUCTS,
  showCollectionFilter: true,
  buyDevice: null,
  modelNav: { series, current: null, mode: 'filter' },
  seoTitle: 'Luxury horse & equestrian iPhone cases',
  seoLead: 'Velvet &amp; Valor makes artist-designed horse phone cases for every iPhone — original equestrian portraits and quote editions, hand-finished in a premium glossy finish. Not a mass-produced print, but a piece of equestrian art you carry every day.',
  seoBody: 'Browse the signature <a href="/collections/noble-steed">Noble Steed</a> horse-portrait series in ten colourways, or the quote-edition <a href="/collections/riders-motto">Rider&rsquo;s Motto</a> cases. Every case is cut for your exact iPhone and MagSafe compatible — pick your model above. Prefer your own horse? Commission a one-of-one <a href="/custom">custom portrait case</a>.',
  faq: [
    { q: 'Which iPhone models do your horse cases fit?', a: 'Every design is cut for all 24 iPhone models, from iPhone 12 to iPhone 17 Pro Max. Choose your model from the grid above or on the product page.' },
    { q: 'Are the cases MagSafe compatible?', a: 'Yes — every Velvet &amp; Valor case supports full MagSafe magnetic alignment and wireless charging.' },
    { q: 'Can I put my own horse on a case?', a: 'Yes — our <a href="/custom">custom portrait</a> service turns a photograph of your horse into a hand-finished case for any iPhone.' },
    { q: 'How long does delivery take?', a: 'Cases typically ship within 3–5 days, worldwide. Expedited options appear at checkout.' },
  ],
});

fs.writeFileSync(path.join(ROOT, 'collections', 'iphone-cases.html'), html);
console.log(`  ✓ collections/iphone-cases.html  →  horse iphone cases hub (${PRODUCTS.length} products + 24-model router grid)`);
