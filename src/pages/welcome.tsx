import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { useEffect } from "react";
import {
  Gamepad2, Vote, Radio, Clock, Crown, BrainCircuit, Brain,
  Wallet, LayoutDashboard, Trophy, Gift, Zap, ArrowRight,
  CheckCircle, Star
} from "lucide-react";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { task39Text } from "@/i18n/task39";
import { localeForLang } from "@/i18n/locale-surfaces-a-copy";

const PATHS = [
  {
    key: "welcome_path_hub",
    desc: "welcome_path_hub_desc",
    path: "/hub",
    icon: Radio,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/40",
    glow: "hover:shadow-[0_0_30px_rgba(0,212,255,0.2)]",
    badge: "LIVE",
    badgeColor: "bg-primary/20 text-primary border-primary/40",
    size: "lg",
  },
  {
    key: "welcome_path_games",
    desc: "welcome_path_games_desc",
    path: "/games",
    icon: Gamepad2,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/40",
    glow: "hover:shadow-[0_0_30px_rgba(250,204,21,0.2)]",
    badge: "EARN",
    badgeColor: "bg-yellow-400/20 text-yellow-400 border-yellow-400/40",
    size: "lg",
  },
  {
    key: "welcome_path_globalstar",
    desc: "welcome_path_globalstar_desc",
    path: "/games/globalstar",
    icon: Vote,
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/40",
    glow: "hover:shadow-[0_0_30px_rgba(74,222,128,0.2)]",
    badge: "VOTE",
    badgeColor: "bg-green-400/20 text-green-400 border-green-400/40",
    size: "md",
  },
  {
    key: "welcome_path_chronicle",
    desc: "welcome_path_chronicle_desc",
    path: "/chronicle",
    icon: Clock,
    color: "text-yellow-300",
    bg: "bg-yellow-300/10",
    border: "border-yellow-300/30",
    glow: "hover:shadow-[0_0_30px_rgba(253,224,71,0.15)]",
    badge: "NEW",
    badgeColor: "bg-yellow-300/20 text-yellow-300 border-yellow-300/30",
    size: "md",
  },
  {
    key: "welcome_path_ai",
    desc: "welcome_path_ai_desc",
    path: "/chat",
    icon: BrainCircuit,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/30",
    glow: "hover:shadow-[0_0_30px_rgba(192,132,252,0.2)]",
    badge: "AI",
    badgeColor: "bg-purple-400/20 text-purple-400 border-purple-400/30",
    size: "md",
  },
  {
    key: "welcome_path_empire",
    desc: "welcome_path_empire_desc",
    path: "/empire",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    glow: "hover:shadow-[0_0_30px_rgba(251,191,36,0.15)]",
    badge: "⚖️",
    badgeColor: "bg-amber-400/20 text-amber-400 border-amber-400/30",
    size: "sm",
  },
  {
    key: "welcome_path_leaderboard",
    desc: "welcome_path_leaderboard_desc",
    path: "/leaderboard",
    icon: Trophy,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/30",
    glow: "hover:shadow-[0_0_30px_rgba(251,146,60,0.15)]",
    badge: "TOP",
    badgeColor: "bg-orange-400/20 text-orange-400 border-orange-400/30",
    size: "sm",
  },
  {
    key: "welcome_path_dashboard",
    desc: "welcome_path_dashboard_desc",
    path: "/dashboard",
    icon: LayoutDashboard,
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/30",
    glow: "hover:shadow-[0_0_30px_rgba(56,189,248,0.15)]",
    badge: "ME",
    badgeColor: "bg-sky-400/20 text-sky-400 border-sky-400/30",
    size: "sm",
  },
  {
    key: "welcome_path_growth",
    desc: "welcome_path_growth_desc",
    path: "/growth",
    icon: Brain,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/30",
    glow: "hover:shadow-[0_0_30px_rgba(167,139,250,0.2)]",
    badge: "NLP",
    badgeColor: "bg-violet-400/20 text-violet-400 border-violet-400/30",
    size: "md",
  },
];

function getRank(xp: number) {
  if (xp < 500)  return { label: "Bronze I",  color: "#cd7f32" };
  if (xp < 1000) return { label: "Bronze II", color: "#cd7f32" };
  if (xp < 2000) return { label: "Silver I",  color: "#aaa9ad" };
  if (xp < 3500) return { label: "Silver II", color: "#aaa9ad" };
  if (xp < 5000) return { label: "Gold I",    color: "#ffd700" };
  if (xp < 7500) return { label: "Gold II",   color: "#ffd700" };
  return { label: "Diamond", color: "#00d4ff" };
}

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const { t, lang } = useLang();

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [user, loading, setLocation]);

  if (loading || !user) return null;

  const rank = getRank(user.xp);
  const locale = localeForLang(lang);

  const lgPaths = PATHS.filter(p => p.size === "lg");
  const mdPaths = PATHS.filter(p => p.size === "md");
  const smPaths = PATHS.filter(p => p.size === "sm");

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-10 max-w-6xl mx-auto space-y-10" dir={lang === "ar" ? "rtl" : "ltr"}>

      {/* ── Welcome Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3 relative"
      >
        {/* ambient glow */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-64 h-40 bg-primary/8 rounded-full blur-[80px]" />
          <div className="absolute top-0 right-1/3 w-64 h-40 bg-yellow-400/5 rounded-full blur-[80px]" />
        </div>

        {/* User identity card */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-primary/30 bg-primary/5 mb-2"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-black text-primary text-sm">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="text-start">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">{t("welcome_back")}</p>
            <p className="font-black text-primary text-sm uppercase tracking-wider">{user.username}</p>
          </div>
          <div className="w-px h-6 bg-primary/20" />
          <span className="text-xs font-bold font-mono" style={{ color: rank.color }}>
            {rank.label}
          </span>
        </motion.div>

        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
          {t("welcome_title_1")}
          <br />
          <span className="neon-text-glow">{t("welcome_title_2")}</span>
        </h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest max-w-lg mx-auto">
          {t("welcome_sub")}
        </p>

        {/* Stats strip */}
        <div className="flex flex-wrap justify-center gap-4 pt-3">
          {[
            { icon: Zap,     val: user.balance.toLocaleString(locale), label: t("coins"), color: "text-primary" },
            { icon: Trophy,  val: user.wins,                     label: t("wins"),         color: "text-yellow-400" },
            { icon: Star,    val: user.xp,                       label: "XP",              color: "text-purple-400" },
            ...(user.canClaimDaily ? [{
              icon: Gift, val: "+100", label: t("daily_claim").replace("!", ""), color: "text-green-400"
            }] : []),
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-sm">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <span className={`font-black font-mono ${s.color}`}>{s.val}</span>
              <span className="text-muted-foreground text-xs">{s.label}</span>
            </div>
          ))}
        </div>

        {user.canClaimDaily && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-400/10 border border-green-400/30 text-green-400 text-xs font-bold"
          >
            <Gift className="w-3.5 h-3.5" />
            {t("daily_claim")}
            <Link href="/dashboard" className="underline underline-offset-2 hover:text-green-300">
              {t("claim_btn")}
            </Link>
          </motion.div>
        )}
      </motion.div>

      {/* ── Choice Grid ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-center text-xs font-black uppercase tracking-widest text-muted-foreground">
          {t("welcome_choose")}
        </p>

        {/* Row 1 — 2 large cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lgPaths.map((p, i) => (
            <PathCard key={p.key} item={p} index={i} t={t} lang={lang} large />
          ))}
        </div>

        {/* Row 2 — 3 medium cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {mdPaths.map((p, i) => (
            <PathCard key={p.key} item={p} index={i + 2} t={t} lang={lang} />
          ))}
        </div>

        {/* Row 3 — 4 small cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {smPaths.map((p, i) => (
            <PathCard key={p.key} item={p} index={i + 5} t={t} lang={lang} small />
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Path Card Component ───────────────────────────────────────────────────────
function PathCard({
  item, index, t, lang, large, small
}: {
  item: typeof PATHS[0];
  index: number;
  t: (k: string) => string;
  lang: import("@/contexts/LangContext").Lang;
  large?: boolean;
  small?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link href={item.path}>
        <Card className={`
          cursor-pointer border transition-all duration-300 group overflow-hidden
          ${item.border} ${item.bg} ${item.glow}
          ${large ? "h-40" : small ? "h-24" : "h-32"}
        `}>
          <CardContent className={`h-full flex flex-col justify-between ${large ? "p-6" : small ? "p-4" : "p-5"}`}>
            <div className="flex items-start justify-between">
              <div className={`rounded-xl flex items-center justify-center ${item.bg} border border-current/20 ${large ? "w-12 h-12" : "w-9 h-9"}`}>
                <item.icon className={`${item.color} ${large ? "w-6 h-6" : "w-4 h-4"}`} />
              </div>
              <Badge className={`text-xs border font-mono ${item.badgeColor}`}>
                {item.badge === "LIVE" ? task39Text(lang, "live") : item.badge === "EARN" ? task39Text(lang, "earn") : item.badge === "VOTE" ? task39Text(lang, "vote") : item.badge === "NEW" ? task39Text(lang, "new") : item.badge === "TOP" ? task39Text(lang, "top") : item.badge}
              </Badge>
            </div>

            <div>
              <p className={`font-black uppercase tracking-wider ${item.color} ${large ? "text-lg" : small ? "text-xs" : "text-sm"}`}>
                {t(item.key)}
              </p>
              {!small && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {t(item.desc)}
                </p>
              )}
            </div>

            {/* Hover arrow */}
            <div className={`absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity`}>
              <ArrowRight className={`w-4 h-4 ${item.color}`} />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
