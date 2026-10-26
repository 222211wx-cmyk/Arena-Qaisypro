import { STANDALONE_MODE } from "@/lib/mockData";
// ══════════════════════════════════════════════════════════════════════════════
//  useCall — authenticated WebSocket signaling + Agora/WebRTC media.
//  Agora invitations publish a null offer and open media only after durable
//  signaling gates; the relay-only WebRTC branch remains for compatibility.
// ══════════════════════════════════════════════════════════════════════════════

import { useRef, useState, useEffect, useCallback } from "react";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
  ICameraVideoTrack,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
} from "agora-rtc-sdk-ng";
import {
  AgoraRTC,
  createAgoraClient,
  fetchAgoraToken,
  publishPeerConnection,
} from "@/client/lib/communication";
import { peerTransfer } from "@/client/lib/peer-transfer";
export { fetchAgoraToken } from "@/client/lib/communication";
import {
  encryptCallSecret,
  decryptCallSecret,
  ensureDeviceIdentity,
  type E2ERecipientKey,
} from "@/lib/amis-e2ee";
import {
  clearSecureDeviceRegistration,
  isTerminalSecureDeviceError,
  registerSecureDevice,
} from "@/lib/secure-device-registration";
import { apiPath, websocketUrl } from "@/lib/network";
import { trackCallDeviceOutcome } from "@/lib/analytics";
import { useConnectivity } from "@/contexts/ConnectivityContext";
import {
  readCallNetworkState,
  subscribeCallNetwork,
  type CallNetworkState,
} from "@/lib/call-network";
import {
  fetchCallRtcConfig,
  canUseHybridWebRtc,
  shouldRequestHybridFallback,
  preferOpus,
  type CallMediaProvider,
  type CallRtcConfig,
} from "@/lib/call-rtc-config";
import { CallRingtone } from "@/lib/call-ringtone";
import { testAgoraPreflight, testTurnRelay } from "@/lib/call-preflight";
import { useCallPush } from "@/hooks/use-call-push";
import {
  WEBRTC_TRANSPORT,
  DEFERRED_WEBRTC_TRANSPORT,
  isDirectWebRtcTransport,
  isDeferredWebRtcTransport,
  loadDeferredConfig,
} from "@/lib/call-deferred";
import {
  canApplyNotificationCallAction,
  readNotificationCallAction,
  readNotificationCallResume,
  showForegroundCallNotification,
  shouldClearTerminalCall,
  type PendingNotificationCallAction,
} from "@/lib/call-notification-action";
import {
  rememberDurableCallSignal,
  rememberRemoteIceCandidate,
} from "@/lib/call-signal-dedupe";
import { fetchAgoraTurnConfig } from "@/lib/agora-turn";

export type CallStatus = "idle" | "calling" | "ringing" | "active" | "ended";
export type CallPhase = "idle" | "ringing" | "accepted" | "connecting" | "connected" | "ended";
export type LiveStatus  = "idle" | "live" | "ended";
export type ConnectionTestStatus = "idle" | "testing" | "ready" | "unstable" | "failed";
export type CallNetworkQuality = "unknown" | "good" | "weak" | "poor";
export type CallDeviceKind = "audioinput" | "videoinput" | "audiooutput";
export type SecureCallRegistrationStatus = "idle" | "registering" | "ready" | "error";

export interface CallDevice {
  deviceId: string;
  kind: CallDeviceKind;
  label: string;
}

export interface CallDeviceIssue {
  kind: CallDeviceKind;
  message: string;
  disconnected?: boolean;
}

interface IncomingCall {
  from:   string;
  callId: string;
  video:  boolean;
  offer?: RTCSessionDescriptionInit | null;
  transport?: { provider: CallMediaProvider; version: number };
  e2e?: {
    devices: Record<string, {
      wrappedSecret: string;
      fingerprint: string;
    }>;
  };
  callerId?: number;
  callerName?: string;
  callerAvatar?: string;
  expiresAt: number;
  deferredMedia?: boolean;
}

interface IncomingExpiry {
  callId: string;
  generation: number;
  expiresAt: number;
}

function isRtcDescription(
  value: unknown,
  type: "offer" | "answer",
): value is RTCSessionDescriptionInit {
  if (!value || typeof value !== "object") return false;
  const description = value as { type?: unknown; sdp?: unknown };
  return description.type === type &&
    typeof description.sdp === "string" &&
    description.sdp.length > 0;
}

interface LiveStream {
  liveId: string;
  host:   string;
  title:  string;
  domain: string;
}

// Live stories use the same browser WebRTC primitives, independently of calls.
const LIVE_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function mediaFailureMessage(err: unknown, device: "microphone" | "camera" = "microphone"): string {
  const name = (err as { name?: string })?.name ?? "";
  const code = (err as { code?: string })?.code ?? "";
  const icon = device === "camera" ? "📹" : "🎤";
  const label = device === "camera" ? "الكاميرا" : "الميكروفون";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || code === "PERMISSION_DENIED") {
    return `${icon} تم رفض إذن ${label} — افتح إعدادات الموقع في المتصفح، اسمح بالوصول، ثم أعد المحاولة`;
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || code === "DEVICE_NOT_FOUND") {
    return `${icon} لا توجد ${label} متصلة بالجهاز`;
  }
  if (name === "NotReadableError" || name === "AbortError" || code === "DEVICE_BUSY" || code === "DEVICE_IN_USE") {
    return `${icon} ${label} مستخدمة من تطبيق آخر — أغلقه ثم أعد المحاولة`;
  }
  if (name === "NotSupportedError") {
    return `${icon} هذا المتصفح لا يدعم الوصول إلى ${label}`;
  }
  // A successful permission grant does not establish Agora token, channel,
  // encryption, or publishing readiness. Never mislabel an SDK/setup failure
  // as a microphone permission failure.
  if (device === "microphone" && (name || code || err instanceof Error)) {
    return "تعذّر إعداد اتصال الوسائط الآمن — تحقق من اتصال Agora وإعداد القناة ثم أعد المحاولة";
  }
  return `${icon} تعذّر الوصول إلى ${label} — تأكد من الإذن والجهاز ثم أعد المحاولة`;
}

function isRecoverableMediaError(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? "";
  const code = (err as { code?: string })?.code ?? "";
  return [
    "NotAllowedError",
    "PermissionDeniedError",
    "NotFoundError",
    "DevicesNotFoundError",
    "NotReadableError",
    "AbortError",
    "NotSupportedError",
  ].includes(name) || ["PERMISSION_DENIED", "DEVICE_NOT_FOUND", "DEVICE_BUSY", "DEVICE_IN_USE"].includes(code);
}

export function useCall(user: { id: number; username: string } | null) {
  const { isOnline, setRealtimeConnecting, setRealtimeConnected } = useConnectivity();
  const screenShareSupported =
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function";
  const wsRef   = useRef<WebSocket | null>(null);
  const pcRef   = useRef<RTCPeerConnection | null>(null); // live stories only
  const callPcRef = useRef<RTCPeerConnection | null>(null);
  // Hybrid is configuration only; an active call is always one concrete media transport.
  const callProviderRef = useRef<Exclude<CallMediaProvider, "hybrid">>("webrtc");
  const callRtcConfigRef = useRef<CallRtcConfig | null>(null);
  const remoteCallStreamRef = useRef<MediaStream | null>(null);
  const webRtcScreenTrackRef = useRef<MediaStreamTrack | null>(null);
  const webRtcCameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const iceRestartAttemptedRef = useRef(false);
  const iceRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webRtcStatsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousPacketStatsRef = useRef(new Map<number, { received: number; lost: number }>());
  const pendingCallIceRef = useRef<RTCIceCandidate[]>([]);
  const callSignalingReadyRef = useRef(new Set<string>());
  const pendingRemoteIceRef = useRef<RTCIceCandidateInit[]>([]);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const wasConnectedRef = useRef(false);
  const identityGenerationRef = useRef(0);
  // sessionStorage is scoped to one browser tab, unlike localStorage. That
  // gives each tab a stable reconnect identity without letting two tabs
  // compete for the server's selected callee device.
  const signalingDeviceRef = useRef<{ userId: number; deviceId: string } | null>(null);
  const preflightClientRef = useRef<IAgoraRTCClient | null>(null);
  const mediaConnectedRef = useRef(false);
  const mediaHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedVideoRef = useRef(false);
  const callDirectionRef = useRef<"outgoing" | "incoming" | null>(null);
  const ringtoneRef = useRef<CallRingtone | null>(null);
  const callVideoRef = useRef(true);
  const mediaSetupCallRef = useRef<string | null>(null);
  // Invalidates every in-flight async media setup on cancel/end/account switch.
  const callGenerationRef = useRef(0);
  const terminalCallRef = useRef<(callId: string, status: string) => void>(() => {});
  const pendingNotificationActionRef = useRef<PendingNotificationCallAction | null>(null);
  const seenNotificationActionRef = useRef<string | null>(null);
  const seenNotificationResumeRef = useRef<string | null>(null);
  const registeredSocketRef = useRef(false);
  const pendingCallResumesRef = useRef(new Map<string, { userId: number; until: number }>());
  const hybridFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hybridSwitchRequestedRef = useRef(false);
  const callSecretRef = useRef<string | null>(null);
  const agoraStandbyTokenRef = useRef<{ callId: string; appId: string; token: string; uid: number } | null>(null);
  const groupCallActiveRef = useRef(false);
  const recordingRequestIdsRef = useRef(new Map<string, string>());

  // Agora and WebRTC refs are kept isolated so the UI can continue consuming
  // ordinary MediaStreams regardless of the selected call provider.
  const agoraRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);
  const remoteAudioRef = useRef<IRemoteAudioTrack | null>(null);
  const remoteVideoRef = useRef<IRemoteVideoTrack | null>(null);
  const microphoneEnabledRef = useRef(true);
  const cameraEnabledRef = useRef(true);

  const [connected,    setConnected]    = useState(false);
  const [callStatus,   setCallStatus]   = useState<CallStatus>("idle");
  const [callPhase, setCallPhase] = useState<CallPhase>("idle");
  // Browsers start with audio locked until a trusted user gesture resumes an
  // AudioContext. Only the incoming overlay/settings expose sound recovery.
  const [soundBlocked, setSoundBlocked] = useState(true);
  const [secureCallRegistrationStatus, setSecureCallRegistrationStatus] =
    useState<SecureCallRegistrationStatus>("idle");
  const [secureCallRegistrationError, setSecureCallRegistrationError] = useState<string | null>(null);
  const secureCallRegistrationRetryRef = useRef<(() => void) | null>(null);
  const secureCallRegistrationReadyRef = useRef(false);
  const [liveStatus,   setLiveStatus]   = useState<LiveStatus>("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activePeer,   setActivePeer]   = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [recordingParticipantIds, setRecordingParticipantIds] = useState<number[]>([]);
  // Mirror of the call the user is currently in or being offered — WS handlers
  // use this ref to IGNORE call events whose callId does not belong to us.
  const currentCallIdRef = useRef<string | null>(null);
  const offeredCallIdRef = useRef<string | null>(null);
  // These are deliberately local browser refs. They protect this tab from
  // replay after reconnect; authoritative call state remains server-owned.
  const currentCallPeerRef = useRef<string | null>(null);
  const seenCallSignalsRef = useRef(new Map<string, Set<string>>());
  const seenRemoteIceRef = useRef(new Map<string, Set<string>>());
  const applyingRemoteAnswerRef = useRef(new Set<string>());
  const appliedRenegotiationOfferRef = useRef(new Map<string, string>());
  const appliedRenegotiationAnswerRef = useRef(new Map<string, string>());
  const callSetupWaitersRef = useRef(new Map<string, {
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>());
  const durableAnswerWaitersRef = useRef(new Map<string, {
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>());
  const [activeVideo,  setActiveVideo]  = useState(false);
  // Call-history tracking — lives here (single instance) so it logs exactly once
  const historyRef = useRef<{ peer: string; video: boolean; start: number; outgoing: boolean; answered: boolean } | null>(null);
  const [onlineUsers,  setOnlineUsers]  = useState<string[]>([]);
  const [activeLives,  setActiveLives]  = useState<LiveStream[]>([]);
  const [currentLiveId, setCurrentLiveId] = useState<string | null>(null);

  // Streams (MediaStream API kept so CallOverlay & live components stay unchanged)
  const localStreamRef  = useRef<MediaStream | null>(null);
  const [localStream,   setLocalStream]   = useState<MediaStream | null>(null);
  const [remoteStream,  setRemoteStream]  = useState<MediaStream | null>(null);
  const [screenSharing, setScreenSharing] = useState(false);
  const [callDevices, setCallDevices] = useState<CallDevice[]>([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState("");
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [selectedSpeakerId, setSelectedSpeakerId] = useState("");
  const [cameraZoom, setCameraZoom] = useState<{ min: number; max: number; step: number; value: number } | null>(null);
  const [deviceIssue, setDeviceIssue] = useState<CallDeviceIssue | null>(null);
  const [switchingDevice, setSwitchingDevice] = useState<CallDeviceKind | null>(null);
  const disconnectedDeviceKindRef = useRef<CallDeviceKind | null>(null);
  const speakerSelectionSupported =
    typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

  // ── Error feedback ─────────────────────────────────────────────────────────
  const [callError,    setCallError]    = useState<string | null>(null);
  const [callBusy, setCallBusy] = useState(false);
  const clearCallBusy = useCallback(() => setCallBusy(false), []);
  const [connectionTest, setConnectionTest] = useState<ConnectionTestStatus>("idle");
  const [networkQuality, setNetworkQuality] = useState<CallNetworkQuality>("unknown");
  const [networkState, setNetworkState] = useState<CallNetworkState>(() =>
    readCallNetworkState(navigator));
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCallError = (msg: string, durationMs = 5_000) => {
    setCallError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setCallError(null), durationMs);
  };

  const refreshCallDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = (await navigator.mediaDevices.enumerateDevices())
        .filter((device): device is MediaDeviceInfo & { kind: CallDeviceKind } =>
          device.kind === "audioinput" || device.kind === "videoinput" || device.kind === "audiooutput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          kind: device.kind,
          label: device.label || `${device.kind === "audioinput" ? "Microphone" : device.kind === "videoinput" ? "Camera" : "Speaker"} ${index + 1}`,
        }));
      setCallDevices(devices);
      return devices;
    } catch {
      setDeviceIssue({
        kind: "audioinput",
        message: "تعذّر قراءة أجهزة المكالمة. تحقق من أذونات المتصفح ثم حاول التحديث.",
      });
      return [];
    }
  }, []);

  const refreshCameraZoom = useCallback((track?: MediaStreamTrack | null) => {
    if (!track || typeof track.getCapabilities !== "function") {
      setCameraZoom(null);
      return;
    }
    const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
      zoom?: { min?: number; max?: number; step?: number };
    };
    const zoom = capabilities.zoom;
    if (!zoom || typeof zoom.min !== "number" || typeof zoom.max !== "number" || zoom.max <= zoom.min) {
      setCameraZoom(null);
      return;
    }
    const settings = track.getSettings() as MediaTrackSettings & { zoom?: number };
    setCameraZoom({
      min: zoom.min,
      max: zoom.max,
      step: zoom.step && zoom.step > 0 ? zoom.step : 0.1,
      value: typeof settings.zoom === "number" ? settings.zoom : zoom.min,
    });
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;
    const handleDeviceChange = () => {
      void refreshCallDevices().then((devices) => {
        if (!devices || callStatus === "idle") return;
        const selected = [
          { kind: "audioinput" as const, id: selectedMicrophoneId, label: "الميكروفون" },
          { kind: "videoinput" as const, id: selectedCameraId, label: "الكاميرا" },
          { kind: "audiooutput" as const, id: selectedSpeakerId, label: "مكبر الصوت" },
        ].find((item) => item.id && !devices.some((device) => device.kind === item.kind && device.deviceId === item.id));
        if (selected) {
          disconnectedDeviceKindRef.current = selected.kind;
          setDeviceIssue({
            kind: selected.kind,
            message: `تم فصل ${selected.label}. اختر جهازاً متاحاً للمتابعة دون إنهاء المكالمة.`,
            disconnected: true,
          });
        }
      }).catch(() => {});
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [callStatus, refreshCallDevices, selectedCameraId, selectedMicrophoneId, selectedSpeakerId]);

  // ── Ring timeout: client safety net (the server owns authoritative state) ──
  const RING_TIMEOUT_MS = 30_000;
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomingExpiryRef = useRef<IncomingExpiry | null>(null);
  const expireIncomingRef = useRef<(expiry: IncomingExpiry) => void>(() => {});
  const vibrationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopIncomingVibration = useCallback(() => {
    if (vibrationTimerRef.current) clearInterval(vibrationTimerRef.current);
    vibrationTimerRef.current = null;
    if (typeof navigator.vibrate === "function") {
      try { navigator.vibrate(0); } catch { /* best effort */ }
    }
  }, []);
  const clearRingTimer = useCallback(() => {
    if (ringTimerRef.current) { clearTimeout(ringTimerRef.current); ringTimerRef.current = null; }
    incomingExpiryRef.current = null;
    stopIncomingVibration();
  }, [stopIncomingVibration]);

  // Identity + generation checks keep a queued/throttled timer from clearing a
  // newer invitation or a call whose Answer has already left incoming state.
  expireIncomingRef.current = expiry => {
    if (incomingExpiryRef.current !== expiry ||
      currentCallIdRef.current !== expiry.callId ||
      callGenerationRef.current !== expiry.generation) return;
    clearRingTimer();
    callGenerationRef.current += 1;
    currentCallIdRef.current = null;
    currentCallPeerRef.current = null;
    callDirectionRef.current = null;
    ringtoneRef.current?.stop();
    setIncomingCall(null);
    setActivePeer(null);
    setActiveCallId(null);
    setCallPhase("idle");
    setCallStatus("idle");
    showCallError("انتهت صلاحية دعوة المكالمة");
    // No reject/end frame: expiry and missed-call persistence belong to server.
  };
  const checkIncomingExpiry = useCallback(function check(expiry: IncomingExpiry) {
    if (incomingExpiryRef.current !== expiry ||
      currentCallIdRef.current !== expiry.callId ||
      callGenerationRef.current !== expiry.generation) return;
    const remaining = expiry.expiresAt - Date.now();
    if (remaining <= 0) {
      expireIncomingRef.current(expiry);
      return;
    }
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    ringTimerRef.current = setTimeout(() => check(expiry), Math.min(remaining, 2_147_483_647));
  }, []);

  useEffect(() => {
    const recheck = () => {
      const expiry = incomingExpiryRef.current;
      if (expiry) checkIncomingExpiry(expiry);
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
      clearRingTimer();
    };
  }, [checkIncomingExpiry, clearRingTimer]);

  useEffect(() => {
    if (!user || callStatus !== "ringing" || !incomingCall) clearRingTimer();
  }, [callStatus, clearRingTimer, incomingCall, user?.id]);

  const sendWS = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  // Group calls own their own UI/controller. A direct dial must not race a
  // group session and steal the user's microphone.
  useEffect(() => {
    const onGroupCallActive = (event: Event) => {
      groupCallActiveRef.current = (event as CustomEvent<boolean>).detail === true;
    };
    window.addEventListener("gdna:group-call-active", onGroupCallActive);
    return () => window.removeEventListener("gdna:group-call-active", onGroupCallActive);
  }, []);

  useEffect(() => {
    const onRecordingControlSend = (event: Event) => {
      const detail = (event as CustomEvent<{
        callId?: unknown; requestId?: unknown; action?: unknown; type?: unknown;
      }>).detail;
      if (!detail || typeof detail.callId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(detail.callId)) return;
      const action = typeof detail.action === "string"
        ? detail.action
        : ({ request: "request", accepted: "accept", rejected: "reject", stopped: "stop", revoked: "revoke" } as const)[
          String(detail.type) as "request" | "accepted" | "rejected" | "stopped" | "revoked"
        ];
      if (!["request", "accept", "reject", "stop", "revoke"].includes(String(action))) return;
      // Direct calls require the exact local call id. A group call deliberately
      // has no direct-call id; its server validates selected membership/device.
      const directCall = detail.callId === currentCallIdRef.current;
      const groupCall = groupCallActiveRef.current === true;
      if (!directCall && !groupCall) return;
      let requestId = typeof detail.requestId === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(detail.requestId)
        ? detail.requestId
        : recordingRequestIdsRef.current.get(detail.callId);
      if (!requestId && action === "request") {
        requestId = `record_${crypto.randomUUID().replace(/-/g, "")}`;
      }
      if (!requestId) return;
      recordingRequestIdsRef.current.set(detail.callId, requestId);
      sendWS({
        type: "call-recording-control",
        callId: detail.callId,
        requestId,
        action,
      });
    };
    // The hyphenated event is canonical. Keep the short-lived colon alias so
    // an already-loaded recording panel is not silently disconnected mid-call.
    window.addEventListener("gdna:recording-control-send", onRecordingControlSend);
    window.addEventListener("gdna:recording-control:send", onRecordingControlSend);
    return () => {
      window.removeEventListener("gdna:recording-control-send", onRecordingControlSend);
      window.removeEventListener("gdna:recording-control:send", onRecordingControlSend);
    };
  }, [sendWS]);

  useEffect(() => {
    const active = callStatus !== "idle" && currentCallIdRef.current !== null;
    window.dispatchEvent(new CustomEvent("gdna:direct-call-active", { detail: active }));
    return () => {
      if (active) window.dispatchEvent(new CustomEvent("gdna:direct-call-active", { detail: false }));
    };
  }, [callStatus]);

  useEffect(() => {
    if (activeCallId) return;
    setRecordingParticipantIds([]);
  }, [activeCallId]);

  const signalingDeviceIdFor = useCallback((userId: number) => {
    const current = signalingDeviceRef.current;
    if (current?.userId === userId) return current.deviceId;
    const key = `gdna:call-signaling-device:${userId}`;
    let deviceId: string | null = null;
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored && /^[A-Za-z0-9_-]{16,128}$/.test(stored)) deviceId = stored;
      if (!deviceId) {
        deviceId = `calltab_${crypto.randomUUID().replace(/-/g, "")}`;
        window.sessionStorage.setItem(key, deviceId);
      }
    } catch {
      // Session storage can be unavailable in a hardened browser. Keep a
      // tab-local identity for this lifecycle rather than sharing one.
      deviceId = `calltab_${crypto.randomUUID().replace(/-/g, "")}`;
    }
    signalingDeviceRef.current = { userId, deviceId };
    return deviceId;
  }, []);

  const resumeCurrentCall = useCallback(() => {
    const callId = currentCallIdRef.current;
    if (callId && registeredSocketRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      // During key/config preparation this id is still browser-local. Resuming
      // it would make the server end a call that has not been offered yet.
      if (callDirectionRef.current === "outgoing" && offeredCallIdRef.current !== callId) return;
      // This is intentionally the only action reconnect performs for an
      // incoming ring: it never requests devices or answers on the user's
      // behalf. The server returns the canonical state/signal transcript.
      sendWS({ type: "call-resume", callId });
    }
  }, [sendWS]);

  const flushPendingCallIce = useCallback(() => {
    const callId = currentCallIdRef.current;
    const peer = currentCallPeerRef.current;
    if (!callId || !peer || !callSignalingReadyRef.current.has(callId) ||
      !registeredSocketRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
    for (const candidate of pendingCallIceRef.current.splice(0)) {
      sendWS({ type: "ice-candidate", to: peer, callId, candidate });
    }
  }, [sendWS]);

  const flushCallResumes = useCallback(() => {
    const now = Date.now();
    for (const [callId, pending] of pendingCallResumesRef.current) {
      if (pending.userId !== user?.id || pending.until <= now) {
        pendingCallResumesRef.current.delete(callId);
      } else if (registeredSocketRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        sendWS({ type: "call-resume", callId });
      }
    }
  }, [sendWS, user?.id]);

  // Firestore can deliver before the authenticated socket finishes registering,
  // or just before the server finishes inserting its live call record. Retry
  // briefly rather than dropping the only snapshot that announces a call.
  useEffect(() => {
    const timer = setInterval(flushCallResumes, 2_000);
    return () => {
      clearInterval(timer);
      pendingCallResumesRef.current.clear();
      registeredSocketRef.current = false;
    };
  }, [flushCallResumes]);

  // Firestore is a wake-up mechanism only. The websocket asks the API for the
  // authenticated envelope before rendering or answering an invitation.
  const callPush = useCallPush(
    user,
    callId => {
      if (!user || pendingCallResumesRef.current.size >= 100) return;
      if (!pendingCallResumesRef.current.has(callId)) {
        pendingCallResumesRef.current.set(callId, { userId: user.id, until: Date.now() + 30_000 });
      }
      flushCallResumes();
    },
    (callId, status) => terminalCallRef.current(callId, status),
  );

  const enableCallSound = useCallback(async () => {
    const ringtone = ringtoneRef.current ??= new CallRingtone();
    const enabled = await ringtone.enable();
    // An unlock may settle after this provider unmounts. It must not publish
    // readiness or restart a tone belonging to the disposed provider.
    if (ringtoneRef.current !== ringtone) return false;
    setSoundBlocked(!enabled);
    // The effect below uses the current call state to start audio. Never use a
    // pre-await ringing snapshot: the caller may have cancelled during resume().
    return enabled;
  }, []);

  // Unlock ringtone audio on the first ordinary trusted interaction, but never
  // couple that interaction to a notification permission prompt. Listen before
  // authentication settles so a login tap also unlocks this tab's audio.
  useEffect(() => {
    if (!soundBlocked) return;
    const removeListeners = () => {
      window.removeEventListener("click", unlock, true);
      window.removeEventListener("touchend", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    const unlock = (event: Event) => {
      if (!event.isTrusted) return;
      if (event instanceof KeyboardEvent && (event.metaKey || event.ctrlKey || event.altKey)) return;
      void enableCallSound().then((enabled) => {
        if (enabled) removeListeners();
      });
    };
    // Capture keeps routed controls that stop bubbling from swallowing the
    // gesture; touchend also covers mobile controls that suppress click.
    window.addEventListener("click", unlock, true);
    window.addEventListener("touchend", unlock, { capture: true, passive: true });
    window.addEventListener("keydown", unlock, true);
    return removeListeners;
  }, [enableCallSound, soundBlocked]);

  useEffect(() => {
    const ringing = !user
      ? null
      : callStatus === "ringing"
      ? "incoming"
      : callStatus === "calling" && callDirectionRef.current === "outgoing" && callPhase === "ringing"
        ? "ringback"
        : null;
    if (!ringing) {
      ringtoneRef.current?.stop();
      return;
    }
    const started = ringtoneRef.current?.start(ringing) ?? false;
    if (!started) setSoundBlocked(true);
    if (ringing === "incoming" && typeof navigator.vibrate === "function") {
      const vibrate = () => {
        const expiry = incomingExpiryRef.current;
        if (!expiry) return;
        checkIncomingExpiry(expiry);
        if (incomingExpiryRef.current !== expiry) return;
        try { navigator.vibrate([0, 1000, 500, 1000]); } catch { /* best effort */ }
      };
      vibrate();
      if (incomingExpiryRef.current) vibrationTimerRef.current = setInterval(vibrate, 3_000);
    }
    return () => {
      ringtoneRef.current?.stop();
      stopIncomingVibration();
    };
  }, [callPhase, callStatus, checkIncomingExpiry, soundBlocked, stopIncomingVibration, user?.id]);

  useEffect(() => {
    // Audio activation is tab-scoped, not account-scoped. Do not close an
    // already-unlocked context when the login handshake supplies the user.
    return () => {
      const ringtone = ringtoneRef.current;
      ringtoneRef.current = null;
      void ringtone?.close();
    };
  }, []);

  const setActualMediaConnected = useCallback((next: boolean) => {
    mediaConnectedRef.current = next;
    if (mediaHeartbeatRef.current) {
      clearInterval(mediaHeartbeatRef.current);
      mediaHeartbeatRef.current = null;
    }
    const sendState = () => {
      const callId = currentCallIdRef.current;
      if (callId) sendWS({ type: "call-media-state", callId, connected: mediaConnectedRef.current });
    };
    // A false transition must be observable before call state is cleared.
    if (!next) {
      sendState();
      return;
    }
    setCallPhase("connected");
    // Billing and the active UI state begin only after a peer connection has
    // both connected and delivered remote media, never on "Answer".
    setCallStatus("active");
    sendState();
    mediaHeartbeatRef.current = setInterval(sendState, 5_000);
  }, [sendWS]);

  useEffect(() => subscribeCallNetwork(navigator, window, setNetworkState), []);

  const waitForCallReady = useCallback((callId: string) => new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      callSetupWaitersRef.current.delete(callId);
      reject(new Error("تعذّر تأكيد المكالمة الآمنة من الخادم"));
    // A caller keeps its already granted media through a short signaling
    // restart. The server remains authoritative for the actual ring timeout.
    }, RING_TIMEOUT_MS + 5_000);
    callSetupWaitersRef.current.set(callId, { resolve, reject, timeout });
  }), []);

  const settleCallReady = useCallback((callId: string, error?: Error) => {
    const waiter = callSetupWaitersRef.current.get(callId);
    if (!waiter) return;
    clearTimeout(waiter.timeout);
    callSetupWaitersRef.current.delete(callId);
    if (error) waiter.reject(error);
    else waiter.resolve();
  }, []);

  const waitForDurableAnswer = useCallback((callId: string) => new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      durableAnswerWaitersRef.current.delete(callId);
      reject(new Error("لم يتم تثبيت قبول المكالمة على جهازك"));
    }, RING_TIMEOUT_MS + 5_000);
    durableAnswerWaitersRef.current.set(callId, { resolve, reject, timeout });
  }), []);

  const settleDurableAnswer = useCallback((callId: string, error?: Error) => {
    const waiter = durableAnswerWaitersRef.current.get(callId);
    if (!waiter) return;
    clearTimeout(waiter.timeout);
    durableAnswerWaitersRef.current.delete(callId);
    if (error) waiter.reject(error);
    else waiter.resolve();
  }, []);

  const rejectPendingCallSetups = useCallback((message: string) => {
    for (const [callId, waiter] of callSetupWaitersRef.current) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error(message));
      callSetupWaitersRef.current.delete(callId);
    }
    for (const [callId, waiter] of durableAnswerWaitersRef.current) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error(message));
      durableAnswerWaitersRef.current.delete(callId);
    }
  }, []);

  // Publish only the current browser's public key. This root-owned registration
  // is independent of Messenger mounting and of the signaling subscription.
  // The private RSA key remains non-extractable in IndexedDB.
  useEffect(() => {
    if (!user) {
      secureCallRegistrationReadyRef.current = false;
      setSecureCallRegistrationStatus("idle");
      setSecureCallRegistrationError(null);
      secureCallRegistrationRetryRef.current = null;
      return;
    }
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let running = false;
    let terminal = false;

    const clearRetry = () => {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
    };
    const register = async (manual = false) => {
      // Focus/visibility and reconnect events only recover a failed/incomplete
      // registration. They never revalidate a ready device, disturb the live
      // socket, or transiently regress readiness.
      if (cancelled || running || !navigator.onLine ||
        (!manual && (secureCallRegistrationReadyRef.current || terminal))) return;
      running = true;
      clearRetry();
      if (manual || attempt === 0) setSecureCallRegistrationStatus("registering");
      if (manual) {
        attempt = 0;
        terminal = false;
        setSecureCallRegistrationError(null);
      }
      try {
        const identity = await registerSecureDevice(user.id);
        if (cancelled) return;
        attempt = 0;
        terminal = false;
        secureCallRegistrationReadyRef.current = true;
        setSecureCallRegistrationStatus("ready");
        setSecureCallRegistrationError(null);
      } catch (error) {
        if (cancelled) return;
        secureCallRegistrationReadyRef.current = false;
        setSecureCallRegistrationStatus("error");
        setSecureCallRegistrationError(
          error instanceof Error ? error.message : "Secure device registration failed.",
        );
        // Capacity and identity conflicts require explicit citizen recovery.
        // Do not hammer PUT on timers, focus, visibility, or reconnect.
        terminal = isTerminalSecureDeviceError(error);
        if (!terminal) {
          const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt++, 5));
          retryTimer = setTimeout(() => void register(), delay);
        }
      } finally {
        running = false;
      }
    };
    const retryNow = () => void register(true);
    const retryOnReconnect = () => void register();
    const retryOnFocus = () => {
      if (document.visibilityState === "visible") void register();
    };
    secureCallRegistrationRetryRef.current = retryNow;
    window.addEventListener("online", retryOnReconnect);
    window.addEventListener("focus", retryOnReconnect);
    window.addEventListener("gdna:realtime-reconnected", retryOnReconnect);
    document.addEventListener("visibilitychange", retryOnFocus);
    void register();
    return () => {
      cancelled = true;
      secureCallRegistrationReadyRef.current = false;
      clearSecureDeviceRegistration(user.id);
      clearRetry();
      secureCallRegistrationRetryRef.current = null;
      window.removeEventListener("online", retryOnReconnect);
      window.removeEventListener("focus", retryOnReconnect);
      window.removeEventListener("gdna:realtime-reconnected", retryOnReconnect);
      document.removeEventListener("visibilitychange", retryOnFocus);
    };
  }, [user?.id]);

  const retrySecureCallRegistration = useCallback(() => {
    secureCallRegistrationRetryRef.current?.();
  }, []);

  // ── Pre-call media configuration test ─────────────────────────────────────
  // Validate the selected provider without opening a media client or requesting
  // microphone/camera permission. Agora does not require TURN; an independent
  // TURN diagnostic endpoint, when used by operations, must not be fed into the
  // Agora SDK.
  const testConnection = useCallback(async () => {
    if (connectionTest === "testing") return;
    if (!isOnline) {
      setConnectionTest("failed");
      return;
    }
    if (!user) {
      setConnectionTest("failed");
      return;
    }

    setConnectionTest("testing");
    try {
      const config = await fetchCallRtcConfig();
      const agoraCheck = config.provider === "agora"
        ? testAgoraPreflight({
            createClient: createAgoraClient,
            fetchImpl: fetch,
          })
        : null;
      // TURN is an independent diagnostic. It is useful operational evidence
      // for every deployment, but never gates an Agora call.
      const relayCheck = testTurnRelay({ fetchImpl: fetch });
      const [agoraResult, relayResult] = await Promise.all([
        agoraCheck
          ? agoraCheck.then(() => true).catch(() => false)
          : Promise.resolve(true),
        relayCheck,
      ]);
      setConnectionTest(config.provider === "agora"
        ? (agoraResult ? "ready" : "failed")
        : (relayResult ? "ready" : "failed"));
    } catch (error) {
      console.warn("[CALL] Media preflight failed:", error);
      setConnectionTest("failed");
    }
  }, [connectionTest, isOnline, user]);

  // Agora media bridge. The token is deliberately fetched here, after the
  // authoritative call lifecycle gate has opened, immediately before join.
  const rebuildRemoteStream = useCallback(() => {
    const tracks: MediaStreamTrack[] = [];
    if (remoteAudioRef.current) tracks.push(remoteAudioRef.current.getMediaStreamTrack());
    if (remoteVideoRef.current) tracks.push(remoteVideoRef.current.getMediaStreamTrack());
    setRemoteStream(tracks.length > 0 ? new MediaStream(tracks) : null);
  }, []);

  const createAgoraCall = useCallback(async (
    channel: string,
    withVideo: boolean,
    encryptionSecret: string,
    signalingDeviceId: string,
    preparedAudioTrack?: IMicrophoneAudioTrack,
    preparedVideoTrack?: ICameraVideoTrack,
    isCurrentCall: () => boolean = () => true,
  ) => {
    // The participant/session/device-scoped endpoint is the only source of
    // credentials. Never create an Agora client before it returns a complete
    // signed token.
    const standby = agoraStandbyTokenRef.current?.callId === channel
      ? agoraStandbyTokenRef.current
      : null;
    const { appId, token, uid } = standby ?? await fetchAgoraToken(channel, signalingDeviceId);
    if (!isCurrentCall()) throw new Error("CALL_SETUP_CANCELLED");
    // Suppress SDK debug/info output before any client setup. In particular,
    // credentials and TURN configuration must never reach browser logs.
    AgoraRTC.setLogLevel(2);
    const client = createAgoraClient();
    agoraRef.current = client;
    callProviderRef.current = "agora";
    // Agora encrypts media frames before they leave this browser. The secret is
    // generated by the caller and RSA-wrapped for the callee, so the signaling
    // server and Agora never receive the clear session secret.
    // Agora's GCM2 modes require the same exact 32-byte salt on every client.
    // The channel-derived salt is public; secrecy remains entirely in the
    // browser-generated RSA-wrapped encryptionSecret.
    const salt = new Uint8Array(await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`gdna-agora:${channel}`),
    ));
    client.setEncryptionConfig("aes-256-gcm2", encryptionSecret, salt);

    const subscribedMedia = new Set<string>();
    const liveRemotePeers = new Set<string>();
    const refreshAgoraConnectivity = () => {
      if (agoraRef.current !== client) return;
      // Muting or switching off a camera is not a network disconnect. Require a
      // subscribed track that is genuinely present on the remote participant.
      setActualMediaConnected(
        client.connectionState === "CONNECTED" &&
        client.remoteUsers.some(peer => liveRemotePeers.has(String(peer.uid))),
      );
    };
    const subscribePublishedMedia = async (
      remoteUser: IAgoraRTCRemoteUser,
      mediaType: "audio" | "video",
    ) => {
      if (agoraRef.current !== client) return; // stale client
      const key = `${String(remoteUser.uid)}:${mediaType}`;
      if (!subscribedMedia.has(key)) {
        await client.subscribe(remoteUser, mediaType);
        if (agoraRef.current !== client) return;
        subscribedMedia.add(key);
      }
      if (agoraRef.current !== client) return;
      if (mediaType === "audio") remoteAudioRef.current = remoteUser.audioTrack ?? null;
      if (mediaType === "video") remoteVideoRef.current = remoteUser.videoTrack ?? null;
      const subscribedTrack = mediaType === "audio" ? remoteUser.audioTrack : remoteUser.videoTrack;
      if (subscribedTrack) liveRemotePeers.add(String(remoteUser.uid));
      rebuildRemoteStream();
      refreshAgoraConnectivity();
    };
    client.on("user-published", async (remoteUser, mediaType) => {
      if (mediaType === "audio" || mediaType === "video") {
        try {
          await subscribePublishedMedia(remoteUser, mediaType);
        } catch (error) {
          if (agoraRef.current === client) showCallError(mediaFailureMessage(error));
        }
      }
    });

    client.on("user-unpublished", (_remoteUser, mediaType) => {
      if (agoraRef.current !== client) return;
      if (mediaType === "audio") remoteAudioRef.current = null;
      if (mediaType === "video") remoteVideoRef.current = null;
      rebuildRemoteStream();
      refreshAgoraConnectivity();
    });

    client.on("user-left", remoteUser => {
      subscribedMedia.delete(`${String(remoteUser.uid)}:audio`);
      subscribedMedia.delete(`${String(remoteUser.uid)}:video`);
      liveRemotePeers.delete(String(remoteUser.uid));
      refreshAgoraConnectivity();
    });

    client.on("connection-state-change", state => {
      if (agoraRef.current !== client) return;
      if (state === "DISCONNECTED" || state === "DISCONNECTING" || state === "RECONNECTING") {
        setActualMediaConnected(false);
      } else if (state === "CONNECTED") {
        refreshAgoraConnectivity();
      }
    });

    client.on("network-quality", quality => {
      if (agoraRef.current !== client) return;
      const worst = Math.max(quality.uplinkNetworkQuality, quality.downlinkNetworkQuality);
      setNetworkQuality(worst >= 5 ? "poor" : worst >= 3 ? "weak" : worst > 0 ? "good" : "unknown");
      const video = localVideoRef.current;
      if (video && worst >= 4 && !reducedVideoRef.current) {
        reducedVideoRef.current = true;
        void video.setEncoderConfiguration("360p_1").catch(() => {});
      } else if (video && worst > 0 && worst <= 2 && reducedVideoRef.current) {
        reducedVideoRef.current = false;
        void video.setEncoderConfiguration("720p_1").catch(() => {});
      }
    });

    const turnConfig = await fetchAgoraTurnConfig();
    if (!isCurrentCall()) {
      if (agoraRef.current === client) agoraRef.current = null;
      throw new Error("CALL_SETUP_CANCELLED");
    }
    if (turnConfig) client.setTurnServer(turnConfig);
    await client.join(appId, channel, token, uid);
    if (!isCurrentCall()) {
      if (agoraRef.current === client) agoraRef.current = null;
      await client.leave().catch(() => {});
      throw new Error("CALL_SETUP_CANCELLED");
    }
    // A publication can predate our join/event handlers. Subscribe both event
    // publications and the join snapshot through the same idempotent path.
    await Promise.all(client.remoteUsers.flatMap(remoteUser => [
      ...(remoteUser.hasAudio ? [subscribePublishedMedia(remoteUser, "audio")] : []),
      ...(remoteUser.hasVideo ? [subscribePublishedMedia(remoteUser, "video")] : []),
    ]));

    // Reuse the track that triggered the citizen's single permission prompt.
    // Opening, closing, then reopening the microphone is unreliable on mobile.
    const audioTrack = preparedAudioTrack ?? await AgoraRTC.createMicrophoneAudioTrack();
    if (!isCurrentCall()) {
      audioTrack.close();
      if (agoraRef.current === client) agoraRef.current = null;
      await client.leave().catch(() => {});
      throw new Error("CALL_SETUP_CANCELLED");
    }
    await audioTrack.setEnabled(microphoneEnabledRef.current);
    localAudioRef.current = audioTrack;
    let videoTrack: ICameraVideoTrack | null = preparedVideoTrack ?? null;
    let cameraWarning: string | null = null;
    if (withVideo && !videoTrack) {
      try {
        videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoRef.current = videoTrack;
      } catch (error) {
        // Keep the call usable as audio-only, but never hide a denied, missing,
        // or busy camera from the citizen.
        cameraWarning = `${mediaFailureMessage(error, "camera")} — ستستمر المكالمة صوتياً`;
      }
    }
    if (videoTrack) {
      localVideoRef.current = videoTrack;
      await videoTrack.setEnabled(cameraEnabledRef.current);
    }
    if (!isCurrentCall()) {
      audioTrack.close();
      videoTrack?.close();
      if (agoraRef.current === client) agoraRef.current = null;
      await client.leave().catch(() => {});
      throw new Error("CALL_SETUP_CANCELLED");
    }

    await client.publish(videoTrack ? [audioTrack, videoTrack] : [audioTrack]);

    const ms = new MediaStream([
      audioTrack.getMediaStreamTrack(),
      ...(videoTrack ? [videoTrack.getMediaStreamTrack()] : []),
    ]);
    localStreamRef.current = ms;
    setLocalStream(ms);
    setSelectedMicrophoneId(audioTrack.getMediaStreamTrack().getSettings().deviceId ?? "");
    setSelectedCameraId(videoTrack?.getMediaStreamTrack().getSettings().deviceId ?? "");
    refreshCameraZoom(videoTrack?.getMediaStreamTrack());
    setDeviceIssue(null);
    disconnectedDeviceKindRef.current = null;
    void refreshCallDevices();
    // Slow device setup must not consume the warning before the overlay renders.
    if (cameraWarning) showCallError(cameraWarning, 15_000);
  }, [rebuildRemoteStream, refreshCallDevices, refreshCameraZoom, setActualMediaConnected]);

  const createWebRtcCall = useCallback(async (
    config: CallRtcConfig,
    peer: string,
    callId: string,
    withVideo: boolean,
    canInitiateRestart: boolean,
    isCurrentCall: () => boolean = () => true,
  ): Promise<{ pc: RTCPeerConnection; stream: MediaStream }> => {
    if (!isCurrentCall()) throw new Error("CALL_SETUP_CANCELLED");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Secure browser media is unavailable");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: withVideo
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } }
        : false,
    });
    if (!isCurrentCall()) {
      stream.getTracks().forEach(track => track.stop());
      throw new Error("CALL_SETUP_CANCELLED");
    }
    if (config.provider !== "webrtc" && config.provider !== "hybrid") {
      throw new Error("WebRTC TURN calling is unavailable");
    }
    // Explicit legacy WebRTC remains relay-only. Hybrid first tries a direct
    // P2P route while retaining authenticated TURN candidates for NAT recovery.
    const pc = new RTCPeerConnection({
      iceServers: config.iceServers,
      iceTransportPolicy: config.provider === "hybrid" ? "all" : "relay",
    });
    if (!isCurrentCall()) {
      pc.close();
      stream.getTracks().forEach(track => track.stop());
      throw new Error("CALL_SETUP_CANCELLED");
    }
    callPcRef.current = pc;
    publishPeerConnection(pc);
    // Attach before creating SDP so the data-channel m-line is negotiated in
    // the initial offer rather than requiring a second call renegotiation.
    peerTransfer.attach(pc, { createChannel: canInitiateRestart });
    callProviderRef.current = "webrtc";
    callRtcConfigRef.current = config;
    iceRestartAttemptedRef.current = false;
    previousPacketStatsRef.current.clear();
    pendingCallIceRef.current = [];

    for (const track of stream.getTracks()) pc.addTrack(track, stream);
    if (!stream.getVideoTracks().length) {
      pc.addTransceiver("video", { direction: "sendrecv" });
    }
    for (const transceiver of pc.getTransceivers()) {
      if (transceiver.receiver.track.kind === "audio") preferOpus(transceiver);
    }
    localStreamRef.current = stream;
    setLocalStream(stream);
    setSelectedMicrophoneId(stream.getAudioTracks()[0]?.getSettings().deviceId ?? "");
    setSelectedCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? "");
    refreshCameraZoom(stream.getVideoTracks()[0]);
    void refreshCallDevices();

    pc.ontrack = event => {
      const next = event.streams[0] ?? new MediaStream([event.track]);
      remoteCallStreamRef.current = next;
      setRemoteStream(next);
      event.track.addEventListener("ended", () => setActualMediaConnected(false), { once: true });
      queueMicrotask(() => {
        const hasRemoteMedia = next.getTracks().some(track => track.readyState === "live");
        setActualMediaConnected(pc.connectionState === "connected" && hasRemoteMedia);
      });
    };
    pc.onicecandidate = event => {
      if (event.candidate) {
        if (callSignalingReadyRef.current.has(callId) &&
          registeredSocketRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          sendWS({ type: "ice-candidate", to: peer, callId, candidate: event.candidate });
        } else {
          pendingCallIceRef.current.push(event.candidate);
        }
      }
    };
    pc.onconnectionstatechange = () => {
      const hasRemoteMedia = !!remoteCallStreamRef.current?.getTracks()
        .some(track => track.readyState === "live");
      if (pc.connectionState === "connected") {
        if (hasRemoteMedia) setActualMediaConnected(true);
        if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current);
        return;
      }
      setActualMediaConnected(false);
      if (pc.connectionState !== "failed" && pc.connectionState !== "disconnected") return;
      // Only the original caller creates a restart offer, avoiding glare when
      // both peers observe the same network transition simultaneously.
      if (!canInitiateRestart) return;
      if (iceRestartAttemptedRef.current) {
        showCallError("فشل اتصال TURN المرحّل — أنهِ المكالمة وتحقق من الشبكة أو خادم TURN", 15_000);
        return;
      }
      iceRestartAttemptedRef.current = true;
      try {
        pc.setConfiguration({
          iceServers: config.iceServers,
          iceTransportPolicy: config.provider === "hybrid" ? "all" : "relay",
        });
        pc.restartIce();
        void pc.createOffer({ iceRestart: true }).then(async offer => {
          if (callPcRef.current !== pc) return;
          await pc.setLocalDescription(offer);
          sendWS({
            type: "call-renegotiate-offer",
            callId,
            offer: pc.localDescription,
            transport: { provider: "webrtc", version: 1 },
          });
          iceRestartTimerRef.current = setTimeout(() => {
            if (callPcRef.current === pc && pc.connectionState !== "connected") {
              setActualMediaConnected(false);
              showCallError("تعذّر إنشاء مسار TURN مرحّل للمكالمة", 15_000);
            }
          }, 8_000);
        }).catch(() => showCallError("تعذّرت إعادة تفاوض اتصال TURN", 15_000));
      } catch {
        showCallError("هذا المتصفح لا يدعم استعادة اتصال TURN", 15_000);
      }
    };

    webRtcStatsTimerRef.current = setInterval(() => {
      void pc.getStats().then(stats => {
        let weak = false;
        stats.forEach(report => {
          if (report.type !== "inbound-rtp" || report.kind !== "video") return;
          const received = Number(report.packetsReceived ?? 0);
          const lost = Number(report.packetsLost ?? 0);
          const previous = previousPacketStatsRef.current.get(report.ssrc);
          previousPacketStatsRef.current.set(report.ssrc, { received, lost });
          if (!previous) return;
          const receivedDelta = received - previous.received;
          const lostDelta = lost - previous.lost;
          weak ||= lostDelta > 0 && lostDelta / Math.max(1, receivedDelta + lostDelta) >= 0.05;
        });
        setNetworkQuality(weak ? "weak" : pc.connectionState === "connected" ? "good" : "poor");
        if (weak) {
          const video = localStreamRef.current?.getVideoTracks()[0];
          void video?.applyConstraints({
            width: { max: 640 },
            height: { max: 360 },
            frameRate: { max: 20 },
          }).catch(() => {});
        }
      }).catch(() => {});
    }, 5_000);

    return { pc, stream };
  }, [refreshCallDevices, refreshCameraZoom, sendWS, setActualMediaConnected]);

  // ── Release all call media ────────────────────────────────────────────────
  const leaveAgora = useCallback(async (preserveCallSecret = false) => {
    setActualMediaConnected(false);
    if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current);
    if (webRtcStatsTimerRef.current) clearInterval(webRtcStatsTimerRef.current);
    iceRestartTimerRef.current = null;
    webRtcStatsTimerRef.current = null;
    try { callPcRef.current?.close(); } catch { /* already closed */ }
    callPcRef.current = null;
    publishPeerConnection(null);
    webRtcScreenTrackRef.current?.stop();
    webRtcScreenTrackRef.current = null;
    webRtcCameraTrackRef.current?.stop();
    webRtcCameraTrackRef.current = null;
    const client = agoraRef.current;
    agoraRef.current = null;
    try { screenTrackRef.current?.close(); } catch { /* already closed */ }
    try { localAudioRef.current?.close(); } catch { /* already closed */ }
    try { localVideoRef.current?.close(); } catch { /* already closed */ }
    screenTrackRef.current = null;
    localAudioRef.current  = null;
    localVideoRef.current  = null;
    remoteAudioRef.current = null;
    remoteVideoRef.current = null;
    if (callProviderRef.current === "webrtc") {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    }
    localStreamRef.current = null;
    remoteCallStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setScreenSharing(false);
    setCallDevices([]);
    setSelectedMicrophoneId("");
    setSelectedCameraId("");
    setSelectedSpeakerId("");
    setCameraZoom(null);
    setDeviceIssue(null);
    setSwitchingDevice(null);
    setNetworkQuality("unknown");
    reducedVideoRef.current = false;
    callProviderRef.current = "webrtc";
    callRtcConfigRef.current = null;
    if (hybridFallbackTimerRef.current) clearTimeout(hybridFallbackTimerRef.current);
    hybridFallbackTimerRef.current = null;
    hybridSwitchRequestedRef.current = false;
    agoraStandbyTokenRef.current = null;
    if (!preserveCallSecret) {
      callSecretRef.current = null;
      offeredCallIdRef.current = null;
    }
    pendingCallIceRef.current = [];
    pendingRemoteIceRef.current = [];
    callSignalingReadyRef.current.clear();
    seenRemoteIceRef.current.clear();
    applyingRemoteAnswerRef.current.clear();
    appliedRenegotiationOfferRef.current.clear();
    appliedRenegotiationAnswerRef.current.clear();
    mediaSetupCallRef.current = null;
    if (client) { try { await client.leave(); } catch { /* already left */ } }
  }, [setActualMediaConnected]);

  const scheduleHybridFallback = useCallback((callId: string) => {
    const config = callRtcConfigRef.current;
    const pc = callPcRef.current;
    if (!pc || !shouldRequestHybridFallback({
      config,
      negotiated: true,
      connectionState: pc.connectionState,
      mediaConnected: mediaConnectedRef.current,
      switchRequested: hybridSwitchRequestedRef.current,
    })) return;
    if (hybridFallbackTimerRef.current) clearTimeout(hybridFallbackTimerRef.current);
    // This timer starts only after a direct answer was negotiated; ringing is
    // consent/signalling time and must never trigger a provider change.
    hybridFallbackTimerRef.current = setTimeout(() => {
      hybridFallbackTimerRef.current = null;
      const current = callPcRef.current;
      if (currentCallIdRef.current !== callId || !current || !shouldRequestHybridFallback({
        config: callRtcConfigRef.current,
        negotiated: true,
        connectionState: current.connectionState,
        mediaConnected: mediaConnectedRef.current,
        switchRequested: hybridSwitchRequestedRef.current,
      })) return;
      hybridSwitchRequestedRef.current = true;
      console.info("[AGORA] Fallback/Group mode", { hasToken: Boolean(agoraStandbyTokenRef.current?.token) });
      sendWS({ type: "call-provider-switch", callId, provider: "agora" });
    }, 3_000);
  }, [sendWS]);

  const switchToAgoraAfterServerAck = useCallback(async (callId: string) => {
    const userId = user?.id;
    if (currentCallIdRef.current !== callId || agoraRef.current || !userId) return;
    // Direct Agora answer/resume snapshots are synchronization frames, not
    // hybrid switch commands. A real hybrid switch always owns a live direct
    // peer connection (or its signed standby token).
    if (!callPcRef.current && agoraStandbyTokenRef.current?.callId !== callId) return;
    const secret = callSecretRef.current;
    if (!secret) {
      showCallError("تعذّر تبديل مسار المكالمة الآمن — مفتاح الوسائط غير متاح", 15_000);
      return;
    }
    const withVideo = callVideoRef.current;
    // UI mute/video controls change MediaStreamTrack.enabled. Keep those user
    // choices through transport replacement instead of silently unmuting them.
    const audioEnabled = localStreamRef.current?.getAudioTracks()[0]?.enabled ?? true;
    const videoEnabled = localStreamRef.current?.getVideoTracks()[0]?.enabled ?? true;
    // The server is the synchronization point: no peer can switch merely
    // because its local timer fired. Release P2P media before Agora acquires it.
    await leaveAgora(true);
    if (currentCallIdRef.current !== callId) return;
    try {
      const generation = callGenerationRef.current;
      await createAgoraCall(
        callId,
        withVideo,
        secret,
        signalingDeviceIdFor(userId),
        undefined,
        undefined,
        () => currentCallIdRef.current === callId && callGenerationRef.current === generation,
      );
      const audioTrack = localAudioRef.current?.getMediaStreamTrack();
      const videoTrack = localVideoRef.current?.getMediaStreamTrack();
      if (audioTrack) audioTrack.enabled = audioEnabled;
      if (videoTrack) videoTrack.enabled = videoEnabled;
    } catch (error) {
      showCallError("تعذّر الانتقال إلى مسار Agora الآمن", 15_000);
      console.warn("[AGORA] Fallback failed", { hasToken: Boolean(agoraStandbyTokenRef.current?.token) });
    }
  // This callback is a WebSocket-effect dependency. Depend on the durable
  // account scalar only: consumers commonly pass an inline user object, and
  // depending on that object made the effect tear down/recreate the socket on
  // every state update (including its cleanup's new empty arrays).
  }, [createAgoraCall, leaveAgora, signalingDeviceIdFor, user?.id]);

  // Firebase terminal snapshots are authoritative wake-up/termination signals,
  // but must only clear the exact call they describe. A delayed snapshot for a
  // former invitation may never tear down a newly accepted call on this device.
  terminalCallRef.current = (callId) => {
    pendingCallResumesRef.current.delete(callId);
    if (!shouldClearTerminalCall(currentCallIdRef.current, callId)) return;
    clearRingTimer();
    callGenerationRef.current += 1;
    currentCallIdRef.current = null;
    callDirectionRef.current = null;
    ringtoneRef.current?.stop();
    setActualMediaConnected(false);
    setIncomingCall(null);
    setActivePeer(null);
    setActiveCallId(null);
    setCallPhase("ended");
    setCallStatus("idle");
    void leaveAgora();
  };

  const rebuildLocalCallStream = useCallback(() => {
    const audioTrack = localAudioRef.current?.getMediaStreamTrack();
    const videoTrack = screenTrackRef.current?.getMediaStreamTrack() ?? localVideoRef.current?.getMediaStreamTrack();
    const tracks = [audioTrack, videoTrack].filter((track): track is MediaStreamTrack => Boolean(track));
    const stream = tracks.length ? new MediaStream(tracks) : null;
    localStreamRef.current = stream;
    setLocalStream(stream);
  }, []);

  const setMicrophoneEnabled = useCallback(async (enabled: boolean) => {
    try {
      if (callProviderRef.current === "agora" && localAudioRef.current) {
        await localAudioRef.current.setEnabled(enabled);
      } else {
        localStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = enabled; });
      }
      microphoneEnabledRef.current = enabled;
    } catch (error) {
      showCallError(mediaFailureMessage(error, "microphone"));
      throw error;
    }
  }, []);

  const setCameraEnabled = useCallback(async (enabled: boolean) => {
    try {
      if (callProviderRef.current === "agora" && localVideoRef.current) {
        await localVideoRef.current.setEnabled(enabled);
      } else {
        localStreamRef.current?.getVideoTracks().forEach(track => { track.enabled = enabled; });
      }
      cameraEnabledRef.current = enabled;
    } catch (error) {
      showCallError(mediaFailureMessage(error, "camera"));
      throw error;
    }
  }, []);

  const switchMicrophone = useCallback(async (deviceId: string) => {
    if (callProviderRef.current === "webrtc" && callPcRef.current && callStatus === "active") {
      setSwitchingDevice("audioinput");
      try {
        const replacement = (await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
          video: false,
        })).getAudioTracks()[0];
        if (!replacement) throw new Error("Microphone unavailable");
        replacement.enabled = microphoneEnabledRef.current;
        const sender = callPcRef.current.getSenders().find(item => item.track?.kind === "audio");
        await sender?.replaceTrack(replacement);
        const stream = localStreamRef.current;
        stream?.getAudioTracks().forEach(old => { stream.removeTrack(old); old.stop(); });
        stream?.addTrack(replacement);
        if (stream) setLocalStream(new MediaStream(stream.getTracks()));
        setSelectedMicrophoneId(deviceId);
        setDeviceIssue(null);
        trackCallDeviceOutcome("audioinput", "switch_succeeded");
      } catch (error) {
        setDeviceIssue({ kind: "audioinput", message: `${mediaFailureMessage(error, "microphone")} — اختر ميكروفوناً آخر` });
      } finally {
        setSwitchingDevice(null);
      }
      return;
    }
    const track = localAudioRef.current;
    if (!track || callStatus !== "active") return;
    setSwitchingDevice("audioinput");
    try {
      await track.setDevice(deviceId);
      setSelectedMicrophoneId(deviceId);
      setDeviceIssue(null);
      rebuildLocalCallStream();
      trackCallDeviceOutcome("audioinput", "switch_succeeded");
      if (disconnectedDeviceKindRef.current === "audioinput") {
        trackCallDeviceOutcome("audioinput", "recovery_succeeded");
        disconnectedDeviceKindRef.current = null;
      }
    } catch (error) {
      setDeviceIssue({ kind: "audioinput", message: `${mediaFailureMessage(error, "microphone")} — اختر ميكروفوناً آخر` });
    } finally {
      setSwitchingDevice(null);
    }
  }, [callStatus, rebuildLocalCallStream]);

  const switchCamera = useCallback(async (deviceId: string) => {
    if (callProviderRef.current === "webrtc" && callPcRef.current && callStatus === "active") {
      setSwitchingDevice("videoinput");
      try {
        const replacement = (await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })).getVideoTracks()[0];
        if (!replacement) throw new Error("Camera unavailable");
        replacement.enabled = cameraEnabledRef.current;
        const sender = callPcRef.current.getTransceivers()
          .find(item => item.receiver.track.kind === "video")?.sender;
        await sender?.replaceTrack(replacement);
        const stream = localStreamRef.current;
        stream?.getVideoTracks().forEach(old => { stream.removeTrack(old); old.stop(); });
        stream?.addTrack(replacement);
        if (stream) setLocalStream(new MediaStream(stream.getTracks()));
        setSelectedCameraId(deviceId);
        refreshCameraZoom(replacement);
        setDeviceIssue(null);
        trackCallDeviceOutcome("videoinput", "switch_succeeded");
      } catch (error) {
        setDeviceIssue({ kind: "videoinput", message: `${mediaFailureMessage(error, "camera")} — اختر كاميرا أخرى` });
      } finally {
        setSwitchingDevice(null);
      }
      return;
    }
    const track = localVideoRef.current;
    if (!track || callStatus !== "active") return;
    setSwitchingDevice("videoinput");
    try {
      await track.setDevice(deviceId);
      setSelectedCameraId(deviceId);
      setDeviceIssue(null);
      rebuildLocalCallStream();
      refreshCameraZoom(track.getMediaStreamTrack());
      trackCallDeviceOutcome("videoinput", "switch_succeeded");
      if (disconnectedDeviceKindRef.current === "videoinput") {
        trackCallDeviceOutcome("videoinput", "recovery_succeeded");
        disconnectedDeviceKindRef.current = null;
      }
    } catch (error) {
      setDeviceIssue({ kind: "videoinput", message: `${mediaFailureMessage(error, "camera")} — اختر كاميرا أخرى` });
    } finally {
      setSwitchingDevice(null);
    }
  }, [callStatus, rebuildLocalCallStream, refreshCameraZoom]);

  const flipCamera = useCallback(async () => {
    const availableDevices = callDevices.length ? callDevices : await refreshCallDevices() ?? [];
    const cameras = availableDevices.filter(device => device.kind === "videoinput" && device.deviceId);
    if (cameras.length < 2) return;

    const activeTrack = localVideoRef.current?.getMediaStreamTrack()
      ?? localStreamRef.current?.getVideoTracks()[0];
    const currentId = activeTrack?.getSettings().deviceId ?? selectedCameraId;
    const currentIndex = cameras.findIndex(device => device.deviceId === currentId);
    const next = cameras[(currentIndex + 1 + cameras.length) % cameras.length];

    if (callStatus === "active" && (localVideoRef.current || callProviderRef.current === "webrtc")) {
      await switchCamera(next.deviceId);
      return;
    }
    if (liveStatus !== "live") return;

    try {
      const replacementStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: next.deviceId } },
        audio: false,
      });
      const replacement = replacementStream.getVideoTracks()[0];
      if (!replacement) return;
      const sender = pcRef.current?.getSenders().find(item => item.track?.kind === "video");
      if (sender) await sender.replaceTrack(replacement);
      const stream = localStreamRef.current;
      stream?.getVideoTracks().forEach(track => {
        stream.removeTrack(track);
        track.stop();
      });
      stream?.addTrack(replacement);
      if (stream) setLocalStream(new MediaStream(stream.getTracks()));
      setSelectedCameraId(next.deviceId);
      refreshCameraZoom(replacement);
    } catch (error) {
      showCallError(mediaFailureMessage(error, "camera"));
    }
  }, [callDevices, callStatus, liveStatus, refreshCallDevices, refreshCameraZoom, selectedCameraId, switchCamera]);

  const adjustCameraZoom = useCallback(async (direction: "in" | "out") => {
    const track = localVideoRef.current?.getMediaStreamTrack()
      ?? localStreamRef.current?.getVideoTracks()[0];
    if (!track || !cameraZoom) return;
    const next = Math.min(
      cameraZoom.max,
      Math.max(cameraZoom.min, cameraZoom.value + (direction === "in" ? cameraZoom.step : -cameraZoom.step)),
    );
    try {
      await track.applyConstraints({
        advanced: [{ zoom: next } as MediaTrackConstraintSet],
      });
      setCameraZoom(current => current ? { ...current, value: next } : null);
    } catch {
      setCameraZoom(null);
    }
  }, [cameraZoom]);

  const selectSpeaker = useCallback((deviceId: string) => {
    setSelectedSpeakerId(deviceId);
    setDeviceIssue(null);
  }, []);

  const reportSpeakerFailure = useCallback(() => {
    setDeviceIssue({
      kind: "audiooutput",
      message: "تعذّر استخدام مكبر الصوت المحدد. اختر مخرجاً آخر أو غيّره من إعدادات الجهاز.",
    });
  }, []);

  const reportSpeakerSuccess = useCallback(() => {
    setDeviceIssue(null);
    trackCallDeviceOutcome("audiooutput", "switch_succeeded");
    if (disconnectedDeviceKindRef.current === "audiooutput") {
      trackCallDeviceOutcome("audiooutput", "recovery_succeeded");
      disconnectedDeviceKindRef.current = null;
    }
  }, []);

  const reportDeviceRecoveryAttempt = useCallback((kind: CallDeviceKind) => {
    if (disconnectedDeviceKindRef.current !== kind) return;
    trackCallDeviceOutcome(kind, "recovery_attempted");
  }, []);

  const beginCallerWebRtc = useCallback(async (callId: string, peer: string, withVideo: boolean) => {
    if (mediaSetupCallRef.current === callId) return;
    mediaSetupCallRef.current = callId;
    const generation = callGenerationRef.current;
    const isCurrentCall = () => currentCallIdRef.current === callId && callGenerationRef.current === generation;
    try {
      setCallPhase("connecting");
      const config = await loadDeferredConfig(isCurrentCall, fetchCallRtcConfig);
      if (!config) return;
      // Calls deliberately have no Agora fallback. A deployment without TURN is
      // not permitted to silently create a less reliable call path.
      if (config.provider !== "webrtc" && !canUseHybridWebRtc(config)) {
        throw new Error("WebRTC TURN calling is unavailable");
      }
      const { pc } = await createWebRtcCall(config, peer, callId, withVideo, true, isCurrentCall);
      if (!isCurrentCall()) return;
      const offer = await pc.createOffer();
      if (!isCurrentCall()) return;
      await pc.setLocalDescription(offer);
      if (!isCurrentCall()) return;
      callSignalingReadyRef.current.add(callId);
      sendWS({
        type: "call-webrtc-offer", callId, to: peer, offer: pc.localDescription,
        transport: DEFERRED_WEBRTC_TRANSPORT,
      });
      for (const candidate of pendingCallIceRef.current.splice(0)) {
        sendWS({ type: "ice-candidate", to: peer, callId, candidate });
      }
    } catch (error) {
      if (!isCurrentCall()) return;
      showCallError(mediaFailureMessage(error), 12_000);
      sendWS({ type: "call-end", to: peer, callId });
      currentCallIdRef.current = null;
      setCallPhase("ended");
      setCallStatus("ended");
      void leaveAgora();
    }
  }, [createWebRtcCall, leaveAgora, sendWS]);

  // New invitations carry the caller's SDP offer from the first socket frame.
  // This is intentionally separate from beginCallerWebRtc, which remains the
  // compatibility path for older deferred invitations.
  const createDirectCallerOffer = useCallback(async (
    callId: string,
    peer: string,
    withVideo: boolean,
  ): Promise<RTCSessionDescriptionInit | null> => {
    if (mediaSetupCallRef.current === callId) return null;
    mediaSetupCallRef.current = callId;
    const generation = callGenerationRef.current;
    const isCurrentCall = () => currentCallIdRef.current === callId && callGenerationRef.current === generation;
    const config = await loadDeferredConfig(isCurrentCall, fetchCallRtcConfig);
    if (!config) return null;
    if (config.provider !== "webrtc" && !canUseHybridWebRtc(config)) {
      throw new Error("WebRTC TURN calling is unavailable");
    }
    const { pc } = await createWebRtcCall(config, peer, callId, withVideo, true, isCurrentCall);
    if (!isCurrentCall()) return null;
    const offer = await pc.createOffer();
    if (!isCurrentCall()) return null;
    await pc.setLocalDescription(offer);
    if (!isCurrentCall()) return null;
    if (!pc.localDescription) throw new Error("WebRTC offer was not created");
    return pc.localDescription;
  }, [createWebRtcCall]);

  const answerWebRtcOffer = useCallback(async (msg: {
    callId: string; from: string; offer: RTCSessionDescriptionInit;
  }, withVideo: boolean, mode: "deferred" | "direct" = "deferred",
  canAnswer: () => boolean = () => true): Promise<RTCSessionDescriptionInit | null> => {
    if (!canAnswer()) return null;
    if (mediaSetupCallRef.current === msg.callId) return null;
    mediaSetupCallRef.current = msg.callId;
    const generation = callGenerationRef.current;
    const isCurrentCall = () => currentCallIdRef.current === msg.callId &&
      callGenerationRef.current === generation && canAnswer();
    try {
      setCallPhase("connecting");
      const config = await loadDeferredConfig(isCurrentCall, fetchCallRtcConfig);
      if (!config) return null;
      if (config.provider !== "webrtc" && !canUseHybridWebRtc(config)) {
        throw new Error("WebRTC TURN calling is unavailable");
      }
      callSignalingReadyRef.current.add(msg.callId);
      const { pc } = await createWebRtcCall(config, msg.from, msg.callId, withVideo, false, isCurrentCall);
      if (!isCurrentCall()) return null;
      await pc.setRemoteDescription(msg.offer);
      if (!isCurrentCall()) return null;
      for (const candidate of pendingRemoteIceRef.current.splice(0)) {
        try { await pc.addIceCandidate(candidate); } catch { /* stale candidate */ }
        if (!isCurrentCall()) return null;
      }
      const answer = await pc.createAnswer();
      if (!isCurrentCall()) return null;
      await pc.setLocalDescription(answer);
      if (!isCurrentCall()) return null;
      if (!pc.localDescription) throw new Error("WebRTC answer was not created");
      if (mode === "direct") return pc.localDescription;
      sendWS({
        type: "call-webrtc-answer", callId: msg.callId, to: msg.from, answer: pc.localDescription,
        transport: DEFERRED_WEBRTC_TRANSPORT,
      });
      return null;
    } catch (error) {
      if (mode === "direct") throw error;
      if (!isCurrentCall()) return null;
      showCallError(mediaFailureMessage(error), 12_000);
      sendWS({ type: "call-reject", to: msg.from, callId: msg.callId });
      currentCallIdRef.current = null;
      setCallPhase("ended");
      setCallStatus("ended");
      void leaveAgora();
      return null;
    }
  }, [createWebRtcCall, leaveAgora, sendWS]);

  // ── Connect WebSocket ──────────────────────────────────────────────────────
  useEffect(() => {
    const generation = ++identityGenerationRef.current;
    let disposed = false;
    const isCurrent = (ws?: WebSocket) =>
      !disposed &&
      generation === identityGenerationRef.current &&
      (!ws || wsRef.current === ws);

    if (!user || STANDALONE_MODE) {
      setRealtimeConnected();
      wasConnectedRef.current = false;
      reconnectAttemptRef.current = 0;
      setConnected(false);
      setOnlineUsers([]);
      setActiveLives([]);
      setIncomingCall(null);
      setActivePeer(null);
      setActiveCallId(null);
      setCallStatus("idle");
      setCallPhase("idle");
      setLiveStatus("idle");
      setCurrentLiveId(null);
      setConnectionTest("idle");
      currentCallIdRef.current = null;
      historyRef.current = null;
      return () => { disposed = true; };
    }

    const expectedUserId = user.id;
    const signalingDeviceId = signalingDeviceIdFor(user.id);

    const clearReconnect = () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    };

    const scheduleReconnect = () => {
      if (!isCurrent() || !navigator.onLine) return;
      clearReconnect();
      const attempt = reconnectAttemptRef.current++;
      const backoff = Math.min(30_000, 1_000 * 2 ** attempt);
      const jitter = Math.floor(Math.random() * Math.min(1_000, backoff * 0.25));
      reconnectRef.current = setTimeout(connect, backoff + jitter);
    };

    const connect = () => {
      if (!isCurrent()) return;
      if (!navigator.onLine) {
        setRealtimeConnecting();
        return;
      }
      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;
      setRealtimeConnecting();
      const ws = new WebSocket(websocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isCurrent(ws)) { ws.close(); return; }
        ws.send(JSON.stringify({
          type: "register",
          userId: user.id,
          username: user.username,
          deviceId: signalingDeviceId,
        }));
        pingRef.current = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" })); }, 25000);
      };

      ws.onmessage = async (e) => {
        if (!isCurrent(ws)) return;
        let msg: any;
        try { msg = JSON.parse(e.data as string); } catch { return; }
        // Firestore-backed signaling may replay frames after a reconnect.
        // signalId is optional for compatibility, but authoritative whenever
        // supplied: never let the same durable signal transition UI twice.
        if (!rememberDurableCallSignal(seenCallSignalsRef.current, msg.callId, msg.signalId)) return;

        if (msg.type === "registered") {
          // The server derives this value from the session. A mismatch means
          // this socket was opened during an account transition; never relay
          // any of its private events into the current React identity.
          if (msg.userId !== expectedUserId) {
            ws.close(4002, "Identity changed");
            return;
          }
          setConnected(true);
          registeredSocketRef.current = true;
          // This is deliberately inert for a ringing recipient: resuming
          // fetches canonical state only and never requests media/answers.
          resumeCurrentCall();
          flushCallResumes();
          flushPendingCallIce();
          reconnectAttemptRef.current = 0;
          setRealtimeConnected();
          window.dispatchEvent(new Event("gdna:realtime-connected"));
          if (wasConnectedRef.current) {
            window.dispatchEvent(new Event("gdna:realtime-reconnected"));
            window.dispatchEvent(new Event("gdna:realtime-refetch"));
          }
          wasConnectedRef.current = true;
        }
        if (msg.type === "session-ended") {
          ws.close(4001, "Session ended");
          return;
        }
        if (msg.type === "online-list")   { setOnlineUsers(msg.users); }
        if (msg.type === "pong")          { /* alive */ }
        // Forward notification events to any listeners via CustomEvent so
        // NotificationBell can react without opening a second WS connection.
        if (msg.type === "notification")  {
          window.dispatchEvent(new CustomEvent("gdna:notification", { detail: msg.notification }));
        }
        // Messenger instances consume this event rather than opening a second
        // WebSocket. The message was already filtered to room members by the API.
        if (msg.type === "chat-message") {
          window.dispatchEvent(new CustomEvent("gdna:chat-message", { detail: msg }));
        }
        if (msg.type === "chat-read") {
          window.dispatchEvent(new CustomEvent("gdna:chat-read", { detail: msg }));
        }
        if (msg.type === "chat-typing") {
          window.dispatchEvent(new CustomEvent("gdna:chat-typing", { detail: msg }));
        }
        if (msg.type === "chat-message-deleted") {
          window.dispatchEvent(new CustomEvent("gdna:chat-message-deleted", { detail: msg }));
        }
        if (msg.type === "call-recording-control" && typeof msg.callId === "string") {
          // Dispatch group frames before applying the direct-call guard. The
          // group controller owns its active id and the server has already
          // authenticated its selected device/participant.
          window.dispatchEvent(new CustomEvent("gdna:recording-control", { detail: msg }));
        }

        // ── Incoming call ──────────────────────────────────────────────────
        if (msg.type === "call-incoming" || msg.type === "call-resumed") {
          pendingCallResumesRef.current.delete(msg.callId);
          // A callee sends Answer first, then asks the authoritative store for
          // this selected-device snapshot. Only this durable winner opens the
          // Agora token/join gate.
          if (msg.type === "call-resumed" && msg.callId === currentCallIdRef.current) {
            // This envelope is an authoritative answered snapshot, not a new
            // invitation. Its original ringing deadline no longer applies.
            clearRingTimer();
            settleDurableAnswer(msg.callId);
            // A resumed durable envelope records the provider transition. It
            // is equivalent to call-provider-changed after a socket restart,
            // never a fresh timed fallback.
            if (msg.transport?.provider === "agora" && msg.transport?.version === 1) {
              void switchToAgoraAfterServerAck(msg.callId);
            }
          }
          // Ignore if already in / being offered another call
          if (!currentCallIdRef.current) {
            const expiresAt = typeof msg.expiresAt === "number"
              ? msg.expiresAt
              : typeof msg.expiresAt === "string" &&
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(msg.expiresAt)
                ? Date.parse(msg.expiresAt) : NaN;
            // Only the canonical server deadline may open incoming UI. Never
            // manufacture a fresh 30 seconds from receipt or a replay.
            if (!Number.isFinite(expiresAt) || !Number.isFinite(new Date(expiresAt).getTime()) ||
              expiresAt <= Date.now()) return;
            if (typeof msg.expiresAt === "string" &&
              new Date(expiresAt).toISOString().slice(0, 19) !== msg.expiresAt.slice(0, 19)) return;
            const deferred = isDeferredWebRtcTransport(msg.transport, msg.deferredMedia);
            const direct = isDirectWebRtcTransport(msg.transport, msg.deferredMedia, msg.offer);
            const agora = !deferred &&
              msg.transport?.provider === "agora" &&
              msg.transport?.version === 1 &&
              msg.offer === null;
            // Direct offers are shown but never answered automatically. The
            // callee's explicit Answer gesture is the media-permission gate.
            if (!deferred && !direct && !agora) {
              sendWS({ type: "call-reject", to: msg.from, callId: msg.callId, code: "MEDIA_PROTOCOL_MISMATCH" });
              return;
            }
            currentCallIdRef.current = msg.callId;
            currentCallPeerRef.current = msg.from;
            callGenerationRef.current += 1;
            callDirectionRef.current = "incoming";
            callVideoRef.current = Boolean(msg.video);
            setIncomingCall({
              from: msg.from,
              callId: msg.callId,
              video: msg.video,
              offer: direct ? msg.offer : null,
              transport: direct || agora ? msg.transport : DEFERRED_WEBRTC_TRANSPORT,
              e2e: msg.e2e,
              callerId: msg.callerId,
              callerName: msg.callerName,
              callerAvatar: msg.callerAvatar,
              expiresAt,
              deferredMedia: deferred,
            });
            setCallPhase("ringing");
            setCallStatus("ringing");
            if (document.visibilityState === "hidden") {
              showForegroundCallNotification(
                msg.callerName || msg.from || "Incoming call",
                msg.video ? "Incoming video call" : "Incoming voice call",
              );
            }
            clearRingTimer();
            const expiry = { callId: msg.callId, generation: callGenerationRef.current, expiresAt };
            incomingExpiryRef.current = expiry;
            checkIncomingExpiry(expiry);
          }
        }

        if (msg.type === "call-ready" && typeof msg.callId === "string") {
          settleCallReady(msg.callId);
        }

        // ── Accepted means the callee consented; media becomes active only
        // once the peer connection actually delivers remote tracks. ─────────
        if (msg.type === "call-accepted" && msg.callId === currentCallIdRef.current) {
          const deferred = isDeferredWebRtcTransport(msg.transport, msg.deferredMedia);
          const agora = !deferred &&
            msg.transport?.provider === "agora" &&
            msg.transport?.version === 1 &&
            msg.answer === null;
          const direct = !deferred &&
            msg.transport?.provider === WEBRTC_TRANSPORT.provider &&
            msg.transport?.version === WEBRTC_TRANSPORT.version &&
            isRtcDescription(msg.answer, "answer");
          if (!deferred && !direct && !agora) {
            showCallError("تعذّر التحقق من بروتوكول وسائط المكالمة");
            sendWS({ type: "call-end", to: msg.from, callId: msg.callId });
            setActualMediaConnected(false);
            const endedGeneration = ++callGenerationRef.current;
            currentCallIdRef.current = null;
            callDirectionRef.current = null;
            void leaveAgora();
            setCallPhase("ended");
            setCallStatus("ended");
            setTimeout(() => {
              if (!isCurrent(ws) || currentCallIdRef.current || callGenerationRef.current !== endedGeneration) return;
              setCallStatus("idle");
              setActivePeer(null);
              setActiveCallId(null);
            }, 1_500);
            return;
          }
          if (callDirectionRef.current === "outgoing") {
            const pc = callPcRef.current;
            if (agora) {
              // Consent can arrive before token fetching/client creation, or
              // be the first durable snapshot after reconnect. It confirms the
              // invitation, not WebRTC readiness; startCall still owns joining.
              settleCallReady(msg.callId);
              clearRingTimer();
              if (!mediaConnectedRef.current) setCallPhase("accepted");
              return;
            }
            // Replayed acceptance cannot regress an active call to accepted or
            // submit the same SDP answer a second time.
            if ((deferred && mediaSetupCallRef.current === msg.callId) ||
              (!deferred && (applyingRemoteAnswerRef.current.has(msg.callId) || !!pc?.remoteDescription))) {
              return;
            }
            clearRingTimer();
            setCallPhase("accepted");
            if (deferred) {
              void beginCallerWebRtc(msg.callId, msg.from, callVideoRef.current);
            } else if (pc && isRtcDescription(msg.answer, "answer")) {
              applyingRemoteAnswerRef.current.add(msg.callId);
              try {
                await pc.setRemoteDescription(msg.answer);
                for (const candidate of pendingRemoteIceRef.current.splice(0)) {
                  try { await pc.addIceCandidate(candidate); } catch { /* stale candidate */ }
                }
                scheduleHybridFallback(msg.callId);
              } catch {
                showCallError("تعذّر إكمال اتصال WebRTC", 12_000);
                sendWS({ type: "call-end", to: msg.from, callId: msg.callId });
                setActualMediaConnected(false);
                const endedGeneration = ++callGenerationRef.current;
                currentCallIdRef.current = null;
                callDirectionRef.current = null;
                void leaveAgora();
                setCallPhase("ended");
                setCallStatus("ended");
                setTimeout(() => {
                  if (!isCurrent(ws) || currentCallIdRef.current || callGenerationRef.current !== endedGeneration) return;
                  setCallStatus("idle");
                  setActivePeer(null);
                  setActiveCallId(null);
                }, 1_500);
              } finally {
                applyingRemoteAnswerRef.current.delete(msg.callId);
              }
            } else {
              showCallError("تعذّر إكمال اتصال WebRTC", 12_000);
              sendWS({ type: "call-end", to: msg.from, callId: msg.callId });
              setActualMediaConnected(false);
              const endedGeneration = ++callGenerationRef.current;
              currentCallIdRef.current = null;
              callDirectionRef.current = null;
              void leaveAgora();
              setCallPhase("ended");
              setCallStatus("ended");
              setTimeout(() => {
                if (!isCurrent(ws) || currentCallIdRef.current || callGenerationRef.current !== endedGeneration) return;
                setCallStatus("idle");
                setActivePeer(null);
                setActiveCallId(null);
              }, 1_500);
            }
          }
        }

        if (msg.type === "call-webrtc-offer" && msg.callId === currentCallIdRef.current && msg.offer) {
          if (callDirectionRef.current === "incoming") {
            void answerWebRtcOffer(msg, callVideoRef.current);
          }
        }

        if (msg.type === "call-webrtc-answer" && msg.callId === currentCallIdRef.current && msg.answer && callPcRef.current) {
          const pc = callPcRef.current;
          if (applyingRemoteAnswerRef.current.has(msg.callId) || pc.remoteDescription ||
            pc.signalingState !== "have-local-offer") return;
          applyingRemoteAnswerRef.current.add(msg.callId);
          try {
            await pc.setRemoteDescription(msg.answer);
            for (const candidate of pendingRemoteIceRef.current.splice(0)) {
              try { await pc.addIceCandidate(candidate); } catch { /* stale candidate */ }
            }
          } finally {
            applyingRemoteAnswerRef.current.delete(msg.callId);
          }
        }

        if (
          msg.type === "call-provider-changed" &&
          msg.callId === currentCallIdRef.current &&
          msg.transport?.provider === "agora" &&
          msg.transport?.version === 1
        ) {
          // A local timeout merely requests the change. Both callers wait for
          // this durable server acknowledgement before changing transports.
          if (hybridFallbackTimerRef.current) clearTimeout(hybridFallbackTimerRef.current);
          hybridFallbackTimerRef.current = null;
          void switchToAgoraAfterServerAck(msg.callId);
        }

        if (msg.type === "ice-candidate" && msg.callId === currentCallIdRef.current) {
          if (!rememberRemoteIceCandidate(seenRemoteIceRef.current, msg.callId, msg.candidate)) return;
          if (callPcRef.current?.remoteDescription) {
            try { await callPcRef.current.addIceCandidate(msg.candidate); } catch { /* stale candidate */ }
          } else {
            pendingRemoteIceRef.current.push(msg.candidate);
          }
        }

        if (
          msg.type === "call-renegotiate-offer" &&
          msg.callId === currentCallIdRef.current &&
          msg.transport?.provider === "webrtc" &&
          msg.transport.version === 1 &&
          callProviderRef.current === "webrtc" &&
          callPcRef.current
        ) {
          const pc = callPcRef.current;
          const config = callRtcConfigRef.current;
          if (!config) return;
          if (!isRtcDescription(msg.offer, "offer") ||
            appliedRenegotiationOfferRef.current.get(msg.callId) === msg.offer.sdp) return;
          appliedRenegotiationOfferRef.current.set(msg.callId, msg.offer.sdp);
          pc.setConfiguration({
            iceServers: config.iceServers,
            iceTransportPolicy: config.provider === "hybrid" ? "all" : "relay",
          });
          try {
            await pc.setRemoteDescription(msg.offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendWS({
              type: "call-renegotiate-answer",
              callId: msg.callId,
              answer: pc.localDescription,
              transport: { provider: "webrtc", version: 1 },
            });
          } catch {
            appliedRenegotiationOfferRef.current.delete(msg.callId);
          }
        }

        if (
          msg.type === "call-renegotiate-answer" &&
          msg.callId === currentCallIdRef.current &&
          msg.transport?.provider === "webrtc" &&
          msg.transport.version === 1 &&
          callProviderRef.current === "webrtc" &&
          callPcRef.current
        ) {
          const pc = callPcRef.current;
          if (!isRtcDescription(msg.answer, "answer") ||
            appliedRenegotiationAnswerRef.current.get(msg.callId) === msg.answer.sdp ||
            pc.signalingState !== "have-local-offer") return;
          appliedRenegotiationAnswerRef.current.set(msg.callId, msg.answer.sdp);
          try {
            await pc.setRemoteDescription(msg.answer);
          } catch {
            appliedRenegotiationAnswerRef.current.delete(msg.callId);
          }
        }

        // ── Call rejected / ended — only for OUR current call ──────────────
        if ((msg.type === "call-rejected" || msg.type === "call-ended")
            && msg.callId === currentCallIdRef.current) {
          settleCallReady(msg.callId, new Error("CALL_SETUP_REJECTED"));
          settleDurableAnswer(msg.callId, new Error("CALL_SETUP_REJECTED"));
          clearRingTimer();
          if (callDirectionRef.current === "outgoing") {
            showForegroundCallNotification(
              "GDNA Arena",
              msg.type === "call-rejected"
                ? "The call was declined."
                : msg.code === "RING_TIMEOUT" ? "The call was not answered." : "The call has ended.",
            );
          }
          if (msg.code === "MEDIA_HEARTBEAT_TIMEOUT" || msg.code === "MEDIA_START_TIMEOUT") {
            showCallError("أُنهيت المكالمة لأن اتصال الوسائط الفعلي لم يعد قابلاً للتحقق", 15_000);
          }
          setActualMediaConnected(false);
          callGenerationRef.current += 1;
          currentCallIdRef.current = null;
          callDirectionRef.current = null;
          setCallPhase("ended");
          // Callee side: caller gave up while we were ringing — hide the banner.
          setIncomingCall(null);
          setCallStatus("ended");
          void leaveAgora();
          setTimeout(() => {
            if (!isCurrent(ws)) return;
            setCallStatus("idle"); setActivePeer(null); setActiveCallId(null);
          }, 2000);
        }

        if (msg.type === "call-busy" || msg.type === "call-unavailable" || msg.type === "call-blocked") {
          if (typeof msg.callId === "string") {
            settleCallReady(msg.callId, new Error("CALL_SETUP_REJECTED"));
            settleDurableAnswer(msg.callId, new Error("CALL_SETUP_REJECTED"));
          }
          if (typeof msg.callId === "string" && msg.callId !== currentCallIdRef.current) return;
          setCallBusy(msg.type === "call-busy" || msg.code === "CALL_BUSY");
          clearRingTimer();
          callGenerationRef.current += 1;
          currentCallIdRef.current = null;
          callDirectionRef.current = null;
          setCallPhase("ended");
          // The server persists offline missed calls so the callee receives them
          // after reconnecting. Do not create a second client-side history row.
          if (msg.type === "call-unavailable" && msg.missedLogged === true) {
            historyRef.current = null;
          }
          // Callee side safety: if a block denial races an incoming banner, clear it.
          setIncomingCall(null);
          showCallError(
             msg.code === "SECURE_DEVICE_KEYS_CHANGED"
               ? "🔐 تغيّرت مفاتيح الأجهزة الآمنة — اطلب مكالمة جديدة بعد تحديث الأجهزة"
               : msg.code === "CALL_SIGNALING_UNAVAILABLE"
              ? "إشارات المكالمة غير متاحة حالياً. لم يتم بدء مسار بديل — أعد المحاولة بعد استعادة الاتصال."
              : msg.code === "MEDIA_PROTOCOL_MISMATCH"
              ? "إصدار وسائط المكالمة غير متوافق — حدّث الصفحة وحاول مجدداً"
            : msg.type === "call-busy"
              ? "📞 أحد المشاركين في مكالمة أخرى. يمكنك التحقق من مكالمتك السابقة في المراسلات."
              : msg.type === "call-blocked"
                ? "🚫 لا يمكن إجراء هذه المكالمة — التواصل بينكما محجوب"
                : "تعذّر إكمال المكالمة حالياً — حاول مجدداً بعد لحظات.");
          void leaveAgora();
          setCallStatus("ended");
          setTimeout(() => {
            if (!isCurrent(ws)) return;
            setCallStatus("idle"); setActivePeer(null); setActiveCallId(null);
          }, 1500);
        }

        // ── Live events (live stories keep the WebRTC path) ────────────────
        if (msg.type === "live-available") {
          setActiveLives(prev => [...prev.filter(l => l.liveId !== msg.liveId), { liveId: msg.liveId, host: msg.host, title: msg.title, domain: msg.domain }]);
        }
        if (msg.type === "live-ended") {
          setActiveLives(prev => prev.filter(l => l.liveId !== msg.liveId));
        }
        if (msg.type === "live-started") {
          setCurrentLiveId(msg.liveId as string);
          setLiveStatus("live");
        }

        // ── Live WebRTC viewer side ────────────────────────────────────────
        if (msg.type === "live-viewer-joined" && pcRef.current) {
          const offer = await pcRef.current.createOffer();
          if (!isCurrent(ws) || !pcRef.current) return;
          await pcRef.current.setLocalDescription(offer);
          if (!isCurrent(ws)) return;
          sendWS({ type: "live-offer", to: msg.viewer, offer, liveId: msg.liveId });
        }
        if (msg.type === "live-offer") {
          const pc = createLivePC(msg.from, msg.liveId);
          localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
          await pc.setRemoteDescription(msg.offer);
          if (!isCurrent(ws) || pcRef.current !== pc) { pc.close(); return; }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (!isCurrent(ws) || pcRef.current !== pc) { pc.close(); return; }
          sendWS({ type: "live-answer", to: msg.from, answer, liveId: msg.liveId });
        }
        if (msg.type === "live-answer" && pcRef.current) {
          const pc = pcRef.current;
          await pc.setRemoteDescription(msg.answer);
          if (!isCurrent(ws) && pcRef.current === pc) pc.close();
        }
        if (msg.type === "live-ice" && pcRef.current) {
          try { await pcRef.current.addIceCandidate(msg.candidate); } catch { /* stale */ }
        }
      };

      ws.onclose = () => {
        if (!isCurrent(ws)) return;
        registeredSocketRef.current = false;
        wsRef.current = null;
        setConnected(false);
        setRealtimeConnecting();
        window.dispatchEvent(new Event("gdna:realtime-disconnected"));
        if (pingRef.current) clearInterval(pingRef.current);
        // The WebSocket is only signaling transport. Do not release local
        // media or dismiss caller/callee state for a transient replica restart.
        // Registration on the next socket sends call-resume for this exact id.
        scheduleReconnect();
      };

      ws.onerror = () => ws.close();
    };

    const reconnectImmediately = () => {
      if (!isCurrent() || !navigator.onLine) return;
      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;
      clearReconnect();
      connect();
    };
    const onOnline = () => {
      window.dispatchEvent(new Event("gdna:realtime-refetch"));
      reconnectImmediately();
    };
    const onOffline = () => {
      clearReconnect();
      setRealtimeConnecting();
      wsRef.current?.close();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") reconnectImmediately();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (isOnline) connect();
    return () => {
      disposed = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (pingRef.current) clearInterval(pingRef.current);
      if (mediaHeartbeatRef.current) clearInterval(mediaHeartbeatRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      pingRef.current = null;
      reconnectRef.current = null;
      const ws = wsRef.current;
      setActualMediaConnected(false);
      wsRef.current = null;
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      clearRingTimer();
      rejectPendingCallSetups("تم إغلاق اتصال المكالمة");
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      try { pcRef.current?.close(); } catch { /* already closed */ }
      pcRef.current = null;
      if (preflightClientRef.current) {
        void preflightClientRef.current.leave().catch(() => {});
        preflightClientRef.current = null;
      }
      void leaveAgora();
      currentCallIdRef.current = null;
      historyRef.current = null;
      setConnected(false);
      setOnlineUsers([]);
      setActiveLives([]);
      setIncomingCall(null);
      setActivePeer(null);
      setActiveCallId(null);
      setCallStatus("idle");
      setCallPhase("idle");
      setLiveStatus("idle");
      setCurrentLiveId(null);
      setConnectionTest("idle");
      setCallError(null);
      setCallBusy(false);
    };
  }, [user?.id, user?.username, isOnline, answerWebRtcOffer, beginCallerWebRtc, checkIncomingExpiry, clearRingTimer, flushPendingCallIce, leaveAgora, rejectPendingCallSetups, resumeCurrentCall, scheduleHybridFallback, setActualMediaConnected, setRealtimeConnected, setRealtimeConnecting, settleCallReady, settleDurableAnswer, signalingDeviceIdFor, switchToAgoraAfterServerAck]);

  // A route change or logout must not leave a microphone/camera LED on.
  useEffect(() => () => {
    clearRingTimer();
    void leaveAgora();
  }, [leaveAgora]);

  // ── Live-story peer connection (WebRTC, unchanged path) ───────────────────
  const createLivePC = (peerUsername: string, liveId: string) => {
    const pc = new RTCPeerConnection({ iceServers: LIVE_ICE_SERVERS });
    pcRef.current = pc;
    pc.onicecandidate = (e) => {
      if (e.candidate) sendWS({ type: "live-ice", to: peerUsername, candidate: e.candidate, liveId });
    };
    pc.ontrack = (e) => setRemoteStream(e.streams[0]);
    return pc;
  };

  const prepareAgoraMedia = useCallback(async (withVideo: boolean) => {
    if (!window.isSecureContext) throw new Error("Secure browser media is unavailable");
    const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    localAudioRef.current = audioTrack;
    let videoTrack: ICameraVideoTrack | undefined;
    if (withVideo) {
      try {
        videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoRef.current = videoTrack;
      } catch (error) {
        // Keep the invitation usable as audio-only while surfacing the camera
        // failure once the call UI is visible.
        showCallError(`${mediaFailureMessage(error, "camera")} — ستستمر المكالمة صوتياً`, 15_000);
      }
    }
    return { audioTrack, videoTrack };
  }, []);

  // ── Start a call ──────────────────────────────────────────────────────────
  const startCall = useCallback(async (targetUsername: string, withVideo = true) => {
    if (groupCallActiveRef.current) {
      showCallError("أنهِ مكالمة المجموعة أولاً قبل بدء مكالمة مباشرة");
      return;
    }
    if (callStatus !== "idle" || currentCallIdRef.current) {
      showCallError("مكالمة أخرى جارية بالفعل — أنهِها أولاً");
      return;
    }
    if (!user) {
      showCallError("يجب تسجيل الدخول أولاً");
      return;
    }
    if (!isOnline) {
      showCallError("أنت غير متصل بالشبكة — لا يمكن بدء مكالمة الآن");
      return;
    }
    if (wsRef.current?.readyState !== WebSocket.OPEN || !registeredSocketRef.current) {
      showCallError("الاتصال بالشبكة منقطع — انتظر ثوانٍ وأعد المحاولة");
      return;
    }
    if (!secureCallRegistrationReadyRef.current) {
      showCallError("🔐 الجهاز الآمن غير مسجل بعد — انتظر التسجيل أو أعد المحاولة من إعدادات الأجهزة");
      return;
    }
    const callId = `call_${crypto.randomUUID().replace(/-/g, "")}`;
    setCallBusy(false);
    let offered = false;
    let callGeneration = 0;
    let callStateStarted = false;
    let agoraConfig: CallRtcConfig | null = null;
    let agoraCallSecret = "";
    try {
      currentCallIdRef.current = callId;
      currentCallPeerRef.current = targetUsername;
      callGeneration = ++callGenerationRef.current;
      callStateStarted = true;
      callDirectionRef.current = "outgoing";
      callVideoRef.current = withVideo;
      microphoneEnabledRef.current = true;
      cameraEnabledRef.current = true;
      setActivePeer(targetUsername);
      setActiveCallId(callId);
      setActiveVideo(withVideo);
      setCallPhase("ringing");
      setCallStatus("calling");

      let recipients: E2ERecipientKey[] | null = null;
      for (let attempt = 0; attempt < 3 && !recipients; attempt++) {
        const keyResponse = await fetch(
          apiPath(`/api/messages/e2e/users/${encodeURIComponent(targetUsername)}/key`),
          { credentials: "include" },
        );
        if (keyResponse.ok) {
          const keyData = await keyResponse.json() as { keys?: E2ERecipientKey[] };
          recipients = keyData.keys?.length ? keyData.keys : null;
          break;
        }
        if (keyResponse.status !== 409 || attempt === 2) {
          const body = await keyResponse.json().catch(() => ({} as { error?: string }));
          throw new Error(body.error ?? "Secure call key unavailable");
        }
        await new Promise(resolve => setTimeout(resolve, 350));
      }
      if (!recipients) throw new Error("Secure call key unavailable");
      // E2EE recipient keys are the existing authenticated target data. Keep
      // the first user's id as the recording peer; devices never create extra
      // recording participants.
      const recordingPeerId = recipients[0]?.userId;
      if (!Number.isSafeInteger(recordingPeerId)) throw new Error("Secure call recipient is unavailable");
      setRecordingParticipantIds([user.id, recordingPeerId]);
      const callSecret = randomSecret();
      callSecretRef.current = callSecret;
      const wrappedDevices = await Promise.all(recipients.map(async recipient => [
        recipient.deviceId,
        await encryptCallSecret(callSecret, recipient),
      ] as const));
      const e2e = { devices: Object.fromEntries(wrappedDevices) };

      let offer: RTCSessionDescriptionInit | null = null;
      const selectedConfig = await fetchCallRtcConfig();
      if (currentCallIdRef.current !== callId || callGenerationRef.current !== callGeneration) {
        throw new Error("CALL_SETUP_CANCELLED");
      }
      // Hybrid explicitly uses Agora when authenticated TURN is unavailable;
      // it must never present a STUN-only direct path as call readiness.
      const useAgoraInitially = selectedConfig.provider === "agora" ||
        (selectedConfig.provider === "hybrid" && !canUseHybridWebRtc(selectedConfig));
      if (useAgoraInitially) {
        agoraConfig = selectedConfig;
        if (agoraConfig.provider !== "agora" && agoraConfig.provider !== "hybrid") {
          throw new Error("Agora media provider changed during setup");
        }
        callProviderRef.current = "agora";
        callRtcConfigRef.current = agoraConfig;
        // Publish the authenticated invitation first. Caller media permission
        // is requested only after the server confirms durable call readiness.
        agoraCallSecret = callSecret;
      } else {
        // WebRTC/TURN compatibility branch: request caller media and put the
        // direct offer in the first socket message.
        offer = await createDirectCallerOffer(callId, targetUsername, withVideo);
        if (!offer || currentCallIdRef.current !== callId || callGenerationRef.current !== callGeneration) {
          throw new Error("CALL_SETUP_CANCELLED");
        }
      }
      if (wsRef.current?.readyState !== WebSocket.OPEN || !registeredSocketRef.current) {
        throw new Error("Call signaling disconnected before the invitation was sent");
      }
      const callReady = waitForCallReady(callId);
      const sent = sendWS({
        type: "call-offer",
        to: targetUsername,
        offer,
        callId,
        from: user.username,
        video: withVideo,
        deferredMedia: false,
        transport: agoraConfig ? { provider: "agora", version: 1 } : WEBRTC_TRANSPORT,
        e2e,
      });
      if (!sent) {
        settleCallReady(callId, new Error("Call signaling disconnected before the invitation was sent"));
        await callReady;
        return;
      }
      offered = true;
      offeredCallIdRef.current = callId;
      historyRef.current = { peer: targetUsername, video: withVideo, start: Date.now(), outgoing: true, answered: false };

      // The signaling server owns the 30-second ring timeout and durable
      // missed-call write. Do not race it with a browser call-end message.
      await callReady;
      if (currentCallIdRef.current !== callId || callGenerationRef.current !== callGeneration) {
        throw new Error("CALL_SETUP_CANCELLED");
      }
      callSignalingReadyRef.current.add(callId);
      for (const candidate of pendingCallIceRef.current.splice(0)) {
        sendWS({ type: "ice-candidate", to: targetUsername, callId, candidate });
      }
      if (agoraConfig) {
        await createAgoraCall(
          callId,
          withVideo,
          agoraCallSecret,
          signalingDeviceIdFor(user.id),
          undefined,
          undefined,
          () => currentCallIdRef.current === callId && callGenerationRef.current === callGeneration,
        );
      } else if (selectedConfig.provider === "hybrid") {
        // A signed standby token is acquired only after durable invitation
        // creation. It is never logged or used to join until the server
        // authorizes an actual provider switch.
        const standby = await fetchAgoraToken(callId, signalingDeviceIdFor(user.id));
        if (currentCallIdRef.current !== callId || callGenerationRef.current !== callGeneration) {
          throw new Error("CALL_SETUP_CANCELLED");
        }
        agoraStandbyTokenRef.current = { callId, ...standby };
        console.info("[HETZNER] Trying P2P...", { hasToken: true });
      }
    } catch (err: unknown) {
      console.error("[CALL] Failed to start:", err);
      const message = err instanceof Error ? err.message : "";
      if (callStateStarted &&
        (currentCallIdRef.current !== callId || callGenerationRef.current !== callGeneration)) {
        // A late acknowledgement can arrive after local cancellation. End
        // that exact offer without touching a newer call's UI or media.
        if (offered && message !== "CALL_SETUP_REJECTED") {
          sendWS({ type: "call-end", to: targetUsername, callId });
        }
        return;
      }
      clearRingTimer();
      // Only a callee who actually received an offer needs an end signal.
      if (offered && message !== "CALL_SETUP_REJECTED") {
        sendWS({ type: "call-end", to: targetUsername, callId });
      }
      currentCallIdRef.current = null;
      callGenerationRef.current += 1;
      callDirectionRef.current = null;
      setCallPhase("idle");
      setActivePeer(null);
      setActiveCallId(null);
      void leaveAgora();
      if (message !== "CALL_SETUP_REJECTED") {
        showCallError(message.includes("secure") || message.includes("Secure") || message.includes("E2E")
          ? `🔐 ${message}`
          : message.startsWith("Call signaling")
            ? "انقطع اتصال إشارات المكالمة قبل إرسال الدعوة — انتظر إعادة الاتصال وحاول مجدداً"
            : mediaFailureMessage(err));
      }
      setCallStatus("idle");
    }
  }, [callStatus, createDirectCallerOffer, createAgoraCall, fetchCallRtcConfig, isOnline, leaveAgora, sendWS, settleCallReady, signalingDeviceIdFor, setActualMediaConnected, user, waitForCallReady]);

  // ── Answer an incoming call ────────────────────────────────────────────────
  const answerCall = useCallback(async (withVideo = true) => {
    const invitation = incomingCall;
    if (!invitation) return;
    const expiry = incomingExpiryRef.current;
    if (!expiry || expiry.callId !== invitation.callId ||
      currentCallIdRef.current !== invitation.callId ||
      callGenerationRef.current !== expiry.generation) return;
    if (!Number.isFinite(invitation.expiresAt) || invitation.expiresAt <= Date.now()) {
      expireIncomingRef.current(expiry);
      return;
    }
    const deferred = isDeferredWebRtcTransport(invitation.transport, invitation.deferredMedia);
    const agora = !deferred &&
      invitation.transport?.provider === "agora" &&
      invitation.transport?.version === 1 &&
      invitation.offer === null;
    const generation = callGenerationRef.current;
    // Direct SDP preparation can cross the deadline (permissions, keys, TURN).
    // Once consent is sent, only the authoritative server may end that call;
    // in particular Agora's durable acceptance must survive the old deadline.
    let consentSent = false;
    const canAnswer = () => currentCallIdRef.current === invitation.callId &&
      callGenerationRef.current === generation &&
      (consentSent || Date.now() < invitation.expiresAt);
    const assertCanAnswer = () => {
      if (currentCallIdRef.current !== invitation.callId || callGenerationRef.current !== generation) {
        throw new Error("CALL_SETUP_CANCELLED");
      }
      if (!canAnswer()) throw new Error("CALL_INVITATION_EXPIRED");
    };
    try {
      assertCanAnswer();
      if (!deferred && !agora && !isDirectWebRtcTransport(invitation.transport, invitation.deferredMedia, invitation.offer)) {
        throw new Error("Secure call media protocol is unavailable");
      }
      clearRingTimer();
      setActivePeer(invitation.from);
      setActiveCallId(invitation.callId);
      const callerId = invitation.callerId;
      if (!user || typeof callerId !== "number" || !Number.isSafeInteger(callerId)) {
        throw new Error("Secure call participant is unavailable");
      }
      setRecordingParticipantIds([user.id, callerId]);
      setActiveVideo(withVideo && invitation.video);
      callVideoRef.current = withVideo && invitation.video;
      microphoneEnabledRef.current = true;
      cameraEnabledRef.current = true;
      setIncomingCall(null);
      setCallPhase(deferred ? "accepted" : "connecting");
      setCallStatus("calling");
      if (deferred) {
        // Compatibility path: the caller creates SDP after this consent frame.
        assertCanAnswer();
        consentSent = sendWS({
          type: "call-answer",
          to: invitation.from,
          answer: null,
          callId: invitation.callId,
          deferredMedia: true,
          transport: DEFERRED_WEBRTC_TRANSPORT,
        });
        return;
      }

      if (agora) {
        // Answer is only an invitation-consent signal. The durable selected
        // device/session is established by the authoritative store before any
        // callee token request or media permission operation.
        assertCanAnswer();
        const answerReady = waitForDurableAnswer(invitation.callId);
        consentSent = sendWS({
          type: "call-answer",
          to: invitation.from,
          answer: null,
          callId: invitation.callId,
          deferredMedia: false,
          transport: { provider: "agora", version: 1 },
        });
        sendWS({ type: "call-resume", callId: invitation.callId });
        const resumeTimer = setInterval(() => sendWS({ type: "call-resume", callId: invitation.callId }), 500);
        try {
          await answerReady;
          // This authoritative selected-device acknowledgement wins even if
          // signaling send returned false or the original ring deadline passed.
          consentSent = true;
        } finally {
          clearInterval(resumeTimer);
        }
        if (currentCallIdRef.current !== invitation.callId || callGenerationRef.current !== generation || !user) {
          throw new Error("CALL_SETUP_CANCELLED");
        }
        const identity = await ensureDeviceIdentity(user.id);
        assertCanAnswer();
        const envelope = invitation.e2e?.devices?.[identity.deviceId];
        if (!envelope) throw new Error("Secure call key is unavailable for this device");
        const secret = await decryptCallSecret(user.id, envelope);
        assertCanAnswer();
        callSecretRef.current = secret;
        await createAgoraCall(
          invitation.callId,
          withVideo && invitation.video,
          secret,
          signalingDeviceIdFor(user.id),
          undefined,
          undefined,
          () => currentCallIdRef.current === invitation.callId &&
            callGenerationRef.current === generation,
        );
        return;
      }

      // Direct invitations already contain the caller's offer. Creating the
      // answer here is the first callee media operation, after explicit Answer.
      if (!user) throw new Error("CALL_SETUP_CANCELLED");
      const identity = await ensureDeviceIdentity(user.id);
      assertCanAnswer();
      const envelope = invitation.e2e?.devices?.[identity.deviceId];
      if (!envelope) throw new Error("Secure call key is unavailable for this device");
      const secret = await decryptCallSecret(user.id, envelope);
      assertCanAnswer();
      callSecretRef.current = secret;
      const answer = await answerWebRtcOffer({
        callId: invitation.callId,
        from: invitation.from,
        offer: invitation.offer!,
      }, withVideo && invitation.video, "direct", canAnswer);
      assertCanAnswer();
      if (!answer) throw new Error("CALL_SETUP_CANCELLED");
      if (currentCallIdRef.current !== invitation.callId || callGenerationRef.current !== generation) return;
      // Direct SDP has now been negotiated. Only this point can start hybrid's
      // bounded fallback window; an unanswered invitation never can.
      scheduleHybridFallback(invitation.callId);
      consentSent = sendWS({
        type: "call-answer",
        to: invitation.from,
        answer,
        callId: invitation.callId,
        deferredMedia: false,
        transport: WEBRTC_TRANSPORT,
      });
    } catch (err: unknown) {
      console.error("[CALL] Failed to answer:", err);
      if (currentCallIdRef.current !== invitation.callId || callGenerationRef.current !== generation) return;
      clearRingTimer();
      void leaveAgora();
      const expired = !consentSent && invitation.expiresAt <= Date.now();
      // Tell the caller the answer failed so they don't ring forever.
      if (!expired) sendWS({ type: "call-reject", to: invitation.from, callId: invitation.callId });
      currentCallIdRef.current = null;
      callGenerationRef.current += 1;
      callDirectionRef.current = null;
      setIncomingCall(null);
      setActivePeer(null);
      setActiveCallId(null);
      setRecordingParticipantIds([]);
      setCallPhase("idle");
      setCallStatus("idle");
      const message = err instanceof Error ? err.message : "";
      showCallError(expired ? "انتهت صلاحية دعوة المكالمة"
        : message.includes("secure") || message.includes("Secure") || message.includes("E2E")
        ? `🔐 ${message}`
        : mediaFailureMessage(err));
    }
  }, [answerWebRtcOffer, clearRingTimer, createAgoraCall, decryptCallSecret, incomingCall, leaveAgora, scheduleHybridFallback, sendWS, signalingDeviceIdFor, user, waitForDurableAnswer]);

  // ── Reject call ───────────────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    if (currentCallIdRef.current !== incomingCall.callId || incomingExpiryRef.current?.callId !== incomingCall.callId) return;
    clearRingTimer();
    sendWS({ type: "call-reject", to: incomingCall.from, callId: incomingCall.callId });
    currentCallIdRef.current = null;
    callGenerationRef.current += 1;
    callDirectionRef.current = null;
    setIncomingCall(null);
    setCallPhase("idle");
    setCallStatus("idle");
  }, [clearRingTimer, incomingCall, sendWS]);

  const clearNotificationCallActionUrl = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("callId");
    url.searchParams.delete("action");
    url.searchParams.delete("answer");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  // A notification action is inert until this account has a registered socket
  // and the server has resumed the canonical invitation. In particular, a
  // passive missed-call click has no action parameter and is intentionally
  // ignored here.
  useEffect(() => {
    if (!user) return;
    const parsed = readNotificationCallAction(window.location.search);
    if (!parsed) return;
    const key = `${user.id}:${parsed.callId}:${parsed.action}`;
    const current = pendingNotificationActionRef.current;
    if (current && current.accountId !== user.id) {
      pendingNotificationActionRef.current = null;
      clearNotificationCallActionUrl();
      return;
    }
    if (seenNotificationActionRef.current === key) return;
    seenNotificationActionRef.current = key;
    const pending: PendingNotificationCallAction = {
      ...parsed,
      accountId: user.id,
      expiresAt: Date.now() + RING_TIMEOUT_MS,
      resumeSent: false,
    };
    pendingNotificationActionRef.current = pending;
    const timeout = window.setTimeout(() => {
      if (pendingNotificationActionRef.current !== pending) return;
      pendingNotificationActionRef.current = null;
      clearNotificationCallActionUrl();
      showCallError("انتهت صلاحية دعوة المكالمة");
    }, RING_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [clearNotificationCallActionUrl, user?.id]);

  useEffect(() => {
    const pending = pendingNotificationActionRef.current;
    if (!pending || !user || pending.accountId !== user.id || pending.resumeSent || !connected) return;
    pending.resumeSent = true;
    sendWS({ type: "call-resume", callId: pending.callId });
  }, [connected, sendWS, user?.id]);

  // A notification body click carries only callId. Resume the authenticated
  // invitation so the normal incoming banner appears, but never auto-answer.
  useEffect(() => {
    if (!connected || !user) return;
    if (readNotificationCallAction(window.location.search)) return;
    const parsed = readNotificationCallResume(window.location.search);
    if (!parsed || seenNotificationResumeRef.current === `${user.id}:${parsed.callId}`) return;
    seenNotificationResumeRef.current = `${user.id}:${parsed.callId}`;
    sendWS({ type: "call-resume", callId: parsed.callId });
    clearNotificationCallActionUrl();
  }, [clearNotificationCallActionUrl, connected, sendWS, user?.id]);

  useEffect(() => {
    const pending = pendingNotificationActionRef.current;
    if (!pending || !incomingCall || !user || !canApplyNotificationCallAction(pending, user.id, incomingCall.callId)) return;
    // Clear before invoking either action. React state updates and duplicate
    // Firestore/FCM/WS signals therefore cannot apply it a second time.
    pendingNotificationActionRef.current = null;
    clearNotificationCallActionUrl();
    if (pending.action === "decline") {
      rejectCall();
    } else {
      void answerCall(incomingCall.video);
    }
  }, [answerCall, clearNotificationCallActionUrl, incomingCall, rejectCall, user?.id]);

  // ── End active call ───────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    clearRingTimer();
    if (activePeer && activeCallId) {
      sendWS(callStatus === "calling" && callDirectionRef.current === "outgoing"
        ? { type: "call-cancel", callId: activeCallId, status: "missed" }
        : { type: "call-end", to: activePeer, callId: activeCallId });
    }
    setActualMediaConnected(false);
    callGenerationRef.current += 1;
    currentCallIdRef.current = null;
    callDirectionRef.current = null;
    void leaveAgora();
    pcRef.current?.close();
    setCallStatus("idle");
    setCallPhase("idle");
    setActivePeer(null);
    setActiveCallId(null);
  }, [activePeer, activeCallId, callStatus, leaveAgora, sendWS, setActualMediaConnected]);

  // ── Screen share (Agora) ──────────────────────────────────────────────────
  const stopScreenShare = useCallback(async () => {
    if (callProviderRef.current === "webrtc") {
      const pc = callPcRef.current;
      const screen = webRtcScreenTrackRef.current;
      const camera = webRtcCameraTrackRef.current;
      webRtcScreenTrackRef.current = null;
      webRtcCameraTrackRef.current = null;
      const sender = pc?.getTransceivers().find(item => item.receiver.track.kind === "video")?.sender;
      try { await sender?.replaceTrack(camera); } catch { /* surfaced by current call state */ }
      screen?.stop();
      const audio = localStreamRef.current?.getAudioTracks()[0];
      const restored = new MediaStream([audio, camera].filter((track): track is MediaStreamTrack => Boolean(track)));
      localStreamRef.current = restored;
      setLocalStream(restored);
      setScreenSharing(false);
      return;
    }
    const client = agoraRef.current;
    const screen = screenTrackRef.current;
    // close() can emit track-ended synchronously; make manual and browser-driven
    // stops converge without publishing the camera twice.
    if (!screen) {
      setScreenSharing(false);
      return;
    }
    screenTrackRef.current = null;
    if (client && screen) {
      try { await client.unpublish(screen); } catch { /* already gone */ }
    }
    screen?.close();
    if (client && localVideoRef.current) {
      try {
        await client.publish(localVideoRef.current);
      } catch (error) {
        console.error("[CALL] Failed to restore camera after screen sharing:", error);
        showCallError("تعذّرت استعادة الكاميرا — أنهِ المكالمة ثم أعد الاتصال لاستعادة الفيديو", 15_000);
      }
    }
    const audioTrack = localAudioRef.current?.getMediaStreamTrack();
    const videoTrack = localVideoRef.current?.getMediaStreamTrack();
    const restoredTracks = [audioTrack, videoTrack].filter((track): track is MediaStreamTrack => Boolean(track));
    const restored = restoredTracks.length ? new MediaStream(restoredTracks) : null;
    localStreamRef.current = restored;
    setLocalStream(restored);
    setScreenSharing(false);
  }, []);

  const startScreenShare = useCallback(async () => {
    if (callProviderRef.current === "webrtc" && callPcRef.current && callStatus === "active") {
      if (!screenShareSupported) {
        showCallError("مشاركة الشاشة غير مدعومة على هذا الجهاز — المكالمة ستستمر بشكل طبيعي");
        return;
      }
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screen = display.getVideoTracks()[0];
        if (!screen) throw new Error("Screen track unavailable");
        const sender = callPcRef.current.getTransceivers()
          .find(item => item.receiver.track.kind === "video")?.sender;
        if (!sender) throw new Error("Video sender unavailable");
        const camera = localStreamRef.current?.getVideoTracks()[0] ?? null;
        webRtcCameraTrackRef.current = camera;
        webRtcScreenTrackRef.current = screen;
        await sender.replaceTrack(screen);
        const audio = localStreamRef.current?.getAudioTracks()[0];
        const shared = new MediaStream([audio, screen].filter((track): track is MediaStreamTrack => Boolean(track)));
        localStreamRef.current = shared;
        setLocalStream(shared);
        setScreenSharing(true);
        screen.addEventListener("ended", () => { void stopScreenShare(); }, { once: true });
      } catch (error) {
        showCallError(mediaFailureMessage(error, "camera"), 15_000);
      }
      return;
    }
    const client = agoraRef.current;
    if (!client || callStatus !== "active") {
      showCallError("مشاركة الشاشة متاحة أثناء المكالمة النشطة فقط");
      return;
    }
    if (!screenShareSupported) {
      showCallError("مشاركة الشاشة غير مدعومة على هذا الجهاز — المكالمة ستستمر بشكل طبيعي");
      return;
    }
    let cameraUnpublished = false;
    let screen: ILocalVideoTrack | null = null;
    try {
      screen = await AgoraRTC.createScreenVideoTrack({}, "disable");
      screenTrackRef.current = screen;
      if (localVideoRef.current) {
        await client.unpublish(localVideoRef.current);
        cameraUnpublished = true;
      }
      await client.publish(screen);
      const audioTrack = localAudioRef.current?.getMediaStreamTrack();
      const screenMediaTrack = screen.getMediaStreamTrack();
      const sharedStream = new MediaStream([
        ...(audioTrack ? [audioTrack] : []),
        screenMediaTrack,
      ]);
      localStreamRef.current = sharedStream;
      setLocalStream(sharedStream);
      setScreenSharing(true);
      screen.on("track-ended", () => { void stopScreenShare(); });
    } catch (error) {
      screenTrackRef.current = null;
      try { screen?.close(); } catch { /* creation/publish did not complete */ }
      if (cameraUnpublished && localVideoRef.current) {
        try { await client.publish(localVideoRef.current); } catch { /* surfaced below */ }
      }
      const name = (error as { name?: string })?.name;
      const code = (error as { code?: string })?.code;
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const permissionDenied =
        name === "NotAllowedError" ||
        name === "PermissionDeniedError" ||
        code === "PERMISSION_DENIED" ||
        message.includes("permission") ||
        message.includes("denied") ||
        message.includes("cancel");
      showCallError(
        permissionDenied
          ? "تم رفض مشاركة الشاشة — اضغط مشاركة الشاشة مجدداً، اختر نافذة أو شاشة، ثم اسمح بالمشاركة"
          : "تعذرت مشاركة الشاشة على هذا الجهاز أو المتصفح — جرّب متصفحاً حديثاً أو أعد المحاولة",
        15_000,
      );
    }
  }, [callStatus, screenShareSupported, stopScreenShare]);

  // ── Start live story (WebRTC path, unchanged) ─────────────────────────────
  const startLive = useCallback(async (title: string, domain: string) => {
    if (!isOnline) {
      showCallError("أنت غير متصل بالشبكة — لا يمكن بدء بث مباشر الآن");
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      showCallError("الكاميرا والميكروفون غير متاحين في هذا المتصفح — افتح الموقع عبر اتصال آمن");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setSelectedCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? "");
      refreshCameraZoom(stream.getVideoTracks()[0]);
      void refreshCallDevices();
      setLiveStatus("live");
      sendWS({ type: "live-start", title, domain });
    } catch (err) {
      console.error("[LIVE] Failed:", err);
      showCallError(mediaFailureMessage(err, "camera"), 12_000);
    }
  }, [isOnline, refreshCallDevices, refreshCameraZoom, sendWS]);

  const endLive = useCallback(() => {
    sendWS({ type: "live-end" });
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setLiveStatus("idle");
    setCurrentLiveId(null);
  }, [sendWS]);

  // ── Join a live ───────────────────────────────────────────────────────────
  const joinLive = useCallback(async (liveId: string) => {
    if (!isOnline) {
      showCallError("أنت غير متصل بالشبكة — لا يمكن الانضمام إلى البث الآن");
      return;
    }
    const live = activeLives.find((item) => item.liveId === liveId);
    if (!live) {
      showCallError("انتهى هذا البث أو لم يعد متاحاً");
      return;
    }
    const pc = createLivePC(live.host, liveId);
    pcRef.current = pc;
    sendWS({ type: "live-join", liveId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLives, isOnline, sendWS]);

  // ── Log outgoing calls to history exactly once, with the real call type ────
  useEffect(() => {
    if (!user) return;
    // A call only counts as answered if it actually transitioned to "active" —
    // ring time is NOT evidence of an answer (rejected/unavailable calls ring too).
    if (callStatus === "active" && historyRef.current) {
      historyRef.current.answered = true;
      historyRef.current.start = Date.now(); // duration = talk time, not ring time
    }
    if ((callStatus === "idle" || callStatus === "ended") && historyRef.current) {
      const { peer, video, start, outgoing, answered } = historyRef.current;
      historyRef.current = null;
      if (!outgoing || !peer) return; // only the caller logs, avoids duplicates
      const durationSec = answered ? Math.floor((Date.now() - start) / 1000) : 0;
      const status = answered ? "answered" : "missed";
      fetch(apiPath("/api/social/v2/call-history"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calleeUsername: peer, callType: video ? "video" : "audio", status, durationSec }),
        credentials: "include",
      }).catch(() => {});
    }
  }, [callStatus, user]);

  return {
    connected, callStatus, callPhase, liveStatus, incomingCall,
    activePeer, activeVideo, activeCallId, recordingCallId: activeCallId,
    recordingLocalUserId: user?.id, recordingParticipantIds,
    onlineUsers, activeLives, currentLiveId,
    localStream, remoteStream, screenSharing,
    callError, callBusy, clearCallBusy,
    connectionTest,
    networkState, networkQuality,
    callDevices, selectedMicrophoneId, selectedCameraId, selectedSpeakerId,
    cameraZoom, canFlipCamera: callDevices.filter(device => device.kind === "videoinput").length > 1,
    speakerSelectionSupported, screenShareSupported, deviceIssue, switchingDevice,
    startCall, answerCall, rejectCall, endCall,
    testConnection,
    startLive, endLive, joinLive,
    startScreenShare, stopScreenShare,
    refreshCallDevices, switchMicrophone, switchCamera, selectSpeaker,
    setMicrophoneEnabled, setCameraEnabled,
    flipCamera, adjustCameraZoom,
    reportSpeakerFailure, reportSpeakerSuccess, reportDeviceRecoveryAttempt,
    ...callPush,
    soundBlocked, enableCallSound,
    secureCallRegistrationStatus, secureCallRegistrationError, retrySecureCallRegistration,
  };
}

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
