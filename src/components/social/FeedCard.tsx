/**
 * FeedCard — single post card with reactions, comments, share, and save
 */
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Bookmark, BookmarkCheck, Loader2, MessageSquare, Share2, Trash2 } from "lucide-react";
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
import Avatar from "./Avatar";
import { GOLD, GOLD_A, DOMAIN_ICONS, timeAgo, api, useSocialI18n } from "./social-i18n";
import type { FeedPost, Comment } from "./social-types";
import { useConnectivity } from "@/contexts/ConnectivityContext";

const EMOJIS = ["❤️", "😂", "😮", "😡", "👏"] as const;

// ── ActionBtn ─────────────────────────────────────────────────────────────────
function ActionBtn({ icon, label, onClick, active, color, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  active?: boolean; color: string; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "6px 10px", borderRadius: 8, border: "none", cursor: disabled ? "default" : "pointer",
        background: active ? `${color}18` : "transparent",
        color: active ? color : "#ffffff50",
        fontSize: 12, fontWeight: 600, transition: "all 0.2s",
        opacity: disabled ? 0.5 : 1,
      }}>
      {icon}{label}
    </button>
  );
}

// ── ReactionBtn ───────────────────────────────────────────────────────────────
function ReactionBtn({ postId, initialLikes, st }: { postId: number; initialLikes: number; st: Record<string, string> }) {
  const { isOnline } = useConnectivity();
  const [open,       setOpen]       = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [counts,     setCounts]     = useState<Record<string, number>>({});
  const [total,      setTotal]      = useState(initialLikes);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    fetch(api(`/api/social/v2/post/${postId}/reactions`))
      .then(r => r.json())
      .then(j => {
        if (j.reactions) {
          setCounts(j.reactions);
          setTotal(Object.values(j.reactions as Record<string,number>).reduce((a,b) => a+b, 0));
        }
        if (j.yourReaction) setMyReaction(j.yourReaction);
      }).catch(() => {});
  }, [postId]);

  async function sendReaction(emoji: string) {
    if (!isOnline) return;
    setOpen(false);
    const prev = myReaction;
    setMyReaction(emoji);
    try {
      const r = await fetch(api(`/api/social/v2/post/${postId}/react`), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: emoji }), credentials: "include",
      });
      const j = await r.json();
      if (j.reactions) {
        setCounts(j.reactions);
        setTotal(Object.values(j.reactions as Record<string,number>).reduce((a,b) => a+b, 0));
      }
    } catch { setMyReaction(prev); }
  }

  const topEmoji = Object.entries(counts).sort((a,b) => b[1]-a[1])[0]?.[0];
  const displayEmoji = myReaction ?? topEmoji ?? "❤️";

  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => { clearTimeout(timerRef.current); setOpen(true); }}
      onMouseLeave={() => { timerRef.current = setTimeout(() => setOpen(false), 300); }}>
      <button
        onClick={() => myReaction ? sendReaction(myReaction) : setOpen(v => !v)}
        disabled={!isOnline}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
          background: myReaction ? "#ef444418" : "transparent",
          color: myReaction ? "#ef4444" : "#ffffff50",
          fontSize: 12, fontWeight: 600, transition: "all 0.2s",
        }}>
        <span style={{ fontSize: 15 }}>{displayEmoji}</span>
        {total > 0 && <span>{total}</span>}
        {!myReaction && <span>{st.react}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute", bottom: "calc(100% + 4px)", insetInlineStart: 0,
               background: "hsl(var(--secondary))", border: `1px solid ${GOLD_A(0.15)}`,
              borderRadius: 24, padding: "6px 10px",
              display: "flex", gap: 4, zIndex: 200,
              boxShadow: "0 4px 24px rgba(0,0,0,0.85)", whiteSpace: "nowrap",
            }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => sendReaction(e)} title={`${counts[e] ?? 0}`}
                disabled={!isOnline}
                style={{
                  background: myReaction === e ? "#ffffff20" : "none",
                  border: "none", cursor: "pointer", fontSize: 22,
                  padding: "2px 4px", borderRadius: 12, transition: "transform 0.1s", lineHeight: 1,
                }}
                onMouseEnter={ev => { (ev.currentTarget as HTMLButtonElement).style.transform = "scale(1.35)"; }}
                onMouseLeave={ev => { (ev.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}>
                {e}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main FeedCard ─────────────────────────────────────────────────────────────
interface Props {
  post: FeedPost;
  user: { id: number; username: string } | null;
  st: Record<string, string>;
  dir: string;
  saved: boolean;
  onSaveToggle: () => void;
  onDeleted: (postId: number) => void;
}

export default function FeedCard({ post, user, saved, onSaveToggle, onDeleted }: Props) {
  const { st, dir, locale } = useSocialI18n();
  const { isOnline } = useConnectivity();
  const [comments,       setComments]       = useState<Comment[]>([]);
  const [newComment,     setNewComment]     = useState("");
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [expanded,       setExpanded]       = useState(false);
  const [sending,        setSending]        = useState(false);
  const [shareToast,     setShareToast]     = useState(false);
  const [deleteOpen,     setDeleteOpen]     = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [deleteError,    setDeleteError]    = useState("");
  const deletePendingRef = useRef(false);

  async function deletePost() {
    if (deletePendingRef.current || !isOnline) return;
    deletePendingRef.current = true;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(api(`/api/social/v2/post/${post.id}`), {
        method: "DELETE",
        credentials: "include",
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setDeleteError(body.error ?? "Could not delete this post. Please try again.");
        return;
      }
      setDeleteOpen(false);
      onDeleted(post.id);
    } catch {
      setDeleteError("Could not delete this post. Please try again.");
    } finally {
      deletePendingRef.current = false;
      setDeleting(false);
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(`${window.location.origin}/social#post-${post.id}`).catch(() => {});
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  }

  async function loadComments() {
    if (commentsLoaded) return;
    const r = await fetch(api(`/api/social/v2/post/${post.id}/comments`));
    const j = await r.json();
    setComments(j.comments ?? []);
    setCommentsLoaded(true);
  }

  function toggleComments() {
    if (!expanded) loadComments();
    setExpanded(v => !v);
  }

  async function sendComment() {
    if (!newComment.trim() || sending || !user || !isOnline) return;
    setSending(true);
    try {
      const r = await fetch(api(`/api/social/v2/post/${post.id}/comment`), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }), credentials: "include",
      });
      if (r.ok) {
        const j = await r.json();
        setComments(prev => [...prev, j.comment]);
        setNewComment("");
      }
    } finally { setSending(false); }
  }

  return (
    <motion.div dir={dir}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      id={`post-${post.id}`}
       style={{ background: "hsl(var(--card))", border: `1px solid ${GOLD_A(0.08)}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 10px" }}>
        <a href={`/u/${encodeURIComponent(post.username)}`} aria-label={post.username}><Avatar name={post.username} /></a>
        <div style={{ flex: 1 }}>
          <a href={`/u/${encodeURIComponent(post.username)}`} style={{ margin: 0, fontWeight: 800, color: "hsl(var(--foreground))", fontSize: 14 }}>{post.username}</a>
          <p style={{ margin: 0, fontSize: 11, color: "#ffffff40" }}>
             {DOMAIN_ICONS[post.domain] ?? "🌍"} {st[post.domain] ?? post.domain} · {timeAgo(post.createdAt, st, locale)}
          </p>
        </div>
      </div>

      {/* Content */}
       <div style={{ padding: "0 16px 12px", color: "hsl(var(--foreground))", fontSize: 14, lineHeight: 1.6 }} dir={dir}>
        {post.content}
      </div>

      {/* Attached media — image or YouTube embed */}
      {post.imageUrl && post.mediaType === "video" && (() => {
        const ytId = post.imageUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]{11})/)?.[1];
        return ytId ? (
          <div style={{ margin: "0 16px 12px", borderRadius: 10, overflow: "hidden", aspectRatio: "16/9", background: "#000" }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1`}
              title={st.youtube_video}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            />
          </div>
        ) : null;
      })()}
      {post.imageUrl && post.mediaType !== "video" && (
        <div style={{ margin: "0 16px 12px" }}>
          <img src={post.imageUrl} alt={st.media_alt} style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 8 }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 2, padding: "8px 10px", borderTop: `1px solid #ffffff08`, flexWrap: "wrap" }}>
        <ReactionBtn postId={post.id} initialLikes={post.likes} st={st} />
        <ActionBtn icon={<MessageSquare size={14} />}
          label={`${post.commentCount > 0 ? post.commentCount + " " : ""}${st.comment}`}
          onClick={toggleComments} active={expanded} color={GOLD} />
        <div style={{ position: "relative" }}>
          <ActionBtn icon={<Share2 size={14} />} label={st.share} onClick={handleShare} color="#3b82f6" />
          {shareToast && (
            <span style={{ position: "absolute", bottom: "calc(100% + 4px)", insetInlineStart: 0, background: "#22c55e", color: "#000", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
              {st.share_copied}
            </span>
          )}
        </div>
        <ActionBtn icon={saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          label={saved ? st.saved : st.save}
          onClick={onSaveToggle} active={saved} color={GOLD}
          disabled={!user || !isOnline} />
        {user?.id === post.userId && (
          <AlertDialog open={deleteOpen} onOpenChange={(open) => {
            if (!deleting) {
              setDeleteOpen(open);
              if (open) setDeleteError("");
            }
          }}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto gap-1.5 px-2.5 py-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={!isOnline}
                data-testid={`button-delete-social-post-${post.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-testid={`dialog-delete-social-post-${post.id}`}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the post and its likes, comments, reactions, and saves. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert" data-testid={`text-delete-social-post-error-${post.id}`}>
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting || !isOnline}
                  onClick={(event) => {
                    event.preventDefault();
                    void deletePost();
                  }}
                  data-testid={`button-confirm-delete-social-post-${post.id}`}
                >
                  {deleting ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting…</> : "Delete post"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Comments */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 16px 14px", borderTop: `1px solid #ffffff08` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, margin: "10px 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>
                {st.comments}
              </p>
              {comments.length === 0 && (
                <p style={{ color: "#ffffff30", fontSize: 12, margin: "0 0 8px" }}>{st.no_comments}</p>
              )}
              {comments.map(c => (
                <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <a href={`/u/${encodeURIComponent(c.username)}`} aria-label={c.username}><Avatar name={c.username} size={24} /></a>
                  <div style={{ background: "hsl(var(--secondary))", borderRadius: 8, padding: "6px 10px", flex: 1 }}>
                    <a href={`/u/${encodeURIComponent(c.username)}`} style={{ fontWeight: 700, color: GOLD, fontSize: 12 }}>{c.username}</a>
                    <span style={{ color: "hsl(var(--foreground))", fontSize: 13, marginInlineStart: 8 }} dir={dir}>{c.content}</span>
                    <p style={{ margin: "3px 0 0", fontSize: 10, color: "#ffffff25" }}>{timeAgo(c.createdAt, st, locale)}</p>
                  </div>
                </div>
              ))}
              {user ? (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Avatar name={user.username} size={24} />
                  <input value={newComment} onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendComment()}
                    placeholder={st.write_comment} dir={dir}
                     aria-label={st.write_comment}
                    style={{ flex: 1, background: "hsl(var(--secondary))", border: `1px solid ${GOLD_A(0.13)}`, borderRadius: 8, padding: "6px 12px", color: "hsl(var(--foreground))", fontSize: 13, outline: "none" }} />
                  <button onClick={sendComment} disabled={sending || !newComment.trim() || !isOnline}
                    style={{ padding: "6px 14px", borderRadius: 8, background: GOLD, border: "none", color: "hsl(var(--primary-foreground))", fontWeight: 800, cursor: "pointer", fontSize: 12, opacity: sending ? 0.5 : 1 }}>
                    {st.send}
                  </button>
                </div>
              ) : (
                <p style={{ color: "#ffffff30", fontSize: 12, fontStyle: "italic" }}>{st.login_required}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
