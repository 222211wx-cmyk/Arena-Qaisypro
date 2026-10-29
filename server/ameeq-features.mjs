export function detectDialect(text) {
  if (/[\u2d30-\u2d7f]|أزول|ازول|تانميرت|أمازيغ|\bazul\b|\btanmm?irt\b|\btamazight\b/iu.test(text)) return 'tzm';
  if (/لاباس|واخا|ديال|بزاف/iu.test(text)) return 'ary';
  if (/[\u0600-\u06ff]/u.test(text)) return 'ar-MA';
  if (/\b(bonjour|merci|salut|carte|français|bien)\b/iu.test(text)) return 'fr';
  return 'en';
}
export const positivity = {
  'ar-MA': 'الله يعطيك الصحة — خطوة بخطوة، Ameeq معاك.',
  ary: 'بشوية بشوية — راك منور Arena Qaisypro.',
  tzm: 'ⴰⵣⵓⵍ - ⵜⴰⵏⵎⵎⵉⵔⵜ · أزول - تانميرت · Azul - Tanmmirt',
  fr: 'Bienvenue à Arena Qaisypro — avançons ensemble, une étape à la fois.',
  en: 'Welcome to Arena Qaisypro — let’s take one positive step together.',
};
export function localizedReply(input, original) {
  const dialect = detectDialect(input);
  if (dialect === 'tzm') return `ⴰⵣⵓⵍ - ⵜⴰⵏⵎⵎⵉⵔⵜ\nأزول! أنا Ameeq EMP-001. Azul! Ameeq EMP-001.\nنقدر نعاونك فـ Arena Qaisypro. الدعم الأمازيغي المحلي حالياً تحيات محدودة؛ اختار العربية أو الفرنسية أو الإنجليزية للتفاصيل.`;
  if (dialect === 'fr') return `Je suis Ameeq EMP-001, votre guide Arena Qaisypro. Je peux vous orienter vers les compétitions, le social, le marché, l’éducation, Archon DNA et les clips. Précisez votre objectif ou le lieu recherché.`;
  if (dialect === 'en') return `I’m Ameeq EMP-001, your Arena Qaisypro guide. I can help you navigate competitions, social, business, education, Archon DNA and clips. Tell me your goal or the place you want to find.`;
  return original;
}
export async function mapForRequest(input, requestedLocation, env, fetchImpl) {
  if (!/خريط|فين|أين|\bmaps?\b|\bcarte\b/iu.test(input) && !requestedLocation) return null;
  const supplied = typeof requestedLocation === 'string' ? requestedLocation.trim().slice(0,160) : '';
  const extracted = input.replace(/^(?:(?:أرسل|ارسل|عرض|show|send|خريطة|map|carte|فين|أين|de|of|لي|لـ|:)\s*)+/iu,'').trim().slice(0,160);
  const location = supplied || (/^(?:خريطة|map|carte)$/iu.test(input.trim()) ? '' : extracted);
  const label = location || '31.9310,-4.4250';
  const coordinate = label.match(/^(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)$/);
  const validCoords = coordinate && Math.abs(Number(coordinate[1]))<=90 && Math.abs(Number(coordinate[2]))<=180;
  const map = { location: label, searchUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`, imageUrl:null, attribution:'', notice:location?'':'نقطة عامة مؤقتة للرشيدية، ليست عنوان مقر Arena Qaisypro.' };
  const key = env.GOOGLE_MAPS_API_KEY || env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (key) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
      for (const [name,value] of Object.entries({center:label,zoom:'14',size:'600x400',markers:`color:red|${label}`,key})) url.searchParams.set(name,value);
      const response = await fetchImpl(url,{signal:AbortSignal.timeout(3500)});
      if (response.ok && /^image\/(png|jpeg)/i.test(response.headers.get('content-type')||'')) {
        const bytes=Buffer.from(await response.arrayBuffer());
        if(bytes.length && bytes.length<=1500000) { map.imageUrl=`data:${response.headers.get('content-type').split(';')[0]};base64,${bytes.toString('base64')}`;map.attribution='Google Maps';return map; }
      }
    } catch { /* Never return the key, upstream URL, or provider error. */ }
  }
  if (validCoords) {
    const coords=`${Number(coordinate[1])},${Number(coordinate[2])}`;
    map.imageUrl=`https://staticmap.openstreetmap.de/staticmap.php?center=${encodeURIComponent(coords)}&zoom=14&size=600x400&markers=${encodeURIComponent(coords)},red`;
    map.attribution='© OpenStreetMap contributors';
  } else map.notice='افتح البحث في Google Maps لتحديد المكان، أو أرسل إحداثيات latitude,longitude لعرض صورة بلا مفتاح Google.';
  return map;
}
