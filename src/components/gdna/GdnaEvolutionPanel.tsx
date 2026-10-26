import { GitBranch } from "lucide-react";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { ScrollArea } from "@workspace/gdna-ds/components/ui/scroll-area";
import { Skeleton } from "@workspace/gdna-ds/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@workspace/gdna-ds/components/ui/empty";
import { useLang } from "@/contexts/LangContext";
import { gdnaCopy } from "@/lib/gdna-copy";
import { useGdnaEvolutionLog } from "@/hooks/use-gdna";

function formatDate(iso: string, lang: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleString(lang === "ar" ? "ar" : lang, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return d.toISOString();
  }
}

export default function GdnaEvolutionPanel() {
  const { lang } = useLang();
  const c = gdnaCopy(lang);
  const { data, isLoading, isError, refetch } = useGdnaEvolutionLog();
  const entries = data?.entries ?? [];

  return (
    <div className="flex h-full flex-col" data-testid="gdna-evolution-panel">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        <GitBranch className="size-4 text-primary" /> {c.evolution}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          )}

          {isError && !isLoading && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <p>{c.errorGeneric}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>
                {c.retry}
              </Button>
            </div>
          )}

          {!isLoading && !isError && entries.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GitBranch className="size-5" />
                </EmptyMedia>
                <EmptyTitle>{c.evolutionEmpty}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}

          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-border bg-card p-3"
              data-testid={`evolution-entry-${entry.id}`}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="uppercase">{entry.agent}</Badge>
                <time className="text-xs text-muted-foreground">{formatDate(entry.createdAt, lang)}</time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground" dir="auto">
                {entry.summary}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
