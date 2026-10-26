import { Link } from "wouter";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { ElitePortrait } from "@/components/elite/ElitePortrait";
import type { EliteProfile } from "@/lib/elite-profiles";

/** Gold-glow Guest of Honor card (only for status === "GuestOfHonor"). */
export function GuestOfHonorCard({ profile, testId }: { profile: EliteProfile; testId: string }) {
  return (
    <Link href={`/elite/${profile.slug}`} data-testid={testId} className="block h-full">
      <Card className="group h-full overflow-hidden border-2 border-primary bg-card/80 shadow-[0_0_32px_hsl(var(--primary)/0.55)] ring-2 ring-primary/40">
        <CardContent className="flex h-full flex-col gap-4 p-4">
          <Badge
            className="self-center whitespace-normal bg-primary px-3 py-1 text-center text-xs font-black uppercase tracking-widest text-primary-foreground shadow-md"
            data-testid="badge-guest-of-honor"
          >
            👑 GUEST OF HONOR - 10 STAR
          </Badge>
          <div className="relative pt-6">
            <span
              className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-4xl drop-shadow-lg"
              aria-hidden="true"
            >
              👑
            </span>
            <div className="overflow-hidden rounded-xl border-2 border-primary/70 bg-gradient-to-br from-primary/25 to-background">
              <ElitePortrait
                name={profile.name}
                src={profile.portrait}
                className="h-72 w-full transition-transform duration-300 group-hover:scale-[1.03] md:h-80"
              />
            </div>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-mono uppercase tracking-widest text-primary">
                {profile.category} · {profile.nationality}
              </p>
              <h3 className="truncate text-2xl font-black text-foreground">{profile.name}</h3>
              <p className="truncate text-sm text-muted-foreground">{profile.role}</p>
            </div>
            {profile.rating != null && (
              <p className="shrink-0 text-2xl font-black text-primary" data-testid="text-rating-adele">
                {profile.rating}/10
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
