import { useEffect, useRef, useState } from "react";
import { Download, FileUp, Mic, Send, Square, X } from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { Progress } from "@workspace/gdna-ds/components/ui/progress";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import {
  MAX_TRANSFER_BYTES,
  peerTransfer,
  type PeerTransferItem,
  type TransferKind,
} from "@/client/lib/peer-transfer";

interface Props {
  localStream: MediaStream | null;
}

function metadataFor(file: File, kind: TransferKind) {
  return { name: file.name, mime: file.type || (kind === "voice-note" ? "audio/webm" : "application/octet-stream"), kind };
}

export function PeerTransferPanel({ localStream }: Props) {
  const [snapshot, setSnapshot] = useState(peerTransfer.getSnapshot());
  const [selected, setSelected] = useState<{ file: File; kind: TransferKind } | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const ownedTracksRef = useRef<MediaStreamTrack[]>([]);

  useEffect(() => peerTransfer.subscribe(() => setSnapshot(peerTransfer.getSnapshot())), []);
  useEffect(() => () => {
    recorderRef.current?.stop();
    ownedTracksRef.current.forEach(track => track.stop());
  }, []);

  const selectFile = (file?: File) => {
    if (!file) return;
    if (file.size < 1 || file.size > MAX_TRANSFER_BYTES) {
      setError("Choose a file up to 25 MB.");
      return;
    }
    setSelected({ file, kind: "file" });
    setError(null);
  };

  const startVoiceNote = async () => {
    if (recording) return;
    try {
      const source = localStream?.getAudioTracks().length
        ? new MediaStream(localStream.getAudioTracks().map(track => track.clone()))
        : await navigator.mediaDevices.getUserMedia({ audio: true });
      ownedTracksRef.current = source.getTracks();
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(source, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        ownedTracksRef.current.forEach(track => track.stop());
        ownedTracksRef.current = [];
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size) setSelected({
          file: new File([blob], `voice-note-${Date.now()}.webm`, { type: blob.type }),
          kind: "voice-note",
        });
        setRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setError(null);
    } catch {
      setError("Microphone access is required to record a voice note.");
    }
  };

  const sendSelected = async () => {
    if (!selected) return;
    try {
      await peerTransfer.sendFile(selected.file, metadataFor(selected.file, selected.kind));
      setSelected(null);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start transfer.");
    }
  };

  return (
    <Card className="w-full max-w-md border-border bg-card text-card-foreground shadow-xl">
      <CardHeader className="space-y-1 p-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">In-call transfers</CardTitle>
          <Badge variant={snapshot.connected ? "secondary" : "outline"}>
            {snapshot.connected ? "DTLS encrypted" : "Unavailable"}
          </Badge>
        </div>
        <CardDescription>Ephemeral, not saved to chat. Maximum 25 MB. Recipients choose before any bytes are sent.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        {!snapshot.connected && <p className="text-xs text-muted-foreground">When the call is offline or closed, use the regular chat attachment to upload a saved message.</p>}
        {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}
        {selected && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 p-2 text-xs">
            <span className="min-w-0 truncate">{selected.file.name}</span>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" onClick={() => void sendSelected()} disabled={!snapshot.connected}><Send className="size-3" />Send</Button>
              <Button size="icon" variant="ghost" aria-label="Cancel selected transfer" onClick={() => setSelected(null)}><X className="size-3" /></Button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} className="sr-only" type="file" onChange={event => selectFile(event.target.files?.[0])} />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={recording}>
            <FileUp className="size-4" />Choose file
          </Button>
          <Button size="sm" variant={recording ? "destructive" : "outline"} onClick={() => recording ? recorderRef.current?.stop() : void startVoiceNote()}>
            {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
            {recording ? "Stop voice note" : "Record voice note"}
          </Button>
        </div>
        {snapshot.transfers.map(transfer => <TransferRow key={transfer.id} transfer={transfer} />)}
      </CardContent>
    </Card>
  );
}

function TransferRow({ transfer }: { transfer: PeerTransferItem }) {
  const incomingConsent = transfer.direction === "incoming" && transfer.status === "pending-consent";
  const canCancel = !["ready", "complete", "rejected", "cancelled", "error"].includes(transfer.status);
  return (
    <div className="space-y-2 rounded-md border border-border p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium">{transfer.metadata.name}</span>
        <Badge variant="outline">{transfer.status}</Badge>
      </div>
      {(transfer.status === "sending" || transfer.status === "receiving") && <Progress value={transfer.progress} />}
      {transfer.error && <p className="text-destructive">{transfer.error}</p>}
      <div className="flex flex-wrap gap-1">
        {incomingConsent && <>
          <Button size="sm" onClick={() => peerTransfer.accept(transfer.id)}>Accept</Button>
          <Button size="sm" variant="outline" onClick={() => peerTransfer.reject(transfer.id)}>Reject</Button>
        </>}
        {transfer.status === "ready" && <Button size="sm" variant="outline" onClick={() => peerTransfer.download(transfer.id)}><Download className="size-3" />Download</Button>}
        {canCancel && <Button size="sm" variant="ghost" onClick={() => peerTransfer.cancel(transfer.id)}>Cancel</Button>}
      </div>
    </div>
  );
}