import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Headphones, Download, Eye, Coins } from 'lucide-react';
import { useLanguage } from '../contexts/language-context';
import { leaderboardMediaCopy } from '../i18n/leaderboard-media-copy';

export interface EmpireUpload {
  id: number;
  uploader_name: string;
  title: string;
  type: 'video' | 'audio';
  category: string;
  figure_tag?: string;
  file_name: string;
  file_size: number;
  views: number;
  earnings: string | number;
  created_at: string;
}

interface EmpireMediaPopupProps {
  upload: EmpireUpload | null;
  onClose: () => void;
}

export function EmpireMediaPopup({ upload, onClose }: EmpireMediaPopupProps) {
  const { language, isRTL } = useLanguage();
  const { media: c, locale } = leaderboardMediaCopy(language);
  const direction = isRTL ? 'rtl' : 'ltr';
  const number = new Intl.NumberFormat(locale);
  const currency = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [views, setViews] = useState(upload?.views ?? 0);
  const [playing, setPlaying] = useState(false);
  const [viewRecorded, setViewRecorded] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

  useEffect(() => {
    setViews(upload?.views ?? 0);
    setPlaying(false);
    setViewRecorded(false);
    setMediaError(false);
    setMediaLoading(false);
  }, [upload?.id]);

  if (!upload) return null;

  const isVideo = upload.type === 'video';
  const streamUrl = `${BASE}/api/gs/uploads/${upload.id}/stream`;
  const downloadUrl = `${BASE}/api/gs/uploads/${upload.id}/download`;

  const recordView = async () => {
    if (viewRecorded) return;
    setViewRecorded(true);
    try {
      const r = await fetch(`${BASE}/api/gs/uploads/${upload.id}/view`, { method: 'POST', credentials: 'include' });
      const d = await r.json();
      if (d.counted) setViews(v => v + 1);
    } catch {}
  };

  const handlePlay = async () => {
    setMediaError(false);
    setMediaLoading(true);
    try {
      const response = await fetch(streamUrl, { method: 'HEAD', credentials: 'include' });
      if (!response.ok) {
        setPlaying(true);
        setMediaError(true);
        setMediaLoading(false);
        return;
      }
      setPlaying(true);
      void recordView();
    } catch {
      setPlaying(true);
      setMediaError(true);
    } finally {
      setMediaLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`;
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(bytes / 1024)} KB`;
  };

  return (
    <AnimatePresence>
      {upload && (
        <motion.div
          key="empire-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          dir={direction}
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.88, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.88, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={`${c.dialog}: ${upload.title}`}
            style={{
              background: '#0a0800',
              border: '1.5px solid #FFD700',
              boxShadow: '0 0 60px rgba(255,215,0,0.22), 0 8px 48px rgba(0,0,0,0.8)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Gold bar */}
            <div style={{ height: 3, background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)' }} />

            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.35)' }}
              >
                {isVideo
                  ? <Play className="w-5 h-5" style={{ color: '#FFD700' }} />
                  : <Headphones className="w-5 h-5" style={{ color: '#FFD700' }} />}
              </div>
               <div className="flex-1 min-w-0 text-start">
                <p className="font-black text-sm text-white leading-tight truncate">{upload.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: 'rgba(255,215,0,0.55)' }}>
                     {c.categories[upload.category] ?? upload.category}
                  </span>
                  <span style={{ color: 'rgba(255,215,0,0.25)' }}>·</span>
                  <span className="text-xs" style={{ color: 'rgba(255,215,0,0.55)' }}>
                    {upload.uploader_name}
                  </span>
                </div>
              </div>
               <button onClick={onClose} aria-label={c.close} className="text-white/40 hover:text-white transition-colors shrink-0 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div style={{ height: 1, background: 'rgba(255,215,0,0.12)', margin: '0 20px' }} />

            {/* Media Player */}
            <div className="px-4 py-3">
              {!playing ? (
                <button
                  onClick={handlePlay}
                  disabled={mediaLoading}
                  aria-label={isVideo ? c.playVideo : c.playAudio}
                  className="w-full rounded-xl flex items-center justify-center gap-3 py-5 transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: '#FFD700' }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  >
                    {isVideo
                      ? <Play className="w-6 h-6 text-black fill-black" />
                      : <Headphones className="w-6 h-6 text-black" />}
                  </div>
                   <div className="text-start">
                     <p aria-live="polite" className="font-black text-black text-base">{mediaLoading ? c.loading : isVideo ? c.playVideo : c.playAudio}</p>
                     <p className="text-xs text-black/60">{c.source}</p>
                  </div>
                </button>
              ) : (
                <div
                  className="w-full rounded-xl overflow-hidden"
                  style={{ border: '1.5px solid rgba(255,215,0,0.3)' }}
                >
                  {mediaError ? (
                     <div className="p-6 text-center" role="alert">
                       <p className="font-bold text-sm text-red-300">{c.unavailable}</p>
                      <p className="mt-2 text-xs text-white/50">{c.reupload}</p>
                    </div>
                  ) : isVideo ? (
                    <video
                      ref={mediaRef as React.RefObject<HTMLVideoElement>}
                      src={streamUrl}
                      controls
                      aria-label={c.player(upload.title)}
                      autoPlay
                      onError={() => setMediaError(true)}
                      className="w-full"
                      style={{ maxHeight: 240, background: '#000' }}
                    />
                  ) : (
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(255,215,0,0.15)' }}
                        >
                          <Headphones className="w-5 h-5 animate-pulse" style={{ color: '#FFD700' }} />
                        </div>
                         <div className="text-start">
                          <p className="font-bold text-sm text-white">{upload.title}</p>
                          <p className="text-xs" style={{ color: '#FFD700' }}>▶ {c.playing}</p>
                        </div>
                      </div>
                      <audio
                        ref={mediaRef as React.RefObject<HTMLAudioElement>}
                        src={streamUrl}
                        controls
                      aria-label={c.player(upload.title)}
                        autoPlay
                      onError={() => setMediaError(true)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Download button */}
            <div className="px-4 pb-3">
              <a
                href={downloadUrl}
                download
                aria-label={c.download}
                className="flex items-center gap-3 w-full rounded-xl px-4 py-3 transition-all hover:opacity-80"
                style={{ border: '1.5px solid rgba(255,215,0,0.4)', color: '#FFD700' }}
              >
                <Download className="w-5 h-5 shrink-0" style={{ color: '#FFD700' }} />
                 <div className="flex-1 text-start">
                   <p className="font-black text-sm">{isVideo ? c.downloadVideo : c.downloadAudio}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,215,0,0.45)' }}>
                     {formatSize(upload.file_size)} · {c.source}
                  </p>
                </div>
              </a>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between px-5 pb-4">
              <div className="flex items-center gap-1.5" style={{ color: 'rgba(255,215,0,0.5)' }}>
                 <Eye aria-hidden="true" className="w-3.5 h-3.5" />
                 <span className="text-xs font-mono">{c.views(number.format(views))}</span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: 'rgba(255,215,0,0.5)' }}>
                 <Coins aria-hidden="true" className="w-3.5 h-3.5" />
                 <span className="text-xs font-mono">{c.earnings(currency.format(parseFloat(String(upload.earnings))))}</span>
              </div>
              <p className="text-xs" style={{ color: 'rgba(255,215,0,0.25)' }}>{c.brand}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
