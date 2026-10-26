import * as React from "react";
import { cn } from "../../lib/utils";
import * as Primitive from "@radix-ui/react-avatar";
export const Avatar = React.forwardRef<
  React.ElementRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className,
    )}
    {...props}
  />
));
export const AvatarImage = React.forwardRef<
  React.ElementRef<typeof Primitive.Image>,
  React.ComponentPropsWithoutRef<typeof Primitive.Image>
>(({ className, ...props }, ref) => (
  <Primitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof Primitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof Primitive.Fallback>
>(({ className, ...props }, ref) => (
  <Primitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className,
    )}
    {...props}
  />
));
