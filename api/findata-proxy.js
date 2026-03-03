export default async function handler(req, res) {
  const rest = req.url.replace(/^\/api\/findata-proxy/, '');
  const target = `https://api.financialdatasets.ai${rest}`;
  const apiKey = process.env.VITE_FINANCIAL_DATASETS_API_KEY || '';
  try {
    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'X-API-KEY': apiKey,
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
