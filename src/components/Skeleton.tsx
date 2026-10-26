/**
 * Reusable skeleton loader components — gold shimmer on dark, empire-grade.
 */

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Base skeleton block — gold shimmer on dark */
export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/** Full-page skeleton for citizen profile */
export function CitizenSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Back link placeholder */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Hero card */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="rounded-3xl border border-primary/10 p-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <Skeleton className="w-24 h-24 rounded-2xl shrink-0" />
            {/* Info */}
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>

        {/* Identity section */}
        <Skeleton className="h-40 w-full mt-6 rounded-2xl" />

        {/* Achievements */}
        <div className="mt-6">
          <Skeleton className="h-6 w-36 mb-3" />
          <div className="grid grid-cols-5 sm:grid-cols-12 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for citizens list page */
export function CitizensListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card/60">
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for legends leaderboard */
export function LegendsListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/60">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-1.5 w-full" />
          </div>
          <Skeleton className="hidden sm:block h-8 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a feed of posts */
export function PostFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl border border-border/50 bg-card/60 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="flex gap-4">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Generic card skeleton */
export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`p-4 rounded-2xl border border-border/50 bg-card/60 space-y-3 ${className}`}>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}
