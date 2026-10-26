import { motion, AnimatePresence } from 'framer-motion';
import { X, Youtube, Download, Play, Headphones } from 'lucide-react';
import { useLanguage } from '../contexts/language-context';
import { gsCopy } from '../gs-copy';

interface MediaItem {
  id: number;
  content: string;
  title: string;
  platform?: string;
  type: 'story' | 'video' | 'audio';
}

interface MediaOptionsPopupProps {
  item: MediaItem | null;
  kind: 'video' | 'audio';
  onClose: () => void;
}

function getYouTubeId(item: MediaItem): string | null {
  if (item.platform === 'youtube') return item.content;
  // try to extract from URL
  const m = item.content.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function MediaOptionsPopup({ item, kind, onClose }: MediaOptionsPopupProps) {
  const { language } = useLanguage();
  const c = gsCopy(language);
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  if (!item) return null;

  const ytId = getYouTubeId(item);
  const ytWatchUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : item.content;
  const ytVideoDownload = ytId ? `https://en.y2mate.com/youtube/${ytId}` : item.content;
  const ytMp3Download  = ytId ? `https://en.y2mate.com/youtube-mp3/${ytId}` : item.content;

  const isVideo = kind === 'video';

  const options = isVideo
    ? [
        {
          icon: <Youtube className="w-5 h-5" />,
          label: c.watchYoutube,
          sub: c.watchYoutube,
          href: ytWatchUrl,
          gold: true,
        },
        {
          icon: <Download className="w-5 h-5" />,
          label: c.downloadVideo,
          sub: c.downloadVideo,
          href: ytVideoDownload,
          gold: false,
        },
      ]
    : [
        {
          icon: <Youtube className="w-5 h-5" />,
          label: c.listenYoutube,
          sub: c.listenYoutube,
          href: ytWatchUrl,
          gold: true,
        },
        {
          icon: <Download className="w-5 h-5" />,
          label: c.downloadAudio,
          sub: c.downloadAudio,
          href: ytMp3Download,
          gold: false,
        },
      ];

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key="media-options-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          dir={direction}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.88, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.88, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="relative w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: '#0a0800',
              border: '1.5px solid #FFD700',
              boxShadow: '0 0 48px rgba(255,215,0,0.18), 0 8px 48px rgba(0,0,0,0.7)',
            }}
            dir={direction}
            onClick={e => e.stopPropagation()}
          >
            {/* Gold top bar */}
            <div style={{ height: 3, background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)' }} />

            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)' }}
              >
                {isVideo
                  ? <Play className="w-5 h-5" style={{ color: '#FFD700' }} />
                  : <Headphones className="w-5 h-5" style={{ color: '#FFD700' }} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-white leading-tight truncate">{item.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,215,0,0.6)' }}>
                  {isVideo ? c.chooseWatch : c.chooseListen}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label={c.mediaOptionsClose}
                className="text-white/40 hover:text-white transition-colors shrink-0 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,215,0,0.15)', margin: '0 20px' }} />

            {/* Options */}
            <div className="p-4 space-y-3">
              {options.map((opt, i) => (
                <a
                  key={i}
                  href={opt.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="flex items-center gap-4 w-full rounded-xl px-4 py-3.5 transition-all duration-150 group"
                  style={
                    opt.gold
                      ? {
                          background: '#FFD700',
                          color: '#000',
                          boxShadow: '0 4px 20px rgba(255,215,0,0.3)',
                        }
                      : {
                          background: 'transparent',
                          color: '#FFD700',
                          border: '1.5px solid rgba(255,215,0,0.4)',
                        }
                  }
                >
                  <span
                    className="shrink-0"
                    style={opt.gold ? { color: '#000' } : { color: '#FFD700' }}
                  >
                    {opt.icon}
                  </span>
                  <div className="flex-1 min-w-0 text-start">
                    <p className="font-black text-sm leading-tight">{opt.label}</p>
                    <p
                      className="text-xs mt-0.5"
                      style={opt.gold ? { color: 'rgba(0,0,0,0.55)' } : { color: 'rgba(255,215,0,0.5)' }}
                    >
                      {opt.sub}
                    </p>
                  </div>
                </a>
              ))}
            </div>

            {/* Footer note */}
            <p className="text-center text-xs pb-4" style={{ color: 'rgba(255,215,0,0.3)' }}>
              {c.mediaOptionsBrand}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
