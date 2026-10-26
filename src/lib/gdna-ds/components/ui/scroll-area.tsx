import * as React from "react";
import { cn } from "../../lib/utils";
import * as Primitive from "@radix-ui/react-scroll-area";
export const ScrollArea = React.forwardRef<
  React.ElementRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ children, className, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <Primitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </Primitive.Viewport>
    <ScrollBar />
    <Primitive.Corner />
  </Primitive.Root>
));
export function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentPropsWithoutRef<typeof Primitive.Scrollbar>) {
  return (
    <Primitive.Scrollbar
      orientation={orientation}
      className={cn(
        "flex touch-none select-none",
        orientation === "vertical" ? "h-full w-2.5" : "h-2.5 flex-col",
        className,
      )}
      {...props}
    >
      <Primitive.Thumb className="relative flex-1 rounded-full bg-border" />
    </Primitive.Scrollbar>
  );
}
