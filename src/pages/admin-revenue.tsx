import { useState, useEffect, useCallback } from "react";
import { GOLD, GOLD_A } from "../components/social/social-i18n";
import { useLang } from "@/contexts/LangContext";
import { financeT } from "@/i18n/finance-copy";

/* ── الإدارة المالية الملكية الموحدة ─────────────────────────────────────────
 * One admin page, three sections:
 *  [القديم]  existing views/likes rates + division split (rights system)
 *  [التابات] ChatTabManager — every conversation/clip is a tab with revenue
 *  [التوزيع] PPOAuditor — beneficiaries (shares MUST sum to 100%) + distributions
 * All data lives in the ONE platform database via /api/rights/* and /api/ppo/*.
 */

const API = (p: string) => `${import.meta.env.BASE_URL.replace(/\/$/, "")}${p}`;

type Beneficiary = { id: number; user_id: number; username: string; role: string; share_rate: string; total_earned: string; status: string };
type RoomTab = { id: number; name: string | null; type: string; revenue: string };
type ClipTab = { kind: string; id: number; title: string | null; earnings: string };
type Distribution = {
  id: number;
  period: string;
  total_profit: string;
  created_at: string;
  items: {
    userId: number;
    role: string;
    shareRate: string;
    amount: string;
    walletAmount?: number;
    credited?: boolean;
  }[];
};
type Overview = {
  revenue: { uploads: number; posts: number; rooms: number; total: number };
  distributed: number; pool: number;
  beneficiaries: Beneficiary[]; roomTabs: RoomTab[]; clipTabs: ClipTab[]; distributions: Distribution[];
};
type Rate = { content_type: string; rate: string; unit: string };
type Division = { division: string; sharePct: number; amount: number };

export default function AdminRevenuePage() {
  const { lang } = useLang();
  const t = (ar: string, en: string, fr: string, es: string, de: string) => ({ ar, en, fr, es, de }[lang]);
  const locale = ({ en: "en-US", fr: "fr-FR", ar: "ar-MA", es: "es-ES", de: "de-DE" } as const)[lang];
  const fc = (key: "revenue_globalstar_help" | "revenue_citizen_id" | "revenue_role_example" | "revenue_share_percent" | "revenue_period_example") => financeT(lang, key);
  const fmt = (v: string | number) => Number(v).toLocaleString(locale, { maximumFractionDigits: 2 });
  const [secret, setSecret] = useState(() => sessionStorage.getItem("gdna_admin_secret") ?? "");
  const [input, setInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [section, setSection] = useState<"old" | "tabs" | "ppo">("ppo");
  const [ov, setOv] = useState<Overview | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [msg, setMsg] = useState("");
  // PPO form
  const [bUser, setBUser] = useState(""); const [bRole, setBRole] = useState(""); const [bShare, setBShare] = useState("");
  const [period, setPeriod] = useState("");
  const [tabDraft, setTabDraft] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  const headers = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) h["x-admin-secret"] = secret;
    return h;
  }, [secret]);

  const load = useCallback(async (sec: string) => {
    setError("");
    const h: Record<string, string> = {};
    if (sec) h["x-admin-secret"] = sec;
    const r = await fetch(API("/api/ppo/overview"), { headers: h, credentials: "include" });
    if (!r.ok) {
      setAuthed(false); sessionStorage.removeItem("gdna_admin_secret");
      setError(r.status === 403 ? t("المفتاح غير صحيح — الدخول مرفوض", "Invalid key — access denied", "Clé invalide — accès refusé", "Clave no válida — acceso denegado", "Ungültiger Schlüssel — Zugriff verweigert") : t("خطأ في الخادم", "Server error", "Erreur du serveur", "Error del servidor", "Serverfehler"));
      return;
    }
    setOv(await r.json());
    setAuthed(true);
    if (sec) sessionStorage.setItem("gdna_admin_secret", sec);
    void fetch(API("/api/rights/settings"), { credentials: "include" })
      .then(res => res.ok ? res.json() : { settings: [] }).then(d => setRates(d.settings ?? []));
    void fetch(API("/api/rights/admin/finance"), { headers: h, credentials: "include" })
      .then(res => res.ok ? res.json() : null).then(d => { if (d) setDivisions(d.divisions ?? []); });
  }, [lang]);

  useEffect(() => { if (secret) void load(secret); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function call(method: string, path: string, body?: unknown) {
    setBusy(true); setMsg("");
    try {
      const r = await fetch(API(path), { method, headers: headers(), credentials: "include", body: body ? JSON.stringify(body) : undefined });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(j.error ?? t("فشلت العملية", "Operation failed", "L'opération a échoué", "La operación falló", "Vorgang fehlgeschlagen")); return null; }
      await load(secret);
      return j;
    } finally { setBusy(false); }
  }

  const activeSum = ov?.beneficiaries.filter(b => b.status === "active").reduce((s, b) => s + parseFloat(b.share_rate), 0) ?? 0;

  if (!authed) {
    return (
      <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ maxWidth: 420, margin: "60px auto", padding: 24, textAlign: "center" }}>
        <h1 style={{ color: GOLD, fontSize: 22, marginBottom: 12 }}>👑 {t("الإدارة المالية الملكية", "Royal Finance Administration", "Administration financière royale", "Administración financiera real", "Königliche Finanzverwaltung")}</h1>
        <p style={{ color: "#999", fontSize: 14, marginBottom: 16 }}>{t("ادخل المفتاح الإداري أو سجّل الدخول بحساب إداري", "Enter the admin key or sign in with an admin account", "Saisissez la clé administrateur ou connectez-vous avec un compte administrateur", "Introduce la clave de administrador o inicia sesión con una cuenta de administrador", "Gib den Administratorschlüssel ein oder melde dich mit einem Administratorkonto an")}</p>
        <input type="password" value={input} onChange={e => setInput(e.target.value)} placeholder={t("المفتاح الإداري", "Admin key", "Clé administrateur", "Clave de administrador", "Administratorschlüssel")}
          style={{ width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${GOLD_A(0.267)}`, background: "#111", color: "#eee", marginBottom: 10 }} />
        <button onClick={() => { setSecret(input); void load(input); }}
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: GOLD, color: "#111", fontWeight: 700, cursor: "pointer" }}>
          {t("دخول", "Sign in", "Se connecter", "Iniciar sesión", "Anmelden")}
        </button>
        <button onClick={() => void load("")} style={{ marginTop: 8, background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13 }}>
          {t("دخول بجلسة إدارية", "Sign in with admin session", "Se connecter avec une session administrateur", "Iniciar sesión con sesión de administrador", "Mit Administratorsitzung anmelden")}
        </button>
        {error && <p style={{ color: "#f87171", marginTop: 10 }}>{error}</p>}
      </div>
    );
  }

  const card: React.CSSProperties = { background: "#141414", border: `1px solid ${GOLD_A(0.133)}`, borderRadius: 14, padding: 16, marginBottom: 14 };
  const inp: React.CSSProperties = { padding: 8, borderRadius: 8, border: "1px solid #333", background: "#0d0d0d", color: "#eee", fontSize: 14 };
  const btn: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "none", background: GOLD, color: "#111", fontWeight: 700, cursor: "pointer" };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ maxWidth: 860, margin: "0 auto", padding: 16 }}>
      <h1 style={{ color: GOLD, fontSize: 22, margin: "10px 0" }}>👑 {t("الإدارة المالية الملكية الموحدة", "Unified Royal Finance Administration", "Administration financière royale unifiée", "Administración financiera real unificada", "Zentrale königliche Finanzverwaltung")}</h1>
      {ov && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {[[t("إجمالي الإيراد", "Total revenue", "Revenu total", "Ingresos totales", "Gesamtumsatz"), ov.revenue.total], [t("توزّع", "Distributed", "Distribué", "Distribuido", "Ausgeschüttet"), ov.distributed], [t("الربح الجاهز للتوزيع", "Profit ready to distribute", "Bénéfice prêt à distribuer", "Beneficio listo para distribuir", "Ausschüttungsbereiter Gewinn"), ov.pool]].map(([l, v]) => (
            <div key={String(l)} style={{ ...card, flex: 1, minWidth: 140, marginBottom: 0, textAlign: "center" }}>
              <div style={{ color: "#999", fontSize: 12 }}>{l}</div>
              <div style={{ color: GOLD, fontSize: 20, fontWeight: 800 }}>{fmt(v as number)} 🪙</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {([["old", t("القديم — المشاهدات والإعجابات", "Legacy — views and likes", "Ancien — vues et mentions J'aime", "Anterior — vistas y me gusta", "Bisheriges System — Aufrufe und Likes")], ["tabs", t("التابات", "Tabs", "Onglets", "Pestañas", "Registerkarten")], ["ppo", t("التوزيع PPO", "PPO Distribution", "Distribution PPO", "Distribución PPO", "PPO-Ausschüttung")]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSection(k)}
            style={{ flex: 1, padding: 10, borderRadius: 10, cursor: "pointer", fontWeight: 700,
              border: `1px solid ${section === k ? GOLD : "#333"}`, background: section === k ? GOLD_A(0.133) : "#111", color: section === k ? GOLD : "#aaa" }}>
            {l}
          </button>
        ))}
      </div>
      {msg && <p style={{ color: "#fbbf24", marginBottom: 10 }}>{msg}</p>}

      {/* ── [القديم] rates + divisions ── */}
      {section === "old" && ov && (
        <>
          <div style={card}>
            <h2 style={{ color: "#eee", fontSize: 16, marginBottom: 10 }}>{t("نسب الريع الحالية (ما زالت فعّالة)", "Current revenue rates (still active)", "Taux de revenu actuels (toujours actifs)", "Tasas de ingresos actuales (aún activas)", "Aktuelle Vergütungssätze (weiterhin aktiv)")}</h2>
            {rates.map(r => (
              <div key={r.content_type} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#ccc", fontSize: 14 }}>
                <span>{r.content_type === "gs_upload"
                  ? t("🎬 مشاهدة عمل GlobalStar", "🎬 GlobalStar work view", "🎬 Vue d'une œuvre GlobalStar", "🎬 Visualización de una obra de GlobalStar", "🎬 Aufruf eines GlobalStar-Werks")
                  : t("📢 إعجاب بمنشور Pulse", "📢 Pulse post like", "📢 Mention J'aime sur une publication Pulse", "📢 Me gusta en una publicación de Pulse", "📢 Like für einen Pulse-Beitrag")}</span>
                <span style={{ color: GOLD }}>{fmt(r.rate)} / {r.unit}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #222", marginTop: 8, paddingTop: 8, color: "#ccc", fontSize: 14 }}>
              <div>🎬 {t("إيراد الأعمال:", "Works revenue:", "Revenu des œuvres :", "Ingresos de las obras:", "Einnahmen aus Werken:")} <b style={{ color: GOLD }}>{fmt(ov.revenue.uploads)}</b></div>
              <div>📢 {t("إيراد المنشورات:", "Posts revenue:", "Revenu des publications :", "Ingresos de las publicaciones:", "Einnahmen aus Beiträgen:")} <b style={{ color: GOLD }}>{fmt(ov.revenue.posts)}</b></div>
            </div>
          </div>
          <div style={card}>
            <h2 style={{ color: "#eee", fontSize: 16, marginBottom: 10 }}>{t("تقسيم الأقسام (100%)", "Division split (100%)", "Répartition par divisions (100 %)", "Reparto por divisiones (100 %)", "Aufteilung nach Bereichen (100 %)")}</h2>
            {divisions.map(d => (
              <div key={d.division} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#ccc", fontSize: 14 }}>
                <span>{d.division}</span>
                <span><b style={{ color: GOLD }}>{d.sharePct}%</b> — {fmt(d.amount)} 🪙</span>
              </div>
            ))}
            <p style={{ color: "#777", fontSize: 12, marginTop: 8 }}>{fc("revenue_globalstar_help")}</p>
          </div>
        </>
      )}

      {/* ── [التابات] room + clip tabs ── */}
      {section === "tabs" && ov && (
        <>
          <div style={card}>
            <h2 style={{ color: "#eee", fontSize: 16, marginBottom: 4 }}>💬 {t("تبويبات المحادثات", "Conversation tabs", "Onglets des conversations", "Pestañas de conversaciones", "Unterhaltungen")}</h2>
            <p style={{ color: "#777", fontSize: 12, marginBottom: 10 }}>{t("لكل محادثة تبويب، وتُضاف إيراداتها إلى الإجمالي العام. سجّل الإيرادات يدوياً هنا.", "Each conversation has a tab, and its revenue contributes to the overall total. Record revenue manually here.", "Chaque conversation possède un onglet et ses revenus sont ajoutés au total général. Enregistrez les revenus manuellement ici.", "Cada conversación tiene una pestaña y sus ingresos se suman al total general. Registra los ingresos manualmente aquí.", "Jede Unterhaltung hat eine Registerkarte, deren Einnahmen in die Gesamtsumme einfließen. Erfasse die Einnahmen hier manuell.")}</p>
            {ov.roomTabs.map(tab => (
              <div key={tab.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #1e1e1e" }}>
                <span style={{ flex: 1, color: "#ccc", fontSize: 14 }}>{tab.name || `${t("محادثة", "Conversation", "Conversation", "Conversación", "Unterhaltung")} #${tab.id}`} <span style={{ color: "#666", fontSize: 11 }}>({tab.type})</span></span>
                <input style={{ ...inp, width: 110 }} inputMode="decimal" value={tabDraft[tab.id] ?? String(tab.revenue)}
                  onChange={e => setTabDraft(d => ({ ...d, [tab.id]: e.target.value }))} />
                <button style={btn} disabled={busy}
                  onClick={() => void call("PATCH", `/api/ppo/tabs/room/${tab.id}`, { revenue: parseFloat(tabDraft[tab.id] ?? String(tab.revenue)) })}>
                    {t("حفظ", "Save", "Enregistrer", "Guardar", "Speichern")}
                </button>
              </div>
            ))}
            {!ov.roomTabs.length && <p style={{ color: "#666" }}>{t("لا توجد محادثات.", "No conversations available.", "Aucune conversation disponible.", "No hay conversaciones disponibles.", "Keine Unterhaltungen vorhanden.")}</p>}
          </div>
          <div style={card}>
            <h2 style={{ color: "#eee", fontSize: 16, marginBottom: 10 }}>🎬 {t("تبويبات المقاطع والمنشورات (الأعلى إيراداً)", "Clip and post tabs (highest revenue)", "Onglets des clips et publications (revenus les plus élevés)", "Pestañas de clips y publicaciones (mayores ingresos)", "Clips und Beiträge (höchste Einnahmen)")}</h2>
            {ov.clipTabs.map(c => (
              <div key={`${c.kind}-${c.id}`} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#ccc", fontSize: 14 }}>
                <span>{c.kind === "gs_upload" ? "🎬" : "📢"} {c.title || `#${c.id}`}</span>
                <span style={{ color: GOLD }}>{fmt(c.earnings)} 🪙</span>
              </div>
            ))}
            <p style={{ color: "#777", fontSize: 12, marginTop: 8 }}>{t("تُحتسب هذه الإيرادات تلقائياً من المشاهدات والإعجابات — ويظل النظام السابق فعّالاً.", "This revenue is calculated automatically from views and likes — the legacy system remains active.", "Ces revenus sont calculés automatiquement à partir des vues et des mentions J'aime — l'ancien système reste actif.", "Estos ingresos se calculan automáticamente a partir de las vistas y los me gusta; el sistema anterior sigue activo.", "Diese Einnahmen werden automatisch anhand von Aufrufen und Likes berechnet — das bisherige System bleibt aktiv.")}</p>
          </div>
        </>
      )}

      {/* ── [التوزيع] PPO ── */}
      {section === "ppo" && ov && (
        <>
          <div style={card}>
            <h2 style={{ color: "#eee", fontSize: 16, marginBottom: 4 }}>{t("المستفيدون — قاعدة 100%", "Beneficiaries — 100% rule", "Bénéficiaires — règle des 100 %", "Beneficiarios — regla del 100 %", "Begünstigte — 100-%-Regel")}</h2>
            <p style={{ color: Math.abs(activeSum - 100) <= 0.01 ? "#4ade80" : "#f87171", fontSize: 13, marginBottom: 10 }}>
              {t("مجموع الحصص النشطة:", "Total active shares:", "Total des parts actives :", "Total de participaciones activas:", "Summe der aktiven Anteile:")} {activeSum.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% {Math.abs(activeSum - 100) <= 0.01 ? "✅" : t("— يجب أن يساوي 100% لتشغيل التوزيع", "— must equal 100% to run a distribution", "— doit être égal à 100 % pour lancer une distribution", "— debe ser igual al 100 % para ejecutar una distribución", "— muss 100 % ergeben, damit die Ausschüttung möglich ist")}
            </p>
            {ov.beneficiaries.map(b => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #1e1e1e", fontSize: 14 }}>
                <span style={{ flex: 1, color: "#ccc" }}>👤 {b.username} <span style={{ color: "#888" }}>({b.role})</span></span>
                <span style={{ color: GOLD, minWidth: 60 }}>{fmt(b.share_rate)}%</span>
                <span style={{ color: "#4ade80", minWidth: 90 }}>{fmt(b.total_earned)} 🪙</span>
                <button style={{ ...btn, background: b.status === "active" ? "#333" : GOLD, color: b.status === "active" ? "#ccc" : "#111" }} disabled={busy}
                  onClick={() => void call("PATCH", `/api/ppo/beneficiaries/${b.id}`, { status: b.status === "active" ? "paused" : "active" })}>
                    {b.status === "active" ? t("إيقاف", "Pause", "Suspendre", "Pausar", "Pausieren") : t("تفعيل", "Activate", "Activer", "Activar", "Aktivieren")}
                </button>
                <button style={{ ...btn, background: "#7f1d1d", color: "#fff" }} disabled={busy}
                    onClick={() => void call("DELETE", `/api/ppo/beneficiaries/${b.id}`)}>{t("حذف", "Delete", "Supprimer", "Eliminar", "Löschen")}</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <input style={{ ...inp, width: 100 }} placeholder={fc("revenue_citizen_id")} aria-label={fc("revenue_citizen_id")} inputMode="numeric" value={bUser} onChange={e => setBUser(e.target.value)} />
              <input style={{ ...inp, flex: 1, minWidth: 120 }} placeholder={fc("revenue_role_example")} aria-label={fc("revenue_role_example")} value={bRole} onChange={e => setBRole(e.target.value)} />
              <input style={{ ...inp, width: 90 }} placeholder="%" aria-label={fc("revenue_share_percent")} inputMode="decimal" value={bShare} onChange={e => setBShare(e.target.value)} />
              <button style={btn} disabled={busy}
                onClick={() => void call("POST", "/api/ppo/beneficiaries", { userId: parseInt(bUser), role: bRole, shareRate: parseFloat(bShare) })
                  .then(r => { if (r) { setBUser(""); setBRole(""); setBShare(""); } })}>
                  {t("إضافة", "Add", "Ajouter", "Añadir", "Hinzufügen")}
              </button>
            </div>
          </div>
          <div style={card}>
            <h2 style={{ color: "#eee", fontSize: 16, marginBottom: 10 }}>{t("تشغيل توزيع جديد", "Run a new distribution", "Lancer une nouvelle distribution", "Ejecutar una nueva distribución", "Neue Ausschüttung durchführen")}</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inp, flex: 1 }} placeholder={fc("revenue_period_example")} aria-label={fc("revenue_period_example")} value={period} onChange={e => setPeriod(e.target.value)} />
              <button style={btn} disabled={busy || !period.trim()}
                onClick={() => void call("POST", "/api/ppo/distribute", { period: period.trim() }).then(r => { if (r) setPeriod(""); })}>
                  {t("وزّع الربح", "Distribute profit", "Distribuer le bénéfice", "Distribuir el beneficio", "Gewinn ausschütten")} ({fmt(ov.pool)} 🪙)
              </button>
            </div>
          </div>
          <div style={card}>
              <h2 style={{ color: "#eee", fontSize: 16, marginBottom: 4 }}>{t("سجل التوزيعات", "Distribution history", "Historique des distributions", "Historial de distribuciones", "Ausschüttungsverlauf")}</h2>
             <p style={{ color: "#777", fontSize: 12, marginBottom: 10 }}>
                {t("يُسجّل كل توزيع جديد هنا، ويُودع نصيب كل مواطن مباشرة في محفظته.", "Each new distribution is recorded here, and every citizen's share is credited directly to their wallet.", "Chaque nouvelle distribution est enregistrée ici et la part de chaque citoyen est créditée directement sur son portefeuille.", "Cada nueva distribución se registra aquí y la parte de cada ciudadano se abona directamente en su cartera.", "Jede neue Ausschüttung wird hier erfasst und der Anteil jedes Bürgers direkt seiner Wallet gutgeschrieben.")}
             </p>
            {ov.distributions.map(d => (
              <div key={d.id} style={{ borderBottom: "1px solid #1e1e1e", padding: "8px 0", fontSize: 13 }}>
                <div data-testid={`text-ppo-distribution-${d.id}`} style={{ color: GOLD, fontWeight: 700 }}>#{d.id} — {d.period} — {fmt(d.total_profit)} 🪙 <span style={{ color: "#666", fontWeight: 400 }}>{new Date(d.created_at).toLocaleString(locale)}</span></div>
                {d.items.map((i, idx) => (
                   <div key={idx} data-testid={`status-ppo-credit-${d.id}-${i.userId}`} style={{ color: "#aaa", paddingRight: 12 }}>
                     👤 #{i.userId} ({i.role}) — {fmt(i.shareRate)}% = <b style={{ color: "#4ade80" }}>{fmt(i.amount)} 🪙</b>
                     <span style={{ color: i.credited ? "#4ade80" : "#fbbf24", marginRight: 8 }}>
                       {i.credited
                          ? `✅ ${t("أُودع في المحفظة:", "Credited to wallet:", "Crédité sur le portefeuille :", "Abonado en la cartera:", "Der Wallet gutgeschrieben:")} ${fmt(i.walletAmount ?? Math.round(Number(i.amount)))} 🪙`
                          : t("⏳ لم يُودع في المحفظة بعد", "⏳ Not yet credited to the wallet", "⏳ Pas encore crédité sur le portefeuille", "⏳ Aún no se ha abonado en la cartera", "⏳ Noch nicht der Wallet gutgeschrieben")}
                     </span>
                   </div>
                ))}
              </div>
            ))}
            {!ov.distributions.length && <p style={{ color: "#666" }}>{t("لم يُنفّذ أي توزيع بعد.", "No distributions have been run yet.", "Aucune distribution n'a encore été effectuée.", "Aún no se ha ejecutado ninguna distribución.", "Es wurde noch keine Ausschüttung durchgeführt.")}</p>}
          </div>
        </>
      )}
    </div>
  );
}
