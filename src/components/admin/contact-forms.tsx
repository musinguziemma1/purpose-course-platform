"use client";

import { useActionState } from "react";
import { changeContactStatus, replyToContact, type ContactStaffState } from "@/app/actions/contact";
import { Input, Label, Select, Textarea } from "@/components/ui/field";

const initial: ContactStaffState = {};
const button = "rounded-full bg-navy px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50";
function Feedback({ state }: { state: ContactStaffState }) {
  return state.error ? <p role="alert" className="text-sm text-rose-700">{state.error}</p> : state.ok ? <p role="status" className="text-sm text-source">{state.message}</p> : null;
}

export function ContactStatusForm({ id, version, status }: { id: string; version: number; status: string }) {
  const [state, action, pending] = useActionState(changeContactStatus, initial);
  return <form action={action} className="space-y-3">
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="version" value={version} />
    <div><Label htmlFor="enquiry-status">Enquiry status</Label><Select id="enquiry-status" name="status" defaultValue={status}>
      <option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option>
    </Select></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="claim" /> Assign this enquiry to me</label>
    <Feedback state={state} />
    <button className={button} disabled={pending} type="submit">{pending ? "Saving…" : "Save enquiry"}</button>
  </form>;
}

export function ContactReplyForm({ id, replyId, email, configurationError }: { id: string; replyId: string; email: string | null; configurationError: string | null }) {
  const [state, action, pending] = useActionState(replyToContact, initial);
  return <form action={action} className="space-y-3">
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="replyId" value={replyId} />
    <div><Label htmlFor="reply-email">Recipient email</Label><Input id="reply-email" type="email" name="recipientEmail" required maxLength={255} defaultValue={email ?? ""} readOnly={Boolean(email)} /></div>
    {!email ? <p className="text-sm text-amber-800">This legacy enquiry has no verified email field. Read the original message and confirm the address before queuing a reply.</p> : null}
    <div><Label htmlFor="reply-body">Reply</Label><Textarea id="reply-body" name="body" rows={7} minLength={10} maxLength={10000} required /></div>
    <p className="text-sm text-stone-600">The reply enters the Resend queue. Check its delivery status in the history below.</p>
    {configurationError ? <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Email replies are unavailable: {configurationError}</p> : null}
    <Feedback state={state} />
    <button className={button} disabled={pending || Boolean(configurationError) || Boolean(state.ok)} type="submit">{pending ? "Queuing…" : "Queue reply"}</button>
    {state.ok ? <p className="text-sm text-stone-600">Reload this page to compose another reply.</p> : null}
  </form>;
}
