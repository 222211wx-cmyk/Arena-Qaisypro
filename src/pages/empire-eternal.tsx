import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Globe, Zap, Trophy, Calendar, Radio,
  BookOpen, Users, MessageSquare, TrendingUp,
  Star, ArrowRight, Flame, Cpu, Music, Briefcase,
  Shield, Sword, Eye, Film,
} from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { contentCopy } from "@/i18n/content-discovery-copy";
import { formatDate, formatNumber, relativeTime, surfaceCopy } from "@/i18n/content-surfaces-copy";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Legend { id: number; name: string; rank: number; score: number; domain: string; imageUrl: string | null; }
interface Event  { id: number; title: string; domain: string; location: string; country: string; eventDate: string; isLive: boolean; icon: string; color: string; impactScore: number; }
interface Post   { id: number; username: string; content: string; domain: string; type: string; likes: number; createdAt: string; }
interface Stats  { users: number; posts: number; coinsCirculating: number; totalXp: number; }

const GREEN   = "#22c55e";
const G_DIM   = "rgba(34,197,94,0.12)";
const G_GLOW  = "rgba(34,197,94,0.06)";

const DOMAIN_ICON: Record<string, React.ReactNode> = {
  sport: <Trophy className="w-4 h-4" />, tech: <Cpu className="w-4 h-4" />,
  music: <Music className="w-4 h-4" />, business: <Briefcase className="w-4 h-4" />,
  cinema: <Film className="w-4 h-4" />, general: <Globe className="w-4 h-4" />,
};

// ── Pillar Card ───────────────────────────────────────────────────────────────
function PillarCard({ title, sub, icon, color, children }: {
  title: string; sub: string; icon: React.ReactNode; color: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border overflow-hidden flex flex-col" style={{ borderColor: `${color}25`, background: `linear-gradient(160deg, ${color}06, transparent)` }}>
      <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: `${color}20` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
        <div>
          <div className="font-black text-sm tracking-widest" style={{ color }}>{title}</div>
          <div className="text-xs text-muted-foreground">{sub}</div>
        </div>
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function EmpireEternalPage() {
  const { lang } = useLang();
  const t = (key: Parameters<typeof contentCopy>[1]) => contentCopy(lang, key);
  const s = surfaceCopy(lang);
  const [legends, setLegends] = useState<Legend[]>([]);
  const [events,  setEvents]  = useState<Event[]>([]);
  const [posts,   setPosts]   = useState<Post[]>([]);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/legends",      { credentials: "include" }).then(r => r.json() as Promise<{ legends: Legend[] }>),
      fetch("/api/pulse/events", { credentials: "include" }).then(r => r.json() as Promise<{ events: Event[] }>),
      fetch("/api/pulse/feed",   { credentials: "include" }).then(r => r.json() as Promise<{ posts: Post[] }>),
      fetch("/api/pulse/stats",  { credentials: "include" }).then(r => r.json() as Promise<Stats>),
    ]).then(([l, e, p, s]) => {
      setLegends(l.legends ?? []);
      setEvents(e.events ?? []);
      setPosts(p.posts?.slice(0, 5) ?? []);
      setStats(s);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const liveEvents   = events.filter(e => e.isLive);
  const upcoming     = events.filter(e => !e.isLive).slice(0, 6);
  const topLegends   = legends.slice(0, 5);

  return (
    <div className="min-h-screen" dir={lang === "ar" ? "rtl" : "ltr"} style={{ background: "hsl(var(--background))" }}>

      {/* ── HERO ── */}
      <div className="relative overflow-hidden" style={{ background: `radial-gradient(ellipse at 50% 0%, ${G_DIM}, transparent 70%)` }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(circle at 20% 50%, ${G_GLOW}, transparent 40%), radial-gradient(circle at 80% 20%, rgba(201,168,76,0.04), transparent 40%)` }} />

        {/* Animated grid lines */}
        <div className="absolute inset-0 pointer-events-none opacity-10"
          style={{ backgroundImage: `linear-gradient(${GREEN} 1px, transparent 1px), linear-gradient(90deg, ${GREEN} 1px, transparent 1px)`, backgroundSize: "80px 80px" }} />

        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold tracking-widest mb-6"
            style={{ borderColor: `${GREEN}40`, color: GREEN, background: `${GREEN}10` }}>
            <Radio className="w-3.5 h-3.5 animate-pulse" /> EMPIRE ETERNAL v2.0 — {s.awakened}
          </motion.div>

          <motion.h1 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter mb-4 leading-none">
            <span className="text-foreground">EMPIRE </span>
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: `linear-gradient(135deg, ${GREEN}, #86efac, #4ade80)` }}>
              ETERNAL
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-lg md:text-xl italic max-w-2xl mx-auto mb-8"
            style={{ color: `${GREEN}99` }}>
            “{s.eternalQuote}”
          </motion.p>

          {/* Three pillars */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex justify-center gap-6 flex-wrap">
            {[
              { icon: "🌿", label: t("past"), sub: t("nostalgia"), color: GREEN },
              { icon: "⚡", label: t("present"), sub: t("communication"), color: "#C9A84C" },
              { icon: "🔮", label: t("future"), sub: t("globalEvents"), color: "#a78bfa" },
            ].map(p => (
              <div key={p.label} className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold"
                style={{ borderColor: `${p.color}30`, color: p.color, background: `${p.color}10` }}>
                <span>{p.icon}</span> {p.label} — <span className="font-normal opacity-80">{p.sub}</span>
              </div>
            ))}
          </motion.div>

          {/* Live banner */}
          {liveEvents.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="mt-6 inline-flex items-center gap-3 px-5 py-2 rounded-full border bg-red-500/10 border-red-500/30">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-sm font-bold">{liveEvents[0]?.icon} {liveEvents[0]?.title} — {t("live")}</span>
            </motion.div>
          )}

          {/* Empire stats */}
          {stats && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {[
                { v: formatNumber(stats.users, lang),            l: s.citizens, c: GREEN },
                { v: formatNumber(stats.posts, lang),            l: s.voices, c: "#C9A84C" },
                { v: formatNumber(stats.coinsCirculating, lang), l: s.coins, c: "#facc15" },
                { v: formatNumber(stats.totalXp, lang),          l: s.totalXp, c: "#a78bfa" },
              ].map(s => (
                <div key={s.l} className="p-3 rounded-2xl border text-center"
                  style={{ borderColor: `${s.c}20`, background: `${s.c}08` }}>
                  <div className="text-xl font-black" style={{ color: s.c }}>{s.v}</div>
                  <div className="text-xs text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── THREE PILLARS GRID ── */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ─ PAST: TOP LEGENDS ─ */}
          <PillarCard title={`${t("past")} — ${t("nostalgia")}`} sub={t("topLegends")} icon={<Crown className="w-5 h-5"/>} color={GREEN}>
            <div className="space-y-3">
              {topLegends.map((l, i) => (
                <Link key={l.id} href={`/legends/${l.id}`}>
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: loaded ? 1 : 0, x: loaded ? 0 : -10 }} transition={{ delay: i * 0.07 }}
                    className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                      style={{ background: i === 0 ? "linear-gradient(135deg,#FFD700,#FFA500)" : `${GREEN}20`, color: i === 0 ? "#000" : GREEN }}>
                      {i === 0 ? "👑" : `#${l.rank}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{l.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                         {DOMAIN_ICON[l.domain]} {s[l.domain as keyof typeof s] ?? l.domain}
                      </div>
                    </div>
                     <div className="text-xs font-black shrink-0" style={{ color: GREEN }}>{formatNumber(l.score, lang)}</div>
                  </motion.div>
                </Link>
              ))}
              <Link href="/legends">
                <div className="mt-2 flex items-center justify-center gap-1 text-xs font-bold py-2 rounded-xl border cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ borderColor: `${GREEN}30`, color: GREEN }}>
                   {s.viewAllLegends} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </div>
              </Link>
            </div>
          </PillarCard>

          {/* ─ PRESENT: COMMUNICATION ─ */}
          <PillarCard title={`${t("present")} — ${t("communication")}`} sub={t("pulseFeed")} icon={<MessageSquare className="w-5 h-5"/>} color="#C9A84C">
            <div className="space-y-3">
              {posts.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">{t("noPosts")}</div>
              )}
              {posts.map(p => (
                <div key={p.id} className="p-3 rounded-xl border border-border/40 bg-white/3 hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-black bg-primary shrink-0">
                      {p.username.charAt(0).toUpperCase()}
                    </div>
                    <Link href={`/citizen/${p.username}`} className="text-xs font-bold hover:text-primary transition-colors">{p.username}</Link>
                     <span className="ms-auto text-[10px] text-muted-foreground">{relativeTime(p.createdAt, lang)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{p.content}</p>
                </div>
              ))}
              <Link href="/pulse">
                <div className="flex items-center justify-center gap-1 text-xs font-bold py-2 rounded-xl border cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ borderColor: "hsl(var(--primary) / 0.3)", color: "hsl(var(--primary))" }}>
                   {s.openPulse} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </div>
              </Link>
            </div>
          </PillarCard>

          {/* ─ FUTURE: GLOBAL EVENTS ─ */}
          <PillarCard title={`${t("future")} — ${t("globalEvents")}`} sub={t("upcomingEvents")} icon={<Globe className="w-5 h-5"/>} color="#a78bfa">
            <div className="space-y-2">
              {liveEvents.map(ev => (
                <div key={ev.id} className="flex items-center gap-2 p-2 rounded-xl border" style={{ borderColor: "#ef444440", background: "#ef444410" }}>
                  <span className="text-lg shrink-0">{ev.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate text-red-300">{ev.title}</div>
                     <div className="text-[10px] text-muted-foreground">{ev.country} · {s.live}</div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                </div>
              ))}
              {upcoming.map((ev, i) => (
                <motion.div key={ev.id} initial={{ opacity: 0 }} animate={{ opacity: loaded ? 1 : 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors">
                  <span className="text-base shrink-0">{ev.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{ev.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                       {ev.country} · {formatDate(ev.eventDate, lang, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <div className="text-[10px] font-black px-1.5 py-0.5 rounded shrink-0"
                    style={{ color: ev.color, background: `${ev.color}15` }}>
                     {formatNumber(ev.impactScore, lang)}
                  </div>
                </motion.div>
              ))}
              <Link href="/pulse">
                <div className="flex items-center justify-center gap-1 text-xs font-bold py-2 rounded-xl border cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ borderColor: "rgba(167,139,250,0.3)", color: "#a78bfa" }}>
                   {s.fullCalendar} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </div>
              </Link>
            </div>
          </PillarCard>
        </div>
      </div>

      {/* ── REWARD SYSTEM ── */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="rounded-3xl border p-6" style={{ borderColor: `${GREEN}20`, background: `${GREEN}05` }}>
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold tracking-widest mb-3"
              style={{ borderColor: `${GREEN}30`, color: GREEN, background: `${GREEN}10` }}>
               <Zap className="w-3.5 h-3.5" /> EMPIRE ETERNAL — {s.rewardSystem} v2.0
            </div>
             <p className="text-sm text-muted-foreground">{s.rewardIntro}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
               { icon: "🎓", action: s.watchLecture, reward: "+20 XP", color: GREEN, desc: s.watchLectureDesc },
               { icon: "⚔️", action: s.joinDebate, reward: `+50 XP + +50 ${s.coins}`, color: "#C9A84C", desc: s.joinDebateDesc },
               { icon: "📖", action: s.postStory, reward: `+10 ${s.coins}`, color: "#a78bfa", desc: s.postStoryDesc },
            ].map(r => (
              <div key={r.action} className="p-4 rounded-2xl border text-center"
                style={{ borderColor: `${r.color}25`, background: `${r.color}08` }}>
                <div className="text-3xl mb-2">{r.icon}</div>
                <div className="font-bold text-sm mb-1">{r.action}</div>
                <div className="font-black text-lg mb-1" style={{ color: r.color }}>{r.reward}</div>
                <div className="text-xs text-muted-foreground">{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA FOOTER ── */}
      <div className="border-t text-center py-12" style={{ borderColor: `${GREEN}15` }}>
         <div className="text-2xl font-black mb-3" style={{ color: GREEN }}>{s.empireAwake}</div>
         <p className="text-muted-foreground text-sm mb-6">{s.empireNeverSleeps}</p>
        <div className="flex justify-center gap-4 flex-wrap">
           <Link href="/legends"><button className="px-6 py-2.5 rounded-xl font-bold text-sm border hover:bg-white/5 transition-all" style={{ borderColor: `${GREEN}40`, color: GREEN }}>{s.topLegends}</button></Link>
           <Link href="/pulse"><button className="px-6 py-2.5 rounded-xl font-bold text-sm border hover:bg-white/5 transition-all" style={{ borderColor: "hsl(var(--primary) / 0.4)", color: "hsl(var(--primary))" }}>{s.empirePulse}</button></Link>
           <Link href="/citizens"><button className="px-6 py-2.5 rounded-xl font-bold text-sm border hover:bg-white/5 transition-all" style={{ borderColor: "#a78bfa40", color: "#a78bfa" }}>{s.citizens}</button></Link>
        </div>
      </div>
    </div>
  );
}
