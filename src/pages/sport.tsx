import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Trophy, Flame, Star, ArrowRight, Crown, Swords, Globe2, ChevronRight } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { gameLocaleText } from "@/i18n/game-locale-copy";
import { formatSurfaceNumber } from "@/i18n/locale-surfaces-b-copy";

// ── Types ───────────────────────────────────────────────────────────────────
interface Legend {
  id: number;
  rank: number;
  name: string;
  domain: string;
  score: number;
  nationality: string;
  imageUrl?: string;
  peakYear?: number;
  stats?: { clutch: number; legacy: number; style: number; impact: number; peak: number };
}

// ── Static image map (Wikipedia CDN) ────────────────────────────────────────
const SPORT_IMAGES: Record<string, string> = {
  "Cristiano Ronaldo": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Cristiano_Ronaldo_2018.jpg/400px-Cristiano_Ronaldo_2018.jpg",
  "Lionel Messi":      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg/400px-Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg",
  "LeBron James":      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/LeBron_James_crop.jpg/400px-LeBron_James_crop.jpg",
  "Roger Federer":     "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Roger_Federer_at_the_2009_US_Open_03.jpg/400px-Roger_Federer_at_the_2009_US_Open_03.jpg",
  "Serena Williams":   "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Serena_Williams_2013_US_Open.jpg/400px-Serena_Williams_2013_US_Open.jpg",
  "Muhammad Ali":      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Muhammad_Ali_NYWTS.jpg/400px-Muhammad_Ali_NYWTS.jpg",
};

const SPORT_QUOTES: Record<string, string> = {
  "Cristiano Ronaldo": "sport_quote_ronaldo",
  "Lionel Messi":      "sport_quote_messi",
  "LeBron James":      "sport_quote_lebron",
  "Roger Federer":     "sport_quote_federer",
  "Serena Williams":   "sport_quote_serena",
  "Muhammad Ali":      "sport_quote_ali",
};

// DNA_PILLARS is now computed inside SportPage using t()

function StatBar({ label, value }: { label: string; value: number }) {
  const { lang } = useLang();
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-yellow-400 font-bold">{formatSurfaceNumber(lang, value)}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-1000"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function LegendCard({ legend, index }: { legend: Legend; index: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const { t, lang } = useLang();
  const img  = SPORT_IMAGES[legend.name] ?? legend.imageUrl;
  const quote = SPORT_QUOTES[legend.name];

  const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32", "#60a5fa", "#a78bfa", "#34d399"];
  const rankColor  = RANK_COLORS[Math.min(legend.rank - 1, RANK_COLORS.length - 1)];

  return (
    <div
      className="group relative bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden hover:border-yellow-400/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(255,215,0,0.12)]"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      {/* Rank badge */}
      <div
        className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2"
        style={{ borderColor: rankColor, color: rankColor, background: "rgba(0,0,0,0.8)" }}
      >
        #{formatSurfaceNumber(lang, legend.rank)}
      </div>

      {/* Score badge */}
      <div className="absolute top-3 right-3 z-10 bg-black/70 border border-yellow-400/30 text-yellow-400 text-xs font-bold px-2 py-1 rounded-lg">
        {formatSurfaceNumber(lang, legend.score)}
      </div>

      {/* Image */}
      <div className="relative h-56 overflow-hidden bg-gray-800">
        {img && !imgFailed ? (
          <img
            src={img}
            alt={legend.name}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-gray-800 to-gray-900">
            <Trophy size={48} className="text-yellow-400/30" />
            <span className="text-yellow-400/50 font-black text-2xl tracking-wide">
              {legend.name.split(" ").map(w => w[0]).join("")}
            </span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-white font-black text-lg tracking-tight leading-tight">
            {legend.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Globe2 size={11} className="text-gray-500" />
            <span className="text-gray-400 text-xs">{legend.nationality}</span>
            {legend.peakYear && (
              <>
                <span className="text-gray-700">·</span>
                <Star size={11} className="text-yellow-500" />
                <span className="text-yellow-500/80 text-xs">{t("sport_peak")} {formatSurfaceNumber(lang, legend.peakYear, { useGrouping: false })}</span>
              </>
            )}
          </div>
        </div>

        {/* Quote */}
        {quote && (
          <p className="text-gray-400 text-xs italic leading-relaxed border-l-2 border-yellow-400/30 pl-2">
            “{t(quote)}”
          </p>
        )}

        {/* DNA Stats */}
        {legend.stats && (
          <div className="space-y-1.5 pt-1">
            <StatBar label={t("stat_legacy")} value={legend.stats.legacy} />
            <StatBar label={t("stat_peak")}   value={legend.stats.peak}   />
            <StatBar label={t("stat_impact")} value={legend.stats.impact} />
          </div>
        )}

        {/* CTA */}
        <Link
          href={`/legends/${legend.id}`}
          className="flex items-center justify-between w-full mt-2 px-3 py-2 bg-yellow-400/5 border border-yellow-400/20 rounded-xl text-yellow-400 text-xs font-bold hover:bg-yellow-400/10 hover:border-yellow-400/40 transition-all group/btn"
        >
          <span>{t("sport_view_hub")}</span>
          <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SportPage() {
  const { t, lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [legends, setLegends] = useState<Legend[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "football" | "basketball" | "tennis" | "boxing">("all");

  const DNA_PILLARS = [
    { icon: "🧬", label: t("sport_pillar_legacy"),  desc: t("sport_pillar_legacy_desc") },
    { icon: "⚡", label: t("sport_pillar_peak"),    desc: t("sport_pillar_peak_desc") },
    { icon: "🛡️", label: t("sport_pillar_clutch"), desc: t("sport_pillar_clutch_desc") },
    { icon: "🌍", label: t("sport_pillar_impact"),  desc: t("sport_pillar_impact_desc") },
  ];

  useEffect(() => {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    fetch(`${base}/api/legends?limit=20`)
      .then(r => r.json())
      .then(data => {
        const all: Legend[] = (data.legends ?? [])
          .filter((l: Legend) => l.domain === "sport")
          .map((l: any) => ({
            id:          l.id,
            rank:        l.rank,
            name:        l.name,
            domain:      l.domain,
            score:       l.score,
            nationality: l.nationality ?? "",
            imageUrl:    l.image_url ?? l.imageUrl,
            peakYear:    l.peak_year ?? l.peakYear,
            stats:       l.stats,
          }));
        setLegends(all);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const FILTER_NAMES: Record<string, string> = {
    football: "sport_filter_football", basketball: "sport_filter_basketball",
    tennis: "sport_filter_tennis", boxing: "sport_filter_boxing",
  };

  const FILTER_NAMES_SPORT: Record<string, string[]> = {
    football:   ["Cristiano Ronaldo", "Lionel Messi"],
    basketball: ["LeBron James"],
    tennis:     ["Roger Federer", "Serena Williams"],
    boxing:     ["Muhammad Ali"],
  };

  const displayed = activeFilter === "all"
    ? legends
    : legends.filter(l => FILTER_NAMES_SPORT[activeFilter]?.includes(l.name));

  return (
    <div className="min-h-screen bg-black text-white" dir={dir}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px]"
            style={{ background: "radial-gradient(ellipse, rgba(255,215,0,0.08) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-14 pb-10 relative">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-6">
            <Link href="/" className="hover:text-gray-400 transition-colors">{t("empire_eternal")}</Link>
            <ChevronRight size={12} />
            <span className="text-yellow-400">{t("sport_hero_sport")}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              {/* Pillar tag */}
              <div className="inline-flex items-center gap-2 border border-yellow-400/30 bg-yellow-400/5 text-yellow-400 text-xs font-black tracking-widest px-3 py-1.5 rounded-full mb-4">
                <Swords size={12} />
                {t("sport_pillar_tag")}
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none">
                <span className="text-white">{t("sport_hero_sport")}</span>
                <br />
                <span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  {t("sport_hero_legends")}
                </span>
              </h1>

              <p className="mt-4 text-gray-400 max-w-xl leading-relaxed">
                {t("sport_desc")}
              </p>
            </div>

            {/* Live stats */}
            <div className="flex gap-4 lg:gap-6 shrink-0">
              <div className="text-center">
                <div className="text-3xl font-black text-yellow-400">{formatSurfaceNumber(lang, legends.length)}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{t("sport_legends_label")}</div>
              </div>
              <div className="w-px bg-gray-800" />
              <div className="text-center">
                <div className="text-3xl font-black text-yellow-400">{formatSurfaceNumber(lang, 6)}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{t("sport_disciplines_label")}</div>
              </div>
              <div className="w-px bg-gray-800" />
              <div className="text-center">
                <div className="text-3xl font-black text-yellow-400">∞</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{t("sport_legacy_label")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DNA Pillars strip ─────────────────────────────────────────────── */}
      <section className="border-t border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-800/60">
            {DNA_PILLARS.map(p => (
              <div key={p.label} className="flex items-center gap-3 px-5 py-4">
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <div className="text-yellow-400 text-xs font-black tracking-wider">{p.label}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Filter + Grid ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-10">

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(["all", "football", "basketball", "tennis", "boxing"] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
                activeFilter === f
                  ? "bg-yellow-400 text-black"
                  : "border border-gray-700 text-gray-400 hover:border-yellow-400/30 hover:text-yellow-400"
              }`}
            >
              {f === "all" ? t("sport_filter_all") : t(FILTER_NAMES[f])}
            </button>
          ))}

          {/* Vote CTA */}
          <Link
            href="/games/globalstar"
            className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-yellow-400 text-black text-xs font-black tracking-wider rounded-full hover:bg-yellow-300 transition-all"
          >
            <Flame size={13} />
            {t("sport_vote_now")}
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" role="status" aria-label={gameLocaleText(lang, "loading")}>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-80 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-20 text-red-400" role="alert">
            <p>{gameLocaleText(lang, "loadFailed")}</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <Trophy size={48} className="mx-auto mb-3 opacity-20" />
            <p>{t("sport_no_legends")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayed.map((legend, i) => (
              <LegendCard key={legend.id} legend={legend} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ── GOAT Showdown Banner ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-14">
        <div className="relative rounded-2xl overflow-hidden border border-yellow-400/20 bg-gradient-to-r from-gray-900 via-black to-gray-900 p-8">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,215,0,0.05) 0%, transparent 70%)" }} />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-yellow-400 text-xs font-black tracking-widest mb-2">
                <Crown size={14} />
                {t("sport_goat_title")}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {t("sport_cr7_vs")}
              </h2>
              <p className="text-gray-400 text-sm mt-2 max-w-md">
                {t("sport_goat_desc")}
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <img
                  src={SPORT_IMAGES["Cristiano Ronaldo"]}
                  alt="CR7"
                  className="w-16 h-16 rounded-full object-cover object-top border-2 border-yellow-400 mx-auto mb-1"
                />
                <div className="text-xs text-yellow-400 font-bold">CR7</div>
              </div>
              <div className="text-yellow-400 font-black text-2xl">{t("showdown_vs")}</div>
              <div className="text-center">
                <img
                  src={SPORT_IMAGES["Lionel Messi"]}
                  alt="Messi"
                  className="w-16 h-16 rounded-full object-cover object-top border-2 border-yellow-400 mx-auto mb-1"
                />
                <div className="text-xs text-yellow-400 font-bold">MESSI</div>
              </div>

              <Link
                href="/games/globalstar"
                className="flex items-center gap-2 px-5 py-3 bg-yellow-400 text-black font-black text-sm rounded-xl hover:bg-yellow-300 transition-all hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]"
              >
                {t("sport_goat_vote")}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
