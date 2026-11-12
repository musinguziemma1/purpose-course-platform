"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-lg border border-navy/15 bg-paper px-3.5 text-[13px] text-ink shadow-xs outline-none transition-all duration-200 placeholder:text-stone-400 hover:border-navy/25 focus:border-gold focus:ring-4 focus:ring-gold/15 disabled:cursor-not-allowed disabled:bg-cream/50 disabled:opacity-70 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:ring-rose-100";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldBase, "h-11", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, "min-h-28 resize-y py-2.5 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      fieldBase,
      "h-11 cursor-pointer appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9",
      "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 stroke=%22%23122a4d%22 stroke-width=%221.6%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')]",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({
  className,
  children,
  hint,
  required,
  htmlFor,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { hint?: string; required?: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("mb-1.5 flex items-baseline justify-between gap-3 text-[12px] font-medium text-navy", className)}
      {...props}
    >
      <span>
        {children}
        {required ? <span className="ml-0.5 text-rose-600">*</span> : null}
      </span>
      {hint ? <span className="text-[10.5px] font-normal text-stone-500">{hint}</span> : null}
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const generatedId = React.useId();
  const control = React.isValidElement<React.InputHTMLAttributes<HTMLElement>>(children) ? children : null;
  const controlId = htmlFor ?? control?.props.id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [control?.props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("w-full", className)}>
      <Label required={required} htmlFor={controlId}>
        {label}
      </Label>
      {hint ? <p id={hintId} className="mb-1 text-[10.5px] text-stone-500">{hint}</p> : null}
      {control ? React.cloneElement(control, { id: controlId, "aria-describedby": describedBy, "aria-invalid": error ? true : control.props["aria-invalid"], required: required || control.props.required }) : children}
      {error ? <p id={errorId} role="alert" className="mt-1 text-[11px] font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

/** Toggle row used in preferences and settings. */
export function CheckboxRow({
  name,
  label,
  hint,
  defaultChecked,
  className,
}: {
  name: string;
  label: React.ReactNode;
  hint?: string;
  defaultChecked?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg border border-navy/10 bg-paper px-3 py-2.5 text-[12px] leading-relaxed text-stone-700 transition-colors hover:border-navy/25",
        className,
      )}
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-navy/30"
      />
      <span>
        <span className="font-medium text-navy">{label}</span>
        {hint ? <span className="mt-0.5 block text-[10.5px] text-stone-500">{hint}</span> : null}
      </span>
    </label>
  );
}
