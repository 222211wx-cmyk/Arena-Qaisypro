// Start only after an explicit click. SpeechRecognition owns microphone access;
// opening a second getUserMedia stream would leave an unnecessary recording open.
export type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; abort(): void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export function startAmeeqSpeech(onText: (text: string) => void, onNotice: (text: string) => void, onEnd: () => void, language = 'ar-MA'): Recognition | null {
  const browser = window as SpeechWindow;
  const Speech = browser.SpeechRecognition || browser.webkitSpeechRecognition;
  if (!Speech) {
    onNotice('التعرف الصوتي غير مدعوم في هذا المتصفح؛ جرّب Chrome أو اكتب سؤالك.'); onEnd(); return null;
  }
  const recognition = new Speech();
  recognition.lang = language; recognition.continuous = false; recognition.interimResults = false;
  let delivered = false;
  recognition.onresult = event => {
    const text = event.results[0]?.[0]?.transcript?.trim();
    if (!text || delivered) return;
    delivered = true;
    if (text.length > 500) { onNotice('النص الصوتي تجاوز 500 حرف؛ قسّمه إلى سؤال أقصر.'); return; }
    onText(text);
  };
  recognition.onerror = event => {
    onNotice(event.error === 'not-allowed' || event.error === 'service-not-allowed'
      ? 'إذن الميكروفون مرفوض؛ فعّله من إعدادات الموقع ثم اضغط الميكروفون مجدداً.'
      : event.error === 'no-speech' ? 'ما سمعتش كلاماً؛ اضغط الميكروفون وعاود.'
      : 'تعذر التعرف الصوتي؛ تحقق من الاتصال والميكروفون أو استعمل الكتابة.');
    onEnd();
  };
  recognition.onend = onEnd;
  try { recognition.start(); return recognition; }
  catch { onNotice('تعذر بدء الميكروفون؛ استعمل الكتابة أو عاود المحاولة.'); onEnd(); return null; }
}

export function speechLocale(text: string, preferred = 'ar-MA'): string {
  if (/[\u2d30-\u2d7f]|أزول|ازول|تانميرت|\bazul\b|\btanmm?irt\b/iu.test(text)) return 'zgh-MA';
  if (/[\u0600-\u06ff]/u.test(text)) return 'ar-MA';
  if (/\b(bonjour|merci|bienvenue|votre|ensemble|étape|je suis)\b/iu.test(text)) return 'fr-FR';
  if (/\b(hello|welcome|your|together|guide|tell|the)\b/iu.test(text)) return 'en-US';
  return preferred;
}
export function speakAmeeq(text: string, preferred: string, notice: (text:string)=>void, active:(value:boolean)=>void) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    notice('الصوت غير مدعوم فهاد الجهاز؛ الجواب الكتابي متاح.');return;
  }
  let locale=speechLocale(text,preferred);
  const voices=window.speechSynthesis.getVoices();
  const prefix=locale.split('-')[0];
  let voice=voices.find(v=>v.lang.toLowerCase()===locale.toLowerCase()) || voices.find(v=>v.lang.toLowerCase().startsWith(prefix));
  if(prefix==='zgh'&&!voice) {
    if(preferred.startsWith('zgh')) {notice('ما كاينش صوت أمازيغي فهاد الجهاز؛ التحية مكتوبة. اختار قراءة عربية أو فرنسية من قائمة لغة الصوت.');return;}
    locale=preferred;voice=voices.find(v=>v.lang.toLowerCase().startsWith(preferred.split('-')[0]));
    notice('ما كاينش صوت أمازيغي فهاد الجهاز؛ هادي قراءة تقريبية باللغة المختارة، ماشي نطق أمازيغي مضمون.');
  }
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);
  if(voice)utterance.voice=voice;
  utterance.lang=voice?.lang||locale;utterance.rate=locale.startsWith('ar')?.9:1;utterance.pitch=1;utterance.volume=1;
  utterance.onstart=()=>active(true);utterance.onend=()=>active(false);
  utterance.onerror=()=>{active(false);notice('تعذر تشغيل الصوت؛ اضغط استمع مجدداً أو اختار صوتاً متوفراً على جهازك.');};
  window.speechSynthesis.speak(utterance);
}
