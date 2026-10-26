export {
  Dialog as Sheet,
  DialogTrigger as SheetTrigger,
  DialogTitle as SheetTitle,
  DialogDescription as SheetDescription,
  DialogHeader as SheetHeader,
} from "./dialog";
import { DialogContent } from "./dialog";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";
export function SheetContent({
  side = "right",
  className,
  ...props
}: ComponentProps<typeof DialogContent> & {
  side?: "left" | "right" | "top" | "bottom";
}) {
  return (
    <DialogContent
      className={cn(
        "translate-x-0 translate-y-0",
        side === "right"
          ? "left-auto right-0 top-0 h-full"
          : side === "left"
            ? "left-0 top-0 h-full"
            : side === "top"
              ? "left-0 top-0 w-full"
              : "left-0 top-auto bottom-0 w-full",
        className,
      )}
      {...props}
    />
  );
}
