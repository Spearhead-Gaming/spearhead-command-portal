import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_0_1px_rgba(111,152,201,0.22)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/88 shadow-[0_0_0_1px_rgba(143,168,196,0.15)]",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-card/70",
        ghost: "text-muted-foreground hover:bg-card/70 hover:text-foreground",
        destructive:
          "bg-danger text-destructive-foreground hover:bg-danger/90 shadow-[0_0_0_1px_rgba(248,113,113,0.22)]",
        warning:
          "bg-warning text-accent-foreground hover:bg-warning/90 shadow-[0_0_0_1px_rgba(245,158,11,0.22)]",
        success:
          "bg-success text-background hover:bg-success/90 shadow-[0_0_0_1px_rgba(52,211,153,0.2)]",
        link: "h-auto rounded-none px-0 py-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 px-5 py-2.5",
        icon: "h-10 w-10",
        link: "h-auto p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
