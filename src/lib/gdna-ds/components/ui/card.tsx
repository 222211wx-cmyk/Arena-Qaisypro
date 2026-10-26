import * as React from "react";
import { cn } from "../../lib/utils";
export const Card = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "card rounded-lg border bg-card text-card-foreground shadow-sm",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";
export const CardHeader = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";
export const CardTitle = React.forwardRef<
  React.ElementRef<"h3">,
  React.ComponentPropsWithoutRef<"h3"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-2xl font-semibold", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";
export const CardDescription = React.forwardRef<
  React.ElementRef<"p">,
  React.ComponentPropsWithoutRef<"p"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";
export const CardContent = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";
export const CardFooter = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
