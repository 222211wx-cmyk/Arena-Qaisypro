export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(404).json({ error: 'API route not implemented', code: 'API_NOT_FOUND' });
}
