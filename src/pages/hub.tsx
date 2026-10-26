import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatNumber, surfaceCopy } from "@/i18n/content-surfaces-copy";
import {
  useGetGsDomains, useGetGsRanking, useGetGsNews, useGetGsFigures,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import {
  Crown, Swords, Trophy, Zap, TrendingUp, Users,
  Vote, Newspaper, Gamepad2, BrainCircuit, Flame,
  ChevronRight, ArrowRight, Shield, Sparkles,
  Clock, Brain, Scale, Send, Bot, Loader2,
  Rocket, BarChart3, Coins, Play, ShieldCheck,
} from "lucide-react";

// ── Imperial AI Decrees ──────────────────────────────────────────────────────
const GAMES = [
  { id: "neon-racer", name: "Neon Racer", genre: "racing" as const, players: 1247, hot: true, reward: "20–80", accent: "#00D4FF", bg: "rgba(0,212,255,0.06)", border: "rgba(0,212,255,0.25)" },
  { id: "crypto-clash", name: "Crypto Clash", genre: "strategy" as const, players: 893, hot: false, reward: "30–120", accent: "#FFD700", bg: "rgba(255,215,0,0.06)", border: "rgba(255,215,0,0.25)" },
  { id: "arena-strike", name: "Arena Strike", genre: "combat" as const, players: 2041, hot: true, reward: "50–200", accent: "#FF4444", bg: "rgba(255,68,68,0.06)", border: "rgba(255,68,68,0.25)" },
  { id: "globalstar", name: "GlobalStar", genre: "tribute" as const, players: 5820, hot: true, reward: "10–50", accent: "#C9A84C", bg: "rgba(201,168,76,0.06)", border: "rgba(201,168,76,0.25)", external: true },
];

function getRank(xp: number, s: ReturnType<typeof surfaceCopy>) {
  if (xp < 500) return { label: s.footSoldier1, color: "#8B7355" };
  if (xp < 1000) return { label: s.footSoldier2, color: "#8B7355" };
  if (xp < 2000) return { label: s.knight1, color: "#aaa9ad" };
  if (xp < 3500) return { label: s.knight2, color: "#aaa9ad" };
  if (xp < 5000) return { label: s.commander1, color: "#C9A84C" };
  if (xp < 7500) return { label: s.commander2, color: "#C9A84C" };
  return { label: s.imperialChampion, color: "#00D4FF" };
}

// ── The Oracle (Quick Chat) ───────────────────────────────────────────────────
function TheOracle() {
  const { t, lang } = useLang();
  const s = surfaceCopy(lang);
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: s.oracleGreeting },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    setMessages(current => current.length === 1 && current[0].role === "ai" ? [{ role: "ai", text: s.oracleGreeting }] : current);
  }, [lang]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setMessages(m => [...m, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg, history: messages.slice(-6).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text })) }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "ai", text: data.reply ?? "…" }]);
    } catch {
      setMessages(m => [...m, { role: "ai", text: s.oracleError }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-52">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "ai" && <span className="text-sm mt-0.5 shrink-0" style={{ color: "hsl(var(--primary))" }}>◈</span>}
            <div
              className="text-xs rounded-none px-3 py-2 max-w-[85%] leading-relaxed"
              dir="auto"
              style={m.role === "ai"
                ? { background: "hsl(var(--primary) / 0.06)", color: "#ffffff90", border: "1px solid hsl(var(--primary) / 0.13)" }
                : { background: "rgba(255,255,255,0.05)", color: "#ffffff70" }
              }
            >{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-center">
            <span className="text-sm" style={{ color: "hsl(var(--primary))" }}>◈</span>
            <span className="text-xs font-mono animate-pulse" style={{ color: "hsl(var(--primary) / 0.38)" }}>{s.oracleThinking}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid hsl(var(--primary) / 0.13)" }}>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder={t("chat_placeholder")}
          className="h-8 text-xs bg-transparent border-0 border-b rounded-none focus-visible:ring-0 text-white/70 placeholder:text-white/25"
          style={{ borderBottom: "1px solid hsl(var(--primary) / 0.19)" }}
          disabled={loading}
          dir="auto"
        />
        <button onClick={send} disabled={!input.trim() || loading}
          className="h-8 px-3 text-xs font-black uppercase tracking-wider shrink-0"
          style={{ background: loading ? "hsl(var(--primary) / 0.19)" : "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Hub() {
  const { t, lang } = useLang();
  const s = surfaceCopy(lang);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [decreeIdx, setDecreeIdx] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [playResult, setPlayResult] = useState<{ win: boolean; coins: number; xpEarned: number } | null>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const { data: domains }  = useGetGsDomains();
  const { data: ranking }  = useGetGsRanking();
  const { data: news }     = useGetGsNews();
  const { data: figures }  = useGetGsFigures({ limit: 5 });
  const [leaders, setLeaders] = useState<Array<{ id: number; username: string; xp: number; balance: number; wins: number }>>([]);

  useEffect(() => {
    fetch(`${BASE}/api/leaderboard`, { credentials: "include" })
      .then(r => r.json()).then(d => setLeaders(d.players?.slice(0, 5) ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setDecreeIdx(p => (p + 1) % DECREES.length), 3500);
    return () => clearInterval(id);
  }, []);

  const topFigures  = figures?.figures?.slice(0, 3) ?? [];
  const topDomains  = domains?.domains?.slice(0, 4) ?? [];
  const latestNews  = news?.articles?.slice(0, 3) ?? [];
  const rank        = user ? getRank(user.xp, s) : null;
  const DECREES = [
    { flag: "🌍", text: s.decree1 }, { flag: "⚽", text: s.decree2 }, { flag: "⚔️", text: s.decree3 },
    { flag: "🪙", text: s.decree4 }, { flag: "◈", text: s.decree5 },
  ];

  // Empire census (live totals)
  const totalVotes = ranking?.ranking?.reduce((s: number, d: any) =>
    s + (d.figures?.reduce((a: number, f: any) => a + (f.votes ?? 0), 0) ?? 0), 0) ?? 0;

  const handlePlay = async (gameId: string, external?: boolean) => {
    if (external) { setLocation("/games/globalstar"); return; }
    if (!user) { setLocation("/login"); return; }
    setPlaying(gameId);
    setPlayResult(null);
    try {
      const res = await fetch(`${BASE}/api/games/${gameId}/play`, { method: "POST", credentials: "include" });
      const d = await res.json();
      setPlayResult({ win: d.win, coins: d.coinsEarned, xpEarned: d.xpEarned });
      setTimeout(() => setPlayResult(null), 4000);
    } catch {} finally { setPlaying(null); }
  };

  const SECTIONS = [
    { icon: "⚖️",   label: "GlobalStar",       path: "/games/globalstar",  accent: "#C9A84C" },
    { icon: "⚔️",   label: t("games"),          path: "/games",             accent: "#FF4444" },
    { icon: "🧠",   label: s.mindForge,          path: "/growth",            accent: "#8B5CF6" },
    { icon: "📜",   label: t("nav_chronicle"),  path: "/chronicle",         accent: "#FFD700" },
    { icon: "📡",   label: t("news"),           path: "/news",              accent: "#22C55E" },
    { icon: "♔",    label: t("empire_title"),   path: "/empire",            accent: "#C9A84C" },
    { icon: "⚖",    label: t("legal_title"),    path: "/legal",             accent: "#3B82F6" },
    { icon: "🏆",   label: t("leaderboard"),    path: "/leaderboard",       accent: "#FFD700" },
  ];

  return (
    <div className="min-h-screen px-4 py-8 max-w-7xl mx-auto space-y-8 relative" dir={lang === "ar" ? "rtl" : "ltr"}
      style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.04) 0%, transparent 60%)" }}>

      {/* ── IMPERIAL INTELLIGENCE FEED ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden px-5 py-3 flex items-center gap-4"
        style={{ background: "hsl(var(--primary) / 0.04)", border: "1px solid hsl(var(--primary) / 0.15)",
          boxShadow: "0 0 30px hsl(var(--primary) / 0.06)" }}
      >
        <div className="flex items-center gap-2 shrink-0">
          <ShieldCheck className="w-4 h-4 animate-pulse" style={{ color: "hsl(var(--primary))" }} />
          <span className="text-xs font-mono font-black uppercase tracking-[0.3em]" style={{ color: "hsl(var(--primary))" }}>
             {s.imperialIntelligence}
          </span>
        </div>
        <div className="w-px h-4 shrink-0" style={{ background: "hsl(var(--primary) / 0.19)" }} />
        <AnimatePresence mode="wait">
          <motion.div key={decreeIdx}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35 }}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <span className="text-base">{DECREES[decreeIdx].flag}</span>
            <p className="text-xs text-white/60 truncate font-mono">{DECREES[decreeIdx].text}</p>
          </motion.div>
        </AnimatePresence>
        <Link href="/chat" className="ml-auto shrink-0">
          <button className="h-6 px-3 text-xs font-mono uppercase tracking-wider"
            style={{ border: "1px solid hsl(var(--primary) / 0.19)", color: "hsl(var(--primary) / 0.38)" }}>
             {s.oracle} →
          </button>
        </Link>
      </motion.div>

      {/* ── THRONE ROOM TITLE ──────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
        <div className="flex items-center justify-center gap-4">
          <div className="h-px w-16" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)))" }} />
          <span className="text-2xl">♔</span>
          <div className="h-px w-16" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), transparent)" }} />
        </div>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight imperial-gold leading-none">
          {t("hub_title")}
        </h1>
        <p className="text-xs font-mono tracking-[0.4em] uppercase" style={{ color: "hsl(var(--primary) / 0.31)" }}>
           {s.commandCenter}
        </p>
      </motion.div>

      {/* ── QUICK NAV — Territory Portals ──────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2 justify-center"
      >
        {SECTIONS.map(s => (
          <Link key={s.path} href={s.path}>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105"
              style={{ border: `1px solid ${s.accent}25`, color: `${s.accent}90`,
                background: `${s.accent}08` }}
            >
              <span>{s.icon}</span>{s.label}
            </button>
          </Link>
        ))}
      </motion.div>

      {/* ── EMPIRE CENSUS STRIP ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px"
        style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.13)" }}>
        {[
          { val: totalVotes > 0 ? formatNumber(totalVotes, lang) : "2.4M+", label: t("hub_stat_votes"), sub: s.votesCast, glyph: "◈" },
          { val: "847K+", label: t("hub_stat_games"), sub: s.battlesFought, glyph: "⚔" },
          { val: "156K+", label: t("hub_stat_users"), sub: s.citizens, glyph: "◉" },
          { val: "99.8%", label: t("hub_stat_ai"), sub: s.oracleAccuracy, glyph: "✦" },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
            className="bg-background py-5 px-3 text-center"
            style={{ borderRight: i < 3 ? "1px solid hsl(var(--primary) / 0.06)" : undefined }}
          >
            <div className="text-xl mb-1" style={{ color: "hsl(var(--primary) / 0.19)" }}>{s.glyph}</div>
            <p className="text-2xl md:text-3xl font-black font-mono imperial-gold">{s.val}</p>
            <p className="text-xs uppercase tracking-wider mt-0.5" style={{ color: "#ffffff40" }}>{s.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "hsl(var(--primary) / 0.21)" }}>{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── MAIN 3-COL — Tribute Hall | The Oracle | Order of Champions ── */}
      <div className="grid md:grid-cols-3 gap-5">

        {/* Tribute Hall (GlobalStar) */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <div className="h-full flex flex-col p-5 space-y-3"
            style={{ border: "1px solid hsl(var(--primary) / 0.15)", background: "hsl(var(--primary) / 0.02)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚖️</span>
                <div>
                  <p className="text-xs font-mono tracking-widest uppercase" style={{ color: "hsl(var(--primary) / 0.38)" }}>{s.tributeHall}</p>
                  <h2 className="font-black text-sm uppercase tracking-wider">{t("hub_gs_title")}</h2>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-0.5" style={{ border: "1px solid hsl(var(--primary) / 0.25)", color: "hsl(var(--primary))" }}>{s.live}</span>
            </div>

            {topDomains.map((d: any, i: number) => (
              <div key={d.id} className="flex items-center justify-between p-2 transition-colors group"
                style={{ background: "hsl(var(--primary) / 0.02)", border: "1px solid hsl(var(--primary) / 0.07)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{d.icon}</span>
                  <div>
                    <p className="text-xs font-bold">{d.label}</p>
                    <p className="text-xs font-mono" style={{ color: "hsl(var(--primary) / 0.38)" }}>{formatNumber(d.totalVotes ?? 0, lang)} {s.tribute}</p>
                  </div>
                </div>
                <TrendingUp className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary) / 0.38)" }} />
              </div>
            ))}

            {topFigures.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "hsl(var(--primary) / 0.31)" }}>{t("hub_top_figures")}</p>
                {topFigures.map((f: any, i: number) => (
                  <div key={f.id} className="flex items-center gap-2 p-1.5"
                    style={{ background: "hsl(var(--primary) / 0.02)" }}>
                    <span className="text-xs font-black font-mono w-4" style={{ color: i === 0 ? "hsl(var(--primary))" : "#ffffff40" }}>
                      {i === 0 ? "♔" : "#" + (i + 1)}
                    </span>
                    <p className="text-xs font-medium truncate flex-1">{f.name}</p>
                    <span className="text-xs font-mono" style={{ color: "hsl(var(--primary) / 0.5)" }}>{formatNumber(f.votes ?? 0, lang)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-auto pt-2">
              <Link href="/games/globalstar">
                <button className="w-full h-8 text-xs font-black uppercase tracking-wider"
                  style={{ border: "1px solid hsl(var(--primary) / 0.25)", color: "hsl(var(--primary))",
                    background: "hsl(var(--primary) / 0.05)" }}>
                  {t("hub_enter_gs")} →
                </button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* The Oracle */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="h-full flex flex-col p-5"
            style={{ border: "1px solid hsl(var(--primary) / 0.25)", background: "hsl(var(--primary) / 0.03)",
              boxShadow: "0 0 40px hsl(var(--primary) / 0.06)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-mono tracking-widest uppercase mb-0.5" style={{ color: "hsl(var(--primary) / 0.38)" }}>{s.imperialOracle}</p>
                <h2 className="font-black text-sm uppercase tracking-wider imperial-gold">GDN-AI</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-mono text-green-400">{s.active}</span>
              </div>
            </div>
            <div className="flex-1">
              <TheOracle />
            </div>
            <Link href="/chat" className="mt-3">
              <button className="w-full h-7 text-xs font-mono uppercase tracking-wider"
                style={{ color: "hsl(var(--primary) / 0.38)" }}>
                {t("hub_full_chat")} →
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Order of Champions (Leaderboard) */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <div className="h-full flex flex-col p-5 space-y-3"
            style={{ border: "1px solid hsl(var(--primary) / 0.13)", background: "hsl(var(--primary) / 0.01)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono tracking-widest uppercase mb-0.5" style={{ color: "hsl(var(--primary) / 0.31)" }}>{s.orderChampions}</p>
                <h2 className="font-black text-sm uppercase tracking-wider">{t("leaderboard")}</h2>
              </div>
              <span className="text-xs font-mono px-2 py-0.5" style={{ border: "1px solid hsl(var(--primary) / 0.15)", color: "hsl(var(--primary) / 0.38)" }}>{s.topFive}</span>
            </div>

            {leaders.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(var(--primary) / 0.25)" }} />
              </div>
            ) : leaders.map((p, i) => {
               const r = getRank(p.xp, s);
              return (
                <div key={p.id} className="flex items-center gap-2.5 p-2"
                  style={{ background: "hsl(var(--primary) / 0.02)", border: "1px solid hsl(var(--primary) / 0.06)" }}>
                  <div className="w-6 text-center">
                    {i === 0 ? <span className="text-sm">♔</span>
                     : i === 1 ? <span className="text-xs font-black" style={{ color: "#aaa9ad" }}>♕</span>
                     : i === 2 ? <span className="text-xs font-black" style={{ color: "#CD7F32" }}>♖</span>
                     : <span className="text-xs font-black text-white/30">#{i+1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{p.username}</p>
                    <p className="text-xs font-mono" style={{ color: r.color }}>{r.label}</p>
                  </div>
                  <div className="text-right shrink-0">
                     <p className="text-xs font-black font-mono" style={{ color: "hsl(var(--primary))" }}>{formatNumber(p.balance, lang)}</p>
                     <p className="text-xs text-white/30 font-mono">{formatNumber(p.xp, lang)} XP</p>
                  </div>
                </div>
              );
            })}

            <div className="mt-auto pt-2">
              <Link href="/leaderboard">
                <button className="w-full h-8 text-xs font-black uppercase tracking-wider"
                  style={{ border: "1px solid hsl(var(--primary) / 0.15)", color: "hsl(var(--primary) / 0.38)" }}>
                  {t("hub_see_all")} →
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── THE BATTLE ARENA ───────────────────────────────────────── */}
      <section className="space-y-5">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-px w-8" style={{ background: "#FF444450" }} />
            <div>
              <p className="text-xs font-mono tracking-widest uppercase mb-0.5" style={{ color: "#FF444460" }}>{s.battleArena}</p>
              <h2 className="font-black uppercase tracking-wider">{t("hub_gaming_title")}</h2>
            </div>
          </div>
          <Link href="/games">
            <button className="text-xs font-mono uppercase tracking-wider px-3 py-1"
              style={{ border: "1px solid #FF444430", color: "#FF444460" }}>
              {t("hub_see_all")} →
            </button>
          </Link>
        </div>

        {/* Battle result */}
        <AnimatePresence>
          {playResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="px-5 py-4 text-center font-black text-sm uppercase tracking-widest"
              style={playResult.win
                ? { border: "1px solid #22C55E40", background: "rgba(34,197,94,0.06)", color: "#22C55E" }
                : { border: "1px solid #FF444440", background: "rgba(255,68,68,0.06)", color: "#FF4444" }
              }
            >
              {playResult.win
                ? `♔ ${t("hub_win_msg")} · +${formatNumber(playResult.coins, lang)} ${s.coins} · +${formatNumber(playResult.xpEarned, lang)} XP`
                : `⚔️ ${t("hub_lose_msg")} · +${formatNumber(playResult.coins, lang)} ${s.coins} — ${s.honourDefeat}`}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GAMES.map((g, i) => (
            <motion.div key={g.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <div className="p-4 space-y-3 transition-all group"
                style={{ border: `1px solid ${g.border}`, background: g.bg }}>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 flex items-center justify-center text-lg"
                    style={{ border: `1px solid ${g.accent}30`, background: `${g.accent}10` }}>
                    {g.hot ? "🔥" : "⚔"}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black font-mono" style={{ color: g.accent }}>{formatNumber(g.players, lang)}</p>
                    <p className="text-xs" style={{ color: `${g.accent}50` }}>{t("hub_online")}</p>
                  </div>
                </div>
                <div>
                  <p className="font-black text-sm" style={{ color: g.accent }}>{g.name}</p>
                  <p className="text-xs" style={{ color: `${g.accent}60` }}>{s[g.genre]}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-mono" style={{ color: "hsl(var(--primary) / 0.5)" }}>{s.reward}: {g.reward} {s.coins}</span>
                </div>
                <button
                  onClick={() => handlePlay(g.id, g.external)}
                  disabled={playing === g.id}
                  className="w-full h-7 text-xs font-black uppercase tracking-wider transition-opacity"
                  style={{
                    border: `1px solid ${g.accent}50`,
                    color: g.accent,
                    background: `${g.accent}10`,
                    opacity: playing === g.id ? 0.5 : 1,
                  }}
                >
                  {playing === g.id
                    ? <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                    : g.external ? s.enter : "⚔ " + t("hub_play_btn")}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── MIND FORGE + THE ARCHIVES ──────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Mind Forge (NLP) */}
        <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <div className="p-5 space-y-4 h-full"
            style={{ border: "1px solid rgba(139,92,246,0.25)", background: "rgba(139,92,246,0.04)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono tracking-widest uppercase mb-0.5" style={{ color: "rgba(139,92,246,0.6)" }}>{s.mindForge}</p>
                <h2 className="font-black text-sm uppercase tracking-wider" style={{ color: "rgb(139,92,246)" }}>{t("hub_nlp_title")}</h2>
              </div>
              <Link href="/growth">
                <button className="text-xs font-mono" style={{ color: "rgba(139,92,246,0.5)" }}>{s.forge} →</button>
              </Link>
            </div>

            {user ? (
              <div className="space-y-3">
                {[
                  { label: t("nlp_dim_action"),    val: Math.min(100, Math.round((user.gamesPlayed / 50) * 100)),             color: "#00D4FF" },
                  { label: t("nlp_dim_resilience"), val: Math.min(100, Math.round(user.gamesPlayed > 0 ? (user.wins / user.gamesPlayed) * 100 : 0)), color: "#22C55E" },
                  { label: t("nlp_dim_growth"),     val: Math.min(100, Math.round((user.xp / 7500) * 100)),                   color: "#C9A84C" },
                  { label: t("nlp_dim_abundance"),  val: Math.min(100, Math.round((user.balance / 5000) * 100)),              color: "#8B5CF6" },
                ].map((d, i) => (
                  <div key={d.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "#ffffff50" }}>{d.label}</span>
                      <span className="font-black font-mono" style={{ color: d.color }}>{d.val}%</span>
                    </div>
                    <div className="h-1 rounded-none overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        initial={{ width: 0 }} whileInView={{ width: `${d.val}%` }}
                        viewport={{ once: true }} transition={{ duration: 1.2, delay: i * 0.1 }}
                        className="h-full" style={{ background: d.color }}
                      />
                    </div>
                  </div>
                ))}
                <Link href="/growth">
                  <button className="w-full h-7 text-xs font-black uppercase tracking-wider"
                    style={{ border: "1px solid rgba(139,92,246,0.4)", color: "rgba(139,92,246,0.9)",
                      background: "rgba(139,92,246,0.08)" }}>
                    🧠 {t("hub_growth_cta")}
                  </button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-4xl">🧠</p>
                <p className="text-xs" style={{ color: "#ffffff40" }}>{t("nlp_login_required")}</p>
                <Link href="/login">
                  <button className="text-xs px-4 py-2 font-black uppercase tracking-wider"
                    style={{ border: "1px solid rgba(139,92,246,0.4)", color: "rgba(139,92,246,0.8)" }}>
                    {t("login")}
                  </button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* The Archives (Chronicle) */}
        <motion.div initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <div className="p-5 space-y-4 h-full"
            style={{ border: "1px solid hsl(var(--primary) / 0.15)", background: "hsl(var(--primary) / 0.02)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono tracking-widest uppercase mb-0.5" style={{ color: "hsl(var(--primary) / 0.31)" }}>{s.archives}</p>
                <h2 className="font-black text-sm uppercase tracking-wider" style={{ color: "hsl(var(--primary))" }}>{t("nav_chronicle")}</h2>
              </div>
              <Link href="/chronicle">
                <button className="text-xs font-mono" style={{ color: "hsl(var(--primary) / 0.31)" }}>{s.archive} →</button>
              </Link>
            </div>

            <div className="space-y-3">
              {[
                { era: t("chrono_past"),    icon: "🏛️", key: "chrono_past_snap",    accent: "#C9A84C" },
                { era: t("chrono_present"), icon: "📡", key: "chrono_present_snap", accent: "#00D4FF" },
                { era: t("chrono_future"),  icon: "🤖", key: "chrono_future_snap",  accent: "#8B5CF6" },
              ].map((e, i) => (
                <div key={e.era} className="flex items-start gap-3 p-3"
                  style={{ background: `${e.accent}06`, border: `1px solid ${e.accent}20` }}>
                  <span className="text-xl shrink-0">{e.icon}</span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider mb-0.5" style={{ color: e.accent }}>{e.era}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "#ffffff40" }}>{t(e.key)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/chronicle">
              <button className="w-full h-7 text-xs font-black uppercase tracking-wider"
                style={{ border: "1px solid hsl(var(--primary) / 0.19)", color: "hsl(var(--primary) / 0.44)",
                  background: "hsl(var(--primary) / 0.05)" }}>
                📜 {t("hub_chronicle_cta")}
              </button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ── NEWS DISPATCHES ─────────────────────────────────────────── */}
      {latestNews.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-px w-8" style={{ background: "#22C55E50" }} />
              <div>
                <p className="text-xs font-mono tracking-widest uppercase mb-0.5" style={{ color: "#22C55E60" }}>{s.imperialDispatches}</p>
                <h2 className="font-black uppercase tracking-wider">{t("hub_news_title")}</h2>
              </div>
            </div>
            <Link href="/news">
              <button className="text-xs font-mono uppercase px-3 py-1"
                style={{ border: "1px solid #22C55E20", color: "#22C55E60" }}>
                {s.allNews} →
              </button>
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {latestNews.map((a: any, i: number) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                <div className="p-4 space-y-2 h-full transition-all"
                  style={{ border: "1px solid #22C55E12", background: "rgba(34,197,94,0.02)" }}>
                  {a.isBreaking && (
                    <span className="text-xs font-black px-2 py-0.5 uppercase tracking-widest"
                      style={{ background: "rgba(255,68,68,0.15)", color: "#FF4444", border: "1px solid #FF444430" }}>
                      ⚡ {s.breaking}
                    </span>
                  )}
                  <h3 className="font-bold text-xs line-clamp-2">{a.title}</h3>
                  <p className="text-xs line-clamp-2" style={{ color: "#ffffff40" }}>{a.summary}</p>
                  <p className="text-xs font-mono" style={{ color: "#22C55E40" }}>{a.source}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── EMPIRE + LEGAL TABLETS ─────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/empire">
          <motion.div whileHover={{ scale: 1.01 }}
            className="p-5 flex items-center gap-4 cursor-pointer transition-all"
            style={{ border: "1px solid hsl(var(--primary) / 0.19)", background: "hsl(var(--primary) / 0.04)" }}>
            <span className="text-3xl">♔</span>
            <div className="flex-1">
              <p className="text-xs font-mono tracking-widest uppercase mb-0.5" style={{ color: "hsl(var(--primary) / 0.38)" }}>{s.constitution}</p>
              <p className="font-black uppercase tracking-wider" style={{ color: "hsl(var(--primary))" }}>{t("empire_title")}</p>
              <p className="text-xs mt-0.5" style={{ color: "#ffffff30" }}>{t("hub_empire_desc")}</p>
            </div>
            <span style={{ color: "hsl(var(--primary) / 0.25)" }}>→</span>
          </motion.div>
        </Link>
        <Link href="/legal">
          <motion.div whileHover={{ scale: 1.01 }}
            className="p-5 flex items-center gap-4 cursor-pointer transition-all"
            style={{ border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.04)" }}>
            <span className="text-3xl">⚖</span>
            <div className="flex-1">
              <p className="text-xs font-mono tracking-widest uppercase mb-0.5" style={{ color: "rgba(59,130,246,0.6)" }}>{s.law}</p>
              <p className="font-black uppercase tracking-wider" style={{ color: "rgba(59,130,246,0.9)" }}>{t("legal_title")}</p>
              <p className="text-xs mt-0.5" style={{ color: "#ffffff30" }}>{t("hub_legal_desc")}</p>
            </div>
            <span style={{ color: "rgba(59,130,246,0.4)" }}>→</span>
          </motion.div>
        </Link>
      </div>

      {/* ── CITIZEN STATUS CARD ────────────────────────────────────── */}
      {user && rank && (
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ border: "1px solid hsl(var(--primary) / 0.19)", background: "hsl(var(--primary) / 0.03)",
              boxShadow: "0 0 40px hsl(var(--primary) / 0.06)" }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 flex items-center justify-center font-black text-sm"
                style={{ border: `2px solid ${rank.color}`, color: rank.color,
                  boxShadow: `0 0 20px ${rank.color}30` }}>
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-mono tracking-widest uppercase mb-0.5" style={{ color: "hsl(var(--primary) / 0.31)" }}>{s.citizenEmpire}</p>
                <p className="font-black text-lg uppercase tracking-wider" style={{ color: "hsl(var(--primary))" }}>{user.username}</p>
                <p className="text-xs font-bold font-mono" style={{ color: rank.color }}>{rank.label}</p>
                <div className="flex items-center gap-3 text-xs font-mono mt-1" style={{ color: "#ffffff40" }}>
                  <span>⚡ {formatNumber(user.xp, lang)} XP</span>
                  <span>◈ {formatNumber(user.balance, lang)} {s.coins}</span>
                  <span>⚔ {formatNumber(user.gamesPlayed, lang)} {s.battles}</span>
                  <span>♔ {formatNumber(user.wins, lang)} {s.victories}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/growth">
                <button className="h-9 px-4 text-xs font-black uppercase tracking-wider"
                  style={{ border: "1px solid rgba(139,92,246,0.4)", color: "rgba(139,92,246,0.9)",
                    background: "rgba(139,92,246,0.08)" }}>
                  🧠 NLP
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="h-9 px-4 text-xs font-black uppercase tracking-wider"
                  style={{ border: "1px solid hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
                    background: "linear-gradient(135deg, hsl(var(--primary)), #A67C2E)" }}>
                  {t("dashboard")} →
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── IMPERIAL FOOTER ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="py-8 text-center space-y-4 imperial-decree"
      >
        <div className="flex justify-center gap-3 text-xl">🌍 🇬🇧 🇫🇷 🇸🇦 🇲🇦</div>
        <p className="text-xs font-mono" style={{ color: "#ffffff30" }}>
          <span className="imperial-gold font-black">ARENA QAISYPRO</span> · {t("hub_footer")}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {["Arabic", "English", "Français", "Darija", "Español", "中文", "Русский", "Português"].map(l => (
            <span key={l} className="text-xs px-2 py-0.5 font-mono"
              style={{ border: "1px solid hsl(var(--primary) / 0.08)", color: "#ffffff20" }}>{l}</span>
          ))}
        </div>
        <p className="text-xs font-mono tracking-[0.4em] uppercase" style={{ color: "hsl(var(--primary) / 0.15)" }}>
          ◈ · {s.sovereignty} · ◈
        </p>
      </motion.div>

    </div>
  );
}
