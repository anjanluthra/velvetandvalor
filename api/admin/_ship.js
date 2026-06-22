const Stripe = require('stripe');
const { requireUser } = require('./_auth');
const { sendShippedEmail } = require('./_email');

/**
 * Marks an order shipped/unfulfilled by writing fulfillment status to the
 * Stripe Checkout Session metadata. Metadata updates merge, so existing
 * product keys (design/model/finish/sku) are preserved.
 * When `notify` is set (Mark Shipped confirmation), also emails the customer
 * a shipping confirmation via Resend.
 */
function describeProduct(md) {
  if (!md) return '';
  if (md.order_type === 'custom_portrait') {
    return ['Custom Portrait', md.case_colour, md.iphone_model, md.finish].filter(Boolean).join(' · ');
  }
  return [md.design, md.model, md.finish].filter(Boolean).join(' · ');
}

/**
 * Build a customer-specific product summary from the actual Stripe line items —
 * the source of truth for what was bought, across single, multi-item, and
 * custom orders. e.g. "Noble Steed — Royal Plum (iPhone 17 Pro, Matte) ×2".
 * Returns '' if line items can't be read, so the caller can fall back.
 */
async function describeFromLineItems(stripe, sessionId) {
  try {
    const li = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 20,
      expand: ['data.price.product'],
    });
    const parts = (li.data || []).map((item) => {
      const prod = item.price && item.price.product;
      const name = (prod && typeof prod === 'object' && prod.name) || item.description || 'Item';
      const detail = prod && typeof prod === 'object' ? prod.description : '';
      const qty = item.quantity > 1 ? ` ×${item.quantity}` : '';
      return detail ? `${name} (${detail})${qty}` : `${name}${qty}`;
    });
    return parts.join(', ');
  } catch (e) {
    console.warn('describeFromLineItems failed:', e && e.message);
    return '';
  }
}

module.exports = async (req, res) => {
  const me = await requireUser(req, res);
  if (!me) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, shipped, tracking, notify } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId required' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const isShipped = shipped !== false; // default to true

  try {
    const updated = await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        fulfillment_status: isShipped ? 'shipped' : 'unfulfilled',
        shipped_at: isShipped ? String(Date.now()) : '',
        tracking: isShipped ? String(tracking || '') : '',
      },
    });

    const md = updated.metadata || {};

    // Email the customer only when explicitly notifying on a ship action.
    let emailed = false;
    let emailError = null;
    if (isShipped && notify) {
      const cust = updated.customer_details || {};
      const to = cust.email || updated.customer_email || md.customer_email || '';
      if (!to) {
        emailError = 'No customer email on this order';
      } else {
        try {
          const product = (await describeFromLineItems(stripe, sessionId)) || describeProduct(md);
          await sendShippedEmail({
            to,
            name: cust.name || md.customer_name || '',
            product,
          });
          emailed = true;
        } catch (e) {
          emailError = e.message;
        }
      }
    }

    return res.status(200).json({
      ok: true,
      emailed,
      emailError,
      fulfillment: {
        status: md.fulfillment_status || 'unfulfilled',
        shippedAt: md.shipped_at ? Number(md.shipped_at) : null,
        tracking: md.tracking || '',
      },
    });
  } catch (err) {
    console.error('Admin ship error:', err.message);
    return res.status(500).json({ error: 'Failed to update order' });
  }
};
