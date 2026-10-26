import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, Zap, ArrowLeft, Trophy, X, Clock } from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import GameWarning from "@/components/GameWarning";
import { useLang } from "@/contexts/LangContext";
import { gameText } from "@/i18n/game-chrome";
import { gameLocaleText, localeForLang } from "@/i18n/game-locale-copy";
import { finalLabelText } from "@/i18n/final-labels-copy";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const COLOR = "#a855f7";

type Phase = "intro" | "playing" | "result";
interface Result { win: boolean; coinsEarned: number; xpEarned: number; newBalance: number; newXp: number; }

// 8 pairs of crypto symbols
const SYMBOLS = ["₿", "Ξ", "◎", "Ł", "Ð", "✕", "⬡", "Ω"];

interface CardState {
  id: number;
  symbol: string;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildDeck(): CardState[] {
  const pairs = shuffle([...SYMBOLS, ...SYMBOLS]);
  return pairs.map((symbol, i) => ({ id: i, symbol, flipped: false, matched: false }));
}

const SYMBOL_COLORS: Record<string, string> = {
  "₿": "#f7931a", "Ξ": "#627eea", "◎": "#9945ff", "Ł": "#345d9d",
  "Ð": "#c2a633", "✕": "#000", "⬡": "#29b6af", "Ω": "#ff6b6b",
};

const TIME_LIMIT = 60;

export default function CryptoClashGame() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const { lang } = useLang();
  const t = (key: Parameters<typeof gameText>[1], values?: Record<string, string | number>) => gameText(lang, key, values);

  const [phase, setPhase] = useState<Phase>("intro");
  const [deck, setDeck] = useState<CardState[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [moves, setMoves] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id);
          submitResult(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Check win
  useEffect(() => {
    if (phase !== "playing") return;
    if (deck.length > 0 && deck.every(c => c.matched)) {
      submitResult(true);
    }
  }, [deck, phase]);

  // Check pairs
  useEffect(() => {
    if (selected.length !== 2) return;
    setLocked(true);
    setMoves(m => m + 1);
    const [a, b] = selected;
    if (deck[a].symbol === deck[b].symbol) {
      // Match!
      setTimeout(() => {
        setDeck(d => d.map((c, i) => i === a || i === b ? { ...c, matched: true } : c));
        setSelected([]);
        setLocked(false);
      }, 400);
    } else {
      // No match — flip back
      setTimeout(() => {
        setDeck(d => d.map((c, i) => i === a || i === b ? { ...c, flipped: false } : c));
        setSelected([]);
        setLocked(false);
      }, 800);
    }
  }, [selected]);

  const startGame = useCallback(() => {
    setDeck(buildDeck());
    setSelected([]);
    setLocked(false);
    setTimeLeft(TIME_LIMIT);
    setMoves(0);
    setResult(null);
    setError("");
    setPhase("playing");
  }, []);

  const flipCard = useCallback((idx: number) => {
    if (locked) return;
    if (deck[idx].flipped || deck[idx].matched) return;
    if (selected.length >= 2) return;
    setDeck(d => d.map((c, i) => i === idx ? { ...c, flipped: true } : c));
    setSelected(s => [...s, idx]);
  }, [locked, deck, selected]);

  const submitResult = async (won: boolean) => {
    setPhase("result");
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/games/crypto-clash/play`, {
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
        const updated = [{ game: finalLabelText(lang, "cryptoClash"), win: data.win, coins: data.coinsEarned, xp: data.xpEarned, time: new Date().toISOString() }, ...stored].slice(0, 20);
        localStorage.setItem("gdna_recent_matches", JSON.stringify(updated));
      } catch { /* ignore */ }
    } catch (e: unknown) {
      setError((e as Error).message ?? t("recording"));
    } finally {
      setSubmitting(false);
    }
  };

  const matched = deck.filter(c => c.matched).length / 2;
  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft > 30 ? COLOR : timeLeft > 10 ? "#f97316" : "#ef4444";

  return (
    <div className="min-h-screen bg-black flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"} style={{ background: "radial-gradient(ellipse at top, #1a0030 0%, #000 60%)" }}>
      {/* Back bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-purple-500/10">
        <button onClick={() => setLocation("/games")} className="flex items-center gap-2 text-purple-400/60 hover:text-purple-400 transition-colors font-mono text-xs tracking-wider">
          <ArrowLeft className="w-4 h-4" /> {t("backArena")}
        </button>
        <div className="flex-1" />
        <div className="font-mono text-xs text-purple-400/40 tracking-[0.3em]">{finalLabelText(lang, "cryptoClash")}</div>
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
                <div className="font-mono text-xs tracking-[0.5em] text-purple-400/40">{t("memoryDuel")}</div>
                <h1 className="font-black text-5xl tracking-widest uppercase" style={{ color: COLOR, textShadow: `0 0 40px ${COLOR}60` }}>
                   {finalLabelText(lang, "cryptoClash")}
                </h1>
                <p className="text-white/40 font-mono text-sm leading-relaxed">
                  {t("cryptoInstructions").split("|").map((line, i) => <span key={line}>{line}{i === 0 && <br />}</span>)}
                </p>
              </div>

              {/* Preview grid */}
              <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
                {["₿","Ξ","◎","Ł"].map((s,i) => (
                  <motion.div key={i} animate={{ rotateY: [0, 180, 360] }} transition={{ delay: i * 0.2, duration: 1.5, repeat: Infinity, repeatDelay: 1.5 }}
                    className="aspect-square border border-purple-500/30 flex items-center justify-center text-2xl font-black rounded"
                    style={{ background: "#1a0030", color: SYMBOL_COLORS[s] }}>
                    {s}
                  </motion.div>
                ))}
              </div>

              <div className="space-y-2 font-mono text-xs text-white/30">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>{t("allMatched")}</span><span className="text-green-400">{t("win")}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("timeRunsOut")}</span><span className="text-red-400">{t("defeat")}</span>
                </div>
              </div>

              <Button onClick={startGame}
                className="w-full h-14 font-mono font-black text-lg tracking-[0.3em] border text-purple-400 bg-transparent hover:text-black transition-all"
                style={{ borderColor: COLOR, ["--tw-bg-opacity" as string]: "1" }}
                onMouseEnter={e => (e.currentTarget.style.background = COLOR)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                {t("startDuel")}
              </Button>
            </motion.div>
          )}

          {/* ── PLAYING ───────────────────────────── */}
          {phase === "playing" && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full max-w-sm space-y-4">
              {/* HUD */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 font-mono text-xs" style={{ color: timerColor }}>
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-black text-lg w-8 text-right">{timeLeft.toLocaleString(localeForLang[lang])}</span>
                </div>
                <div className="flex-1 h-1.5 bg-white/5 rounded overflow-hidden">
                  <motion.div className="h-full rounded" style={{ background: timerColor }}
                    animate={{ width: `${timerPct}%` }} transition={{ duration: 0.5 }} />
                </div>
                <div className="font-mono text-xs text-white/30">
                    {matched.toLocaleString(localeForLang[lang])}/{(8).toLocaleString(localeForLang[lang])} <span className="text-white/20">{t("pairs")}</span>
                </div>
              </div>

              {/* Card grid */}
              <div className="grid grid-cols-4 gap-2">
                {deck.map((card, idx) => (
                  <motion.button
                    key={card.id}
                    onClick={() => flipCard(idx)}
                     aria-label={gameLocaleText(lang, "flipCard", { n: (idx + 1).toLocaleString(localeForLang[lang]) })}
                    whileTap={{ scale: 0.95 }}
                    className="aspect-square rounded border relative overflow-hidden"
                    style={{
                      borderColor: card.matched ? `${COLOR}60` : card.flipped ? `${COLOR}40` : "#ffffff10",
                      background: card.matched ? `${COLOR}10` : card.flipped ? "#1a0030" : "#0a0015",
                      cursor: card.matched || card.flipped ? "default" : "pointer",
                    }}>
                    <AnimatePresence>
                      {(card.flipped || card.matched) ? (
                        <motion.div key="front" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }}
                          className="absolute inset-0 flex items-center justify-center text-2xl md:text-3xl font-black">
                          <span style={{ color: card.matched ? SYMBOL_COLORS[card.symbol] : SYMBOL_COLORS[card.symbol] + "cc",
                            filter: card.matched ? `drop-shadow(0 0 8px ${SYMBOL_COLORS[card.symbol]})` : "none" }}>
                            {card.symbol}
                          </span>
                        </motion.div>
                      ) : (
                        <motion.div key="back" className="absolute inset-0 flex items-center justify-center">
                          <div className="w-4 h-4 border border-purple-500/20 rounded-sm"
                            style={{ background: "linear-gradient(135deg, #2a0040, #1a0030)" }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {card.matched && (
                      <div className="absolute inset-0 rounded" style={{ boxShadow: `inset 0 0 12px ${COLOR}20` }} />
                    )}
                  </motion.button>
                ))}
              </div>

              <div className="text-center font-mono text-xs text-white/20">{t("moves")} {moves.toLocaleString(localeForLang[lang])}</div>
            </motion.div>
          )}

          {/* ── RESULT ────────────────────────────── */}
          {phase === "result" && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6 max-w-sm w-full">
              {submitting ? (
                <div className="font-mono text-purple-400 animate-pulse text-sm">{t("recording")}</div>
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
                    <div className="font-mono text-xs text-white/30">
                      {result.win
                        ? t("matchedWin", { moves: moves.toLocaleString(localeForLang[lang]) })
                        : t("matchedLose", { matched: matched.toLocaleString(localeForLang[lang]) })
                      }
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
                    <Button onClick={startGame}
                      className="flex-1 font-mono border text-purple-400 bg-transparent hover:text-black transition-all"
                      style={{ borderColor: COLOR }}
                      onMouseEnter={e => (e.currentTarget.style.background = COLOR)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                       {t("duelAgain")}
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
