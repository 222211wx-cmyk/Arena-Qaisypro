import { useState, useEffect } from "react";
import { ShieldQuestion } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/gdna-ds/components/ui/dialog";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Textarea } from "@workspace/gdna-ds/components/ui/textarea";
import { useLang } from "@/contexts/LangContext";
import { gdnaCopy, GDNA_SECTION_LABELS } from "@/lib/gdna-copy";
import type { GdnaSection } from "@/lib/gdna-core";

/**
 * Review-first dialog for assistance entrypoints. A draft prompt suggested by an
 * entrypoint (profile, clips, Souk, messenger) is shown here so the citizen reads
 * and edits it before anything is sent. Nothing sends automatically.
 */
export default function GdnaReviewDialog({
  open,
  section,
  draft,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  section: GdnaSection;
  draft: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (text: string) => void;
}) {
  const { lang } = useLang();
  const c = gdnaCopy(lang);
  const [text, setText] = useState(draft);

  useEffect(() => {
    if (open) setText(draft);
  }, [open, draft]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="gdna-review-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldQuestion className="size-4 text-primary" />
            {c.reviewTitle}
          </DialogTitle>
          <DialogDescription>{c.reviewDesc}</DialogDescription>
        </DialogHeader>

        <div className="text-xs text-muted-foreground">
          {c.sections}: <span className="font-semibold text-foreground">{GDNA_SECTION_LABELS[section][lang]}</span>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-32"
          dir="auto"
          data-testid="input-review-draft"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {c.reviewCancel}
          </Button>
          <Button
            onClick={() => {
              const trimmed = text.trim();
              if (!trimmed) return;
              onConfirm(trimmed);
            }}
            disabled={!text.trim()}
            data-testid="button-review-send"
          >
            {c.reviewSend}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
