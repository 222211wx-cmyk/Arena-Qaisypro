import * as React from "react";
import * as Primitive from "@radix-ui/react-separator";
import { cn } from "../../lib/utils";
export const Separator = React.forwardRef<
  React.ElementRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(
  (
    { orientation = "horizontal", decorative = true, className, ...props },
    ref,
  ) => (
    <Primitive.Root
      ref={ref}
      orientation={orientation}
      decorative={decorative}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  ),
);
