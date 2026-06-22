const Stripe = require('stripe');

// Server-derived prices (cents). NEVER trust a client-sent price.
const COLLECTIONS = {
  'noble-steed':  { name: 'Noble Steed',       cents: 4800 },
  'riders-motto': { name: "The Rider's Motto",  cents: 4000 },
};

// Resolve a collection to its trusted name + price. Prefer a stable slug
// (collectionId); fall back to legacy free-text `collection` so existing
// single-item Buy Now keeps working until all clients send collectionId.
function resolveCollection(collectionId, legacyName) {
  if (collectionId && COLLECTIONS[collectionId]) {
    return { id: collectionId, ...COLLECTIONS[collectionId] };
  }
  if (typeof legacyName === 'string' && /rider/i.test(legacyName)) {
    return { id: 'riders-motto', ...COLLECTIONS['riders-motto'] };
  }
  return { id: 'noble-steed', ...COLLECTIONS['noble-steed'] };
}

// Strip control characters; cap length. Display use only.
function clean(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, max || 80);
}

function clampQty(q) {
  const n = Math.floor(Number(q));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 10);
}

function lineItem(col, design, model, finish, qty) {
  const designName = clean(design, 60) || 'Case';
  const modelName = clean(model, 40) || 'iPhone';
  const finishName = clean(finish, 20) || 'Glossy';
  return {
    price_data: {
      currency: 'usd',
      product_data: {
        name: `${col.name} — ${designName}`,
        description: `${modelName} (${finishName})`,
      },
      unit_amount: col.cents,
    },
    quantity: clampQty(qty),
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const {
    items,              // multi-item cart: [{ collectionId, design, model, finish, qty }]
    design, model, finish, collection, collectionId, // legacy single-item
    journal_waitlist,
  } = req.body || {};

  let line_items;
  let metadata;

  try {
    if (Array.isArray(items) && items.length > 0) {
      // ── Multi-item cart path ──
      if (items.length > 20) {
        return res.status(400).json({ error: 'Too many items' });
      }
      const names = [];
      line_items = items.map((it) => {
        if (!it || !it.collectionId || !COLLECTIONS[it.collectionId]) {
          throw Object.assign(new Error('bad_collection'), { _client: true });
        }
        const col = resolveCollection(it.collectionId);
        names.push(col.name);
        return lineItem(col, it.design, it.model, it.finish, it.qty);
      });
      const first = items[0];
      const firstCol = resolveCollection(first.collectionId);
      const totalQty = line_items.reduce((s, li) => s + li.quantity, 0);
      metadata = {
        // Keep the webhook welcome-email contract: name from the first line.
        collection: firstCol.name,
        design: clean(first.design, 60),
        item_count: String(totalQty),
        collections: clean([...new Set(names)].join(', '), 200),
        items_json: clean(JSON.stringify(items.map((i) => ({
          c: i.collectionId, d: clean(i.design, 30), m: clean(i.model, 24), q: clampQty(i.qty),
        }))), 480),
        journal_waitlist: journal_waitlist || 'no',
      };
    } else {
      // ── Legacy single-item path (price still server-derived) ──
      const col = resolveCollection(collectionId, collection);
      const designName = clean(design, 60) || 'Noble Steed Case';
      const modelName = clean(model, 40) || 'iPhone';
      const finishName = clean(finish, 20) || 'Glossy';
      line_items = [lineItem(col, designName, modelName, finishName, 1)];
      metadata = {
        design: designName,
        model: modelName,
        finish: finishName,
        sku: `VV-${designName.toUpperCase().replace(/\s+/g, '-')}-${modelName.toUpperCase().replace(/\s+/g, '-')}-${finishName.substring(0, 3).toUpperCase()}`,
        collection: col.name,
        journal_waitlist: journal_waitlist || 'no',
      };
    }
  } catch (e) {
    if (e && e._client) return res.status(400).json({ error: 'Invalid item in cart' });
    console.error('Checkout build error:', e.message);
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      allow_promotion_codes: true,
      line_items,
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 549, currency: 'usd' },
            display_name: 'Standard Worldwide Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 10 },
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: [
          'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DE', 'FR', 'IT', 'ES',
          'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PT', 'PL',
          'CZ', 'GR', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV',
          'EE', 'LU', 'MT', 'CY', 'JP', 'KR', 'SG', 'HK', 'AE', 'SA',
          'QA', 'BH', 'KW', 'OM', 'IL', 'ZA', 'MX', 'BR', 'AR', 'CL',
          'CO', 'IN', 'MY', 'TH', 'PH', 'ID', 'VN', 'TW',
        ],
      },
      metadata,
      custom_fields: [
        {
          key: 'productsuggestion',
          label: { type: 'custom', custom: 'What product would you love to see next?' },
          type: 'text',
          optional: false,
        },
      ],
      custom_text: {
        submit: { message: 'Your case will ship within 5-10 business days.' },
        shipping_address: {
          message: '⚠ UAE shipments delayed due to current Strait of Hormuz closure — please allow up to 4 weeks for delivery. All other worldwide routes (Europe, UK & USA) shipping as normal.',
        },
      },
      success_url: `${req.headers.origin || 'https://velvet-valor.com'}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://velvet-valor.com'}/collections/iphone-cases`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
