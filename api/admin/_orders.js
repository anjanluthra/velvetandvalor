const Stripe = require('stripe');
const { requireUser } = require('./_auth');

/**
 * Returns all paid orders + revenue summary, read live from Stripe.
 * Nothing is persisted on our side — Stripe is the source of truth.
 * Financial figures (summary + per-order amounts) are withheld from staff.
 */
module.exports = async (req, res) => {
  const me = await requireUser(req, res);
  if (!me) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const orders = [];
    let starting_after;
    let pages = 0;
    const MAX_PAGES = 20; // safety cap (~2000 orders)

    do {
      const params = {
        limit: 100,
        expand: ['data.payment_intent.latest_charge'],
      };
      if (starting_after) params.starting_after = starting_after;

      const page = await stripe.checkout.sessions.list(params);

      for (const s of page.data) {
        if (s.payment_status !== 'paid') continue; // only real, captured orders

        const pi = s.payment_intent && typeof s.payment_intent === 'object' ? s.payment_intent : null;
        const charge = pi && typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
        const refunded = charge ? charge.amount_refunded || 0 : 0;

        const cust = s.customer_details || {};
        const ship =
          (s.collected_information && s.collected_information.shipping_details) ||
          s.shipping_details ||
          s.shipping ||
          {};
        const shipAddr = ship.address || {};
        const md = s.metadata || {};

        orders.push({
          id: s.id,
          created: s.created,
          amount: s.amount_total || 0,
          currency: (s.currency || 'usd').toUpperCase(),
          refunded,
          paymentStatus: s.payment_status,
          product: {
            design: md.design || '',
            model: md.model || '',
            finish: md.finish || '',
            sku: md.sku || '',
          },
          customer: {
            name: cust.name || ship.name || '',
            email: cust.email || '',
            phone: cust.phone || '',
          },
          shipping: {
            name: ship.name || cust.name || '',
            line1: shipAddr.line1 || '',
            line2: shipAddr.line2 || '',
            city: shipAddr.city || '',
            state: shipAddr.state || '',
            postal: shipAddr.postal_code || '',
            country: shipAddr.country || '',
          },
          fulfillment: {
            status: md.fulfillment_status || 'unfulfilled',
            shippedAt: md.shipped_at ? Number(md.shipped_at) : null,
            tracking: md.tracking || '',
          },
        });
      }

      starting_after = page.has_more ? page.data[page.data.length - 1].id : null;
      pages++;
    } while (starting_after && pages < MAX_PAGES);

    const gross = orders.reduce((sum, o) => sum + o.amount, 0);
    const refunds = orders.reduce((sum, o) => sum + o.refunded, 0);
    const unfulfilledCount = orders.filter((o) => o.fulfillment.status !== 'shipped').length;

    const canSeeMoney = me.role === 'owner' || me.role === 'manager';

    if (!canSeeMoney) {
      // Staff: strip all financial data before it leaves the server.
      orders.forEach((o) => {
        o.amount = null;
        o.refunded = 0;
      });
    }

    const summary = canSeeMoney
      ? {
          currency: orders[0] ? orders[0].currency : 'USD',
          gross,
          refunds,
          net: gross - refunds,
          orderCount: orders.length,
          unfulfilledCount,
        }
      : { orderCount: orders.length, unfulfilledCount };

    return res.status(200).json({ summary, orders, role: me.role, canSeeMoney });
  } catch (err) {
    console.error('Admin orders error:', err.message);
    return res.status(500).json({ error: 'Failed to load orders' });
  }
};
