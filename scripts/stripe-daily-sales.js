#!/usr/bin/env node
/**
 * Daily Stripe sales + checkout funnel for the traffic report.
 *
 * Reads STRIPE_SECRET_KEY from .env.local (a RESTRICTED, READ-ONLY key is
 * strongly recommended — it only needs read access to Checkout Sessions and
 * Payment Intents/Charges). Computes, for a single Gulf-time (UTC+4) day:
 *   - startedCheckouts: Stripe Checkout Sessions created that day ("got to checkout")
 *   - paidOrders:       of those, how many ended payment_status = paid
 *   - grossCents/refundsCents/netCents: money for the paid ones
 *   - conversionPct:    paidOrders / startedCheckouts
 *
 * Prints a single JSON line to stdout. On any problem it still prints JSON with
 * available:false and a reason, so callers can degrade gracefully (never throws
 * the daily email off the rails). The Stripe key is never printed.
 *
 * Usage:
 *   node scripts/stripe-daily-sales.js            # yesterday (Gulf time)
 *   node scripts/stripe-daily-sales.js 2026-06-22 # a specific Gulf-time day
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

const GST_OFFSET = 4 * 3600; // Gulf Standard Time = UTC+4, no DST.

function out(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

// Resolve the target Gulf-time day → [gte, lte] unix seconds + label.
function dayWindow(arg) {
  let y, mo, d;
  if (arg && /^\d{4}-\d{2}-\d{2}$/.test(arg)) {
    [y, mo, d] = arg.split('-').map(Number);
  } else {
    // "Yesterday" in GST: shift now into GST, drop a day, take that date.
    const nowGst = new Date(Date.now() + GST_OFFSET * 1000);
    nowGst.setUTCDate(nowGst.getUTCDate() - 1);
    y = nowGst.getUTCFullYear();
    mo = nowGst.getUTCMonth() + 1;
    d = nowGst.getUTCDate();
  }
  const startUtc = Date.UTC(y, mo - 1, d, 0, 0, 0) / 1000 - GST_OFFSET;
  const label = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { gte: startUtc, lte: startUtc + 86400 - 1, label };
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  const win = dayWindow(process.argv[2]);
  if (!key) {
    return out({ available: false, reason: 'STRIPE_SECRET_KEY not set in .env.local', date: win.label });
  }

  let Stripe;
  try {
    Stripe = require('stripe');
  } catch (e) {
    return out({ available: false, reason: 'stripe SDK not installed', date: win.label });
  }
  const stripe = new Stripe(key);

  try {
    let started = 0;
    let paid = 0;
    let grossCents = 0;
    let refundsCents = 0;
    let currency = 'USD';
    let starting_after;
    let pages = 0;
    const MAX_PAGES = 20;

    do {
      const params = {
        limit: 100,
        created: { gte: win.gte, lte: win.lte },
        expand: ['data.payment_intent.latest_charge'],
      };
      if (starting_after) params.starting_after = starting_after;

      const page = await stripe.checkout.sessions.list(params);
      for (const s of page.data) {
        started++;
        if (s.payment_status === 'paid') {
          paid++;
          grossCents += s.amount_total || 0;
          currency = (s.currency || 'usd').toUpperCase();
          const pi = s.payment_intent && typeof s.payment_intent === 'object' ? s.payment_intent : null;
          const charge = pi && typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
          if (charge) refundsCents += charge.amount_refunded || 0;
        }
      }
      starting_after = page.has_more ? page.data[page.data.length - 1].id : null;
      pages++;
    } while (starting_after && pages < MAX_PAGES);

    out({
      available: true,
      date: win.label,
      startedCheckouts: started,
      paidOrders: paid,
      grossCents,
      refundsCents,
      netCents: grossCents - refundsCents,
      currency,
      conversionPct: started ? Math.round((paid / started) * 1000) / 10 : 0,
    });
  } catch (err) {
    out({ available: false, reason: 'Stripe API error: ' + (err && err.message ? err.message : 'unknown'), date: win.label });
  }
}

main();
