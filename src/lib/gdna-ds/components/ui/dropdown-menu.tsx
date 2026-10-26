import * as React from "react";
import { cn } from "../../lib/utils";
import * as Primitive from "@radix-ui/react-dropdown-menu";
export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuItem = Primitive.Item;
export const DropdownMenuRadioGroup = Primitive.RadioGroup;
export const DropdownMenuRadioItem = Primitive.RadioItem;
export const DropdownMenuSeparator = Primitive.Separator;
import { usePortalContainer } from "../../lib/portal-container";
export const DropdownMenuContent = React.forwardRef<
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
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
});
