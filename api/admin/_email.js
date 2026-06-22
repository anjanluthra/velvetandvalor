/**
 * Velvet & Valor — transactional email via Resend REST API (no npm dependency).
 * Configure with RESEND_API_KEY and RESEND_FROM
 * (e.g. RESEND_FROM="Velvet & Valor <admin@velvet-valor.com>").
 */
async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key) throw new Error('RESEND_API_KEY not configured');
  if (!from) throw new Error('RESEND_FROM not configured');

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Resend ${r.status}: ${t}`);
  }
  return await r.json();
}

function inviteHtml({ name, link, inviter }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hello,';
  const who = inviter ? `${escapeHtml(inviter)} has` : 'You have been';
  return `
  <div style="background:#071428;padding:40px 0;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#0C1E3A;border:1px solid rgba(26,144,144,0.4);border-radius:14px;padding:36px 32px;color:#fff;">
      <h1 style="font-family:Georgia,serif;font-weight:500;font-size:22px;margin:0 0 4px;">Velvet &amp; Valor</h1>
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7FCDCD;margin-bottom:24px;">Admin Access</div>
      <p style="font-size:15px;line-height:1.7;color:rgba(255,255,255,0.85);margin:0 0 16px;">${greeting}</p>
      <p style="font-size:15px;line-height:1.7;color:rgba(255,255,255,0.85);margin:0 0 24px;">
        ${who} invited to the Velvet &amp; Valor admin panel. Click below to set your password and sign in.
      </p>
      <a href="${link}" style="display:inline-block;background:#1A9090;color:#040D1C;font-weight:600;text-decoration:none;padding:13px 26px;border-radius:8px;font-size:14px;">Set your password</a>
      <p style="font-size:12px;line-height:1.7;color:rgba(255,255,255,0.45);margin:24px 0 0;">
        This link expires in 7 days. If you weren't expecting this, you can ignore this email.
      </p>
    </div>
  </div>`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function sendInviteEmail({ to, name, link, inviter }) {
  return sendEmail({
    to,
    subject: "You've been invited to the Velvet & Valor admin",
    html: inviteHtml({ name, link, inviter }),
  });
}

module.exports = { sendEmail, sendInviteEmail };
