import { useEffect, useState } from "react";
import { recoveryReminderPreferenceKey } from "@/lib/workspace/recovery-reminder";

/** Persist only opt-in, never recovery material; each account owns its choice. */
export function useRecoveryReminderPreference(userId: number | string | undefined) {
  const key = userId === undefined ? null : recoveryReminderPreferenceKey(userId);
  const [state, setState] = useState({ key: null as string | null, enabled: false, failed: false });

  useEffect(() => {
    const read = () => {
      try {
        setState({ key, enabled: key !== null && localStorage.getItem(key) === "true", failed: false });
      } catch {
        setState({ key, enabled: false, failed: true });
      }
    };
    read();
    const onStorage = (event: StorageEvent) => { if (event.key === key || event.key === null) read(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  const setEnabled = (enabled: boolean) => {
    if (!key) return;
    try {
      localStorage.setItem(key, String(enabled));
      setState({ key, enabled, failed: false });
    } catch {
      // Never claim a preference was saved when storage is unavailable.
      setState(current => ({ key, enabled: current.key === key && current.enabled, failed: true }));
    }
  };

  return {
    enabled: state.key === key && state.enabled,
    failed: state.key === key && state.failed,
    ready: key !== null && state.key === key,
    setEnabled,
  };
}