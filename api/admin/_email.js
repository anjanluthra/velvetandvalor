/**
 * Velvet & Valor — transactional email via Resend REST API (no npm dependency).
 * Configure with RESEND_API_KEY and RESEND_FROM
 * (e.g. RESEND_FROM="Velvet & Valor <admin@velvet-valor.com>").
 */
async function sendEmail({ to, subject, html, from, replyTo, bcc, headers, idempotencyKey }) {
  const key = process.env.RESEND_API_KEY;
  const sender = from || process.env.RESEND_FROM;
  if (!key) throw new Error('RESEND_API_KEY not configured');
  if (!sender) throw new Error('RESEND_FROM not configured');

  const body = { from: sender, to: Array.isArray(to) ? to : [to], subject, html };
  if (replyTo) body.reply_to = replyTo;
  if (bcc) body.bcc = Array.isArray(bcc) ? bcc : [bcc];
  if (headers) body.headers = headers; // e.g. List-Unsubscribe, List-Unsubscribe-Post

  const reqHeaders = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) reqHeaders['Idempotency-Key'] = idempotencyKey; // retries won't double-send

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: reqHeaders,
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

/** Journal waitlist confirmation — HTML only (for sending and previews). */
function waitlistHtml(name) {
  const greeting = firstName(name) ? `Hi ${firstName(name)},` : 'Hello,';
  const inner = `
    <p style="font-size:17px;line-height:1.7;margin:0 0 18px;">${greeting}</p>
    <p style="${PARA}">You're on the waiting list for <strong>The Equestrian Journal</strong> &mdash; a performance and mindset journal for riders who want to grow, in the saddle and beyond.</p>
    <p style="${PARA}">We'll be in touch the moment it launches, and you'll be among the very first to know. Thank you for riding with us.</p>
    <p style="${PARA}">Warmly,<br>The Velvet &amp; Valor team</p>`;
  return customerShell('The Equestrian Journal', inner);
}

async function sendWaitlistConfirmation({ to, name }) {
  return sendEmail({ to, replyTo: REPLY_TO, subject: "You're on the list — The Equestrian Journal", html: waitlistHtml(name) });
}

// ── Newsletter welcome flow (6-email sequence) ───────────────
const { unsubUrl } = require('../_unsub');

const NL_CODE = process.env.NEWSLETTER_CODE || 'FIRST10';
const FLOW_FROM = process.env.RESEND_FROM_KATE || 'Kate at Velvet & Valor <info@velvet-valor.com>';
const INSTAGRAM = 'https://instagram.com/velvetvalorstore';
const POSTAL = process.env.POSTAL_ADDRESS || 'Braveheart FZ-LLC, United Arab Emirates';

const FLOW_URLS = {
  cases: `${SITE}/collections/iphone-cases`,
  custom: `${SITE}/custom`,
  story: `${SITE}/our-story`,
  journal: `${SITE}/journal`,
};

function flowButton(label, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td style="background:#1A9090;border-radius:8px;">
    <a href="${url}" style="display:inline-block;padding:14px 30px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#04211F;text-decoration:none;letter-spacing:0.02em;">${label}</a>
  </td></tr></table>`;
}

function flowCodeBlock(code) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="background:#F4F0E8;border:1px dashed #C9A24B;border-radius:10px;padding:14px 30px;text-align:center;">
    <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8A8175;margin-bottom:6px;">Your code</div>
    <div style="font-family:Arial,sans-serif;font-size:20px;color:#071428;font-weight:bold;letter-spacing:0.08em;">${escapeHtml(code)}</div>
  </td></tr></table>`;
}

function reviewCard(quote, who) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;background:#F7F3EB;border:1px solid #E4DDD0;border-radius:12px;"><tr><td style="padding:16px 20px;">
    <div style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#2A2A28;">&ldquo;${quote}&rdquo;</div>
    <div style="font-family:Arial,sans-serif;font-size:12px;color:#8A8175;margin-top:8px;"><em>&mdash; ${who}</em></div>
  </td></tr></table>`;
}

/** Branded shell with the marketing-compliance footer (postal address,
 *  Instagram, one-click unsubscribe) + hidden preheader. */
function flowShell(subtitle, preheader, inner, unsub) {
  return `
  <div style="margin:0;padding:0;background:#EFEAE1;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EFEAE1;font-size:1px;line-height:1px;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEAE1;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFDF9;border:1px solid #E4DDD0;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#071428;padding:26px 32px;text-align:center;">
            <img src="${SITE}/images/vv-logo.png" width="46" alt="Velvet &amp; Valor" style="display:inline-block;width:46px;height:auto;margin:0 0 12px;" />
            <div style="font-family:Georgia,'Times New Roman',serif;color:#ffffff;font-size:19px;letter-spacing:0.1em;">VELVET &amp; VALOR</div>
            <div style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7FCDCD;margin-top:8px;">${escapeHtml(subtitle)}</div>
          </td></tr>
          <tr><td style="padding:38px 36px 28px;font-family:Georgia,'Times New Roman',serif;color:#2A2A28;">
            ${inner}
          </td></tr>
          <tr><td style="padding:22px 36px 30px;border-top:1px solid #EDE6D9;text-align:center;font-family:Arial,sans-serif;">
            <a href="${FLOW_URLS.cases}" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 8px;">Shop</a>
            <span style="color:#D8CFBF;">&middot;</span>
            <a href="${FLOW_URLS.custom}" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 8px;">Custom</a>
            <span style="color:#D8CFBF;">&middot;</span>
            <a href="${INSTAGRAM}" style="color:#1A7A7A;text-decoration:none;font-size:12px;margin:0 8px;">Instagram</a>
            <p style="font-size:11px;color:#A89F90;margin:16px 0 0;line-height:1.7;">
              Velvet &amp; Valor &middot; ${escapeHtml(POSTAL)}<br>
              You're receiving this because you signed up at velvet-valor.com.<br>
              <a href="${unsub}" style="color:#A89F90;text-decoration:underline;">Unsubscribe</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

/** Build email N (1..6) of the welcome flow. Returns {subtitle, preheader, subject, inner}. */
function welcomeFlowEmail(n, { name, code } = {}) {
  const c = code || NL_CODE;
  const greet = firstName(name) || 'there';
  const u = FLOW_URLS;

  switch (Number(n)) {
    case 1: return {
      subtitle: 'Welcome to Velvet & Valor',
      preheader: `Your code ${c} is ready — plus what to expect from us.`,
      subject: "You're in — welcome to Velvet & Valor 🐎",
      inner: `
        <p style="font-size:17px;line-height:1.7;margin:0 0 18px;color:#071428;"><strong>Welcome, ${greet}.</strong></p>
        <p style="${PARA}">You've just joined a community of riders who carry a little of the yard with them everywhere they go.</p>
        <p style="${PARA}">As a thank you, here's <strong>10% off your first order</strong> &mdash; use <strong style="letter-spacing:0.05em;">${escapeHtml(c)}</strong> at checkout.</p>
        ${flowCodeBlock(c)}
        <p style="${PARA}">Here's what to expect from us: first access to new editions, stories from riders around the world, tips from experienced equestrians, and the first word on limited drops (they go quickly).</p>
        <p style="${PARA}">Every case is artist-designed, drop-tested, and MagSafe-ready &mdash; made to protect the phone you carry and remind you of the horse you love.</p>
        ${flowButton('Shop the cases &rarr;', u.cases)}
        <p style="font-size:14px;line-height:1.7;margin:0 0 18px;color:#6A6258;">Or <a href="${u.custom}" style="color:#1A7A7A;">create a custom portrait of your own horse &rarr;</a></p>
        <p style="font-size:12px;color:#A89F90;margin:0;">Loved by riders in 45+ countries &middot; 4.9&#9733;</p>`,
    };
    case 2: return {
      subtitle: 'A note from the founder',
      preheader: 'Where artistry meets purpose — Kate’s story.',
      subject: 'Why I started Velvet & Valor',
      inner: `
        <p style="${PARA}">Velvet &amp; Valor began with one belief: that the bond between a rider and their horse is worth carrying with you.</p>
        <p style="${PARA}">I'm Kate, the founder. This brand was born from a lifelong love of horses &mdash; and of watching people grow into the best version of themselves, in the saddle and out of it.</p>
        <p style="${PARA}">More than equestrian, Velvet &amp; Valor is a mindset: resilience, ambition, and quiet confidence, wherever you go. When softness and strength become part of how you live &mdash; not just how you ride &mdash; they shape your path and raise your standards.</p>
        <p style="${PARA}">That philosophy lives in every piece we make.</p>
        ${flowButton('Read the full story &rarr;', u.story)}
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 0;"><tr>
          <td style="padding-right:14px;vertical-align:middle;"><img src="${KATE_PHOTO}" width="48" height="48" alt="Kate Luthra" style="display:block;width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #1A9090;" /></td>
          <td style="vertical-align:middle;"><div style="font-family:Georgia,serif;font-style:italic;font-size:22px;color:#071428;line-height:1;">&mdash; Kate</div></td>
        </tr></table>
        <p style="font-size:13px;font-style:italic;color:#8A8175;margin:22px 0 0;">Still holding onto ${escapeHtml(c)}? It's waiting whenever you are.</p>`,
    };
    case 3: return {
      subtitle: 'The craft',
      preheader: 'Beauty you can see — protection you can feel.',
      subject: 'Drop-tested. MagSafe. Made to last.',
      inner: `
        <p style="${PARA}">A Velvet &amp; Valor case is built to be lived with.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background:#F7F3EB;border:1px solid #E4DDD0;border-radius:12px;"><tr><td style="padding:16px 22px;font-family:Arial,sans-serif;color:#2A2A28;">
          <div style="font-size:15px;line-height:1.6;padding:7px 0;border-bottom:1px solid #ECE5D8;"><strong>Non-flex polycarbonate</strong> that won't bend, with a drop-tested shell that protects through real life at the yard and beyond.</div>
          <div style="font-size:15px;line-height:1.6;padding:7px 0;border-bottom:1px solid #ECE5D8;"><strong>MagSafe-ready</strong> &mdash; charge and attach without ever removing it.</div>
          <div style="font-size:15px;line-height:1.6;padding:7px 0;border-bottom:1px solid #ECE5D8;"><strong>A premium glossy finish</strong> with vibrant, lasting colour.</div>
          <div style="font-size:15px;line-height:1.6;padding:7px 0;"><strong>Artist-designed</strong>, inspired by the elegance and power of the horse.</div>
        </td></tr></table>
        <p style="${PARA}">Two signatures to start with:</p>
        <p style="${PARA}"><strong>Noble Steed</strong> &mdash; our signature collection, in 9 colourways.<br><strong>The Rider's Motto</strong> &mdash; quote-edition cases for those who know <em>inside leg, outside rein</em>.</p>
        ${flowButton('Shop bestsellers &rarr;', u.cases)}`,
    };
    case 4: return {
      subtitle: 'Your horse, your case',
      preheader: 'A one-of-one portrait, made in 1–2 days.',
      subject: 'Your horse. Your case.',
      inner: `
        <p style="${PARA}">Some bonds deserve to be carried, not just remembered.</p>
        <p style="${PARA}">Our <strong>Custom Horse Portrait</strong> turns your own horse into a one-of-one case &mdash; artist-rendered, designed in just 1&ndash;2 days, and made to the same drop-tested, MagSafe standard as everything we create.</p>
        <p style="${PARA}">Send us your horse. We'll make them unforgettable.</p>
        ${flowButton('Create your custom portrait &rarr;', u.custom)}
        <p style="font-size:13px;font-style:italic;color:#8A8175;margin:0;">${escapeHtml(c)} works here too.</p>`,
    };
    case 5: return {
      subtitle: 'From the community',
      preheader: 'Compliments at the yard, guaranteed.',
      subject: '600+ riders, one obsession',
      inner: `
        <p style="${PARA}">We're a little biased &mdash; so we'll let riders speak instead.</p>
        ${reviewCard("The detail on this case is stunning. I've had so many compliments at the yard &mdash; and it survived being dropped on hard ground, twice.", 'Arabella S., Dressage Rider, UK')}
        ${reviewCard('The glossy finish feels incredible in hand. I feel proud of my horse and my commitment to the sport.', 'Madison W., Show Jumper, Florida')}
        <p style="${PARA}">Join 600+ riders across 45+ countries &mdash; and see new designs and behind-the-scenes first on Instagram.</p>
        ${flowButton('Shop the collection &rarr;', u.cases)}
        <p style="font-size:14px;margin:0;"><a href="${INSTAGRAM}" style="color:#1A7A7A;">Follow @velvetvalorstore &rarr;</a></p>`,
    };
    case 6: return {
      subtitle: 'Last call',
      preheader: `${c} won't wait — plus a first look at what's coming.`,
      subject: 'Your 10% is about to gallop off',
      inner: `
        <p style="${PARA}">Just a gentle reminder: your <strong>${escapeHtml(c)}</strong> welcome offer is about to expire.</p>
        <p style="${PARA}">If one of our editions has caught your eye, now's the moment &mdash; limited drops don't restock.</p>
        ${flowButton(`Use ${escapeHtml(c)} before it's gone &rarr;`, u.cases)}
        <p style="${PARA}">And something new is on the horizon: <strong>The Equestrian Journal</strong> &mdash; a performance and mindset journal designed to sharpen how you ride and how you grow.</p>
        ${flowButton('Join the waiting list &rarr;', u.journal)}
        <p style="font-size:15px;line-height:1.8;margin:18px 0 0;color:#3A3A37;">Softness and strength &mdash; on with you, always.<br>&mdash; The Velvet &amp; Valor team</p>`,
    };
    default:
      throw new Error(`welcomeFlowEmail: invalid email number ${n}`);
  }
}

/** Full branded HTML for email N (shell + footer), without sending. For previews. */
function renderFlowEmail(n, { name, code, email } = {}) {
  const def = welcomeFlowEmail(n, { name, code });
  return flowShell(def.subtitle, def.preheader, def.inner, unsubUrl(email || 'preview@velvet-valor.com'));
}

/**
 * Send email N of the welcome flow to a subscriber. Adds List-Unsubscribe
 * headers + an idempotency key so cron retries never double-send. `seed`
 * (e.g. the flow's startedAt) keeps re-enrolments from being suppressed.
 */
async function sendNewsletterFlowEmail({ to, name, n, code, seed }) {
  const def = welcomeFlowEmail(n, { name, code: code || NL_CODE });
  const unsub = unsubUrl(to);
  return sendEmail({
    to,
    from: FLOW_FROM,
    replyTo: REPLY_TO,
    subject: def.subject,
    html: flowShell(def.subtitle, def.preheader, def.inner, unsub),
    headers: {
      'List-Unsubscribe': `<mailto:${REPLY_TO}?subject=unsubscribe>, <${unsub}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    idempotencyKey: `nlflow:${n}:${String(to).toLowerCase()}:${seed || ''}`,
  });
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
  sendContactAutoReply, sendNewsletterWelcome, sendWaitlistConfirmation, waitlistHtml, sendCustomerReply,
  welcomeFlowEmail, renderFlowEmail, sendNewsletterFlowEmail,
};
