export default async function handler(req, res) {
  const path = req.url.replace('/api/yahoo-proxy', '');
  const target = `https://query1.finance.yahoo.com${path}`;
  try {
    const r = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } });
    const data = await r.text();
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(r.status).send(data);
  } catch (e) {
    res.status(502).send('Proxy error');
  }
}
