import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { CitizenSkeleton } from "@/components/Skeleton";
import {
  Crown, Sword, Shield, ArrowLeft, Gamepad2, Trophy,
  MessageSquare, Eye, Coins, Zap, Star, Globe,
  Music, Cpu, Briefcase, Film, Calendar, Medal, Heart,
  AlertTriangle, CheckCircle, Phone, Video, MessageCircle,
  Lock, ExternalLink, UserPlus, UserCheck, Users, Swords, X, Share2
} from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { useCallContext } from "@/contexts/CallContext";
import { COMMUNITY_T } from "@/i18n/community-pages";
import { SOCIAL_T } from "@/components/social/social-i18n";
import { localeFor as sharedLocaleFor, surfaceText } from "@/i18n/community-admin-surfaces-copy";
import { finalLabelText } from "@/i18n/final-labels-copy";

// ── Types ─────────────────────────────────────────────────────────────────────
interface HonorInfo { title: string; color: string; badge: string }
interface Rank { label: string; tier: number; color: string; icon: string }
interface Citizen {
  id: number; username: string; xp: number; balance: number;
  gamesPlayed: number; wins: number; createdAt: string;
  honorCount: number; isMuted: boolean; isTrending: boolean;
  rank: Rank; honorInfo: HonorInfo;
  specialty: string; totalDebates: number;
  uniqueLegends: number; totalWatches: number;
  recentHonors: string[];
  followerCount: number; followingCount: number;
  royalVerified?: boolean;
}
interface Post {
  id: number; content: string; domain: string; type: string;
  likes: number; createdAt: string;
}
interface Achievement { id: string; icon: string; label: string; earned: boolean }
interface FollowerItem { id: number; username: string; xp: number }

const localeFor = (lang: Parameters<typeof sharedLocaleFor>[0]) =>
  lang === "de" ? "de-DE" : sharedLocaleFor(lang);

// ── Archon types ──────────────────────────────────────────────────────────────
interface ArchonPublicProfile {
  archonCode: string;
  archetype: string;
  dimensions: {
    volontas: number; resilentia: number; intellectus: number;
    disciplina: number; societas: number; abundantia: number; auctoritas: number;
  };
  overallScore: number;
  archetypeDeclaration: string | null;
}

const ARCHETYPES: Record<string, { color: string; symbol: string; ar: string; de: string }> = {
  "THE SOVEREIGN":   { color: "#C9A84C", symbol: "♔", ar: "السيد المطلق", de: "Der Souverän" },
  "THE CONQUEROR":   { color: "#FF6B35", symbol: "⚔", ar: "الفاتح", de: "Der Eroberer" },
  "THE VISIONARY":   { color: "#A8E6CF", symbol: "👁", ar: "الرائي", de: "Der Visionär" },
  "THE ARCHITECT":   { color: "#DDA0DD", symbol: "⚙", ar: "المعماري", de: "Der Architekt" },
  "THE CATALYST":    { color: "#87CEEB", symbol: "◈", ar: "المحرك", de: "Der Katalysator" },
  "THE SENTINEL":    { color: "#98FB98", symbol: "🛡", ar: "الحارس", de: "Der Wächter" },
  "THE SEEKER":      { color: "#E8C97A", symbol: "◉", ar: "الباحث", de: "Der Suchende" },
};

function archetypeName(lang: Parameters<typeof surfaceText>[0], archetype: string) {
  if (lang === "de") return ARCHETYPES[archetype]?.de ?? archetype;
  const keys = {
    "THE SOVEREIGN": "archetypeSovereign",
    "THE CONQUEROR": "archetypeConqueror",
    "THE VISIONARY": "archetypeVisionary",
    "THE ARCHITECT": "archetypeArchitect",
    "THE CATALYST": "archetypeCatalyst",
    "THE SENTINEL": "archetypeSentinel",
    "THE SEEKER": "archetypeSeeker",
  } as const;
  const key = keys[archetype as keyof typeof keys];
  return key ? surfaceText(lang, key) : archetype;
}

function computeFourPillars(d: ArchonPublicProfile["dimensions"], overallScore: number) {
  const dimVals = Object.values(d);
  return [
    {
      id: "mens",    latin: "MENS",    ar: "العقل الإمبراطوري", sub: "Clarity · Vision · Authority",
      symbol: "🧠", color: "#A8E6CF",
      score: Math.round((d.intellectus + d.auctoritas) / 2),
    },
    {
      id: "vis",     latin: "VIS",     ar: "قوة التنفيذ",       sub: "Will · Discipline · Action",
      symbol: "⚔️", color: "#C9A84C",
      score: Math.round((d.volontas + d.disciplina) / 2),
    },
    {
      id: "anima",   latin: "ANIMA",   ar: "روح المحارب",       sub: "Resilience · Influence · Connection",
      symbol: "🔥", color: "#FF8C42",
      score: Math.round((d.resilentia + d.societas) / 2),
    },
    {
      id: "legatum", latin: "LEGATUM", ar: "الإرث الأبدي",      sub: "Abundance · Balance · Legacy",
      symbol: "👑", color: "#DDA0DD",
      score: Math.round((d.abundantia * 0.5) + (overallScore * 0.3) + (Math.min(...dimVals) * 0.2)),
    },
  ];
}

const DIMENSIONS: { key: keyof ArchonPublicProfile["dimensions"]; label: string; ar: string }[] = [
  { key: "volontas",    label: "VOLONTAS",    ar: "إرادة الفاتح" },
  { key: "resilentia",  label: "RESILENTIA",  ar: "صلابة المحارب" },
  { key: "intellectus", label: "INTELLECTUS", ar: "وضوح الرؤية" },
  { key: "disciplina",  label: "DISCIPLINA",  ar: "الانضباط الإمبراطوري" },
  { key: "societas",    label: "SOCIETAS",    ar: "قوة التأثير" },
  { key: "abundantia",  label: "ABUNDANTIA",  ar: "عقلية الوفرة" },
  { key: "auctoritas",  label: "AUCTORITAS",  ar: "السلطة الداخلية" },
];

const DIMENSION_COPY = {
  volontas: "dimVolontas", resilentia: "dimResilentia", intellectus: "dimIntellectus",
  disciplina: "dimDisciplina", societas: "dimSocietas", abundantia: "dimAbundantia",
  auctoritas: "dimAuctoritas",
} as const;

// ── Archon Compare Panel ──────────────────────────────────────────────────────
function useArchonProfile(username: string | undefined) {
  const [profile, setProfile] = useState<ArchonPublicProfile | "loading" | "none">("loading");
  useEffect(() => {
    if (!username) { setProfile("none"); return; }
    setProfile("loading");
    fetch(`/api/archon/profile/${encodeURIComponent(username)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setProfile(d ?? "none"))
      .catch(() => setProfile("none"));
  }, [username]);
  return profile;
}

function CompareLockedCard({ username }: { username: string }) {
  const { lang } = useLang();
  return (
    <Card className="flex-1 border-primary/20 bg-primary/5">
      <CardContent className="flex h-full flex-col items-center justify-center text-center gap-3 p-6">
        <Lock className="w-8 h-8 text-primary/40" />
        <div>
          <div className="font-black text-sm">{username}</div>
          <div className="text-xs text-muted-foreground font-mono mt-1">{surfaceText(lang, "initiationPending")}</div>
          <div className="text-xs text-primary/50 mt-2">{surfaceText(lang, "initiationIncomplete")}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompareHeroCard({ username, profile }: { username: string; profile: ArchonPublicProfile }) {
  const { lang } = useLang();
  const info = ARCHETYPES[profile.archetype] ?? ARCHETYPES["THE SEEKER"];
  return (
    <Card className="flex-1 text-center" style={{ borderColor: `${info.color}40`, background: `${info.color}08` }}>
      <CardContent className="p-4">
        <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl mb-2"
          style={{ background: `${info.color}15`, border: `1px solid ${info.color}40` }}>
          {info.symbol}
        </div>
        <div className="font-black text-sm truncate">{username}</div>
        <div className="text-xs font-black tracking-wider mt-0.5" style={{ color: info.color }}>{profile.archetype}</div>
        <div className="text-xs text-muted-foreground">{archetypeName(lang, profile.archetype)}</div>
        <div className="text-2xl font-black mt-1" style={{ color: info.color }}>{profile.overallScore}</div>
        <div className="text-[10px] text-muted-foreground">{surfaceText(lang, "score")}</div>
      </CardContent>
    </Card>
  );
}

interface CitizenOption { id: number; username: string }

function CitizenPicker({ label, username, citizens, onSelect }: {
  label: string;
  username: string;
  citizens: CitizenOption[];
  onSelect: (username: string) => void;
}) {
  const { lang } = useLang();
  const ct = COMMUNITY_T[lang] ?? COMMUNITY_T.en;
  const [query, setQuery] = useState(username);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = normalizedQuery
    ? citizens.filter(c => c.username.toLowerCase().includes(normalizedQuery)).slice(0, 5)
    : [];

  useEffect(() => setQuery(username), [username]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextUsername = query.trim();
    if (nextUsername) onSelect(nextUsername);
  };

  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-[10px] font-black tracking-[0.2em] text-muted-foreground">
        {label}
      </label>
      <form onSubmit={submit} className="relative">
        <Input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={ct.search_citizen}
          aria-label={`${label} ${ct.citizen_username}`}
          className="h-9 bg-background/60 text-sm"
        />
        {matches.length > 0 && query !== username && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
            {matches.map(citizen => (
              <button
                key={citizen.id}
                type="button"
                onClick={() => onSelect(citizen.username)}
                className="block w-full px-3 py-2 text-start text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                {citizen.username}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}

function ArchonComparePanel({ leftUsername, rightUsername, onClose }: {
  leftUsername: string; rightUsername: string; onClose: () => void;
}) {
  const { lang } = useLang();
  const socialT = SOCIAL_T[lang] ?? SOCIAL_T.en;
  const [selectedLeftUsername, setSelectedLeftUsername] = useState(leftUsername);
  const [selectedRightUsername, setSelectedRightUsername] = useState(rightUsername);
  const [citizens, setCitizens] = useState<CitizenOption[]>([]);
  const left  = useArchonProfile(selectedLeftUsername);
  const right = useArchonProfile(selectedRightUsername);

  useEffect(() => {
    fetch("/api/citizens?limit=200", { credentials: "include" })
      .then(response => response.ok ? response.json() : { citizens: [] })
      .then(data => setCitizens(Array.isArray(data.citizens) ? data.citizens : []))
      .catch(() => setCitizens([]));
  }, []);

  if (left === "loading" || right === "loading") return (
    <div className="mt-6 p-5 rounded-2xl border border-primary/20 bg-primary/5 animate-pulse">
      <div className="h-4 w-40 bg-primary/20 rounded mb-3" />
      <div className="h-32 bg-primary/10 rounded" />
    </div>
  );

  const leftInfo  = left  !== "none" ? (ARCHETYPES[left.archetype]  ?? ARCHETYPES["THE SEEKER"]) : null;
  const rightInfo = right !== "none" ? (ARCHETYPES[right.archetype] ?? ARCHETYPES["THE SEEKER"]) : null;
  const bothReady = left !== "none" && right !== "none";

  let leftWins = 0, rightWins = 0;
  if (bothReady) {
    for (const d of DIMENSIONS) {
      const l = (left as ArchonPublicProfile).dimensions[d.key];
      const r = (right as ArchonPublicProfile).dimensions[d.key];
      if (l > r) leftWins++; else if (r > l) rightWins++;
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="mt-6 border-primary/30 overflow-hidden py-0 gap-0">
      {/* Header */}
      <CardHeader className="px-5 py-3 flex flex-row items-center justify-between border-b border-primary/20 bg-gradient-to-br from-primary/10 to-transparent space-y-0">
        <CardTitle className="text-xs font-black tracking-[0.4em] text-primary flex items-center gap-2">
          <Swords className="w-4 h-4" /> {surfaceText(lang, "comparison")}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={socialT.close} className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <CitizenPicker
            label={surfaceText(lang, "leftCitizen")}
            username={selectedLeftUsername}
            citizens={citizens}
            onSelect={setSelectedLeftUsername}
          />
          <CitizenPicker
            label={surfaceText(lang, "rightCitizen")}
            username={selectedRightUsername}
            citizens={citizens}
            onSelect={setSelectedRightUsername}
          />
        </div>

        {/* Hero row */}
        <div className="flex items-stretch gap-3">
          {left !== "none"
            ? <CompareHeroCard username={selectedLeftUsername} profile={left} />
            : <CompareLockedCard username={selectedLeftUsername} />}
          <div className="flex items-center justify-center shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border border-primary/40 bg-primary/10 text-primary">
              VS
            </div>
          </div>
          {right !== "none"
            ? <CompareHeroCard username={selectedRightUsername} profile={right} />
            : <CompareLockedCard username={selectedRightUsername} />}
        </div>

        {bothReady && (
          <>
            {/* Wins tally */}
            <div className="flex items-center justify-center gap-4 text-xs font-black">
              <span style={{ color: leftInfo!.color }}>{surfaceText(lang, "leadsIn", { name: selectedLeftUsername, count: leftWins })}</span>
              <span className="text-muted-foreground">·</span>
              <span style={{ color: rightInfo!.color }}>{surfaceText(lang, "leadsIn", { name: selectedRightUsername, count: rightWins })}</span>
            </div>

            {/* Dimension bars */}
            <div>
              <div className="text-xs font-black tracking-[0.35em] text-muted-foreground mb-3">{surfaceText(lang, "dimensionsHead")}</div>
              <div className="space-y-4">
                {DIMENSIONS.map(d => {
                  const l = (left as ArchonPublicProfile).dimensions[d.key];
                  const r = (right as ArchonPublicProfile).dimensions[d.key];
                  const leftLeads  = l > r;
                  const rightLeads = r > l;
                  return (
                    <div key={d.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-black ${leftLeads ? "" : "text-muted-foreground"}`}
                          style={leftLeads ? { color: leftInfo!.color } : undefined}>
                          {l}{leftLeads && " ▲"}
                        </span>
                        <span className="text-xs font-black tracking-wider text-foreground/80">
                          {d.label} <span className="text-muted-foreground font-bold hidden sm:inline">{surfaceText(lang, DIMENSION_COPY[d.key])}</span>
                        </span>
                        <span className={`text-xs font-black ${rightLeads ? "" : "text-muted-foreground"}`}
                          style={rightLeads ? { color: rightInfo!.color } : undefined}>
                          {rightLeads && "▲ "}{r}
                        </span>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        {/* Left bar grows right-to-left */}
                        <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden flex justify-end">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${l}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{
                              background: leftLeads
                                ? `linear-gradient(270deg, ${leftInfo!.color}, ${leftInfo!.color}90)`
                                : `${leftInfo!.color}40`,
                              boxShadow: leftLeads ? `0 0 8px ${leftInfo!.color}60` : undefined,
                            }} />
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${r}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{
                              background: rightLeads
                                ? `linear-gradient(90deg, ${rightInfo!.color}90, ${rightInfo!.color})`
                                : `${rightInfo!.color}40`,
                              boxShadow: rightLeads ? `0 0 8px ${rightInfo!.color}60` : undefined,
                            }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Empire Identity Section ────────────────────────────────────────────────────
function EmpireIdentitySection({ username }: { username: string }) {
  const { lang } = useLang();
  const [profile, setProfile] = useState<ArchonPublicProfile | "loading" | "none">("loading");

  useEffect(() => {
    fetch(`/api/archon/profile/${encodeURIComponent(username)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setProfile(d ?? "none"))
      .catch(() => setProfile("none"));
  }, [username]);

  if (profile === "loading") return (
    <div className="mt-6 p-5 rounded-2xl border border-primary/20 bg-primary/5 animate-pulse">
      <div className="h-4 w-40 bg-primary/20 rounded mb-3" />
      <div className="h-24 bg-primary/10 rounded" />
    </div>
  );

  // ── LOCKED STATE ─────────────────────────────────────────────────────────────
  if (profile === "none") return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-2xl border border-primary/20 overflow-hidden bg-card">
      <div className="p-5 relative">
        <div className="relative flex flex-col items-center text-center gap-3 py-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary/5 border border-primary/20">
            <Lock className="w-6 h-6 text-primary/50" />
          </div>
          <div>
            <div className="text-xs font-black tracking-[0.4em] text-primary/60 mb-1">{surfaceText(lang, "empireIdentity")}</div>
            <div className="text-lg font-black text-primary/40 tracking-widest">{surfaceText(lang, "classified")}</div>
            <div className="text-xs text-muted-foreground mt-1 font-mono">{surfaceText(lang, "initiationPending")} — {finalLabelText(lang, "archonSystem")}</div>
          </div>
          <div className="mt-1 px-4 py-2 rounded-xl border border-primary/20 bg-primary/5 text-xs text-primary/50 font-mono tracking-wider">
            ⚡ {surfaceText(lang, "initiationIncomplete")}
          </div>
        </div>
      </div>
    </motion.div>
  );

  // ── PROFILE STATE ────────────────────────────────────────────────────────────
  const archInfo = ARCHETYPES[profile.archetype] ?? ARCHETYPES["THE SEEKER"];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-2xl border overflow-hidden"
      style={{ borderColor: `${archInfo.color}40` }}>

      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${archInfo.color}15, transparent)`, borderBottom: `1px solid ${archInfo.color}20` }}>
        <div className="text-xs font-black tracking-[0.4em]" style={{ color: archInfo.color }}>⚡ {surfaceText(lang, "empireIdentity")}</div>
        <div className="text-xs font-mono text-muted-foreground">{finalLabelText(lang, "archonSystem")}</div>
      </div>

      <div className="p-5 space-y-5 bg-card">

        {/* Archetype Hero */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
            style={{ background: `${archInfo.color}15`, border: `1px solid ${archInfo.color}40` }}>
            {archInfo.symbol}
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground tracking-widest mb-0.5">{surfaceText(lang, "archonArchetype")}</div>
            <div className="text-xl font-black tracking-wider" style={{ color: archInfo.color }}>
              {archetypeName(lang, profile.archetype)}
            </div>
          </div>
          <div className="ms-auto text-end shrink-0">
            <div className="text-3xl font-black" style={{ color: archInfo.color }}>{profile.overallScore}</div>
            <div className="text-xs text-muted-foreground">{surfaceText(lang, "score")}</div>
          </div>
        </div>

        {/* Cipher code */}
        <div className="px-4 py-2.5 rounded-xl flex items-center justify-between"
          style={{ background: `${archInfo.color}08`, border: `1px solid ${archInfo.color}25` }}>
          <span className="text-xs font-mono text-muted-foreground tracking-widest">{surfaceText(lang, "cipherCode")}</span>
          <span className="font-mono font-black text-sm tracking-widest" style={{ color: archInfo.color }}>
            {profile.archonCode}
          </span>
        </div>

        {/* Four Pillars */}
        <div>
          <div className="text-xs font-black tracking-[0.35em] text-muted-foreground mb-3">{surfaceText(lang, "fourPillars")}</div>
          <div className="space-y-3">
            {computeFourPillars(profile.dimensions, profile.overallScore).map(p => (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.symbol}</span>
                    <div>
                      <span className="text-xs font-black tracking-wider" style={{ color: p.color }}>{p.latin}</span>
                      <span className="text-xs text-muted-foreground ms-2 hidden sm:inline">{surfaceText(lang, `${p.id}Sub` as "mensSub" | "visSub" | "animaSub" | "legatumSub")}</span>
                    </div>
                  </div>
                  <span className="text-xs font-black" style={{ color: p.color }}>{p.score}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${p.score}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${p.color}90, ${p.color})` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Archetype declaration */}
        {profile.archetypeDeclaration && (
          <div className="px-4 py-3 rounded-xl italic text-sm text-muted-foreground leading-relaxed bg-card border-s-2"
            style={{ borderInlineStartColor: `${archInfo.color}60` }}>
            "{profile.archetypeDeclaration}"
          </div>
        )}
      </div>
    </motion.div>
  );
}

const DOMAIN_META: Record<string, { icon: React.ReactNode; color: string }> = {
  sport:    { icon: <Trophy className="w-4 h-4" />,    color: "#22d3ee" },
  tech:     { icon: <Cpu className="w-4 h-4" />,       color: "#a78bfa" },
  music:    { icon: <Music className="w-4 h-4" />,     color: "#f472b6" },
  business: { icon: <Briefcase className="w-4 h-4" />, color: "#4ade80" },
  cinema:   { icon: <Film className="w-4 h-4" />,      color: "#fb923c" },
  general:  { icon: <Globe className="w-4 h-4" />,     color: "#C9A84C" },
};

function timeAgo(d: string, lang: Parameters<typeof localeFor>[0]) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return surfaceText(lang, "justNow");
  const formatter = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: "always", style: "narrow" });
  if (m < 60) return formatter.format(-m, "minute");
  const h = Math.floor(m / 60);
  if (h < 24) return formatter.format(-h, "hour");
  const days = Math.floor(h / 24);
  if (days < 30) return formatter.format(-days, "day");
  return new Date(d).toLocaleDateString(localeFor(lang), { month: "short", year: "numeric" });
}

// ── Rank visual ───────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: Rank }) {
  const icons = [Star, Sword, Shield, Crown, Crown, Trophy, Zap];
  const Icon = icons[rank.tier] ?? Crown;
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border"
      style={{ color: rank.color, borderColor: `${rank.color}40`, background: `${rank.color}10` }}>
      <Icon className="w-4 h-4" />
      <span className="font-black text-sm tracking-wide">{rank.label}</span>
    </div>
  );
}

// ── XP Progress bar ───────────────────────────────────────────────────────────
function XpBar({ xp }: { xp: number }) {
  const { lang } = useLang();
  const thresholds = [0, 200, 500, 1000, 2000, 3500, 5000, 7500, 12000, 20000, 99999];
  let idx = thresholds.findIndex(t => xp < t) - 1;
  if (idx < 0) idx = thresholds.length - 2;
  const lo = thresholds[idx] ?? 0;
  const hi = thresholds[idx + 1] ?? 99999;
  const pct = hi >= 99999 ? 100 : Math.round(((xp - lo) / (hi - lo)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{xp.toLocaleString(localeFor(lang))} {finalLabelText(lang, "xp")}</span>
        {hi < 99999 && <span>{surfaceText(lang, "nextRank", { count: hi.toLocaleString(localeFor(lang)) })}</span>}
        {hi >= 99999 && <span className="text-yellow-400 font-bold">{surfaceText(lang, "maxRank")}</span>}
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-primary to-yellow-400" />
      </div>
    </div>
  );
}

// ── Honor progress bar ────────────────────────────────────────────────────────
function HonorBar({ honorCount, honorInfo }: { honorCount: number; honorInfo: HonorInfo }) {
  const { lang } = useLang();
  const ct = COMMUNITY_T[lang] ?? COMMUNITY_T.en;
  const thresholds = [0, 1, 5, 10, 25, 50, 999];
  let idx = thresholds.findIndex(t => honorCount < t) - 1;
  if (idx < 0) idx = thresholds.length - 2;
  const lo = thresholds[idx] ?? 0;
  const hi = thresholds[idx + 1] ?? 999;
  const pct = hi >= 999 ? 100 : Math.round(((honorCount - lo) / (hi - lo)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span style={{ color: honorInfo.color }}>{surfaceText(lang, "honorPoints", { count: honorCount.toLocaleString(localeFor(lang)) })}</span>
        {hi < 999 && <span className="text-muted-foreground">{surfaceText(lang, "nextTitle", { count: hi.toLocaleString(localeFor(lang)) })}</span>}
        {hi >= 999 && <span style={{ color: "#FFD700" }}>🏆 {ct.imperial_legend}</span>}
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${honorInfo.color}, ${honorInfo.color}88)` }} />
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function CitizenPage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const { lang } = useLang();
  const ct = COMMUNITY_T[lang] ?? COMMUNITY_T.en;
  const call = useCallContext();
  const [, navigate] = useLocation();
  const [data, setData] = useState<{
    citizen: Citizen; recentPosts: Post[]; achievements: Achievement[];
    violations: { reason: string; severity: string }[];
    followers: FollowerItem[];
    following: FollowerItem[];
    earned: number; total: number;
  } | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [honorLoading, setHonorLoading] = useState(false);
  const [honorDone, setHonorDone]   = useState(false);
  const [honorErr, setHonorErr]     = useState("");
  const [streaks, setStreaks] = useState<Record<string, { streak: number; completedToday: boolean; totalDays: number }>>({});
  const [isFollowing,     setIsFollowing]     = useState(false);
  const [followLoading,   setFollowLoading]   = useState(false);
  const [followerCount,   setFollowerCount]   = useState(0);
  const [showFollowers,   setShowFollowers]   = useState(false);
  const [showFollowing,   setShowFollowing]   = useState(false);
  const [showCompare,     setShowCompare]     = useState(false);

  async function openDM(targetUsername: string) {
    try {
      await fetch("/api/messages/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUsername, type: "direct" }),
      });
    } catch { /* ignore — room may already exist */ }
    navigate("/messages");
  }

  const fetchData = () => {
    if (!username) return;
    setLoading(true);
    fetch(`/api/citizens/${encodeURIComponent(username)}`)
      .then(r => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then(d => {
        if (d) {
          setData(d as typeof data);
          setFollowerCount(d.citizen?.followerCount ?? 0);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [username]);

  // Load follow status for the logged-in user
  useEffect(() => {
    if (!username || !currentUser) return;
    fetch(`/api/citizens/${encodeURIComponent(username)}/follow-status`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setIsFollowing(d.isFollowing ?? false))
      .catch(() => {});
  }, [username, currentUser]);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/archon/pillar/streaks?username=${encodeURIComponent(username)}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.streaks) setStreaks(d.streaks); })
      .catch(() => {});
  }, [username]);

  const giveHonor = async () => {
    setHonorLoading(true); setHonorErr("");
    try {
      const r = await fetch(`/api/citizens/${encodeURIComponent(username!)}/honor`, {
        method: "POST", credentials: "include",
      });
      if (r.status === 409) { setHonorErr("You have already honored this citizen."); return; }
      if (!r.ok) { const d = await r.json(); setHonorErr(d.error ?? ct.error); return; }
      setHonorDone(true);
      fetchData();
    } finally {
      setHonorLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!currentUser || !username) return;
    setFollowLoading(true);
    try {
      const method = isFollowing ? "DELETE" : "POST";
      const r = await fetch(`/api/citizens/${encodeURIComponent(username)}/follow`, {
        method, credentials: "include",
      });
      if (r.ok) {
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);
        setFollowerCount(prev => wasFollowing ? Math.max(0, prev - 1) : prev + 1);
        // Refresh followers list
        fetchData();
      }
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return <CitizenSkeleton />;

  if (notFound || !data) return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} lang={lang === "de" ? "de-DE" : lang} className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Crown className="w-16 h-16 text-muted-foreground/30" />
      <p className="text-xl font-bold">{ct.citizen_not_found}</p>
      <Link href="/citizens" className="text-primary hover:underline text-sm">← {surfaceText(lang, "viewCitizens")}</Link>
    </div>
  );

  const { citizen, recentPosts, achievements, violations, followers, following, earned, total } = data;
  const initials = citizen.username.slice(0, 2).toUpperCase();
  const shareProfile = async () => {
    const url = `${window.location.origin}/citizen/${encodeURIComponent(citizen.username)}`;
    if (navigator.share) {
      await navigator.share({ title: citizen.username, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
  };

  if (!currentUser) {
    return (
      <div dir={lang === "ar" ? "rtl" : "ltr"} lang={lang === "de" ? "de-DE" : lang} className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <Card className="overflow-hidden border-primary/30">
            <CardContent className="space-y-6 p-8 text-center">
              <div
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl text-3xl font-black text-black"
                style={{ background: `linear-gradient(135deg, ${citizen.rank.color}, ${citizen.rank.color}88)` }}
              >
                {initials}
              </div>
              <div>
                <h1 className="flex items-center justify-center gap-2 text-3xl font-black">{citizen.username}{citizen.royalVerified&&<span title="Royal verified" className="text-sky-400">👑</span>}</h1>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <RankBadge rank={citizen.rank} />
                  <span
                    className="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-black"
                    style={{
                      color: citizen.honorInfo.color,
                      borderColor: `${citizen.honorInfo.color}40`,
                      background: `${citizen.honorInfo.color}10`,
                    }}
                  >
                    {citizen.honorInfo.badge} {citizen.honorInfo.title}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
                <div className="text-[10px] font-black tracking-[0.2em] text-muted-foreground">{surfaceText(lang, "kingPoints")}</div>
                <div className="text-3xl font-black text-primary">{citizen.xp.toLocaleString(localeFor(lang))} {finalLabelText(lang, "xp")}</div>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-background/70 p-5">
                <Lock className="mx-auto mb-2 h-7 w-7 text-primary" />
                <div className="font-black">{surfaceText(lang, "privateLocked")}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {surfaceText(lang, "privateDescription")}
                </p>
              </div>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button onClick={shareProfile}><Share2 className="h-4 w-4" /> {surfaceText(lang, "shareProfile")}</Button>
                <Button variant="outline" onClick={() => navigate("/login")}>{ct.login}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const domMeta = DOMAIN_META[citizen.specialty] ?? DOMAIN_META.general;
  const winRate = citizen.gamesPlayed > 0 ? Math.round((citizen.wins / citizen.gamesPlayed) * 100) : 0;
  const joinDate = new Date(citizen.createdAt).toLocaleDateString(localeFor(lang), { month: "long", year: "numeric" });
  const isSelf = currentUser.username === citizen.username;

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} lang={lang === "de" ? "de-DE" : lang} className="min-h-screen bg-background">
      {/* Back */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <Link href="/citizens" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> {ct.back_citizens}
        </Link>
      </div>

      {/* Hero Card */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border p-8"
          style={{ borderColor: `${citizen.rank.color}30`, background: `linear-gradient(135deg, ${citizen.rank.color}08, transparent)` }}>

          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at top right, ${citizen.rank.color}15, transparent 60%)` }} />

          <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black text-black"
                style={{ background: `linear-gradient(135deg, ${citizen.rank.color}, ${citizen.rank.color}88)` }}>
                {initials}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 border-background bg-card">
                {citizen.rank.icon}
              </div>
              {citizen.isTrending && (
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-yellow-400 border-2 border-black flex items-center justify-center text-xs animate-pulse" title={ct.trending_gdna}>🔥</div>
              )}
              {citizen.isMuted && (
                <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-red-900 border border-red-500 flex items-center justify-center text-xs" title={ct.muted}>🔇</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="flex items-center gap-2 text-3xl font-black">{citizen.username}{citizen.royalVerified&&<span title="Royal verified" className="text-sky-400">👑</span>}</h1>
                <RankBadge rank={citizen.rank} />
                <Button variant="outline" size="sm" onClick={shareProfile}>
                  <Share2 className="h-4 w-4" /> {ct.share}
                </Button>
                 {isSelf && !citizen.royalVerified && (
                   <Button asChild size="sm">
                     <Link href="/royal-verification"><Shield className="h-4 w-4" />{lang==="ar"?"توثيق المنتج الملكي":"Producer verification"}</Link>
                   </Button>
                 )}
              </div>

              {/* Honor Title */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-black"
                style={{ color: citizen.honorInfo.color, borderColor: `${citizen.honorInfo.color}40`, background: `${citizen.honorInfo.color}10` }}>
                <Medal className="w-3.5 h-3.5" />
                {citizen.honorInfo.badge} {citizen.honorInfo.title} — {surfaceText(lang, "honorPoints", { count: citizen.honorCount.toLocaleString(localeFor(lang)) })}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1" style={{ color: domMeta.color }}>
                  {domMeta.icon} {surfaceText(lang, "domain", { name: surfaceText(lang, citizen.specialty in DOMAIN_META ? citizen.specialty as "sport"|"tech"|"music"|"business"|"cinema"|"general" : "general") })}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {ct.joined} {joinDate}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 text-yellow-400 font-bold">
                  {surfaceText(lang, "achievementsCount", { earned, total })}
                </span>
              </div>

              {/* Follower / Following counts */}
              <div className="flex items-center gap-4 text-sm">
                <button onClick={() => setShowFollowers(v => !v)}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  style={{ color: showFollowers ? "#C9A84C" : undefined }}>
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-black" style={{ color: "#C9A84C" }}>{followerCount.toLocaleString(localeFor(lang))}</span>
                  <span className="text-muted-foreground">{surfaceText(lang, "followers")}</span>
                </button>
                <span className="text-muted-foreground/40">·</span>
                <button onClick={() => setShowFollowing(v => !v)}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  style={{ color: showFollowing ? "#C9A84C" : undefined }}>
                  <span className="font-black" style={{ color: "#C9A84C" }}>{citizen.followingCount.toLocaleString(localeFor(lang))}</span>
                  <span className="text-muted-foreground">{surfaceText(lang, "following")}</span>
                </button>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="text-[10px] font-black tracking-[0.2em] text-muted-foreground">{surfaceText(lang, "kingPoints")}</div>
                <div className="text-2xl font-black text-primary">{citizen.xp.toLocaleString(localeFor(lang))} {finalLabelText(lang, "xp")}</div>
              </div>
              {currentUser && <XpBar xp={citizen.xp} />}
              {currentUser && <HonorBar honorCount={citizen.honorCount} honorInfo={citizen.honorInfo} />}
            </div>
          </div>

          {!currentUser && (
            <div className="relative mt-6 rounded-2xl border border-primary/20 bg-background/70 p-6 text-center">
              <Lock className="mx-auto mb-3 h-7 w-7 text-primary" />
              <div className="font-black">{surfaceText(lang, "privateLocked")}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {surfaceText(lang, "privateDescription")}
              </p>
              <Button className="mt-4" onClick={() => navigate("/login")}>{ct.login}</Button>
            </div>
          )}

          {/* Action buttons */}
          {currentUser && !isSelf && (
            <div className="relative mt-5 flex flex-wrap items-center gap-3">
              {/* Follow / Unfollow */}
              <button onClick={toggleFollow} disabled={followLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={isFollowing
                  ? { background: "#1a1a1a", border: "1px solid #C9A84C50", color: "#C9A84C" }
                  : { background: "#C9A84C", border: "1px solid #C9A84C", color: "#000" }}>
                {isFollowing
                  ? <><UserCheck className="w-4 h-4" />{followLoading ? "…" : surfaceText(lang, "following")}</>
                  : <><UserPlus  className="w-4 h-4" />{followLoading ? "…" : surfaceText(lang, "follow")}</>
                }
              </button>

              {/* Compare Archon */}
              <Button
                variant={showCompare ? "default" : "outline"}
                onClick={() => setShowCompare(v => !v)}
                className={showCompare ? "" : "border-primary/50 text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary"}>
                <Swords className="w-4 h-4" /> {ct.compare}
              </Button>

              {/* Divider */}
              <div style={{ width: 1, height: 28, background: "#ffffff15" }} />

              {/* Call / Message */}
              <button onClick={() => openDM(citizen.username)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                style={{ background: "#3b82f620", border: "1px solid #3b82f650", color: "#3b82f6" }}>
                <MessageCircle className="w-4 h-4" /> {surfaceText(lang, "message")}
              </button>
              <button onClick={() => call.startCall(citizen.username, false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                style={{ background: "#22c55e20", border: "1px solid #22c55e50", color: "#22c55e" }}>
                <Phone className="w-4 h-4" /> {surfaceText(lang, "voice")}
              </button>
              <button onClick={() => call.startCall(citizen.username, true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                style={{ background: "#a855f720", border: "1px solid #a855f750", color: "#a855f7" }}>
                <Video className="w-4 h-4" /> {surfaceText(lang, "video")}
              </button>

              {/* Divider */}
              <div style={{ width: 1, height: 28, background: "#ffffff15" }} />

              {/* Give Honor */}
              {honorDone ? (
                <div className="flex items-center gap-2 text-sm text-green-400 font-bold">
                  <CheckCircle className="w-4 h-4" /> {surfaceText(lang, "honorDone")}
                </div>
              ) : (
                <button onClick={giveHonor} disabled={honorLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{ background: `${citizen.honorInfo.color}20`, border: `1px solid ${citizen.honorInfo.color}50`, color: citizen.honorInfo.color }}>
                  <Heart className="w-4 h-4" />
                  {honorLoading ? "…" : surfaceText(lang, "honorCitizen", { name: citizen.username })}
                </button>
              )}
              {honorErr && <span className="text-xs text-red-400">{honorErr}</span>}
            </div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
          {[
            { icon: <Zap className="w-5 h-5" />,           label: surfaceText(lang, "xp"),       value: citizen.xp.toLocaleString(localeFor(lang)),         color: "text-primary" },
            { icon: <Coins className="w-5 h-5" />,          label: surfaceText(lang, "coins"),    value: citizen.balance.toLocaleString(localeFor(lang)),    color: "text-yellow-400" },
            { icon: <Medal className="w-5 h-5" />,          label: surfaceText(lang, "honor"),    value: citizen.honorCount.toLocaleString(localeFor(lang)), color: "text-cyan-400" },
            { icon: <Gamepad2 className="w-5 h-5" />,       label: surfaceText(lang, "games"),    value: citizen.gamesPlayed.toLocaleString(localeFor(lang)), color: "text-cyan-400" },
            { icon: <Trophy className="w-5 h-5" />,         label: surfaceText(lang, "winRate"), value: `${winRate.toLocaleString(localeFor(lang))}%`,       color: "text-green-400" },
            { icon: <MessageSquare className="w-5 h-5" />,  label: surfaceText(lang, "debates"),  value: citizen.totalDebates.toLocaleString(localeFor(lang)), color: "text-purple-400" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl bg-card border border-border/50 text-center">
              <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
              <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Followers list — shown when toggled */}
        {showFollowers && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-2xl border"
            style={{ borderColor: "#C9A84C30", background: "#C9A84C05" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-black tracking-widest" style={{ color: "#C9A84C" }}>
                👥 {surfaceText(lang, "followers")} ({followerCount.toLocaleString(localeFor(lang))})
              </div>
              <button onClick={() => setShowFollowers(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors">✕</button>
            </div>
            {followers && followers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {followers.map(f => (
                  <Link key={f.id} href={`/citizen/${f.username}`}>
                    <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-card border border-border/50 hover:border-primary/40 transition-colors cursor-pointer font-bold">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-black"
                        style={{ background: "#C9A84C" }}>
                        {f.username.slice(0, 1).toUpperCase()}
                      </span>
                      {f.username}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3">{ct.followers_empty}</p>
            )}
          </motion.div>
        )}

        {/* Following list — shown when toggled */}
        {showFollowing && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-2xl border"
            style={{ borderColor: "#C9A84C30", background: "#C9A84C05" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-black tracking-widest" style={{ color: "#C9A84C" }}>
                👥 {surfaceText(lang, "following")} ({citizen.followingCount.toLocaleString(localeFor(lang))})
              </div>
              <button onClick={() => setShowFollowing(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors">✕</button>
            </div>
            {following && following.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {following.map(f => (
                  <Link key={f.id} href={`/citizen/${f.username}`}>
                    <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-card border border-border/50 hover:border-primary/40 transition-colors cursor-pointer font-bold">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-black"
                        style={{ background: "#C9A84C" }}>
                        {f.username.slice(0, 1).toUpperCase()}
                      </span>
                      {f.username}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3">{ct.following_empty}</p>
            )}
          </motion.div>
        )}

        {/* Recent Honors */}
        {citizen.recentHonors.length > 0 && (
          <div className="mt-5 p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
            <div className="text-xs font-black text-yellow-400 tracking-widest mb-2">🎖️ {surfaceText(lang, "recentlyHonored")}</div>
            <div className="flex flex-wrap gap-2">
              {citizen.recentHonors.map(name => (
                <Link key={name} href={`/citizen/${name}`}>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-card border border-border/50 hover:border-primary/40 transition-colors cursor-pointer font-bold">
                    {name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Violations (if any) */}
        {violations.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl border border-red-500/20 bg-red-900/10">
            <div className="flex items-center gap-2 text-xs font-black text-red-400 tracking-widest mb-2">
              <AlertTriangle className="w-3.5 h-3.5" /> {ct.protocol_violations}
            </div>
            <div className="space-y-1">
              {violations.map((v, i) => (
                <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className={`font-bold ${v.severity === 'severe' ? 'text-red-400' : 'text-orange-400'}`}>
                    {v.severity.toUpperCase()}
                  </span>
                  <span>— {v.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Archon Comparison — current user vs viewed citizen */}
        {showCompare && currentUser && !isSelf && (
          <ArchonComparePanel
            leftUsername={currentUser.username}
            rightUsername={citizen.username}
            onClose={() => setShowCompare(false)}
          />
        )}

        {/* Empire Identity (Archon archetype + Four Pillars) */}
        <EmpireIdentitySection username={username!} />

        {/* Empire Pillar Streaks */}
        {Object.values(streaks).some(s => s.totalDays > 0) && (
          <div className="mt-5">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="text-orange-400">🔥</span> {surfaceText(lang, "pillarStreaks")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: "mens",    latin: "MENS",    symbol: "🧠", color: "#A8E6CF" },
                { id: "vis",     latin: "VIS",     symbol: "⚔️", color: "#C9A84C" },
                { id: "anima",   latin: "ANIMA",   symbol: "🔥", color: "#FF8C42" },
                { id: "legatum", latin: "LEGATUM", symbol: "👑", color: "#DDA0DD" },
              ].map(p => {
                const s = streaks[p.id];
                if (!s || s.totalDays === 0) return null;
                return (
                  <motion.div key={p.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl border text-center space-y-1"
                    style={{ borderColor: `${p.color}30`, background: `${p.color}08` }}>
                    <div className="text-2xl">{p.symbol}</div>
                    <div className="font-black text-xs tracking-widest" style={{ color: p.color }}>{p.latin}</div>
                    <div className="font-black text-xl" style={{ color: p.color }}>
                      {s.streak}
                      <span className="text-orange-400 ml-1">🔥</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{s.totalDays.toLocaleString(localeFor(lang))} {surfaceText(lang, "daysTotal")}</div>
                    {s.completedToday && (
                      <div className="text-xs font-bold text-green-400">✓ {surfaceText(lang, "today")}</div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Achievements */}
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" /> {ct.achievements}
          </h2>
          <div className="grid grid-cols-5 sm:grid-cols-12 gap-2">
            {achievements.map(a => (
              <motion.div key={a.id} whileHover={{ scale: 1.1 }}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center cursor-default transition-all ${
                  a.earned ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/30 opacity-40 grayscale"
                }`}
                title={a.label}>
                <span className="text-2xl">{a.icon}</span>
                <span className="text-[9px] font-bold text-muted-foreground leading-tight">{a.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        {recentPosts.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" /> {ct.recent_activity}
            </h2>
            <div className="space-y-3">
              {recentPosts.map(p => (
                <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-4 rounded-2xl bg-card border border-border/50">
                  <p className="text-sm text-foreground/90 leading-relaxed mb-2">{p.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="uppercase font-bold" style={{ color: DOMAIN_META[p.domain]?.color ?? "#C9A84C" }}>{surfaceText(lang, p.domain in DOMAIN_META ? p.domain as "sport"|"tech"|"music"|"business"|"cinema"|"general" : "general")}</span>
                    <span>·</span>
                    <span>❤️ {p.likes}</span>
                    <span>·</span>
                    <span>{timeAgo(p.createdAt, lang)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Honor System Explanation */}
        <div className="mt-8 p-5 rounded-2xl border border-primary/20 bg-primary/5">
          <div className="text-xs font-black text-primary tracking-widest mb-3">🏛️ {surfaceText(lang, "honorProtocol")}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { badge: "🌱", title: surfaceText(lang, "newCitizen"),     min: 0  },
              { badge: "🤝", title: surfaceText(lang, "trusted"),        min: 1  },
              { badge: "✅", title: surfaceText(lang, "respected"),      min: 5  },
              { badge: "🎖️", title: surfaceText(lang, "honorable"),      min: 10 },
              { badge: "💎", title: surfaceText(lang, "distinguished"),   min: 25 },
              { badge: "🏆", title: surfaceText(lang, "imperialLegend"), min: 50 },
            ].map(t => (
              <div key={t.title} className={`flex items-center gap-2 text-xs ${citizen.honorCount >= t.min ? 'opacity-100' : 'opacity-40'}`}>
                <span className="text-lg">{t.badge}</span>
                <div>
                  <div className="font-black">{t.title}</div>
                  <div className="text-muted-foreground">{surfaceText(lang, "honorPts", { count: t.min })}</div>
                </div>
                {citizen.honorCount >= t.min && <Eye className="w-3 h-3 text-primary ms-auto" />}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-muted-foreground border-t border-border/30 pt-3">
            🛡️ <span className="font-bold text-foreground">{surfaceText(lang, "antiTrivial")}</span> {surfaceText(lang, "antiTrivialBody")}
          </div>
        </div>
      </div>
    </div>
  );
}
