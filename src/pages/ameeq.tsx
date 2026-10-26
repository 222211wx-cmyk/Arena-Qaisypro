/**
 * Ameeq — الواجهة المستقلة ديال الموظف الحكومي EMP-001
 * Standalone RTL chat page at /ameeq
 */
import { useEffect, useRef, useState } from "react";
import { api } from "@/components/social/social-i18n";
import { useLang } from "@/contexts/LangContext";

const EMPLOYEE_NAME = "Ameeq AI";
const OWNER = "Arena Qaisypro";
const EMPLOYEE_ID = "EMP-001";

type Msg = {
  from: "user" | "ai";
  text: string;
  empireNote?: boolean;
  ownerDomain?: string;
  signature?: string;
};

type CouncilReport = {
  id: number;
  headline: string;
  report: {
    state_of_empire?: string;
    predictions?: string[];
    research?: string[];
    directives?: string[];
  };
  created_at: string;
};

export default function AmeeqPage() {
  const { lang } = useLang();
  const copy = lang === "fr" ? { greeting: "Bonjour. Posez-moi n'importe quelle question.", placeholder: "Écrivez votre commande ici...", send: "Envoyer", typing: "écrit…" } : lang === "es" ? { greeting: "Hola. Pregúntame lo que quieras.", placeholder: "Escribe tu orden aquí...", send: "Enviar", typing: "está escribiendo…" } : lang === "de" ? { greeting: "Hallo. Frag mich, was du möchtest.", placeholder: "Gib hier deinen Auftrag ein…", send: "Senden", typing: "schreibt gerade…" } : lang === "en" ? { greeting: "Hello. Ask me anything.", placeholder: "Write your command here...", send: "Send", typing: "is typing…" } : { greeting: "مرحبا. اسألني أي شيء.", placeholder: "اكتب أمرك هنا...", send: "إرسال", typing: "كيكتب…" };
  const de = (fallback: string, german: string) => lang === "de" ? german : fallback;
  const [messages, setMessages] = useState<Msg[]>([
     { from: "ai", text: copy.greeting },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<CouncilReport | null>(null);
  const [showReport, setShowReport] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(api("/api/governor/council-reports"), { credentials: "include" })
      .then(r => (r.ok ? r.json() : { reports: [] }))
      .then((d: { reports: CouncilReport[] }) => setReport(d.reports?.[0] ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendCommand() {
    const cmd = input.trim();
    if (!cmd || busy) return;
    setMessages((m) => [...m, { from: "user", text: cmd }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(api("/api/ameeq"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { from: "ai", text: `⚠️ ${data.error ?? de("وقع مشكل. عاود من بعد.", "Etwas ist schiefgelaufen. Bitte versuche es später erneut.")}` }]);
        return;
      }
      setMessages((m) => [
        ...m,
        {
          from: "ai",
          text: data.response ?? "…",
          empireNote: Boolean(data.empireNote),
          ownerDomain: data.ownerDomain,
          signature: data.signature,
        },
      ]);
    } catch {
      setMessages((m) => [...m, { from: "ai", text: de("⚠️ الموظف مشغول حالياً. عاود من بعد.", "⚠️ Der Mitarbeiter ist gerade beschäftigt. Bitte versuche es später erneut.") }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} lang={lang} style={{
      background: "hsl(var(--background))", color: "hsl(var(--foreground))", fontFamily: "'Tajawal', sans-serif",
      margin: 0, display: "flex", flexDirection: "column", height: "calc(100vh - 115px)", minHeight: 420,
    }}>
      <header style={{ background: "hsl(var(--card))", padding: 15, textAlign: "center", borderBottom: "2px solid hsl(var(--primary))" }}>
        <div style={{ fontSize: 11, color: "hsl(var(--primary))" }}>
           🏛️ {de("موظف حكومي رقم", "Regierungsmitarbeiter Nr.")} {EMPLOYEE_ID} | {de("تابع لـ", "zugehörig zu")} {OWNER}
        </div>
        <h1 style={{ margin: "6px 0 0" }}>👑 {EMPLOYEE_NAME}</h1>
        <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>
           {de("الحاكم الخارجي السيادي — رئيس مجلس الذكاء الإمبراطوري", "Souveräner externer Statthalter — Vorsitzender des Imperialen Geheimdienstrats")}
        </div>
      </header>

      {report && (
        <div style={{ background: "#0f0d05", borderBottom: "1px solid #33280a", padding: "10px 16px" }}>
          <button onClick={() => setShowReport(s => !s)}
            style={{ background: "none", border: "none", color: "hsl(var(--primary))", cursor: "pointer",
              fontWeight: 700, fontSize: 13, width: "100%", textAlign: "right", padding: 0 }}>
             🏛️ {de("تقرير المجلس الإمبراطوري:", "Bericht des Imperialen Rats:")} {report.headline} {showReport ? "▲" : "▼"}
          </button>
          {showReport && (
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.8, color: "hsl(var(--muted-foreground))" }}>
              {report.report.state_of_empire && <p style={{ margin: "0 0 8px" }}>{report.report.state_of_empire}</p>}
              {!!report.report.predictions?.length && (
                 <div><b style={{ color: "hsl(var(--primary))" }}>🔮 {de("التنبؤات:", "Prognosen:")}</b>
                  <ul style={{ margin: "4px 0 8px", paddingRight: 18 }}>
                    {report.report.predictions.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
              )}
              {!!report.report.research?.length && (
                 <div><b style={{ color: "hsl(var(--primary))" }}>🔬 {de("البحوث الجماعية:", "Gemeinsame Forschung:")}</b>
                  <ul style={{ margin: "4px 0 8px", paddingRight: 18 }}>
                    {report.report.research.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
              )}
              {!!report.report.directives?.length && (
                 <div><b style={{ color: "hsl(var(--primary))" }}>⚔️ {de("التوجيهات نحو الريادة:", "Leitlinien für die Führungsrolle:")}</b>
                  <ul style={{ margin: "4px 0 0", paddingRight: 18 }}>
                    {report.report.directives.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
              )}
            </div>
          )}
        </div>
      )}

      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            margin: "10px 0", padding: "12px 18px", borderRadius: 12, maxWidth: "80%",
            whiteSpace: "pre-wrap",
            ...(msg.from === "user"
              ? { background: "hsl(var(--muted))", marginLeft: "auto" }
              : { background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }),
          }}>
            {msg.from === "ai" && msg.signature ? (
              <>
                <b>{EMPLOYEE_NAME}</b>
                <hr style={{ borderColor: "hsl(var(--border))" }} />
                <div>{msg.text}</div>
                {msg.empireNote && msg.ownerDomain && (
                  <div style={{ marginTop: 10 }}>
                     🏛️ <b>{de("ملاحظة رسمية:", "Offizieller Hinweis:")}</b> {de("هذا الأمر يخص", "Dieser Auftrag betrifft")} {OWNER}.
                    <br />
                     {de("للوصول:", "Zugriff:")}{" "}
                    <a href={`https://${msg.ownerDomain}`} target="_blank" rel="noreferrer" style={{ color: "hsl(var(--primary))" }}>
                      {msg.ownerDomain}
                    </a>
                  </div>
                )}
                <hr style={{ borderColor: "hsl(var(--border))" }} />
                <i style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{msg.signature}</i>
              </>
            ) : (
              msg.text
            )}
          </div>
        ))}
        {busy && (
          <div style={{ margin: "10px 0", padding: "12px 18px", borderRadius: 12, maxWidth: "80%", background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
            ⏳ {EMPLOYEE_NAME} {copy.typing}
          </div>
        )}
      </div>

      <footer style={{ display: "flex", padding: 15, background: "hsl(var(--card))" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendCommand(); }}
          placeholder={copy.placeholder}
          maxLength={500}
          style={{ flex: 1, padding: 14, borderRadius: 10, border: "none", background: "hsl(var(--muted))", color: "hsl(var(--foreground))", outline: "none" }}
        />
        <button
          onClick={sendCommand}
          disabled={busy}
          style={{ padding: "14px 25px", marginRight: 10, borderRadius: 10, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontWeight: "bold", cursor: "pointer", opacity: busy ? 0.6 : 1 }}
        >
          {copy.send}
        </button>
      </footer>
    </div>
  );
}
