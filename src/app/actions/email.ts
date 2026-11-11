"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { deliverQueuedEmails } from "@/db/email-delivery";
import { emailConfigurationError } from "@/lib/email";

export type EmailDeliveryState = { message?: string; error?: string };
export async function sendQueuedEmailAction(): Promise<EmailDeliveryState> {
  const actor = await getSessionUser();
  if (!actor || actor.isDemo || !can(actor, "notifications.manage")) return { error: "Notification administrator access required." };
  const error = emailConfigurationError(); if (error) return { error };
  const results = await deliverQueuedEmails();
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/people");
  return { message: results.length ? `Processed ${results.length} queued messages. Check their delivery status below.` : "No email is due for delivery." };
}
