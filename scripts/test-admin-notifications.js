#!/usr/bin/env node
/**
 * Fires all four owner-notification emails (newsletter, waitlist, contact, purchase)
 * through the live Resend helper, so you can confirm they land in info@velvet-valor.com.
 *
 * Usage:  node scripts/test-admin-notifications.js
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

const { sendSubmissionEmail, sendPurchaseNotification } = require('../api/admin/_email');

const now = Date.now();
const tasks = [
  ['Newsletter', () => sendSubmissionEmail({ entry: {
    type: 'newsletter', name: 'Test Subscriber', email: 'test.subscriber@example.com',
    source: 'footer (TEST)', ts: now,
  } })],
  ['Waitlist', () => sendSubmissionEmail({ entry: {
    type: 'waitlist', name: 'Test Rider', email: 'test.rider@example.com',
    source: 'journal-waitlist (TEST)', ts: now,
  } })],
  ['Contact', () => sendSubmissionEmail({ entry: {
    type: 'contact', name: 'Test Customer', email: 'test.customer@example.com',
    subject: 'Just testing', message: 'This is a TEST contact message.\nSecond line.', ts: now,
  } })],
  ['Purchase', () => sendPurchaseNotification({
    name: 'Test Buyer', email: 'test.buyer@example.com', product: 'Noble Steed — Royal Plum',
    amount: '$48.00', items: ['Noble Steed — Royal Plum · iPhone 17 Pro (Matte) × 1'],
    sessionId: 'cs_test_' + now.toString(36),
  })],
];

(async () => {
  for (const [label, run] of tasks) {
    try {
      const r = await run();
      console.log(`✓ ${label.padEnd(11)} sent — Resend id: ${r && r.id}`);
    } catch (e) {
      console.error(`✗ ${label.padEnd(11)} failed: ${e.message}`);
    }
  }
})();
