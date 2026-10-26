import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, Loader2, Zap, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { useLang } from "@/contexts/LangContext";
import { useConnectivity } from "@/contexts/ConnectivityContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const SUGGESTED: Record<string, string[]> = {
  en: ["✅ Is my Smart System active?", "Best strategy to earn coins?", "Tell me about Arena Strike", "How does XP work?"],
  ar: ["✅ هل النظام الذكي نشط؟ أعطني تقريري", "أفضل استراتيجية لكسب العملات؟", "أخبرني عن Arena Strike", "كيف يعمل XP؟"],
  fr: ["✅ Système Smart actif? Montre mon rapport", "Meilleure stratégie pour gagner?", "Parle-moi d'Arena Strike", "Comment fonctionne l'XP?"],
  es: ["✅ ¿Mi sistema Smart está activo?", "¿Cuál es la mejor estrategia para ganar monedas?", "Háblame de Arena Strike", "¿Cómo funciona XP?"],
  de: ["✅ Ist mein Smart-System aktiv?", "Beste Strategie, um Coins zu verdienen?", "Erzähl mir von Arena Strike", "Wie funktioniert XP?"],
  dz: ["✅ واش النظام الذكي نشط؟ عطيني تقريري", "أفضل طريقة باش نربح كوينز؟", "حدثني على Arena Strike", "كيفاش كيخدم XP؟"],
};

const WELCOME: Record<string, string> = {
  en: "Neural grid online. ✅ GDN-SMART SYSTEM: ACTIVE — monitoring Gaming, Education, Business, Social, Competitions & XP in real time. Ask me for your personalised report.",
  ar: "الشبكة العصبية متصلة. ✅ نظام GDN-SMART: نشط — يراقب الألعاب، التعليم، الأعمال، الاجتماعي، المسابقات وXP في الوقت الفعلي. اسألني عن تقريرك الشخصي.",
  fr: "Grille neurale en ligne. ✅ GDN-SMART SYSTEM: ACTIF — surveillance Gaming, Education, Business, Social, Competitions & XP en temps reel. Demandez votre rapport personnalise.",
  es: "Red neuronal en línea. ✅ SISTEMA GDN-SMART: ACTIVO — supervisa juegos, educación, negocios, redes sociales, competiciones y XP en tiempo real. Pídeme tu informe personalizado.",
  de: "Neuronales Netz online. ✅ GDN-SMART SYSTEM: AKTIV — überwacht Gaming, Bildung, Business, Soziales, Wettbewerbe und XP in Echtzeit. Frage nach deinem persönlichen Bericht.",
  dz: "الشبكة العصبية متصلة. ✅ نظام GDN-SMART: نشط — يراقب الألعاب، التعليم، البيزنس، السوشيال وXP. سول على تقريرك الشخصي.",
};

interface GdnAiTerminalProps {
  compact?: boolean;
}

export default function GdnAiTerminal({ compact = false }: GdnAiTerminalProps) {
  const { t, lang } = useLang();
  const { isOnline } = useConnectivity();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME[lang] ?? WELCOME.en },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuggested, setShowSuggested] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMessages([{ role: "assistant", content: WELCOME[lang] ?? WELCOME.en }]);
    setShowSuggested(true);
  }, [lang]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    if (!isOnline) {
      setError(
        lang === "ar"
          ? "الذكاء الاصطناعي يحتاج إلى اتصال بالإنترنت."
          : lang === "fr"
            ? "L’IA nécessite une connexion Internet."
            : lang === "es" ? "La IA requiere conexión a internet." : "AI requires an internet connection.",
      );
      return;
    }

    const history = messages
      .filter((m) => !m.streaming)
      .slice(1)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    setError("");
    setShowSuggested(false);

    // Add empty streaming assistant message
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortRef.current.signal,
        body: JSON.stringify({ message: msg, history }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Stream unavailable");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;

          try {
            const parsed = JSON.parse(raw) as { delta?: string; error?: string };
            if (parsed.error) {
              setError(parsed.error);
              break;
            }
            if (parsed.delta) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.streaming) {
                  next[next.length - 1] = { ...last, content: last.content + parsed.delta };
                }
                return next;
              });
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      // Fallback to non-streaming
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message: msg, history }),
        });
        const data = await res.json() as { reply?: string; error?: string };
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.streaming) {
            next[next.length - 1] = { ...last, content: data.reply ?? ({ ar: "خطأ عصبي — حاول مجدداً.", fr: "Erreur neuronale — réessayez.", es: "Error neuronal; inténtalo de nuevo.", en: "Neural error — try again.", de: "Neural error — try again." }[lang]), streaming: false };
          }
          return next;
        });
        return;
      } catch {
        setError(({ ar: "تعطل في الشبكة العصبية — حاول مجدداً.", fr: "Perturbation de la grille neuronale — réessayez.", es: "Interrupción de la red neuronal; inténtalo de nuevo.", en: "Neural grid disruption — try again.", de: "Neural grid disruption — try again." }[lang]));
      }
    } finally {
      // Mark streaming done
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.streaming) {
          next[next.length - 1] = { ...last, streaming: false };
        }
        return next;
      });
      setLoading(false);
    }
  }, [input, isOnline, lang, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const suggested = SUGGESTED[lang] ?? SUGGESTED.en;
  const chatHeight = compact ? "max-h-[280px]" : "max-h-[400px]";

  return (
    <div className="flex flex-col h-full">
      {/* Terminal header bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-black/60 border-b border-primary/20 rounded-t-xl">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 flex items-center justify-center gap-2">
          <Sparkles className="w-3 h-3 text-primary animate-pulse" />
          <span className="text-xs font-mono text-primary/80 tracking-widest uppercase">
            GDN-AI · Neural Grid v3.0
          </span>
          <span className={`flex items-center gap-1 text-[10px] border px-2 py-0.5 rounded-full ${
            isOnline
              ? "text-chart-3 bg-chart-3/10 border-chart-3/30"
              : "text-destructive bg-destructive/10 border-destructive/30"
          }`}>
            <Zap className="w-2.5 h-2.5" /> {isOnline ? "GPT-4o" : ({ ar: "غير متصل", fr: "Hors ligne", es: "Sin conexión", en: "Offline", de: "Offline" }[lang])}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-3 ${chatHeight} scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent`}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground font-medium rounded-br-sm"
                    : "bg-black/40 border border-primary/20 text-foreground rounded-bl-sm font-mono"
                }`}
                dir="auto"
              >
                {msg.role === "assistant" && (
                  <span className="text-primary/50 text-xs font-mono mr-1">&gt;</span>
                )}
                {msg.content}
                {msg.streaming && msg.content.length > 0 && (
                  <span className="inline-block w-1.5 h-4 bg-primary/80 ml-0.5 animate-pulse align-middle" />
                )}
              </div>
              {msg.role === "user" && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center border border-primary/50 mt-0.5">
                  <span className="text-xs font-bold text-primary">U</span>
                </div>
              )}
            </motion.div>
          ))}

          {loading && messages[messages.length - 1]?.content === "" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2 justify-start"
            >
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-black/40 border border-primary/20 px-3 py-2 rounded-xl rounded-bl-sm flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="text-muted-foreground text-xs font-mono">{({ ar: "الشبكة العصبية تعالج…", fr: "Traitement de la grille neuronale…", es: "Procesando la red neuronal…", en: "Neural grid processing…", de: "Neural grid processing…" }[lang])}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="text-center text-destructive text-xs py-1 font-mono">{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      <AnimatePresence>
        {showSuggested && messages.length <= 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2 flex flex-wrap gap-1.5"
          >
            {suggested.map((q) => (
              <button
                key={q}
                onClick={() => void sendMessage(q)}
                disabled={!isOnline}
                className="text-[11px] px-2.5 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-mono"
                dir="auto"
              >
                {q}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-primary/20 bg-black/40 rounded-b-xl">
        <span className="text-primary/50 font-mono text-sm self-center">&gt;_</span>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chat_placeholder")}
          className="flex-1 h-10 text-sm bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 font-mono placeholder:text-muted-foreground/40"
          disabled={loading || !isOnline}
          dir="auto"
        />
        <Button
          onClick={() => void sendMessage()}
          disabled={!input.trim() || loading || !isOnline}
          size="sm"
          className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold neon-glow transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

/* ─── Floating Widget ─────────────────────────────────── */
export function GdnAiFloating() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="mb-3 w-[370px] rounded-xl border border-primary/30 bg-card/95 backdrop-blur shadow-2xl shadow-primary/20"
          >
            <GdnAiTerminal compact />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-primary neon-glow flex items-center justify-center shadow-lg shadow-primary/40 relative"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown className="w-6 h-6 text-primary-foreground" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Bot className="w-6 h-6 text-primary-foreground" />
            </motion.span>
          )}
        </AnimatePresence>
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-background animate-pulse" />
      </motion.button>
    </div>
  );
}
