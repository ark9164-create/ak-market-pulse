export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url');
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = await r.text();
    res.setHeader('Content-Type', r.headers.get('content-type') || 'text/xml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(text);
  } catch (e) {
    res.status(502).send('Proxy error');
  }
}
