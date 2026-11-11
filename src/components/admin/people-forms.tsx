"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, MailPlus, ShieldCheck } from "lucide-react";
import { inviteAccount, updateProfileRole, type PeopleState } from "@/app/actions/people";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

function Note({ state }: { state: PeopleState }) {
  if (state.error) {
    return <p className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11.5px] text-rose-700">{state.error}</p>;
  }
  if (state.ok) {
    return <p className="rounded-md border border-source/30 bg-source/5 px-2.5 py-2 text-[11.5px] text-source">{state.message}</p>;
  }
  return null;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
      {pending ? "Saving…" : "Update"}
    </Button>
  );
}

export function RoleForm({
  profileId,
  currentRole,
  roles,
  disabled,
}: {
  profileId: string;
  currentRole: string;
  roles: { slug: string; name: string }[];
  disabled?: boolean;
}) {
  const [state, formAction] = useActionState<PeopleState, FormData>(updateProfileRole, {});
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="profileId" value={profileId} />
      <Select name="roleSlug" defaultValue={currentRole} disabled={disabled} className="h-9 w-32 text-[11.5px]">
        {roles.map((role) => (
          <option key={role.slug} value={role.slug}>
            {role.name}
          </option>
        ))}
      </Select>
      <SaveButton />
      {state.error || state.ok ? <div className="w-full"><Note state={state} /></div> : null}
    </form>
  );
}

export function InviteForm({ roles, configurationError }: { roles: { slug: string; name: string }[]; configurationError: string | null }) {
  const [state, formAction, pending] = useActionState<PeopleState, FormData>(inviteAccount, {});
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="invite-name">Full name</Label>
        <Input id="invite-name" name="fullName" required maxLength={160} autoComplete="name" disabled={pending} />
      </div>
      <div>
        <Label htmlFor="invite-email">Email address</Label>
        <Input id="invite-email" name="email" type="email" required maxLength={255} autoComplete="email" disabled={pending} placeholder="new.colleague@example.org" className="text-[12.5px]" />
      </div>
      <div>
        <Label htmlFor="invite-role">Workspace role</Label>
        <Select id="invite-role" name="roleSlug" defaultValue="student" disabled={pending} className="text-[12.5px]">
          {roles.map((role) => (
            <option key={role.slug} value={role.slug}>
              {role.name}
            </option>
          ))}
        </Select>
      </div>
      <Note state={state} />
      {configurationError ? <p role="status" className="text-xs text-amber-800">{configurationError}</p> : null}
      <Button type="submit" size="sm" className="w-full" disabled={pending || !!configurationError}>
        <MailPlus className="h-3.5 w-3.5" /> {pending ? "Queuing..." : "Queue invitation"}
      </Button>
      <p className="text-[10.5px] leading-relaxed text-stone-500">
        Resend delivers a password setup link that expires in 48 hours. Queuing a new invitation replaces any pending link for that address.
      </p>
    </form>
  );
}
