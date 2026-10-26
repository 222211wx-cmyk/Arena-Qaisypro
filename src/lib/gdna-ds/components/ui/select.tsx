import * as React from "react";
import { cn } from "../../lib/utils";
import * as Primitive from "@radix-ui/react-select";
export const Select = Primitive.Root;
export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof Primitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof Primitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <Primitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
      className,
    )}
    {...props}
  >
    {children}
    <Primitive.Icon aria-hidden>⌄</Primitive.Icon>
  </Primitive.Trigger>
));
export const SelectValue = Primitive.Value;
export const SelectItem = React.forwardRef<
  React.ElementRef<typeof Primitive.Item>,
  React.ComponentPropsWithoutRef<typeof Primitive.Item>
>(({ children, className, ...props }, ref) => (
  <Primitive.Item
    ref={ref}
    className={cn(
      "relative cursor-pointer px-3 py-2 outline-none data-[highlighted]:bg-accent",
      className,
    )}
    {...props}
  >
    <Primitive.ItemText>{children}</Primitive.ItemText>
  </Primitive.Item>
));
import { usePortalContainer } from "../../lib/portal-container";
export const SelectContent = React.forwardRef<
  React.ElementRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ children, className, ...props }, ref) => {
  const container = usePortalContainer();
  return (
    <Primitive.Portal container={container}>
      <Primitive.Content
        ref={ref}
        className={cn(
          "z-50 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg ",
          className,
        )}
        {...props}
      >
        <Primitive.Viewport>{children}</Primitive.Viewport>
      </Primitive.Content>
    </Primitive.Portal>
  );
});
