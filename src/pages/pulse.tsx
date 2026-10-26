import { useState, useEffect, useCallback, useRef } from "react";
import SmartDomainWidget from "@/components/SmartDomainWidget";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Send, Heart, Globe, Trophy, Cpu, Music, Film,
  Briefcase, Users, Coins, Star, Crown,
  AlertCircle, Radio, Calendar, Flame, Loader2, MessageSquare, Trash2
} from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/gdna-ds/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import type { Lang } from "@/contexts/LangContext";
import { useConnectivity } from "@/contexts/ConnectivityContext";
import { gameLocaleText } from "@/i18n/game-locale-copy";
import { formatSurfaceDate, formatSurfaceNumber } from "@/i18n/locale-surfaces-b-copy";

// ── Types ────────────────────────────────────────────────────────────────────
interface Post {
  id: number; userId: number | null; username: string; content: string; domain: string;
  type: string; likes: number; createdAt: string;
}
interface Event {
  id: number; title: string; titleAr: string | null; domain: string;
  location: string; country: string; eventDate: string; isLive: boolean;
  icon: string; color: string; impactScore: number;
}
interface Stats {
  users: number; posts: number; coinsCirculating: number; totalXp: number;
  liveEvents: Event[];
}

// ── Constants ────────────────────────────────────────────────────────────────
const DOMAIN_TABS = [
  { id: "all",      key: "domain_all",      icon: <Globe className="w-3.5 h-3.5" />,   color: "text-white" },
  { id: "sport",    key: "domain_sport",    icon: <Trophy className="w-3.5 h-3.5" />,  color: "text-cyan-400" },
  { id: "tech",     key: "domain_tech",     icon: <Cpu className="w-3.5 h-3.5" />,     color: "text-purple-400" },
  { id: "music",    key: "domain_music",    icon: <Music className="w-3.5 h-3.5" />,   color: "text-pink-400" },
  { id: "business", key: "domain_business", icon: <Briefcase className="w-3.5 h-3.5" />, color: "text-green-400" },
  { id: "cinema",   key: "domain_cinema",   icon: <Film className="w-3.5 h-3.5" />,    color: "text-orange-400" },
];

const POST_TYPES = [
  { id: "post",    key: "post_type_post" },
  { id: "victory", key: "post_type_victory" },
  { id: "tribute", key: "post_type_tribute" },
  { id: "vision",  key: "post_type_vision" },
];

const TYPE_COLORS: Record<string, string> = {
  post:    "text-primary border-primary/30 bg-primary/10",
  victory: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  tribute: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  vision:  "text-purple-400 border-purple-400/30 bg-purple-400/10",
};

const DOMAIN_COLORS: Record<string, string> = {
  sport: "#22d3ee", tech: "#a78bfa", music: "#f472b6",
  business: "#4ade80", cinema: "#fb923c", general: "#C9A84C",
};

const DELETE_COPY: Record<Lang, {
  action: string; title: string; description: string; cancel: string;
  confirm: string; pending: string; failed: string;
}> = {
  en: { action: "Delete", title: "Delete this post?", description: "This permanently removes the post and its likes, comments, reactions, and saves. This cannot be undone.", cancel: "Cancel", confirm: "Delete post", pending: "Deleting…", failed: "Could not delete this post. Please try again." },
  ar: { action: "حذف", title: "حذف هذا المنشور؟", description: "سيؤدي هذا إلى حذف المنشور نهائياً مع إعجاباته وتعليقاته وتفاعلاته وعمليات حفظه. لا يمكن التراجع عن ذلك.", cancel: "إلغاء", confirm: "حذف المنشور", pending: "جارٍ الحذف…", failed: "تعذّر حذف المنشور. حاول مرة أخرى." },
  fr: { action: "Supprimer", title: "Supprimer cette publication ?", description: "La publication, ses mentions J’aime, commentaires, réactions et enregistrements seront définitivement supprimés.", cancel: "Annuler", confirm: "Supprimer", pending: "Suppression…", failed: "Impossible de supprimer cette publication. Réessayez." },
  es: { action: "Eliminar", title: "¿Eliminar esta publicación?", description: "La publicación y sus Me gusta, comentarios, reacciones y elementos guardados se eliminarán permanentemente.", cancel: "Cancelar", confirm: "Eliminar", pending: "Eliminando…", failed: "No se pudo eliminar la publicación. Inténtalo de nuevo." },
  de: { action: "Löschen", title: "Diesen Beitrag löschen?", description: "Der Beitrag sowie seine Likes, Kommentare, Reaktionen und Speicherungen werden dauerhaft gelöscht.", cancel: "Abbrechen", confirm: "Beitrag löschen", pending: "Wird gelöscht…", failed: "Der Beitrag konnte nicht gelöscht werden. Bitte erneut versuchen." },
};

function timeAgo(dateStr: string, t: (key: string) => string, lang: Lang) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("time_just_now");
  if (m < 60) return `${formatSurfaceNumber(lang, m)}${t("time_min_ago")}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${formatSurfaceNumber(lang, h)}${t("time_hour_ago")}`;
  return `${formatSurfaceNumber(lang, Math.floor(h / 24))}${t("time_day_ago")}`;
}

// ── Empire Stats Bar ──────────────────────────────────────────────────────────
function StatsBar({ stats, t, lang }: { stats: Stats | null; t: (k: string) => string; lang: Lang }) {
  const items = [
    { icon: <Users className="w-4 h-4" />, label: t("pulse_citizens_stat"), value: stats ? formatSurfaceNumber(lang, stats.users) : "—", color: "text-primary" },
    { icon: <MessageSquare className="w-4 h-4" />, label: t("pulse_voices_stat"), value: stats ? formatSurfaceNumber(lang, stats.posts) : "—", color: "text-cyan-400" },
    { icon: <Coins className="w-4 h-4" />, label: t("pulse_coins_stat"), value: stats ? formatSurfaceNumber(lang, stats.coinsCirculating) : "—", color: "text-yellow-400" },
    { icon: <Star className="w-4 h-4" />, label: t("pulse_xp_stat"), value: stats ? formatSurfaceNumber(lang, stats.totalXp) : "—", color: "text-purple-400" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/50">
          <div className={`${item.color}`}>{item.icon}</div>
          <div>
            <div className={`font-black text-lg ${item.color}`}>{item.value}</div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Live Events Ticker ────────────────────────────────────────────────────────
function EventsPanel({ events, lang }: { events: Event[]; lang: Lang }) {
  const { t: eventsT } = useLang();
  const eventTitle = (event: Event) => lang === "ar" && event.titleAr ? event.titleAr : event.title;
  const live = events.filter(e => e.isLive);
  const upcoming = events.filter(e => !e.isLive).slice(0, 8);

  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">{eventsT("pulse_intl_events")}</span>
        </div>
        {live.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-400">{formatSurfaceNumber(lang, live.length)} {eventsT("pulse_live")}</span>
          </div>
        )}
      </div>

      {live.length > 0 && (
        <div className="p-3 space-y-2 border-b border-border/50">
          {live.map(ev => (
            <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: `${ev.color}15`, border: `1px solid ${ev.color}30` }}>
              <span className="text-xl">{ev.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate" style={{ color: ev.color }}>{eventTitle(ev)}</div>
                <div className="text-xs text-muted-foreground">{ev.country} {ev.location}</div>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-black">{eventsT("pulse_live")}</div>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
        {upcoming.length === 0 && live.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">{gameLocaleText(lang, "noEvents")}</p>
        )}
        {upcoming.map((ev, i) => (
          <motion.div key={ev.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="text-lg shrink-0">{ev.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{eventTitle(ev)}</div>
              <div className="text-xs text-muted-foreground">{ev.country} · {formatSurfaceDate(lang, ev.eventDate, { month: "short", day: "numeric", year: "numeric" })}</div>
            </div>
            <div className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: ev.color, background: `${ev.color}15` }}>
              {formatSurfaceNumber(lang, ev.impactScore)}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, onLike, onDeleted, currentUserId, lang }: {
  post: Post;
  onLike: (id: number) => Promise<boolean>;
  onDeleted: (id: number) => void;
  currentUserId?: number;
  lang: Lang;
}) {
  const [liked, setLiked] = useState(false);
  const [likeError, setLikeError] = useState(false);
  const { t } = useLang();
  const domColor = DOMAIN_COLORS[post.domain] ?? "#C9A84C";
  const deleteCopy = DELETE_COPY[lang];
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deletePendingRef = useRef(false);

  const handleLike = async () => {
    if (liked) return;
    setLiked(true);
    setLikeError(false);
    if (!await onLike(post.id)) {
      setLiked(false);
      setLikeError(true);
    }
  };

  const deletePost = async () => {
    if (deletePendingRef.current) return;
    deletePendingRef.current = true;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/pulse/post/${post.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setDeleteError(body.error ?? deleteCopy.failed);
        return;
      }
      setDeleteOpen(false);
      onDeleted(post.id);
    } catch {
      setDeleteError(deleteCopy.failed);
    } finally {
      deletePendingRef.current = false;
      setDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/20 transition-all">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 text-black"
          style={{ background: `linear-gradient(135deg, ${domColor}, ${domColor}99)` }}>
          {post.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Link href={`/citizen/${post.username}`} className="font-bold text-sm hover:text-primary transition-colors">{post.username}</Link>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[post.type] ?? TYPE_COLORS.post}`}>
              {t(POST_TYPES.find(item => item.id === post.type)?.key ?? "post_type_post")}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: domColor, background: `${domColor}15`, border: `1px solid ${domColor}30` }}>
              {t(`domain_${post.domain}`)}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">{timeAgo(post.createdAt, t, lang)}</span>
          </div>
          {/* Content */}
          <p className="text-sm text-foreground/90 leading-relaxed mb-3">{post.content}</p>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={() => void handleLike()} aria-label={gameLocaleText(lang, "likeAction")}
              className={`flex items-center gap-1.5 text-xs transition-all active:scale-95 ${liked ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}>
              <Heart className={`w-4 h-4 ${liked ? "fill-red-400" : ""}`} />
              {formatSurfaceNumber(lang, post.likes + (liked ? 1 : 0))}
            </button>
            {currentUserId === post.userId && (
              <AlertDialog open={deleteOpen} onOpenChange={(open) => {
                if (!deleting) {
                  setDeleteOpen(open);
                  if (open) setDeleteError("");
                }
              }}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm"
                    className="h-7 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    data-testid={`button-delete-pulse-post-${post.id}`}>
                    <Trash2 className="h-3.5 w-3.5" /> {deleteCopy.action}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent data-testid={`dialog-delete-pulse-post-${post.id}`}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{deleteCopy.title}</AlertDialogTitle>
                    <AlertDialogDescription>{deleteCopy.description}</AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert" data-testid={`text-delete-pulse-post-error-${post.id}`}>
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{deleteError}</span>
                    </div>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>{deleteCopy.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleting}
                      onClick={(event) => {
                        event.preventDefault();
                        void deletePost();
                      }}
                      data-testid={`button-confirm-delete-pulse-post-${post.id}`}>
                      {deleting ? <><Loader2 className="h-4 w-4 animate-spin" />{deleteCopy.pending}</> : deleteCopy.confirm}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          {likeError && <p className="mt-1 text-xs text-destructive" role="alert">{gameLocaleText(lang, "likeFailed")}</p>}
        </div>
      </div>
    </motion.div>
  );
}

// ── Compose Box ────────────────────────────────────────────────────────────────
function ComposeBox({ onPosted }: { onPosted: () => void }) {
  const { user } = useAuth();
  const { t: ct, lang } = useLang();
  const { isOnline } = useConnectivity();
  const [content, setContent] = useState("");
  const [domain, setDomain] = useState("general");
  const [type, setType] = useState("post");
  const [sending, setSending] = useState(false);
  const [xpToast, setXpToast] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const submit = async () => {
    if (!content.trim() || sending || !isOnline) return;
    setSending(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/pulse/post", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), domain, type }),
      });
      const data = await res.json() as { xpEarned?: number; error?: string };
      if (res.ok) {
        setContent("");
        if (data.xpEarned) { setXpToast(true); setTimeout(() => setXpToast(false), 3000); }
        onPosted();
      } else {
        setSubmitError(data.error ?? gameLocaleText(lang, "postFailed"));
      }
    } catch {
      setSubmitError(gameLocaleText(lang, "postFailed"));
    } finally { setSending(false); }
  };

  return (
    <div className="rounded-2xl bg-card border border-primary/20 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-yellow-500/60 flex items-center justify-center text-xs font-black text-black">
          {user?.username?.charAt(0).toUpperCase() ?? "?"}
        </div>
        <span className="text-sm font-bold text-foreground">{user ? user.username : ct("pulse_guest")}</span>
        {user && <span className="text-xs text-green-400 ml-auto">{ct("pulse_xp_per_post")}</span>}
      </div>
      <textarea
        value={content} onChange={e => setContent(e.target.value)}
        placeholder={user ? ct("pulse_compose_placeholder") : ct("pulse_compose_guest")}
        disabled={!user}
        maxLength={280} rows={3}
        className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none text-sm placeholder-muted-foreground resize-none disabled:opacity-50"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <select value={domain} onChange={e => setDomain(e.target.value)} disabled={!user}
          aria-label={gameLocaleText(lang, "selectDomain")}
          className="text-xs px-2 py-1.5 rounded-lg bg-muted border border-border focus:outline-none disabled:opacity-50">
          {DOMAIN_TABS.filter(d => d.id !== "all").map(d => <option key={d.id} value={d.id}>{ct(d.key)}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)} disabled={!user}
          aria-label={gameLocaleText(lang, "selectPostType")}
          className="text-xs px-2 py-1.5 rounded-lg bg-muted border border-border focus:outline-none disabled:opacity-50">
          {POST_TYPES.map(pt => <option key={pt.id} value={pt.id}>{ct(pt.key)}</option>)}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{formatSurfaceNumber(lang, content.length)}/{formatSurfaceNumber(lang, 280)}</span>
        <button onClick={() => void submit()} disabled={!content.trim() || sending || !user || !isOnline}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-40 active:scale-95 transition-all">
          <Send className="w-3.5 h-3.5" /> {sending ? ct("pulse_sending") : ct("pulse_post_btn")}
        </button>
      </div>
      <AnimatePresence>
        {xpToast && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center text-green-400 text-xs font-bold">{ct("pulse_xp_earned")}</motion.div>
        )}
      </AnimatePresence>
      {submitError && <p className="text-center text-xs text-destructive" role="alert">{submitError}</p>}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PulsePage() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [posts, setPosts]     = useState<Post[]>([]);
  const [events, setEvents]   = useState<Event[]>([]);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [domain, setDomain]   = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadPosts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setLoadError(false);
    const url = `/api/pulse/feed${domain !== "all" ? `?domain=${domain}` : ""}`;
    try {
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json() as { posts: Post[] };
      if (!res.ok) throw new Error("feed");
      setPosts(data.posts ?? []);
    } catch {
      if (!silent) setLoadError(true);
    } finally { if (!silent) setLoading(false); }
  }, [domain]);

  const loadAll = useCallback(async () => {
    const results = await Promise.allSettled([
      loadPosts(),
      fetch("/api/pulse/events", { credentials: "include" })
        .then(r => {
          if (!r.ok) throw new Error("events");
          return r.json() as Promise<{ events: Event[] }>;
        })
        .then(d => setEvents(d.events ?? [])),
      fetch("/api/pulse/stats", { credentials: "include" })
        .then(r => {
          if (!r.ok) throw new Error("stats");
          return r.json() as Promise<Stats>;
        })
        .then(d => setStats(d)),
    ]);
    if (results.some(result => result.status === "rejected")) setLoadError(true);
  }, [loadPosts]);

  useEffect(() => { void loadAll(); }, [loadAll]);
  useEffect(() => {
    const t = setInterval(() => void loadPosts(true), 10_000);
    return () => clearInterval(t);
  }, [loadPosts]);

  const handleLike = async (postId: number) => {
    try {
      const response = await fetch(`/api/pulse/post/${postId}/like`, { method: "POST", credentials: "include" });
      return response.ok;
    } catch {
      return false;
    }
  };

  const handleDeleted = (postId: number) => {
    setPosts(previous => previous.filter(post => post.id !== postId));
    void loadPosts(true);
    void fetch("/api/pulse/stats", { credentials: "include" })
      .then(response => {
        if (!response.ok) throw new Error("stats");
        return response.json() as Promise<Stats>;
      })
      .then(setStats)
      .catch(() => {});
  };

  const liveCount = events.filter(e => e.isLive).length;

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-b from-black via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(201,168,76,0.12),transparent_70%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-bold tracking-widest mb-5">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> {t("pulse_live_badge")}
            {liveCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black">{formatSurfaceNumber(lang, liveCount)} {t("pulse_live")}</span>}
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-3">
             <span className="text-foreground">{t("pulse_hero_empire")} </span>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-600">{t("pulse_hero_pulse")}</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">
            {t("pulse_tagline")}
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="mb-8">
          <StatsBar stats={stats} t={t} lang={lang} />
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Feed (main) */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Smart Domain Widget */}
            <SmartDomainWidget domainId="social" label={t("pulse_social_module")} />

            {/* Compose */}
            <ComposeBox onPosted={() => void loadPosts(true)} />

            {/* Domain filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {DOMAIN_TABS.map(d => (
                <button key={d.id} onClick={() => setDomain(d.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                    domain === d.id ? "bg-primary/20 border-primary/50 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/30"
                  }`}>
                  {d.icon} {t(d.key)}
                </button>
              ))}
            </div>

            {/* Posts */}
            {loading ? (
              <div className="space-y-3" role="status" aria-label={gameLocaleText(lang, "loading")}>
                {Array.from({length: 4}).map((_,i) => <div key={i} className="h-28 bg-card/40 rounded-2xl animate-pulse" />)}
              </div>
            ) : loadError ? (
              <div className="text-center py-16 text-destructive" role="alert">
                <p>{gameLocaleText(lang, "loadFailed")}</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Flame className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>{t("pulse_no_posts")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map(p => <PostCard key={p.id} post={p} onLike={handleLike} onDeleted={handleDeleted} currentUserId={user?.id} lang={lang} />)}
              </div>
            )}
          </div>

          {/* Sidebar — Events */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="sticky top-20 space-y-4">
              <EventsPanel events={events} lang={lang} />

              {/* Empire Vision */}
              <div className="rounded-2xl bg-card border border-yellow-400/20 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span className="font-bold text-sm text-yellow-400">{t("pulse_empire_vision")}</span>
                </div>
                {[
                  { icon:"🌍", label: t("pulse_vision_countries"),   value: t("pulse_vision_countries_val") },
                  { icon:"⚡", label: t("pulse_vision_neural"),       value: t("pulse_vision_neural_val") },
                  { icon:"🏆", label: t("pulse_vision_legends"),      value: t("pulse_vision_legends_val") },
                  { icon:"🎓", label: t("pulse_vision_education"),    value: t("pulse_vision_education_val") },
                  { icon:"🔗", label: t("pulse_vision_blockchain"),   value: t("pulse_vision_blockchain_val") },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.icon} {item.label}</span>
                    <span className="text-foreground font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
