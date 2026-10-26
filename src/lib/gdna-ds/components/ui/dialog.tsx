import * as React from "react";
import { cn } from "../../lib/utils";
import * as Primitive from "@radix-ui/react-dialog";
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;
import { usePortalContainer } from "../../lib/portal-container";
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ children, className, ...props }, ref) => {
  const container = usePortalContainer();
  return (
    <Primitive.Portal container={container}>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
      <Primitive.Content
        ref={ref}
        className={cn(
          "z-50 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg fixed left-1/2 top-1/2 w-[min(95vw,32rem)] -translate-x-1/2 -translate-y-1/2",
          className,
        )}
        {...props}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
});
export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-2", className)} {...props} />
  );
}
export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex justify-end gap-2", className)} {...props} />;
}
