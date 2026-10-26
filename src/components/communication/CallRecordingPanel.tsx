import { Circle, Download, ShieldCheck, Square } from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { useCallRecording } from "@/client/hooks/useCallRecording";

export interface CallRecordingPanelProps {
  active: boolean;
  callId: string | null;
  localUserId: number;
  /** Expected other member IDs; localUserId is ignored if included. */
  participantUserIds: number[];
  localStream: MediaStream | null;
  /** 1:1 compatibility input. Prefer remoteStreams for group calls. */
  remoteStream?: MediaStream | null;
  remoteStreams?: MediaStream[];
  compositeVideoStream?: MediaStream | null;
}

export function CallRecordingPanel({
  active, callId, localUserId, participantUserIds, localStream,
  remoteStream, remoteStreams, compositeVideoStream,
}: CallRecordingPanelProps) {
  const recording = useCallRecording({
    active, callId, localUserId, participantUserIds, localStream,
    remoteStream, remoteStreams, compositeVideoStream,
  });
  return <CallRecordingPanelView recording={recording} />;
}

export function CallRecordingPanelView({
  recording,
}: {
  recording: ReturnType<typeof useCallRecording>;
}) {
  const isRecording = recording.state === "recording";
  return (
    <Card className="w-full max-w-sm border-border bg-card text-card-foreground shadow-xl">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Call recording</p>
            <p className="text-xs text-muted-foreground">{recording.recordingFormat}. A local copy is available only after an explicit download and is never saved to the group database.</p>
          </div>
          {isRecording && <span className="flex items-center gap-1 text-xs font-semibold text-destructive"><Circle className="size-3 fill-current" />REC</span>}
        </div>
        {!recording.available && <p className="text-xs text-muted-foreground">Recording consent is unavailable until this call’s provider supplies its secure call ID.</p>}
        {recording.error && <p role="alert" className="text-xs text-destructive">{recording.error}</p>}
        {recording.state === "incoming-consent" && (
          <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs">
            <p className="font-medium">The other participant requested permission to record this call.</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => recording.respondToConsent(true)}><ShieldCheck className="size-3" />Allow</Button>
              <Button size="sm" variant="outline" onClick={() => recording.respondToConsent(false)}>Decline</Button>
            </div>
          </div>
        )}
        {recording.state === "awaiting-consent" && <p className="text-xs text-muted-foreground">Waiting for the other participant’s explicit consent.</p>}
        {recording.state === "consent-granted" && <p className="text-xs font-medium text-muted-foreground">You granted consent for this request. You can revoke it at any time; no remote recording status is inferred.</p>}
        <div className="flex flex-wrap gap-2">
          {isRecording
            ? <Button size="sm" variant="destructive" onClick={recording.stop}><Square className="size-3" />Stop recording</Button>
            : <Button size="sm" onClick={recording.start} disabled={!recording.available || !recording.supported || !["idle", "ready", "error"].includes(recording.state)}><Circle className="size-3 fill-current" />Start recording</Button>}
          {(isRecording || recording.state === "awaiting-consent" || recording.state === "consent-granted") && <Button size="sm" variant="outline" onClick={recording.revoke}>Revoke consent</Button>}
          {recording.blob && <Button size="sm" variant="outline" onClick={recording.download}><Download className="size-3" />Download local copy</Button>}
        </div>
      </CardContent>
    </Card>
  );
}