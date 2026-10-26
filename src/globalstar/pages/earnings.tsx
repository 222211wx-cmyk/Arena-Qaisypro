import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import { useLanguage } from '@/globalstar/contexts/language-context';
import { earningsFigureCopy } from '@/globalstar/i18n/earnings-figure-copy';
import { Navbar } from '@/globalstar/components/navbar';
import { NewsTicker } from '@/globalstar/components/news-ticker';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, Eye, Upload, ArrowLeft, TrendingUp, Video, Music,
  Search, DollarSign, Banknote, Clock, CheckCircle2, XCircle,
  Hourglass, RefreshCw, ArrowDownCircle, AlertCircle, X,
} from 'lucide-react';

interface EarningsUpload {
  id: number;
  title: string;
  type: 'video' | 'audio';
  category: string;
  figure_tag?: string;
  file_name: string;
  views: number;
  earnings: string | number;
  created_at: string;
}

interface Withdrawal {
  id: number;
  amount_coins: string | number;
  amount_mad: string | number;
  amount_usd: string | number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  requested_at: string;
  paid_at?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  sport: '⚽', press: '📰', art: '🎨', knowledge: '📚',
};

const STATUS_META: Record<string, { color: string; icon: React.ReactNode }> = {
  pending:  { color: '#FFD700', icon: <Hourglass className="w-3.5 h-3.5" /> },
  approved: { color: '#4ade80', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  paid:     { color: '#4ade80', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rejected: { color: '#f87171', icon: <XCircle className="w-3.5 h-3.5" /> },
};

// Animated counter
function AnimatedNumber({ value, locale, decimals = 2 }: { value: number; locale: string; decimals?: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    const start = prev.current;
    const end = value;
    const duration = 800;
    const startTime = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(start + (end - start) * eased);
      if (t < 1) requestAnimationFrame(animate);
      else { setDisplay(end); prev.current = end; }
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <>{new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(display)}</>;
}

export default function EarningsPage() {
  const { language } = useLanguage();
  const copy = earningsFigureCopy(language);
  const c = copy.earnings;
  const locale = copy.locale;
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const [name, setName] = useState(() => localStorage.getItem('empire_citizen_name') ?? '');
  const [searched, setSearched] = useState(false);
  const [uploads, setUploads] = useState<EarningsUpload[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'withdraw'>('content');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [withdrawError, setWithdrawError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState(false);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

  const fetchAll = useCallback(async (_n?: string, silent = false) => {
    // Identity now comes from the login session — no name needed.
    if (!silent) setLoading(true);
    if (!silent) setLoadError(false);
    try {
      const [earnRes, wdRes] = await Promise.all([
        fetch(`${BASE}/api/gs/earnings`, { credentials: 'include' }),
        fetch(`${BASE}/api/gs/withdrawals`, { credentials: 'include' }),
      ]);
      if (earnRes.ok && wdRes.ok) {
        const earnData = await earnRes.json();
        const wdData = await wdRes.json();
        setUploads(earnData.uploads ?? []);
        setTotalEarnings(earnData.totalEarnings ?? 0);
        setTotalViews(earnData.totalViews ?? 0);
        setWithdrawals(wdData.withdrawals ?? []);
        if (earnData.uploaderName) setName(earnData.uploaderName);
        setSearched(true);
        setLastRefresh(new Date());
      } else {
        setLoadError(true);
      }
    } catch { setLoadError(true); }
    if (!silent) setLoading(false);
  }, [BASE]);

  useEffect(() => {
    fetchAll();
  }, []);

  // Auto-refresh every 15 seconds if we have data
  useEffect(() => {
    if (!searched) return;
    const interval = setInterval(() => fetchAll(name, true), 15000);
    return () => clearInterval(interval);
  }, [searched, name, fetchAll]);

  const handleSearch = () => {
    localStorage.setItem('empire_citizen_name', name.trim());
    fetchAll(name);
  };

  // Calculate pending withdrawals
  const pendingWithdrawalTotal = withdrawals
    .filter(w => w.status === 'pending' || w.status === 'approved')
    .reduce((s, w) => s + parseFloat(String(w.amount_coins)), 0);
  const availableBalance = Math.max(0, totalEarnings - pendingWithdrawalTotal);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) { setWithdrawError(c.invalidAmount); return; }
    if (amount > availableBalance) { setWithdrawError(c.insufficient); return; }
    if (amount < 10) { setWithdrawError(c.belowMinimum); return; }

    setWithdrawStatus('loading');
    setWithdrawError('');
    try {
      const r = await fetch(`${BASE}/api/gs/withdrawals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amountCoins: amount }),
      });
      await r.json();
      if (!r.ok) { setWithdrawError(c.requestFailed); setWithdrawStatus('error'); return; }
      setWithdrawStatus('success');
      setWithdrawAmount('');
      fetchAll(name, true);
      setTimeout(() => setWithdrawStatus('idle'), 3000);
    } catch {
      setWithdrawError(c.connectionError);
      setWithdrawStatus('error');
    }
  };

  const number = (value: number, digits = 2) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

  return (
    <div className="min-h-[100dvh]" dir={direction} style={{ background: '#0a0800' }}>
      <Navbar />
      <NewsTicker />

      <main className="container mx-auto px-4 py-8 max-w-3xl">

        {/* Back */}
        <Link href="/ranking">
          <button className="flex items-center gap-2 text-sm mb-6 transition-colors hover:opacity-80"
            style={{ color: 'rgba(255,215,0,0.6)' }}>
            <ArrowLeft className={`w-4 h-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} /> {c.back}
          </button>
        </Link>

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,140,0,0.05))', border: '1.5px solid rgba(255,215,0,0.4)' }}>
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <Coins className="w-9 h-9" style={{ color: '#FFD700' }} />
                <div>
                  <h1 className="text-3xl font-black text-white">{c.title}</h1>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,215,0,0.5)' }}>
                    {c.subtitle}
                  </p>
                </div>
              </div>
              {lastRefresh && (
                <button onClick={() => fetchAll(name, true)}
                  aria-label={c.refresh}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-70"
                  style={{ border: '1px solid rgba(255,215,0,0.2)', color: 'rgba(255,215,0,0.5)' }}>
                  <RefreshCw className="w-3 h-3" />
                  {c.refreshAt(lastRefresh.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }))}
                </button>
              )}
            </div>
            <p className="text-xs mt-2 text-start" style={{ color: 'rgba(255,215,0,0.45)' }}>
              {c.rateSummary}
            </p>
          </div>
        </motion.div>

        {/* ── SEARCH ────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5 mb-6"
          style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)' }}>
          <p className="text-sm font-bold mb-3 text-start" style={{ color: 'rgba(255,215,0,0.7)' }}>
            {c.searchLabel}
          </p>
          <div className="flex gap-2">
            <button onClick={handleSearch} disabled={loading || !name.trim()}
              className="px-5 py-3 rounded-xl font-black text-black transition-all hover:opacity-90 disabled:opacity-40 shrink-0 flex items-center gap-2"
              style={{ background: '#FFD700' }}>
              <Search className="w-4 h-4" /> {c.search}
            </button>
            <input value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={c.searchPlaceholder}
              aria-label={c.searchLabel}
              className="flex-1 rounded-xl px-4 py-3 text-sm text-white text-start placeholder:text-white/30 outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,215,0,0.25)' }} />
          </div>
        </div>

        {loading && <p className="text-center text-sm mb-6 text-white/50" role="status">{c.loading}</p>}
        {loadError && <div className="text-center mb-6 text-red-400" role="alert">{c.loadError}</div>}

        <AnimatePresence>
        {searched && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

            {/* ── LIVE STATS ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {/* Coins */}
              <div className="col-span-2 rounded-2xl p-5"
                style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.08))', border: '1.5px solid rgba(255,215,0,0.4)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-5 h-5" style={{ color: '#FFD700' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,215,0,0.6)' }}>{c.totalEarnings}</span>
                </div>
                <div className="text-4xl font-black" style={{ color: '#FFD700', fontFamily: 'monospace' }}>
                  <AnimatedNumber value={totalEarnings} locale={locale} />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs" style={{ color: 'rgba(255,215,0,0.5)' }}>{c.coin}</span>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,215,0,0.4)' }}>
                    <Banknote className="w-3 h-3" />
                    <AnimatedNumber value={totalEarnings} locale={locale} /> MAD
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,215,0,0.4)' }}>
                    <DollarSign className="w-3 h-3" />
                    <AnimatedNumber value={totalEarnings * 0.10} locale={locale} /> USD
                  </div>
                </div>
              </div>

              {/* Views */}
              <div className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,215,0,0.15)' }}>
                <Eye className="w-5 h-5 mb-2" style={{ color: 'rgba(255,215,0,0.6)' }} />
                <div className="text-2xl font-black text-white font-mono">
                  <AnimatedNumber value={totalViews} locale={locale} decimals={0} />
                </div>
                <div className="text-xs mt-1" style={{ color: 'rgba(255,215,0,0.4)' }}>{c.views}</div>
              </div>

              {/* Uploads */}
              <div className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,215,0,0.15)' }}>
                <Upload className="w-5 h-5 mb-2" style={{ color: 'rgba(255,215,0,0.6)' }} />
                <div className="text-2xl font-black text-white">{new Intl.NumberFormat(locale).format(uploads.length)}</div>
                <div className="text-xs mt-1" style={{ color: 'rgba(255,215,0,0.4)' }}>{c.uploads}</div>
              </div>
            </div>

            {/* Available balance banner */}
            <div className="rounded-xl px-5 py-3 mb-6 flex items-center justify-between"
              style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-bold text-green-400">
                  {c.availableCoins(number(availableBalance))}
                </span>
              </div>
              <span className="text-xs" style={{ color: 'rgba(74,222,128,0.6)' }}>
                ≈ {number(availableBalance)} MAD · {number(availableBalance * 0.10)} USD
              </span>
            </div>

            {/* ── TABS ──────────────────────────────────────────────────────── */}
            <div className="flex gap-2 mb-5">
              {[
                { key: 'content', label: c.contentTab, icon: <Video className="w-4 h-4" /> },
                { key: 'withdraw', label: c.withdrawTab, icon: <ArrowDownCircle className="w-4 h-4" /> },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all"
                  style={activeTab === tab.key
                    ? { background: '#FFD700', color: '#000' }
                    : { background: 'rgba(255,215,0,0.06)', color: 'rgba(255,215,0,0.6)', border: '1px solid rgba(255,215,0,0.2)' }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* ── CONTENT TAB ───────────────────────────────────────────────── */}
            {activeTab === 'content' && (
              uploads.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,215,0,0.15)' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,215,0,0.4)' }}>{c.noContent}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,215,0,0.25)' }}>{c.uploadHint}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploads.map((u, i) => {
                    const earnPct = totalEarnings > 0 ? (parseFloat(String(u.earnings)) / totalEarnings) * 100 : 0;
                    return (
                      <motion.div key={u.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="rounded-xl overflow-hidden"
                        style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.15)' }}>
                        <div className="p-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)' }}>
                            {u.type === 'video'
                              ? <Video className="w-5 h-5" style={{ color: '#FFD700' }} />
                              : <Music className="w-5 h-5" style={{ color: '#FFD700' }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-white truncate">{u.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs" style={{ color: 'rgba(255,215,0,0.5)' }}>
                                {CATEGORY_ICONS[u.category]} {c.categories[u.category] ?? u.category}
                              </span>
                              {u.figure_tag && (
                                <>
                                  <span style={{ color: 'rgba(255,215,0,0.2)' }}>·</span>
                                  <span className="text-xs font-bold" style={{ color: '#FFD700' }}>
                                    📌 {u.figure_tag}
                                  </span>
                                </>
                              )}
                              <span style={{ color: 'rgba(255,215,0,0.2)' }}>·</span>
                              <span className="text-xs" style={{ color: 'rgba(255,215,0,0.35)' }}>
                                {new Date(u.created_at).toLocaleDateString(locale)}
                              </span>
                            </div>
                          </div>
                          <div className="text-end shrink-0">
                            <div className="flex items-center gap-1 justify-end mb-1">
                              <span className="text-base font-black" style={{ color: '#FFD700', fontFamily: 'monospace' }}>
                                {number(parseFloat(String(u.earnings)))}
                              </span>
                              <Coins className="w-4 h-4" style={{ color: '#FFD700' }} />
                            </div>
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-xs font-mono text-white">{u.views.toLocaleString(locale)}</span>
                              <Eye className="w-3 h-3" style={{ color: 'rgba(255,215,0,0.5)' }} />
                            </div>
                          </div>
                        </div>
                        {/* Per-content earnings bar */}
                        <div className="h-1" style={{ background: 'rgba(255,215,0,0.06)' }}>
                          <motion.div className="h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${earnPct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.04 + 0.3 }}
                            style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)' }} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )
            )}

            {/* ── WITHDRAW TAB ──────────────────────────────────────────────── */}
            {activeTab === 'withdraw' && (
              <div className="space-y-4">
                {/* Rates info */}
                <div className="rounded-2xl p-4"
                  style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)' }}>
                  <p className="font-black text-sm text-white mb-3 text-start">{c.conversion}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: <Coins className="w-4 h-4" style={{ color: '#FFD700' }} />, from: c.oneCoin, to: c.oneMad, color: '#FFD700' },
                      { icon: <DollarSign className="w-4 h-4 text-green-400" />, from: c.oneCoin, to: c.tenthUsd, color: '#4ade80' },
                      { icon: <Clock className="w-4 h-4 text-blue-400" />, from: c.minimum, to: c.tenCoins, color: '#60a5fa' },
                    ].map((rate, i) => (
                      <div key={i} className="rounded-xl p-3 text-center"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,215,0,0.1)' }}>
                        <div className="flex justify-center mb-1">{rate.icon}</div>
                        <p className="text-xs font-bold" style={{ color: rate.color }}>{rate.from}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{rate.to}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Withdrawal form */}
                <div className="rounded-2xl p-5"
                  style={{ background: 'rgba(255,215,0,0.04)', border: '1.5px solid rgba(255,215,0,0.25)' }}>
                  <p className="font-black text-white mb-1 text-start">{c.request}</p>
                  <p className="text-xs mb-4 text-start" style={{ color: 'rgba(255,215,0,0.5)' }}>
                    {c.availableShort}: <span style={{ color: '#FFD700', fontWeight: 900 }}>{number(availableBalance)}</span> {c.coin}
                  </p>

                  <div className="flex gap-2 mb-3">
                    <input
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder={c.amountPlaceholder}
                      aria-label={c.amountPlaceholder}
                      inputMode="decimal"
                      className="flex-1 rounded-xl px-4 py-3 text-start text-sm text-white placeholder:text-white/30 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,215,0,0.3)' }}
                    />
                    <button
                      onClick={() => setWithdrawAmount(availableBalance.toFixed(2))}
                      className="px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                      style={{ border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', background: 'rgba(255,215,0,0.08)' }}>
                      {c.all}
                    </button>
                  </div>

                  {withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && parseFloat(withdrawAmount) > 0 && (
                    <div className="rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between"
                      style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)' }}>
                      <span className="text-xs" style={{ color: 'rgba(255,215,0,0.5)' }}>{c.receive}</span>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span style={{ color: '#4ade80' }}>{number(parseFloat(withdrawAmount) * 0.10)} USD</span>
                        <span style={{ color: 'rgba(255,215,0,0.4)' }}>·</span>
                        <span style={{ color: '#FFD700' }}>{number(parseFloat(withdrawAmount))} MAD</span>
                      </div>
                    </div>
                  )}

                  {withdrawError && (
                    <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 mb-3"
                      style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)' }}>
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-sm text-red-400">{withdrawError}</p>
                      <button aria-label={c.dismissError} onClick={() => { setWithdrawError(''); setWithdrawStatus('idle'); }} className="ms-auto">
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  )}

                  {withdrawStatus === 'success' ? (
                    <div className="flex items-center justify-center gap-2 py-3 rounded-xl"
                      style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <span className="font-bold text-green-400 text-sm">{c.sent}</span>
                    </div>
                  ) : (
                    <button onClick={handleWithdraw}
                      disabled={withdrawStatus === 'loading' || !withdrawAmount || availableBalance < 10}
                      className="w-full rounded-xl py-3.5 font-black text-black text-base transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                      style={{ background: '#FFD700' }}>
                      <ArrowDownCircle className="w-5 h-5" />
                      {withdrawStatus === 'loading' ? c.sending : c.submit}
                    </button>
                  )}
                </div>

                {/* Withdrawal history */}
                {withdrawals.length > 0 && (
                  <div>
                    <p className="font-black text-sm text-white mb-3 text-start">
                      {c.historyCount(new Intl.NumberFormat(locale).format(withdrawals.length))}
                    </p>
                    <div className="space-y-2">
                      {withdrawals.map((w, i) => {
                        const meta = STATUS_META[w.status];
                        return (
                          <motion.div key={w.id}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                            className="rounded-xl p-4 flex items-center gap-4"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,215,0,0.1)' }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}40`, color: meta.color }}>
                              {meta.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white font-mono">
                                  {number(parseFloat(String(w.amount_coins)))} {c.coin}
                                </span>
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                                <span className="text-xs font-mono" style={{ color: 'rgba(255,215,0,0.5)' }}>
                                  {number(parseFloat(String(w.amount_mad)))} MAD
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-bold" style={{ color: meta.color }}>
                                  {c.statuses[w.status] ?? w.status}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                  {new Date(w.requested_at).toLocaleDateString(locale)}
                                </span>
                              </div>
                            </div>
                            <div className="text-end shrink-0">
                              <span className="text-xs font-mono text-green-400">
                                {number(parseFloat(String(w.amount_usd)))} $
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        )}
        </AnimatePresence>
      </main>
    </div>
  );
}
