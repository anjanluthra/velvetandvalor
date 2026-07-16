/**
 * GET /api/stripe-config
 *
 * Returns the Stripe publishable key so the client-side Stripe.js
 * can initialise Elements without the key being hard-coded in the
 * repo. Publishable keys are designed to be public — this is safe.
 */
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Content-Type', 'application/json');

  const key = process.env.STRIPE_PUBLISHABLE_KEY || '';
  if (!key) {
    return res.status(500).json({
      error: 'STRIPE_PUBLISHABLE_KEY env var not set on this Vercel deployment.',
    });
  }
  return res.status(200).json({ publishable_key: key });
};
