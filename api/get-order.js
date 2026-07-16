/**
 * GET /api/get-order?session_id=cs_... | ?payment_intent=pi_...
 *
 * Returns order display data for the /order-success page.
 *
 * Accepts EITHER:
 *   - session_id  (legacy — Stripe Checkout hosted-page flow)
 *   - payment_intent  (new — embedded Payment Element flow)
 *
 * Both return the same JSON shape so the client renders identically.
 *
 * Safe to call from the browser: only non-sensitive display fields
 * are returned. No card data. Email is the buyer's own input.
 */
const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = (req.query && req.query.session_id) || '';
  const paymentIntentId = (req.query && req.query.payment_intent) || '';

  const validSession = sessionId && /^cs_[a-zA-Z0-9_]+$/.test(sessionId);
  const validPI = paymentIntentId && /^pi_[a-zA-Z0-9_]+$/.test(paymentIntentId);

  if (!validSession && !validPI) {
    return res.status(400).json({ error: 'Missing or invalid session_id / payment_intent' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  function fmtAmount(amountMinor, currency) {
    if (typeof amountMinor !== 'number') return null;
    const value = (amountMinor / 100).toFixed(2);
    return { value: Number(value), display: value, currency: (currency || 'usd').toUpperCase() };
  }

  try {
    let result;

    if (validPI) {
      // Embedded Payment Element flow — retrieve the PaymentIntent directly.
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      result = {
        status: pi.status || 'unknown',
        paid: pi.status === 'succeeded',
        currency: (pi.currency || 'usd').toUpperCase(),
        email: pi.receipt_email || null,
        items: [], // No line-items on PaymentIntents; total is authoritative
        subtotal: fmtAmount(pi.amount, pi.currency),
        shipping: null,
        discount: null,
        tax: null,
        total: fmtAmount(pi.amount, pi.currency),
        collection: (pi.metadata && pi.metadata.collection) || null,
        design: (pi.metadata && pi.metadata.design) || null,
        model: (pi.metadata && pi.metadata.model) || null,
        is_custom: (pi.metadata && pi.metadata.order_type === 'custom_portrait') || false,
      };
    } else {
      // Legacy Checkout Session flow — kept working so past orders resolve.
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'total_details.breakdown'],
      });
      const lineItems = (session.line_items && session.line_items.data) || [];
      const items = lineItems.map(li => ({
        description: li.description || (li.price && li.price.product && li.price.product.name) || 'Item',
        quantity: li.quantity || 1,
        amount: fmtAmount(li.amount_subtotal, session.currency),
      }));
      result = {
        status: session.payment_status || session.status || 'unknown',
        paid: session.payment_status === 'paid',
        currency: (session.currency || 'usd').toUpperCase(),
        email: session.customer_details && session.customer_details.email
          ? session.customer_details.email
          : (session.customer_email || null),
        items: items,
        subtotal: fmtAmount(session.amount_subtotal, session.currency),
        shipping: fmtAmount(
          (session.total_details && session.total_details.amount_shipping) || 0,
          session.currency
        ),
        discount: fmtAmount(
          (session.total_details && session.total_details.amount_discount) || 0,
          session.currency
        ),
        tax: fmtAmount(
          (session.total_details && session.total_details.amount_tax) || 0,
          session.currency
        ),
        total: fmtAmount(session.amount_total, session.currency),
        collection: (session.metadata && session.metadata.collection) || null,
        design: (session.metadata && session.metadata.design) || null,
        model: (session.metadata && session.metadata.model) || null,
        is_custom: (session.metadata && session.metadata.product_type === 'custom_portrait') || false,
      };
    }

    // Cache — a paid order's total doesn't change. Short cache handles
    // rapid refreshes on the success page.
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).json(result);
  } catch (err) {
    console.error('get-order error:', err && err.message);
    if (err && err.statusCode === 404) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.status(500).json({ error: 'Could not retrieve order' });
  }
};
