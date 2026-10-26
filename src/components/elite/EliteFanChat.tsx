import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, Sparkles, Info } from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { Card } from "@workspace/gdna-ds/components/ui/card";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import type { EliteProfile } from "@/lib/elite-profiles";

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * GDNA AI Fan Chat.
 *
 * Honesty guarantees baked in:
 *  • Clearly framed as an INDEPENDENT GDNA fan guide — NOT the real person and
 *    NOT affiliated with, or endorsed by, them.
 *  • Reuses the existing /api/chat contract ({ message, history } -> { reply }).
 *    We prepend an explicit fan-guide framing to the user's message so the
 *    assistant answers as a fan guide, never impersonating the celebrity.
 *  • Auth is optional on /api/chat; when the provider is unavailable the API
 *    returns a truthful "unavailable" reply which we surface as-is.
 *  • Conversation history is kept only in this component's memory for the
 *    current visit (no invented persistence).
 */
export function EliteFanChat({ profile }: { profile: EliteProfile }) {
  const intro = `You're chatting with the GDNA AI Fan Guide for ${profile.name}. I'm an independent fan assistant — not ${profile.name} and not affiliated with them. Ask me about their public career, and I'll keep it factual.`;

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: intro },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  // Skip the very first render (the intro message) so we never scroll the page
  // or the chat on initial mount — only after the user starts a conversation.
  const hasInteracted = useRef(false);

  useEffect(() => {
    if (!hasInteracted.current) return;
    // Scroll ONLY the chat container to its bottom — never scrollIntoView on the
    // document, which would auto-scroll the page past the hero on first render.
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const framing = (text: string) =>
    `You are the GDNA AI Fan Guide, an independent fan assistant for the public figure ${profile.name} (${profile.role}, ${profile.nationality}). ` +
    `You are NOT ${profile.name} and are not affiliated with them. Never impersonate them or speak in first person as them. ` +
    `Answer factually about their publicly known career; if unsure, say so. Do not invent statistics, follower counts, or awards. ` +
    `Fan question: ${text}`;

  const send = async (text?: string) => {
    const raw = (text ?? input).trim();
    if (!raw || loading) return;
    hasInteracted.current = true;

    const history = messages
      .slice(1)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: raw }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: framing(raw), history }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          throw new Error("Please sign in to use the Fan Chat.");
        }
        if (res.status === 429) {
          throw new Error("Fan Chat is busy right now — please try again shortly.");
        }
        throw new Error(errData.error ?? "Fan Chat is unavailable right now.");
      }

      const data = (await res.json()) as { reply?: string };
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply ?? "The Fan Guide is unavailable right now.",
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const suggestions = [
    `What is ${profile.name} known for?`,
    `Tell me about their career highlights`,
    `What's their ${profile.category.toLowerCase()} background?`,
  ];

  return (
    <div data-testid="elite-fan-chat">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-primary/40 bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-wide text-foreground">
            GDNA AI Fan Chat
          </h3>
        </div>
        <Badge variant="outline" className="gap-1 text-xs">
          <Info className="h-3 w-3" aria-hidden="true" /> Fan guide — not{" "}
          {profile.name.split(" ")[0]} & not affiliated
        </Badge>
      </div>

      <Card
        ref={scrollRef}
        className="flex max-h-[46vh] min-h-[280px] flex-col gap-3 overflow-y-auto border-primary/20 bg-card/40 p-4"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`fanchat-message-${i}`}
            >
              {msg.role === "assistant" && (
                <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/15">
                  <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-ee-sm bg-primary font-medium text-primary-foreground"
                    : "rounded-es-sm border border-primary/20 bg-card text-foreground"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary/50 bg-primary/25">
                  <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                </div>
              )}
            </motion.div>
          ))}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start gap-2"
            >
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/15">
                <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-es-sm border border-primary/20 bg-card px-3.5 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                <span className="text-sm text-muted-foreground">Fan Guide is typing…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {error && (
          <div className="text-center text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
      </Card>

      {messages.length <= 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void send(q)}
              data-testid={`button-fanchat-suggest`}
              className="rounded-full border border-primary/30 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask the Fan Guide about ${profile.name.split(" ")[0]}…`}
          className="h-11 flex-1 border-primary/30"
          disabled={loading}
          data-testid="input-fanchat"
          aria-label={`Ask the GDNA Fan Guide about ${profile.name}`}
        />
        <Button
          onClick={() => void send()}
          disabled={!input.trim() || loading}
          className="h-11 px-4 font-bold"
          data-testid="button-fanchat-send"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-5 w-5" aria-hidden="true" />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </div>
  );
}
