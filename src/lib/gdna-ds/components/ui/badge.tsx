import * as React from "react";
import { cn } from "../../lib/utils";
export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variant === "default"
          ? "bg-primary text-primary-foreground"
          : variant === "destructive"
            ? "bg-destructive text-destructive-foreground"
            : variant === "secondary"
              ? "bg-secondary text-secondary-foreground"
              : "",
        className,
      )}
      {...props}
    />
  );
}
