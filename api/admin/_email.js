/**
 * Velvet & Valor — transactional email via Resend REST API (no npm dependency).
 * Configure with RESEND_API_KEY and RESEND_FROM
 * (e.g. RESEND_FROM="Velvet & Valor <admin@velvet-valor.com>").
 */
async function sendEmail({ to, subject, html, from, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const sender = from || process.env.RESEND_FROM;
  if (!key) throw new Error('RESEND_API_KEY not configured');
  if (!sender) throw new Error('RESEND_FROM not configured');

  const body = { from: sender, to: [to], subject, html };
  if (replyTo) body.reply_to = replyTo;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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

// ── Founder welcome (personal note from Kate) ────────────────
const SITE = 'https://www.velvet-valor.com';
const KATE_PHOTO = `${SITE}/images/kate-luthra.jpg`;

function firstName(name) {
  const f = String(name || '').trim().split(/\s+/)[0];
  return f ? escapeHtml(f) : '';
}

/**
 * A warm, letter-style welcome from Kate. Deliberately NOT an order email —
 * Stripe already sends the receipt and shipping details. This welcomes the
 * buyer into the community. `product` is referenced softly, if present.
 */
function founderWelcomeHtml({ name, product }) {
  const greeting = firstName(name) ? `Dear ${firstName(name)},` : 'Hello,';
  const chosen = product
    ? `I do hope your ${escapeHtml(product)} brings a little happiness to your every day`
    : `I do hope what you've chosen brings a little happiness to your every day`;

  return `
  <div style="margin:0;padding:0;background:#EFEAE1;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEAE1;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFDF9;border:1px solid #E4DDD0;border-radius:16px;overflow:hidden;">
          <!-- Brand bar -->
          <tr><td style="background:#071428;padding:22px 32px;text-align:center;">
            <div style="font-family:Georgia,'Times New Roman',serif;color:#ffffff;font-size:20px;letter-spacing:0.02em;">Velvet &amp; Valor</div>
            <div style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7FCDCD;margin-top:6px;">A note from the founder</div>
          </td></tr>
          <!-- Letter -->
          <tr><td style="padding:40px 36px 28px;font-family:Georgia,'Times New Roman',serif;color:#2A2A28;">
            <p style="font-size:17px;line-height:1.7;margin:0 0 20px;">${greeting}</p>
            <p style="font-size:16px;line-height:1.85;margin:0 0 18px;color:#3A3A37;">
              I wanted to write to you myself &mdash; simply to say welcome. You're now part of the Velvet &amp; Valor community, and that means a great deal to me.
            </p>
            <p style="font-size:16px;line-height:1.85;margin:0 0 18px;color:#3A3A37;">
              This little brand began the way my own story did: with a horse, and the quiet lessons they teach us &mdash; patience, strength, and a little courage on the hard days. Everyone who joins us carries a piece of that story forward, and now you're one of them.
            </p>
            <p style="font-size:16px;line-height:1.85;margin:0 0 18px;color:#3A3A37;">
              There's no fine print here &mdash; just a small, growing family of people who love horses and the life they inspire. ${chosen}, and that this is the beginning of something lovely.
            </p>
            <p style="font-size:16px;line-height:1.85;margin:0 0 28px;color:#3A3A37;">
              If you ever want to share a photo, ask a question, or simply say hello, just reply to this note &mdash; it comes straight to me.
            </p>
            <!-- Signature -->
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:14px;vertical-align:middle;">
                <img src="${KATE_PHOTO}" width="56" height="56" alt="Kate Luthra" style="display:block;width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid #1A9090;" />
              </td>
              <td style="vertical-align:middle;">
                <div style="font-family:Georgia,serif;font-style:italic;font-size:24px;color:#071428;line-height:1;">Kate</div>
                <div style="font-family:Arial,sans-serif;font-size:12px;color:#8A8175;margin-top:6px;letter-spacing:0.02em;">Kate Luthra &middot; Creative Director &amp; Founder</div>
              </td>
            </tr></table>
          </td></tr>
          <!-- Footer -->
          <tr><td style="padding:22px 36px 30px;border-top:1px solid #EDE6D9;text-align:center;font-family:Arial,sans-serif;">
            <a href="${SITE}/our-story" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 10px;">Our Story</a>
            <span style="color:#D8CFBF;">&middot;</span>
            <a href="${SITE}/blog" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 10px;">Care Guide</a>
            <span style="color:#D8CFBF;">&middot;</span>
            <a href="${SITE}/contact" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 10px;">Contact</a>
            <p style="font-size:11px;color:#A89F90;margin:16px 0 0;line-height:1.6;">Velvet &amp; Valor &mdash; an artist-led equestrian lifestyle brand.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

async function sendFounderWelcomeEmail({ to, name, product }) {
  return sendEmail({
    to,
    from: process.env.RESEND_FROM_KATE || 'Kate at Velvet & Valor <info@velvet-valor.com>',
    replyTo: process.env.RESEND_REPLY_TO || 'info@velvet-valor.com',
    subject: firstName(name) ? `Welcome to Velvet & Valor, ${firstName(name)}` : 'Welcome to the Velvet & Valor community',
    html: founderWelcomeHtml({ name, product }),
  });
}

// ── Shipping confirmation ────────────────────────────────────
/** Format a delivery date for the email. Accepts YYYY-MM-DD (from <input type=date>)
 *  or any Date-parseable string; falls back to the raw value if unparseable. */
function formatDeliveryDate(d) {
  if (!d) return '';
  const s = String(d).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
  if (isNaN(date.getTime())) return escapeHtml(s);
  try {
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return escapeHtml(s);
  }
}

function shippedHtml({ name, product, deliveryDate }) {
  const greeting = firstName(name) ? `Hi ${firstName(name)},` : 'Hello,';
  const item = product ? escapeHtml(product) : 'your order';
  const arrival = formatDeliveryDate(deliveryDate);
  const deliveryLine = arrival
    ? `It should reach you by <strong>${arrival}</strong>. If anything isn't quite right when it arrives, just reply to this email &mdash; we'll take care of it.`
    : `Standard worldwide delivery typically takes a few business days from dispatch. If anything isn't quite right when it arrives, just reply to this email &mdash; we'll take care of it.`;

  return `
  <div style="margin:0;padding:0;background:#EFEAE1;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEAE1;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFDF9;border:1px solid #E4DDD0;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#071428;padding:22px 32px;text-align:center;">
            <div style="font-family:Georgia,'Times New Roman',serif;color:#ffffff;font-size:20px;">Velvet &amp; Valor</div>
            <div style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7FCDCD;margin-top:6px;">Your order is on its way</div>
          </td></tr>
          <tr><td style="padding:38px 36px 28px;font-family:Georgia,'Times New Roman',serif;color:#2A2A28;">
            <p style="font-size:17px;line-height:1.7;margin:0 0 18px;">${greeting}</p>
            <p style="font-size:16px;line-height:1.85;margin:0 0 22px;color:#3A3A37;">
              Wonderful news &mdash; <strong>${item}</strong> has shipped and is making its way to you.
            </p>
            <p style="font-size:15px;line-height:1.8;margin:0 0 8px;color:#3A3A37;">
              ${deliveryLine}
            </p>
          </td></tr>
          <tr><td style="padding:22px 36px 30px;border-top:1px solid #EDE6D9;text-align:center;font-family:Arial,sans-serif;">
            <a href="${SITE}/our-story" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 10px;">Our Story</a>
            <span style="color:#D8CFBF;">&middot;</span>
            <a href="${SITE}/blog" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 10px;">Care Guide</a>
            <span style="color:#D8CFBF;">&middot;</span>
            <a href="${SITE}/contact" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 10px;">Contact</a>
            <p style="font-size:11px;color:#A89F90;margin:16px 0 0;line-height:1.6;">Velvet &amp; Valor &mdash; an artist-led equestrian lifestyle brand.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

async function sendShippedEmail({ to, name, product, deliveryDate }) {
  return sendEmail({
    to,
    replyTo: process.env.RESEND_REPLY_TO || 'info@velvet-valor.com',
    subject: 'Your Velvet & Valor order has shipped',
    html: shippedHtml({ name, product, deliveryDate }),
  });
}

module.exports = { sendEmail, sendInviteEmail, sendFounderWelcomeEmail, founderWelcomeHtml, sendShippedEmail, shippedHtml };
