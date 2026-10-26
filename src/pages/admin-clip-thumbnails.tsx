import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  ImageOff,
  Snowflake,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Separator } from "@workspace/gdna-ds/components/ui/separator";
import { Skeleton } from "@workspace/gdna-ds/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/gdna-ds/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@workspace/gdna-ds/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/gdna-ds/components/ui/alert-dialog";
import { useToast } from "@workspace/gdna-ds/hooks/use-toast";

import {
  useGetExhaustedClipThumbnails,
  getGetExhaustedClipThumbnailsQueryKey,
  useRequeueClipThumbnail,
  type ExhaustedClipThumbnail,
} from "@workspace/api-client-react";

import { useAuth } from "@/contexts/AuthContext";

const PAGE_LIMIT = 20;

// Privileged endpoint prefix. The generated query key's first element is the
// URL path; used to scope cache eviction across auth changes.
const PRIVILEGED_KEY_PREFIX = "/api/admin/clips/thumbnails";

// Other operators/sessions may repair clips concurrently, so keep the list
// modestly fresh without hammering the endpoint.
const STALE_TIME_MS = 30_000;
const REFETCH_INTERVAL_MS = 60_000;

function fmtTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

// ── Requeue confirmation ────────────────────────────────────────────────────────
// Explicitly asks the operator to fix the underlying issue first. Single clip
// only — there is deliberately no bulk reset.
function RequeueDialog({
  clip,
  open,
  onOpenChange,
  onConfirm,
  pending,
  error,
}: {
  clip: ExhaustedClipThumbnail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
}) {
  if (!clip) return null;
  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent data-testid="dialog-requeue">
        <AlertDialogHeader>
          <AlertDialogTitle>Requeue thumbnail for clip #{clip.id}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                This queues a single thumbnail generation attempt for
                <span className="font-medium text-foreground"> “{clip.title}”</span> by
                <span className="font-medium text-foreground"> {clip.username}</span>.
              </p>
              <p className="rounded-md border border-border/50 bg-muted/40 p-3 text-sm">
                Confirm you have already fixed the underlying issue (source media,
                storage, or encoder) before requeuing. Requeuing without a fix will
                exhaust attempts again.
              </p>
              <p className="text-sm">
                This queues the work only — it does not generate the thumbnail now. A
                background worker processes the queue on a roughly 5-minute cadence.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            data-testid="text-requeue-error"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} data-testid="button-requeue-cancel">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={pending}
            data-testid="button-requeue-confirm"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Queuing…
              </>
            ) : (
              "I fixed it — requeue"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Access denied surface ────────────────────────────────────────────────────────
function AccessDenied() {
  const [, setLocation] = useLocation();
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Admin access required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This tool is restricted to administrators. Sign in with an admin account
            to repair exhausted clip previews.
          </p>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            data-testid="button-go-home"
          >
            Return home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminClipThumbnailsPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Pagination cursor stack — each entry is the `before` used for that page so
  // the operator can walk back.
  const [cursorStack, setCursorStack] = useState<Array<number | undefined>>([undefined]);
  const before = cursorStack[cursorStack.length - 1];

  const [dialogClip, setDialogClip] = useState<ExhaustedClipThumbnail | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const queryEnabled = !authLoading && isAdmin;

  // A stable identity for the current viewer's access scope. Changing this
  // (login/logout/admin toggle) triggers privileged-cache eviction and UI
  // reset. The API always remains authoritative.
  const accessIdentity = queryEnabled ? user?.id ?? "admin" : "none";

  const queryKey = getGetExhaustedClipThumbnailsQueryKey({ limit: PAGE_LIMIT, before });
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetExhaustedClipThumbnails(
    { limit: PAGE_LIMIT, before },
    {
      query: {
        enabled: queryEnabled,
        queryKey,
        staleTime: STALE_TIME_MS,
        refetchInterval: queryEnabled ? REFETCH_INTERVAL_MS : false,
      },
    },
  );

  const requeue = useRequeueClipThumbnail();

  // Evict all privileged data from the cache whenever the access identity
  // changes (e.g. admin logs out, or a different user signs in). Runs as an
  // effect — never during render — and cancels in-flight privileged queries
  // before removing them so no late response repopulates the cache.
  const previousIdentity = useRef<string | number | null>(null);
  useEffect(() => {
    const changed =
      previousIdentity.current !== null && previousIdentity.current !== accessIdentity;
    previousIdentity.current = accessIdentity;
    if (!changed) return;

    const predicate = (q: { queryKey: readonly unknown[] }) => {
      const key = q.queryKey?.[0];
      return typeof key === "string" && key.includes(PRIVILEGED_KEY_PREFIX);
    };
    void queryClient.cancelQueries({ predicate });
    queryClient.removeQueries({ predicate });

    // Reset transient UI tied to the previous identity.
    setDialogClip(null);
    setDialogError(null);
    setCursorStack([undefined]);
  }, [accessIdentity, queryClient]);

  const openRequeue = (clip: ExhaustedClipThumbnail) => {
    setDialogError(null);
    setDialogClip(clip);
  };

  const confirmRequeue = () => {
    if (!dialogClip) return;
    const requeuedId = dialogClip.id;
    setDialogError(null);
    requeue.mutate(
      { id: requeuedId },
      {
        onSuccess: () => {
          toast({
            title: "Thumbnail queued",
            description:
              "Queued for regeneration — not generated yet. The worker runs on a ~5-minute cadence.",
          });
          setDialogClip(null);

          // Immediate visible update: drop the requeued clip from the current
          // page so the operator sees it leave right away.
          queryClient.setQueryData(queryKey, (old: typeof data | undefined) =>
            old ? { ...old, clips: old.clips.filter((c) => c.id !== requeuedId) } : old,
          );

          // Invalidate ALL exhausted-list pages (any cursor), not just the
          // current one, so every cached page reconciles with the server.
          void queryClient.invalidateQueries({
            predicate: (q) => {
              const key = q.queryKey?.[0];
              return typeof key === "string" && key.includes(`${PRIVILEGED_KEY_PREFIX}/exhausted`);
            },
          });
        },
        onError: (err) => {
          const status = (err as { status?: number })?.status;
          let message = err instanceof Error ? err.message : "Requeue failed.";
          if (status === 409) {
            message =
              "Conflict (409): this clip is already queued, frozen, or the worker is " +
              "actively processing it. Refresh the list, re-check its status, and retry later.";
          } else if (status === 429) {
            message =
              "Rate limited (429): too many requeues in a short window. Wait a moment and try again.";
          }
          setDialogError(message);
        },
      },
    );
  };

  const clips = data?.clips ?? [];
  const maxAttempts = data?.maxAttempts ?? 0;
  const nextBefore = data?.nextBefore ?? null;
  const canGoBack = cursorStack.length > 1;
  const canGoNext = nextBefore !== null;

  const goNext = () => {
    if (nextBefore !== null) setCursorStack((stack) => [...stack, nextBefore]);
  };
  const goBack = () => {
    setCursorStack((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Skeleton className="h-8 w-64" data-testid="skeleton-auth" />
      </div>
    );
  }

  if (!isAdmin) {
    // Privileged cache eviction is handled by the access-identity effect above,
    // never during render.
    return <AccessDenied />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Clip thumbnail repair
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Requeue thumbnail generation for clips that exhausted their automatic
            retries. Fix the underlying issue first, then requeue one clip at a time.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageOff className="h-4 w-4 text-muted-foreground" />
            Exhausted previews
          </CardTitle>
          {maxAttempts > 0 && (
            <Badge variant="outline" data-testid="badge-max-attempts">
              Max attempts: {maxAttempts}
            </Badge>
          )}
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          {/* Loading — skeletal rows */}
          {isLoading && (
            <div className="space-y-3" data-testid="state-loading">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {/* Error — with retry */}
          {!isLoading && isError && (
            <div
              className="flex flex-col items-center gap-4 py-10 text-center"
              data-testid="state-error"
            >
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="font-medium">Could not load exhausted previews</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : "Unexpected error."}
                </p>
              </div>
              <Button variant="outline" onClick={() => refetch()} data-testid="button-retry">
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && clips.length === 0 && (
            <Empty data-testid="state-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckCircle2 />
                </EmptyMedia>
                <EmptyTitle>No exhausted previews</EmptyTitle>
                <EmptyDescription>
                  Every clip preview is either healthy or still retrying automatically.
                  Nothing needs manual repair right now.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {/* Data */}
          {!isLoading && !isError && clips.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clip</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead>Next retry eligible</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clips.map((clip) => {
                    const frozen = clip.isFrozen;
                    return (
                      <TableRow
                        key={clip.id}
                        className={frozen ? "opacity-60" : undefined}
                        data-testid={`row-clip-${clip.id}`}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span
                              className="font-medium"
                              data-testid={`text-clip-title-${clip.id}`}
                            >
                              {clip.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              #{clip.id}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-clip-owner-${clip.id}`}>
                          {clip.username}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmtTimestamp(clip.createdAt)}
                        </TableCell>
                        <TableCell
                          className="text-right tabular-nums"
                          data-testid={`text-clip-attempts-${clip.id}`}
                        >
                          {clip.thumbnailRetryAttempts}
                          {maxAttempts > 0 ? ` / ${maxAttempts}` : ""}
                        </TableCell>
                        <TableCell>
                          <span
                            className="flex items-center gap-1.5 text-sm text-muted-foreground"
                            title="Next time the worker is eligible to retry this thumbnail"
                            data-testid={`text-clip-next-retry-${clip.id}`}
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                            {fmtTimestamp(clip.thumbnailRetryAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {frozen ? (
                            <Badge
                              variant="secondary"
                              className="gap-1"
                              data-testid={`badge-frozen-${clip.id}`}
                            >
                              <Snowflake className="h-3 w-3" />
                              Frozen
                            </Badge>
                          ) : (
                            <Badge variant="destructive" data-testid={`badge-exhausted-${clip.id}`}>
                              Exhausted
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={frozen}
                            onClick={() => openRequeue(clip)}
                            data-testid={`button-requeue-${clip.id}`}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Requeue
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !isError && (clips.length > 0 || canGoBack) && (
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                disabled={!canGoBack || isFetching}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {cursorStack.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={goNext}
                disabled={!canGoNext || isFetching}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <RequeueDialog
        clip={dialogClip}
        open={dialogClip !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogClip(null);
            setDialogError(null);
          }
        }}
        onConfirm={confirmRequeue}
        pending={requeue.isPending}
        error={dialogError}
      />
    </div>
  );
}
