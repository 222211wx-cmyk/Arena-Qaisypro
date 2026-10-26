/**
 * GDNA SMART SYSTEM — Tableau de bord intelligent
 * Analyse temps-réel de tous les modules connectés + recommandations IA
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { contentCopy } from "@/i18n/content-discovery-copy";
import { finalLabelText } from "@/i18n/final-labels-copy";

// ── Types ──────────────────────────────────────────────────────────────────────
interface SmartModule {
  id: string;
  name: string;
  status: "ACTIF" | "INACTIF";
  score: number;
  stats: Record<string, any>;
  badge: string;
  link: string;
}

interface SmartAnalysis {
  headline: string;
  overallMessage: string;
  recommendations: {
    moduleId: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    title: string;
    action: string;
    reward: string;
    icon: string;
  }[];
  strengths: string[];
  weaknesses: string[];
  dailyMission: {
    title: string;
    tasks: string[];
    totalReward: string;
  };
}

interface SmartData {
  citizen: { username: string; level: number; xp: number; balance: number; gamesPlayed: number; wins: number };
  modules: SmartModule[];
  overallScore: number;
  activeModules: number;
  totalModules: number;
  systemStatus: string;
  analysis?: SmartAnalysis;
  generatedAt?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  OPTIMAL:  "#22c55e",
  ACTIF:    "#eab308",
  PARTIEL:  "#f97316",
  INACTIF:  "#ef4444",
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH:   "#ef4444",
  MEDIUM: "#eab308",
  LOW:    "#22c55e",
};

// ── Animated counter ───────────────────────────────────────────────────────────
function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 30);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCurrent(value); clearInterval(timer); }
      else setCurrent(start);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <>{current}{suffix}</>;
}

// ── Score ring ─────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ffffff15" strokeWidth={6} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ - dash}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      <text x={size/2} y={size/2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: size * 0.22, fontWeight: 800, fill: color, transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}>
        {score}
      </text>
    </svg>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
if (false) {
// hint: Logic changed on both sides. Requires understanding intent of each change.
function DiscardSmartPage() {
  const { user } = useAuth();
  const { lang } = useLang();
  const t = (key: Parameters<typeof contentCopy>[1]) => contentCopy(lang, key);
  const [, nav] = useLocation();

  const [status, setStatus]   = useState<SmartData | null>(null);
  const [analysis, setAnalysis] = useState<SmartData | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingAI, setLoadingAI]   = useState(false);
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview"|"modules"|"missions">("overview");

  // ── Load status (fast) ────────────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/smart/status");
      if (!r.ok) return;
      setStatus(await r.json());
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // ── Load AI analysis (slower) ─────────────────────────────────────────────
  const loadAnalysis = useCallback(async () => {
    setLoadingAI(true);
    try {
      const r = await fetch("/api/smart/analysis");
      if (!r.ok) return;
      setAnalysis(await r.json());
    } finally {
      setLoadingAI(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadAnalysis();
    // Refresh status every 30s
    const t = setInterval(() => { loadStatus(); setTick(x => x + 1); }, 30_000);
    return () => clearInterval(t);
  }, [loadStatus, loadAnalysis]);

  if (!user) {
    return (
      <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, background: "#000" }}>
        <div style={{ fontSize: 64 }}>🧠</div>
        <h2 style={{ color: "#eab308", fontWeight: 900, fontSize: 24, margin: 0 }}>GDN-SMART {finalLabelText(lang, "system")}</h2>
        <p style={{ color: "#aaa", margin: 0 }}>سجّل دخولك للوصول إلى نظامك الذكي الشخصي</p>
        <button onClick={() => nav("/login")} style={{ background: "#eab308", color: "#000", border: "none", borderRadius: 10, padding: "12px 32px", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          تسجيل الدخول
        </button>
      </div>
    );
  }

  const data = status;
  const ai   = analysis?.analysis;

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ background: "#000", minHeight: "100vh", padding: "0 0 60px" }}>

      {/* ── Header bar ── */}
      <div style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #111 100%)", borderBottom: "1px solid #eab30820", padding: "28px 20px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {/* Brain icon */}
            <motion.div
              animate={{ boxShadow: ["0 0 10px #eab30840", "0 0 30px #eab30880", "0 0 10px #eab30840"] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #eab308, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
              🧠
            </motion.div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, color: "#fff", fontWeight: 900, fontSize: 26, letterSpacing: "0.03em" }}>
                  GDN-<span style={{ color: "#eab308" }}>SMART</span>
                </h1>
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ background: "#22c55e20", border: "1px solid #22c55e60", color: "#22c55e", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>
                  ● ACTIF ✅
                </motion.span>
              </div>
              <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>
                {finalLabelText(lang, "smartTagline")}
              </p>
            </div>

            {/* Overall score */}
            {data && (
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <ScoreRing score={data.overallScore} size={72} />
                <div style={{ color: "#888", fontSize: 10, marginTop: 2 }}>{t("overallScore")}</div>
              </div>
            )}
          </div>

          {/* Stats bar */}
          {data && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ display: "flex", gap: 20, marginTop: 20, flexWrap: "wrap" }}>
              {[
                { label: "NIVEAU",    value: data.citizen.level,        suffix: "",   icon: "⚡" },
                { label: "XP",        value: data.citizen.xp,           suffix: "",   icon: "✨" },
                { label: "PIÈCES",    value: data.citizen.balance,      suffix: "",   icon: "🪙" },
                { label: "MODULES",   value: data.activeModules,        suffix: `/${data.totalModules}`, icon: "🔌" },
                { label: "STATUT",    value: -1, special: data.systemStatus, icon: "📡" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <div>
                    <div style={{ color: "#888", fontSize: 9, letterSpacing: "0.1em" }}>{s.label}</div>
                    {s.special ? (
                      <div style={{ color: STATUS_COLOR[s.special] ?? "#fff", fontWeight: 800, fontSize: 14 }}>{s.special}</div>
                    ) : (
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>
                        <Counter value={s.value} suffix={s.suffix} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #ffffff10", marginTop: 24 }}>
          {([
            { id: "overview",  label: "🧠 النظرة الكاملة" },
            { id: "modules",   label: "🔌 الوحدات (8)" },
            { id: "missions",  label: "🎯 مهام اليوم" },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "10px 18px", fontWeight: 700, fontSize: 13,
                color: activeTab === tab.id ? "#eab308" : "#888",
                borderBottom: activeTab === tab.id ? "2px solid #eab308" : "2px solid transparent",
                transition: "all .2s",
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}
            style={{ paddingTop: 24 }}>

            {/* AI Analysis card */}
            <div style={{ background: "linear-gradient(135deg, #0d1117, #111827)", border: "1px solid #eab30830", borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <h3 style={{ margin: 0, color: "#eab308", fontWeight: 800, fontSize: 16 }}>تحليل الذكاء الاصطناعي</h3>
                {loadingAI && (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{ width: 16, height: 16, border: "2px solid #eab30840", borderTopColor: "#eab308", borderRadius: "50%" }} />
                )}
              </div>

              {ai ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ background: "#eab30810", border: "1px solid #eab30830", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                    <p style={{ margin: 0, color: "#eab308", fontWeight: 800, fontSize: 16, direction: "rtl", textAlign: "right" }}>
                      {ai.headline}
                    </p>
                  </div>
                  <p style={{ color: "#ccc", fontSize: 14, direction: "rtl", textAlign: "right", lineHeight: 1.7, margin: "0 0 20px" }}>
                    {ai.overallMessage}
                  </p>

                  {/* Strengths & Weaknesses */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <div style={{ background: "#22c55e10", border: "1px solid #22c55e30", borderRadius: 10, padding: 14 }}>
                      <div style={{ color: "#22c55e", fontWeight: 800, fontSize: 12, marginBottom: 8 }}>💪 نقاط القوة</div>
                      {ai.strengths?.map((s, i) => (
                        <div key={i} style={{ color: "#a3e6b8", fontSize: 13, direction: "rtl", textAlign: "right", marginBottom: 4 }}>• {s}</div>
                      ))}
                    </div>
                    <div style={{ background: "#ef444410", border: "1px solid #ef444430", borderRadius: 10, padding: 14 }}>
                      <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 12, marginBottom: 8 }}>📌 للتحسين</div>
                      {ai.weaknesses?.map((w, i) => (
                        <div key={i} style={{ color: "#fca5a5", fontSize: 13, direction: "rtl", textAlign: "right", marginBottom: 4 }}>• {w}</div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <h4 style={{ color: "#fff", fontWeight: 800, marginBottom: 12, direction: "rtl", textAlign: "right" }}>🚀 التوصيات الذكية</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {ai.recommendations?.slice(0, 5).map((rec, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                        style={{ background: "#ffffff08", border: `1px solid ${PRIORITY_COLOR[rec.priority]}30`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{rec.icon}</span>
                        <div style={{ flex: 1, direction: "rtl", textAlign: "right" }}>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{rec.title}</div>
                          <div style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>{rec.action}</div>
                        </div>
                        <div style={{ textAlign: "center", flexShrink: 0 }}>
                          <div style={{ color: PRIORITY_COLOR[rec.priority], fontSize: 9, fontWeight: 800, letterSpacing: "0.1em" }}>{rec.priority}</div>
                          <div style={{ color: "#22c55e", fontSize: 11, fontWeight: 700, marginTop: 2 }}>{rec.reward}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : loadingAI ? (
                <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    style={{ width: 40, height: 40, border: "3px solid #eab30820", borderTopColor: "#eab308", borderRadius: "50%", margin: "0 auto 12px" }} />
                  <p style={{ margin: 0, direction: "rtl" }}>نظام الذكاء الاصطناعي يحلل ملفك الكامل…</p>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 30 }}>
                  <button onClick={loadAnalysis} style={{ background: "#eab308", color: "#000", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 800, cursor: "pointer" }}>
                    🧠 تشغيل التحليل الذكي
                  </button>
                </div>
              )}
            </div>

            {/* Module mini-grid */}
            {data && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {data.modules.map((m, i) => (
                  <motion.a key={m.id} href={m.link}
                    initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                    style={{ display: "block", textDecoration: "none", background: "#0d0d0d", border: `1px solid ${m.status === "ACTIF" ? "#eab30830" : "#ffffff10"}`, borderRadius: 12, padding: 14, cursor: "pointer" }}
                    whileHover={{ borderColor: "#eab30860", y: -2 } as any}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: m.status === "ACTIF" ? "#22c55e" : "#ef4444", letterSpacing: "0.08em" }}>
                        {m.status === "ACTIF" ? "● ACTIF" : "○ INACTIF"}
                      </span>
                      <ScoreRing score={m.score} size={44} />
                    </div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.name}</div>
                    <div style={{ color: "#888", fontSize: 11 }}>{m.badge}</div>
                  </motion.a>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── MODULES TAB ── */}
        {activeTab === "modules" && (
          <motion.div key="modules" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}
            style={{ paddingTop: 24 }}>
            {loadingStatus ? (
              <div style={{ textAlign: "center", padding: 60, color: "#888" }}>جاري تحميل بيانات الوحدات…</div>
            ) : data ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {data.modules.map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    style={{ background: "#0d0d0d", border: `1px solid ${m.status === "ACTIF" ? "#eab30840" : "#ffffff10"}`, borderRadius: 14, padding: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>

                    {/* Score ring */}
                    <ScoreRing score={m.score} size={64} />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{m.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: m.status === "ACTIF" ? "#22c55e" : "#ef4444",
                          background: m.status === "ACTIF" ? "#22c55e15" : "#ef444415", border: `1px solid ${m.status === "ACTIF" ? "#22c55e40" : "#ef444440"}`,
                          borderRadius: 6, padding: "2px 8px", letterSpacing: "0.08em" }}>
                          {m.status === "ACTIF" ? "● ACTIF" : "○ INACTIF"}
                        </span>
                        <span style={{ color: "#eab308", fontSize: 12 }}>{m.badge}</span>
                      </div>
                      {/* Stats */}
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {Object.entries(m.stats).map(([k, v]) => (
                          <div key={k}>
                            <span style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}: </span>
                            <span style={{ color: "#ccc", fontSize: 12, fontWeight: 700 }}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    <a href={m.link} style={{ background: "#eab308", color: "#000", textDecoration: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                      {m.status === "ACTIF" ? "فتح ←" : "تفعيل →"}
                    </a>
                  </motion.div>
                ))}
              </div>
            ) : null}
          </motion.div>
        )}

        {/* ── MISSIONS TAB ── */}
        {activeTab === "missions" && (
          <motion.div key="missions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}
            style={{ paddingTop: 24 }}>
            {ai?.dailyMission ? (
              <div>
                {/* Mission card */}
                <div style={{ background: "linear-gradient(135deg, #1a1a00, #111)", border: "1px solid #eab30840", borderRadius: 16, padding: 28, marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <span style={{ fontSize: 28 }}>🎯</span>
                    <div>
                      <h3 style={{ margin: 0, color: "#eab308", fontWeight: 900, fontSize: 18, direction: "rtl" }}>
                        {ai.dailyMission.title}
                      </h3>
                      <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                        المكافأة الإجمالية: {ai.dailyMission.totalReward}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {ai.dailyMission.tasks?.map((task, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
                        style={{ display: "flex", alignItems: "center", gap: 14, background: "#ffffff08", borderRadius: 10, padding: "12px 16px" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #eab30860", display: "flex", alignItems: "center", justifyContent: "center", color: "#eab308", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <span style={{ color: "#ddd", fontSize: 14, direction: "rtl", textAlign: "right", flex: 1 }}>{task}</span>
                        <span style={{ fontSize: 18 }}>◻️</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Recommendations as missions */}
                {ai.recommendations && (
                  <div>
                    <h3 style={{ color: "#fff", fontWeight: 800, direction: "rtl", textAlign: "right", marginBottom: 14 }}>
                      🚀 توصيات الأولوية القصوى
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                      {ai.recommendations.filter(r => r.priority === "HIGH").map((rec, i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                          style={{ background: "#1a0505", border: "1px solid #ef444430", borderRadius: 12, padding: 16 }}>
                          <div style={{ fontSize: 28, marginBottom: 10 }}>{rec.icon}</div>
                          <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, direction: "rtl", textAlign: "right", marginBottom: 6 }}>{rec.title}</div>
                          <div style={{ color: "#aaa", fontSize: 12, direction: "rtl", textAlign: "right", marginBottom: 10, lineHeight: 1.5 }}>{rec.action}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#ef4444", fontSize: 10, fontWeight: 800 }}>{t("highPriority")}</span>
                            <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 12 }}>{rec.reward}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : loadingAI ? (
              <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  style={{ width: 40, height: 40, border: "3px solid #eab30820", borderTopColor: "#eab308", borderRadius: "50%", margin: "0 auto 12px" }} />
                <p style={{ direction: "rtl" }}>{t("generatingMissions")}</p>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 60 }}>
                <button onClick={loadAnalysis} style={{ background: "#eab308", color: "#000", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 800, cursor: "pointer", fontSize: 15 }}>
                  🎯 توليد مهام اليوم
                </button>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>

        {/* ── Refresh bar ── */}
        <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 12, justifyContent: "center", color: "#555", fontSize: 11 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{ width: 12, height: 12, border: "1px solid #55555580", borderTopColor: "#eab308", borderRadius: "50%" }} />
          يتجدد كل 30 ثانية · آخر تحديث: الآن
          <button onClick={() => { loadStatus(); loadAnalysis(); }}
            style={{ background: "#ffffff0a", border: "1px solid #ffffff20", color: "#888", borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer", marginLeft: 8 }}>
            🔄 تحديث الآن
          </button>
        </div>
      </div>
    </div>
  );
}
}
export default function SmartPage() {
  const { user } = useAuth();
  const { lang } = useLang();
  const t = (key: Parameters<typeof contentCopy>[1]) => contentCopy(lang, key);
  const [, nav] = useLocation();

  const [status, setStatus]   = useState<SmartData | null>(null);
  const [analysis, setAnalysis] = useState<SmartData | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingAI, setLoadingAI]   = useState(false);
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview"|"modules"|"missions">("overview");

  // ── Load status (fast) ────────────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/smart/status");
      if (!r.ok) return;
      setStatus(await r.json());
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // ── Load AI analysis (slower) ─────────────────────────────────────────────
  const loadAnalysis = useCallback(async () => {
    setLoadingAI(true);
    try {
      const r = await fetch("/api/smart/analysis");
      if (!r.ok) return;
      setAnalysis(await r.json());
    } finally {
      setLoadingAI(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadAnalysis();
    // Refresh status every 30s
    const t = setInterval(() => { loadStatus(); setTick(x => x + 1); }, 30_000);
    return () => clearInterval(t);
  }, [loadStatus, loadAnalysis]);

  if (!user) {
    return (
      <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, background: "hsl(var(--background))" }}>
        <div style={{ fontSize: 64 }}>🧠</div>
        <h2 style={{ color: "hsl(var(--primary))", fontWeight: 900, fontSize: 24, margin: 0 }}>GDN-SMART {finalLabelText(lang, "system")}</h2>
        <p style={{ color: "hsl(var(--muted-foreground))", margin: 0 }}>{t("fortressLogin")}</p>
        <button onClick={() => nav("/login")} style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none", borderRadius: 10, padding: "12px 32px", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          {t("signIn")}
        </button>
      </div>
    );
  }

  const data = status;
  const ai   = analysis?.analysis;

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ background: "hsl(var(--background))", minHeight: "100vh", padding: "0 0 60px" }}>

      {/* ── Header bar ── */}
      <div style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #111 100%)", borderBottom: "1px solid hsl(var(--primary) / 0.13)", padding: "28px 20px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {/* Brain icon */}
            <motion.div
              animate={{ boxShadow: ["0 0 10px hsl(var(--primary) / 0.25)", "0 0 30px hsl(var(--primary) / 0.5)", "0 0 10px hsl(var(--primary) / 0.25)"] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #eab308, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
              🧠
            </motion.div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, color: "hsl(var(--foreground))", fontWeight: 900, fontSize: 26, letterSpacing: "0.03em" }}>
                  GDN-<span style={{ color: "hsl(var(--primary))" }}>SMART</span>
                </h1>
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ background: "#22c55e20", border: "1px solid #22c55e60", color: "#22c55e", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>
                  ● ACTIF ✅
                </motion.span>
              </div>
              <p style={{ margin: "4px 0 0", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
                {finalLabelText(lang, "smartTagline")}
              </p>
            </div>

            {/* Overall score */}
            {data && (
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <ScoreRing score={data.overallScore} size={72} />
                <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 10, marginTop: 2 }}>{t("overallScore")}</div>
              </div>
            )}
          </div>

          {/* Stats bar */}
          {data && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ display: "flex", gap: 20, marginTop: 20, flexWrap: "wrap" }}>
              {[
                { label: "NIVEAU",    value: data.citizen.level,        suffix: "",   icon: "⚡" },
                { label: "XP",        value: data.citizen.xp,           suffix: "",   icon: "✨" },
                { label: "PIÈCES",    value: data.citizen.balance,      suffix: "",   icon: "🪙" },
                { label: "MODULES",   value: data.activeModules,        suffix: `/${data.totalModules}`, icon: "🔌" },
                { label: "STATUT",    value: -1, special: data.systemStatus, icon: "📡" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <div>
                    <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 9, letterSpacing: "0.1em" }}>{s.label}</div>
                    {s.special ? (
                      <div style={{ color: STATUS_COLOR[s.special] ?? "#fff", fontWeight: 800, fontSize: 14 }}>{s.special}</div>
                    ) : (
                      <div style={{ color: "hsl(var(--foreground))", fontWeight: 800, fontSize: 15 }}>
                        <Counter value={s.value} suffix={s.suffix} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #ffffff10", marginTop: 24 }}>
          {([
            { id: "overview",  label: "🧠 النظرة الكاملة" },
            { id: "modules",   label: "🔌 الوحدات (8)" },
            { id: "missions",  label: "🎯 مهام اليوم" },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "10px 18px", fontWeight: 700, fontSize: 13,
                color: activeTab === tab.id ? "hsl(var(--primary))" : "#888",
                borderBottom: activeTab === tab.id ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                transition: "all .2s",
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}
            style={{ paddingTop: 24 }}>

            {/* AI Analysis card */}
            <div style={{ background: "linear-gradient(135deg, #0d1117, #111827)", border: "1px solid hsl(var(--primary) / 0.19)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <h3 style={{ margin: 0, color: "hsl(var(--primary))", fontWeight: 800, fontSize: 16 }}>تحليل الذكاء الاصطناعي</h3>
                {loadingAI && (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{ width: 16, height: 16, border: "2px solid hsl(var(--primary) / 0.25)", borderTopColor: "hsl(var(--primary))", borderRadius: "50%" }} />
                )}
              </div>

              {ai ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.19)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                    <p style={{ margin: 0, color: "hsl(var(--primary))", fontWeight: 800, fontSize: 16, direction: "rtl", textAlign: "right" }}>
                      {ai.headline}
                    </p>
                  </div>
                  <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 14, direction: "rtl", textAlign: "right", lineHeight: 1.7, margin: "0 0 20px" }}>
                    {ai.overallMessage}
                  </p>

                  {/* Strengths & Weaknesses */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <div style={{ background: "#22c55e10", border: "1px solid #22c55e30", borderRadius: 10, padding: 14 }}>
                      <div style={{ color: "#22c55e", fontWeight: 800, fontSize: 12, marginBottom: 8 }}>💪 نقاط القوة</div>
                      {ai.strengths?.map((s, i) => (
                        <div key={i} style={{ color: "#a3e6b8", fontSize: 13, direction: "rtl", textAlign: "right", marginBottom: 4 }}>• {s}</div>
                      ))}
                    </div>
                    <div style={{ background: "hsl(var(--destructive) / 0.06)", border: "1px solid hsl(var(--destructive) / 0.19)", borderRadius: 10, padding: 14 }}>
                      <div style={{ color: "hsl(var(--destructive))", fontWeight: 800, fontSize: 12, marginBottom: 8 }}>📌 للتحسين</div>
                      {ai.weaknesses?.map((w, i) => (
                        <div key={i} style={{ color: "#fca5a5", fontSize: 13, direction: "rtl", textAlign: "right", marginBottom: 4 }}>• {w}</div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <h4 style={{ color: "hsl(var(--foreground))", fontWeight: 800, marginBottom: 12, direction: "rtl", textAlign: "right" }}>🚀 التوصيات الذكية</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {ai.recommendations?.slice(0, 5).map((rec, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                        style={{ background: "#ffffff08", border: `1px solid ${PRIORITY_COLOR[rec.priority]}30`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{rec.icon}</span>
                        <div style={{ flex: 1, direction: "rtl", textAlign: "right" }}>
                          <div style={{ color: "hsl(var(--foreground))", fontWeight: 700, fontSize: 14 }}>{rec.title}</div>
                          <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 12, marginTop: 2 }}>{rec.action}</div>
                        </div>
                        <div style={{ textAlign: "center", flexShrink: 0 }}>
                          <div style={{ color: PRIORITY_COLOR[rec.priority], fontSize: 9, fontWeight: 800, letterSpacing: "0.1em" }}>{rec.priority}</div>
                          <div style={{ color: "#22c55e", fontSize: 11, fontWeight: 700, marginTop: 2 }}>{rec.reward}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : loadingAI ? (
                <div style={{ textAlign: "center", padding: 40, color: "hsl(var(--muted-foreground))" }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    style={{ width: 40, height: 40, border: "3px solid hsl(var(--primary) / 0.13)", borderTopColor: "hsl(var(--primary))", borderRadius: "50%", margin: "0 auto 12px" }} />
                  <p style={{ margin: 0, direction: "rtl" }}>نظام الذكاء الاصطناعي يحلل ملفك الكامل…</p>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 30 }}>
                  <button onClick={loadAnalysis} style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 800, cursor: "pointer" }}>
                    🧠 تشغيل التحليل الذكي
                  </button>
                </div>
              )}
            </div>

            {/* Module mini-grid */}
            {data && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {data.modules.map((m, i) => (
                  <motion.a key={m.id} href={m.link}
                    initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                    style={{ display: "block", textDecoration: "none", background: "hsl(var(--card))", border: `1px solid ${m.status === "ACTIF" ? "hsl(var(--primary) / 0.19)" : "#ffffff10"}`, borderRadius: 12, padding: 14, cursor: "pointer" }}
                    whileHover={{ borderColor: "hsl(var(--primary) / 0.38)", y: -2 } as any}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: m.status === "ACTIF" ? "#22c55e" : "#ef4444", letterSpacing: "0.08em" }}>
                        {m.status === "ACTIF" ? "● ACTIF" : "○ INACTIF"}
                      </span>
                      <ScoreRing score={m.score} size={44} />
                    </div>
                    <div style={{ color: "hsl(var(--foreground))", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.name}</div>
                    <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 11 }}>{m.badge}</div>
                  </motion.a>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── MODULES TAB ── */}
        {activeTab === "modules" && (
          <motion.div key="modules" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}
            style={{ paddingTop: 24 }}>
            {loadingStatus ? (
              <div style={{ textAlign: "center", padding: 60, color: "hsl(var(--muted-foreground))" }}>جاري تحميل بيانات الوحدات…</div>
            ) : data ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {data.modules.map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    style={{ background: "hsl(var(--card))", border: `1px solid ${m.status === "ACTIF" ? "hsl(var(--primary) / 0.25)" : "#ffffff10"}`, borderRadius: 14, padding: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>

                    {/* Score ring */}
                    <ScoreRing score={m.score} size={64} />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ color: "hsl(var(--foreground))", fontWeight: 800, fontSize: 16 }}>{m.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: m.status === "ACTIF" ? "#22c55e" : "#ef4444",
                          background: m.status === "ACTIF" ? "#22c55e15" : "hsl(var(--destructive) / 0.08)", border: `1px solid ${m.status === "ACTIF" ? "#22c55e40" : "hsl(var(--destructive) / 0.25)"}`,
                          borderRadius: 6, padding: "2px 8px", letterSpacing: "0.08em" }}>
                          {m.status === "ACTIF" ? "● ACTIF" : "○ INACTIF"}
                        </span>
                        <span style={{ color: "hsl(var(--primary))", fontSize: 12 }}>{m.badge}</span>
                      </div>
                      {/* Stats */}
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {Object.entries(m.stats).map(([k, v]) => (
                          <div key={k}>
                            <span style={{ color: "hsl(var(--muted-foreground))", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}: </span>
                            <span style={{ color: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 700 }}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    <a href={m.link} style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", textDecoration: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                      {m.status === "ACTIF" ? "فتح ←" : "تفعيل →"}
                    </a>
                  </motion.div>
                ))}
              </div>
            ) : null}
          </motion.div>
        )}

        {/* ── MISSIONS TAB ── */}
        {activeTab === "missions" && (
          <motion.div key="missions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}
            style={{ paddingTop: 24 }}>
            {ai?.dailyMission ? (
              <div>
                {/* Mission card */}
                <div style={{ background: "linear-gradient(135deg, #1a1a00, #111)", border: "1px solid hsl(var(--primary) / 0.25)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <span style={{ fontSize: 28 }}>🎯</span>
                    <div>
                      <h3 style={{ margin: 0, color: "hsl(var(--primary))", fontWeight: 900, fontSize: 18, direction: "rtl" }}>
                        {ai.dailyMission.title}
                      </h3>
                      <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                        المكافأة الإجمالية: {ai.dailyMission.totalReward}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {ai.dailyMission.tasks?.map((task, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
                        style={{ display: "flex", alignItems: "center", gap: 14, background: "#ffffff08", borderRadius: 10, padding: "12px 16px" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid hsl(var(--primary) / 0.38)", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--primary))", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <span style={{ color: "hsl(var(--muted-foreground))", fontSize: 14, direction: "rtl", textAlign: "right", flex: 1 }}>{task}</span>
                        <span style={{ fontSize: 18 }}>◻️</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Recommendations as missions */}
                {ai.recommendations && (
                  <div>
                    <h3 style={{ color: "hsl(var(--foreground))", fontWeight: 800, direction: "rtl", textAlign: "right", marginBottom: 14 }}>
                      🚀 توصيات الأولوية القصوى
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                      {ai.recommendations.filter(r => r.priority === "HIGH").map((rec, i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                          style={{ background: "#1a0505", border: "1px solid hsl(var(--destructive) / 0.19)", borderRadius: 12, padding: 16 }}>
                          <div style={{ fontSize: 28, marginBottom: 10 }}>{rec.icon}</div>
                          <div style={{ color: "hsl(var(--foreground))", fontWeight: 800, fontSize: 15, direction: "rtl", textAlign: "right", marginBottom: 6 }}>{rec.title}</div>
                          <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 12, direction: "rtl", textAlign: "right", marginBottom: 10, lineHeight: 1.5 }}>{rec.action}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "hsl(var(--destructive))", fontSize: 10, fontWeight: 800 }}>{t("highPriority")}</span>
                            <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 12 }}>{rec.reward}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : loadingAI ? (
              <div style={{ textAlign: "center", padding: 60, color: "hsl(var(--muted-foreground))" }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  style={{ width: 40, height: 40, border: "3px solid hsl(var(--primary) / 0.13)", borderTopColor: "hsl(var(--primary))", borderRadius: "50%", margin: "0 auto 12px" }} />
                <p style={{ direction: "rtl" }}>{t("generatingMissions")}</p>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 60 }}>
                <button onClick={loadAnalysis} style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 800, cursor: "pointer", fontSize: 15 }}>
                  🎯 توليد مهام اليوم
                </button>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>

        {/* ── Refresh bar ── */}
        <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 12, justifyContent: "center", color: "hsl(var(--muted-foreground))", fontSize: 11 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{ width: 12, height: 12, border: "1px solid #55555580", borderTopColor: "hsl(var(--primary))", borderRadius: "50%" }} />
          يتجدد كل 30 ثانية · آخر تحديث: الآن
          <button onClick={() => { loadStatus(); loadAnalysis(); }}
            style={{ background: "#ffffff0a", border: "1px solid #ffffff20", color: "hsl(var(--muted-foreground))", borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer", marginLeft: 8 }}>
            🔄 تحديث الآن
          </button>
        </div>
      </div>
    </div>
  );
}
