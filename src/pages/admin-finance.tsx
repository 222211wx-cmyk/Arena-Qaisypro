import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle, RefreshCw, Loader2, CheckCircle2,
  ShieldAlert, WifiOff, ReceiptText, AlertTriangle,
  CircleDollarSign, FlaskConical, ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Separator } from "@workspace/gdna-ds/components/ui/separator";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { useToast } from "@workspace/gdna-ds/hooks/use-toast";
import { useConnectivity } from "@/contexts/ConnectivityContext";
import { useLang } from "@/contexts/LangContext";
import { financeT } from "@/i18n/finance-copy";
import { adminText, localeFor } from "@/i18n/community-admin-surfaces-copy";
import {
  useAdminDashboard, useAdminManualPayouts,
  postReconcile, patchAdminManualPayout,
  type AdminDashboard, type ManualPayoutRequest,
} from "@/hooks/use-finance";

// ── Formatting helpers ─────────────────────────────────────────────────────────
function fmtMinorStr(minorStr: string | null | undefined, currency: string, locale: string): string {
  const minor = Number(minorStr ?? 0);
  const code = (currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code, minimumFractionDigits: 2 }).format(
      (Number.isFinite(minor) ? minor : 0) / 100,
    );
  } catch {
    return `${((Number.isFinite(minor) ? minor : 0) / 100).toFixed(2)} ${code}`;
  }
}

function fmtMinor(minor: number, currency: string, locale: string): string {
  const code = (currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code, minimumFractionDigits: 2 }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${code}`;
  }
}

// ── Manual payout review row ───────────────────────────────────────────────────
function ManualPayoutRow({
  payout,
  isOnline,
  actionsEnabled,
  onUpdated,
}: {
  payout: ManualPayoutRequest;
  isOnline: boolean;
  actionsEnabled:boolean;
  onUpdated: () => void;
}) {
  const { lang } = useLang();
  const t = (text: string) => financeT(lang, text);
  const at = (text: Parameters<typeof adminText>[1], values?: Record<string, string | number>) => adminText(lang, text, values);
  const locale = localeFor(lang);
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");

  const statusVariant: Record<ManualPayoutRequest["status"], "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary", approved: "default", rejected: "destructive", paid: "default",
  };

  async function transition(status: "approved" | "rejected" | "paid") {
    if (!isOnline) return;
    setSubmitting(true);
    setLocalError("");
    try {
      await patchAdminManualPayout(payout.id, { status, note: note.trim() || undefined });
      toast({ title: at("Payout updated"), description: at("Manual payout marked", { id: `${payout.id.slice(0, 8)}…`, status: at(status) }) });
      onUpdated();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : at("Transition failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-border/30 rounded-lg bg-card/30" data-testid={`row-manual-payout-${payout.id}`}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-start gap-3"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        data-testid={`toggle-payout-${payout.id}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{payout.displayName ?? payout.beneficiaryId.slice(0, 8)}</span>
            <Badge variant={statusVariant[payout.status]} data-testid={`badge-payout-status-${payout.id}`}>{at(payout.status)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {at("Period")} {payout.period} · {fmtMinor(payout.amountMinor, payout.currency, locale)} · {payout.maskedAccount ?? "—"}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <Separator />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <span className="text-muted-foreground">ID</span><span className="font-mono truncate">{payout.id}</span>
            <span className="text-muted-foreground">{at("Beneficiary")}</span><span className="font-mono truncate">{payout.beneficiaryId}</span>
            <span className="text-muted-foreground">{at("Provider")}</span><span>{payout.provider}</span>
            <span className="text-muted-foreground">{at("Amount")}</span><span className="tabular-nums">{fmtMinor(payout.amountMinor, payout.currency, locale)}</span>
            <span className="text-muted-foreground">{at("Currency")}</span><span>{payout.currency.toUpperCase()}</span>
            <span className="text-muted-foreground">{at("Period")}</span><span>{payout.period}</span>
            <span className="text-muted-foreground">{at("Account (masked)")}</span><span>{payout.maskedAccount ?? "—"}</span>
            <span className="text-muted-foreground">{at("Created")}</span><span>{payout.createdAt ? new Date(payout.createdAt).toLocaleString(locale) : "—"}</span>
          </div>

          {actionsEnabled && (payout.status === "pending" || payout.status === "approved") ? (
            <div className="space-y-2.5 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor={`note-${payout.id}`} className="text-xs">{t("Review note (optional)")}</Label>
                <Input
                  id={`note-${payout.id}`} value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("Internal note")} data-testid={`input-note-${payout.id}`}
                  className="h-8 text-xs"
                />
              </div>
              {localError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-2.5 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                  <p className="text-xs text-destructive">{localError}</p>
                </div>
              )}
              <div className="flex gap-2">
                {payout.status === "pending" && (
                  <>
                    <Button size="sm" className="flex-1" disabled={submitting || !isOnline}
                      onClick={() => transition("approved")} data-testid={`button-approve-${payout.id}`}>
                       {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("Approve")}
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" disabled={submitting || !isOnline}
                      onClick={() => transition("rejected")} data-testid={`button-reject-${payout.id}`}>
                       {t("Reject")}
                    </Button>
                  </>
                )}
                {payout.status === "approved" && (
                  <Button size="sm" className="flex-1" disabled={submitting || !isOnline}
                    onClick={() => transition("paid")} data-testid={`button-mark-paid-${payout.id}`}>
                     {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("Mark as paid")}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground pt-1">
               {actionsEnabled
                 ? at("No transitions", { status: at(payout.status) })
                 : t("Manual payout review actions are disabled in Simulation Mode.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Fiat balance section ───────────────────────────────────────────────────────
function FiatSection({ data }: { data: AdminDashboard }) {
  const { lang } = useLang();
  const t = (text: string) => financeT(lang, text);
  const at = (text: Parameters<typeof adminText>[1]) => adminText(lang, text);
  const locale = localeFor(lang);
  const rows = data.fiat ?? [];
  if (rows.length === 0) {
    return (
      <Card className="bg-card/40 border-border/30">
        <CardContent className="p-8 text-center">
          <CircleDollarSign className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{at("No fiat balances")}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.currency} data-testid={`section-currency-${row.currency}`} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{row.currency}</p>
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-card/40 border-border/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("Available")}</p>
                <p className="text-lg font-bold tabular-nums text-green-500" data-testid={`text-admin-available-${row.currency}`}>
                  {fmtMinorStr(row.available, row.currency, locale)}
                </p>
                <p className="text-xs text-muted-foreground/50 mt-0.5 uppercase">{row.currency}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/40 border-border/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("Reserved")}</p>
                <p className="text-lg font-bold tabular-nums text-muted-foreground" data-testid={`text-admin-reserved-${row.currency}`}>
                  {fmtMinorStr(row.reserved, row.currency, locale)}
                </p>
                <p className="text-xs text-muted-foreground/50 mt-0.5 uppercase">{row.currency}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dashboard skeleton ─────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      <div className="skeleton h-32 rounded-xl" />
      <div className="skeleton h-48 rounded-xl" />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminFinance() {
  const { lang } = useLang();
  const t = (text: string) => financeT(lang, text);
  const at = (text: Parameters<typeof adminText>[1], values?: Record<string, string | number>) => adminText(lang, text, values);
  const locale = localeFor(lang);
  const SIMULATION_MODE = true;
  const { isOnline } = useConnectivity();
  const { toast } = useToast();
  const { state, refetch } = useAdminDashboard();
  const { state: payoutsState, refetch: refetchPayouts } = useAdminManualPayouts();
  const [reconcileState, setReconcileState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [reconcileMsg, setReconcileMsg] = useState("");

  useEffect(() => {
    refetch();
    refetchPayouts();
  }, [refetch, refetchPayouts]);

  const handleReconcile = useCallback(async () => {
    if (!isOnline) return;
    setReconcileState("loading");
    setReconcileMsg("");
    try {
      const result = await postReconcile();
      setReconcileState("success");
       setReconcileMsg(at("Reconciliation complete", { count: result.issuesCreated.toLocaleString(locale) }));
      await refetch();
    } catch (e) {
      setReconcileState("error");
       setReconcileMsg(e instanceof Error ? e.message : at("Reconciliation failed"));
    }
  }, [isOnline, refetch]);

  const isLoading = state.status === "idle" || state.status === "loading";
  const isError = state.status === "error";
  const data = state.status === "success" ? state.data : null;
  const errorText = isError ? (state as { status: "error"; error: string }).error : "";
  const manualPayouts = payoutsState.status === "success" ? payoutsState.data : [];
  const pendingCount = manualPayouts.filter((p) => p.status === "pending").length;

  return (
     <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-[calc(100dvh-4rem)] max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("Finance Dashboard")}</h1>
            <Badge variant="secondary" className="text-xs">{t("Admin only")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
             {at("Dashboard subtitle")}
          </p>
        </div>
        <Button
          variant="ghost" size="sm" onClick={() => { refetch(); refetchPayouts(); }}
          disabled={isLoading || !isOnline} data-testid="button-refresh-dashboard"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          <span className="sr-only">{t("Refresh")}</span>
        </Button>
      </div>

      {SIMULATION_MODE && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3" data-testid="banner-simulation-mode">
          <FlaskConical className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">{t("Test / Simulation Mode")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
               {at("Simulation body")}
            </p>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 border border-orange-500/30 px-4 py-2.5 text-sm text-orange-400">
          <WifiOff className="w-4 h-4 shrink-0" />
           {at("Offline body")}
        </div>
      )}

      {isError && errorText.includes("403") && (
        <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-4">
          <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-sm text-destructive">{t("Access denied")}</p>
            <p className="text-xs text-destructive/70 mt-0.5">
               {at("Admin required")}
            </p>
          </div>
        </div>
      )}

      {isError && !errorText.includes("403") && (
        <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive flex-1">{errorText}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="button-retry-dashboard">{t("Retry")}</Button>
        </div>
      )}

      {isLoading && <DashboardSkeleton />}

      {!isLoading && data && (
        <div className="space-y-8">
          {/* Fiat balances */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{t("Fiat Balances by Currency")}</h2>
            <FiatSection data={data} />
          </section>

          <Separator />

          {/* Reconciliation open issues + action */}
          <section className="rounded-lg border border-border/50 bg-card/30 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg border border-border/40 bg-muted/20 flex items-center justify-center shrink-0">
                  <ReceiptText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t("Reconciliation")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                     {at("Reconciliation body")}
                  </p>
                </div>
              </div>
              <div className="text-end shrink-0">
                <p className="text-2xl font-bold tabular-nums text-orange-400" data-testid="text-admin-open-issues">
                   {data.openReconciliationIssues.toLocaleString(locale)}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("Open issues")}</p>
              </div>
            </div>
            {reconcileState === "success" && (
              <div className="flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <p className="text-sm text-green-400">{reconcileMsg}</p>
              </div>
            )}
            {reconcileState === "error" && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{reconcileMsg}</p>
              </div>
            )}
            <Button
              variant="outline" disabled={!isOnline || reconcileState === "loading"}
              onClick={handleReconcile} data-testid="button-reconcile"
            >
              {reconcileState === "loading"
                  ? <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t("Running...")}</>
                  : !isOnline ? <><WifiOff className="w-4 h-4 me-2" />{t("Offline")}</>
                 : <><ReceiptText className="w-4 h-4 me-2" />{t("Run reconciliation")}</>}
            </Button>
          </section>

          <Separator />

          {/* Manual payout requests */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground">{t("Monthly Manual Payout Requests")}</h2>
              {pendingCount > 0 && (
                 <Badge variant="secondary" data-testid="badge-pending-count">{at("pendingCount", { count: pendingCount.toLocaleString(locale) })}</Badge>
              )}
            </div>
            {payoutsState.status === "loading" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t("Loading payout requests...")}
              </div>
            )}
            {payoutsState.status === "error" && (
              <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive flex-1">{(payoutsState as { status: "error"; error: string }).error}</p>
                <Button size="sm" variant="outline" onClick={() => refetchPayouts()} data-testid="button-retry-payouts">{t("Retry")}</Button>
              </div>
            )}
            {payoutsState.status === "success" && manualPayouts.length === 0 && (
              <div className="text-center py-8 rounded-lg border border-border/30 bg-card/20">
                <p className="text-sm text-muted-foreground">{t("No manual payout requests yet.")}</p>
              </div>
            )}
            {payoutsState.status === "success" && manualPayouts.length > 0 && (
              <div className="space-y-2">
                {manualPayouts.map((p) => (
                  <ManualPayoutRow
                    key={p.id}
                    payout={p}
                    isOnline={isOnline}
                     actionsEnabled={!SIMULATION_MODE}
                    onUpdated={refetchPayouts}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {!isLoading && !isError && !data && (
        <div className="text-center py-16">
          <AlertTriangle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
           <p className="text-sm text-muted-foreground">{t("No data available.")}</p>
           <Button variant="outline" className="mt-4" onClick={() => refetch()} data-testid="button-load-dashboard">{t("Load dashboard")}</Button>
        </div>
      )}
    </div>
  );
}
