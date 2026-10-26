import { useState } from "react";
import { useLocation, useSearch, Link, Redirect } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import {
  Lock, User, AlertCircle, LayoutDashboard, MessageSquare,
  Users, Compass, ArrowLeft, ShieldCheck, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { coreCopy } from "@/i18n/core-auth-copy";
import { unlimitedMessagingAccessCopy } from "@/lib/messaging-subscription-copy";
import { recoveryCopy } from "@/i18n/recovery-copy";
import { recoveryEnrollmentReturnPath, recoveryRoute } from "@/lib/recovery-links";
import { MESSAGES_ENTRY_PATH, messagesAuthUrl, messagesReturnPath } from "@/lib/messages-entry";
import { offlineRecoveryCopy } from "@/i18n/offline-recovery-copy";

const BRAND_STATEMENT =
  "منصة إمبراطورية حديثة - سمارت ودكاء اصطناعي حيوي مستقل ذات نظام داخلي سمارت لتطوير الذات والتنبؤات المستقبلية";

type Door = {
  id: string;
  path: string;
  title: string;
  subtitle: string;
  desc: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const DOORS: Door[] = [
  {
    id: "amis",
    path: "/amis",
    title: "AMIS",
    subtitle: "لوحة التحكم",
    desc: "Site control — dashboard, missions, finance, wallet, statistics.",
    icon: <LayoutDashboard className="w-6 h-6" />,
    adminOnly: true,
  },
  {
    id: "messageri",
    path: MESSAGES_ENTRY_PATH,
    title: "MESSAGERI",
    subtitle: "المراسلات",
    desc: "Public chat, groups, and messaging legends and non-private citizens.",
    icon: <MessageSquare className="w-6 h-6" />,
  },
  {
    id: "social",
    path: "/social",
    title: "SOCIAL",
    subtitle: "جهات الاتصال",
    desc: "Citizen contacts and social communication tools.",
    icon: <Users className="w-6 h-6" />,
  },
  {
    id: "explore",
    path: "/hub",
    title: "ARENA",
    subtitle: "الاستكشاف",
    desc: "Arena, missions, shop, games, GlobalStar, and profile.",
    icon: <Compass className="w-6 h-6" />,
  },
];

export default function Login({ messagesEntry = false, returnTo }: { messagesEntry?: boolean; returnTo?: string }) {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { login, user } = useAuth();
  const { lang } = useLang();
  const copy = coreCopy(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  const destination = returnTo ?? messagesReturnPath(search) ?? recoveryEnrollmentReturnPath(search);
  const messengerLogin = messagesEntry || messagesReturnPath(search) !== null;
  const [mode, setMode] = useState<"choice" | "auth">(messengerLogin || destination !== null ? "auth" : "choice");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
       await login(username.trim(), password, rememberMe);
      if (destination) setLocation(destination);
      else setMode("choice");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : copy.authFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const enterDoor = (door: Door) => {
    if (door.adminOnly && !user?.isAdmin) {
      if (!user) { setMode("auth"); return; }
      setError(copy.adminDenied);
      return;
    }
    setLocation(door.path);
  };

  // A restored cookie needs no second login; keep the room/call intent intact.
  if (user && destination) return <Redirect to={destination} replace />;

  return (
    <div
      dir={dir}
      className="min-h-[calc(100dvh-4rem)] flex items-center justify-center p-4 relative overflow-hidden"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[720px] max-h-[720px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl z-10 space-y-8"
      >
        {/* ── Brand header ── */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-[0.15em] imperial-gold">
            {messengerLogin ? "Hm Messages" : "ARENA QAISYPRO"}
          </h1>
          {!messengerLogin && <p
            className="mx-auto max-w-2xl text-sm sm:text-base leading-relaxed text-muted-foreground"
            data-testid="text-brand-statement"
          >
            {BRAND_STATEMENT}
          </p>}
        </div>

        <div role="note" data-testid="notice-single-account" className="mx-auto max-w-2xl rounded-md border border-primary/30 bg-primary/10 p-3 text-xs leading-relaxed text-muted-foreground space-y-2">
          <p>{copy.singleAccount}</p>
          <p>{copy.sessionNotice}</p>
          <p>{messengerLogin ? unlimitedMessagingAccessCopy(lang) : copy.accessNotice}</p>
        </div>

        {messengerLogin || mode === "auth" ? (
          /* ── Auth form ── */
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="mx-auto w-full max-w-md"
          >
            <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-[0_0_50px_rgba(0,212,255,0.1)]">
              <CardContent className="pt-6">
                {!messengerLogin && <button
                  type="button"
                  onClick={() => { setMode("choice"); setError(""); }}
                  className="mb-4 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                  data-testid="button-back-to-choice"
                >
                  <ArrowLeft className="w-3 h-3" />
                  {copy.back}
                </button>}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs uppercase tracking-widest text-muted-foreground">
                      {copy.playerName}
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-primary/50" />
                      <Input
                        id="username"
                        type="text"
                        placeholder={copy.usernamePlaceholder}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 bg-background/50 border-primary/30 focus-visible:ring-primary/50 focus-visible:border-primary transition-all h-12"
                        required
                        autoComplete="username"
                        data-testid="input-username"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground">
                      {copy.password}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-primary/50" />
                      <Input
                        id="password"
                        type="password"
                        placeholder={copy.passwordPlaceholder}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 bg-background/50 border-primary/30 focus-visible:ring-primary/50 focus-visible:border-primary transition-all h-12"
                        required
                        autoComplete="current-password"
                        data-testid="input-password"
                      />
                    </div>
                  </div>
                  <Link href={recoveryRoute("/recover-account", messagesReturnPath(search), lang)} className="inline-block text-sm text-primary hover:underline" data-testid="link-forgot-password">
                    {recoveryCopy(lang).forgot}
                  </Link>
                  <Link href={recoveryRoute("/recover-with-code", messagesReturnPath(search), lang)} className="ms-4 inline-block text-sm text-primary hover:underline" data-testid="link-recover-with-code">
                    {offlineRecoveryCopy(lang).link}
                  </Link>
                  <label
                    className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground"
                    data-testid="checkbox-remember-me"
                  >
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                    <span>{copy.remember}</span>
                  </label>
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-bold uppercase tracking-wider neon-glow transition-all duration-300"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? copy.authenticating : copy.signIn}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    {copy.noAccount}{" "}
                    <Link href={destination ? messagesAuthUrl("/register", destination) : "/register"} className="text-primary hover:underline font-semibold">
                      {copy.registerHere}
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* ── Four-door choice ── */
          <motion.div
            key="choice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {error && (
              <div className="mx-auto max-w-md flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DOORS.map((door, i) => {
                const locked = door.adminOnly && !user?.isAdmin;
                return (
                  <motion.button
                    key={door.id}
                    type="button"
                    onClick={() => enterDoor(door)}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 * i }}
                    className="empire-card text-start group relative overflow-hidden rounded-xl border border-primary/20 bg-card/40 backdrop-blur-sm p-5 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    data-testid={`door-${door.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                        {door.icon}
                      </span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </div>
                    <div className="mt-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black uppercase tracking-wider text-foreground">
                          {door.title}
                        </h2>
                        <span className="text-sm font-bold text-primary">{door.subtitle}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{door.desc}</p>
                    </div>
                    {locked && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-semibold text-primary">
                        <ShieldCheck className="w-3.5 h-3.5" />
                         {copy.adminOnly}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* ── Account controls ── */}
            <div className="mx-auto max-w-md space-y-3 pt-2">
              {user ? (
                <p className="text-center text-sm text-muted-foreground" data-testid="text-signed-in">
                   {user.isAdmin ? copy.signedAdmin : copy.signedIn}
                  <span className="font-semibold text-primary">{user.username}</span>
                </p>
              ) : (
                <>
                  <Button
                    type="button"
                    className="w-full h-12 text-base font-bold uppercase tracking-wider neon-glow"
                    onClick={() => { setMode("auth"); setError(""); }}
                    data-testid="button-open-auth"
                  >
                    <Lock className="w-4 h-4" />
                    {copy.signIn}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-primary/40 font-bold text-primary"
                    onClick={() => setLocation("/hub")}
                    data-testid="button-continue-as-guest"
                  >
                    {copy.guest}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {copy.guestHint}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
