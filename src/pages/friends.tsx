/** AMIS — friends, discovery, calls, and hosted stars. */
import { useState, useEffect, useCallback } from "react";
import { useAuth }        from "../contexts/AuthContext";
import { useCallContext } from "../contexts/CallContext";
import { Phone, Video, UserPlus, Users, MessageSquare, Loader2, Bell, UserCheck } from "lucide-react";
import { useLocation }    from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/contexts/LangContext";
import { friendsCopy, friendsNumber, friendsRelativeTime } from "@/i18n/friends-copy";
import type { Lang } from "@/contexts/LangContext";

const GOLD  = "hsl(var(--primary))";
const GOLD_A = (alpha: number) => `hsl(var(--primary) / ${alpha})`;
const GREEN = "#22c55e";

interface Citizen {
  id: number; username: string; xp: number; balance: number;
  lastSeenAt?: string | null;
}

interface Star {
  username: string; fullName: string; domain: string;
  nationality: string; invited: boolean;
}

const DOMAIN_ICONS: Record<string, string> = { sport: "⚽", music: "🎵", cinema: "🎬" };

const COLORS = ["#e74c3c","#e67e22","#27ae60","#2980b9","#8e44ad","#16a085","#c0392b","#d35400"];

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const bg = COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 900, fontSize: Math.round(size * 0.38), color: "hsl(var(--foreground))",
      boxShadow: `0 0 0 2px #111, 0 0 0 3.5px ${bg}55`,
    }}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function StatusBadge({ lastSeenAt, lang }: { lastSeenAt?: string | null; lang: Lang }) {
  if (!lastSeenAt) return <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>○ {friendsCopy(lang, "offline")}</span>;
  const m = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 60000);
  if (m < 5)  return <span style={{ fontSize: 11, color: GREEN,  fontWeight: 700 }}>● {friendsCopy(lang, "onlineNow")}</span>;
  if (m < 30) return <span style={{ fontSize: 11, color: GOLD,   fontWeight: 700 }}>● {friendsCopy(lang, "busy")}</span>;
  return <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>○ {friendsCopy(lang, "lastSeen", { time: friendsRelativeTime(lang, lastSeenAt) })}</span>;
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 14px" }}>
      <div style={{ flex: 1, height: 1, background: "#ffffff10" }} />
      <span style={{ color: GOLD, fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "#ffffff10" }} />
    </div>
  );
}

/* ── Small icon action button ── */
function ActBtn({
  icon, label, ariaLabel, color, bg, border, onClick, disabled,
}: {
  icon: React.ReactNode; label?: string; ariaLabel: string; color: string;
  bg: string; border: string;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      style={{
        background: bg, border, borderRadius: 10,
        padding: label ? "7px 12px" : "8px 10px",
        cursor: disabled ? "default" : "pointer",
        color, display: "flex", alignItems: "center", gap: 5,
        fontSize: 12, fontWeight: 700, opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
      }}>
      {icon}{label}
    </button>
  );
}

export default function FriendsPage() {
  const { lang } = useLang();
  const t = (key: Parameters<typeof friendsCopy>[1], values?: Record<string, string | number>) =>
    friendsCopy(lang, key, values);
  const { user, loading: authLoading } = useAuth();
  const call        = useCallContext();
  const [, navigate] = useLocation();

  const [friends,    setFriends]    = useState<Citizen[]>([]);
  const [allUsers,   setAllUsers]   = useState<Citizen[]>([]);
  const [friendIds,  setFriendIds]  = useState<Set<number>>(new Set());
  const [pageLoading, setPageLoading] = useState(false);
  const [addingId,   setAddingId]   = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [dmLoadingId,setDmLoadingId]= useState<number | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);
  const [stars,      setStars]      = useState<Star[]>([]);
  const [starQuota,  setStarQuota]  = useState<{ remaining: number; limit: number }>({ remaining: 0, limit: 3 });
  const [invitingStar, setInvitingStar] = useState<string | null>(null);

  const incoming = call.incomingCall;

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Load all data — always use /api/... directly (no BASE_URL prefix) ── */
  const loadData = useCallback(async () => {
    if (!user) return;
    setPageLoading(true);
    try {
      const [fRes, cRes, sRes] = await Promise.all([
        fetch("/api/social/v2/following",  { credentials: "include" }),
        fetch("/api/citizens?limit=200",   { credentials: "include" }),
        fetch("/api/stars",                { credentials: "include" }),
      ]);
      if (!fRes.ok || !cRes.ok || !sRes.ok) throw new Error();
      const fData = await fRes.json() as { following: Citizen[] };
      const cData = await cRes.json() as { citizens: Citizen[] };
      const sData = await sRes.json() as { stars: Star[]; dailyLimit: number; remainingToday: number };
      setStars(sData.stars ?? []);
      setStarQuota({ remaining: sData.remainingToday ?? 0, limit: sData.dailyLimit ?? 3 });

      const list = fData.following ?? [];
      const ids  = new Set(list.map(f => f.id));
      setFriends(list);
      setFriendIds(ids);
      // exclude self, exclude already-friends
      setAllUsers((cData.citizens ?? []).filter(c => c.id !== user.id));
    } catch {
      showToast(t("loadError"), false);
    } finally {
      setPageLoading(false);
    }
  }, [user, lang]);

  useEffect(() => { void loadData(); }, [loadData]);

  /* ── Add friend ── */
  const addFriend = async (c: Citizen) => {
    setAddingId(c.id);
    try {
      const res = await fetch(`/api/social/v2/follow/${encodeURIComponent(c.username)}`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) { await loadData(); showToast(t("addedToast", { username: c.username })); }
      else        { showToast(t("addError"), false); }
    } catch {
      showToast(t("addError"), false);
    } finally { setAddingId(null); }
  };

  /* ── Remove friend ── */
  const removeFriend = async (c: Citizen) => {
    setRemovingId(c.id);
    try {
      const res = await fetch(`/api/social/v2/follow/${encodeURIComponent(c.username)}`, {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) {
        showToast(t("removeError"), false);
        return;
      }
      await loadData();
      showToast(t("removedToast", { username: c.username }));
    } catch {
      showToast(t("removeError"), false);
    } finally { setRemovingId(null); }
  };

  /* ── Open DM ── */
  const openDM = async (c: Citizen) => {
    setDmLoadingId(c.id);
    try {
      const res = await fetch("/api/messages/rooms", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername: c.username, type: "direct" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { room?: { id?: number } };
      if (typeof data.room?.id !== "number") throw new Error();
      navigate(`/messages?room=${data.room.id}`);
    } catch { showToast(t("dmError"), false); }
    finally  { setDmLoadingId(null); }
  };

  /* ── Host a star (invite → DM room with AI-powered star) ── */
  const inviteStar = async (s: Star) => {
    setInvitingStar(s.username);
    try {
      const res = await fetch("/api/stars/invite", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starUsername: s.username }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; roomId?: number };
      if (res.ok) {
        if (typeof data.roomId !== "number") throw new Error();
        showToast(t(s.invited ? "starAlreadyHostedToast" : "starHostedToast", { name: s.fullName }));
        navigate(`/messages?room=${data.roomId}`);
      } else {
        showToast(typeof data.error === "string" ? data.error : t("starError"), false);
      }
    } catch { showToast(t("starError"), false); }
    finally { setInvitingStar(null); }
  };

  /* ── Auth loading ── */
  if (authLoading) return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "hsl(var(--background))", display: "flex",
      alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={36} role="status" aria-label={t("loadingFriends")} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ── Not logged in ── */
  if (!user) return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "hsl(var(--background))", display: "flex",
      alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, color: "hsl(var(--foreground))" }}>
      <Users size={52} style={{ opacity: 0.15 }} />
       <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 14 }}>{t("loginPrompt")}</p>
      <button onClick={() => navigate("/login")}
        style={{ background: GOLD, color: "#000", border: "none", borderRadius: 12,
          padding: "10px 32px", fontWeight: 900, cursor: "pointer", fontSize: 14 }}>
         {t("login")}
      </button>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const discoverList = allUsers.filter(u => !friendIds.has(u.id));

  return (
    <div style={{ minHeight: "100vh", background: "hsl(var(--background))", color: "hsl(var(--foreground))", paddingBottom: 80 }} dir={lang === "ar" ? "rtl" : "ltr"}>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            role={toast.ok ? "status" : "alert"} aria-live="polite"
            style={{ position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
              background: toast.ok ? "#071a07" : "#1a0707",
              border: `1px solid ${toast.ok ? GREEN : "#f44"}60`,
              borderRadius: 12, padding: "10px 24px",
              color: toast.ok ? GREEN : "#f44",
              fontWeight: 700, fontSize: 13, whiteSpace: "nowrap",
              boxShadow: `0 4px 24px ${toast.ok ? GREEN : "#f44"}25` }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Incoming call banner ── */}
      <AnimatePresence>
        {incoming && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", top: 60, left: 0, right: 0, zIndex: 1000,
              background: "#071a07", borderBottom: `2px solid ${GREEN}`,
              padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            <Bell size={16} style={{ color: GREEN, flexShrink: 0 }} />
            <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>
               📞 {t("incomingCall")} <span style={{ color: GREEN }}>@{incoming.from}</span>
               {incoming.video ? ` · ${t("videoCallType")}` : ` · ${t("audioCallType")}`}
            </span>
            <button onClick={() => call.answerCall()}
              style={{ background: GREEN, color: "#000", border: "none", borderRadius: 9,
                 padding: "7px 20px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>✅ {t("answer")}</button>
            <button onClick={() => call.rejectCall()}
              style={{ background: "#1a0505", color: "#f55", border: "1px solid #500",
                 borderRadius: 9, padding: "7px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>❌ {t("reject")}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div style={{ background: "hsl(var(--card))", borderBottom: `1px solid ${GOLD_A(0.094)}`, padding: "22px 24px 18px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h1 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>
             <span style={{ color: GOLD }}>◈</span> {t("friends")}
          </h1>
          <p style={{ margin: 0, color: "#ffffff30", fontSize: 12 }}>@{user.username}</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "22px 20px" }}>

        {pageLoading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
             <Loader2 size={34} role="status" aria-label={t("loadingFriends")} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
             <p style={{ color: "hsl(var(--muted-foreground))", marginTop: 10, fontSize: 13 }}>{t("loading")}</p>
          </div>
        ) : (
          <>
            {/* Stars Hall */}
            {stars.length > 0 && (
              <>
                <SectionTitle label={`⭐ ${t("starsHall", { remaining: friendsNumber(lang, starQuota.remaining), limit: friendsNumber(lang, starQuota.limit) })}`} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 10, marginBottom: 28 }}>
                  {stars.map(s => (
                    <motion.div key={s.username} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                      style={{ display: "flex", alignItems: "center", gap: 11,
                        background: "hsl(var(--card))",
                        border: `1px solid ${GOLD_A(s.invited ? 0.314 : 0.133)}`,
                        borderRadius: 14, padding: "11px 13px" }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                        background: "hsl(var(--muted))", border: `2px solid ${GOLD_A(0.439)}`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        {DOMAIN_ICONS[s.domain] ?? "⭐"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: GOLD, whiteSpace: "nowrap",
                          overflow: "hidden", textOverflow: "ellipsis" }}>★ {s.fullName}</div>
                        <div style={{ fontSize: 11, color: "#887744" }}>{s.nationality}</div>
                      </div>
                      <ActBtn
                        icon={invitingStar === s.username
                          ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} />
                          : <MessageSquare size={13} />}
                        label={t(s.invited ? "message" : "host")}
                        ariaLabel={t(s.invited ? "messageStar" : "hostStar", { name: s.fullName })}
                        color={s.invited ? GREEN : "#000"}
                        bg={s.invited ? "#071a07" : GOLD}
                        border={s.invited ? `1px solid ${GREEN}50` : "1px solid hsl(var(--primary))"}
                        onClick={() => void inviteStar(s)}
                        disabled={invitingStar !== null || (!s.invited && starQuota.remaining <= 0)} />
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {/* Friends */}
            <SectionTitle label={`👥 ${t("myFriends", { count: friendsNumber(lang, friends.length) })}`} />

            {friends.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0 32px",
                background: "hsl(var(--card))", borderRadius: 14, border: "1px dashed #ffffff12",
                color: "hsl(var(--muted-foreground))", fontSize: 13, marginBottom: 28 }}>
                <Users size={32} style={{ opacity: 0.1, marginBottom: 8 }} />
                <p style={{ margin: 0 }}>{t("noFriends")}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 28 }}>
                {friends.map(f => (
                  <motion.div key={f.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ display: "flex", alignItems: "center", gap: 13,
                      background: "hsl(var(--card))", border: `1px solid ${GOLD_A(0.094)}`,
                      borderRadius: 14, padding: "12px 14px" }}>
                    <Avatar name={f.username} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>@{f.username}</div>
                      <StatusBadge lastSeenAt={f.lastSeenAt} lang={lang} />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <ActBtn icon={<MessageSquare size={14} />} label={t("message")}
                        ariaLabel={t("messageUser", { username: f.username })}
                        color={GOLD} bg={GOLD_A(0.071)} border={`1px solid ${GOLD_A(0.188)}`}
                        onClick={() => void openDM(f)} disabled={dmLoadingId === f.id} />
                      <ActBtn icon={<Phone size={14} />} label={t("voice")}
                        ariaLabel={t("voiceCallUser", { username: f.username })}
                        color={GREEN} bg="#071a07" border={`1px solid ${GREEN}50`}
                        onClick={() => call.startCall(f.username, false)} />
                      <ActBtn icon={<Video size={14} />} label={t("video")}
                        ariaLabel={t("videoCallUser", { username: f.username })}
                        color="#09f" bg="#07101a" border="1px solid #09f5"
                        onClick={() => call.startCall(f.username, true)} />
                      <ActBtn icon={removingId === f.id ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <UserCheck size={13} />}
                        ariaLabel={t("removeUser", { username: f.username })}
                        color="#f44" bg="#130303" border="1px solid #400"
                        onClick={() => void removeFriend(f)} disabled={removingId === f.id} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* User discovery */}
            <SectionTitle label={`🌐 ${t("allUsers", { count: friendsNumber(lang, discoverList.length) })}`} />

            {discoverList.length === 0 && !pageLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
                <UserCheck size={32} style={{ opacity: 0.12, marginBottom: 8 }} />
                <p style={{ margin: 0 }}>{t("allAdded")}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {discoverList.map(c => (
                  <motion.div key={c.id} layout initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 13,
                      background: "hsl(var(--card))", border: "1px solid #ffffff0c",
                      borderRadius: 14, padding: "12px 14px" }}>
                    {/* Photo ronde */}
                    <Avatar name={c.username} />
                    {/* Nom + statut */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>@{c.username}</div>
                      <StatusBadge lastSeenAt={c.lastSeenAt} lang={lang} />
                    </div>
                    {/* Call and add actions */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <ActBtn icon={<Phone size={14} />}
                        ariaLabel={t("voiceCallUser", { username: c.username })}
                        color={GREEN} bg="#071a07" border={`1px solid ${GREEN}40`}
                        onClick={() => call.startCall(c.username, false)} />
                      <ActBtn icon={<Video size={14} />}
                        ariaLabel={t("videoCallUser", { username: c.username })}
                        color="#09f" bg="#07101a" border="1px solid #09f4"
                        onClick={() => call.startCall(c.username, true)} />
                      <ActBtn
                        icon={addingId === c.id
                          ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} />
                          : <UserPlus size={13} />}
                        label={addingId === c.id ? "" : t("add")}
                        ariaLabel={t("addUser", { username: c.username })}
                        color={GOLD} bg={GOLD_A(0.082)} border={`1px solid ${GOLD_A(0.251)}`}
                        onClick={() => void addFriend(c)} disabled={addingId === c.id} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
