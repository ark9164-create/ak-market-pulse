export default async function handler(req, res) {
  const slug = req.query.slug || [];
  const path = '/' + (Array.isArray(slug) ? slug.join('/') : slug);
  const urlObj = new URL(req.url, 'https://placeholder.com');
  const qs = urlObj.search;
  const target = `https://api.financialdatasets.ai${path}${qs}`;
  try {
    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'X-API-KEY': process.env.VITE_FINANCIAL_DATASETS_API_KEY || '',
      },
    });
    const data = await r.text();
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(r.status).send(data);
  } catch (e) {
    res.status(502).send('FinData proxy error: ' + e.message);
  }
}
