#!/usr/bin/env node
/**
 * Sends the newsletter welcome-flow emails via the live helper, for preview.
 * Sends all six by default (numbered 1–6), or just one if you pass its number.
 *
 * Usage:
 *   node scripts/test-newsletter-flow.js you@example.com ["Name"]        # all 6
 *   node scripts/test-newsletter-flow.js you@example.com ["Name"] 1      # just Email 1
 */
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

const to = process.argv[2];
const name = process.argv[3] || 'Eleanor';
const only = process.argv[4] ? Number(process.argv[4]) : null;
if (!to) {
  console.error('Usage: node scripts/test-newsletter-flow.js <recipient> ["Name"] [emailNumber 1-6]');
  process.exit(1);
}

const { sendNewsletterFlowEmail } = require('../api/admin/_email');
const nums = only ? [only] : [1, 2, 3, 4, 5, 6];

(async () => {
  for (const n of nums) {
    try {
      const r = await sendNewsletterFlowEmail({ to, name, n, seed: 'test' });
      console.log(`✓ Email ${n} sent to ${to} — Resend id: ${r && r.id}`);
    } catch (err) {
      console.error(`✗ Email ${n} failed:`, err.message);
      process.exitCode = 1;
    }
  }
})();
