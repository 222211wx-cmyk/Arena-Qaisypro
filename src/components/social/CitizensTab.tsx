/**
 * CitizensTab — browse citizens, follow/unfollow, start audio/video calls
 */
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus, UserCheck } from "lucide-react";
import { useLocation } from "wouter";
import Avatar from "./Avatar";
import { GOLD, GOLD_A, api, useSocialI18n } from "./social-i18n";
import { useCallContext } from "../../contexts/CallContext";
import type { Citizen } from "./social-types";

function CallBtn({ icon, title, onClick, color }: { icon: string; title: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer", background: `${color}20`, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
      {icon}
    </button>
  );
}

interface Props {
  user: { id: number; username: string } | null;
  st: Record<string, string>;
}

export default function CitizensTab({ user }: Props) {
  const { st, dir, locale } = useSocialI18n();
  const call = useCallContext();
  const [, navigate] = useLocation();
  const [q,         setQ]         = useState("");
  const [citizens,  setCitizens]  = useState<Citizen[]>([]);
  const [following, setFollowing] = useState<Set<number>>(new Set());
  const [loading,   setLoading]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function openDM(targetUsername: string) {
    try {
      const response = await fetch(api("/api/messages/rooms"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUsername, type: "direct" }),
      });
      if (!response.ok) return;
      const data = await response.json() as { room?: { id?: number } };
      if (typeof data.room?.id !== "number") return;
      navigate(`/messages?room=${data.room.id}`);
    } catch { /* ignore */ }
  }

  useEffect(() => { loadCitizens(""); }, []);
  useEffect(() => { if (user) loadFollowing(); }, [user]);

  async function loadCitizens(query: string) {
    setLoading(true);
    try {
      const r = await fetch(api(`/api/social/v2/citizens?q=${encodeURIComponent(query)}&limit=40`));
      const j = await r.json();
      setCitizens(j.citizens ?? []);
    } finally { setLoading(false); }
  }

  async function loadFollowing() {
    const r = await fetch(api("/api/social/v2/my-following"), { credentials: "include" });
    const j = await r.json();
    setFollowing(new Set<number>(j.following ?? []));
  }

  function handleSearch(val: string) {
    setQ(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadCitizens(val), 300);
  }

  async function toggleFollow(c: Citizen) {
    if (!user) return;
    if (following.has(c.id)) {
      await fetch(api(`/api/social/v2/follow/${c.username}`), { method: "DELETE", credentials: "include" });
      setFollowing(prev => { const s = new Set(prev); s.delete(c.id); return s; });
    } else {
      await fetch(api(`/api/social/v2/follow/${c.username}`), { method: "POST", credentials: "include" });
      setFollowing(prev => new Set([...prev, c.id]));
    }
  }

  return (
    <div dir={dir} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Search */}
      <div style={{ position: "relative" }}>
        <Search size={14} style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "#666" }} />
        <input value={q} onChange={e => handleSearch(e.target.value)}
          placeholder={st.search_placeholder}
          style={{ width: "100%", background: "hsl(var(--card))", border: `1px solid ${GOLD_A(0.13)}`, borderRadius: 10, paddingBlock: 10, paddingInlineStart: 36, paddingInlineEnd: 12, color: "hsl(var(--foreground))", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
      </div>

      {loading && <div style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", padding: 24 }}>{st.loading}</div>}
      {!loading && citizens.length === 0 && (
        <div style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", padding: 60, fontSize: 14 }}>{st.no_citizens}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {citizens.map(c => {
          const isFollowing = following.has(c.id);
          const isOnline    = call.onlineUsers.includes(c.username);
          const isMe        = c.id === user?.id;
          return (
            <motion.div key={c.id} whileHover={{ scale: 1.01 }}
              style={{ background: "hsl(var(--card))", border: `1px solid ${GOLD_A(0.08)}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Avatar name={c.username} size={38} />
                  {isOnline && (
                     <div style={{ position: "absolute", bottom: 1, insetInlineEnd: 1, width: 10, height: 10, background: "#22c55e", borderRadius: "50%", border: "2px solid hsl(var(--card))" }} />
                  )}
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <p style={{ margin: 0, fontWeight: 800, color: "hsl(var(--foreground))", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.username}</p>
                  <p style={{ margin: 0, fontSize: 11, color: c.rank.color }}>{c.rank.icon} {c.rank.label}</p>
                </div>
              </div>
              <div style={{ display: "flex", fontSize: 11, color: "#ffffff50", justifyContent: "space-between" }}>
                <span>⚡ {c.xp.toLocaleString(locale)} {st.xp}</span>
                <span>🪙 {c.balance.toLocaleString(locale)}</span>
              </div>
              {!isMe && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button onClick={() => toggleFollow(c)} disabled={!user}
                    style={{ flex: 1, padding: "6px 0", borderRadius: 8, cursor: user ? "pointer" : "default", fontWeight: 700, fontSize: 11,
                      background: isFollowing ? "hsl(var(--secondary))" : GOLD,
                      color: isFollowing ? GOLD : "hsl(var(--primary-foreground))",
                      border: isFollowing ? `1px solid ${GOLD_A(0.25)}` : "none" }}>
                    {isFollowing
                      ? <><UserCheck size={11} style={{ display: "inline", marginInlineEnd: 3 }} />{st.following}</>
                      : <><UserPlus  size={11} style={{ display: "inline", marginInlineEnd: 3 }} />{st.follow}</>
                    }
                  </button>
                  {user && (
                    <>
                       <CallBtn icon="💬" title={st.message_citizen} onClick={() => openDM(c.username)} color={GOLD} />
                      <CallBtn icon="📞" title={st.voice_call} onClick={() => call.startCall(c.username, false)} color="#22c55e" />
                      <CallBtn icon="🎥" title={st.video_call} onClick={() => call.startCall(c.username, true)}  color="#3b82f6" />
                    </>
                  )}
                </div>
              )}
              {isMe && (
                <p style={{ margin: 0, fontSize: 11, color: "#ffffff30", textAlign: "center" }}>{st.my_profile}</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
