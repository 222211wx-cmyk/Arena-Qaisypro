import { Shield, Sprout, Store, ShieldCheck, Code } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@workspace/gdna-ds/lib/utils";
import { useLang } from "@/contexts/LangContext";
import { GDNA_SECTIONS, type GdnaSection } from "@/lib/gdna-core";
import { GDNA_SECTION_LABELS, GDNA_SECTION_DESC } from "@/lib/gdna-copy";

const ICONS: Record<GdnaSection, LucideIcon> = {
  hisn: Shield,
  helixly: Sprout,
  souk: Store,
  guard: ShieldCheck,
  dev: Code,
};

export default function GdnaSectionTabs({
  value,
  onChange,
}: {
  value: GdnaSection;
  onChange: (section: GdnaSection) => void;
}) {
  const { lang } = useLang();

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" data-testid="gdna-sections">
      {GDNA_SECTIONS.map((section) => {
        const Icon = ICONS[section];
        const active = section === value;
        return (
          <button
            key={section}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(section)}
            title={GDNA_SECTION_DESC[section][lang]}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
            data-testid={`section-${section}`}
          >
            <Icon className="size-4" />
            {GDNA_SECTION_LABELS[section][lang]}
          </button>
        );
      })}
    </div>
  );
}
