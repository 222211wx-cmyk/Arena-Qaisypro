export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    const clips = await sql`SELECT * FROM clips ORDER BY created_at DESC LIMIT 20`;
    return res.status(200).json({ clips, total: clips.length });
  } catch(e) {
    // إلا ما كاينش DB رجع ليستة خاوية باش الأزرار يبقاو مفعّلين
    return res.status(200).json({ clips: [], total: 0, message: e.message });
  }
}
