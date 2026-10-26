import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Video, Music, CheckCircle, AlertCircle, Loader2, Search, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/language-context';
import { adminUploadCopy } from '../i18n/admin-upload-copy';
import { sharedCopy } from '@/i18n/shared-components-copy';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded?: () => void;
  /** Pre-select a figure/topic tag — shown locked at the top */
  initialFigureTag?: string;
  /** Pre-select a category */
  initialCategory?: string;
}

const CATEGORY_META = [
  { value: 'sport', icon: '⚽' }, { value: 'press', icon: '📰' },
  { value: 'art', icon: '🎨' }, { value: 'knowledge', icon: '📚' },
] as const;

type Status = 'idle' | 'uploading' | 'success' | 'error';

export function UploadModal({ open, onClose, onUploaded, initialFigureTag, initialCategory }: UploadModalProps) {
  const { language } = useLanguage();
  const { upload: c, locale } = adminUploadCopy(language);
  const uploadErrors = sharedCopy(language).uploadErrors;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(initialCategory ?? 'sport');
  const [figureTag, setFigureTag] = useState(initialFigureTag ?? '');
  const [tagSearch, setTagSearch] = useState('');
  const [tagDropOpen, setTagDropOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

  // Re-apply presets each time the modal opens (e.g. different figure)
  useEffect(() => {
    if (open) {
      if (initialFigureTag !== undefined) setFigureTag(initialFigureTag);
      if (initialCategory !== undefined) setCategory(initialCategory);
    }
  }, [open, initialFigureTag, initialCategory]);

  // Reset figureTag when category changes (but keep preset if user hasn't touched it)
  const handleCategoryChange = (val: string) => {
    setCategory(val);
    if (figureTag !== initialFigureTag) setFigureTag('');
    setTagSearch('');
  };

  const reset = () => {
    setTitle(''); setFile(null); setStatus('idle'); setErrorMsg(''); setProgress(0);
    setFigureTag(initialFigureTag ?? ''); setTagSearch(''); setTagDropOpen(false);
    setCategory(initialCategory ?? 'sport');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/') && !f.type.startsWith('audio/')) {
      setErrorMsg(c.invalidFile); return;
    }
    if (f.size > 500 * 1024 * 1024) {
      setErrorMsg(c.fileTooLarge); return;
    }
    setErrorMsg('');
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  // Filtered tags based on search query
  const filteredGroups = useMemo(() => {
    const groups = c.topics[category] ?? [];
    if (!tagSearch.trim()) return groups;
    const q = tagSearch.trim().toLowerCase();
    return groups
      .map(g => ({ ...g, items: g.items.filter(i => i.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [category, tagSearch, c.topics]);

  const handleTagSelect = (tag: string) => {
    setFigureTag(tag);
    setTagSearch('');
    setTagDropOpen(false);
  };

  const handleSubmit = async () => {
    if (!file) { setErrorMsg(c.fileRequired); return; }
    if (!title.trim()) { setErrorMsg(c.titleRequired); return; }
    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title.trim());
    formData.append('category', category);
    if (figureTag.trim()) formData.append('figureTag', figureTag.trim());

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BASE}/api/gs/uploads`);
        xhr.withCredentials = true;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 90));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) { setProgress(100); resolve(); }
          else { reject(new Error(uploadErrors.server(xhr.status))); }
        };
        xhr.onerror = () => reject(new Error(uploadErrors.network));
        xhr.send(formData);
      });

      setStatus('success');
      onUploaded?.();
      setTimeout(() => { handleClose(); }, 2500);
    } catch (error) {
      setStatus('error');
      setErrorMsg(error instanceof Error ? error.message : c.uploadFailed);
    }
  };

  const isVideo = file?.type.startsWith('video/') ?? true;
  const fileSizeMB = file ? new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(file.size / 1024 / 1024) : null;
  const progressLabel = new Intl.NumberFormat(locale, { style: 'percent' }).format(progress / 100);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="upload-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          role="dialog"
          aria-modal="true"
          aria-label={c.heading}
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.88, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.88, y: 24 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{
              background: '#0a0800',
              border: '2px solid #FFD700',
              boxShadow: '0 0 80px rgba(255,215,0,0.25), 0 8px 64px rgba(0,0,0,0.9)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Gold bar */}
            <div style={{ height: 4, background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)', flexShrink: 0 }} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ flexShrink: 0 }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)' }}>
                  <Upload className="w-5 h-5" style={{ color: '#FFD700' }} />
                </div>
                 <div>
                   <p className="font-black text-white text-base">{c.heading}</p>
                   <p className="text-xs" style={{ color: 'rgba(255,215,0,0.5)' }}>{c.serverLine}</p>
                </div>
              </div>
               <button onClick={handleClose} aria-label={c.close} className="text-white/40 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div style={{ height: 1, background: 'rgba(255,215,0,0.12)', margin: '0 20px', flexShrink: 0 }} />

            {/* Success state */}
            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center flex-1">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <CheckCircle className="w-16 h-16 mb-4" style={{ color: '#FFD700' }} />
                </motion.div>
                 <p className="font-black text-white text-xl mb-2">{c.success}</p>
                 <p className="text-sm" style={{ color: 'rgba(255,215,0,0.6)' }}>{c.successDetail}</p>
                {figureTag && (
                  <div className="mt-3 px-4 py-2 rounded-xl text-xs font-bold"
                    style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700' }}>
                    📌 {figureTag}
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-y-auto flex-1">
                 <div className="p-5 space-y-4">

                  {/* File picker */}
                  <div>
                    <label className="block text-xs font-bold mb-2" style={{ color: 'rgba(255,215,0,0.7)' }}>
                       {c.fileLabel}
                    </label>
                    <button
                      onClick={() => fileRef.current?.click()}
                       aria-label={file ? c.changeFile : c.chooseFile}
                      disabled={status === 'uploading'}
                      className="w-full rounded-xl py-4 flex flex-col items-center gap-2 transition-all hover:opacity-80 disabled:opacity-40"
                      style={{ border: '2px dashed rgba(255,215,0,0.35)', background: 'rgba(255,215,0,0.04)' }}
                    >
                      {file ? (
                        <>
                          <div className="flex items-center gap-2">
                            {isVideo
                              ? <Video className="w-6 h-6" style={{ color: '#FFD700' }} />
                              : <Music className="w-6 h-6" style={{ color: '#FFD700' }} />}
                            <span className="font-bold text-sm text-white truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <span className="text-xs" style={{ color: 'rgba(255,215,0,0.5)' }}>
                             {isVideo ? c.video : c.audio} · {fileSizeMB} MB
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8" style={{ color: 'rgba(255,215,0,0.4)' }} />
                           <span className="text-sm" style={{ color: 'rgba(255,215,0,0.5)' }}>{c.chooseFile}</span>
                        </>
                      )}
                    </button>
                    <input ref={fileRef} type="file" accept="video/mp4,video/*,audio/mp3,audio/mpeg,audio/*"
                      className="hidden" onChange={handleFile} />
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'rgba(255,215,0,0.7)' }}>
                       {c.titleLabel}
                    </label>
                    <input value={title} onChange={e => setTitle(e.target.value)}
                       disabled={status === 'uploading'} placeholder={c.titlePlaceholder}
                      className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all disabled:opacity-40"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,215,0,0.25)' }} />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'rgba(255,215,0,0.7)' }}>
                       {c.categoryLabel}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                       {CATEGORY_META.map(item => (
                         <button key={item.value} onClick={() => handleCategoryChange(item.value)}
                          disabled={status === 'uploading'}
                          className="rounded-xl py-2 text-center transition-all hover:opacity-80 disabled:opacity-40"
                           style={category === item.value
                            ? { background: '#FFD700', color: '#000' }
                            : { background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', color: 'rgba(255,215,0,0.7)' }}>
                           <div className="text-lg">{item.icon}</div>
                           <div className="text-xs font-bold">{c.categories[item.value]}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Star / Topic selector ──────────────────────────────── */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'rgba(255,215,0,0.7)' }}>
                       📌 {c.tagLabel} <span style={{ color: 'rgba(255,215,0,0.4)', fontWeight: 400 }}>({c.tagOptional})</span>
                    </label>

                    {/* Selected tag pill */}
                    {figureTag && !tagDropOpen && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1"
                          style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.4)' }}>
                          <span className="font-bold text-sm" style={{ color: '#FFD700' }}>{figureTag}</span>
                        </div>
                         <button onClick={() => { setFigureTag(''); setTagDropOpen(true); }} aria-label={c.removeTag}
                          className="p-1.5 rounded-lg transition-all hover:opacity-70"
                          style={{ background: 'rgba(255,50,50,0.15)', border: '1px solid rgba(255,50,50,0.3)' }}>
                          <X className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    )}

                    {/* Dropdown trigger */}
                    {!figureTag && !tagDropOpen && (
                      <button onClick={() => setTagDropOpen(true)} disabled={status === 'uploading'}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all hover:opacity-80 disabled:opacity-40"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.22)' }}>
                         <span className="text-sm" style={{ color: 'rgba(255,215,0,0.45)' }}>{c.chooseTag}</span>
                        <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255,215,0,0.4)' }} />
                      </button>
                    )}

                    {/* Open dropdown */}
                    {tagDropOpen && (
                      <div className="rounded-xl overflow-hidden"
                        style={{ border: '1.5px solid rgba(255,215,0,0.35)', background: '#0d0b00' }}>
                        {/* Search */}
                        <div className="flex items-center gap-2 px-3 py-2.5"
                          style={{ borderBottom: '1px solid rgba(255,215,0,0.15)' }}>
                          <Search className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,215,0,0.5)' }} />
                          <input autoFocus value={tagSearch} onChange={e => setTagSearch(e.target.value)}
                             placeholder={c.searchTag} aria-label={c.searchTag}
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none" />
                           <button onClick={() => { setTagDropOpen(false); setTagSearch(''); }} aria-label={c.closeSelector}
                            className="p-0.5 hover:opacity-70">
                            <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,215,0,0.4)' }} />
                          </button>
                        </div>
                        {/* Groups */}
                        <div className="max-h-52 overflow-y-auto">
                          {filteredGroups.length === 0 ? (
                            <div className="py-4 text-center text-xs" style={{ color: 'rgba(255,215,0,0.4)' }}>
                               {c.noResults}
                            </div>
                          ) : (
                            filteredGroups.map(group => (
                              <div key={group.group}>
                                <div className="px-3 py-1.5 text-xs font-black uppercase tracking-wide"
                                  style={{ color: 'rgba(255,215,0,0.4)', background: 'rgba(255,215,0,0.04)' }}>
                                  {group.group}
                                </div>
                                {group.items.map(item => (
                                  <button key={item} onClick={() => handleTagSelect(item)}
                                    className={`w-full px-4 py-2 text-sm transition-all hover:opacity-80 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                                    style={{ color: 'rgba(255,255,255,0.85)', borderBottom: '1px solid rgba(255,215,0,0.06)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,215,0,0.08)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    {item}
                                  </button>
                                ))}
                              </div>
                            ))
                          )}
                          {/* Custom entry */}
                          {tagSearch.trim() && (
                            <button onClick={() => handleTagSelect(tagSearch.trim())}
                               className={`w-full px-4 py-2.5 text-sm font-bold transition-all ${language === 'ar' ? 'text-right' : 'text-left'}`}
                              style={{ color: '#FFD700', background: 'rgba(255,215,0,0.06)', borderTop: '1px solid rgba(255,215,0,0.15)' }}>
                               ➕ {c.addCustom(tagSearch.trim())}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {errorMsg && (
                    <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                      style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)' }}>
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-sm text-red-400">{errorMsg}</p>
                    </div>
                  )}

                  {/* Progress */}
                  {status === 'uploading' && (
                    <div>
                      <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,215,0,0.6)' }}>
                        <span>{c.uploading}</span>
                         <span aria-label={c.uploadProgress(new Intl.NumberFormat(locale).format(progress))}>{progressLabel}</span>
                      </div>
                       <div className="h-2 rounded-full overflow-hidden" role="progressbar" aria-label={c.uploading} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{ background: 'rgba(255,215,0,0.1)' }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)' }}
                          animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                  <button onClick={handleSubmit} disabled={status === 'uploading' || !file}
                    className="w-full rounded-xl py-3.5 font-black text-black text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: '#FFD700' }}>
                    {status === 'uploading'
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> {c.uploading}</>
                      : <><Upload className="w-5 h-5" /> {c.uploadAction}</>}
                  </button>

                  <p className="text-center text-xs pb-1" style={{ color: 'rgba(255,215,0,0.3)' }}>
                     {c.rewardNote}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
