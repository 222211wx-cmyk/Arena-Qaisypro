import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Crown, RotateCcw, Shield, Target, Trophy } from "lucide-react";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Progress } from "@workspace/gdna-ds/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { gameText } from "@/i18n/game-chrome";
import { localeForLang } from "@/i18n/game-locale-copy";

type Direction = "left" | "center" | "right";
type Shot = {
  number: number;
  direction: Direction;
  keeperDirection: Direction;
  goal: boolean;
};
type MatchResult = {
  matchId: string;
  shots: Shot[];
  shotNumber: number;
  totalShots: number;
  goals: number;
  saves: number;
  complete: boolean;
  win: boolean;
  xpEarned: number;
  keeperDirection: Direction;
  goal: boolean;
  message: string;
};

const COPY = {
  ar: {
    round: "التسديدة", score: "الأهداف", saves: "تصديات الحارس", choose: "اختر زاوية التسديدة",
    left: "اليسار", center: "الوسط", right: "اليمين", goal: "هــدف!", saved: "تصدى لها الحارس",
    champion: "ملك ركلات الجزاء", defeated: "انتهت المباراة", replay: "مباراة جديدة",
    win: "فزت بالمباراة", loss: "سجّل 3 أهداف على الأقل للفوز", progress: "تقدم المباراة",
  },
  en: {
    round: "Kick", score: "Goals", saves: "Keeper saves", choose: "Choose your shooting angle",
    left: "Left", center: "Center", right: "Right", goal: "GOAL!", saved: "Keeper saved it",
    champion: "Penalty King", defeated: "Match complete", replay: "New match",
    win: "You won the match", loss: "Score at least 3 goals to win", progress: "Match progress",
  },
  fr: {
    round: "Tir", score: "Buts", saves: "Arrêts", choose: "Choisissez votre angle de tir",
    left: "Gauche", center: "Centre", right: "Droite", goal: "BUT !", saved: "Arrêt du gardien",
    champion: "Roi des penalties", defeated: "Match terminé", replay: "Nouveau match",
    win: "Vous avez gagné", loss: "Marquez au moins 3 buts pour gagner", progress: "Progression",
  },
  es: {
    round: "Tiro", score: "Goles", saves: "Paradas", choose: "Elige el ángulo de tiro",
    left: "Izquierda", center: "Centro", right: "Derecha", goal: "¡GOL!", saved: "Parada del portero",
    champion: "Rey de penaltis", defeated: "Partido terminado", replay: "Nuevo partido",
    win: "Ganaste el partido", loss: "Marca al menos 3 goles para ganar", progress: "Progreso",
  },
  de: {
    round: "Schuss", score: "Tore", saves: "Paraden", choose: "Wähle deine Schussrichtung",
    left: "Links", center: "Mitte", right: "Rechts", goal: "TOR!", saved: "Der Torwart hält",
    champion: "Elfmeterkönig", defeated: "Spiel beendet", replay: "Neues Spiel",
    win: "Du hast gewonnen", loss: "Erziele mindestens 3 Tore", progress: "Spielfortschritt",
  },
} as const;

const DIRECTION_POSITION: Record<Direction, string> = {
  left: "18%",
  center: "50%",
  right: "82%",
};

export default function PenaltyKingGame() {
  const [, navigate] = useLocation();
  const { refreshUser } = useAuth();
  const { lang } = useLang();
  const t = (key: Parameters<typeof gameText>[1]) => gameText(lang, key);
  const copy = COPY[lang];
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastShot = match?.shots.at(-1) ?? null;
  const progress = ((match?.shotNumber ?? 0) / 5) * 100;
  const directionLabels = useMemo(
    () => ({ left: copy.left, center: copy.center, right: copy.right }),
    [copy],
  );

  async function shoot(direction: Direction) {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/games/penalty-king/play", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, restart: match?.complete === true }),
      });
      const data = await response.json() as MatchResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("roundError"));
      setMatch(data);
      if (data.complete) await refreshUser();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("roundError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-3 py-4 text-foreground sm:px-4 sm:py-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <Button variant="ghost" onClick={() => navigate("/games")} className="text-primary">
          <ArrowLeft className="me-2 size-4" /> {t("penaltyBack")}
        </Button>

        <Card className="overflow-hidden border-primary/50 bg-card">
          <CardContent className="space-y-5 p-4 sm:p-6 md:p-8">
            <header className="flex flex-col items-center gap-3 text-center">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                <Crown className="size-12 text-primary sm:size-16" />
              </motion.div>
              <div>
                <Badge variant="outline" className="border-primary/50 text-primary">{t("kingsLeague")}</Badge>
                <h1 className="mt-2 text-3xl font-black sm:text-5xl">{t("penaltyTitle")}</h1>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t("penaltyIntro")}</p>
              </div>
            </header>

            <section className="grid grid-cols-3 gap-2 sm:gap-3" aria-label={copy.progress}>
              <Card className="border-primary/25 bg-background/60">
                <CardContent className="p-3 text-center">
                  <Target className="mx-auto mb-1 size-5 text-primary" />
                  <strong className="text-2xl">{match?.goals ?? 0}</strong>
                  <p className="text-[11px] text-muted-foreground sm:text-xs">{copy.score}</p>
                </CardContent>
              </Card>
              <Card className="border-primary/25 bg-background/60">
                <CardContent className="p-3 text-center">
                  <Crown className="mx-auto mb-1 size-5 text-primary" />
                  <strong className="text-2xl">{Math.min((match?.shotNumber ?? 0) + 1, 5)}/5</strong>
                  <p className="text-[11px] text-muted-foreground sm:text-xs">{copy.round}</p>
                </CardContent>
              </Card>
              <Card className="border-primary/25 bg-background/60">
                <CardContent className="p-3 text-center">
                  <Shield className="mx-auto mb-1 size-5 text-primary" />
                  <strong className="text-2xl">{match?.saves ?? 0}</strong>
                  <p className="text-[11px] text-muted-foreground sm:text-xs">{copy.saves}</p>
                </CardContent>
              </Card>
            </section>

            <Progress value={progress} className="h-2" aria-label={copy.progress} />

            <section className="relative mx-auto aspect-[16/9] w-full max-w-3xl overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-b from-background via-background to-primary/10">
              <div className="absolute inset-x-[8%] top-[12%] h-[55%] border-x-4 border-t-4 border-primary/70">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_48%,hsl(var(--primary)/.12)_50%,transparent_52%),linear-gradient(transparent_48%,hsl(var(--primary)/.12)_50%,transparent_52%)] bg-[length:18%_28%]" />
              </div>

              <motion.div
                className="absolute top-[42%] z-10 -translate-x-1/2 text-4xl sm:text-6xl"
                animate={{ left: lastShot ? DIRECTION_POSITION[lastShot.keeperDirection] : "50%" }}
                transition={{ type: "spring", stiffness: 160, damping: 18 }}
                aria-label={copy.saves}
              >
                🧤
              </motion.div>
              <motion.div
                key={`${match?.matchId ?? "start"}-${match?.shotNumber ?? 0}`}
                className="absolute bottom-[8%] z-20 -translate-x-1/2 text-4xl sm:text-6xl"
                initial={{ left: "50%", bottom: "8%" }}
                animate={lastShot ? { left: DIRECTION_POSITION[lastShot.direction], bottom: "48%" } : { left: "50%", bottom: "8%" }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                ⚽
              </motion.div>

              {lastShot && !submitting && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full px-5 py-2 text-lg font-black ${
                    lastShot.goal ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
                  }`}
                >
                  {lastShot.goal ? copy.goal : copy.saved}
                </motion.div>
              )}
            </section>

            {!match?.complete ? (
              <section className="space-y-3 text-center">
                <p className="font-bold text-primary">{submitting ? t("keeperMoving") : copy.choose}</p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {(["left", "center", "right"] as const).map((direction) => (
                    <Button
                      key={direction}
                      onClick={() => shoot(direction)}
                      disabled={submitting}
                      variant="outline"
                      className="h-14 border-primary/40 text-sm font-black hover:bg-primary hover:text-primary-foreground sm:h-16 sm:text-base"
                    >
                      {directionLabels[direction]}
                    </Button>
                  ))}
                </div>
              </section>
            ) : (
              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/40 bg-primary/5 p-5 text-center">
                <Trophy className="mx-auto mb-2 size-9 text-primary" />
                <h2 className="text-2xl font-black">{match.win ? copy.champion : copy.defeated}</h2>
                <p className="mt-1 text-muted-foreground">{match.win ? copy.win : copy.loss}</p>
                <p className="mt-3 text-xl font-black text-primary">
                  {match.goals}/5 · +{match.xpEarned.toLocaleString(localeForLang[lang])} XP
                </p>
                <Button className="mt-5" onClick={() => setMatch(null)}>
                  <RotateCcw className="me-2 size-4" /> {copy.replay}
                </Button>
              </motion.section>
            )}

            {error && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-center text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}