const Stripe = require('stripe');

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const {
    design,
    model,
    finish,
    product_suggestion,
    journal_waitlist,
    collection,         // new: 'Noble Steed' (default) or 'The Rider's Motto'
    unit_amount_cents,  // new: per-collection price override (cents)
  } = req.body;

  // Build a readable description for the order
  const designName = design || 'Noble Steed Case';
  const modelName = model || 'iPhone';
  const finishName = finish || 'Glossy';
  const collectionName = collection || 'Noble Steed';
  const safeUnitAmount = (typeof unit_amount_cents === 'number' && unit_amount_cents >= 100 && unit_amount_cents <= 50000)
    ? unit_amount_cents
    : 4800; // $48.00 default
  const description = `${designName} — ${modelName} (${finishName})`;

  // Custom Payment Methods configured in the Stripe Dashboard
  // (Venmo, PayPal, Tabby). Pass them explicitly so Checkout shows
  // them as options alongside cards / Link / Apple Pay / Google Pay.
  // Stripe will only surface each one to customers where it's
  // eligible (e.g. Tabby for GCC/AED, Venmo for US, etc.).
  const CUSTOM_PAYMENT_METHODS = [
    { id: 'cpmt_1TiFWTLJ28WKMh7YskYhV3nj', display_preference: { preference: 'on' } }, // Venmo
    { id: 'cpmt_1TiFVdLJ28WKMh7YeimyawHM', display_preference: { preference: 'on' } }, // PayPal
    { id: 'cpmt_1TbLZjLJ28WKMh7YZ36pw9Zu', display_preference: { preference: 'on' } }, // Tabby
  ];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      allow_promotion_codes: true,
      custom_payment_methods: CUSTOM_PAYMENT_METHODS,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${collectionName} — ${designName}`,
              description: description,
            },
            unit_amount: safeUnitAmount,
          },
          quantity: 1,
        },
      ],
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
      metadata: {
        design: designName,
        model: modelName,
        finish: finishName,
        sku: `VV-${(design || '').toUpperCase().replace(/\s+/g, '-')}-${(model || '').toUpperCase().replace(/\s+/g, '-')}-${(finish || 'GLO').substring(0, 3).toUpperCase()}`,
        journal_waitlist: journal_waitlist || 'no',
      },
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
      success_url: `${req.headers.origin || 'https://velvetandvalor.com'}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://velvetandvalor.com'}/collections/iphone-cases`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
