import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { EliteCarousel } from "@/components/elite/EliteCarousel";
import { PlatformLauncher } from "@/components/home/PlatformLauncher";
import HomeCitizenSection from "@/components/citizen/HomeCitizenSection";
import {
  Crown,
  Flame,
  Users,
  Swords,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

// ── LiveStats type (used by StatsBar) ────────────────────────────────────────
interface LiveStats {
  users: number;
  posts: number;
  coinsCirculating: number;
  totalXp: number;
}

/** Animate a number from 0 → target over ~1.2 s (ease-out cubic) */
function useCountUp(target: number | null, duration = 1200) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) return;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

// ── Fallback ticker items shown when no live events are in DB ─────────────────
const FALLBACK_TICKER = [
  {
    icon: "🌍",
    titleKey: "home_ticker_world_cup",
    isLive: false,
    color: "#C9A84C",
  },
  {
    icon: "⚖️",
    titleKey: "home_ticker_tribute_hall",
    isLive: false,
    color: "#C9A84C",
  },
  {
    icon: "🧠",
    titleKey: "home_ticker_oracle",
    isLive: false,
    color: "#8B5CF6",
  },
];

// ── Quick-access cards ────────────────────────────────────────────────────────
const PORTALS = [
  {
    icon: Crown,
    labelKey: "home_portal_legends",
    path: "/legends",
    accent: "#C9A84C",
    descKey: "home_portal_legends_desc",
  },
  {
    icon: Flame,
    labelKey: "home_portal_pulse",
    path: "/pulse",
    accent: "#FF4444",
    descKey: "home_portal_pulse_desc",
  },
  {
    icon: Users,
    labelKey: "home_portal_citizens",
    path: "/citizens",
    accent: "#22C55E",
    descKey: "home_portal_citizens_desc",
  },
  {
    icon: Swords,
    labelKey: "home_portal_arena",
    path: "/games",
    accent: "#00D4FF",
    descKey: "home_portal_arena_desc",
  },
];

const HOME_BOTS = [
  {
    name: "GDN-SMART",
    icon: "🧠",
    descriptionKey: "home_bot_smart",
    path: "/fortress",
  },
  {
    name: "GDN-FIT",
    icon: "💪",
    descriptionKey: "home_bot_fit",
    path: "/sport",
  },
  {
    name: "GDN-CINE",
    icon: "🎬",
    descriptionKey: "home_bot_cine",
    path: "/cinema",
  },
  {
    name: "GDN-ARENA",
    icon: "⚔️",
    descriptionKey: "home_bot_arena",
    path: "/games",
  },
  {
    name: "GDN-TO",
    icon: "🌐",
    descriptionKey: "home_bot_translate",
    path: "/fortress",
  },
  {
    name: "GDN-MUSIC",
    icon: "🎵",
    descriptionKey: "home_bot_music",
    path: "/music",
  },
];

// ── Animated green grid background ───────────────────────────────────────────
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#22C55E"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[120px] opacity-[0.07]"
        style={{
          background: "radial-gradient(circle, #22C55E 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full blur-[80px] opacity-[0.04]"
        style={{ background: "#C9A84C" }}
      />
    </div>
  );
}

// ── Live ticker — sources from /api/pulse/events, falls back to FALLBACK_TICKER
function LiveTicker() {
  const { t } = useLang();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [items, setItems] = useState<
    Array<{
      icon: string;
      title?: string;
      titleKey?: string;
      isLive: boolean;
      color: string;
    }>
  >(FALLBACK_TICKER);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    fetch(`${BASE}/api/pulse/events`)
      .then((r) => r.json())
      .then((d) => {
        const evs: Array<{
          icon: string;
          title?: string;
          titleKey?: string;
          isLive: boolean;
          color: string;
        }> = (d.events ?? []).slice(0, 8).map((e: any) => ({
          icon: e.icon ?? "🌍",
          title: e.title,
          isLive: !!e.isLive,
          color: e.color ?? "#C9A84C",
        }));
        if (evs.length > 0) setItems(evs);
      })
      .catch(() => {});
  }, [BASE]);

  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % items.length), 3800);
    return () => clearInterval(id);
  }, [items.length]);

  const ev = items[idx] ?? items[0];
  if (!ev) return null;

  return (
    <div
      className="w-full overflow-hidden flex items-center gap-4 px-4 py-2.5"
      style={{
        background: "rgba(34,197,94,0.04)",
        borderBottom: "1px solid rgba(34,197,94,0.15)",
      }}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: ev.isLive ? "#22C55E" : ev.color }}
        />
        <span
          className="text-xs font-mono font-black tracking-[0.25em] uppercase"
          style={{ color: ev.isLive ? "#22C55E" : ev.color }}
        >
          {ev.isLive ? t("pulse_live") : t("home_event")}
        </span>
      </div>
      <div className="w-px h-3 shrink-0 bg-white/10" />
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <span className="text-sm shrink-0">{ev.icon}</span>
          <span className="text-xs font-mono text-white/60 truncate font-bold tracking-wide">
            {ev.titleKey ? t(ev.titleKey) : ev.title}
          </span>
        </motion.div>
      </AnimatePresence>
      <Link href="/events" className="shrink-0">
        <span className="text-xs font-mono text-white/20 hover:text-white/40 transition-colors cursor-pointer">
          {t("home_all_events")} →
        </span>
      </Link>
    </div>
  );
}

// ── Empire stats bar — uses useCountUp for animated numbers ──────────────────
function StatsBar() {
  const { t } = useLang();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [stats, setStats] = useState<LiveStats | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/pulse/stats`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, [BASE]);

  const countUsers = useCountUp(stats?.users ?? null);
  const countPosts = useCountUp(stats?.posts ?? null);
  const countCoins = useCountUp(stats?.coinsCirculating ?? null);
  const countXp = useCountUp(stats?.totalXp ?? null);

  const fmt = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  };

  const items = [
    {
      label: t("home_citizens_label"),
      val: stats ? fmt(countUsers) : "—",
      glyph: "◉",
      accent: "#22C55E",
    },
    {
      label: t("home_voices_label"),
      val: stats ? fmt(countPosts) : "—",
      glyph: "◈",
      accent: "#C9A84C",
    },
    {
      label: t("stat_coins"),
      val: stats ? fmt(countCoins) : "—",
      glyph: "⬡",
      accent: "#FFD700",
    },
    {
      label: t("stat_xp"),
      val: stats ? fmt(countXp) : "—",
      glyph: "✦",
      accent: "#8B5CF6",
    },
  ];

  return (
    <div
      className="grid grid-cols-4 gap-px"
      style={{ background: "#ffffff05", border: "1px solid #ffffff08" }}
    >
      {items.map((s, i) => (
        <div
          key={s.label}
          className="flex flex-col items-center justify-center py-4 px-2 bg-black"
          style={{ borderRight: i < 3 ? "1px solid #ffffff06" : undefined }}
        >
          <span className="text-base mb-1" style={{ color: s.accent + "50" }}>
            {s.glyph}
          </span>
          <p
            className="text-xl md:text-2xl font-black font-mono"
            style={{ color: s.accent }}
          >
            {s.val}
          </p>
          <p
            className="text-xs uppercase tracking-widest mt-0.5 font-mono"
            style={{ color: "#ffffff25" }}
          >
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Top 3 Legends preview ─────────────────────────────────────────────────────
function TopLegendsPreview() {
  const { t } = useLang();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [legends, setLegends] = useState<
    Array<{
      id: number;
      name: string;
      domain: string;
      nationality: string;
      rank: number;
    }>
  >([]);

  useEffect(() => {
    fetch(`${BASE}/api/legends`)
      .then((r) => r.json())
      .then((d) => setLegends((d.legends ?? []).slice(0, 3)))
      .catch(() => {});
  }, [BASE]);

  const RANK_GLYPHS = ["♔", "♕", "♖"];
  const RANK_COLORS = ["#C9A84C", "#aaa9ad", "#CD7F32"];

  return (
    <div className="space-y-2">
      {legends.map((l, i) => (
        <Link key={l.id} href={`/legends/${l.id}`}>
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3 p-3 group cursor-pointer transition-all hover:bg-white/[0.02]"
            style={{
              border: "1px solid #C9A84C12",
              background: "rgba(201,168,76,0.01)",
            }}
          >
            <div className="w-7 text-center shrink-0">
              <span
                className="text-base font-black"
                style={{ color: RANK_COLORS[i] }}
              >
                {RANK_GLYPHS[i]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-black truncate"
                style={{ color: RANK_COLORS[i] }}
              >
                {l.name}
              </p>
              <p className="text-xs font-mono" style={{ color: "#ffffff30" }}>
                {l.domain} · {l.nationality}
              </p>
            </div>
            <ChevronRight
              className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "#C9A84C50" }}
            />
          </motion.div>
        </Link>
      ))}
      {legends.length === 0 && (
        <div className="py-4 text-center text-xs font-mono text-white/20">
          {t("home_loading_legends")}
        </div>
      )}
    </div>
  );
}

// ── Recent pulse posts — uses correct schema field names (username, likes) ────
function RecentActivity() {
  const { t } = useLang();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [posts, setPosts] = useState<
    Array<{
      id: number;
      username: string;
      content: string;
      domain: string;
      likes: number;
      createdAt: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/pulse/feed?limit=3`)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [BASE]);

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}${t("home_time_seconds_ago")}`;
    if (diff < 3600) return `${Math.floor(diff / 60)}${t("time_min_ago")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${t("time_hour_ago")}`;
    return `${Math.floor(diff / 86400)}${t("time_day_ago")}`;
  };

  if (loading) {
    return (
      <div className="py-4 text-center text-xs font-mono text-white/20">
        {t("home_loading_activity")}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-4 text-center text-xs font-mono text-white/20">
        {t("pulse_no_posts")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex gap-3 p-3 group cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid #ffffff08",
          }}
        >
          <div
            className="w-8 h-8 shrink-0 flex items-center justify-center font-black text-xs"
            style={{
              background: "rgba(201,168,76,0.08)",
              border: "1px solid #C9A84C20",
              color: "#C9A84C",
            }}
          >
            {p.username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold" style={{ color: "#C9A84C" }}>
                @{p.username}
              </span>
              {p.domain && p.domain !== "general" && (
                <span
                  className="text-xs px-1.5 py-0.5 font-mono uppercase tracking-wider"
                  style={{ border: "1px solid #ffffff10", color: "#ffffff30" }}
                >
                  {p.domain}
                </span>
              )}
              <span
                className="text-xs ml-auto font-mono"
                style={{ color: "#ffffff20" }}
              >
                {timeAgo(p.createdAt)}
              </span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed line-clamp-2">
              {p.content}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [taglineIdx, setTaglineIdx] = useState(0);

  const TAGLINES = [
    t("home_tagline_1"),
    t("home_tagline_2"),
    t("home_tagline_3"),
    t("home_tagline_4"),
    t("home_tagline_5"),
  ];

  useEffect(() => {
    const id = setInterval(
      () => setTaglineIdx((p) => (p + 1) % TAGLINES.length),
      3200,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <PlatformLauncher />

      {/* ── LIVE EVENTS TICKER ─────────────────────────────────────── */}
      <LiveTicker />

      {/* ── HERO SECTION ───────────────────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden">
        <GridBackground />

        {/* Scan-line overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary) / 0.015) 2px, hsl(var(--primary) / 0.015) 4px)",
          }}
        />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-8">
          {/* Version badge */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5"
              style={{
                border: "1px solid hsl(var(--primary) / 0.3)",
                background: "hsl(var(--primary) / 0.05)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono font-black tracking-[0.3em] uppercase text-primary">
                {t("home_system_online")}
              </span>
            </div>
          </motion.div>

          {/* Main title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-center gap-6 mb-4">
              <div
                className="h-px flex-1 max-w-[80px]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.25))",
                }}
              />
              <span className="text-2xl">♔</span>
              <div
                className="h-px flex-1 max-w-[80px]"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--primary) / 0.25), transparent)",
                }}
              />
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight leading-none">
              <span
                className="block"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.72) 40%, hsl(var(--primary)) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {t("home_empire_title_1")}
              </span>
              <span className="block text-white">
                {t("home_empire_title_2")}
              </span>
            </h1>

            <div className="flex items-center justify-center gap-3 pt-2">
              <div
                className="h-px w-12"
                style={{ background: "hsl(var(--primary) / 0.19)" }}
              />
              <span className="text-xs font-mono tracking-[0.5em] uppercase text-primary/50">
                {t("home_awake")}
              </span>
              <div
                className="h-px w-12"
                style={{ background: "hsl(var(--primary) / 0.19)" }}
              />
            </div>
          </motion.div>

          {/* Animated tagline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="h-8 flex items-center justify-center"
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={taglineIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="text-sm md:text-base font-mono tracking-[0.2em] uppercase"
                style={{ color: "#ffffff40" }}
              >
                {TAGLINES[taglineIdx]}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            {!user ? (
              <>
                <Link href="/hub">
                  <button className="flex items-center gap-2 px-8 py-3.5 font-black uppercase tracking-widest text-sm transition-all hover:scale-105 bg-primary text-primary-foreground">
                    {t("home_explore_arena")}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/login">
                  <button className="px-8 py-3.5 font-black uppercase tracking-widest text-sm transition-all hover:scale-105 border border-primary/25 text-primary/50 bg-primary/5">
                    {t("home_citizen_login")}
                  </button>
                </Link>
                <p className="basis-full text-center text-xs text-muted-foreground">
                  {t("home_no_account")}
                </p>
              </>
            ) : (
              <Link href="/hub">
                <button className="flex items-center gap-2 px-8 py-3.5 font-black uppercase tracking-widest text-sm transition-all hover:scale-105 bg-primary text-primary-foreground">
                  {t("home_enter_hub")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="w-full pt-2"
            dir="rtl"
          >
            <p className="mb-3 text-center text-xs font-bold tracking-[0.2em] text-primary">
              {t("home_smart_bots")}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {HOME_BOTS.map((bot) => (
                <Card
                  key={bot.name}
                  className="overflow-hidden border-primary/25 bg-card/70 text-start shadow-none transition-transform duration-200 hover:-translate-y-1 hover:border-primary/50"
                >
                  <CardContent className="flex min-h-48 flex-col gap-3 p-3">
                    <div className="relative grid h-20 place-items-center overflow-hidden rounded-lg border border-border/60 bg-gradient-to-br from-primary/25 via-primary/10 to-background">
                      <span
                        className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.25),transparent_65%)]"
                        aria-hidden="true"
                      />
                      <span
                        className="relative text-4xl drop-shadow-sm"
                        role="img"
                        aria-label={t(bot.descriptionKey)}
                      >
                        {bot.icon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h2
                        className="truncate text-sm font-black tracking-wide text-foreground"
                        dir="ltr"
                      >
                        {bot.name}
                      </h2>
                      <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
                        {t(bot.descriptionKey)}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="mt-auto w-full font-bold"
                    >
                      <Link href={bot.path}>{t("home_start")}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent, hsl(var(--background)))",
          }}
        />
      </section>

      {/* ── EMPIRE STATS BAR ───────────────────────────────────────── */}
      <StatsBar />

      {/* ── GDNA ELITE CAROUSEL (exactly 11 profiles, Lamine first) ── */}
      <EliteCarousel />

      {/* ── QUICK ACCESS PORTALS ───────────────────────────────────── */}
      <section className="px-4 py-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p
            className="text-xs font-mono tracking-[0.4em] uppercase mb-2"
            style={{ color: "#ffffff20" }}
          >
            {t("home_navigate")}
          </p>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            {t("home_portals")}
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PORTALS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Link key={p.path} href={p.path}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="group cursor-pointer p-6 flex flex-col items-center text-center space-y-3 transition-all hover:scale-[1.02]"
                  style={{
                    border: `1px solid ${p.accent}20`,
                    background: `${p.accent}04`,
                  }}
                  whileHover={{
                    borderColor: `${p.accent}40`,
                    backgroundColor: `${p.accent}07`,
                  }}
                >
                  <div
                    className="w-12 h-12 flex items-center justify-center"
                    style={{
                      border: `1px solid ${p.accent}30`,
                      background: `${p.accent}10`,
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: p.accent }} />
                  </div>
                  <div>
                    <p
                      className="font-black text-sm uppercase tracking-wider"
                      style={{ color: p.accent }}
                    >
                      {t(p.labelKey)}
                    </p>
                    <p
                      className="text-xs mt-1 font-mono"
                      style={{ color: "#ffffff30" }}
                    >
                      {t(p.descKey)}
                    </p>
                  </div>
                  <ArrowRight
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: p.accent }}
                  />
                </motion.div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── BOTTOM SECTION: Legends + Recent Activity ──────────────── */}
      <section className="px-4 pb-20 max-w-7xl mx-auto overflow-x-clip">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 [&>div]:min-w-0 [&_h2]:break-words">
          {/* TOP 3 LEGENDS */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-6 space-y-4"
            style={{
              border: "1px solid #C9A84C20",
              background: "rgba(201,168,76,0.02)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-xs font-mono tracking-widest uppercase mb-0.5"
                  style={{ color: "#C9A84C50" }}
                >
                  {t("home_hall_of_legends")}
                </p>
                <h3 className="font-black text-sm uppercase tracking-wider">
                  {t("home_top_legends")}
                </h3>
              </div>
              <Link href="/legends">
                <button
                  className="text-xs font-mono uppercase tracking-wider px-3 py-1 transition-all"
                  style={{ border: "1px solid #C9A84C25", color: "#C9A84C60" }}
                >
                  {t("home_view_all")} →
                </button>
              </Link>
            </div>
            <TopLegendsPreview />
          </motion.div>

          {/* RECENT PULSE ACTIVITY */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-6 space-y-4"
            style={{
              border: "1px solid #FF444415",
              background: "rgba(255,68,68,0.01)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-xs font-mono tracking-widest uppercase mb-0.5"
                  style={{ color: "#FF444450" }}
                >
                  {t("home_empire_pulse")}
                </p>
                <h3 className="font-black text-sm uppercase tracking-wider">
                  {t("home_recent_activity")}
                </h3>
              </div>
              <Link href="/pulse">
                <button
                  className="text-xs font-mono uppercase tracking-wider px-3 py-1 transition-all"
                  style={{ border: "1px solid #FF444425", color: "#FF444460" }}
                >
                  {t("home_view_all")} →
                </button>
              </Link>
            </div>
            <RecentActivity />
          </motion.div>
        </div>
      </section>

      {/* ── مواطنون مقترحون للتعارف (opt-in adults only) ──────────────── */}
      <HomeCitizenSection />

      {/* ── JOIN THE EMPIRE CTA ────────────────────────────────────── */}
      {!user && (
        <section className="px-4 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center py-16 px-8 relative overflow-hidden"
            style={{
              border: "1px solid hsl(var(--primary) / 0.13)",
              background: "hsl(var(--primary) / 0.03)",
            }}
          >
            <div className="absolute inset-0 opacity-[0.03]">
              <svg
                width="100%"
                height="100%"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id="ctaGrid"
                    width="30"
                    height="30"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 30 0 L 0 0 0 30"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="0.5"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#ctaGrid)" />
              </svg>
            </div>
            <div className="relative z-10 space-y-6">
              <div className="text-4xl">♔</div>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                <span className="text-primary">{t("home_join_word")}</span>{" "}
                {t("home_empire_word")}
              </h2>
              <p className="text-sm font-mono text-white/40 leading-relaxed">
                {t("home_join_desc")}
              </p>
              <Link href="/register">
                <button className="inline-flex items-center gap-3 px-10 py-4 font-black uppercase tracking-widest text-sm transition-all hover:scale-105 bg-primary text-primary-foreground">
                  {t("home_become_citizen")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </motion.div>
        </section>
      )}
    </div>
  );
}
