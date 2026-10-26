import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/contexts/LangContext";
import { contentCopy } from "@/i18n/content-discovery-copy";
import { isArabic, techT, type TechCopyKey } from "@/i18n/tech-surfaces-copy";
import { formatSurfaceDate, formatSurfaceNumber } from "@/i18n/locale-surfaces-b-copy";

interface EmpireGenome {
  dna_string: string;
  total_citizens: number;
  dominant_trait: string;
  genetic_diversity: number;
  generation: number;
  fitness_score: number;
  evolved_at: string;
}

interface Insight {
  id: number;
  content_type: string;
  body: string;
  domain: string;
  created_at: string;
}

interface Crossover {
  id: number;
  offspring: string;
  fitness: number;
  created_at: string;
  parent_a_content: string;
  parent_b_content: string;
}

interface TopCitizen {
  citizen_id: number;
  username: string;
  archetype: string;
  traits: string[];
  generation: number;
  xp: number;
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const DOMAIN_COLOR: Record<string, string> = {
  sport: "text-yellow-400", music: "text-purple-400", cinema: "text-blue-400",
  social: "text-green-400", gaming: "text-red-400", future: "text-cyan-400",
  system: "text-gray-400", general: "text-white",
};

const TYPE_ICON: Record<string, string> = {
  insight: "💡", prediction: "🔮", challenge: "⚔️", report: "📋",
};

export default function GenomePage() {
  const { lang } = useLang();
  const t = (key: Parameters<typeof contentCopy>[1]) => contentCopy(lang, key);
  const tx = (key: TechCopyKey, vars?: Record<string, string | number>) => techT(lang, key, vars);
  const [genome, setGenome] = useState<EmpireGenome | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [crossovers, setCrossovers] = useState<Crossover[]>([]);
  const [citizens, setCitizens] = useState<TopCitizen[]>([]);
  const [tab, setTab] = useState<"dna" | "insights" | "crossover" | "citizens">("dna");

  useEffect(() => {
    const load = async () => {
      const [g, ins, cr, cit] = await Promise.all([
        fetch(`${BASE}/api/genome/empire`).then(r => r.json()).catch(() => null),
        fetch(`${BASE}/api/genome/insights`).then(r => r.json()).catch(() => ({ insights: [] })),
        fetch(`${BASE}/api/genome/crossovers`).then(r => r.json()).catch(() => ({ crossovers: [] })),
        fetch(`${BASE}/api/genome/leaderboard`).then(r => r.json()).catch(() => ({ citizens: [] })),
      ]);
      setGenome(g);
      setInsights(ins.insights ?? []);
      setCrossovers(cr.crossovers ?? []);
      setCitizens(cit.citizens ?? []);
    };
    load();
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, []);

  // Render DNA string as colored blocks (8 chars per gene)
  const dnaGenes = genome?.dna_string
    ? Array.from({ length: 8 }, (_, i) => genome.dna_string.slice(i * 8, (i + 1) * 8))
    : [];

  const geneLabels: TechCopyKey[] = ["action", "victory", "growth", "abundance", "social", "sport", "vision", "sovereignty"];
  const geneColors = [
    "text-red-400", "text-yellow-400", "text-green-400", "text-emerald-400",
    "text-blue-400", "text-purple-400", "text-cyan-400", "text-orange-400",
  ];

  return (
    <div dir={isArabic(lang) ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground font-mono pt-16 pb-12">

      {/* Hero */}
      <div className="relative border-b border-yellow-500/20 px-6 py-10 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.05),transparent_70%)]" />
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-yellow-500 text-xs tracking-[0.4em] mb-2"
        >
          ⬡ GDNA GENOME ENGINE — GGE v1.0
        </motion.p>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight">
           <span className="text-yellow-400">G</span>{tx("genetic")}{" "}
           <span className="text-yellow-400">D</span>{tx("digital")}{" "}
           <span className="text-yellow-400">N</span>{tx("neural")}{" "}
           <span className="text-yellow-400">A</span>{tx("architecture")}
        </h1>
        <p className="mt-3 text-muted-foreground text-sm tracking-widest">
          {t("genomeSub")}
        </p>

        {/* Genome fitness */}
        {genome && (
          <div className="flex justify-center gap-8 mt-6 text-sm">
            {[
               { label: t("generation"), value: `#${formatSurfaceNumber(lang, genome.generation)}` },
               { label: t("fitness"), value: `${formatSurfaceNumber(lang, genome.fitness_score)}/${formatSurfaceNumber(lang, 100)}` },
               { label: t("diversity"), value: `${formatSurfaceNumber(lang, genome.genetic_diversity)}%` },
               { label: t("citizens"), value: formatSurfaceNumber(lang, genome.total_citizens) },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-yellow-400 font-black text-xl">{s.value}</div>
                <div className="text-muted-foreground text-xs tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border px-4 mt-0">
        {([
          { key: "dna",       label: t("empireDna") },
          { key: "insights",  label: t("selfGenerated") },
          { key: "crossover", label: t("crossovers") },
          { key: "citizens",  label: t("dnaRegistry") },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-xs tracking-widest transition-all ${
              tab === t.key
                ? "text-yellow-400 border-b-2 border-yellow-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        <AnimatePresence mode="wait">

          {/* ── TAB: EMPIRE DNA ── */}
          {tab === "dna" && (
            <motion.div key="dna" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {genome ? (
                <div className="space-y-6">
                  {/* Full DNA string */}
                  <div className="border border-yellow-500/30 rounded-xl p-6">
                     <div className="text-xs text-yellow-500/60 tracking-widest mb-4">{tx("collectiveDna")}</div>
                    <div className="font-mono text-lg md:text-2xl tracking-[0.15em] break-all text-yellow-400 leading-relaxed">
                      {dnaGenes.map((gene, i) => (
                        <span key={i} className={`${geneColors[i]} mr-2`}>{gene}</span>
                      ))}
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                       {tx("lastEncoded", { date: formatSurfaceDate(lang, genome.evolved_at, { dateStyle: "medium", timeStyle: "short" }) })}
                    </div>
                  </div>

                  {/* Gene breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {dnaGenes.map((gene, i) => (
                      <div key={i} className="border border-border rounded-xl p-4">
                         <div className={`text-xs tracking-widest mb-1 ${geneColors[i]}`}>{tx(geneLabels[i])}</div>
                        <div className="font-mono text-foreground font-bold tracking-wider">{gene}</div>
                      </div>
                    ))}
                  </div>

                  {/* Dominant trait */}
                  <div className="border border-border rounded-xl p-5 flex items-center gap-4">
                    <div className="text-4xl">🏆</div>
                    <div>
                      <div className="text-xs text-muted-foreground tracking-widest">{t("dominantTrait")}</div>
                      <div className={`text-xl font-black capitalize ${DOMAIN_COLOR[genome.dominant_trait] ?? "text-white"}`}>
                        {genome.dominant_trait.toUpperCase()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                         {tx("dominantDesc")}
                      </div>
                    </div>
                  </div>

                  {/* Fitness bar */}
                  <div className="border border-border rounded-xl p-5">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>{t("fitnessScore")}</span>
                      <span className="text-yellow-400">{formatSurfaceNumber(lang, genome.fitness_score)}/{formatSurfaceNumber(lang, 100)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${genome.fitness_score}%` }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-yellow-700 to-yellow-400 rounded-full"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                       {tx("fitnessDesc")}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-4xl mb-3">🧬</motion.div>
                  <p>{t("encodeGenome")}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB: SELF-GENERATED CONTENT ── */}
          {tab === "insights" && (
            <motion.div key="insights" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-4 p-4 border border-green-500/20 bg-green-500/5 rounded-xl text-xs text-green-400 tracking-wide">
                 {tx("generatedNotice")}
              </div>
              {insights.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <div className="text-3xl mb-2">💡</div>
                  <p>{t("generating")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((ins, i) => (
                    <motion.div
                      key={ins.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border border-border rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span>{TYPE_ICON[ins.content_type] ?? "⬡"}</span>
                        <span className={`text-xs tracking-widest uppercase ${DOMAIN_COLOR[ins.domain] ?? "text-white"}`}>
                          {ins.content_type} — {ins.domain}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                            {formatSurfaceDate(lang, ins.created_at, { dateStyle: "medium" })}
                        </span>
                      </div>
                      <p className="text-foreground/90 text-sm leading-relaxed">{ins.body}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB: GENETIC CROSSOVERS ── */}
          {tab === "crossover" && (
            <motion.div key="crossover" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-4 p-4 border border-purple-500/20 bg-purple-500/5 rounded-xl text-xs text-purple-400 tracking-wide">
                 {tx("crossoverNotice")}
              </div>
              {crossovers.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <div className="text-3xl mb-2">🔀</div>
                  <p>{t("crossoverRunning")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {crossovers.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.06 }}
                      className="border border-border rounded-xl p-5"
                    >
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {[c.parent_a_content, c.parent_b_content].map((p, j) => (
                          <div key={j} className="bg-card/50 rounded-lg p-3 text-xs text-muted-foreground truncate">
                             <span className="text-yellow-500/60">{tx("parent", { letter: j === 0 ? "A" : "B" })} </span>
                            {p?.slice(0, 80)}...
                          </div>
                        ))}
                      </div>
                      <div className="flex items-start gap-2">
                         <span className="text-purple-400 text-xs mt-1">{tx("offspring")}</span>
                        <p className="text-foreground text-sm flex-1">{c.offspring}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                            {tx("fitnessValue", { n: formatSurfaceNumber(lang, Math.round(c.fitness * 100)) })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB: CITIZEN DNA REGISTRY ── */}
          {tab === "citizens" && (
            <motion.div key="citizens" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {citizens.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <div className="text-3xl mb-2">👤</div>
                  <p>{t("encodeCitizens")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {citizens.map((c, i) => (
                    <motion.div
                      key={c.citizen_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border border-border rounded-xl p-4 flex items-center gap-4"
                    >
                      <div className="text-xl w-8 text-center">{
                        c.archetype === "WARRIOR" ? "⚔️" :
                        c.archetype === "CHAMPION" ? "🏆" :
                        c.archetype === "SAGE" ? "🔮" :
                        c.archetype === "MERCHANT" ? "💰" :
                        c.archetype === "HERALD" ? "📣" :
                        c.archetype === "ORACLE" ? "👁️" : "⬡"
                      }</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{c.username}</span>
                          <span className="text-xs text-yellow-400/60">{c.archetype}</span>
                           <span className="text-xs text-muted-foreground">{tx("generationShort", { n: formatSurfaceNumber(lang, c.generation) })}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(Array.isArray(c.traits) ? c.traits : JSON.parse(c.traits as unknown as string ?? "[]")).map((t: string) => (
                            <span key={t} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t}</span>
                          ))}
                        </div>
                      </div>
                       <div className="text-end flex-shrink-0">
                          <div className="text-yellow-400 font-bold">{formatSurfaceNumber(lang, c.xp)} XP</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
