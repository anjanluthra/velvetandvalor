/**
 * POST /api/create-payment-intent
 *
 * Creates a Stripe PaymentIntent for the embedded checkout flow.
 * Returns a client_secret the browser uses to mount the Payment
 * Element — payment then happens ON velvet-valor.com (no redirect
 * to checkout.stripe.com), which fixes the Instagram in-app browser
 * problem and eliminates the "switch to Safari" friction entirely.
 *
 * Accepts the same product/add-on payload shape as the old
 * create-checkout endpoints so the client-side wiring is identical
 * (collection, design, model, unit_amount_cents, and custom-portrait
 * add-ons: initials, quote, furry-friend photo).
 */
const Stripe = require('stripe');

const SHIPPING_CENTS = 549; // $5.49 flat worldwide, matches old flow

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
    // Cart shape
    collection = 'Noble Steed',
    collectionId = 'noble-steed',
    design = '',
    model = 'iPhone 17',
    finish = 'Glossy',
    unit_amount_cents,
    image = '',

    // Custom-portrait extras
    is_custom = false,
    name = '',
    email = '',
    horse_name = '',
    case_colour = '',
    iphone_model = '',
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

  // Resolve base unit price. Custom portraits are always $73; other
  // collections accept a client-supplied unit_amount_cents (validated).
  let baseUnitCents;
  if (is_custom) {
    baseUnitCents = 7300;
  } else if (
    typeof unit_amount_cents === 'number' &&
    unit_amount_cents >= 100 &&
    unit_amount_cents <= 50000
  ) {
    baseUnitCents = unit_amount_cents;
  } else {
    baseUnitCents = 4800; // Noble Steed default
  }

  // Custom-portrait add-on validation (mirror the old endpoint)
  const cleanInitials = (initials || '').toString().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  const wantsInitials = is_custom && !!add_initials && cleanInitials.length > 0;

  const cleanQuote = (custom_quote || '').toString().replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 48);
  const wantsQuote = is_custom && !!add_quote && cleanQuote.length > 0;

  const cleanFurryUrl = (furry_friend_photo_url || '').toString().slice(0, 500);
  const wantsFurry = is_custom && !!add_furry_friend && /^https?:\/\//.test(cleanFurryUrl);

  // Total cents = base + add-ons + shipping
  let totalCents = baseUnitCents;
  if (wantsInitials) totalCents += 600;
  if (wantsQuote) totalCents += 600;
  if (wantsFurry) totalCents += 3200;
  totalCents += SHIPPING_CENTS;

  // Enforce validation for the custom-portrait server-required fields
  if (is_custom && !photo_url_1) {
    return res.status(400).json({ error: 'A photo of your horse is required.' });
  }
  if (is_custom && !email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Build a readable description for the Stripe Dashboard + receipt
  const addOnSuffix = [
    wantsInitials ? ` + Initials "${cleanInitials}"` : '',
    wantsQuote ? ` + Quote "${cleanQuote}"` : '',
    wantsFurry ? ` + Furry Friend Portrait` : '',
  ].join('');
  const description = is_custom
    ? `Custom Horse Portrait — ${case_colour || 'Nude'} ${finish}, ${iphone_model || model}${addOnSuffix}`
    : `${collection} — ${design}${model ? ` (${model})` : ''} ${finish}`.trim();

  // Metadata visible in the Stripe Dashboard for order fulfilment
  const metadata = {
    order_type: is_custom ? 'custom_portrait' : 'standard',
    collection_id: (collectionId || '').slice(0, 40),
    collection: (collection || '').slice(0, 60),
    design: (design || '').slice(0, 60),
    model: (iphone_model || model || '').slice(0, 60),
    finish: (finish || '').slice(0, 20),
    image_url: (image || '').slice(0, 500),
    ...(is_custom ? {
      customer_name: (name || '').slice(0, 100),
      horse_name: (horse_name || '').slice(0, 100),
      case_colour: (case_colour || '').slice(0, 60),
      photo_url_1: photo_url_1.slice(0, 500),
      photo_url_2: (photo_url_2 || '').slice(0, 500),
      notes: (notes || '').slice(0, 400),
      initials: wantsInitials ? cleanInitials : '',
      custom_quote: wantsQuote ? cleanQuote : '',
      furry_friend_photo_url: wantsFurry ? cleanFurryUrl : '',
      add_furry_friend: wantsFurry ? 'yes' : 'no',
    } : {}),
  };

  try {
    const pi = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      description,
      metadata,
      // Enable card, Apple Pay, Google Pay, Link, and any other methods
      // enabled on the Stripe Dashboard for this account, without us
      // having to hard-code the list here.
      automatic_payment_methods: { enabled: true },
      ...(email ? { receipt_email: email } : {}),
      shipping: null, // Stripe collects shipping via Address Element client-side
    });

    return res.status(200).json({
      client_secret: pi.client_secret,
      payment_intent_id: pi.id,
      amount: totalCents,
      currency: 'usd',
      description,
      image: image || '',
    });
  } catch (err) {
    console.error('PaymentIntent error:', err && err.message, err);
    return res.status(500).json({
      error: 'Failed to create payment',
      detail: err && err.message,
    });
  }
};
