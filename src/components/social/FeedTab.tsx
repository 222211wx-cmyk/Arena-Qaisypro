/**
 * FeedTab — post composer, trending strip, domain filters, and feed list
 */
import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Image, Video } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import FeedCard from "./FeedCard";
import Avatar from "./Avatar";
import { GOLD, GOLD_A, DOMAIN_ICONS, DOMAINS, api, useSocialI18n } from "./social-i18n";
import type { FeedPost } from "./social-types";
import { useConnectivity } from "@/contexts/ConnectivityContext";

// ── TrendingSection ───────────────────────────────────────────────────────────
function TrendingSection({ st, dir, refreshKey }: { st: Record<string, string>; dir: string; refreshKey: number }) {
  const [data, setData] = useState<{ topPosts: any[]; hashtags: { tag: string; count: number }[] } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(api("/api/social/v2/trending")).then(r => r.json()).then(j => setData(j)).catch(() => {});
  }, [refreshKey]);

  if (!data || (data.hashtags.length === 0 && data.topPosts.length === 0)) return null;

  return (
    <div style={{ background: "hsl(var(--card))", border: `1px solid ${GOLD_A(0.08)}`, borderRadius: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", color: "hsl(var(--foreground))" }}>
        <TrendingUp size={14} style={{ color: GOLD, flexShrink: 0 }} />
        <span style={{ fontWeight: 800, fontSize: 12, color: GOLD, textTransform: "uppercase", letterSpacing: 1, flexShrink: 0 }}>
          {st.trending}
        </span>
        <div style={{ display: "flex", gap: 6, flex: 1, overflowX: "hidden" }}>
          {data.hashtags.slice(0, 4).map(h => (
            <span key={h.tag} style={{ background: GOLD_A(0.08), color: GOLD, borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
              {h.tag}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 10, color: "#ffffff30", flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 14px 12px", borderTop: "1px solid #ffffff08" }}>
              {data.topPosts.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 800, color: "#ffffff40", textTransform: "uppercase", letterSpacing: 1 }}>{st.hot_posts}</p>
                  {data.topPosts.slice(0, 3).map((p: any) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #ffffff05" }}>
                      <Avatar name={p.username} size={22} />
                      <p style={{ flex: 1, margin: 0, fontSize: 12, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir={dir}>
                        {p.content.slice(0, 70)}
                      </p>
                      <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, whiteSpace: "nowrap" }}>❤️ {p.likes}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.hashtags.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {data.hashtags.map(h => (
                    <span key={h.tag}
                      style={{ background: GOLD_A(0.06), color: GOLD, border: `1px solid ${GOLD_A(0.13)}`, borderRadius: 12, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                      {h.tag} <span style={{ color: "#ffffff40" }}>·{h.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main FeedTab ──────────────────────────────────────────────────────────────
interface Props {
  user: { id: number; username: string } | null;
  st: Record<string, string>;
  dir: string;
}

export default function FeedTab({ user }: Props) {
  const { st, dir } = useSocialI18n();
  const { isOnline } = useConnectivity();
  const [posts,    setPosts]    = useState<FeedPost[]>([]);
  const [content,  setContent]  = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [showImg,  setShowImg]  = useState(false);
  const [domain,   setDomain]   = useState("general");
  const [filter,   setFilter]   = useState("all");
  const [feedScope, setFeedScope] = useState<"all" | "following">("all");
  const [loading,  setLoading]  = useState(false);
  const [posting,  setPosting]  = useState(false);
  const [savedSet, setSavedSet] = useState<Set<number>>(new Set());
  const [trendingRefreshKey, setTrendingRefreshKey] = useState(0);

  const loadFeed = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const path = feedScope === "following"
        ? "/api/social/v2/feed/following?limit=40"
        : "/api/social/v2/feed?limit=40";
      const r = await fetch(api(path), { credentials: "include", signal });
      if (!r.ok) {
        setPosts([]);
        return;
      }
      const j = await r.json();
      setPosts(j.posts ?? []);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setPosts([]);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [feedScope, user?.id]);

  const loadSaved = useCallback(async () => {
    if (!user) return;
    const r = await fetch(api("/api/social/v2/my-saved"), { credentials: "include" });
    const j = await r.json();
    setSavedSet(new Set<number>(j.savedIds ?? []));
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    void loadFeed(controller.signal);
    return () => controller.abort();
  }, [loadFeed]);
  useEffect(() => { loadSaved(); }, [loadSaved]);

  // Detect YouTube ID from a URL
  function getYouTubeId(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]{11})/);
    return m ? m[1] : null;
  }

  const isYouTube = !!getYouTubeId(mediaUrl);

  async function submitPost() {
    if (!content.trim() || posting || !user || !isOnline) return;
    setPosting(true);
    try {
      const r = await fetch(api("/api/social/v2/post"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), domain, mediaUrl: mediaUrl.trim() || undefined }),
        credentials: "include",
      });
      if (r.ok) {
        const j = await r.json();
        if (feedScope === "all") {
          setPosts(prev => [j.post, ...prev]);
        }
        setContent(""); setMediaUrl(""); setShowImg(false);
      }
    } finally { setPosting(false); }
  }

  async function toggleSave(postId: number) {
    if (!user || !isOnline) return;
    if (savedSet.has(postId)) {
      await fetch(api(`/api/social/v2/post/${postId}/save`), { method: "DELETE", credentials: "include" });
      setSavedSet(prev => { const s = new Set(prev); s.delete(postId); return s; });
    } else {
      await fetch(api(`/api/social/v2/post/${postId}/save`), { method: "POST", credentials: "include" });
      setSavedSet(prev => new Set([...prev, postId]));
    }
  }

  function handleDeleted(postId: number) {
    setPosts(previous => previous.filter(post => post.id !== postId));
    setSavedSet(previous => {
      const next = new Set(previous);
      next.delete(postId);
      return next;
    });
    setTrendingRefreshKey(previous => previous + 1);
  }

  const filtered = filter === "all" ? posts : posts.filter(p => p.domain === filter);

  return (
    <div dir={dir} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Composer */}
      {user ? (
        <div style={{ background: "hsl(var(--card))", border: `1px solid ${GOLD_A(0.13)}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Avatar name={user.username} />
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder={st.post_placeholder} maxLength={500} dir={dir} rows={3}
              aria-label={st.post_placeholder}
              style={{ flex: 1, background: "transparent", border: "none", color: "hsl(var(--foreground))", resize: "none", fontSize: 14, outline: "none", lineHeight: 1.5 }} />
          </div>
          {/* Optional media URL — image or YouTube */}
          {showImg && (
            <div style={{ marginTop: 8 }}>
              <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)}
                placeholder={st.image_url}
                aria-label={st.image_url}
                style={{ width: "100%", background: "hsl(var(--background))", border: `1px solid ${isYouTube ? "#ef4444" : GOLD_A(0.13)}`, borderRadius: 8, padding: "8px 12px", color: "hsl(var(--foreground))", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              {isYouTube && (
                <p style={{ margin: "5px 0 0", fontSize: 11, color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
                  <Video size={11} /> {st.youtube_embed}
                </p>
              )}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DOMAINS.map(d => (
                <button key={d} onClick={() => setDomain(d)}
                  style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", background: domain === d ? GOLD : "hsl(var(--secondary))", color: domain === d ? "hsl(var(--primary-foreground))" : "hsl(var(--secondary-foreground))" }}>
                  {DOMAIN_ICONS[d]} {st[d] ?? d}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setShowImg(v => !v); if (showImg) setMediaUrl(""); }}
                title={st.attach_image}
                 aria-label={st.attach_image}
                style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${GOLD_A(0.15)}`, background: showImg ? GOLD_A(0.13) : "hsl(var(--secondary))", color: showImg ? (isYouTube ? "#ef4444" : GOLD) : "hsl(var(--muted-foreground))", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isYouTube ? <Video size={14} /> : <Image size={14} />}
              </button>
              <button onClick={submitPost} disabled={!content.trim() || posting || !isOnline}
                style={{ padding: "8px 22px", borderRadius: 20, fontWeight: 900, fontSize: 13, border: "none", cursor: "pointer", background: content.trim() ? GOLD : "hsl(var(--muted))", color: content.trim() ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))", opacity: posting ? 0.5 : 1 }}>
                {posting ? "…" : st.post_btn}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "16px 0", color: "#ffffff30", fontSize: 13 }}>
          {st.login_required}
        </div>
      )}

      {/* Trending */}
      <TrendingSection st={st} dir={dir} refreshKey={trendingRefreshKey} />

      {/* Feed scope */}
      <div style={{ display: "flex", gap: 6 }}>
        {(["all", "following"] as const).map(scope => (
          <Button key={scope} onClick={() => setFeedScope(scope)}
            size="sm"
            variant={feedScope === scope ? "default" : "secondary"}
            aria-pressed={feedScope === scope}>
            {scope === "all" ? st.all : st.following_only}
          </Button>
        ))}
      </div>

      {/* Domain filter */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {["all", ...DOMAINS].map(d => (
          <button key={d} onClick={() => setFilter(d)}
            style={{ whiteSpace: "nowrap", padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", background: filter === d ? GOLD : "hsl(var(--card))", color: filter === d ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))", flexShrink: 0 }}>
            {d === "all" ? st.all : `${DOMAIN_ICONS[d]} ${st[d] ?? d}`}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading && <div style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", padding: 40 }}>{st.loading}</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", padding: 60, fontSize: 14 }}>
          {feedScope === "following" ? st.no_following_posts : st.no_posts}
        </div>
      )}
      {filtered.map(post => (
        <FeedCard key={post.id} post={post} user={user} st={st} dir={dir}
          saved={savedSet.has(post.id)}
          onSaveToggle={() => toggleSave(post.id)}
          onDeleted={handleDeleted}
        />
      ))}
    </div>
  );
}
