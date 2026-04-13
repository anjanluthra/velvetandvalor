const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, source } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const entry = {
    name: name || '',
    email: email,
    source: source || 'journal-waitlist',
    timestamp: new Date().toISOString(),
  };

  // Log to stdout so it appears in Vercel logs (can be exported)
  console.log('WAITLIST_ENTRY:', JSON.stringify(entry));

  // In production, you'd connect to a database or Google Sheets API here.
  // For now, entries are logged to Vercel's function logs and Stripe metadata.

  return res.status(200).json({ success: true, message: 'Added to waiting list' });
};
