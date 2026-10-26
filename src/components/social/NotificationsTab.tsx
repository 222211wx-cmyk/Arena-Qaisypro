/**
 * NotificationsTab — per-user activity feed: comments, reactions, follows, missed calls
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { GOLD, GOLD_A, timeAgo, api, useSocialI18n } from "./social-i18n";
import type { NotifItem } from "./social-types";

function notifIcon(type: string) {
  if (type === "comment")      return "💬";
  if (type === "reaction")     return "😊";
  if (type === "follow")       return "👤";
  if (type === "call_missed")  return "📞";
  return "🔔";
}

function notifBg(type: string) {
  if (type === "comment")      return GOLD_A(0.13);
  if (type === "reaction")     return "#ef444420";
  if (type === "follow")       return "#3b82f620";
  if (type === "call_missed")  return "#ef444420";
  return "#ffffff10";
}

function notifLabel(n: NotifItem, st: Record<string, string>): string {
  if (n.type === "comment")     return st.notif_comment;
  if (n.type === "reaction")    return `${st.notif_reaction} ${n.content}`;
  if (n.type === "follow")      return st.notif_follow;
  if (n.type === "call_missed") return st.notif_call_missed;
  return n.content;
}

interface Props {
  user: { id: number; username: string } | null;
  st: Record<string, string>;
  dir: string;
}

export default function NotificationsTab({ user }: Props) {
  const { st, dir, locale } = useSocialI18n();
  const [notifs,  setNotifs]  = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await fetch(api("/api/social/v2/notifications"), { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load notifications");
      const j = await r.json();
      setNotifs(j.notifications ?? []);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const publishUnreadCount = useCallback((next: NotifItem[]) => {
    window.dispatchEvent(new CustomEvent("social-notifications-updated", {
      detail: { unreadCount: next.filter(notification => !notification.isRead).length },
    }));
  }, []);

  const markOneRead = useCallback(async (id: number) => {
    const current = notifs.find(notification => notification.id === id);
    if (!current || current.isRead) return;
    const next = notifs.map(notification => notification.id === id
      ? { ...notification, isRead: true }
      : notification);
    setNotifs(next);
    publishUnreadCount(next);
    try {
      const response = await fetch(api(`/api/social/v2/notifications/${id}/read`), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark notification read");
    } catch {
      setNotifs(notifs);
      publishUnreadCount(notifs);
    }
  }, [notifs, publishUnreadCount]);

  const markAllRead = useCallback(async () => {
    if (markingAll) return;
    const previous = notifs;
    const next = notifs.map(notification => ({ ...notification, isRead: true }));
    setNotifs(next);
    publishUnreadCount(next);
    setMarkingAll(true);
    try {
      const response = await fetch(api("/api/social/v2/notifications/read-all"), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark notifications read");
    } catch {
      setNotifs(previous);
      publishUnreadCount(previous);
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, notifs, publishUnreadCount]);

  const unreadCount = notifs.filter(notification => !notification.isRead).length;

  if (!user) return (
    <div style={{ textAlign: "center", padding: 60, color: "hsl(var(--muted-foreground))" }}>
      <Bell size={36} style={{ opacity: 0.2, display: "block", margin: "0 auto 12px" }} />
      <p style={{ margin: 0, fontSize: 14 }}>{st.login_required}</p>
    </div>
  );

  return (
    <div dir={dir} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Header */}
      {unreadCount > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={markAllRead} disabled={markingAll}
            style={{ background: "none", border: `1px solid ${GOLD_A(0.19)}`, borderRadius: 8, padding: "5px 12px", color: GOLD, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            {st.mark_read}
          </button>
        </div>
      )}

      {loading && <div style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", padding: 40 }}>{st.loading}</div>}
      {!loading && notifs.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "hsl(var(--muted-foreground))" }}>
          <Bell size={36} style={{ opacity: 0.2, display: "block", margin: "0 auto 12px" }} />
          <p style={{ margin: 0, fontSize: 14 }}>{st.no_notifications}</p>
        </div>
      )}

      {notifs.map((n, i) => (
        <motion.div key={n.id}
          role="button"
          tabIndex={n.isRead ? -1 : 0}
          onClick={() => void markOneRead(n.id)}
          onKeyDown={(event) => {
            if (!n.isRead && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              void markOneRead(n.id);
            }
          }}
          initial={{ opacity: 0, x: dir === "rtl" ? 10 : -10 }}
          animate={{ opacity: n.isRead ? 0.45 : 1, x: 0 }}
          style={{
            background: "hsl(var(--card))", border: `1px solid ${GOLD_A(0.06)}`, borderRadius: 10,
            padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10,
            cursor: n.isRead ? "default" : "pointer",
          }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: notifBg(n.type),
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>
            {notifIcon(n.type)}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <p style={{ margin: 0, fontSize: 13, color: "hsl(var(--foreground))" }}>
              <strong style={{ color: GOLD }}>{n.username}</strong>
              {" "}
              {notifLabel(n, st)}
            </p>
            {n.postSnippet && (
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ffffff40", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir={dir}>
                "{n.postSnippet}…"
              </p>
            )}
            {n.type === "comment" && n.content && (
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#ccc", fontStyle: "italic" }} dir={dir}>
                "{n.content}"
              </p>
            )}
            <p style={{ margin: "4px 0 0", fontSize: 10, color: "#ffffff25" }}>
              {timeAgo(n.createdAt, st, locale)}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
