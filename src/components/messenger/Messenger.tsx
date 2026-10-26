import { useBackLayer } from "@/lib/back-navigation";
/**
 * Messenger — AMIS unified messenger (single source of truth)
 * Variants:
 *  - "full"     → /messages page (bottom tabs + full-page chat)
 *  - "embedded" → Social Hub messages tab
 *  - "widget"   → CommHub floating panel
 * Structure:
 *  - 4 fixed destinations: Chats | Calls | Communities | Settings
 *    (tap a destination, or make one deliberate horizontal swipe, to move to the
 *     adjacent destination). Solidarity Relay lives INSIDE Communities.
 *  - Chat = full page: header (avatar+name+call) / messages with date separators /
 *    RTL-friendly composer with + inside the input shell revealing camera/gallery/files/mic/emoji
 *  - No GIPHY. Keyboard-stable (dvh + interactive-widget=resizes-content).
 */
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { AttachmentUploadError, directAttachmentUpload } from "./directAttachmentUpload";
import { MessageInputBoundary } from "./MessageInputBoundary";
import { trackEvent } from "@/lib/analytics";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageSquare, Users, Phone, X, Mic, History, PhoneMissed, Square,
  PhoneCall, Video, Settings, Trash2, Copy, MoreVertical, BellOff, Search, Lock,
  Camera, Image as ImageIcon, Paperclip, Smile, Send, Plus, ArrowLeft, ArrowRight, Wifi, LoaderCircle, BellRing,
  ChevronRight, HandHeart, Ear, PartyPopper, CornerUpLeft, ClipboardPaste, ShieldOff, ContactRound,
  MapPin, Link2, Share2,
} from "lucide-react";
import SolidarityRelay from "./SolidarityRelay";
import { MessengerAssistant } from "./MessengerAssistant";
import { MessengerCitizenDrawer } from "../citizen/MessengerCitizenDrawer";
import type { CitizenProfile } from "../../hooks/use-citizen";
import { attachmentSizeError, attachmentUploadQuery } from "./attachment-policy";
import type { GroupRoom } from "../social/social-types";
import Avatar from "../social/Avatar";
import { Switch } from "@workspace/gdna-ds/components/ui/switch";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { GOLD, GOLD_A, timeAgo, api, SOCIAL_T } from "../social/social-i18n";
import { useCallContext } from "../../contexts/CallContext";
import { useGroupCallContext } from "../../contexts/GroupCallContext";
import { useAuth, type AuthUser } from "../../contexts/AuthContext";
import { useLang } from "../../contexts/LangContext";
import { useConnectivity } from "@/contexts/ConnectivityContext";
import { getMessengerCopy, getMessengerIntlLocale } from "@/i18n/messenger-complete-copy";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { NetworkDisplay } from "./NetworkDisplay";
import { MissedCallsInbox } from "./MissedCallsInbox";
import type {
  MissedCall,
  FirebaseStatus,
  CallNotificationPermission,
} from "./call-types";
import type { DmRoom, DmMessage, CallRecord } from "../social/social-types";
import {
  decryptAttachmentBlob,
  decryptMessagePayload,
  encryptAttachmentBlob,
  encryptMessagePayload,
  ensureDeviceIdentity,
  isE2EMessage,
  type E2ERecipientKey,
  type SecureAttachmentMetadata,
  type SecureMessagePayload,
} from "@/lib/amis-e2ee";
import {
  isTerminalSecureDeviceError,
  registerSecureDevice,
  SECURE_DEVICE_CAPACITY_MESSAGE,
  SECURE_DEVICE_IDENTITY_CONFLICT_CODE,
  type SecureDeviceRegistrationError,
} from "@/lib/secure-device-registration";

const BG      = "#0a0a0a";   // app background
const BG_BAR  = "#111111";   // header / tab bars
const BG_CHAT = "#050505";   // chat wallpaper
const BUBBLE_OTHER = "#1e1e1e";

// Server rate limit: 15 uploads / 10 minutes — mirror it client-side for a friendly message.
const UPLOAD_BATCH_LIMIT = 15;

// A file staged in the pre-send preview strip.
interface PendingFile {
  id: string;
  roomId: number;
  file: File;
  previewUrl: string | null;
  status: "staged" | "uploading" | "error";
  progress: number; // 0–100 (upload phase only)
  autoSend?: boolean;
  error?: string;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
      style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: GOLD, color: "#000", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", whiteSpace: "nowrap", pointerEvents: "none" }}>
      {msg}
    </motion.div>
  );
}

// ── Date separators ───────────────────────────────────────────────────────────
function dayKey(iso: string) { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function localeFor(lang: string) {
  return lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
}
function dayLabel(iso: string, lang: string, st: Record<string, string>) {
  const d = new Date(iso), now = new Date();
  const today = dayKey(now.toISOString()) === dayKey(iso);
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const yesterday = dayKey(y.toISOString()) === dayKey(iso);
  if (today) return st.today;
  if (yesterday) return st.yesterday;
  return d.toLocaleDateString(localeFor(lang), { day: "numeric", month: "long", year: "numeric" });
}
function clockTime(iso: string, lang: string) {
  return new Date(iso).toLocaleTimeString(localeFor(lang), { hour: "2-digit", minute: "2-digit" });
}

function WebPushRow({
  st,
  status,
  permission,
  enabled,
  reason,
  isOnline,
  onEnable,
}: {
  st: Record<string, string>;
  status: FirebaseStatus;
  permission: CallNotificationPermission;
  enabled: boolean;
  reason: string | null;
  isOnline: boolean;
  onEnable?: () => void | Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const canRetry = permission === "granted" && !enabled && status === "error";
  const message = permission === "granted" && enabled && status === "ready"
    ? (st.push_enabled ?? "Background notifications are enabled for messages and calls.")
    : permission === "denied"
      ? (st.push_denied ?? "Notifications are blocked in your browser settings.")
      : status === "loading"
        ? (st.push_loading ?? "Checking background notification setup…")
        : canRetry
          ? (reason ?? "Browser permission is granted, but background notification registration failed. Retry to restore it.")
          : enabled && permission !== "unsupported"
            ? (st.push_hint ?? "Enable browser notifications to receive messages and calls when this tab is closed.")
            : (reason ?? st.push_unavailable ?? "Background notifications are optional and are not configured. In-app calls still work.");

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3" data-testid="messenger-push-settings">
      <div className="flex items-start gap-2">
        <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13px] font-semibold text-card-foreground">
            {st.push_title ?? "Background notifications"}
          </p>
          <p className="mt-1 mb-0 text-[11px] text-muted-foreground">{message}</p>
        </div>
      </div>
      {((permission === "default" && enabled) || canRetry) && onEnable && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 gap-1.5"
          disabled={busy || !isOnline}
          data-testid={canRetry ? "button-retry-messenger-notifications" : "button-enable-messenger-notifications"}
          onClick={async () => {
            setBusy(true);
            try { await onEnable(); } finally { setBusy(false); }
          }}
        >
          <BellRing className="h-3.5 w-3.5" />
          {canRetry ? (st.retry ?? "Retry notification registration") : (st.enable_push ?? "Enable notifications")}
        </Button>
      )}
    </div>
  );
}

interface SecureDeviceRow {
  device_id: string;
  fingerprint: string;
  updated_at: string;
}

function SecureDeviceManager({
  userId,
  capacityBlocked,
  retryRegistration,
  showToast,
  isOnline,
}: {
  userId?: number;
  capacityBlocked: boolean;
  retryRegistration: () => Promise<void>;
  showToast: (message: string) => void;
  isOnline: boolean;
}) {
  const [devices, setDevices] = useState<SecureDeviceRow[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState("");

  const load = useCallback(async () => {
    if (!userId || !isOnline) return;
    setLoading(true);
    try {
      const [identity, response] = await Promise.all([
        ensureDeviceIdentity(userId),
        fetch(api("/api/messages/e2e/devices"), { credentials: "include", cache: "no-store" }),
      ]);
      if (!response.ok) throw new Error("تعذر تحميل الأجهزة الآمنة · Impossible de charger les appareils sécurisés.");
      const data = await response.json() as { devices?: SecureDeviceRow[] };
      setCurrentDeviceId(identity.deviceId);
      setDevices(data.devices ?? []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Secure devices unavailable");
    } finally {
      setLoading(false);
    }
  }, [isOnline, showToast, userId]);

  useEffect(() => { void load(); }, [load]);

  const revoke = async (device: SecureDeviceRow) => {
    if (device.device_id === currentDeviceId || !isOnline) return;
    const warning = "إلغاء هذا الجهاز قد يمنعه من قراءة الرسائل القديمة المشفرة له. لن تُحذف مفاتيح هذا الجهاز تلقائياً. · Révoquer cet appareil peut lui faire perdre l’accès aux anciens messages chiffrés. Ses clés privées ne seront jamais effacées automatiquement.";
    if (!window.confirm(warning)) return;
    setRevoking(device.device_id);
    try {
      const response = await fetch(api(`/api/messages/e2e/devices/${encodeURIComponent(device.device_id)}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({} as { error?: string }));
        throw new Error(data.error ?? "Device revocation failed");
      }
      setDevices(current => current.filter(item => item.device_id !== device.device_id));
      showToast("تم إلغاء الجهاز. اضغط إعادة المحاولة لتسجيل هذا الجهاز. · Appareil révoqué. Appuyez sur Réessayer.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Device revocation failed");
    } finally {
      setRevoking("");
    }
  };

  return (
    <section className="mt-4 rounded-lg border border-border bg-muted/20 p-3" data-testid="secure-device-manager">
      <div className="flex items-start gap-2">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13px] font-semibold text-card-foreground">الأجهزة الآمنة · Appareils sécurisés</p>
          <p className="mt-1 mb-0 text-[11px] text-muted-foreground">
            الأجهزة النشطة مرتبطة بمفاتيحها الخاصة. لا تُلغَ الأجهزة أو تُحذف المفاتيح تلقائياً. · Les appareils actifs conservent leurs clés privées. Aucune clé n’est supprimée automatiquement.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={loading || !isOnline} onClick={() => void load()}>
          {loading ? "…" : "↻"}
        </Button>
      </div>
      {capacityBlocked && (
        <div role="alert" className="mt-3 rounded-md border border-destructive-border bg-destructive/10 p-2 text-xs text-destructive" data-testid="secure-device-capacity">
          {SECURE_DEVICE_CAPACITY_MESSAGE}
        </div>
      )}
      <div className="mt-3 space-y-2">
        {devices.map(device => {
          const current = device.device_id === currentDeviceId;
          return (
            <div key={device.device_id} className="flex items-center gap-2 rounded-md border border-border/60 p-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate font-medium text-foreground">
                  {current ? "هذا الجهاز · Cet appareil" : `…${device.device_id.slice(-8)}`}
                </p>
                <p className="m-0 truncate text-[10px] text-muted-foreground">{device.fingerprint}</p>
              </div>
              {!current && (
                <Button type="button" size="sm" variant="destructive" disabled={revoking === device.device_id || !isOnline} onClick={() => void revoke(device)}>
                  {revoking === device.device_id ? "…" : "إلغاء · Révoquer"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {capacityBlocked && (
        <Button type="button" className="mt-3 w-full" disabled={!isOnline} data-testid="retry-secure-device-registration" onClick={() => void retryRegistration()}>
          إعادة المحاولة بعد الإلغاء · Réessayer après révocation
        </Button>
      )}
    </section>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────
interface MsgSettings { notifications: boolean; readReceipts: boolean }

function ToggleRow({ label, value, onChange, disabled = false }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between w-full py-3 px-1 border-b border-border/40">
      <span className="text-foreground text-[13px] font-semibold">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function SettingsPanel({ st, activeRoom, onClose, onMuteChanged, onRoomDeleted, showToast, onBlockChanged, currentUserId, inline = false, isOnline, onOffline, notificationPermission, firebaseStatus, pushEnabled, pushReason, enableCallNotifications, secureDeviceCapacityBlocked = false, retrySecureDeviceRegistration = async () => {} }: {
  st: Record<string, string>;
  activeRoom: DmRoom | null;
  onClose: () => void;
  onMuteChanged: (roomId: number, muted: boolean) => void;
  onRoomDeleted: (roomId: number) => void;
  showToast: (m: string) => void;
  onBlockChanged?: (roomId: number, blocked: boolean) => void;
  /** Fix #2: authenticated user's id so we exclude self when finding peer */
  currentUserId?: number;
  /** When true, render as an in-flow destination panel (Settings tab) rather than a slide-over overlay. */
  inline?: boolean;
  isOnline: boolean;
  onOffline: () => void;
  notificationPermission: CallNotificationPermission;
  firebaseStatus: FirebaseStatus;
  pushEnabled: boolean;
  pushReason: string | null;
  enableCallNotifications?: () => void | Promise<unknown>;
  secureDeviceCapacityBlocked?: boolean;
  retrySecureDeviceRegistration?: () => Promise<void>;
}) {
  const [settings, setSettings] = useState<MsgSettings | null>(null);
  const [muted, setMuted] = useState(activeRoom?.muted ?? false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(activeRoom?.blockedByMe ?? false);

  useEffect(() => { setMuted(activeRoom?.muted ?? false); }, [activeRoom?.muted]);
  useEffect(() => {
    setBlockedByMe(activeRoom?.blockedByMe ?? false);
  }, [activeRoom?.id, activeRoom?.blockedByMe]);

  useEffect(() => {
    if (!isOnline) {
      setSettings(current => current ?? { notifications: true, readReceipts: true });
      return;
    }
    const controller = new AbortController();
    fetch(api("/api/messages/settings"), { credentials: "include", signal: controller.signal })
      .then(r => r.json())
      .then(j => setSettings({ notifications: j.notifications ?? true, readReceipts: j.readReceipts ?? true }))
      .catch(error => {
        if (!(error instanceof Error && error.name === "AbortError")) {
          setSettings(current => current ?? { notifications: true, readReceipts: true });
        }
      });
    return () => controller.abort();
  }, [isOnline]);

  async function save(patch: Partial<MsgSettings>) {
    if (!isOnline) { onOffline(); return; }
    setSettings(s => s ? { ...s, ...patch } : s);
    const r = await fetch(api("/api/messages/settings"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch), credentials: "include",
    }).catch(() => null);
    if (r?.ok) showToast(st.settings_saved ?? "Saved");
  }

  async function toggleMute() {
    if (!isOnline) { onOffline(); return; }
    if (!activeRoom) return;
    const next = !muted;
    setMuted(next);
    const r = await fetch(api(`/api/messages/rooms/${activeRoom.id}/mute`), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ muted: next }), credentials: "include",
    }).catch(() => null);
    if (r?.ok) { onMuteChanged(activeRoom.id, next); showToast(st.settings_saved ?? "Saved"); }
  }

  async function deleteConversation() {
    if (!isOnline) { onOffline(); return; }
    if (!activeRoom || deletingConversation) return;
    const confirmMessage = st.delete_conversation_confirm
      ?? "Delete this conversation from your messages? The other member keeps their copy.";
    if (!window.confirm(confirmMessage)) return;

    setDeletingConversation(true);
    const r = await fetch(api(`/api/messages/rooms/${activeRoom.id}`), {
      method: "DELETE", credentials: "include",
    }).catch(() => null);
    if (r?.ok) {
      onRoomDeleted(activeRoom.id);
      showToast(st.conversation_deleted ?? "Conversation deleted");
    } else {
      const j = await r?.json().catch(() => ({} as { error?: string }));
      showToast(j?.error ?? "Error");
    }
    setDeletingConversation(false);
  }

  // Fix #2: identify peer by excluding the authenticated user's id, not by position.
  const peerId = activeRoom?.type === "direct"
    ? activeRoom.members.find(m => m.userId !== undefined && m.userId !== currentUserId)?.userId
    : undefined;
  const isBlocked = blockedByMe;

  async function toggleBlock() {
    if (!isOnline) { onOffline(); return; }
    if (!peerId || blockBusy) return;
    const blocking = !isBlocked;
    if (blocking && !window.confirm(st.block_confirm ?? "Block this citizen?")) return;
    setBlockBusy(true);
    const r = await fetch(api(`/api/solidarity/blocks/${peerId}`), {
      method: blocking ? "POST" : "DELETE", credentials: "include",
    }).catch(() => null);
    if (r?.ok) {
      setBlockedByMe(blocking);
      showToast(blocking ? (st.block_citizen ?? "Citizen blocked") : (st.unblock_citizen ?? "Citizen unblocked"));
      // Keep the drawer responsive, then let the parent refresh authoritative room state.
      if (activeRoom) onBlockChanged?.(activeRoom.id, blocking);
    }
    setBlockBusy(false);
  }

  async function reportConversation() {
    if (!activeRoom || !isOnline) { onOffline(); return; }
    const reason = window.prompt("Report conversation: describe the concern (5–1000 characters). Only this reason is shared with moderators, not your encrypted messages.");
    if (reason === null) return;
    if (reason.trim().length < 5 || reason.length > 1000) {
      showToast("Provide a reason between 5 and 1000 characters"); return;
    }
    try {
      const response = await fetch(api(`/api/messages/rooms/${activeRoom.id}/report`), {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Report failed");
      showToast("Report submitted to moderators");
    } catch (error) { showToast(error instanceof Error ? error.message : "Report failed"); }
  }

  const rootStyle: React.CSSProperties = inline
    ? { position: "relative", flex: 1, minHeight: 0, background: BG, display: "flex", flexDirection: "column", overflow: "hidden" }
    : { position: "absolute", inset: 0, background: BG, zIndex: 40, display: "flex", flexDirection: "column", overflow: "hidden" };

  return (
    <motion.div
      initial={inline ? false : { opacity: 0, x: 20 }}
      animate={inline ? undefined : { opacity: 1, x: 0 }}
      exit={inline ? undefined : { opacity: 0, x: 20 }}
      style={rootStyle}>
      <div style={{ padding: "14px 16px", background: BG_BAR, borderBottom: `1px solid ${GOLD_A(0.071)}`, display: "flex", alignItems: "center", gap: 10 }}>
        <Settings size={17} style={{ color: GOLD }} />
        <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: 15, flex: 1 }}>{activeRoom ? (st.msg_settings ?? "Messenger settings") : (st.settings_general ?? st.msg_settings ?? "Settings")}</p>
        {!inline && (
          <button onClick={onClose} aria-label={st.close ?? st.back} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 6 }}><X size={18} /></button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
        {!settings ? <div style={{ textAlign: "center", color: "#444", padding: 32 }}>…</div> : (
          <>
            <ToggleRow label={st.notif_pref ?? "Notifications"} value={settings.notifications}
              onChange={v => save({ notifications: v })} disabled={!isOnline} />
            <p className="mt-0.5 mb-1.5 mx-1 text-[10.5px] text-muted-foreground">{st.notif_hint ?? ""}</p>
            <WebPushRow
              st={st}
              status={firebaseStatus}
              permission={notificationPermission}
              enabled={pushEnabled}
              reason={pushReason}
              isOnline={isOnline}
              onEnable={enableCallNotifications}
            />
            <ToggleRow label={st.read_receipts ?? "Read receipts"} value={settings.readReceipts}
              onChange={v => save({ readReceipts: v })} disabled={!isOnline} />
            <p className="mt-0.5 mb-1.5 mx-1 text-[10.5px] text-muted-foreground">{st.receipts_hint ?? ""}</p>
            {activeRoom && (
              <ToggleRow label={`${st.mute_conv} · ${activeRoom.type === "group" ? (activeRoom.name ?? st.group) : ""}`.trim()}
                value={muted} onChange={toggleMute} disabled={!isOnline} />
            )}
            {activeRoom && (
              <div className="mt-4 border-t border-border/40 pt-4">
                <Button type="button" variant="destructive" className="w-full justify-start gap-2"
                  disabled={deletingConversation || !isOnline} onClick={deleteConversation}>
                  <Trash2 size={15} />
                  {deletingConversation
                    ? (st.deleting_conversation ?? "Deleting conversation…")
                    : (st.delete_conversation ?? "Delete conversation")}
                </Button>
                <p className="mt-2 px-1 text-[10.5px] text-muted-foreground">
                  {st.delete_conversation_hint ?? "This removes the conversation from your messages only."}
                </p>
              </div>
            )}
            <div className="mt-4 flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <Lock size={12} /> {st.end_to_end_encrypted ?? "End-to-end encrypted on this device"}
            </div>
            {!activeRoom && (
              <SecureDeviceManager
                userId={currentUserId}
                capacityBlocked={secureDeviceCapacityBlocked}
                retryRegistration={retrySecureDeviceRegistration}
                showToast={showToast}
                isOnline={isOnline}
              />
            )}
            {activeRoom && <Button className="mt-2" variant="outline" size="sm" disabled={!isOnline}
              onClick={() => void reportConversation()}>Report conversation</Button>}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Contacts panel (server-side search + pagination) ─────────────────────────
const SOLIDARITY_STATUS_COLORS: Record<string, string> = {
  available: "#22c55e",
  listening: "#3b82f6",
  seeking:   GOLD,
  focused:   "#a78bfa",
  offline:   "#6b7280",
};
function solidarityStatusLabel(status: string, st: Record<string, string>) {
  return st[`relay_status_${status}`] ?? status;
}
interface Contact {
  id: number;
  username: string;
  lastSeenAt?: string | null;
  solidarityStatus?: string | null;
  solidarityStatusVisible?: boolean;
}

const CONTACTS_PAGE = 30;

function ContactsPanel({ st, user, title, onClose, onDm, onCall, callMode, isOnline, onOffline }: {
  st: Record<string, string>;
  user: { id: number; username: string };
  title: string;
  onClose: () => void;
  onDm: (username: string) => void;
  onCall: (username: string, video: boolean) => void;
  callMode?: boolean;
  isOnline: boolean;
  onOffline: () => void;
}) {
  const call = useCallContext();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchContacts = useCallback(async (search: string, offset: number, replace: boolean) => {
    // Abort any previous in-flight search
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (replace) setLoading(true);
    else setLoadingMore(true);
    setFailed(false);

    try {
      const params = new URLSearchParams({
        limit: String(CONTACTS_PAGE),
        offset: String(offset),
      });
      if (search.trim()) params.set("search", search.trim());

      const r = await fetch(api(`/api/citizens?${params}`), {
        credentials: "include",
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error("failed");
      const j = await r.json();
      const rawList: Contact[] = j.citizens ?? [];
      const list = rawList.filter((c: Contact) => c.id !== user.id);
      setContacts(prev => replace ? list : [...prev, ...list]);
      setHasMore(rawList.length === CONTACTS_PAGE);
      setPage(offset / CONTACTS_PAGE);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setFailed(true);
    } finally {
      if (abortRef.current === ctrl) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [user.id]);

  // Abort the current page/search request when the contacts panel unmounts.
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchContacts(q, 0, true), 300);
    return () => clearTimeout(t);
  }, [q, fetchContacts]);

  function loadMore() {
    const nextOffset = (page + 1) * CONTACTS_PAGE;
    fetchContacts(q, nextOffset, false);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
      style={{ position: "absolute", inset: 0, background: BG, zIndex: 40, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", background: BG_BAR, borderBottom: `1px solid ${GOLD_A(0.071)}`, display: "flex", alignItems: "center", gap: 10 }}>
        <Users size={17} style={{ color: GOLD }} />
        <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: 15, flex: 1 }}>{title}</p>
        <button onClick={onClose} aria-label={st.close ?? st.back} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 6 }}><X size={18} /></button>
      </div>
      <div style={{ padding: "10px 14px" }}>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", top: 12, insetInlineStart: 12, color: "#555" }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={st.search_contacts ?? "Search…"} dir="auto"
            data-testid="input-search-contacts"
            style={{ width: "100%", boxSizing: "border-box", background: "#161616", border: `1px solid ${GOLD_A(0.082)}`, borderRadius: 12, padding: "10px 12px", paddingInlineStart: 36, color: "#fff", fontSize: 15, outline: "none" }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 12px" }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 8px" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />
            ))}
          </div>
        )}
        {!loading && failed && (
          <div style={{ textAlign: "center", padding: 24 }}>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 12px" }}>{st.no_contacts ?? "Could not load citizens"}</p>
            <button onClick={() => fetchContacts(q, 0, true)}
              style={{ background: GOLD_A(0.125), border: `1px solid ${GOLD_A(0.188)}`, color: GOLD, padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              {st.retry}
            </button>
          </div>
        )}
        {!loading && !failed && contacts.length === 0 && (
          <p style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 24 }}>{st.no_contacts ?? "No citizens found"}</p>
        )}
        {contacts.map(c => {
          const online = call.onlineUsers.includes(c.username);
          const solStatus = c.solidarityStatusVisible !== false ? c.solidarityStatus : null;
          const statusColor = solStatus ? (SOLIDARITY_STATUS_COLORS[solStatus] ?? "#6b7280") : (online ? "#22c55e" : "#ffffff35");
          return (
            <div
              key={c.id}
              role={!callMode ? "button" : undefined}
              tabIndex={!callMode ? 0 : undefined}
              data-testid={`contact-option-${c.id}`}
              onClick={!callMode ? () => { if (!isOnline) return onOffline(); onClose(); onDm(c.username); } : undefined}
              onKeyDown={!callMode ? event => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                if (!isOnline) return onOffline();
                onClose();
                onDm(c.username);
              } : undefined}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderBottom: "1px solid #ffffff08", cursor: !callMode && isOnline ? "pointer" : "default" }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Avatar name={c.username} size={44} />
                {(online || solStatus) && (
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 11, height: 11, background: statusColor, borderRadius: "50%", border: "2px solid #000" }} />
                )}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#fff", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.username}</p>
                <p style={{ margin: 0, fontSize: 12, color: statusColor }}>
                  {solStatus ? solidarityStatusLabel(solStatus, st) : (online ? st.online : st.offline)}
                </p>
              </div>
              {callMode ? (
                <>
                  <button onClick={() => { if (!isOnline) return onOffline(); onClose(); onCall(c.username, false); }} disabled={!isOnline} title={st.voice_call ?? "Call"}
                    style={{ width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", background: "#22c55e20", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Phone size={17} />
                  </button>
                  <button onClick={() => { if (!isOnline) return onOffline(); onClose(); onCall(c.username, true); }} disabled={!isOnline} title={st.video_call ?? "Video"}
                    style={{ width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", background: "#3b82f620", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Video size={17} />
                  </button>
                </>
              ) : (
                <button onClick={event => { event.stopPropagation(); if (!isOnline) return onOffline(); onClose(); onDm(c.username); }} disabled={!isOnline} title={st.dm ?? "DM"}
                  style={{ width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", background: GOLD_A(0.125), color: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MessageSquare size={17} />
                </button>
              )}
            </div>
          );
        })}
        {!loading && hasMore && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <button onClick={loadMore} disabled={loadingMore}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: GOLD_A(0.082), border: `1px solid ${GOLD_A(0.145)}`, color: GOLD, padding: "8px 20px", borderRadius: 8, cursor: loadingMore ? "default" : "pointer", fontSize: 13, fontWeight: 700, opacity: loadingMore ? 0.7 : 1 }}>
              {loadingMore ? <LoaderCircle size={14} className="animate-spin" /> : <ChevronRight size={14} />}
              {loadingMore ? (st.loading ?? "Loading…") : (st.load_more ?? "Load more")}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Actus tab is now SolidarityRelay — imported above

// ── Communautés (upgraded assembly nodes) ────────────────────────────────────
function CommunautesTab({ st, myRoomIds, onJoined, onOpen, onCreate, onViewRelay, isOnline, onOffline }: {
  st: Record<string, string>;
  myRoomIds: Set<number>;
  onJoined: (roomId: number) => void;
  onOpen: (roomId: number) => void;
  onCreate: () => void;
  /** Open the Solidarity Relay inside Communities. roomId null → empire-wide. */
  onViewRelay: (roomId: number | null, roomName: string | null) => void;
  isOnline: boolean;
  onOffline: () => void;
}) {
  const [groups, setGroups] = useState<GroupRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joining, setJoining] = useState<number | null>(null);

  const loadCommunities = useCallback(async () => {
    if (!isOnline) {
      setLoading(false);
      setLoadError(st.offline ?? "Offline");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetch(api("/api/messages/communities"), { credentials: "include" });
      if (r.status === 401) { setLoadError(st.login_required ?? "Login required"); return; }
      if (!r.ok) { setLoadError(`${st.load_error ?? "Could not load communities"} (${r.status})`); return; }
      const j = await r.json();
      setGroups(j.communities ?? []);
    } catch {
      setLoadError(st.load_error ?? "Could not load communities — check your connection");
    } finally {
      setLoading(false);
    }
  }, [isOnline, st]);

  useEffect(() => { loadCommunities(); }, [loadCommunities]);

  async function join(roomId: number) {
    if (!isOnline) { onOffline(); return; }
    setJoining(roomId);
    try {
      const r = await fetch(api(`/api/messages/rooms/${roomId}/join`), { method: "POST", credentials: "include" });
      if (r.ok || r.status === 409) onJoined(roomId);
    } finally { setJoining(null); }
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 16px" }}>
      <button onClick={() => isOnline ? onCreate() : onOffline()} disabled={!isOnline}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: GOLD_A(0.063), border: `1px solid ${GOLD_A(0.145)}`, borderRadius: 12, cursor: "pointer", marginBottom: 10, minHeight: 44 }}>
        <Plus size={18} style={{ color: GOLD }} />
        <span style={{ color: GOLD, fontWeight: 800, fontSize: 14 }}>{st.new_group ?? "New group"}</span>
      </button>
      {/* Empire-wide Solidarity Relay entry (opens inside Communities) */}
      <button onClick={() => onViewRelay(null, null)}
        data-testid="button-empire-relay"
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: GOLD_A(0.031), border: `1px solid ${GOLD_A(0.125)}`, borderRadius: 12, cursor: "pointer", marginBottom: 10, minHeight: 44 }}>
        <HandHeart size={18} style={{ color: GOLD }} />
        <span style={{ color: GOLD, fontWeight: 800, fontSize: 14 }}>{st.relay_title ?? "Solidarity Relay"}</span>
        <ChevronRight size={16} style={{ color: GOLD_A(0.502), marginInlineStart: "auto" }} />
      </button>
      {loading && <p style={{ color: "#444", textAlign: "center", padding: 24 }}>…</p>}
      {!loading && loadError && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 16px", textAlign: "center" }}>
          <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{loadError}</p>
          <Button variant="outline" size="sm" onClick={loadCommunities}>{st.retry}</Button>
        </div>
      )}
      {!loading && !loadError && groups.length === 0 && (
        <p style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 24 }}>{st.no_messages}</p>
      )}
      {groups.map(g => {
        const isMember = myRoomIds.has(g.id);
        return (
          <div key={g.id}
            className="rounded-xl border border-border/40 bg-card/30 p-3 mb-2 flex items-start gap-3"
            data-testid={`community-card-${g.id}`}
          >
            {/* Identity node */}
            <div style={{ width: 48, height: 48, background: "#222", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, border: `1px solid ${GOLD_A(0.082)}` }}>
              {typeof g.icon === "string" && g.icon ? g.icon : <Users size={22} style={{ color: "#666" }} />}
            </div>
            <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name ?? st.assembly}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#ffffff40" }}>
                  <Users size={11} style={{ display: "inline", marginRight: 3 }} />
                  {g.memberCount ?? 0}
                </span>
                {typeof g.activeInitiativeCount === "number" && g.activeInitiativeCount > 0 && (
                  <span style={{ fontSize: 11, color: GOLD, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                    <HandHeart size={11} />
                    {g.activeInitiativeCount} {st.active}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {isMember ? (
                  <Button size="sm" variant="secondary" className="h-9 px-4 text-xs flex-1" onClick={() => onOpen(g.id)}>
                    {st.open ?? "Open"}
                  </Button>
                ) : (
                  <Button size="sm" className="h-9 px-4 text-xs flex-1" disabled={joining === g.id || !isOnline} onClick={() => join(g.id)}>
                    {joining === g.id ? "…" : (st.join_group ?? "Join")}
                  </Button>
                )}
                {/* Fix #3: solidarity relay for this assembly */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-xs gap-1"
                  style={{ color: GOLD, borderColor: GOLD_A(0.188) }}
                  onClick={() => onViewRelay(g.id, g.name ?? st.assembly)}
                  aria-label={st.solidarity_actions_for.replace("{name}", g.name ?? st.assembly)}
                  data-testid={`relay-btn-${g.id}`}
                >
                  <HandHeart size={12} />
                  {typeof g.activeInitiativeCount === "number" && g.activeInitiativeCount > 0
                    ? g.activeInitiativeCount
                    : ""}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Appels ────────────────────────────────────────────────────────────────────
function AppelsTab({ st, lang, user, onNewCall, onCallBack, connectionTest, onTestConnection, isOnline, onOffline, callActive, callExtras, tabActive }: {
  st: Record<string, string>;
  lang: string;
  user: { id: number; username: string };
  onNewCall: () => void;
  onCallBack: (call: MissedCall) => void;
  connectionTest: "idle" | "testing" | "ready" | "unstable" | "failed";
  onTestConnection: () => void;
  isOnline: boolean;
  onOffline: () => void;
  /** True while a call is active — disables competing call actions. */
  callActive: boolean;
  /** Missed-call inbox + honest notification status data from useCall. */
  callExtras: CallExtras;
  /** True when the Calls destination is the visible tab (drives mark-seen). */
  tabActive: boolean;
}) {
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Honest network status for the direct WebRTC call path ────────────────
  const network = useNetworkStatus();

  useEffect(() => {
    if (!isOnline) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(api("/api/social/v2/call-history"), { credentials: "include", signal: controller.signal })
      .then(r => r.json())
      .then(j => setRecords(j.records ?? []))
      .catch(error => {
        if (!(error instanceof Error && error.name === "AbortError")) {
          // Keep the last successfully loaded records visible.
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [isOnline]);

  const peer = (r: CallRecord) => r.callerId === user.id ? r.calleeUsername : r.callerUsername;
  const statusLabel = (s: string) =>
    s === "missed" ? (st.call_missed ?? "Missed") : s === "answered" ? (st.call_answered ?? "Answered") : (st.call_ended ?? "Ended");
  const connectionResult = connectionTest === "ready"
    ? { label: st.call_ready, className: "border-chart-3/40 bg-chart-3/10 text-chart-3" }
    : connectionTest === "unstable"
      ? { label: st.call_unstable, className: "border-primary/40 bg-primary/10 text-primary" }
      : connectionTest === "failed"
        ? { label: st.call_failed, className: "border-destructive/40 bg-destructive/10 text-destructive" }
        : null;

  function statusIcon(r: CallRecord) {
    if (r.status === "missed")   return <PhoneMissed size={14} style={{ color: "#ef4444" }} />;
    if (r.status === "answered") return <PhoneCall   size={14} style={{ color: "#22c55e" }} />;
    return <Phone size={14} style={{ color: "#888" }} />;
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 16px" }}>
      <div className="mb-3">
        <NetworkDisplay status={network} lang={lang} />
      </div>
      <MissedCallsInbox
        lang={lang}
        missedCalls={callExtras.missedCalls}
        missedCallCount={callExtras.missedCallCount}
        loading={callExtras.missedCallsLoading}
        error={callExtras.missedCallsError}
        onRetry={callExtras.onRetryMissedCalls}
        markMissedCallsSeen={callExtras.markMissedCallsSeen}
        firebaseStatus={callExtras.firebaseStatus}
        firebaseError={callExtras.firebaseError}
        pushEnabled={callExtras.pushEnabled}
        pushReason={callExtras.pushReason}
        notificationPermission={callExtras.notificationPermission}
        enableCallNotifications={callExtras.enableCallNotifications}
        soundBlocked={callExtras.soundBlocked}
        enableCallSound={callExtras.enableCallSound}
        active={tabActive}
        onCallBack={onCallBack}
        inCall={callActive}
      />
      <div className="mb-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-bold text-card-foreground">{st.call_connection}</p>
            <p className="m-0 text-xs text-muted-foreground">{st.call_connection_help}</p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => isOnline ? onTestConnection() : onOffline()} disabled={connectionTest === "testing" || !isOnline}>
            {connectionTest === "testing" && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {connectionTest === "testing" ? st.call_testing : st.call_test}
          </Button>
        </div>
        {connectionResult && (
          <div className={`mt-3 flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-semibold ${connectionResult.className}`}>
            <span className="h-2 w-2 shrink-0 rounded-full bg-current" aria-hidden="true" />
            <span>{connectionResult.label}</span>
          </div>
        )}
      </div>
      {!isOnline && (
        <p className="mb-2 text-center text-xs text-muted-foreground" data-testid="text-call-blocked-offline">
          {st.offline_action ?? "Reconnect to place a call."}
        </p>
      )}
      <button onClick={() => isOnline ? onNewCall() : onOffline()} disabled={!isOnline}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#22c55e12", border: "1px solid #22c55e30", borderRadius: 12, cursor: "pointer", marginBottom: 10 }}>
        <Phone size={18} style={{ color: "#22c55e" }} />
        <span style={{ color: "#22c55e", fontWeight: 800, fontSize: 14 }}>{st.voice_call ?? "New call"}</span>
      </button>
      {loading && <p style={{ color: "#444", textAlign: "center", padding: 24 }}>…</p>}
      {!loading && records.length === 0 && (
        <div style={{ textAlign: "center", color: "#444", padding: 48 }}>
          <History size={32} style={{ opacity: 0.2, display: "block", margin: "0 auto 10px" }} />
          <p style={{ margin: 0, fontSize: 13 }}>{st.no_calls ?? "No call history yet"}</p>
        </div>
      )}
      {records.map(r => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: "1px solid #ffffff08" }}>
          <Avatar name={peer(r)} size={44} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#fff", fontSize: 15 }}>{peer(r)}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              {statusIcon(r)}
              <span style={{ fontSize: 12, color: r.status === "missed" ? "#ef4444" : "#ffffff50" }}>{statusLabel(r.status)}</span>
              <span style={{ fontSize: 12, color: "#ffffff30" }}>·</span>
              <span style={{ fontSize: 12, color: "#ffffff40" }}>
                {r.callType === "video" ? (st.call_video ?? "Video") : (st.call_audio ?? "Audio")}
              </span>
              {r.durationSec > 0 && (
                <>
                  <span style={{ fontSize: 12, color: "#ffffff30" }}>·</span>
                  <span style={{ fontSize: 12, color: "#ffffff40" }}>{Math.floor(r.durationSec / 60)}:{String(r.durationSec % 60).padStart(2, "0")}</span>
                </>
              )}
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "#ffffff25" }}>{timeAgo(r.startedAt, st, getMessengerIntlLocale(lang))}</p>
        </div>
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function resolveUrl(url: string): string {
  return url.startsWith("/api/") ? api(url) : url;
}

function attachmentLabel(metadata: SecureAttachmentMetadata, st: Record<string, string>): string {
  if (metadata.kind === "audio") return `🎤 ${st.voice_note}`;
  if (metadata.kind === "video") return `🎥 ${st.call_video}`;
  if (metadata.kind === "image") return `🖼️ ${st.attach_image}`;
  return `📁 ${metadata.name}`;
}

async function decryptMessageForUser(message: DmMessage, userId: number, st: Record<string, string>): Promise<DmMessage> {
  let next = { ...message };
  if (message.content && isE2EMessage(message.content)) {
    try {
      const payload = await decryptMessagePayload(message.content, userId);
      if (payload?.kind === "text") {
        next = { ...next, content: payload.text, encrypted: true };
      } else if (payload?.kind === "attachment") {
        next = {
          ...next,
          content: attachmentLabel(payload.attachment, st),
          secureAttachment: payload.attachment,
          encrypted: true,
        };
      }
    } catch {
      next = {
        ...next,
        content: `🔐 ${st.secure_other_device}`,
        encrypted: true,
        decryptionFailed: true,
      };
    }
  }
  if (message.replyTo?.content && isE2EMessage(message.replyTo.content)) {
    try {
      const replyPayload = await decryptMessagePayload(message.replyTo.content, userId);
      next.replyTo = {
        ...message.replyTo,
        content: replyPayload?.kind === "text"
          ? replyPayload.text
          : replyPayload?.kind === "attachment"
            ? attachmentLabel(replyPayload.attachment, st)
            : `🔐 ${st.encrypted_message}`,
      };
    } catch {
      next.replyTo = { ...message.replyTo, content: `🔐 ${st.encrypted_message}` };
    }
  }
  return next;
}

function SecureAttachment({ url, metadata, mine }: {
  url: string;
  metadata: SecureAttachmentMetadata;
  mine: boolean;
}) {
  // Remount on every input change: never paint a previous file or its failure,
  // even during the render before an effect cleanup runs.
  return <SecureAttachmentContent key={JSON.stringify([url, metadata])} url={url} metadata={metadata} mine={mine} />;
}

function SecureAttachmentContent({ url, metadata, mine }: {
  url: string;
  metadata: SecureAttachmentMetadata;
  mine: boolean;
}) {
  const { lang } = useLang();
  const st = { ...(SOCIAL_T[lang] ?? SOCIAL_T.en), ...getMessengerCopy(lang) };
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    let createdUrl: string | null = null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    void (async () => {
      try {
        const response = await fetch(resolveUrl(url), { credentials: "include", signal: controller.signal });
        if (!response.ok) throw new Error("Attachment unavailable");
        const decrypted = await decryptAttachmentBlob(await response.blob(), metadata);
        if (disposed) return;
        createdUrl = URL.createObjectURL(decrypted);
        setObjectUrl(createdUrl);
      } catch {
        if (!disposed) setFailed(true);
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [url, metadata.key, metadata.iv, metadata.mime, metadata.name, metadata.size, metadata.kind]);

  if (failed) {
    return <p className="m-0 text-xs text-destructive">🔐 {st.decrypt_attachment_failed}</p>;
  }
  if (!objectUrl) {
    return <div className="flex min-h-9 items-center gap-2 text-xs opacity-70"><LoaderCircle size={14} className="animate-spin" />{st.decrypting}</div>;
  }
  if (metadata.kind === "audio") {
    return <audio controls preload="metadata" src={objectUrl} onError={() => setFailed(true)} style={{ width: "min(220px, 100%)", height: 38 }} />;
  }
  if (metadata.kind === "video") {
    return <video controls src={objectUrl} onError={() => setFailed(true)} style={{ maxWidth: 240, maxHeight: 240, borderRadius: 8, display: "block" }} />;
  }
  if (metadata.kind === "image") {
    return <img src={objectUrl} alt={metadata.name} onError={() => setFailed(true)} style={{ maxWidth: 220, maxHeight: 220, borderRadius: 8, display: "block" }} />;
  }
  return (
    <a href={objectUrl} download={metadata.name}
      style={{ color: mine ? "#000" : GOLD, fontSize: 14, fontWeight: 700, wordBreak: "break-word" }}>
      📁 {metadata.name}
    </a>
  );
}

const EMOJI_GROUPS: [string, string[]][] = [
  ["😀", ["😀","😃","😄","😁","😂","🤣","😊","😍","🥰","😘","😜","🤪","😎","🤩","🥳","😏","😢","😭","😡","🤬","😱","🥺","😴","🤔","🤫","🤗","😇","🙄","😬","🤯"]],
  ["👍", ["👍","👎","👏","🙏","💪","🤝","✌️","🤞","👊","✊","🖐️","👋","🫡","💅","🤙","👀","🧠","❤️","💛","💚","💙","🖤","💔","💯","✨","🔥","⚡","💥","🎉","🎊"]],
  ["👑", ["👑","🏆","🥇","🥈","🥉","⭐","🌟","💎","🏅","🎖️","⚔️","🛡️","🏰","🦁","🦅","🐉","🇲🇦","🌍","🚀","💰","🪙","📈","🎯","🧿","🕌","🌙","☀️","🌹","🗿","♾️"]],
  ["⚽", ["⚽","🏀","🎾","🏐","🎮","🕹️","🎲","♟️","🎵","🎶","🎤","🎧","🎸","🥁","🎬","🎥","📸","🍕","🍔","🌮","🍩","☕","🍵","🥤","🚗","✈️","⏰","📱","💻","📚"]],
];

// Four messenger destinations, in fixed left-to-right order.
// Swiping horizontally moves between adjacent destinations in this order.
type BottomTab = "chats" | "calls" | "communities" | "settings";

const TAB_ORDER: BottomTab[] = ["chats", "calls", "communities", "settings"];

const TAB_I18N_KEYS: Record<BottomTab, string> = {
  chats: "nav_chats",
  calls: "nav_calls",
  communities: "nav_communities",
  settings: "nav_settings",
};

const TAB_LABELS: Record<BottomTab, string> = {
  chats: "Chats",
  calls: "Calls",
  communities: "Communities",
  settings: "Settings",
};

/**
 * Missed-call / call-notification fields the useCall hook worker adds to its
 * return value. Read defensively so the messenger builds and behaves gracefully
 * both before and after the hook lands. Do not edit useCall to satisfy this —
 * coordinate if the field names differ.
 */
interface CallExtras {
  missedCalls: MissedCall[];
  missedCallCount: number;
  markMissedCallsSeen: (ids: string[]) => void;
  missedCallsLoading: boolean;
  missedCallsError: boolean;
  onRetryMissedCalls?: () => void;
  firebaseStatus: FirebaseStatus;
  firebaseError: string | null;
  pushEnabled: boolean;
  pushReason: string | null;
  notificationPermission: CallNotificationPermission;
  enableCallNotifications?: () => void;
  soundBlocked: boolean;
  enableCallSound?: () => void;
}

function readCallExtras(call: unknown): CallExtras {
  const c = (call ?? {}) as Record<string, unknown>;
  const missedCalls = Array.isArray(c.missedCalls) ? (c.missedCalls as MissedCall[]) : [];
  return {
    missedCalls,
    missedCallCount: typeof c.missedCallCount === "number"
      ? c.missedCallCount
      : missedCalls.filter(m => !m.isSeen).length,
    markMissedCallsSeen: typeof c.markMissedCallsSeen === "function"
      ? (c.markMissedCallsSeen as (ids: string[]) => void)
      : () => undefined,
    missedCallsLoading: c.missedCallsLoading === true,
    missedCallsError: c.missedCallsError === true,
    onRetryMissedCalls: typeof c.refreshMissedCalls === "function"
      ? (c.refreshMissedCalls as () => void)
      : undefined,
    firebaseStatus: (["loading", "ready", "disabled", "error"] as const).includes(
      c.firebaseStatus as FirebaseStatus,
    )
      ? (c.firebaseStatus as FirebaseStatus)
      : "loading",
    firebaseError: typeof c.firebaseError === "string" ? c.firebaseError : null,
    pushEnabled: c.pushEnabled === true,
    pushReason: typeof c.pushReason === "string" ? c.pushReason : null,
    notificationPermission: (["default", "granted", "denied", "unsupported"] as const).includes(
      c.notificationPermission as CallNotificationPermission,
    )
      ? (c.notificationPermission as CallNotificationPermission)
      : "default",
    enableCallNotifications: typeof c.enableCallNotifications === "function"
      ? (c.enableCallNotifications as () => void)
      : undefined,
    soundBlocked: c.soundBlocked === true,
    enableCallSound: typeof c.enableCallSound === "function"
      ? (c.enableCallSound as () => void)
      : undefined,
  };
}

// ── Main Messenger ────────────────────────────────────────────────────────────
export type MessengerVariant = "full" | "embedded" | "widget";

interface MessengerProps {
  variant?: MessengerVariant;
  initialRoomId?: number | null;
  onActiveRoomChange?: (roomId: number | null) => void;
}

export default function Messenger({
  variant = "embedded",
  initialRoomId = null,
  onActiveRoomChange,
}: MessengerProps) {
  const { user } = useAuth();
  // A citizen identity is a hard state boundary. Remounting the complete AMIS
  // surface on login/logout/account switch guarantees that no room, message,
  // unread count, draft, upload, or panel from the previous citizen survives
  // for even one rendered frame.
  return (
    <IdentityBoundMessenger
      key={user ? `citizen:${user.id}` : "anonymous"}
      user={user}
      variant={variant}
      initialRoomId={initialRoomId}
      onActiveRoomChange={onActiveRoomChange}
    />
  );
}

function IdentityBoundMessenger({ variant, user, initialRoomId, onActiveRoomChange }: {
  variant: MessengerVariant;
  user: AuthUser | null;
  initialRoomId: number | null;
  onActiveRoomChange?: (roomId: number | null) => void;
}) {
  const { lang } = useLang();
  const st = { ...(SOCIAL_T[lang] ?? SOCIAL_T.en), ...getMessengerCopy(lang) };
  const dir = lang === "ar" ? "rtl" : "ltr";
  const call = useCallContext();
  const groupCall = useGroupCallContext();
  const callExtras = readCallExtras(call);
  const { isOnline } = useConnectivity();

  const [tab,         setTab]         = useState<BottomTab>(() => {
    if (typeof window === "undefined") return "chats";
    return new URLSearchParams(window.location.search).get("tab") === "calls" ? "calls" : "chats";
  });
  const [rooms,       setRooms]       = useState<DmRoom[]>([]);
  const [roomQuery,   setRoomQuery]   = useState("");
  useBackLayer(!!roomQuery, () => setRoomQuery(""), 10, () => setRoomQuery(roomQuery));
  const [activeRoom,  setActiveRoom]  = useState<DmRoom | null>(null);
  // Citizen card drawer opened from a conversation row (same page, no navigation).
  const [drawerUsername, setDrawerUsername] = useState<string | null>(null);
  const [messages,    setMessages]    = useState<DmMessage[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>();
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const historyRequest = useRef(0);
  const historyBusy = useRef(false);
  const historyInitialized = useRef(false);
  const latestPageIds = useRef<number[]>([]);
  const messageScroller = useRef<HTMLDivElement>(null);
  const scrollAnchor = useRef<{ height: number; top: number } | null>(null);
  const atBottom = useRef(true);
  const [text,        setText]        = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const lastTypingSent = useRef(0);
  useEffect(() => {
    setPeerTyping(false);
    let timer: ReturnType<typeof setTimeout>;
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ roomId: number; userId: number; recipientUserId: number; typing: boolean }>).detail;
      if (!user || detail?.roomId !== activeRoom?.id || detail.userId === user.id || detail.recipientUserId !== user.id) return;
      setPeerTyping(detail.typing);
      clearTimeout(timer);
      timer = setTimeout(() => setPeerTyping(false), 5000);
    };
    window.addEventListener("gdna:chat-typing", receive);
    return () => { clearTimeout(timer); window.removeEventListener("gdna:chat-typing", receive); };
  }, [activeRoom?.id, user?.id]);
  function sendTyping(typing: boolean) {
    if (!activeRoom || !isOnline || (typing && Date.now() - lastTypingSent.current < 2500)) return;
    lastTypingSent.current = Date.now();
    void fetch(api(`/api/messages/rooms/${activeRoom.id}/typing`), {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typing }),
    }).catch(() => undefined);
  }
  const [expireAfterHours, setExpireAfterHours] = useState<number | null>(null);
  const [sending,     setSending]     = useState(false);
  const [showGroupNew, setShowGroupNew] = useState(false);
  const [groupName,   setGroupName]   = useState("");
  const [recording,   setRecording]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showContacts, setShowContacts] = useState<false | "dm" | "call">(false);
  useBackLayer(showSettings, () => setShowSettings(false), 30, () => setShowSettings(true));
  useBackLayer(!!showContacts, () => setShowContacts(false), 30, () => setShowContacts(showContacts));
  const [toast,       setToast]       = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [showEmoji,   setShowEmoji]   = useState(false);
  const [emojiGroup,  setEmojiGroup]  = useState(0);
  const [pending,     setPending]     = useState<PendingFile[]>([]);
  const [dragOver,    setDragOver]    = useState(false);
  const [menuMsgId,   setMenuMsgId]   = useState<number | null>(null);
  const [isMobile,    setIsMobile]    = useState(typeof window !== "undefined" && window.innerWidth < 640);
  const [e2eReady,     setE2eReady]    = useState(false);
  const [e2eTerminalError, setE2eTerminalError] = useState<SecureDeviceRegistrationError | null>(null);
  const e2eCapacityBlocked = e2eTerminalError?.code === "SECURE_DEVICE_CAPACITY";
  const terminalRegistrationAccountRef = useRef<number | null>(null);
  // Controls the + attachment tray inside the composer
  const [showAttachTray, setShowAttachTray] = useState(false);
  const [showLinkComposer, setShowLinkComposer] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  // Task #165: reply + reactions
  const [replyTo,       setReplyTo]       = useState<DmMessage | null>(null);
  // Solidarity Relay now lives INSIDE the Communities destination (not a 5th tab).
  // showRelay opens the Relay view within Communities; relayRoomId/Name scope it
  // to a single community (null = empire-wide).
  const [showRelay,     setShowRelay]     = useState(false);
  const [relayRoomId,   setRelayRoomId]   = useState<number | null>(null);
  const [relayRoomName, setRelayRoomName] = useState<string | null>(null);
  const offlineToast = st.offline_action;
  const blockOffline = useCallback(() => setToast(offlineToast), [offlineToast]);
  const startDirectCall = useCallback((username: string, withVideo: boolean) => {
    if (groupCall.busy) {
      setToast("Finish the active group call before starting a private call.");
      return;
    }
    if (!isOnline) { blockOffline(); return; }
    void call.startCall(username, withVideo);
  }, [blockOffline, call, groupCall.busy, isOnline]);

  const pendingRef = useRef<PendingFile[]>([]);
  const updatePending = useCallback((update: PendingFile[] | ((previous: PendingFile[]) => PendingFile[])) => {
    const next = typeof update === "function" ? update(pendingRef.current) : update;
    pendingRef.current = next;
    setPending(next);
  }, []);
  const uploadingRef = useRef(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  // Maps pending item id → its live XHR so individual items can be aborted
  const xhrMapRef = useRef<Map<string, { abort(): void }>>(new Map());
  const directUploadsRef = useRef<Set<AbortController>>(new Set());
  const cancelledUploadIdsRef = useRef<Set<string>>(new Set());
  const activeUploadsRef = useRef<Set<XMLHttpRequest>>(new Set());
  const recCancelledRef = useRef(false);
  const chunksRef   = useRef<Blob[]>([]);
  const mountedRef  = useRef(true);
  const activeRoomIdRef = useRef<number | null>(null);
  useBackLayer(!!activeRoom, () => {
    stopVoiceNote(true);
    activeRoomIdRef.current = null;
    setActiveRoom(null);
    onActiveRoomChange?.(null);
    setShowEmoji(false);
    setShowAttachTray(false);
    setReplyTo(null);
  }, 5, () => {
    if (syncIdentityRef.current !== user?.id) return;
    setActiveRoom(activeRoom);
    activeRoomIdRef.current = activeRoom?.id ?? null;
    onActiveRoomChange?.(activeRoom?.id ?? null);
  });
  useBackLayer(tab !== "chats", () => setTab("chats"), 1, () => setTab(tab));
  const syncIdentityRef = useRef(user?.id);
  if (syncIdentityRef.current !== user?.id) {
    syncIdentityRef.current = user?.id;
  }
  const roomRequestRef = useRef(0);
  const messageRequestRef = useRef(0);
  const messageRevisionRef = useRef(0);
  const endRef      = useRef<HTMLDivElement>(null);
  const textRef     = useRef<HTMLTextAreaElement>(null);
  const pollRef     = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const attachTrayRef = useRef<HTMLDivElement>(null);

  const isWidget = variant === "widget";

  // ── Deliberate horizontal swipe → adjacent destination ──────────────────────
  // A single touch that is clearly horizontal (not vertical scroll) and does not
  // start on an interactive control navigates to the neighbouring destination.
  const swipeRef = useRef<{
    x: number; y: number; active: boolean; decided: boolean; horizontal: boolean;
  }>({ x: 0, y: 0, active: false, decided: false, horizontal: false });

  const goToAdjacentTab = useCallback((direction: 1 | -1) => {
    setTab(prev => {
      const idx = TAB_ORDER.indexOf(prev);
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= TAB_ORDER.length) return prev;
      // Leaving a destination resets any transient chat/relay context.
      activeRoomIdRef.current = null;
      setActiveRoom(null);
      return TAB_ORDER[nextIdx];
    });
  }, []);

  // Never hijack a gesture that begins on an input, button, link, or any element
  // that opts out of swipe navigation (audio/video controls, sliders, etc.).
  const isInteractiveTarget = (el: EventTarget | null): boolean => {
    let node = el as HTMLElement | null;
    while (node && node !== document.body) {
      const tag = node.tagName;
      if (
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
        tag === "BUTTON" || tag === "A" || tag === "AUDIO" || tag === "VIDEO" ||
        node.getAttribute?.("role") === "button" ||
        node.getAttribute?.("contenteditable") === "true" ||
        node.dataset?.noSwipe === "true"
      ) return true;
      node = node.parentElement;
    }
    return false;
  };

  const SWIPE_THRESHOLD = 60;   // px of horizontal travel required to commit
  const SWIPE_SLOP = 12;        // px before we decide axis
  const SWIPE_RATIO = 1.4;      // horizontal must dominate vertical by this ratio

  const onSwipeTouchStart = useCallback((e: React.TouchEvent) => {
    // Only single-finger gestures, never while a chat/room is open, never on inputs.
    if (activeRoom || e.touches.length !== 1 || isInteractiveTarget(e.target)) {
      swipeRef.current.active = false;
      return;
    }
    const t = e.touches[0];
    swipeRef.current = { x: t.clientX, y: t.clientY, active: true, decided: false, horizontal: false };
  }, [activeRoom]);

  const onSwipeTouchMove = useCallback((e: React.TouchEvent) => {
    const s = swipeRef.current;
    if (!s.active) return;
    if (e.touches.length !== 1) {
      s.active = false;
      return;
    }
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (!s.decided) {
      if (Math.abs(dx) < SWIPE_SLOP && Math.abs(dy) < SWIPE_SLOP) return;
      // Decide the axis once: a mainly vertical gesture is left to normal scroll.
      s.horizontal = Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO;
      s.decided = true;
      if (!s.horizontal) s.active = false;
    }
  }, []);

  const onSwipeTouchEnd = useCallback((e: React.TouchEvent) => {
    const s = swipeRef.current;
    if (!s.active || !s.horizontal) { s.active = false; return; }
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    s.active = false;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    // Destinations are visually ordered from the start edge; a physical left
    // swipe advances to the next item in both LTR and RTL layouts.
    const forward = dx < 0;
    goToAdjacentTab(forward ? 1 : -1);
  }, [goToAdjacentTab]);

  const onTabKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>, current: BottomTab) => {
    const currentIndex = TAB_ORDER.indexOf(current);
    let nextIndex: number | null = null;

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = TAB_ORDER.length - 1;
    if (event.key === "ArrowRight") nextIndex = currentIndex + (dir === "rtl" ? -1 : 1);
    if (event.key === "ArrowLeft") nextIndex = currentIndex + (dir === "rtl" ? 1 : -1);
    if (nextIndex === null) return;

    event.preventDefault();
    nextIndex = Math.max(0, Math.min(TAB_ORDER.length - 1, nextIndex));
    const nextTab = TAB_ORDER[nextIndex];
    activeRoomIdRef.current = null;
    setActiveRoom(null);
    setTab(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById(`amis-tab-${nextTab}`)?.focus();
    });
  }, [dir]);

  const ensureE2eRegistered = useCallback(async () => {
    if (!user) throw new Error("Login required");
    if (!isOnline) throw new Error(offlineToast);
    try {
      await registerSecureDevice(user.id);
      setE2eReady(true);
      setE2eTerminalError(null);
      terminalRegistrationAccountRef.current = null;
    } catch (error) {
      setE2eReady(false);
      setE2eTerminalError(isTerminalSecureDeviceError(error) ? error : null);
      terminalRegistrationAccountRef.current = isTerminalSecureDeviceError(error) ? user.id : null;
      throw error;
    }
  }, [isOnline, offlineToast, user?.id]);

  const retryE2eRegistration = useCallback(async () => {
    try {
      // Start every mounted secure surface together so the shared helper
      // collapses them into one PUT for this account/device.
      const registration = ensureE2eRegistered();
      call.retrySecureCallRegistration?.();
      await registration;
      setToast("تم تسجيل الجهاز الآمن · Appareil sécurisé enregistré");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Secure device registration failed");
    }
  }, [call, ensureE2eRegistered]);

  useEffect(() => {
    if (!user) {
      setE2eReady(false);
      setE2eTerminalError(null);
      terminalRegistrationAccountRef.current = null;
      return;
    }
    if (terminalRegistrationAccountRef.current === user.id) return;
    void ensureE2eRegistered().catch(() => {});
  }, [ensureE2eRegistered, user?.id]);

  // Reset the Solidarity Relay view whenever we leave the Communities destination
  // so it never lingers when the citizen returns from another destination.
  useEffect(() => {
    if (tab !== "communities" && showRelay) {
      setShowRelay(false);
      setRelayRoomId(null);
      setRelayRoomName(null);
    }
  }, [tab, showRelay]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close attach tray when clicking outside
  useEffect(() => {
    if (!showAttachTray) return;
    const handler = (e: MouseEvent) => {
      if (attachTrayRef.current && !attachTrayRef.current.contains(e.target as Node)) {
        setShowAttachTray(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAttachTray]);

  // Unmount cleanup: stop any live recording (mic!) and drop its delayed upload.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recCancelledRef.current = true;
      try { recorderRef.current?.stop(); } catch { /* already stopped */ }
      recStreamRef.current?.getTracks().forEach(t => t.stop());
      for (const xhr of activeUploadsRef.current) xhr.abort();
      activeUploadsRef.current.clear();
      for (const controller of directUploadsRef.current) controller.abort();
      directUploadsRef.current.clear();
      xhrMapRef.current.clear();
      cancelledUploadIdsRef.current.clear();
      for (const item of pendingRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  // Keep the view pinned to the newest message when the mobile keyboard
  // opens/closes (visualViewport resize) so the screen doesn't "jump".
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onVV = () => { endRef.current?.scrollIntoView({ block: "end" }); };
    vv.addEventListener("resize", onVV);
    return () => vv.removeEventListener("resize", onVV);
  }, []);

  // ── Load rooms ──────────────────────────────────────────────────────────────
  const loadRooms = useCallback(async (): Promise<DmRoom[]> => {
    if (!user || !isOnline) return [];
    const request = ++roomRequestRef.current;
    const owner = user.id;
    try {
      // Reading rooms must not depend on creating/accessing a private identity.
      // Each encrypted preview handles unavailable keys independently below.
      const r = await fetch(api("/api/messages/rooms"), {
        credentials: "include", cache: "no-store", signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) return [];
      const j = await r.json();
      // Server returns rooms newest-first; preserve that order — never re-sort client-side.
      const list: DmRoom[] = await Promise.all(((j.rooms ?? []) as DmRoom[]).map(async room => {
        const content = room.lastMessage?.content;
        if (!content || !isE2EMessage(content)) return room;
        try {
          const payload = await decryptMessagePayload(content, user.id);
          return {
            ...room,
            lastMessage: room.lastMessage ? {
              ...room.lastMessage,
              content: payload?.kind === "text"
                ? payload.text
                : payload?.kind === "attachment"
                  ? attachmentLabel(payload.attachment, st)
                  : `🔐 ${st.encrypted_message}`,
            } : room.lastMessage,
          };
        } catch {
          return {
            ...room,
            lastMessage: room.lastMessage
              ? { ...room.lastMessage, content: `🔐 ${st.encrypted_message}` }
              : room.lastMessage,
          };
        }
      }));
      if (!mountedRef.current || syncIdentityRef.current !== owner || request !== roomRequestRef.current) return [];
      setRooms(list);
      return list;
    } catch {
      // Preserve the last successfully loaded room list while disconnected.
      return [];
    }
  }, [isOnline, user?.id]);

  useEffect(() => {
    let cancelled = false;
    void loadRooms().then(list => {
      if (cancelled || initialRoomId === null || !isOnline) return;
      const requestedRoom = list.find(room => room.id === initialRoomId);
      if (requestedRoom) {
        // Returning from a picker or reconnecting must not reopen the same
        // room: openRoom clears the pending attachment queue.
        if (activeRoomIdRef.current !== requestedRoom.id) void openRoom(requestedRoom);
      } else if (activeRoomIdRef.current === null) onActiveRoomChange?.(null);
    });
    return () => { cancelled = true; };
  }, [initialRoomId, isOnline, loadRooms, onActiveRoomChange]);

  // Keep every mounted Messenger surface in sync when one removes a room.
  useEffect(() => {
    const onRoomDeleted = (event: Event) => {
      const roomId = (event as CustomEvent<{ roomId?: number }>).detail?.roomId;
      if (typeof roomId !== "number") return;
      setRooms(prev => prev.filter(room => room.id !== roomId));
      if (activeRoomIdRef.current === roomId) {
        activeRoomIdRef.current = null;
        setActiveRoom(null);
        onActiveRoomChange?.(null);
        setMessages([]);
        setShowSettings(false);
        setShowEmoji(false);
        setShowAttachTray(false);
        setMenuMsgId(null);
      }
    };
    window.addEventListener("amis:room-deleted", onRoomDeleted);
    return () => window.removeEventListener("amis:room-deleted", onRoomDeleted);
  }, [onActiveRoomChange]);

  const removeRoomFromAllSurfaces = useCallback((roomId: number) => {
    window.dispatchEvent(new CustomEvent("amis:room-deleted", { detail: { roomId } }));
  }, []);

  const appendMessage = useCallback((message: DmMessage) => {
    messageRevisionRef.current++;
    setMessages(prev => {
      if (prev.some(existing => existing.id === message.id)) return prev;
      return [...prev, message].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
  }, []);

  // After a realtime new message, refresh rooms but preserve newest-first order
  // by relying on the server's ordering from loadRooms (not re-sorting locally).
  useEffect(() => {
    const onMessage = (event: Event) => {
      const detail = (event as CustomEvent<{
        roomId?: number;
        message?: DmMessage;
        recipientUserId?: number;
      }>).detail;
      if (!detail?.message) return;
      if (typeof detail.recipientUserId === "number" && detail.recipientUserId !== user?.id) return;
      if (detail.roomId === activeRoomIdRef.current) {
        if (user) {
          void decryptMessageForUser(detail.message, user.id, st).catch(() => ({
            ...detail.message!, content: `🔐 ${st.secure_other_device}`, encrypted: true, decryptionFailed: true,
          })).then(message => {
            if (mountedRef.current && detail.roomId === activeRoomIdRef.current) appendMessage(message);
          });
        }
      }
      // loadRooms returns server-ordered list (newest first); just refresh.
      void loadRooms();
    };
    const onPushMessage = (event: Event) => {
      const rawRoomId = (event as CustomEvent<{ roomId?: string | number }>).detail?.roomId;
      const roomId = typeof rawRoomId === "number" ? rawRoomId : Number(rawRoomId);
      if (!Number.isSafeInteger(roomId) || roomId <= 0) return;
      if (roomId === activeRoomIdRef.current) void loadMessages(roomId);
      void loadRooms();
    };
    const onReconnect = () => {
      void loadRooms();
      if (activeRoomIdRef.current !== null) void loadMessages(activeRoomIdRef.current);
    };
    const onRead = (event: Event) => {
      const detail = (event as CustomEvent<{
        roomId?: number;
        readerUserId?: number;
        readAt?: string;
        recipientUserId?: number;
      }>).detail;
      if (!detail?.roomId || !detail.readerUserId || !detail.readAt) return;
      if (typeof detail.recipientUserId === "number" && detail.recipientUserId !== user?.id) return;
      if (detail.roomId !== activeRoomIdRef.current) return;
      setActiveRoom(prev => {
        if (!prev || prev.id !== detail.roomId) return prev;
        return {
          ...prev,
          members: prev.members.map(member =>
            member.userId === detail.readerUserId
              ? { ...member, lastReadAt: detail.readAt }
              : member),
        };
      });
      void loadRooms();
    };
    const onMessageDeleted = (event: Event) => {
      const detail = (event as CustomEvent<{
        roomId?: number;
        messageId?: number;
        recipientUserId?: number;
      }>).detail;
      if (!detail?.roomId || !detail.messageId) return;
      if (typeof detail.recipientUserId === "number" && detail.recipientUserId !== user?.id) return;
      if (detail.roomId === activeRoomIdRef.current) {
        messageRevisionRef.current++;
        setMessages(prev => prev.filter(message => message.id !== detail.messageId));
      }
      void loadRooms();
    };
    window.addEventListener("gdna:chat-message", onMessage);
    window.addEventListener("gdna:chat-push", onPushMessage);
    window.addEventListener("gdna:chat-read", onRead);
    window.addEventListener("gdna:chat-message-deleted", onMessageDeleted);
    window.addEventListener("gdna:realtime-connected", onReconnect);
    return () => {
      window.removeEventListener("gdna:chat-message", onMessage);
      window.removeEventListener("gdna:chat-push", onPushMessage);
      window.removeEventListener("gdna:chat-read", onRead);
      window.removeEventListener("gdna:chat-message-deleted", onMessageDeleted);
      window.removeEventListener("gdna:realtime-connected", onReconnect);
    };
  }, [appendMessage, loadRooms, user?.id]);

  // Recover independently of the call socket: an apparently OPEN socket may
  // be stale after OS sleep. Never reopen the room or clear the draft/uploads.
  useEffect(() => {
    if (!user || !isOnline) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      void loadRooms();
      if (activeRoomIdRef.current !== null) void loadMessages(activeRoomIdRef.current);
    };
    const resume = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 150);
    };
    refresh();
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("online", resume);
    window.addEventListener("gdna:realtime-refetch", resume);
    document.addEventListener("visibilitychange", resume);
    clearInterval(pollRef.current);
    pollRef.current = setInterval(refresh, 15_000);
    return () => {
      clearTimeout(timer);
      clearInterval(pollRef.current);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("gdna:realtime-refetch", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [activeRoom?.id, user?.id, isOnline, loadRooms]);

  useLayoutEffect(() => {
    const el = messageScroller.current;
    if (el && scrollAnchor.current) {
      el.scrollTop = scrollAnchor.current.top + el.scrollHeight - scrollAnchor.current.height;
      scrollAnchor.current = null;
    } else if (atBottom.current) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function loadOlderMessages() {
    if (!historyCursor || historyBusy.current || !user || !isOnline || !activeRoom) return;
    const roomId = activeRoom.id;
    const owner = user.id;
    const request = ++historyRequest.current;
    const revision = messageRevisionRef.current;
    historyBusy.current = true;
    setLoadingHistory(true);
    setHistoryError(false);
    try {
      const r = await fetch(api(`/api/messages/rooms/${roomId}?before=${encodeURIComponent(historyCursor)}`), {
        credentials: "include", cache: "no-store", signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) throw new Error("History unavailable");
      const page = await r.json();
      const older = await Promise.all((page.messages as DmMessage[]).map(message =>
        decryptMessageForUser(message, owner, st).catch(() => ({
          ...message, content: `🔐 ${st.secure_other_device}`, encrypted: true, decryptionFailed: true,
        }))));
      if (!mountedRef.current || syncIdentityRef.current !== owner ||
          activeRoomIdRef.current !== roomId || request !== historyRequest.current) return;
      if (revision !== messageRevisionRef.current) {
        setHistoryError(true);
        return;
      }
      const el = messageScroller.current;
      if (el) scrollAnchor.current = { height: el.scrollHeight, top: el.scrollTop };
      setMessages(prev => {
        const unique = new Map([...older, ...prev].map(message => [message.id, message]));
        return [...unique.values()].filter(m => !m.expiresAt || Date.parse(m.expiresAt) > Date.now())
          .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id);
      });
      setHistoryCursor(page.pagination.nextCursor);
    } catch {
      if (request === historyRequest.current && activeRoomIdRef.current === roomId) setHistoryError(true);
    } finally {
      if (request === historyRequest.current) {
        historyBusy.current = false;
        setLoadingHistory(false);
      }
    }
  }

  async function loadMessages(roomId: number) {
    if (!isOnline || !user) return;
    const owner = user.id;
    const request = ++messageRequestRef.current;
    const revision = messageRevisionRef.current;
    try {
      const r = await fetch(api(`/api/messages/rooms/${roomId}`), {
        credentials: "include", cache: "no-store", signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) return;
      const j = await r.json();
      const decrypted = user
        ? await Promise.all(((j.messages ?? []) as DmMessage[]).filter(message => message && typeof message === "object").map(message =>
          decryptMessageForUser(message, user.id, st).catch(() => ({
            ...message, content: `🔐 ${st.secure_other_device}`, encrypted: true, decryptionFailed: true,
          }))))
        : [];
      // Only commit if this room is still the active one (guards stale responses
      // from a previously opened room resolving late) and we're still mounted.
      if (mountedRef.current && syncIdentityRef.current === owner &&
          activeRoomIdRef.current === roomId && request === messageRequestRef.current &&
          revision === messageRevisionRef.current) {
        setMessages(prev => {
          const first = decrypted[0];
          const retained = first ? prev.filter(m =>
            Date.parse(m.createdAt) < Date.parse(first.createdAt) ||
            (m.createdAt === first.createdAt && m.id < first.id)) : [];
          return [...new Map([...retained, ...decrypted].map(m => [m.id, m])).values()]
            .filter(m => !m.expiresAt || Date.parse(m.expiresAt) > Date.now());
        });
        // If more than a page arrived while offline, restart traversal at the
        // new window so the gap remains reachable rather than silently skipped.
        if (!historyInitialized.current || !decrypted.some(m => latestPageIds.current.includes(m.id))) {
          ++historyRequest.current;
          historyBusy.current = false;
          setLoadingHistory(false);
          historyInitialized.current = true;
          setHistoryCursor(j.pagination?.nextCursor ?? null);
        }
        latestPageIds.current = decrypted.map(m => m.id);
        if (Array.isArray(j.members)) {
          setActiveRoom(prev => prev?.id === roomId ? { ...prev, members: j.members } : prev);
        }
      }
    } catch {
      // Keep the currently rendered in-memory messages while disconnected.
    }
  }

  async function openRoom(room: DmRoom) {
    cancelPending();
    setShowSettings(false); setShowContacts(false); setShowEmoji(false); setShowAttachTray(false);
    activeRoomIdRef.current = room.id;
    ++messageRequestRef.current;
    ++historyRequest.current;
    historyBusy.current = false;
    historyInitialized.current = false;
    latestPageIds.current = [];
    scrollAnchor.current = null;
    atBottom.current = true;
    setHistoryCursor(undefined);
    setLoadingHistory(false);
    setHistoryError(false);
    setMessages([]);
    setActiveRoom(room);
    onActiveRoomChange?.(room.id);
    await loadMessages(room.id);
  }

  function getPeerName(room: DmRoom): string {
    if (room.type === "group") return room.name ?? st.group;
    const other = room.members.find(m => m.username !== user?.username);
    return other?.username ?? st.chat;
  }

  // Open a room by id from a FRESH rooms fetch so members are populated.
  async function openRoomById(roomId: number, fallback?: Partial<DmRoom>) {
    const list = await loadRooms();
    const found = list.find(r => r.id === roomId);
    if (found) openRoom(found);
    else if (fallback) openRoom({ members: [], unreadCount: 0, ...fallback, id: roomId } as DmRoom);
  }

  async function openDmWith(username: string) {
    if (!isOnline) { blockOffline(); return; }
    const r = await fetch(api("/api/messages/rooms"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "direct", targetUsername: username }), credentials: "include",
    });
    if (r.ok) {
      const j = await r.json();
      setTab("chats");
      if (j.room) await openRoomById(j.room.id, j.room);
    }
  }

  async function createGroup() {
    if (!isOnline) { blockOffline(); return; }
    const r = await fetch(api("/api/messages/rooms"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "group", roomName: groupName || st.group, icon: "" }), credentials: "include",
    });
    if (r.ok) {
      const j = await r.json();
      setShowGroupNew(false); setGroupName("");
      if (j.room) await openRoomById(j.room.id, j.room);
      else await loadRooms();
    }
  }

  async function sendMessage(override?: object, shouldSend: () => boolean = () => true): Promise<boolean> {
    if (!activeRoom || (!text.trim() && !override) || sending) return false;
    if (!isOnline) { blockOffline(); return false; }
    setSending(true);
    try {
      const baseBody: Record<string, unknown> = override
        ? { ...(override as Record<string, unknown>) }
        : { content: text.trim(), type: "text" };
      if (expireAfterHours !== null) baseBody.expireAfterHours = expireAfterHours;
      if (!override && replyTo) baseBody.replyToId = replyTo.id;
      const roomId = activeRoom.id;
      await ensureE2eRegistered();
      const secureAttachment = baseBody.secureAttachment as SecureAttachmentMetadata | undefined;
      delete baseBody.secureAttachment;
      const payload: SecureMessagePayload = secureAttachment
        ? { kind: "attachment", attachment: secureAttachment }
        : { kind: "text", text: String(baseBody.content ?? "") };
      let r: Response | null = null;
      // A device may register between key fetch and send. On the server's 409,
      // refetch the authoritative device set and re-wrap once.
      for (let attempt = 0; attempt < 2; attempt++) {
        const keysResponse = await fetch(api(`/api/messages/rooms/${roomId}/e2e-keys`), {
          credentials: "include",
        });
        if (!keysResponse.ok) throw new Error(st.secure_keys_failed);
        const keyData = await keysResponse.json() as {
          keys?: E2ERecipientKey[];
          missingUserIds?: number[];
        };
        if (keyData.missingUserIds?.length || !keyData.keys?.length) {
          throw new Error(st.secure_member_unavailable);
        }
        const body = {
          ...baseBody,
          content: await encryptMessagePayload(payload, keyData.keys),
        };
        if (!mountedRef.current || !shouldSend()) return false;
        r = await fetch(api(`/api/messages/rooms/${roomId}/send`), {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body), credentials: "include",
        });
        if (r.status !== 409 || attempt === 1) break;
      }
      if (!r) throw new Error(st.send_failed);
      if (r.ok) {
        const j = await r.json();
        trackEvent("message_send_success", {
          message_type: secureAttachment ? "attachment" : "text",
        });
        const decryptedMessage = user
          ? await decryptMessageForUser(j.message as DmMessage, user.id, st)
          : j.message as DmMessage;
        if (mountedRef.current && activeRoomIdRef.current === roomId) appendMessage(decryptedMessage);
        if (!override) { sendTyping(false); setText(""); setReplyTo(null); if (textRef.current) textRef.current.style.height = "auto"; }
        loadRooms();
        return true;
      } else {
        const j = await r.json().catch(() => ({} as { error?: string }));
        if (j.error) setToast(j.error);
        return false;
      }
    } catch (error) {
      setToast(error instanceof Error ? `🔐 ${error.message}` : st.send_failed);
      return false;
    } finally { setSending(false); }
  }

  async function deleteMessage(msgId: number) {
    if (!activeRoom) return;
    if (!isOnline) { blockOffline(); return; }
    if (!window.confirm(st.delete_everyone_confirm)) return;
    setMenuMsgId(null);
    const r = await fetch(api(`/api/messages/rooms/${activeRoom.id}/messages/${msgId}`), {
      method: "DELETE", credentials: "include",
    });
    if (r.ok) {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setToast(st.deleted_everyone);
      loadRooms();
    } else {
      const j = await r.json().catch(() => ({} as { error?: string }));
      setToast(j.error ?? st.error);
    }
  }

  function copyMessage(msg: DmMessage) {
    setMenuMsgId(null);
    const t = msg.secureAttachment?.name ?? msg.content ?? msg.fileUrl ?? msg.audioUrl ?? "";
    navigator.clipboard?.writeText(t).then(() => setToast(st.copied ?? "Copied!")).catch(() => {});
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setToast(st.clipboard_empty);
        return;
      }
      setText(current => `${current}${current ? " " : ""}${text}`);
      setShowAttachTray(false);
    } catch {
      setToast(st.paste_hint);
    }
  }

  async function sendReaction(msg: DmMessage, reaction: "support" | "listen" | "celebrate") {
    setMenuMsgId(null);
    if (!activeRoom) return;
    if (!isOnline) { blockOffline(); return; }

    const prevReaction = msg.myReaction as ("support" | "listen" | "celebrate") | null | undefined;
    const isTogglingOff = prevReaction === reaction; // same reaction → remove it
    const isSwitch      = !!prevReaction && prevReaction !== reaction; // different → decrement old, increment new

    // Fix #5 — correct optimistic update snapshot for rollback
    const prevReactions = { ...(msg.reactions ?? { support: 0, listen: 0, celebrate: 0 }) };
    const prevMyReaction = prevReaction ?? null;

    const optimistic = (key: "support" | "listen" | "celebrate"): number => {
      const base = prevReactions[key] ?? 0;
      if (isTogglingOff) {
        return key === reaction ? Math.max(0, base - 1) : base;
      }
      if (isSwitch) {
        if (key === prevReaction) return Math.max(0, base - 1); // decrement old
        if (key === reaction)     return base + 1;              // increment new
        return base;
      }
      // No previous reaction → just increment
      return key === reaction ? base + 1 : base;
    };

    setMessages(prev => prev.map(m => m.id === msg.id ? {
      ...m,
      reactions: {
        support:   optimistic("support"),
        listen:    optimistic("listen"),
        celebrate: optimistic("celebrate"),
      },
      myReaction: isTogglingOff ? null : reaction,
    } : m));

    try {
      let res: Response;
      if (isTogglingOff) {
        res = await fetch(api(`/api/messages/rooms/${activeRoom.id}/messages/${msg.id}/reaction`), {
          method: "DELETE", credentials: "include",
        });
      } else {
        res = await fetch(api(`/api/messages/rooms/${activeRoom.id}/messages/${msg.id}/reaction`), {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reaction }), credentials: "include",
        });
      }
      // Fix #5: on non-2xx, restore previous state and show feedback
      if (!res.ok) {
        setMessages(prev => prev.map(m => m.id === msg.id ? {
          ...m, reactions: prevReactions, myReaction: prevMyReaction,
        } : m));
        setToast(st.reaction_failed);
      }
    } catch {
      // Fix #5: network failure → restore exact previous state
      setMessages(prev => prev.map(m => m.id === msg.id ? {
        ...m, reactions: prevReactions, myReaction: prevMyReaction,
      } : m));
      setToast(st.reaction_failed);
    }
  }

  function startReply(msg: DmMessage) {
    setMenuMsgId(null);
    setReplyTo(msg);
    setTimeout(() => textRef.current?.focus(), 100);
  }

  async function uploadAndSend(
    file: File | Blob,
    pendingId: string,
    fallbackName = st.attachment,
    onProgress: (pct: number) => void = () => {},
  ): Promise<"sent" | "failed" | "cancelled"> {
    if (!activeRoom) return "failed";
    if (!isOnline) { blockOffline(); return "failed"; }
    const sizeError = attachmentSizeError(file);
    if (sizeError) { setToast(st[sizeError]); return "failed"; }
    const item = pendingRef.current.find(p => p.id === pendingId);
    if (!item || item.roomId !== activeRoom.id) return "cancelled";
    const roomId = item.roomId;
    const stillActive = () => mountedRef.current && activeRoomIdRef.current === roomId &&
      !cancelledUploadIdsRef.current.has(pendingId) && pendingRef.current.some(p => p.id === pendingId);
    let encryptedAttachment: Awaited<ReturnType<typeof encryptAttachmentBlob>>;
    try {
      const originalName = file instanceof File ? file.name : `${fallbackName}.webm`;
      encryptedAttachment = await encryptAttachmentBlob(file, originalName);
    } catch {
      setToast(`🔐 ${st.encrypt_attachment_failed}`);
      updatePending(prev => prev.map(p => p.id === pendingId ? { ...p, error: st.encrypt_attachment_failed } : p));
      return "failed";
    }
    if (!mountedRef.current || activeRoomIdRef.current !== roomId ||
        cancelledUploadIdsRef.current.has(pendingId) || !pendingRef.current.some(p => p.id === pendingId)) {
      return "cancelled";
    }
    const controller = new AbortController();
    xhrMapRef.current.set(pendingId, controller);
    directUploadsRef.current.add(controller);
    let r: { ok: boolean; status: number; json: { url?: string; error?: string }; aborted: boolean };
    try {
      const json = await directAttachmentUpload(
        api(`/api/messages/upload/direct${attachmentUploadQuery(roomId, encryptedAttachment.metadata.kind)}`),
        encryptedAttachment.blob, controller.signal, onProgress,
      );
      r = { ok: true, status: 200, json, aborted: false };
    } catch (error) {
      const detail = error instanceof AttachmentUploadError ? ` (${error.message})` : "";
      const message = `${st.upload_failed}${detail}`;
      updatePending(prev => prev.map(p => p.id === pendingId ? { ...p, error: message } : p));
      r = { ok: false, status: error instanceof AttachmentUploadError ? error.status : 0, json: { error: message },
        aborted: controller.signal.aborted };
    } finally { directUploadsRef.current.delete(controller); }
    xhrMapRef.current.delete(pendingId);
    if (r.aborted || cancelledUploadIdsRef.current.has(pendingId)) return "cancelled";
    if (!mountedRef.current) return "cancelled";
    if (!r.ok || typeof r.json.url !== "string" || !r.json.url.startsWith("/api/messages/files/")) {
      setToast(r.status === 429
        ? (r.json.error ?? (st.upload_limit ?? "Upload limit reached — please wait a moment"))
        : (r.json.error ?? st.upload_failed));
      return "failed";
    }
    const j = r.json as { url: string };
    const body = {
      fileUrl: j.url,
      type: encryptedAttachment.metadata.kind === "image" ? "file" : encryptedAttachment.metadata.kind,
      secureAttachment: encryptedAttachment.metadata,
    };
    // Guard: only send the message if the room is still active and the item
    // wasn't removed or cancelled while the upload was in flight.
    if (!mountedRef.current || activeRoomIdRef.current !== roomId) return "cancelled";
    if (cancelledUploadIdsRef.current.has(pendingId) || !pendingRef.current.some(p => p.id === pendingId)) {
      // Item was removed by the user while uploading — do NOT send the message.
      return "cancelled";
    }
    const sent = await sendMessage(body, stillActive);
    return sent ? "sent" : stillActive() ? "failed" : "cancelled";
  }

  // Stage one or more files into the pre-send preview strip.
  function stageFiles(files: File[], autoSendImages = false) {
    if (!isOnline) { blockOffline(); return; }
    if (!files.length || !activeRoom) return;
    const staged: PendingFile[] = [];
    let sizeError: ReturnType<typeof attachmentSizeError> = null;
    for (const f of files) {
      const error = attachmentSizeError(f);
      if (error) { sizeError = error; continue; }
      const isMedia = f.type.startsWith("image/") || f.type.startsWith("video/") || f.type.startsWith("audio/");
      staged.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        roomId: activeRoom.id,
        file: f,
        previewUrl: isMedia ? URL.createObjectURL(f) : null,
        status: "staged",
        progress: 0,
        autoSend: autoSendImages && f.type.startsWith("image/"),
      });
    }
    if (sizeError) setToast(st[sizeError]);
    updatePending(prev => {
      const room = UPLOAD_BATCH_LIMIT - prev.length;
      if (staged.length > room) {
        setToast(st.upload_limit_batch ?? `Max ${UPLOAD_BATCH_LIMIT} files per batch`);
        staged.slice(room).forEach(p => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
      }
      return [...prev, ...staged.slice(0, Math.max(0, room))];
    });
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    try {
      stageFiles(files, true);
      setShowAttachTray(false);
    } catch (error) {
      setToast(error instanceof Error ? error.message : st.upload_failed);
    }
  }

  async function shareDeviceContacts() {
    setShowAttachTray(false);
    const contactsApi = (navigator as Navigator & {
      contacts?: {
        select: (
          properties: string[],
          options: { multiple: boolean },
        ) => Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>>;
      };
    }).contacts;
    if (!contactsApi?.select) {
      setToast(st.device_contacts_unavailable ?? "Device contacts are not supported by this browser.");
      return;
    }
    try {
      const contacts = await contactsApi.select(["name", "tel", "email"], { multiple: true });
      if (!contacts.length) return;
      const content = contacts.map(contact => [
        `👤 ${contact.name?.[0] ?? (st.contact ?? "Contact")}`,
        ...(contact.tel ?? []).map(value => `📞 ${value}`),
        ...(contact.email ?? []).map(value => `✉️ ${value}`),
      ].join("\n")).join("\n\n");
      await sendMessage({ content, type: "text" });
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        setToast(st.contact_share_failed ?? "Could not open device contacts.");
      }
    }
  }

  function shareLocation() {
    setShowAttachTray(false);
    if (!navigator.geolocation) {
      setToast(st.location_unavailable ?? "Location is not supported by this device.");
      return;
    }
    setToast(st.location_loading ?? "Getting your location…");
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        setToast("");
        void sendMessage({
          content: `📍 ${st.shared_location ?? "Shared location"}\n${mapsUrl}`,
          type: "text",
        });
      },
      () => setToast(st.location_denied ?? "Location permission was denied."),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  async function shareToOtherApps() {
    setShowAttachTray(false);
    if (!navigator.share) {
      setToast(st.external_share_unavailable ?? "Sharing to other apps is not supported by this browser.");
      return;
    }
    try {
      await navigator.share({
        title: "GDNA Arena",
        text: text.trim() || (st.share_from_gdna ?? "Shared from GDNA Arena"),
        url: window.location.href,
      });
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        setToast(st.external_share_failed ?? "Could not open the share menu.");
      }
    }
  }

  async function sendMultipleLinks() {
    const candidates = linkDraft
      .split(/[\n,\s]+/u)
      .map(value => value.trim())
      .filter(Boolean);
    const links = Array.from(new Set(candidates)).slice(0, 20);
    if (!links.length || links.some(value => {
      try {
        const url = new URL(value);
        return url.protocol !== "https:" && url.protocol !== "http:";
      } catch {
        return true;
      }
    })) {
      setToast(st.links_invalid ?? "Enter valid http or https links.");
      return;
    }
    const sent = await sendMessage({ content: links.join("\n"), type: "text" });
    if (sent) {
      setLinkDraft("");
      setShowLinkComposer(false);
    }
  }

  // Upload every staged file sequentially with per-file progress, then clear.
  async function confirmPending(automaticOnly = false) {
    if (uploadingRef.current) return;
    if (!isOnline) { blockOffline(); return; }
    uploadingRef.current = true;
    setUploading(true);
    try {
      // Snapshot the queue; new stages during upload wait for the next batch.
      const queue = pendingRef.current.filter(p => automaticOnly
        ? p.autoSend && p.status === "staged"
        : p.status !== "uploading");
      for (const item of queue) {
        // Skip files the user removed while earlier ones were uploading.
        if (!pendingRef.current.some(p => p.id === item.id)) continue;
        updatePending(prev => prev.map(p => p.id === item.id ? { ...p, status: "uploading", progress: 0 } : p));
        const result = await uploadAndSend(
          item.file,
          item.id,
          "attachment",
          pct => updatePending(prev => prev.map(p => p.id === item.id ? { ...p, progress: pct } : p)),
        );
        if (result === "sent") {
          cancelledUploadIdsRef.current.delete(item.id);
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          updatePending(prev => prev.filter(p => p.id !== item.id));
        } else if (result === "cancelled") {
          cancelledUploadIdsRef.current.delete(item.id);
          const remaining = pendingRef.current.find(p => p.id === item.id);
          if (remaining?.previewUrl) URL.revokeObjectURL(remaining.previewUrl);
          updatePending(prev => prev.filter(p => p.id !== item.id));
          continue;
        } else {
          // If the item was removed/cancelled during upload it's already gone — don't mark error.
          if (pendingRef.current.some(p => p.id === item.id)) {
            updatePending(prev => prev.map(p => p.id === item.id ? { ...p, status: "error", progress: 0 } : p));
          }
          // Failed batches require an explicit retry, never an automatic retry loop.
          const ids = new Set(queue.map(p => p.id));
          updatePending(prev => prev.map(p => ids.has(p.id) ? { ...p, autoSend: false } : p));
          // Rate-limited: stop hammering the server; remaining files stay staged.
          break;
        }
      }
    } catch (error) {
      if (mountedRef.current) {
        setToast(error instanceof Error ? error.message : st.upload_failed);
        updatePending(prev => prev.map(p => p.status === "uploading"
          ? { ...p, status: "error", progress: 0, autoSend: false } : { ...p, autoSend: false }));
      }
    } finally { uploadingRef.current = false; if (mountedRef.current) setUploading(false); }
  }

  useEffect(() => {
    if (isOnline && !uploading && pending.some(p => p.autoSend && p.status === "staged")) {
      void confirmPending(true);
    }
  }, [pending, uploading, isOnline]);

  // Remove a staged item. If it is actively uploading, abort the XHR first
  // so the server never completes and no late message is sent.
  function removePending(id: string) {
    const item = pendingRef.current.find(p => p.id === id);
    if (!item) return;
    cancelledUploadIdsRef.current.add(id);
    const xhr = xhrMapRef.current.get(id);
    if (xhr) xhr.abort();
    xhrMapRef.current.delete(id);
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    updatePending(prev => prev.filter(p => p.id !== id));
  }

  function cancelPending() {
    pendingRef.current.forEach(p => {
      cancelledUploadIdsRef.current.add(p.id);
      const xhr = xhrMapRef.current.get(p.id);
      if (xhr) xhr.abort();
      xhrMapRef.current.delete(p.id);
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    updatePending([]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length && activeRoom) stageFiles(files);
  }

  function onPaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.files ?? []);
    if (files.length) { e.preventDefault(); stageFiles(files); }
  }

  async function startVoiceNote() {
    if (!isOnline) { blockOffline(); return; }
    setShowAttachTray(false);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setToast(st.microphone_denied);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4;codecs=mp4a.40.2",
        "audio/mp4",
        "audio/aac",
        "audio/ogg;codecs=opus",
      ].find(type => MediaRecorder.isTypeSupported(type));
      const rec = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current   = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        recStreamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        if (recCancelledRef.current || !mountedRef.current) return; // unmounted: drop, never upload
        const mime = rec.mimeType || chunksRef.current[0]?.type || preferredMime || "application/octet-stream";
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size > 0) {
          const extension =
            mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")
              ? "m4a"
              : mime.includes("ogg")
                ? "ogg"
                : mime.includes("webm")
                  ? "webm"
                  : "audio";
          stageFiles([new File([blob], `voice-note-${Date.now()}.${extension}`, { type: mime })]);
        }
      };
      recStreamRef.current = stream;
      recCancelledRef.current = false;
      rec.start();
      setRecording(true);
    } catch (error) {
      console.warn("[MESSAGERI] Microphone access unavailable:", (error as { name?: string })?.name ?? "unknown");
      setToast(st.microphone_denied);
    }
  }

  function stopVoiceNote(discard = false) {
    recCancelledRef.current = discard;
    recStreamRef.current?.getTracks().forEach(track => track.stop());
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else setRecording(false);
  }

  // A call must take precedence over a voice-note capture. useCall dispatches
  // this event just before it validates the microphone.
  useEffect(() => {
    const stopForCall = () => stopVoiceNote(true);
    window.addEventListener("gdna:voice-note-stop", stopForCall);
    return () => window.removeEventListener("gdna:voice-note-stop", stopForCall);
  });

  function autoGrow() {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  // group messages by day for separators
  const grouped = useMemo(() => {
    const out: { label: string; msgs: DmMessage[] }[] = [];
    let lastKey = "";
    for (const m of messages) {
      const k = dayKey(m.createdAt);
      if (k !== lastKey) { out.push({ label: dayLabel(m.createdAt, lang, st), msgs: [m] }); lastKey = k; }
      else out[out.length - 1].msgs.push(m);
    }
    return out;
  }, [messages, lang]);

  const totalUnread = rooms.reduce((n, r) => n + (r.muted ? 0 : r.unreadCount), 0);

  if (!user) return (
    <div style={{ textAlign: "center", padding: isWidget ? 30 : 60, color: "#444" }} dir={dir}>
      <MessageSquare size={36} style={{ opacity: 0.2, display: "block", margin: "0 auto 12px" }} />
      <p style={{ margin: 0, fontSize: 14 }}>{st.login_required}</p>
    </div>
  );

  const containerHeight =
    variant === "full"     ? (isMobile ? "calc(100dvh - 265px)" : "calc(100dvh - 130px)") :
    variant === "embedded" ? "calc(100dvh - 280px)" : "100%";

  const filteredRooms = rooms.filter(r => getPeerName(r).toLowerCase().includes(roomQuery.toLowerCase()));

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  // ── Composer ─────────────────────────────────────────────────────────────────
  // The + button lives inside the text-input shell (inset-inline-start).
  // Tapping it reveals a compact floating tray with 5 tools above the input.
  // The send button is always visible to the right of the input.
  // While recording a voice note, the send/tray area switches to record controls.

  // composerEl is conditionally replaced by blocked-notice when room is blocked
  const isRoomBlocked = activeRoom?.blockedByMe || activeRoom?.blocked;

  const composerEl = isRoomBlocked ? (
    <div style={{ padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))", background: BG_BAR, borderTop: `1px solid ${GOLD_A(0.063)}`, flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
      <ShieldOff size={15} style={{ color: "#ef4444", flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: 13, color: "#ef4444", fontWeight: 600 }}>{st.blocked_notice ?? "You have blocked this citizen."}</p>
    </div>
  ) : (
    <div style={{ padding: "8px 10px", paddingBottom: "calc(8px + env(safe-area-inset-bottom))", background: BG_BAR, borderTop: `1px solid ${GOLD_A(0.063)}`, flexShrink: 0 }}>
      {peerTyping && <p role="status" className="mb-1 text-xs text-muted-foreground">Typing…</p>}
      {activeRoom?.type === "direct" && <MessengerAssistant key={activeRoom.id}
        messages={messages.filter(message => message.roomId === activeRoom.id)} userId={user.id}
        ownUsername={user.username}
        onDraft={draft => setText(draft)} />}
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-[11px] font-semibold text-muted-foreground">{st.auto_delete}</span>
        <select
          value={expireAfterHours ?? ""}
          onChange={event => setExpireAfterHours(event.target.value ? Number(event.target.value) : null)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
          aria-label={st.auto_delete_duration}
        >
          <option value="">{st.no_auto_delete}</option>
          <option value="1">1 {st.hour}</option>
          <option value="6">6 {st.hours}</option>
          <option value="12">12 {st.hours}</option>
          <option value="24">24 {st.hours}</option>
          <option value="168">1 {st.week}</option>
          <option value="720">1 {st.month}</option>
          <option value="2160">90 {st.days}</option>
        </select>
        <span className="text-[10px] text-muted-foreground">{st.manual_delete_available}</span>
      </div>
      {/* Reply preview bar */}
      {replyTo && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px 8px", borderBottom: `1px solid ${GOLD_A(0.082)}`, marginBottom: 8 }}>
          <CornerUpLeft size={13} style={{ color: GOLD, flexShrink: 0 }} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: GOLD }}>{st.reply_preview ?? "Replying to"} {replyTo.username}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#ffffff55", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {replyTo.type === "audio" ? `🎤 ${st.voice_note}` : replyTo.type === "file" ? `📎 ${st.attach_file}` : (replyTo.content ?? "—")}
            </p>
          </div>
          <button onClick={() => setReplyTo(null)} title={st.cancel_reply ?? "Cancel reply"}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#666", padding: 4, flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}
      {/* Recording indicator */}
      {recording && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px 8px" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
          <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 800 }}>{st.record_voice ?? "Recording…"}</span>
          <button onClick={() => stopVoiceNote(true)}
            style={{ marginInlineStart: "auto", background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 12 }}>
            {st.stop_recording ?? "Discard"}
          </button>
        </div>
      )}

      {showLinkComposer && (
        <div className="mb-2 space-y-2 rounded-xl border border-border bg-card p-3">
          <textarea
            value={linkDraft}
            onChange={event => setLinkDraft(event.target.value)}
            placeholder={st.multiple_links_hint ?? "Paste multiple links, one per line"}
            aria-label={st.multiple_links ?? "Multiple links"}
            dir="auto"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowLinkComposer(false); setLinkDraft(""); }}
              className="rounded-md px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent">
              {st.cancel}
            </button>
            <button type="button" onClick={() => void sendMultipleLinks()} disabled={!linkDraft.trim() || sending || !isOnline}
              className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
              {st.send}
            </button>
          </div>
        </div>
      )}

      {/* Input row: [input-with-plus-inside] [send-or-stop] */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", position: "relative" }} ref={attachTrayRef}>
        {/* Attach tray — floats above the composer when open */}
        <AnimatePresence>
          {showAttachTray && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                insetInlineStart: 0,
                background: "#181818",
                border: `1px solid ${GOLD_A(0.125)}`,
                borderRadius: 14,
                padding: "6px",
                display: "flex",
                flexWrap: "wrap",
                maxWidth: 304,
                gap: 4,
                zIndex: 50,
                boxShadow: "0 8px 28px rgba(0,0,0,0.6)",
              }}>
              {([
                [<ImageIcon key="gallery" size={19} />, st.attach_gallery ?? "Gallery", () => galleryRef.current?.click()],
                [<Camera key="camera" size={19} />, st.attach_camera ?? "Camera", () => cameraRef.current?.click()],
                [<ContactRound key="contact" size={19} />, st.share_contact ?? "Contact", shareDeviceContacts],
                [<MapPin key="location" size={19} />, st.share_location ?? "Location", shareLocation],
                [<Paperclip key="fil" size={19} />, st.attach_file ?? "Files", () => fileRef.current?.click()],
                [<Link2 key="links" size={19} />, st.multiple_links ?? "Links", () => { setShowLinkComposer(true); setShowAttachTray(false); }],
                [<Share2 key="share" size={19} />, st.other_apps ?? "Other apps", () => void shareToOtherApps()],
                [
                  recording ? <Square key="rec" size={17} /> : <Mic key="rec" size={19} />,
                  recording ? (st.stop_recording ?? "Stop") : (st.record_voice ?? "Microphone"),
                  () => recording ? stopVoiceNote() : startVoiceNote(),
                ],
                [<Smile key="emo" size={19} />, st.attach_emoji ?? "Emoji", () => { setShowEmoji(v => !v); setShowAttachTray(false); }],
                [<ClipboardPaste key="paste" size={19} />, "Paste", pasteFromClipboard],
              ] as [React.ReactNode, string, () => void][]).map(([icon, label, fn], idx) => (
                <button
                  key={idx}
                  onClick={fn}
                  title={label}
                  aria-label={label}
                   data-testid={`share-option-${["gallery", "camera", "contact", "location", "files", "links", "other-apps", "voice", "emoji", "paste"][idx]}`}
                   disabled={uploading || !isOnline}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    border: `1px solid ${GOLD_A(0.082)}`,
                    cursor: "pointer",
                    background: (idx === 7 && recording) ? "#ef444420" : GOLD_A(0.063),
                    color: (idx === 7 && recording) ? "#ef4444" : GOLD,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: uploading ? 0.5 : 1,
                    flexShrink: 0,
                  }}>
                  {icon}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text input shell — + button lives on the leading edge inside the border */}
        <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "flex-end" }}>
          {/* + button — inset inside the input shell */}
          <button
            onClick={() => { setShowAttachTray(v => !v); setShowEmoji(false); }}
            aria-label={st.share_options ?? "Share options"}
            data-testid="button-share-options"
            disabled={recording || !isOnline}
            style={{
              position: "absolute",
              insetInlineStart: 8,
              bottom: 9,
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: `1px solid ${GOLD_A(0.188)}`,
              background: showAttachTray ? GOLD_A(0.145) : "#252525",
              color: showAttachTray ? GOLD : "#888",
              cursor: recording ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
              flexShrink: 0,
              transition: "background 0.15s, color 0.15s",
            }}>
            <Plus size={15} style={{ transform: showAttachTray ? "rotate(45deg)" : "none", transition: "transform 0.2s" }} />
          </button>

          <textarea
            ref={textRef}
            value={text}
            rows={1}
            onChange={e => { setText(e.target.value); sendTyping(Boolean(e.target.value)); autoGrow(); }}
            onBlur={() => sendTyping(false)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            onPaste={onPaste}
            onFocus={() => { setTimeout(() => endRef.current?.scrollIntoView({ block: "end" }), 250); setShowAttachTray(false); }}
            placeholder={st.type_message}
            dir="auto"
            disabled={recording || !isOnline}
            style={{
              width: "100%",
              background: "#1c1c1c",
              border: `1px solid ${GOLD_A(0.125)}`,
              borderRadius: 22,
              // Padding-inline-start leaves room for the + button (28px button + 8px gap + 8px padding = 44px)
              paddingTop: 11,
              paddingBottom: 11,
              paddingInlineStart: 46,
              paddingInlineEnd: 16,
              color: "#fff",
              fontSize: 16,
              lineHeight: 1.4,
              outline: "none",
              minWidth: 0,
              resize: "none",
              maxHeight: 120,
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Send button (always visible) or Stop-recording */}
        {recording ? (
          <button
            onClick={() => stopVoiceNote(false)}
            title={st.stop_recording ?? "Stop"}
            style={{ width: 46, height: 46, borderRadius: "50%", background: "#ef4444", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Square size={18} />
          </button>
        ) : (
          <button
            onClick={() => {
              if (pending.length > 0) confirmPending();
              else sendMessage();
            }}
            disabled={(!text.trim() && pending.length === 0) || sending || !isOnline}
            title={st.send}
            style={{ width: 46, height: 46, borderRadius: "50%", background: (text.trim() || pending.length > 0) ? GOLD : "#1c1c1c", border: "none", color: (text.trim() || pending.length > 0) ? "#000" : "#555", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Send size={20} style={dir === "rtl" ? { transform: "scaleX(-1)" } : undefined} />
          </button>
        )}
      </div>

      {/* Emoji panel (shown below the input row) */}
      {showEmoji && (
        <div style={{ background: BG_BAR, marginTop: 8 }}>
          <div style={{ display: "flex", gap: 4, padding: "4px 4px 0" }}>
            {EMOJI_GROUPS.map(([icon], i) => (
              <button key={icon} onClick={() => setEmojiGroup(i)}
                style={{ background: emojiGroup === i ? GOLD_A(0.145) : "none", border: "none", fontSize: 17, cursor: "pointer", padding: "4px 10px", borderRadius: 6, lineHeight: 1 }}>
                {icon}
              </button>
            ))}
            <button onClick={() => setShowEmoji(false)} style={{ marginInlineStart: "auto", background: "none", border: "none", cursor: "pointer", color: "#666", padding: "4px 6px" }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ padding: "6px 4px 8px", display: "flex", flexWrap: "wrap", gap: 2, maxHeight: 140, overflowY: "auto" }}>
            {EMOJI_GROUPS[emojiGroup][1].map(e => (
              <button key={e} onClick={() => { setText(t => t + e); autoGrow(); }}
                style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", padding: 4, lineHeight: 1 }}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Chat page (full screen when open) ───────────────────────────────────────
  const chatPage = activeRoom && (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      dir={dir}
      style={variant === "full"
        ? { position: "fixed", inset: 0, height: "100dvh", zIndex: 1200, display: "flex", flexDirection: "column", background: BG_CHAT, overflow: "hidden", overscrollBehavior: "none" }
        : { position: "absolute", inset: 0, zIndex: 30, display: "flex", flexDirection: "column", background: BG_CHAT, overflow: "hidden" }}>
      {/* Drag overlay */}
      {dragOver && (
        <div style={{ position: "absolute", inset: 0, background: "#000000cc", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
          <Paperclip size={40} style={{ color: GOLD, opacity: 0.8 }} />
          <p style={{ margin: 0, color: GOLD, fontWeight: 800, fontSize: 15 }}>{st.drop_to_attach}</p>
        </div>
      )}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel st={st} activeRoom={activeRoom} onClose={() => setShowSettings(false)}
            isOnline={isOnline} onOffline={blockOffline}
            notificationPermission={callExtras.notificationPermission}
            firebaseStatus={callExtras.firebaseStatus}
            pushEnabled={callExtras.pushEnabled}
            pushReason={callExtras.pushReason}
            enableCallNotifications={callExtras.enableCallNotifications}
            secureDeviceCapacityBlocked={e2eCapacityBlocked}
            retrySecureDeviceRegistration={retryE2eRegistration}
            currentUserId={user?.id}
            onMuteChanged={(roomId, muted) => {
              setRooms(prev => prev.map(r => r.id === roomId ? { ...r, muted } : r));
              setActiveRoom(prev => prev && prev.id === roomId ? { ...prev, muted } : prev);
              loadRooms();
            }}
            onRoomDeleted={removeRoomFromAllSurfaces}
            showToast={setToast}
            onBlockChanged={async (roomId, blocked) => {
              setActiveRoom(prev => prev && prev.id === roomId ? { ...prev, blockedByMe: blocked } : prev);
              const refreshedRooms = await loadRooms();
              const refreshedRoom = refreshedRooms.find(room => room.id === roomId);
              if (refreshedRoom) {
                setActiveRoom(prev => prev && prev.id === roomId
                  ? { ...prev, ...refreshedRoom }
                  : prev);
              }
            }} />
        )}
      </AnimatePresence>

      {/* ── Header: back + avatar + name + solidarity status + call buttons ── */}
      {(() => {
        const peerMember = activeRoom.type === "direct"
          ? activeRoom.members.find(m => m.username !== user.username)
          : undefined;
        const solStatus = peerMember?.solidarityStatusVisible !== false ? peerMember?.solidarityStatus : null;
        const statusColor = solStatus
          ? (SOLIDARITY_STATUS_COLORS[solStatus] ?? "#6b7280")
          : (call.onlineUsers.includes(getPeerName(activeRoom)) ? "#22c55e" : "#ffffff40");
        return (
          <>
          <div style={{ padding: "10px 12px", paddingTop: "calc(10px + env(safe-area-inset-top))", background: BG_BAR, borderBottom: `1px solid ${GOLD_A(0.071)}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <button onClick={() => { stopVoiceNote(true); activeRoomIdRef.current = null; setActiveRoom(null); onActiveRoomChange?.(null); setShowEmoji(false); setShowAttachTray(false); setReplyTo(null); }} title={st.back ?? "Back"}
              style={{ width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer", background: "transparent", color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <BackArrow size={22} />
            </button>
            <div
              role={activeRoom.type === "direct" ? "button" : undefined}
              tabIndex={activeRoom.type === "direct" ? 0 : undefined}
              aria-label={activeRoom.type === "direct" ? `${getPeerName(activeRoom)} — عرض البطاقة` : undefined}
              data-testid={activeRoom.type === "direct" ? "open-active-citizen-card" : undefined}
              onClick={activeRoom.type === "direct" ? () => setDrawerUsername(getPeerName(activeRoom)) : undefined}
              onKeyDown={activeRoom.type === "direct" ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setDrawerUsername(getPeerName(activeRoom));
                }
              } : undefined}
              style={{ position: "relative", flexShrink: 0, cursor: activeRoom.type === "direct" ? "pointer" : "default" }}
            >
              <Avatar name={getPeerName(activeRoom)} size={40} />
              {(solStatus || call.onlineUsers.includes(getPeerName(activeRoom))) && (
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, background: statusColor, borderRadius: "50%", border: "2px solid #000" }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: 16, display: "flex", alignItems: "center", gap: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {getPeerName(activeRoom)}
                {activeRoom.muted && <BellOff size={13} style={{ color: "#666", flexShrink: 0 }} />}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: statusColor, overflow: "hidden", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                <Lock size={10} aria-hidden="true" style={{ color: e2eReady ? GOLD : "#666", flexShrink: 0 }} />
                <span>
                  {e2eReady
                    ? (st.end_to_end_short ?? "E2E secured")
                    : (st.secure_key_loading ?? "Securing…")}
                  {" · "}
                  {activeRoom.type === "direct"
                    ? (solStatus
                      ? solidarityStatusLabel(solStatus, st)
                      : (call.onlineUsers.includes(getPeerName(activeRoom)) ? `● ${st.online}` : st.offline))
                    : (st.groups ?? "Group")}
                </span>
              </p>
            </div>
            {/* Suppress call controls whenever the room is blocked in EITHER direction.
                The server is the security boundary; this only hides affordances. */}
            {activeRoom.type === "direct" && !activeRoom.blocked && !activeRoom.blockedByMe && (
              <>
                <button onClick={() => startDirectCall(getPeerName(activeRoom), true)} disabled={!isOnline || groupCall.busy} title={st.video_call}
                  style={{ width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", background: "transparent", color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Video size={21} />
                </button>
                <button onClick={() => startDirectCall(getPeerName(activeRoom), false)} disabled={!isOnline || groupCall.busy} title={st.voice_call}
                  style={{ width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", background: "transparent", color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Phone size={20} />
                </button>
              </>
            )}
            {activeRoom.type === "group" && (
              <>
                <button
                  type="button"
                  onClick={() => void groupCall.startCall(activeRoom.id, "video")}
                  disabled={!isOnline || groupCall.busy || call.callStatus !== "idle"}
                  title="Start group video call"
                  aria-label="Start group video call"
                  style={{ width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", background: "transparent", color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: (!isOnline || groupCall.busy || call.callStatus !== "idle") ? 0.5 : 1 }}
                >
                  <Video size={21} />
                </button>
                <button
                  type="button"
                  onClick={() => void groupCall.startCall(activeRoom.id, "audio")}
                  disabled={!isOnline || groupCall.busy || call.callStatus !== "idle"}
                  title="Start group voice call"
                  aria-label="Start group voice call"
                  style={{ width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", background: "transparent", color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: (!isOnline || groupCall.busy || call.callStatus !== "idle") ? 0.5 : 1 }}
                >
                  <Phone size={20} />
                </button>
              </>
            )}
            <button onClick={() => setShowSettings(true)} title={st.msg_settings ?? "Settings"}
              style={{ width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer", background: "transparent", color: "#999", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MoreVertical size={20} />
            </button>
          </div>
          {e2eTerminalError?.code === SECURE_DEVICE_IDENTITY_CONFLICT_CODE && (
            <div role="alert" data-testid="secure-device-identity-conflict"
              className="w-full border-b border-destructive-border bg-destructive/10 px-3 py-2 text-start text-xs font-semibold text-destructive">
              {e2eTerminalError.message}
            </div>
          )}
          {e2eCapacityBlocked && (
            <button
              type="button"
              data-testid="open-secure-device-recovery"
              onClick={() => {
                activeRoomIdRef.current = null;
                setActiveRoom(null);
                setTab("settings");
              }}
              className="w-full border-0 border-b border-destructive-border bg-destructive/10 px-3 py-2 text-start text-xs font-semibold text-destructive"
            >
              {SECURE_DEVICE_CAPACITY_MESSAGE} — إدارة الأجهزة · Gérer les appareils
            </button>
          )}
          </>
        );
      })()}

      {/* ── Blocked notice ── */}
      {activeRoom.blockedByMe && (
        <div style={{ background: "#1a1a1a", borderBottom: `1px solid ${GOLD_A(0.063)}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldOff size={14} style={{ color: "#ef4444", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{st.blocked_notice ?? "You have blocked this citizen."}</p>
        </div>
      )}

      {/* ── Messages with date separators ── */}
      <div ref={messageScroller}
        onScroll={e => { const el = e.currentTarget; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        style={{ flex: 1, overflowY: "auto", overflowAnchor: "none", overscrollBehavior: "contain", padding: "12px 12px 4px", display: "flex", flexDirection: "column", gap: 4, WebkitOverflowScrolling: "touch" }}
        onClick={() => { setMenuMsgId(null); setShowAttachTray(false); }}>
        {historyCursor && <Button variant="ghost" disabled={loadingHistory || !isOnline} onClick={() => void loadOlderMessages()}>
          {lang === "ar" ? (loadingHistory ? "جارٍ التحميل…" : historyError ? "تعذر التحميل — إعادة المحاولة" : "تحميل الرسائل الأقدم")
            : lang === "fr" ? (loadingHistory ? "Chargement…" : historyError ? "Réessayer" : "Messages plus anciens")
            : lang === "es" ? (loadingHistory ? "Cargando…" : historyError ? "Reintentar" : "Mensajes anteriores")
            : lang === "de" ? (loadingHistory ? "Laden…" : historyError ? "Erneut versuchen" : "Ältere Nachrichten laden")
            : (loadingHistory ? "Loading…" : historyError ? "Retry loading older messages" : "Load older messages")}
        </Button>}
        {grouped.map(group => (
          <div key={group.label + group.msgs[0]?.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ alignSelf: "center", background: "#1a1a1a", color: "#aaa", fontSize: 11.5, fontWeight: 700, borderRadius: 8, padding: "4px 12px", margin: "8px 0" }}>
              {group.label}
            </div>
            {group.msgs.map(msg => {
              const mine = msg.username === user.username;
              const seen = mine && activeRoom.members.some(member =>
                member.userId !== user.id &&
                member.lastReadAt != null &&
                new Date(member.lastReadAt).getTime() >= new Date(msg.createdAt).getTime());
              const hasReactions = msg.reactions && (msg.reactions.support + msg.reactions.listen + msg.reactions.celebrate) > 0;
              return (
                <div key={msg.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6, position: "relative" }}>
                  <div style={{ maxWidth: "78%", background: mine ? GOLD : BUBBLE_OTHER, borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "8px 12px 6px", userSelect: "text", WebkitUserSelect: "text", position: "relative", boxShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
                    {!mine && activeRoom.type === "group" && <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 800, color: GOLD }}>{msg.username}</p>}
                    {/* Reply preview bubble */}
                    {msg.replyTo && (
                      <div style={{ background: mine ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.07)", borderInlineStart: `3px solid ${mine ? "#000" : GOLD}`, borderRadius: 6, padding: "4px 8px", marginBottom: 6 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: mine ? "#000000aa" : GOLD }}>{msg.replyTo.username}</p>
                        <p style={{ margin: 0, fontSize: 12, color: mine ? "#000000aa" : "#ffffff55", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                      {msg.replyTo.type === "audio" ? `🎤 ${st.voice_note}` : msg.replyTo.type === "file" ? `📎 ${st.attach_file}` : (msg.replyTo.content ?? "—")}
                        </p>
                      </div>
                    )}
                    {msg.secureAttachment && msg.fileUrl ? (
                      <SecureAttachment url={msg.fileUrl} metadata={msg.secureAttachment} mine={mine} />
                    ) : msg.type === "audio" && msg.audioUrl ? (
                      <audio controls preload="metadata" src={resolveUrl(msg.audioUrl)} style={{ width: "min(220px, 100%)", height: 38 }} />
                    ) : msg.type === "video" && msg.videoUrl ? (
                      <video controls src={resolveUrl(msg.videoUrl)} style={{ maxWidth: 240, maxHeight: 240, borderRadius: 8, display: "block" }} />
                    ) : msg.type === "file" && msg.fileUrl && msg.content?.startsWith("📁") ? (
                      <a href={resolveUrl(msg.fileUrl)} target="_blank" rel="noreferrer"
                        style={{ color: mine ? "#000" : GOLD, fontSize: 14, fontWeight: 700, wordBreak: "break-word" }}>
                        {msg.content}
                      </a>
                    ) : msg.type === "file" && msg.fileUrl ? (
                      <img src={resolveUrl(msg.fileUrl)} alt={st.attachment} style={{ maxWidth: 220, maxHeight: 220, borderRadius: 8, display: "block" }}
                        onError={e => { (e.target as HTMLImageElement).alt = st.image_unavailable ?? "Image unavailable"; }} />
                    ) : (
                      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: mine ? "#000" : "#eaeaea", wordBreak: "break-word", whiteSpace: "pre-wrap" }} dir="auto">{msg.content}</p>
                    )}
                    <p style={{ margin: "3px 0 0", fontSize: 10.5, color: mine ? "#00000060" : "#ffffff35", textAlign: "end" }}>
                      {clockTime(msg.createdAt, lang)}
                      {seen && <span aria-label={st.seen ?? "Seen"} title={st.seen ?? "Seen"} style={{ marginInlineStart: 5, fontSize: 12, fontWeight: 900, letterSpacing: -1 }}>✓✓</span>}
                    </p>
                    {/* Reactions row */}
                    {hasReactions && (
                      <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                        {msg.reactions!.support > 0 && (
                          <span
                            onClick={e => { e.stopPropagation(); sendReaction(msg, "support"); }}
                            style={{ display: "flex", alignItems: "center", gap: 3, background: msg.myReaction === "support" ? GOLD_A(0.188) : "rgba(255,255,255,0.1)", borderRadius: 10, padding: "2px 7px", cursor: "pointer", fontSize: 11, color: mine ? "#000000aa" : "#fff" }}>
                            <HandHeart size={10} /> {msg.reactions!.support}
                          </span>
                        )}
                        {msg.reactions!.listen > 0 && (
                          <span
                            onClick={e => { e.stopPropagation(); sendReaction(msg, "listen"); }}
                            style={{ display: "flex", alignItems: "center", gap: 3, background: msg.myReaction === "listen" ? "#3b82f630" : "rgba(255,255,255,0.1)", borderRadius: 10, padding: "2px 7px", cursor: "pointer", fontSize: 11, color: mine ? "#000000aa" : "#fff" }}>
                            <Ear size={10} /> {msg.reactions!.listen}
                          </span>
                        )}
                        {msg.reactions!.celebrate > 0 && (
                          <span
                            onClick={e => { e.stopPropagation(); sendReaction(msg, "celebrate"); }}
                            style={{ display: "flex", alignItems: "center", gap: 3, background: msg.myReaction === "celebrate" ? "#22c55e30" : "rgba(255,255,255,0.1)", borderRadius: 10, padding: "2px 7px", cursor: "pointer", fontSize: 11, color: mine ? "#000000aa" : "#fff" }}>
                            <PartyPopper size={10} /> {msg.reactions!.celebrate}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); setMenuMsgId(v => v === msg.id ? null : msg.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: 2, alignSelf: "center", flexShrink: 0 }}>
                    <MoreVertical size={14} />
                  </button>
                  {menuMsgId === msg.id && (
                    <div onClick={e => e.stopPropagation()}
                      className="absolute bottom-full z-30 min-w-[150px] overflow-hidden rounded-md border border-border bg-popover shadow-lg"
                      style={{ insetInlineEnd: mine ? 0 : "auto", insetInlineStart: mine ? "auto" : 8 }}>
                      {/* Reply */}
                      <button onClick={() => startReply(msg)}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs font-semibold text-popover-foreground hover:bg-accent">
                        <CornerUpLeft size={12} /> {st.reply ?? "Reply"}
                      </button>
                      {/* Reactions */}
                      <button onClick={() => sendReaction(msg, "support")}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs font-semibold text-popover-foreground hover:bg-accent">
                        <HandHeart size={12} /> {st.react_support ?? "Support"}
                        {msg.myReaction === "support" && <span className="ml-auto text-[10px] text-muted-foreground">✓</span>}
                      </button>
                      <button onClick={() => sendReaction(msg, "listen")}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs font-semibold text-popover-foreground hover:bg-accent">
                        <Ear size={12} /> {st.react_listen ?? "Listen"}
                        {msg.myReaction === "listen" && <span className="ml-auto text-[10px] text-muted-foreground">✓</span>}
                      </button>
                      <button onClick={() => sendReaction(msg, "celebrate")}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs font-semibold text-popover-foreground hover:bg-accent">
                        <PartyPopper size={12} /> {st.react_celebrate ?? "Celebrate"}
                        {msg.myReaction === "celebrate" && <span className="ml-auto text-[10px] text-muted-foreground">✓</span>}
                      </button>
                      <div className="border-t border-border/40" />
                      {(msg.content || msg.fileUrl || msg.audioUrl) && (
                        <button onClick={() => copyMessage(msg)}
                          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs font-semibold text-popover-foreground hover:bg-accent">
                          <Copy size={12} /> {st.copy_msg ?? "Copy"}
                        </button>
                      )}
                      {mine && (
                        <button onClick={() => deleteMessage(msg.id)}
                          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs font-semibold text-destructive hover:bg-accent">
                          <Trash2 size={12} /> حذف عند الطرفين
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* ── Attachment preview strip (multi-file, per-file progress + individual cancel) ── */}
      <MessageInputBoundary>
      {pending.length > 0 && (
        <div style={{ padding: "10px 14px", background: BG_BAR, borderTop: `1px solid ${GOLD_A(0.063)}`, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {pending.map(p => (
              <div key={p.id} style={{ position: "relative", flexShrink: 0, width: 96 }}>
                <div style={{ width: 96, height: 96, borderRadius: 8, overflow: "hidden", border: `1px solid ${p.status === "error" ? "#ef4444" : GOLD_A(0.188)}`, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {p.previewUrl && p.file.type.startsWith("image/") ? (
                    <img src={p.previewUrl} alt={p.file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : p.previewUrl && p.file.type.startsWith("video/") ? (
                    <video src={p.previewUrl} preload="metadata" playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                  ) : p.previewUrl && p.file.type.startsWith("audio/") ? (
                    <audio controls src={p.previewUrl} style={{ width: 88, height: 34 }} />
                  ) : (
                    <div style={{ fontSize: 11, color: "#ddd", padding: 6, textAlign: "center", overflow: "hidden", wordBreak: "break-all" }}>
                      <Paperclip size={20} style={{ color: GOLD, display: "block", margin: "0 auto 4px" }} />
                      {p.file.name.slice(0, 24)}
                    </div>
                  )}
                  {p.status === "uploading" && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8 }}>
                      <span style={{ color: GOLD, fontSize: 13, fontWeight: 800 }}>{p.progress}%</span>
                      <div style={{ width: 64, height: 4, borderRadius: 2, background: "#333" }}>
                        <div style={{ width: `${p.progress}%`, height: "100%", borderRadius: 2, background: GOLD, transition: "width .2s" }} />
                      </div>
                    </div>
                  )}
                  {p.status === "error" && (
                    <div role="alert" title={p.error ?? st.upload_failed} className="absolute inset-0 flex items-center justify-center overflow-auto rounded-lg bg-background/90 p-1 text-xs font-semibold text-destructive">
                      {p.error ?? st.upload_failed}
                    </div>
                  )}
                </div>
                {/* Remove/cancel — always available; aborts XHR if in-flight */}
                <button
                  onClick={() => removePending(p.id)}
                  title={p.status === "uploading" ? (st.cancel_upload ?? "Cancel upload") : (st.remove ?? "Remove")}
                  aria-label={p.status === "uploading" ? (st.cancel_upload ?? "Cancel upload") : (st.remove ?? "Remove")}
                  style={{ position: "absolute", top: -6, insetInlineEnd: -6, width: 22, height: 22, borderRadius: "50%", background: "#1a1a1a", border: `1px solid ${p.status === "uploading" ? "#ef4444" : GOLD_A(0.188)}`, color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                  <X size={12} />
                </button>
                <div style={{ fontSize: 10, color: "#888", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.file.name} · {(p.file.size / 1024 / 1024).toFixed(1)}MB
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            <div style={{ flex: 1, fontSize: 12, color: uploading ? GOLD : "#888" }}>
              {uploading
                ? `${st.uploading ?? "Uploading…"} (${pending.findIndex(p => p.status === "uploading") + 1}/${pending.length})`
                : `${pending.length} file${pending.length !== 1 ? "s" : ""} ready`}
            </div>
            <button type="button" onClick={() => void confirmPending()} disabled={!isOnline || uploading || pending.every(p => p.status === "uploading")} title={st.send}
              style={{ width: 42, height: 42, borderRadius: "50%", background: uploading ? "#1c1c1c" : GOLD, border: "none", color: uploading ? "#555" : "#000", cursor: uploading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Send size={18} />
            </button>
            <button type="button" onClick={cancelPending} title={st.cancel_all ?? "Cancel all"} aria-label={st.cancel_all ?? "Cancel all"}
              style={{ width: 34, height: 34, borderRadius: "50%", background: "#1a1a1a", border: "none", color: "#ef4444", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Hidden pickers */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={onPickFile} />
      <input ref={galleryRef} data-testid="messenger-gallery-input" type="file" multiple accept="image/*,video/*" style={{ display: "none" }} onChange={onPickFile} />
      <input ref={fileRef}    type="file" multiple accept="image/*,video/*,audio/*,.pdf,.txt,.zip,.doc,.docx,.xls,.xlsx" style={{ display: "none" }} onChange={onPickFile} />

      {/* ── Composer ── */}
      {composerEl}
      </MessageInputBoundary>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div dir={dir} style={{ position: "relative", height: containerHeight, minHeight: isWidget ? 0 : 440, display: "flex", flexDirection: "column", background: BG, borderRadius: isWidget ? 0 : 14, overflow: "hidden", border: isWidget ? "none" : `1px solid ${GOLD_A(0.071)}`, maxWidth: variant === "full" ? 860 : undefined, margin: variant === "full" ? "0 auto" : undefined, width: "100%", overscrollBehavior: "none" }}>

        {/* ── Top bar ── */}
        <div style={{ padding: "12px 16px", background: BG_BAR, borderBottom: `1px solid ${GOLD_A(0.071)}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <p style={{ margin: 0, fontWeight: 900, color: GOLD, fontSize: 17, flex: 1, letterSpacing: 0.5 }}>{st.messageri ?? "Messenger"}</p>
          <button onClick={() => { setTab("settings"); activeRoomIdRef.current = null; setActiveRoom(null); }} title={st.nav_settings ?? "Settings"}
            data-testid="button-open-settings"
            style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", background: tab === "settings" ? GOLD_A(0.094) : "transparent", color: tab === "settings" ? GOLD : "#999", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Settings size={18} />
          </button>
        </div>

        {/* ── Tab content (swipeable between adjacent destinations) ── */}
        <div
          role="tabpanel"
          id={`amis-panel-${tab}`}
          aria-labelledby={`amis-tab-${tab}`}
          data-testid={`amis-panel-${tab}`}
          onTouchStart={onSwipeTouchStart}
          onTouchMove={onSwipeTouchMove}
          onTouchEnd={onSwipeTouchEnd}
          onTouchCancel={() => { swipeRef.current.active = false; }}
          style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}
        >
        {tab === "chats" && (
          <>
            <div style={{ padding: "10px 14px 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <Search size={15} style={{ position: "absolute", top: 12, insetInlineStart: 12, color: "#555" }} />
                  <input value={roomQuery} onChange={e => setRoomQuery(e.target.value)} placeholder={st.search_contacts ?? "Search…"} dir="auto"
                    style={{ width: "100%", boxSizing: "border-box", background: "#161616", border: `1px solid ${GOLD_A(0.082)}`, borderRadius: 12, padding: "10px 12px", paddingInlineStart: 36, color: "#fff", fontSize: 15, outline: "none" }} />
                </div>
                <button
                  type="button"
                  onClick={() => isOnline ? setShowContacts("dm") : blockOffline()}
                  disabled={!isOnline}
                  title={st.choose_contact ?? "Choose contact"}
                  aria-label={st.choose_contact ?? "Choose contact"}
                  data-testid="button-choose-contact"
                  style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, border: `1px solid ${GOLD_A(0.188)}`, background: GOLD_A(0.094), color: GOLD, cursor: isOnline ? "pointer" : "not-allowed", opacity: isOnline ? 1 : 0.45, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <ContactRound size={21} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 80px" }}>
              {filteredRooms.length === 0 && (
                <p style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 32 }}>{st.no_messages}</p>
              )}
              {filteredRooms.map(room => {
                const peerName = getPeerName(room);
                const isOnline = room.type === "direct" && call.onlineUsers.includes(peerName);
                const isDirect = room.type === "direct";
                // For direct rooms, tapping the avatar/name opens the citizen
                // drawer on the same page; tapping the row body opens the room.
                const openCard = (event: React.MouseEvent) => {
                  event.stopPropagation();
                  if (isDirect) setDrawerUsername(peerName);
                  else openRoom(room);
                };
                return (
                  <button key={room.id} onClick={() => openRoom(room)}
                    style={{ textAlign: "start", padding: "11px 10px", borderRadius: 12, border: "none", cursor: "pointer", background: "transparent", display: "flex", gap: 12, alignItems: "center", width: "100%", borderBottom: "1px solid #ffffff06" }}>
                    <span
                      role={isDirect ? "button" : undefined}
                      tabIndex={isDirect ? 0 : undefined}
                      onClick={isDirect ? openCard : undefined}
                      onKeyDown={isDirect ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openCard(event as unknown as React.MouseEvent); } } : undefined}
                      aria-label={isDirect ? `${peerName} — عرض البطاقة` : undefined}
                      data-testid={isDirect ? `open-citizen-card-${peerName}` : undefined}
                      style={{ position: "relative", flexShrink: 0, cursor: isDirect ? "pointer" : "inherit", display: "inline-flex" }}
                    >
                      {room.type === "group"
                        ? <div style={{ width: 48, height: 48, background: "#222", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><Users size={22} style={{ color: "#666" }} /></div>
                        : <Avatar name={peerName} size={48} />
                      }
                      {isOnline && (
                        <div style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, background: "#22c55e", borderRadius: "50%", border: "2px solid #000" }} />
                      )}
                    </span>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <p
                          onClick={isDirect ? openCard : undefined}
                          style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: 15.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, cursor: isDirect ? "pointer" : "inherit" }}
                        >
                          {peerName}
                          {room.muted && <BellOff size={12} style={{ color: "#666", flexShrink: 0 }} />}
                        </p>
                        {room.lastMessage && (
                          <span style={{ fontSize: 11.5, color: room.unreadCount > 0 && !room.muted ? GOLD : "#ffffff30", flexShrink: 0, fontWeight: room.unreadCount > 0 ? 800 : 400 }}>
                            {timeAgo(room.lastMessage.createdAt ?? "", st, getMessengerIntlLocale(lang))}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <p style={{ margin: 0, color: "#ffffff45", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir="auto">
                          {room.lastMessage
                            ? (room.lastMessage.type === "audio" ? st.voice_note : room.lastMessage.type === "file" ? st.attach_image : room.lastMessage.type === "video" ? st.call_video : room.lastMessage.content)
                            : "—"}
                        </p>
                        {room.unreadCount > 0 && !room.muted && (
                          <span style={{ background: GOLD, color: "#000", borderRadius: 10, minWidth: 20, textAlign: "center", padding: "2px 6px", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
                            {room.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* FAB: new chat */}
            <button onClick={() => isOnline ? setShowContacts("dm") : blockOffline()} disabled={!isOnline}
              title={st.choose_contact ?? st.new_chat}
              aria-label={st.choose_contact ?? st.new_chat}
              style={{ position: "absolute", bottom: 18, insetInlineEnd: 18, width: 54, height: 54, borderRadius: 16, background: GOLD, border: "none", color: "#000", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.5)", zIndex: 20 }}>
              <ContactRound size={23} />
            </button>
          </>
        )}

        {tab === "calls" && (
          <AppelsTab
            st={st}
            lang={lang}
            user={user}
            onNewCall={() => setShowContacts("call")}
            onCallBack={missedCall => {
              startDirectCall(missedCall.caller.name, missedCall.type === "video");
            }}
            connectionTest={call.connectionTest}
            onTestConnection={call.testConnection}
            isOnline={isOnline}
            onOffline={blockOffline}
            callActive={groupCall.busy || call.callStatus === "active" || call.callStatus === "calling" || call.callStatus === "ringing"}
            callExtras={callExtras}
            tabActive={tab === "calls"}
          />
        )}

        {tab === "communities" && (
          <>
            {showGroupNew && (
              <div className="m-3 rounded-lg border border-border bg-card p-3">
                <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder={st.group_name} dir="auto" className="h-10 text-sm" />
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="h-9 flex-1 text-xs" disabled={!isOnline} onClick={createGroup}>{st.create_group}</Button>
                  <Button size="sm" variant="secondary" className="h-9 px-3" onClick={() => { setShowGroupNew(false); setGroupName(""); }}>
                    <X size={13} />
                  </Button>
                </div>
              </div>
            )}
            <CommunautesTab st={st} myRoomIds={new Set(rooms.map(r => r.id))}
              onJoined={roomId => { setTab("chats"); openRoomById(roomId); }}
              onOpen={roomId => { setTab("chats"); openRoomById(roomId); }}
              onCreate={() => setShowGroupNew(true)}
              onViewRelay={(roomId, roomName) => {
                // Solidarity Relay opens INSIDE Communities — never a hidden 5th tab.
                setRelayRoomId(roomId ?? null);
                setRelayRoomName(roomName ?? null);
                setShowRelay(true);
              }}
              isOnline={isOnline}
              onOffline={blockOffline} />
            {/* Solidarity Relay lives inside the Communities destination */}
            <AnimatePresence>
              {showRelay && (
                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  data-no-swipe="true"
                  data-testid="communities-relay-panel"
                  style={{ position: "absolute", inset: 0, background: BG, zIndex: 40, display: "flex", flexDirection: "column", overflow: "hidden" }}
                >
                  <div style={{ padding: "14px 16px", background: BG_BAR, borderBottom: `1px solid ${GOLD_A(0.071)}`, display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => { setShowRelay(false); setRelayRoomId(null); setRelayRoomName(null); }}
                      title={st.back ?? "Back"} data-testid="button-relay-back"
                      style={{ background: "none", border: "none", cursor: "pointer", color: GOLD, padding: 4, display: "flex" }}>
                      <BackArrow size={20} />
                    </button>
                    <HandHeart size={16} style={{ color: GOLD }} />
                    <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: 15, flex: 1 }}>{st.relay_title ?? "Solidarity Relay"}</p>
                  </div>
                  <SolidarityRelay
                    st={{ ...st }}
                    currentUserId={user.id}
                    lang={lang}
                    activeRoomId={relayRoomId}
                    activeRoomName={relayRoomName}
                    onClearRoom={() => { setRelayRoomId(null); setRelayRoomName(null); }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {tab === "settings" && (
          <SettingsPanel
            st={st}
            activeRoom={null}
            inline
            onClose={() => {}}
            currentUserId={user?.id}
            onMuteChanged={() => loadRooms()}
            onRoomDeleted={removeRoomFromAllSurfaces}
            showToast={setToast}
            isOnline={isOnline}
            onOffline={blockOffline}
            notificationPermission={callExtras.notificationPermission}
            firebaseStatus={callExtras.firebaseStatus}
            pushEnabled={callExtras.pushEnabled}
            pushReason={callExtras.pushReason}
            enableCallNotifications={callExtras.enableCallNotifications}
            secureDeviceCapacityBlocked={e2eCapacityBlocked}
            retrySecureDeviceRegistration={retryE2eRegistration}
          />
        )}

        </div>{/* end swipeable tab content */}

        {/* ── Fixed bottom destination bar (accessible tabs) ── */}
        <div role="tablist" aria-label={st.amis_destinations ?? "AMIS destinations"} data-testid="amis-tabbar"
          style={{ display: "flex", background: BG_BAR, borderTop: `1px solid ${GOLD_A(0.082)}`, flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {TAB_ORDER.map(k => {
            const active = tab === k;
            const Icon = k === "chats" ? MessageSquare : k === "calls" ? Phone : k === "communities" ? Users : Settings;
            const label = st[TAB_I18N_KEYS[k]] ?? TAB_LABELS[k];
            return (
              <button key={k}
                role="tab"
                id={`amis-tab-${k}`}
                aria-selected={active}
                aria-controls={`amis-panel-${k}`}
                tabIndex={active ? 0 : -1}
                data-testid={`amis-tab-${k}`}
                onKeyDown={event => onTabKeyDown(event, k)}
                onClick={() => { setTab(k); activeRoomIdRef.current = null; setActiveRoom(null); onActiveRoomChange?.(null); }}
                style={{ flex: 1, padding: "9px 0 7px", border: "none", cursor: "pointer", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, position: "relative" }}>
                <div style={{ position: "relative" }}>
                  <Icon size={21} style={{ color: active ? GOLD : "#777" }} />
                  {k === "chats" && totalUnread > 0 && (
                    <span style={{ position: "absolute", top: -5, insetInlineEnd: -9, background: GOLD, color: "#000", borderRadius: 9, minWidth: 16, textAlign: "center", fontSize: 9.5, fontWeight: 900, padding: "1px 4px" }}>
                      {totalUnread}
                    </span>
                  )}
                  {k === "calls" && callExtras.missedCallCount > 0 && (
                    <span
                      data-testid="nav-calls-unread-badge"
                      aria-label={`${callExtras.missedCallCount}`}
                      style={{ position: "absolute", top: -5, insetInlineEnd: -9, background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))", borderRadius: 9, minWidth: 16, textAlign: "center", fontSize: 9.5, fontWeight: 900, padding: "1px 4px" }}
                    >
                      {callExtras.missedCallCount}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 10.5, fontWeight: active ? 900 : 600, color: active ? GOLD : "#777" }}>{label}</span>
                {active && <div style={{ position: "absolute", top: 0, left: "25%", right: "25%", height: 2.5, background: GOLD, borderRadius: 2 }} />}
              </button>
            );
          })}
        </div>

        {/* ── Overlays over list view ── */}
        <AnimatePresence>
          {showContacts && (
            <ContactsPanel st={st} user={user}
              title={showContacts === "call" ? (st.voice_call ?? "New call") : (st.dm ?? "New chat")}
              callMode={showContacts === "call"}
              onClose={() => setShowContacts(false)}
              onDm={openDmWith}
              onCall={startDirectCall}
              isOnline={isOnline}
              onOffline={blockOffline} />
          )}
        </AnimatePresence>

        {/* ── Chat page (widget/embedded: overlays container) ── */}
        {variant !== "full" && chatPage}
      </div>

      {/* Chat page for the full variant: portaled to <body> so it is a TRUE
          fullscreen page — no ancestor transform can trap position:fixed,
          and the site navbar stays underneath (zIndex 1200 > navbar z-50). */}
      {variant === "full" && chatPage && createPortal(chatPage, document.body)}

      {/* Citizen card drawer opened from a conversation row — same page, no route
          navigation. Its "message" action opens the existing conversation. */}
      <MessengerCitizenDrawer
        username={drawerUsername}
        onClose={() => setDrawerUsername(null)}
        onMessage={(citizen: CitizenProfile) => { setDrawerUsername(null); void openDmWith(citizen.username); }}
      />

      <AnimatePresence>
        {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      </AnimatePresence>
    </>
  );
}
