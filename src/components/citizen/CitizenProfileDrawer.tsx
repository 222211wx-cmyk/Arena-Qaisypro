import { useMemo, useState } from "react";
import {
  MapPin, Eye, UserPlus, UserCheck, Heart, MessageCircle,
  Video, Loader2, Lock, Globe, Users, ShieldCheck,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@workspace/gdna-ds/components/ui/sheet";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@workspace/gdna-ds/components/ui/avatar";
import { Separator } from "@workspace/gdna-ds/components/ui/separator";
import { Skeleton } from "@workspace/gdna-ds/components/ui/skeleton";
import { ScrollArea } from "@workspace/gdna-ds/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/gdna-ds/components/ui/select";
import { cn } from "@workspace/gdna-ds/lib/utils";
import { citizenMediaSrc, citizenFetch } from "@/lib/citizen";
import { useFollowCitizen, type CitizenProfile, type CitizenVisibility } from "@/hooks/use-citizen";
import CitizenAssistant from "./CitizenAssistant";

// The drawer is rendered against the dark arena theme (never the citizen-light
// skin). It composes design-system primitives + tokens only.

const VIS_META: Record<CitizenVisibility, { label: string; Icon: typeof Globe }> = {
  everyone: { label: "عام", Icon: Globe },
  friends: { label: "الأصدقاء", Icon: Users },
  private: { label: "خاص", Icon: Lock },
};

export interface CitizenProfileDrawerProps {
  /** Loaded public/own profile. When null with isLoading=false we show the unavailable state. */
  citizen: CitizenProfile | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  /** Open the existing conversation with this citizen (never sends a message). */
  onMessage: (citizen: CitizenProfile) => void;
  /** Render inline as a full page (used by /u/:username) instead of a side sheet. */
  fullscreen?: boolean;
  isLoading?: boolean;
  /** Extra tools rendered under the actions (kept intact on the fullscreen page). */
  tools?: React.ReactNode;
  /**
   * Standalone mode for isolated islands (e.g. the Helixly clip surface) that
   * render OUTSIDE the app's AuthProvider. Follow uses a direct credentialed
   * request instead of the app's React Query relationship hook.
   */
  standalone?: boolean;
  /**
   * Persist an own-profile privacy visibility change (الحرية الشخصية). When
   * provided AND citizen.isSelf, the header renders a functional segmented
   * control; the page wires this to the existing update API so the change is
   * reflected on the shared profile.
   */
  onVisibilityChange?: (visibility: CitizenVisibility) => void;
  /** True while a visibility change is being persisted. */
  visibilityPending?: boolean;
}

export function CitizenProfileDrawer({
  citizen, isOpen, onClose, onMessage, fullscreen = false, isLoading = false, tools, standalone = false,
  onVisibilityChange, visibilityPending = false,
}: CitizenProfileDrawerProps) {
  const body = (
    <CitizenProfileView
      citizen={citizen}
      isLoading={isLoading}
      onMessage={onMessage}
      tools={tools}
      standalone={standalone}
      onVisibilityChange={onVisibilityChange}
      visibilityPending={visibilityPending}
    />
  );

  if (fullscreen) {
    return <div data-testid="citizen-profile-fullscreen" className="mx-auto w-full max-w-2xl">{body}</div>;
  }

  return (
    <Sheet open={isOpen} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-background p-0 sm:max-w-md"
        data-testid="citizen-profile-drawer"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{citizen?.displayName ?? "ملف المواطن"}</SheetTitle>
          <SheetDescription>بطاقة المواطن العامة والإجراءات المتاحة.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4 pt-12">{body}</div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ── Shared body (drawer + fullscreen) ─────────────────────────────────────────
function CitizenProfileView({
  citizen, isLoading, onMessage, tools, standalone, onVisibilityChange, visibilityPending,
}: {
  citizen: CitizenProfile | null | undefined;
  isLoading?: boolean;
  onMessage: (citizen: CitizenProfile) => void;
  tools?: React.ReactNode;
  standalone?: boolean;
  onVisibilityChange?: (visibility: CitizenVisibility) => void;
  visibilityPending?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="citizen-profile-loading">
        <div className="flex items-center gap-3">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (!citizen) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center" data-testid="citizen-profile-unavailable">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Lock className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">الملف غير متاح</p>
        <p className="text-xs text-muted-foreground">قد يكون الملف خاصاً أو غير موجود.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CitizenProfileHeader
        citizen={citizen}
        onVisibilityChange={onVisibilityChange}
        visibilityPending={visibilityPending}
      />
      {standalone
        ? <StandaloneCitizenActions citizen={citizen} onMessage={onMessage} />
        : <CitizenProfileActions citizen={citizen} onMessage={onMessage} />}
      {tools ? <div data-testid="citizen-profile-tools">{tools}</div> : null}
      <CitizenProfileDetails citizen={citizen} />
    </div>
  );
}

function CitizenProfileHeader({
  citizen, onVisibilityChange, visibilityPending,
}: {
  citizen: CitizenProfile;
  onVisibilityChange?: (visibility: CitizenVisibility) => void;
  visibilityPending?: boolean;
}) {
  const initials = (citizen.displayName || citizen.username).slice(0, 2).toUpperCase();
  const vis = VIS_META[citizen.visibility];
  return (
    <div className="space-y-3">
      {citizen.coverUrl && (
        <div className="h-24 w-full overflow-hidden rounded-lg bg-muted">
          <img src={citizenMediaSrc(citizen.coverUrl)} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex items-center gap-3">
        <Avatar className="size-16 border-2 border-border">
          {citizen.avatarUrl && <AvatarImage src={citizenMediaSrc(citizen.avatarUrl)} alt={citizen.displayName} />}
          <AvatarFallback className="bg-secondary text-secondary-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold leading-tight" data-testid="text-citizen-name">
            {citizen.displayName}
          </h2>
          <p className="truncate text-sm text-muted-foreground">@{citizen.username}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {/* Only the authorized, coarse city coordinate from the API is ever
                shown — never precise location, and never invented. When the
                server returns no city we say so instead of guessing. */}
            {citizen.city ? (
              <>
                <span className="inline-flex items-center gap-1" data-testid="text-citizen-city">
                  <MapPin className="size-3.5" /> {citizen.city}
                </span>
                <span data-testid="text-citizen-coordinates-approximate">إحداثيات تقريبية</span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1" data-testid="text-citizen-city-unavailable">
                <MapPin className="size-3.5" /> الإحداثيات غير متاحة
              </span>
            )}
            {citizen.age != null && <span>{citizen.age} سنة</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1 text-muted-foreground" data-testid="stat-views">
          <Eye className="size-4" /> {citizen.stats.views}
        </span>
        <span data-testid="stat-followers"><b>{citizen.stats.followers}</b> <span className="text-muted-foreground">متابِع</span></span>
        <span data-testid="stat-following"><b>{citizen.stats.following}</b> <span className="text-muted-foreground">متابَع</span></span>
        <span className="inline-flex items-center gap-1 text-muted-foreground" data-testid="stat-videos">
          <Video className="size-4" /> {citizen.videos.length}
        </span>
      </div>

      {/* Own-profile privacy — الحرية الشخصية. Functional when a persist handler
          is wired; otherwise a read-only badge. Owner-only. */}
      {citizen.isSelf && (
        onVisibilityChange ? (
          <OwnVisibilityControl
            value={citizen.visibility}
            pending={visibilityPending}
            onChange={onVisibilityChange}
          />
        ) : (
          <Badge variant="outline" className="gap-1.5 font-normal" data-testid="badge-own-visibility">
            <vis.Icon className="size-3.5" /> ظهور ملفي: {vis.label}
          </Badge>
        )
      )}
    </div>
  );
}

// Functional own-profile privacy visibility control (public / friends / private),
// persisted by the owning page. Uses the DS Select so it stays consistent.
function OwnVisibilityControl({
  value, pending, onChange,
}: {
  value: CitizenVisibility;
  pending?: boolean;
  onChange: (visibility: CitizenVisibility) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2" data-testid="own-visibility-control">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
        <Lock className="size-4" /> الحرية الشخصية
      </span>
      <div className="flex items-center gap-2">
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        <Select value={value} onValueChange={(v) => onChange(v as CitizenVisibility)} disabled={pending}>
          <SelectTrigger className="h-8 w-32" data-testid="select-own-visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(VIS_META) as CitizenVisibility[]).map((key) => {
              const meta = VIS_META[key];
              return (
                <SelectItem key={key} value={key} data-testid={`option-visibility-${key}`}>
                  <span className="inline-flex items-center gap-1.5"><meta.Icon className="size-3.5" /> {meta.label}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CitizenProfileActions({
  citizen, onMessage,
}: {
  citizen: CitizenProfile;
  onMessage: (citizen: CitizenProfile) => void;
}) {
  const follow = useFollowCitizen();
  const toggleFollow = () => follow.mutate({ username: citizen.username, follow: !citizen.isFollowing });

  // The owner sees no relationship actions on their own card.
  if (citizen.isSelf) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground" data-testid="own-profile-note">
        <ShieldCheck className="size-4" /> هذه بطاقتك العامة كما يراها الآخرون.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {citizen.canMessage && (
        <Button
          variant="outline"
          className="gap-1.5"
          onClick={() => onMessage(citizen)}
          data-testid="button-message"
        >
          <MessageCircle className="size-4" /> مراسلة
        </Button>
      )}

      <Button
        variant={citizen.isFollowing ? "outline" : "default"}
        className="gap-1.5"
        onClick={toggleFollow}
        disabled={follow.isPending}
        data-testid="button-follow"
      >
        {follow.isPending
          ? <Loader2 className="size-4 animate-spin" />
          : citizen.isFollowing ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
        {citizen.isFollowing ? "متابَع" : "متابعة"}
      </Button>

      {/* Dating/تعارف is only surfaced when the citizen is available for it. */}
      {citizen.status === "available" && (
        <CitizenAssistant
          section="matchmaking"
          username={citizen.username}
          triggerLabel="تعارف"
          className="h-10"
        />
      )}
    </div>
  );
}

// Isolated-island variant: no React Query / AuthContext. Follow uses a direct
// credentialed request; local optimistic state reflects the toggle.
function StandaloneCitizenActions({
  citizen, onMessage,
}: {
  citizen: CitizenProfile;
  onMessage: (citizen: CitizenProfile) => void;
}) {
  const [following, setFollowing] = useState(citizen.isFollowing);
  const [busy, setBusy] = useState(false);

  const toggleFollow = async () => {
    const next = !following;
    setBusy(true);
    setFollowing(next);
    try {
      await citizenFetch(`/api/citizen-profiles/${encodeURIComponent(citizen.username)}/follow`, {
        method: next ? "POST" : "DELETE",
      });
    } catch {
      setFollowing(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  };

  if (citizen.isSelf) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4" /> هذه بطاقتك العامة كما يراها الآخرون.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={following ? "outline" : "default"}
        className="gap-1.5"
        onClick={() => void toggleFollow()}
        disabled={busy}
        data-testid="button-follow"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : following ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
        {following ? "متابَع" : "متابعة"}
      </Button>
      {citizen.canMessage && (
        <Button variant="outline" className="gap-1.5" onClick={() => onMessage(citizen)} data-testid="button-message">
          <MessageCircle className="size-4" /> مراسلة
        </Button>
      )}
    </div>
  );
}

function CitizenProfileDetails({ citizen }: { citizen: CitizenProfile }) {
  // Never invent fields: only render bio/interests/videos the server actually returned.
  const hasBio = !!citizen.bio;
  const hasInterests = citizen.interests.length > 0;
  const hasVideos = citizen.videos.length > 0;

  const compat = useMemo(() => citizen.compatibility, [citizen.compatibility]);

  if (!hasBio && !hasInterests && !hasVideos && !compat) {
    return (
      <p className="rounded-md border bg-card px-3 py-6 text-center text-sm text-muted-foreground" data-testid="citizen-profile-empty">
        لا توجد تفاصيل عامة لعرضها.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {hasBio && (
        <div>
          <Separator className="mb-3" />
          <p className="whitespace-pre-wrap text-sm" data-testid="text-citizen-bio">{citizen.bio}</p>
        </div>
      )}

      {hasInterests && (
        <div className="flex flex-wrap gap-1.5" data-testid="citizen-interests">
          {citizen.interests.map((interest) => (
            <Badge key={interest} variant="secondary" className="font-normal">{interest}</Badge>
          ))}
        </div>
      )}

      {compat && (
        <div className="rounded-md border bg-card p-3" data-testid="citizen-compatibility">
          <div className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium"><Heart className="size-4" /> توافق</span>
            <b>{compat.percent}%</b>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{compat.explanation}</p>
        </div>
      )}

      {hasVideos && (
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium">
            <Video className="size-4" /> المقاطع ({citizen.videos.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {citizen.videos.map((video) => (
              <a
                key={video.id}
                href={video.url}
                className={cn("block overflow-hidden rounded-md border bg-muted")}
                data-testid={`citizen-video-${video.id}`}
              >
                {video.thumbnailUrl ? (
                  <img src={citizenMediaSrc(video.thumbnailUrl)} alt={video.title} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center p-1 text-center text-xs text-muted-foreground">
                    {video.title}
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CitizenProfileDrawer;
