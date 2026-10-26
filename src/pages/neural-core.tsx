import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/contexts/LangContext";
import { contentCopy } from "@/i18n/content-discovery-copy";
import { isArabic, techT } from "@/i18n/tech-surfaces-copy";
import { formatSurfaceDate, formatSurfaceNumber } from "@/i18n/locale-surfaces-b-copy";

interface NeuralStatus {
  online: boolean;
  version: string;
  total_memories: number;
  total_patterns: number;
  total_evolutions: number;
  domain_breakdown: { domain: string; count: string }[];
  last_evolution: { cycle_number: number; intelligence_score: number; report: string; evolved_at: string } | null;
  timestamp: string;
}

interface Insights {
  recent_evolutions: { cycle_number: number; intelligence_score: number; report: string; evolved_at: string; memories_added: number }[];
  active_patterns: { pattern_type: string; description: string; confidence: number; detected_at: string }[];
  recent_memories: { domain: string; source: string; content: string; created_at: string }[];
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

if (false) {
// hint: Logic changed on both sides. Requires understanding intent of each change.
function DiscardNeuralCorePage() {
  const { lang } = useLang();
  const t = (key: Parameters<typeof contentCopy>[1]) => contentCopy(lang, key);
  const [status, setStatus] = useState<NeuralStatus | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [querying, setQuerying] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [s, i] = await Promise.all([
        fetch(`${BASE}/api/neural/status`).then(r => r.json()).catch(() => null),
        fetch(`${BASE}/api/neural/insights`).then(r => r.json()).catch(() => null),
      ]);
      setStatus(s);
      setInsights(i);
    };
    load();
    const iv = setInterval(load, 30000);
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => { clearInterval(iv); clearInterval(t); };
  }, []);

  const askNeural = async () => {
    if (!query.trim()) return;
    setQuerying(true);
    setAnswer("");
    try {
      const r = await fetch(`${BASE}/api/neural/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const d = await r.json();
      setAnswer(d.answer ?? "No response");
    } catch { setAnswer("Neural core unreachable"); }
    setQuerying(false);
  };

  const iq = status?.last_evolution?.intelligence_score ?? 0;

  return (
    <div className="min-h-screen bg-black text-white font-mono pt-16 pb-20">

      {/* Header */}
      <div className="relative border-b border-yellow-500/20 px-6 py-8 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.06),transparent_70%)]" />
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-yellow-500 text-xs tracking-[0.4em] mb-2"
        >
          ⬡ EMPIRE NEURAL CORE — {status?.version ?? "ENC v1.0"}
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight">
          <span className="text-white">NEURAL</span>{" "}
          <span className="text-yellow-400">CORE</span>
        </h1>
        <p className="mt-2 text-gray-400 text-sm tracking-widest">
          AUTONOMOUS SELF-EVOLVING INTELLIGENCE BACKBONE
        </p>

        {/* Live pulse dot */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
          </span>
          <span className="text-yellow-400 text-xs tracking-widest">
            {status?.online ? "ONLINE — LEARNING" : "INITIALIZING..."}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column: Stats ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* IQ Score */}
          <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-xl p-5 text-center">
            <div className="text-xs text-yellow-500/60 tracking-widest mb-1">{t("intelligence")}</div>
            <motion.div
              key={Math.floor(iq)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-black text-yellow-400"
            >
              {formatSurfaceNumber(lang, iq, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
            </motion.div>
            <div className="text-xs text-gray-500 mt-1">/ 100 MAX</div>
            <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${iq}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full"
              />
            </div>
          </div>

          {/* Core Stats */}
          {[
            { label: "MEMORIES", value: status?.total_memories ?? "—", icon: "🧠" },
            { label: "PATTERNS", value: status?.total_patterns ?? "—", icon: "🔮" },
            { label: "EVOLUTIONS", value: status?.total_evolutions ?? "—", icon: "🧬" },
          ].map(s => (
            <div key={s.label} className="border border-gray-800 rounded-xl p-4 flex items-center gap-4">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className="text-xs text-gray-500 tracking-widest">{s.label}</div>
                <div className="text-2xl font-black text-white">{s.value}</div>
              </div>
            </div>
          ))}

          {/* Domain Breakdown */}
          <div className="border border-gray-800 rounded-xl p-5">
            <div className="text-xs text-gray-500 tracking-widest mb-3">MEMORY BY DOMAIN</div>
            <div className="space-y-2">
              {status?.domain_breakdown?.slice(0, 6).map((d) => {
                const total = status.total_memories || 1;
                const pct = Math.round((parseInt(d.count) / total) * 100);
                return (
                  <div key={d.domain}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300 capitalize">{d.domain}</span>
                      <span className="text-yellow-400">{formatSurfaceNumber(lang, Number(d.count))}</span>
                    </div>
                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500/60 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right column: Neural Query + Activity ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Neural Query Terminal */}
          <div className="border border-yellow-500/30 rounded-xl overflow-hidden">
            <div className="bg-yellow-500/10 px-5 py-3 flex items-center gap-2 border-b border-yellow-500/20">
              <span className="text-yellow-400 text-sm tracking-widest">⬡ NEURAL QUERY TERMINAL</span>
            </div>
            <div className="p-5">
              <div className="flex gap-3">
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && askNeural()}
                  placeholder={t("queryPlaceholder")}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
                <button
                  onClick={askNeural}
                  disabled={querying}
                  className="bg-yellow-500 text-black px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-yellow-400 disabled:opacity-50 transition-all"
                >
                  {querying ? "..." : "ASK"}
                </button>
              </div>
              <AnimatePresence>
                {answer && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 leading-relaxed"
                  >
                    <span className="text-yellow-400 text-xs tracking-widest block mb-2">⬡ ENC RESPONSE</span>
                    {answer}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Last Evolution Report */}
          {status?.last_evolution && (
            <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-5">
              <div className="text-xs text-purple-400 tracking-widest mb-3">
                🧬 LAST EVOLUTION — CYCLE #{formatSurfaceNumber(lang, status.last_evolution.cycle_number)}
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{status.last_evolution.report}</p>
              <div className="text-xs text-gray-600 mt-2">
                {formatSurfaceDate(lang, status.last_evolution.evolved_at, { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </div>
          )}

          {/* Active Patterns */}
          {(insights?.active_patterns?.length ?? 0) > 0 && (
            <div className="border border-gray-800 rounded-xl p-5">
              <div className="text-xs text-gray-500 tracking-widest mb-3">🔮 ACTIVE PATTERNS</div>
              <div className="space-y-2">
                {insights!.active_patterns.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                      p.pattern_type === "trend" ? "bg-yellow-400" :
                      p.pattern_type === "growth" ? "bg-green-400" : "bg-blue-400"
                    }`} />
                    <span className="text-gray-300">{p.description}</span>
                    <span className="ml-auto text-xs text-gray-600 flex-shrink-0">
                       {formatSurfaceNumber(lang, Math.round(p.confidence * 100))}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Memories Stream */}
          {(insights?.recent_memories?.length ?? 0) > 0 && (
            <div className="border border-gray-800 rounded-xl p-5">
              <div className="text-xs text-gray-500 tracking-widest mb-3">📥 LIVE MEMORY STREAM</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {insights!.recent_memories.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span className="text-yellow-500/60 flex-shrink-0 mt-0.5">▸</span>
                    <span className="text-gray-400 capitalize text-yellow-500/80">[{m.domain}/{m.source}]</span>
                    <span className="text-gray-300 truncate">{m.content.slice(0, 80)}...</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!status && (
            <div className="border border-gray-800 rounded-xl p-10 text-center">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-yellow-400 text-3xl mb-3"
              >
                ⬡
              </motion.div>
              <p className="text-gray-500 text-sm">{t("connecting")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-yellow-500/20 px-6 py-2 flex items-center justify-between text-xs text-gray-600 z-20">
        <span>ENC — EMPIRE NEURAL CORE © ARENA QAISYPRO</span>
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-yellow-500"
        >
          ● AUTONOMOUS — SELF-EVOLVING — ETERNAL
        </motion.span>
        <span>{formatSurfaceDate(lang, Date.now(), { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" })} UTC</span>
      </div>
    </div>
  );
}
}
export default function NeuralCorePage() {
  const { lang } = useLang();
  const t = (key: Parameters<typeof contentCopy>[1], values?: Record<string, string | number>) => contentCopy(lang, key, values);
  const tx = (key: Parameters<typeof techT>[1]) => techT(lang, key);
  const [status, setStatus] = useState<NeuralStatus | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [querying, setQuerying] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [s, i] = await Promise.all([
        fetch(`${BASE}/api/neural/status`).then(r => r.json()).catch(() => null),
        fetch(`${BASE}/api/neural/insights`).then(r => r.json()).catch(() => null),
      ]);
      setStatus(s);
      setInsights(i);
    };
    load();
    const iv = setInterval(load, 30000);
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => { clearInterval(iv); clearInterval(t); };
  }, []);

  const askNeural = async () => {
    if (!query.trim()) return;
    setQuerying(true);
    setAnswer("");
    try {
      const r = await fetch(`${BASE}/api/neural/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const d = await r.json();
      setAnswer(d.answer ?? t("noResponse"));
    } catch { setAnswer(t("unreachable")); }
    setQuerying(false);
  };

  const iq = status?.last_evolution?.intelligence_score ?? 0;

  return (
    <div dir={isArabic(lang) ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground font-mono pt-16 pb-20">

      {/* Header */}
      <div className="relative border-b border-primary/20 px-6 py-8 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.06),transparent_70%)]" />
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-primary text-xs tracking-[0.4em] mb-2"
        >
           ⬡ {tx("empireNeuralCore")} — {status?.version ?? "ENC v1.0"}
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight">
          <span className="text-foreground">{t("neuralTitle").split(" ")[0]}</span>{" "}
          <span className="text-primary">{t("neuralTitle").split(" ").slice(1).join(" ")}</span>
        </h1>
        <p className="mt-2 text-muted-foreground text-sm tracking-widest">
          {t("neuralSub")}
        </p>

        {/* Live pulse dot */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-primary text-xs tracking-widest">
            {status?.online ? t("online") : t("initializing")}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column: Stats ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* IQ Score */}
          <div className="border border-primary/30 bg-primary/5 rounded-xl p-5 text-center">
            <div className="text-xs text-primary/60 tracking-widest mb-1">{t("intelligence")}</div>
            <motion.div
              key={Math.floor(iq)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-black text-primary"
            >
             {formatSurfaceNumber(lang, iq, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
            </motion.div>
             <div className="text-xs text-muted-foreground mt-1">{tx("max100")}</div>
            <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${iq}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full"
              />
            </div>
          </div>

          {/* Core Stats */}
          {[
            { label: t("memories"), value: status?.total_memories ?? "—", icon: "🧠" },
            { label: t("patterns"), value: status?.total_patterns ?? "—", icon: "🔮" },
            { label: t("evolutions"), value: status?.total_evolutions ?? "—", icon: "🧬" },
          ].map(s => (
            <div key={s.label} className="border border-border rounded-xl p-4 flex items-center gap-4">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className="text-xs text-muted-foreground tracking-widest">{s.label}</div>
                 <div className="text-2xl font-black text-foreground">{typeof s.value === "number" ? formatSurfaceNumber(lang, s.value) : s.value}</div>
              </div>
            </div>
          ))}

          {/* Domain Breakdown */}
          <div className="border border-border rounded-xl p-5">
            <div className="text-xs text-muted-foreground tracking-widest mb-3">{t("memoryDomain")}</div>
            <div className="space-y-2">
              {status?.domain_breakdown?.slice(0, 6).map((d) => {
                const total = status.total_memories || 1;
                const pct = Math.round((parseInt(d.count) / total) * 100);
                return (
                  <div key={d.domain}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground/80 capitalize">{d.domain}</span>
                       <span className="text-primary">{formatSurfaceNumber(lang, Number(d.count))}</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right column: Neural Query + Activity ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Neural Query Terminal */}
          <div className="border border-primary/30 rounded-xl overflow-hidden">
            <div className="bg-primary/10 px-5 py-3 flex items-center gap-2 border-b border-primary/20">
              <span className="text-primary text-sm tracking-widest">{t("neuralTerminal")}</span>
            </div>
            <div className="p-5">
              <div className="flex gap-3">
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && askNeural()}
                  placeholder={t("queryPlaceholder")}
                  className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
                <button
                  onClick={askNeural}
                  disabled={querying}
                  className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  {querying ? "..." : t("ask")}
                </button>
              </div>
              <AnimatePresence>
                {answer && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 bg-card border border-border rounded-lg p-4 text-sm text-foreground/80 leading-relaxed"
                  >
                    <span className="text-primary text-xs tracking-widest block mb-2">{t("response")}</span>
                    {answer}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Last Evolution Report */}
          {status?.last_evolution && (
            <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-5">
              <div className="text-xs text-purple-400 tracking-widest mb-3">
                 {t("lastEvolution", { count: formatSurfaceNumber(lang, status.last_evolution.cycle_number) })}
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{status.last_evolution.report}</p>
              <div className="text-xs text-muted-foreground mt-2">
                 {formatSurfaceDate(lang, status.last_evolution.evolved_at, { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </div>
          )}

          {/* Active Patterns */}
          {(insights?.active_patterns?.length ?? 0) > 0 && (
            <div className="border border-border rounded-xl p-5">
              <div className="text-xs text-muted-foreground tracking-widest mb-3">{t("activePatterns")}</div>
              <div className="space-y-2">
                {insights!.active_patterns.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                      p.pattern_type === "trend" ? "bg-yellow-400" :
                      p.pattern_type === "growth" ? "bg-green-400" : "bg-blue-400"
                    }`} />
                    <span className="text-foreground/80">{p.description}</span>
                    <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">
                       {formatSurfaceNumber(lang, Math.round(p.confidence * 100))}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Memories Stream */}
          {(insights?.recent_memories?.length ?? 0) > 0 && (
            <div className="border border-border rounded-xl p-5">
              <div className="text-xs text-muted-foreground tracking-widest mb-3">{t("memoryStream")}</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {insights!.recent_memories.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span className="text-primary/60 flex-shrink-0 mt-0.5">▸</span>
                    <span className="capitalize text-primary/80">[{m.domain}/{m.source}]</span>
                    <span className="text-foreground/80 truncate">{m.content.slice(0, 80)}...</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!status && (
            <div className="border border-border rounded-xl p-10 text-center">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-primary text-3xl mb-3"
              >
                ⬡
              </motion.div>
              <p className="text-muted-foreground text-sm">{t("connecting")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-primary/20 px-6 py-2 flex items-center justify-between text-xs text-muted-foreground z-20">
         <span>ENC — {tx("empireNeuralCore")} © GDNA ARENA</span>
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-primary"
        >
           {tx("autonomousFooter")}
        </motion.span>
         <span>{formatSurfaceDate(lang, Date.now(), { dateStyle: "medium", timeStyle: "short" })}</span>
      </div>
    </div>
  );
}
