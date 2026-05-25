const Stripe = require('stripe');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const {
    name = '',
    email = '',
    horse_name = '',
    case_colour = 'Nude',
    iphone_model = 'iPhone 17',
    finish = 'Glossy',
    photo_url_1 = '',
    photo_url_2 = '',
    notes = '',
    add_initials = false,
    initials = '',
  } = req.body || {};

  if (!photo_url_1) {
    return res.status(400).json({ error: 'A photo of your horse is required.' });
  }
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Normalise initials
  const cleanInitials = (initials || '').toString().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  const wantsInitials = !!add_initials && cleanInitials.length > 0;

  const description = `Custom Horse Portrait — ${case_colour} ${finish}, ${iphone_model}${wantsInitials ? ` + Initials "${cleanInitials}"` : ''}`;

  const orderMetadata = {
    order_type: 'custom_portrait',
    customer_name: (name || '').slice(0, 100),
    horse_name: (horse_name || '').slice(0, 100),
    case_colour: (case_colour || '').slice(0, 60),
    iphone_model: (iphone_model || '').slice(0, 60),
    finish: (finish || '').slice(0, 20),
    photo_url_1: photo_url_1.slice(0, 500),
    photo_url_2: (photo_url_2 || '').slice(0, 500),
    notes: (notes || '').slice(0, 400),
    initials: wantsInitials ? cleanInitials : '',
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      payment_intent_data: {
        metadata: orderMetadata,
        description: description,
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Noble Steed — Custom Horse Portrait',
              description: 'Bespoke phone case featuring your horse’s portrait. Artfully created within 1–2 business days. Worldwide shipping.',
            },
            unit_amount: 8500, // $85.00
          },
          quantity: 1,
        },
        ...(wantsInitials ? [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Custom Initials — "${cleanInitials}"`,
              description: 'Monogrammed initials added to your bespoke phone case.',
            },
            unit_amount: 1000, // $10.00
          },
          quantity: 1,
        }] : []),
      ],
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 549, currency: 'usd' },
            display_name: 'Standard Worldwide Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 4 },
              maximum: { unit: 'business_day', value: 9 },
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
      metadata: orderMetadata,
      custom_text: {
        submit: { message: 'Your bespoke portrait will begin design within 1–2 business days. Total turnaround: 4–9 business days including shipping.' },
        shipping_address: {
          message: '⚠ UAE shipments delayed due to current Strait of Hormuz closure — please allow up to 4 weeks for delivery. All other worldwide routes (Europe, UK & USA) shipping as normal.',
        },
      },
      success_url: `${req.headers.origin || 'https://www.velvet-valor.com'}/order-success?session_id={CHECKOUT_SESSION_ID}&type=custom`,
      cancel_url: `${req.headers.origin || 'https://www.velvet-valor.com'}/custom`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Custom checkout error:', err.message, err);
    return res.status(500).json({ error: 'Failed to create checkout session', detail: err.message });
  }
};
