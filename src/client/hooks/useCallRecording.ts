import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  sendRecordingControl,
  subscribeRecordingControl,
  type IncomingRecordingControl,
} from "@/components/communication/recording-control";

const CONSENT_TIMEOUT_MS = 60_000;
type RecordingState = "idle" | "awaiting-consent" | "incoming-consent" | "consent-granted" | "recording" | "ready" | "error";

export interface UseCallRecordingOptions {
  active: boolean;
  callId: string | null;
  localUserId: number;
  /** Expected other member IDs. Including localUserId is tolerated and ignored. */
  participantUserIds: number[];
  localStream: MediaStream | null;
  /** 1:1 compatibility input. Prefer remoteStreams for group calls. */
  remoteStream?: MediaStream | null;
  remoteStreams?: MediaStream[];
  /** Only pass a deliberately composited, consented video stream. */
  compositeVideoStream?: MediaStream | null;
}

interface ConsentRequest {
  callId: string;
  requestId: string;
  direction: "outgoing" | "incoming";
  expected: Set<number>;
  timer?: ReturnType<typeof setTimeout>;
}

/** Small, testable gate: only expected members may acknowledge the live request. */
export class RecordingConsentTracker {
  private accepted = new Set<number>();
  constructor(readonly requestId: string, private readonly expected: Set<number>) {}
  accept(requestId: string, userId: number) {
    if (requestId !== this.requestId || !this.expected.has(userId)) return false;
    this.accepted.add(userId);
    return this.expected.size > 0 && this.accepted.size === this.expected.size;
  }
}

function recorderMime() {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
}

function makeRequestId() {
  return crypto.randomUUID().replace(/-/g, "_");
}

function validParticipants(localUserId: number, participantUserIds: number[]) {
  return [...new Set(participantUserIds.filter(id => Number.isSafeInteger(id) && id > 0 && id !== localUserId))].sort((a, b) => a - b);
}

export function useCallRecording({
  active, callId, localUserId, participantUserIds, localStream,
  remoteStream = null, remoteStreams, compositeVideoStream = null,
}: UseCallRecordingOptions) {
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const clonesRef = useRef<MediaStreamTrack[]>([]);
  const requestRef = useRef<ConsentRequest | null>(null);
  const trackerRef = useRef<RecordingConsentTracker | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const participants = useMemo(() => validParticipants(localUserId, participantUserIds), [localUserId, participantUserIds]);
  const participantKey = participants.join(",");
  const remoteAudioStreams = remoteStreams?.length ? remoteStreams : remoteStream ? [remoteStream] : [];
  const remoteAudioStreamsRef = useRef(remoteAudioStreams);
  remoteAudioStreamsRef.current = remoteAudioStreams;
  const localStreamRef = useRef(localStream);
  localStreamRef.current = localStream;
  const activeRef = useRef(active);
  activeRef.current = active;
  const callIdRef = useRef(callId);
  callIdRef.current = callId;
  const participantIdsRef = useRef(participants);
  participantIdsRef.current = participants;
  const discardOnStopRef = useRef(false);

  const cleanUp = useCallback(() => {
    clonesRef.current.forEach(track => track.stop());
    clonesRef.current = [];
    void contextRef.current?.close();
    contextRef.current = null;
    recorderRef.current = null;
  }, []);

  const clearRequest = useCallback(() => {
    if (requestRef.current?.timer) clearTimeout(requestRef.current.timer);
    requestRef.current = null;
    trackerRef.current = null;
  }, []);

  const stopRecorder = useCallback((discard = false) => {
    discardOnStopRef.current = discard;
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    else cleanUp();
  }, [cleanUp]);

  const stop = useCallback(() => {
    const request = requestRef.current;
    const currentCallId = callIdRef.current;
    if (request && currentCallId) sendRecordingControl({ callId: request.callId, requestId: request.requestId, action: "stop" });
    clearRequest();
    stopRecorder(false);
  }, [clearRequest, stopRecorder]);

  const cancelForRosterChange = useCallback((message: string) => {
    const request = requestRef.current;
    const currentCallId = callIdRef.current;
    if (request && currentCallId) sendRecordingControl({ callId: request.callId, requestId: request.requestId, action: "stop" });
    clearRequest();
    stopRecorder(true);
    setError(message);
    setState("idle");
  }, [clearRequest, stopRecorder]);

  const beginLocalRecording = useCallback(() => {
    const currentCallId = callIdRef.current;
    const request = requestRef.current;
    if (!activeRef.current || !currentCallId || !request || recorderRef.current) return;
    try {
      const composite = compositeVideoStream?.getVideoTracks().length ? compositeVideoStream : null;
      const context = new AudioContext();
      const destination = context.createMediaStreamDestination();
      const streams = [localStreamRef.current, ...remoteAudioStreamsRef.current]
        .filter((stream): stream is MediaStream => Boolean(stream?.getAudioTracks().length));
      for (const stream of streams) {
        const clonedTracks = stream.getAudioTracks().map(track => track.clone());
        clonesRef.current.push(...clonedTracks);
        context.createMediaStreamSource(new MediaStream(clonedTracks)).connect(destination);
      }
      const videoTracks = composite?.getVideoTracks().map(track => track.clone()) ?? [];
      clonesRef.current.push(...videoTracks);
      const output = new MediaStream([...destination.stream.getAudioTracks(), ...videoTracks]);
      contextRef.current = context;
      const mimeType = videoTracks.length
        ? ["video/webm;codecs=vp8,opus", "video/webm"].find(type => MediaRecorder.isTypeSupported(type))
        : recorderMime();
      const recorder = new MediaRecorder(output, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        cleanUp();
        setError("Recording failed.");
        setState("error");
      };
      recorder.onstop = () => {
        const result = new Blob(chunks, { type: recorder.mimeType || (videoTracks.length ? "video/webm" : "audio/webm") });
        cleanUp();
        if (!discardOnStopRef.current && result.size) {
          setBlob(result);
          setState("ready");
        } else setState("idle");
        discardOnStopRef.current = false;
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      setState("recording");
      // Deliberately no non-canonical "started" wire action. The local REC
      // indicator is the source of truth; server allowlist remains canonical.
    } catch {
      cleanUp();
      setError("Your browser could not start a local recording.");
      setState("error");
    }
  }, [cleanUp, compositeVideoStream]);

  const start = useCallback(() => {
    const currentCallId = callIdRef.current;
    const expected = participantIdsRef.current;
    const hasAudio = Boolean(localStreamRef.current?.getAudioTracks().length || remoteAudioStreamsRef.current.some(stream => stream.getAudioTracks().length));
    if (!activeRef.current || !currentCallId || !Number.isSafeInteger(localUserId) || localUserId <= 0 || !expected.length) {
      setError("All current call participants must be identified before recording can be requested.");
      return;
    }
    if (!hasAudio) {
      setError("No call audio is available to record.");
      setState("error");
      return;
    }
    clearRequest();
    const requestId = makeRequestId();
    const request: ConsentRequest = { callId: currentCallId, requestId, direction: "outgoing", expected: new Set(expected) };
    request.timer = setTimeout(() => {
      if (requestRef.current?.requestId !== requestId) return;
      clearRequest();
      setError("Recording consent request timed out.");
      setState("idle");
    }, CONSENT_TIMEOUT_MS);
    requestRef.current = request;
    trackerRef.current = new RecordingConsentTracker(requestId, request.expected);
    setError(null);
    setBlob(null);
    setState("awaiting-consent");
    sendRecordingControl({ callId: currentCallId, requestId, action: "request" });
  }, [clearRequest, localUserId]);

  const respondToConsent = useCallback((accepted: boolean) => {
    const request = requestRef.current;
    const currentCallId = callIdRef.current;
    if (!currentCallId || !request || request.direction !== "incoming" || stateRef.current !== "incoming-consent") return;
    sendRecordingControl({ callId: currentCallId, requestId: request.requestId, action: accepted ? "accept" : "reject" });
    if (request.timer) clearTimeout(request.timer);
    request.timer = undefined;
    setState(accepted ? "consent-granted" : "idle");
    if (!accepted) clearRequest();
  }, [clearRequest]);

  const revoke = useCallback(() => {
    const request = requestRef.current;
    const currentCallId = callIdRef.current;
    if (request && currentCallId) sendRecordingControl({ callId: currentCallId, requestId: request.requestId, action: "revoke" });
    clearRequest();
    stopRecorder(true);
    setState("idle");
  }, [clearRequest, stopRecorder]);

  const download = useCallback(() => {
    if (!blob) return;
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `call-recording-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 0);
  }, [blob]);

  useEffect(() => {
    if (!callId || !Number.isSafeInteger(localUserId) || localUserId <= 0) return;
    return subscribeRecordingControl((control: IncomingRecordingControl) => {
      const request = requestRef.current;
      const expected = participantIdsRef.current;
      // The server identity is authoritative. Ignore self echoes, unknown
      // senders, other calls, stale request IDs, and actions from old rosters.
      if (control.callId !== callId || control.serverFromUserId === localUserId || !expected.includes(control.serverFromUserId)) return;
      if (control.action === "request") {
        if (recorderRef.current || request) return;
        const incoming: ConsentRequest = {
          callId: control.callId, requestId: control.requestId, direction: "incoming",
          expected: new Set([control.serverFromUserId]),
        };
        incoming.timer = setTimeout(() => {
          if (requestRef.current?.requestId !== incoming.requestId) return;
          clearRequest();
          setState("idle");
        }, CONSENT_TIMEOUT_MS);
        requestRef.current = incoming;
        setError(null);
        setState("incoming-consent");
        return;
      }
      if (!request || control.requestId !== request.requestId) return;
      if (control.action === "accept" && request.direction === "outgoing" && stateRef.current === "awaiting-consent") {
        if (trackerRef.current?.accept(control.requestId, control.serverFromUserId)) {
          if (request.timer) clearTimeout(request.timer);
          request.timer = undefined;
          beginLocalRecording();
        }
        return;
      }
      if (control.action === "reject" || control.action === "revoke" || control.action === "stop") {
        clearRequest();
        stopRecorder(control.action !== "stop");
        setError(control.action === "reject" ? "Recording was declined by a participant." : "Recording stopped because consent changed.");
        setState("idle");
      }
    });
  }, [beginLocalRecording, callId, clearRequest, localUserId, stopRecorder]);

  const rosterRef = useRef<string | null>(null);
  useEffect(() => {
    const next = `${callId ?? ""}:${localUserId}:${participantKey}`;
    if (rosterRef.current && rosterRef.current !== next && requestRef.current) {
      cancelForRosterChange("Call participants changed. New consent is required before recording.");
    }
    rosterRef.current = next;
  }, [callId, cancelForRosterChange, localUserId, participantKey]);

  useEffect(() => {
    if (!active && (requestRef.current || recorderRef.current)) cancelForRosterChange("Recording stopped because the call ended.");
  }, [active, cancelForRosterChange]);

  useEffect(() => () => {
    const request = requestRef.current;
    if (request) sendRecordingControl({ callId: request.callId, requestId: request.requestId, action: "stop" });
    clearRequest();
    stopRecorder(true);
  }, [clearRequest, stopRecorder]);

  return {
    state, error, blob,
    available: Boolean(active && callId && Number.isSafeInteger(localUserId) && localUserId > 0 && participants.length),
    recordingFormat: compositeVideoStream?.getVideoTracks().length ? "Composite video" : "Audio-only",
    supported: typeof MediaRecorder !== "undefined" && typeof AudioContext !== "undefined",
    start, stop, respondToConsent, revoke, download,
  };
}