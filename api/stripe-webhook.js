/**
 * Stripe webhook — sends Kate's personal thank-you when a purchase completes.
 *
 * Listens for `checkout.session.completed`, verifies the Stripe signature
 * against the raw request body, then emails the buyer via Resend.
 *
 * Required env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY.
 * Configure the endpoint in Stripe → Developers → Webhooks:
 *   URL: https://www.velvet-valor.com/api/stripe-webhook
 *   Event: checkout.session.completed
 */
const Stripe = require('stripe');
const { sendFounderWelcomeEmail } = require('./admin/_email');

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

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }

  try {
    // Re-fetch with line items expanded (the event payload omits them).
    const session = await stripe.checkout.sessions.retrieve(event.data.object.id, {
      expand: ['line_items'],
    });

    if (session.payment_status !== 'paid') {
      return res.status(200).json({ received: true, skipped: 'not paid' });
    }

    const details = session.customer_details || {};
    const to = details.email || session.customer_email;
    if (!to) {
      console.warn('stripe-webhook: no customer email on session', session.id);
      return res.status(200).json({ received: true, skipped: 'no email' });
    }

    const lineItems = (session.line_items && session.line_items.data) || [];

    await sendFounderWelcomeEmail({
      to,
      name: details.name || '',
      product: productName(session, lineItems),
    });

    console.log('stripe-webhook: welcome sent to', to, 'for', session.id);
    return res.status(200).json({ received: true, emailed: true });
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
