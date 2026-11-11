"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { acceptInvitationAction, type InvitationState } from "@/app/actions/invitations";
import { Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function InvitationForm() {
  const token = useRef("");
  const [state, action, pending] = useActionState<InvitationState, FormData>(acceptInvitationAction, {});
  useEffect(() => {
    const value = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    if (value) token.current = value;
  }, []);
  function submit(form: FormData) {
    // React resets uncontrolled form fields after actions, including validation errors.
    // Keep the URL token independently so a corrected password submission can succeed.
    form.set("token", token.current);
    action(form);
  }
  if (state.ok) return <div role="status" className="space-y-4"><p>Your account is active. Sign in with your email address and new password.</p><Link href="/login" className="font-semibold text-navy underline">Continue to sign in</Link></div>;
  return <form action={submit} className="space-y-4">
    <div><Label htmlFor="invite-password">New password</Label><Input id="invite-password" name="password" type="password" autoComplete="new-password" minLength={15} maxLength={128} required disabled={pending} /></div>
    <div><Label htmlFor="invite-confirmation">Confirm password</Label><Input id="invite-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={15} maxLength={128} required disabled={pending} /></div>
    <p className="text-xs text-stone-600">Use 15 to 128 characters. A phrase of several words works well.</p>
    {state.error ? <p role="alert" className="text-sm text-rose-700">{state.error}</p> : null}
    <p className="text-xs text-stone-600">Open this page from your invitation email. If you refreshed, open the email link again.</p>
    <Button type="submit" disabled={pending}>{pending ? "Activating..." : "Activate account"}</Button>
  </form>;
}
