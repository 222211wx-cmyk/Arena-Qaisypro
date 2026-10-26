import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Coins, Swords, Crown, Medal, RefreshCw, Wifi } from "lucide-react";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { useLang } from "@/contexts/LangContext";
import { task39Text } from "@/i18n/task39";
import { localeForLang } from "@/i18n/game-locale-copy";
import { finalLabelText } from "@/i18n/final-labels-copy";

interface LeaderboardPlayer {
  id: number;
  username: string;
  balance: number;
  wins: number;
  gamesPlayed: number;
  xp: number;
}

function RankBadge({ position, locale }: { position: number; locale: string }) {
  if (position === 1) return <Crown className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />;
  if (position === 2) return <Medal className="w-6 h-6 text-slate-300 drop-shadow-[0_0_8px_rgba(170,169,173,0.8)]" />;
  if (position === 3) return <Medal className="w-6 h-6 text-orange-400 drop-shadow-[0_0_8px_rgba(205,127,50,0.8)]" />;
  return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold text-sm">#{position.toLocaleString(locale)}</span>;
}

const rowColors: Record<number, string> = {
  1: "border-yellow-400/40 bg-yellow-400/5 shadow-[0_0_20px_rgba(255,215,0,0.05)]",
  2: "border-slate-300/40 bg-slate-300/5",
  3: "border-orange-400/40 bg-orange-400/5",
};

const REFRESH_INTERVAL = 30_000; // 30 seconds

export default function Leaderboard() {
  const { t, lang } = useLang();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const text = (key: Parameters<typeof task39Text>[1], values: Record<string, string | number> = {}) =>
    task39Text(lang, key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));

  const fetchLeaderboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const res = await fetch("/api/leaderboard", { credentials: "include" });
      const data = await res.json() as { players?: LeaderboardPlayer[] };
      setPlayers(data.players ?? []);
      setLastUpdated(new Date());
      setCountdown(REFRESH_INTERVAL / 1000);
    } catch {
      setError(task39Text(lang, "leaderboardFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang]);

  // Initial fetch
  useEffect(() => {
    void fetchLeaderboard(false);
  }, [fetchLeaderboard]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => void fetchLeaderboard(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // Countdown timer
  useEffect(() => {
    if (!lastUpdated) return;
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) return REFRESH_INTERVAL / 1000;
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 max-w-4xl mx-auto" dir={lang === "ar" ? "rtl" : "ltr"}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-wider neon-text-glow mb-3">
          {t("lb_title")}
        </h1>
        <p className="text-muted-foreground uppercase tracking-widest text-sm mb-3">{t("lb_sub")}</p>

        {/* Live indicator */}
        <div className="flex items-center justify-center gap-3 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3 text-green-400" />
            <span className="text-green-400">{task39Text(lang, "live")}</span>
          </span>
          <span>·</span>
          <button
            onClick={() => void fetchLeaderboard(true)}
            disabled={refreshing}
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin text-primary" : ""}`} />
            {refreshing ? task39Text(lang, "syncing") : text("refreshIn", { n: countdown.toLocaleString(localeForLang[lang]) })}
          </button>
          {lastUpdated && (
            <>
              <span>·</span>
             <span>{text("updated", { time: lastUpdated.toLocaleTimeString(localeForLang[lang]) })}</span>
            </>
          )}
        </div>
      </motion.div>

      {loading && (
        <div className="text-center text-primary animate-pulse text-xl uppercase tracking-widest mt-20 font-mono">
          {task39Text(lang, "neuralSync")}
        </div>
      )}
      {error && <div className="text-center text-destructive mt-20 font-mono">{error}</div>}

      {!loading && !error && players.length === 0 && (
        <div className="text-center mt-20">
          <Trophy className="w-16 h-16 text-primary/30 mx-auto mb-4" />
          <p className="text-muted-foreground uppercase tracking-widest">{task39Text(lang, "noPlayers")}</p>
        </div>
      )}

      {!loading && players.length > 0 && (
        <div className="space-y-3">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="col-span-1">{t("lb_rank")}</span>
            <span className="col-span-5">{t("lb_player")}</span>
            <span className="col-span-2 text-right">{finalLabelText(lang, "xp")}</span>
            <span className="col-span-2 text-right">{t("lb_wins")}</span>
            <span className="col-span-2 text-right">{t("coins")}</span>
          </div>

          <AnimatePresence>
            {players.map((player, index) => {
              const position = index + 1;
              const winRate = player.gamesPlayed > 0
                ? Math.round((player.wins / player.gamesPlayed) * 100)
                : 0;

              return (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.04, layout: { duration: 0.3 } }}
                  data-testid={`row-player-${player.id}`}
                >
                  <Card className={`border transition-all hover:scale-[1.01] duration-200 ${
                    rowColors[position] ?? "border-primary/10 bg-card/50"
                  }`}>
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 flex justify-center shrink-0">
                          <RankBadge position={position} locale={localeForLang[lang]} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg uppercase tracking-wide truncate" data-testid={`text-username-${player.id}`}>
                            {player.username}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
                            <span className="flex items-center gap-1">
                              <Swords className="w-3 h-3" />
                              {text("winsGames", {
                                wins: player.wins.toLocaleString(localeForLang[lang]),
                                games: player.gamesPlayed.toLocaleString(localeForLang[lang]),
                              })}
                            </span>
                            <span className="text-primary/70">{winRate.toLocaleString(localeForLang[lang])}% {finalLabelText(lang, "winRate")}</span>
                            <span>{player.xp.toLocaleString(localeForLang[lang])} {finalLabelText(lang, "xp")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Coins className="w-5 h-5 text-primary" />
                          <span className="text-xl font-black text-primary neon-text-glow" data-testid={`text-balance-${player.id}`}>
                            {player.balance.toLocaleString(localeForLang[lang])}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
