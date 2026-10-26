/**
 * CommunicationMatrix — future-facing overview/launcher for the Social Hub.
 *
 * A living communication network snapshot: it stitches together the current feed,
 * live events, unread messages, notifications and discoverable citizens into one
 * scannable surface, then routes citizens into the existing surfaces
 * (/messages, /pulse, /events, /citizens, /friends, /search).
 *
 * It only reads existing endpoints via fetch, tolerates logged-out / partial
 * failures, refreshes the lightweight overview while mounted, and cancels
 * in-flight requests on unmount.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  MessageSquare, Radio, Calendar, Users, UserPlus, Search,
  Activity, RefreshCw, Bell, Globe, ArrowRight, Wifi, WifiOff,
} from "lucide-react";
import Avatar from "./Avatar";
import { GOLD, GOLD_A, api, timeAgo, useSocialI18n } from "./social-i18n";
import type { FeedPost, Citizen, NotifItem } from "./social-types";

interface LiveEvent {
  id: number;
  title: string;
  titleAr?: string | null;
  domain?: string;
  isLive?: boolean;
  eventDate?: string;
}

interface Props {
  user: { id: number; username: string; xp?: number } | null;
  st: Record<string, string>;
  dir: string;
  /** Optional external navigation override; falls back to BASE-aware wouter routing. */
  onNavigate?: (path: string) => void;
  /** Optional search submit override; falls back to routing to /search?q=. */
  onSearchSubmit?: (q: string) => void;
}

type ConnState = "live" | "syncing" | "offline";

const CARD_BG = "hsl(var(--card))";
const BORDER = GOLD_A(0.094);

export default function CommunicationMatrix({ user, onNavigate, onSearchSubmit }: Props) {
  const { st, dir, locale } = useSocialI18n();
  const [, wouterNavigate] = useLocation();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [citizens, setCitizens] = useState<Citizen[]>([]);

  const [conn, setConn] = useState<ConnState>("syncing");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Navigate honoring BASE (wouter's base is already configured app-wide).
  const navigate = useCallback((path: string) => {
    if (onNavigate) { onNavigate(path); return; }
    wouterNavigate(path);
  }, [onNavigate, wouterNavigate]);

  const loadOverview = useCallback(async (signal: AbortSignal) => {
    setRefreshing(true);
    // Each surface is independent — a partial failure never blanks the whole matrix.
    const settle = async <T,>(path: string, pick: (j: any) => T, fallback: T): Promise<{ ok: boolean; value: T }> => {
      try {
        const r = await fetch(api(path), { credentials: "include", signal });
        if (!r.ok) return { ok: false, value: fallback };
        const j = await r.json();
        return { ok: true, value: pick(j) };
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") throw e;
        return { ok: false, value: fallback };
      }
    };

    try {
      const results = await Promise.all([
        settle<FeedPost[]>("/api/social/v2/feed?limit=5", j => j.posts ?? [], []),
        settle<LiveEvent[]>("/api/pulse/events", j => j.events ?? [], []),
        settle<number>("/api/messages/unread-count", j => j.count ?? 0, 0),
        settle<NotifItem[]>("/api/social/v2/notifications", j => j.notifications ?? [], []),
        settle<Citizen[]>("/api/citizens?limit=6", j => j.citizens ?? [], []),
      ]);

      if (signal.aborted) return;

      setPosts(results[0].value);
      setEvents(results[1].value);
      setUnread(results[2].value);
      setNotifs(results[3].value);
      setCitizens(results[4].value);

      const anyOk = results.some(r => r.ok);
      setConn(anyOk ? "live" : "offline");
      setLastUpdated(Date.now());
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setConn("offline");
    } finally {
      if (!signal.aborted) setRefreshing(false);
    }
  }, []);

  // Initial load + periodic refresh while mounted; abort on unmount.
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    let stopped = false;
    const run = () => {
      controllerRef.current?.abort();
      const ctrl = new AbortController();
      controllerRef.current = ctrl;
      void loadOverview(ctrl.signal);
    };
    run();
    const t = setInterval(() => { if (!stopped) run(); }, 25_000);
    return () => {
      stopped = true;
      clearInterval(t);
      controllerRef.current?.abort();
    };
  }, [loadOverview, user?.id]);

  useEffect(() => {
    const handleNotificationsUpdated = (event: Event) => {
      const unreadCount = (event as CustomEvent<{ unreadCount?: number }>).detail?.unreadCount;
      if (typeof unreadCount === "number") {
        setNotifs(current => unreadCount === 0
          ? current.map(notification => ({ ...notification, isRead: true }))
          : current);
      }
    };
    window.addEventListener("social-notifications-updated", handleNotificationsUpdated);
    return () => window.removeEventListener("social-notifications-updated", handleNotificationsUpdated);
  }, []);

  const manualRefresh = useCallback(() => {
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    setConn("syncing");
    void loadOverview(ctrl.signal);
  }, [loadOverview]);

  const submitSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) { navigate("/search"); return; }
    if (onSearchSubmit) { onSearchSubmit(trimmed); return; }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [navigate, onSearchSubmit]);

  const liveEventCount = events.filter(e => e.isLive).length;

  // Merge cross-surface activity into a single scannable stream.
  const activity = buildActivity(posts, events, notifs, st, locale);

  const connMeta: Record<ConnState, { label: string; color: string; icon: React.ReactNode }> = {
    live:    { label: st.matrix_live,       color: "#22c55e", icon: <Wifi size={12} /> },
    syncing: { label: st.matrix_syncing, color: GOLD,      icon: <RefreshCw size={12} className={refreshing ? "spin-slow" : undefined} /> },
    offline: { label: st.matrix_offline, color: "#ef4444", icon: <WifiOff size={12} /> },
  };

  const stats = [
    { key: "unread", label: st.stat_unread, value: unread, color: "#3b82f6", path: "/messages" },
    { key: "live", label: st.stat_live_events, value: liveEventCount, color: "#ef4444", path: "/events" },
    { key: "notif", label: st.stat_notifications, value: notifs.filter(notification => !notification.isRead).length, color: GOLD, path: "/messages" },
    { key: "posts", label: st.stat_posts, value: posts.length, color: "#22c55e", path: "/pulse" },
  ];

  const tiles = [
    { key: "messages", title: st.tile_messages, sub: st.tile_messages_sub, icon: <MessageSquare size={18} />, path: "/messages", badge: unread },
    { key: "pulse", title: st.tile_pulse, sub: st.tile_pulse_sub, icon: <Radio size={18} />, path: "/pulse", badge: 0 },
    { key: "events", title: st.tile_events, sub: st.tile_events_sub, icon: <Calendar size={18} />, path: "/events", badge: liveEventCount },
    { key: "citizens", title: st.tile_citizens, sub: st.tile_citizens_sub, icon: <Users size={18} />, path: "/citizens", badge: 0 },
    { key: "friends", title: st.tile_friends, sub: st.tile_friends_sub, icon: <UserPlus size={18} />, path: "/friends", badge: 0 },
    { key: "search", title: st.tile_search, sub: st.tile_search_sub, icon: <Search size={18} />, path: "/search", badge: 0 },
  ];

  return (
    <div dir={dir} style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="communication-matrix">
      <style>{`
        @keyframes cm-pulse { 0%,100%{ opacity: 1; } 50%{ opacity: 0.3; } }
        .cm-dot { animation: cm-pulse 1.6s ease-in-out infinite; }
        .spin-slow { animation: cm-spin 1s linear infinite; }
        @keyframes cm-spin { to { transform: rotate(360deg); } }
        .cm-tile:hover { border-color: ${GOLD_A(0.333)} !important; transform: translateY(-2px); }
        .cm-stat:hover { border-color: ${GOLD_A(0.251)} !important; }
        .cm-act:hover { background: #141414 !important; }
      `}</style>

      {/* Header: title, subtitle, live indicator + refresh */}
      <div style={{
        background: `linear-gradient(135deg, ${GOLD_A(0.051)}, transparent 60%)`,
        border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={18} style={{ color: GOLD, flexShrink: 0 }} />
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: 0.5, color: "#fff" }} data-testid="text-matrix-title">
                 {st.matrix_title}
              </h2>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#ffffff70", lineHeight: 1.5, maxWidth: 520 }}>
               {st.matrix_subtitle}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div
              aria-live="polite"
               aria-label={`${st.matrix_updated}: ${connMeta[conn].label}`}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#111", border: `1px solid ${connMeta[conn].color}40`,
                borderRadius: 20, padding: "5px 10px",
              }}
              data-testid="status-connection"
            >
              <span className={conn === "live" ? "cm-dot" : undefined}
                style={{ width: 7, height: 7, borderRadius: "50%", background: connMeta[conn].color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: connMeta[conn].color, fontSize: 11, fontWeight: 800 }}>
                {connMeta[conn].icon}{connMeta[conn].label}
              </span>
            </div>
            <button
              onClick={manualRefresh}
              disabled={refreshing}
               aria-label={st.matrix_refresh}
               title={st.matrix_refresh}
              className="empire-btn"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
                background: "hsl(var(--card))", border: `1px solid ${GOLD_A(0.145)}`, borderRadius: 10,
                padding: "7px 10px", color: GOLD, fontSize: 11, fontWeight: 800,
                cursor: refreshing ? "default" : "pointer",
              }}
              data-testid="button-matrix-refresh"
            >
              <RefreshCw size={13} className={refreshing ? "spin-slow" : undefined} />
            </button>
          </div>
        </div>

        {lastUpdated && (
          <p style={{ margin: "10px 0 0", fontSize: 10.5, color: "#ffffff35" }} data-testid="text-last-updated">
             {st.matrix_updated} · {timeAgo(new Date(lastUpdated).toISOString(), st, locale)}
          </p>
        )}
        {!user && (
          <p style={{ margin: "8px 0 0", fontSize: 11.5, color: GOLD_A(0.69) }} data-testid="text-login-hint">
             {st.matrix_login_hint}
          </p>
        )}
      </div>

      {/* Dynamic count/status summaries */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        {stats.map(s => (
          <button
            key={s.key}
            onClick={() => navigate(s.path)}
            className="cm-stat empire-card"
            aria-label={`${s.label}: ${s.value}`}
            style={{
              textAlign: dir === "rtl" ? "right" : "left",
              background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12,
              padding: "12px 14px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4,
            }}
            data-testid={`stat-${s.key}`}
          >
            <span style={{ fontSize: 26, fontWeight: 900, color: s.value > 0 ? s.color : "#ffffff55", lineHeight: 1 }}>
              {s.value}
            </span>
            <span style={{ fontSize: 11, color: "#ffffff65", fontWeight: 600 }}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Quick actions — launcher tiles into existing routes */}
      <div>
        <SectionLabel icon={<Activity size={12} />} text={st.matrix_quick_actions} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginTop: 8 }}>
          {tiles.map(t => (
            <button
              key={t.key}
              onClick={() => navigate(t.path)}
              className="cm-tile empire-btn"
              aria-label={`${t.title} — ${t.sub}`}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12,
                padding: "13px 14px", cursor: "pointer", transition: "all 0.18s ease",
                textAlign: dir === "rtl" ? "right" : "left",
              }}
              data-testid={`tile-${t.key}`}
            >
              <span style={{
                width: 40, height: 40, minWidth: 40, borderRadius: 10,
                background: GOLD_A(0.071), color: GOLD,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {t.icon}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: "#fff" }}>{t.title}</span>
                  {t.badge > 0 && (
                    <span style={{
                      background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 900,
                      borderRadius: 20, padding: "1px 7px", lineHeight: 1.5,
                    }} data-testid={`badge-${t.key}`}>
                      {t.badge}
                    </span>
                  )}
                </span>
                <span style={{ display: "block", fontSize: 11, color: "#ffffff55", marginTop: 2 }}>{t.sub}</span>
              </span>
              <ArrowRight size={15} style={{ color: GOLD_A(0.439), flexShrink: 0, transform: dir === "rtl" ? "scaleX(-1)" : undefined }} />
            </button>
          ))}
        </div>
      </div>

      {/* Recent cross-surface activity */}
      <div>
        <SectionLabel icon={<Bell size={12} />} text={st.matrix_recent_activity} />
        <div style={{
          marginTop: 8, background: CARD_BG, border: `1px solid ${BORDER}`,
          borderRadius: 12, overflow: "hidden",
        }}>
          {activity.length === 0 ? (
            <p style={{ margin: 0, padding: "22px 16px", textAlign: "center", color: "#ffffff40", fontSize: 12.5 }} data-testid="text-no-activity">
               {st.matrix_no_activity}
            </p>
          ) : (
            activity.map((a, i) => (
              <motion.button
                key={`${a.kind}-${a.id}-${i}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
                onClick={() => navigate(a.path)}
                className="cm-act"
                 aria-label={`${a.title}. ${st.matrix_open}`}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 11,
                  padding: "11px 14px", background: "transparent", border: "none",
                  borderBottom: i < activity.length - 1 ? `1px solid ${GOLD_A(0.039)}` : "none",
                  cursor: "pointer", textAlign: dir === "rtl" ? "right" : "left", transition: "background 0.15s",
                }}
                data-testid={`activity-${a.kind}-${i}`}
              >
                <span style={{
                  width: 30, height: 30, minWidth: 30, borderRadius: 8,
                  background: `${a.color}18`, color: a.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {a.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {a.title}
                  </span>
                  <span style={{ display: "block", fontSize: 10.5, color: "#ffffff45", marginTop: 1 }}>{a.meta}</span>
                </span>
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Discoverable citizens */}
      {citizens.length > 0 && (
        <div>
          <SectionLabel icon={<Users size={12} />} text={st.matrix_discover_citizens} />
          <div style={{ display: "flex", gap: 10, overflowX: "auto", marginTop: 8, paddingBottom: 4 }} className="scrollbar-hide">
            {citizens.map(c => (
              <button
                key={c.id}
                onClick={() => navigate("/citizens")}
                className="empire-btn"
                 aria-label={`${c.username} — ${st.matrix_open} ${st.citizens}`}
                style={{
                  flex: "0 0 auto", width: 120, background: CARD_BG, border: `1px solid ${BORDER}`,
                  borderRadius: 12, padding: "14px 10px", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                }}
                data-testid={`citizen-${c.id}`}
              >
                <Avatar name={c.username} size={46} />
                <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.username}
                </span>
                <span style={{ fontSize: 10, color: GOLD, fontWeight: 700 }}>
                   {(c.xp ?? 0).toLocaleString(locale)} {st.xp}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search the empire CTA */}
      <button
        onClick={() => submitSearch("")}
        className="empire-btn"
        aria-label={st.matrix_search_cta}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: GOLD_A(0.071), border: `1px solid ${GOLD_A(0.208)}`, borderRadius: 12,
          padding: "12px 16px", color: GOLD, fontSize: 13, fontWeight: 800, cursor: "pointer",
        }}
        data-testid="button-search-empire"
      >
         <Search size={15} /> {st.matrix_search_cta}
      </button>
    </div>
  );
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, color: GOLD }}>
      {icon}
      <span style={{ fontSize: 10.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.2 }}>{text}</span>
    </div>
  );
}

interface ActivityRow {
  kind: string;
  id: number | string;
  title: string;
  meta: string;
  path: string;
  color: string;
  icon: React.ReactNode;
}

/** Merge feed, events and notifications into a compact, time-scannable stream. */
function buildActivity(
  posts: FeedPost[],
  events: LiveEvent[],
  notifs: NotifItem[],
  st: Record<string, string>,
  locale: string,
): ActivityRow[] {
  const rows: ActivityRow[] = [];

  events.filter(e => e.isLive).slice(0, 2).forEach(e => {
    rows.push({
      kind: "event", id: e.id,
      title: e.title, meta: st.matrix_live,
      path: "/events", color: "#ef4444", icon: <Radio size={14} />,
    });
  });

  notifs.slice(0, 3).forEach((n, idx) => {
    const verb =
       n.type === "comment"  ? st.notif_comment :
       n.type === "follow"   ? st.notif_follow :
       n.type === "reaction" ? st.notif_reaction :
       n.type === "call_missed" ? st.notif_call_missed :
      (n.content ?? "");
    rows.push({
      kind: "notif", id: `${n.type}-${idx}`,
      title: `${n.username} ${verb}`.trim(),
       meta: n.createdAt ? timeAgo(n.createdAt, st, locale) : "",
      path: "/messages", color: "#3b82f6", icon: <Bell size={14} />,
    });
  });

  posts.slice(0, 4).forEach(p => {
    rows.push({
      kind: "post", id: p.id,
      title: `${p.username}: ${(p.content ?? "").slice(0, 70)}${(p.content ?? "").length > 70 ? "…" : ""}`,
       meta: p.createdAt ? timeAgo(p.createdAt, st, locale) : "",
      path: "/pulse", color: "#22c55e", icon: <Globe size={14} />,
    });
  });

  return rows.slice(0, 7);
}
