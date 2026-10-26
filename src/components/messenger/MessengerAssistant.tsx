import { useEffect, useRef, useState } from "react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { Switch } from "@workspace/gdna-ds/components/ui/switch";
import { api } from "../social/social-i18n";
import type { DmMessage } from "../social/social-types";

export const NO_REPLY_DELAY_MS = 5 * 60 * 1000;
const AUTO_TRANSLATION_LIMIT = 10;
const TRANSLATION_CHAR_LIMIT = 4000;

function IncomingTranslations({ messages, userId, language }: {
  messages: DmMessage[]; userId: number; language: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const completed = useRef(new Map<string, string>());
  const candidates = messages.filter(message => message.userId !== undefined && message.userId !== userId &&
    message.type === "text" && !message.decryptionFailed && !message.secureAttachment &&
    !message.fileUrl && !message.audioUrl && !message.videoUrl && Boolean(message.content?.trim()) &&
    !message.content!.startsWith("e2e:") && !message.content!.startsWith("🔐"))
    .slice(-AUTO_TRANSLATION_LIMIT);
  // Stable content snapshot: composer rerenders must not restart an in-flight request.
  const snapshot = JSON.stringify(candidates.map(({ id, content }) => ({ id, content })));
  const queueRef = useRef<{ id: number; content: string }[]>([]);
  queueRef.current = JSON.parse(snapshot);
  const pumpRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!enabled) { setBusy(false); return; }
    const controller = new AbortController();
    let running = false;
    const pump = async () => {
      if (running || controller.signal.aborted) return;
      running = true;
      setBusy(true);
      try {
        while (true) {
          if (controller.signal.aborted) return;
          const message = queueRef.current.find(item => item.content.length <= TRANSLATION_CHAR_LIMIT &&
            !completed.current.has(`${language}:${item.id}`));
          if (!message) break;
          const key = `${language}:${message.id}`;
          const response = await fetch(api("/api/ai/citizen-assistant"), {
            method: "POST", credentials: "include", signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section: "translate", text: message.content, targetLanguage: language, consent: true }),
          });
          if (controller.signal.aborted) return;
          if (response.status === 403) throw new Error("Automatic translation stopped. Enable saved AI permission in your own profile, then consent again here.");
          if (response.status === 503) throw new Error("Automatic translation stopped: AI provider unavailable. Try enabling it again later.");
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Automatic translation failed. Enable it again to retry.");
          if (typeof data.text !== "string") throw new Error("Invalid AI translation response.");
          if (controller.signal.aborted) return;
          completed.current.set(key, data.text);
          // Bound local retained results, including language changes and long sessions.
          if (completed.current.size > 180) completed.current.delete(completed.current.keys().next().value!);
          setTranslations(Object.fromEntries(completed.current));
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Automatic translation failed");
          setEnabled(false);
        }
      } finally { running = false; if (!controller.signal.aborted) setBusy(false); }
    };
    pumpRef.current = () => { void pump(); };
    void pump();
    return () => { controller.abort(); pumpRef.current = null; };
  }, [enabled, language]);
  useEffect(() => { pumpRef.current?.(); }, [snapshot]);
  return <section className="space-y-2 rounded-md border border-border p-2" aria-label="Incoming message translations">
    <p className="text-muted-foreground">Optional automatic translation shares the latest {AUTO_TRANSLATION_LIMIT} incoming text messages loaded in this active conversation,
      and newly arriving text, with AI after this device decrypts them. Private plaintext leaves end-to-end encryption.
      Enable only if you agree to share this conversation text. Off by default; stops when you leave this room or close these tools.</p>
    <label className="flex items-center gap-2">
      <Switch checked={enabled} aria-label="I consent to automatically translate incoming text"
        onCheckedChange={value => { setError(""); setEnabled(value); }} />
      I consent to automatically translate incoming text into {language.toUpperCase()}
    </label>
    {busy && <p role="status">Translating incoming text…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {enabled && candidates.some(message => message.content!.length > TRANSLATION_CHAR_LIMIT) &&
      <p className="text-muted-foreground">Messages longer than {TRANSLATION_CHAR_LIMIT} characters are skipped, not truncated. Select a shorter passage in the manual tool.</p>}
    <div className="max-h-48 space-y-2 overflow-y-auto">
      {candidates.map(message => translations[`${language}:${message.id}`] && <article key={message.id} className="rounded-md bg-muted p-2">
        <strong>{message.username} · Message #{message.id} · AI translation ({language.toUpperCase()})</strong>
        <p className="whitespace-pre-wrap text-muted-foreground" dir="auto">Original: {message.content}</p>
        <p className="whitespace-pre-wrap" dir="auto">{translations[`${language}:${message.id}`]}</p>
      </article>)}
    </div>
  </section>;
}

/** Only a genuinely unanswered outgoing message can trigger an offer. No AI request occurs here. */
export function pendingReplyAt(messages: DmMessage[], userId: number): number | null {
  const last = messages.at(-1);
  if (!last || last.userId !== userId) return null;
  // Start from the first outgoing message since the most recent peer response.
  let first = last;
  for (let i = messages.length - 2; i >= 0 && messages[i].userId === userId; i--) first = messages[i];
  const time = Date.parse(first.createdAt);
  return Number.isFinite(time) ? time + NO_REPLY_DELAY_MS : null;
}

export function MessengerAssistant({ messages, userId, ownUsername, onDraft }: {
  messages: DmMessage[]; userId: number; ownUsername?: string; onDraft: (text: string) => void;
}) {
  const due = pendingReplyAt(messages, userId);
  const [now, setNow] = useState(Date.now);
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [language, setLanguage] = useState("ar");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [draft, setDraft] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setNow(Date.now());
    if (due === null) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, due - Date.now()));
    return () => clearTimeout(timer);
  }, [due]);
  async function request(section: "translate" | "auto-reply") {
    if (!consent || !text.trim() || busy) return;
    setBusy(true); setError(""); setResult("");
    try {
      const response = await fetch(api("/api/ai/citizen-assistant"), {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(section === "translate"
          ? { section, text: text.trim(), targetLanguage: language, consent: true }
          : { section, prompt: text.trim(), consent: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "AI is unavailable");
      if (typeof data.text !== "string") throw new Error("Invalid AI response");
      setResult(data.text); setDraft(section === "auto-reply");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "AI is unavailable"); }
    finally { setBusy(false); }
  }
  return <div className="mb-2 rounded-md border border-border bg-card p-2 text-xs text-foreground">
    <div className="flex items-center justify-between gap-2">
      <span>GDNA AI · Translation / smart composer</span>
      <Switch checked={open} onCheckedChange={value => { setOpen(value); if (!value) setConsent(false); }}
        aria-label="Enable translation and AI composer" />
    </div>
    {due !== null && now >= due && !open && <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
      No reply for 5 minutes — ask GDNA AI to help draft?
    </Button>}
    {open && <div className="mt-2 space-y-2">
      <p className="text-muted-foreground">AI is not this person. Manual tools send only text you enter below.
        Automatic incoming translation requires separate explicit consent below. Shared text leaves end-to-end encryption.
        Enable AI consent in your profile first.</p>
      {ownUsername && <Button size="sm" variant="link" asChild>
        <a href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/u/${encodeURIComponent(ownUsername)}`}>
          Open my profile to enable AI permission
        </a>
      </Button>}
      <Button size="sm" variant="link" asChild data-testid="messenger-gdna-link">
        <a href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/chat?section=hisn&review=1`}>
          Open GDNA control surface (never receives your encrypted messages)
        </a>
      </Button>
      <Input value={text} maxLength={4000} onChange={event => setText(event.target.value)}
        placeholder="Paste text to translate, or describe your own follow-up…" aria-label="Text explicitly shared with AI" />
      <div className="flex flex-wrap items-center gap-2">
        <select value={language} onChange={event => setLanguage(event.target.value)} aria-label="Translation language"
          className="rounded-md border border-border bg-background p-2 text-foreground">
          <option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option>
        </select>
        <Switch checked={consent} onCheckedChange={setConsent} aria-label="Consent to send this text to AI" />
        <span>I consent to share this text with AI</span>
        <Button size="sm" variant="outline" disabled={!consent || !text.trim() || busy} onClick={() => void request("translate")}>Translate</Button>
        <Button size="sm" variant="outline" disabled={!consent || !text.trim() || busy} onClick={() => void request("auto-reply")}>Draft my follow-up</Button>
      </div>
      <IncomingTranslations messages={messages} userId={userId} language={language} />
      {busy && <p role="status">Asking GDNA AI…</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {result && <div className="whitespace-pre-wrap rounded-md bg-muted p-2" dir="auto">
        <strong>GDNA AI {draft ? "draft — not a reply from your contact" : "translation"}</strong>
        <p>{result}</p>
        {draft && <Button size="sm" variant="secondary" onClick={() => onDraft(result)}>Use in my composer (review before sending)</Button>}
      </div>}
    </div>}
  </div>;
}