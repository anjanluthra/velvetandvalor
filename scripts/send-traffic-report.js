#!/usr/bin/env node
/**
 * Sends the daily traffic report email via Resend, reusing the app's own
 * email helper (api/admin/_email.js) and the RESEND_* keys in .env.local.
 *
 * The HTML body is passed as a file (not inline) so a large email can't be
 * mangled by shell escaping. Used by the "vv-daily-traffic-report" scheduled task.
 *
 * Usage:
 *   node scripts/send-traffic-report.js <html-file> "<subject>" [recipient]
 *
 * Defaults: recipient = info@velvet-valor.com
 */
const fs = require('fs');
const path = require('path');

// Minimal .env.local loader (same approach as scripts/test-email.js).
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

const htmlFile = process.argv[2];
const subject = process.argv[3];
const to = process.argv[4] || 'info@velvet-valor.com';

if (!htmlFile || !subject) {
  console.error('Usage: node scripts/send-traffic-report.js <html-file> "<subject>" [recipient]');
  process.exit(1);
}

const html = fs.readFileSync(htmlFile, 'utf8');
const { sendEmail } = require('../api/admin/_email');

sendEmail({
  to,
  subject,
  replyTo: process.env.RESEND_REPLY_TO || 'info@velvet-valor.com',
  html,
})
  .then((r) => {
    console.log('✓ Sent to ' + to + '. Resend id:', r && r.id);
  })
  .catch((err) => {
    console.error('✗ Failed:', err.message);
    process.exit(1);
  });
