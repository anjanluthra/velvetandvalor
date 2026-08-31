const Stripe = require('stripe');
const { requireUser } = require('./_auth');

/**
 * Returns all paid orders + revenue summary, read live from Stripe.
 * Nothing is persisted on our side — Stripe is the source of truth.
 *
 * Reads BOTH order shapes:
 *   - Checkout Sessions  (cs_...) — the hosted checkout.stripe.com flow
 *   - PaymentIntents     (pi_...) — the on-domain embedded checkout, which
 *     never creates a Session. PaymentIntents belonging to a Session are
 *     skipped so an order is never listed twice.
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
    // PaymentIntents reachable via a Checkout Session — skipped in the
    // PaymentIntent pass below so hosted orders aren't counted twice.
    const sessionPaymentIntents = new Set();
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
        const piRef = typeof s.payment_intent === 'string'
          ? s.payment_intent
          : (s.payment_intent && s.payment_intent.id);
        if (piRef) sessionPaymentIntents.add(piRef);

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
        const isCustom = md.order_type === 'custom_portrait';

        orders.push({
          id: s.id,
          created: s.created,
          amount: s.amount_total || 0,
          currency: (s.currency || 'usd').toUpperCase(),
          refunded,
          paymentStatus: s.payment_status,
          isCustom,
          product: {
            // Custom and standard checkouts store product fields under different keys.
            design: isCustom ? (md.case_colour || '') : (md.design || ''),
            model: isCustom ? (md.iphone_model || '') : (md.model || ''),
            finish: md.finish || '',
            sku: md.sku || '',
          },
          custom: isCustom
            ? {
                horseName: md.horse_name || '',
                initials: md.initials || '',
                notes: md.notes || '',
                photos: [md.photo_url_1, md.photo_url_2].filter(Boolean),
              }
            : null,
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

    // ── Embedded checkout orders (PaymentIntents) ──────────────
    let pi_starting_after;
    let piPages = 0;
    do {
      const params = { limit: 100, expand: ['data.latest_charge'] };
      if (pi_starting_after) params.starting_after = pi_starting_after;

      const page = await stripe.paymentIntents.list(params);

      for (const pi of page.data) {
        if (pi.status !== 'succeeded') continue;      // only captured payments
        if (sessionPaymentIntents.has(pi.id)) continue; // already listed as a Session

        const charge = pi.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
        const billing = (charge && charge.billing_details) || {};
        const ship = pi.shipping || (charge && charge.shipping) || {};
        const shipAddr = ship.address || {};
        const md = pi.metadata || {};
        const isCustom = md.order_type === 'custom_portrait';

        orders.push({
          id: pi.id,
          created: pi.created,
          amount: pi.amount || 0,
          currency: (pi.currency || 'usd').toUpperCase(),
          refunded: charge ? charge.amount_refunded || 0 : 0,
          paymentStatus: 'paid',
          isCustom,
          product: {
            design: isCustom ? (md.case_colour || '') : (md.design || ''),
            model: isCustom ? (md.iphone_model || '') : (md.model || ''),
            finish: md.finish || '',
            sku: md.sku || '',
          },
          custom: isCustom
            ? {
                horseName: md.horse_name || '',
                initials: md.initials || '',
                notes: md.notes || '',
                photos: [md.photo_url_1, md.photo_url_2].filter(Boolean),
              }
            : null,
          customer: {
            name: ship.name || billing.name || md.customer_name || '',
            email: pi.receipt_email || billing.email || '',
            phone: billing.phone || '',
          },
          shipping: {
            name: ship.name || billing.name || '',
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

      pi_starting_after = page.has_more ? page.data[page.data.length - 1].id : null;
      piPages++;
    } while (pi_starting_after && piPages < MAX_PAGES);

    // Both passes are newest-first individually; the merged list needs re-sorting.
    orders.sort((a, b) => b.created - a.created);

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
