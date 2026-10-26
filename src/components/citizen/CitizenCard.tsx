import { Link } from "wouter";
import { MapPin, UserPlus, UserCheck, Heart, Sparkles } from "lucide-react";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@workspace/gdna-ds/components/ui/avatar";
import { cn } from "@workspace/gdna-ds/lib/utils";
import { UnifiedMessenger } from "@/components/messenger/UnifiedMessenger";
import { citizenProfileHref, citizenMediaSrc } from "@/lib/citizen";
import { useFollowCitizen, type CitizenProfile, type CitizenStatus } from "@/hooks/use-citizen";

export interface CitizenCardProps {
  profile: CitizenProfile;
  compact?: boolean;
  showMessage?: boolean;
  showCompatibility?: boolean;
  className?: string;
}

const STATUS_META: Record<CitizenStatus, { label: string; className: string }> = {
  available: { label: "متاح للتعارف", className: "border-primary/40 bg-primary/10 text-primary" },
  busy: { label: "مشغول", className: "border-accent/40 bg-accent/10 text-accent" },
  private: { label: "خاص", className: "border-border bg-muted text-muted-foreground" },
};

export default function CitizenCard({
  profile,
  compact = false,
  showMessage = true,
  showCompatibility = true,
  className,
}: CitizenCardProps) {
  const follow = useFollowCitizen();
  const status = STATUS_META[profile.status];
  const initials = (profile.displayName || profile.username).slice(0, 2).toUpperCase();
  const meta = [profile.city, profile.age != null ? `${profile.age}` : null].filter(Boolean).join(" · ");

  const toggleFollow = () => {
    if (profile.isSelf) return;
    follow.mutate({ username: profile.username, follow: !profile.isFollowing });
  };

  return (
    <Card
      className={cn("overflow-hidden border bg-card transition-shadow hover:shadow-md", className)}
      data-testid={`card-citizen-${profile.username}`}
    >
      {!compact && (
        <div className="relative h-20 w-full bg-muted">
          {profile.coverUrl && (
            <img
              src={citizenMediaSrc(profile.coverUrl)}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}
      <CardContent className={cn("relative", compact ? "p-3" : "px-4 pb-4 pt-0")}>
        <div className={cn("flex items-start gap-3", !compact && "-mt-8")}>
          <Link href={citizenProfileHref(profile.username)}>
            <Avatar className={cn("border-2 border-card", compact ? "size-12" : "size-16")}>
              {profile.avatarUrl && <AvatarImage src={citizenMediaSrc(profile.avatarUrl)} alt={profile.displayName} />}
              <AvatarFallback className="bg-secondary text-secondary-foreground">{initials}</AvatarFallback>
            </Avatar>
          </Link>
          <div className={cn("min-w-0 flex-1", !compact && "pt-9")}>
            <Link
              href={citizenProfileHref(profile.username)}
              className="block truncate font-semibold leading-tight text-foreground hover:underline"
              data-testid={`link-citizen-${profile.username}`}
            >
              {profile.displayName}
            </Link>
            <span className="block truncate text-sm text-muted-foreground">@{profile.username}</span>
          </div>
          {showCompatibility && profile.compatibility && (
            <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-primary">
              <Sparkles className="size-3" />
              {profile.compatibility.percent}%
            </Badge>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("gap-1", status.className)}>
            {status.label}
          </Badge>
          {meta && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" /> {meta}
            </span>
          )}
        </div>

        {profile.bio && !compact && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{profile.bio}</p>
        )}

        {profile.interests.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.interests.slice(0, compact ? 3 : 5).map((i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">
                {i}
              </Badge>
            ))}
          </div>
        )}

        {profile.compatibility?.explanation && showCompatibility && !compact && (
          <p className="mt-2 text-xs text-muted-foreground">{profile.compatibility.explanation}</p>
        )}

        {!profile.isSelf && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant={profile.isFollowing ? "ghost" : "outline"}
              size="sm"
              className={cn(
                "h-8 gap-1.5 px-3 text-xs font-medium",
                profile.isFollowing ? "text-primary" : "text-foreground",
              )}
              onClick={toggleFollow}
              disabled={follow.isPending}
              data-testid={`button-follow-${profile.username}`}
            >
              {profile.isFollowing ? (
                <>
                  <UserCheck className="size-3.5" /> متابَع
                </>
              ) : (
                <>
                  <UserPlus className="size-3.5" /> متابعة
                </>
              )}
            </Button>
            {profile.status === "available" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs font-medium text-muted-foreground"
                onClick={toggleFollow}
                data-testid={`button-taaruf-${profile.username}`}
              >
                <Heart className="size-3.5" /> تعارف
              </Button>
            )}
            {showMessage && profile.canMessage && (
              <UnifiedMessenger
                peerId={profile.userId}
                peerUsername={profile.username}
                context="citizen-card"
                triggerLabel="مراسلة"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
