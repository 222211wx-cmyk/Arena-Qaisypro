export type CachedTurn = { from: 'user' | 'ai'; text: string; at: number };
export type PublicClip = { id: number; title: string; username: string };
export type Snapshot = { turns: CachedTurn[]; clips: PublicClip[]; citizens: { username: string }[]; updatedAt: number };
const DB = 'arena-ameeq-light-v1';
const STORE = 'owned-cache';
const empty = (): Snapshot => ({ turns: [], clips: [], citizens: [], updatedAt: Date.now() });
let generation = 0;
let queue = Promise.resolve();
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export function boundedSnapshot(value: Partial<Snapshot>): Snapshot {
  return {
    turns: (value.turns ?? []).filter(t => ['user','ai'].includes(t.from) && typeof t.text === 'string').slice(-100).map(t => ({ from: t.from, text: t.text.slice(0,4000), at: Number(t.at) || Date.now() })),
    clips: (value.clips ?? []).filter(c => Number.isSafeInteger(c.id) && typeof c.title === 'string' && typeof c.username === 'string').slice(0,20).map(c => ({ id:c.id,title:c.title.slice(0,200),username:c.username.slice(0,100) })),
    citizens: (value.citizens ?? []).filter(c => typeof c.username === 'string').slice(0,10).map(c => ({ username:c.username.slice(0,100) })),
    updatedAt: Date.now(),
  };
}
export async function loadAmeeq(userId: number): Promise<Snapshot> {
  try {
    const database = await db();
    return await new Promise((resolve,reject) => {
      const tx=database.transaction(STORE,'readonly'); const request=tx.objectStore(STORE).get(userId);
      request.onsuccess=()=>resolve(request.result ? boundedSnapshot(request.result) : empty());
      request.onerror=()=>reject(request.error); tx.oncomplete=()=>database.close();
    });
  } catch { return empty(); }
}
export function saveAmeeq(userId: number, value: Snapshot): Promise<void> {
  const current=generation;
  queue=queue.catch(()=>{}).then(async()=>{
    const database=await db();
    if(current!==generation){database.close();return;}
    await new Promise<void>((resolve,reject)=>{
      const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).put(boundedSnapshot(value),userId);
      tx.oncomplete=()=>{database.close();resolve();};tx.onerror=()=>{database.close();reject(tx.error);};
    });
  });return queue;
}
export function clearAmeeq(): Promise<void> {
  generation++;
  queue=queue.catch(()=>{}).then(async()=>{
    const database=await db();await new Promise<void>((resolve,reject)=>{
      const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();
      tx.oncomplete=()=>{database.close();resolve();};tx.onerror=()=>{database.close();reject(tx.error);};
    });
  });return queue;
}
export function languageOf(text:string): 'ar'|'fr'|'en'|'zgh' {
  if(/[\u2D30-\u2D7F]/u.test(text))return 'zgh';
  if(/[\u0600-\u06FF]/u.test(text))return 'ar';
  if(/bonjour|salut|je suis|stressé|seul|carte|où|médecin/iu.test(text))return 'fr';
  return 'en';
}
export function offlineAnswer(input:string, snapshot:Snapshot):string {
  const lang=languageOf(input);
  const label=lang==='fr'?'Hors ligne — conseils limités, pas de modèle IA.':lang==='en'?'Offline — limited guidance, no AI model.':'بلا إنترنت — إرشادات محدودة، ما كاينش نموذج ذكاء محلي.';
  if(/انتحار|نقتل راسي|suicid|kill myself/iu.test(input))return `${label}\n${lang==='en'?'If you may hurt yourself, contact local emergency services and someone you trust now. Stay with someone.':lang==='fr'?"Si vous risquez de vous faire du mal, contactez immédiatement les urgences locales et une personne de confiance. Ne restez pas seul.":'إلا كنت فخطر تأذي راسك، تواصل دابا مع الطوارئ المحلية وشي شخص كتثق فيه. ما تبقاش بوحدك.'}`;
  if(/مضغوط|معزول|قلق|stress|lonely|isolé|seul/iu.test(input))return `${label}\n${lang==='en'?'I’m here to listen. Breathe slowly if comfortable, take one small practical step, and reach out to someone you trust. This is not therapy.':lang==='fr'?"Je vous écoute. Respirez doucement si cela vous convient, choisissez une petite action et contactez une personne de confiance. Ceci ne remplace pas un accompagnement professionnel.":'أنا هنا نسمع ليك. خذ نفس بهدوء إلا كان مريح، اختار خطوة صغيرة، وتواصل مع شي شخص كتثق فيه. هادي مساعدة أولية ماشي علاج.'}`;
  if(/طب|طبيب|دواء|medical|medicine|médec/iu.test(input))return `${label}\nهذه معلومات تعليمية - استشر طبيب مختص. ${lang==='en'?'I cannot diagnose or prescribe offline.':lang==='fr'?"Je ne peux ni diagnostiquer ni prescrire hors ligne.":'ما نقدرش نشخص أو نصف دواء بلا طبيب.'}`;
  // Reuse only exact questions answered online, and mark the answer as stale.
  for(let i=snapshot.turns.length-2;i>=0;i--){
    if(snapshot.turns[i].from==='user'&&snapshot.turns[i].text.trim().toLocaleLowerCase()===input.trim().toLocaleLowerCase()&&snapshot.turns[i+1]?.from==='ai')return `${label}\n${lang==='en'?'Saved answer; facts may be outdated:':lang==='fr'?'Réponse enregistrée; les données peuvent être anciennes :':'جواب محفوظ؛ البيانات ممكن تكون قديمة:'}\n${snapshot.turns[i+1].text}`;
  }
  if(/clip|video|فيديو|كليب/iu.test(input)&&snapshot.clips.length)return `${label}\n${lang==='en'?'Saved clip metadata only; video needs a connection.':lang==='fr'?'Métadonnées enregistrées seulement; la vidéo nécessite une connexion.':'معلومات كليبسز محفوظة فقط؛ الفيديو كيحتاج الاتصال.'}\n${snapshot.clips.slice(0,5).map(c=>`${c.title} — ${c.username}`).join('\n')}`;
  return `${label}\n${lang==='en'?'You can read saved conversations here. Reconnect for new answers and live data.':lang==='fr'?"Vous pouvez lire les conversations enregistrées. Reconnectez-vous pour de nouvelles réponses et les données actuelles.":'تقدر تقرا المحادثات المحفوظة هنا. رجّع الاتصال لأجوبة جديدة وبيانات حية.'}${lang==='zgh'?'\nⵜⴰⵎⴰⵣⵉⵖⵜ: دعم أمازيغي Offline غير متوفر؛ الإرشادات بالعربية مؤقتاً.':''}`;
}
export function mapsLink(destination:string):string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination.trim().slice(0,200))}`;
}
