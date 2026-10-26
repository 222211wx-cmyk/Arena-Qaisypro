import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Film, Flame, Star, ArrowRight, Crown, Clapperboard, Globe2, ChevronRight } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { Skeleton } from "@/components/Skeleton";
import { gameLocaleText, localeForLang } from "@/i18n/game-locale-copy";

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
const CINEMA_IMAGES: Record<string, string> = {
  "Stanley Kubrick":   "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Kubrick_cropped.jpg/400px-Kubrick_cropped.jpg",
  "Quentin Tarantino": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Quentin_Tarantino_by_Gage_Skidmore.jpg/400px-Quentin_Tarantino_by_Gage_Skidmore.jpg",
  "Martin Scorsese":   "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Martin_Scorsese_Sept_2018.jpg/400px-Martin_Scorsese_Sept_2018.jpg",
  "Akira Kurosawa":    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/twentytwo/Akira_Kurosawa.jpg/400px-Akira_Kurosawa.jpg",
  "Meryl Streep":      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Meryl_Streep_December_2018.jpg/400px-Meryl_Streep_December_2018.jpg",
  "Christopher Nolan": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Christopher_Nolan_Cannes_2018.jpg/400px-Christopher_Nolan_Cannes_2018.jpg",
};

const CINEMA_QUOTES: Record<string, string> = {
  "Stanley Kubrick":   "cinema_quote_kubrick",
  "Quentin Tarantino": "cinema_quote_tarantino",
  "Martin Scorsese":   "cinema_quote_scorsese",
  "Akira Kurosawa":    "cinema_quote_kurosawa",
  "Meryl Streep":      "cinema_quote_streep",
  "Christopher Nolan": "cinema_quote_nolan",
};

const ERA_NAMES: Record<string, string> = {
  "golden-age":   "era_golden_age",
  "new-hollywood": "era_new_hollywood",
  "modern":       "era_modern",
  "independent":  "era_independent",
};

// Map legends to eras by name
const ERA_MAP: Record<string, string[]> = {
  "golden-age":    ["Akira Kurosawa"],
  "new-hollywood": ["Stanley Kubrick", "Martin Scorsese"],
  "modern":        ["Christopher Nolan"],
  "independent":   ["Quentin Tarantino"],
};

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-primary font-bold">{value}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-1000"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function LegendCard({ legend, index }: { legend: Legend; index: number }) {
  const { t, lang } = useLang();
  const img   = CINEMA_IMAGES[legend.name] ?? legend.imageUrl;
  const quote = CINEMA_QUOTES[legend.name];

  const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32", "#60a5fa", "#a78bfa", "#34d399"];
  const rankColor   = RANK_COLORS[Math.min(legend.rank - 1, RANK_COLORS.length - 1)];

  return (
    <div
      className="group relative bg-card/80 border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(255,215,0,0.12)]"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      {/* Rank badge */}
      <div
        className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2"
        style={{ borderColor: rankColor, color: rankColor, background: "rgba(0,0,0,0.8)" }}
      >
        #{legend.rank.toLocaleString(localeForLang[lang])}
      </div>

      {/* Score badge */}
      <div className="absolute top-3 right-3 z-10 bg-background/70 border border-primary/30 text-primary text-xs font-bold px-2 py-1 rounded-lg">
        {legend.score.toLocaleString(localeForLang[lang])}
      </div>

      {/* Image */}
      <div className="relative h-56 overflow-hidden bg-muted">
        {img ? (
          <img
            src={img}
            alt={legend.name}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film size={48} className="text-primary/30" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-foreground font-black text-lg tracking-tight leading-tight">
            {legend.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Globe2 size={11} className="text-muted-foreground" />
            <span className="text-muted-foreground text-xs">{legend.nationality}</span>
            {legend.peakYear && (
              <>
                <span className="text-muted-foreground">·</span>
                <Star size={11} className="text-primary" />
                <span className="text-primary/80 text-xs">{t("sport_peak")} {legend.peakYear.toLocaleString(localeForLang[lang], { useGrouping: false })}</span>
              </>
            )}
          </div>
        </div>

        {/* Quote */}
        {quote && (
          <p className="text-muted-foreground text-xs italic leading-relaxed border-l-2 border-primary/30 pl-2">
            “{t(quote)}”
          </p>
        )}

        {/* DNA Stats */}
        {legend.stats && (
          <div className="space-y-1.5 pt-1">
            <StatBar label={t("cinema_pillar_direction")} value={legend.stats.style}  />
            <StatBar label={t("cinema_pillar_impact")} value={legend.stats.impact} />
            <StatBar label={t("cinema_pillar_legacy")} value={legend.stats.legacy} />
          </div>
        )}

        {/* CTA */}
        <Link
          href={`/legends/${legend.id}`}
          className="flex items-center justify-between w-full mt-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl text-primary text-xs font-bold hover:bg-primary/10 hover:border-primary/40 transition-all group/btn"
        >
          <span>{t("cinema_view_hub")}</span>
          <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CinemaPage() {
  const { t, lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [legends, setLegends] = useState<Legend[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "golden-age" | "new-hollywood" | "modern" | "independent">("all");

  const DNA_PILLARS = [
    { icon: "🎬", label: t("cinema_pillar_direction"), desc: t("cinema_pillar_direction_desc") },
    { icon: "📖", label: t("cinema_pillar_story"), desc: t("cinema_pillar_story_desc") },
    { icon: "💥", label: t("cinema_pillar_impact"), desc: t("cinema_pillar_impact_desc") },
    { icon: "🏆", label: t("cinema_pillar_legacy"), desc: t("cinema_pillar_legacy_desc") },
  ];

  useEffect(() => {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    fetch(`${base}/api/legends?domain=cinema&limit=50`)
      .then(r => r.json())
      .then(data => {
        const apiLegends: Legend[] = (data.legends ?? []).map((l: any) => ({
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
        setLegends(apiLegends);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const displayed = activeFilter === "all"
    ? legends
    : legends.filter(l => ERA_MAP[activeFilter]?.includes(l.name));

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px]"
            style={{ background: "radial-gradient(ellipse, rgba(255,215,0,0.08) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-14 pb-10 relative">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
             <Link href="/" className="hover:text-foreground transition-colors">{t("empire_eternal")}</Link>
            <ChevronRight size={12} />
             <span className="text-primary">{t("cinema_hero_cinema")}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              {/* Pillar tag */}
              <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/5 text-primary text-xs font-black tracking-widest px-3 py-1.5 rounded-full mb-4">
                <Clapperboard size={12} />
                 {t("cinema_pillar_tag")}
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none">
                <span className="text-foreground">{t("cinema_hero_cinema")}</span>
                <br />
                <span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  {t("cinema_hero_legends")}
                </span>
              </h1>

              <p className="mt-4 text-muted-foreground max-w-xl leading-relaxed">{t("cinema_desc")}</p>
            </div>

            {/* Live stats */}
            <div className="flex gap-4 lg:gap-6 shrink-0">
              <div className="text-center">
                <div className="text-3xl font-black text-primary">{legends.length.toLocaleString(localeForLang[lang])}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{t("sport_legends_label")}</div>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <div className="text-3xl font-black text-primary">4</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{t("cinema_eras_label")}</div>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <div className="text-3xl font-black text-primary">∞</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{t("cinema_frames_label")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DNA Pillars strip ─────────────────────────────────────────────── */}
      <section className="border-t border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {DNA_PILLARS.map(p => (
              <div key={p.label} className="flex items-center gap-3 px-5 py-4">
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <div className="text-primary text-xs font-black tracking-wider">{p.label}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">{p.desc}</div>
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
          {(["all", "golden-age", "new-hollywood", "modern", "independent"] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
                activeFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:border-primary/30 hover:text-primary"
              }`}
            >
               {f === "all" ? t("cinema_filter_all") : t(ERA_NAMES[f])}
            </button>
          ))}

          {/* Vote CTA */}
          <Link
            href="/games/globalstar"
            className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-black tracking-wider rounded-full hover:bg-primary/90 transition-all"
          >
            <Flame size={13} />
            {t("cinema_vote_now")}
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" role="status" aria-label={gameLocaleText(lang, "loading")}>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-20 text-destructive" role="alert">
            <p>{gameLocaleText(lang, "loadFailed")}</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Film size={48} className="mx-auto mb-3 opacity-20" />
            <p>{t("cinema_no_legends")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayed.map((legend, i) => (
              <LegendCard key={legend.id} legend={legend} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ── Director Showdown Banner ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-14">
        <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-r from-gray-900 via-black to-gray-900 p-8">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,215,0,0.05) 0%, transparent 70%)" }} />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-primary text-xs font-black tracking-widest mb-2">
                <Crown size={14} />
                {t("cinema_goat_title")}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                {t("cinema_kubrick_vs")}
              </h2>
              <p className="text-muted-foreground text-sm mt-2 max-w-md">{t("cinema_goat_desc")}</p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary mx-auto mb-1 bg-muted flex items-center justify-center">
                  {CINEMA_IMAGES["Stanley Kubrick"] ? (
                    <img
                      src={CINEMA_IMAGES["Stanley Kubrick"]}
                      alt="Kubrick"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <Film size={24} className="text-primary/60" />
                  )}
                </div>
                <div className="text-xs text-primary font-bold">KUBRICK</div>
              </div>
              <div className="text-primary font-black text-2xl">{t("showdown_vs")}</div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary mx-auto mb-1 bg-muted flex items-center justify-center">
                  {CINEMA_IMAGES["Quentin Tarantino"] ? (
                    <img
                      src={CINEMA_IMAGES["Quentin Tarantino"]}
                      alt="Tarantino"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <Film size={24} className="text-primary/60" />
                  )}
                </div>
                <div className="text-xs text-primary font-bold">TARANTINO</div>
              </div>

              <Link
                href="/games/globalstar"
                className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-black text-sm rounded-xl hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]"
              >
                {t("cinema_goat_vote")}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
