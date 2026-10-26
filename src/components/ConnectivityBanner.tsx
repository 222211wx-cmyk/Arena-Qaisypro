import { Alert, AlertDescription } from "@workspace/gdna-ds/components/ui/alert";
import { Wifi, WifiOff } from "lucide-react";
import { useConnectivity } from "@/contexts/ConnectivityContext";
import { useLang } from "@/contexts/LangContext";
import { sharedCopy } from "@/i18n/shared-components-copy";

export function ConnectivityBanner() {
  const { status, blockedAction } = useConnectivity();
  const { lang } = useLang();
  const copy = sharedCopy(lang).connectivity;
  if (status === "online") return null;
  const message = status === "offline" && blockedAction ? copy.blocked : copy[status];
  const Icon = status === "offline" ? WifiOff : Wifi;

  return (
    <Alert
      aria-live="polite"
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="rounded-none border-x-0 border-t-0 border-primary/30 bg-background/95 text-foreground"
    >
      <Icon aria-hidden="true" className="size-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}