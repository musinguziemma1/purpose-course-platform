import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-navy/12 bg-navy/[0.05] text-navy",
        gold: "border-gold/40 bg-gold/12 text-gold-dark",
        outline: "border-navy/18 bg-transparent text-navy",
        dark: "border-white/20 bg-white/10 text-paper/85",
        success: "border-source/25 bg-source/10 text-source",
        warning: "border-amber-300/60 bg-amber-100 text-amber-900",
        danger: "border-rose-200 bg-rose-50 text-rose-700",
        info: "border-sky-200 bg-sky-50 text-sky-800",
        muted: "border-navy/10 bg-cream text-stone-600",
      },
      size: {
        sm: "px-2 py-0.5 text-[9px] tracking-[0.08em]",
        default: "px-2.5 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-[10.5px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, size, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}

export { badgeVariants };
