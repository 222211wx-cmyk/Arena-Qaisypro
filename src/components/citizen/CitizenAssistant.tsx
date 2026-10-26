import { useState } from "react";
import { Sparkles, AlertTriangle, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@workspace/gdna-ds/components/ui/dialog";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Textarea } from "@workspace/gdna-ds/components/ui/textarea";
import { Checkbox } from "@workspace/gdna-ds/components/ui/checkbox";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { cn } from "@workspace/gdna-ds/lib/utils";
import { CITIZEN_LIGHT_CLASS } from "@/lib/citizen";
import { useCitizenAssistant, type AiSection } from "@/hooks/use-citizen-ai";

export interface CitizenAssistantProps {
  section: AiSection;
  username?: string;
  clipId?: number;
  listingId?: number;
  defaultPrompt?: string;
  triggerLabel?: string;
  className?: string;
}

const SECTION_HEADINGS: Record<AiSection, string> = {
  profile: "مساعد الملف",
  matchmaking: "مساعد التوافق",
  market: "مساعد السوق",
  services: "مساعد الخدمات",
  helixly: "مساعد Helixly",
  map: "مساعد الخريطة",
  translate: "الترجمة",
  "auto-reply": "الرد التلقائي",
};

/**
 * Explicit opt-in AI assistant panel. Requires a per-request consent checkbox
 * before any request; the backend also enforces a saved aiConsent. Reports an
 * honest "unavailable" message on 503 and never fabricates analysis.
 */
export default function CitizenAssistant({
  section,
  username,
  clipId,
  listingId,
  defaultPrompt = "",
  triggerLabel = "مساعد الذكاء",
  className,
}: CitizenAssistantProps) {
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [result, setResult] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const assistant = useCitizenAssistant();

  const needsPrompt = section !== "matchmaking";

  const run = () => {
    if (!consent) return;
    setResult(null);
    setUnavailable(false);
    assistant.mutate(
      { section, username, clipId, listingId, prompt: prompt || undefined },
      {
        onSuccess: (data) => {
          setResult(
            data.method === "shared-interests-city-heuristic"
              ? `${data.text}\n\n(نسبة تقريبية محسوبة من الاهتمامات والمدينة المشتركة — ليست تحليلاً علمياً.)`
              : data.text,
          );
        },
        onError: (err) => {
          if (err.status === 503) setUnavailable(true);
          else setResult(err.message || "تعذّر إتمام الطلب.");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5", className)}
          data-testid={`button-ai-${section}`}
        >
          <Sparkles className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(CITIZEN_LIGHT_CLASS, "bg-card")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> {SECTION_HEADINGS[section]}
          </DialogTitle>
          <DialogDescription>
            بموافقتك الصريحة فقط. لا يتم تحليل أي محتوى خاص أو مشفّر.
          </DialogDescription>
        </DialogHeader>

        {needsPrompt && (
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              section === "translate" ? "النص المراد ترجمته…" : "اكتب طلبك هنا…"
            }
            className="min-h-24"
            data-testid="input-ai-prompt"
          />
        )}

        <div className="flex items-start gap-2 rounded-md bg-muted p-3">
          <Checkbox
            id={`ai-consent-${section}`}
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
            data-testid="checkbox-ai-consent"
          />
          <Label htmlFor={`ai-consent-${section}`} className="text-sm leading-snug">
            أوافق على معالجة هذا الطلب بالذكاء الاصطناعي.
          </Label>
        </div>

        {unavailable && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            خدمة المساعد غير متوفرة حالياً. حاول لاحقاً.
          </div>
        )}

        {result && (
          <div
            className="whitespace-pre-wrap rounded-md border bg-background p-3 text-sm text-foreground"
            data-testid="text-ai-result"
          >
            {result}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" />
          التوافق يُحسب بمنهجية شفافة (اهتمامات ومدينة مشتركة)، وليس استنتاجاً ذكياً.
        </div>

        <DialogFooter>
          <Button
            onClick={run}
            disabled={!consent || assistant.isPending}
            data-testid="button-ai-run"
          >
            {assistant.isPending ? "جارٍ…" : "تشغيل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
