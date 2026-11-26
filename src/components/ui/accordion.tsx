"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionContextValue {
  value: string[];
  onValueChange: (value: string[]) => void;
  type: "single" | "multiple";
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined);

function useAccordion() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within Accordion");
  }
  return context;
}

interface AccordionProps {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  children: React.ReactNode;
  className?: string;
}

export function Accordion({
  type = "single",
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
}: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState<string[]>(() => {
    if (defaultValue) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [];
  });

  const value = React.useMemo(() => {
    if (controlledValue) {
      return Array.isArray(controlledValue) ? controlledValue : [controlledValue];
    }
    return internalValue;
  }, [controlledValue, internalValue]);

  const handleValueChange = React.useCallback(
    (newValue: string[]) => {
      if (onValueChange) {
        onValueChange(type === "single" ? newValue[0] : newValue);
      } else {
        setInternalValue(newValue);
      }
    },
    [onValueChange, type]
  );

  return (
    <AccordionContext.Provider value={{ value, onValueChange: handleValueChange, type }}>
      <div className={cn("space-y-2", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function AccordionItem({ value, children, className }: AccordionItemProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-stone-200 bg-white",
        className
      )}
      data-state={value}
    >
      {children}
    </div>
  );
}

interface AccordionTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function AccordionTrigger({ value, children, className }: AccordionTriggerProps) {
  const { value: openValues, onValueChange, type } = useAccordion();
  const isOpen = openValues.includes(value);

  const handleClick = () => {
    if (type === "single") {
      onValueChange(isOpen ? [] : [value]);
    } else {
      onValueChange(
        isOpen ? openValues.filter((v) => v !== value) : [...openValues, value]
      );
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={isOpen}
      className={cn(
        "flex w-full items-center justify-between px-5 py-4 text-left font-semibold transition-all hover:bg-stone-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
        className
      )}
    >
      <span className="text-navy">{children}</span>
      <ChevronDown
        className={cn(
          "h-5 w-5 shrink-0 text-stone-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
        aria-hidden="true"
      />
    </button>
  );
}

interface AccordionContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function AccordionContent({ value, children, className }: AccordionContentProps) {
  const { value: openValues } = useAccordion();
  const isOpen = openValues.includes(value);

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "animate-accordion-down" : "animate-accordion-up"
      )}
      style={{
        height: isOpen ? "auto" : 0,
      }}
    >
      <div className={cn("border-t border-stone-200 px-5 py-4 text-stone-600", className)}>
        {children}
      </div>
    </div>
  );
}
