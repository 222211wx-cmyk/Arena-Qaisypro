/**
 * SmartDomainWidget — compact Smart-score badge injected in every domain page.
 * Shows real-time score, status and one recommendation for the given domain.
 * Stays non-intrusive: max 80 px tall, dark, links to /smart.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { sharedCopy } from "@/i18n/shared-components-copy";

interface DomainModule {
  id: string;
  name: string;
  status: "ACTIF" | "INACTIF";
  score: number;
  badge: string;
  link: string;
}

interface SmartStatus {
  modules: DomainModule[];
  overallScore: number;
  systemStatus: string;
  citizen: { username: string; level: number };
}

const DOMAIN_EMOJI: Record<string, string> = {
  gaming:       "🎮",
  education:    "📚",
  business:     "💼",
  social:       "🌍",
  competitions: "🏅",
  xp:           "⚡",
  stream:       "📡",
  archon:       "🧬",
};

interface Props {
  domainId: string;
  /** Optional override label */
  label?: string;
  /** Whether to collapse to a thin bar. Default false. */
  compact?: boolean;
}

export default function SmartDomainWidget({ domainId, label, compact = false }: Props) {
  const { user } = useAuth();
  const { lang } = useLang();
  const copy = sharedCopy(lang).smart;
  const isRTL = lang === "ar";
  const [, nav] = useLocation();
  const [mod, setMod] = useState<DomainModule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch("/api/smart/status")
      .then(r => r.ok ? r.json() : null)
      .then((data: SmartStatus | null) => {
        if (!data) return;
        const found = data.modules.find(m => m.id === domainId);
        if (found) setMod(found);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, domainId]);

  // Not logged in → nothing
  if (!user) return null;
  // Loading → skeleton
  if (loading) return (
    <div style={{
      background: "#0a0a0a", border: "1px solid #ffffff08",
      borderRadius: 10, padding: "10px 16px",
      display: "flex", alignItems: "center", gap: 10,
      marginBottom: 16, opacity: 0.4,
    }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a1a1a" }} />
      <div style={{ width: 120, height: 10, borderRadius: 4, background: "#1a1a1a" }} />
    </div>
  );
  // No module found → nothing
  if (!mod) return null;

  const isActive = mod.status === "ACTIF";
  const color = isActive ? "#22c55e" : "#f97316";
  const emoji = DOMAIN_EMOJI[domainId] ?? "🔌";
  const title = label ?? copy.domains[domainId as keyof typeof copy.domains] ?? mod.name;

  // Compact mode: single line pill
  if (compact) {
    return (
      <motion.div
        dir={isRTL ? "rtl" : "ltr"}
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        onClick={() => nav("/smart")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: `${color}10`, border: `1px solid ${color}30`,
          borderRadius: 8, padding: "5px 12px", cursor: "pointer",
          userSelect: "none",
        }}>
        <span style={{ fontSize: 13 }}>{emoji}</span>
        <span style={{ color, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em" }}>
          {isActive ? `● ${copy.active}` : `○ ${copy.inactive}`}
        </span>
        <span style={{ color: "#888", fontSize: 11 }}>{title}</span>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 12 }}>{mod.score}/100</span>
        <span style={{ color: "#555", fontSize: 10 }}>
          {isRTL ? `${copy.recommendation} ←` : `→ ${copy.recommendation}`}
        </span>
      </motion.div>
    );
  }

  // Full widget
  return (
    <motion.div
      dir={isRTL ? "rtl" : "ltr"}
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(135deg, #0a0a0a, #0d0d0d)",
        border: `1px solid ${color}25`,
        borderInlineStart: `3px solid ${color}`,
        borderRadius: 12,
        padding: "12px 18px",
        display: "flex", alignItems: "center", gap: 16,
        marginBottom: 20,
        cursor: "pointer",
        flexWrap: "wrap",
      }}
      onClick={() => nav("/smart")}
      whileHover={{ borderColor: `${color}60` } as any}>

      {/* Score circle */}
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        border: `2px solid ${color}50`,
        background: `${color}10`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 900, color }}>{mod.score}</span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14 }}>{emoji}</span>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{title}</span>
          <motion.span
            animate={{ opacity: isActive ? [1, 0.5, 1] : 1 }}
            transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
            style={{
              background: `${color}15`, border: `1px solid ${color}40`,
              color, borderRadius: 5, padding: "1px 7px",
              fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
            }}>
            {isActive ? `● ${copy.active}` : `○ ${copy.inactive}`}
          </motion.span>
        </div>
        <div style={{ color: "#666", fontSize: 11, marginTop: 3 }}>{mod.badge}</div>
      </div>

      {/* Recommendation pill */}
      <div style={{ textAlign: "end", flexShrink: 0 }}>
        <div style={{ color: "#eab308", fontSize: 10, fontWeight: 700, marginBottom: 2 }}>
          🧠 {copy.title}
        </div>
        <div style={{ color: "#555", fontSize: 10 }}>
          {isActive ? copy.progressing : copy.activate} {isRTL ? "←" : "→"}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", background: "#ffffff0a", borderRadius: 4, height: 3, marginTop: 4 }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${mod.score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ height: "100%", background: color, borderRadius: 4 }} />
      </div>
    </motion.div>
  );
}
