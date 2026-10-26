/**
 * /amis — AMIS - لوحة التحكم
 * Admin-only site control area. Links the existing dashboard, missions/task
 * surfaces, 70/30 finance, wallet, and statistics. Non-admins are blocked here.
 */
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  LayoutDashboard, BrainCircuit, Coins, Wallet, BarChart3,
  ShieldAlert, Lock, ChevronRight, Landmark,
} from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { COMMUNITY_T } from "@/i18n/community-pages";
import { MessagingSubscriptions } from "@/components/MessagingSubscriptions";

type Panel = {
  id: string;
  path: string;
  title: keyof typeof COMMUNITY_T.en;
  desc: keyof typeof COMMUNITY_T.en;
  icon: React.ReactNode;
};

const PANELS: Panel[] = [
  {
    id: "dashboard",
    path: "/dashboard",
    title: "dashboard", desc: "dashboard_desc",
    icon: <LayoutDashboard className="w-6 h-6" />,
  },
  {
    id: "missions",
    path: "/growth",
    title: "missions", desc: "missions_desc",
    icon: <BrainCircuit className="w-6 h-6" />,
  },
  {
    id: "finance",
    path: "/admin/finance",
    title: "finance", desc: "finance_desc",
    icon: <Coins className="w-6 h-6" />,
  },
  {
    id: "revenue",
    path: "/admin/revenue",
    title: "revenue", desc: "revenue_desc",
    icon: <Landmark className="w-6 h-6" />,
  },
  {
    id: "wallet",
    path: "/wallet",
    title: "wallet", desc: "wallet_desc",
    icon: <Wallet className="w-6 h-6" />,
  },
  {
    id: "statistics",
    path: "/leaderboard",
    title: "statistics", desc: "statistics_desc",
    icon: <BarChart3 className="w-6 h-6" />,
  },
];

export default function AmisPage() {
  const { user, loading } = useAuth();
  const { lang } = useLang();
  const ct = COMMUNITY_T[lang] ?? COMMUNITY_T.en;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [, setLocation] = useLocation();

  // Hard redirect non-admins away from the control area.
  useEffect(() => {
    if (loading || user?.isAdmin) return;
    const t = setTimeout(() => setLocation("/login"), 1600);
    return () => clearTimeout(t);
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div dir={dir} className="min-h-[calc(100dvh-8rem)] p-4 max-w-5xl mx-auto space-y-4">
        <div className="skeleton h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div
        dir={dir}
        className="min-h-[calc(100dvh-8rem)] flex flex-col items-center justify-center gap-4 p-4 text-center"
        data-testid="amis-blocked"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="w-8 h-8" />
        </span>
        <h1 className="text-2xl font-black uppercase tracking-wider text-foreground">
           AMIS — {ct.admin_title}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
           {ct.admin_only}
        </p>
        <Button onClick={() => setLocation("/login")} data-testid="button-back-choice">
          <Lock className="w-4 h-4" />
           {ct.back_choice}
        </Button>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-[calc(100dvh-8rem)] max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutDashboard className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-foreground">
               AMIS <span className="text-primary text-lg align-middle">{ct.admin_title}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
               {ct.admin_subtitle} — {user.username}
            </p>
          </div>
        </div>
      </motion.div>

      <MessagingSubscriptions />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PANELS.map((panel, i) => (
          <motion.div
            key={panel.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
          >
            <Link href={panel.path} data-testid={`panel-${panel.id}`}>
              <Card className="empire-card h-full cursor-pointer border-primary/20 bg-card/40 backdrop-blur-sm hover:border-primary/50">
                <CardContent className="pt-6 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {panel.icon}
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                   <h2 className="mt-4 text-base font-bold text-foreground">{ct[panel.title]}</h2>
                   <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{ct[panel.desc]}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
