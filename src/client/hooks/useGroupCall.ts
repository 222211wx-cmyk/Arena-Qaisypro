import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decryptCallSecret, encryptCallSecret, type E2ERecipientKey } from "@/lib/amis-e2ee";
import { registerSecureDevice } from "@/lib/secure-device-registration";
import { apiPath } from "@/lib/network";
import { AgoraRTC, fetchAgoraToken, GROUP_APIS as groups, type GroupCallType } from "@/client/lib/communication";
import type { AuthUser } from "@/contexts/AuthContext";
import type { CallStatus } from "@/hooks/useCall";

export type GroupCallStatus = "idle" | "calling" | "ringing" | "connecting" | "active";
export type GroupParticipantStatus = "accepted" | "invited" | "rejected" | "left";

export interface GroupParticipant {
  userId: number;
  username: string;
  status: GroupParticipantStatus;
  deviceId?: string;
}

export interface GroupCall {
  callId: string;
  channel: string;
  roomId: number;
  type: GroupCallType;
  status: "active" | "ended";
  participants: GroupParticipant[];
  e2e: { devices: Record<string, string>; fingerprints?: Record<string, string> };
}

export interface GroupRemoteTrack {
  uid: string | number;
  videoTrack?: { play(element: string | HTMLElement): void; stop?(): void };
  hasAudio: boolean;
  mediaStream: MediaStream;
}

type AgoraClient = ReturnType<typeof AgoraRTC.createClient>;
type LocalTrack = {
  close(): void;
  setEnabled?(enabled: boolean): Promise<void>;
  play?(element: string | HTMLElement): void;
  on?(event: string, listener: () => void): void;
  getMediaStreamTrack?(): MediaStreamTrack;
};

export const GROUP_CALL_BUSY_EVENT = "gdna:group-call-active";
type GroupNotificationAction = "answer" | "reject";

function groupNotificationIntent(search: string): {
  groupCallId: string;
  roomId: number;
  action: GroupNotificationAction | null;
} | null {
  const params = new URLSearchParams(search);
  const groupCallId = params.get("groupCallId") ?? "";
  const roomId = Number(params.get("roomId"));
  const action = params.get("groupCallAction");
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(groupCallId) ||
    !Number.isSafeInteger(roomId) || roomId <= 0 ||
    (action !== null && action !== "answer" && action !== "reject")) return null;
  return { groupCallId, roomId, action };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function randomCallSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

async function encryptionSalt(channel: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`gdna-agora:${channel}`)));
}

function isParticipant(value: unknown): value is GroupParticipant {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return Number.isSafeInteger(item.userId) &&
    typeof item.username === "string" &&
    (item.status === "accepted" || item.status === "invited" || item.status === "rejected" || item.status === "left") &&
    (item.deviceId === undefined || typeof item.deviceId === "string");
}

function asGroupCall(value: unknown): GroupCall | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const source = item.call && typeof item.call === "object" ? item.call as Record<string, unknown> : item;
  const rawType = source.type;
  const devices = source.e2e && typeof source.e2e === "object"
    ? (source.e2e as { devices?: unknown }).devices
    : undefined;
  if (typeof source.callId !== "string" || typeof source.channel !== "string" ||
    !Number.isSafeInteger(source.roomId) ||
    (rawType !== "audio" && rawType !== "video" && rawType !== "voice") ||
    (source.status !== "active" && source.status !== "ended") ||
    !Array.isArray(source.participants) || !source.participants.every(isParticipant) ||
    !devices || typeof devices !== "object" || Array.isArray(devices) ||
    !Object.values(devices).every(value => typeof value === "string")) return null;
  return {
    callId: source.callId,
    channel: source.channel,
    roomId: source.roomId as number,
    type: rawType === "voice" ? "audio" : rawType,
    status: source.status,
    participants: source.participants,
    e2e: { devices: devices as Record<string, string>,
      fingerprints: source.e2e && typeof source.e2e === "object" &&
        (source.e2e as { fingerprints?: unknown }).fingerprints &&
        typeof (source.e2e as { fingerprints?: unknown }).fingerprints === "object"
        ? (source.e2e as { fingerprints: Record<string, string> }).fingerprints : undefined },
  };
}

function incomingCalls(value: unknown): GroupCall[] {
  const candidates = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? ((value as { calls?: unknown; incoming?: unknown }).calls ?? (value as { incoming?: unknown }).incoming)
      : [];
  return Array.isArray(candidates)
    ? candidates.map(asGroupCall).filter((call): call is GroupCall => call !== null)
    : [];
}

function streamForTracks(...tracks: Array<LocalTrack | null | undefined>) {
  const mediaTracks = tracks.flatMap(track => {
    const mediaTrack = track?.getMediaStreamTrack?.();
    return mediaTrack ? [mediaTrack] : [];
  });
  return new MediaStream(mediaTracks);
}

export function useGroupCall(user: AuthUser | null, directCallStatus: CallStatus) {
  const [status, setStatus] = useState<GroupCallStatus>("idle");
  const [call, setCall] = useState<GroupCall | null>(null);
  const [incoming, setIncoming] = useState<GroupCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [remoteTracks, setRemoteTracks] = useState<GroupRemoteTrack[]>([]);
  const [pendingNotificationAction, setPendingNotificationAction] = useState<{
    callId: string;
    action: GroupNotificationAction;
  } | null>(null);

  const clientRef = useRef<AgoraClient | null>(null);
  const localAudioRef = useRef<LocalTrack | null>(null);
  const localVideoRef = useRef<LocalTrack | null>(null);
  const screenTrackRef = useRef<LocalTrack | null>(null);
  const activeCallRef = useRef<GroupCall | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    activeCallRef.current = call;
  }, [call]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const busy = status !== "idle";
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(GROUP_CALL_BUSY_EVENT, { detail: busy }));
  }, [busy]);

  const setFailure = useCallback((message: string) => {
    if (mountedRef.current) setError(message);
  }, []);

  const ensureRegisteredDevice = useCallback(async () => {
    if (!user || typeof user.id !== "number") throw new Error("Group calls are not available for this account schema.");
    const identity = await registerSecureDevice(user.id);
    deviceIdRef.current = identity.deviceId;
    return identity;
  }, [user]);

  const releaseMedia = useCallback(async () => {
    const tracks = new Set<LocalTrack>();
    [localAudioRef.current, localVideoRef.current, screenTrackRef.current].forEach(track => {
      if (track) tracks.add(track);
    });
    localAudioRef.current = null;
    localVideoRef.current = null;
    screenTrackRef.current = null;
    tracks.forEach(track => {
      try { track.close(); } catch { /* Media was already released by the browser. */ }
    });
    const client = clientRef.current;
    clientRef.current = null;
    if (client) {
      try { await client.leave(); } catch { /* Leaving a failed connection is best effort. */ }
    }
    if (mountedRef.current) {
      setRemoteTracks([]);
      setScreenSharing(false);
      setMuted(false);
      setCameraOff(false);
    }
  }, []);

  const attachClientListeners = useCallback((client: AgoraClient) => {
    client.on("user-published", async (remoteUser, mediaType) => {
      try {
        await client.subscribe(remoteUser, mediaType);
        if (mediaType === "audio") remoteUser.audioTrack?.play();
        setRemoteTracks(current => {
          const uid = String(remoteUser.uid);
          const existing = current.find(track => String(track.uid) === uid);
          const audioTrack = remoteUser.audioTrack as unknown as LocalTrack | undefined;
          const videoTrack = remoteUser.videoTrack as unknown as LocalTrack | undefined;
          const retainedTracks = existing?.mediaStream.getTracks().filter(track => track.kind !== mediaType) ?? [];
          const publishedTrack = mediaType === "audio" ? audioTrack?.getMediaStreamTrack?.() : videoTrack?.getMediaStreamTrack?.();
          const next = {
            uid: remoteUser.uid,
            videoTrack: remoteUser.videoTrack
              ? { play: (element: string | HTMLElement) => remoteUser.videoTrack!.play(element), stop: () => remoteUser.videoTrack?.stop() }
              : existing?.videoTrack,
            hasAudio: mediaType === "audio" || existing?.hasAudio === true,
            mediaStream: new MediaStream(publishedTrack ? [...retainedTracks, publishedTrack] : retainedTracks),
          };
          return existing ? current.map(track => String(track.uid) === uid ? next : track) : [...current, next];
        });
      } catch (subscribeError) {
        setFailure(`A participant's media could not be connected: ${errorMessage(subscribeError, "unknown error")}`);
      }
    });
    client.on("user-unpublished", (remoteUser, mediaType) => {
      const uid = String(remoteUser.uid);
      setRemoteTracks(current => current.flatMap(track => {
        if (String(track.uid) !== uid) return [track];
        const next = {
          ...track,
          videoTrack: mediaType === "video" ? undefined : track.videoTrack,
          hasAudio: mediaType === "audio" ? false : track.hasAudio,
          mediaStream: new MediaStream(track.mediaStream.getTracks().filter(mediaTrack => mediaTrack.kind !== mediaType)),
        };
        return next.videoTrack || next.hasAudio ? [next] : [];
      }));
    });
    client.on("user-left", remoteUser => {
      setRemoteTracks(current => current.filter(track => String(track.uid) !== String(remoteUser.uid)));
    });
  }, [setFailure]);

  const connectAndPublish = useCallback(async (
    durableCall: GroupCall,
    secret: string,
    identity: { deviceId: string },
  ) => {
    if (!window.isSecureContext) throw new Error("Group calls require a secure browser connection.");
    const credentials = await fetchAgoraToken(durableCall.channel, identity.deviceId);
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;
    attachClientListeners(client);
    const encryptableClient = client as unknown as {
      setEncryptionConfig(mode: "aes-256-gcm2", secret: string, salt: Uint8Array): void;
    };
    encryptableClient.setEncryptionConfig("aes-256-gcm2", secret, await encryptionSalt(durableCall.channel));
    await client.join(credentials.appId, durableCall.channel, credentials.token, credentials.uid);

    // This is deliberately after the durable create/answer and successful join:
    // no invited participant is prompted for media before they explicitly answer.
    const audio = await AgoraRTC.createMicrophoneAudioTrack();
    localAudioRef.current = audio as unknown as LocalTrack;
    let video: LocalTrack | null = null;
    if (durableCall.type === "video") {
      try {
        video = await AgoraRTC.createCameraVideoTrack() as unknown as LocalTrack;
        localVideoRef.current = video;
      } catch (cameraError) {
        setFailure(`Camera is unavailable. You joined the group call with audio only: ${errorMessage(cameraError, "unknown error")}`);
      }
    }
    await client.publish([audio, ...(video ? [video] : [])] as never[]);
    if (mountedRef.current) {
      setCall(durableCall);
      setStatus("active");
    }
  }, [attachClientListeners, setFailure]);

  const getDurableCall = useCallback(async (callId: string, possibleRecord?: unknown) => {
    return asGroupCall(possibleRecord) ?? asGroupCall(await groups.get(callId));
  }, []);

  const startCall = useCallback(async (roomId: number, type: GroupCallType) => {
    if (!user) return setFailure("Sign in to start a group call.");
    if (directCallStatus !== "idle") return setFailure("Finish your current private call before starting a group call.");
    if (status !== "idle") return setFailure("A group call is already in progress.");
    setError(null);
    setStatus("calling");
    try {
      const identity = await ensureRegisteredDevice();
      const keysResponse = await fetch(apiPath(`/api/messages/rooms/${roomId}/e2e-keys`), {
        credentials: "include",
        cache: "no-store",
      });
      if (!keysResponse.ok) throw new Error("The secure keys for this group are unavailable.");
      const keyData = await keysResponse.json() as { keys?: E2ERecipientKey[]; missingUserIds?: number[] };
      if (keyData.missingUserIds?.length || !keyData.keys?.length) {
        throw new Error("Every group member needs a registered secure device before this call can start.");
      }
      if (!keyData.keys.some(key => key.deviceId === identity.deviceId)) {
        throw new Error("Your secure device is not included in this group.");
      }
      const seenDevices = new Set<string>();
      const secret = randomCallSecret();
      const devices = Object.fromEntries(await Promise.all(keyData.keys.map(async recipient => {
        if (seenDevices.has(recipient.deviceId)) throw new Error("The group contains duplicate secure device identifiers.");
        seenDevices.add(recipient.deviceId);
        return [recipient.deviceId, (await encryptCallSecret(secret, recipient)).wrappedSecret];
      })));
      const created = await groups.create({
        roomId,
        type,
        deviceId: identity.deviceId,
        e2e: { devices, fingerprints: Object.fromEntries(keyData.keys.map(key => [key.deviceId, key.fingerprint])) },
      });
      const durableCall = await getDurableCall((created as { callId?: string }).callId ?? "", created);
      if (!durableCall) throw new Error("The group call was created without a valid durable roster.");
      setCall(durableCall);
      await connectAndPublish(durableCall, secret, identity);
    } catch (startError) {
      await releaseMedia();
      if (mountedRef.current) {
        setStatus("idle");
        setCall(null);
      }
      setFailure(errorMessage(startError, "The group call could not be started."));
    }
  }, [connectAndPublish, directCallStatus, ensureRegisteredDevice, getDurableCall, releaseMedia, setFailure, status, user]);

  const answerCall = useCallback(async () => {
    const invitation = incoming;
    if (!invitation) return;
    if (!user || typeof user.id !== "number") return setFailure("Group calls are not available for this account schema.");
    if (directCallStatus !== "idle") return setFailure("Finish your current private call before answering a group call.");
    setError(null);
    setStatus("connecting");
    try {
      const identity = await ensureRegisteredDevice();
      const answered = await groups.answer(invitation.callId, { deviceId: identity.deviceId });
      const durableCall = await getDurableCall(invitation.callId, answered);
      if (!durableCall || durableCall.status !== "active") throw new Error("This group call is no longer available.");
      const wrappedSecret = durableCall.e2e.devices[identity.deviceId];
      if (!wrappedSecret) throw new Error("This secure call was not encrypted for this device.");
      // Only this browser's own device envelope is ever decrypted, and only
      // after the server has durably selected this device for Answer.
      const secret = await decryptCallSecret(user.id, { wrappedSecret, fingerprint: identity.fingerprint });
      setIncoming(null);
      await connectAndPublish(durableCall, secret, identity);
    } catch (answerError) {
      await releaseMedia();
      if (mountedRef.current) setStatus("ringing");
      setFailure(errorMessage(answerError, "The group call could not be joined."));
    }
  }, [connectAndPublish, directCallStatus, ensureRegisteredDevice, getDurableCall, incoming, releaseMedia, setFailure, user]);

  const rejectCall = useCallback(async () => {
    const invitation = incoming;
    if (!invitation) return;
    setError(null);
    try {
      const identity = await ensureRegisteredDevice();
      await (groups.reject as unknown as (callId: string, input: { deviceId: string }) => Promise<unknown>)(
        invitation.callId,
        { deviceId: identity.deviceId },
      );
      if (mountedRef.current) {
        setIncoming(null);
        setStatus("idle");
      }
    } catch (rejectError) {
      setFailure(errorMessage(rejectError, "The group call invitation could not be declined."));
    }
  }, [ensureRegisteredDevice, incoming, setFailure]);

  const clearGroupNotificationIntent = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("groupCallId");
    url.searchParams.delete("groupCallAction");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const openGroupInvitation = useCallback(async (
    groupCallId: string,
    roomId: number,
    action: GroupNotificationAction | null = null,
  ) => {
    if (!user || !/^[A-Za-z0-9_-]{1,128}$/.test(groupCallId) || !Number.isSafeInteger(roomId) || roomId <= 0) return;
    try {
      const durableCall = asGroupCall(await groups.get(groupCallId));
      const localParticipant = durableCall?.participants.find(participant => participant.userId === user.id);
      if (!durableCall || durableCall.roomId !== roomId || durableCall.status !== "active" ||
        !localParticipant || (localParticipant.status !== "invited" && localParticipant.status !== "accepted")) {
        throw new Error("This group call invitation is no longer available.");
      }
      setIncoming(durableCall);
      setStatus(current => current === "idle" ? "ringing" : current);
      if (action) setPendingNotificationAction({ callId: durableCall.callId, action });
    } catch (invitationError) {
      setFailure(errorMessage(invitationError, "The group call invitation could not be opened."));
    }
  }, [setFailure, user]);

  const endCall = useCallback(async () => {
    const current = activeCallRef.current;
    const deviceId = deviceIdRef.current;
    await releaseMedia();
    if (mountedRef.current) {
      setCall(null);
      setStatus("idle");
    }
    if (!current || !deviceId) return;
    try {
      await groups.end(current.callId, { deviceId });
    } catch (endError) {
      setFailure(errorMessage(endError, "You left locally, but the server could not confirm leaving the group call."));
    }
  }, [releaseMedia, setFailure]);

  const toggleMute = useCallback(async () => {
    const next = !muted;
    try {
      await localAudioRef.current?.setEnabled?.(!next);
      setMuted(next);
    } catch (toggleError) {
      setFailure(`Your microphone could not be updated: ${errorMessage(toggleError, "unknown error")}`);
    }
  }, [muted, setFailure]);

  const toggleCamera = useCallback(async () => {
    const next = !cameraOff;
    try {
      await localVideoRef.current?.setEnabled?.(!next);
      setCameraOff(next);
    } catch (toggleError) {
      setFailure(`Your camera could not be updated: ${errorMessage(toggleError, "unknown error")}`);
    }
  }, [cameraOff, setFailure]);

  const stopScreenShare = useCallback(async () => {
    const client = clientRef.current;
    const screen = screenTrackRef.current;
    if (!client || !screen) return;
    try {
      await client.unpublish(screen as never);
      screen.close();
      screenTrackRef.current = null;
      if (localVideoRef.current && !cameraOff) await client.publish(localVideoRef.current as never);
      setScreenSharing(false);
    } catch (stopError) {
      setFailure(`Screen sharing could not be stopped: ${errorMessage(stopError, "unknown error")}`);
    }
  }, [cameraOff, setFailure]);

  const startScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client || status !== "active") return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      return setFailure("Screen sharing is not supported by this browser.");
    }
    try {
      const created = await AgoraRTC.createScreenVideoTrack({});
      const screen = (Array.isArray(created) ? created[0] : created) as unknown as LocalTrack;
      if (localVideoRef.current) await client.unpublish(localVideoRef.current as never);
      screenTrackRef.current = screen;
      screen.on?.("track-ended", () => { void stopScreenShare(); });
      await client.publish(screen as never);
      setScreenSharing(true);
    } catch (shareError) {
      setFailure(`Screen sharing could not start: ${errorMessage(shareError, "unknown error")}`);
    }
  }, [setFailure, status, stopScreenShare]);

  // FCM is only a wake-up signal. The durable endpoint above remains the
  // authorization boundary and no foreground push can start media by itself.
  useEffect(() => {
    const onGroupWakeUp = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!detail || typeof detail !== "object") return;
      const value = detail as { groupCallId?: unknown; roomId?: unknown };
      if (typeof value.groupCallId !== "string" || typeof value.roomId !== "number" || !Number.isSafeInteger(value.roomId)) return;
      void openGroupInvitation(value.groupCallId, value.roomId);
    };
    window.addEventListener("gdna:group-call-push", onGroupWakeUp);
    return () => window.removeEventListener("gdna:group-call-push", onGroupWakeUp);
  }, [openGroupInvitation]);

  // Group notification URLs intentionally use groupCallId rather than callId,
  // so the direct-call resume handler can never receive this invitation.
  useEffect(() => {
    if (!user) return;
    const intent = groupNotificationIntent(window.location.search);
    if (!intent) return;
    void openGroupInvitation(intent.groupCallId, intent.roomId, intent.action);
  }, [openGroupInvitation, user?.id]);

  useEffect(() => {
    if (!pendingNotificationAction || !incoming || pendingNotificationAction.callId !== incoming.callId) return;
    setPendingNotificationAction(null);
    clearGroupNotificationIntent();
    if (directCallStatus !== "idle") {
      setFailure("Finish your current private call before responding to this group call.");
      return;
    }
    if (pendingNotificationAction.action === "answer") void answerCall();
    else void rejectCall();
  }, [answerCall, clearGroupNotificationIntent, directCallStatus, incoming, pendingNotificationAction, rejectCall, setFailure]);

  useEffect(() => {
    if (!user || status === "active" || status === "calling" || status === "connecting") return;
    let cancelled = false;
    const checkIncoming = async () => {
      try {
        const calls = incomingCalls(await groups.incoming());
        if (!cancelled && calls.length) {
          setIncoming(previous => previous ?? calls[0]);
          setStatus(current => current === "idle" ? "ringing" : current);
        }
      } catch {
        // Polling failures must not erase a visible invitation or produce noisy
        // errors while the browser is temporarily backgrounded.
      }
    };
    void checkIncoming();
    const timer = window.setInterval(() => { void checkIncoming(); }, 4_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [status, user?.id]);

  useEffect(() => {
    if (!call || (status !== "active" && status !== "connecting" && status !== "calling")) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        // This poll intentionally observes the raw status code. The shared
        // helper presents server messages as Error text, which would otherwise
        // make a membership revocation indistinguishable from a transient
        // network failure and leave encrypted media running locally.
        const response = await fetch(apiPath(`/api/communication/groups/${encodeURIComponent(call.callId)}`), {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        if ([403, 404, 410].includes(response.status)) {
          await releaseMedia();
          if (mountedRef.current) {
            setCall(null);
            setIncoming(null);
            setStatus("idle");
            setFailure("You no longer have access to this group call.");
          }
          return;
        }
        if (!response.ok) return;
        const next = asGroupCall(await response.json());
        if (cancelled || !next) return;
        if (next.status === "ended") {
          await releaseMedia();
          if (mountedRef.current) {
            setCall(null);
            setStatus("idle");
            setFailure("This group call has ended.");
          }
          return;
        }
        setCall(next);
      } catch {
        // Do not end an established media session merely because a roster poll
        // was delayed; the next authoritative poll will reconcile it.
      }
    };
    const timer = window.setInterval(() => { void refresh(); }, 2_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [call, releaseMedia, setFailure, status]);

  useEffect(() => {
    if (directCallStatus !== "idle" && status === "ringing") {
      setFailure("A private call is active. Answer this group call after it ends.");
    }
  }, [directCallStatus, setFailure, status]);

  useEffect(() => {
    const onDirectCallActive = (event: Event) => {
      if ((event as CustomEvent<unknown>).detail === true && status === "ringing") {
        setFailure("A private call is active. Answer this group call after it ends.");
      }
    };
    window.addEventListener("gdna:direct-call-active", onDirectCallActive);
    return () => window.removeEventListener("gdna:direct-call-active", onDirectCallActive);
  }, [setFailure, status]);

  const localVideo = screenTrackRef.current ?? localVideoRef.current;
  const localVideoTrack = localVideo?.play
    ? { play: (element: string | HTMLElement) => localVideo.play!(element), stop: () => localVideo.close() }
    : null;
  const localStream = useMemo(
    () => streamForTracks(localAudioRef.current, localVideo),
    [cameraOff, screenSharing, status],
  );

  return {
    status,
    call,
    incoming,
    error,
    busy,
    muted,
    cameraOff,
    screenSharing,
    remoteTracks,
    remoteStreams: remoteTracks.map(track => track.mediaStream),
    localStream,
    localUserId: typeof user?.id === "number" ? user.id : null,
    localVideoTrack,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
  };
}