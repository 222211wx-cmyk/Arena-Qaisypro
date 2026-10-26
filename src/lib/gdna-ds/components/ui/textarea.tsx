import * as React from "react";
import { cn } from "../../lib/utils";
export const Textarea = React.forwardRef<
  React.ElementRef<"textarea">,
  React.ComponentPropsWithoutRef<"textarea"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
