/**
 * Velvet & Valor — transactional email via Resend REST API (no npm dependency).
 * Configure with RESEND_API_KEY and RESEND_FROM
 * (e.g. RESEND_FROM="Velvet & Valor <admin@velvet-valor.com>").
 */
async function sendEmail({ to, subject, html, from, replyTo, bcc }) {
  const key = process.env.RESEND_API_KEY;
  const sender = from || process.env.RESEND_FROM;
  if (!key) throw new Error('RESEND_API_KEY not configured');
  if (!sender) throw new Error('RESEND_FROM not configured');

  const body = { from: sender, to: Array.isArray(to) ? to : [to], subject, html };
  if (replyTo) body.reply_to = replyTo;
  if (bcc) body.bcc = Array.isArray(bcc) ? bcc : [bcc];

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

/**
 * Admin recipients for internal notifications (new purchases, form submissions).
 * Override with ADMIN_EMAILS (comma-separated); otherwise both owners get notified.
 */
function adminRecipients() {
  const raw = process.env.ADMIN_EMAILS;
  if (raw) {
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length) return list;
  }
  return ['info@velvet-valor.com'];
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
          <tr><td style="background:#071428;padding:26px 32px;text-align:center;">
            <img src="${SITE}/images/vv-logo.png" width="46" alt="Velvet &amp; Valor" style="display:inline-block;width:46px;height:auto;margin:0 0 12px;" />
            <div style="font-family:Georgia,'Times New Roman',serif;color:#ffffff;font-size:19px;letter-spacing:0.1em;">VELVET &amp; VALOR</div>
            <div style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7FCDCD;margin-top:8px;">A note from the founder</div>
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
            <a href="${SITE}/contact" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 10px;">Contact</a>
            <p style="font-size:11px;color:#A89F90;margin:16px 0 0;line-height:1.6;">VELVET &amp; VALOR &mdash; an artist-led equestrian lifestyle brand.</p>
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
    ? `<p style="font-size:15px;line-height:1.8;margin:0 0 14px;color:#3A3A37;">Your estimated delivery date is <strong>${arrival}</strong>.</p>`
    : '';

  return `
  <div style="margin:0;padding:0;background:#EFEAE1;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEAE1;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFDF9;border:1px solid #E4DDD0;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#071428;padding:26px 32px;text-align:center;">
            <img src="${SITE}/images/vv-logo.png" width="46" alt="Velvet &amp; Valor" style="display:inline-block;width:46px;height:auto;margin:0 0 12px;" />
            <div style="font-family:Georgia,'Times New Roman',serif;color:#ffffff;font-size:19px;letter-spacing:0.1em;">VELVET &amp; VALOR</div>
            <div style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7FCDCD;margin-top:8px;">Your order is on its way</div>
          </td></tr>
          <tr><td style="padding:38px 36px 28px;font-family:Georgia,'Times New Roman',serif;color:#2A2A28;">
            <p style="font-size:17px;line-height:1.7;margin:0 0 18px;">${greeting}</p>
            <p style="font-size:16px;line-height:1.85;margin:0 0 22px;color:#3A3A37;">
              Wonderful news &mdash; <strong>${item}</strong> has shipped and is making its way to you.
            </p>
            ${deliveryLine}
            <p style="font-size:15px;line-height:1.8;margin:0 0 8px;color:#3A3A37;">
              If anything isn't quite right, just reply to this email.
            </p>
          </td></tr>
          <tr><td style="padding:22px 36px 30px;border-top:1px solid #EDE6D9;text-align:center;font-family:Arial,sans-serif;">
            <a href="${SITE}/our-story" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 10px;">Our Story</a>
            <span style="color:#D8CFBF;">&middot;</span>
            <a href="${SITE}/contact" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 10px;">Contact</a>
            <p style="font-size:11px;color:#A89F90;margin:16px 0 0;line-height:1.6;">VELVET &amp; VALOR &mdash; an artist-led equestrian lifestyle brand.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

async function sendShippedEmail({ to, name, product, deliveryDate }) {
  return sendEmail({
    to,
    bcc: adminRecipients(),
    replyTo: process.env.RESEND_REPLY_TO || 'info@velvet-valor.com',
    subject: 'Your Velvet & Valor order has shipped',
    html: shippedHtml({ name, product, deliveryDate }),
  });
}

// ── Cart recovery (abandoned checkout) ───────────────────────
/**
 * Warm "you left something behind" nudge with a one-click recovery link.
 * `items` is an array of human-readable line descriptions. `discountCode`
 * is optional (Phase 2) — when present, a small offer block is shown.
 */
function cartRecoveryHtml({ name, items, recoveryUrl, discountCode }) {
  const greeting = firstName(name) ? `Hi ${firstName(name)},` : 'Hello,';
  const list = (Array.isArray(items) ? items : []).filter(Boolean);
  const itemsBlock = list.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;background:#F7F3EB;border:1px solid #E4DDD0;border-radius:12px;">
         <tr><td style="padding:16px 22px;font-family:Arial,sans-serif;">
           ${list.map((it) => `<div style="font-size:15px;color:#2A2A28;padding:6px 0;border-bottom:1px solid #ECE5D8;">${escapeHtml(it)}</div>`).join('')}
         </td></tr>
       </table>`
    : '';
  const offerBlock = discountCode
    ? `<p style="font-size:15px;line-height:1.8;margin:0 0 22px;color:#3A3A37;">As a little nudge, here's <strong>10% off</strong> — use code <strong style="letter-spacing:0.05em;">${escapeHtml(discountCode)}</strong> at checkout.</p>`
    : '';
  const cta = escapeHtml(recoveryUrl || `${SITE}/collections/iphone-cases`);

  return `
  <div style="margin:0;padding:0;background:#EFEAE1;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEAE1;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFDF9;border:1px solid #E4DDD0;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#071428;padding:26px 32px;text-align:center;">
            <img src="${SITE}/images/vv-logo.png" width="46" alt="Velvet &amp; Valor" style="display:inline-block;width:46px;height:auto;margin:0 0 12px;" />
            <div style="font-family:Georgia,'Times New Roman',serif;color:#ffffff;font-size:19px;letter-spacing:0.1em;">VELVET &amp; VALOR</div>
            <div style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7FCDCD;margin-top:8px;">Your cart is waiting</div>
          </td></tr>
          <tr><td style="padding:38px 36px 28px;font-family:Georgia,'Times New Roman',serif;color:#2A2A28;">
            <p style="font-size:17px;line-height:1.7;margin:0 0 18px;">${greeting}</p>
            <p style="font-size:16px;line-height:1.85;margin:0 0 22px;color:#3A3A37;">
              You left something behind &mdash; it's still here, just waiting for you. We've kept your selection ready so you can pick up right where you left off.
            </p>
            ${itemsBlock}
            ${offerBlock}
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 26px;"><tr>
              <td style="background:#1A9090;border-radius:8px;">
                <a href="${cta}" style="display:inline-block;padding:14px 30px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#04211F;text-decoration:none;letter-spacing:0.02em;">Complete your order</a>
              </td>
            </tr></table>
            <p style="font-size:14px;line-height:1.8;margin:0;color:#6A6258;">
              No rush &mdash; and if you have any questions, just reply to this email and we'll be glad to help.
            </p>
          </td></tr>
          <tr><td style="padding:22px 36px 30px;border-top:1px solid #EDE6D9;text-align:center;font-family:Arial,sans-serif;">
            <a href="${SITE}/our-story" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 10px;">Our Story</a>
            <span style="color:#D8CFBF;">&middot;</span>
            <a href="${SITE}/contact" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 10px;">Contact</a>
            <p style="font-size:11px;color:#A89F90;margin:16px 0 0;line-height:1.6;">VELVET &amp; VALOR &mdash; an artist-led equestrian lifestyle brand.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

async function sendCartRecoveryEmail({ to, name, items, recoveryUrl, discountCode }) {
  return sendEmail({
    to,
    from: process.env.RESEND_FROM_KATE || 'Kate at Velvet & Valor <info@velvet-valor.com>',
    replyTo: process.env.RESEND_REPLY_TO || 'info@velvet-valor.com',
    subject: discountCode ? 'A little something off your Velvet & Valor cart' : 'You left something behind at Velvet & Valor',
    html: cartRecoveryHtml({ name, items, recoveryUrl, discountCode }),
  });
}

// ── Internal notification: a new form submission ─────────────
function submissionLabel(type) {
  return type === 'newsletter' ? 'Newsletter signup'
    : type === 'waitlist' ? 'Journal waitlist signup'
    : 'Contact message';
}

async function sendSubmissionEmail({ entry }) {
  const to = adminRecipients();
  const label = submissionLabel(entry.type);
  const rows = [
    ['Type', label],
    ['Name', entry.name],
    ['Email', entry.email],
    entry.subject ? ['Subject', entry.subject] : null,
    entry.order ? ['Order', entry.order] : null,
    entry.message ? ['Message', entry.message] : null,
    entry.source ? ['Source', entry.source] : null,
  ].filter(Boolean);
  const html = `
  <div style="background:#071428;padding:32px 0;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#0C1E3A;border:1px solid rgba(26,144,144,0.4);border-radius:14px;padding:30px 28px;color:#fff;">
      <div style="font-family:Georgia,serif;font-size:18px;">Velvet &amp; Valor</div>
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7FCDCD;margin:6px 0 20px;">New ${escapeHtml(label)}</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:rgba(255,255,255,0.9);">
        ${rows.map(([k, v]) => `<tr><td style="padding:7px 10px 7px 0;color:rgba(255,255,255,0.5);vertical-align:top;white-space:nowrap;">${escapeHtml(k)}</td><td style="padding:7px 0;">${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}
      </table>
      <p style="font-size:12px;color:rgba(255,255,255,0.45);margin:20px 0 0;">Reply directly to this email to respond to ${escapeHtml(entry.email)}.</p>
    </div>
  </div>`;
  return sendEmail({ to, replyTo: entry.email, subject: `New ${label}: ${entry.email}`, html });
}

// ── Internal notification: a new purchase ────────────────────
/**
 * Notify the owners every time a Stripe checkout completes (paid).
 * `items` is an array of human-readable line descriptions; `amount` is the
 * formatted order total (e.g. "$48.00"); both are optional.
 */
async function sendPurchaseNotification({ name, email, product, amount, items, sessionId }) {
  const to = adminRecipients();
  const list = (Array.isArray(items) ? items : []).filter(Boolean);
  const rows = [
    ['Total', amount],
    ['Product', product],
    ['Customer', name],
    ['Email', email],
    ['Session', sessionId],
  ].filter(([, v]) => v);
  const itemsBlock = list.length
    ? `<div style="margin-top:6px;">${list.map((it) => `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.08);">${escapeHtml(it)}</div>`).join('')}</div>`
    : '';
  const html = `
  <div style="background:#071428;padding:32px 0;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#0C1E3A;border:1px solid rgba(26,144,144,0.4);border-radius:14px;padding:30px 28px;color:#fff;">
      <div style="font-family:Georgia,serif;font-size:18px;">Velvet &amp; Valor</div>
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7FCDCD;margin:6px 0 20px;">New purchase${amount ? ` — ${escapeHtml(amount)}` : ''}</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:rgba(255,255,255,0.9);">
        ${rows.map(([k, v]) => `<tr><td style="padding:7px 10px 7px 0;color:rgba(255,255,255,0.5);vertical-align:top;white-space:nowrap;">${escapeHtml(k)}</td><td style="padding:7px 0;">${escapeHtml(v)}</td></tr>`).join('')}
      </table>
      ${itemsBlock ? `<div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin:20px 0 0;">Items</div>${itemsBlock}` : ''}
    </div>
  </div>`;
  return sendEmail({ to, replyTo: email || undefined, subject: `New order${amount ? ` (${amount})` : ''}${email ? ` — ${email}` : ''}`, html });
}

// ── Customer-facing replies to site form submissions ─────────
const REPLY_TO = process.env.RESEND_REPLY_TO || 'info@velvet-valor.com';
const PARA = 'font-size:16px;line-height:1.85;margin:0 0 18px;color:#3A3A37;';

/** Shared branded shell (logo header + footer) for customer-facing notices. */
function customerShell(subtitle, inner) {
  return `
  <div style="margin:0;padding:0;background:#EFEAE1;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEAE1;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFDF9;border:1px solid #E4DDD0;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#071428;padding:26px 32px;text-align:center;">
            <img src="${SITE}/images/vv-logo.png" width="46" alt="Velvet &amp; Valor" style="display:inline-block;width:46px;height:auto;margin:0 0 12px;" />
            <div style="font-family:Georgia,'Times New Roman',serif;color:#ffffff;font-size:19px;letter-spacing:0.1em;">VELVET &amp; VALOR</div>
            <div style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7FCDCD;margin-top:8px;">${subtitle}</div>
          </td></tr>
          <tr><td style="padding:38px 36px 28px;font-family:Georgia,'Times New Roman',serif;color:#2A2A28;">
            ${inner}
          </td></tr>
          <tr><td style="padding:22px 36px 30px;border-top:1px solid #EDE6D9;text-align:center;font-family:Arial,sans-serif;">
            <a href="${SITE}/our-story" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 10px;">Our Story</a>
            <span style="color:#D8CFBF;">&middot;</span>
            <a href="${SITE}/contact" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 10px;">Contact</a>
            <p style="font-size:11px;color:#A89F90;margin:16px 0 0;line-height:1.6;">VELVET &amp; VALOR &mdash; an artist-led equestrian lifestyle brand.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

/** Auto-reply after the contact form. */
async function sendContactAutoReply({ to, name }) {
  const greeting = firstName(name) ? `Dear ${firstName(name)},` : 'Hello,';
  const inner = `
    <p style="font-size:17px;line-height:1.7;margin:0 0 18px;">${greeting}</p>
    <p style="${PARA}">Thank you for reaching out to Velvet &amp; Valor. We've received your message and one of us will personally reply within one business day.</p>
    <p style="${PARA}">In the meantime, feel free to explore <a href="${SITE}/collections/iphone-cases" style="color:#1A7A7A;">the collection</a> or read a little of <a href="${SITE}/our-story" style="color:#1A7A7A;">our story</a>.</p>
    <p style="${PARA}">Warmly,<br>The Velvet &amp; Valor team</p>`;
  return sendEmail({ to, replyTo: REPLY_TO, subject: 'We received your message — Velvet & Valor', html: customerShell('We received your message', inner) });
}

/** Newsletter welcome with a thank-you discount code. */
async function sendNewsletterWelcome({ to, code }) {
  const c = escapeHtml(code || 'FIRST10');
  const inner = `
    <p style="font-size:17px;line-height:1.7;margin:0 0 18px;">Welcome to the list,</p>
    <p style="${PARA}">Thank you for joining Velvet &amp; Valor. You'll be first to hear about new editions, limited drops, and stories from the saddle.</p>
    <p style="${PARA}">And as a small thank-you, here's <strong>10% off</strong> your first order:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr><td style="background:#F4F0E8;border:1px dashed #C9A24B;border-radius:10px;padding:14px 30px;text-align:center;">
      <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8A8175;margin-bottom:6px;">Your code</div>
      <div style="font-family:Arial,sans-serif;font-size:20px;color:#071428;font-weight:bold;letter-spacing:0.08em;">${c}</div>
    </td></tr></table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td style="background:#1A9090;border-radius:8px;">
      <a href="${SITE}/collections/iphone-cases" style="display:inline-block;padding:14px 30px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#04211F;text-decoration:none;">Shop the collection</a>
    </td></tr></table>`;
  return sendEmail({ to, replyTo: REPLY_TO, subject: "Welcome — here's 10% off your first order", html: customerShell('Welcome to Velvet & Valor', inner) });
}

/** Journal waitlist confirmation. */
async function sendWaitlistConfirmation({ to, name }) {
  const greeting = firstName(name) ? `Hi ${firstName(name)},` : 'Hello,';
  const inner = `
    <p style="font-size:17px;line-height:1.7;margin:0 0 18px;">${greeting}</p>
    <p style="${PARA}">You're on the waiting list for <strong>The Equestrian Journal</strong> &mdash; a performance and mindset journal for riders who want to grow, in the saddle and beyond.</p>
    <p style="${PARA}">We'll be in touch the moment it launches, and you'll be among the very first to know. Thank you for riding with us.</p>
    <p style="${PARA}">Warmly,<br>The Velvet &amp; Valor team</p>`;
  return sendEmail({ to, replyTo: REPLY_TO, subject: "You're on the list — The Equestrian Journal", html: customerShell('The Equestrian Journal', inner) });
}

/** Dispatch the right customer-facing reply for a submission entry. */
async function sendCustomerReply({ entry }) {
  if (!entry || !entry.email) return null;
  if (entry.type === 'newsletter') {
    return sendNewsletterWelcome({ to: entry.email, code: process.env.NEWSLETTER_CODE || 'FIRST10' });
  }
  if (entry.type === 'waitlist') {
    return sendWaitlistConfirmation({ to: entry.email, name: entry.name });
  }
  return sendContactAutoReply({ to: entry.email, name: entry.name });
}

module.exports = {
  sendEmail, sendInviteEmail,
  sendFounderWelcomeEmail, founderWelcomeHtml,
  sendShippedEmail, shippedHtml,
  sendCartRecoveryEmail, cartRecoveryHtml,
  sendSubmissionEmail, sendPurchaseNotification,
  sendContactAutoReply, sendNewsletterWelcome, sendWaitlistConfirmation, sendCustomerReply,
};
