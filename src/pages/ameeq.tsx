/**
 * Ameeq — الواجهة المستقلة ديال الموظف الحكومي EMP-001
 * Standalone RTL chat page at /ameeq
 */
import { useEffect, useRef, useState } from "react";
import { api } from "@/components/social/social-i18n";
import { subscribeAccountChanges } from "@/lib/account-session-events";
import { useAuth } from "@/contexts/AuthContext";
import { boundedSnapshot, clearAmeeq, languageOf, loadAmeeq, mapsLink, offlineAnswer, saveAmeeq, type Snapshot } from "@/lib/ameeq-light";
import { useLang } from "@/contexts/LangContext";

import { startAmeeqSpeech, type Recognition } from '@/lib/ameeq-speech';

const DEPARTMENTS = [
  ['Compétitions', '/games'], ['Social', '/social'], ['Business', '/market'],
  ['Éducation', '/learn'], ['Archon DNA', '/genome'], ['Stream & Live', '/clips'],
] as const;
const TOOLS = [['نبض', '/pulse'], ['GDNA AI', '/chat'], ['المركز الرقمي', '/hub'], ['النواة العصبية', '/neural-core']] as const;
const appLink = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;

const EMPLOYEE_NAME = "Ameeq AI";
const OWNER = "Arena Qaisypro";
const EMPLOYEE_ID = "EMP-001";

type Msg = {
  from: "user" | "ai";
  text: string;
  empireNote?: boolean;
  ownerDomain?: string;
  signature?: string;
};

type CouncilReport = {
  id: number;
  headline: string;
  report: {
    state_of_empire?: string;
    predictions?: string[];
    research?: string[];
    directives?: string[];
  };
  created_at: string;
};

export default function AmeeqPage() {
  const { lang } = useLang();
  const { user, loading } = useAuth();
  const [online,setOnline] = useState(navigator.onLine);
  const [cacheEnabled,setCacheEnabled] = useState(false);
  const [cacheNotice,setCacheNotice] = useState("");
  const [destination,setDestination] = useState("");
  const [toolsOpen,setToolsOpen] = useState(false);
  const [snapshot,setSnapshot] = useState<Snapshot>({turns:[],clips:[],citizens:[],updatedAt:Date.now()});
  const cacheOwner=useRef<number|null>(null);
  const requestEpoch=useRef(0);
  const identity=useRef<number|null>(user?.id ?? null);
  identity.current=user?.id ?? null;
  const copy = lang === "fr" ? { greeting: "Bonjour. Posez-moi n'importe quelle question.", placeholder: "Écrivez votre commande ici...", send: "Envoyer", typing: "écrit…" } : lang === "es" ? { greeting: "Hola. Pregúntame lo que quieras.", placeholder: "Escribe tu orden aquí...", send: "Enviar", typing: "está escribiendo…" } : lang === "de" ? { greeting: "Hallo. Frag mich, was du möchtest.", placeholder: "Gib hier deinen Auftrag ein…", send: "Senden", typing: "schreibt gerade…" } : lang === "en" ? { greeting: "Hello. Ask me anything.", placeholder: "Write your command here...", send: "Send", typing: "is typing…" } : { greeting: "مرحبا. اسألني أي شيء.", placeholder: "اكتب أمرك هنا...", send: "إرسال", typing: "كيكتب…" };
  const de = (fallback: string, german: string) => lang === "de" ? german : fallback;
  const [messages, setMessages] = useState<Msg[]>([
     { from: "ai", text: copy.greeting },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<CouncilReport | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [mobileTools, setMobileTools] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const busyRef = useRef(false);
  const [toolResults, setToolResults] = useState<{kind:'clips'|'citizens'; items:{id:number;title?:string;username:string}[]} | null>(null);
  const [toolNotice, setToolNotice] = useState('');
  const toolRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { recognitionRef.current?.abort(); toolRequest.current?.abort(); }, []);
  async function showTool(kind:'clips'|'citizens') {
    toolRequest.current?.abort();
    const controller = new AbortController(); toolRequest.current=controller;
    setToolResults(null); setToolNotice('جار تحميل البيانات الحية…');
    try {
      const response=await fetch(api(kind==='clips'?'/api/clips/feed?limit=20':'/api/citizens?sort=xp&limit=50'),{credentials:'include',signal:controller.signal});
      if(!response.ok)throw new Error('tool');
      const data=await response.json();
      const rows=kind==='clips'?data.clips:data.citizens;
      if(!Array.isArray(rows))throw new Error('shape');
      setToolResults({kind,items:rows.slice(0,kind==='clips'?20:50).map(row=>({id:row.id,title:row.title,username:row.username}))});
      setToolNotice(kind==='clips'?'معلومات حتى 20 كليب؛ فتح الفيديو يحتاج اتصالاً.':'المواطنون من الدليل العام؛ لا نثبت عدد الحسابات مسبقاً.');
    }catch { if(!controller.signal.aborted)setToolNotice('تعذر تحميل الدليل الآن؛ جرّب الرابط المباشر أو عاود المحاولة.'); }
  }
  function startMic() {
    if(listening){recognitionRef.current?.abort();setListening(false);return;}
    if(busyRef.current)return;
    setListening(true);
    recognitionRef.current=startAmeeqSpeech(text=>{setInput(text);void sendCommand(text);},setCacheNotice,()=>setListening(false));
  }
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const update=()=>setOnline(navigator.onLine);
    window.addEventListener('online',update);window.addEventListener('offline',update);
    return ()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};
  },[]);
  useEffect(()=>{
    if(loading)return;
    let active=true;
    let stored:number|null=null;
    try{const value=Number(localStorage.getItem('ameeq-offline-owner'));if(Number.isSafeInteger(value)&&value>0)stored=value;}catch{}
    if(user&&stored!==null&&stored!==user.id){void clearAmeeq().catch(()=>{});try{localStorage.removeItem('ameeq-offline-owner');}catch{}stored=null;}
    const owner=user?.id ?? (!navigator.onLine ? stored : null);
    cacheOwner.current=owner;
    setCacheEnabled(owner!==null&&stored===owner);
    if(owner&&stored===owner)void loadAmeeq(owner).then(value=>{if(active){setSnapshot(value);setMessages(value.turns.length?value.turns:[{from:'ai',text:copy.greeting}]);}});
    else{setSnapshot({turns:[],clips:[],citizens:[],updatedAt:Date.now()});setMessages([{from:'ai',text:copy.greeting}]);}
    return ()=>{active=false;};
  },[user?.id,loading]);
  useEffect(()=>subscribeAccountChanges(()=>{
    recognitionRef.current?.abort(); toolRequest.current?.abort(); setToolResults(null); setToolNotice('');
    requestEpoch.current++;cacheOwner.current=null;setCacheEnabled(false);setMessages([{from:'ai',text:copy.greeting}]);
    setSnapshot({turns:[],clips:[],citizens:[],updatedAt:Date.now()});
    try{localStorage.removeItem('ameeq-offline-owner');}catch{}
    void clearAmeeq().catch(()=>{});
  }),[]);
  async function enableCache(){
    if(!user)return;
    try{
      localStorage.setItem('ameeq-offline-owner',String(user.id));cacheOwner.current=user.id;setCacheEnabled(true);
      const registration=await navigator.serviceWorker?.register(`${import.meta.env.BASE_URL}ameeq-offline-sw.js`,{scope:`${import.meta.env.BASE_URL}ameeq`});
      if(registration){ /* The worker takes control on the next visit. */ }
      setCacheNotice('الحفظ مفعّل. للاستعمال بلا إنترنت افتح الصفحة مرة أخرى وأنت متصل. البيانات محفوظة على هذا الجهاز؛ امسحها قبل مشاركته.');
    }catch{setCacheNotice('تعذر تجهيز Offline بالكامل؛ قد يمنع المتصفح التخزين أو Service Worker.');}
  }
  async function forgetCache(){
    cacheOwner.current=null;setCacheEnabled(false);setSnapshot({turns:[],clips:[],citizens:[],updatedAt:Date.now()});setMessages([{from:'ai',text:copy.greeting}]);
    try{localStorage.removeItem('ameeq-offline-owner');await clearAmeeq();setCacheNotice('تم مسح المحفوظ المحلي.');}catch{setCacheNotice('تعذر مسح التخزين؛ امسح بيانات الموقع من المتصفح.');}
  }
  function persist(turns:Snapshot['turns'],clips=snapshot.clips,citizens=snapshot.citizens){
    const owner=cacheOwner.current;if(!cacheEnabled||!owner)return;
    const next=boundedSnapshot({turns,clips,citizens});setSnapshot(next);
    void saveAmeeq(owner,next).catch(()=>setCacheNotice('تعذر حفظ المحادثة محلياً.'));
  }
  useEffect(()=>{
    if(!online||!cacheEnabled||!user)return;
    const owner=user.id;const controller=new AbortController();
    void fetch(api('/api/clips/feed?limit=20'),{credentials:'include',signal:controller.signal}).then(async r=>{
      if(!r.ok)return;const data=await r.json();if(identity.current!==owner||cacheOwner.current!==owner)return;
      const clips=Array.isArray(data.clips)?data.clips.map((c:any)=>({id:c.id,title:c.title,username:c.username})):[];
      const citizens=[...new Set<string>(clips.map((c:any)=>c.username).filter((x:any)=>typeof x==='string'))].slice(0,10).map(username=>({username}));
      setSnapshot(previous=>{const next=boundedSnapshot({...previous,clips,citizens});void saveAmeeq(owner,next).catch(()=>{});return next;});
    }).catch(()=>{});return()=>controller.abort();
  },[online,cacheEnabled,user?.id]);
  function speak(text:string){
    if(!('speechSynthesis' in window)){setCacheNotice('الصوت غير مدعوم فهاد الجهاز؛ الجواب الكتابي متاح.');return;}
    const locale=languageOf(text);const voices=speechSynthesis.getVoices();
    const voice=voices.find(v=>v.lang.toLowerCase().startsWith(locale));
    if(!voice){setCacheNotice('ما لقيتش صوت مناسب لهاد اللغة فالجهاز؛ استعمل الجواب الكتابي.');return;}
    speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;speechSynthesis.speak(utterance);
  }
  useEffect(() => {
    fetch(api("/api/governor/council-reports"), { credentials: "include" })
      .then(r => (r.ok ? r.json() : { reports: [] }))
      .then((d: { reports: CouncilReport[] }) => setReport(d.reports?.[0] ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendCommand(spoken?: string) {
    const cmd = (spoken ?? input).trim();
    if (!cmd || busyRef.current) return;
    busyRef.current=true;
    if(/خريط|فين|maps?|carte|where.*Arena/iu.test(cmd))setToolsOpen(true);
    setMessages((m) => [...m, { from: "user", text: cmd }]);
    setInput("");
    setBusy(true);
    const ownerAtStart=identity.current;
    const epochAtStart=requestEpoch.current;
    if(!navigator.onLine){
      const answer=offlineAnswer(cmd,snapshot);const at=Date.now();
      setMessages(m=>[...m,{from:'ai',text:answer}]);persist([...snapshot.turns,{from:'user',text:cmd,at},{from:'ai',text:answer,at}]);setBusy(false);busyRef.current=false;return;
    }
    try {
      const res = await fetch(api("/api/ameeq"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      if(identity.current!==ownerAtStart||requestEpoch.current!==epochAtStart)return;
      if (!res.ok) {
        setMessages((m) => [...m, { from: "ai", text: `⚠️ ${data.error ?? de("وقع مشكل. عاود من بعد.", "Etwas ist schiefgelaufen. Bitte versuche es später erneut.")}` }]);
        return;
      }
      const at=Date.now();
      persist([...snapshot.turns,{from:'user',text:cmd,at},{from:'ai',text:data.response ?? '…',at}]);
      setMessages((m) => [
        ...m,
        {
          from: "ai",
          text: data.response ?? "…",
          empireNote: Boolean(data.empireNote),
          ownerDomain: data.ownerDomain,
          signature: data.signature,
        },
      ]);
    } catch {
      if(identity.current!==ownerAtStart||requestEpoch.current!==epochAtStart)return;
      if(!navigator.onLine){const answer=offlineAnswer(cmd,snapshot);setMessages(m=>[...m,{from:'ai',text:answer}]);return;}
      setMessages((m) => [...m, { from: "ai", text: de("⚠️ الموظف مشغول حالياً. عاود من بعد.", "⚠️ Der Mitarbeiter ist gerade beschäftigt. Bitte versuche es später erneut.") }]);
    } finally {
      setBusy(false);busyRef.current=false;
    }
  }

  return (
    <div className={`main-empire ${mobileTools?'tools-open':''}`}>
      <aside className="empire-sections" dir={lang === 'ar' ? 'rtl' : 'ltr'} aria-label="الأقسام الستة">
        <h2>أقسام Arena Qaisypro</h2>
        {DEPARTMENTS.map(([label,path])=><a key={path} href={appLink(path)}>{label} ↗</a>)}
        <hr />
        {TOOLS.map(([label,path])=><a key={path} href={appLink(path)}>{label} ↗</a>)}
        <a href={appLink('/citizens')}>دليل المواطنين</a>
      </aside>
      <section className="ameeq-tools" dir={lang === 'ar' ? 'rtl' : 'ltr'} aria-label="Ameeq capabilities">
        <strong>{online?'متصل — رد محلي مع AI اختياري':'Offline — محفوظ وإرشادات فقط، بلا نموذج'}</strong>
        <h2>أدوات المواطن</h2>
        <div className="mobile-sections">{[...DEPARTMENTS,...TOOLS].map(([label,path])=><a key={path} href={appLink(path)}>{label} ↗</a>)}</div>
        <button id="clip-btn" className="btn-imperial" onClick={()=>void showTool('clips')}>الكليبسز — معلومات حتى 20</button>
        <button id="citoyens-btn" className="btn-imperial" onClick={()=>void showTool('citizens')}>المواطنون — الدليل الحي</button>
        <a href={appLink('/clips')}>فتح الكليبسز</a> · <a href={appLink('/citizens')}>فتح دليل المواطنين</a>
        {toolNotice&&<p role="status">{toolNotice}</p>}
        {toolResults&&<ul className="ameeq-tool-results">{toolResults.items.map(item=><li key={item.id}><a href={appLink(toolResults.kind==='clips'?`/clips/${item.id}`:`/u/${encodeURIComponent(item.username)}`)}>{item.title||item.username}</a></li>)}</ul>}
        <p>حفظ اختياري على هذا الجهاز: آخر 50 سؤالاً وجواباً (100 رسالة كحد أقصى)، 20 كليب (معلومات فقط)، و10 أسماء عامة من أصحاب الكليبسز. ليس فيديوهات أو رسائل خاصة.</p>
        {user&&!cacheEnabled&&<button id="offline-btn" className="btn-imperial" onClick={enableCache}>أوافق على الحفظ المحلي وتجهيز Offline</button>}
        {cacheEnabled&&<button id="offline-btn" className="btn-imperial" onClick={forgetCache}>مسح المحفوظ المحلي</button>}
        {!user&&!cacheEnabled&&<span>سجّل الدخول لتفعيل حفظ معزول لحسابك.</span>}
        {cacheNotice&&<p role="status">{cacheNotice}</p>}
        <details open={toolsOpen} onToggle={e=>setToolsOpen(e.currentTarget.open)}><summary>الخريطة والصوت والمكالمات</summary>
          <p>فين بغيتي نوريك فالخريطة؟ الرشيدية نقطة عامة مؤقتة، ماشي عنوان مقر مؤكد.</p>
          <input aria-label="المكان على الخريطة" value={destination} onChange={e=>setDestination(e.target.value)} placeholder="اكتب المكان" />
          <a href={mapsLink(destination||'31.9310,-4.4250')} target="_blank" rel="noopener noreferrer">{destination?'فتح المكان في Google Maps':'فتح النقطة العامة للرشيدية'}</a>
          <button onClick={()=>speak(destination?`المكان المطلوب: ${destination}`:'نقطة عامة مؤقتة للرشيدية، ليست عنواناً مؤكداً للمنصة.')}>قراءة وصف المكان بصوت الجهاز</button>
          <p>Google Maps يحتاج اتصالاً؛ توجيه الملاحة الصوتي تابع لتطبيق Maps، وليس مفعلاً تلقائياً هنا.</p>
          <a href={`${import.meta.env.BASE_URL}messages.call`}>فتح واجهة الرسائل والمكالمات الموجودة</a>
          <p>لا تبدأ مكالمة ولا ميكروفون تلقائياً. Firebase وAgora وExpo حسب إعدادات الخدمة والصلاحيات؛ بلا ادعاء تبديل الشبكات عند انقطاع الإنترنت.</p>
        </details>
      </section>
      <div className="ameeq-panel" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
      <header className="ameeq-title">
        <div><h1>👑 {EMPLOYEE_NAME} <small>{EMPLOYEE_ID}</small></h1><p>{OWNER} — رئيس مجلس الذكاء الإمبراطوري</p></div>
        <button className="btn-imperial ameeq-mobile-tools" aria-expanded={mobileTools} onClick={()=>setMobileTools(v=>!v)}>الأدوات والأقسام</button>
      </header>
      <p className="px-3 text-xs" role="status">{cacheNotice}</p>
      {report && (
        <div style={{ background: "#0f0d05", borderBottom: "1px solid #33280a", padding: "10px 16px" }}>
          <button onClick={() => setShowReport(s => !s)}
            style={{ background: "none", border: "none", color: "hsl(var(--primary))", cursor: "pointer",
              fontWeight: 700, fontSize: 13, width: "100%", textAlign: "right", padding: 0 }}>
             🏛️ {de("تقرير المجلس الإمبراطوري:", "Bericht des Imperialen Rats:")} {report.headline} {showReport ? "▲" : "▼"}
          </button>
          {showReport && (
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.8, color: "hsl(var(--muted-foreground))" }}>
              {report.report.state_of_empire && <p style={{ margin: "0 0 8px" }}>{report.report.state_of_empire}</p>}
              {!!report.report.predictions?.length && (
                 <div><b style={{ color: "hsl(var(--primary))" }}>🔮 {de("التنبؤات:", "Prognosen:")}</b>
                  <ul style={{ margin: "4px 0 8px", paddingRight: 18 }}>
                    {report.report.predictions.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
              )}
              {!!report.report.research?.length && (
                 <div><b style={{ color: "hsl(var(--primary))" }}>🔬 {de("البحوث الجماعية:", "Gemeinsame Forschung:")}</b>
                  <ul style={{ margin: "4px 0 8px", paddingRight: 18 }}>
                    {report.report.research.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
              )}
              {!!report.report.directives?.length && (
                 <div><b style={{ color: "hsl(var(--primary))" }}>⚔️ {de("التوجيهات نحو الريادة:", "Leitlinien für die Führungsrolle:")}</b>
                  <ul style={{ margin: "4px 0 0", paddingRight: 18 }}>
                    {report.report.directives.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
              )}
            </div>
          )}
        </div>
      )}

      <div ref={chatRef} role="log" aria-label="محادثة Ameeq" aria-live="polite" style={{ flex: 1, minHeight:0, overflowY: "auto", padding: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            margin: "10px 0", padding: "12px 18px", borderRadius: 12, maxWidth: "80%",
            whiteSpace: "pre-wrap",
            ...(msg.from === "user"
              ? { background: "hsl(var(--muted))", marginLeft: "auto" }
              : { background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }),
          }}>
            {msg.from === 'ai' && <button aria-label={`قراءة الجواب ${i+1}`} onClick={()=>speak(msg.text)}>🔊</button>}
            {msg.from === "ai" && msg.signature ? (
              <>
                <b>{EMPLOYEE_NAME}</b>
                <hr style={{ borderColor: "hsl(var(--border))" }} />
                <div>{msg.text}</div>
                {msg.empireNote && msg.ownerDomain && (
                  <div style={{ marginTop: 10 }}>
                     🏛️ <b>{de("ملاحظة رسمية:", "Offizieller Hinweis:")}</b> {de("هذا الأمر يخص", "Dieser Auftrag betrifft")} {OWNER}.
                    <br />
                     {de("للوصول:", "Zugriff:")}{" "}
                    <a href={`https://${msg.ownerDomain}`} target="_blank" rel="noreferrer" style={{ color: "hsl(var(--primary))" }}>
                      {msg.ownerDomain}
                    </a>
                  </div>
                )}
                <hr style={{ borderColor: "hsl(var(--border))" }} />
                <i style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{msg.signature}</i>
              </>
            ) : (
              msg.text
            )}
          </div>
        ))}
        {busy && (
          <div style={{ margin: "10px 0", padding: "12px 18px", borderRadius: 12, maxWidth: "80%", background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
            ⏳ {EMPLOYEE_NAME} {copy.typing}
          </div>
        )}
      </div>

      <footer className="ameeq-composer">
        <input id="ameeq-input" aria-label="سؤال Ameeq" value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing)void sendCommand();}}
          placeholder={copy.placeholder} maxLength={500} />
        <button id="send-btn" className="btn-imperial" onClick={()=>void sendCommand()} disabled={busy||!input.trim()}>{copy.send}</button>
        <button id="mic-btn" className="btn-imperial" aria-pressed={listening} disabled={busy} onClick={startMic}>{listening?'⏹ إيقاف':'🎤 ميكروفون'}</button>
        <span className="text-xs w-full">بالضغط على الميكروفون توافق على خدمة التعرف الصوتي للمتصفح، وقد تعالج الصوت عبر الإنترنت؛ النص يُرسل لـAmeeq.</span>
      </footer>
      </div>
    </div>
  );
}
