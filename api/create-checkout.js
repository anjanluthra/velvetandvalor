const Stripe = require('stripe');

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const { design, model, finish, product_suggestion, journal_waitlist } = req.body;

  // Build a readable description for the order
  const designName = design || 'Noble Steed Case';
  const modelName = model || 'iPhone';
  const finishName = finish || 'Glossy';
  const description = `${designName} — ${modelName} (${finishName})`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product: 'prod_UFcm3bFWXeVFGh',
            unit_amount: 5500, // $55.00 in cents
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
          key: 'product_suggestion',
          label: { type: 'custom', custom: 'Help us create what you love' },
          type: 'text',
          optional: false,
          text: {
            minimum_length: 3,
            maximum_length: 500,
          },
        },
      ],
      custom_text: {
        submit: { message: 'Your case will ship within 5-10 business days.' },
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
