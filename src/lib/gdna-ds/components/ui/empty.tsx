import * as React from "react";
import { cn } from "../../lib/utils";
export const Empty = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className,
    )}
    {...props}
  />
));
Empty.displayName = "Empty";
export const EmptyHeader = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
));
EmptyHeader.displayName = "EmptyHeader";
export const EmptyTitle = React.forwardRef<
  React.ElementRef<"h3">,
  React.ComponentPropsWithoutRef<"h3"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <h3 ref={ref} className={cn("font-semibold", className)} {...props} />
));
EmptyTitle.displayName = "EmptyTitle";
export const EmptyDescription = React.forwardRef<
  React.ElementRef<"p">,
  React.ComponentPropsWithoutRef<"p"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
EmptyDescription.displayName = "EmptyDescription";
export const EmptyMedia = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <div ref={ref} className={cn("mb-4", className)} {...props} />
));
EmptyMedia.displayName = "EmptyMedia";
