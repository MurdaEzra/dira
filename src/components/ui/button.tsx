import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-semibold cursor-pointer transition-[background-color,color,transform] active:translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        signal: "bg-signal text-signal-foreground hover:bg-signal/90 font-bold",
        coral: "bg-coral text-coral-foreground hover:bg-coral/90 font-bold",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border-[length:var(--rule-w)] border-rule bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-foreground underline decoration-2 underline-offset-4 hover:decoration-signal rounded-sm",
        chip: "border-[length:var(--rule-w)] border-rule bg-background text-foreground hover:bg-accent aria-pressed:bg-primary aria-pressed:text-primary-foreground",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-12 px-4 text-sm",
        lg: "h-14 px-7 text-lg",
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
