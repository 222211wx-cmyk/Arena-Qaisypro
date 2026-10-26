/**
 * StoriesRow — horizontal story strip, fullscreen viewer, add-story modal,
 *              and screenshot-detection toast
 */
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Clock, Plus } from "lucide-react";
import Avatar from "./Avatar";
import { GOLD, GOLD_A, DOMAIN_ICONS, DOMAINS, timeAgo, api, useSocialI18n } from "./social-i18n";
import type { Story } from "./social-types";
import { useConnectivity } from "@/contexts/ConnectivityContext";

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
      style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#f59e0b", color: "#000", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", whiteSpace: "nowrap" }}>
      {msg}
    </motion.div>
  );
}

function msLeft(expiresAt: string, st: Record<string, string>, locale: string): string {
  const h = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 3600000));
  return h < 1 ? st.less_than_hour : `${new Intl.NumberFormat(locale).format(h)}${st.hours_short}`;
}

// ── Story Viewer (fullscreen) ─────────────────────────────────────────────────
function StoryViewer({ story, st, dir, onClose, onLike, liked }: {
  story: Story; st: Record<string, string>; dir: string;
  onClose: () => void; onLike: () => void; liked: boolean;
}) {
  const { locale } = useSocialI18n();
  const { isOnline } = useConnectivity();
  const [toast, setToast] = useState("");

  // Screenshot detection: fire when window loses focus while story is visible
  useEffect(() => {
    const handleBlur = () => setToast(st.screenshot_warning);
    const handleVis  = () => { if (document.visibilityState === "hidden") setToast(st.screenshot_warning); };
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, [st.screenshot_warning]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.96)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
          onClick={e => e.stopPropagation()}
          style={{ background: "hsl(var(--card))", borderRadius: 16, overflow: "hidden", width: 380, maxWidth: "95vw", maxHeight: "88vh", display: "flex", flexDirection: "column" }}>
          {story.imageUrl && (
            <img src={story.imageUrl} alt={st.story_media_alt} style={{ width: "100%", maxHeight: 340, objectFit: "cover" }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
          <div style={{ padding: 16, flex: 1, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Avatar name={story.username} size={28} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 800, color: "hsl(var(--foreground))", fontSize: 13 }}>{story.username}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#ffffff40" }}>
                  {timeAgo(story.createdAt, st, locale)} · ⏳ {msLeft(story.expiresAt, st, locale)}
                </p>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ color: "hsl(var(--foreground))", fontSize: 14, lineHeight: 1.6, margin: "0 0 14px" }} dir={dir}>
              {story.content}
            </p>
            <button onClick={onLike} disabled={!isOnline || liked}
              style={{ background: liked ? "#ef444420" : "hsl(var(--secondary))", border: `1px solid ${liked ? "#ef4444" : "hsl(var(--border))"}`, borderRadius: 8, padding: "8px 18px", color: liked ? "#ef4444" : "hsl(var(--foreground))", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
              ❤️ {story.likes} {st.like}
            </button>
          </div>
        </motion.div>
      </motion.div>
      <AnimatePresence>
        {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      </AnimatePresence>
    </>
  );
}

// ── Add Story Modal ───────────────────────────────────────────────────────────
function AddStoryModal({ user, st, dir, onClose, onCreated }: {
  user: { id: number; username: string } | null;
  st: Record<string, string>; dir: string;
  onClose: () => void;
  onCreated: (story: Story) => void;
}) {
  const { isOnline } = useConnectivity();
  const [content,  setContent]  = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [domain,   setDomain]   = useState("general");
  const [posting,  setPosting]  = useState(false);

  async function submit() {
    if (!content.trim() || posting || !user || !isOnline) return;
    setPosting(true);
    try {
      const r = await fetch(api("/api/stories"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), imageUrl: imageUrl || undefined, domain }),
        credentials: "include",
      });
      if (r.ok) {
        const j = await r.json();
        onCreated(j.story);
        onClose();
      }
    } finally { setPosting(false); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92 }}
        onClick={e => e.stopPropagation()}
        style={{ background: "hsl(var(--card))", border: `1px solid ${GOLD_A(0.15)}`, borderRadius: 16, padding: 24, width: 400, maxWidth: "95vw" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: GOLD, fontWeight: 900, fontSize: 15, textTransform: "uppercase", letterSpacing: 1 }}>
            {st.add_story}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))" }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: 11, color: "#ffffff40" }}>
          <Clock size={11} style={{ display: "inline", marginInlineEnd: 4 }} />{st.stories_expire}
        </p>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder={st.story_text} maxLength={200} dir={dir} rows={3}
          style={{ width: "100%", background: "hsl(var(--background))", border: `1px solid ${GOLD_A(0.13)}`, borderRadius: 8, padding: "10px 12px", color: "hsl(var(--foreground))", fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 10 }} />
        <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
          placeholder={st.story_image}
          style={{ width: "100%", background: "hsl(var(--background))", border: `1px solid ${GOLD_A(0.13)}`, borderRadius: 8, padding: "8px 12px", color: "hsl(var(--foreground))", fontSize: 12, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
        <select value={domain} onChange={e => setDomain(e.target.value)}
          style={{ width: "100%", background: "hsl(var(--background))", border: `1px solid ${GOLD_A(0.13)}`, borderRadius: 8, padding: "8px 12px", color: "hsl(var(--foreground))", fontSize: 12, outline: "none", cursor: "pointer", marginBottom: 14 }}>
          {DOMAINS.map(d => <option key={d} value={d}>{DOMAIN_ICONS[d]} {st[d] ?? d}</option>)}
        </select>
        <button onClick={submit} disabled={!content.trim() || posting || !isOnline}
          style={{ width: "100%", padding: "10px 0", background: content.trim() ? GOLD : "hsl(var(--border))", border: "none", borderRadius: 8, color: content.trim() ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))", fontWeight: 900, cursor: "pointer", fontSize: 14, opacity: posting ? 0.6 : 1 }}>
          {posting ? "…" : st.add_story}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Main StoriesRow ───────────────────────────────────────────────────────────
interface Props {
  user: { id: number; username: string } | null;
  st: Record<string, string>;
  dir: string;
}

export default function StoriesRow({ user }: Props) {
  const { st, dir, locale } = useSocialI18n();
  const { isOnline } = useConnectivity();
  const [stories,   setStories]   = useState<Story[]>([]);
  const [viewer,    setViewer]    = useState<Story | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [likedSet,  setLikedSet]  = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    const r = await fetch(api("/api/stories/feed"));
    const j = await r.json();
    setStories(j.stories ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function likeStory(storyId: number) {
    if (likedSet.has(storyId) || !isOnline) return;
    const r = await fetch(api(`/api/stories/${storyId}/like`), { method: "POST", credentials: "include" });
    const j = await r.json();
    if (!j.alreadyLiked && j.likes != null) {
      setStories(prev => prev.map(s => s.id === storyId ? { ...s, likes: j.likes } : s));
      if (viewer?.id === storyId) setViewer(v => v ? { ...v, likes: j.likes } : v);
    }
    setLikedSet(prev => new Set([...prev, storyId]));
  }

  return (
    <div dir={dir} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Add story button + horizontal strip */}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
        {/* Add Story button */}
        {user && (
          <button onClick={() => setShowModal(true)} disabled={!isOnline}
            style={{ flexShrink: 0, width: 90, aspectRatio: "9/14", borderRadius: 12, border: `2px dashed ${GOLD_A(0.31)}`, background: "hsl(var(--card))", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: GOLD }}>
            <Plus size={22} />
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{st.add_story}</span>
          </button>
        )}
        {/* Story thumbnails */}
        {stories.map(story => (
          <motion.button key={story.id} whileHover={{ scale: 1.03 }}
            onClick={() => setViewer(story)}
            style={{ flexShrink: 0, width: 90, aspectRatio: "9/14", borderRadius: 12, overflow: "hidden", cursor: "pointer", border: `2px solid ${GOLD_A(0.19)}`, background: "hsl(var(--card))", position: "relative", padding: 0 }}>
            {story.imageUrl
              ? <img src={story.imageUrl} alt={st.story_media_alt} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              : <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, #111, #1a1a1a)` }} />
            }
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 55%)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 6 }}>
              <Avatar name={story.username} size={20} />
              <p style={{ margin: "3px 0 0", fontSize: 10, fontWeight: 700, color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{story.username}</p>
               <p style={{ margin: 0, fontSize: 9, color: GOLD_A(0.56) }}>⏳ {msLeft(story.expiresAt, st, locale)}</p>
            </div>
          </motion.button>
        ))}
        {stories.length === 0 && !user && (
          <p style={{ color: "#ffffff30", fontSize: 13, padding: "20px 0", alignSelf: "center" }}>{st.no_stories}</p>
        )}
      </div>

      {/* Story grid (full size) */}
      {stories.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {stories.map(story => (
            <motion.div key={story.id} whileHover={{ scale: 1.02 }}
              onClick={() => setViewer(story)}
              style={{ borderRadius: 12, overflow: "hidden", cursor: "pointer", border: `1px solid ${GOLD_A(0.09)}`, background: "hsl(var(--card))", position: "relative", aspectRatio: "9/14" }}>
              {story.imageUrl
                ? <img src={story.imageUrl} alt={st.story_media_alt} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                : <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, #0d0d0d, #1a1a1a)` }} />
              }
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%)", padding: 10, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <Avatar name={story.username} size={20} />
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "hsl(var(--foreground))" }}>{story.username}</p>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical" as any }}>{story.content}</p>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                   <span style={{ fontSize: 10, color: GOLD_A(0.5) }}>⏳ {msLeft(story.expiresAt, st, locale)}</span>
                  <button onClick={e => { e.stopPropagation(); likeStory(story.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: likedSet.has(story.id) ? "#ef4444" : "#ffffff60", fontSize: 11, padding: 0 }}>
                    ❤️ {story.likes}
                  </button>
                </div>
              </div>
              <div style={{ position: "absolute", top: 8, insetInlineEnd: 8, background: GOLD, borderRadius: 6, padding: "2px 5px", fontSize: 10, fontWeight: 700, color: "hsl(var(--primary-foreground))" }}>
                {DOMAIN_ICONS[story.domain] ?? "🌍"}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Viewer + Add Modal */}
      <AnimatePresence>
        {viewer && (
          <StoryViewer
            story={viewer} st={st} dir={dir}
            onClose={() => setViewer(null)}
            onLike={() => likeStory(viewer.id)}
            liked={likedSet.has(viewer.id)}
          />
        )}
        {showModal && (
          <AddStoryModal
            user={user} st={st} dir={dir}
            onClose={() => setShowModal(false)}
            onCreated={story => { setStories(prev => [story, ...prev]); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
