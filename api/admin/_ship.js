const Stripe = require('stripe');
const { requireUser } = require('./_auth');
const { sendShippedEmail } = require('./_email');

/**
 * Marks an order shipped/unfulfilled by writing fulfillment status to Stripe
 * metadata. Metadata updates merge, so existing product keys
 * (design/model/finish/sku) are preserved.
 *
 * Handles both order shapes, keyed off the id prefix:
 *   cs_... → Checkout Session (hosted checkout.stripe.com flow)
 *   pi_... → PaymentIntent    (on-domain embedded checkout, no Session exists)
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

/**
 * Product summary for a PaymentIntent order. Embedded checkout has no Stripe
 * line items, so the bag is rebuilt from the items_json metadata written by
 * _create-payment-intent; falls back to the single-item fields.
 */
function describeFromMetadata(md) {
  if (md && md.items_json) {
    try {
      const rows = JSON.parse(md.items_json);
      if (Array.isArray(rows) && rows.length) {
        return rows.map((r) => {
          const qty = r.q > 1 ? ` \u00d7${r.q}` : '';
          const detail = [r.d, r.m].filter(Boolean).join(', ');
          return detail ? `${detail}${qty}` : `${r.c || 'Item'}${qty}`;
        }).join(', ');
      }
    } catch (e) { /* fall through */ }
  }
  return describeProduct(md);
}

module.exports = async (req, res) => {
  const me = await requireUser(req, res);
  if (!me) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, shipped, tracking, notify, deliveryDate } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId required' });
  }
  const cleanDelivery = String(deliveryDate || '').trim().slice(0, 40);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const isShipped = shipped !== false; // default to true
  // Embedded-checkout orders are PaymentIntents; hosted ones are Sessions.
  const isPaymentIntent = sessionId.startsWith('pi_');

  try {
    const fulfillmentMetadata = {
      fulfillment_status: isShipped ? 'shipped' : 'unfulfilled',
      shipped_at: isShipped ? String(Date.now()) : '',
      tracking: isShipped ? String(tracking || '') : '',
      estimated_delivery: isShipped ? cleanDelivery : '',
    };

    const updated = isPaymentIntent
      // expand latest_charge so the billing-email fallback below has something to read
      ? await stripe.paymentIntents.update(sessionId, { metadata: fulfillmentMetadata, expand: ['latest_charge'] })
      : await stripe.checkout.sessions.update(sessionId, { metadata: fulfillmentMetadata });

    const md = updated.metadata || {};

    // Email the customer only when explicitly notifying on a ship action.
    let emailed = false;
    let emailError = null;
    if (isShipped && notify) {
      const cust = isPaymentIntent
        ? (() => {
            const charge = updated.latest_charge && typeof updated.latest_charge === 'object'
              ? updated.latest_charge
              : null;
            const billing = (charge && charge.billing_details) || {};
            const ship = updated.shipping || {};
            return { email: updated.receipt_email || billing.email || '', name: ship.name || billing.name || '' };
          })()
        : (updated.customer_details || {});
      const to = cust.email || updated.customer_email || md.customer_email || '';
      if (!to) {
        emailError = 'No customer email on this order';
      } else {
        try {
          const product = isPaymentIntent
            ? describeFromMetadata(md)
            : ((await describeFromLineItems(stripe, sessionId)) || describeProduct(md));
          await sendShippedEmail({
            to,
            name: cust.name || md.customer_name || '',
            product,
            deliveryDate: md.estimated_delivery || cleanDelivery,
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
        estimatedDelivery: md.estimated_delivery || '',
      },
    });
  } catch (err) {
    console.error('Admin ship error:', err.message);
    return res.status(500).json({ error: 'Failed to update order' });
  }
};
