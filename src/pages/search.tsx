import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { navigationDepth, useBackLayer } from "@/lib/back-navigation";
import { Search, Trophy, Users, FileText, Calendar, Loader2, Star } from "lucide-react";
import { getLegendImageUrl } from "@/lib/legend-images";
import { useLang } from "@/contexts/LangContext";
import { coreCopy } from "@/i18n/core-auth-copy";
import { localeForLang } from "@/i18n/locale-surfaces-a-copy";
import { findPlatformSections, UI_TEXT } from "@/config/platform-directory";
import { Card } from "@workspace/gdna-ds/components/ui/card";

const BASE = () => (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

interface LegendResult {
  id: number;
  name: string;
  domain: string;
  nationality: string;
  rank: number;
  image_url: string;
}

interface CitizenResult {
  id: number;
  username: string;
  xp: number;
  balance: number;
}

interface PostResult {
  id: number;
  username: string;
  content: string;
  domain: string;
  type: string;
  likes: number;
  created_at: string;
}

interface EventResult {
  id: number;
  title: string;
  title_ar: string;
  domain: string;
  location: string;
  event_date: string;
  is_live: boolean;
  icon: string;
}

interface SearchResults {
  legends: LegendResult[];
  citizens: CitizenResult[];
  posts: PostResult[];
  events: EventResult[];
}

const DOMAIN_EMOJI: Record<string, string> = {
  sport: "⚽",
  music: "🎵",
  cinema: "🎬",
  news: "📰",
  heritage: "🏛️",
  general: "🌐",
};

if (false) {
// hint: Logic changed on both sides. Requires understanding intent of each change.
function DiscardSearchPage() {
  const { lang } = useLang();
  const copy = coreCopy(lang);
  const locale = localeForLang(lang);
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const totalResults = results
    ? results.legends.length + results.citizens.length + results.posts.length + results.events.length
    : 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError("");

    const controller = new AbortController();
    fetch(`${BASE()}/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setResults(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(copy.searchFailed);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [query, copy.searchFailed]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      setQuery(trimmed);
      window.history.replaceState(null, "", `${BASE()}/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const isEmpty = results && totalResults === 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-yellow-500/20 bg-gray-950/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-black uppercase tracking-widest text-yellow-400 mb-1 flex items-center gap-2">
            <Search size={22} /> {copy.searchTitle}
          </h1>
          <p className="text-gray-500 text-sm mb-5">{copy.searchSubtitle}</p>

          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center bg-gray-900 border border-gray-700 rounded-2xl px-5 py-3.5 gap-3 focus-within:border-yellow-400/60 transition-all shadow-xl">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="bg-transparent outline-none text-white text-base flex-1 placeholder:text-gray-600"
              />
              {loading && <Loader2 size={16} className="text-yellow-400 animate-spin shrink-0" />}
              <button
                type="submit"
                className="px-4 py-1.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/40 rounded-xl text-sm font-bold hover:bg-yellow-400 hover:text-black transition-all"
              >
                {copy.search}
              </button>
            </div>
          </form>

          {results && !loading && (
            <p className="text-gray-500 text-xs mt-3">
              {isEmpty
                ? `${copy.noResultsFor} "${query}"`
                : `${totalResults} ${copy.result}${totalResults !== 1 && copy.result === "result" ? "s" : ""} ${lang === "ar" ? `لـ "${query}"` : `for "${query}"`}`}
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">

        {error && (
          <div className="text-center text-red-400 py-12">{error}</div>
        )}

        {!query && !loading && (
          <div className="text-center py-20 text-gray-600">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-semibold">{copy.startSearch}</p>
            <p className="text-sm mt-2">{copy.findSearch}</p>
          </div>
        )}

        {isEmpty && !loading && (
          <div className="text-center py-20 text-gray-600">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-semibold">{copy.noResults}</p>
            <p className="text-sm mt-2">{copy.tryKeywords}</p>
          </div>
        )}

        {/* ── Legends ── */}
        {results && results.legends.length > 0 && (
          <section>
            <SectionHeader icon={<Trophy size={16} className="text-yellow-400" />} label="Legends" count={results.legends.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {results.legends.map((leg) => {
                const imageUrl = getLegendImageUrl(leg.name, leg.image_url);
                return (
                  <Link key={leg.id} href={`/legends/${leg.id}`}>
                    <div className="flex items-center gap-3 p-4 bg-gray-900/60 border border-gray-800 rounded-xl hover:border-yellow-400/40 hover:bg-gray-900 transition-all cursor-pointer group">
                      {imageUrl ? (
                        <img src={imageUrl} alt={leg.name} className="w-12 h-12 rounded-full object-cover border border-yellow-400/30 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-yellow-400/10 flex items-center justify-center shrink-0">
                          <Star size={20} className="text-yellow-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-white group-hover:text-yellow-400 transition-colors truncate">{leg.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {DOMAIN_EMOJI[leg.domain] ?? "🌐"} {leg.domain}
                          {leg.nationality ? ` · ${leg.nationality}` : ""}
                          {leg.rank ? ` · Rank #${leg.rank}` : ""}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Citizens ── */}
        {results && results.citizens.length > 0 && (
          <section>
            <SectionHeader icon={<Users size={16} className="text-cyan-400" />} label="Citizens" count={results.citizens.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {results.citizens.map((cit) => (
                <Link key={cit.id} href={`/citizen/${cit.username}`}>
                  <div className="flex items-center gap-3 p-4 bg-gray-900/60 border border-gray-800 rounded-xl hover:border-cyan-400/40 hover:bg-gray-900 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-cyan-400/10 flex items-center justify-center text-lg shrink-0 border border-cyan-400/20">
                      {cit.username[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white group-hover:text-cyan-400 transition-colors truncate">@{cit.username}</p>
                      <p className="text-xs text-gray-500">{(cit.xp ?? 0).toLocaleString(locale)} XP · {(cit.balance ?? 0).toLocaleString(locale)} 🪙</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Posts ── */}
        {results && results.posts.length > 0 && (
          <section>
            <SectionHeader icon={<FileText size={16} className="text-purple-400" />} label="Posts" count={results.posts.length} />
            <div className="space-y-3 mt-4">
              {results.posts.map((post) => (
                <Link key={post.id} href="/pulse">
                  <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl hover:border-purple-400/40 hover:bg-gray-900 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-purple-400">@{post.username || "anonymous"}</span>
                      <span className="text-xs text-gray-600">·</span>
                      <span className="text-xs text-gray-600">{DOMAIN_EMOJI[post.domain] ?? "🌐"} {post.domain}</span>
                      <span className="text-xs text-gray-600 ml-auto">❤️ {post.likes ?? 0}</span>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2 group-hover:text-white transition-colors">{post.content}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Events ── */}
        {results && results.events.length > 0 && (
          <section>
            <SectionHeader icon={<Calendar size={16} className="text-green-400" />} label="Events" count={results.events.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {results.events.map((evt) => (
                <Link key={evt.id} href="/pulse">
                  <div className="flex items-center gap-3 p-4 bg-gray-900/60 border border-gray-800 rounded-xl hover:border-green-400/40 hover:bg-gray-900 transition-all cursor-pointer group">
                    <span className="text-2xl shrink-0">{evt.icon ?? "📅"}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white group-hover:text-green-400 transition-colors truncate text-sm">{evt.title}</p>
                        {evt.is_live && (
                           <span className="shrink-0 text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded uppercase animate-pulse">{copy.live}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {evt.location ? `📍 ${evt.location} · ` : ""}
                        {evt.event_date ? new Date(evt.event_date).toLocaleDateString(locale) : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
}
export default function SearchPage() {
  const { lang } = useLang();
  const copy = coreCopy(lang);
  const locale = localeForLang(lang);
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialQuery = params.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setQuery(initialQuery);
    setInputValue(initialQuery);
  }, [initialQuery]);
  useBackLayer(inputValue !== query, () => setInputValue(query), 20, () => setInputValue(inputValue));
  useBackLayer(!!query, () => {
    if (navigationDepth() > 0) history.back();
    else navigate("/search", { replace: true });
  });

  const sectionResults = findPlatformSections(query, window.location.origin);
  const totalResults = sectionResults.length + (results
    ? results.legends.length + results.citizens.length + results.posts.length + results.events.length
    : 0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    const controller = new AbortController();
    fetch(`${BASE()}/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(copy.searchFailed);
        return r.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!data || !["legends", "citizens", "posts", "events"].every(key => Array.isArray(data[key]))) {
          throw new Error(copy.searchFailed);
        }
        setResults(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!controller.signal.aborted && err.name !== "AbortError") {
          setError(copy.searchFailed);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [query, copy.searchFailed]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      setQuery(trimmed);
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const isEmpty = results !== null && totalResults === 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-primary/20 bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-black uppercase tracking-widest text-primary mb-1 flex items-center gap-2">
            <Search size={22} /> {copy.searchTitle}
          </h1>
          <p className="text-muted-foreground text-sm mb-5">{copy.searchSubtitle}</p>

          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center bg-card border border-border rounded-2xl px-5 py-3.5 gap-3 focus-within:border-primary/60 transition-all shadow-xl">
              <Search size={18} className="text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="min-w-0 bg-transparent outline-none text-foreground text-base flex-1 placeholder:text-muted-foreground"
              />
              {loading && <Loader2 size={16} className="text-primary animate-spin shrink-0" />}
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary/10 text-primary border border-primary/40 rounded-xl text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-all"
              >
                {copy.search}
              </button>
            </div>
          </form>

          {results && !loading && (
            <p className="text-muted-foreground text-xs mt-3">
              {isEmpty
                ? `${copy.noResultsFor} "${query}"`
                : `${totalResults} ${copy.result}${totalResults !== 1 && lang !== "ar" ? "s" : ""} ${lang === "ar" ? `لـ "${query}"` : `for "${query}"`}`}
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">

        {sectionResults.length > 0 && (
          <section aria-label={UI_TEXT.sections[lang]}>
            <SectionHeader icon={<Search size={16} className="text-primary" />}
              label={UI_TEXT.sections[lang]} count={sectionResults.length} resultLabel={copy.result} />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sectionResults.map(({ id, route, names, icon: Icon }) => (
                <Card key={id}>
                  <Link href={route} className="flex items-center gap-3 rounded-lg p-4 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block font-semibold">{names[lang]}</span>
                      <span dir="ltr" className="block truncate text-sm text-muted-foreground">{route}</span>
                    </span>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}

        {error && (
          <div className="text-center text-destructive py-12">{error}</div>
        )}

        {!query && !loading && (
          <div className="text-center py-20 text-muted-foreground">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-semibold">{copy.startSearch}</p>
            <p className="text-sm mt-2">{copy.findSearch}</p>
          </div>
        )}

        {isEmpty && !loading && (
          <div className="text-center py-20 text-muted-foreground">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-semibold">{copy.noResults}</p>
            <p className="text-sm mt-2">{copy.tryKeywords}</p>
          </div>
        )}

        {/* ── Legends ── */}
        {results && results.legends.length > 0 && (
          <section>
            <SectionHeader icon={<Trophy size={16} className="text-primary" />} label={copy.legends} count={results.legends.length} resultLabel={copy.result} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {results.legends.map((leg) => {
                const imageUrl = getLegendImageUrl(leg.name, leg.image_url);
                return (
                  <Link key={leg.id} href={`/legends/${leg.id}`}>
                    <div className="flex items-center gap-3 p-4 bg-card/60 border border-border rounded-xl hover:border-primary/40 hover:bg-card transition-all cursor-pointer group">
                      {imageUrl ? (
                        <img src={imageUrl} alt={leg.name} className="w-12 h-12 rounded-full object-cover border border-primary/30 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Star size={20} className="text-primary" />
                      </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{leg.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {DOMAIN_EMOJI[leg.domain] ?? "🌐"} {leg.domain}
                          {leg.nationality ? ` · ${leg.nationality}` : ""}
                          {leg.rank ? ` · ${copy.rank} #${leg.rank}` : ""}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Citizens ── */}
        {results && results.citizens.length > 0 && (
          <section>
            <SectionHeader icon={<Users size={16} className="text-accent" />} label={copy.citizens} count={results.citizens.length} resultLabel={copy.result} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {results.citizens.map((cit) => (
                <Link key={cit.id} href={`/citizen/${cit.username}`}>
                  <div className="flex items-center gap-3 p-4 bg-card/60 border border-border rounded-xl hover:border-accent/40 hover:bg-card transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-lg shrink-0 border border-accent/20">
                      {cit.username[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground group-hover:text-accent transition-colors truncate">@{cit.username}</p>
                      <p className="text-xs text-muted-foreground">{(cit.xp ?? 0).toLocaleString(locale)} XP · {(cit.balance ?? 0).toLocaleString(locale)} 🪙</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Posts ── */}
        {results && results.posts.length > 0 && (
          <section>
            <SectionHeader icon={<FileText size={16} className="text-purple-400" />} label={copy.posts} count={results.posts.length} resultLabel={copy.result} />
            <div className="space-y-3 mt-4">
              {results.posts.map((post) => (
                <Link key={post.id} href="/pulse">
                  <div className="p-4 bg-card/60 border border-border rounded-xl hover:border-purple-400/40 hover:bg-card transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-purple-400">@{post.username || copy.anonymous}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{DOMAIN_EMOJI[post.domain] ?? "🌐"} {post.domain}</span>
                      <span className="text-xs text-muted-foreground ml-auto">❤️ {post.likes ?? 0}</span>
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-2 group-hover:text-foreground transition-colors">{post.content}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Events ── */}
        {results && results.events.length > 0 && (
          <section>
            <SectionHeader icon={<Calendar size={16} className="text-green-400" />} label={copy.events} count={results.events.length} resultLabel={copy.result} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {results.events.map((evt) => (
                <Link key={evt.id} href="/pulse">
                  <div className="flex items-center gap-3 p-4 bg-card/60 border border-border rounded-xl hover:border-green-400/40 hover:bg-card transition-all cursor-pointer group">
                    <span className="text-2xl shrink-0">{evt.icon ?? "📅"}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground group-hover:text-green-400 transition-colors truncate text-sm">{evt.title}</p>
                        {evt.is_live && (
                          <span className="shrink-0 text-[10px] font-black bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded uppercase animate-pulse">{copy.live}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {evt.location ? `📍 ${evt.location} · ` : ""}
                        {evt.event_date ? new Date(evt.event_date).toLocaleDateString(locale) : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon, label, count, resultLabel = "result" }: { icon: React.ReactNode; label: string; count: number; resultLabel?: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-border">
      {icon}
      <h2 className="text-sm font-black uppercase tracking-widest text-foreground/80">{label}</h2>
      <span className="ml-auto text-xs text-muted-foreground font-medium">{count} {resultLabel}{count !== 1 && resultLabel === "result" ? "s" : ""}</span>
    </div>
  );
}
