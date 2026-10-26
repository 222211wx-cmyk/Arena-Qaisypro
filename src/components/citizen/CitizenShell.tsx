import type { ReactNode } from "react";
import { Link } from "wouter";
import { cn } from "@workspace/gdna-ds/lib/utils";
import { CITIZEN_LIGHT_CLASS } from "@/lib/citizen";

interface CitizenShellProps {
  children: ReactNode;
  className?: string;
  activeTab?: "discover" | "market" | "services" | "map" | "profile";
}

const TABS: { key: NonNullable<CitizenShellProps["activeTab"]>; label: string; href: string }[] = [
  { key: "discover", label: "تعارف", href: "/citizens" },
  { key: "market", label: "السوق", href: "/market" },
  { key: "services", label: "خدمات", href: "/services" },
  { key: "map", label: "الخريطة", href: "/map" },
  { key: "profile", label: "ملفي", href: "/u/me" },
];

/**
 * Outer wrapper that scopes citizen social surfaces into the clean light theme
 * (Instagram-like white cards), separate from the imperial dark main theme.
 */
export function CitizenShell({ children, className, activeTab }: CitizenShellProps) {
  return (
    <div className={cn(CITIZEN_LIGHT_CLASS, "min-h-[100dvh] bg-background text-foreground")}>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <nav className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-3 py-2 scrollbar-hide">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
              data-testid={`tab-citizen-${tab.key}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className={cn("mx-auto max-w-3xl px-3 py-4 md:py-6", className)}>{children}</div>
    </div>
  );
}
