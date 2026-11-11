"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "@/app/actions/account";
import { Input, Label } from "@/components/ui/field";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {});
  return (
    <form action={action} className="mt-5 space-y-4">
      {[
        { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
        { name: "newPassword", label: "New password", autoComplete: "new-password" },
        { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" },
      ].map((field) => <div key={field.name}>
        <Label htmlFor={field.name}>{field.label}</Label>
        <Input id={field.name} name={field.name} type="password" autoComplete={field.autoComplete} required maxLength={128} minLength={field.name === "currentPassword" ? undefined : 15} />
      </div>)}
      <p className="text-xs text-stone-600">Use at least 15 characters. Changing your password signs you out on every device.</p>
      {state.error ? <p role="alert" className="text-sm text-rose-700">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-60">{pending ? "Saving…" : "Change password"}</button>
    </form>
  );
}
