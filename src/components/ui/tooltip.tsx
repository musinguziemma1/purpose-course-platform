"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const TooltipContext = React.createContext<TooltipContextValue | undefined>(undefined);

function useTooltip() {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error("Tooltip components must be used within Tooltip");
  }
  return context;
}

interface TooltipProps {
  children: React.ReactNode;
  delayDuration?: number;
}

export function Tooltip({ children, delayDuration = 400 }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleMouseEnter = React.useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(true), delayDuration);
  }, [delayDuration]);

  const handleMouseLeave = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setOpen(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div
        className="relative inline-flex"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

interface TooltipTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function TooltipTrigger({ children, asChild }: TooltipTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return children;
  }
  return <span>{children}</span>;
}

interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export function TooltipContent({
  children,
  className,
  side = "top",
  align = "center",
}: TooltipContentProps) {
  const { open } = useTooltip();

  if (!open) return null;

  const sideClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };

  const alignClasses = {
    start: "items-start",
    center: "items-center justify-center",
    end: "items-end",
  };

  return (
    <div
      role="tooltip"
      className={cn(
        "absolute z-50 flex",
        sideClasses[side],
        alignClasses[align],
        "animate-in fade-in-0 zoom-in-95 duration-100"
      )}
    >
      <div
        className={cn(
          "max-w-xs rounded-lg bg-navy px-3 py-2 text-xs font-medium text-white shadow-lg",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
