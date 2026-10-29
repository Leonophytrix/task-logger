import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-sm hover:opacity-90 dark:text-[#17132d]",
        outline: "border bg-card hover:bg-soft",
        ghost: "hover:bg-soft text-muted hover:text-foreground",
        destructive: "bg-red-700 text-white hover:bg-red-800",
      },
      size: { default: "", icon: "size-11 p-0", sm: "px-3" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
export { Button, buttonVariants };
