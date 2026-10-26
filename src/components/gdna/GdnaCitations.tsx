import { Link } from "wouter";
import { BookMarked, ArrowUpRight, Lightbulb } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { gdnaCopy } from "@/lib/gdna-copy";
import type { GdnaCitation, GdnaSuggestion } from "@/lib/gdna-core";

function isInternal(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

export function GdnaCitations({ citations }: { citations: GdnaCitation[] }) {
  const { lang } = useLang();
  const c = gdnaCopy(lang);
  if (!citations.length) return null;

  return (
    <div className="mt-3 space-y-1.5" data-testid="gdna-citations">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <BookMarked className="size-3.5" /> {c.citations}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {citations.map((cite, i) => {
          const label = cite.label;
          if (!cite.url) {
            return (
              <li
                key={`${label}-${i}`}
                className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                {label}
              </li>
            );
          }
          if (isInternal(cite.url)) {
            return (
              <li key={`${label}-${i}`}>
                <Link
                  href={cite.url}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/20"
                >
                  {label}
                  <ArrowUpRight className="size-3" />
                </Link>
              </li>
            );
          }
          return (
            <li key={`${label}-${i}`}>
              <a
                href={cite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/20"
              >
                {label}
                <ArrowUpRight className="size-3" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function GdnaSuggestions({
  suggestions,
}: {
  suggestions: GdnaSuggestion[];
}) {
  const { lang } = useLang();
  const c = gdnaCopy(lang);
  if (!suggestions.length) return null;

  return (
    <div className="mt-3 space-y-2" data-testid="gdna-suggestions">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Lightbulb className="size-3.5" /> {c.suggestions}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {suggestions.map((s, i) => {
          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{s.title}</span>
                {s.url ? <ArrowUpRight className="size-3.5 shrink-0 text-primary" /> : null}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
            </>
          );
          const cls =
            "block rounded-lg border border-border bg-card p-3 text-start transition-colors hover:border-primary/40 hover:bg-primary/5";
          if (!s.url) {
            return (
              <div key={`${s.title}-${i}`} className={cls}>
                {body}
              </div>
            );
          }
          if (isInternal(s.url)) {
            return (
              <Link key={`${s.title}-${i}`} href={s.url} className={cls}>
                {body}
              </Link>
            );
          }
          return (
            <a
              key={`${s.title}-${i}`}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cls}
            >
              {body}
            </a>
          );
        })}
      </div>
    </div>
  );
}
