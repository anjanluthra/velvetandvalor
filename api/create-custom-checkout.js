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
    add_quote = false,
    custom_quote = '',
    add_furry_friend = false,
    furry_friend_photo_url = '',
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

  // Normalise custom handwritten quote — strip control chars, cap length
  const cleanQuote = (custom_quote || '').toString().replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 48);
  const wantsQuote = !!add_quote && cleanQuote.length > 0;

  // Furry friend add-on: valid only if toggle on AND photo URL provided
  const cleanFurryUrl = (furry_friend_photo_url || '').toString().slice(0, 500);
  const wantsFurry = !!add_furry_friend && /^https?:\/\//.test(cleanFurryUrl);

  const addOnSuffix = [
    wantsInitials ? ` + Initials "${cleanInitials}"` : '',
    wantsQuote ? ` + Quote "${cleanQuote}"` : '',
    wantsFurry ? ` + Furry Friend Portrait` : '',
  ].join('');
  const description = `Custom Horse Portrait — ${case_colour} ${finish}, ${iphone_model}${addOnSuffix}`;

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
    custom_quote: wantsQuote ? cleanQuote : '',
    furry_friend_photo_url: wantsFurry ? cleanFurryUrl : '',
    add_furry_friend: wantsFurry ? 'yes' : 'no',
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      allow_promotion_codes: true,
      customer_email: email,
      // Abandoned-cart recovery: expire after 1h so checkout.session.expired
      // fires and our webhook sends the recovery email with a fresh link.
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      after_expiration: { recovery: { enabled: true, allow_promotion_codes: true } },
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
            unit_amount: 7300, // $73.00 (~ £58 GBP)
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
            unit_amount: 600, // $6.00 (~ £5 GBP)
          },
          quantity: 1,
        }] : []),
        ...(wantsQuote ? [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Custom Quote — "${cleanQuote}"`,
              description: 'A short personal phrase handwritten by the artist on your bespoke phone case.',
            },
            unit_amount: 600, // $6.00 (~ £5 GBP)
          },
          quantity: 1,
        }] : []),
        ...(wantsFurry ? [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Furry Friend Portrait',
              description: 'A portrait of your dog (or cat) added to your bespoke horse case.',
            },
            unit_amount: 3200, // $32.00 (~ £25 GBP)
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
