export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({
    authenticated: true,
    user: { id: 1, email: '222211wx@gmail.com', name: 'Qaisy Pro', role: 'admin' },
    session: { valid: true }
  });
}
