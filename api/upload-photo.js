const { put } = require('@vercel/blob');

module.exports = async (req, res) => {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-filename');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Product photos go to a separate folder and require an admin session;
  // customer custom-portrait uploads stay public.
  const folder = (req.query && req.query.folder) === 'products' ? 'products' : 'custom-portraits';
  if (folder === 'products') {
    const { requireAuth } = require('./admin/_auth');
    if (!requireAuth(req, res)) return;
  }

  try {
    const filename = req.headers['x-filename'] || `horse-${Date.now()}.jpg`;
    // Sanitise filename — only safe chars, keep extension
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const path = `${folder}/${safe}`;

    const blob = await put(path, req, {
      access: 'public',
      addRandomSuffix: true,
      contentType: req.headers['content-type'] || 'image/jpeg',
    });

    return res.status(200).json({
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (err) {
    console.error('Photo upload error:', err && err.message);
    const msg = (err && err.message) || 'Upload failed';
    // Surface a clearer hint if the Vercel Blob token isn't configured yet
    const isTokenIssue = /BLOB_READ_WRITE_TOKEN|access token|missing token/i.test(msg);
    return res.status(500).json({
      error: isTokenIssue
        ? 'Photo storage is not configured. Please email info@velvet-valor.com to place your order.'
        : 'Photo upload failed. Please try a smaller image, or email info@velvet-valor.com.',
    });
  }
};

module.exports.config = {
  api: { bodyParser: false },
};
