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

  try {
    const filename = req.headers['x-filename'] || `horse-${Date.now()}.jpg`;
    // Sanitise filename — only safe chars, keep extension
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const path = `custom-portraits/${safe}`;

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
    console.error('Photo upload error:', err.message);
    return res.status(500).json({ error: 'Upload failed' });
  }
};

module.exports.config = {
  api: { bodyParser: false },
};
