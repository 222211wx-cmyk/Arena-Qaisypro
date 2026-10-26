import * as React from "react";
import { cn } from "../../lib/utils";
import * as Primitive from "@radix-ui/react-switch";
export const Switch = React.forwardRef<
  React.ElementRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn(
      "inline-flex h-5 w-10 shrink-0 items-center rounded border border-input data-[state=checked]:bg-primary",
      className,
    )}
    {...props}
  >
    <Primitive.Thumb className="block h-4 w-4 rounded-full bg-current transition-transform data-[state=checked]:translate-x-5" />
  </Primitive.Root>
));
