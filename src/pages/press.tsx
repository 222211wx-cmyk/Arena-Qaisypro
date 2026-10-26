import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Newspaper, Upload, Play, Heart, MessageCircle, X,
  Video, FileText, BookOpen, ChevronDown, ChevronUp,
  Crown, Star, Megaphone, Smile, Send, Check,
} from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { task39Text } from "@/i18n/task39";
import { formatNumber, formatRelative, isArabic, techT } from "@/i18n/tech-surfaces-copy";

const BASE = () => (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────
interface PressPost {
  id: number; type: "video" | "story" | "article";
  title?: string; content: string; video_url?: string; image_url?: string;
  author: string; likes: number; comment_count: number; created_at: string;
}
interface Poll {
  id: number; question: string;
  option_a: string; option_b: string; option_c?: string; option_d?: string;
  votes_a: number; votes_b: number; votes_c: number; votes_d: number;
}
interface Sponsor {
  id: number; name: string; tagline?: string; color: string; icon: string;
}
interface Comment { id: number; author: string; content: string; created_at: string; }

// ─── Gold helpers ─────────────────────────────────────────────────────────────
const GOLD = "hsl(var(--primary))";
const GOLD_A = (alpha: number) => `hsl(var(--primary) / ${alpha})`;
const GOLD_DIM = GOLD_A(0.15);
const GOLD_BORDER = GOLD_A(0.35);
const BLACK = "hsl(var(--card))";

const goldBox = {
  background: BLACK,
  border: `1.5px solid ${GOLD_BORDER}`,
  boxShadow: "0 4px 24px hsl(var(--background) / 0.5)",
};

function getYtId(url?: string) {
  if (!url) return null;
  const m = url.match(/^[A-Za-z0-9_-]{11}$/);
  return m ? url : null;
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const { lang } = useLang();
  const tx = (key: keyof typeof import("@/i18n/task39").task39) => task39Text(lang, key);
  const [tab, setTab] = useState<"video" | "story" | "article">("video");
  const [title, setTitle]     = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [author, setAuthor]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);

  const TABS: { key: "video" | "story" | "article"; label: string; icon: typeof Video }[] = [
    { key: "video",   label: tx("video"),   icon: Video    },
    { key: "story",   label: tx("story"),   icon: BookOpen },
    { key: "article", label: tx("article"), icon: FileText },
  ];

  async function submit() {
    if (!content.trim()) { setError(tx("contentRequired")); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${BASE()}/api/press/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: tab, title, content, video_url: videoUrl, author }),
      });
      if (!r.ok) { const j = await r.json(); setError(j.error ?? techT(lang, "genericError")); setLoading(false); return; }
      setDone(true);
      setTimeout(() => { onClose(); onPublished(); }, 1200);
    } catch { setError(tx("connectionError")); setLoading(false); }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={goldBox}
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}>
        {/* Gold bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg,hsl(var(--primary)),#FFA500,hsl(var(--primary)))" }} />

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}>
            <Upload className="w-5 h-5" style={{ color: GOLD }} />
          </div>
          <div className="flex-1" dir={isArabic(lang) ? "rtl" : "ltr"}>
            <p className="font-black text-foreground text-base">{tx("publishYour")}</p>
            <p className="text-xs" style={{ color: GOLD_A(0.55) }}>{tx("journalists")}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-2 mb-4">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all"
              style={tab === t.key
                ? { background: GOLD, color: "#000" }
                : { background: GOLD_DIM, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="px-6 pb-6 space-y-3" dir={isArabic(lang) ? "rtl" : "ltr"}>
          <input className="w-full rounded-xl px-4 py-2.5 text-sm text-foreground outline-none"
            style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}
            placeholder={tx("authorPlaceholder")}
            value={author} onChange={e => setAuthor(e.target.value)} />

          <input className="w-full rounded-xl px-4 py-2.5 text-sm text-foreground outline-none"
            style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}
            placeholder={tab === "video" ? tx("videoTitle") : tab === "story" ? tx("storyTitle") : tx("articleTitle")}
            value={title} onChange={e => setTitle(e.target.value)} />

          {tab === "video" && (
            <input className="w-full rounded-xl px-4 py-2.5 text-sm text-foreground outline-none"
              style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}
              placeholder={tx("videoUrl")}
              value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
          )}

          <textarea className="w-full rounded-xl px-4 py-2.5 text-sm text-foreground outline-none resize-none"
            style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}
            rows={4}
            placeholder={tab === "video" ? tx("videoDescription") : tab === "story" ? tx("writeStory") : tx("writeArticle")}
            value={content} onChange={e => setContent(e.target.value)} />

          {error && <p className="text-destructive text-xs text-end">{error}</p>}

          <button onClick={submit} disabled={loading || done}
            className="w-full py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2"
            style={{ background: done ? "#16a34a" : GOLD, color: "#000" }}>
            {done ? <><Check className="w-4 h-4" /> {tx("published")}</> :
             loading ? tx("publishing") :
             <><Send className="w-4 h-4" /> {tx("publishNow")}</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────
function VideoCard({ post, onLike }: { post: PressPost; onLike: (id: number) => void }) {
  const { lang } = useLang();
  const tx = (key: keyof typeof import("@/i18n/task39").task39) => task39Text(lang, key);
  const ytId = getYtId(post.video_url);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(false);

  async function loadComments() {
    const r = await fetch(`${BASE()}/api/press/post/${post.id}/comments`, { credentials: "include" });
    const j = await r.json();
    setComments(j.comments ?? []);
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    await fetch(`${BASE()}/api/press/post/${post.id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: newComment }),
    });
    setNewComment("");
    loadComments();
  }

  function handleLike() { if (!liked) { setLiked(true); onLike(post.id); } }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden" style={goldBox}>
      <div style={{ height: 2, background: "linear-gradient(90deg,hsl(var(--primary)),transparent)" }} />

      {/* Video embed */}
      {ytId && (
        <div className="aspect-video bg-black">
          <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen />
        </div>
      )}

      <div className="p-4" dir={isArabic(lang) ? "rtl" : "ltr"}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-black px-2 py-0.5 rounded-lg" style={{ background: GOLD_DIM, color: GOLD }}>
            <Video className="w-3 h-3 inline mr-1" />{tx("video")}
          </span>
           <span className="text-xs" style={{ color: GOLD_A(0.4) }}>{formatRelative(lang, post.created_at)}</span>
        </div>
        {post.title && <h3 className="font-black text-foreground text-base mb-1 leading-tight">{post.title}</h3>}
        <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.75)" }}>{post.content}</p>
        <div className="flex items-center gap-1 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
            style={{ background: GOLD, color: "#000" }}>{post.author[0]}</div>
          <span className="text-xs font-bold" style={{ color: GOLD }}>{post.author}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button onClick={handleLike}
            className="flex items-center gap-1.5 text-sm font-bold transition-all"
            style={{ color: liked ? GOLD : "rgba(255,255,255,0.5)" }}>
            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
             {formatNumber(lang, post.likes + (liked ? 1 : 0))}
          </button>
          <button onClick={() => { setShowComments(!showComments); if (!showComments) loadComments(); }}
            className="flex items-center gap-1.5 text-sm font-bold transition-all"
            style={{ color: "rgba(255,255,255,0.5)" }}>
            <MessageCircle className="w-4 h-4" />
             {formatNumber(lang, post.comment_count)} {tx("comments")}
          </button>
        </div>

        {/* Comments */}
        <AnimatePresence>
          {showComments && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="mt-3 overflow-hidden">
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {comments.length === 0 && <p className="text-xs text-white/30 text-center py-2">{tx("noComments")}</p>}
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-black"
                      style={{ background: GOLD_DIM, color: GOLD }}>{c.author[0]}</div>
                    <div>
                      <span className="text-xs font-bold mr-1" style={{ color: GOLD }}>{c.author}</span>
                      <span className="text-xs text-white/70">{c.content}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg px-3 py-1.5 text-xs text-foreground outline-none"
                  style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}
                  placeholder={tx("addComment")}
                  value={newComment} onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitComment()} />
                <button onClick={submitComment}
                  className="px-3 py-1.5 rounded-lg text-xs font-black"
                  style={{ background: GOLD, color: "#000" }}>
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Text Card (Story / Article) ──────────────────────────────────────────────
function TextCard({ post, onLike }: { post: PressPost; onLike: (id: number) => void }) {
  const { lang } = useLang();
  const tx = (key: keyof typeof import("@/i18n/task39").task39) => task39Text(lang, key);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(false);
  const isStory = post.type === "story";
  const isLong  = post.content.length > 250;

  async function loadComments() {
    const r = await fetch(`${BASE()}/api/press/post/${post.id}/comments`, { credentials: "include" });
    const j = await r.json();
    setComments(j.comments ?? []);
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    await fetch(`${BASE()}/api/press/post/${post.id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: newComment }),
    });
    setNewComment("");
    loadComments();
  }

  function handleLike() { if (!liked) { setLiked(true); onLike(post.id); } }

  const accentColor = isStory ? "#a78bfa" : "#38bdf8";
  const typeLabel   = isStory ? tx("story") : tx("article");
  const TypeIcon    = isStory ? BookOpen : FileText;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden" style={goldBox}>
      <div style={{ height: 2, background: `linear-gradient(90deg,${accentColor},transparent)` }} />
      <div className="p-5" dir={isArabic(lang) ? "rtl" : "ltr"}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-black px-2 py-0.5 rounded-lg flex items-center gap-1"
            style={{ background: `${accentColor}20`, color: accentColor }}>
            <TypeIcon className="w-3 h-3" /> {typeLabel}
          </span>
           <span className="text-xs" style={{ color: GOLD_A(0.4) }}>{formatRelative(lang, post.created_at)}</span>
        </div>

        {post.title && <h3 className="font-black text-foreground text-lg mb-2 leading-tight">{post.title}</h3>}

        <p className="text-sm leading-loose mb-3" style={{ color: "rgba(255,255,255,0.80)" }}>
          {!expanded && isLong ? post.content.slice(0, 250) + "..." : post.content}
        </p>

        {isLong && (
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-bold mb-3"
            style={{ color: accentColor }}>
            {expanded ? <><ChevronUp className="w-3 h-3" /> {tx("readLess")}</> : <><ChevronDown className="w-3 h-3" /> {tx("readMore")}</>}
          </button>
        )}

        <div className="flex items-center gap-1 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
            style={{ background: GOLD, color: "#000" }}>{post.author[0]}</div>
          <span className="text-xs font-bold" style={{ color: GOLD }}>{post.author}</span>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={handleLike}
            className="flex items-center gap-1.5 text-sm font-bold transition-all"
            style={{ color: liked ? GOLD : "rgba(255,255,255,0.5)" }}>
            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
             {formatNumber(lang, post.likes + (liked ? 1 : 0))}
          </button>
          <button onClick={() => { setShowComments(!showComments); if (!showComments) loadComments(); }}
            className="flex items-center gap-1.5 text-sm font-bold transition-all"
            style={{ color: "rgba(255,255,255,0.5)" }}>
            <MessageCircle className="w-4 h-4" />
             {formatNumber(lang, post.comment_count)} {tx("comments")}
          </button>
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="mt-3 overflow-hidden">
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {comments.length === 0 && <p className="text-xs text-white/30 text-center py-2">{tx("noComments")}</p>}
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-black"
                      style={{ background: GOLD_DIM, color: GOLD }}>{c.author[0]}</div>
                    <div>
                      <span className="text-xs font-bold mr-1" style={{ color: GOLD }}>{c.author}</span>
                      <span className="text-xs text-white/70">{c.content}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg px-3 py-1.5 text-xs text-foreground outline-none"
                  style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}
                  placeholder={tx("addComment")}
                  value={newComment} onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitComment()} />
                <button onClick={submitComment}
                  className="px-3 py-1.5 rounded-lg text-xs font-black"
                  style={{ background: GOLD, color: "#000" }}>
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Poll Card ────────────────────────────────────────────────────────────────
function PollCard({ poll: initial }: { poll: Poll }) {
  const { lang } = useLang();
  const tx = (key: keyof typeof import("@/i18n/task39").task39) => task39Text(lang, key);
  const [poll, setPoll]   = useState(initial);
  const [voted, setVoted] = useState<string | null>(null);

  const total = poll.votes_a + poll.votes_b + poll.votes_c + poll.votes_d;
  const pct   = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0;

  const OPTIONS: { key: "a" | "b" | "c" | "d"; label?: string; votes: number }[] = [
    { key: "a", label: poll.option_a, votes: poll.votes_a },
    { key: "b", label: poll.option_b, votes: poll.votes_b },
    { key: "c", label: poll.option_c, votes: poll.votes_c },
    { key: "d", label: poll.option_d, votes: poll.votes_d },
  ].filter((o): o is { key: "a" | "b" | "c" | "d"; label: string; votes: number } => !!o.label);

  async function vote(option: "a" | "b" | "c" | "d") {
    if (voted) return;
    setVoted(option);
    const r = await fetch(`${BASE()}/api/press/polls/${poll.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ option }),
    });
    const j = await r.json();
    if (j.poll) setPoll(j.poll);
  }

  const palette = [GOLD, "#38bdf8", "#4ade80", "#a78bfa"];

  return (
    <div className="rounded-2xl overflow-hidden" style={goldBox}>
      <div style={{ height: 2, background: "linear-gradient(90deg,#a78bfa,hsl(var(--primary)))" }} />
      <div className="p-5" dir={isArabic(lang) ? "rtl" : "ltr"}>
        <div className="flex items-center gap-2 mb-3">
          <Smile className="w-4 h-4" style={{ color: "#a78bfa" }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#a78bfa" }}>{tx("poll")}</span>
        </div>
        <h3 className="font-black text-foreground text-base leading-tight mb-4">{poll.question}</h3>
        <div className="space-y-2.5">
          {OPTIONS.map((opt, i) => {
            const p = pct(opt.votes);
            const isChosen = voted === opt.key;
            const color = palette[i];
            return (
              <button key={opt.key} onClick={() => vote(opt.key)} disabled={!!voted}
                className="w-full rounded-xl overflow-hidden relative transition-all text-start"
                style={{ background: `${color}12`, border: `1.5px solid ${isChosen ? color : color + "40"}` }}>
                {/* Progress fill */}
                {voted && (
                  <div className="absolute inset-y-0 start-0 transition-all duration-700"
                    style={{ width: `${p}%`, background: `${color}25` }} />
                )}
                <div className="relative flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm font-bold" style={{ color: "white" }}>{opt.label}</span>
                  {voted ? (
                    <span className="text-xs font-black" style={{ color }}>{p}%</span>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: color }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {voted && (
          <p className="text-xs text-center mt-3" style={{ color: GOLD_A(0.5) }}>
             {formatNumber(lang, total)} {tx("totalVotesThanks")}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Sponsor Card ─────────────────────────────────────────────────────────────
function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const { lang } = useLang();
  return (
    <div className="shrink-0 rounded-2xl p-5 flex flex-col items-center gap-3 text-center w-48"
      style={{ background: BLACK, border: `1.5px solid ${sponsor.color}40`, boxShadow: `0 4px 20px ${sponsor.color}15` }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: `${sponsor.color}20`, border: `1.5px solid ${sponsor.color}50` }}>
        {sponsor.icon}
      </div>
      <div>
        <p className="font-black text-sm text-foreground">{sponsor.name}</p>
        {sponsor.tagline && <p className="text-xs mt-0.5" style={{ color: `${sponsor.color}cc` }}>{sponsor.tagline}</p>}
      </div>
      <div className="text-xs font-bold px-3 py-1 rounded-full"
        style={{ background: `${sponsor.color}20`, color: sponsor.color }}>
        {task39Text(lang, "sponsor")}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function PressPage() {
  const { lang } = useLang();
  const [posts, setPosts]       = useState<PressPost[]>([]);
  const [polls, setPolls]       = useState<Poll[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [filter, setFilter]     = useState<"all" | "video" | "story" | "article">("all");
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading]   = useState(true);

  const fetchAll = () => {
    setLoading(true);
    const b = BASE();
    Promise.all([
      fetch(`${b}/api/press/feed?type=${filter}`, { credentials: "include" }).then(r => r.json()),
      fetch(`${b}/api/press/polls`, { credentials: "include" }).then(r => r.json()),
      fetch(`${b}/api/press/sponsors`, { credentials: "include" }).then(r => r.json()),
    ]).then(([f, p, s]) => {
      setPosts(f.posts ?? []);
      setPolls(p.polls ?? []);
      setSponsors(s.sponsors ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [filter]);

  async function likePost(id: number) {
    await fetch(`${BASE()}/api/press/post/${id}/like`, { method: "POST", credentials: "include" });
  }

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: "all",     label: task39Text(lang, "all")      },
    { key: "video",   label: task39Text(lang, "video")    },
    { key: "story",   label: task39Text(lang, "stories")  },
    { key: "article", label: task39Text(lang, "articles") },
  ];

  return (
    <div dir={isArabic(lang) ? "rtl" : "ltr"} className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, hsl(var(--card)) 0%, ${GOLD_A(0.1)} 100%)` }}>
        {/* Star particles */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              width: Math.random() * 2 + 1, height: Math.random() * 2 + 1,
              background: GOLD, opacity: Math.random() * 0.4 + 0.1,
              top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
            }} />
        ))}

        <div className="relative container mx-auto px-4 py-10 md:py-14">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
             <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-black px-3 py-1 rounded-full"
                  style={{ background: GOLD_DIM, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}>
                   {techT(lang, "pressBadge")}
                </span>
              </div>
               <h1 className="text-4xl md:text-6xl font-black leading-none mb-2" style={{ color: GOLD, textShadow: `0 0 40px ${GOLD_A(0.376)}` }}>
                 {techT(lang, "pressBrand")}
               </h1>
              <p className="text-sm md:text-base" style={{ color: GOLD_A(0.6) }}>
                 {techT(lang, "pressSub")}
              </p>
            </div>

            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-3 px-6 py-3.5 rounded-2xl font-black text-sm transition-all hover:scale-105 shrink-0"
              style={{ background: GOLD, color: "hsl(var(--primary-foreground))", boxShadow: `0 8px 32px ${GOLD_A(0.251)}` }}>
              <Upload className="w-5 h-5" />
              {task39Text(lang, "publishContent")}
            </button>
          </div>

          {/* Filter tabs */}
           <div className="flex gap-2 mt-8 overflow-x-auto pb-1">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={filter === f.key
                  ? { background: GOLD, color: "#000" }
                  : { background: GOLD_DIM, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Feed */}
          <div className="lg:col-span-2 space-y-6">
             <div className="flex items-center gap-2 mb-2">
              <Newspaper className="w-5 h-5" style={{ color: GOLD }} />
              <h2 className="font-black text-foreground text-lg">{task39Text(lang, "correspondentReports")}</h2>
            </div>

            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl h-48 animate-pulse"
                  style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }} />
              ))
            ) : posts.length === 0 ? (
              <div className="text-center py-16" style={{ color: GOLD_A(0.4) }}>
                <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-bold">{task39Text(lang, "noPosts")}</p>
                <p className="text-sm mt-1">{task39Text(lang, "firstPublish")}</p>
              </div>
            ) : (
              posts.map(p =>
                p.type === "video"
                  ? <VideoCard key={p.id} post={p} onLike={likePost} />
                  : <TextCard  key={p.id} post={p} onLike={likePost} />
              )
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-8">

            {/* Sponsors */}
            <div>
               <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5" style={{ color: GOLD }} />
                <h2 className="font-black text-foreground text-base">{task39Text(lang, "sponsorship")}</h2>
              </div>
              <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                {sponsors.map(s => <SponsorCard key={s.id} sponsor={s} />)}
              </div>
            </div>

            {/* Fun & Opinions */}
            <div>
               <div className="flex items-center gap-2 mb-4">
                <Smile className="w-5 h-5" style={{ color: "#a78bfa" }} />
                <h2 className="font-black text-foreground text-base">{task39Text(lang, "funOpinions")}</h2>
              </div>
              <div className="space-y-4">
                {polls.map(poll => <PollCard key={poll.id} poll={poll} />)}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onPublished={() => { setShowUpload(false); fetchAll(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
