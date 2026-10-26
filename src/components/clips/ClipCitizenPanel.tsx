/** Explicit-action island. Never import this module from the clip bootstrap eagerly. */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { tokens } from "@workspace/gdna-ds";
import { openUnifiedMessenger } from "../messenger/UnifiedMessenger";
import { CitizenProfileDrawer } from "../citizen/CitizenProfileDrawer";
import { CitizenCardVisual } from "../citizen/CitizenProfileCard";
import type { CitizenProfile } from "../../hooks/use-citizen";

type Options = { mode: "profile" | "message" | "assistant"; clipId: number; peerId: number; peerUsername: string };
const BASE = import.meta.env.BASE_URL;
// Dark-only surface (arena theme), never the citizen-light skin or yellow fills.
const dark = tokens.color.dark;
const spacing = `calc(${tokens.spacing} * 3)`;

function CitizenPanel({ options }: { options: Options }) {
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  useEffect(() => {
    if (options.mode === "assistant") return;
    const controller = new AbortController();
    void fetch(`${BASE}api/citizen-profiles/${encodeURIComponent(options.peerUsername)}`, {
      credentials: "include", signal: controller.signal,
    }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Citizen profile unavailable");
      setProfile(data);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Citizen profile unavailable"); });
    return () => controller.abort();
  }, [options]);

  async function ask() {
    setBusy(true); setError(""); setAnswer("");
    try {
      const response = await fetch(`${BASE}api/ai/citizen-assistant`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "helixly", clipId: options.clipId, prompt: prompt.trim(), consent: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Assistant unavailable");
      if (typeof data.text !== "string") throw new Error("Assistant returned no text");
      setAnswer(data.text);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Assistant unavailable"); }
    finally { setBusy(false); }
  }

  return <Card style={{ background: dark.card, color: dark.cardForeground, borderColor: dark.border }}>
    <CardContent style={{ padding: spacing, display: "grid", gap: spacing }}>
      {options.mode === "assistant" ? <>
        <h2 id="clip-citizen-title">Ask AI about this clip</h2>
        <p>Metadata-only assistance: the assistant can use the public title and description, not watch or listen to this video. It cannot verify what happened in it.</p>
        <p>Enable AI consent in your citizen profile first. Only this prompt and public clip context are submitted.</p>
        <textarea aria-label="Question about this clip" data-testid="clip-ai-prompt" value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={2000} />
        <label><input type="checkbox" data-testid="clip-ai-consent" checked={consent} onChange={event => setConsent(event.target.checked)} /> I consent to sending this prompt and public clip metadata to the assistant.</label>
        <Button data-testid="clip-ai-submit" disabled={!consent || !prompt.trim() || busy} onClick={() => void ask()}>{busy ? "Asking…" : "Ask AI"}</Button>
        {answer && <p role="status" style={{ whiteSpace: "pre-wrap" }}>{answer}</p>}
        <a
          data-testid="clip-gdna-link"
          href={`${BASE}chat?section=helixly&review=1&draft=${encodeURIComponent(`Help me with clip #${options.clipId}. Review this text before sending.`)}`}
          style={{ color: dark.primary, textDecoration: "underline" }}
        >
          Coordinate with GDNA (opens the control surface, review before sending)
        </a>
      </> : <>
        <h2 id="clip-citizen-title" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Citizen</h2>
        {!profile && !error && <p role="status">Loading public citizen card…</p>}
        {/* The reusable mini CitizenProfileCard (avatar/name/city). Clicking it
            opens the SAME shared CitizenProfileDrawer. This island renders
            outside the app providers, so it uses the standalone drawer + the
            hook-free CitizenCardVisual — a minimal isolated mount, no eager
            React bridge from the clip bootstrap. */}
        {profile && (
          <div data-testid="clip-public-citizen">
            {drawerOpen ? (
              // Rendered inline (fullscreen) so it stays inside the dialog's top
              // layer — a portaled Sheet would fall behind showModal().
              <CitizenProfileDrawer
                citizen={profile}
                isOpen
                fullscreen
                standalone
                onClose={() => setDrawerOpen(false)}
                onMessage={(citizen) => { void openUnifiedMessenger({ peerId: citizen.userId, peerUsername: citizen.username, context: `clip:${options.clipId}` }); }}
              />
            ) : (
              <CitizenCardVisual citizen={profile} onOpen={() => setDrawerOpen(true)} />
            )}
          </div>
        )}
      </>}
      {error && <p role="alert">{error}</p>}
    </CardContent>
  </Card>;
}

export async function openClipCitizenPanel(options: Options): Promise<void> {
  const previous = document.querySelector<HTMLDialogElement>("dialog[data-clip-citizen]");
  previous?.close();
  const dialog = document.createElement("dialog");
  dialog.dataset.clipCitizen = "";
  dialog.setAttribute("aria-labelledby", "clip-citizen-title");
  Object.assign(dialog.style, { background: dark.card, color: dark.cardForeground, border: `1px solid ${dark.border}`, borderRadius: tokens.radius, padding: spacing, width: "min(92vw, 32rem)", maxHeight: "80vh", overflow: "auto" });
  const close = document.createElement("button");
  close.textContent = "Close";
  close.type = "button";
  close.addEventListener("click", () => dialog.close());
  const host = document.createElement("div");
  dialog.append(close, host);
  document.body.append(dialog);
  const root = createRoot(host);
  const previousFocus = document.activeElement as HTMLElement | null;
  dialog.addEventListener("close", () => { root.unmount(); dialog.remove(); previousFocus?.focus(); }, { once: true });
  // Minimal isolated mount: the standalone drawer needs no AuthProvider or
  // React Query, so the clip bootstrap never eagerly bridges the app runtime.
  root.render(<CitizenPanel options={options} />);
  dialog.showModal();
}