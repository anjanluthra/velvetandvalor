#!/usr/bin/env node
/**
 * Build-time: overlay the admin-managed colourways (photos/labels/colour/sold-out)
 * from KV onto content/collections.js, so the page generators render the latest
 * catalog. Collection-level metadata (name, price, SEO, intro) stays sourced from
 * the committed file. Rewrites the file in the BUILD CONTAINER only — never the repo.
 *
 * Safety: this script NEVER fails the build. On any error or missing KV it leaves
 * the committed collections.js untouched and exits 0.
 */
const fs = require('fs');
const path = require('path');

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const FILE = path.join(__dirname, '..', 'content', 'collections.js');

async function main() {
  if (!URL || !TOKEN) { console.log('[sync-catalog] no KV configured — using committed collections.js'); return; }

  let kvCollections;
  try {
    const r = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['GET', 'vv:catalog']),
    });
    const data = await r.json();
    if (!data || !data.result) { console.log('[sync-catalog] KV catalog empty — using committed file'); return; }
    kvCollections = JSON.parse(data.result);
  } catch (e) { console.log('[sync-catalog] KV fetch failed (' + e.message + ') — using committed file'); return; }

  if (!Array.isArray(kvCollections) || !kvCollections.length) { console.log('[sync-catalog] no KV collections — skip'); return; }

  let cfg;
  try { cfg = require(FILE); } catch (e) { console.log('[sync-catalog] cannot load collections.js: ' + e.message); return; }

  const bySlug = {};
  kvCollections.forEach((c) => { if (c && c.slug) bySlug[c.slug] = c; });

  let changed = 0;
  (cfg.collections || []).forEach((col) => {
    const kv = bySlug[col.slug];
    if (kv && Array.isArray(kv.colourways)) {
      col.colourways = kv.colourways
        .filter((w) => !w.soldOut) // sold-out colourways are dropped from the live site
        .map((w) => {
          const images = (w.images && w.images.length) ? w.images : (w.image ? [w.image] : []);
          return { slug: w.slug, label: w.label, colour: w.colour, image: images[0] || '', images };
        });
      changed++;
    }
  });

  if (!changed) { console.log('[sync-catalog] no matching collections to overlay'); return; }

  const out = 'module.exports = ' + JSON.stringify({ site: cfg.site, collections: cfg.collections }, null, 2) + ';\n';
  fs.writeFileSync(FILE, out);
  console.log('[sync-catalog] overlaid colourways from KV into collections.js (' + changed + ' collections)');
}

main().then(() => process.exit(0)).catch((e) => { console.log('[sync-catalog] error (ignored): ' + e.message); process.exit(0); });
