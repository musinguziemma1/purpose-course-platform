"use client";
import { useActionState } from "react";
import { sendQueuedEmailAction, type EmailDeliveryState } from "@/app/actions/email";
import { Button } from "@/components/ui/button";

export function EmailDeliveryForm({ error }: { error: string | null }) {
  const [state, action, pending] = useActionState<EmailDeliveryState, FormData>(sendQueuedEmailAction, {});
  return <form action={action} className="my-3 space-y-2">
    <Button type="submit" size="sm" disabled={pending || !!error}>{pending ? "Contacting Resend..." : "Send due email (up to 3)"}</Button>
    {error || state.error ? <p role="alert" className="text-xs text-amber-800">{error ?? state.error}</p> : null}
    {state.message ? <p role="status" className="text-xs text-stone-600">{state.message}</p> : null}
  </form>;
}
