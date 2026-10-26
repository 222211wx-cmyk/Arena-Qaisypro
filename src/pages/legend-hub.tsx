import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, ArrowLeft, Dna, Video, Globe2, MessageSquare,
  Send, ThumbsUp, Play, Coins, Zap, Star, Globe,
  Calendar, BookOpen, Mic, Camera, Users, Radio,
  ExternalLink, Clock, Trophy,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getLegendImageUrl } from "@/lib/legend-images";
import { useLang } from "@/contexts/LangContext";
import { coreCopy } from "@/i18n/core-auth-copy";
import { formatDate, formatNumber, interpolate, relativeTime, surfaceCopy } from "@/i18n/content-surfaces-copy";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Legend {
  id: number; name: string; domain: string; nationality: string;
  rank: number; score: number; imageUrl: string | null; peakYear: number | null;
  bio: { childhood: string; training: string; breakthrough: string; stardom: string } | null;
  videos: Array<{ youtubeId: string; title: string }> | null;
  stats: { clutch: number; legacy: number; style: number; impact: number; peak: number } | null;
}
interface Debate  { id: number; username: string; message: string; likes: number; createdAt: string; }
interface Story   { id: number; username: string; content: string; type: string; mediaUrl: string | null; likes: number; createdAt: string; expiresAt: string; }
interface ArenaEv { id: number; title: string; speaker: string | null; eventType: string; youtubeId: string | null; eventDate: string; isLive: boolean; icon: string; coinsReward: number; }

const GREEN = "#22c55e";

const DOMAIN_META: Record<string, { color: string; bg: string; icon: string }> = {
  sport:    { color: "#22d3ee",  bg: "rgba(34,211,238,0.08)",   icon: "⚡" },
  tech:     { color: "#a78bfa",  bg: "rgba(167,139,250,0.08)",  icon: "🔮" },
  music:    { color: "#f472b6",  bg: "rgba(244,114,182,0.08)",  icon: "🎵" },
  business: { color: "#4ade80",  bg: "rgba(74,222,128,0.08)",   icon: "💎" },
  cinema:   { color: "#fb923c",  bg: "rgba(251,146,60,0.08)",   icon: "🎬" },
};

type Tab = "nostalgia" | "moments" | "arena" | "comms";

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-300"
          initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: "easeOut" }} />
      </div>
      <span className="text-sm font-black text-yellow-400 w-7 text-right">{value}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — NOSTALGIA DNA (GREEN THEME — PAST)
// ══════════════════════════════════════════════════════════════════════════════
function NostalgiaTab({ legend }: { legend: Legend }) {
  const { lang } = useLang();
  const s = surfaceCopy(lang);
  const imageUrl = getLegendImageUrl(legend.name, legend.imageUrl);
  const stages = [
    { key: "childhood", icon: "🌱", label: s.childhood, color: GREEN, border: `${GREEN}40` },
    { key: "training", icon: "⚔️", label: s.training, color: "#22d3ee", border: "rgba(34,211,238,0.4)" },
    { key: "breakthrough", icon: "💥", label: s.breakthrough, color: "#fb923c", border: "rgba(251,146,60,0.4)" },
    { key: "stardom", icon: "👑", label: s.stardom, color: "#FFD700", border: "rgba(255,215,0,0.4)" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold tracking-widest"
          style={{ background: `${GREEN}10`, borderColor: `${GREEN}40`, color: GREEN }}>
           <Dna className="w-3.5 h-3.5" /> {s.nostalgiaHero}
        </div>
         <p className="text-xs text-muted-foreground mt-2">{s.nostalgiaIntro}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-56 shrink-0 rounded-2xl overflow-hidden aspect-[3/4] bg-muted"
          style={{ border: `1px solid ${GREEN}30` }}>
          {imageUrl
            ? <img src={imageUrl} alt={legend.name} className="w-full h-full object-cover object-top" />
            : <div className="w-full h-full flex items-center justify-center text-6xl font-black" style={{ color: GREEN }}>{legend.name.charAt(0)}</div>
          }
        </div>
        <div className="flex-1 space-y-4">
          <h2 className="text-2xl font-black">{legend.name}</h2>
          <div className="relative border-l-2 pl-6 rtl:border-l-0 rtl:border-r-2 rtl:pl-0 rtl:pr-6 space-y-6" style={{ borderColor: `${GREEN}40` }}>
            {stages.map((s) => {
              const text = legend.bio?.[s.key];
              if (!text) return null;
              return (
                <motion.div key={s.key} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                  <div className="absolute -left-2.5 rtl:left-auto rtl:-right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: s.border, border: `1px solid ${s.color}` }}>
                    {s.icon}
                  </div>
                  <div className="p-4 rounded-2xl border" style={{ borderColor: s.border, background: `${s.color}05` }}>
                    <div className="text-xs font-black tracking-widest mb-2" style={{ color: s.color }}>{s.label}</div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{text}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — PEAK MOMENTS (PRESENT)
// ══════════════════════════════════════════════════════════════════════════════
function MomentsTab({ legend }: { legend: Legend }) {
  const { lang } = useLang();
  const s = surfaceCopy(lang);
  const { user } = useAuth();
  const [rewarded, setRewarded] = useState<Set<string>>(new Set());
  const [toasts,   setToasts]   = useState<{ id: number; msg: string }[]>([]);

  const handleWatch = async (youtubeId: string) => {
    if (rewarded.has(youtubeId)) return;
    setRewarded(prev => new Set([...prev, youtubeId]));
    const res = await fetch(`/api/legends/${legend.id}/watch`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: youtubeId }),
    });
    const data = await res.json() as { xpEarned: number; message: string };
    if (data.xpEarned) {
      const id = Date.now();
      setToasts(t => [...t, { id, msg: data.message }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
    }
  };

  const videos = legend.videos ?? [];

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold tracking-widest">
           <Video className="w-3.5 h-3.5" /> {s.momentsHero}
        </div>
         {user && <p className="text-xs text-green-400 mt-2 font-bold">{s.watchReward}</p>}
      </div>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg">
            ⚡ {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="grid gap-4">
        {videos.map((v, i) => (
          <motion.div key={v.youtubeId} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="rounded-2xl overflow-hidden border border-border/50 bg-card hover:border-primary/30 transition-colors">
            <div className="relative group cursor-pointer" onClick={() => void handleWatch(v.youtubeId)}>
              <img src={`https://img.youtube.com/vi/${v.youtubeId}/maxresdefault.jpg`}
                className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                alt={v.title} onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`; }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-black/60 border-2 border-white/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 text-white fill-white ml-1" />
                </div>
              </div>
              {rewarded.has(v.youtubeId) && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">+20 XP ✓</div>
              )}
            </div>
            <div className="p-3 flex items-center justify-between gap-2">
              <p className="text-sm font-medium flex-1 min-w-0 truncate">{v.title}</p>
              <a href={`https://youtube.com/watch?v=${v.youtubeId}`} target="_blank" rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors" onClick={e => e.stopPropagation()}>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — GLOBAL ARENA (FUTURE — live lectures, debates, conferences)
// ══════════════════════════════════════════════════════════════════════════════
function GlobalArenaTab({ legend }: { legend: Legend }) {
  const { lang } = useLang();
  const s = surfaceCopy(lang);
  const { user } = useAuth();
  const [events, setEvents] = useState<ArenaEv[]>([]);
  const [joining, setJoining] = useState<number | null>(null);
  const [joined, setJoined]   = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch(`/api/legends/${legend.id}/arena`, { credentials: "include" })
      .then(r => r.json() as Promise<{ events: ArenaEv[] }>)
      .then(d => setEvents(d.events ?? []));
  }, [legend.id]);

  const handleJoin = async (eventId: number) => {
    if (!user || joining || joined.has(eventId)) return;
    setJoining(eventId);
    const res = await fetch(`/api/legends/${legend.id}/join-event`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    const data = await res.json() as { coinsEarned: number };
    if (data.coinsEarned) setJoined(prev => new Set([...prev, eventId]));
    setJoining(null);
  };

  const live     = events.filter(e => e.isLive);
  const upcoming = events.filter(e => !e.isLive);

  const TYPE_ICON: Record<string, string> = { lecture:"🎓", debate:"⚔️", conference:"🌍", summit:"🏛️" };

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold tracking-widest"
          style={{ background: "rgba(167,139,250,0.1)", borderColor: "rgba(167,139,250,0.4)", color: "#a78bfa" }}>
           <Globe2 className="w-3.5 h-3.5" /> {s.arenaHero}
        </div>
         <p className="text-xs text-muted-foreground mt-2">{s.joinReward}</p>
      </div>

      {live.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> {s.liveNow}
          </div>
          {live.map(ev => (
            <div key={ev.id} className="p-4 rounded-2xl border bg-red-500/5 border-red-500/30">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ev.icon}</span>
                  <div>
                    <div className="font-bold text-sm">{ev.title}</div>
                    {ev.speaker && <div className="text-xs text-muted-foreground mt-0.5">🎤 {ev.speaker}</div>}
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">{s.live}</span>
                      <span className="text-xs text-muted-foreground">{TYPE_ICON[ev.eventType]} {s[ev.eventType as keyof typeof s] ?? ev.eventType}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => void handleJoin(ev.id)} disabled={!user || joined.has(ev.id) || joining === ev.id}
                  className="shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: joined.has(ev.id) ? "#22c55e20" : "rgba(255,215,0,0.2)", color: joined.has(ev.id) ? "#22c55e" : "#FFD700", border: `1px solid ${joined.has(ev.id) ? "#22c55e40" : "rgba(255,215,0,0.4)"}` }}>
                   {joined.has(ev.id) ? s.joined : user ? s.join : s.loginJoin}
                </button>
              </div>
              {ev.youtubeId && (
                <div className="mt-3 rounded-xl overflow-hidden border border-border/30">
                  <div className="relative" style={{ paddingTop: "56.25%" }}>
                    <iframe src={`https://www.youtube.com/embed/${ev.youtubeId}?autoplay=0&rel=0`}
                      className="absolute inset-0 w-full h-full" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
         <div className="text-xs font-bold text-muted-foreground tracking-widest">{s.upcomingEvents}</div>
        {upcoming.map((ev, i) => (
          <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/20 transition-colors">
            <span className="text-2xl shrink-0">{ev.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{ev.title}</div>
              {ev.speaker && <div className="text-xs text-muted-foreground">🎤 {ev.speaker}</div>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{TYPE_ICON[ev.eventType]} {s[ev.eventType as keyof typeof s] ?? ev.eventType}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                   {formatDate(ev.eventDate, lang)}
                </span>
              </div>
            </div>
            <button onClick={() => void handleJoin(ev.id)} disabled={!user || joined.has(ev.id) || joining === ev.id}
              className="shrink-0 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-40"
              style={{ background: joined.has(ev.id) ? "#22c55e20" : "rgba(255,215,0,0.15)", color: joined.has(ev.id) ? "#22c55e" : "#FFD700", border: `1px solid ${joined.has(ev.id) ? "#22c55e40" : "rgba(255,215,0,0.3)"}` }}>
              {joined.has(ev.id) ? "✓ +50 🪙" : "+50 🪙"}
            </button>
          </motion.div>
        ))}
        {upcoming.length === 0 && live.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
             <p className="text-sm">{s.noArena}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — COMMUNICATION HUB (Discord + Instagram style)
// ══════════════════════════════════════════════════════════════════════════════
function CommsTab({ legend }: { legend: Legend }) {
  const { lang } = useLang();
  const copy = coreCopy(lang);
  const s = surfaceCopy(lang);
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<"chat" | "stories">("chat");

  // Chat state
  const [debates, setDebates]       = useState<Debate[]>([]);
  const [message, setMessage]       = useState("");
  const [sending, setSending]       = useState(false);
  const [chatToast, setChatToast]   = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Stories state
  const [stories, setStories]       = useState<Story[]>([]);
  const [storyText, setStoryText]   = useState("");
  const [postingStory, setPostingStory] = useState(false);
  const [storyToast, setStoryToast] = useState<string | null>(null);

  const loadChat = useCallback(async (silent = false) => {
    if (!silent) { /* keep existing */ }
    const res = await fetch(`/api/legends/${legend.id}`, { credentials: "include" });
    const data = await res.json() as { debates: Debate[] };
    setDebates(data.debates ?? []);
  }, [legend.id]);

  const loadStories = useCallback(async () => {
    const res = await fetch(`/api/legends/${legend.id}/stories`, { credentials: "include" });
    const data = await res.json() as { stories: Story[] };
    setStories(data.stories ?? []);
  }, [legend.id]);

  useEffect(() => { void loadChat(); void loadStories(); }, [loadChat, loadStories]);
  useEffect(() => {
    const t = setInterval(() => void loadChat(true), 6000);
    return () => clearInterval(t);
  }, [loadChat]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [debates.length]);

  const sendMessage = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/legends/${legend.id}/debate`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    });
    const data = await res.json() as { xpEarned: number; coinsEarned: number; error?: string };
    if (!res.ok) { alert(data.error ?? s.error); setSending(false); return; }
    setMessage("");
    void loadChat();
    if (data.xpEarned) {
      setChatToast(`+${formatNumber(data.xpEarned, lang)} XP +${formatNumber(data.coinsEarned, lang)} ${s.coins} 🔥`);
      setTimeout(() => setChatToast(null), 3000);
    }
    setSending(false);
  };

  const postStory = async () => {
    if (!storyText.trim() || postingStory) return;
    setPostingStory(true);
    const res = await fetch(`/api/legends/${legend.id}/story`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: storyText.trim(), type: "text" }),
    });
    const data = await res.json() as { coinsEarned: number; error?: string };
    if (!res.ok) { alert(data.error ?? s.error); setPostingStory(false); return; }
    setStoryText("");
    void loadStories();
    if (data.coinsEarned) {
      setStoryToast(`+${formatNumber(data.coinsEarned, lang)} ${s.coins}! 📖`);
      setTimeout(() => setStoryToast(null), 3000);
    }
    setPostingStory(false);
  };

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold tracking-widest"
          style={{ background: "rgba(34,211,238,0.1)", borderColor: "rgba(34,211,238,0.4)", color: "#22d3ee" }}>
           <MessageSquare className="w-3.5 h-3.5" /> {s.communicationHub}
        </div>
         <p className="text-xs text-muted-foreground mt-1">{s.communicationIntro}</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex rounded-xl border border-border overflow-hidden">
         {([["chat", s.liveChat, s.debate], ["stories", s.stories, s.posts24]] as const).map(([id, label, sub]) => (
          <button key={id} onClick={() => setSubTab(id as "chat" | "stories")}
            className={`flex-1 py-2.5 text-xs font-bold transition-all ${subTab === id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {label} <span className="ml-1 opacity-60 font-normal">{sub}</span>
          </button>
        ))}
      </div>

      {/* ─ CHAT ─ */}
      {subTab === "chat" && (
        <div className="space-y-3">
           {user && <p className="text-center text-xs text-yellow-400 font-bold">{s.debateReward}</p>}
          <div className="h-72 overflow-y-auto space-y-2 p-3 rounded-2xl border border-border/40 bg-black/20">
            {debates.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
                 {s.firstSpeak}
              </div>
            )}
            {debates.map(d => (
              <div key={d.id} className="flex items-start gap-2">
                <Link href={`/citizen/${d.username}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-primary-foreground bg-primary shrink-0 cursor-pointer hover:scale-110 transition-transform">
                    {d.username.charAt(0).toUpperCase()}
                  </div>
                </Link>
                <div className="flex-1 bg-card/60 rounded-xl px-3 py-2 border border-border/40">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link href={`/citizen/${d.username}`} className="text-xs font-bold hover:text-primary transition-colors">{d.username}</Link>
                     <span className="text-[10px] text-muted-foreground ms-auto">{relativeTime(d.createdAt, lang)}</span>
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed">{d.message}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input value={message} onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }}}
               placeholder={user ? s.speakPlaceholder : s.loginDebatePlaceholder}
              disabled={!user} maxLength={500}
              className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-border focus:border-primary focus:outline-none text-sm disabled:opacity-50" />
            <button onClick={() => void sendMessage()} disabled={!user || !message.trim() || sending}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 active:scale-95 transition-all">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <AnimatePresence>
            {chatToast && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center text-yellow-400 text-xs font-bold">{chatToast}</motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ─ STORIES ─ */}
      {subTab === "stories" && (
        <div className="space-y-4">
          {user && (
            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-primary-foreground">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-bold">{user.username}</span>
                 <span className="ms-auto text-xs text-yellow-400 font-bold">{s.storyReward}</span>
              </div>
              <textarea value={storyText} onChange={e => setStoryText(e.target.value)}
                placeholder={copy.storyPlaceholder}
                maxLength={280} rows={3}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none text-sm resize-none" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{storyText.length}/280</span>
                <button onClick={() => void postStory()} disabled={!storyText.trim() || postingStory}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-40 active:scale-95 transition-all">
                   {postingStory ? s.posting : s.postStoryButton}
                </button>
              </div>
            </div>
          )}
          <AnimatePresence>
            {storyToast && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center text-yellow-400 text-xs font-bold">{storyToast}</motion.div>
            )}
          </AnimatePresence>

          {stories.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
               <p className="text-sm">{s.noStories}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stories.map(story => {
                const hoursLeft = Math.max(0, Math.floor((new Date(story.expiresAt).getTime() - Date.now()) / 3600000));
                return (
                  <motion.div key={story.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl border border-border/50 bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-yellow-500/60 flex items-center justify-center text-[10px] font-black text-black">
                        {story.username.charAt(0).toUpperCase()}
                      </div>
                      <Link href={`/citizen/${story.username}`} className="text-xs font-bold hover:text-primary transition-colors">{story.username}</Link>
                       <span className="ms-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                         <Clock className="w-3 h-3" /> {interpolate(s.hoursLeft, { count: formatNumber(hoursLeft, lang) })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/85 leading-relaxed">{story.content}</p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN HUB PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function LegendHubPage() {
  const { lang } = useLang();
  const copy = coreCopy(lang);
  const s = surfaceCopy(lang);
  const params  = useParams<{ id: string }>();
  const [legend, setLegend] = useState<Legend | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("nostalgia");

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    setLoading(true);
    fetch(`/api/legends/${id}`, { credentials: "include" })
      .then(r => r.json() as Promise<{ legend: Legend }>)
      .then(d => { setLegend(d.legend ?? null); })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">{s.loadingArchive}</p>
      </div>
    </div>
  );

  if (!legend) return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div>
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-2">{s.legendNotFound}</h2>
        <Link href="/legends"><button className="text-primary hover:underline">← {s.backTop}</button></Link>
      </div>
    </div>
  );

  const meta = DOMAIN_META[legend.domain] ?? DOMAIN_META.sport;
  const imageUrl = getLegendImageUrl(legend.name, legend.imageUrl);

  const TABS = [
    { id: "nostalgia" as Tab, label: s.nostalgiaTab, icon: <Dna className="w-4 h-4" />, color: GREEN },
    { id: "moments" as Tab, label: s.momentsTab, icon: <Video className="w-4 h-4" />, color: meta.color },
    { id: "arena" as Tab, label: s.arenaTab, icon: <Globe2 className="w-4 h-4" />, color: "#a78bfa" },
    { id: "comms" as Tab, label: s.commsTab, icon: <MessageSquare className="w-4 h-4" />, color: "#22d3ee" },
  ];

  return (
    <div className="min-h-screen bg-background" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="relative border-b border-primary/10 overflow-hidden"
        style={{ background: `linear-gradient(135deg, #000 0%, ${meta.bg} 100%)` }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(ellipse at 80% -20%, ${GREEN}10, transparent 50%)` }} />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link href="/legends">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm mb-6">
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {s.backTop}
            </button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted shrink-0 border" style={{ borderColor: `${meta.color}40` }}>
              {imageUrl
                ? <img src={imageUrl} alt={legend.name} className="w-full h-full object-cover object-top" />
                : <div className="w-full h-full flex items-center justify-center text-2xl font-black" style={{ color: meta.color }}>{legend.name.charAt(0)}</div>
              }
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-black">{legend.name}</h1>
                <div className="px-2 py-0.5 rounded-full text-xs font-black text-black"
                  style={{ background: legend.rank === 1 ? "linear-gradient(135deg,#FFD700,#FFA500)" : meta.color }}>
                  {legend.rank === 1 ? s.champion : `#${formatNumber(legend.rank, lang)}`}
                </div>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span style={{ color: meta.color }}>{meta.icon} {(s[legend.domain as keyof typeof s] ?? legend.domain).toUpperCase()}</span>
                <span>· {legend.nationality}</span>
                <span>· {copy.score}: <strong style={{ color: meta.color }}>{formatNumber(legend.score, lang)}</strong></span>
              </div>
              <div className="flex gap-2 mt-2">
                {TABS.map(t => (
                  <div key={t.id} className="w-2 h-2 rounded-full transition-all"
                    style={{ background: tab === t.id ? t.color : "rgba(255,255,255,0.1)" }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-4 text-xs font-bold tracking-widest whitespace-nowrap border-b-2 transition-all"
                style={{ borderColor: tab === t.id ? t.color : "transparent", color: tab === t.id ? t.color : undefined }}
                onMouseEnter={e => { if (tab !== t.id) (e.currentTarget as HTMLButtonElement).style.color = t.color; }}
                onMouseLeave={e => { if (tab !== t.id) (e.currentTarget as HTMLButtonElement).style.color = ""; }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {tab === "nostalgia" && <NostalgiaTab legend={legend} />}
            {tab === "moments"   && <MomentsTab  legend={legend} />}
            {tab === "arena"     && <GlobalArenaTab legend={legend} />}
            {tab === "comms"     && <CommsTab    legend={legend} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
