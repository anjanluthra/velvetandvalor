/**
 * Velvet & Valor — Instagram Feed Proxy
 *
 * Pulls latest media from @velvetvalorstore using the Instagram Graph API
 * via a long-lived access token stored in IG_ACCESS_TOKEN (Vercel env var).
 *
 * Caches the response in-memory between cold starts so we don't hit IG
 * rate limits. Frontend should call /api/instagram-feed and render the grid.
 *
 * Response shape:
 *   { items: [ { id, media_url, permalink, caption, media_type, thumbnail_url }, ... ] }
 */

let cache = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) {
    return res.status(503).json({
      error: 'Instagram feed not yet configured',
      detail: 'IG_ACCESS_TOKEN environment variable is missing on Vercel.',
    });
  }

  // Serve cached version if fresh
  if (cache && (Date.now() - cacheTime < CACHE_TTL_MS)) {
    return res.status(200).json(cache);
  }

  try {
    // Pull the 12 most recent media items
    const fields = 'id,media_url,permalink,caption,media_type,thumbnail_url,timestamp';
    const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=12&access_token=${token}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errBody = await response.text();
      console.error('Instagram API error:', response.status, errBody);
      return res.status(502).json({
        error: 'Instagram API responded with an error',
        detail: errBody.slice(0, 300),
      });
    }

    const data = await response.json();
    const items = (data.data || []).map(item => ({
      id: item.id,
      media_url: item.media_type === 'VIDEO' ? (item.thumbnail_url || item.media_url) : item.media_url,
      permalink: item.permalink,
      caption: item.caption || '',
      media_type: item.media_type,
    }));

    const payload = { items, fetched_at: new Date().toISOString() };
    cache = payload;
    cacheTime = Date.now();

    return res.status(200).json(payload);
  } catch (err) {
    console.error('Instagram feed fetch failed:', err);
    return res.status(500).json({ error: 'Failed to fetch Instagram feed', detail: err.message });
  }
};
