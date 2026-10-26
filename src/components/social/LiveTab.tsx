/**
 * LiveTab — Go Live launcher + active streams audience list
 */
import LiveStoryRecorder from "../LiveStoryRecorder";
import { useCallContext } from "../../contexts/CallContext";
import { Radio } from "lucide-react";

interface Props {
  user: { id: number; username: string } | null;
  st: Record<string, string>;
}

export default function LiveTab({ user, st }: Props) {
  const call = useCallContext();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "hsl(var(--card))", border: "1px solid #ef444425", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Radio size={16} style={{ color: "#ef4444" }} />
          <p style={{ margin: 0, fontWeight: 900, color: "#ef4444", fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>
            {st.go_live}
          </p>
          {call.liveStatus === "live" && (
            <span style={{ background: "#ef4444", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 800, animation: "pulse 1s infinite" }}>
              ● {st.live}
            </span>
          )}
        </div>
        {!user && (
          <p style={{ color: "#ffffff40", fontSize: 13, margin: "0 0 10px" }}>{st.login_required}</p>
        )}
        <LiveStoryRecorder
          liveStatus={call.liveStatus}
          localStream={call.localStream}
          remoteStream={call.remoteStream}
          currentLiveId={call.currentLiveId ?? null}
          activeLives={call.activeLives ?? []}
          onStartLive={(title, domain) => call.startLive(title, domain)}
          onEndLive={() => call.endLive()}
          onJoinLive={(id) => call.joinLive(id)}
          canFlipCamera={call.canFlipCamera}
          cameraZoom={call.cameraZoom}
          onFlipCamera={call.flipCamera}
          onAdjustCameraZoom={call.adjustCameraZoom}
        />
      </div>
    </div>
  );
}
