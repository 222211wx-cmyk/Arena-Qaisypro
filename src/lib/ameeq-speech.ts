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
export function startAmeeqSpeech(onText: (text: string) => void, onNotice: (text: string) => void, onEnd: () => void): Recognition | null {
  const browser = window as SpeechWindow;
  const Speech = browser.SpeechRecognition || browser.webkitSpeechRecognition;
  if (!Speech) {
    onNotice('التعرف الصوتي غير مدعوم في هذا المتصفح؛ جرّب Chrome أو اكتب سؤالك.'); onEnd(); return null;
  }
  const recognition = new Speech();
  recognition.lang = 'ar-MA'; recognition.continuous = false; recognition.interimResults = false;
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
