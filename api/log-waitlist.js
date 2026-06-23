const store = require('./admin/_store');
const { sendSubmissionEmail } = require('./admin/_email');

/**
 * Journal waitlist signups (e.g. from the checkout flow).
 * Persists to KV and notifies the owner, like /api/submit. Kept as a separate
 * route for backward compatibility with existing front-end calls.
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, source } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    type: 'waitlist',
    name: String(name || '').slice(0, 120),
    email: String(email).slice(0, 160),
    subject: '',
    message: '',
    order: '',
    source: String(source || 'journal-waitlist').slice(0, 80),
    ts: Date.now(),
  };

  try { await store.addSubmission(entry); } catch (e) { console.error('waitlist store failed:', e.message); }
  try { await sendSubmissionEmail({ entry }); } catch (e) { console.error('waitlist email failed:', e.message); }

  return res.status(200).json({ success: true, message: 'Added to waiting list' });
};
