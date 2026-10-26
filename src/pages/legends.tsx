import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Crown, Medal, Star, Zap, RefreshCw, ChevronRight, Brain } from "lucide-react";
import { LegendsListSkeleton } from "@/components/Skeleton";
import { getLegendImageUrl } from "@/lib/legend-images";
import { useLang } from "@/contexts/LangContext";
import { formatSurfaceDate, formatSurfaceNumber } from "@/i18n/locale-surfaces-b-copy";

interface Legend {
  id: number; name: string; domain: string; nationality: string;
  rank: number; score: number; imageUrl: string | null; peakYear: number | null;
  stats: { clutch: number; legacy: number; style: number; impact: number; peak: number } | null;
}

const DOMAIN_META_STYLE: Record<string, { key: string; color: string; glow: string; icon: string }> = {
  sport:    { key: "domain_sport",    color: "text-cyan-400",   glow: "shadow-cyan-500/30",   icon: "⚡" },
  tech:     { key: "domain_tech",     color: "text-purple-400", glow: "shadow-purple-500/30", icon: "🔮" },
  music:    { key: "domain_music",    color: "text-pink-400",   glow: "shadow-pink-500/30",   icon: "🎵" },
  business: { key: "domain_business", color: "text-green-400",  glow: "shadow-green-500/30",  icon: "💎" },
  cinema:   { key: "domain_cinema",   color: "text-orange-400", glow: "shadow-orange-500/30", icon: "🎬" },
};

function RankBadge({ rank }: { rank: number }) {
  const { lang } = useLang();
  if (rank === 1) return <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/40"><Crown className="w-5 h-5 text-black" /></div>;
  if (rank === 2) return <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center"><Medal className="w-5 h-5 text-black" /></div>;
  if (rank === 3) return <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-700 flex items-center justify-center"><Medal className="w-5 h-5 text-black" /></div>;
  return <div className="w-10 h-10 rounded-full bg-card border border-primary/20 flex items-center justify-center text-muted-foreground font-bold text-sm">#{formatSurfaceNumber(lang, rank)}</div>;
}

function ScoreBar({ value, max = 10000 }: { value: number; max?: number }) {
  const { lang } = useLang();
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-primary to-yellow-400 rounded-full"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </div>
      <span className="text-xs text-primary font-bold w-12 text-right">{formatSurfaceNumber(lang, value)}</span>
    </div>
  );
}

export default function LegendsPage() {
  const { t, lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [legends, setLegends] = useState<Legend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetch("/api/legends", { credentials: "include" });
      const data = await res.json() as { legends: Legend[] };
      setLegends(data.legends ?? []);
      setLastUpdate(new Date());
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(false); }, [load]);
  useEffect(() => {
    const t = setInterval(() => void load(true), 30_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-b from-black via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(201,168,76,0.15),transparent_70%)]" />
        <div className="relative max-w-5xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-bold tracking-widest mb-6">
            <Brain className="w-3.5 h-3.5" /> {t("legends_engine_badge")}
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
             <span className="text-foreground">{t("legends_title_top")} </span>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-600">{t("legends_title_legends")}</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {t("legends_ai_ranked")}
          </p>
          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-primary" /> {t("legends_auto_updates")}</div>
            {lastUpdate && <div className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors" onClick={() => void load(true)}>
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin text-primary" : ""}`} />
               {t("legends_last")} {formatSurfaceDate(lang, lastUpdate, { timeStyle: "medium" })}
            </div>}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <LegendsListSkeleton />
        ) : (
          <div className="space-y-3">
            {legends.map((legend, idx) => {
              const metaStyle = DOMAIN_META_STYLE[legend.domain] ?? DOMAIN_META_STYLE.sport;
              const meta = { ...metaStyle, label: t(metaStyle.key).toUpperCase() };
              const imageUrl = getLegendImageUrl(legend.name, legend.imageUrl);
              const topStats = legend.stats
                ? Math.round((Object.values(legend.stats).reduce((a, b) => a + b, 0) / Object.values(legend.stats).length))
                : 0;
              return (
                <motion.div key={legend.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}>
                  <Link href={`/legends/${legend.id}`}>
                    <div className={`group flex items-center gap-4 p-4 rounded-xl border bg-card/60 hover:bg-card transition-all cursor-pointer ${
                      legend.rank === 1 ? "border-yellow-400/40 shadow-lg shadow-yellow-400/10" :
                      legend.rank <= 3 ? "border-primary/30" : "border-border/50 hover:border-primary/30"
                    }`}>
                      {/* Rank */}
                      <RankBadge rank={legend.rank} />

                      {/* Avatar */}
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                        {imageUrl ? (
                          <img src={imageUrl} alt={legend.name}
                            className="w-full h-full object-cover object-top" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-xl font-black ${meta.color}`}>
                            {legend.name.charAt(0)}
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-[9px] font-bold text-white py-0.5">
                          {meta.icon} {meta.label}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-foreground text-base truncate">{legend.name}</span>
                          {legend.rank === 1 && <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold">{t("legends_champion")}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                           {legend.nationality} · {t("legends_peak")} {legend.peakYear === null ? "—" : formatSurfaceNumber(lang, legend.peakYear, { useGrouping: false })}
                        </div>
                        <ScoreBar value={legend.score} />
                      </div>

                      {/* Avg stat */}
                      <div className="hidden sm:flex flex-col items-center shrink-0">
                         <span className={`text-2xl font-black ${meta.color}`}>{formatSurfaceNumber(lang, topStats)}</span>
                        <span className="text-[10px] text-muted-foreground">{t("legends_avg_stat")}</span>
                      </div>

                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Domain legend */}
        <div className="mt-10 flex flex-wrap gap-3 justify-center">
          {Object.entries(DOMAIN_META_STYLE).map(([key, metaStyle]) => {
            const meta = { ...metaStyle, label: t(metaStyle.key).toUpperCase() };
            return (
              <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/50 text-xs">
                <span>{meta.icon}</span>
                <span className={meta.color}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
