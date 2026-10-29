import { citizenReturnPath } from '@/lib/recovery-links';
import { useState } from "react";
import { useLocation, useSearch, Link, Redirect } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { Lock, User, AlertCircle, CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { coreCopy } from "@/i18n/core-auth-copy";
import { messagesAuthUrl, messagesReturnPath } from "@/lib/messages-entry";
import { recoveryEnrollmentReturnPath } from "@/lib/recovery-links";

export default function Register() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { register, user } = useAuth();
  const { lang } = useLang();
  const copy = coreCopy(lang);
  const destination = citizenReturnPath(search) ?? messagesReturnPath(search) ?? recoveryEnrollmentReturnPath(search);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await register(username, password, birthDate);
      setLocation(destination ?? "/social");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : copy.registrationFailed);
    } finally {
      setIsLoading(false);
    }
  };

  if (user) return <Redirect to={destination ?? "/social"} replace />;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-[0_0_50px_rgba(0,212,255,0.1)]">
          <CardHeader className="space-y-1 text-center pb-8">
            <CardTitle className="text-3xl font-black uppercase tracking-wider neon-text-glow">{copy.registerTitle}</CardTitle>
            <CardDescription className="text-muted-foreground uppercase tracking-widest text-xs">
              {copy.registerSubtitle}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div dir={lang === "ar" ? "rtl" : "ltr"} role="note" data-testid="notice-single-account" className="mb-5 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs leading-relaxed text-muted-foreground space-y-2">
              <p>{copy.singleAccount}</p>
              <p>{copy.sessionNotice}</p>
              <p>{copy.accessNotice}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs uppercase tracking-widest text-muted-foreground">{copy.playerName}</Label>
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
                    minLength={3}
                    maxLength={20}
                    autoComplete="username"
                    data-testid="input-username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="text-xs uppercase tracking-widest text-muted-foreground">
                  {copy.birthDate}
                </Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-3 h-5 w-5 text-primary/50" />
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="pl-10 bg-background/50 border-primary/30 focus-visible:ring-primary/50 focus-visible:border-primary transition-all h-12"
                    required
                    data-testid="input-birth-date"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {copy.ageNotice}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground">{copy.password}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-primary/50" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={copy.passwordHint}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-background/50 border-primary/30 focus-visible:ring-primary/50 focus-visible:border-primary transition-all h-12"
                    required
                    minLength={6}
                    data-testid="input-password"
                  />
                </div>
              </div>
               <div
                 className="flex gap-3 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs leading-relaxed text-muted-foreground"
                 role="note"
                 data-testid="notice-password-recovery"
               >
                 <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                 <p>
                    {copy.recovery}
                 </p>
               </div>
              <Button
                type="submit"
                className="w-full h-12 text-lg font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground neon-glow transition-all duration-300"
                disabled={isLoading}
                data-testid="button-register"
              >
                {isLoading ? copy.creating : copy.enter}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {copy.already}{" "}
                <Link href={destination ? messagesAuthUrl("/login", destination) : "/login"} className="text-primary hover:underline font-semibold">
                  {copy.loginHere}
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
