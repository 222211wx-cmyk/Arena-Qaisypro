import { Instagram, Twitter, Youtube, Facebook, Music2, Globe } from "lucide-react";
import type { EliteSocial } from "@/lib/elite-profiles";

const ICONS = {
  instagram: Instagram,
  x: Twitter,
  youtube: Youtube,
  facebook: Facebook,
  tiktok: Music2,
  website: Globe,
} as const;

/**
 * Shared right-side, Instagram-style vertical rail of WHITE OUTLINE icons.
 * Every action is a real link to a verified/official destination with an
 * accessible label. Links open in a new tab and are marked rel="noopener".
 */
export function EliteSocialRail({
  links,
  name,
  className = "",
}: {
  links: EliteSocial[];
  name: string;
  className?: string;
}) {
  if (links.length === 0) return null;
  return (
    <nav
      aria-label={`${name} — official links`}
      className={`flex flex-col items-center gap-3 ${className}`}
      data-testid="elite-social-rail"
    >
      {links.map((link) => {
        const Icon = ICONS[link.kind] ?? Globe;
        return (
          <a
            key={link.kind + link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${name} — ${link.label}`}
            title={link.label}
            data-testid={`link-social-${link.kind}`}
            className="group flex h-11 w-11 items-center justify-center rounded-full border border-white bg-black/30 text-white backdrop-blur-sm transition-transform duration-200 hover:scale-110 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">{link.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
