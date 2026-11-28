"use client";
import { useActionState } from "react";
import { sendQueuedEmailAction, type EmailDeliveryState } from "@/app/actions/email";
import { Button } from "@/components/ui/button";

/** `testModeNotice` comes from the server (lib/email imports node:crypto, so it cannot load here). */
export function EmailDeliveryForm({ error, testModeNotice = null }: { error: string | null; testModeNotice?: string | null }) {
  const [state, action, pending] = useActionState<EmailDeliveryState, FormData>(sendQueuedEmailAction, {});
  return <form action={action} className="my-3 space-y-2">
    {testModeNotice && !error ? <p role="note" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">{testModeNotice}</p> : null}
    <Button type="submit" size="sm" disabled={pending || !!error}>{pending ? "Contacting Resend..." : "Send due email (up to 3)"}</Button>
    {error || state.error ? <p role="alert" className="text-xs text-amber-800">{error ?? state.error}</p> : null}
    {state.message ? <p role="status" className="text-xs text-stone-600">{state.message}</p> : null}
  </form>;
}
