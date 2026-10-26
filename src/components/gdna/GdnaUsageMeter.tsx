import { Progress } from "@workspace/gdna-ds/components/ui/progress";
import { useLang } from "@/contexts/LangContext";
import { gdnaCopy } from "@/lib/gdna-copy";
import type { GdnaUsage } from "@/lib/gdna-core";

export default function GdnaUsageMeter({ usage }: { usage: GdnaUsage }) {
  const { lang } = useLang();
  const c = gdnaCopy(lang);
  const limit = Math.max(usage.limit, 1);
  const pct = Math.min(100, Math.round((usage.used / limit) * 100));
  const nearLimit = usage.used >= usage.limit;

  return (
    <div className="space-y-2" data-testid="gdna-usage">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{c.usageLabel}</span>
        <span className={nearLimit ? "font-semibold text-destructive" : "font-semibold text-foreground"}>
          {usage.used} / {usage.limit}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
