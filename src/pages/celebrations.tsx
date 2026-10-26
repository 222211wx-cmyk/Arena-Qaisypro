import { useEffect, useState, useCallback } from "react";
import SmartDomainWidget from "@/components/SmartDomainWidget";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import {
  Trophy, Crown, Star, Send, Heart, Calendar, Flame, Sparkles,
  Palette, Video, Lightbulb, Type, Globe2, Award, Shield
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { useLang } from "@/contexts/LangContext";
import { contentCopy } from "@/i18n/content-discovery-copy";
import { formatNumber, interpolate, localeFor, relativeTime, surfaceCopy } from "@/i18n/content-surfaces-copy";

interface Celebration {
  id: number; title: string; titleAr: string | null; category: string;
  description: string; date: string; icon: string; color: string;
  isLive: boolean; coinsReward: number; topContributorCoins: number;
}
interface Entry {
  id: number; username: string; content: string; mediaUrl: string | null;
  entryType: string; likes: number; isWinner: boolean; hasImperialLaurel: boolean;
  createdAt: string;
}

const GREEN    = "#22c55e";
const DARK_BG  = "#050a05";
const CARD_BG  = "#0a120a";
const BORDER_G = "#22c55e22";

const CAT_META: Record<string, { label: string; color: string; icon: string }> = {
  sport:    { label: "Sport",    color: "#22d3ee", icon: "⚡" },
  science:  { label: "Science",  color: "#a78bfa", icon: "🔬" },
  art:      { label: "Art",      color: "#fb923c", icon: "🎨" },
  holiday:  { label: "Holiday",  color: "#4ade80", icon: "🌙" },
  music:    { label: "Music",    color: "#f472b6", icon: "🎵" },
  global:   { label: "Global",   color: GREEN,     icon: "🌍" },
};

const ENTRY_TYPE_ICON: Record<string, ReactNode> = {
  text:  <Type className="w-3 h-3" />,
  art:   <Palette className="w-3 h-3" />,
  video: <Video className="w-3 h-3" />,
  idea:  <Lightbulb className="w-3 h-3" />,
};

function daysLabel(d: string, isLive: boolean, lang: Parameters<typeof surfaceCopy>[0]) {
  if (isLive) return null;
  const s = surfaceCopy(lang);
  const diff = new Date(d).getTime() - Date.now();
  if (diff < 0) return s.ended;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return s.today;
  if (days === 1) return s.tomorrow;
  return new Intl.RelativeTimeFormat(localeFor(lang), { numeric: "always" }).format(days, "day");
}

function entryTypeLabel(entryType: string, copy: ReturnType<typeof surfaceCopy>) {
  const labels: Record<string, string> = {
    text: copy.text,
    idea: copy.idea,
    art: copy.art,
    video: copy.video,
  };
  return labels[entryType] ?? entryType;
}

export default function CelebrationsPage() {
  const { lang } = useLang();
  const t = (key: Parameters<typeof contentCopy>[1]) => contentCopy(lang, key);
  const s = surfaceCopy(lang);
  const { user } = useAuth();
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [selected,   setSelected]       = useState<Celebration | null>(null);
  const [entries,    setEntries]         = useState<Entry[]>([]);
  const [content,    setContent]         = useState("");
  const [mediaUrl,   setMediaUrl]        = useState("");
  const [entryType,  setEntryType]       = useState<"text"|"art"|"video"|"idea">("text");
  const [liked,      setLiked]           = useState<Set<number>>(new Set());
  const [submitting, setSubmitting]      = useState(false);
  const [toast,      setToast]           = useState<string | null>(null);
  const [error,      setError]           = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/celebrations", { credentials: "include" })
      .then(r => r.json() as Promise<{ celebrations: Celebration[] }>)
      .then(d => {
        setCelebrations(d.celebrations ?? []);
        const live = d.celebrations?.find(c => c.isLive);
        if (live) void openCelebration(live);
      });
  }, []);

  const openCelebration = async (cel: Celebration) => {
    setSelected(cel); setContent(""); setError(null);
    const res = await fetch(`/api/celebrations/${cel.id}`, { credentials: "include" });
    const data = await res.json() as { celebration: Celebration; entries: Entry[] };
    setEntries(data.entries ?? []);
  };

  const submit = async () => {
    if (!selected || !content.trim() || submitting) return;
    setSubmitting(true); setError(null);
    const res = await fetch(`/api/celebrations/${selected.id}/submit`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim(), mediaUrl: mediaUrl.trim() || undefined, entryType }),
    });
    const data = await res.json() as { coinsEarned?: number; error?: string };
    if (!res.ok) { setError(data.error ?? s.error); setSubmitting(false); return; }
    setContent(""); setMediaUrl("");
    if (data.coinsEarned) {
      setToast(`+${formatNumber(data.coinsEarned, lang)} ${s.coins}! 🎉`);
      setTimeout(() => setToast(null), 4000);
    }
    // Reload entries
    const r2 = await fetch(`/api/celebrations/${selected.id}`, { credentials: "include" });
    const d2 = await r2.json() as { entries: Entry[] };
    setEntries(d2.entries ?? []);
    setSubmitting(false);
  };

  const like = async (entryId: number) => {
    if (!selected || liked.has(entryId)) return;
    setLiked(prev => new Set([...prev, entryId]));
    await fetch(`/api/celebrations/${selected.id}/entries/${entryId}/like`, { method: "POST", credentials: "include" });
    const r2 = await fetch(`/api/celebrations/${selected.id}`, { credentials: "include" });
    const d2 = await r2.json() as { entries: Entry[] };
    setEntries(d2.entries ?? []);
  };

  const live    = celebrations.filter(c => c.isLive);
  const upcoming = celebrations.filter(c => !c.isLive);

  return (
    <div className="min-h-screen" dir={lang === "ar" ? "rtl" : "ltr"} style={{ background: DARK_BG, color: "#e5ffe5" }}>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b" style={{ borderColor: BORDER_G }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(${GREEN}08 1px, transparent 1px), linear-gradient(90deg, ${GREEN}08 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse at 50% -20%, #FFD70018, transparent 50%), radial-gradient(ellipse at 80% 50%, ${GREEN}12, transparent 40%)`,
        }} />
        <div className="relative max-w-5xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5 text-xs font-bold tracking-widest"
            style={{ borderColor: "#FFD70050", background: "#FFD70010", color: "#FFD700" }}>
             <Trophy className="w-3.5 h-3.5" /> {s.celebrationsHub}
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-3" style={{ color: "hsl(var(--foreground))" }}>
            {t("celebrationsTitle")}
          </h1>
          <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
             {s.celebrationsIntro}<br />
             <span className="text-yellow-400 font-bold">{s.bestContribution}</span>
          </p>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="text-2xl font-black text-red-400 flex items-center gap-1.5 justify-center">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> {formatNumber(live.length, lang)}
              </div>
               <div className="text-xs text-muted-foreground">{s.liveEvents}</div>
            </div>
            <div className="text-center">
               <div className="text-2xl font-black" style={{ color: GREEN }}>{formatNumber(celebrations.length, lang)}</div>
               <div className="text-xs text-muted-foreground">{s.totalEvents}</div>
            </div>
            <div className="text-center">
               <div className="text-2xl font-black text-yellow-400">{formatNumber(500, lang)}</div>
               <div className="text-xs text-muted-foreground">{s.topCoinsPrize}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full font-bold text-sm shadow-xl"
            style={{ background: "#FFD700", color: "#000" }}>
            🎉 {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Smart Domain Widget */}
        <SmartDomainWidget domainId="competitions" label={s.competitionsModule} />

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* ── Event list ── */}
          <div className="space-y-4">
            {live.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-xs font-black text-red-400 tracking-widest">{s.liveCelebrations}</span>
                </div>
                 {live.map(c => <CelebCard key={c.id} cel={c} lang={lang} isActive={selected?.id === c.id} onClick={() => void openCelebration(c)} />)}
              </div>
            )}
            <div>
               <div className="text-xs font-black text-muted-foreground tracking-widest mb-3">{s.upcomingCelebrations}</div>
               {upcoming.map(c => <CelebCard key={c.id} cel={c} lang={lang} isActive={selected?.id === c.id} onClick={() => void openCelebration(c)} />)}
            </div>
          </div>

          {/* ── Selected celebration detail ── */}
          {selected ? (
            <div className="space-y-5">
              {/* Header */}
              <div className="p-5 rounded-2xl border" style={{ background: CARD_BG, borderColor: `${selected.color}40` }}>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{selected.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="text-xl font-black">{selected.title}</h2>
                      {selected.isLive && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> {t("live")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{selected.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs">
                       <span className="font-bold" style={{ color: GREEN }}>+{formatNumber(selected.coinsReward, lang)} {s.perEntry}</span>
                       <span className="font-bold text-yellow-400">🏛️ {s.bestEntry}: +{formatNumber(selected.topContributorCoins, lang)} {s.coins} + {s.imperialLaurel}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit form */}
              {user ? (
                <div className="p-4 rounded-2xl border space-y-3" style={{ background: CARD_BG, borderColor: `${GREEN}30` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black" style={{ background: GREEN }}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{user.username}</div>
                       <div className="text-xs text-muted-foreground">{s.submitContribution}</div>
                    </div>
                     <div className="ms-auto text-xs font-bold text-yellow-400">+{formatNumber(selected.coinsReward, lang)} {s.coins}</div>
                  </div>
                  {/* Entry type */}
                  <div className="flex gap-2 flex-wrap">
                    {(["text", "idea", "art", "video"] as const).map(t => (
                      <button key={t} onClick={() => setEntryType(t)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all capitalize"
                        style={{ borderColor: entryType === t ? "#FFD70060" : BORDER_G, background: entryType === t ? "#FFD70015" : "transparent", color: entryType === t ? "#FFD700" : "hsl(var(--muted-foreground))" }}>
                         {ENTRY_TYPE_ICON[t]} {s[t]}
                      </button>
                    ))}
                  </div>
                  <textarea value={content} onChange={e => setContent(e.target.value)}
                     placeholder={interpolate(s.shareEntry, { type: s[entryType] })}
                    maxLength={600} rows={3}
                    className="w-full px-3 py-2 rounded-xl border resize-none text-sm focus:outline-none"
                    style={{ background: "#050a05", borderColor: BORDER_G, color: "#e5ffe5" }} />
                  {(entryType === "video" || entryType === "art") && (
                    <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)}
                      placeholder={t("celebrationMediaPlaceholder")}
                      className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
                      style={{ background: "#050a05", borderColor: BORDER_G, color: "#e5ffe5" }} />
                  )}
                  {error && (
                    <div className="flex items-center gap-2 p-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
                      <Shield className="w-3.5 h-3.5" /> 🛡️ {error}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{content.length}/600</span>
                    <button onClick={() => void submit()} disabled={!content.trim() || submitting}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-40"
                      style={{ background: "#FFD700", color: "#000" }}>
                      <Send className="w-4 h-4" />
                       {submitting ? s.submitting : interpolate(s.submit, { type: s[entryType] })}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border text-center" style={{ background: CARD_BG, borderColor: BORDER_G }}>
                   <p className="text-muted-foreground text-sm mb-3">{s.loginParticipate}</p>
                  <Link href="/login">
                     <button className="px-5 py-2 rounded-xl font-bold text-xs text-black" style={{ background: GREEN }}>{t("joinEmpire")}</button>
                  </Link>
                </div>
              )}

              {/* Entries */}
              <div>
                <div className="text-xs font-black text-muted-foreground tracking-widest mb-3">
                   {s.contributions} — {formatNumber(entries.length, lang)} {s.entries}
                </div>
                {entries.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-20" />
                     <p className="text-sm">{s.firstContribution}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entries.map((e, i) => {
                      const ytId = e.mediaUrl?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]{11})/)?.[1];
                      return (
                        <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                          className="p-4 rounded-2xl border transition-colors"
                          style={{ background: CARD_BG, borderColor: e.hasImperialLaurel ? "#FFD70040" : BORDER_G }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-black shrink-0"
                              style={{ background: `linear-gradient(135deg, ${GREEN}, #16a34a)` }}>
                              {e.username.charAt(0).toUpperCase()}
                            </div>
                            <Link href={`/citizen/${e.username}`}>
                              <span className="text-sm font-bold hover:text-green-400 transition-colors cursor-pointer">{e.username}</span>
                            </Link>
                            {e.hasImperialLaurel && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                                style={{ background: "#FFD70020", color: "#FFD700", border: "1px solid #FFD70040" }}>
                                 🏛️ {s.imperialLaurel}
                              </span>
                            )}
                            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                              {ENTRY_TYPE_ICON[e.entryType]} {entryTypeLabel(e.entryType, s)}
                              <span className="ms-2">{relativeTime(e.createdAt, lang)}</span>
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed mb-2" style={{ color: "#d1ffd1" }}>{e.content}</p>
                          {ytId && (
                            <div className="rounded-xl overflow-hidden border mb-2" style={{ borderColor: BORDER_G }}>
                              <div className="relative" style={{ paddingTop: "56.25%" }}>
                                <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0`} className="absolute inset-0 w-full h-full" allowFullScreen />
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs" />
                            <button onClick={() => void like(e.id)} disabled={liked.has(e.id)}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all"
                              style={{ borderColor: liked.has(e.id) ? "#f4724860" : BORDER_G, color: liked.has(e.id) ? "#f47248" : "hsl(var(--muted-foreground))", background: liked.has(e.id) ? "#f4724810" : "transparent" }}>
                              <Heart className={`w-3 h-3 ${liked.has(e.id) ? "fill-current" : ""}`} />
                              {e.likes + (liked.has(e.id) && e.likes === 0 ? 1 : 0)}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex items-center justify-center text-muted-foreground flex-col gap-4">
              <Trophy className="w-16 h-16 opacity-10" style={{ color: "#FFD700" }} />
               <p className="font-bold text-lg">{s.selectCelebration}</p>
               <p className="text-sm opacity-60">{s.greatestMoments}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CelebCard({ cel, isActive, onClick, lang }: { cel: Celebration; isActive: boolean; onClick: () => void; lang: Parameters<typeof surfaceCopy>[0] }) {
  const s = surfaceCopy(lang);
  const cat = CAT_META[cel.category] ?? { color: GREEN, icon: "🎉", label: cel.category };
  const days = daysLabel(cel.date, cel.isLive, lang);
  return (
    <button onClick={onClick} className="w-full flex items-start gap-3 p-3 rounded-xl border text-left rtl:text-right transition-all mb-2"
      style={{ background: isActive ? `${cel.color}10` : CARD_BG, borderColor: isActive ? `${cel.color}50` : BORDER_G }}>
      <span className="text-2xl shrink-0">{cel.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm leading-snug truncate">{cel.title}</div>
        <div className="flex items-center gap-2 mt-0.5">
           <span className="text-[10px] font-bold" style={{ color: cat.color }}>{cat.icon} {s[cel.category as keyof typeof s] ?? cat.label}</span>
           {cel.isLive && <span className="flex items-center gap-0.5 text-[10px] text-red-400 font-bold"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />{s.live}</span>}
          {!cel.isLive && days && <span className="text-[10px] text-muted-foreground">{days}</span>}
        </div>
         <div className="text-[10px] text-yellow-400 font-bold mt-0.5">🏛️ {s.top}: +{formatNumber(cel.topContributorCoins, lang)} {s.coins}</div>
      </div>
    </button>
  );
}
