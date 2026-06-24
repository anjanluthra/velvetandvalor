#!/usr/bin/env node
/**
 * Vercel build entrypoint. Syncs the catalog from KV, then regenerates the
 * static pages. Each step is isolated: a failure logs loudly but does NOT fail
 * the deploy, so the site always ships (a failed page keeps its committed copy).
 */
const { execSync } = require('child_process');

const steps = [
  ['sync-catalog', 'node scripts/sync-catalog.js'],
  ['collections', 'npm run build:collections'],
  ['models', 'npm run build:models'],
  ['hub', 'npm run build:hub'],
  ['gifts', 'npm run build:gifts'],
  ['blog', 'npm run build:blog'],
];

for (const [label, cmd] of steps) {
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log('[build-all] ✓ ' + label);
  } catch (e) {
    console.error('[build-all] ✗ ' + label + ' FAILED (continuing): ' + (e && e.message));
  }
}

process.exit(0);
