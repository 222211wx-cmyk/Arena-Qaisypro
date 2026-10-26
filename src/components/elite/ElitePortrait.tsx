import { Avatar, AvatarImage, AvatarFallback } from "@workspace/gdna-ds/components/ui/avatar";

function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Portrait built on the DS Avatar. Uses genuine Wikimedia / in-app imagery and
 * falls back to gold initials if the image fails to load (never a broken img).
 */
export function ElitePortrait({
  name,
  src,
  className = "",
}: {
  name: string;
  src: string;
  className?: string;
}) {
  return (
    <Avatar className={`rounded-2xl ${className}`}>
      {/* Only request an image when we have a real URL. When no genuine portrait
          exists we intentionally render the initials fallback — never a broken
          or invented image request. */}
      {src ? (
        <AvatarImage
          src={src}
          alt={`Portrait of ${name}`}
          className="rounded-2xl object-cover"
          loading="lazy"
        />
      ) : null}
      <AvatarFallback className="rounded-2xl bg-primary/15 text-2xl font-black text-primary">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
