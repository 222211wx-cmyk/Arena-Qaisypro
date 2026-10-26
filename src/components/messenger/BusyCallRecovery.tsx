import { useEffect, useRef, useState } from "react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@workspace/gdna-ds/components/ui/alert";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@workspace/gdna-ds/components/ui/alert-dialog";
import { useCallContext } from "@/contexts/CallContext";
import { useLang } from "@/contexts/LangContext";
import { apiPath } from "@/lib/network";

type Candidate = { callId: string; startedAt: string; eligibleForRecovery: boolean };

/** Messaging-only, explicit recovery. Checking and confirming never dial a new
 * call; the citizen retries using the ordinary call controls afterward. */
export default function BusyCallRecovery() {
  const call = useCallContext();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recovered, setRecovered] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!call.callBusy) {
      requestRef.current?.abort();
      requestRef.current = null;
      setCandidate(null);
      setBusy(false);
      setMessage("");
    } else {
      setRecovered(false);
    }
    return () => { requestRef.current?.abort(); };
  }, [call.callBusy]);

  useEffect(() => {
    if (call.callStatus === "calling" || call.callStatus === "active") setRecovered(false);
  }, [call.callStatus]);

  async function checkPreviousCall() {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setMessage("");
    setCandidate(null);
    try {
      const response = await fetch(apiPath("/api/call/busy-state"), {
        credentials: "include", cache: "no-store", signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Previous call status unavailable");
      if (controller.signal.aborted) return;
      const found = data.candidate as Candidate | null;
      if (found?.eligibleForRecovery === true) setCandidate(found);
      else setMessage(ar
        ? "لا توجد مكالمة سابقة لك مؤهلة للاستعادة. قد يكون الطرف الآخر مشغولاً، أو لم تتجاوز مكالمتك 30 دقيقة."
        : "You have no previous call eligible for recovery. The other participant may be busy, or your call is less than 30 minutes old.");
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Previous call status unavailable");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function confirmRecovery() {
    if (!candidate || busy) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(apiPath("/api/call/recover-busy"), {
        method: "POST", credentials: "include", signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: candidate.callId, confirmed: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Previous call recovery unavailable");
      if (controller.signal.aborted) return;
      setRecovered(true);
      call.clearCallBusy();
    } catch (error) {
      if (!controller.signal.aborted) {
        setCandidate(null);
        setMessage(error instanceof Error ? error.message : "Previous call recovery unavailable");
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  if (!call.callBusy && !recovered) return null;
  return (
    <Alert className="mb-3" dir={ar ? "rtl" : "ltr"}>
      <AlertTitle>{recovered
        ? ar ? "تم إنهاء المكالمة السابقة" : "Previous call ended"
        : ar ? "أحد المشاركين في مكالمة أخرى" : "A participant is already in a call"}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{recovered
          ? ar ? "يمكنك إعادة المحاولة من زر الاتصال. لن تبدأ مكالمة تلقائياً." : "You can retry using the call button. No call will start automatically."
          : ar ? "تحقق من مكالمتك السابقة قبل إعادة المحاولة. لن يتم إنهاء أي مكالمة بدون تأكيدك." : "Check your previous call before retrying. No call will be ended without your confirmation."}</p>
        {message && <p role="status">{message}</p>}
        <div className="flex flex-wrap gap-2">
          {!recovered && <Button size="sm" variant="outline" disabled={busy} onClick={() => void checkPreviousCall()}>
            {busy ? ar ? "جارٍ التحقق…" : "Working…" : ar ? "تحقق من مكالمتي السابقة" : "Check my previous call"}
          </Button>}
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => { call.clearCallBusy(); setRecovered(false); }}>
            {ar ? "إغلاق" : "Dismiss"}
          </Button>
        </div>
      </AlertDescription>
      <AlertDialog open={candidate !== null} onOpenChange={open => { if (!open && !busy) setCandidate(null); }}>
        <AlertDialogContent dir={ar ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? "إنهاء مكالمتك السابقة؟" : "End your previous call?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ar
                ? "هذه المكالمة مستمرة منذ أكثر من 30 دقيقة وقد تكون نشطة على جهاز آخر. تأكيدك سينهيها لجميع المشاركين، حتى لو كانوا لا يزالون يتحدثون. لن تبدأ مكالمة جديدة تلقائياً."
                : "This call is over 30 minutes old and may still be active on another device. Confirming will end it for all participants, even if they are still talking. No new call will start automatically."}
              {candidate && <span className="mt-2 block">{ar ? "بدأت: " : "Started: "}{new Date(candidate.startedAt).toLocaleString()}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={() => void confirmRecovery()}>
              {busy ? ar ? "جارٍ الإنهاء…" : "Ending…" : ar ? "أؤكد إنهاء مكالمتي السابقة" : "Confirm: end my previous call"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Alert>
  );
}