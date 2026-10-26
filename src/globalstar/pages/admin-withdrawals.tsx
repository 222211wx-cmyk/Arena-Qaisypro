import { useEffect, useState, useCallback } from "react";
import { GOLD, GOLD_A } from "../../components/social/social-i18n";
import { useLanguage } from "../contexts/language-context";
import { adminUploadCopy } from "../i18n/admin-upload-copy";

const API = (p: string) => p; // deployed at root; dev proxy handles /api

interface Withdrawal {
  id: number;
  uploader_name: string;
  amount_coins: string;
  amount_mad: string;
  amount_usd: string;
  status: "pending" | "approved" | "paid" | "rejected";
  requested_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#fbbf24", approved: "#22c55e", paid: "#3b82f6", rejected: "#ef4444",
};

interface PiracyReport {
  id: number;
  content_type: "gs_upload" | "pulse_post";
  content_id: number;
  reporter_name: string;
  accused_name: string | null;
  content_preview: string | null;
  reason: string;
  status: "pending" | "confirmed" | "dismissed";
  created_at: string;
}

interface RateSetting { content_type: string; rate: string; unit: string }

interface FinanceData {
  totalRevenue: number;
  sources: {
    globalstar: { earnings: number; views: number; items: number };
    pulse: { earnings: number; likes: number; items: number };
  };
  withdrawalsCommitted: number;
  divisions: { division: string; sharePct: number; amount: number }[];
}

const DIVISION_ICONS: Record<string, string> = {
  GLOBALSTAR: "🌟", "GDNA TV": "📺", "GDNA MUSIC": "🎵", "GDNA MERCH": "👕",
};

export default function AdminWithdrawals() {
  const { language } = useLanguage();
  const { admin: c, locale } = adminUploadCopy(language);
  const number = useCallback((value: number, maximumFractionDigits = 2) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: maximumFractionDigits, maximumFractionDigits }).format(value),
  [locale]);
  const [secret, setSecret] = useState(() => sessionStorage.getItem("gdna_admin_secret") ?? "");
  const [input, setInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [reports, setReports] = useState<PiracyReport[]>([]);
  const [rates, setRates] = useState<RateSetting[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [rateBusy, setRateBusy] = useState<string | null>(null);
  const [rateMsg, setRateMsg] = useState("");
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [shareDraft, setShareDraft] = useState<Record<string, string>>({});
  const [shareMsg, setShareMsg] = useState("");

  const headers = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) h["x-admin-secret"] = secret;
    return h;
  }, [secret]);

  const load = useCallback(async (sec: string) => {
    setError("");
    const h: Record<string, string> = {};
    if (sec) h["x-admin-secret"] = sec;
    const r = await fetch(API("/api/gs/admin/withdrawals"), { headers: h, credentials: "include" });
    if (!r.ok) {
      setAuthed(false);
      sessionStorage.removeItem("gdna_admin_secret");
      setError(r.status === 403 ? c.invalidKey : c.serverError);
      return;
    }
    const j = await r.json();
    setRows(j.withdrawals ?? []);
    setAuthed(true);
    if (sec) sessionStorage.setItem("gdna_admin_secret", sec);
    void fetch(API("/api/rights/admin/reports"), { headers: h, credentials: "include" })
      .then(res => res.ok ? res.json() : { reports: [] })
      .then(d => setReports(d.reports ?? []));
    void fetch(API("/api/rights/settings"), { credentials: "include" })
      .then(res => res.ok ? res.json() : { settings: [] })
      .then(d => setRates(d.settings ?? []));
    void fetch(API("/api/rights/admin/finance"), { headers: h, credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(d => {
        if (d) {
          setFinance(d);
          const draft: Record<string, string> = {};
          for (const dv of d.divisions) draft[dv.division] = String(dv.sharePct);
          setShareDraft(draft);
        }
      });
  }, [c.invalidKey, c.serverError]);

  useEffect(() => { if (secret) load(secret); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(id: number, status: string) {
    setBusy(id);
    try {
      const r = await fetch(API(`/api/gs/admin/withdrawals/${id}`), {
        method: "PATCH", headers: headers(), credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (r.ok) {
        const j = await r.json();
        setRows(prev => prev.map(w => (w.id === id ? j.withdrawal : w)));
      } else {
        setError(c.statusUpdateError);
      }
    } finally { setBusy(null); }
  }

  async function resolveReport(id: number, status: "confirmed" | "dismissed") {
    setBusy(id);
    try {
      const r = await fetch(API(`/api/rights/admin/reports/${id}`), {
        method: "PATCH", headers: headers(), credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (r.ok) {
        const j = await r.json();
        setReports(prev => prev.map(x => (x.id === id ? { ...x, status: j.report.status } : x)));
      } else setError(c.reportUpdateError);
    } finally { setBusy(null); }
  }

  async function saveRate(contentType: string, rate: string) {
    setRateMsg("");
    const num = parseFloat(rate);
    if (isNaN(num) || num < 0) { setError(c.invalidRate); return; }
    setRateBusy(contentType);
    try {
      const r = await fetch(API("/api/rights/admin/settings"), {
        method: "PATCH", headers: headers(), credentials: "include",
        body: JSON.stringify({ contentType, rate: num }),
      });
      if (!r.ok) setError(c.saveRateError);
      else {
        setError("");
        setRateMsg(c.rateSaved);
      }
    } finally { setRateBusy(null); }
  }

  async function saveShares() {
    setShareMsg("");
    const shares = Object.entries(shareDraft).map(([division, pct]) => ({ division, sharePct: parseFloat(pct) }));
    const sum = shares.reduce((s, x) => s + (isNaN(x.sharePct) ? 0 : x.sharePct), 0);
    if (Math.abs(sum - 100) > 0.01) { setShareMsg(c.shareTotalError(number(sum))); return; }
    const r = await fetch(API("/api/rights/admin/divisions"), {
      method: "PATCH", headers: headers(), credentials: "include",
      body: JSON.stringify({ shares }),
    });
    if (r.ok) { setShareMsg(c.saved); void load(secret); }
    else {
      setShareMsg(c.saveFailed);
    }
  }

  const pendingTotal = rows.filter(w => w.status === "pending")
    .reduce((s, w) => s + parseFloat(w.amount_mad || "0"), 0);

  if (!authed) {
    return (
      <div dir={language === "ar" ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 380, background: "#0d0d0d", border: `1px solid ${GOLD_A(0.188)}`, borderRadius: 16, padding: 28, textAlign: "center" }}>
          <p style={{ fontSize: 40, margin: "0 0 8px" }}>👑</p>
           <h1 style={{ color: GOLD, fontSize: 18, fontWeight: 900, margin: "0 0 6px" }}>{c.portal}</h1>
           <p style={{ color: "#888", fontSize: 12, margin: "0 0 18px" }}>{c.portalHelp}</p>
           <label htmlFor="admin-secret" style={{ display: "block", color: "#aaa", fontSize: 12, marginBottom: 6 }}>{c.adminKey}</label>
           <input id="admin-secret" aria-label={c.adminKey} type="password" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && (setSecret(input.trim()), load(input.trim()))}
            placeholder="ADMIN_SECRET"
            style={{ width: "100%", boxSizing: "border-box", background: "#111", border: `1px solid ${GOLD_A(0.145)}`, borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", marginBottom: 12, textAlign: "center" }} />
          <button onClick={() => { if (input.trim()) { setSecret(input.trim()); load(input.trim()); } }}
            style={{ width: "100%", background: GOLD, border: "none", borderRadius: 10, padding: "10px 0", color: "#000", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
             {c.signIn}
          </button>
          {error && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 12 }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "#050505", padding: "24px 16px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
           <h1 style={{ color: GOLD, fontSize: 20, fontWeight: 900, margin: 0, flex: 1 }}>👑 {c.title}</h1>
          <div style={{ background: "#0d0d0d", border: `1px solid ${GOLD_A(0.145)}`, borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#fff" }}>
             {c.pendingTotal}: <b style={{ color: GOLD }}>{number(pendingTotal)} MAD</b>
          </div>
          <button onClick={() => load(secret)} style={{ background: "#1a1a1a", border: `1px solid ${GOLD_A(0.125)}`, borderRadius: 10, padding: "8px 14px", color: GOLD, fontSize: 13, cursor: "pointer" }}>
            🔄 {c.refresh}
          </button>
        </div>
        {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
        {rows.length === 0 ? (
          <p style={{ color: "#666", textAlign: "center", padding: 40 }}>{c.noWithdrawals}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map(w => (
              <div key={w.id} style={{ background: "#0d0d0d", border: `1px solid ${GOLD_A(0.082)}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <p style={{ margin: 0, color: "#fff", fontWeight: 800, fontSize: 14 }}>{w.uploader_name}</p>
                   <p style={{ margin: "2px 0 0", color: "#888", fontSize: 11 }}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(w.requested_at))}</p>
                </div>
                <div style={{ textAlign: "center" }}>
                   <p style={{ margin: 0, color: GOLD, fontWeight: 900, fontSize: 16 }}>{number(parseFloat(w.amount_mad))} MAD</p>
                   <p style={{ margin: 0, color: "#666", fontSize: 11 }}>{number(parseFloat(w.amount_coins), 0)} 🪙 · ${number(parseFloat(w.amount_usd))}</p>
                </div>
                 <span style={{ color: STATUS_COLORS[w.status], fontSize: 13, fontWeight: 800, minWidth: 110, textAlign: "center" }}>
                   {c.status[w.status]}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  {w.status === "pending" && (
                    <>
                      <button disabled={busy === w.id} onClick={() => setStatus(w.id, "approved")}
                        style={{ background: "#22c55e20", border: "1px solid #22c55e50", borderRadius: 8, padding: "6px 12px", color: "#22c55e", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{c.approve}</button>
                      <button disabled={busy === w.id} onClick={() => setStatus(w.id, "rejected")}
                        style={{ background: "#ef444420", border: "1px solid #ef444450", borderRadius: 8, padding: "6px 12px", color: "#ef4444", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{c.reject}</button>
                    </>
                  )}
                  {w.status === "approved" && (
                    <button disabled={busy === w.id} onClick={() => setStatus(w.id, "paid")}
                       style={{ background: "#3b82f620", border: "1px solid #3b82f650", borderRadius: 8, padding: "6px 12px", color: "#3b82f6", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{c.markPaid} 💰</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

         <h2 style={{ color: GOLD, fontSize: 17, fontWeight: 900, margin: "34px 0 12px" }}>🏦 {c.financeTitle}</h2>
        {!finance ? (
           <p style={{ color: "#666", textAlign: "center", padding: 24 }}>{c.loading}</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
              <div style={{ background: "#0d0d0d", border: `1px solid ${GOLD_A(0.188)}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                 <p style={{ margin: 0, color: "#888", fontSize: 11 }}>💰 {c.totalRevenue}</p>
                 <p style={{ margin: "4px 0 0", color: GOLD, fontWeight: 900, fontSize: 20 }}>{number(finance.totalRevenue)} 🪙</p>
              </div>
              <div style={{ background: "#0d0d0d", border: `1px solid ${GOLD_A(0.082)}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                 <p style={{ margin: 0, color: "#888", fontSize: 11 }}>🎬 {c.globalstarViews(number(finance.sources.globalstar.views, 0))}</p>
                 <p style={{ margin: "4px 0 0", color: "#fff", fontWeight: 800, fontSize: 16 }}>{number(finance.sources.globalstar.earnings)} 🪙</p>
              </div>
              <div style={{ background: "#0d0d0d", border: `1px solid ${GOLD_A(0.082)}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                 <p style={{ margin: 0, color: "#888", fontSize: 11 }}>📢 {c.pulseLikes(number(finance.sources.pulse.likes, 0))}</p>
                 <p style={{ margin: "4px 0 0", color: "#fff", fontWeight: 800, fontSize: 16 }}>{number(finance.sources.pulse.earnings)} 🪙</p>
              </div>
              <div style={{ background: "#0d0d0d", border: `1px solid #ef444430`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                 <p style={{ margin: 0, color: "#888", fontSize: 11 }}>📤 {c.withdrawalsCommitted}</p>
                 <p style={{ margin: "4px 0 0", color: "#ef4444", fontWeight: 800, fontSize: 16 }}>{number(finance.withdrawalsCommitted)} 🪙</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {finance.divisions.map(d => (
                <div key={d.division} style={{ background: "#0d0d0d", border: `1px solid ${GOLD_A(0.082)}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <p style={{ margin: 0, color: "#fff", fontSize: 14, fontWeight: 800, flex: 1, minWidth: 140 }}>
                    {DIVISION_ICONS[d.division] ?? "🏛️"} {d.division}
                  </p>
                  <div style={{ flex: 2, minWidth: 120, height: 8, background: "#1a1a1a", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ width: `${d.sharePct}%`, height: "100%", background: GOLD, borderRadius: 6 }} />
                  </div>
                  <input type="number" step="1" min="0" max="100"
                    value={shareDraft[d.division] ?? String(d.sharePct)}
                    onChange={e => setShareDraft(prev => ({ ...prev, [d.division]: e.target.value }))}
                    style={{ width: 64, background: "#111", border: `1px solid ${GOLD_A(0.145)}`, borderRadius: 8, padding: "6px 8px", color: GOLD, fontSize: 13, fontWeight: 800, textAlign: "center", outline: "none" }} />
                  <span style={{ color: "#888", fontSize: 12, minWidth: 20 }}>%</span>
                   <b style={{ color: GOLD, fontSize: 14, minWidth: 90, textAlign: language === "ar" ? "right" : "left" }}>{number(d.amount)} 🪙</b>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <button onClick={() => void saveShares()}
                style={{ background: GOLD, border: "none", borderRadius: 10, padding: "8px 18px", color: "#000", fontWeight: 900, fontSize: 13, cursor: "pointer" }}>
                 {c.saveShares}
              </button>
              {shareMsg && <span style={{ color: shareMsg.startsWith("✅") ? "#22c55e" : "#ef4444", fontSize: 13 }}>{shareMsg}</span>}
            </div>
          </>
        )}

         <h2 style={{ color: GOLD, fontSize: 17, fontWeight: 900, margin: "34px 0 12px" }}>⚖️ {c.ratesTitle}</h2>
         {rates.length === 0 ? (
           <p style={{ color: "#666", textAlign: "center", padding: 24 }}>{c.noRates}</p>
         ) : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
           {rates.map(s => (
            <div key={s.content_type} style={{ background: "#0d0d0d", border: `1px solid ${GOLD_A(0.082)}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <p style={{ margin: 0, color: "#fff", fontSize: 13, fontWeight: 700, flex: 1, minWidth: 200 }}>
                 {c.rateLabels[s.content_type as keyof typeof c.rateLabels] ?? s.content_type}
              </p>
              <input type="number" step="0.01" min="0" defaultValue={parseFloat(s.rate)}
                onBlur={e => void saveRate(s.content_type, e.target.value)}
                style={{ width: 90, background: "#111", border: `1px solid ${GOLD_A(0.145)}`, borderRadius: 8, padding: "6px 10px", color: GOLD, fontSize: 13, fontWeight: 800, textAlign: "center", outline: "none" }} />
               <span style={{ color: "#888", fontSize: 12 }}>🪙 / {s.unit === "view" ? c.units.view : c.units.like}</span>
              {rateBusy === s.content_type && <span style={{ color: GOLD, fontSize: 12 }}>...</span>}
            </div>
          ))}
         </div>}
         {rateMsg && <p role="status" style={{ color: "#22c55e", fontSize: 12 }}>{rateMsg}</p>}

         <h2 style={{ color: GOLD, fontSize: 17, fontWeight: 900, margin: "34px 0 12px" }}>🚨 {c.piracyTitle}</h2>
        {reports.length === 0 ? (
           <p style={{ color: "#666", textAlign: "center", padding: 24 }}>{c.noReports}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reports.map(r => (
              <div key={r.id} style={{ background: "#0d0d0d", border: `1px solid ${r.status === "pending" ? "#ef444440" : GOLD_A(0.082)}`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>
                     {c.contentTypes[r.content_type]} #{number(r.content_id, 0)}
                  </span>
                   <span style={{ color: "#888", fontSize: 11 }}>{c.accused}: <b style={{ color: "#ef4444" }}>{r.accused_name ?? "?"}</b></span>
                   <span style={{ color: "#888", fontSize: 11 }}>{c.reporter}: <b style={{ color: GOLD }}>{r.reporter_name}</b></span>
                   <span style={{ marginInlineStart: "auto", fontSize: 12, fontWeight: 800, color: r.status === "pending" ? "#fbbf24" : r.status === "confirmed" ? "#ef4444" : "#22c55e" }}>
                     {c.reportStatus[r.status]}
                  </span>
                </div>
                {r.content_preview && <p style={{ margin: "0 0 4px", color: "#aaa", fontSize: 12 }}>«{r.content_preview}»</p>}
                 <p style={{ margin: 0, color: "#888", fontSize: 12 }}>{c.reason}: {r.reason}</p>
                {r.status === "pending" && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button disabled={busy === r.id} onClick={() => void resolveReport(r.id, "confirmed")}
                      style={{ background: "#ef444420", border: "1px solid #ef444450", borderRadius: 8, padding: "6px 12px", color: "#ef4444", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                       {c.confirmPiracy}
                    </button>
                    <button disabled={busy === r.id} onClick={() => void resolveReport(r.id, "dismissed")}
                      style={{ background: "#22c55e20", border: "1px solid #22c55e50", borderRadius: 8, padding: "6px 12px", color: "#22c55e", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                       {c.dismissReport}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
