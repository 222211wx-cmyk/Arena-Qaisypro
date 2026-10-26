import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Music, Flame, Star, ArrowRight, Crown, Radio, Globe2, ChevronRight } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Skeleton } from "@workspace/gdna-ds/components/ui/skeleton";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { formatSurfaceNumber } from "@/i18n/locale-surfaces-b-copy";

// ── Types ───────────────────────────────────────────────────────────────────
interface Legend {
  id: number | null;   // null = static display only (no DB row)
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
const MUSIC_IMAGES: Record<string, string> = {
  "Michael Jackson":  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Michael_Jackson_in_1988.jpg/400px-Michael_Jackson_in_1988.jpg",
  "Beyoncé":          "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Beyonc%C3%A9_at_The_Battle_of_Versailles_Fashion_Show_%28cropped%29.png/400px-Beyonc%C3%A9_at_The_Battle_of_Versailles_Fashion_Show_%28cropped%29.png",
  "Taylor Swift":     "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/191125_Taylor_Swift_at_the_2019_American_Music_Awards_%28cropped%29.jpg/400px-191125_Taylor_Swift_at_the_2019_American_Music_Awards_%28cropped%29.jpg",
  "Bob Marley":       "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Bob-Marley-in-Concert_Zurich_05-30-80.jpg/400px-Bob-Marley-in-Concert_Zurich_05-30-80.jpg",
  "Elvis Presley":    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Elvis_Presley_promoting_Jailhouse_Rock.jpg/400px-Elvis_Presley_promoting_Jailhouse_Rock.jpg",
  "Whitney Houston":  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Whitney_Houston_Welcome_Home_Heroes_1991.jpg/400px-Whitney_Houston_Welcome_Home_Heroes_1991.jpg",
  "Tupac Shakur":     "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Tupac_Shakur_photo.jpg/400px-Tupac_Shakur_photo.jpg",
};

const MUSIC_QUOTES: Record<string, string> = {
  "Michael Jackson":  "music_quote_michael",
  "Beyoncé":          "music_quote_beyonce",
  "Taylor Swift":     "music_quote_taylor",
  "Bob Marley":       "music_quote_marley",
  "Elvis Presley":    "music_quote_elvis",
  "Whitney Houston":  "music_quote_whitney",
  "Tupac Shakur":     "music_quote_tupac",
};

const MUSIC_GENRES: Record<string, string[]> = {
  pop:    ["Michael Jackson", "Beyoncé", "Taylor Swift", "Elvis Presley"],
  rnb:    ["Beyoncé", "Whitney Houston"],
  hiphop: ["Tupac Shakur"],
  reggae: ["Bob Marley"],
};

const GENRE_LABELS: Record<string, string> = {
  pop: "music_genre_pop", rnb: "music_genre_rnb",
  hiphop: "music_genre_hiphop", reggae: "music_genre_reggae",
};

// DNA_PILLARS is computed inside MusicPage using t()

// ── Stat bar ─────────────────────────────────────────────────────────────────
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

// ── Legend Card ───────────────────────────────────────────────────────────────
function LegendCard({ legend, index }: { legend: Legend; index: number }) {
  const { t, lang } = useLang();
  const img   = MUSIC_IMAGES[legend.name] ?? legend.imageUrl;
  const quote = MUSIC_QUOTES[legend.name];

  const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32", "#60a5fa", "#a78bfa", "#34d399"];
  const rankColor   = RANK_COLORS[Math.min(legend.rank - 1, RANK_COLORS.length - 1)];

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
      <Badge className="absolute top-3 right-3 z-10 bg-black/70 border border-yellow-400/30 text-yellow-400 text-xs font-bold">
        {formatSurfaceNumber(lang, legend.score)}
      </Badge>

      {/* Image */}
      <div className="relative h-56 overflow-hidden bg-gray-800">
        {img ? (
          <img
            src={img}
            alt={legend.name}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={48} className="text-yellow-400/30" />
          </div>
        )}
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

        {quote && (
          <p className="text-gray-400 text-xs italic leading-relaxed border-l-2 border-yellow-400/30 pl-2">
            “{t(quote)}”
          </p>
        )}

        {legend.stats && (
          <div className="space-y-1.5 pt-1">
            <StatBar label={t("stat_legacy")}    value={legend.stats.legacy} />
            <StatBar label={t("stat_peak")}      value={legend.stats.peak}   />
            <StatBar label={t("stat_influence")} value={legend.stats.impact} />
          </div>
        )}

        {/* CTA — only navigable when we have a real DB id */}
        {legend.id !== null ? (
          <Link
            href={`/legends/${legend.id}`}
            className="flex items-center justify-between w-full mt-2 px-3 py-2 bg-yellow-400/5 border border-yellow-400/20 rounded-xl text-yellow-400 text-xs font-bold hover:bg-yellow-400/10 hover:border-yellow-400/40 transition-all group/btn"
          >
            <span>{t("sport_view_hub")}</span>
            <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <div className="flex items-center justify-between w-full mt-2 px-3 py-2 bg-gray-800/50 border border-gray-700/40 rounded-xl text-gray-600 text-xs font-bold cursor-default select-none">
            <span>{t("music_coming_soon")}</span>
            <ChevronRight size={14} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loading skeleton card ────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden">
      <Skeleton className="h-56 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-8 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function MusicPage() {
  const { t, lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [legends, setLegends]           = useState<Legend[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "pop" | "rnb" | "hiphop" | "reggae">("all");

  const DNA_PILLARS = [
    { icon: "🎵", label: t("music_pillar_rhythm"),    desc: t("music_pillar_rhythm_desc") },
    { icon: "👁️", label: t("music_pillar_vision"),   desc: t("music_pillar_vision_desc") },
    { icon: "🌍", label: t("music_pillar_influence"), desc: t("music_pillar_influence_desc") },
    { icon: "♾️", label: t("music_pillar_timeless"), desc: t("music_pillar_timeless_desc") },
  ];

  useEffect(() => {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    fetch(`${base}/api/legends?domain=music&limit=50`)
      .then(r => r.json())
      .then(data => {
        const fromApi: Legend[] = (data.legends ?? []).map((l: any) => ({
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
        setLegends(fromApi);
      })
      .catch(() => setLegends([]))
      .finally(() => setLoading(false));
  }, []);

  const displayed = activeFilter === "all"
    ? legends
    : legends.filter(l => MUSIC_GENRES[activeFilter]?.includes(l.name));

  return (
    <div className="min-h-screen bg-black text-white" dir={dir}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
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
            <span className="text-yellow-400">{t("music_hero_music")}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              {/* Pillar tag */}
              <div className="inline-flex items-center gap-2 border border-yellow-400/30 bg-yellow-400/5 text-yellow-400 text-xs font-black tracking-widest px-3 py-1.5 rounded-full mb-4">
                <Radio size={12} />
                {t("music_pillar_tag")}
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none">
                <span className="text-white">{t("music_hero_music")}</span>
                <br />
                <span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  {t("music_hero_legends")}
                </span>
              </h1>

              <p className="mt-4 text-gray-400 max-w-xl leading-relaxed">
                {t("music_desc")}
              </p>
            </div>

            {/* Live stats */}
            <div className="flex gap-4 lg:gap-6 shrink-0">
              <div className="text-center">
                <div className="text-3xl font-black text-yellow-400">
                   {loading ? "—" : formatSurfaceNumber(lang, legends.length)}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{t("sport_legends_label")}</div>
              </div>
              <div className="w-px bg-gray-800" />
              <div className="text-center">
                <div className="text-3xl font-black text-yellow-400">{formatSurfaceNumber(lang, 4)}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{t("music_genres_label")}</div>
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
          {(["all", "pop", "rnb", "hiphop", "reggae"] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
                activeFilter === f
                  ? "bg-yellow-400 text-black"
                  : "border border-gray-700 text-gray-400 hover:border-yellow-400/30 hover:text-yellow-400"
              }`}
            >
              {f === "all" ? t("music_filter_all") : t(GENRE_LABELS[f])}
            </button>
          ))}

          {/* Vote CTA */}
          <Link href="/games/globalstar" className="ml-auto">
            <Button size="sm" className="flex items-center gap-2 bg-yellow-400 text-black font-black text-xs tracking-wider rounded-full hover:bg-yellow-300">
              <Flame size={13} />
              {t("sport_vote_now")}
              <ArrowRight size={13} />
            </Button>
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <Music size={48} className="mx-auto mb-3 opacity-20" />
            <p>{t("music_no_legends")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayed.map((legend, i) => (
              <LegendCard key={legend.id ?? legend.name} legend={legend} index={i} />
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
                {t("music_goat_title")}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {t("music_mj_vs")}
              </h2>
              <p className="text-gray-400 text-sm mt-2 max-w-md">
                {t("music_goat_desc")}
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <img
                  src={MUSIC_IMAGES["Michael Jackson"]}
                  alt="MJ"
                  className="w-16 h-16 rounded-full object-cover object-top border-2 border-yellow-400 mx-auto mb-1"
                />
                <div className="text-xs text-yellow-400 font-bold">MJ</div>
              </div>
              <div className="text-yellow-400 font-black text-2xl">{t("showdown_vs")}</div>
              <div className="text-center">
                <img
                  src={MUSIC_IMAGES["Beyoncé"]}
                  alt="Beyoncé"
                  className="w-16 h-16 rounded-full object-cover object-top border-2 border-yellow-400 mx-auto mb-1"
                />
                <div className="text-xs text-yellow-400 font-bold">BEYONCÉ</div>
              </div>

              <Link href="/games/globalstar">
                <Button className="flex items-center gap-2 bg-yellow-400 text-black font-black text-sm rounded-xl hover:bg-yellow-300 hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                  {t("music_goat_vote")}
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
