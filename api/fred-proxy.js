export default async function handler(req, res) {
  const { path, ...rest } = req.query;
  const qs = new URLSearchParams(rest).toString();
  const target = `https://api.stlouisfed.org/${path || ''}${qs ? '?' + qs : ''}`;
  try {
    const r = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await r.text();
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(r.status).send(data);
  } catch (e) {
    res.status(502).send('FRED proxy error: ' + e.message);
  }
}
