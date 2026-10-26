import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { sharedCopy, sharedLocale } from "@/i18n/shared-components-copy";

type HistoryItem = { topic: string; reply: string; date: string };

function readHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem("ameeq_history") || "[]") as HistoryItem[];
  } catch {
    return [];
  }
}

// حفظ التاريخ — آخر 10 استشارات فقط
function saveToHistory(topic: string, reply: string): HistoryItem[] {
  try {
    const history = readHistory();
    history.unshift({ topic, reply, date: new Date().toISOString() });
    const trimmed = history.slice(0, 10);
    localStorage.setItem("ameeq_history", JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return [];
  }
}

function speak(text: string, lang: string) {
  try {
    speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = sharedLocale(lang);
    speechSynthesis.speak(speech);
  } catch { /* speech unsupported — ignore */ }
}

export default function RoyalPalace() {
  const { user } = useAuth();
  const { lang } = useLang();
  const rt = sharedCopy(lang).royal;
  const topics = (["plan", "motivation", "progress", "problem"] as const).map(id => ({ id, label: rt[id] }));
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [activeTopic, setActiveTopic] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [listening, setListening] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => { setHistory(readHistory()); }, []);

  if (!user) return null;

  const consultGovernor = async (topic: { id: string; label: string }) => {
    setLoadingId(topic.id);
    setActiveTopic(topic.label);
    setAnswer("");
    setError("");
    try {
      const res = await fetch("/api/governor/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic: topic.label, lang }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error ?? rt.failed);
      setAnswer(data.reply);
      setHistory(saveToHistory(topic.label, data.reply));
      speak(data.reply, lang);
    } catch {
      setError(rt.busy);
    } finally {
      setLoadingId(null);
    }
  };

  // 🎙️ استشارة صوتية — تكلم مع الحاكم
  const startVoiceConsult = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError(rt.speechUnsupported);
      return;
    }
    const rec = new SR();
    rec.lang = sharedLocale(lang);
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    setError("");
    rec.onresult = async (e: any) => {
      const transcript: string = e.results[0][0].transcript;
      setListening(false);
      setLoadingId("voice");
      setActiveTopic(`🎙️ ${transcript}`);
      setAnswer("");
      try {
        const res = await fetch("/api/governor/consult", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ question: transcript.slice(0, 300), lang }),
        });
        const data = (await res.json()) as { reply?: string; error?: string };
        if (!res.ok || !data.reply) throw new Error(data.error ?? rt.failed);
        setAnswer(data.reply);
        setHistory(saveToHistory(`🎙️ ${transcript}`, data.reply));
        speak(data.reply, lang);
      } catch {
        setError(rt.busy);
      } finally {
        setLoadingId(null);
      }
    };
    rec.onerror = () => { setListening(false); setError(rt.notHeard); };
    rec.onend = () => setListening(false);
    rec.start();
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="palace rounded-[15px] p-5 mt-5 space-y-4"
      style={{ background: "hsl(var(--card))", border: "2px solid hsl(var(--primary))" }}>
      <h3 className="flex items-center justify-center gap-2 font-black text-lg md:text-xl text-center"
        style={{ color: "hsl(var(--primary))", fontFamily: "'Orbitron', 'Inter', sans-serif" }}>
        <Crown className="w-5 h-5" />
        🏛️ {rt.title}
      </h3>

      <div className="flex flex-wrap justify-center">
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => consultGovernor(topic)}
            disabled={loadingId !== null}
            className="royal-btn text-white font-bold text-sm rounded-[10px] p-3 m-1 w-[48%] disabled:opacity-50"
            style={{ background: "linear-gradient(90deg, hsl(var(--primary)), #ffc107)", border: "none", color: "#000" }}
          >
            {loadingId === topic.id ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> {topic.label}
              </span>
            ) : (
              topic.label
            )}
          </button>
        ))}
      </div>

      {/* 🎙️ زر الاستشارة الصوتية */}
      <div style={{ textAlign: "center", marginTop: 15 }}>
        <button
          id="micBtn"
          onClick={startVoiceConsult}
          disabled={loadingId !== null || listening}
          className="text-2xl rounded-full w-14 h-14 transition-all duration-300 disabled:opacity-50"
          style={{
            background: listening ? "hsl(var(--primary))" : "#1e293b",
            border: "2px solid hsl(var(--primary))",
            boxShadow: listening ? "0 0 15px hsl(var(--primary))" : "none",
          }}
          title={rt.speak} aria-label={rt.speak}
        >
          {listening ? <span className="animate-pulse">🎙️</span> : "🎙️"}
        </button>
        {listening && <div className="text-xs mt-2" style={{ color: "hsl(var(--primary))" }}>{rt.listening}</div>}
      </div>

      <AnimatePresence>
        {(answer || error) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`msg-ai rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-wrap ${
              error ? "border-red-400/40 text-red-300" : "border-yellow-400/20 bg-yellow-400/5 text-white/85"
            }`}
          >
            {error || (
              <>
                <div className="text-yellow-400/70 text-xs font-bold mb-2">👑 {activeTopic}</div>
                {answer}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📜 سجل الاستشارات السابقة */}
      {history.length > 0 && (
        <div id="historyBox" dir={lang === "ar" ? "rtl" : "ltr"} style={{ marginTop: 15, textAlign: "start", fontSize: 12, color: "#aaa" }}>
          <h4 className="font-bold mb-2" style={{ color: "hsl(var(--primary))" }}>📜 {rt.history}</h4>
          <div id="historyList" className="space-y-2">
            {history.map((h, i) => (
              <details key={i} className="rounded-lg p-2" style={{ background: "#1a2332" }}>
                <summary className="cursor-pointer">
                  <span style={{ color: "hsl(var(--primary))" }}>{h.topic}</span>
                  <span className="ms-2 opacity-60"> — {Number.isNaN(new Date(h.date).getTime()) ? h.date : new Intl.DateTimeFormat(sharedLocale(lang), { dateStyle: "medium", timeStyle: "short" }).format(new Date(h.date))}</span>
                </summary>
                <div className="msg-ai mt-2 p-2 rounded-lg whitespace-pre-wrap text-white/80">{h.reply}</div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
