import * as React from "react";
import { cn } from "../../lib/utils";
export const Table = React.forwardRef<
  React.ElementRef<"table">,
  React.ComponentPropsWithoutRef<"table"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <table ref={ref} className={cn("w-full text-sm", className)} {...props} />
));
Table.displayName = "Table";
export const TableHeader = React.forwardRef<
  React.ElementRef<"thead">,
  React.ComponentPropsWithoutRef<"thead"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <thead ref={ref} className={cn("border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";
export const TableBody = React.forwardRef<
  React.ElementRef<"tbody">,
  React.ComponentPropsWithoutRef<"tbody"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y", className)} {...props} />
));
TableBody.displayName = "TableBody";
export const TableRow = React.forwardRef<
  React.ElementRef<"tr">,
  React.ComponentPropsWithoutRef<"tr"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <tr ref={ref} className={cn("border-b", className)} {...props} />
));
TableRow.displayName = "TableRow";
export const TableHead = React.forwardRef<
  React.ElementRef<"th">,
  React.ComponentPropsWithoutRef<"th"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <th
    ref={ref}
    className={cn("h-12 px-4 text-start font-medium", className)}
    {...props}
  />
));
TableHead.displayName = "TableHead";
export const TableCell = React.forwardRef<
  React.ElementRef<"td">,
  React.ComponentPropsWithoutRef<"td"> & { variant?: string }
>(({ className, variant: _variant, ...props }, ref) => (
  <td ref={ref} className={cn("p-4", className)} {...props} />
));
TableCell.displayName = "TableCell";
