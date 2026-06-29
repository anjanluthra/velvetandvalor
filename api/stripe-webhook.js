/**
 * Stripe webhook — transactional emails driven by checkout lifecycle events.
 *
 *   checkout.session.completed → Kate's founder welcome email
 *   checkout.session.expired   → cart-recovery "you left something behind" email
 *
 * Verifies the Stripe signature against the raw request body, then sends via Resend.
 *
 * Required env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY.
 * Configure the endpoint in Stripe → Developers → Webhooks:
 *   URL: https://www.velvet-valor.com/api/stripe-webhook
 *   Events: checkout.session.completed, checkout.session.expired
 */
const Stripe = require('stripe');
const store = require('./admin/_store');
const { sendFounderWelcomeEmail, sendCartRecoveryEmail, sendPurchaseNotification } = require('./admin/_email');

/** Format a Stripe minor-unit amount (e.g. 4800, "usd") as "$48.00". */
function formatAmount(amount, currency) {
  if (amount == null) return '';
  const value = (amount / 100).toFixed(2);
  const cur = String(currency || 'usd').toUpperCase();
  const symbol = { USD: '$', GBP: '£', EUR: '€', AED: 'AED ' }[cur] || `${cur} `;
  return `${symbol}${value}`;
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(typeof c === 'string' ? Buffer.from(c) : c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Best, human-friendly product name from session metadata or line items. */
function productName(session, lineItems) {
  const m = session.metadata || {};
  if (m.product_type === 'custom_portrait') return 'custom portrait';
  if (m.collection && m.design) return `${m.design} (${m.collection})`;
  if (m.design) return m.design;
  const first = lineItems && lineItems[0];
  return (first && (first.description || (first.price && first.price.product && first.price.product.name))) || 'order';
}

/**
 * Human-readable list of the exact items in a session, for the recovery email.
 * Pulls the product name + its model/finish detail (needs price.product expanded)
 * so the customer sees precisely what they left behind, e.g.
 * "Noble Steed — Royal Plum · iPhone 17 Pro (Matte) × 2".
 */
function itemDescriptions(lineItems) {
  return (lineItems || []).map((li) => {
    const prod = li.price && li.price.product;
    const name = (prod && typeof prod === 'object' && prod.name) || li.description || 'Item';
    const detail = prod && typeof prod === 'object' ? prod.description : '';
    const qty = li.quantity > 1 ? ` × ${li.quantity}` : '';
    return detail ? `${name} · ${detail}${qty}` : `${name}${qty}`;
  });
}

/** checkout.session.completed → founder welcome email. */
async function handleCompleted(stripe, sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price.product'],
  });
  if (session.payment_status !== 'paid') return { skipped: 'not paid' };

  const details = session.customer_details || {};
  const to = details.email || session.customer_email;
  const lineItems = (session.line_items && session.line_items.data) || [];
  const product = productName(session, lineItems);

  // Always notify the owners of a new purchase (best-effort, independent of the
  // customer welcome so one failing never blocks the other).
  try {
    await sendPurchaseNotification({
      name: details.name || '',
      email: to || '',
      product,
      amount: formatAmount(session.amount_total, session.currency),
      items: itemDescriptions(lineItems),
      sessionId: session.id,
    });
    console.log('stripe-webhook: purchase notification sent for', session.id);
  } catch (e) {
    console.error('stripe-webhook: purchase notification failed:', e && e.message);
  }

  if (!to) return { skipped: 'no customer email', notified: true };

  // Exit the newsletter welcome flow immediately on purchase — don't keep
  // sending "buy now" emails to someone who just bought. (The daily cron also
  // enforces this; doing it here closes the same-day gap.)
  try { await store.removeNewsletterFlow(to); } catch (e) { console.warn('stripe-webhook: flow exit failed:', e && e.message); }

  await sendFounderWelcomeEmail({ to, name: details.name || '', product });
  console.log('stripe-webhook: welcome sent to', to, 'for', session.id);
  return { emailed: true, notified: true };
}

/** checkout.session.expired → cart-recovery email (only if we have an email). */
async function handleExpired(stripe, sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price.product'],
  });

  // Never email a session that actually paid (defensive — expired implies unpaid).
  if (session.payment_status === 'paid') return { skipped: 'paid' };
  // Don't double-send if a recovery touch already went out.
  if (session.metadata && session.metadata.recovery_stage) return { skipped: 'already recovered' };

  const details = session.customer_details || {};
  const to = details.email || session.customer_email;
  if (!to) return { skipped: 'no email' };

  const recoveryUrl =
    (session.after_expiration && session.after_expiration.recovery && session.after_expiration.recovery.url) || '';
  const lineItems = (session.line_items && session.line_items.data) || [];

  await sendCartRecoveryEmail({
    to,
    name: details.name || '',
    items: itemDescriptions(lineItems),
    recoveryUrl,
  });

  // Stamp state so the Phase 2 discount cron knows this one was reminded.
  try {
    await stripe.checkout.sessions.update(session.id, {
      metadata: { ...(session.metadata || {}), recovery_stage: 'reminded', reminded_at: String(Date.now()) },
    });
  } catch (e) {
    console.warn('stripe-webhook: could not stamp recovery_stage:', e && e.message);
  }

  console.log('stripe-webhook: recovery sent to', to, 'for', session.id);
  return { emailed: true };
}

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('stripe-webhook: STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event;
  try {
    const raw = await readRawBody(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error('stripe-webhook: signature verification failed:', err && err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const id = event.data.object.id;
  try {
    let result;
    if (event.type === 'checkout.session.completed') {
      result = await handleCompleted(stripe, id);
    } else if (event.type === 'checkout.session.expired') {
      result = await handleExpired(stripe, id);
    } else {
      return res.status(200).json({ received: true });
    }
    return res.status(200).json({ received: true, ...result });
  } catch (err) {
    // Already past signature verification — log and 200 so Stripe doesn't retry
    // a transient email hiccup into a duplicate send. Failures are visible in logs.
    console.error('stripe-webhook: handler error:', err && err.message);
    return res.status(200).json({ received: true, error: 'handler' });
  }
};

module.exports = handler;
// Stripe needs the raw, unparsed body to verify the signature.
module.exports.config = { api: { bodyParser: false } };
