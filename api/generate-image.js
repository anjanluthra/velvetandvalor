module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.text();
      console.error('Gemini API error:', response.status, errData);
      return res.status(response.status).json({
        error: `Gemini API returned ${response.status}`,
        details: errData,
      });
    }

    const data = await response.json();

    // Extract images and text from the response
    const results = [];
    const candidates = data.candidates || [];

    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          results.push({
            type: 'image',
            mimeType: part.inlineData.mimeType,
            data: part.inlineData.data,
          });
        } else if (part.text) {
          results.push({
            type: 'text',
            content: part.text,
          });
        }
      }
    }

    if (results.length === 0) {
      return res.status(500).json({
        error: 'No results from Gemini',
        raw: JSON.stringify(data).substring(0, 500),
      });
    }

    return res.status(200).json({ results });
  } catch (err) {
    console.error('Gemini error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
