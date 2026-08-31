/**
 * Cart-recovery Phase 2 — daily discount follow-up.
 *
 * Runs once a day (Vercel cron). Finds checkout sessions that were already
 * sent the Phase-1 reminder (metadata.recovery_stage === 'reminded') ~a day
 * ago, are still unpaid, and whose customer hasn't since purchased — then
 * sends the COMEBACK10 discount email and stamps recovery_stage = 'discounted'.
 *
 * Suppression: skips anyone whose email appears on a recently completed
 * session, or whose original cart was recovered.
 *
 * Env: STRIPE_SECRET_KEY, RESEND_API_KEY. Optional CRON_SECRET (Vercel sends it
 * as `Authorization: Bearer <CRON_SECRET>` — enforced here when set).
 */
const Stripe = require('stripe');
const { sendCartRecoveryEmail } = require('../admin/_email');

const DISCOUNT_CODE = process.env.RECOVERY_DISCOUNT_CODE || 'COMEBACK10';
const MIN_AGE_MS = 18 * 60 * 60 * 1000; // wait ~a day after the reminder
const LOOKBACK_DAYS = 7;

function itemDescriptions(lineItems) {
  return (lineItems || []).map((li) => {
    const prod = li.price && li.price.product;
    const name = (prod && typeof prod === 'object' && prod.name) || li.description || 'Item';
    const detail = prod && typeof prod === 'object' ? prod.description : '';
    const qty = li.quantity > 1 ? ` × ${li.quantity}` : '';
    return detail ? `${name} · ${detail}${qty}` : `${name}${qty}`;
  });
}

module.exports = async (req, res) => {
  // Vercel cron uses GET; enforce the shared secret when configured.
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers.authorization || '') !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const now = Date.now();
  const createdGte = Math.floor((now - LOOKBACK_DAYS * 86400000) / 1000);

  let scanned = 0, sent = 0, skipped = 0;
  try {
    // Suppression set: emails that paid recently + carts that were recovered.
    const paidEmails = new Set();
    const recoveredFrom = new Set();
    for await (const s of stripe.checkout.sessions.list({ status: 'complete', created: { gte: createdGte }, limit: 100 })) {
      const em = (s.customer_details && s.customer_details.email) || s.customer_email;
      if (em) paidEmails.add(em.toLowerCase());
      if (s.recovered_from) recoveredFrom.add(s.recovered_from);
    }

    for await (const s of stripe.checkout.sessions.list({ status: 'expired', created: { gte: createdGte }, limit: 100 })) {
      scanned++;
      const md = s.metadata || {};
      if (md.recovery_stage !== 'reminded') continue; // not reminded, or already discounted
      const remindedAt = Number(md.reminded_at || 0);
      if (!remindedAt || now - remindedAt < MIN_AGE_MS) { skipped++; continue; } // too soon

      const email = (s.customer_details && s.customer_details.email) || s.customer_email;
      if (!email) { skipped++; continue; }
      if (paidEmails.has(email.toLowerCase()) || recoveredFrom.has(s.id)) { skipped++; continue; } // already bought

      const full = await stripe.checkout.sessions.retrieve(s.id, { expand: ['line_items.data.price.product'] });
      const recoveryUrl =
        (full.after_expiration && full.after_expiration.recovery && full.after_expiration.recovery.url) || '';

      await sendCartRecoveryEmail({
        to: email,
        name: (full.customer_details && full.customer_details.name) || '',
        items: itemDescriptions((full.line_items && full.line_items.data) || []),
        recoveryUrl,
        discountCode: DISCOUNT_CODE,
      });

      try {
        await stripe.checkout.sessions.update(s.id, {
          metadata: { ...md, recovery_stage: 'discounted', discounted_at: String(now) },
        });
      } catch (e) {
        console.warn('cron-recover: could not stamp discounted:', s.id, e && e.message);
      }
      sent++;
      console.log('cron-recover: discount sent to', email, 'for', s.id);
    }

    return res.status(200).json({ ok: true, scanned, sent, skipped });
  } catch (err) {
    console.error('cron-recover error:', err && err.message);
    return res.status(500).json({ error: 'cron failed' });
  }
};
