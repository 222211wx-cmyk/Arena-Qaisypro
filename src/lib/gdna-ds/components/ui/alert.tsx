import * as React from "react";
import { cn } from "../../lib/utils";
export const Alert = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative w-full rounded-lg border p-4", className)}
    {...props}
  />
));
Alert.displayName = "Alert";
export const AlertTitle = React.forwardRef<
  React.ElementRef<"h5">,
  React.ComponentPropsWithoutRef<"h5"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <h5 ref={ref} className={cn("mb-1 font-medium", className)} {...props} />
));
AlertTitle.displayName = "AlertTitle";
export const AlertDescription = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";
