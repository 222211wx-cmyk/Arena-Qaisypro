import { useState, useEffect, useRef, useCallback } from "react";
import SmartDomainWidget from "@/components/SmartDomainWidget";
import RoyalPalace from "@/components/RoyalPalace";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";

const BASE = () => (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────────
interface ArchonDimensions {
  volontas: number; resilentia: number; intellectus: number;
  disciplina: number; societas: number; abundantia: number; auctoritas: number;
}
interface ArchonProfile {
  archonCode: string; archetype: string; dimensions: ArchonDimensions;
  overallScore: number; aiProfile: Record<string, string>;
  session?: { createdAt: string };
}

// ── The 7 Archon Dimensions ────────────────────────────────────────────────────
const DIMENSIONS = [
  { key: "volontas", latin: "VOLONTAS", labelKey: "growth_dimension_volontas", color: "#C9A84C", glyph: "⚔" },
  { key: "resilentia", latin: "RESILENTIA", labelKey: "growth_dimension_resilentia", color: "#E8C97A", glyph: "🛡" },
  { key: "intellectus", latin: "INTELLECTUS", labelKey: "growth_dimension_intellectus", color: "#A8E6CF", glyph: "👁" },
  { key: "disciplina", latin: "DISCIPLINA", labelKey: "growth_dimension_disciplina", color: "#DDA0DD", glyph: "⚙" },
  { key: "societas", latin: "SOCIETAS", labelKey: "growth_dimension_societas", color: "#87CEEB", glyph: "◈" },
  { key: "abundantia", latin: "ABUNDANTIA", labelKey: "growth_dimension_abundantia", color: "#98FB98", glyph: "∞" },
  { key: "auctoritas", latin: "AUCTORITAS", labelKey: "growth_dimension_auctoritas", color: "#FFB6C1", glyph: "♔" },
] as const;

// ── The 7 Initiation Questions ─────────────────────────────────────────────────
const QUESTIONS = [
  {
    dim: "VOLONTAS", labelKey: "growth_dimension_volontas", glyph: "⚔",
    q: "growth_q1", choices: { A: "growth_q1_a", B: "growth_q1_b", C: "growth_q1_c", D: "growth_q1_d" },
  },
  {
    dim: "RESILENTIA", labelKey: "growth_dimension_resilentia", glyph: "🛡",
    q: "growth_q2", choices: { A: "growth_q2_a", B: "growth_q2_b", C: "growth_q2_c", D: "growth_q2_d" },
  },
  {
    dim: "INTELLECTUS", labelKey: "growth_dimension_intellectus", glyph: "👁",
    q: "growth_q3", choices: { A: "growth_q3_a", B: "growth_q3_b", C: "growth_q3_c", D: "growth_q3_d" },
  },
  {
    dim: "DISCIPLINA", labelKey: "growth_dimension_disciplina", glyph: "⚙",
    q: "growth_q4", choices: { A: "growth_q4_a", B: "growth_q4_b", C: "growth_q4_c", D: "growth_q4_d" },
  },
  {
    dim: "SOCIETAS", labelKey: "growth_dimension_societas", glyph: "◈",
    q: "growth_q5", choices: { A: "growth_q5_a", B: "growth_q5_b", C: "growth_q5_c", D: "growth_q5_d" },
  },
  {
    dim: "ABUNDANTIA", labelKey: "growth_dimension_abundantia", glyph: "∞",
    q: "growth_q6", choices: { A: "growth_q6_a", B: "growth_q6_b", C: "growth_q6_c", D: "growth_q6_d" },
  },
  {
    dim: "AUCTORITAS", labelKey: "growth_dimension_auctoritas", glyph: "♔",
    q: "growth_q7",
    choices: null, // free text
  },
];

// ── Archon Archetypes ──────────────────────────────────────────────────────────
const ARCHETYPES: Record<string, { color: string; symbol: string; labels: Record<"en" | "fr" | "ar" | "es" | "de", string> }> = {
  "THE SOVEREIGN": { color: "#C9A84C", symbol: "♔", labels: { en: "THE SOVEREIGN", fr: "LE SOUVERAIN", ar: "السيد المطلق", es: "EL SOBERANO", de: "DER SOUVERÄN" } },
  "THE CONQUEROR": { color: "#FF6B35", symbol: "⚔", labels: { en: "THE CONQUEROR", fr: "LE CONQUÉRANT", ar: "الفاتح", es: "EL CONQUISTADOR", de: "DER EROBERER" } },
  "THE VISIONARY": { color: "#A8E6CF", symbol: "👁", labels: { en: "THE VISIONARY", fr: "LE VISIONNAIRE", ar: "الرائي", es: "EL VISIONARIO", de: "DER VISIONÄR" } },
  "THE ARCHITECT": { color: "#DDA0DD", symbol: "⚙", labels: { en: "THE ARCHITECT", fr: "L'ARCHITECTE", ar: "المعماري", es: "EL ARQUITECTO", de: "DER ARCHITEKT" } },
  "THE CATALYST":  { color: "#87CEEB", symbol: "◈", labels: { en: "THE CATALYST", fr: "LE CATALYSEUR", ar: "المحرك", es: "EL CATALIZADOR", de: "DER KATALYSATOR" } },
  "THE SENTINEL":  { color: "#98FB98", symbol: "🛡", labels: { en: "THE SENTINEL", fr: "LA SENTINELLE", ar: "الحارس", es: "EL CENTINELA", de: "DER WÄCHTER" } },
  "THE SEEKER":    { color: "#E8C97A", symbol: "◉", labels: { en: "THE SEEKER", fr: "LE CHERCHEUR", ar: "الباحث", es: "EL BUSCADOR", de: "DER SUCHENDE" } },
};

// ── Cipher Animation Characters ────────────────────────────────────────────────
const CIPHER_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789♔⚔◈∞⚙▲▼◆◇█▓░";

const BOOT_KEYS = [
  "growth_boot_initializing",
  "growth_boot_scanning",
  "growth_boot_loading",
  "growth_boot_connected",
  "growth_boot_encryption",
  "growth_boot_verified",
  "growth_boot_ready",
] as const;
type BootKey = typeof BOOT_KEYS[number];

const ENCODING_KEYS = [
  "growth_encoding_transmitting",
  "growth_encoding_volontas",
  "growth_encoding_resilentia",
  "growth_encoding_intellectus",
  "growth_encoding_disciplina",
  "growth_encoding_societas",
  "growth_encoding_abundantia",
  "growth_encoding_auctoritas",
  "growth_encoding_classifying",
  "growth_encoding_identity",
] as const;
type EncodingKey = typeof ENCODING_KEYS[number];

type AssessmentError =
  | { kind: "translation"; key: "growth_error_grid_disrupted" }
  | { kind: "external"; message: string };

function useCipherText(target: string, active: boolean, speed = 40) {
  const [display, setDisplay] = useState("");
  const frame = useRef(0);
  useEffect(() => {
    if (!active || !target) return;
    frame.current = 0;
    const id = setInterval(() => {
      frame.current++;
      if (frame.current >= target.length * 3) { setDisplay(target); clearInterval(id); return; }
      setDisplay(
        target.split("").map((ch, i) =>
          i < Math.floor(frame.current / 3)
            ? ch
            : /[A-Z0-9]/.test(ch)
              ? CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
              : ch
        ).join("")
      );
    }, speed);
    return () => clearInterval(id);
  }, [target, active]);
  return display;
}

// ── Breathing engine ───────────────────────────────────────────────────────────
const BREATH_PHASES = ["inhale", "hold", "exhale", "rest"] as const;
const BREATH_TIMING = { inhale: 4, hold: 4, exhale: 6, rest: 2 };

// ══════════════════════════════════════════════════════════════════════════════
export default function Growth() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const isRTL = lang === "ar";
  const locale = lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : lang === "de" ? "de-DE" : "en-GB";

  // ── Phases: "boot" | "initiation" | "encoding" | "profile" ──────────────
  const [phase, setPhase] = useState<"boot" | "initiation" | "encoding" | "profile">("boot");
  const [bootProgress, setBootProgress] = useState(0);
  const bootDone = bootProgress >= BOOT_KEYS.length;

  // ── Initiation state ─────────────────────────────────────────────────────
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");

  // ── Encoding state ───────────────────────────────────────────────────────
  const [encodingProgress, setEncodingProgress] = useState(0);
  const encodingDone = encodingProgress >= ENCODING_KEYS.length;
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<AssessmentError | null>(null);
  const assessmentAbortRef = useRef<AbortController | null>(null);

  // ── Profile state ────────────────────────────────────────────────────────
  const [archonProfile, setArchonProfile] = useState<ArchonProfile | null>(null);
  const [existingProfile, setExistingProfile] = useState<ArchonProfile | null>(null);
  const [missionLoading, setMissionLoading] = useState(false);
  const [missionResult, setMissionResult] = useState<Record<string, string> | null>(null);
  const [missionDim, setMissionDim] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "oracle" | "calibration" | "pillars" | "ameeq" | "missions">("profile");

  // ── Sovereign Missions state ──────────────────────────────────
  interface CitizenMission {
    id: number;
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    category: string;
    xp_reward: number;
    completed: boolean;
    completed_at: string | null;
    mission_date: string;
  }
  const [missions, setMissions] = useState<CitizenMission[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionCompleting, setMissionCompleting] = useState<number | null>(null);
  const [breathPhase, setBreathPhase] = useState<typeof BREATH_PHASES[number]>("inhale");
  const [breathing, setBreathing] = useState(false);
  const [breathCount, setBreathCount] = useState(0);
  const breathTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Pillar streak state ───────────────────────────────────────────────────
  const [pillarStreaks, setPillarStreaks] = useState<Record<string, { streak: number; completedToday: boolean; totalDays: number }>>({});
  const [pillarCompleting, setPillarCompleting] = useState<string | null>(null);
  const [pillarJustCompleted, setPillarJustCompleted] = useState<string | null>(null);

  // ── Load today's missions ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user || phase !== "profile") return;
    setMissionsLoading(true);
    fetch(`${BASE()}/api/missions/today`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.missions) setMissions(d.missions); })
      .catch(() => {})
      .finally(() => setMissionsLoading(false));
  }, [user, phase]);

  // ── Complete a sovereign mission ──────────────────────────────────────────
  const completeMission = useCallback(async (missionId: number) => {
    if (missionCompleting) return;
    setMissionCompleting(missionId);
    try {
      const res = await fetch(`${BASE()}/api/missions/${missionId}/complete`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMissions(prev => prev.map(m =>
          m.id === missionId ? { ...m, completed: true, completed_at: new Date().toISOString() } : m
        ));
      }
    } catch { /* ignore */ } finally {
      setMissionCompleting(null);
    }
  }, [missionCompleting]);

  // ── Load pillar streaks ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetch(`${BASE()}/api/archon/pillar/streaks`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.streaks) setPillarStreaks(d.streaks); })
      .catch(() => {});
  }, [user]);

  // ── Complete pillar challenge ──────────────────────────────────────────────
  const completePillar = useCallback(async (pillarId: string) => {
    if (pillarCompleting || pillarStreaks[pillarId]?.completedToday) return;
    setPillarCompleting(pillarId);
    try {
      const res = await fetch(`${BASE()}/api/archon/pillar/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pillar: pillarId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPillarStreaks(prev => ({
          ...prev,
          [pillarId]: { streak: data.streak, completedToday: true, totalDays: (prev[pillarId]?.totalDays ?? 0) + 1 },
        }));
        setPillarJustCompleted(pillarId);
        setTimeout(() => setPillarJustCompleted(null), 3000);
      }
    } catch { /* ignore */ } finally {
      setPillarCompleting(null);
    }
  }, [pillarCompleting, pillarStreaks]);

  // ── Load existing profile ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetch(`${BASE()}/api/archon/profile`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.session) {
          const s = d.session;
          setExistingProfile({
            archonCode: s.archonCode,
            archetype: s.archetype ?? "THE SEEKER",
            dimensions: {
              volontas: s.volontas, resilentia: s.resilentia, intellectus: s.intellectus,
              disciplina: s.disciplina, societas: s.societas, abundantia: s.abundantia, auctoritas: s.auctoritas,
            },
            overallScore: Math.round([s.volontas, s.resilentia, s.intellectus, s.disciplina, s.societas, s.abundantia, s.auctoritas].reduce((a: number, b: number) => a + b, 0) / 7),
            aiProfile: (s.aiProfile as Record<string, string>) ?? {},
            session: s,
          });
          setPhase("profile");
        }
      })
      .catch(() => {});
  }, [user]);

  // ── Boot sequence ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "boot" || !user) return;
    let progress = bootProgress;
    if (progress >= BOOT_KEYS.length) return;
    const id = setInterval(() => {
      progress = Math.min(progress + 1, BOOT_KEYS.length);
      setBootProgress(progress);
      if (progress >= BOOT_KEYS.length) clearInterval(id);
    }, 380);
    return () => clearInterval(id);
  }, [phase, user]);

  // ── Encoding sequence ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "encoding" || apiError) return;
    let progress = encodingProgress;
    if (progress >= ENCODING_KEYS.length) return;
    const id = setInterval(() => {
      progress = Math.min(progress + 1, ENCODING_KEYS.length);
      setEncodingProgress(progress);
      if (progress >= ENCODING_KEYS.length) clearInterval(id);
    }, 320);
    return () => clearInterval(id);
  }, [phase, apiError]);

  // Cancel an in-flight assessment when leaving encoding or unmounting.
  useEffect(() => {
    if (phase !== "encoding") assessmentAbortRef.current?.abort();
  }, [phase]);
  useEffect(() => () => assessmentAbortRef.current?.abort(), []);

  // Preserve the post-generation reveal delay without leaving stale timers.
  useEffect(() => {
    if (phase !== "encoding" || !archonProfile || apiError) return;
    const id = setTimeout(() => setPhase("profile"), 3200);
    return () => clearTimeout(id);
  }, [phase, archonProfile, apiError]);

  // ── Breathing engine ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!breathing) { if (breathTimer.current) clearInterval(breathTimer.current); return; }
    let ph = 0;
    const cycle = () => {
      const cur = BREATH_PHASES[ph % 4];
      setBreathPhase(cur);
      if (cur === "inhale") setBreathCount(c => c + 1);
      ph++;
    };
    cycle();
    breathTimer.current = setInterval(cycle, 4000);
    return () => { if (breathTimer.current) clearInterval(breathTimer.current); };
  }, [breathing]);

  // ── Submit initiation ─────────────────────────────────────────────────────
  async function submitInitiation() {
    const allAnswers = { ...answers, Q7: freeText || t("growth_q7_default") };
    assessmentAbortRef.current?.abort();
    const controller = new AbortController();
    assessmentAbortRef.current = controller;
    setEncodingProgress(0);
    setPhase("encoding");
    setApiLoading(true);
    setApiError(null);

    try {
      const res = await fetch(`${BASE()}/api/archon/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          answers: allAnswers, lang,
          userStats: user ? { xp: user.xp, wins: user.wins, gamesPlayed: user.gamesPlayed, balance: user.balance, username: user.username } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const serverMessage = typeof data.error === "string" && data.error.trim() ? data.error : null;
        setApiError(serverMessage
          ? { kind: "external", message: serverMessage }
          : { kind: "translation", key: "growth_error_grid_disrupted" });
        return;
      }
      setArchonProfile({
        archonCode: data.archonCode,
        archetype: data.archetype,
        dimensions: data.dimensions,
        overallScore: data.overallScore,
        aiProfile: data.aiProfile ?? {},
      });
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setApiError({ kind: "translation", key: "growth_error_grid_disrupted" });
      }
    } finally {
      if (assessmentAbortRef.current === controller) {
        assessmentAbortRef.current = null;
        setApiLoading(false);
      }
    }
  }

  // ── Generate daily mission ────────────────────────────────────────────────
  async function generateMission(dimKey: string) {
    const profile = archonProfile ?? existingProfile;
    if (!profile) return;
    setMissionLoading(true);
    setMissionDim(dimKey);
    setMissionResult(null);
    try {
      const res = await fetch(`${BASE()}/api/archon/mission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dimension: dimKey.toUpperCase(), archetype: profile.archetype, lang }),
      });
      const data = await res.json();
      setMissionResult(data);
    } catch {
      setMissionResult({ directive: t("growth_mission_fallback"), duration: t("growth_duration_15m"), intensity: t("growth_intensity_high") });
    } finally {
      setMissionLoading(false);
    }
  }

  const activeProfile = archonProfile ?? existingProfile;

  // ──────────────────────────────────────────────────────────────────────────
  // NOT LOGGED IN
  // ──────────────────────────────────────────────────────────────────────────
  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden" lang={lang === "de" ? "de-DE" : lang}>
      <div className="absolute inset-0">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="absolute w-px bg-primary/10 animate-pulse"
            style={{ left: `${Math.random() * 100}%`, top: 0, bottom: 0, animationDelay: `${Math.random() * 3}s` }} />
        ))}
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 text-center space-y-8 p-12 border border-primary/30 bg-background/90">
        <div className="text-primary font-mono text-xs tracking-[0.4em] uppercase">ARCHON SYSTEM v4.2</div>
        <div className="text-6xl font-black text-destructive font-mono">{t("growth_access_denied")}</div>
        <div className="text-primary/60 font-mono text-sm tracking-widest">
          {t("growth_auth_required")}<br/>{t("growth_auth_subtitle")}
        </div>
        <div className="border-t border-primary/20 pt-6 space-y-3">
          <p className="text-primary/40 font-mono text-xs">{t("growth_clearance_initiates")}</p>
          <Link href="/login">
            <button className="px-8 py-3 border border-primary text-primary font-mono font-black text-sm tracking-[0.3em] uppercase hover:bg-primary hover:text-primary-foreground transition-all">
              ⚡ {t("growth_authenticate")}
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // BOOT SEQUENCE
  // ──────────────────────────────────────────────────────────────────────────
  if (phase === "boot") return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8" dir={isRTL ? "rtl" : "ltr"} lang={lang === "de" ? "de-DE" : lang}>
      <div className="w-full max-w-2xl font-mono">
        <div className="border border-primary/40 p-8 space-y-2">
          <div className="text-primary/60 text-xs tracking-widest mb-6">
            ╔══════════════════════════════════════════╗<br/>
            ║         {t("growth_intelligence_core")}         ║<br/>
            ║       GDNA EMPIRE — {t("growth_classified")}           ║<br/>
            ╚══════════════════════════════════════════╝
          </div>
          {(BOOT_KEYS.slice(0, bootProgress) as readonly BootKey[]).map((key, i) => {
            const line = t(key);
            return (
              <motion.div key={key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                className={`text-sm tracking-wider ${line.startsWith(">>>") ? "text-primary font-black text-base" : "text-green-400/80"}`}>
                {line.startsWith(">>>") ? line : `> ${line}`}
              </motion.div>
            );
          })}
          {bootProgress < BOOT_KEYS.length && (
            <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }}
              className="text-green-400 text-sm">█</motion.span>
          )}
          {bootDone && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="pt-6 space-y-4">
              <div className="border-t border-primary/30 pt-4">
                <p className="text-primary/60 text-xs tracking-widest mb-4">{t("growth_select_op")}</p>
                <div className="space-y-2">
                  <button
                    onClick={() => { setPhase("initiation"); setQIndex(0); setAnswers({}); setFreeText(""); }}
                    className="w-full text-start px-4 py-3 border border-primary/40 text-primary font-mono text-sm tracking-wider hover:bg-primary/10 hover:border-primary transition-all"
                  >
                    {t("growth_initiate_new")}
                    <span className="text-primary/40 ml-2 text-xs">{t("growth_initiate_sub")}</span>
                  </button>
                  {existingProfile && (
                    <button
                      onClick={() => setPhase("profile")}
                      className="w-full text-start px-4 py-3 border border-primary/20 text-primary/60 font-mono text-sm tracking-wider hover:bg-primary/5 hover:border-primary/40 transition-all"
                    >
                    {t("growth_access_existing")}
                      <span className="text-primary/40 ml-2 text-xs">— {existingProfile.archetype} · {existingProfile.archonCode}</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // INITIATION — 7 QUESTIONS
  // ──────────────────────────────────────────────────────────────────────────
  if (phase === "initiation") {
    const q = QUESTIONS[qIndex];
    const isRTL = lang === "ar";
    const qText = t(q.q);
    const progress = ((qIndex) / QUESTIONS.length) * 100;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" dir={isRTL ? "rtl" : "ltr"} lang={lang === "de" ? "de-DE" : lang}>
        {/* Header */}
        <div className="w-full max-w-2xl mb-6">
          <div className="flex items-center justify-between font-mono text-xs text-primary/40 tracking-widest mb-2">
            <span>{t("growth_initiation_protocol")}</span>
            <span>{t("growth_question")} {qIndex + 1} / {QUESTIONS.length}</span>
          </div>
          <div className="h-px bg-primary/10 w-full relative">
            <motion.div className="h-px bg-primary absolute left-0 top-0"
              animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
          <div className="mt-2 flex gap-1">
            {QUESTIONS.map((_, i) => (
              <div key={i} className={`flex-1 h-0.5 transition-colors ${i < qIndex ? "bg-primary" : i === qIndex ? "bg-primary/60" : "bg-primary/15"}`} />
            ))}
          </div>
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div key={qIndex}
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.97 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-2xl border border-primary/30 bg-background p-8 space-y-6"
          >
            {/* Dimension badge */}
            <div className="flex items-center gap-3">
              <span className="text-2xl">{q.glyph}</span>
              <div>
                <div className="font-mono text-primary text-xs tracking-[0.4em] uppercase">{q.dim}</div>
                <div className="text-primary/50 font-mono text-xs" dir={isRTL ? "rtl" : "ltr"}>{t(q.labelKey)}</div>
              </div>
              <div className="ml-auto font-mono text-primary/30 text-xs">
                {t("growth_dimension")} {qIndex + 1}
              </div>
            </div>

            {/* Question text */}
            <div className="border-l-2 border-primary/40 pl-4">
              <p className={`text-foreground font-bold text-lg leading-relaxed ${isRTL ? "text-right" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
                {qText}
              </p>
            </div>

            {/* Choices or free text */}
            {q.choices ? (
              <div className="space-y-2">
                {(Object.entries(q.choices) as [string, string][]).map(([letter, key]) => {
                  const selected = answers[`Q${qIndex + 1}`] === letter;
                  const txt = t(key);
                  return (
                    <motion.button key={letter}
                      whileHover={{ x: 4 }}
                      onClick={() => {
                        setAnswers(prev => ({ ...prev, [`Q${qIndex + 1}`]: letter }));
                        setTimeout(() => {
                          if (qIndex < QUESTIONS.length - 1) setQIndex(i => i + 1);
                          else submitInitiation();
                        }, 220);
                      }}
                      className={`w-full text-start px-5 py-3 border font-mono text-sm tracking-wide transition-all flex items-center gap-4 ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-primary/20 text-primary/60 hover:border-primary/50 hover:text-primary/90 hover:bg-primary/5"
                      }`}
                      dir={isRTL ? "rtl" : "ltr"}
                    >
                      <span className={`font-black text-lg shrink-0 ${selected ? "text-primary" : "text-primary/30"}`}>{letter}</span>
                      <span>{txt}</span>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              // Free text Q7
              <div className="space-y-3">
                <textarea
                  value={freeText}
                  onChange={e => setFreeText(e.target.value)}
                  placeholder={t("growth_declaration_placeholder")}
                  dir={isRTL ? "rtl" : "ltr"}
                  maxLength={200}
                  rows={3}
                  className="w-full bg-transparent border border-primary/30 text-primary font-mono text-sm p-4 placeholder:text-primary/20 focus:outline-none focus:border-primary/60 resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-primary/30 font-mono text-xs">{freeText.length}/200</span>
                  <button
                    onClick={() => submitInitiation()}
                    disabled={!freeText.trim()}
                    className="px-6 py-2 border border-primary text-primary font-mono font-black text-sm tracking-widest uppercase hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {t("growth_transmit")} ▶
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Back */}
        {qIndex > 0 && (
          <button onClick={() => setQIndex(i => i - 1)}
            className="mt-4 text-primary/30 font-mono text-xs hover:text-primary/60 transition-colors">
            ← {t("growth_previous_dimension")}
          </button>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ENCODING — Matrix encryption animation
  // ──────────────────────────────────────────────────────────────────────────
  if (phase === "encoding") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8" dir={isRTL ? "rtl" : "ltr"} lang={lang === "de" ? "de-DE" : lang}>
        <div className="w-full max-w-2xl font-mono space-y-0">
          <div className="border border-primary/30 p-8">
            <div className="text-primary/50 text-xs tracking-widest mb-6">
              ║ {t("growth_encoding_sequence")} ║
            </div>
            {(ENCODING_KEYS.slice(0, encodingProgress) as readonly EncodingKey[]).map((key, i) => (
              <motion.div key={key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="text-green-400/80 text-sm tracking-wider py-0.5">
                <span className="text-primary/40 mr-2">[{String(i + 1).padStart(2, "0")}]</span>
                {t(key)}
                {i === encodingProgress - 1 && !encodingDone && (
                  <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} className="ml-1">▋</motion.span>
                )}
                {i === encodingProgress - 1 && (
                  <span className="text-green-400 ml-2">{encodingDone && i < encodingProgress - 1 ? "✓" : i < encodingProgress - 1 ? "✓" : ""}</span>
                )}
              </motion.div>
            ))}

            {apiError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-destructive border border-destructive/30 p-4">
                {t("growth_error")}: {apiError.kind === "external" ? apiError.message : t(apiError.key)}
                <button onClick={() => {
                  assessmentAbortRef.current?.abort();
                  setApiLoading(false);
                  setApiError(null);
                  setEncodingProgress(0);
                  setBootProgress(0);
                  setPhase("boot");
                }}
                  className="block mt-2 text-primary text-xs hover:underline">← {t("growth_restart_protocol")}</button>
              </motion.div>
            )}

            {encodingDone && !apiLoading && !apiError && archonProfile && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="mt-6 border-t border-primary/30 pt-6 space-y-3">
                <div className="text-primary font-black text-lg tracking-widest">{t("growth_code_generated")}</div>
                <div className="text-3xl font-black text-primary tracking-[0.2em] font-mono"
                  style={{ textShadow: "0 0 20px #C9A84C80" }}>
                  {archonProfile.archonCode}
                </div>
                <div className="text-green-400/60 text-xs tracking-wider">
                  {t("growth_archetype_classified")}: <span className="text-green-400 font-black">{archonProfile.archetype}</span>
                </div>
                <div className="text-primary/40 text-xs">{t("growth_loading_profile")}</div>
              </motion.div>
            )}

            {(apiLoading || (!encodingDone && !apiError)) && (
              <div className="mt-4 flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 bg-primary rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ARCHON PROFILE
  // ──────────────────────────────────────────────────────────────────────────
  if (phase === "profile" && activeProfile) {
    const ai = activeProfile.aiProfile ?? {};
    const archInfo2 = ARCHETYPES[activeProfile.archetype] ?? ARCHETYPES["THE SEEKER"];
    const archetypeLabel = archInfo2.labels[lang];
    const dimVals = activeProfile.dimensions;
    const dimEntries = DIMENSIONS.map(d => ({ ...d, score: (dimVals as unknown as Record<string, number>)[d.key] ?? 0 }));

    return (
      <div className="min-h-screen bg-background text-foreground" dir={isRTL ? "rtl" : "ltr"} lang={lang === "de" ? "de-DE" : lang}>
        {/* ── Imperial Header ─────────────────────────────────────────── */}
        <div className="border-b border-primary/20 bg-background sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            {/* Smart Domain Widget — compact pill */}
            <SmartDomainWidget domainId="xp" compact />
            <div className="font-mono text-primary text-xs tracking-[0.3em]">{t("growth_archon_system")}</div>
            <div className="h-4 w-px bg-primary/20" />
            <div className="font-mono text-primary/60 text-xs tracking-widest">{activeProfile.archonCode}</div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-2xl">{archInfo2.symbol}</span>
              <span className="font-mono font-black text-xs tracking-widest" style={{ color: archInfo2.color }}>
                {archetypeLabel}
              </span>
              <span className="text-primary/30 font-mono text-xs">· {activeProfile.overallScore}/100</span>
            </div>
          </div>
          {/* Tabs */}
          <div className="max-w-6xl mx-auto px-4 flex gap-0 border-t border-primary/10">
            {([
              { id: "profile", label: t("growth_tab_profile"), symbol: "◈" },
              { id: "pillars", label: t("growth_tab_pillars"), symbol: "▓" },
              { id: "missions", label: t("growth_sovereign_missions"), symbol: "♔" },
              { id: "oracle", label: t("growth_tab_oracle"), symbol: "👁" },
              { id: "calibration", label: t("growth_tab_breath"), symbol: "∿" },
              { id: "ameeq", label: t("growth_tab_palace"), symbol: "🏛️" },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 font-mono text-xs tracking-widest border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-primary/30 hover:text-primary/60"
                }`}>
                {tab.symbol} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* ── Re-assess CTA ───────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-6">
            <div className="font-mono text-primary/40 text-xs tracking-widest">
              {t("growth_citizen")}: {user?.username?.toUpperCase()} · {t("growth_clearance")}: OMEGA
            </div>
            <button
              onClick={() => {
                assessmentAbortRef.current?.abort();
                setApiLoading(false);
                setApiError(null);
                setEncodingProgress(0);
                setBootProgress(0);
                setPhase("boot");
              }}
              className="px-4 py-1.5 border border-primary/30 text-primary/50 font-mono text-xs tracking-widest hover:border-primary/60 hover:text-primary/80 transition-all"
            >
              {t("growth_re_initiate")}
            </button>
          </div>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB: DIMENSIONAL PROFILE                                    */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === "profile" && (
            <div className="space-y-8">
              {/* Archetype hero */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="border p-8 text-center space-y-4 relative overflow-hidden"
                style={{ borderColor: `${archInfo2.color}40` }}>
                <div className="absolute inset-0 opacity-5"
                  style={{ background: `radial-gradient(circle at 50% 50%, ${archInfo2.color}, transparent 70%)` }} />
                <div className="text-5xl mb-2">{archInfo2.symbol}</div>
                <div className="font-mono text-xs tracking-[0.5em] text-primary/40">{t("growth_archon_class")}</div>
                <div className="text-5xl font-black font-mono tracking-widest" style={{ color: archInfo2.color, textShadow: `0 0 40px ${archInfo2.color}60` }}>
                  {archetypeLabel}
                </div>
                {ai.archetype_declaration && (
                  <p className="text-sm text-white/60 max-w-2xl mx-auto leading-relaxed font-mono border-t border-primary/10 pt-4 mt-4">
                    "{ai.archetype_declaration}"
                  </p>
                )}
                <div className="inline-block px-6 py-2 border font-mono font-black text-sm tracking-[0.3em]"
                  style={{ borderColor: `${archInfo2.color}60`, color: archInfo2.color }}>
                  {activeProfile.archonCode}
                </div>
                {ai.cipher_phrase && (
                  <div className="font-mono text-xs text-primary/30 tracking-[0.4em] uppercase">{ai.cipher_phrase}</div>
                )}
              </motion.div>

              {/* 7 Dimensions grid */}
              <div>
                <div className="font-mono text-primary/50 text-xs tracking-[0.4em] mb-4">◈ {t("growth_dimension_map")}</div>
                <div className="grid gap-3">
                  {dimEntries.map((dim, i) => (
                    <motion.div key={dim.key}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      className="border border-primary/10 p-4 hover:border-primary/30 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: `linear-gradient(90deg, ${dim.color}08 0%, transparent 100%)` }} />
                      <div className="relative flex items-center gap-4">
                        <span className="text-xl shrink-0">{dim.glyph}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm tracking-widest" style={{ color: dim.color }}>{dim.latin}</span>
                              <span className="font-mono text-xs text-white/30" dir={isRTL ? "rtl" : "ltr"}>{t(dim.labelKey)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-black text-sm" style={{ color: dim.color }}>{dim.score}</span>
                              <span className="font-mono text-xs text-white/20">/100</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-white/5 relative overflow-hidden">
                            <motion.div className="h-full absolute left-0 top-0"
                              style={{ background: `linear-gradient(90deg, ${dim.color}90, ${dim.color})` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${dim.score}%` }}
                              transition={{ duration: 1.2, delay: 0.3 + i * 0.08, ease: "easeOut" }} />
                          </div>
                        </div>
                        <button
                          onClick={() => generateMission(dim.key)}
                          disabled={missionLoading && missionDim === dim.key}
                          className="shrink-0 px-3 py-1 border font-mono text-xs tracking-widest transition-all opacity-40 group-hover:opacity-100"
                          style={{ borderColor: `${dim.color}50`, color: dim.color }}
                        >
                          {missionLoading && missionDim === dim.key ? t("growth_directive_loading") : t("growth_directive_btn")}
                        </button>
                      </div>
                      {/* Mission result inline */}
                      <AnimatePresence>
                        {missionResult && missionDim === dim.key && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="mt-3 pt-3 border-t font-mono" style={{ borderColor: `${dim.color}20` }}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs tracking-widest" style={{ color: dim.color }}>{t("growth_directive_btn")}</span>
                                <span className="text-xs text-white/30">· {missionResult.duration} · {missionResult.intensity}</span>
                              </div>
                              <p className="text-sm text-white/70 leading-relaxed">{missionResult.directive}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Strength + Shadow */}
              {(ai.core_strength || ai.shadow_mission) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {ai.core_strength && (
                    <div className="border border-green-400/20 p-5 space-y-2">
                      <div className="font-mono text-green-400 text-xs tracking-[0.4em]">{t("growth_core_strength")}</div>
                      <p className="text-sm text-white/70 leading-relaxed font-mono">{ai.core_strength}</p>
                    </div>
                  )}
                  {ai.shadow_mission && (
                    <div className="border border-destructive/20 p-5 space-y-2">
                      <div className="font-mono text-destructive text-xs tracking-[0.4em]">{t("growth_shadow_mission")}</div>
                      <p className="text-sm text-white/70 leading-relaxed font-mono">{ai.shadow_mission}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Imperial decree */}
              {ai.imperial_decree && (
                <div className="border border-primary/30 p-6 text-center space-y-3">
                  <div className="font-mono text-primary/50 text-xs tracking-[0.5em]">{t("growth_imperial_decree")}</div>
                  <p className="text-base text-primary/80 font-mono leading-relaxed italic">"{ai.imperial_decree}"</p>
                </div>
              )}

              {/* Daily directive */}
              {ai.daily_directive && (
                <div className="border border-primary p-5 flex items-start gap-4"
                  style={{ boxShadow: "0 0 20px #C9A84C15" }}>
                  <span className="text-2xl shrink-0">⚡</span>
                  <div>
                    <div className="font-mono text-primary text-xs tracking-[0.4em] mb-2">{t("growth_todays_directive")}</div>
                    <p className="text-sm text-white/80 font-mono leading-relaxed">{ai.daily_directive}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB: FOUR PILLARS                                           */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === "pillars" && (() => {
            const d = activeProfile.dimensions;
            // Compute the 4 pillar scores from 7 dimensions
            const pillars = [
              {
                id: "mens",
                latin: "MENS",
                ar: t("growth_pillar_mens_name"),
                sub: t("growth_pillar_mens_sub"),
                symbol: "🧠",
                color: "#A8E6CF",
                score: Math.round((d.intellectus + d.auctoritas) / 2),
                dims: [
                  { label: "INTELLECTUS", value: d.intellectus },
                  { label: "AUCTORITAS", value: d.auctoritas },
                ],
                challenge: t("growth_pillar_mens_challenge"),
                power: t("growth_pillar_mens_power"),
              },
              {
                id: "vis",
                latin: "VIS",
                ar: t("growth_pillar_vis_name"),
                sub: t("growth_pillar_vis_sub"),
                symbol: "⚔️",
                color: "#C9A84C",
                score: Math.round((d.volontas + d.disciplina) / 2),
                dims: [
                  { label: "VOLONTAS", value: d.volontas },
                  { label: "DISCIPLINA", value: d.disciplina },
                ],
                challenge: t("growth_pillar_vis_challenge"),
                power: t("growth_pillar_vis_power"),
              },
              {
                id: "anima",
                latin: "ANIMA",
                ar: t("growth_pillar_anima_name"),
                sub: t("growth_pillar_anima_sub"),
                symbol: "🔥",
                color: "#FF8C42",
                score: Math.round((d.resilentia + d.societas) / 2),
                dims: [
                  { label: "RESILENTIA", value: d.resilentia },
                  { label: "SOCIETAS", value: d.societas },
                ],
                challenge: t("growth_pillar_anima_challenge"),
                power: t("growth_pillar_anima_power"),
              },
              {
                id: "legatum",
                latin: "LEGATUM",
                ar: t("growth_pillar_legatum_name"),
                sub: t("growth_pillar_legatum_sub"),
                symbol: "👑",
                color: "#DDA0DD",
                score: Math.round(
                  (d.abundantia * 0.5) +
                  (activeProfile.overallScore * 0.3) +
                  (Math.min(...Object.values(d)) * 0.2)
                ),
                dims: [
                  { label: "ABUNDANTIA", value: d.abundantia },
                  { label: "BALANCE", value: Math.round(100 - (Math.max(...Object.values(d)) - Math.min(...Object.values(d)))) },
                ],
                challenge: t("growth_pillar_legatum_challenge"),
                power: t("growth_pillar_legatum_power"),
              },
            ];

            const engineScore = Math.round(pillars.reduce((s, p) => s + p.score, 0) / 4);
            const weakestPillar = pillars.reduce((a, b) => a.score < b.score ? a : b);
            const strongestPillar = pillars.reduce((a, b) => a.score > b.score ? a : b);
            const growthState =
              engineScore >= 80 ? { label: t("growth_state_sovereign"), color: "#C9A84C", desc: t("growth_state_sovereign_desc") } :
              engineScore >= 60 ? { label: t("growth_state_accelerating"), color: "#A8E6CF", desc: t("growth_state_accelerating_desc") } :
              engineScore >= 40 ? { label: t("growth_state_building"), color: "#87CEEB", desc: t("growth_state_building_desc") } :
                                  { label: t("growth_state_awakening"), color: "#FF8C42", desc: t("growth_state_awakening_desc") };

            return (
              <div className="space-y-8">
                <div className="font-mono text-primary/40 text-xs tracking-[0.4em]">
                  ▓ {t("growth_four_pillars")}
                </div>

                {/* Growth Engine Score */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="border p-6 relative overflow-hidden"
                  style={{ borderColor: `${growthState.color}50` }}>
                  <div className="absolute inset-0"
                    style={{ background: `radial-gradient(ellipse at 50% 0%, ${growthState.color}08, transparent 60%)` }} />
                  <div className="relative">
                    <div className="font-mono text-xs tracking-[0.5em] mb-3"
                      style={{ color: `${growthState.color}80` }}>
                      ⚡ {t("growth_perpetual_engine")}
                    </div>
                    <div className="flex items-end gap-6 mb-4">
                      <div className="text-7xl font-black font-mono leading-none"
                        style={{ color: growthState.color, textShadow: `0 0 60px ${growthState.color}40` }}>
                        {engineScore}
                      </div>
                      <div className="pb-2">
                        <div className="font-mono font-black text-lg tracking-widest" style={{ color: growthState.color }}>
                          {growthState.label}
                        </div>
                        <div className="font-mono text-xs text-white/40 mt-0.5" dir={isRTL ? "rtl" : "ltr"}>{growthState.desc}</div>
                      </div>
                    </div>
                    {/* Engine bar */}
                    <div className="h-2 bg-white/5 relative overflow-hidden mb-3">
                      <motion.div className="h-full absolute left-0"
                        initial={{ width: 0 }}
                        animate={{ width: `${engineScore}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        style={{ background: `linear-gradient(90deg, ${growthState.color}60, ${growthState.color})` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">{t("growth_dominant")}</span>
                        <span style={{ color: strongestPillar.color }}>{strongestPillar.latin} ({strongestPillar.score})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-destructive/70">{t("growth_weakest")}</span>
                        <span style={{ color: weakestPillar.color }}>{weakestPillar.latin} ({weakestPillar.score})</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* The Four Pillars — visual column display */}
                <div>
                  <div className="font-mono text-primary/40 text-xs tracking-[0.4em] mb-4">
                    ◈ {t("growth_structural_analysis")}
                  </div>

                  {/* Pillar columns visual */}
                  <div className="flex items-end gap-3 h-32 mb-1 px-2">
                    {pillars.map((p, i) => (
                      <motion.div key={p.id}
                        className="flex-1 flex flex-col items-center justify-end gap-1"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
                        <span className="text-xs font-mono font-black" style={{ color: p.color }}>{p.score}</span>
                        <div className="w-full relative overflow-hidden" style={{ height: 80 }}>
                          <div className="absolute bottom-0 w-full"
                            style={{ background: `${p.color}10`, border: `1px solid ${p.color}20`, height: '100%' }} />
                          <motion.div
                            className="absolute bottom-0 w-full"
                            initial={{ height: 0 }}
                            animate={{ height: `${p.score}%` }}
                            transition={{ duration: 1.2, delay: 0.3 + i * 0.12, ease: "easeOut" }}
                            style={{
                              background: `linear-gradient(to top, ${p.color}80, ${p.color}30)`,
                              borderTop: `2px solid ${p.color}`,
                            }} />
                        </div>
                        <span className="text-xs font-mono tracking-widest" style={{ color: `${p.color}80` }}>{p.latin}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Pillar cards */}
                <div className="space-y-4">
                  {pillars.map((p, i) => (
                    <motion.div key={p.id}
                      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="border p-5 space-y-4 relative overflow-hidden"
                      style={{ borderColor: `${p.color}25` }}>
                      <div className="absolute right-0 top-0 bottom-0 w-1"
                        style={{ background: `linear-gradient(to bottom, ${p.color}60, ${p.color}10)` }} />

                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{p.symbol}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm tracking-widest" style={{ color: p.color }}>
                                {p.latin}
                              </span>
                              <span className="font-mono text-xs text-white/30" dir={isRTL ? "rtl" : "ltr"}>{p.ar}</span>
                            </div>
                            <div className="font-mono text-xs text-white/20 tracking-widest mt-0.5" dir={isRTL ? "rtl" : "ltr"}>{p.sub}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-black text-2xl leading-none" style={{ color: p.color }}>{p.score}</div>
                          <div className="font-mono text-xs text-white/20">/100</div>
                        </div>
                      </div>

                      {/* Score bar */}
                      <div className="h-1.5 bg-white/5 relative overflow-hidden">
                        <motion.div className="h-full absolute left-0"
                          initial={{ width: 0 }}
                          animate={{ width: `${p.score}%` }}
                          transition={{ duration: 1.2, delay: 0.4 + i * 0.1, ease: "easeOut" }}
                          style={{ background: `linear-gradient(90deg, ${p.color}50, ${p.color})` }} />
                      </div>

                      {/* Dimension breakdown */}
                      <div className="flex gap-4">
                        {p.dims.map((dim, j) => (
                          <div key={j} className="flex items-center gap-2 font-mono text-xs">
                            <span className="text-white/20">{dim.label}</span>
                            <span style={{ color: p.color }}>{dim.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Power statement */}
                      <div className="border-l-2 pl-3 font-mono text-xs text-white/40 leading-relaxed italic"
                        style={{ borderColor: `${p.color}40` }} dir={isRTL ? "rtl" : "ltr"}>
                        "{p.power}"
                      </div>

                      {/* Daily challenge + streak */}
                      <div className="border p-3 space-y-2.5" style={{ borderColor: `${p.color}20`, background: `${p.color}05` }}>
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-xs tracking-widest" style={{ color: p.color }}>
                            ⚡ {t("growth_daily_pillar_challenge")}
                          </div>
                          {/* Streak counter */}
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <span className="text-orange-400">🔥</span>
                            <span style={{ color: p.color }} className="font-black">
                              {pillarStreaks[p.id]?.streak ?? 0}
                            </span>
                            <span className="text-white/30">{t("growth_day_streak")}</span>
                          </div>
                        </div>
                        <p className="font-mono text-xs text-white/60 leading-relaxed" dir={isRTL ? "rtl" : "ltr"}>{p.challenge}</p>

                        {/* Mark Complete button */}
                        <AnimatePresence mode="wait">
                          {pillarStreaks[p.id]?.completedToday ? (
                            <motion.div
                              key="done"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center gap-2 font-mono text-xs py-2 px-3 border"
                              style={{ borderColor: `${p.color}40`, color: p.color, background: `${p.color}10` }}
                            >
                              <span className="text-base">✓</span>
                              <span className="font-black tracking-widest">{t("growth_completed_today")}</span>
                              {pillarJustCompleted === p.id && (
                                <motion.span
                                  initial={{ opacity: 0, x: 6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0 }}
                                  className="ml-auto text-primary font-black"
                                >
                                  {t("growth_xp_15_awarded")} ⚡
                                </motion.span>
                              )}
                            </motion.div>
                          ) : (
                            <motion.button
                              key="btn"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              disabled={pillarCompleting === p.id}
                              onClick={() => completePillar(p.id)}
                              className="w-full py-2 px-3 border font-mono font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                              style={{
                                borderColor: p.color,
                                color: p.color,
                              }}
                            >
                              {pillarCompleting === p.id ? (
                                <>
                                  <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>▋</motion.span>
                                  {t("growth_encoding")}
                                </>
                              ) : (
                                <>▶ {t("growth_mark_complete")}</>
                              )}
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Four Pillars growth law */}
                <div className="border border-primary/30 p-6 space-y-3 text-center"
                  style={{ background: "rgba(201,168,76,0.03)" }}>
                  <div className="font-mono text-primary/40 text-xs tracking-[0.5em]">♔ {t("growth_imperial_growth_law")}</div>
                  <p className="font-mono text-sm text-primary/70 leading-relaxed" dir={isRTL ? "rtl" : "ltr"}>
                    "{t("growth_imperial_growth_law_desc")}"
                  </p>
                  <div className="flex items-center justify-center gap-6 pt-2">
                    {pillars.map(p => (
                      <div key={p.id} className="text-center">
                        <div className="text-lg">{p.symbol}</div>
                        <div className="font-mono text-xs font-black" style={{ color: p.color }}>{p.latin}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weakest pillar focus directive */}
                <div className="border p-5 flex items-start gap-4"
                  style={{ borderColor: `${weakestPillar.color}50`, boxShadow: `0 0 20px ${weakestPillar.color}10` }}>
                  <span className="text-2xl shrink-0">{weakestPillar.symbol}</span>
                  <div>
                    <div className="font-mono text-xs tracking-[0.4em] mb-2" style={{ color: weakestPillar.color }}>
                      ▼ {t("growth_priority_frontier")} — {weakestPillar.latin} ({weakestPillar.ar})
                    </div>
                    <p className="font-mono text-xs text-white/60 leading-relaxed" dir={isRTL ? "rtl" : "ltr"}>
                      {weakestPillar.challenge}
                    </p>
                    <div className="mt-2 font-mono text-xs text-white/30">
                      {t("growth_score")}: {weakestPillar.score}/100 — {t("growth_priority_focus")}
                    </div>
                  </div>
                </div>

              </div>
            );
          })()}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB: SOVEREIGN MISSIONS                                     */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === "missions" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="font-mono text-primary/40 text-xs tracking-[0.4em]">
                  ♔ {t("growth_mission_engine")}
                </div>
                <div className="font-mono text-primary/30 text-xs">
                  {new Date().toLocaleDateString(locale)}
                </div>
              </div>

              {/* Missions header card */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="border border-primary/30 p-6 relative overflow-hidden"
                style={{ boxShadow: "0 0 40px #C9A84C08" }}>
                <div className="absolute inset-0 opacity-5"
                  style={{ background: "radial-gradient(circle at 10% 50%, #C9A84C, transparent 60%)" }} />
                <div className="relative flex items-start gap-4">
                  <div className="text-4xl shrink-0">♔</div>
                  <div className="space-y-1">
                    <div className="font-mono font-black text-primary tracking-[0.3em] text-sm">
                      {t("growth_classified_daily_directives")}
                    </div>
                    <p className="text-xs text-white/40 font-mono leading-relaxed">
                      {t("growth_missions_intro")}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Loading state */}
              {missionsLoading && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="flex gap-2">
                    {[0,1,2].map(i => (
                      <motion.div key={i} className="w-2 h-2 bg-primary rounded-full"
                        animate={{ opacity: [0.2, 1, 0.2], y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} />
                    ))}
                  </div>
                  <div className="font-mono text-primary/40 text-xs tracking-widest">
                    {t("growth_loading_directives")}
                  </div>
                </div>
              )}

              {/* No missions yet */}
              {!missionsLoading && missions.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border border-primary/10 p-10 text-center space-y-4">
                  <div className="text-4xl opacity-30">⚙</div>
                  <div className="font-mono text-primary/40 text-sm tracking-widest">
                    {t("growth_missions_generating")}
                  </div>
                  <p className="text-xs text-white/30 font-mono max-w-sm mx-auto">
                    {t("growth_missions_empty")}
                  </p>
                </motion.div>
              )}

              {/* Mission cards */}
              {!missionsLoading && missions.length > 0 && (
                <div className="space-y-4">
                  {missions.map((mission, i) => {
                    const CATEGORY_STYLE: Record<string, { color: string; symbol: string; label: string }> = {
                      combat:  { color: "#FF6B35", symbol: "⚔", label: t("growth_category_combat") },
                      social:  { color: "#87CEEB", symbol: "◈", label: t("growth_category_social") },
                      growth:  { color: "#A8E6CF", symbol: "↑", label: t("growth_category_growth") },
                      legacy:  { color: "#DDA0DD", symbol: "♔", label: t("growth_category_legacy") },
                    };
                    const cat = CATEGORY_STYLE[mission.category] ?? CATEGORY_STYLE.growth;
                    const isCompleting = missionCompleting === mission.id;

                    return (
                      <motion.div key={mission.id}
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`border p-6 space-y-4 relative overflow-hidden transition-all ${
                          mission.completed
                            ? "border-primary/10 opacity-60"
                            : "border-primary/20 hover:border-primary/40"
                        }`}
                      >
                        {/* Completed overlay */}
                        {mission.completed && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="font-mono font-black text-green-400/20 text-6xl tracking-widest rotate-[-15deg]">
                              {t("growth_completed")}
                            </div>
                          </div>
                        )}

                        <div className="relative">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xl shrink-0">{cat.symbol}</span>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-mono text-xs tracking-[0.3em]"
                                    style={{ color: cat.color }}>{cat.label}</span>
                                  <span className="font-mono text-primary/20 text-xs">·</span>
                                  <span className="font-mono text-primary/40 text-xs">+{mission.xp_reward} XP</span>
                                </div>
                                <div className="font-mono font-black text-foreground text-sm tracking-wide" dir={isRTL ? "rtl" : "ltr"}>
                                  {lang === "ar" ? mission.title_ar : mission.title}
                                </div>
                              </div>
                            </div>

                            {/* Mission index */}
                            <div className="shrink-0 font-mono text-primary/15 font-black text-4xl">
                              {String(i + 1).padStart(2, "0")}
                            </div>
                          </div>

                          {/* Description */}
                          <div className="mt-4 space-y-2 border-l-2 pl-4"
                            style={{ borderColor: `${cat.color}30` }}>
                            <p className="text-sm text-white/60 font-mono leading-relaxed" dir={isRTL ? "rtl" : "ltr"}>
                              {lang === "ar" ? mission.description_ar : mission.description}
                            </p>
                          </div>

                          {/* Complete button */}
                          {!mission.completed && (
                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex gap-1">
                                {[0,1,2].map(j => (
                                  <div key={j} className="w-1.5 h-1.5 rounded-full"
                                    style={{ background: j < (i + 1) ? cat.color : `${cat.color}20` }} />
                                ))}
                              </div>
                              <button
                                onClick={() => completeMission(mission.id)}
                                disabled={isCompleting}
                                className="px-5 py-2 border font-mono font-black text-xs tracking-[0.3em] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                style={{
                                  borderColor: cat.color,
                                  color: cat.color,
                                  boxShadow: `0 0 15px ${cat.color}20`,
                                }}
                              >
                                {isCompleting ? (
                                  <span className="flex items-center gap-2">
                                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>⚙</motion.span>
                                    {t("growth_executing")}
                                  </span>
                                ) : `${t("growth_mission_complete")} ✓`}
                              </button>
                            </div>
                          )}

                          {mission.completed && (
                            <div className="mt-4 flex items-center gap-2">
                              <span className="text-green-400 text-sm">✓</span>
                              <span className="font-mono text-green-400/60 text-xs tracking-widest">
                                 {t("growth_executed")} — +{mission.xp_reward} XP {t("growth_awarded")}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Summary strip */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    className="border border-primary/10 p-4 flex items-center justify-between">
                    <div className="font-mono text-primary/40 text-xs tracking-widest">
                      {t("growth_missions_completed")}:
                      <span className="text-primary ml-2 font-black">
                        {missions.filter(m => m.completed).length} / {missions.length}
                      </span>
                    </div>
                    <div className="font-mono text-primary/40 text-xs tracking-widest">
                      {t("growth_total_xp_available")}:
                      <span className="text-primary ml-2 font-black">
                        +{missions.filter(m => !m.completed).reduce((s, m) => s + m.xp_reward, 0)} XP
                      </span>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB: ORACLE INTELLIGENCE                                    */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === "oracle" && (
            <div className="space-y-6">
              <div className="font-mono text-primary/40 text-xs tracking-[0.4em] mb-2">
                 👁 {t("growth_temporal_intelligence")}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {[
                   { phase: t("growth_30_day_protocol"), key: "30_day_protocol", color: "#C9A84C", sym: "▶" },
                   { phase: t("growth_90_day_expansion"), key: "90_day_expansion", color: "#A8E6CF", sym: "▷▶" },
                   { phase: t("growth_1_year_sovereignty"), key: "1_year_sovereignty", color: "#DDA0DD", sym: "♔" },
                ].map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.12 }}
                    className="border p-5 space-y-3" style={{ borderColor: `${r.color}30` }}>
                    <div className="font-mono font-black text-xs tracking-[0.3em]" style={{ color: r.color }}>
                      {r.sym} {r.phase}
                    </div>
                    <p className="text-sm text-white/70 font-mono leading-relaxed">
                       {ai[r.key] ?? t("growth_oracle_processing")}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Archetype deep dive */}
              <div className="border border-primary/20 p-6 space-y-4">
                <div className="font-mono text-primary/50 text-xs tracking-[0.4em]">◈ {t("growth_dominant_shadow_dimensions")}</div>
                <div className="grid md:grid-cols-2 gap-4">
                  {ai.dominant_dimension && (
                    <div className="space-y-1">
                       <div className="font-mono text-green-400 text-xs tracking-widest">{t("growth_dominant_force")}</div>
                      <div className="font-mono font-black text-xl text-green-400">{ai.dominant_dimension}</div>
                       <div className="text-xs text-white/40 font-mono">{t("growth_dominant_force_desc")}</div>
                    </div>
                  )}
                  {ai.shadow_dimension && (
                    <div className="space-y-1">
                       <div className="font-mono text-destructive/80 text-xs tracking-widest">{t("growth_shadow_frontier")}</div>
                      <div className="font-mono font-black text-xl text-destructive/80">{ai.shadow_dimension}</div>
                       <div className="text-xs text-white/40 font-mono">{t("growth_shadow_frontier_desc")}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Historical score bars in oracle */}
              <div className="border border-primary/10 p-6">
                <div className="font-mono text-primary/50 text-xs tracking-[0.4em] mb-4">◉ {t("growth_dimensional_radar")}</div>
                <div className="space-y-3">
                  {dimEntries.sort((a, b) => b.score - a.score).map((dim, i) => (
                    <div key={dim.key} className="flex items-center gap-3 font-mono text-xs">
                      <span className="w-4 text-white/30">{i + 1}</span>
                      <span className="w-28 tracking-widest" style={{ color: dim.color }}>{dim.latin}</span>
                      <div className="flex-1 h-1 bg-white/5 relative overflow-hidden">
                        <motion.div className="h-full absolute left-0"
                          style={{ background: dim.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${dim.score}%` }}
                          transition={{ duration: 1, delay: i * 0.07 }} />
                      </div>
                      <span className="w-8 text-right" style={{ color: dim.color }}>{dim.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB: BREATH CALIBRATION                                     */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === "ameeq" && (
            <div className="max-w-3xl mx-auto">
              <RoyalPalace />
            </div>
          )}

          {activeTab === "calibration" && (
            <div className="space-y-6">
              <div className="font-mono text-primary/40 text-xs tracking-[0.4em] mb-2">
                ∿ {t("growth_breath_calibration_protocol")}
              </div>

              <div className="border border-primary/20 p-8 flex flex-col md:flex-row items-center gap-10">
                {/* The orb */}
                <div className="relative flex items-center justify-center shrink-0">
                  <motion.div
                    animate={
                      breathPhase === "inhale" ? { scale: 1.6, opacity: 0.9 } :
                      breathPhase === "hold"   ? { scale: 1.6, opacity: 0.7 } :
                      breathPhase === "exhale" ? { scale: 1.0, opacity: 0.5 } :
                      { scale: 1.0, opacity: 0.3 }
                    }
                    transition={{ duration: breathPhase === "inhale" ? 4 : breathPhase === "exhale" ? 6 : 0.3, ease: "easeInOut" }}
                    className="w-36 h-36 rounded-full border"
                    style={{
                      borderColor: breathing ? "#C9A84C" : "#C9A84C30",
                      background: breathing ? "radial-gradient(circle, #C9A84C20, transparent)" : "transparent",
                      boxShadow: breathing ? "0 0 60px #C9A84C30" : "none",
                    }}
                  />
                  <div className="absolute text-center">
                    <p className={`text-xs font-mono font-black uppercase tracking-widest ${breathing ? "text-primary" : "text-primary/30"}`}>
                      {breathing ? t(`growth_breath_${breathPhase}`) : t("growth_standby")}
                    </p>
                    {breathing && breathCount > 0 && (
                      <p className="text-primary/40 font-mono text-xs mt-1">{t("growth_cycle")} {breathCount}</p>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-5">
                  <div className="font-mono text-sm text-white/60 leading-relaxed border-l border-primary/30 pl-4">
                     {t("growth_breath_description")}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {(["inhale","hold","exhale","rest"] as const).map(p => (
                      <div key={p} className={`px-2 py-2 border font-mono text-xs transition-all ${
                        breathPhase === p && breathing
                          ? "border-primary bg-primary/10 text-primary font-black"
                          : "border-primary/10 text-primary/30"
                      }`}>
                         <p className="uppercase tracking-wider">{t(`growth_breath_${p}`)}</p>
                        <p className="text-xs mt-0.5 font-black">{BREATH_TIMING[p]}s</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setBreathing(!breathing);
                      if (breathing) { setBreathCount(0); setBreathPhase("inhale"); }
                    }}
                    className={`px-8 py-3 border font-mono font-black text-sm tracking-[0.3em] uppercase transition-all ${
                      breathing
                        ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                        : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    }`}
                  >
                     {breathing ? `⏹ ${t("growth_disengage")}` : `⚡ ${t("growth_engage_protocol")}`}
                  </button>
                </div>
              </div>

              {/* NLP programs */}
              <div className="border border-primary/10 p-6 space-y-4">
                <div className="font-mono text-primary/50 text-xs tracking-[0.4em]">◈ {t("growth_imperial_mind_protocols")}</div>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { name: t("growth_program_anchor"), desc: t("growth_program_anchor_desc"), dur: t("growth_duration_5m"), color: "#C9A84C" },
                    { name: t("growth_program_vision"), desc: t("growth_program_vision_desc"), dur: t("growth_duration_7m"), color: "#A8E6CF" },
                    { name: t("growth_program_reframe"), desc: t("growth_program_reframe_desc"), dur: t("growth_duration_3m"), color: "#98FB98" },
                    { name: t("growth_program_peak"), desc: t("growth_program_peak_desc"), dur: t("growth_duration_10m"), color: "#DDA0DD" },
                  ].map((prog, i) => (
                    <div key={i} className="border border-white/5 p-4 space-y-2 hover:border-primary/20 transition-all cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs tracking-wider" style={{ color: prog.color }}>{prog.name}</span>
                        <span className="font-mono text-xs text-white/30">{prog.dur}</span>
                      </div>
                      <p className="text-xs text-white/50 font-mono leading-relaxed">{prog.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-primary/10 flex items-center justify-between font-mono text-xs text-primary/20">
             <span>{t("growth_footer_system")}</span>
            <div className="flex gap-4">
               <Link href="/games"><span className="hover:text-primary/50 cursor-pointer transition-colors">{t("growth_footer_battle_arena")}</span></Link>
              <Link href="/games/globalstar"><span className="hover:text-primary/50 cursor-pointer transition-colors">GLOBALSTAR</span></Link>
               <Link href="/chronicle"><span className="hover:text-primary/50 cursor-pointer transition-colors">{t("growth_footer_chronicles")}</span></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for encoding phase without profile yet
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" lang={lang === "de" ? "de-DE" : lang}>
      <div className="font-mono text-primary animate-pulse tracking-widest">{t("growth_archon_processing")}</div>
    </div>
  );
}
