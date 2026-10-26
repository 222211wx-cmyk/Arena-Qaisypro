import { Trash2, Loader2, Database } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/gdna-ds/components/ui/alert-dialog";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { ScrollArea } from "@workspace/gdna-ds/components/ui/scroll-area";
import { Skeleton } from "@workspace/gdna-ds/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@workspace/gdna-ds/components/ui/empty";
import { useLang } from "@/contexts/LangContext";
import { gdnaCopy } from "@/lib/gdna-copy";
import { useGdnaMemory, useGdnaDeleteMemory } from "@/hooks/use-gdna";

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

export default function GdnaMemoryPanel() {
  const { lang } = useLang();
  const c = gdnaCopy(lang);
  const { data, isLoading, isError, refetch } = useGdnaMemory();
  const del = useGdnaDeleteMemory();
  const entries = data?.entries ?? [];

  return (
    <div className="flex h-full flex-col" data-testid="gdna-memory-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Database className="size-4 text-primary" /> {c.memory}
        </div>
        {entries.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive" data-testid="button-clear-memory">
                {c.clearMemory}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{c.clearMemory}</AlertDialogTitle>
                <AlertDialogDescription>{c.clearMemoryConfirm}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{c.reviewCancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => del.mutate(undefined)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {c.clearMemory}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
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
                  <Database className="size-5" />
                </EmptyMedia>
                <EmptyTitle>{c.memoryEmpty}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}

          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group rounded-lg border border-border bg-card p-3"
              data-testid={`memory-entry-${entry.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap text-sm text-foreground" dir="auto">
                  {entry.content}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => del.mutate(entry.id)}
                  disabled={del.isPending}
                  aria-label={c.deleteEntry}
                  data-testid={`button-delete-memory-${entry.id}`}
                >
                  {del.isPending && del.variables === entry.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </div>
              <time className="mt-1 block text-xs text-muted-foreground">
                {formatDate(entry.createdAt, lang)}
              </time>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
