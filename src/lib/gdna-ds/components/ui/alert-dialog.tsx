import * as React from "react";
import { cn } from "../../lib/utils";
import * as Primitive from "@radix-ui/react-alert-dialog";
export const AlertDialog = Primitive.Root;
export const AlertDialogTrigger = Primitive.Trigger;
export const AlertDialogTitle = Primitive.Title;
export const AlertDialogDescription = Primitive.Description;
export const AlertDialogAction = Primitive.Action;
export const AlertDialogCancel = Primitive.Cancel;
import { usePortalContainer } from "../../lib/portal-container";
export const AlertDialogContent = React.forwardRef<
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
export function AlertDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-2", className)} {...props} />
  );
}
export function AlertDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex justify-end gap-2", className)} {...props} />;
}
