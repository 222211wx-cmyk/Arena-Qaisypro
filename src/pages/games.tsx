import { useState, useEffect, useRef } from "react";
import SmartDomainWidget from "@/components/SmartDomainWidget";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { useToast } from "@workspace/gdna-ds/hooks/use-toast";
import { useSendArenaWithdrawRequest } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { useLocation, Link } from "wouter";
import GameExitButton from "@/components/GameExitButton";
import GameWarning from "@/components/GameWarning";
import AgeGate from "@/components/legal/AgeGate";
import { formatSurfaceNumber } from "@/i18n/locale-surfaces-b-copy";
import {
  Play,
  Trophy,
  X,
  Coins,
  Zap,
  Crown,
  Shield,
  Medal,
  MessageSquare,
} from "lucide-react";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

// ── Game definitions ───────────────────────────────────────────────────────────
const GAMES = [
  {
    id: "neon-racer",
    titleKey: "game_neon_racer_title",
    descriptionKey: "game_neon_racer_desc",
    image: "/images/neon-racer.png",
    genreKey: "game_genre_racing",
    minReward: 20,
    maxReward: 80,
    winChance: "60%",
    isTournament: false,
    isExternal: false,
    color: "#00d4ff",
  },
  {
    id: "crypto-clash",
    titleKey: "game_crypto_clash_title",
    descriptionKey: "game_crypto_clash_desc",
    image: "/images/crypto-clash.png",
    genreKey: "game_genre_strategy",
    minReward: 30,
    maxReward: 120,
    winChance: "50%",
    isTournament: false,
    isExternal: false,
    color: "#a855f7",
  },
  {
    id: "arena-strike",
    titleKey: "game_arena_strike_title",
    descriptionKey: "game_arena_strike_desc",
    image: "/images/arena-strike.png",
    genreKey: "game_genre_fps",
    minReward: 50,
    maxReward: 200,
    winChance: "45%",
    isTournament: false,
    isExternal: false,
    color: "#f97316",
  },
  {
    id: "globalstar",
    titleKey: "game_globalstar_title",
    descriptionKey: "game_globalstar_desc",
    image: "/images/globalstar.png",
    genreKey: "game_genre_tournament",
    minReward: 10,
    maxReward: 200,
    winChance: "12%",
    isTournament: true,
    isExternal: false,
    color: "#C9A84C",
  },
  {
    id: "penalty-king",
    titleKey: "game_penalty_king_title",
    descriptionKey: "game_penalty_king_desc",
    image: "/images/globalstar.png",
    genreKey: "game_penalty_king_genre",
    minReward: 5,
    maxReward: 50,
    winChance: "55%",
    isTournament: false,
    isExternal: false,
    color: "#C9A84C",
    isKing: true,
  },
] as const;

type ArenaGameId = (typeof GAMES)[number]["id"];

// ── 99 fake tournament players ─────────────────────────────────────────────────
const CITIZEN_POOL = [
  "Ahmed_Mansour",
  "Zhang_Wei",
  "Carlos_Rivera",
  "Aisha_Diallo",
  "Ivan_Petrov",
  "Yuki_Tanaka",
  "Omar_Hassan",
  "Marie_Dubois",
  "Raj_Patel",
  "Sofia_Rossi",
  "Kwame_Asante",
  "Lena_Müller",
  "Tariq_Al_Farsi",
  "Mei_Lin",
  "Dmitri_Volkov",
  "Amara_Ndiaye",
  "Felipe_Gomes",
  "Nadia_Khalil",
  "Kenji_Yamamoto",
  "Ingrid_Berg",
  "Hassan_Sultani",
  "Priya_Sharma",
  "Marcus_Johnson",
  "Fatou_Sow",
  "Alexei_Sokolov",
  "Lucia_Fernandez",
  "Yousef_Ibrahim",
  "Anna_Kowalski",
  "Reza_Tehrani",
  "Grace_Okonkwo",
  "Hamid_Moradi",
  "Elena_Popescu",
  "Javier_Torres",
  "Sana_Malik",
  "Viktor_Bauer",
  "Adaeze_Okafor",
  "Li_Wei",
  "Camille_Laurent",
  "Mustafa_Erdogan",
  "Leila_Nazari",
  "Kofi_Mensah",
  "Valentina_Cruz",
  "Said_Benali",
  "Hana_Kim",
  "Nikolai_Ivanov",
  "Blessing_Adeyemi",
  "Marco_Conti",
  "Zara_Ahmed",
  "Pavel_Novak",
  "Catalina_Reyes",
  "Idris_Elba_Jr",
  "Sakura_Watanabe",
  "Amin_Rachidi",
  "Vera_Sidorova",
  "Emmanuel_Nwachukwu",
  "Isabella_Martini",
  "Khalid_Hamdan",
  "Nora_Jensen",
  "Chidi_Obi",
  "Parisa_Ahmadi",
  "Santiago_Vega",
  "Miriam_Cohen",
  "Babatunde_Adisa",
  "Yulia_Fedorova",
  "Andrés_Moreno",
  "Kemi_Adeyinka",
  "Sven_Eriksson",
  "Layla_Mansouri",
  "Tunde_Fashola",
  "Nataliya_Koval",
  "Ricardo_Alves",
  "Hiba_Chaoui",
  "Maxim_Kuzmin",
  "Serena_Oduya",
  "Diego_Alvarez",
  "Fatima_Zahra",
  "Jan_Kovar",
  "Chioma_Eze",
  "Rustam_Nazarov",
  "Adriana_Lima_II",
  "Yusuf_Ali",
  "Bianca_Ferreira",
  "Rashid_Mokhtar",
  "Ekaterina_Volkov",
  "Pablo_Herrera",
  "Ngozi_Adeyemi",
  "Arjun_Singh",
  "Vanessa_Morin",
  "Tareke_Berhane",
  "Irina_Smirnova",
  "Juan_Guzman",
  "Rokia_Traore",
  "Andrei_Popov",
  "Selma_Halilovic",
  "Olusegun_Bello",
  "Miyuki_Ito",
  "Bassam_Haddad",
  "Monika_Nowak",
  "Cristiano_Gomes",
  "Zeinab_Farouk",
];
interface TournamentResult {
  placement: number;
  coinsEarned: number;
  xpEarned: number;
  tier: string;
  isWin: boolean;
  newBalance: number;
  newXp: number;
  username: string;
  message: string;
  top10: { username: string; xp: number }[];
}
type TournamentPhase =
  | "idle"
  | "entering"
  | "simulating"
  | "filtering"
  | "revealing"
  | "done";

// ── Tournament Modal ───────────────────────────────────────────────────────────
function TournamentModal({
  user,
  onClose,
  onComplete,
}: {
  user: { username: string; balance: number; xp: number } | null;
  onClose: () => void;
  onComplete: (
    coins?: number,
    xp?: number,
    placement?: number,
    game?: string,
  ) => void;
}) {
  const { t, lang } = useLang();
  const [phase, setPhase] = useState<TournamentPhase>("entering");
  const [enterCount, setEnterCount] = useState(0);
  const [players, setPlayers] = useState<string[]>([]);
  const [surviving, setSurviving] = useState<string[]>([]);
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [error, setError] = useState("");
  const [simulLines, setSimulLines] = useState<
    { name: string; score: number }[]
  >([]);
  const resultRef = useRef<TournamentResult | null>(null);

  // Generate player list with user inserted
  useEffect(() => {
    const pool = [...CITIZEN_POOL].sort(() => Math.random() - 0.5).slice(0, 99);
    const userHandle = user?.username ?? "YOU";
    const pos = Math.floor(Math.random() * 100);
    pool.splice(pos, 0, `★${userHandle}`);
    setPlayers(pool.slice(0, 100));
  }, [user]);

  // Phase machine
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (phase === "entering") {
      let c = 0;
      const id = setInterval(() => {
        c += Math.floor(Math.random() * 5) + 3;
        if (c >= 100) {
          c = 100;
          clearInterval(id);
        }
        setEnterCount(c);
        if (c >= 100) setTimeout(() => setPhase("simulating"), 400);
      }, 60);
      cleanup = () => clearInterval(id);
    } else if (phase === "simulating") {
      fetch(`${BASE}/api/games/globalstar/tournament`, {
        method: "POST",
        credentials: "include",
      })
        .then((r) => r.json())
        .then((d) => {
          resultRef.current = d;
        })
        .catch(() => {
          setError(t("game_tournament_disrupted"));
          setPhase("idle");
        });

      const names = [...players];
      const scores = names.map(() => Math.floor(Math.random() * 9000) + 1000);
      setSimulLines(
        names
          .map((n, i) => ({ name: n, score: scores[i] }))
          .sort(() => Math.random() - 0.5)
          .slice(0, 12),
      );

      const id = setInterval(() => {
        setSimulLines((prev) =>
          prev
            .map((r) => ({
              ...r,
              score: r.score + Math.floor(Math.random() * 300),
            }))
            .sort((a, b) => b.score - a.score),
        );
      }, 180);
      setTimeout(() => {
        clearInterval(id);
        setPhase("filtering");
      }, 3000);
      cleanup = () => clearInterval(id);
    } else if (phase === "filtering") {
      const top = [...players].sort(() => Math.random() - 0.5).slice(0, 10);
      setSurviving(top);
      setTimeout(() => setPhase("revealing"), 2200);
    } else if (phase === "revealing") {
      setTimeout(() => {
        if (resultRef.current) {
          setResult(resultRef.current);
          setPhase("done");
        } else
          setTimeout(() => {
            if (resultRef.current) {
              setResult(resultRef.current);
              setPhase("done");
            } else {
              setError(t("game_tournament_disrupted"));
            }
          }, 2000);
      }, 800);
    }

    return cleanup;
  }, [phase, players]);

  const tierConfig: Record<
    string,
    { color: string; icon: typeof Crown; labelKey: string }
  > = {
    champion: { color: "#C9A84C", icon: Crown, labelKey: "game_tier_champion" },
    elite: { color: "#E8C97A", icon: Trophy, labelKey: "game_tier_elite" },
    legend: { color: "#A8D8EA", icon: Medal, labelKey: "game_tier_legend" },
    citizen: { color: "#6b7280", icon: Shield, labelKey: "game_tier_citizen" },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm"
      onClick={phase === "done" ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg border border-yellow-400/40 bg-black overflow-hidden"
        style={{ boxShadow: "0 0 60px #C9A84C20" }}
      >
        {/* Header bar */}
        <div className="border-b border-yellow-400/20 px-6 py-3 flex items-center justify-between">
          <div className="font-mono text-yellow-400/60 text-xs tracking-[0.4em]">
            ♔ {t("game_globalstar_tournament")}
          </div>
          {phase === "done" && (
            <button
              onClick={onClose}
              className="text-yellow-400/40 hover:text-yellow-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5 min-h-64">
          <GameWarning />

          {/* ── ENTERING ───────────────────────────────────────────────── */}
          {phase === "entering" && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="font-mono text-yellow-400 text-xs tracking-[0.4em]">
                  {t("game_tournament_initiating")}
                </div>
                <div className="font-mono font-black text-3xl text-white tracking-widest">
                   {formatSurfaceNumber(lang, enterCount)}{" "}
                   <span className="text-yellow-400/40 text-lg">/ {formatSurfaceNumber(lang, 100)}</span>
                </div>
                <div className="font-mono text-yellow-400/40 text-xs">
                  {t("game_tournament_citizens_entering")}
                </div>
              </div>
              <div className="h-1.5 bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full bg-yellow-400"
                  animate={{ width: `${enterCount}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="grid grid-cols-5 gap-1 max-h-40 overflow-hidden">
                {players.slice(0, enterCount).map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`text-xs font-mono px-1 py-0.5 truncate text-center border ${
                      p.startsWith("★")
                        ? "border-yellow-400/60 text-yellow-400 bg-yellow-400/10"
                        : "border-white/5 text-white/30"
                    }`}
                  >
                    {p.replace("★", "")}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── SIMULATING ─────────────────────────────────────────────── */}
          {phase === "simulating" && (
            <div className="space-y-4">
              <div className="font-mono text-yellow-400/60 text-xs tracking-[0.4em] text-center">
                ⚡ {t("game_tournament_computing")}
              </div>
              <div className="space-y-1.5 font-mono text-xs">
                {simulLines.slice(0, 10).map((row, i) => (
                  <motion.div
                    key={row.name}
                    layout
                    className={`flex items-center gap-3 px-3 py-1.5 border ${
                      row.name.startsWith("★")
                        ? "border-yellow-400/50 bg-yellow-400/8 text-yellow-400"
                        : "border-white/5 text-white/50"
                    }`}
                  >
                    <span className="w-5 text-white/20 shrink-0">
                       {formatSurfaceNumber(lang, i + 1, { minimumIntegerDigits: 2, useGrouping: false })}
                    </span>
                    <span className="flex-1 truncate">
                      {row.name.replace("★", "★ ")}
                    </span>
                    <motion.span
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        delay: i * 0.05,
                      }}
                      className="font-black tracking-wider"
                      style={{
                        color: row.name.startsWith("★") ? "#C9A84C" : "#6b7280",
                      }}
                    >
                       {formatSurfaceNumber(lang, row.score)}
                    </motion.span>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-yellow-400"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      delay: i * 0.3,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── FILTERING ──────────────────────────────────────────────── */}
          {phase === "filtering" && (
            <div className="space-y-5 text-center">
              <div className="space-y-2">
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="font-mono text-red-400 text-xs tracking-[0.5em]"
                >
                  ◉ {t("game_tournament_eliminating")}
                </motion.div>
                <div className="font-mono font-black text-4xl text-white tracking-widest">
                  {t("apex_arena")}
                </div>
                <div className="font-mono text-yellow-400/40 text-xs tracking-widest">
                  {t("game_tournament_separating")}
                </div>
              </div>
              <div className="relative h-24 overflow-hidden border border-yellow-400/10">
                <motion.div
                  initial={{ y: 0 }}
                  animate={{ y: "-60%" }}
                  transition={{ duration: 1.8, ease: "easeIn" }}
                  className="space-y-1 p-2"
                >
                  {players.map((p, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 1 }}
                      animate={{ opacity: surviving.includes(p) ? 1 : 0 }}
                      transition={{ delay: Math.random() * 1.5, duration: 0.3 }}
                      className={`text-xs font-mono px-2 py-0.5 ${
                        p.startsWith("★")
                          ? "text-yellow-400 font-black"
                          : "text-white/30"
                      }`}
                    >
                      {p.replace("★", "★ ")}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
              <div className="font-mono text-yellow-400 text-sm tracking-wider">
                {t("game_tournament_survivors")}
              </div>
            </div>
          )}

          {/* ── REVEALING ──────────────────────────────────────────────── */}
          {phase === "revealing" && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-5xl"
              >
                ♔
              </motion.div>
              <div className="font-mono text-yellow-400 text-xs tracking-[0.5em] animate-pulse">
                {t("game_tournament_calculating")}
              </div>
            </div>
          )}

          {/* ── DONE ────────────────────────────────────────────────────── */}
          {phase === "done" &&
            result &&
            (() => {
              const tc = tierConfig[result.tier] ?? tierConfig.citizen;
              const TIcon = tc.icon;
              return (
                <div className="space-y-5">
                  {/* Placement hero */}
                  <div className="text-center space-y-2 py-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                    >
                      <TIcon
                        className="w-14 h-14 mx-auto"
                        style={{
                          color: tc.color,
                          filter: `drop-shadow(0 0 20px ${tc.color}80)`,
                        }}
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div
                        className="font-mono font-black text-5xl tracking-widest"
                        style={{
                          color: tc.color,
                          textShadow: `0 0 30px ${tc.color}60`,
                        }}
                      >
                         #{formatSurfaceNumber(lang, result.placement)}
                      </div>
                      <div
                        className="font-mono text-xs tracking-[0.5em] mt-1"
                        style={{ color: tc.color }}
                      >
                        {t(tc.labelKey)}
                      </div>
                      <div className="font-mono text-white/40 text-xs mt-1">
                        {t("game_tournament_out_of_citizens")}
                      </div>
                    </motion.div>
                  </div>

                  {/* Rewards */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div className="border border-yellow-400/30 p-4 text-center bg-yellow-400/5">
                      <Coins
                        className="w-5 h-5 mx-auto mb-1"
                        style={{ color: "#C9A84C" }}
                      />
                      <div
                        className="font-mono font-black text-2xl"
                        style={{ color: "#C9A84C" }}
                      >
                         +{formatSurfaceNumber(lang, result.coinsEarned)}
                      </div>
                      <div className="font-mono text-xs text-white/30 uppercase tracking-widest">
                        {t("game_gdna_coins")}
                      </div>
                    </div>
                    <div className="border border-purple-400/30 p-4 text-center bg-purple-400/5">
                      <Zap className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                      <div className="font-mono font-black text-2xl text-purple-400">
                         +{formatSurfaceNumber(lang, result.xpEarned)}
                      </div>
                      <div className="font-mono text-xs text-white/30 uppercase tracking-widest">
                        {t("stat_xp")}
                      </div>
                    </div>
                  </motion.div>

                  {/* Reward tier legend */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="border border-white/5 p-3 space-y-1.5"
                  >
                    <div className="font-mono text-white/30 text-xs tracking-widest mb-2">
                      {t("game_tribute_scale")}
                    </div>
                    {[
                       { rank: `${formatSurfaceNumber(lang, 1)}st`, coins: 200, color: "#C9A84C" },
                       { rank: `${formatSurfaceNumber(lang, 2)}–${formatSurfaceNumber(lang, 3)}`, coins: 100, color: "#E8C97A" },
                       { rank: `${formatSurfaceNumber(lang, 4)}–${formatSurfaceNumber(lang, 10)}`, coins: 50, color: "#A8D8EA" },
                       { rank: `${formatSurfaceNumber(lang, 11)}–${formatSurfaceNumber(lang, 100)}`, coins: 10, color: "#4b5563" },
                    ].map((r) => (
                      <div
                        key={r.rank}
                        className="flex justify-between font-mono text-xs"
                      >
                        <span style={{ color: r.color }}>{r.rank}</span>
                        <span style={{ color: r.color }}>
                           {formatSurfaceNumber(lang, r.coins)} {t("coins")}
                        </span>
                      </div>
                    ))}
                  </motion.div>

                  {/* Message */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="font-mono text-center text-xs text-white/50 italic"
                  >
                    "{result.message}"
                  </motion.p>

                  {/* Actions */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="flex gap-3"
                  >
                    <Button
                      onClick={() => {
                        onComplete(
                          result.coinsEarned,
                          result.xpEarned,
                          result.placement,
                          "GlobalStar",
                        );
                        onClose();
                      }}
                      className="flex-1 font-mono font-black text-xs tracking-[0.3em] uppercase border border-yellow-400 text-yellow-400 bg-transparent hover:bg-yellow-400 hover:text-black h-10"
                    >
                      ↺ {t("game_enter_again")}
                    </Button>
                    <Link href="/games/globalstar/ranking">
                      <Button
                        onClick={onClose}
                        variant="outline"
                        className="flex-1 font-mono text-xs tracking-wider border-white/20 text-white/50 hover:border-white/40 h-10"
                      >
                        {t("game_view_rankings")} →
                      </Button>
                    </Link>
                  </motion.div>
                </div>
              );
            })()}

          {/* Error state */}
          {error && (
            <div className="text-center space-y-3 py-8">
              <div className="font-mono text-red-400 text-sm">{error}</div>
              <Button
                onClick={onClose}
                variant="outline"
                className="border-red-400/40 text-red-400"
              >
                {t("game_close")}
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Games() {
  const { user, refreshUser } = useAuth();
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showTournament, setShowTournament] = useState(false);
  const arenaWithdraw = useSendArenaWithdrawRequest();

  const saveRecentMatch = (entry: {
    game: string;
    win: boolean;
    coins: number;
    xp: number;
    time: string;
  }) => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("gdna_recent_matches") ?? "[]",
      );
      const updated = [entry, ...stored].slice(0, 20);
      localStorage.setItem("gdna_recent_matches", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  const handlePlay = (
    gameId: string,
    _gameTitle: string,
    isTournament: boolean,
  ) => {
    if (isTournament) {
      setShowTournament(true);
      return;
    }
    setLocation(`/games/${gameId}`);
  };

  const handleArenaWithdraw = (gameId: ArenaGameId) => {
    if (gameId === "penalty-king") return;
    if (!user) {
      setLocation("/login");
      return;
    }

    arenaWithdraw.mutate(
      { data: { gameId } },
      {
        onSuccess: (data) => {
          toast({
            title: t("game_arena_request_sent"),
            description: data.content,
          });
        },
        onError: () => {
          toast({
            title: t("game_arena_request_failed"),
            description: t("game_arena_request_retry"),
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleTournamentComplete = async (
    tournamentCoins?: number,
    tournamentXp?: number,
    placement?: number,
    gameTitle?: string,
  ) => {
    if (tournamentCoins !== undefined) {
      saveRecentMatch({
        game: gameTitle ?? "GlobalStar",
        win: (placement ?? 999) <= 10,
        coins: tournamentCoins,
        xp: tournamentXp ?? 0,
        time: new Date().toISOString(),
      });
    }
    if (user) await refreshUser();
    setShowTournament(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 pt-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-black uppercase tracking-wider neon-text-glow"
        >
          {t("select_arena")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground uppercase tracking-widest"
        >
          {t("compete")}
        </motion.p>
      </div>

      {/* Smart Domain Widget */}
      <SmartDomainWidget domainId="gaming" label={t("game_module_gaming")} />

      {/* Games grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {GAMES.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.12 + 0.2 }}
          >
            <Card
              className={`overflow-hidden group hover:border-opacity-80 transition-all duration-500 h-full flex flex-col relative ${
                game.isTournament
                  ? "border-yellow-400/40 bg-black"
                  : "bg-card/40 border-primary/20"
              }`}
              style={
                game.isTournament ? { boxShadow: "0 0 30px #C9A84C10" } : {}
              }
            >
              {/* Tournament crown badge */}
              {game.isTournament && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2 py-1 border border-yellow-400/50 bg-black/80 font-mono text-xs text-yellow-400 tracking-widest">
                  ♔ {t("game_genre_tournament")}
                </div>
              )}
              {"isKing" in game && game.isKing && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full border border-primary/50 bg-background/90 px-3 py-1 text-xs font-black text-primary">
                  👑 {t("game_new")}
                </div>
              )}

              <div className="relative aspect-video overflow-hidden">
                {"isKing" in game && game.isKing ? (
                  <div
                    role="img"
                    aria-label={t("game_penalty_king_image_label")}
                    className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/5 text-6xl"
                  >
                    <motion.span
                      animate={{ y: [0, -6, 0], rotate: [-2, 2, -2] }}
                      transition={{ repeat: Infinity, duration: 2.4 }}
                    >
                      👑⚽
                    </motion.span>
                  </div>
                ) : (
                  <img
                    src={game.image}
                    alt={t(game.titleKey)}
                    className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                )}
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${game.isTournament ? "from-black via-black/30 to-transparent" : "from-background via-background/20 to-transparent"}`}
                />
                {!game.isTournament && (
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-background/80 backdrop-blur border border-primary/50 text-xs font-bold uppercase tracking-wider text-primary rounded-full">
                      {t(game.genreKey)}
                    </span>
                  </div>
                )}
              </div>

              <CardContent
                className={`p-5 flex-1 flex flex-col justify-between relative z-10 -mt-4 ${game.isTournament ? "bg-black border-t border-yellow-400/20" : ""}`}
              >
                <div>
                  <h3
                    className={`text-xl font-bold uppercase tracking-wider mb-2 transition-colors ${
                      game.isTournament
                        ? "text-yellow-400 font-mono"
                        : "group-hover:text-primary"
                    }`}
                  >
                    {t(game.titleKey)}
                  </h3>
                  <p className="text-muted-foreground text-xs line-clamp-3 mb-3 leading-relaxed">
                    {t(game.descriptionKey)}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="border-t border-border/30 pt-3 space-y-1.5">
                    <div className="flex justify-between text-xs uppercase tracking-wider">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Coins className="w-3 h-3" /> {t("reward")}
                      </span>
                      <span className="font-bold" style={{ color: game.color }}>
                        {"isKing" in game && game.isKing
                           ? `${formatSurfaceNumber(lang, game.minReward)}–${formatSurfaceNumber(lang, game.maxReward)} ${t("stat_xp")}`
                           : `${formatSurfaceNumber(lang, game.minReward)}–${formatSurfaceNumber(lang, game.maxReward)} ${t("coins")}`}
                      </span>
                    </div>
                    {game.isTournament ? (
                      <div className="flex justify-between text-xs uppercase tracking-wider">
                        <span className="text-muted-foreground">
                          {t("game_top_10")}
                        </span>
                        <span className="font-bold text-yellow-400/80">
                           {formatSurfaceNumber(lang, 50)}–{formatSurfaceNumber(lang, 200)} {t("coins")}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-xs uppercase tracking-wider">
                        <span className="text-muted-foreground">
                          {t("win_chance")}
                        </span>
                        <span className="font-bold text-green-400">
                           {formatSurfaceNumber(lang, Number.parseInt(game.winChance, 10) / 100, { style: "percent" })}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    className={`w-full h-11 font-bold uppercase tracking-wider transition-all duration-300 ${
                      game.isTournament
                        ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400 hover:bg-yellow-400 hover:text-black font-mono"
                        : "bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-primary-foreground"
                    }`}
                    onClick={() =>
                      handlePlay(game.id, t(game.titleKey), game.isTournament)
                    }
                  >
                    {game.isTournament ? (
                      <>
                        <Crown className="w-4 h-4 mr-2" />
                        {t("game_enter_tournament")}
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        {t("play_now")}
                      </>
                    )}
                  </Button>

                  {!("isKing" in game && game.isKing) && (
                    <Button
                      variant="outline"
                      className="w-full h-11 font-bold tracking-wider"
                      disabled={arenaWithdraw.isPending}
                      onClick={() => handleArenaWithdraw(game.id)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {t("game_send_arena_request")}
                    </Button>
                  )}

                  {/* GlobalStar: link to voting hall */}
                  {game.isTournament && (
                    <Link href="/games/globalstar/ranking">
                      <button className="w-full text-center font-mono text-xs text-yellow-400/30 hover:text-yellow-400/60 transition-colors tracking-widest py-1">
                        {t("game_view_hall_of_legends")} →
                      </button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tournament Modal */}
      <AnimatePresence>
        {showTournament && user?.isAdult === true && (
          <>
            <TournamentModal
              user={user}
              onClose={() => setShowTournament(false)}
              onComplete={handleTournamentComplete}
            />
            {/* زر الخروج الطارئ + حماية من البلوكاج (30 ثانية بلا حركة) */}
            <GameExitButton onExit={() => setShowTournament(false)} />
          </>
        )}
      </AnimatePresence>
      <AgeGate active={showTournament} />
    </div>
  );
}
