import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, AlertCircle, CheckCircle2,
  WifiOff, Loader2,
  Building2, User, Briefcase, FlaskConical, Calculator,
  Landmark, Send, Eye, EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Separator } from "@workspace/gdna-ds/components/ui/separator";
import { useToast } from "@workspace/gdna-ds/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useConnectivity } from "@/contexts/ConnectivityContext";
import { useLang } from "@/contexts/LangContext";
import { financeLocale, onboardingT } from "@/i18n/finance-onboarding-copy";
import {
  useWalletData, useManualPayouts,
  postAcceptTerms,
  postSimulatePayment, postSimulateRefund,
  putPayoutDetails, postManualPayout,
  splitNet7030, newIdempotencyKey,
  CURRENT_TERMS_VERSION,
  type Beneficiary, type SimulationPayment, type ManualPayoutRequest,
} from "@/hooks/use-finance";

type Step = "owner-type" | "details" | "terms" | "complete";

interface FormState {
  ownerType: string;
  displayName: string;
  legalName: string;
  country: string;
  termsAccepted: boolean;
}

// ── Formatting ──────────────────────────────────────────────────────────────────
function fmtMinor(minor: number, currency: string, locale: string): string {
  const code = (currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code, minimumFractionDigits: 2 }).format(minor / 100);
  } catch {
    return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100)} ${code}`;
  }
}

function fmtPeriod(period: string, locale: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: Step }) {
  const { lang } = useLang();
  const t = (key: Parameters<typeof onboardingT>[1]) => onboardingT(lang, key);
  const steps = [
    { key: "owner-type" as Step, label: t("accountType") },
    { key: "details" as Step, label: t("details") },
    { key: "terms" as Step, label: t("terms") },
  ];
  const currentIdx = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
              i < currentIdx ? "bg-primary border-primary text-primary-foreground"
              : i === currentIdx ? "border-primary text-primary bg-primary/10"
              : "border-border/40 text-muted-foreground/40"
            }`}>
              {i < currentIdx ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:inline ${i === currentIdx ? "text-foreground font-medium" : "text-muted-foreground/60"}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-6 sm:w-10 h-px mx-1 ${i < currentIdx ? "bg-primary" : "bg-border/30"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Existing beneficiary panel ─────────────────────────────────────────────────
function ExistingBeneficiaryPanel({ b }: { b: Beneficiary }) {
  const { lang } = useLang();
  const t = (key: Parameters<typeof onboardingT>[1], values?: Record<string, string | number>) => onboardingT(lang, key, values);
  const ownerLabel = t(b.ownerType === "citizen" ? "citizen" : b.ownerType === "event" ? "event" : "company");
  const accountActive = b.termsAccepted && b.status !== "restricted";
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t("payoutAccount")}</CardTitle>
          <Badge variant={accountActive ? "default" : "secondary"}>{t(accountActive ? "active" : "incomplete")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><p className="text-xs text-muted-foreground">{t("displayName")}</p><p className="font-medium">{b.displayName}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("accountType")}</p><p className="font-medium">{ownerLabel}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("country")}</p><p className="font-medium">{b.country ?? "—"}</p></div>
          <div>
            <p className="text-xs text-muted-foreground">{t("termsLabel")}</p>
            <p className={`font-medium text-xs ${b.termsAccepted ? "text-green-500" : "text-orange-400"}`}>
              {b.termsAccepted ? t("acceptedVersion", { version: b.termsVersion ?? "?" }) : t("notAccepted")}
            </p>
          </div>
        </div>
        <Separator />
        <p className="text-xs text-muted-foreground">{t("simulationAccountDescription")}</p>
      </CardContent>
    </Card>
  );
}

// ── 70/30 split simulation panel — calls real backend endpoint ──────────────────
function SplitSimulationPanel({ beneficiary }: { beneficiary: Beneficiary | null }) {
  const { lang } = useLang();
  const t = (key: Parameters<typeof onboardingT>[1], values?: Record<string, string | number>) => onboardingT(lang, key, values);
  const locale = financeLocale(lang);
  const { toast } = useToast();
  const { refetch: refetchWallet } = useWalletData();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [lastPayment, setLastPayment] = useState<SimulationPayment | null>(null);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const { isOnline } = { isOnline: true }; // resolved from context below

  const amountMinor = Math.round(Number(amount) * 100);
  const valid = Number.isSafeInteger(amountMinor) && amountMinor > 0 && !!beneficiary;
  const preview = valid ? splitNet7030(amountMinor) : { beneficiaryMinor: 0, platformMinor: 0 };

  async function runSimulation() {
    if (!valid || !beneficiary) return;
    setSubmitting(true);
    setError("");
    try {
      const { payment } = await postSimulatePayment({
        beneficiaryId: beneficiary.id,
        amountMinor,
        currency,
        description: description.trim() || t("simulationPayment"),
        idempotencyKey: newIdempotencyKey("sim-pay"),
      });
      setLastPayment(payment);
      toast({ title: t("simulationRecorded"), description: `${t("journalId")}: ${payment.journalId ?? payment.id}` });
      await refetchWallet();
    } catch (e) {
      setError(t("simulationFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function runRefund() {
    if (!lastPayment?.journalId) return;
    setRefundSubmitting(true);
    setError("");
    try {
      await postSimulateRefund({
        journalId: lastPayment.journalId,
        idempotencyKey: newIdempotencyKey("sim-refund"),
      });
      toast({ title: t("simulationRefundRecorded"), description: t("ledgerReversalCreated") });
      setLastPayment(null);
      await refetchWallet();
    } catch (e) {
      setError(t("refundFailed"));
    } finally {
      setRefundSubmitting(false);
    }
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" /> {t("splitTitle")}
          </CardTitle>
          <Badge variant="secondary">{t("simulatedBadge")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {t("splitDescription")}
        </p>
        {!beneficiary && (
          <div className="rounded-md bg-muted/20 border border-border/30 px-3 py-2 text-xs text-muted-foreground">
            {t("beneficiaryRequired")}
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="sim-amount">{t("grossAmount")}</Label>
            <Input
              id="sim-amount" type="number" min="0" step="0.01" inputMode="decimal"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="100.00" data-testid="input-sim-amount"
            />
          </div>
          <div className="w-28 space-y-1.5">
            <Label htmlFor="sim-currency">{t("currency")}</Label>
            <select
              id="sim-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}
              data-testid="select-sim-currency"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {["usd", "eur", "mad", "gbp"].map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sim-description">{t("description")}</Label>
          <Input
            id="sim-description" value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("simulationPayment")} data-testid="input-sim-description"
          />
        </div>

        {/* Live preview */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2">
            <p className="text-xs text-muted-foreground">{t("beneficiary70")}</p>
            <p className="text-lg font-bold text-green-500 tabular-nums" data-testid="text-sim-beneficiary">
              {fmtMinor(preview.beneficiaryMinor, currency, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">{t("platform30")}</p>
            <p className="text-lg font-bold text-foreground tabular-nums" data-testid="text-sim-platform">
              {fmtMinor(preview.platformMinor, currency, locale)}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <Button
          className="w-full" disabled={!valid || submitting}
          onClick={runSimulation} data-testid="button-run-simulation"
        >
          {submitting ? <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t("running")}</> : t("postSimulation")}
        </Button>

        {/* Last result + refund */}
        {lastPayment && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 space-y-2">
            <p className="text-xs font-medium text-foreground">{t("lastSimulation")}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">{t("journalId")}</span>
              <span className="font-mono truncate" data-testid="text-sim-journal-id">{lastPayment.journalId ?? lastPayment.id}</span>
              <span className="text-muted-foreground">{t("beneficiary")}</span>
              <span className="text-green-500 tabular-nums">{fmtMinor(lastPayment.beneficiaryMinor ?? 0, lastPayment.currency, locale)}</span>
              <span className="text-muted-foreground">{t("platform")}</span>
              <span className="tabular-nums">{fmtMinor(lastPayment.platformMinor ?? 0, lastPayment.currency, locale)}</span>
              <span className="text-muted-foreground">{t("duplicate")}</span>
              <span>{t(lastPayment.duplicate ? "yesIdempotent" : "no")}</span>
            </div>
            {lastPayment.journalId && (
              <Button
                variant="outline" size="sm" className="w-full mt-1"
                disabled={refundSubmitting} onClick={runRefund}
                data-testid="button-run-refund"
              >
                {refundSubmitting ? <><Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" />{t("refunding")}</> : t("postRefund")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Bank details + monthly RedotPay request panel ──────────────────────────────
// Only for event/company beneficiaries.
function PayoutRailsPanel({ beneficiary, requestsEnabled }: { beneficiary: Beneficiary; requestsEnabled: boolean }) {
  const { lang } = useLang();
  const t = (key: Parameters<typeof onboardingT>[1], values?: Record<string, string | number>) => onboardingT(lang, key, values);
  const locale = financeLocale(lang);
  const { toast } = useToast();
  const { state: manualState, refetch: refetchManual } = useManualPayouts();

  // Payout details form
  const [maskedAccount, setMaskedAccount] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [detailsForm, setDetailsForm] = useState({ accountHolder: "", bankName: "", accountNumber: "", routingCode: "" });
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  // Manual payout request form
  const [reqCurrency, setReqCurrency] = useState("usd");
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqError, setReqError] = useState("");

  const period = new Date().toISOString().slice(0, 7); // YYYY-MM

  useEffect(() => { refetchManual(); }, [refetchManual]);

  const requests = (manualState.status === "success" ? manualState.data : [])
    .filter((r) => r.beneficiaryId === beneficiary.id);
  const alreadyRequested = requests.some((r) => r.period === period);
  const hasDetails = !!maskedAccount;

  async function saveDetails() {
    if (!detailsForm.accountHolder.trim() || !detailsForm.accountNumber.trim() || !detailsForm.bankName.trim()) return;
    setSavingDetails(true);
    setDetailsError("");
    try {
      const { payoutDetails } = await putPayoutDetails(beneficiary.id, {
        accountHolder: detailsForm.accountHolder.trim(),
        bankName: detailsForm.bankName.trim(),
        accountNumber: detailsForm.accountNumber.trim(),
        routingCode: detailsForm.routingCode.trim() || undefined,
      });
      setMaskedAccount(payoutDetails.maskedAccount);
      setEditing(false);
      setReveal(false);
      toast({ title: t("bankSaved"), description: t("bankSavedDescription") });
    } catch (e) {
      setDetailsError(t("saveFailed"));
    } finally {
      setSavingDetails(false);
    }
  }

  async function submitManualPayout() {
    setSubmittingReq(true);
    setReqError("");
    try {
      await postManualPayout({ beneficiaryId: beneficiary.id, period, currency: reqCurrency });
      toast({ title: t("requestSubmitted"), description: t("requestSubmittedDescription", { period: fmtPeriod(period, locale) }) });
      await refetchManual();
    } catch (e) {
      setReqError(t("requestFailed"));
    } finally {
      setSubmittingReq(false);
    }
  }

  const statusVariant: Record<ManualPayoutRequest["status"], "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary", approved: "default", rejected: "destructive", paid: "default",
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" /> {t("bankRedot")}
          </CardTitle>
          <Badge variant="secondary">{t("monthlyManual")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Bank details section */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("settlementBank")}</p>
          <p className="text-xs text-muted-foreground">
            {t("bankSecurity")}
          </p>

          {!editing && maskedAccount && (
            <div className="rounded-lg border border-border/40 bg-card/30 p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">{t("maskedAccount")}</span>
                <span className="font-mono flex items-center gap-2" data-testid="text-masked-account">
                  {reveal ? detailsForm.accountNumber || maskedAccount : maskedAccount}
                  <button
                    onClick={() => setReveal((r) => !r)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={t(reveal ? "hide" : "reveal")}
                    title={t(reveal ? "hide" : "reveal")}
                    data-testid="button-toggle-reveal"
                  >
                    {reveal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </span>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => setEditing(true)} data-testid="button-edit-bank">
                {t("updateBank")}
              </Button>
            </div>
          )}

          {!editing && !maskedAccount && (
            <Button variant="outline" className="w-full" onClick={() => setEditing(true)} data-testid="button-add-bank">
              {t("addBank")}
            </Button>
          )}

          {editing && (
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="bank-holder">{t("accountHolder")}</Label>
                <Input id="bank-holder" value={detailsForm.accountHolder}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, accountHolder: e.target.value }))}
                  placeholder={t("legalAccountName")} data-testid="input-bank-holder" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-name">{t("bankName")}</Label>
                <Input id="bank-name" value={detailsForm.bankName}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, bankName: e.target.value }))}
                  placeholder={t("bankName")} data-testid="input-bank-name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-account">{t("accountNumber")}</Label>
                <Input id="bank-account" value={detailsForm.accountNumber}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, accountNumber: e.target.value }))}
                  placeholder="MA64 0000 0000 0000 0000 0000" data-testid="input-bank-account" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-routing">{t("routingCode")}</Label>
                <Input id="bank-routing" value={detailsForm.routingCode}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, routingCode: e.target.value }))}
                  placeholder="BANKMAMC" data-testid="input-bank-routing" />
              </div>
              {detailsError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                  <p className="text-xs text-destructive">{detailsError}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setEditing(false); setDetailsError(""); }} data-testid="button-cancel-bank">{t("cancel")}</Button>
                <Button
                  className="flex-1"
                  disabled={!detailsForm.accountHolder.trim() || !detailsForm.accountNumber.trim() || !detailsForm.bankName.trim() || savingDetails}
                  onClick={saveDetails} data-testid="button-save-bank"
                >
                  {savingDetails ? <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t("saving")}</> : t("saveDetails")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Monthly manual payout request section */}
        {requestsEnabled ? <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("monthlyRequest")}</p>
            <span className="text-xs text-muted-foreground">{t("period", { period: fmtPeriod(period, locale) })}</span>
          </div>

          {!hasDetails ? (
            <p className="text-xs text-muted-foreground">{t("addBankToEnable")}</p>
          ) : alreadyRequested ? (
            <div className="rounded-md bg-muted/20 border border-border/30 px-3 py-2 text-xs text-muted-foreground">
              {t("alreadyRequested", { period: fmtPeriod(period, locale) })}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="redot-currency">{t("currency")}</Label>
                <select
                  id="redot-currency" value={reqCurrency} onChange={(e) => setReqCurrency(e.target.value)}
                  data-testid="select-redot-currency"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {["usd", "eur", "mad", "gbp"].map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("payoutCalculation")}
              </p>
              {reqError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                  <p className="text-xs text-destructive">{reqError}</p>
                </div>
              )}
              <Button
                className="w-full" disabled={submittingReq} onClick={submitManualPayout}
                data-testid="button-submit-redot"
              >
                {submittingReq
                  ? <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t("submitting")}</>
                  : <><Send className="w-4 h-4 me-2" />{t("submitMonthly")}</>}
              </Button>
            </div>
          )}

          {/* Request history */}
          {requests.length > 0 && (
            <div className="space-y-1.5 mt-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">{t("requestHistory")}</p>
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-border/30 bg-card/30 px-3 py-2 text-xs"
                  data-testid={`row-redot-${r.id}`}
                >
                  <div>
                    <p className="font-medium text-foreground">{fmtMinor(r.amountMinor, r.currency, locale)}</p>
                    <p className="text-muted-foreground/70">{t("period", { period: fmtPeriod(r.period, locale) })} · {r.maskedAccount ?? "—"}</p>
                  </div>
                  <Badge variant={statusVariant[r.status]} data-testid={`badge-redot-status-${r.id}`}>
                    {t(r.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {manualState.status === "loading" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("loadingRequests")}
            </div>
          )}
        </div> : <p className="text-xs text-muted-foreground">{t("requestsUnavailable")}</p>}
      </CardContent>
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function FinanceOnboarding() {
  const [, setLocation] = useLocation();
  const { lang } = useLang();
  const t = (key: Parameters<typeof onboardingT>[1], values?: Record<string, string | number>) => onboardingT(lang, key, values);
  const { user } = useAuth();
  const { isOnline } = useConnectivity();
  const { toast } = useToast();
  const { state: walletState, refetch: refetchWallet } = useWalletData();
  const SIMULATION_MODE = true;

  const [step, setStep] = useState<Step>("owner-type");
  const [form, setForm] = useState<FormState>({
    ownerType: "", displayName: "", legalName: "", country: "MA", termsAccepted: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);

  useEffect(() => { if (user) refetchWallet(); }, [user, refetchWallet]);

  const existingBeneficiaries =
    walletState.status === "success" ? (walletState.data.beneficiaries ?? []) : [];
  const hasExisting = existingBeneficiaries.length > 0;

  if (!user) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4" dir={lang === "ar" ? "rtl" : "ltr"}>
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="font-semibold">{t("signInRequired")}</p>
            <p className="text-sm text-muted-foreground">{t("signInDescription")}</p>
            <Button className="w-full" onClick={() => setLocation("/login")} data-testid="button-login-onboarding">{t("logIn")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Step handlers ────────────────────────────────────────────────────────────
  async function handleAcceptTerms() {
    if (!isOnline) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await postAcceptTerms({
        ownerType: form.ownerType,
        displayName: form.displayName,
        legalName: form.legalName,
        country: form.country,
        accepted: true,
      });
      setBeneficiary(result.beneficiary);
      setStep("complete");
    } catch (e) {
      setError(t("saveRetry"));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Sub-step components ───────────────────────────────────────────────────────
  function StepOwnerType() {
    const ownerTypes = [
      { value: "citizen", label: t("citizen"), description: t("citizenDescription"), icon: User },
      { value: "event", label: t("event"), description: t("eventDescription"), icon: Briefcase },
      { value: "company", label: t("company"), description: t("companyDescription"), icon: Building2 },
    ] as const;
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t("accountType")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("selectAccountType")}</p>
        </div>
        <div className="grid gap-3">
          {ownerTypes.map(({ value, label, description, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setForm((f) => ({ ...f, ownerType: value }))}
              data-testid={`button-owner-type-${value}`}
              className={`flex items-center gap-4 p-4 rounded-lg border text-start transition-colors ${
                form.ownerType === value ? "border-primary bg-primary/5" : "border-border/40 bg-card/30 hover:border-border"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                form.ownerType === value ? "border-primary/40 bg-primary/10" : "border-border/30 bg-muted/20"
              }`}>
                <Icon className={`w-5 h-5 ${form.ownerType === value ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              {form.ownerType === value && <CheckCircle2 className="w-5 h-5 text-primary ms-auto shrink-0" />}
            </button>
          ))}
        </div>
        <Button className="w-full" disabled={!form.ownerType} onClick={() => setStep("details")} data-testid="button-next-owner-type">
          {t("continue")} <ChevronRight className="w-4 h-4 ms-1 rtl:rotate-180" />
        </Button>
      </div>
    );
  }

  function StepDetails() {
    const countries = [
      { code: "MA", name: t("morocco") }, { code: "FR", name: t("france") },
      { code: "BE", name: t("belgium") }, { code: "DE", name: t("germany") },
      { code: "GB", name: t("unitedKingdom") }, { code: "US", name: t("unitedStates") },
      { code: "CA", name: t("canada") }, { code: "AE", name: t("unitedArabEmirates") },
    ];
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t("legalDetails")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("legalDetailsDescription")}</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">{t("displayName")}</Label>
            <Input id="displayName" value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder={t("displayNamePlaceholder")} data-testid="input-display-name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="legalName">{t("legalName")}</Label>
            <Input id="legalName" value={form.legalName}
              onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
              placeholder={t("legalNamePlaceholder")} data-testid="input-legal-name" />
            <p className="text-xs text-muted-foreground">{t("identityNote")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">{t("country")}</Label>
            <select
              id="country" value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              data-testid="select-country"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("owner-type")} data-testid="button-back-details">
            <ChevronLeft className="w-4 h-4 me-1 rtl:rotate-180" /> {t("back")}
          </Button>
          <Button
            className="flex-1"
            disabled={!form.displayName.trim() || !form.legalName.trim() || !form.country}
            onClick={() => setStep("terms")}
            data-testid="button-next-details"
          >
            {t("continue")} <ChevronRight className="w-4 h-4 ms-1 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    );
  }

  function StepTerms() {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t("reviewTerms")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("reviewTermsDescription")}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/10 p-4 max-h-72 overflow-y-auto">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
             {t("termsDocument", { version: CURRENT_TERMS_VERSION })}
          </pre>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <input
                type="checkbox" id="acceptTerms" checked={form.termsAccepted}
                onChange={(e) => setForm((f) => ({ ...f, termsAccepted: e.target.checked }))}
                data-testid="checkbox-accept-terms"
                className="w-4 h-4 rounded accent-primary cursor-pointer"
              />
            </div>
            <label htmlFor="acceptTerms" className="text-sm cursor-pointer">
              <span className="font-medium text-foreground">{t("acceptTerms")}</span>
              <span className="text-muted-foreground">
                {" "}{t("acceptConfirmation", { version: CURRENT_TERMS_VERSION })}
              </span>
            </label>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("details")} disabled={submitting} data-testid="button-back-terms">
            <ChevronLeft className="w-4 h-4 me-1 rtl:rotate-180" /> {t("back")}
          </Button>
          <Button
            className="flex-1"
            disabled={!form.termsAccepted || submitting || !isOnline}
            onClick={handleAcceptTerms}
            data-testid="button-accept-and-continue"
          >
            {submitting ? <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t("saving")}</>
              : !isOnline ? <><WifiOff className="w-4 h-4 me-2" />{t("offline")}</>
              : <>{t("acceptContinue")} <ChevronRight className="w-4 h-4 ms-1 rtl:rotate-180" /></>}
          </Button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100dvh-4rem)] max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("pageDescription")}
        </p>
      </div>

      {SIMULATION_MODE && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3" data-testid="banner-simulation-mode">
          <FlaskConical className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">{t("simulationMode")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("simulationBanner")}
            </p>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 border border-orange-500/30 px-4 py-2.5 text-sm text-orange-400">
          <WifiOff className="w-4 h-4 shrink-0" />
          {t("offlineDescription")}
        </div>
      )}

      {/* Existing beneficiary — resume flow */}
      {hasExisting && step === "owner-type" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 px-4 py-3 text-sm text-orange-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {t("existingAccount")}
          </div>
          {existingBeneficiaries.map((b) => (
            <div key={b.id} className="space-y-4">
               <ExistingBeneficiaryPanel b={b} />
               {(b.ownerType === "event" || b.ownerType === "company") && (
               <PayoutRailsPanel beneficiary={b} requestsEnabled={!SIMULATION_MODE} />
               )}
            </div>
          ))}
          {SIMULATION_MODE && <SplitSimulationPanel beneficiary={existingBeneficiaries[0] ?? null} />}
          <Separator />
          <p className="text-xs text-muted-foreground text-center">
            {t("differentType")}
          </p>
          <Button variant="outline" className="w-full" onClick={() => setStep("owner-type")} data-testid="button-new-account-type">
            {t("registerNew")}
          </Button>
        </div>
      )}

      {/* Step-based flow */}
      {(!hasExisting || step !== "owner-type") && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6 space-y-6">
            <StepIndicator current={step} />
            <Separator />
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                {step === "owner-type" && <StepOwnerType />}
                {step === "details"    && <StepDetails />}
                {step === "terms"      && <StepTerms />}
                {step === "complete"   && (
                  <div className="space-y-6 py-2">
                    <div className="text-center space-y-3">
                      <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
                      <h2 className="text-lg font-semibold">{t("setupComplete")}</h2>
                      <p className="text-sm text-muted-foreground">
                        {t("completeDescription")}
                      </p>
                    </div>
                    {SIMULATION_MODE && <SplitSimulationPanel beneficiary={beneficiary} />}
                     {beneficiary && (beneficiary.ownerType === "event" || beneficiary.ownerType === "company") && (
                        <PayoutRailsPanel beneficiary={beneficiary} requestsEnabled={!SIMULATION_MODE} />
                     )}
                    <Button className="w-full" onClick={() => setLocation("/wallet")} data-testid="button-go-to-wallet">
                      {t("goWallet")}
                    </Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
