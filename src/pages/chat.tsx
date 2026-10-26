import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Crown,
  AlertTriangle,
  Cpu,
  ScrollText,
  Database,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Textarea } from "@workspace/gdna-ds/components/ui/textarea";
import { Card } from "@workspace/gdna-ds/components/ui/card";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Checkbox } from "@workspace/gdna-ds/components/ui/checkbox";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/gdna-ds/components/ui/sheet";
import { useLang } from "@/contexts/LangContext";
import { gdnaCopy, GDNA_PERSONA } from "@/lib/gdna-copy";
import { GdnaError, type GdnaAskResult, type GdnaSection } from "@/lib/gdna-core";
import { useGdnaStatus, useGdnaAsk } from "@/hooks/use-gdna";
import { parseGdnaChatIntent } from "@/lib/gdna-assist";
import GdnaSectionTabs from "@/components/gdna/GdnaSectionTabs";
import GdnaUsageMeter from "@/components/gdna/GdnaUsageMeter";
import GdnaMemoryPanel from "@/components/gdna/GdnaMemoryPanel";
import GdnaEvolutionPanel from "@/components/gdna/GdnaEvolutionPanel";
import GdnaReviewDialog from "@/components/gdna/GdnaReviewDialog";
import { GdnaCitations, GdnaSuggestions } from "@/components/gdna/GdnaCitations";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: GdnaAskResult;
}

let idCounter = 0;
const nextId = () => `m${++idCounter}`;

export default function ChatPage() {
  const { lang } = useLang();
  const c = gdnaCopy(lang);
  const search = useSearch();

  const status = useGdnaStatus();
  const ask = useGdnaAsk();

  const [section, setSection] = useState<GdnaSection>("hisn");
  const [input, setInput] = useState("");
  const [remember, setRemember] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: "assistant", content: GDNA_PERSONA[lang] ?? GDNA_PERSONA.en },
  ]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const intentHandled = useRef<string | null>(null);

  // Reset persona line on language change (only the seed message).
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        return [{ id: prev[0].id, role: "assistant", content: GDNA_PERSONA[lang] ?? GDNA_PERSONA.en }];
      }
      return prev;
    });
  }, [lang]);

  // Handle assistance-entrypoint intent: set section + open review dialog (never auto-send).
  useEffect(() => {
    if (intentHandled.current === search) return;
    intentHandled.current = search;
    const intent = parseGdnaChatIntent(search);
    if (intent.section) setSection(intent.section);
    if (intent.draft && intent.review) {
      setReviewDraft(intent.draft);
      setReviewOpen(true);
    } else if (intent.draft) {
      setInput(intent.draft);
    }
  }, [search]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, ask.isPending]);

  const submit = useCallback(
    (text: string) => {
      const msg = text.trim();
      if (!msg || ask.isPending) return;

      const userMsg: ChatMessage = { id: nextId(), role: "user", content: msg };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      ask.mutate(
        { query: msg, section, remember },
        {
          onSuccess: (data) => {
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", content: data.reply, result: data },
            ]);
            setRemember(false);
          },
        },
      );
    },
    [ask, section, remember],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  };

  const errorText = useMemo(() => {
    if (!ask.isError) return null;
    const err = ask.error;
    if (err instanceof GdnaError) {
      if (err.status === 429) return c.quotaReached;
      if (err.status === 503) return c.unavailable;
      return err.message || c.errorGeneric;
    }
    return c.errorGeneric;
  }, [ask.isError, ask.error, c]);

  const usage = status.data?.usage;
  const modeAvailable = status.data?.available ?? true;

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang === "de" ? "de-DE" : lang}
      className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col gap-4 p-4 md:p-6"
    >
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/15 text-primary neon-glow">
            <Crown className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black uppercase tracking-wider md:text-3xl">{c.title}</h1>
              <StatusBadge available={modeAvailable} mode={status.data?.mode} />
            </div>
            <p className="text-sm text-muted-foreground">{c.subtitle}</p>
          </div>
        </div>

        {/* Side panels + usage */}
        <div className="flex flex-wrap items-center gap-2">
          {usage && (
            <div className="min-w-40 rounded-md border border-border bg-card px-3 py-2">
              <GdnaUsageMeter usage={usage} />
            </div>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-open-memory">
                <Database className="size-4" /> {c.memory}
              </Button>
            </SheetTrigger>
            <SheetContent side={lang === "ar" ? "left" : "right"} className="w-full p-0 sm:max-w-md">
              <SheetHeader className="sr-only">
                <SheetTitle>{c.memory}</SheetTitle>
              </SheetHeader>
              <GdnaMemoryPanel />
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-open-evolution">
                <ScrollText className="size-4" /> {c.evolution}
              </Button>
            </SheetTrigger>
            <SheetContent side={lang === "ar" ? "left" : "right"} className="w-full p-0 sm:max-w-md">
              <SheetHeader className="sr-only">
                <SheetTitle>{c.evolution}</SheetTitle>
              </SheetHeader>
              <GdnaEvolutionPanel />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Section selector */}
      <GdnaSectionTabs value={section} onChange={setSection} />

      {/* Provider unavailable banner */}
      {status.isError && (
        <Card className="flex items-center justify-between gap-3 border-destructive/40 bg-destructive/10 p-3">
          <span className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" /> {c.unavailable}
          </span>
          <Button variant="outline" size="sm" onClick={() => void status.refetch()}>
            {c.retry}
          </Button>
        </Card>
      )}

      {/* Conversation */}
      <Card className="flex flex-1 flex-col overflow-hidden border-primary/20 bg-card/40">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`message-${m.role}`}
              >
                <div className={`max-w-[85%] ${m.role === "user" ? "" : "w-full"}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary font-medium text-primary-foreground"
                        : "border border-primary/20 bg-card text-foreground"
                    }`}
                    dir="auto"
                  >
                    {m.role === "assistant" && m.result && (
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="secondary" className="uppercase">{m.result.agent}</Badge>
                        <Badge variant={m.result.mode === "llm" ? "default" : "outline"}>
                          {m.result.mode === "llm" ? c.modeLlm : c.modeRules}
                        </Badge>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                  {m.role === "assistant" && m.result && (
                    <>
                      <GdnaCitations citations={m.result.citations} />
                      <GdnaSuggestions suggestions={m.result.suggestions} />
                    </>
                  )}
                </div>
              </motion.div>
            ))}

            {ask.isPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-card px-4 py-3">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">{c.thinking}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {errorText && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" /> {errorText}
              </span>
              <Button variant="outline" size="sm" onClick={() => ask.reset()}>
                {c.retry}
              </Button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-primary/20 bg-card/60 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Checkbox
              id="gdna-remember"
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
              data-testid="checkbox-remember"
            />
            <Label htmlFor="gdna-remember" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" /> {c.memoryConsent}
            </Label>
          </div>
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={c.placeholder}
              className="max-h-40 min-h-12 flex-1 resize-none bg-background/50"
              disabled={ask.isPending}
              dir="auto"
              data-testid="input-chat"
              aria-label={c.placeholder}
            />
            <Button
              onClick={() => submit(input)}
              disabled={!input.trim() || ask.isPending}
              className="h-12 px-5 font-bold neon-glow"
              data-testid="button-send"
            >
              {ask.isPending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
              <span className="sr-only">{c.send}</span>
            </Button>
          </div>
          {status.data && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cpu className="size-3" />
              {c.agents}: {status.data.agents.map((a) => a.name).join(" · ")}
            </p>
          )}
        </div>
      </Card>

      <GdnaReviewDialog
        open={reviewOpen}
        section={section}
        draft={reviewDraft}
        onOpenChange={setReviewOpen}
        onConfirm={(text) => {
          setReviewOpen(false);
          submit(text);
        }}
      />
    </div>
  );
}

function StatusBadge({ available, mode }: { available: boolean; mode?: "llm" | "rules" }) {
  const { lang } = useLang();
  const c = gdnaCopy(lang);
  if (!available) {
    return (
      <Badge variant="destructive" data-testid="gdna-status-badge">
        {c.unavailable}
      </Badge>
    );
  }
  return (
    <Badge variant={mode === "rules" ? "outline" : "default"} data-testid="gdna-status-badge">
      {c.available}
      {mode ? ` · ${mode === "llm" ? c.modeLlm : c.modeRules}` : ""}
    </Badge>
  );
}
