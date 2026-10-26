import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'wouter';
import { useGetGsFigure } from '@workspace/api-client-react';
import { useLanguage } from '@/globalstar/contexts/language-context';
import { earningsFigureCopy, type EarningsFigureCopy } from '@/globalstar/i18n/earnings-figure-copy';
import { Navbar } from '@/globalstar/components/navbar';
import { NewsTicker } from '@/globalstar/components/news-ticker';
import { FigureAvatar } from '@/globalstar/components/figure-avatar';
import { RankBadge } from '@/globalstar/components/rank-badge';
import { VoteButton } from '@/globalstar/components/vote-button';
import { EmpireMediaPopup, type EmpireUpload } from '@/globalstar/components/empire-media-popup';
import { UploadModal } from '@/globalstar/components/upload-modal';
import { Card, CardContent } from '@workspace/gdna-ds/components/ui/card';
import { Skeleton } from '@workspace/gdna-ds/components/ui/skeleton';
import { Badge } from '@workspace/gdna-ds/components/ui/badge';
import { Button } from '@workspace/gdna-ds/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, Activity,
  BookOpen, Play, Headphones, ChevronLeft, ChevronRight,
  X, Crown, Medal, ArrowLeft, Video, Music, Eye, Coins, Upload, Plus,
} from 'lucide-react';

interface MediaItem {
  id: number; figureId: number; domain: string;
  type: 'story' | 'video' | 'audio';
  title: string; content: string;
  platform?: string; sortOrder: number;
}

// ── Story Viewer ──────────────────────────────────────────────────────────────
function StoryViewer({ stories, onClose, copy, locale, direction }: {
  stories: MediaItem[]; onClose: () => void; copy: EarningsFigureCopy['figure']; locale: string; direction: 'rtl' | 'ltr';
}) {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setProgress(0);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (idx < stories.length - 1) { setIdx(i => i + 1); return 0; }
          else { onClose(); return 100; }
        }
        return p + 2;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [idx]);

  const s = stories[idx];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      dir={direction} role="dialog" aria-modal="true" aria-label={copy.openStories} onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-sm bg-gradient-to-b from-gray-900 to-black rounded-3xl overflow-hidden shadow-2xl border border-white/10"
        onClick={e => e.stopPropagation()}>
        <div className="flex gap-1 p-3">
          {stories.map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all"
                style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>
        <button onClick={onClose} aria-label={copy.closeStory} className="absolute top-4 end-4 text-white/60 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <div className="px-6 py-8 min-h-72 flex flex-col justify-center space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-primary uppercase tracking-widest">
              {copy.storyPosition(new Intl.NumberFormat(locale).format(idx + 1), new Intl.NumberFormat(locale).format(stories.length))}
            </span>
          </div>
          <h3 className="text-xl font-black text-white leading-tight">{s.title}</h3>
          <p className="text-sm text-white/80 leading-relaxed">{s.content}</p>
        </div>
        <div className="flex border-t border-white/10">
          <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}
            className="flex-1 py-3 flex items-center justify-center gap-1 text-xs text-white/50 hover:text-white disabled:opacity-20">
            <ChevronLeft className={`w-4 h-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} /> {copy.previous}
          </button>
          <div className="w-px bg-white/10" />
          <button onClick={() => { if (idx < stories.length - 1) setIdx(idx + 1); else onClose(); }}
            className="flex-1 py-3 flex items-center justify-center gap-1 text-xs text-white/50 hover:text-white">
            {copy.next} <ChevronRight className={`w-4 h-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Sovereign Upload Card ────────────────────────────────────────────────────
function UploadCard({ upload, onClick }: { upload: EmpireUpload; onClick: () => void }) {
  const { language } = useLanguage();
  const copy = earningsFigureCopy(language);
  const c = copy.figure;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={c.openUpload(upload.title)}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onClick(); }}
      className="cursor-pointer rounded-xl p-4 flex items-center gap-4 transition-all"
      style={{ background: 'rgba(10,8,0,0.9)', border: '1.5px solid rgba(255,215,0,0.2)' }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)' }}>
        {upload.type === 'video'
          ? <Video className="w-5 h-5" style={{ color: '#FFD700' }} />
          : <Music className="w-5 h-5" style={{ color: '#FFD700' }} />}
      </div>
      <div className="flex-1 min-w-0 text-start">
        <p className="font-black text-sm text-white truncate">{upload.title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,215,0,0.5)' }}>{upload.uploader_name}</p>
      </div>
      <div className="shrink-0 flex items-center gap-1.5 me-2" aria-label={c.uploadViews(upload.views.toLocaleString(copy.locale))}>
        <Eye className="w-3 h-3" style={{ color: 'rgba(255,215,0,0.5)' }} />
        <span className="text-xs text-white font-mono">{upload.views.toLocaleString(copy.locale)}</span>
      </div>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: '#FFD700' }}>
        {upload.type === 'video'
          ? <Play className="w-3.5 h-3.5 fill-black text-black" />
          : <Headphones className="w-3.5 h-3.5 text-black" />}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function FigureDetail() {
  const { language } = useLanguage();
  const copy = earningsFigureCopy(language);
  const c = copy.figure;
  const locale = copy.locale;
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const params = useParams();
  const figureId = params.id ? parseInt(params.id) : 0;
  const { data: figure, isLoading } = useGetGsFigure(figureId);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [activeStory, setActiveStory] = useState(false);
  const [uploads, setUploads] = useState<EmpireUpload[]>([]);
  const [activeUpload, setActiveUpload] = useState<EmpireUpload | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [uploadsLoading, setUploadsLoading] = useState(true);
  const [uploadsError, setUploadsError] = useState(false);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

  // Map figure domain → upload category + figure tag
  const figureCategory = figure?.domain === 'music' || figure?.domain === 'cinema' ? 'art'
    : figure?.domain === 'tech' || figure?.domain === 'science' ? 'knowledge'
    : figure?.domain === 'politics' ? 'press'
    : 'sport';

  const figureName = figure?.name ?? '';

  useEffect(() => {
    if (!figureId) return;
    setMediaLoading(true);
    setMediaError(false);
    fetch(`${BASE}/api/gs/media?figureId=${figureId}`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(d => setMedia(d.media ?? []))
      .catch(() => setMediaError(true))
      .finally(() => setMediaLoading(false));
  }, [figureId]);

  const fetchUploads = () => {
    if (!figure?.domain) return;
    setUploadsLoading(true);
    setUploadsError(false);
    fetch(`${BASE}/api/gs/uploads?category=${figureCategory}&limit=20`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(d => setUploads(d.uploads ?? []))
      .catch(() => setUploadsError(true))
      .finally(() => setUploadsLoading(false));
  };

  useEffect(() => { fetchUploads(); }, [figure?.domain]);

  const stories = media.filter(m => m.type === 'story');

  const getTrendIcon = () => {
    if (!figure) return null;
    if (figure.voteTrend > 0) return <TrendingUp className="w-5 h-5 text-green-400" />;
    if (figure.voteTrend < 0) return <TrendingDown className="w-5 h-5 text-red-400" />;
    return <Minus className="w-5 h-5 text-muted-foreground" />;
  };

  if (isLoading) return (
    <div className="min-h-[100dvh] bg-background" dir={direction}>
      <Navbar /><NewsTicker />
      <div className="container mx-auto px-4 py-12 space-y-6" aria-label={c.loading} role="status">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid md:grid-cols-3 gap-6">{[1,2,3].map(i=><Skeleton key={i} className="h-32 rounded-2xl"/>)}</div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  );

  if (!figure) return (
    <div className="min-h-[100dvh] bg-background" dir={direction}>
      <Navbar /><NewsTicker />
      <div className="container mx-auto px-4 py-24 text-center text-muted-foreground">{c.notFound}</div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-background" dir={direction}>
      <Navbar /><NewsTicker />

      <AnimatePresence>
        {activeStory && stories.length > 0 && (
          <StoryViewer stories={stories} onClose={() => setActiveStory(false)} copy={c} locale={locale} direction={direction} />
        )}
      </AnimatePresence>
      <EmpireMediaPopup upload={activeUpload} onClose={() => setActiveUpload(null)} />
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={fetchUploads}
        initialFigureTag={figureName}
        initialCategory={figureCategory}
      />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/ranking">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className={`w-4 h-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} /> {c.back}
          </button>
        </Link>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden border-primary/20 mb-6">
            <div className="h-2 bg-gradient-to-r from-primary via-purple-500 to-yellow-400" />
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <FigureAvatar name={figure.name} imageUrl={figure.imageUrl} size="xl" />
                <div className="flex-1 text-center md:text-start">
                  <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap mb-2">
                    <h1 className="text-3xl md:text-5xl font-black">{figure.name}</h1>
                    <RankBadge rank={figure.rank} size="lg" />
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-4 flex-wrap">
                    <Badge variant="secondary">{figure.domainLabel}</Badge>
                    <span className="text-muted-foreground text-sm">{figure.nationality}</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-4 mb-5">
                    <div>
                      <div className="text-4xl font-black text-primary font-mono">{figure.votes.toLocaleString(locale)}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">{c.votes}</div>
                    </div>
                    <VoteButton figureId={figure.id} currentVotes={figure.votes} size="lg" />
                  </div>
                  {stories.length > 0 && (
                    <Button onClick={() => setActiveStory(true)} variant="outline"
                      className="border-purple-400/40 text-purple-400 hover:bg-purple-400/10 gap-2 font-bold">
                      <BookOpen className="w-4 h-4" /> {new Intl.NumberFormat(locale).format(stories.length)} {c.stories}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-primary/20">
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-2">
                {figure.rank === 1 ? <Crown className="w-6 h-6 text-yellow-400" /> :
                 figure.rank <= 3 ? <Medal className="w-6 h-6 text-orange-400" /> :
                 <RankBadge rank={figure.rank} size="md" />}
              </div>
              <div className="text-2xl font-black">#{figure.rank}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.rankIn(figure.domainLabel)}</div>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 text-center">
              <Activity className="w-6 h-6 text-primary mx-auto mb-2" />
               <div className="text-2xl font-black text-primary">{figure.recentVotes.toLocaleString(locale)}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.recentActivity}</div>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-2">{getTrendIcon()}</div>
              <div className={`text-2xl font-black ${figure.voteTrend > 0 ? 'text-green-400' : figure.voteTrend < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                {figure.voteTrend > 0 ? '+' : ''}{figure.voteTrend}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">{c.voteTrend}</div>
            </CardContent>
          </Card>
        </div>

        {/* Biography */}
        {figure.bio && (
          <Card className="border-primary/20 mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-black uppercase tracking-wider mb-3">{c.biography}</h2>
              <p className="text-foreground/80 leading-relaxed">{figure.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Stories */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                 <BookOpen className="w-5 h-5 text-purple-400" /> {c.stories}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setUploadOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all hover:opacity-90"
                  style={{ background: '#FFD700', color: '#000' }}>
                   <Plus className="w-3.5 h-3.5" /> {c.uploadContent}
                </button>
                {stories.length > 0 && <Button onClick={() => setActiveStory(true)} size="sm" variant="outline"
                  aria-label={c.openStories}
                  className="border-purple-400/40 text-purple-400 hover:bg-purple-400/10 text-xs">
                  {c.stories}
                </Button>}
              </div>
            </div>
            {mediaLoading ? (
              <p className="text-sm text-muted-foreground" role="status">{c.loadingMedia}</p>
            ) : mediaError ? (
              <p className="text-sm text-red-400" role="alert">{c.mediaError}</p>
            ) : stories.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.noStories}</p>
            ) : <div className="grid md:grid-cols-3 gap-4">
              {stories.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                  <Card onClick={() => setActiveStory(true)}
                    role="button" tabIndex={0} aria-label={`${c.openStories}: ${s.title}`}
                    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setActiveStory(true); }}
                    className="border-purple-400/20 bg-purple-400/5 hover:border-purple-400/50 transition-colors cursor-pointer h-full">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-400/20 border border-purple-400/30 flex items-center justify-center">
                          <span className="text-xs font-black text-purple-400">{i + 1}</span>
                        </div>
                        <span className="text-xs font-mono text-purple-400 uppercase tracking-widest">{c.story}</span>
                      </div>
                      <h3 className="font-black text-sm leading-tight">{s.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{s.content}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>}
          </motion.div>

        {/* Sovereign Uploads */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)' }}>
                <Upload className="w-3.5 h-3.5" style={{ color: '#FFD700' }} />
              </div>
               <div>
                <p className="font-black text-sm text-white">{c.sovereignContent}</p>
                <p className="text-xs" style={{ color: 'rgba(255,215,0,0.5)' }}>{c.citizenContent}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setUploadOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all hover:opacity-90 active:scale-[0.97]"
                style={{ background: '#FFD700', color: '#000' }}>
                <Plus className="w-4 h-4" /> {c.upload}
              </button>
              <Link href="/earnings">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', background: 'rgba(255,215,0,0.06)' }}>
                  <Coins className="w-3 h-3" /> {c.myEarnings}
                </button>
              </Link>
            </div>
          </div>

          {uploadsLoading ? (
            <div className="rounded-2xl p-10 text-center text-muted-foreground" role="status">{c.loadingMedia}</div>
          ) : uploadsError ? (
            <div className="rounded-2xl p-10 text-center" role="alert">
              <p className="text-red-400 mb-3">{c.mediaError}</p>
              <button onClick={fetchUploads} className="text-sm font-bold text-primary">{c.retry}</button>
            </div>
          ) : uploads.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-2xl p-10 text-center"
              style={{ background: 'rgba(255,215,0,0.03)', border: '1.5px dashed rgba(255,215,0,0.2)' }}>
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}>
                <Upload className="w-7 h-7" style={{ color: 'rgba(255,215,0,0.4)' }} />
              </div>
              <p className="font-black text-white mb-1">{c.firstPublish(figureName)}</p>
              <p className="text-xs mb-5" style={{ color: 'rgba(255,215,0,0.4)' }}>
                {c.autoEarnings}
              </p>
              <button onClick={() => setUploadOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-[0.97]"
                style={{ background: '#FFD700', color: '#000' }}>
                <Plus className="w-4 h-4" /> {c.addMedia}
              </button>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {uploads.map((u, i) => (
                <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <UploadCard upload={u} onClick={() => setActiveUpload(u)} />
                </motion.div>
              ))}
              {/* Upload CTA at bottom of list */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: uploads.length * 0.05 + 0.1 }}>
                <button onClick={() => setUploadOpen(true)}
                  className="w-full rounded-xl py-3 flex items-center justify-center gap-2 font-black text-sm transition-all hover:opacity-80"
                  style={{ border: '1.5px dashed rgba(255,215,0,0.3)', color: '#FFD700', background: 'rgba(255,215,0,0.04)' }}>
                 <Plus className="w-4 h-4" /> {c.addAbout(figureName)}
                </button>
              </motion.div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
