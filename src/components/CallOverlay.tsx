// ══════════════════════════════════════════════════════════════════════════════
//  CallOverlay — Full-screen voice/video call UI
// ══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
  Volume2, VolumeX, Minimize2, Monitor, MonitorOff, Settings2, SwitchCamera, ZoomIn, ZoomOut
} from "lucide-react";
import type { CallDevice, CallDeviceIssue, CallDeviceKind, CallStatus } from "@/hooks/useCall";
import { SOCIAL_T } from "@/components/social/social-i18n";
import { useLang } from "@/contexts/LangContext";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/gdna-ds/components/ui/select";
import { MEDIA_CONTROL_LABELS } from "./media-control-labels";
import Avatar from "@/components/social/Avatar";
import { getMissedCallsCopy } from "@/i18n/missed-calls-copy";
import { PeerTransferPanel } from "@/components/communication/PeerTransferPanel";
import { CallRecordingPanelView } from "@/components/communication/CallRecordingPanel";
import { useCallRecording } from "@/client/hooks/useCallRecording";

interface IncomingCallView {
  from: string;
  video: boolean;
  /** Extras attached by the useCall hook to the incoming payload; optional so
   *  the overlay stays resilient to the exact shape. */
  callerId?: number;
  callerName?: string;
  callerAvatar?: string | null;
  expiresAt?: number;
  deferredMedia?: boolean;
}

type CallPhaseView = "idle" | "ringing" | "accepted" | "connecting" | "connected" | "ended";

interface Props {
  status:         CallStatus;
  /** Fine-grained phase from useCall; lets the overlay show a distinct
   *  "connecting" state after accept, before media is flowing. Optional. */
  callPhase?:     CallPhaseView;
  peer:           string | null;
  localStream:    MediaStream | null;
  remoteStream:   MediaStream | null;
  incomingCall:   IncomingCallView | null;
  soundBlocked?:  boolean;
  onEnableCallSound?: () => Promise<boolean>;
  onAnswer:       (video: boolean) => void;
  onReject:       () => void;
  onEnd:          () => void;
  screenSharing?: boolean;
  onScreenShare?: () => void;
  onStopScreen?:  () => void;
  callError?:     string | null;
  devices?: CallDevice[];
  selectedMicrophoneId?: string;
  selectedCameraId?: string;
  selectedSpeakerId?: string;
  speakerSelectionSupported?: boolean;
  deviceIssue?: CallDeviceIssue | null;
  switchingDevice?: CallDeviceKind | null;
  onRefreshDevices?: () => Promise<CallDevice[] | undefined>;
  onSwitchMicrophone?: (deviceId: string) => Promise<void>;
  onSwitchCamera?: (deviceId: string) => Promise<void>;
  onMicrophoneEnabledChange?: (enabled: boolean) => Promise<void>;
  onCameraEnabledChange?: (enabled: boolean) => Promise<void>;
  onSelectSpeaker?: (deviceId: string) => void;
  onSpeakerFailure?: () => void;
  onSpeakerSuccess?: () => void;
  onDeviceRecoveryAttempt?: (kind: CallDeviceKind) => void;
  canFlipCamera?: boolean;
  cameraZoom?: { min: number; max: number; step: number; value: number } | null;
  onFlipCamera?: () => void;
  onAdjustCameraZoom?: (direction: "in" | "out") => void;
  /** A stable server-generated call id is required for recording consent. */
  recordingCallId?: string | null;
  /** Authenticated current user ID, supplied by the call provider. */
  recordingLocalUserId?: number;
  /** Expected other call members; including recordingLocalUserId is harmless. */
  recordingParticipantUserIds?: number[];
  /** Group-call input; remoteStream remains the 1:1 compatibility input. */
  recordingRemoteStreams?: MediaStream[];
  /** Optional provider bridge for an already-composited video recording stream. */
  compositeRecordingStream?: MediaStream | null;
}

export default function CallOverlay({
  status, callPhase, peer, localStream, remoteStream, incomingCall, onAnswer, onReject, onEnd,
  soundBlocked = false, onEnableCallSound,
  screenSharing = false, onScreenShare, onStopScreen, callError,
  devices = [], selectedMicrophoneId = "", selectedCameraId = "", selectedSpeakerId = "",
  speakerSelectionSupported = false, deviceIssue = null, switchingDevice = null,
  onRefreshDevices = async () => undefined, onSwitchMicrophone = async () => undefined,
  onSwitchCamera = async () => undefined, onSelectSpeaker = () => undefined,
  onMicrophoneEnabledChange, onCameraEnabledChange,
  onSpeakerFailure = () => undefined, onSpeakerSuccess = () => undefined,
  onDeviceRecoveryAttempt = () => undefined,
  canFlipCamera = false, cameraZoom = null,
  onFlipCamera = () => undefined, onAdjustCameraZoom = () => undefined,
  recordingCallId = null, recordingLocalUserId = 0, recordingParticipantUserIds = [],
  recordingRemoteStreams, compositeRecordingStream = null,
}: Props) {
  const { lang } = useLang();
  const st = SOCIAL_T[lang] ?? SOCIAL_T.en;
  const mediaLabels = MEDIA_CONTROL_LABELS[lang] ?? MEDIA_CONTROL_LABELS.en;
  const ct = getMissedCallsCopy(lang);
  // Connecting = the call is accepted but media is not yet flowing. Prefer the
  // hook's explicit phase; fall back to "active but no remote stream yet".
  const isConnecting = callPhase
    ? (callPhase === "accepted" || callPhase === "connecting")
    : (status === "active" && !remoteStream);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const [muted,       setMuted]       = useState(false);
  const [videoOff,    setVideoOff]    = useState(false);
  const [speakerOff,  setSpeakerOff]  = useState(false);
  const [minimized,   setMinimized]   = useState(false);
  const [duration,    setDuration]    = useState(0);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [devicePickerOpen, setDevicePickerOpen] = useState(false);
  const [communicationPanel, setCommunicationPanel] = useState<"transfer" | "recording" | null>(null);
  const lastTrackedSpeakerIdRef = useRef("");
  // Kept at overlay level so minimizing the call does not stop an active local
  // recording. Group-call surfaces can use CallRecordingPanel directly.
  const callRecording = useCallRecording({
    active: status === "active",
    callId: recordingCallId,
    localUserId: recordingLocalUserId,
    participantUserIds: recordingParticipantUserIds,
    localStream,
    remoteStream,
    remoteStreams: recordingRemoteStreams,
    compositeVideoStream: compositeRecordingStream,
  });

  // Attach streams to video elements
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      void remoteVideoRef.current.play()
        .then(() => setPlaybackBlocked(false))
        .catch(() => setPlaybackBlocked(true));
    }
  }, [remoteStream]);

  useEffect(() => {
    const player = remoteVideoRef.current;
    if (!player || !selectedSpeakerId || !speakerSelectionSupported) return;
    const sinkPlayer = player as HTMLVideoElement & { setSinkId: (deviceId: string) => Promise<void> };
    void sinkPlayer.setSinkId(selectedSpeakerId)
      .then(() => {
        if (lastTrackedSpeakerIdRef.current === selectedSpeakerId) return;
        lastTrackedSpeakerIdRef.current = selectedSpeakerId;
        onSpeakerSuccess();
      })
      .catch(onSpeakerFailure);
  }, [remoteStream, selectedSpeakerId, speakerSelectionSupported, minimized, onSpeakerFailure, onSpeakerSuccess]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Mute local audio
  useEffect(() => {
    if (onMicrophoneEnabledChange) return;
    localStream?.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }, [muted, localStream, onMicrophoneEnabledChange]);

  // Disable local video
  useEffect(() => {
    if (onCameraEnabledChange) return;
    localStream?.getVideoTracks().forEach(t => { t.enabled = !videoOff; });
  }, [videoOff, localStream, onCameraEnabledChange]);

  const toggleMicrophone = async () => {
    const nextMuted = !muted;
    try {
      await onMicrophoneEnabledChange?.(!nextMuted);
      setMuted(nextMuted);
    } catch { /* the call hook surfaces the provider error */ }
  };

  const toggleCamera = async () => {
    const nextVideoOff = !videoOff;
    try {
      await onCameraEnabledChange?.(!nextVideoOff);
      setVideoOff(nextVideoOff);
    } catch { /* the call hook surfaces the provider error */ }
  };

  // Call timer
  useEffect(() => {
    if (status !== "active") { setDuration(0); return; }
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (status === "calling" || status === "ringing") {
      setMuted(false);
      setVideoOff(false);
      setSpeakerOff(false);
      setMinimized(false);
      setPlaybackBlocked(false);
      setDevicePickerOpen(false);
      setCommunicationPanel(null);
    }
  }, [status, peer, incomingCall?.from]);

  const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const hasVideo = !!(localStream?.getVideoTracks().length);
  const microphones = devices.filter(device => device.kind === "audioinput");
  const cameras = devices.filter(device => device.kind === "videoinput");
  const speakers = devices.filter(device => device.kind === "audiooutput");
  const recoveringMicrophone = deviceIssue?.disconnected && deviceIssue.kind === "audioinput";
  const recoveringCamera = deviceIssue?.disconnected && deviceIssue.kind === "videoinput";
  const recoveringSpeaker = deviceIssue?.disconnected && deviceIssue.kind === "audiooutput";

  // ── Call error toast (shown even when idle) ────────────────────────────────
  if (status === "idle") {
    if (!callError) return null;
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          style={{
            position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
            zIndex: 9999, background: "hsl(var(--destructive) / 0.1)", border: "1px solid hsl(var(--destructive) / 0.5)",
            borderRadius: 14, padding: "14px 22px", maxWidth: 400, width: "90vw",
            display: "flex", alignItems: "center", gap: 12,
            boxShadow: "0 8px 32px hsl(var(--destructive) / 0.2)",
          }}>
          <PhoneOff className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--destructive))" }} />
          <p style={{ margin: 0, color: "hsl(var(--destructive))", fontWeight: 700, fontSize: 13, lineHeight: 1.4 }}>
            {callError}
          </p>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Incoming call — fullscreen modal ───────────────────────────────────────
  if (status === "ringing" && incomingCall) {
    const callerName = incomingCall.callerName || incomingCall.from;
    const incomingHeading = lang === "ar" && incomingCall.video
      ? `مكالمة فيديو من ${callerName}`
      : ct.incoming_call;
    return (
      <AnimatePresence>
        <motion.div
          data-testid="incoming-call-modal"
          role="dialog"
          aria-modal="true"
          aria-label={ct.incoming_call}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between px-6 py-14 text-center"
          style={{ background: "hsl(var(--background))" }}
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {incomingHeading}
          </p>

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <span
                aria-hidden="true"
                className="absolute inset-0 animate-ping rounded-full bg-primary/20"
              />
              <Avatar name={callerName} size={128} />
            </div>
            <div className="space-y-1">
              <p data-testid="incoming-call-name" className="text-2xl font-bold text-foreground">
                {callerName}
              </p>
              <p className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                {incomingCall.video
                  ? <Video className="h-4 w-4" aria-hidden="true" />
                  : <Phone className="h-4 w-4" aria-hidden="true" />}
                {incomingCall.video ? st.incoming_video_call : st.incoming_voice_call}
              </p>
            </div>

            {soundBlocked && onEnableCallSound && (
              <Button
                type="button"
                data-testid="button-enable-incoming-call-sound"
                variant="outline"
                className="gap-2"
                onClick={() => void onEnableCallSound()}
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                {ct.enable_sound}
              </Button>
            )}

            {callError && (
              <div
                role="alert"
                className="max-w-sm rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-start text-xs font-semibold leading-relaxed text-destructive"
              >
                {callError}
              </div>
            )}
          </div>

          <div className="flex w-full max-w-sm items-end justify-center gap-10">
            {/* Decline */}
            <div className="flex flex-col items-center gap-2">
              <button
                data-testid="button-decline-call"
                onClick={onReject}
                aria-label={lang === "ar" ? "رفض" : ct.decline}
                className="flex h-16 w-16 items-center justify-center rounded-full transition-all active:scale-95"
                style={{ background: "hsl(var(--destructive))" }}
              >
                <PhoneOff className="h-7 w-7" style={{ color: "hsl(var(--destructive-foreground))" }} />
              </button>
                <span className="text-xs font-medium text-muted-foreground">{lang === "ar" ? "رفض" : ct.decline}</span>
            </div>

            {/* Answer with voice (offered on video calls too) */}
            {incomingCall.video && (
              <div className="flex flex-col items-center gap-2">
                <button
                  data-testid="button-answer-voice"
                  onClick={() => onAnswer(false)}
                  aria-label={st.answer_voice}
                  className="flex h-16 w-16 items-center justify-center rounded-full transition-all active:scale-95"
                  style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}
                >
                  <Phone className="h-7 w-7" style={{ color: "hsl(var(--secondary-foreground))" }} />
                </button>
                <span className="text-xs font-medium text-muted-foreground">{st.answer_voice}</span>
              </div>
            )}

            {/* Answer */}
            <div className="flex flex-col items-center gap-2">
              <button
                data-testid="button-answer-call"
                onClick={() => onAnswer(incomingCall.video)}
                aria-label={lang === "ar" ? "رد" : incomingCall.video ? st.answer_video : ct.answer}
                className="flex h-16 w-16 items-center justify-center rounded-full transition-all active:scale-95"
                style={{ background: "hsl(var(--chart-3))" }}
              >
                {incomingCall.video
                  ? <Video className="h-7 w-7 text-white" />
                  : <Phone className="h-7 w-7 text-white" />}
              </button>
              <span className="text-xs font-medium text-muted-foreground">
                {lang === "ar" ? "رد" : incomingCall.video ? st.answer_video : ct.answer}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Active call / calling / ended ──────────────────────────────────────────
  if (minimized) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed bottom-6 right-6 z-[9999] rounded-2xl cursor-pointer overflow-hidden shadow-2xl"
      style={{ width: 200, height: 112, background: "hsl(var(--background))", border: "1px solid hsl(var(--primary) / 0.4)" }}
      onClick={() => setMinimized(false)}>
      {remoteStream
        ? <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" muted={speakerOff} />
        : <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center font-black text-sm text-black"
                style={{ background: "hsl(var(--primary))" }}>{peer?.charAt(0).toUpperCase()}</div>
              <p className="text-[10px] font-mono" style={{ color: "hsl(var(--primary))" }}>
                {status === "calling"
                  ? ct.ringing
                  : status === "active"
                    ? (isConnecting ? ct.connecting : formatDuration(duration))
                    : st.call_ended}
              </p>
            </div>
          </div>}
      <div className="absolute top-2 right-2">
        <button onClick={(e) => { e.stopPropagation(); onEnd(); }}
          className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--destructive))" }}>
          <PhoneOff className="w-3 h-3 text-white" />
        </button>
      </div>
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9998] flex flex-col"
      style={{ background: "hsl(var(--background))" }}>

      {/* Remote video / avatar */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">
        {remoteStream ? (
          <video data-testid="remote-video" id="remote-player" ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" muted={speakerOff} />
        ) : (
          <div className="text-center space-y-4">
            <div className="mx-auto w-fit">
              <Avatar name={peer ?? "?"} size={112} />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">{peer}</p>
              <p
                data-testid="call-phase-label"
                className="animate-pulse text-sm font-medium"
                style={{ color: status === "active" && !isConnecting ? "hsl(var(--chart-3))" : "hsl(var(--primary))" }}
              >
                {status === "calling"
                  ? ct.ringing
                  : status === "active"
                    ? (isConnecting ? ct.connecting : `${st.connected} — ${formatDuration(duration)}`)
                    : status === "ended"
                      ? st.call_ended
                      : ""}
              </p>
            </div>
          </div>
        )}

        {/* Timer overlay when video active */}
        {remoteStream && (
          <div data-testid="call-timer" className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-mono"
            style={{ background: "rgba(0,0,0,0.6)", color: "#22c55e" }}>
            {peer} · {formatDuration(duration)}
          </div>
        )}

        {playbackBlocked && remoteStream && (
          <button
            type="button"
            onClick={() => {
              void remoteVideoRef.current?.play()
                .then(() => setPlaybackBlocked(false))
                .catch(() => setPlaybackBlocked(true));
            }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-card px-4 py-2 text-sm font-bold text-primary"
          >
            {st.enable_speaker}
          </button>
        )}

        {callError && (
          <div
            role="alert"
            className="absolute top-16 left-1/2 -translate-x-1/2 rounded-xl border px-4 py-3 text-center text-sm font-bold"
            style={{
              width: "min(90vw, 520px)",
              background: "hsl(var(--card) / 0.96)",
              borderColor: "hsl(var(--destructive) / 0.55)",
              color: "hsl(var(--destructive))",
            }}
          >
            {callError}
          </div>
        )}

        {deviceIssue && (
          <div
            role="alert"
            data-testid="status-device-disconnected"
            className="absolute top-28 left-1/2 -translate-x-1/2 rounded-xl border border-destructive/50 bg-card/95 p-4 text-center text-sm font-bold text-destructive"
            style={{ width: "min(90vw, 520px)" }}
          >
            <p>{deviceIssue.message}</p>
            <Button
              data-testid="button-recover-device"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                if (deviceIssue.disconnected) onDeviceRecoveryAttempt(deviceIssue.kind);
                setDevicePickerOpen(true);
                void onRefreshDevices();
              }}
            >
              اختر جهازاً آخر
            </Button>
          </div>
        )}

        {/* Local video (PiP) */}
        {localStream && hasVideo && !videoOff && (
          <div id="local-player" className="absolute bottom-4 right-4 w-28 h-20 rounded-xl overflow-hidden border-2"
            style={{ borderColor: "hsl(var(--primary) / 0.5)" }}>
            <video data-testid="local-video" ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Outgoing ringing — Cancel only, no media controls until accepted */}
      {status === "calling" && (
        <div
          className="shrink-0 flex flex-col items-center gap-2 px-3 py-6 sm:py-8"
          style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}
        >
          <button
            data-testid="button-cancel-call"
            onClick={onEnd}
            aria-label={ct.cancel}
            className="flex h-16 w-16 items-center justify-center rounded-full transition-all active:scale-95 shadow-lg"
            style={{ background: "hsl(var(--destructive))" }}
          >
            <PhoneOff className="h-7 w-7" style={{ color: "hsl(var(--destructive-foreground))" }} />
          </button>
          <span className="text-xs font-medium text-muted-foreground">{ct.cancel}</span>
        </div>
      )}

      {/* Controls bar — shown once the call is active (connected) */}
      {status === "active" && (
      <div className="shrink-0 relative flex flex-wrap items-center justify-center gap-3 px-3 py-5 sm:gap-4 sm:py-8"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}>

        {devicePickerOpen && status === "active" && (
          <div
            data-testid="panel-call-devices"
            className="absolute bottom-full mb-3 w-[min(92vw,420px)] space-y-4 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <p className="font-bold">أجهزة المكالمة</p>
              <Button data-testid="button-refresh-devices" variant="ghost" size="sm" onClick={() => void onRefreshDevices()}>
                تحديث
              </Button>
            </div>
            {(microphones.length > 1 || (recoveringMicrophone && microphones.length > 0)) && (
              <DeviceSelect label="الميكروفون" devices={microphones} value={selectedMicrophoneId} disabled={switchingDevice === "audioinput"} onChange={id => void onSwitchMicrophone(id)} />
            )}
            {(cameras.length > 1 || (recoveringCamera && cameras.length > 0)) && hasVideo && (
              <DeviceSelect label="الكاميرا" devices={cameras} value={selectedCameraId} disabled={switchingDevice === "videoinput"} onChange={id => void onSwitchCamera(id)} />
            )}
            {speakerSelectionSupported ? (
              (speakers.length > 1 || (recoveringSpeaker && speakers.length > 0))
                && <DeviceSelect label="مكبر الصوت" devices={speakers} value={selectedSpeakerId} onChange={onSelectSpeaker} />
            ) : (
              <p data-testid="text-speaker-selection-unsupported" className="text-xs text-muted-foreground">
                اختيار مكبر الصوت غير مدعوم في هذا المتصفح المحمول. يمكنك تغيير المخرج من إعدادات الهاتف، بينما تبقى خيارات الميكروفون والكاميرا متاحة هنا.
              </p>
            )}
          </div>
        )}

        {communicationPanel === "transfer" && (
          <div className="absolute bottom-full mb-3">
            <PeerTransferPanel localStream={localStream} />
          </div>
        )}

        <div className={`absolute bottom-full mb-3 ${communicationPanel === "recording" ? "" : "hidden"}`}>
          <CallRecordingPanelView recording={callRecording} />
          </div>

        <button data-testid="button-mute-call" onClick={() => void toggleMicrophone()}
          aria-pressed={muted}
          aria-label={muted ? st.unmute : st.mute}
          className="w-13 h-13 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: muted ? "hsl(var(--destructive))" : "hsl(var(--secondary))", border: "1px solid hsl(var(--border) / 0.5)" }}>
          {muted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
        </button>

        {hasVideo && (
          <button data-testid="button-camera-call" onClick={() => void toggleCamera()}
            aria-pressed={videoOff}
            aria-label={videoOff ? st.enable_video : st.disable_video}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{ background: videoOff ? "hsl(var(--destructive))" : "hsl(var(--secondary))", border: "1px solid hsl(var(--border) / 0.5)" }}>
            {videoOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
          </button>
        )}

        {/* End call — center large */}
        <button data-testid="button-end-call" onClick={onEnd}
          aria-label={st.end_call}
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg"
          style={{ background: "hsl(var(--destructive))" }}>
          <PhoneOff className="w-7 h-7 text-white" />
        </button>

        <button onClick={() => setSpeakerOff(v => !v)}
          aria-label={speakerOff ? st.enable_speaker : st.disable_speaker}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: speakerOff ? "hsl(var(--destructive))" : "hsl(var(--secondary))", border: "1px solid hsl(var(--border) / 0.5)" }}>
          {speakerOff ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>

        {status === "active" && (microphones.length > 1 || cameras.length > 1 || speakers.length > 1 || !speakerSelectionSupported) && (
          <button
            data-testid="button-call-devices"
            onClick={() => { setDevicePickerOpen(value => !value); void onRefreshDevices(); }}
            aria-label="اختيار أجهزة المكالمة"
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{ background: devicePickerOpen ? "hsl(var(--primary))" : "hsl(var(--secondary))", border: "1px solid hsl(var(--border) / 0.5)" }}
          >
            <Settings2 className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Screen share */}
        {status === "active" && onScreenShare && (
          <button
            onClick={screenSharing ? onStopScreen : onScreenShare}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{ background: screenSharing ? "#f59e0b" : "hsl(var(--secondary))", border: "1px solid hsl(var(--border) / 0.5)" }}
            title={screenSharing ? st.stop_sharing : st.share_screen}
            aria-label={screenSharing ? st.stop_sharing : st.share_screen}>
            {screenSharing
              ? <MonitorOff className="w-5 h-5 text-black" />
              : <Monitor className="w-5 h-5 text-white" />}
          </button>
        )}

        <button
          type="button"
          onClick={() => setCommunicationPanel(value => value === "transfer" ? null : "transfer")}
          aria-label="In-call transfers"
          aria-pressed={communicationPanel === "transfer"}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 bg-secondary border border-border/50 text-secondary-foreground"
        >
          <span className="text-base font-bold" aria-hidden="true">⇧</span>
        </button>

        <button
          type="button"
          onClick={() => setCommunicationPanel(value => value === "recording" ? null : "recording")}
          aria-label="Call recording"
          aria-pressed={communicationPanel === "recording"}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 bg-secondary border border-border/50 text-secondary-foreground"
        >
          <span className="text-sm font-bold" aria-hidden="true">REC</span>
        </button>

        {status === "active" && hasVideo && canFlipCamera && (
          <button type="button" onClick={onFlipCamera} aria-label={mediaLabels.flipCamera}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border) / 0.5)" }}>
            <SwitchCamera className="w-5 h-5 text-white" />
          </button>
        )}

        {status === "active" && hasVideo && cameraZoom && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onAdjustCameraZoom("out")} aria-label={mediaLabels.zoomOut}
              disabled={cameraZoom.value <= cameraZoom.min}
              className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35"
              style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border) / 0.5)" }}>
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <button type="button" onClick={() => onAdjustCameraZoom("in")} aria-label={mediaLabels.zoomIn}
              disabled={cameraZoom.value >= cameraZoom.max}
              className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35"
              style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border) / 0.5)" }}>
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
          </div>
        )}

        <button onClick={() => setMinimized(true)}
          aria-label={st.minimize}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border) / 0.5)" }}>
          <Minimize2 className="w-5 h-5 text-white" />
        </button>
      </div>
      )}
    </motion.div>
  );
}

function DeviceSelect({
  label, devices, value, disabled = false, onChange,
}: {
  label: string;
  devices: CallDevice[];
  value: string;
  disabled?: boolean;
  onChange: (deviceId: string) => void;
}) {
  const fallbackValue = value || devices[0]?.deviceId;
  if (!fallbackValue) return null;
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={fallbackValue} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger data-testid={`select-${devices[0].kind}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {devices.map(device => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              {device.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
