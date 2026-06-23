const store = require('./admin/_store');
const { sendSubmissionEmail, sendCustomerReply } = require('./admin/_email');

/**
 * Public endpoint for all site form submissions:
 *   { type: 'newsletter' | 'waitlist' | 'contact', name, email, subject, message, order, source }
 * Best-effort: stores to KV (so it shows in the admin panel) AND emails the
 * owner via Resend. Always returns ok so the on-site form UX never breaks.
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const b = req.body || {};
  const type = ['newsletter', 'waitlist', 'contact'].includes(b.type) ? b.type : 'contact';
  const email = String(b.email || '').trim();
  if (!email || !/.+@.+\..+/.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    type,
    name: String(b.name || '').slice(0, 120),
    email: email.slice(0, 160),
    subject: String(b.subject || '').slice(0, 200),
    message: String(b.message || '').slice(0, 4000),
    order: String(b.order || '').slice(0, 60),
    source: String(b.source || '').slice(0, 80),
    ts: Date.now(),
  };

  try { await store.addSubmission(entry); } catch (e) { console.error('submit store failed:', e.message); }
  try { await sendSubmissionEmail({ entry }); } catch (e) { console.error('submit owner email failed:', e.message); }
  // Customer-facing reply (auto-reply / newsletter welcome / waitlist confirm).
  try { await sendCustomerReply({ entry }); } catch (e) { console.error('submit customer email failed:', e.message); }

  return res.status(200).json({ ok: true });
};
