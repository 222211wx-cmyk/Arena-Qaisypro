import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetGsDomains, useGetGsFigures, useGetGsRanking } from '@workspace/api-client-react';
import { useLanguage } from '@/globalstar/contexts/language-context';
import { homeRankingCopy } from '@/globalstar/i18n/home-ranking-copy';
import { Navbar } from '@/globalstar/components/navbar';
import { NewsTicker } from '@/globalstar/components/news-ticker';
import { FigureAvatar } from '@/globalstar/components/figure-avatar';
import { VoteButton } from '@/globalstar/components/vote-button';
import { Skeleton } from '@workspace/gdna-ds/components/ui/skeleton';
import { ArrowRight, ShieldCheck, Flame } from 'lucide-react';

function seed(n: number) { const x = Math.sin(n + 1) * 43758.5453123; return x - Math.floor(x); }

export default function GlobalStarHome() {
  const { t, language } = useLanguage();
  const c = homeRankingCopy(language).home;
  const locale = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : language === 'es' ? 'es' : 'en';
  const isRTL = language === 'ar';
  const { data: domainsData, isLoading: domainsLoading } = useGetGsDomains();
  const { data: ranking } = useGetGsRanking();
  const [activeDomainIndex, setActiveDomainIndex] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);

  const activeDomain = domainsData?.domains?.[activeDomainIndex];
  const { data: figuresData, isLoading: figuresLoading } = useGetGsFigures(
    activeDomain ? { domain: activeDomain.id, limit: 3 } : undefined
  );

  useEffect(() => {
    if (!domainsData?.domains?.length) return;
    const id = setInterval(() => {
      setActiveDomainIndex(p => (p + 1) % (domainsData.domains?.length || 1));
    }, 5000);
    return () => clearInterval(id);
  }, [domainsData]);

  useEffect(() => {
    setLineIdx(0);
    const id = setInterval(() => setLineIdx(l => (l + 1) % c.imperialLines.length), 3500);
    return () => clearInterval(id);
  }, [c.imperialLines]);

  const domainRankData = ranking?.ranking?.find((r: any) => r.domain === activeDomain?.id);
  const domainTotal = domainRankData?.figures?.reduce((s: number, f: any) => s + (f.votes ?? 0), 0)
    ?? activeDomain?.totalVotes ?? 0;

  return (
    <div className="min-h-[100dvh] bg-black text-white relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Ambient golds */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)" }} />

      <Navbar />
      <NewsTicker />

      <main className="relative z-10">

        {/* ── HERO — Hall of the Immortals ──────────────────────────── */}
        <section className="text-center pt-20 pb-16 px-4 relative">

          {/* Decorative column lines */}
          <div className="absolute left-0 top-0 bottom-0 w-px hidden md:block"
            style={{ background: "linear-gradient(180deg, transparent, #C9A84C30, transparent)" }} />
          <div className="absolute right-0 top-0 bottom-0 w-px hidden md:block"
            style={{ background: "linear-gradient(180deg, transparent, #C9A84C30, transparent)" }} />

          {/* Crown glyph */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="mb-6"
          >
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="h-px w-24" style={{ background: "linear-gradient(90deg, transparent, #C9A84C)" }} />
              <span className="text-4xl">⚖️</span>
              <div className="h-px w-24" style={{ background: "linear-gradient(90deg, #C9A84C, transparent)" }} />
            </div>
            <p className="text-xs font-mono tracking-[0.5em] uppercase mb-1" style={{ color: "#C9A84C60" }}>
              GlobalStar · {c.imperialHall}
            </p>
          </motion.div>

          {/* Main title */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="font-black uppercase leading-none mb-4"
            style={{ fontSize: "clamp(56px, 12vw, 140px)", letterSpacing: "-0.03em" }}
          >
            <span className="imperial-gold">GLOBAL</span>
            <br />
            <span style={{ color: "transparent", WebkitTextStroke: "1.5px #C9A84C40" }}>STAR</span>
          </motion.h1>

          {/* Cycling subtitle */}
          <div className="h-8 overflow-hidden mb-8">
            <AnimatePresence mode="wait">
              <motion.p
                key={lineIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45 }}
                className="text-sm md:text-base font-bold uppercase tracking-[0.35em]"
                style={{ color: "#C9A84C80" }}
              >
                {c.imperialLines[lineIdx]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Entry CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <Link href="/ranking">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="h-14 px-10 font-black text-sm uppercase tracking-[0.3em] flex items-center gap-3"
                style={{
                  background: "linear-gradient(135deg, #C9A84C, #A67C2E)",
                  color: "#000",
                  boxShadow: "0 0 30px #C9A84C30",
                }}
              >
                <Flame className="w-4 h-4" />
                {c.enterRankings}
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </motion.div>

          {/* AI Moderation Seal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="inline-flex items-center gap-3 mt-8 px-6 py-3"
            style={{ border: "1px solid #C9A84C20", background: "rgba(201,168,76,0.03)" }}
          >
            <ShieldCheck className="w-4 h-4" style={{ color: "#C9A84C" }} />
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "#C9A84C70" }}>
              {t('aiModerated')} · {c.moderationAccuracy} · {c.realTime}
            </span>
          </motion.div>
        </section>

        {/* ── TERRITORY ROTUNDA ─────────────────────────────────────── */}
        <section className="pb-20 px-4">
          <div className="max-w-5xl mx-auto">

            {/* Section title */}
            <div className="text-center mb-10">
              <p className="text-xs font-mono tracking-[0.4em] uppercase mb-1" style={{ color: "#C9A84C50" }}>
                ◈ {c.territoryRotunda} ◈
              </p>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider" style={{ color: "#C9A84C" }}>
                {c.territoryOfTheHour}
              </h2>
            </div>

            {domainsLoading ? (
              <div className="space-y-6" role="status" aria-label={c.loadingTerritories}>
                <span className="sr-only">{c.loadingTerritories}</span>
                <Skeleton className="h-24 w-full" style={{ background: "#C9A84C10" }} />
                <div className="grid md:grid-cols-3 gap-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-72" style={{ background: "#C9A84C08" }} />)}
                </div>
              </div>
            ) : activeDomain ? (
              <div>
                {/* Active territory header */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeDomain.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    className="flex items-center justify-between p-6 mb-8"
                    style={{ border: "1px solid #C9A84C30", background: "rgba(201,168,76,0.04)" }}
                  >
                    <div className="flex items-center gap-5">
                      <span className="text-5xl">{activeDomain.icon}</span>
                      <div>
                        <p className="text-xs font-mono tracking-widest uppercase mb-1" style={{ color: "#C9A84C60" }}>
                          {c.activeTerritory}
                        </p>
                        <h3 className="text-2xl font-black uppercase tracking-wider">{activeDomain.label}</h3>
                        <p className="text-sm font-mono mt-1" style={{ color: "#C9A84C70" }}>
                          {activeDomain.figureCount} {c.immortals} · {domainTotal.toLocaleString(locale)} {c.tributes}
                        </p>
                      </div>
                    </div>
                    <Link href="/ranking">
                      <button className="text-xs font-mono uppercase tracking-widest px-4 py-2"
                        style={{ border: "1px solid #C9A84C40", color: "#C9A84C" }}>
                        {c.seeAll} →
                      </button>
                    </Link>
                  </motion.div>
                </AnimatePresence>

                {/* Top 3 Immortals */}
                {figuresLoading ? (
                  <div className="grid md:grid-cols-3 gap-4" role="status" aria-label={c.loadingFigures}>
                    <span className="sr-only">{c.loadingFigures}</span>
                    {[1,2,3].map(i => <Skeleton key={i} className="h-72" style={{ background: "#C9A84C08" }} />)}
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-4">
                    {figuresData?.figures?.slice(0, 3).map((figure: any, idx: number) => (
                      <motion.div
                        key={figure.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative group"
                        style={{ border: "1px solid #C9A84C20", background: "rgba(201,168,76,0.02)" }}
                      >
                        {/* Rank glyph */}
                        <div className="absolute top-4 right-4">
                          <span className="text-xs font-mono font-black" style={{ color: idx === 0 ? "#FFD700" : "#C9A84C50" }}>
                            {idx === 0 ? "♔" : idx === 1 ? "♕" : "♖"} #{idx + 1}
                          </span>
                        </div>

                        <div className="p-6">
                          <div className="flex items-start gap-4 mb-4">
                            <FigureAvatar name={figure.name} imageUrl={figure.imageUrl} size="lg" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-black text-base uppercase tracking-wide truncate">{figure.name}</h3>
                              <p className="text-xs mt-1" style={{ color: "#C9A84C70" }}>{figure.nationality}</p>
                              <p className="text-lg font-black font-mono mt-1" style={{ color: "#C9A84C" }}>
                                 {figure.votes?.toLocaleString(locale)}
                              </p>
                               <p className="text-xs uppercase tracking-widest" style={{ color: "#ffffff30" }}>{c.tributes}</p>
                            </div>
                          </div>

                          {figure.bio && (
                            <p className="text-xs leading-relaxed line-clamp-3 mb-4" style={{ color: "#ffffff50" }}>
                              {figure.bio}
                            </p>
                          )}

                          <div className="flex gap-2">
                            <VoteButton figureId={figure.id} currentVotes={figure.votes} size="sm" />
                            <Link href={`/figures/${figure.id}`}>
                              <button className="flex-1 h-8 text-xs uppercase tracking-wider font-black px-3"
                                style={{ border: "1px solid #C9A84C30", color: "#C9A84C60",
                                  background: "transparent" }}>
                                 {c.profile}
                              </button>
                            </Link>
                          </div>
                        </div>

                        {/* Hover border glow */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                          style={{ border: "1px solid #C9A84C50", boxShadow: "inset 0 0 20px #C9A84C08" }} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="py-12 text-center font-mono text-sm" style={{ color: "#C9A84C70" }}>{c.noTerritories}</p>
            )}

            {/* Domain selector dots */}
            {(domainsData?.domains?.length ?? 0) > 0 && (
              <div className="flex justify-center gap-2 mt-10">
                {domainsData?.domains?.map((domain: any, idx: number) => (
                  <button
                    key={domain.id}
                    onClick={() => setActiveDomainIndex(idx)}
                    title={domain.label}
                    aria-label={`${c.selectTerritory}: ${domain.label}`}
                    aria-pressed={idx === activeDomainIndex}
                    className="transition-all duration-300 rounded-none"
                    style={{
                      width: idx === activeDomainIndex ? 32 : 8,
                      height: 2,
                      background: idx === activeDomainIndex ? "#C9A84C" : "#C9A84C25",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── IMPERIAL DOMAINS GRID ─────────────────────────────────── */}
        <section className="pb-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-xs font-mono tracking-[0.4em] uppercase" style={{ color: "#C9A84C40" }}>
                 {c.allTerritories} · {c.fullRankingsAvailable}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-px" style={{ background: "#C9A84C10" }}>
              {(domainsData?.domains ?? []).map((d: any, i: number) => (
                <Link key={d.id} href="/ranking">
                  <div className="bg-black py-6 px-3 text-center cursor-pointer group hover:bg-[#C9A84C08] transition-colors">
                    <div className="text-2xl mb-2">{d.icon}</div>
                    <p className="text-xs font-black uppercase tracking-wider" style={{ color: "#ffffff60" }}>{d.label}</p>
                    <p className="text-xs font-mono mt-1" style={{ color: "#C9A84C40" }}>
                       {d.totalVotes
                         ? new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 0 }).format(d.totalVotes)
                         : "—"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link href="/ranking">
                <button className="h-12 px-10 font-black text-xs uppercase tracking-[0.4em]"
                  style={{ border: "1px solid #C9A84C40", color: "#C9A84C",
                    boxShadow: "0 0 20px #C9A84C10" }}>
                   {c.enterFullRankings} <ArrowRight className="inline w-3 h-3 ms-2" />
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Imperial footer ───────────────────────────────────────── */}
        <div className="text-center pb-12 px-4">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="h-px w-20" style={{ background: "#C9A84C20" }} />
            <span className="text-xs font-mono" style={{ color: "#C9A84C30" }}>◈ ◈ ◈</span>
            <div className="h-px w-20" style={{ background: "#C9A84C20" }} />
          </div>
          <p className="text-xs font-mono" style={{ color: "#ffffff10" }}>
             GLOBALSTAR · {c.footer} · ARENA QAISYPRO
          </p>
        </div>

      </main>
    </div>
  );
}
