import * as React from "react";
import { cn } from "../../lib/utils";
import * as Primitive from "@radix-ui/react-checkbox";
export const Checkbox = React.forwardRef<
  React.ElementRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn(
      "inline-flex h-5 w-5 shrink-0 items-center rounded border border-input data-[state=checked]:bg-primary",
      className,
    )}
    {...props}
  >
    <Primitive.Indicator>✓</Primitive.Indicator>
  </Primitive.Root>
));
