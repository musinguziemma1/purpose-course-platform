"use server";

import { revalidatePath } from "next/cache";
import { queueContactReply, updateContactEnquiry } from "@/db/contact-inbox";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { emailConfigurationError } from "@/lib/email";

export type ContactStaffState = { ok?: boolean; error?: string; message?: string };
function refresh(id: string) {
  revalidatePath("/admin/contact");
  revalidatePath(`/admin/contact/${id}`);
}

export async function changeContactStatus(_prev: ContactStaffState, form: FormData): Promise<ContactStaffState> {
  const id = String(form.get("id") ?? "");
  try {
    const result = await updateContactEnquiry({ id, version: Number(form.get("version") ?? -1), status: String(form.get("status") ?? ""), claim: form.get("claim") === "on" }, await getSessionUser());
    if (result.ok) refresh(id);
    return result;
  } catch { return { error: "The enquiry could not be updated. Refresh and try again." }; }
}

export async function replyToContact(_prev: ContactStaffState, form: FormData): Promise<ContactStaffState> {
  const actor = await getSessionUser();
  if (!actor || actor.isDemo || !can(actor, "contact.manage")) return { error: "Contact inbox permission required." };
  const configurationError = emailConfigurationError();
  if (configurationError) return { error: configurationError };
  const id = String(form.get("id") ?? "");
  try {
    const result = await queueContactReply({ id, replyId: String(form.get("replyId") ?? ""), body: String(form.get("body") ?? ""), recipientEmail: String(form.get("recipientEmail") ?? "") }, actor);
    if (result.ok) refresh(id);
    return result;
  } catch { return { error: "The reply could not be queued. Refresh to check the reply history before trying again." }; }
}
