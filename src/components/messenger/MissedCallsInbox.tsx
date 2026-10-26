/**
 * MissedCallsInbox — "Missed Calls" / "Boîte d'appels" section inside the Calls
 * tab of the classic messenger.
 *
 * Responsibilities:
 *  - Honest call-notification status: in-app calling available, background
 *    notifications not configured / error / loading (from useCall firebaseStatus).
 *  - Notification permission CTA (fires on user gesture) and sound-blocked CTA.
 *  - Missed-call list with per-language "missed video/voice call" labels,
 *    caller name + avatar, relative time, unseen styling.
 *  - Marks the *visible unseen* rows seen after they load / the user opens the
 *    tab; never auto-marks offscreen or global items.
 *  - Loading, empty, and error states (no mock rows).
 *
 * Built only from GDNA design-system tokens and primitives. No emojis.
 */
import { useEffect, useMemo, useRef } from "react";
import { PhoneMissed, Video, Phone, PhoneCall, BellRing, Volume2, LoaderCircle } from "lucide-react";
import { Link } from "wouter";
import Avatar from "../social/Avatar";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { timeAgo } from "../social/social-i18n";
import { getMessengerIntlLocale } from "@/i18n/messenger-complete-copy";
import { getMissedCallsCopy } from "@/i18n/missed-calls-copy";
import type {
  MissedCall,
  FirebaseStatus,
  CallNotificationPermission,
} from "./call-types";

interface Props {
  lang: string;
  missedCalls: MissedCall[];
  missedCallCount: number;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  markMissedCallsSeen: (ids: string[]) => void;
  /** Honest background-notification (Firebase) setup state. */
  firebaseStatus?: FirebaseStatus;
  firebaseError?: string | null;
  pushEnabled?: boolean;
  pushReason?: string | null;
  notificationPermission?: CallNotificationPermission;
  enableCallNotifications?: () => void;
  soundBlocked?: boolean;
  enableCallSound?: () => void;
  /** True when the Calls tab is currently visible to the user. */
  active: boolean;
  /** Re-dial a missed caller using the existing authenticated call flow. */
  onCallBack?: (call: MissedCall) => void;
  /** Prevents a second call while another call is ringing or active. */
  inCall?: boolean;
}

export function MissedCallsInbox({
  lang,
  missedCalls,
  missedCallCount,
  loading = false,
  error = false,
  onRetry,
  markMissedCallsSeen,
  firebaseStatus = "loading",
  firebaseError = null,
  // Keep the standalone component backwards-compatible for callers that
  // predate the separate server/browser push capability field.
  pushEnabled = true,
  pushReason = null,
  notificationPermission = "default",
  enableCallNotifications,
  soundBlocked = false,
  enableCallSound,
  active,
  onCallBack,
  inCall = false,
}: Props) {
  const t = getMissedCallsCopy(lang);
  const locale = getMessengerIntlLocale(lang);

  // ── Mark visible unseen rows seen once they load AND the tab is open. ──────
  // Only the rows in this list (visible) — never offscreen/global. Keep the
  // mutation fn in a ref so it never re-triggers the effect on parent renders.
  const markRef = useRef(markMissedCallsSeen);
  markRef.current = markMissedCallsSeen;

  const unseenIds = useMemo(
    () => missedCalls.filter(c => !c.isSeen).map(c => c.id),
    [missedCalls],
  );
  const unseenKey = unseenIds.join(",");

  useEffect(() => {
    if (!active) return;
    if (loading || error) return;
    if (unseenIds.length === 0) return;
    markRef.current(unseenIds);
    // Depend on the stable key + guards only, not on the callback reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, loading, error, unseenKey]);

  const statusRow = firebaseStatusView(firebaseStatus, firebaseError, pushEnabled, pushReason, t);

  return (
    <section
      data-testid="missed-calls-inbox"
      className="mb-3 rounded-xl border border-border bg-card p-3"
      aria-label={t.inbox_title}
    >
      <div className="mb-2 flex items-center gap-2">
        <PhoneMissed className="h-4 w-4 shrink-0 text-destructive" />
        <p className="m-0 flex-1 text-sm font-bold text-card-foreground">{t.inbox_title}</p>
        {missedCallCount > 0 && (
          <span
            data-testid="missed-calls-inbox-count"
            className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-xs font-bold leading-none text-destructive-foreground"
            aria-label={`${missedCallCount}`}
          >
            {missedCallCount}
          </span>
        )}
      </div>

      {/* ── Honest notification / sound status ─────────────────────────────── */}
      <div className="mb-3 space-y-2">
        <p className="m-0 text-xs font-semibold text-card-foreground">{t.status_title}</p>
        <p className="m-0 text-xs text-muted-foreground">{t.status_in_app_available}</p>

        {statusRow.tone === "loading" ? (
          <p className="m-0 flex items-center gap-1.5 text-xs text-muted-foreground">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {statusRow.message}
          </p>
        ) : (
          <p
            data-testid="missed-calls-firebase-status"
            className="m-0 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-2 text-xs font-medium text-primary"
          >
            {statusRow.message}
          </p>
        )}

        {/* Notification permission CTA — must fire on the user gesture. */}
        {notificationPermission === "granted" && pushEnabled && firebaseStatus === "ready" ? (
          <p className="m-0 text-xs text-muted-foreground">{t.notifications_enabled}</p>
        ) : notificationPermission === "granted" ? (
          <p className="m-0 text-xs text-muted-foreground">{statusRow.message}</p>
        ) : notificationPermission === "denied" ? (
          <p className="m-0 text-xs text-muted-foreground">{t.notifications_denied}</p>
        ) : pushEnabled && notificationPermission !== "unsupported" && enableCallNotifications ? (
          <Button
            data-testid="button-enable-call-notifications"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={enableCallNotifications}
          >
            <BellRing className="h-3.5 w-3.5" />
            {t.enable_notifications}
          </Button>
        ) : null}

        {/* Sound-blocked CTA — user gesture unblocks autoplay. */}
        {soundBlocked && enableCallSound && (
          <Button
            data-testid="button-enable-call-sound"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={enableCallSound}
          >
            <Volume2 className="h-3.5 w-3.5" />
            {t.enable_sound}
          </Button>
        )}
        <Link
          href="/missed-calls"
          data-testid="link-missed-calls-page"
          className="inline-flex items-center text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          {lang === "ar" ? "فتح علبة المكالمات الفائتة" : t.inbox_title}
        </Link>
      </div>

      {/* ── List / loading / error / empty ─────────────────────────────────── */}
      {loading ? (
        <p
          data-testid="missed-calls-loading"
          className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground"
        >
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t.inbox_loading}
        </p>
      ) : error ? (
        <div data-testid="missed-calls-error" className="py-6 text-center">
          <p className="m-0 mb-3 text-xs text-destructive">{t.inbox_error}</p>
          {onRetry && (
            <Button data-testid="button-retry-missed-calls" size="sm" variant="outline" onClick={onRetry}>
              {t.inbox_retry}
            </Button>
          )}
        </div>
      ) : missedCalls.length === 0 ? (
        <div data-testid="missed-calls-empty" className="py-8 text-center">
          <PhoneMissed className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" aria-hidden="true" />
          <p className="m-0 text-xs text-muted-foreground">{t.inbox_empty}</p>
        </div>
      ) : (
        <ul className="m-0 list-none space-y-0.5 p-0" data-testid="missed-calls-list">
          {missedCalls.map(call => (
            <li key={call.id}>
              <div
                data-testid={`missed-call-row-${call.id}`}
                data-unseen={!call.isSeen}
                className={
                  "flex items-center gap-3 rounded-lg px-2 py-2 " +
                  (call.isSeen ? "opacity-70" : "bg-primary/5")
                }
              >
                <div className="relative shrink-0">
                  <Avatar name={call.caller.name} size={44} />
                  {!call.isSeen && (
                    <span
                      data-testid={`missed-call-unseen-${call.id}`}
                      aria-label={t.unseen_badge}
                      className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-destructive"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      "m-0 truncate text-sm " +
                      (call.isSeen ? "font-medium text-card-foreground" : "font-bold text-card-foreground")
                    }
                  >
                    {call.caller.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-destructive">
                    {call.type === "video" ? (
                      <Video className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">
                      {call.type === "video" ? t.missed_video : t.missed_voice}
                    </span>
                  </div>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(missedCallTime(call.time), {}, locale)}
                </time>
                {onCallBack && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1 px-2 text-xs"
                    disabled={inCall}
                    data-testid={`button-call-back-${call.id}`}
                    aria-label={`${lang === "ar" ? "معاودة الاتصال بـ" : "Call back "}${call.caller.name}`}
                    onClick={() => onCallBack(call)}
                  >
                    {call.type === "video" ? (
                      <Video className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{lang === "ar" ? "اتصال" : "Call back"}</span>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** timeAgo expects an ISO/string date; missed-call time can be epoch-ms. */
function missedCallTime(time: string | number): string {
  return typeof time === "number" ? new Date(time).toISOString() : time;
}

function firebaseStatusView(
  status: FirebaseStatus,
  error: string | null,
  pushEnabled: boolean,
  pushReason: string | null,
  t: ReturnType<typeof getMissedCallsCopy>,
): { tone: "loading" | "info"; message: string } {
  switch (status) {
    case "loading":
      return { tone: "loading", message: t.status_firebase_loading };
    case "ready":
      return {
        tone: "info",
        message: pushEnabled ? t.status_in_app_available : t.status_background_not_configured,
      };
    case "error":
      return { tone: "info", message: error || t.status_firebase_error };
    case "disabled":
    default:
      return { tone: "info", message: t.status_background_not_configured };
  }
}
