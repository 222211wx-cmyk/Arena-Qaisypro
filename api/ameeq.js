import pg from 'pg';

const IDENTITY = 'Ameeq AI EMP-001 الحاكم الخارجي السيادي - رئيس مجلس الذكاء الإمبراطوري';
const DEPARTMENTS = 'Compétitions - Social - Business Win-Win - Éducation - Archon DNA - Stream & Live';
const FORBIDDEN = /غير متاح/u;

// These are reference values supplied by the owner, never presented as live data.
export function localReply(userMsg, citoyens, clips, countsVerified) {
  const msg = userMsg.toLowerCase();
  const pulse = countsVerified
    ? `عندنا ${citoyens} مواطن و ${clips} كليب`
    : 'نواصل بالإرشاد المحلي؛ الأعداد الحية تحتاج تحقق من قاعدة البيانات';
  if (!userMsg) return `أنا ${IDENTITY} - تابع لـ Arena Qaisypro - المنصة الأم الأصلية | ${pulse} | كيف نقدر نعاونك فالمنصة؟ - EMPIRE ETERNAL`;
  if (/شكون|من انت|من أنت|نتا|who are you/iu.test(msg)) {
    return `أنا ${IDENTITY} - Arena Qaisypro | كنرشدك فـ 6 أقسام: ${DEPARTMENTS} | ${pulse} | GDNA AI قلب الإمبراطورية النابض - EMPIRE ETERNAL`;
  }
  if (/مساعدة|عاون|كيف|help/iu.test(msg)) {
    return `أقدر نعاونك فـ Arena Qaisypro: 1) الأقسام - ${DEPARTMENTS} 2) نبض الإمبراطورية - ${pulse} 3) GDNA AI - منصة تنسيق المواطن 4) المركز الرقمي - قاعة العرش - مصهر العقل - الزمن الرقمي | قوليا شنو بغيتي بالضبط؟ أنا مرشد لفك الضغط والعزلة؛ نقدر نقترح خطوة عملية.`;
  }
  // Do not echo the retired failure message, even if the question quotes it.
  const subject = userMsg.replace(/غير متاح/gu, 'الرد المحلي');
  return `استقبلت: "${subject}" | أنا ${IDENTITY} - Arena Qaisypro | ${pulse} | نقدر نعاونك نرتب هاد الموضوع: حدد الهدف، المعطيات اللي عندك، والخطوة اللي بغيتي تنفذ. شنو النتيجة اللي باغي توصل ليها؟ - EMPIRE ETERNAL`;
}

function providerConfig(env) {
  const base = env.AI_INTEGRA_AI_BASE_URL || env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const key = env.AI_INTEGRA_API_KEY || env.AI_INTEGRATIONS_OPENAI_API_KEY || env.OPENAI_API_KEY;
  if (!base || !key) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/v1$/, '') + '/v1/chat/completions';
    return { url: url.toString(), key };
  } catch { return null; }
}

export function createAmeeqLocal({ pool, env = process.env, fetchImpl = globalThis.fetch }) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method && req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
    if (req.headers?.origin) {
      try {
        if (new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({ error: 'Forbidden origin' });
      } catch { return res.status(403).json({ error: 'Forbidden origin' }); }
    }
    const raw = req.body?.message || req.body?.question || req.body?.command || '';
    if (typeof raw !== 'string' || raw.length > 500) return res.status(400).json({ error: 'كتب سؤالاً بحد أقصى 500 حرف.' });
    const userMsg = raw.trim();
    let citoyens = 44, clips = 8, countsVerified = false;
    try {
      // Read-only query only: no startup DDL, cleanup, seed, or R2 writes.
      const result = await pool.query({
        text: 'SELECT (SELECT COUNT(*)::int FROM users) AS citizens, (SELECT COUNT(*)::int FROM clips) AS clips',
        query_timeout: 2500,
      });
      const row = result.rows[0];
      if (Number.isSafeInteger(Number(row?.citizens)) && Number.isSafeInteger(Number(row?.clips)) && row.citizens != null && row.clips != null) {
        citoyens = Number(row.citizens); clips = Number(row.clips); countsVerified = true;
      }
    } catch { /* Keep the local answer working without exposing connection errors. */ }

    let reply = localReply(userMsg, citoyens, clips, countsVerified);
    let source = 'ameeq-imperial-local-smart';
    const provider = providerConfig(env);
    if (provider && userMsg) {
      try {
        const aiRes = await fetchImpl(provider.url, {
          method: 'POST', signal: AbortSignal.timeout(4000),
          headers: { Authorization: `Bearer ${provider.key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 700, messages: [
            { role: 'system', content: `You are ${IDENTITY}, the application persona of Arena Qaisypro. Help with ${DEPARTMENTS}. Be useful and honest; never claim real-world control or actions you have not performed. ${countsVerified ? `Verified counts: ${citoyens} citizens, ${clips} clips.` : 'Live counts have not been verified; do not invent numbers.'} Answer in the user language. Do not use the phrase "غير متاح"; offer practical help instead.` },
            { role: 'user', content: userMsg },
          ] }),
        });
        if (aiRes.ok) {
          const data = await aiRes.json();
          const content = data.choices?.[0]?.message?.content;
          if (typeof content === 'string' && content.trim() && !FORBIDDEN.test(content)) {
            reply = content.trim() + ' | EMPIRE ETERNAL';
            source = 'ameeq-imperial-external-ai';
          }
        }
      } catch { /* Provider failure or timeout keeps the already prepared local answer. */ }
    }
    return res.status(200).json({
      reply, response: reply, citoyens, clips, countsVerified, source,
      ruler: IDENTITY, owner: 'Arena Qaisypro', employee: 'Ameeq AI',
      empireNote: false, signature: 'EMP-001 - Arena Qaisypro',
    });
  };
}

let handler;
export default function ameeq(req, res) {
  handler ??= createAmeeqLocal({ pool: new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 2500,
  }) });
  return handler(req, res);
}
