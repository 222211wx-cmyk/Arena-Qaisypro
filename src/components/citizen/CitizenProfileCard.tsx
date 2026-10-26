import { useState } from "react";
import { MapPin, Video } from "lucide-react";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@workspace/gdna-ds/components/ui/avatar";
import { cn } from "@workspace/gdna-ds/lib/utils";
import { citizenMediaSrc } from "@/lib/citizen";
import { CitizenProfileDrawer } from "./CitizenProfileDrawer";
import { useCitizenProfile, type CitizenProfile } from "@/hooks/use-citizen";

// Minimal fields the compact card can render without the full profile payload.
export interface CitizenCardSummary {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  city?: string | null;
  videoCount?: number;
}

export interface CitizenProfileCardProps {
  /** The citizen to preview. Accepts a full profile or a light summary. */
  citizen: CitizenCardSummary | CitizenProfile;
  /** Open the existing conversation with this citizen (never sends a message). */
  onMessage: (citizen: CitizenProfile) => void;
  className?: string;
}

/**
 * CitizenProfileCard — reusable compact "mini" citizen card (avatar + name +
 * city). Rendered anywhere a small citizen preview is needed inside the app
 * (messenger, feed, discovery). Clicking it opens the SAME shared
 * CitizenProfileDrawer on the same page (no route navigation); the full profile
 * is loaded lazily on open.
 *
 * (The Helixly vanilla clip surface is an isolated island that renders outside
 * the app providers; it bridges to the same shared drawer directly via
 * openClipCitizenPanel rather than this hook-backed card.)
 */
export function CitizenProfileCard({ citizen, onMessage, className }: CitizenProfileCardProps) {
  const [open, setOpen] = useState(false);
  // Full profile is only fetched once the drawer is opened.
  const query = useCitizenProfile(open ? citizen.username : undefined);
  const fullProfile = query.data;

  return (
    <>
      <CitizenCardVisual
        citizen={citizen}
        className={className}
        onOpen={() => setOpen(true)}
      />
      <CitizenProfileDrawer
        citizen={fullProfile}
        isOpen={open}
        isLoading={open && (query.isLoading || query.isFetching) && !fullProfile}
        onClose={() => setOpen(false)}
        onMessage={onMessage}
      />
    </>
  );
}

/**
 * Pure presentational mini card visual (no hooks). Shared by CitizenProfileCard
 * and by isolated islands (Helixly clip surface) that render outside the app
 * providers, so the "mini under video" looks identical everywhere.
 */
export function CitizenCardVisual({
  citizen, onOpen, className,
}: {
  citizen: CitizenCardSummary | CitizenProfile;
  onOpen: () => void;
  className?: string;
}) {
  const initials = (citizen.displayName || citizen.username).slice(0, 2).toUpperCase();
  const videoCount = "videos" in citizen ? citizen.videos.length : citizen.videoCount ?? 0;
  const city = "city" in citizen ? citizen.city : undefined;
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className={cn("cursor-pointer border bg-card transition-colors hover:bg-accent", className)}
      data-testid="citizen-profile-card"
    >
      <CardContent className="flex items-center gap-3 p-3">
        <Avatar className="size-11 border border-border">
          {citizen.avatarUrl && <AvatarImage src={citizenMediaSrc(citizen.avatarUrl)} alt={citizen.displayName} />}
          <AvatarFallback className="bg-secondary text-secondary-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight" data-testid="card-citizen-name">{citizen.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">@{citizen.username}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {city ? (
              <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {city}</span>
            ) : (
              <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> الإحداثيات غير متاحة</span>
            )}
            {videoCount > 0 && <span className="inline-flex items-center gap-1"><Video className="size-3" /> {videoCount}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CitizenProfileCard;
