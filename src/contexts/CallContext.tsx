import { createContext, useContext, type ReactNode } from "react";
import { useCall } from "@/client/hooks/useCall";
import { useAuth } from "@/contexts/AuthContext";
import CallOverlay from "@/components/CallOverlay";
import GlobalCallAlerts from "@/components/GlobalCallAlerts";

type CallCtx = ReturnType<typeof useCall>;
const CallContext = createContext<CallCtx | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Legacy call APIs require numeric participants; never coerce a text ID.
  const call = useCall(user && typeof user.id === "number" ? {...user,id:user.id} : null);

  return (
    <CallContext.Provider value={call}>
      {children}
      <CallOverlay
        status={call.callStatus}
        callPhase={call.callPhase}
        peer={call.activePeer}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
        incomingCall={call.incomingCall}
        soundBlocked={call.soundBlocked}
        onEnableCallSound={call.enableCallSound}
        onAnswer={call.answerCall}
        onReject={call.rejectCall}
        onEnd={call.endCall}
        screenSharing={call.screenSharing}
        onScreenShare={call.screenShareSupported ? call.startScreenShare : undefined}
        onStopScreen={call.screenShareSupported ? call.stopScreenShare : undefined}
        callError={call.callError}
        devices={call.callDevices}
        selectedMicrophoneId={call.selectedMicrophoneId}
        selectedCameraId={call.selectedCameraId}
        selectedSpeakerId={call.selectedSpeakerId}
        speakerSelectionSupported={call.speakerSelectionSupported}
        deviceIssue={call.deviceIssue}
        switchingDevice={call.switchingDevice}
        onRefreshDevices={call.refreshCallDevices}
        onSwitchMicrophone={call.switchMicrophone}
        onSwitchCamera={call.switchCamera}
        onMicrophoneEnabledChange={call.setMicrophoneEnabled}
        onCameraEnabledChange={call.setCameraEnabled}
        onSelectSpeaker={call.selectSpeaker}
        onSpeakerFailure={call.reportSpeakerFailure}
        onSpeakerSuccess={call.reportSpeakerSuccess}
        onDeviceRecoveryAttempt={call.reportDeviceRecoveryAttempt}
        canFlipCamera={call.canFlipCamera}
        cameraZoom={call.cameraZoom}
        onFlipCamera={call.flipCamera}
        onAdjustCameraZoom={call.adjustCameraZoom}
        recordingCallId={call.recordingCallId}
        recordingLocalUserId={call.recordingLocalUserId}
        recordingParticipantUserIds={call.recordingParticipantIds}
      />
      {user && <GlobalCallAlerts call={call} />}
    </CallContext.Provider>
  );
}

export function useCallContext() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be inside CallProvider");
  return ctx;
}
