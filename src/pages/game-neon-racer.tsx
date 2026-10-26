import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, Zap, ArrowLeft, Trophy, X, Zap as Lightning } from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import GameWarning from "@/components/GameWarning";
import { useLang } from "@/contexts/LangContext";
import { gameText } from "@/i18n/game-chrome";
import { gameLocaleText, localeForLang } from "@/i18n/game-locale-copy";
import { finalLabelText } from "@/i18n/final-labels-copy";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

type Phase = "intro" | "countdown" | "waiting" | "reacting" | "tooEarly" | "result";

interface Result { win: boolean; coinsEarned: number; xpEarned: number; newBalance: number; newXp: number; message: string; }

const NEON = "#00d4ff";

export default function NeonRacerGame() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const { lang } = useLang();
  const t = (key: Parameters<typeof gameText>[1], values?: Record<string, string | number>) => gameText(lang, key, values);

  const [phase, setPhase] = useState<Phase>("intro");
  const [countdown, setCountdown] = useState(3);
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [boostPos, setBoostPos] = useState({ x: 50, y: 50 });

  const startTimeRef = useRef<number>(0);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // cleanup on unmount
  useEffect(() => () => {
    if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    if (countRef.current) clearInterval(countRef.current);
  }, []);

  const startCountdown = useCallback(() => {
    setPhase("countdown");
    setCountdown(3);
    let c = 3;
    countRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countRef.current!);
        setPhase("waiting");
        // random delay 1s-3.5s before boost signal
        const delay = 1000 + Math.random() * 2500;
        // random boost position
        setBoostPos({ x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 });
        waitTimerRef.current = setTimeout(() => {
          startTimeRef.current = performance.now();
          setPhase("reacting");
        }, delay);
      }
    }, 1000);
  }, []);

  const handleBoost = useCallback(() => {
    if (phase === "waiting") {
      // Too early
      if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
      setPhase("tooEarly");
      return;
    }
    if (phase === "reacting") {
      const ms = Math.round(performance.now() - startTimeRef.current);
      setReactionMs(ms);
      submitResult(ms);
    }
  }, [phase]);

  const submitResult = async (ms: number) => {
    setSubmitting(true);
    const win = ms < 400;
    try {
      const res = await fetch(`${BASE}/api/games/neon-racer/play`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ win }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? gameLocaleText(lang, "failed"));
      setResult(data); // server now records and returns the win we sent
      if (user) await refreshUser();
      try {
        const stored = JSON.parse(localStorage.getItem("gdna_recent_matches") ?? "[]");
        const updated = [{ game: finalLabelText(lang, "neonRacer"), win: data.win, coins: data.coinsEarned, xp: data.xpEarned, time: new Date().toISOString() }, ...stored].slice(0, 20);
        localStorage.setItem("gdna_recent_matches", JSON.stringify(updated));
      } catch { /* ignore */ }
    } catch (e: unknown) {
      setError((e as Error).message ?? t("submitting"));
    } finally {
      setSubmitting(false);
      setPhase("result");
    }
  };

  const rating = reactionMs == null ? null
    : reactionMs < 200 ? { label: t("lightning"), color: "#ffdd00" }
    : reactionMs < 300 ? { label: t("blazing"), color: NEON }
    : reactionMs < 400 ? { label: t("fast"), color: "#a3e635" }
    : reactionMs < 550 ? { label: t("slow"), color: "#f97316" }
    : { label: t("tooSlow"), color: "#ef4444" };

  return (
    <div className="min-h-screen bg-black flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"} style={{ background: "radial-gradient(ellipse at top, #001a2e 0%, #000 60%)" }}>
      {/* Back bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-cyan-500/10">
        <button onClick={() => setLocation("/games")} className="flex items-center gap-2 text-cyan-400/60 hover:text-cyan-400 transition-colors font-mono text-xs tracking-wider">
          <ArrowLeft className="w-4 h-4" /> {t("backArena")}
        </button>
        <div className="flex-1" />
        <div className="font-mono text-xs text-cyan-400/40 tracking-[0.3em]">{finalLabelText(lang, "neonRacer")}</div>
      </div>

      <div className="px-4 pt-4">
        <GameWarning />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 select-none">
        <AnimatePresence mode="wait">

          {/* ── INTRO ─────────────────────────────── */}
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-center space-y-8 max-w-md w-full">
              <div className="space-y-3">
                <div className="font-mono text-xs tracking-[0.5em] text-cyan-400/40">{t("reactionChallenge")}</div>
                <h1 className="font-black text-5xl tracking-widest uppercase" style={{ color: NEON, textShadow: `0 0 40px ${NEON}60` }}>
                  {finalLabelText(lang, "neonRacer")}
                </h1>
                <p className="text-white/40 font-mono text-sm">
                  {t("neonInstructions").split("|").map((line, i) => <span key={line}>{line}{i === 0 && <br />}</span>)}
                </p>
              </div>

              {/* Preview track */}
              <div className="relative h-32 border border-cyan-500/20 overflow-hidden rounded-lg"
                style={{ background: "linear-gradient(135deg, #001020 0%, #000510 100%)" }}>
                {/* Road lanes */}
                {[25, 50, 75].map(p => (
                  <div key={p} className="absolute inset-y-0 border-l border-cyan-500/10" style={{ left: `${p}%` }} />
                ))}
                {/* Animated car */}
                <motion.div animate={{ x: ["-10%", "110%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute top-1/2 -translate-y-1/2 text-2xl">🏎️</motion.div>
                {/* Glow line */}
                <motion.div animate={{ scaleX: [0, 1], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }}
                  className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${NEON}, transparent)` }} />
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                  {[
                    { limit: 200, label: t("lightning"), color: "#ffdd00" },
                    { limit: 300, label: t("blazing"), color: NEON },
                    { limit: 400, label: t("fast"), color: "#a3e635" },
                  ].map(({ limit, label, color }) => (
                    <div key={label} className="border border-white/10 p-2 text-center">
                       <div style={{ color }}>{`< ${limit.toLocaleString(localeForLang[lang])}ms`}</div>
                      <div className="text-white/30 text-[10px]">{label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-white/20 font-mono text-xs">≥ {(400).toLocaleString(localeForLang[lang])}ms = {t("defeat")}</p>
              </div>

              <Button onClick={startCountdown}
                className="w-full h-14 font-mono font-black text-lg tracking-[0.3em] border border-cyan-500 text-cyan-400 bg-transparent hover:bg-cyan-500 hover:text-black transition-all">
                {t("startRace")}
              </Button>
            </motion.div>
          )}

          {/* ── COUNTDOWN ─────────────────────────── */}
          {phase === "countdown" && (
            <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center space-y-6">
              <div className="font-mono text-xs tracking-[0.5em] text-cyan-400/40">{t("getReady")}</div>
              <AnimatePresence mode="wait">
                <motion.div key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="font-black text-9xl" style={{ color: NEON, textShadow: `0 0 60px ${NEON}` }}>
                  {countdown.toLocaleString(localeForLang[lang])}
                </motion.div>
              </AnimatePresence>
              <div className="font-mono text-white/20 text-sm">{t("doNotClick")}</div>
            </motion.div>
          )}

          {/* ── WAITING ───────────────────────────── */}
          {phase === "waiting" && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full h-[60vh] relative cursor-pointer" onClick={handleBoost}
              role="button" tabIndex={0} aria-label={gameLocaleText(lang, "boostAction")}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleBoost(); }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                {/* Road animation */}
                <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }}
                  className="font-mono text-white/40 text-sm tracking-widest">{t("waitBoost")}</motion.div>
                <div className="relative w-64 h-32 border border-white/5 overflow-hidden rounded"
                  style={{ background: "#000810" }}>
                  <motion.div animate={{ x: ["-10%", "110%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 -translate-y-1/2 text-3xl">🏎️</motion.div>
                  <motion.div animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: `linear-gradient(90deg, transparent, ${NEON}40, transparent)` }} />
                </div>
                <div className="font-mono text-xs text-white/20">{t("tapBoost")}</div>
              </div>
            </motion.div>
          )}

          {/* ── REACTING ──────────────────────────── */}
          {phase === "reacting" && (
            <motion.div key="reacting" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full h-[60vh] relative cursor-pointer flex items-center justify-center"
              onClick={handleBoost} role="button" tabIndex={0} aria-label={gameLocaleText(lang, "boostAction")}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleBoost(); }}>
              <motion.div
                animate={{ scale: [1, 1.05, 1], boxShadow: [`0 0 60px ${NEON}60`, `0 0 100px ${NEON}90`, `0 0 60px ${NEON}60`] }}
                transition={{ repeat: Infinity, duration: 0.4 }}
                className="w-56 h-56 md:w-72 md:h-72 rounded-full flex flex-col items-center justify-center border-4 cursor-pointer"
                style={{ borderColor: NEON, background: `radial-gradient(circle, ${NEON}20 0%, transparent 70%)` }}>
                <Lightning className="w-16 h-16 mb-2" style={{ color: NEON, filter: `drop-shadow(0 0 20px ${NEON})` }} />
                <div className="font-black text-4xl tracking-[0.3em]" style={{ color: NEON, textShadow: `0 0 30px ${NEON}` }}>
                  {t("boost")}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── TOO EARLY ─────────────────────────── */}
          {phase === "tooEarly" && (
            <motion.div key="early" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="text-center space-y-8">
              <div className="text-red-400 text-7xl font-black font-mono">{t("falseStart").split("|").map((line, i) => <span key={line}>{line}{i === 0 && <br />}</span>)}</div>
              <p className="text-white/40 font-mono text-sm">{t("early")}</p>
              <Button onClick={startCountdown}
                className="font-mono border border-red-400/50 text-red-400 bg-transparent hover:bg-red-400/10">
                {t("tryAgain")}
              </Button>
            </motion.div>
          )}

          {/* ── RESULT ────────────────────────────── */}
          {phase === "result" && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6 max-w-sm w-full">
              {submitting ? (
                <div className="font-mono text-cyan-400 animate-pulse text-sm">{t("submitting")}</div>
              ) : error ? (
                <div className="space-y-4">
                  <div className="font-mono text-red-400 text-sm">{error}</div>
                  <Button onClick={() => setLocation("/games")} variant="outline">{t("back")}</Button>
                </div>
              ) : result ? (
                <>
                  <div className="space-y-2">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                      {result.win
                        ? <Trophy className="w-16 h-16 mx-auto" style={{ color: NEON, filter: `drop-shadow(0 0 20px ${NEON})` }} />
                        : <X className="w-16 h-16 mx-auto text-red-400" />
                      }
                    </motion.div>
                    <div className="font-black text-4xl tracking-widest" style={{ color: result.win ? NEON : "#ef4444" }}>
                      {result.win ? t("victory") : t("defeat")}
                    </div>
                    {rating && (
                      <div className="font-mono text-sm font-black tracking-[0.3em]" style={{ color: rating.color }}>
                        {rating.label}
                      </div>
                    )}
                    {reactionMs != null && (
                      <div className="font-mono text-white/40 text-xs">
                         {t("reaction")} <span className="text-white font-bold">{reactionMs.toLocaleString(localeForLang[lang])}ms</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-cyan-500/30 p-4 text-center" style={{ background: "#00d4ff08" }}>
                      <Coins className="w-5 h-5 mx-auto mb-1" style={{ color: NEON }} />
                       <div className="font-mono font-black text-2xl" style={{ color: NEON }}>+{result.coinsEarned.toLocaleString(localeForLang[lang])}</div>
                       <div className="font-mono text-xs text-white/30">{t("coins")}</div>
                    </div>
                    <div className="border border-purple-400/30 p-4 text-center bg-purple-400/5">
                      <Zap className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                       <div className="font-mono font-black text-2xl text-purple-400">+{result.xpEarned.toLocaleString(localeForLang[lang])}</div>
                      <div className="font-mono text-xs text-white/30">{finalLabelText(lang, "xp")}</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={startCountdown}
                      className="flex-1 font-mono border border-cyan-500 text-cyan-400 bg-transparent hover:bg-cyan-500 hover:text-black">
                       {t("raceAgain")}
                    </Button>
                    <Button onClick={() => setLocation("/games")} variant="outline"
                      className="flex-1 font-mono border-white/20 text-white/50 hover:border-white/40">
                       {t("back")} →
                    </Button>
                  </div>
                </>
              ) : null}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
