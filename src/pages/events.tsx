import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Globe2, Calendar, Radio, Zap, Trophy, Clock, MapPin, Flame } from "lucide-react";
import { Link } from "wouter";
import { useLang } from "@/contexts/LangContext";
import { contentCopy } from "@/i18n/content-discovery-copy";
import { formatDate, formatNumber, interpolate, surfaceCopy } from "@/i18n/content-surfaces-copy";

interface PulseEvent {
  id: number; title: string; titleAr: string | null; domain: string;
  location: string; country: string; eventDate: string;
  isLive: boolean; icon: string; color: string; impactScore: number;
}

const GREEN    = "#22c55e";
const DARK_BG  = "#050a05";
const CARD_BG  = "#0a120a";
const BORDER_G = "#22c55e22";

const DOMAIN_META: Record<string, { label: string; color: string; icon: string }> = {
  sport:    { label: "Sport",    color: "#22d3ee", icon: "⚡" },
  tech:     { label: "Tech",     color: "#a78bfa", icon: "🔮" },
  music:    { label: "Music",    color: "#f472b6", icon: "🎵" },
  business: { label: "Business", color: "#4ade80", icon: "💰" },
  cinema:   { label: "Cinema",   color: "#fb923c", icon: "🎬" },
  science:  { label: "Science",  color: "#38bdf8", icon: "🔬" },
};

const DOMAINS = ["all", "sport", "tech", "music", "business", "cinema"];

function daysUntil(d: string) {
  const diff = new Date(d).getTime() - Date.now();
  if (diff < 0) return null;
  const days = Math.floor(diff / 86400000);
  return days;
}

export default function EventsPage() {
  const { lang } = useLang();
  const t = (key: Parameters<typeof contentCopy>[1]) => contentCopy(lang, key);
  const s = surfaceCopy(lang);
  const [events,  setEvents]  = useState<PulseEvent[]>([]);
  const [filter,  setFilter]  = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/pulse/events", { credentials: "include" });
    const data = await res.json() as { events: PulseEvent[] };
    setEvents(data.events ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = filter === "all" ? events : events.filter(e => e.domain === filter);
  const live     = filtered.filter(e => e.isLive);
  const upcoming = filtered.filter(e => !e.isLive).sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const liveCount = events.filter(e => e.isLive).length;

  return (
    <div className="min-h-screen" dir={lang === "ar" ? "rtl" : "ltr"} style={{ background: DARK_BG, color: "#e5ffe5" }}>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b" style={{ borderColor: BORDER_G }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(${GREEN}08 1px, transparent 1px), linear-gradient(90deg, ${GREEN}08 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse at 50% -20%, ${GREEN}15, transparent 55%)`,
        }} />
        <div className="relative max-w-5xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5 text-xs font-bold tracking-widest"
            style={{ borderColor: `${GREEN}50`, background: `${GREEN}10`, color: GREEN }}>
            <Globe2 className="w-3.5 h-3.5" />
             {s.eventsTracker}
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-3" style={{ color: "hsl(var(--foreground))" }}>
            {t("eventsTitle")}
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
             {s.eventsIntro}
          </p>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-2xl font-black text-red-400">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> {liveCount}
              </div>
               <div className="text-xs text-muted-foreground">{s.liveNow}</div>
            </div>
            <div className="text-center">
               <div className="text-2xl font-black" style={{ color: GREEN }}>{formatNumber(events.length, lang)}</div>
               <div className="text-xs text-muted-foreground">{s.totalEvents}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-yellow-400">{formatNumber(events.filter(e => e.impactScore >= 90).length, lang)}</div>
               <div className="text-xs text-muted-foreground">{s.megaEvents}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Domain filter */}
        <div className="flex gap-2 flex-wrap">
          {DOMAINS.map(d => {
            const meta = DOMAIN_META[d];
            const active = filter === d;
            return (
              <button key={d} onClick={() => setFilter(d)}
                className="px-4 py-1.5 rounded-full text-xs font-bold border transition-all"
                style={{ borderColor: active ? (meta?.color ?? GREEN) : BORDER_G, background: active ? `${meta?.color ?? GREEN}20` : "transparent", color: active ? (meta?.color ?? GREEN) : "#888" }}>
                 {d === "all" ? `🌍 ${t("all")}` : `${meta?.icon} ${s[d as keyof typeof s] ?? meta?.label}`}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full border-4 animate-spin mx-auto mb-3" style={{ borderColor: GREEN, borderTopColor: "transparent" }} />
            <p className="text-muted-foreground text-sm">{t("loading")}</p>
          </div>
        )}

        {/* ── LIVE events ── */}
        {!loading && live.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
               <span className="text-xs font-black text-red-400 tracking-widest">{s.liveRightNow}</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {live.map(ev => <EventCard key={ev.id} event={ev} highlight />)}
            </div>
          </div>
        )}

        {/* ── Upcoming events ── */}
        {!loading && (
          <div>
            <div className="text-xs font-black text-muted-foreground tracking-widest mb-4">
               {filter === "all" ? s.upcomingSorted : interpolate(s.upcomingDomain, { domain: s[filter as keyof typeof s] ?? DOMAIN_META[filter]?.label ?? filter })}
            </div>
            {upcoming.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Globe2 className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: GREEN }} />
                <p>{t("noUpcomingEvents")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((ev, i) => (
                  <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <EventCard event={ev} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pulse link */}
        <div className="text-center py-4 border-t" style={{ borderColor: BORDER_G }}>
          <Link href="/pulse">
            <button className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm border transition-all hover:opacity-90"
              style={{ background: `${GREEN}15`, borderColor: `${GREEN}40`, color: GREEN }}>
               <Radio className="w-4 h-4" /> {s.joinPulse}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event: ev, highlight = false }: { event: PulseEvent; highlight?: boolean }) {
  const { lang } = useLang();
  const t = (key: Parameters<typeof contentCopy>[1]) => contentCopy(lang, key);
  const s = surfaceCopy(lang);
  const dm      = DOMAIN_META[ev.domain] ?? { color: GREEN, icon: "🌍", label: ev.domain };
  const days    = daysUntil(ev.eventDate);
  const isPast  = days === null && !ev.isLive;
  const impact  = ev.impactScore;

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl border transition-all hover:border-green-500/20"
      style={{ background: CARD_BG, borderColor: highlight ? "#ef444430" : BORDER_G }}>
      {/* Icon */}
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border"
        style={{ background: `${dm.color}15`, borderColor: `${dm.color}30` }}>
        {ev.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-sm leading-snug">{ev.title}</h3>
          {ev.isLive && (
            <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> {t("live")}
            </span>
          )}
           {!ev.isLive && days !== null && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: `${GREEN}15`, color: GREEN, border: `1px solid ${GREEN}30` }}>
               {days === 0 ? t("today") : days === 1 ? t("tomorrow") : t("days").replace("{count}", formatNumber(days, lang))}
            </span>
          )}
          {isPast && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] text-muted-foreground border border-border">{t("ended")}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap text-[10px] text-muted-foreground">
           <span style={{ color: dm.color }}>{dm.icon} {s[ev.domain as keyof typeof s] ?? dm.label}</span>
          <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {ev.country} {ev.location}</span>
           <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {formatDate(ev.eventDate, lang, { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
        {/* Impact bar */}
        <div className="flex items-center gap-2 mt-2">
           <span className="text-[10px] text-muted-foreground w-12 shrink-0">{s.impact}</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#ffffff10" }}>
            <motion.div className="h-full rounded-full"
              initial={{ width: 0 }} animate={{ width: `${impact}%` }} transition={{ duration: 1, ease: "easeOut" }}
              style={{ background: `linear-gradient(90deg, ${dm.color}, ${GREEN})` }} />
          </div>
           <span className="text-[10px] font-black" style={{ color: dm.color }}>{formatNumber(impact, lang)}</span>
        </div>
      </div>
    </div>
  );
}
