import { useEffect, useRef } from "react";
import { Mic, MicOff, Monitor, MonitorOff, PhoneOff, Users, Video, VideoOff } from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/gdna-ds/components/ui/dialog";
import type { AuthUser } from "@/contexts/AuthContext";
import type { GroupRemoteTrack, GroupParticipant } from "@/client/hooks/useGroupCall";
import type { useGroupCall } from "@/client/hooks/useGroupCall";
import { CallRecordingPanel } from "@/components/communication/CallRecordingPanel";

type GroupController = ReturnType<typeof useGroupCall>;

function VideoSurface({
  track,
  muted = false,
}: {
  track?: { play(element: string | HTMLElement): void; stop?(): void } | null;
  muted?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!track || !ref.current) return;
    track.play(ref.current);
    return () => { track.stop?.(); };
  }, [track]);
  return <div ref={ref} className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover" aria-hidden="true" data-muted={muted} />;
}

function participantForTrack(participants: GroupParticipant[], track: GroupRemoteTrack) {
  return participants.find(participant => String(participant.userId) === String(track.uid));
}

function ParticipantTile({
  name,
  status,
  videoTrack,
  audioOnly = false,
  isYou = false,
}: {
  name: string;
  status: string;
  videoTrack?: { play(element: string | HTMLElement): void; stop?(): void } | null;
  audioOnly?: boolean;
  isYou?: boolean;
}) {
  return (
    <Card className="relative min-h-36 overflow-hidden border-border bg-muted/30 text-card-foreground">
      {videoTrack && !audioOnly ? <VideoSurface track={videoTrack} /> : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-secondary-foreground">
            {name.slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}
      <div className="relative flex min-h-36 items-end justify-between gap-2 p-3">
        <div className="min-w-0 rounded-md bg-background/85 px-2 py-1">
          <p className="truncate text-sm font-semibold">{name}{isYou ? " (you)" : ""}</p>
          <p className="text-xs text-muted-foreground">{status}</p>
        </div>
        {audioOnly && <MicOff className="h-4 w-4 rounded bg-background/85 text-muted-foreground" aria-label="Audio only" />}
      </div>
    </Card>
  );
}

export default function GroupCallOverlay({
  group,
  user,
}: {
  group: GroupController;
  user: AuthUser | null;
}) {
  const visible = group.status !== "idle" || Boolean(group.error);
  const activeCall = group.call ?? group.incoming;
  const participants = activeCall?.participants ?? [];
  const remoteParticipantIds = new Set(group.remoteTracks.map(track => String(track.uid)));
  const isIncoming = group.status === "ringing" && Boolean(group.incoming);
  const isLive = group.status === "active";
  const acceptedParticipantIds = participants
    .filter(participant => participant.status === "accepted")
    .map(participant => participant.userId);
  const caller = activeCall?.participants.find(participant => participant.userId !== user?.id);
  const headline = isIncoming
    ? `${caller?.username ?? "A group"} is inviting you to a group ${activeCall?.type === "video" ? "video" : "voice"} call`
    : group.status === "calling"
      ? "Starting secure group call…"
      : group.status === "connecting"
        ? "Joining secure group call…"
        : activeCall?.status === "ended"
          ? "Group call ended"
          : "Group call";

  return (
    <Dialog open={visible} onOpenChange={() => undefined}>
      <DialogContent className="z-[10001] max-h-[100dvh] max-w-5xl overflow-y-auto border-border bg-background p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-border p-5 text-left">
          <div className="flex items-center gap-3 pr-8">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <DialogTitle>{headline}</DialogTitle>
              <DialogDescription className="mt-1">
                {activeCall ? `${participants.length} invited participant${participants.length === 1 ? "" : "s"} · End-to-end encrypted` : "No recording is started by this call."}
              </DialogDescription>
            </div>
            {activeCall && <Badge variant={isLive ? "default" : "secondary"} className="ml-auto shrink-0">{isLive ? "Live" : "Awaiting consent"}</Badge>}
          </div>
        </DialogHeader>

        <div className="space-y-4 p-5">
          {group.error && (
            <div role="alert" className="rounded-md border border-destructive-border bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {group.error}
            </div>
          )}

          {isIncoming ? (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Join only if you are ready</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Your microphone and camera will not be accessed until you choose Answer.</p>
                <p>Only invited group members are shown in this call.</p>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => void group.rejectCall()}>Decline</Button>
                <Button type="button" onClick={() => void group.answerCall()}>
                  {activeCall?.type === "video" ? <Video /> : <Mic />} Answer
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Group call participants">
                {user && (
                  <ParticipantTile
                    name={user.username}
                    status={isLive ? (group.muted ? "Microphone muted" : "You") : "Connecting"}
                    videoTrack={group.localVideoTrack}
                    audioOnly={group.cameraOff || !group.localVideoTrack}
                    isYou
                  />
                )}
                {participants.filter(participant => participant.userId !== user?.id).map(participant => {
                  const track = group.remoteTracks.find(remote => String(remote.uid) === String(participant.userId));
                  return (
                    <ParticipantTile
                      key={participant.userId}
                      name={participant.username}
                      status={participant.status === "accepted" ? (track ? "Connected" : "Connecting media…") : participant.status}
                      videoTrack={track?.videoTrack}
                      audioOnly={!track?.videoTrack}
                    />
                  );
                })}
                {group.remoteTracks.filter(track => !participantForTrack(participants, track)).map(track => (
                  <ParticipantTile
                    key={`remote-${track.uid}`}
                    name={`Participant ${track.uid}`}
                    status="Connected"
                    videoTrack={track.videoTrack}
                    audioOnly={!track.videoTrack}
                  />
                ))}
              </div>

              {!isLive && activeCall && (
                <p className="text-center text-sm text-muted-foreground">
                  Waiting for the encrypted media connection. No media is published until the connection is authorized.
                </p>
              )}
              {isLive && (
                <CallRecordingPanel
                  active
                  callId={group.call?.callId ?? null}
                  localUserId={group.localUserId ?? 0}
                  participantUserIds={acceptedParticipantIds}
                  localStream={group.localStream}
                  remoteStreams={group.remoteStreams}
                />
              )}
            </>
          )}
        </div>

        {!isIncoming && (
          <div className="sticky bottom-0 flex flex-wrap justify-center gap-2 border-t border-border bg-card p-4">
            {isLive && (
              <>
                <Button type="button" size="icon" variant={group.muted ? "secondary" : "outline"} onClick={() => void group.toggleMute()} aria-label={group.muted ? "Unmute microphone" : "Mute microphone"}>
                  {group.muted ? <MicOff /> : <Mic />}
                </Button>
                {activeCall?.type === "video" && (
                  <Button type="button" size="icon" variant={group.cameraOff ? "secondary" : "outline"} onClick={() => void group.toggleCamera()} aria-label={group.cameraOff ? "Turn camera on" : "Turn camera off"}>
                    {group.cameraOff ? <VideoOff /> : <Video />}
                  </Button>
                )}
                <Button type="button" size="icon" variant={group.screenSharing ? "secondary" : "outline"} onClick={() => void (group.screenSharing ? group.stopScreenShare() : group.startScreenShare())} aria-label={group.screenSharing ? "Stop sharing screen" : "Share screen"}>
                  {group.screenSharing ? <MonitorOff /> : <Monitor />}
                </Button>
              </>
            )}
            <Button type="button" variant="destructive" onClick={() => void group.endCall()}>
              <PhoneOff /> {isLive ? "Leave call" : "Cancel"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}