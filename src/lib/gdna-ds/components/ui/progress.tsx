import * as React from "react";
import { cn } from "../../lib/utils";
import * as Primitive from "@radix-ui/react-progress";
export function Progress({
  value = 0,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      value={value}
      className={cn(
        "relative h-2 overflow-hidden rounded-full bg-secondary",
        className,
      )}
      {...props}
    >
      <Primitive.Indicator
        className="h-full bg-primary transition-transform"
        style={{
          transform: `translateX(-${100 - Math.max(0, Math.min(100, value ?? 0))}%)`,
        }}
      />
    </Primitive.Root>
  );
}
