import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing, X, CheckCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { api } from "./social/social-i18n";
import { SOCIAL_T } from "./social/social-i18n";
import { useLang } from "@/contexts/LangContext";

interface Notif {
  id: number; type: string; title: string; body: string;
  icon: string; isRead: boolean; linkPath: string | null; createdAt: string;
}

const GREEN = "#22c55e";

function timeAgo(d: string, st: Record<string, string>) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return st.just_now; if (m < 60) return `${m}m ${st.ago}`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ${st.ago}`;
  return `${Math.floor(h / 24)}d ${st.ago}`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const { lang } = useLang();
  const st = SOCIAL_T[lang] ?? SOCIAL_T.en;
  const [open,    setOpen]    = useState(false);
  const [notifs,  setNotifs]  = useState<Notif[]>([]);
  const [unread,  setUnread]  = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(api("/api/notifications"), { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json() as { notifications: Notif[]; unreadCount: number };
      setNotifs(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch { /* network hiccup — keep last state */ }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // Poll every 30s as fallback
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [user, load]);

  // Real-time: CallProvider's WS (useCall) already dispatches a CustomEvent
  // "gdna:notification" when the server pushes a notification message, so we
  // simply listen here — no second WS connection needed.
  useEffect(() => {
    if (!user) return;
    const handler = () => void load();
    window.addEventListener("gdna:notification", handler);
    return () => window.removeEventListener("gdna:notification", handler);
  }, [user, load]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAll = async () => {
    await fetch("/api/notifications/read-all", { method: "POST", credentials: "include" });
    void load();
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(o => !o); if (!open) void load(); }}
        aria-label={st.notifications}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:opacity-80"
        style={{ borderColor: unread > 0 ? `${GREEN}50` : "#ffffff15", background: unread > 0 ? `${GREEN}10` : "transparent" }}>
        {unread > 0
          ? <BellRing className="w-4 h-4" style={{ color: GREEN }} />
          : <Bell className="w-4 h-4 text-muted-foreground" />
        }
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-black text-black flex items-center justify-center"
            style={{ background: GREEN }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className="absolute right-0 top-12 w-80 rounded-2xl border shadow-2xl overflow-hidden z-50"
            style={{ background: "#0a120a", borderColor: "#22c55e22" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#22c55e15" }}>
              <span className="text-sm font-black" style={{ color: GREEN }}>⚡ {st.notifications}</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={() => void markAll()} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" /> {st.mark_read}
                  </button>
                )}
                  <button onClick={() => setOpen(false)} aria-label={st.close} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: GREEN }} />
                  <p className="text-xs">{st.no_notifications}</p>
                </div>
              ) : (
                notifs.map(n => {
                  const Inner = (
                    <div className={`flex items-start gap-3 px-4 py-3 border-b transition-colors hover:bg-white/5 ${!n.isRead ? "bg-green-500/3" : ""}`}
                      style={{ borderColor: "#22c55e10" }}>
                      <span className="text-xl shrink-0">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-bold mb-0.5 ${!n.isRead ? "" : "text-muted-foreground"}`}>{n.title}</div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{n.body}</p>
                        <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt, st)}</div>
                      </div>
                      {!n.isRead && <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: GREEN }} />}
                    </div>
                  );
                  return n.linkPath ? (
                    <Link key={n.id} href={n.linkPath} onClick={() => setOpen(false)}>{Inner}</Link>
                  ) : (
                    <div key={n.id}>{Inner}</div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
