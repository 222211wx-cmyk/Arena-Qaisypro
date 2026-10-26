import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import CallOverlay from "./CallOverlay";

Object.defineProperties(HTMLElement.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => undefined },
  releasePointerCapture: { configurable: true, value: () => undefined },
  scrollIntoView: { configurable: true, value: () => undefined },
});

vi.mock("@/contexts/LangContext", () => ({
  useLang: () => ({ lang: "en" }),
}));

vi.mock("@workspace/gdna-ds/components/ui/select", async () => {
  const React = await import("react");
  const SelectContext = React.createContext<(value: string) => void>(() => undefined);

  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: ReactNode;
      onValueChange: (value: string) => void;
    }) => (
      <SelectContext.Provider value={onValueChange}>
        {children}
      </SelectContext.Provider>
    ),
    SelectTrigger: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
      <button {...props}>{children}</button>
    ),
    SelectValue: () => <span />,
    SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: ReactNode; value: string }) => {
      const onValueChange = React.useContext(SelectContext);
      return (
        <button role="option" onClick={() => onValueChange(value)}>
          {children}
        </button>
      );
    },
  };
});

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => {
      const { initial: _initial, animate: _animate, exit: _exit, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
  },
}));

const baseProps = {
  peer: "citizen",
  localStream: null,
  remoteStream: null,
  incomingCall: null,
  onAnswer: vi.fn(),
  onReject: vi.fn(),
  onEnd: vi.fn(),
};

describe("CallOverlay media recovery", () => {
  it("keeps an incoming call answerable while showing microphone permission recovery", () => {
    const onAnswer = vi.fn();
    render(
      <CallOverlay
        {...baseProps}
        status="ringing"
        incomingCall={{ from: "caller", video: true }}
        callError="افتح إعدادات الموقع، اسمح بالميكروفون، ثم أعد المحاولة"
        onAnswer={onAnswer}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("اسمح بالميكروفون");
    fireEvent.click(screen.getByRole("button", { name: /answer with video/i }));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it("shows active-call recovery messages and only offers screen sharing when active", () => {
    const onScreenShare = vi.fn();
    const { rerender } = render(
      <CallOverlay
        {...baseProps}
        status="calling"
        callError="Camera permission denied — retry"
        onScreenShare={onScreenShare}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Camera permission denied");
    expect(screen.queryByTitle("Share screen")).not.toBeInTheDocument();

    rerender(
      <CallOverlay
        {...baseProps}
        status="active"
        callError="Camera permission denied — retry"
        onScreenShare={onScreenShare}
      />,
    );

    expect(screen.getByTitle("Share screen")).toBeVisible();
  });

  it("offers a user-gesture retry when remote playback is blocked", async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"))
      .mockResolvedValue(undefined);
    const remoteStream = {} as MediaStream;

    render(
      <CallOverlay
        {...baseProps}
        status="active"
        remoteStream={remoteStream}
      />,
    );

    const retry = await screen.findByRole("button", { name: "Turn speaker on" });
    fireEvent.click(retry);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "اضغط لتشغيل صوت المكالمة" })).not.toBeInTheDocument();
    });
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("keeps input pickers available while explaining unsupported mobile speaker selection", () => {
    render(
      <CallOverlay
        {...baseProps}
        status="active"
        speakerSelectionSupported={false}
        devices={[
          { deviceId: "mic-1", kind: "audioinput", label: "Built-in microphone" },
          { deviceId: "mic-2", kind: "audioinput", label: "Bluetooth headset" },
        ]}
        selectedMicrophoneId="mic-1"
      />,
    );

    fireEvent.click(screen.getByTestId("button-call-devices"));

    expect(screen.getByTestId("select-audioinput")).toBeVisible();
    expect(screen.getByTestId("text-speaker-selection-unsupported")).toHaveTextContent("إعدادات الهاتف");
  });

  it("offers a clear recovery choice when a selected device disconnects", () => {
    const onDeviceRecoveryAttempt = vi.fn();
    render(
      <CallOverlay
        {...baseProps}
        status="active"
        deviceIssue={{
          kind: "audioinput",
          message: "تم فصل الميكروفون. اختر جهازاً متاحاً للمتابعة دون إنهاء المكالمة.",
          disconnected: true,
        }}
        onDeviceRecoveryAttempt={onDeviceRecoveryAttempt}
        devices={[
          { deviceId: "mic-1", kind: "audioinput", label: "Built-in microphone" },
          { deviceId: "mic-2", kind: "audioinput", label: "USB microphone" },
        ]}
      />,
    );

    expect(screen.getByTestId("status-device-disconnected")).toHaveTextContent("دون إنهاء المكالمة");
    fireEvent.click(screen.getByTestId("button-recover-device"));
    expect(onDeviceRecoveryAttempt).toHaveBeenCalledOnce();
    expect(onDeviceRecoveryAttempt).toHaveBeenCalledWith("audioinput");
    expect(screen.getByTestId("panel-call-devices")).toBeVisible();
  });

  it.each([
    {
      kind: "audioinput" as const,
      selectedProp: "selectedMicrophoneId" as const,
      callbackProp: "onSwitchMicrophone" as const,
      availableId: "remaining-microphone",
      localStream: null,
      speakerSelectionSupported: false,
    },
    {
      kind: "videoinput" as const,
      selectedProp: "selectedCameraId" as const,
      callbackProp: "onSwitchCamera" as const,
      availableId: "remaining-camera",
      localStream: {
        getAudioTracks: () => [],
        getVideoTracks: () => [{ enabled: true }],
      } as unknown as MediaStream,
      speakerSelectionSupported: false,
    },
    {
      kind: "audiooutput" as const,
      selectedProp: "selectedSpeakerId" as const,
      callbackProp: "onSelectSpeaker" as const,
      availableId: "remaining-speaker",
      localStream: null,
      speakerSelectionSupported: true,
    },
  ])("offers the one remaining $kind device as a recovery option", async ({
    kind,
    selectedProp,
    callbackProp,
    availableId,
    localStream,
    speakerSelectionSupported,
  }) => {
    const onDeviceRecoveryAttempt = vi.fn();
    const onSwitch = vi.fn();
    const props = {
      ...baseProps,
      status: "active" as const,
      localStream,
      speakerSelectionSupported,
      deviceIssue: {
        kind,
        message: "Device disconnected",
        disconnected: true,
      },
      devices: [{ deviceId: availableId, kind, label: "Remaining device" }],
      [selectedProp]: "disconnected-device",
      [callbackProp]: onSwitch,
      onDeviceRecoveryAttempt,
    };

    render(<CallOverlay {...props} />);
    fireEvent.click(screen.getByTestId("button-recover-device"));

    const trigger = screen.getByTestId(`select-${kind}`);
    expect(trigger).toBeVisible();
    const option = await screen.findByRole("option", { name: "Remaining device" });
    fireEvent.click(option);

    expect(onDeviceRecoveryAttempt).toHaveBeenCalledWith(kind);
    expect(onSwitch).toHaveBeenCalledWith(availableId);
  });

  it("renders a fullscreen incoming modal with the caller name and Answer/Decline", () => {
    const onAnswer = vi.fn();
    const onReject = vi.fn();
    render(
      <CallOverlay
        {...baseProps}
        status="ringing"
        incomingCall={{ from: "peer-handle", video: true, callerName: "Layla Q" }}
        onAnswer={onAnswer}
        onReject={onReject}
      />,
    );

    expect(screen.getByTestId("incoming-call-modal")).toBeVisible();
    expect(screen.getByTestId("incoming-call-name")).toHaveTextContent("Layla Q");

    fireEvent.click(screen.getByTestId("button-answer-call"));
    expect(onAnswer).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByTestId("button-decline-call"));
    expect(onReject).toHaveBeenCalledOnce();
  });

  it("shows Ringing with a Cancel action and no media controls while calling out", () => {
    const onEnd = vi.fn();
    render(<CallOverlay {...baseProps} status="calling" onEnd={onEnd} />);

    expect(screen.getByTestId("call-phase-label")).toHaveTextContent("Ringing");
    expect(screen.queryByRole("button", { name: "Mute" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("button-cancel-call"));
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("shows a distinct connecting phase after accept before remote media arrives", () => {
    render(<CallOverlay {...baseProps} status="active" remoteStream={null} />);
    expect(screen.getByTestId("call-phase-label")).toHaveTextContent("Connecting");
  });

  it("exposes simple camera flip and zoom controls only when supported", () => {
    const onFlipCamera = vi.fn();
    const onAdjustCameraZoom = vi.fn();
    const localStream = {
      getAudioTracks: () => [],
      getVideoTracks: () => [{ enabled: true }],
    } as unknown as MediaStream;

    render(
      <CallOverlay
        {...baseProps}
        status="active"
        localStream={localStream}
        canFlipCamera
        cameraZoom={{ min: 1, max: 3, step: 0.5, value: 2 }}
        onFlipCamera={onFlipCamera}
        onAdjustCameraZoom={onAdjustCameraZoom}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Switch camera" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));

    expect(onFlipCamera).toHaveBeenCalledOnce();
    expect(onAdjustCameraZoom).toHaveBeenNthCalledWith(1, "in");
    expect(onAdjustCameraZoom).toHaveBeenNthCalledWith(2, "out");
  });

  it("routes mute and camera controls through provider callbacks", async () => {
    const onMicrophoneEnabledChange = vi.fn().mockResolvedValue(undefined);
    const onCameraEnabledChange = vi.fn().mockResolvedValue(undefined);
    const localStream = {
      getAudioTracks: () => [{ enabled: true }],
      getVideoTracks: () => [{ enabled: true }],
    } as unknown as MediaStream;

    render(
      <CallOverlay
        {...baseProps}
        status="active"
        callPhase="connected"
        localStream={localStream}
        onMicrophoneEnabledChange={onMicrophoneEnabledChange}
        onCameraEnabledChange={onCameraEnabledChange}
      />,
    );

    expect(screen.getByTestId("local-video")).toBeVisible();
    fireEvent.click(screen.getByTestId("button-mute-call"));
    fireEvent.click(screen.getByTestId("button-camera-call"));

    await waitFor(() => {
      expect(onMicrophoneEnabledChange).toHaveBeenCalledWith(false);
      expect(onCameraEnabledChange).toHaveBeenCalledWith(false);
      expect(screen.getByTestId("button-mute-call")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("button-camera-call")).toHaveAttribute("aria-pressed", "true");
    });
    expect(screen.getByTestId("button-end-call")).toBeVisible();
    expect(screen.queryByTestId("local-video")).not.toBeInTheDocument();
  });
});