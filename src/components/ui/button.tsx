import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:translate-y-px [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-navy text-paper hover:bg-navy-700 shadow-[0_10px_24px_-16px_rgba(10,26,48,0.8)]",
        gold: "bg-gold text-ink hover:bg-gold-dark hover:text-paper shadow-[0_12px_28px_-16px_rgba(201,162,39,0.9)]",
        outline: "border border-navy/20 bg-transparent text-navy hover:border-navy/45 hover:bg-navy/[0.04]",
        ghost: "text-navy hover:bg-navy/[0.06]",
        light: "bg-paper/95 text-navy hover:bg-white shadow-sm",
        dark: "bg-white/10 text-paper border border-white/20 hover:bg-white/16",
        subtle: "bg-cream text-navy hover:bg-sand border border-sand",
        success: "bg-source text-paper hover:brightness-110",
        danger: "bg-rose-700 text-white hover:bg-rose-800",
        link: "text-navy underline decoration-gold decoration-2 underline-offset-4 hover:text-gold-dark rounded-none px-0",
      },
      size: {
        xs: "h-7 px-2.5 text-[11px] [&_svg]:size-3",
        sm: "h-9 px-4 text-[12.5px] [&_svg]:size-3.5",
        default: "h-11 px-6 text-sm [&_svg]:size-4",
        lg: "h-12 px-7 text-[14.5px] [&_svg]:size-4",
        icon: "h-9 w-9 [&_svg]:size-4",
        "icon-sm": "h-7 w-7 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" /> : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export { buttonVariants };
