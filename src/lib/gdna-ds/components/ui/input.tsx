import * as React from "react";
import { cn } from "../../lib/utils";
export const Input = React.forwardRef<
  React.ElementRef<"input">,
  React.ComponentPropsWithoutRef<"input"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
