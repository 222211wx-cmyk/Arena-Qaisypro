import { motion } from "framer-motion";
import { Link } from "wouter";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import {
  Crown, Globe, Shield, Scale, Cpu, BrainCircuit, Vote,
  Gamepad2, Lock, FileCheck, Award, Landmark, Users,
  Zap, ArrowRight, CheckCircle2, Star, TrendingUp, Network
} from "lucide-react";

const CERTIFICATIONS = [
  {
    icon: Shield,
    code: "ISO/IEC 27001",
    label: "cert_iso",
    color: "text-blue-400",
    border: "border-blue-400/30",
    bg: "bg-blue-400/5",
  },
  {
    icon: Lock,
    code: "GDPR 2016/679",
    label: "cert_gdpr",
    color: "text-green-400",
    border: "border-green-400/30",
    bg: "bg-green-400/5",
  },
  {
    icon: FileCheck,
    code: "SSL/TLS 1.3",
    label: "cert_ssl",
    color: "text-primary",
    border: "border-primary/30",
    bg: "bg-primary/5",
  },
  {
    icon: Award,
    code: "OpenAI Verified",
    label: "cert_openai",
    color: "text-purple-400",
    border: "border-purple-400/30",
    bg: "bg-purple-400/5",
  },
  {
    icon: Landmark,
    code: "CCPA Compliant",
    label: "cert_ccpa",
    color: "text-yellow-400",
    border: "border-yellow-400/30",
    bg: "bg-yellow-400/5",
  },
  {
    icon: Globe,
    code: "W3C Standard",
    label: "cert_w3c",
    color: "text-orange-400",
    border: "border-orange-400/30",
    bg: "bg-orange-400/5",
  },
];

const PILLARS = [
  {
    icon: Crown,
    key: "empire_pillar_sovereignty",
    desc: "empire_pillar_sovereignty_desc",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  {
    icon: Scale,
    key: "empire_pillar_law",
    desc: "empire_pillar_law_desc",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: BrainCircuit,
    key: "empire_pillar_ai",
    desc: "empire_pillar_ai_desc",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Network,
    key: "empire_pillar_network",
    desc: "empire_pillar_network_desc",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
];

const RIGHTS = [
  "empire_right_1",
  "empire_right_2",
  "empire_right_3",
  "empire_right_4",
  "empire_right_5",
  "empire_right_6",
];

const ARCHITECTURE = [
  { icon: Gamepad2,    key: "empire_arch_gaming",     color: "text-primary" },
  { icon: Vote,        key: "empire_arch_voting",     color: "text-purple-400" },
  { icon: BrainCircuit,key: "empire_arch_ai",         color: "text-green-400" },
  { icon: Globe,       key: "empire_arch_social",     color: "text-yellow-400" },
  { icon: Lock,        key: "empire_arch_security",   color: "text-red-400" },
  { icon: Scale,       key: "empire_arch_compliance", color: "text-blue-400" },
];

export default function Empire() {
  const { t } = useLang();

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-10 max-w-6xl mx-auto space-y-16">

      {/* ── Imperial Header ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-yellow-400/10 border-2 border-yellow-400/40 flex items-center justify-center">
            <Crown className="w-10 h-10 text-yellow-400" />
          </div>
        </div>
        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-wider neon-text-glow">
          {t("empire_title")}
        </h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest max-w-2xl mx-auto">
          {t("empire_sub")}
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Badge className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 font-mono text-xs px-3 py-1">
            ⚖️ {t("empire_badge_legal")}
          </Badge>
          <Badge className="bg-primary/10 text-primary border border-primary/30 font-mono text-xs px-3 py-1">
            🤖 {t("empire_badge_ai")}
          </Badge>
          <Badge className="bg-purple-400/10 text-purple-400 border border-purple-400/30 font-mono text-xs px-3 py-1">
            🌍 {t("empire_badge_global")}
          </Badge>
        </div>
      </motion.div>

      {/* ── 4 Sovereignty Pillars ────────────────────────────────── */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PILLARS.map((p, i) => (
          <motion.div
            key={p.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`${p.bg} border-border/50 h-full`}>
              <CardContent className="p-6 space-y-3">
                <div className={`w-10 h-10 rounded-lg ${p.bg} border border-current/20 flex items-center justify-center`}>
                  <p.icon className={`w-5 h-5 ${p.color}`} />
                </div>
                <h3 className={`font-bold uppercase tracking-wider text-sm ${p.color}`}>{t(p.key)}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(p.desc)}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── International Certifications ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-6"
      >
        <div className="text-center">
          <h2 className="text-2xl font-black uppercase tracking-wider mb-2">{t("empire_certs_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("empire_certs_sub")}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CERTIFICATIONS.map((cert, i) => (
            <motion.div
              key={cert.code}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + i * 0.06 }}
            >
              <Card className={`${cert.bg} ${cert.border} border hover:scale-105 transition-transform`}>
                <CardContent className="p-4 text-center space-y-2">
                  <cert.icon className={`w-6 h-6 mx-auto ${cert.color}`} />
                  <p className={`text-xs font-black font-mono ${cert.color}`}>{cert.code}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{t(cert.label)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Platform Architecture ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        <div className="text-center">
          <h2 className="text-2xl font-black uppercase tracking-wider mb-2">{t("empire_arch_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("empire_arch_sub")}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ARCHITECTURE.map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.07 }}
            >
              <Card className="bg-card/30 border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-5 flex items-center gap-3">
                  <item.icon className={`w-8 h-8 ${item.color} shrink-0`} />
                  <p className="font-bold uppercase tracking-wider text-sm">{t(item.key)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Digital Rights Charter ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-primary/10 to-purple-500/5 border-primary/30">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Scale className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-wider">{t("empire_charter_title")}</h2>
                <p className="text-xs text-muted-foreground">{t("empire_charter_sub")}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {RIGHTS.map((key) => (
                <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-background/40 border border-primary/10">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground/80">{t(key)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── AI Sovereignty Statement ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <Card className="bg-card/30 border-primary/20">
          <CardContent className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <BrainCircuit className="w-8 h-8 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-xl font-black uppercase tracking-wider mb-1">{t("empire_ai_title")}</h2>
                <p className="text-sm text-muted-foreground">{t("empire_ai_sub")}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: Shield,    k: "empire_ai_1", v: "empire_ai_1v" },
                { icon: TrendingUp,k: "empire_ai_2", v: "empire_ai_2v" },
                { icon: Users,     k: "empire_ai_3", v: "empire_ai_3v" },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-background/40 border border-primary/15 space-y-2">
                  <item.icon className="w-5 h-5 text-primary" />
                  <p className="font-bold uppercase tracking-wider text-xs">{t(item.k)}</p>
                  <p className="text-xs text-muted-foreground">{t(item.v)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Global Stats ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { icon: Globe,   val: "180+",   key: "empire_stat_countries", color: "text-primary" },
          { icon: Users,   val: "156K+",  key: "empire_stat_users",     color: "text-green-400" },
          { icon: Zap,     val: "99.9%",  key: "empire_stat_uptime",    color: "text-yellow-400" },
          { icon: Star,    val: "2.4M+",  key: "empire_stat_votes",     color: "text-purple-400" },
        ].map((s, i) => (
          <Card key={i} className="bg-card/30 border-border/50 text-center">
            <CardContent className="p-5">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className={`text-3xl font-black font-mono ${s.color}`}>{s.val}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{t(s.key)}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* ── Legal Navigation ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        <Link href="/legal/terms">
          <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 gap-2">
            <FileCheck className="w-4 h-4" />
            {t("empire_btn_terms")}
          </Button>
        </Link>
        <Link href="/legal/privacy">
          <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 gap-2">
            <Lock className="w-4 h-4" />
            {t("empire_btn_privacy")}
          </Button>
        </Link>
        <Link href="/hub">
          <Button className="bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-primary-foreground gap-2 font-bold uppercase tracking-wider">
            {t("empire_btn_hub")} <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </motion.div>

    </div>
  );
}
