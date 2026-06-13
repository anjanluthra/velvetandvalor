/**
 * GET /api/get-order?session_id=cs_...
 *
 * Retrieves a Stripe Checkout session for the order-success page so we
 * can render the actual product, amount paid, shipping, and currency
 * instead of hardcoded values.
 *
 * Safe to call from the browser: we only return non-sensitive display
 * fields (line item descriptions, amounts, currency). No card data,
 * customer PII beyond the email (which the buyer already entered),
 * or Stripe-internal IDs are exposed.
 */
const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = (req.query && req.query.session_id) || '';
  if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid session_id' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'total_details.breakdown'],
    });

    // Convert Stripe minor units (cents) to a display string.
    // Currencies like USD/GBP/EUR/CAD/AUD/AED are all 2-decimal.
    function fmtAmount(amountMinor, currency) {
      if (typeof amountMinor !== 'number') return null;
      const value = (amountMinor / 100).toFixed(2);
      return { value: Number(value), display: value, currency: (currency || 'usd').toUpperCase() };
    }

    const lineItems = (session.line_items && session.line_items.data) || [];
    const items = lineItems.map(li => ({
      description: li.description || (li.price && li.price.product && li.price.product.name) || 'Item',
      quantity: li.quantity || 1,
      amount: fmtAmount(li.amount_subtotal, session.currency),
    }));

    const result = {
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
      // Useful for display: collection / product context from metadata
      collection: (session.metadata && session.metadata.collection) || null,
      design: (session.metadata && session.metadata.design) || null,
      model: (session.metadata && session.metadata.model) || null,
      is_custom: (session.metadata && session.metadata.product_type === 'custom_portrait') || false,
    };

    // Cache headers — session details don't change, so let the browser cache
    // for a few minutes in case the user refreshes the success page.
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
