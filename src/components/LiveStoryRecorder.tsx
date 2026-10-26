// ══════════════════════════════════════════════════════════════════════════════
//  LiveStoryRecorder — بث مباشر من الكاميرا/الميكروفون
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, StopCircle, Mic, MicOff, Video, VideoOff, Users, X, SwitchCamera, ZoomIn, ZoomOut } from "lucide-react";
import { SOCIAL_T } from "@/components/social/social-i18n";
import { useLang } from "@/contexts/LangContext";
import { MEDIA_CONTROL_LABELS } from "./media-control-labels";

interface LiveStream { liveId: string; host: string; title: string; domain: string; }

interface Props {
  liveStatus:   "idle" | "live" | "ended";
  localStream:  MediaStream | null;
  currentLiveId: string | null;
  activeLives:  LiveStream[];
  onStartLive:  (title: string, domain: string) => void;
  onEndLive:    () => void;
  onJoinLive:   (liveId: string) => void;
  remoteStream: MediaStream | null;
  canFlipCamera?: boolean;
  cameraZoom?: { min: number; max: number; step: number; value: number } | null;
  onFlipCamera?: () => void;
  onAdjustCameraZoom?: (direction: "in" | "out") => void;
}

const DOMAINS = [
  { value: "general", icon: "🌍" }, { value: "sport", icon: "⚽" }, { value: "music", icon: "🎵" },
  { value: "cinema", icon: "🎬" }, { value: "tech", icon: "💡" }, { value: "art", icon: "🎨" },
];

export default function LiveStoryRecorder({
  liveStatus, localStream, currentLiveId, activeLives, onStartLive, onEndLive, onJoinLive, remoteStream,
  canFlipCamera = false, cameraZoom = null, onFlipCamera = () => undefined,
  onAdjustCameraZoom = () => undefined,
}: Props) {
  const { lang } = useLang();
  const st = SOCIAL_T[lang] ?? SOCIAL_T.en;
  const isRTL = lang === "ar";
  const mediaLabels = MEDIA_CONTROL_LABELS[lang] ?? MEDIA_CONTROL_LABELS.en;
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [showCompose,  setShowCompose]  = useState(false);
  const [title,        setTitle]        = useState("");
  const [domain,       setDomain]       = useState("general");
  const [micMuted,     setMicMuted]     = useState(false);
  const [videoOff,     setVideoOff]     = useState(false);
  const [duration,     setDuration]     = useState(0);
  const [watchingId,   setWatchingId]   = useState<string | null>(null);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    const player = remoteVideoRef.current;
    if (!player || !remoteStream) return;
    player.srcObject = remoteStream;
    void player.play()
      .then(() => setPlaybackBlocked(false))
      .catch(() => setPlaybackBlocked(true));
  }, [remoteStream]);

  useEffect(() => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !micMuted; });
  }, [micMuted, localStream]);

  useEffect(() => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !videoOff; });
  }, [videoOff, localStream]);

  useEffect(() => {
    if (liveStatus !== "live") { setDuration(0); return; }
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, [liveStatus]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Active live view ───────────────────────────────────────────────────────
  if (liveStatus === "live" && localStream) return (
    <div dir={isRTL ? "rtl" : "ltr"} className="relative rounded-xl overflow-hidden" style={{ height: 360, background: "hsl(var(--background))" }}>
      <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

      {/* LIVE badge */}
      <div className="absolute top-3 start-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-black text-white"
          style={{ background: "#ef4444" }}>
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          {st.live}
        </div>
        <div className="px-2 py-1 rounded-full text-xs font-mono" style={{ background: "rgba(0,0,0,0.6)", color: "hsl(var(--foreground))" }}>
          {fmt(duration)}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setMicMuted(v => !v)}
            aria-label={micMuted ? st.unmute : st.mute}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: micMuted ? "#ef4444" : "rgba(0,0,0,0.6)" }}>
            {micMuted ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
          </button>
          <button onClick={() => setVideoOff(v => !v)}
            aria-label={videoOff ? st.enable_video : st.disable_video}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: videoOff ? "#ef4444" : "rgba(0,0,0,0.6)" }}>
            {videoOff ? <VideoOff className="w-4 h-4 text-white" /> : <Video className="w-4 h-4 text-white" />}
          </button>
          {canFlipCamera && (
            <button type="button" onClick={onFlipCamera} aria-label={mediaLabels.flipCamera}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.6)" }}>
              <SwitchCamera className="w-4 h-4 text-white" />
            </button>
          )}
          {cameraZoom && (
            <>
              <button type="button" onClick={() => onAdjustCameraZoom("out")} aria-label={mediaLabels.zoomOut}
                disabled={cameraZoom.value <= cameraZoom.min}
                className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35"
                style={{ background: "rgba(0,0,0,0.6)" }}>
                <ZoomOut className="w-4 h-4 text-white" />
              </button>
              <button type="button" onClick={() => onAdjustCameraZoom("in")} aria-label={mediaLabels.zoomIn}
                disabled={cameraZoom.value >= cameraZoom.max}
                className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35"
                style={{ background: "rgba(0,0,0,0.6)" }}>
                <ZoomIn className="w-4 h-4 text-white" />
              </button>
            </>
          )}
        </div>
        <button onClick={onEndLive}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black text-white"
          style={{ background: "#ef4444" }}>
          <StopCircle className="w-4 h-4" /> {st.end_stream}
        </button>
      </div>
    </div>
  );

  // ── Watching a live ────────────────────────────────────────────────────────
  if (watchingId && remoteStream) {
    const liveInfo = activeLives.find(l => l.liveId === watchingId);
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="relative rounded-xl overflow-hidden" style={{ height: 300, background: "hsl(var(--background))" }}>
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        {playbackBlocked && (
          <button
            type="button"
            onClick={() => {
              void remoteVideoRef.current?.play()
                .then(() => setPlaybackBlocked(false))
                .catch(() => setPlaybackBlocked(true));
            }}
            className="absolute inset-0 m-auto h-12 w-fit rounded-full border border-primary/40 bg-card/95 px-5 text-sm font-bold text-primary"
          >
            {st.enable_speaker}
          </button>
        )}
        <div className="absolute top-3 start-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-black text-white" style={{ background: "#ef4444" }}>
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" /> {st.live}
          </div>
          <span className="text-xs text-white font-bold" style={{ background: "rgba(0,0,0,0.6)", padding: "2px 8px", borderRadius: 20 }}>
            {liveInfo?.host} — {liveInfo?.title}
          </span>
        </div>
        <button onClick={() => { setWatchingId(null); }}
          aria-label={st.close}
          className="absolute top-3 end-3 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}>
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-4">
      {/* Start live button */}
      {liveStatus === "idle" && (
        <button onClick={() => setShowCompose(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-black uppercase tracking-wider transition-all active:scale-95"
          style={{ background: showCompose ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)", border: "1px solid #ef444440", color: "#ef4444" }}>
          <Radio className="w-4 h-4" />
          {st.go_live}
        </button>
      )}

      {/* Compose panel */}
      <AnimatePresence>
        {showCompose && liveStatus === "idle" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3 p-4" style={{ border: "1px solid #ef444430", background: "rgba(239,68,68,0.04)" }}>

            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={st.stream_title}
              aria-label={st.stream_title}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ background: "hsl(var(--card))", border: "1px solid #ffffff15", color: "hsl(var(--foreground))" }}
              dir={isRTL ? "rtl" : "ltr"} />

            <div className="flex flex-wrap gap-1.5">
              {DOMAINS.map(d => (
                <button key={d.value} onClick={() => setDomain(d.value)}
                  className="px-3 py-1 text-xs font-bold transition-all"
                  style={{ border: `1px solid ${domain === d.value ? "#ef4444" : "#ffffff10"}`, background: domain === d.value ? "rgba(239,68,68,0.15)" : "transparent", color: domain === d.value ? "#ef4444" : "#ffffff40" }}>
                  {d.icon} {st[d.value]}
                </button>
              ))}
            </div>

            <button disabled={!title.trim()}
              onClick={() => { onStartLive(title.trim(), domain); setShowCompose(false); }}
              className="w-full py-2.5 text-sm font-black text-white uppercase tracking-wider disabled:opacity-40 transition-all active:scale-95"
              style={{ background: "#ef4444" }}>
              📡 {st.start_now}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active lives */}
      {activeLives.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#ef444460" }}>
             {st.active_lives} — {activeLives.length} {st.streaming}
          </p>
          {activeLives.map(live => (
            <div key={live.liveId} className="flex items-center justify-between p-3"
              style={{ border: "1px solid #ef444425", background: "rgba(239,68,68,0.04)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
                <div>
                  <p className="text-xs font-bold text-white">{live.host}</p>
                  <p className="text-[10px]" style={{ color: "#ffffff40" }}>{live.title}</p>
                </div>
              </div>
              <button onClick={() => { onJoinLive(live.liveId); setWatchingId(live.liveId); }}
                className="px-3 py-1 text-xs font-bold text-white"
                style={{ background: "#ef4444" }}>
                <Users className="w-3 h-3 inline me-1" />{st.join_live}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeLives.length === 0 && liveStatus === "idle" && !showCompose && (
        <p className="text-center text-xs py-2" style={{ color: "#ffffff20" }}>
           {st.no_live_streams}
        </p>
      )}
    </div>
  );
}
