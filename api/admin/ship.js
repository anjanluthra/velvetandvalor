const Stripe = require('stripe');
const { requireUser } = require('./_auth');

/**
 * Marks an order shipped/unfulfilled by writing fulfillment status to the
 * Stripe Checkout Session metadata. Metadata updates merge, so existing
 * product keys (design/model/finish/sku) are preserved.
 */
module.exports = async (req, res) => {
  const me = await requireUser(req, res);
  if (!me) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, shipped, tracking } = req.body || {};
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
    return res.status(200).json({
      ok: true,
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
