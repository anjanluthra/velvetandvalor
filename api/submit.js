const store = require('./admin/_store');
const { sendSubmissionEmail, sendCustomerReply, sendNewsletterFlowEmail } = require('./admin/_email');
const { verify: verifyUnsub } = require('./_unsub');

/**
 * Public endpoint for all site form submissions:
 *   { type: 'newsletter' | 'waitlist' | 'contact', name, email, subject, message, order, source }
 * Best-effort: stores to KV (so it shows in the admin panel) AND emails the
 * owner via Resend. Always returns ok so the on-site form UX never breaks.
 *
 * Also serves one-click unsubscribe for the newsletter welcome flow at
 *   /api/submit?action=unsubscribe&e=<email>&t=<token>
 * (GET = link click → confirmation page; POST = RFC 8058 List-Unsubscribe-Post).
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const q = req.query || {};

  // ── One-click unsubscribe (welcome flow) ──────────────────────
  if (q.action === 'unsubscribe') {
    const email = String(q.e || '').trim().toLowerCase();
    const ok = email && verifyUnsub(email, String(q.t || ''));
    if (ok) {
      try { await store.addUnsubscribe(email); } catch (e) { console.error('unsub store failed:', e.message); }
      try { await store.removeNewsletterFlow(email); } catch (e) { console.error('unsub flow remove failed:', e.message); }
    }
    // POST (one-click) just needs a 200; GET returns a friendly page.
    if (req.method === 'POST') return res.status(200).json({ ok });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(ok ? 200 : 400).send(unsubscribePage(ok));
  }

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

  if (type === 'newsletter') {
    // Enrol in the welcome flow + send Email 1 immediately. The daily cron
    // (api/cron-newsletter) handles Emails 2–6. Suppressed addresses are skipped.
    try { await startWelcomeFlow(entry); } catch (e) { console.error('welcome flow start failed:', e.message); }
  } else {
    // Waitlist confirm / contact auto-reply.
    try { await sendCustomerReply({ entry }); } catch (e) { console.error('submit customer email failed:', e.message); }
  }

  return res.status(200).json({ ok: true });
};

async function startWelcomeFlow(entry) {
  if (await store.isUnsubscribed(entry.email)) return; // honour prior opt-out
  const state = await store.enrollNewsletterFlow(entry.email, entry.name);
  await sendNewsletterFlowEmail({ to: entry.email, name: entry.name, n: 1, seed: state.startedAt });
  state.step = 1;
  state.lastSentAt = Date.now();
  await store.updateNewsletterFlow(state);
}

function unsubscribePage(ok) {
  const msg = ok
    ? "You've been unsubscribed. You won't receive any further newsletter emails from us."
    : 'This unsubscribe link is invalid or has expired. If you keep receiving emails, just reply and we’ll remove you.';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Velvet &amp; Valor</title></head>
<body style="margin:0;background:#EFEAE1;font-family:Georgia,'Times New Roman',serif;color:#2A2A28;">
  <div style="max-width:480px;margin:60px auto;background:#FFFDF9;border:1px solid #E4DDD0;border-radius:16px;overflow:hidden;">
    <div style="background:#071428;padding:26px 32px;text-align:center;">
      <div style="font-family:Georgia,serif;color:#fff;font-size:19px;letter-spacing:0.1em;">VELVET &amp; VALOR</div>
    </div>
    <div style="padding:36px 32px;text-align:center;">
      <p style="font-size:16px;line-height:1.8;color:#3A3A37;margin:0 0 24px;">${msg}</p>
      <a href="https://www.velvet-valor.com" style="display:inline-block;background:#1A9090;border-radius:8px;padding:12px 26px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#04211F;text-decoration:none;">Return to Velvet &amp; Valor</a>
    </div>
  </div>
</body></html>`;
}
