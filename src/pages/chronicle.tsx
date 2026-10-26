import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { useLang } from "@/contexts/LangContext";
import {
  useGetGsTraditions,
  useGetGsRanking,
  useGetGsNews,
  useGetGsFigures,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { task39Text } from "@/i18n/task39";
import { isArabic, techT, type TechCopyKey } from "@/i18n/tech-surfaces-copy";
import { formatSurfaceNumber, localeForSurfaceB } from "@/i18n/locale-surfaces-b-copy";
import {
  Landmark, Zap, BrainCircuit, MapPin, Calendar,
  TrendingUp, Vote, Gamepad2, ArrowRight, Clock,
  Star, Telescope, Cpu, Radio, Globe, Sparkles,
  Eye, Flame, Crown
} from "lucide-react";

// ── AI Future Predictions (static fallback only — real data fetched in component) ──
const PRED_META = [
  { icon: Vote,        color: "text-primary",    bar: "bg-primary" },
  { icon: Gamepad2,    color: "text-yellow-400", bar: "bg-yellow-400" },
  { icon: TrendingUp,  color: "text-green-400",  bar: "bg-green-400" },
  { icon: Globe,       color: "text-purple-400", bar: "bg-purple-400" },
  { icon: BrainCircuit,color: "text-orange-400", bar: "bg-orange-400" },
];

// ── Animated counter hook ─────────────────────────────────────────────────────
function useCounter(end: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);
  return { count, ref };
}

// ── Era Divider ───────────────────────────────────────────────────────────────
function EraDivider({ label, icon: Icon, color }: { label: string; icon: typeof Clock; color: string }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-current opacity-20" style={{ color: "hsl(var(--primary))" }} />
      <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border border-current/30 bg-current/5 ${color}`}>
        <Icon className="w-4 h-4" />
        <span className="font-black uppercase tracking-widest text-sm">{label}</span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-current opacity-20" style={{ color: "hsl(var(--primary))" }} />
    </div>
  );
}

interface ChronicleAiPredictions {
  q3_2026?: string;
  q4_2026?: string;
  q1_2027?: string;
  q2_2027?: string;
  oracle_quote?: string;
  confidence_score?: string;
}

export default function Chronicle() {
  const { t, lang } = useLang();
  const tx = (key: TechCopyKey) => techT(lang, key);
  const [tick, setTick] = useState(0);
  const [aiPredictions, setAiPredictions] = useState<ChronicleAiPredictions | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const quarterLabel = (quarter: number, year: number) =>
    `Q${formatSurfaceNumber(lang, quarter)} ${formatSurfaceNumber(lang, year, { useGrouping: false })}`;

  const { data: traditions, isLoading: tradLoading } = useGetGsTraditions();
  const { data: ranking } = useGetGsRanking();
  const { data: news }    = useGetGsNews();
  const { data: figures } = useGetGsFigures({ limit: 6 });

  const votesCounter   = useCounter(2_400_000, 2200);
  const gamesCounter   = useCounter(847_300, 1900);
  const usersCounter   = useCounter(156_000, 2000);

  // Pulse tick for live indicator
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 2000);
    return () => clearInterval(id);
  }, []);

  // Fetch real AI predictions
  useEffect(() => {
    setAiLoading(true);
    fetch(`${BASE}/api/chronicle/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang }),
    })
      .then(r => r.json())
      .then(d => setAiPredictions(d.predictions ?? null))
      .catch(() => setAiPredictions({
        q3_2026: t("chrono_pred_1"),
        q4_2026: t("chrono_pred_2"),
        q1_2027: t("chrono_pred_3"),
        q2_2027: t("chrono_pred_4"),
        oracle_quote: t("chrono_vision_desc"),
        confidence_score: "92",
      }))
      .finally(() => setAiLoading(false));
  }, [lang]);

  const topDomain  = ranking?.ranking?.[0];
  const topFigures = figures?.figures?.slice(0, 3) ?? [];
  const hotNews    = news?.articles?.slice(0, 2) ?? [];
  const heritages  = traditions?.traditions?.slice(0, 6) ?? [];

  return (
    <div dir={isArabic(lang) ? "rtl" : "ltr"} className="min-h-[calc(100vh-4rem)] max-w-6xl mx-auto px-4 py-10 space-y-14">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4 relative"
      >
        {/* ambient */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-yellow-400/5 rounded-full blur-[100px]" />
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-48 bg-purple-500/5 rounded-full blur-[80px]" />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5">
          <Clock className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span className="text-xs font-mono font-bold text-primary uppercase tracking-widest">
            {t("chrono_badge")}
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-tight">
          <span className="text-yellow-400" style={{ textShadow: "0 0 40px rgba(250,204,21,0.4)" }}>
            {t("chrono_past")}
          </span>
          <span className="text-muted-foreground mx-3 text-4xl md:text-5xl">·</span>
          <span className="neon-text-glow text-foreground">
            {t("chrono_present")}
          </span>
          <span className="text-muted-foreground mx-3 text-4xl md:text-5xl">·</span>
          <span className="text-purple-400" style={{ textShadow: "0 0 40px rgba(168,85,247,0.4)" }}>
            {t("chrono_future")}
          </span>
        </h1>

        <p className="text-muted-foreground text-sm uppercase tracking-widest max-w-2xl mx-auto">
          {t("chrono_sub")}
        </p>
      </motion.div>

      {/* ── VERTICAL TIMELINE SPINE ──────────────────────────────────────── */}
      <div className="relative space-y-14">
        {/* Spine line */}
        <div className="absolute left-[calc(50%-1px)] top-0 bottom-0 w-px bg-gradient-to-b from-yellow-400/30 via-primary/40 to-purple-400/30 hidden md:block pointer-events-none" />

        {/* ════════════════ PAST ERA ════════════════ */}
        <section className="space-y-8">
          <EraDivider label={t("chrono_past")} icon={Landmark} color="text-yellow-400" />

          <div className="grid md:grid-cols-2 gap-4 items-start">
            {/* Left: Heritage intro */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-gradient-to-br from-yellow-400/10 to-yellow-400/5 border-yellow-400/30 h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6 text-yellow-400" />
                    <h2 className="font-black uppercase tracking-wider text-yellow-400">{t("chrono_heritage_title")}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t("chrono_heritage_desc")}</p>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {(["archaeological", "cultural", "religious", "historical"] as const).map(tag => (
                      <span key={tag} className="text-xs px-2 py-1 rounded border border-yellow-400/20 text-yellow-400/80 font-mono bg-yellow-400/5 truncate">{task39Text(lang, tag)}</span>
                    ))}
                  </div>
                  <Link href="/games/globalstar/traditions">
                    <Button variant="outline" size="sm" className="border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 gap-2 w-full mt-2">
                      {t("chrono_explore_heritage")} <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Right: Heritage cards from API */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-3"
            >
              {tradLoading && [1,2,3].map(i => (
                <div key={i} className="h-16 rounded-xl bg-card/30 border border-yellow-400/10 animate-pulse" />
              ))}
              {heritages.slice(0, 3).map((item, i) => (
                <motion.div
                  key={item.id ?? i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.09 }}
                >
                  <Card className="bg-card/30 border-yellow-400/20 hover:border-yellow-400/50 transition-colors">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center shrink-0">
                        <Landmark className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {item.country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.country}</span>}
                          {item.period && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.period}</span>}
                        </div>
                      </div>
                      {item.isArchaeological && (
                        <Badge className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 text-xs shrink-0">⛏</Badge>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {heritages.length === 0 && !tradLoading && (
                <div className="grid grid-cols-1 gap-3">
                   {[
                     { name: tx("chronPyramid"), country: tx("chronEgypt"), period: tx("chronPyramidPeriod") },
                     { name: tx("chronAlhambra"), country: tx("chronSpain"), period: tx("chronAlhambraPeriod") },
                     { name: tx("chronPetra"), country: tx("chronJordan"), period: tx("chronPetraPeriod") },
                  ].map((h, i) => (
                    <Card key={i} className="bg-card/30 border-yellow-400/20">
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center shrink-0">
                          <Landmark className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{h.name}</p>
                          <p className="text-xs text-muted-foreground">{h.country} · {h.period}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Figures from history */}
          {topFigures.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-3 gap-3"
            >
              {topFigures.map((fig, i) => (
                <Card key={fig.id} className="bg-card/30 border-yellow-400/10 hover:border-yellow-400/30 transition-colors text-center">
                  <CardContent className="p-4 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mx-auto text-lg font-black text-yellow-400">
                      {fig.name?.charAt(0)}
                    </div>
                    <p className="font-bold text-xs truncate">{fig.name}</p>
                     <p className="text-xs text-muted-foreground font-mono">{formatSurfaceNumber(lang, fig.votes ?? 0)} {t("hub_votes")}</p>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}
        </section>

        {/* ════════════════ PRESENT ERA ════════════════ */}
        <section className="space-y-8">
          <EraDivider label={t("chrono_present")} icon={Radio} color="text-primary" />

          {/* Live counters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-3 gap-4"
          >
            {[
              { ...votesCounter,  icon: Vote,      label: t("hub_stat_votes"),  suffix: "", color: "text-primary" },
              { ...gamesCounter,  icon: Gamepad2,  label: t("hub_stat_games"),  suffix: "+", color: "text-yellow-400" },
              { ...usersCounter,  icon: Globe,     label: t("hub_stat_users"),  suffix: "+", color: "text-green-400" },
            ].map((s, i) => (
              <div key={i} ref={s.ref}>
                <Card className="bg-card/30 border-primary/20 text-center hover:border-primary/40 transition-colors">
                  <CardContent className="p-5">
                    <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
                    <p className={`text-2xl md:text-3xl font-black font-mono tabular-nums ${s.color}`}>
                       {new Intl.NumberFormat(localeForSurfaceB[lang], { notation: "compact", maximumFractionDigits: 1 }).format(s.count)}
                      {s.suffix}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Live Ranking */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="bg-card/30 border-primary/20 h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Vote className="w-5 h-5 text-primary" />
                      <h3 className="font-bold uppercase tracking-wider text-sm">{t("hub_gs_title")}</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full bg-green-400 ${tick % 2 === 0 ? "opacity-100" : "opacity-30"} transition-opacity`} />
                      <span className="text-xs font-mono text-green-400">{task39Text(lang, "live")}</span>
                    </div>
                  </div>
                  {(ranking?.ranking ?? []).slice(0, 5).map((domain, i) => (
                    <div key={domain.domain} className="flex items-center gap-3">
                      <span className="text-xl shrink-0">{domain.icon}</span>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{domain.domainLabel}</span>
                            <span className="text-primary font-mono">{formatSurfaceNumber(lang, (domain as any).totalVotes ?? 0)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${Math.min(100, ((domain as any).totalVotes ?? 0) / 10000)}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Link href="/games/globalstar">
                    <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/10 gap-1 mt-2">
                      {t("chrono_view_live")} <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Live News */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="bg-card/30 border-primary/20 h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <h3 className="font-bold uppercase tracking-wider text-sm">{t("hub_news_title")}</h3>
                  </div>
                  {hotNews.map((article, i) => (
                    <div key={article.id} className="space-y-1.5 pb-3 border-b border-border/30 last:border-0 last:pb-0">
                      {article.isBreaking && (
                        <Badge variant="destructive" className="text-xs px-2 py-0.5">{task39Text(lang, "breaking")}</Badge>
                      )}
                      <p className="font-semibold text-sm line-clamp-2">{article.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{article.summary}</p>
                      <p className="text-xs text-primary/60 font-mono">{article.source}</p>
                    </div>
                  ))}
                  {hotNews.length === 0 && (
                    <div className="space-y-3">
                       {[tx("chronNews1"), tx("chronNews2")].map((h, i) => (
                        <div key={i} className="pb-3 border-b border-border/30 last:border-0 last:pb-0">
                          <p className="font-semibold text-sm">{h}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link href="/news">
                    <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/10 gap-1 mt-2">
                      {t("hub_see_all")} <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* ════════════════ FUTURE ERA ════════════════ */}
        <section className="space-y-8">
          <EraDivider label={t("chrono_future")} icon={Telescope} color="text-purple-400" />

          {/* AI Prediction Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="bg-gradient-to-r from-purple-500/10 via-primary/5 to-purple-500/10 border-purple-400/30">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-400/20 border border-purple-400/30 flex items-center justify-center">
                    <BrainCircuit className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="font-black uppercase tracking-wider text-purple-400">{t("chrono_ai_title")}</h2>
                    <p className="text-xs text-muted-foreground">{t("chrono_ai_sub")}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-purple-400 animate-pulse" />
                    <span className="text-xs font-mono text-purple-400">{t("chrono_ai_running")}</span>
                  </div>
                </div>

                {aiLoading && (
                  <div className="flex items-center justify-center py-8 gap-3">
                    <Cpu className="w-5 h-5 text-purple-400 animate-spin" />
                    <span className="text-xs text-purple-400 uppercase tracking-widest font-mono">{t("chrono_ai_running")}</span>
                  </div>
                )}

                {aiPredictions && !aiLoading && (
                  <div className="space-y-4">
                    {[
                       { quarter: quarterLabel(3, 2026), text: aiPredictions.q3_2026, meta: PRED_META[0] },
                       { quarter: quarterLabel(4, 2026), text: aiPredictions.q4_2026, meta: PRED_META[1] },
                       { quarter: quarterLabel(1, 2027), text: aiPredictions.q1_2027, meta: PRED_META[2] },
                       { quarter: quarterLabel(2, 2027), text: aiPredictions.q2_2027, meta: PRED_META[3] },
                    ].filter(p => p.text).map((pred, i) => (
                      <motion.div
                        key={pred.quarter}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="space-y-1.5"
                      >
                        <div className="flex items-start gap-3">
                          <pred.meta.icon className={`w-4 h-4 ${pred.meta.color} shrink-0 mt-0.5`} />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-black font-mono ${pred.meta.color}`}>{pred.quarter}</span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-black font-mono ${pred.meta.color}`}>
                                   {formatSurfaceNumber(lang, Number(aiPredictions.confidence_score ?? 92))}%
                                </span>
                                <Badge className={`text-xs px-1.5 py-0 ${pred.meta.color} bg-current/10 border-current/30`}>
                                  {t("chrono_confidence")}
                                </Badge>
                              </div>
                            </div>
                            <p className={`text-sm ${pred.meta.color} font-medium leading-relaxed`}>{pred.text}</p>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-border/40 overflow-hidden ml-7">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${aiPredictions.confidence_score ?? 92}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, delay: 0.2 + i * 0.12, ease: "easeOut" }}
                            className={`h-full rounded-full ${pred.meta.bar} opacity-80`}
                          />
                        </div>
                      </motion.div>
                    ))}

                    {aiPredictions.oracle_quote && (
                      <div className="mt-4 pt-4 border-t border-purple-400/20 text-center">
                        <p className="text-xs text-purple-400/70 uppercase tracking-widest font-mono mb-2">{t("chrono_oracle")}</p>
                        <p className="text-sm italic text-purple-400 font-bold">"{aiPredictions.oracle_quote}"</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Future Roadmap — driven by AI predictions */}
          {aiPredictions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-3 gap-4"
            >
              {[
                 { icon: Gamepad2, phase: quarterLabel(3, 2026), text: aiPredictions.q3_2026 ?? t("chrono_future_1"), color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/30" },
                 { icon: Globe,    phase: quarterLabel(4, 2026), text: aiPredictions.q4_2026 ?? t("chrono_future_2"), color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
                 { icon: Star,     phase: quarterLabel(1, 2027), text: aiPredictions.q1_2027 ?? t("chrono_future_3"), color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" },
              ].map((item, i) => (
                <motion.div
                  key={item.phase}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                >
                  <Card className={`${item.border} border h-full`}>
                    <CardContent className={`p-5 ${item.bg} h-full space-y-3`}>
                      <div className="flex items-center justify-between">
                        <item.icon className={`w-6 h-6 ${item.color}`} />
                        <span className={`text-xs font-black font-mono ${item.color} px-2 py-0.5 rounded border border-current/30 bg-current/10`}>
                          {item.phase}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{item.text}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* AI Vision Statement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="bg-card/20 border-purple-400/20">
              <CardContent className="p-6 md:p-8 text-center space-y-4">
                <Sparkles className="w-8 h-8 text-purple-400 mx-auto animate-pulse" />
                <h3 className="text-xl font-black uppercase tracking-wider text-purple-400">{t("chrono_vision_title")}</h3>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">{t("chrono_vision_desc")}</p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                   {(["countries", "aiPowered", "gdpr", "heritage", "fourGames", "realTime"] as TechCopyKey[]).map(key => {
                     const tag = tx(key);
                     return (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full border border-purple-400/20 text-purple-400/80 bg-purple-400/5 font-mono">{tag}</span>
                     );
                   })}
                </div>
                <div className="flex flex-wrap gap-3 justify-center pt-2">
                  <Link href="/empire">
                    <Button className="bg-purple-400/20 text-purple-400 border border-purple-400/50 hover:bg-purple-400 hover:text-black gap-2 font-bold uppercase tracking-wider">
                      {t("empire_title")} <Crown className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/hub">
                    <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 gap-2">
                      {t("hub_title")} <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </section>
      </div>

    </div>
  );
}
