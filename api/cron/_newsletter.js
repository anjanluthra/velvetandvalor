/**
 * Newsletter welcome flow — daily sequencer (Emails 2–6).
 *
 * Email 1 is sent immediately on signup by /api/submit. This cron runs once a
 * day, walks every enrolled subscriber, and sends the next email when it falls
 * due on the schedule below (days since signup):
 *
 *   Email 2 → t+2   Email 3 → t+4   Email 4 → t+6   Email 5 → t+8   Email 6 → t+11
 *
 * Exit rules (subscriber removed from the flow, no further sends):
 *   - they unsubscribed (KV suppression set), or
 *   - they completed a Stripe checkout since enrolling (don't keep selling), or
 *   - Email 6 has been sent (flow complete → they stay on the regular list).
 *
 * Env: STRIPE_SECRET_KEY, RESEND_API_KEY, KV_REST_API_URL/TOKEN.
 * Optional CRON_SECRET (Vercel sends it as `Authorization: Bearer <secret>`).
 */
const Stripe = require('stripe');
const store = require('../admin/_store');
const { sendNewsletterFlowEmail } = require('../admin/_email');

const DAY = 86400000;
// Day offset at which each email becomes due, keyed by email number.
const OFFSET_DAYS = { 2: 2, 3: 4, 4: 6, 5: 8, 6: 11 };
const DUE_SLACK_MS = 6 * 60 * 60 * 1000; // tolerate the cron firing a few hours early
const LOOKBACK_DAYS = 14; // covers the full 11-day flow window for purchase detection

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers.authorization || '') !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = Date.now();
  let enrolled = 0, sent = 0, exited = 0, skipped = 0;

  try {
    const flows = await store.listNewsletterFlows();
    enrolled = flows.length;
    if (!enrolled) return res.status(200).json({ ok: true, enrolled, sent, exited, skipped });

    // Exit-on-purchase: emails that completed a Stripe checkout recently.
    const paidEmails = new Set();
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const createdGte = Math.floor((now - LOOKBACK_DAYS * DAY) / 1000);
      for await (const s of stripe.checkout.sessions.list({ status: 'complete', created: { gte: createdGte }, limit: 100 })) {
        const em = (s.customer_details && s.customer_details.email) || s.customer_email;
        if (em) paidEmails.add(em.toLowerCase());
      }
    } catch (e) {
      console.warn('cron-newsletter: purchase lookup failed, continuing without exit-on-purchase:', e && e.message);
    }

    for (const state of flows) {
      const email = String(state.email || '').toLowerCase();
      const step = Number(state.step || 0);

      // Exit conditions → remove from the flow.
      if (await store.isUnsubscribed(email)) { await store.removeNewsletterFlow(email); exited++; continue; }
      if (paidEmails.has(email)) { await store.removeNewsletterFlow(email); exited++; continue; }
      if (step >= 6) { await store.removeNewsletterFlow(email); continue; }

      const next = step + 1;            // next email to send (2..6)
      const offset = OFFSET_DAYS[next]; // its due day offset
      if (!offset) { skipped++; continue; }

      const dueAt = Number(state.startedAt || now) + offset * DAY;
      if (now < dueAt - DUE_SLACK_MS) { skipped++; continue; } // not due yet

      try {
        await sendNewsletterFlowEmail({ to: email, name: state.name, n: next, seed: state.startedAt });
        state.step = next;
        state.lastSentAt = now;
        if (next >= 6) {
          await store.removeNewsletterFlow(email); // flow complete
        } else {
          await store.updateNewsletterFlow(state);
        }
        sent++;
        console.log(`cron-newsletter: sent email ${next} to ${email}`);
      } catch (e) {
        skipped++;
        console.error(`cron-newsletter: send email ${next} to ${email} failed:`, e && e.message);
      }
    }

    return res.status(200).json({ ok: true, enrolled, sent, exited, skipped });
  } catch (err) {
    console.error('cron-newsletter error:', err && err.message);
    return res.status(500).json({ error: 'cron failed' });
  }
};
