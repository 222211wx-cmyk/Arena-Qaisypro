import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { RecoveryPhoneSettings } from "@/components/auth/recovery-phone-settings";
import { CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { useLang } from "@/contexts/LangContext";
import { task39Text } from "@/i18n/task39";
import { dashboardLocale, dashboardText, type DashboardCopyKey } from "@/i18n/dashboard-copy";
import { useEffect, useState } from "react";
import { Coins, LogOut, Swords, Trophy, Activity, Target, Gift, Wallet, CheckCircle, Clock, BrainCircuit, ArrowRight, Zap, Lock, Crown, ScrollText, Users, ShieldCheck } from "lucide-react";
import { RecoveryCodeSettings } from "@/components/auth/recovery-code-settings";

type DailyArchonDirective = {
  id: number;
  directive: string;
  completed: boolean;
  createdAt: string;
};

function DailyArchonDirectiveCard() {
  const { lang } = useLang();
  const dx = (key: DashboardCopyKey) => dashboardText(lang, key);
  const [directive, setDirective] = useState<DailyArchonDirective | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    fetch("/api/archon/daily-directive", { credentials: "include" })
      .then(async response => response.ok ? response.json() : Promise.reject(new Error("Directive unavailable")))
      .then(data => setDirective(data.directive))
      .catch(() => setDirective(null));
  }, []);

  const acknowledge = async () => {
    if (!directive || directive.completed || acknowledging) return;
    setAcknowledging(true);
    try {
      const response = await fetch(`/api/archon/daily-directive/${directive.id}/acknowledge`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Unable to acknowledge");
      setDirective(current => current ? { ...current, completed: true } : current);
    } finally {
      setAcknowledging(false);
    }
  };

  if (!directive) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="daily-archon-title"
      dir={lang === "ar" ? "rtl" : "ltr"}
      data-testid="daily-archon-directive"
    >
      <Card className="overflow-hidden border-primary/50 bg-background shadow-[0_0_28px_hsl(var(--primary)/0.12)]">
        <CardContent className="relative flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="pointer-events-none absolute inset-y-0 start-0 w-1 bg-primary" />
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/50 bg-primary/10 text-primary">
              <Crown className="size-6" />
            </div>
            <div className={lang === "ar" ? "text-right" : "text-left"}>
              <p className="mb-1 text-xs font-bold tracking-[0.18em] text-primary">{dx("directiveEyebrow")}</p>
              <h2 id="daily-archon-title" className="text-xl font-black text-foreground md:text-2xl">
                {dx("directiveTitle")}
              </h2>
              <p className="mt-2 max-w-3xl leading-7 text-muted-foreground">{directive.directive}</p>
              <p className="mt-2 text-xs text-primary/80">{dx("directiveRefresh")}</p>
            </div>
          </div>
          <Button
            onClick={acknowledge}
            disabled={directive.completed || acknowledging}
            className="min-w-28 shrink-0 font-black"
            data-testid="button-acknowledge-archon"
          >
            <CheckCircle className="me-2 size-4" />
            {directive.completed ? dx("seenComplete") : acknowledging ? dx("processing") : dx("seen")}
          </Button>
        </CardContent>
      </Card>
    </motion.section>
  );
}

type DirectiveAcknowledgementCitizen = {
  id: number;
  username: string;
  acknowledged: boolean;
};
function SmartWidget() {
  const [, nav] = useLocation();
  const { lang } = useLang();
  const dx = (key: DashboardCopyKey, vars?: Record<string, string | number>) => dashboardText(lang, key, vars);
  const [smartData, setSmartData] = useState<{
    overallScore: number;
    activeModules: number;
    totalModules: number;
    systemStatus: string;
    modules: { id: string; name: string; status: string; score: number }[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/smart/status")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setSmartData(d))
      .catch(() => {});
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      onClick={() => nav("/smart")}
      style={{ cursor: "pointer" }}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <Card style={{
        background: "linear-gradient(135deg, #0d1117 0%, #0a0f00 50%, #0d1117 100%)",
        border: "1px solid #eab30840",
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
      }}>
        {/* Animated glow background */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse at 20% 50%, #eab30815 0%, transparent 60%)",
          }}
        />

        <CardContent style={{ padding: "22px 24px", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>

            {/* Brain icon with pulse */}
            <motion.div
              animate={{ boxShadow: ["0 0 8px #eab30840", "0 0 24px #eab30880", "0 0 8px #eab30840"] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "linear-gradient(135deg, #eab308, #f59e0b)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BrainCircuit size={26} color="#000" />
            </motion.div>

            {/* Text block */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Title */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 15 }}>
                  {dx("smartCompanion")}
                </span>
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  style={{
                    background: "#22c55e20", border: "1px solid #22c55e60",
                    color: "#22c55e", borderRadius: 6, padding: "2px 9px",
                    fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}
                >
                  <Zap size={10} /> {dx("active")}
                </motion.span>
              </div>
              <p style={{ margin: "0 0 2px", color: "#eab308", fontSize: 12, fontWeight: 700 }}>
                {dx("smartSubtitle")}
              </p>
              {/* Description */}
              <p style={{ margin: 0, color: "#888", fontSize: 12, lineHeight: 1.5 }}>
                {dx("smartDescription")}
              </p>
            </div>

            {/* Score + status (desktop) */}
            {smartData && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#eab308", lineHeight: 1 }}>
                  {smartData.overallScore.toLocaleString(dashboardLocale(lang))}
                  <span style={{ fontSize: 12, color: "#888", fontWeight: 400 }}>/{(100).toLocaleString(dashboardLocale(lang))}</span>
                </div>
                <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>{dx("score")}</div>
              </div>
            )}
          </div>

          {/* Module dots row */}
          {smartData?.modules && (
            <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "#555", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", marginInlineEnd: 4 }}>
                {dx("modulesCount", {
                  active: smartData.activeModules.toLocaleString(dashboardLocale(lang)),
                  total: smartData.totalModules.toLocaleString(dashboardLocale(lang)),
                })}
              </span>
              {smartData.modules.map(m => (
                <motion.div
                  key={m.id}
                  title={m.name}
                  whileHover={{ scale: 1.2 }}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: m.status === "ACTIF" ? "#22c55e20" : "#ffffff08",
                    border: `1px solid ${m.status === "ACTIF" ? "#22c55e60" : "#ffffff15"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13,
                  }}
                >
                  {m.name.split(" ")[0]}
                </motion.div>
              ))}
            </div>
          )}

          {/* CTA button */}
          <div style={{ marginTop: 16 }}>
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px #eab30840" }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: "linear-gradient(135deg, #eab308, #f59e0b)",
                color: "#000", border: "none", borderRadius: 10,
                padding: "10px 24px", fontWeight: 800, fontSize: 13,
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
              }}
            >
              <BrainCircuit size={15} />
               {dx("recommendations")}
              <ArrowRight size={14} />
            </motion.button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Imperial Council Reports Widget (admins only) ─────────────────────────────
type CouncilReport = {
  id: number;
  headline: string;
  report: {
    state_of_empire?: string;
    predictions?: string[];
    research?: string[];
    directives?: string[];
  };
  created_at: string;
};

function CouncilReportsWidget() {
  const { lang } = useLang();
  const dx = (key: DashboardCopyKey) => dashboardText(lang, key);
  const [reports, setReports] = useState<CouncilReport[] | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/governor/council-reports", { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { reports: CouncilReport[] } | null) => {
        if (d?.reports) {
          setReports(d.reports);
          setOpenId(d.reports[0]?.id ?? null);
        }
      })
      .catch(() => {});
  }, []);

  if (!reports || reports.length === 0) return null;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dashboardLocale(lang), { year: "numeric", month: "long", day: "numeric" });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
      <Card className="bg-card/50 border-yellow-500/30 overflow-hidden">
        <CardContent className="p-6" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang === "de" ? "de-DE" : lang}>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xl">🏛️</span>
            <h3 className="text-sm uppercase tracking-widest text-yellow-500 font-bold">
              {dx("councilReports")}
            </h3>
            <span className="ms-auto text-[10px] uppercase tracking-widest text-muted-foreground border border-yellow-500/30 rounded px-2 py-0.5">
              {dx("adminOnly")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {dx("councilDescription")}
          </p>
          <div className="space-y-2">
            {reports.map((r) => {
              const open = openId === r.id;
              return (
                <div key={r.id} className={`rounded-lg border ${open ? "border-yellow-500/40 bg-yellow-500/5" : "border-white/10 bg-white/[0.02]"}`}>
                  <button
                    onClick={() => setOpenId(open ? null : r.id)}
                    className="w-full text-start p-3 flex items-center gap-3 cursor-pointer"
                    aria-expanded={open}
                    data-testid={`button-council-report-${r.id}`}
                  >
                    <span className="text-yellow-500 text-xs shrink-0">{open ? "▲" : "▼"}</span>
                    <span className="flex-1 text-sm font-semibold leading-snug">{r.headline}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{fmtDate(r.created_at)}</span>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 text-sm leading-7 text-foreground/90 space-y-3">
                      {r.report.state_of_empire && <p className="m-0">{r.report.state_of_empire}</p>}
                      {!!r.report.predictions?.length && (
                        <div>
                           <b className="text-yellow-500">🔮 {dx("predictions")}</b>
                          <ul className="mt-1 ps-5 list-disc space-y-0.5">
                            {r.report.predictions.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                      {!!r.report.research?.length && (
                        <div>
                          <b className="text-yellow-500">🔬 {dx("research")}</b>
                          <ul className="mt-1 ps-5 list-disc space-y-0.5">
                            {r.report.research.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                      {!!r.report.directives?.length && (
                        <div>
                          <b className="text-yellow-500">⚔️ {dx("directives")}</b>
                          <ul className="mt-1 ps-5 list-disc space-y-0.5">
                            {r.report.directives.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Archon Identity Widget ────────────────────────────────────────────────────
const ARCHETYPES_DASH: Record<string, { color: string; symbol: string; labelKey: DashboardCopyKey }> = {
  "THE SOVEREIGN":   { color: "#C9A84C", symbol: "♔", labelKey: "sovereign" },
  "THE CONQUEROR":   { color: "#FF6B35", symbol: "⚔", labelKey: "conqueror" },
  "THE VISIONARY":   { color: "#A8E6CF", symbol: "👁", labelKey: "visionary" },
  "THE ARCHITECT":   { color: "#DDA0DD", symbol: "⚙", labelKey: "architect" },
  "THE CATALYST":    { color: "#87CEEB", symbol: "◈", labelKey: "catalyst" },
  "THE SENTINEL":    { color: "#98FB98", symbol: "🛡", labelKey: "sentinel" },
  "THE SEEKER":      { color: "#E8C97A", symbol: "◉", labelKey: "seeker" },
};

interface ArchonDashProfile {
  archonCode: string;
  archetype: string;
  overallScore: number;
  archetypeDeclaration: string | null;
  dimensions: {
    volontas: number; resilentia: number; intellectus: number;
    disciplina: number; societas: number; abundantia: number; auctoritas: number;
  };
}

interface DailyDirective {
  id: number;
  directive: string;
  completed: boolean;
  dateKey: string;
  duration?: string;
  intensity?: string;
}
function computeFourPillarsDash(d: ArchonDashProfile["dimensions"], overallScore: number) {
  const dimVals = Object.values(d);
  return [
    { id: "mens",    latin: "MENS",    symbol: "🧠", color: "#A8E6CF", score: Math.round((d.intellectus + d.auctoritas) / 2) },
    { id: "vis",     latin: "VIS",     symbol: "⚔️", color: "#C9A84C", score: Math.round((d.volontas + d.disciplina) / 2) },
    { id: "anima",   latin: "ANIMA",   symbol: "🔥", color: "#FF8C42", score: Math.round((d.resilentia + d.societas) / 2) },
    { id: "legatum", latin: "LEGATUM", symbol: "👑", color: "#DDA0DD", score: Math.round((d.abundantia * 0.5) + (overallScore * 0.3) + (Math.min(...dimVals) * 0.2)) },
  ];
}

function ArchonIdentityWidget() {
  const [, nav] = useLocation();
  const { lang } = useLang();
  const dx = (key: DashboardCopyKey) => dashboardText(lang, key);
  const [profile, setProfile] = useState<ArchonDashProfile | "none" | "loading">("loading");
  const [directive, setDirective] = useState<DailyDirective | null>(null);
  const [directiveLoading, setDirectiveLoading] = useState(false);
  const [markingSeen, setMarkingSeen] = useState(false);

  useEffect(() => {
    fetch("/api/archon/profile", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.session) {
          const s = d.session;
          setProfile({
            archonCode: s.archonCode,
            archetype: s.archetype ?? "THE SEEKER",
            overallScore: Math.round(
              [s.volontas, s.resilentia, s.intellectus, s.disciplina, s.societas, s.abundantia, s.auctoritas]
                .reduce((a: number, b: number) => a + b, 0) / 7
            ),
            archetypeDeclaration: s.aiProfile?.archetype_declaration ?? null,
            dimensions: {
              volontas: s.volontas, resilentia: s.resilentia, intellectus: s.intellectus,
              disciplina: s.disciplina, societas: s.societas, abundantia: s.abundantia, auctoritas: s.auctoritas,
            },
          });
        } else {
          setProfile("none");
        }
      })
      .catch(() => setProfile("none"));
  }, []);

  useEffect(() => {
    if (typeof profile === "string") return;
    const dominantDimension = Object.entries(profile.dimensions)
      .sort(([, a], [, b]) => b - a)[0]?.[0];
    if (!dominantDimension) return;

    setDirectiveLoading(true);
    fetch("/api/archon/mission", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dimension: dominantDimension.toUpperCase(),
        archetype: profile.archetype,
        lang,
      }),
    })
      .then(async r => r.ok ? r.json() : Promise.reject(new Error("Directive unavailable")))
      .then(setDirective)
      .catch(() => setDirective(null))
      .finally(() => setDirectiveLoading(false));
  }, [profile, lang]);

  const markDirectiveSeen = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!directive || directive.completed || markingSeen) return;
    setMarkingSeen(true);
    try {
      const response = await fetch(`/api/archon/mission/${directive.id}/seen`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not mark directive as seen");
      setDirective(current => current ? { ...current, completed: true } : current);
    } finally {
      setMarkingSeen(false);
    }
  };

  if (profile === "loading") return null;

  // ── Not initiated ──────────────────────────────────────────────────────────
  if (profile === "none") return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      onClick={() => nav("/growth")} style={{ cursor: "pointer" }}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <Card className="border-primary/20 overflow-hidden relative">
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-xl shrink-0 bg-primary/5 border border-primary/20 flex items-center justify-center" style={{ width: 52, height: 52 }}>
              <Lock size={22} className="text-primary/50" />
            </div>
            <div className="flex-1">
              <div className="text-primary/60 font-black text-[10px] tracking-[0.35em] uppercase mb-1">
                {dx("empireIdentity")}
              </div>
              <div className="font-black text-foreground text-[15px] mb-0.5">
                {dx("initiationAwaits")}
              </div>
              <div className="text-primary/50 text-[11px] font-mono">
                {dx("initiationLocked")}
              </div>
            </div>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 font-black text-xs tracking-wider shrink-0"
            >
              {dx("initiate")}
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // ── Has archon profile ─────────────────────────────────────────────────────
  const archInfo = ARCHETYPES_DASH[profile.archetype] ?? ARCHETYPES_DASH["THE SEEKER"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      onClick={() => nav("/growth")} style={{ cursor: "pointer" }}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <Card className="overflow-hidden relative" style={{ borderColor: `${archInfo.color}40` }}>
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 15% 50%, ${archInfo.color}12 0%, transparent 60%)` }}
        />
        <CardContent style={{ padding: "22px 24px", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>

            {/* Archetype symbol */}
            <motion.div
              animate={{ boxShadow: [`0 0 8px ${archInfo.color}40`, `0 0 24px ${archInfo.color}80`, `0 0 8px ${archInfo.color}40`] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: `linear-gradient(135deg, ${archInfo.color}30, ${archInfo.color}10)`,
                border: `1px solid ${archInfo.color}60`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26,
              }}
            >
              {archInfo.symbol}
            </motion.div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="font-black text-[10px] tracking-[0.35em] uppercase mb-0.5" style={{ color: `${archInfo.color}90` }}>
                {dx("archonIdentity")}
              </div>
              <div className="font-black text-foreground text-base mb-0.5">{dx(archInfo.labelKey)}</div>
              <div className="font-mono text-[11px] tracking-wider" style={{ color: `${archInfo.color}80` }}>
                {profile.archonCode}
              </div>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <div className="text-3xl font-black leading-none" style={{ color: archInfo.color }}>
                {profile.overallScore.toLocaleString(dashboardLocale(lang))}
                <span className="text-xs text-muted-foreground font-normal">/{(100).toLocaleString(dashboardLocale(lang))}</span>
              </div>
              <div className="text-[10px] text-muted-foreground tracking-wider uppercase">{dx("score")}</div>
            </div>
          </div>

          {/* Today's Morocco-time Archon directive */}
          <div className="mt-4 rounded-xl border border-primary/30 bg-background/90 px-4 py-4 shadow-[inset_0_0_24px_hsl(var(--primary)/0.05)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                <ScrollText size={18} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">
                  {dx("directiveTitle")}
                </div>
                <div className="mt-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {dx("dailyCommand")}
                </div>
                {directiveLoading ? (
                  <div className="mt-3 h-10 animate-pulse rounded-lg bg-primary/10" />
                ) : directive ? (
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-foreground" dir={lang === "ar" ? "rtl" : "ltr"}>
                    {directive.directive}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">{dx("directiveUnavailable")}</p>
                )}
              </div>
              {directive && (
                <Button
                  type="button"
                  size="sm"
                  variant={directive.completed ? "outline" : "default"}
                  disabled={directive.completed || markingSeen}
                  onClick={markDirectiveSeen}
                  className="shrink-0 font-black"
                  data-testid="button-archon-directive-seen"
                >
                  <CheckCircle className="me-1.5 h-4 w-4" />
                   {directive.completed ? dx("seenComplete") : markingSeen ? dx("processing") : dx("seen")}
                </Button>
              )}
            </div>
          </div>

          {/* Four Pillars */}
          <div className="mt-4">
            <div className="text-muted-foreground text-[10px] font-black tracking-[0.3em] uppercase mb-2.5">
              {dx("fourPillars")}
            </div>
            <div className="flex flex-col gap-2.5">
              {computeFourPillarsDash(profile.dimensions, profile.overallScore).map(p => (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{p.symbol}</span>
                      <span className="font-black text-[11px] tracking-[0.15em]" style={{ color: p.color }}>{p.latin}</span>
                    </div>
                    <span className="font-black text-xs" style={{ color: p.color }}>{p.score.toLocaleString(dashboardLocale(lang))}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.score}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${p.color}80, ${p.color})` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Archetype declaration */}
          {profile.archetypeDeclaration && (
            <div className="mt-3 px-4 py-2.5 rounded-xl italic text-sm text-muted-foreground leading-relaxed bg-muted/20 border-s-2"
              style={{ borderInlineStartColor: `${archInfo.color}60` }}>
              "{profile.archetypeDeclaration}"
            </div>
          )}

          {/* CTA */}
          <div className="mt-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs tracking-wider text-primary-foreground cursor-pointer border-0"
              style={{ background: `linear-gradient(135deg, ${archInfo.color}, ${archInfo.color}cc)`, color: "#000" }}
            >
              {dx("viewGrowth")}
              <ArrowRight size={13} />
            </motion.button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// نظام المستويات — Empire Levels (mirrors the server's /api/levels table)
function getRank(xp: number): { labelKey: DashboardCopyKey; min: number; next: number; color: string; icon: string; multiplier: number } {
  if (xp <= 100)  return { labelKey: "rank1", min: 0,    next: 101,  color: "#8bc34a", icon: "🌱", multiplier: 1.0 };
  if (xp <= 500)  return { labelKey: "rank2", min: 101,  next: 501,  color: "#aaa9ad", icon: "⚔️", multiplier: 1.25 };
  if (xp <= 2000) return { labelKey: "rank3", min: 501,  next: 2001, color: "#ffd700", icon: "🏆", multiplier: 1.5 };
  return { labelKey: "rank4", min: 2001, next: xp, color: "#00d4ff", icon: "👑", multiplier: 2.0 };
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, logout, loading, refreshUser } = useAuth();
  const { lang } = useLang();
  const tx = (key: keyof typeof import("@/i18n/task39").task39, vars: Record<string, string | number> = {}) =>
    task39Text(lang, key, vars).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
  const dx = (key: DashboardCopyKey, vars?: Record<string, string | number>) => dashboardText(lang, key, vars);
  const number = (value: number) => value.toLocaleString(dashboardLocale(lang));
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [dailyMsg, setDailyMsg] = useState("");
  const [recentMatches, setRecentMatches] = useState<
    { game: string; win: boolean; coins: number; xp: number; time: string }[]
  >([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gdna_recent_matches") ?? "[]");
      setRecentMatches(stored.slice(0, 8));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (!user || loading) return;
    const scrollToSettings = () => {
      if (window.location.hash === "#account-settings") {
        document.getElementById("account-settings")?.scrollIntoView({ block: "start" });
      }
    };
    const frame = requestAnimationFrame(scrollToSettings);
    window.addEventListener("hashchange", scrollToSettings);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", scrollToSettings);
    };
  }, [user?.id, loading]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center" lang={lang === "de" ? "de-DE" : lang}>
        <div className="text-primary animate-pulse text-xl uppercase tracking-widest">{tx("dashboardLoading")}</div>
      </div>
    );
  }
  if (!user) return null;

  const rank = getRank(user.xp);
  const xpProgress = rank.next > rank.min
    ? Math.min(((user.xp - rank.min) / (rank.next - rank.min)) * 100, 100)
    : 100; // max level
  const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch {
      window.alert(tx("logoutFailed"));
    }
  };

  const handleDailyReward = async () => {
    setClaimingDaily(true);
    setDailyMsg("");
    try {
      const res = await fetch("/api/rewards/daily", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setDailyMsg(
          res.status === 400
            ? tx("alreadyClaimed")
            : res.status === 401
              ? dx("authenticationRequired")
              : tx("claimFailed"),
        );
      } else {
        setDailyMsg(tx("coinsClaimed", { n: number(data.coinsEarned) }));
        await refreshUser();
      }
    } catch {
      setDailyMsg(tx("claimFailed"));
    } finally {
      setClaimingDaily(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 max-w-6xl mx-auto space-y-8" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang === "de" ? "de-DE" : lang}>
      <DailyArchonDirectiveCard />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wider">
            {tx("welcomeUser")} <span className="text-primary neon-text-glow" data-testid="text-username">{user.username}</span>
          </h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" />
            {tx("statusOnline")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/wallet">
            <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
              <Wallet className="w-4 h-4 me-2" />
              {dx("wallet")}
            </Button>
          </Link>
          <Button variant="outline" onClick={handleLogout} className="border-destructive/50 text-destructive hover:bg-destructive/10" data-testid="button-logout">
            <LogOut className="w-4 h-4 me-2" />
            {dx("logout")}
          </Button>
        </div>
      </motion.div>

      {/* Daily Reward Banner */}
      {user.canClaimDaily && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-green-400 shrink-0" />
            <div>
              <p className="font-bold text-green-400 uppercase tracking-wider">{tx("dailyAvailable")}</p>
              <p className="text-sm text-muted-foreground">{dx("dailyRewardDescription", { amount: number(100) })}</p>
            </div>
          </div>
          <Button
            onClick={handleDailyReward}
            disabled={claimingDaily}
            className="bg-green-500 hover:bg-green-400 text-black font-bold uppercase tracking-wider shrink-0"
            data-testid="button-daily-reward"
          >
            <Gift className="w-4 h-4 me-2" />
            {claimingDaily ? tx("claiming") : dx("claimCoins", { amount: number(100) })}
          </Button>
        </motion.div>
      )}

      {!user.canClaimDaily && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card/30 border border-primary/10 rounded-xl p-3 flex items-center gap-3 text-sm text-muted-foreground"
        >
          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
          {tx("dailyClaimed")}
        </motion.div>
      )}

      {dailyMsg && (
        <p className={`text-center font-bold text-sm ${dailyMsg.includes("+") ? "text-green-400" : "text-orange-400"}`}>
          {dailyMsg}
        </p>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="md:col-span-2">
          <Card className="bg-card/50 border-primary/30 h-full relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-8 flex flex-col justify-center items-center text-center h-full relative z-10">
              <Coins className="w-16 h-16 text-primary mb-6 drop-shadow-[0_0_15px_rgba(0,212,255,0.8)]" />
              <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">{tx("availableBalance")}</p>
              <h2 className="text-5xl md:text-7xl font-black text-foreground neon-text-glow mb-8 tracking-tighter" data-testid="text-balance">
                {number(user.balance)} <span className="text-2xl text-primary font-bold">{dx("coins")}</span>
              </h2>
              <Link href="/games">
                <Button size="lg" className="h-14 px-8 text-md font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground neon-glow transition-all duration-300">
                  <Swords className="w-5 h-5 me-2" />
                  {tx("playEarn")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Side cards */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="space-y-6">
          <Card className="bg-card/50 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-primary/20 text-primary">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{tx("rank")}</p>
                  <p className="text-xl font-bold" style={{ color: rank.color }} data-testid="text-rank">{rank.icon} {dx(rank.labelKey)}</p>
                  <p className="text-[11px] text-muted-foreground">{dx("earningsMultiplier", { value: number(rank.multiplier) })}</p>
                </div>
              </div>
              <div className="w-full bg-background rounded-full h-2 mt-4 border border-primary/20">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${xpProgress}%`, backgroundColor: rank.color, boxShadow: `0 0 10px ${rank.color}` }}
                />
              </div>
              <p className="text-xs text-end mt-2 text-muted-foreground">{number(user.xp)} / {number(rank.next)} XP</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="text-sm uppercase tracking-widest text-muted-foreground">{tx("stats")}</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{tx("gamesPlayed")}</span>
                   <span className="font-bold" data-testid="text-games-played">{number(user.gamesPlayed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{dx("wins")}</span>
                  <span className="font-bold text-primary" data-testid="text-wins">{number(user.wins)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{tx("winRate")}</span>
                  <span className="font-bold text-green-400">{number(winRate)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Imperial Council Reports (admins only) ───────────────────── */}
      {user.isAdmin && <CouncilReportsWidget />}

      {/* ── Today's Archon directive acknowledgements (admins only) ──── */}
      {user.isAdmin && <ArchonAcknowledgementsWidget />}

      {/* ── Archon Empire Identity ────────────────────────────────────── */}
      <ArchonIdentityWidget />

      {/* ── GDN-SMART Widget ─────────────────────────────────────────── */}
      <SmartWidget />

      {/* ── Recent Matches ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="bg-card/50 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="text-sm uppercase tracking-widest text-muted-foreground">{tx("recentMatches")}</h3>
            </div>
            {recentMatches.length === 0 ? (
              <div className="text-center py-8">
                <Swords className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">{tx("noMatches")} <Link href="/games" className="text-primary hover:underline">{tx("playFirst")}</Link></p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentMatches.map((m, i) => {
                  const ago = (() => {
                    const diff = Date.now() - new Date(m.time).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return tx("justNow");
                     if (mins < 60) return tx("minutesAgo", { n: number(mins) });
                    const hrs = Math.floor(mins / 60);
                     if (hrs < 24) return tx("hoursAgo", { n: number(hrs) });
                     return tx("daysAgo", { n: number(Math.floor(hrs / 24)) });
                  })();
                  return (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                      m.win ? "border-primary/20 bg-primary/5" : "border-white/5 bg-white/2"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${m.win ? "bg-primary" : "bg-destructive/60"}`} />
                        <div>
                          <p className="text-sm font-semibold">{m.game}</p>
                          <p className="text-xs text-muted-foreground">{ago}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-end">
                        <div>
                           <p className="text-xs text-primary font-bold">+{number(m.coins)} <span className="text-muted-foreground font-normal">{dx("coinUnit")}</span></p>
                           <p className="text-xs text-purple-400">+{number(m.xp)} XP</p>
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${m.win ? "text-primary" : "text-destructive/70"}`}>
                          {m.win ? tx("win") : tx("loss")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Settings — change password directly (no email codes) */}
      <div id="account-settings" className="scroll-mt-32" />
      <RecoveryPhoneSettings key={user.id} />
      <RecoveryCodeSettings key={`code-${user.id}`} showPageLink />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-card/50 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg uppercase tracking-wider flex items-center gap-2">
              🔐 {tx("changePassword")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function ChangePasswordForm() {
  const { changePassword } = useAuth();
  const { lang } = useLang();
  const tx = (key: keyof typeof import("@/i18n/task39").task39) => task39Text(lang, key);
  const dx = (key: DashboardCopyKey) => dashboardText(lang, key);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    if (!currentPassword || !newPassword) {
      setErr(dx("passwordsRequired"));
      return;
    }
    if (newPassword.length < 6) {
      setErr(dx("passwordTooShort"));
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setMsg(dx("passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
    } catch (e: unknown) {
      const apiMessage = e instanceof Error ? e.message : "";
      if (apiMessage.includes("6 أحرف") || apiMessage.includes("6 caractères")) {
        setErr(dx("passwordTooShort"));
      } else if (apiMessage.includes("غير صحيحة") || apiMessage.includes("incorrect")) {
        setErr(dx("currentPasswordIncorrect"));
      } else if (apiMessage.includes("الدخول") || apiMessage.includes("Connectez-vous")) {
        setErr(dx("authenticationRequired"));
      } else {
        setErr(dx("passwordChangeFailed"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4 max-w-md" dir={lang === "ar" ? "rtl" : "ltr"}>
      {err && <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">{err}</div>}
      {msg && <div className="p-3 rounded-md bg-primary/10 border border-primary/30 text-primary text-sm">{msg}</div>}
      <input
        type="password"
        autoComplete="current-password"
        placeholder={tx("currentPassword")}
        aria-label={tx("currentPassword")}
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        className="w-full h-11 px-3 rounded-md bg-background/50 border border-primary/30 text-sm focus:outline-none focus:border-primary"
        required
        data-testid="input-current-password"
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder={tx("newPassword")}
        aria-label={tx("newPassword")}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full h-11 px-3 rounded-md bg-background/50 border border-primary/30 text-sm focus:outline-none focus:border-primary"
        required
        minLength={6}
        data-testid="input-new-password"
      />
      <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider" data-testid="button-change-password">
        {busy ? tx("loading") : `✅ ${tx("changePassword")}`}
      </Button>
    </form>
  );
}

function ArchonAcknowledgementsWidget() {
  const { lang } = useLang();
  const dx = (key: DashboardCopyKey, vars?: Record<string, string | number>) => dashboardText(lang, key, vars);
  const number = (value: number) => value.toLocaleString(dashboardLocale(lang));
  const [data, setData] = useState<DirectiveAcknowledgements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/archon/daily-directive/acknowledgements", {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error("Acknowledgements unavailable");
        return response.json() as Promise<DirectiveAcknowledgements>;
      })
      .then(setData)
      .catch(requestError => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const acknowledged = data?.citizens.filter(citizen => citizen.acknowledged) ?? [];
  const pending = data?.citizens.filter(citizen => !citizen.acknowledged) ?? [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="archon-acknowledgements-title"
      data-testid="archon-acknowledgements"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <Card className="overflow-hidden border-primary/30 bg-card/50">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="archon-acknowledgements-title" className="font-black text-foreground">
                    {dx("acknowledgementsTitle")}
                  </h2>
                  <span className="rounded border border-primary/30 px-2 py-0.5 text-[10px] font-bold tracking-widest text-primary">
                    {dx("adminOnly")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dx("todayCasablanca", {
                    date: data?.dateKey
                      ? new Date(`${data.dateKey}T12:00:00`).toLocaleDateString(dashboardLocale(lang), {
                          year: "numeric", month: "long", day: "numeric",
                        })
                      : "—",
                  })}
                </p>
              </div>
            </div>

            {data && (
              <div className="flex items-center gap-4 rounded-lg border border-primary/20 bg-background/50 px-4 py-3">
                <Users className="size-5 text-primary" />
                <div>
                  <p className="text-2xl font-black leading-none text-primary" data-testid="text-archon-ack-rate">
                    {number(data.acknowledgementRate)}%
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dx("citizensCount", {
                      done: number(data.acknowledgedCount),
                      total: number(data.totalCitizens),
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="mt-5 space-y-3">
              <div className="h-2 animate-pulse rounded-full bg-primary/10" />
              <div className="h-24 animate-pulse rounded-lg bg-primary/5" />
            </div>
          ) : error || !data ? (
            <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {dx("ackLoadError")}
            </p>
          ) : (
            <>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted/40" aria-label={dx("acknowledgedAria", { rate: number(data.acknowledgementRate) })}>
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${data.acknowledgementRate}%` }}
                />
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-black text-primary">
                    <CheckCircle className="size-4" />
                    {dx("acknowledged", { count: number(acknowledged.length) })}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {acknowledged.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{dx("noAcknowledgements")}</p>
                    ) : acknowledged.map(citizen => (
                      <span key={citizen.id} className="rounded-full border border-primary/30 bg-background/60 px-3 py-1 text-xs font-semibold">
                        {citizen.username}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background/40 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-black text-muted-foreground">
                    <Clock className="size-4" />
                    {dx("notAcknowledged", { count: number(pending.length) })}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pending.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{dx("allAcknowledged")}</p>
                    ) : pending.map(citizen => (
                      <span key={citizen.id} className="rounded-full border border-border bg-muted/20 px-3 py-1 text-xs font-semibold text-muted-foreground">
                        {citizen.username}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.section>
  );
}

type DirectiveAcknowledgements = {
  dateKey: string;
  timeZone: string;
  acknowledgedCount: number;
  totalCitizens: number;
  acknowledgementRate: number;
  citizens: DirectiveAcknowledgementCitizen[];
};
