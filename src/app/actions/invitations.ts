"use server";

import { acceptInvitation } from "@/db/invitations";

export type InvitationState = { ok?: boolean; error?: string };
export async function acceptInvitationAction(_previous: InvitationState, form: FormData): Promise<InvitationState> {
  const password = String(form.get("password") ?? "");
  if (password !== String(form.get("confirmation") ?? "")) return { error: "The passwords do not match." };
  return acceptInvitation(String(form.get("token") ?? ""), password);
}
