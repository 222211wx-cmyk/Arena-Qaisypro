/**
 * NetworkDisplay — compact, honest network status for the Calls destination.
 *
 * Shows the browser's ACTUAL connectivity. When the physical bearer is unknown
 * it says only "Network available" — it never fakes WiFi/4G. effectiveType is
 * labelled as a speed estimate and the offline state explains the real
 * connection requirement without referring to call credit.
 *
 * Composed entirely from design-system primitives + tokens (no new variants).
 */
import { Wifi, WifiOff } from "lucide-react";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { cn } from "@workspace/gdna-ds/lib/utils";
import type { NetworkStatus } from "@/hooks/use-network-status";

type NetworkLocale = "en" | "fr" | "ar" | "es" | "de";
type NetworkCopy = {
  title: string;
  available: string;
  offline: string;
  offlineHelp: string;
  type: string;
  estimate: string;
};

const NETWORK_COPY: Record<NetworkLocale, NetworkCopy> = {
  en: {
    title: "Network",
    available: "Network available",
    offline: "No internet connection",
    offlineHelp: "Reconnect to place a call.",
    type: "Connection",
    estimate: "speed estimate, not the physical bearer",
  },
  fr: {
    title: "Réseau",
    available: "Réseau disponible",
    offline: "Aucune connexion Internet",
    offlineHelp: "Reconnectez-vous pour passer un appel.",
    type: "Connexion",
    estimate: "estimation de vitesse, pas le support physique",
  },
  ar: {
    title: "الشبكة",
    available: "الشبكة متاحة",
    offline: "لا يوجد اتصال بالإنترنت",
    offlineHelp: "أعد الاتصال لإجراء المكالمة.",
    type: "الاتصال",
    estimate: "تقدير للسرعة وليس الناقل الفعلي",
  },
  es: {
    title: "Red",
    available: "Red disponible",
    offline: "Sin conexión a Internet",
    offlineHelp: "Vuelve a conectarte para realizar una llamada.",
    type: "Conexión",
    estimate: "estimación de velocidad, no el portador físico",
  },
  de: {
    title: "Netzwerk",
    available: "Netzwerk verfügbar",
    offline: "Keine Internetverbindung",
    offlineHelp: "Stelle die Verbindung wieder her, um anzurufen.",
    type: "Verbindung",
    estimate: "Geschwindigkeitsschätzung, nicht der physische Träger",
  },
};

export function NetworkDisplay({
  status,
  lang,
  className,
}: {
  status: NetworkStatus;
  lang?: string;
  className?: string;
}) {
  const copy = NETWORK_COPY[(lang as NetworkLocale) ?? "en"] ?? NETWORK_COPY.en;
  const { online, connectionType, effectiveType } = status;

  if (!online) {
    return (
      <div
        className={cn(
          "rounded-lg border border-destructive/40 bg-destructive/10 p-3",
          className,
        )}
        data-testid="network-offline"
      >
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0 text-destructive" />
          <p className="m-0 text-sm font-bold text-destructive">
            {copy.offline}
          </p>
        </div>
        <p className="m-0 mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {copy.offlineHelp}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-lg border border-border bg-card p-3", className)}
      data-testid="network-online"
    >
      <div className="flex items-center gap-2">
        <Wifi className="h-4 w-4 shrink-0 text-primary" />
        <p className="m-0 flex-1 text-sm font-bold text-card-foreground">
          {copy.title}
        </p>
        <Badge variant="secondary" className="uppercase">
          {connectionType ?? copy.available}
        </Badge>
      </div>
      {effectiveType && (
        <p className="m-0 mt-2 text-xs text-muted-foreground">
          {copy.type}: {effectiveType.toUpperCase()}{" "}
          <span className="opacity-70">· {copy.estimate}</span>
        </p>
      )}
    </div>
  );
}
