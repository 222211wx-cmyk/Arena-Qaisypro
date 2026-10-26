import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, Zap, ArrowLeft, Trophy, X, Crosshair } from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import GameWarning from "@/components/GameWarning";
import { useLang } from "@/contexts/LangContext";
import { gameText } from "@/i18n/game-chrome";
import { gameLocaleText, localeForLang } from "@/i18n/game-locale-copy";
import { finalLabelText } from "@/i18n/final-labels-copy";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const COLOR = "#f97316";

type Phase = "intro" | "countdown" | "playing" | "result";
interface Result { win: boolean; coinsEarned: number; xpEarned: number; newBalance: number; newXp: number; }

interface Target {
  id: number;
  x: number; // percentage
  y: number;
  size: number; // px
  lifetime: number; // ms
  born: number;
  hit: boolean;
}

const GAME_DURATION = 30; // seconds
const WIN_SCORE = 15;
const SPAWN_INTERVAL = 900; // ms between spawns

export default function ArenaStrikeGame() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const { lang } = useLang();
  const t = (key: Parameters<typeof gameText>[1], values?: Record<string, string | number>) => gameText(lang, key, values);

  const [phase, setPhase] = useState<Phase>("intro");
  const [countdown, setCountdown] = useState(3);
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hitFlashes, setHitFlashes] = useState<{ id: number; x: number; y: number }[]>([]);

  const idRef = useRef(0);
  const scoreRef = useRef(0);
  const arenaRef = useRef<HTMLDivElement>(null);

  // Sync score to ref for async callbacks
  useEffect(() => { scoreRef.current = score; }, [score]);

  const spawnTarget = useCallback(() => {
    const size = 44 + Math.random() * 28; // 44–72px
    const margin = 8;
    const x = margin + Math.random() * (100 - margin * 2);
    const y = margin + Math.random() * (100 - margin * 2);
    const lifetime = 1200 + Math.random() * 1200; // 1.2s–2.4s
    setTargets(prev => [
      ...prev.filter(t => !t.hit && Date.now() - t.born < t.lifetime),
      { id: idRef.current++, x, y, size, lifetime, born: Date.now(), hit: false },
    ]);
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(3);
    setScore(0);
    setMissed(0);
    setTargets([]);
    setTimeLeft(GAME_DURATION);
    setResult(null);
    setError("");
    setPhase("countdown");
    let c = 3;
    const id = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(id);
        setPhase("playing");
      }
    }, 1000);
  }, []);

  // Spawn loop
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(spawnTarget, SPAWN_INTERVAL);
    spawnTarget(); // spawn immediately
    return () => clearInterval(id);
  }, [phase, spawnTarget]);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Expire targets that weren't hit
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      const now = Date.now();
      setTargets(prev => {
        const expired = prev.filter(t => !t.hit && now - t.born >= t.lifetime);
        if (expired.length > 0) setMissed(m => m + expired.length);
        return prev.filter(t => t.hit || now - t.born < t.lifetime);
      });
    }, 200);
    return () => clearInterval(id);
  }, [phase]);

  // End game when time runs out
  useEffect(() => {
    if (phase === "playing" && timeLeft === 0) {
      submitResult(scoreRef.current >= WIN_SCORE);
    }
  }, [timeLeft, phase]);

  const hitTarget = useCallback((id: number, x: number, y: number) => {
    setTargets(prev => prev.map(t => t.id === id ? { ...t, hit: true } : t));
    setScore(s => s + 1);
    const flashId = Date.now();
    setHitFlashes(f => [...f, { id: flashId, x, y }]);
    setTimeout(() => setHitFlashes(f => f.filter(fl => fl.id !== flashId)), 400);
  }, []);

  const submitResult = async (won: boolean) => {
    setPhase("result");
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/games/arena-strike/play`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ win: won }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? gameLocaleText(lang, "failed"));
      setResult(data); // server records and returns the win we sent
      if (user) await refreshUser();
      try {
        const stored = JSON.parse(localStorage.getItem("gdna_recent_matches") ?? "[]");
        const updated = [{ game: finalLabelText(lang, "arenaStrike"), win: data.win, coins: data.coinsEarned, xp: data.xpEarned, time: new Date().toISOString() }, ...stored].slice(0, 20);
        localStorage.setItem("gdna_recent_matches", JSON.stringify(updated));
      } catch { /* ignore */ }
    } catch (e: unknown) {
      setError((e as Error).message ?? t("reporting"));
    } finally {
      setSubmitting(false);
    }
  };

  const timerPct = (timeLeft / GAME_DURATION) * 100;
  const timerColor = timeLeft > 15 ? COLOR : timeLeft > 7 ? "#f97316" : "#ef4444";

  return (
    <div className="min-h-screen bg-black flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"} style={{ background: "radial-gradient(ellipse at top, #1a0800 0%, #000 60%)" }}>
      {/* Back bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-orange-500/10">
        <button onClick={() => setLocation("/games")} className="flex items-center gap-2 text-orange-400/60 hover:text-orange-400 transition-colors font-mono text-xs tracking-wider">
          <ArrowLeft className="w-4 h-4" /> {t("backArena")}
        </button>
        <div className="flex-1" />
        <div className="font-mono text-xs text-orange-400/40 tracking-[0.3em]">{finalLabelText(lang, "arenaStrike")}</div>
      </div>

      <div className="px-4 pt-4">
        <GameWarning />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">

          {/* ── INTRO ─────────────────────────────── */}
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-center space-y-8 max-w-md w-full">
              <div className="space-y-3">
                <div className="font-mono text-xs tracking-[0.5em] text-orange-400/40">{t("targetElimination")}</div>
                <h1 className="font-black text-5xl tracking-widest uppercase" style={{ color: COLOR, textShadow: `0 0 40px ${COLOR}60` }}>
                   {finalLabelText(lang, "arenaStrike")}
                </h1>
                <p className="text-white/40 font-mono text-sm leading-relaxed">
                  {t("strikeInstructions", {
                    score: WIN_SCORE.toLocaleString(localeForLang[lang]),
                    seconds: GAME_DURATION.toLocaleString(localeForLang[lang]),
                  }).split("|").map((line, i) => <span key={line}>{line}{i === 0 && <br />}</span>)}
                </p>
              </div>

              {/* Demo target */}
              <div className="relative h-40 border border-orange-500/20 rounded-lg overflow-hidden"
                style={{ background: "#0a0500" }}>
                <motion.div
                  animate={{ x: ["20%", "60%", "40%", "70%", "30%"], y: ["20%", "50%", "70%", "30%", "60%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute"
                  style={{ transform: "translate(-50%, -50%)" }}>
                  <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-14 h-14 rounded-full border-2 border-orange-400 flex items-center justify-center"
                    style={{ background: "radial-gradient(circle, #f9731620, transparent)", boxShadow: `0 0 20px ${COLOR}40` }}>
                    <Crosshair className="w-6 h-6" style={{ color: COLOR }} />
                  </motion.div>
                </motion.div>
                <div className="absolute bottom-2 right-3 font-mono text-xs text-white/20">{t("demo")}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="border border-white/10 p-3">
                  <div className="text-white/30 mb-1">{t("winCondition")}</div>
                  <div style={{ color: COLOR }} className="font-black">≥ {WIN_SCORE.toLocaleString(localeForLang[lang])} {t("hits")}</div>
                </div>
                <div className="border border-white/10 p-3">
                  <div className="text-white/30 mb-1">{t("timeLimit")}</div>
                  <div style={{ color: COLOR }} className="font-black">{GAME_DURATION.toLocaleString(localeForLang[lang])} {t("seconds")}</div>
                </div>
              </div>

              <Button onClick={startCountdown}
                className="w-full h-14 font-mono font-black text-lg tracking-[0.3em] border text-orange-400 bg-transparent hover:bg-orange-500 hover:text-black transition-all"
                style={{ borderColor: COLOR }}>
                {t("enterArena")}
              </Button>
            </motion.div>
          )}

          {/* ── COUNTDOWN ─────────────────────────── */}
          {phase === "countdown" && (
            <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center space-y-4">
              <div className="font-mono text-xs tracking-[0.5em] text-orange-400/40">{t("deploying")}</div>
              <AnimatePresence mode="wait">
                <motion.div key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="font-black text-9xl" style={{ color: COLOR, textShadow: `0 0 60px ${COLOR}` }}>
                  {countdown.toLocaleString(localeForLang[lang])}
                </motion.div>
              </AnimatePresence>
              <div className="font-mono text-white/20 text-sm">{t("prepare")}</div>
            </motion.div>
          )}

          {/* ── PLAYING ───────────────────────────── */}
          {phase === "playing" && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full max-w-lg space-y-3">
              {/* HUD */}
              <div className="flex items-center gap-4">
                <div className="font-mono font-black text-lg" style={{ color: COLOR }}>{score.toLocaleString(localeForLang[lang])}</div>
                 <div className="font-mono text-xs text-white/30">/{WIN_SCORE.toLocaleString(localeForLang[lang])} {t("hits")}</div>
                <div className="flex-1 h-1.5 bg-white/5 rounded overflow-hidden">
                  <motion.div className="h-full rounded" style={{ background: timerColor }}
                    animate={{ width: `${timerPct}%` }} transition={{ duration: 0.5 }} />
                </div>
                <div className="font-mono font-black text-lg" style={{ color: timerColor }}>{timeLeft.toLocaleString(localeForLang[lang])}s</div>
              </div>

              {/* Arena */}
              <div ref={arenaRef}
                className="relative w-full rounded border border-orange-500/20 overflow-hidden"
                style={{ height: "clamp(280px, 55vw, 440px)", background: "radial-gradient(ellipse at center, #1a0800, #000500)", touchAction: "none" }}>

                {/* Grid lines */}
                {[25, 50, 75].map(p => (
                  <div key={p}>
                    <div className="absolute inset-y-0 border-l border-orange-500/5" style={{ left: `${p}%` }} />
                    <div className="absolute inset-x-0 border-t border-orange-500/5" style={{ top: `${p}%` }} />
                  </div>
                ))}

                {/* Targets */}
                {targets.filter(t => !t.hit).map(target => {
                  const age = Date.now() - target.born;
                  const lifePct = age / target.lifetime;
                  const urgentColor = lifePct > 0.7 ? "#ef4444" : lifePct > 0.4 ? "#f97316" : COLOR;
                  return (
                    <motion.button
                      key={target.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 - lifePct * 0.3 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => hitTarget(target.id, target.x, target.y)}
                       aria-label={gameLocaleText(lang, "hitTarget")}
                      onTouchStart={e => { e.preventDefault(); hitTarget(target.id, target.x, target.y); }}
                      className="absolute rounded-full border-2 flex items-center justify-center cursor-crosshair"
                      style={{
                        left: `${target.x}%`,
                        top: `${target.y}%`,
                        width: target.size,
                        height: target.size,
                        transform: "translate(-50%, -50%)",
                        borderColor: urgentColor,
                        background: `radial-gradient(circle, ${urgentColor}15, transparent)`,
                        boxShadow: `0 0 ${12 + lifePct * 8}px ${urgentColor}${Math.round(40 + lifePct * 30).toString(16)}`,
                      }}>
                      <Crosshair className="w-1/2 h-1/2" style={{ color: urgentColor, opacity: 0.8 }} />
                    </motion.button>
                  );
                })}

                {/* Hit flashes */}
                {hitFlashes.map(flash => (
                  <motion.div key={flash.id}
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="absolute pointer-events-none font-mono font-black text-sm"
                    style={{ left: `${flash.x}%`, top: `${flash.y}%`, transform: "translate(-50%,-50%)", color: COLOR }}>
                    +{(1).toLocaleString(localeForLang[lang])}
                  </motion.div>
                ))}

                {/* Score overlay */}
                <div className="absolute top-2 right-3 font-mono text-xs text-white/20">
                   {t("missed")} {missed.toLocaleString(localeForLang[lang])}
                </div>
              </div>

              <div className="text-center font-mono text-xs text-white/20">
                  {score >= WIN_SCORE ? t("secured") : t("moreHits", { count: (WIN_SCORE - score).toLocaleString(localeForLang[lang]) })}
              </div>
            </motion.div>
          )}

          {/* ── RESULT ────────────────────────────── */}
          {phase === "result" && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6 max-w-sm w-full">
              {submitting ? (
                <div className="font-mono text-orange-400 animate-pulse text-sm">{t("reporting")}</div>
              ) : error ? (
                <div className="space-y-4">
                  <div className="font-mono text-red-400 text-sm">{error}</div>
                  <Button onClick={() => setLocation("/games")} variant="outline">{t("back")}</Button>
                </div>
              ) : result ? (
                <>
                  <div className="space-y-3">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                      {result.win
                        ? <Trophy className="w-16 h-16 mx-auto" style={{ color: COLOR, filter: `drop-shadow(0 0 20px ${COLOR})` }} />
                        : <X className="w-16 h-16 mx-auto text-red-400" />
                      }
                    </motion.div>
                    <div className="font-black text-4xl tracking-widest" style={{ color: result.win ? COLOR : "#ef4444" }}>
                      {result.win ? t("victory") : t("defeat")}
                    </div>
                    <div className="font-mono text-xs text-white/40">
                       {t("score")} <span className="text-white font-bold">{score.toLocaleString(localeForLang[lang])}</span> {t("hits")} / {WIN_SCORE.toLocaleString(localeForLang[lang])} {t("required")}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="border p-4 text-center" style={{ borderColor: `${COLOR}40`, background: `${COLOR}08` }}>
                      <Coins className="w-5 h-5 mx-auto mb-1" style={{ color: COLOR }} />
                       <div className="font-mono font-black text-2xl" style={{ color: COLOR }}>+{result.coinsEarned.toLocaleString(localeForLang[lang])}</div>
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
                      className="flex-1 font-mono border text-orange-400 bg-transparent hover:bg-orange-500 hover:text-black transition-all"
                      style={{ borderColor: COLOR }}>
                       {t("strikeAgain")}
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
