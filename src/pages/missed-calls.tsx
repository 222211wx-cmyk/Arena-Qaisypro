import { ArrowLeft, PhoneMissed } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCallContext } from "@/contexts/CallContext";
import { useLang } from "@/contexts/LangContext";
import { getMissedCallsCopy } from "@/i18n/missed-calls-copy";
import { MissedCallsInbox } from "@/components/messenger/MissedCallsInbox";

/**
 * Dedicated missed-calls destination. The Calls tab keeps its compact inbox
 * and badge; this route gives keyboard and screen-reader users a stable page
 * target without adding another global navigation item.
 */
export default function MissedCallsPage() {
  const { user } = useAuth();
  const { lang } = useLang();
  const call = useCallContext();
  const copy = getMissedCallsCopy(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const inCall = call.callStatus !== "idle";

  if (!user) {
    return (
      <main dir={dir} className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
        <PhoneMissed className="h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="m-0 text-2xl font-black text-foreground">
          {lang === "ar" ? "علبة المكالمات الفائتة" : copy.inbox_title}
        </h1>
        <p className="m-0 text-sm text-muted-foreground">Sign in to view missed calls.</p>
        <Link href="/login">
          <Button>Sign in</Button>
        </Link>
      </main>
    );
  }

  return (
    <main dir={dir} className="mx-auto min-h-[70vh] w-full max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/messages">
          <Button variant="ghost" size="icon" aria-label={lang === "ar" ? "العودة إلى المكالمات" : "Back to calls"}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Button>
        </Link>
        <PhoneMissed className="h-5 w-5 text-destructive" aria-hidden="true" />
        <h1 className="m-0 text-2xl font-black text-foreground">
          {lang === "ar" ? "علبة المكالمات الفائتة" : copy.inbox_title}
        </h1>
      </div>
      <MissedCallsInbox
        lang={lang}
        missedCalls={call.missedCalls}
        missedCallCount={call.missedCallCount}
        loading={call.missedCallsLoading}
        error={call.missedCallsError}
        onRetry={call.refreshMissedCalls}
        markMissedCallsSeen={call.markMissedCallsSeen}
        firebaseStatus={call.firebaseStatus}
        firebaseError={call.firebaseError}
        pushEnabled={call.pushEnabled}
        pushReason={call.pushReason}
        notificationPermission={call.notificationPermission}
        enableCallNotifications={() => void call.enableCallNotifications?.()}
        soundBlocked={call.soundBlocked}
        enableCallSound={() => void call.enableCallSound()}
        active
        inCall={inCall}
        onCallBack={missedCall => {
          void call.startCall(missedCall.caller.name, missedCall.type === "video");
        }}
      />
    </main>
  );
}