const { requireUser } = require('./_auth');
const { welcomeFlowEmail, renderFlowEmail, waitlistHtml } = require('./_email');

/**
 * Admin view of the automated email flows (read-only). Manager+.
 *   GET /api/admin/flows                       → manifest of all flows + their steps
 *   GET /api/admin/flows?flow=newsletter&n=2   → { html } rendered preview of one email
 *
 * The manifest describes the trigger, schedule and goal of each step; subjects
 * are pulled live from the email templates so they never drift out of sync.
 */

// Flow metadata. Subjects are resolved from the templates at request time.
const FLOWS = {
  newsletter: {
    key: 'newsletter',
    title: 'Newsletter Welcome Flow',
    status: 'live',
    trigger: 'Someone subscribes to the newsletter on the website',
    summary: '6 emails over ~11 days. Email 1 sends instantly; the rest are sent by a daily job.',
    exit: 'Exits immediately if the subscriber places an order — no more "buy now" emails.',
    steps: [
      { n: 1, timing: 'Immediately', goal: 'Deliver the FIRST10 code & set expectations' },
      { n: 2, timing: '2 days later', goal: "Emotional connection — Kate's story" },
      { n: 3, timing: '4 days later', goal: 'Justify the premium — the craft' },
      { n: 4, timing: '6 days later', goal: 'Showcase the custom horse portrait' },
      { n: 5, timing: '8 days later', goal: 'Social proof + Instagram' },
      { n: 6, timing: '11 days later', goal: 'Urgency on the code, graduate to newsletter' },
    ],
  },
  waitlist: {
    key: 'waitlist',
    title: 'Journal Waitlist Flow',
    status: 'partial',
    trigger: 'Someone joins the Equestrian Journal waiting list',
    summary: 'A single confirmation today. A fuller nurture sequence is planned.',
    exit: '',
    steps: [
      { n: 1, timing: 'Immediately', goal: 'Confirm they are on the waiting list' },
    ],
  },
};

function stepSubject(flowKey, n) {
  if (flowKey === 'newsletter') return welcomeFlowEmail(n).subject;
  if (flowKey === 'waitlist') return "You're on the list — The Equestrian Journal";
  return '';
}

function renderEmail(flowKey, n) {
  if (flowKey === 'newsletter') return renderFlowEmail(n, { name: 'Eleanor', code: process.env.NEWSLETTER_CODE || 'FIRST10' });
  if (flowKey === 'waitlist') return waitlistHtml('Eleanor');
  return null;
}

module.exports = async (req, res) => {
  const me = await requireUser(req, res, 'manager');
  if (!me) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const flowKey = req.query && req.query.flow;
  const n = req.query && req.query.n != null ? Number(req.query.n) : null;

  // Single-email preview.
  if (flowKey && n != null) {
    const flow = FLOWS[flowKey];
    if (!flow || !flow.steps.some((s) => s.n === n)) return res.status(404).json({ error: 'Unknown email' });
    try {
      return res.status(200).json({ html: renderEmail(flowKey, n) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Manifest of all flows, with live subjects attached.
  const flows = Object.values(FLOWS).map((f) => ({
    ...f,
    steps: f.steps.map((s) => ({ ...s, subject: stepSubject(f.key, s.n) })),
  }));
  return res.status(200).json({ flows });
};
