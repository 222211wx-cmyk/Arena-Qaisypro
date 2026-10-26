import { useEffect, useState, useCallback } from "react";
import SmartDomainWidget from "@/components/SmartDomainWidget";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Play, CheckCircle2, Zap, Users, Clock, Star, GraduationCap, ExternalLink, Award, Filter } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { useLang } from "@/contexts/LangContext";
import { contentCopy } from "@/i18n/content-discovery-copy";

interface Course {
  id: number;
  title: string; titleAr: string | null;
  domain: string; instructor: string; description: string;
  youtubeId: string | null; duration: number; xpReward: number;
  level: string; icon: string; totalStudents: number; isLive: boolean;
  completed?: boolean;
}
interface Stats { totalCourses: number; totalStudents: number; userCompleted: number; }

const GREEN     = "#22c55e";
const DARK_BG   = "#050a05";
const CARD_BG   = "#0a120a";
const BORDER_G  = "#22c55e22";

const DOMAIN_META: Record<string, { label: string; color: string; icon: string }> = {
  sport:     { label: "Sport",     color: "#22d3ee",  icon: "⚡" },
  tech:      { label: "Tech",      color: "#a78bfa",  icon: "🔮" },
  science:   { label: "Science",   color: "#38bdf8",  icon: "🔬" },
  music:     { label: "Music",     color: "#f472b6",  icon: "🎵" },
  business:  { label: "Business",  color: "#4ade80",  icon: "💰" },
  art:       { label: "Art",       color: "#fb923c",  icon: "🎨" },
  education: { label: "Education", color: GREEN,      icon: "📚" },
};

const LEVEL_COLOR: Record<string, string> = { beginner: "#4ade80", intermediate: "#fbbf24", advanced: "#f87171" };

const DOMAINS = ["all", "sport", "tech", "science", "music", "business", "art", "education"];

function timeStr(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function LearnPage() {
  const { lang } = useLang();
  const t = (key: Parameters<typeof contentCopy>[1]) => contentCopy(lang, key);
  const { user } = useAuth();
  const [courses, setCourses]  = useState<Course[]>([]);
  const [stats, setStats]      = useState<Stats | null>(null);
  const [filter, setFilter]    = useState("all");
  const [watching, setWatching] = useState<number | null>(null);
  const [toasts, setToasts]    = useState<{ id: number; msg: string }[]>([]);
  const [loading, setLoading]  = useState(true);

  const load = useCallback(async () => {
    const [cr, sr] = await Promise.all([
      fetch(`/api/learn/courses${filter !== "all" ? `?domain=${filter}` : ""}`, { credentials: "include" }),
      fetch("/api/learn/stats", { credentials: "include" }),
    ]);
    const cd = await cr.json() as { courses: Course[] };
    const sd = await sr.json() as Stats;
    setCourses(cd.courses ?? []);
    setStats(sd);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const complete = async (course: Course) => {
    if (watching === course.id) return;
    setWatching(course.id);
    const res = await fetch(`/api/learn/${course.id}/complete`, { method: "POST", credentials: "include" });
    const data = await res.json() as { xpEarned: number; message: string };
    if (data.xpEarned) {
      const id = Date.now();
      setToasts(t => [...t, { id, msg: data.message }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
      void load();
    }
    setWatching(null);
  };

  const live    = courses.filter(c => c.isLive);
  const regular = courses.filter(c => !c.isLive);

  return (
    <div className="min-h-screen" style={{ background: DARK_BG, color: "#e5ffe5" }}>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b" style={{ borderColor: BORDER_G }}>
        {/* grid bg */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(${GREEN}08 1px, transparent 1px), linear-gradient(90deg, ${GREEN}08 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse at 50% -30%, ${GREEN}18, transparent 60%)`,
        }} />
        <div className="relative max-w-5xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6 text-xs font-bold tracking-widest"
            style={{ borderColor: `${GREEN}50`, background: `${GREEN}10`, color: GREEN }}>
            <GraduationCap className="w-3.5 h-3.5" />
            EDUCATIONAL HUB — EMPIRE LEARNING SYSTEM
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4" style={{ color: "hsl(var(--foreground))" }}>
            {t("learnTitle")}
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Lectures, masterclasses, and knowledge sessions from the world's greatest minds. 
            Every lesson completed = XP earned.
          </p>
          {/* Stats bar */}
          {stats && (
            <div className="flex justify-center gap-8 flex-wrap">
              {[
                { icon: <BookOpen className="w-4 h-4" />, val: stats.totalCourses, label: "Courses" },
                { icon: <Users className="w-4 h-4" />,    val: stats.totalStudents, label: "Students" },
                { icon: <Zap className="w-4 h-4" />,      val: user ? stats.userCompleted : "?", label: "Completed" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="flex items-center justify-center gap-1.5 text-2xl font-black" style={{ color: GREEN }}>
                    {s.icon} {s.val}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full font-bold text-sm shadow-xl"
            style={{ background: GREEN, color: "#000" }}>
            ⚡ {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* ── Smart Domain Widget ── */}
        <SmartDomainWidget domainId="education" label="Module Éducation" />

        {/* ── Domain filter ── */}
        <div className="flex gap-2 flex-wrap">
          {DOMAINS.map(d => {
            const meta = DOMAIN_META[d];
            const active = filter === d;
            return (
              <button key={d} onClick={() => setFilter(d)}
                className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all border"
                style={{
                  borderColor: active ? (meta?.color ?? GREEN) : "#22c55e22",
                  background: active ? `${meta?.color ?? GREEN}20` : "transparent",
                  color: active ? (meta?.color ?? GREEN) : "#888",
                }}>
                {d === "all" ? `🌍 ${t("all")}` : `${meta?.icon} ${meta?.label}`}
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

        {/* ── LIVE courses ── */}
        {live.length > 0 && !loading && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-black text-red-400 tracking-widest">{t("liveNow")}</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {live.map(c => <CourseCard key={c.id} course={c} onComplete={complete} watching={watching} />)}
            </div>
          </div>
        )}

        {/* ── Regular courses ── */}
        {!loading && (
          <div>
            <div className="text-xs font-black text-muted-foreground tracking-widest mb-4">
              {filter === "all" ? "ALL COURSES" : `${DOMAIN_META[filter]?.icon} ${DOMAIN_META[filter]?.label?.toUpperCase()} COURSES`}
            </div>
            {regular.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>{t("noCourses")}</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regular.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <CourseCard course={c} onComplete={complete} watching={watching} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Anti-trivial badge ── */}
        <div className="flex items-center justify-center gap-3 py-6 border-t" style={{ borderColor: BORDER_G }}>
          <div className="px-5 py-2 rounded-full border text-xs font-bold tracking-widest"
            style={{ borderColor: `${GREEN}40`, color: GREEN, background: `${GREEN}08` }}>
            🛡️ EMPIRE CONTENT GUARDIAN — Only Education · Sport · Science · Art · Business · Debates
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseCard({ course, onComplete, watching }: { course: Course; onComplete: (c: Course) => void; watching: number | null }) {
  const { user } = useAuth();
  const dm   = DOMAIN_META[course.domain] ?? { color: GREEN, icon: "🎓", label: course.domain };
  const done = course.completed ?? false;

  return (
    <div className="rounded-2xl border overflow-hidden transition-all hover:border-green-500/30 group"
      style={{ background: CARD_BG, borderColor: done ? "#22c55e30" : BORDER_G }}>
      {/* Thumbnail */}
      {course.youtubeId ? (
        <div className="relative aspect-video bg-black overflow-hidden">
          <img src={`https://img.youtube.com/vi/${course.youtubeId}/maxresdefault.jpg`}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
            alt={course.title}
            onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${course.youtubeId}/hqdefault.jpg`; }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-white/70 bg-black/50 group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
          {course.isLive && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </div>
          )}
          {done && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
              style={{ background: GREEN, color: "#000" }}>
              <CheckCircle2 className="w-3 h-3" /> DONE
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-video flex items-center justify-center text-5xl" style={{ background: `${dm.color}10` }}>
          {course.icon}
        </div>
      )}

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-sm leading-snug">{course.title}</h3>
          <span className="text-lg shrink-0">{course.icon}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{course.description}</p>
        <div className="text-xs text-muted-foreground">🎤 {course.instructor}</div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: `${dm.color}20`, color: dm.color }}>{dm.icon} {dm.label}</span>
          <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: `${LEVEL_COLOR[course.level]}20`, color: LEVEL_COLOR[course.level] }}>{course.level}</span>
          <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {timeStr(course.duration)}</span>
          <span className="text-muted-foreground"><Users className="w-3 h-3 inline mr-0.5" />{course.totalStudents}</span>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: GREEN }}>
            <Zap className="w-3.5 h-3.5" /> +{course.xpReward} XP
          </div>
          <div className="flex gap-2">
            {course.youtubeId && (
              <a href={`https://youtube.com/watch?v=${course.youtubeId}`} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:opacity-80"
                style={{ borderColor: "#22c55e30", color: "#aaa" }}>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button onClick={() => void onComplete(course)}
              disabled={done || watching === course.id || !user}
              className="px-4 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-40"
              style={{ background: done ? "#22c55e20" : GREEN, color: done ? GREEN : "#000" }}>
              {watching === course.id ? "..." : done ? "✓ Completed" : user ? "Complete +XP" : "Login to Earn"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
