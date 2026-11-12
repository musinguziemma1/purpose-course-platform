"use server";

import { headers } from "next/headers";
import { submitContactEnquiry } from "@/db/contact-inbox";
import { getSessionUser } from "@/lib/auth";
import { contactRateKey } from "@/lib/contact";

export type ContactState = { ok?: boolean; error?: string; message?: string };

export async function sendContactMessage(_prev: ContactState, form: FormData): Promise<ContactState> {
  try {
    return await submitContactEnquiry({
      submissionId: String(form.get("submissionId") ?? ""),
      fullName: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""),
      subject: String(form.get("subject") ?? ""), body: String(form.get("body") ?? ""),
      website: String(form.get("website") ?? ""),
    }, await getSessionUser(), contactRateKey(await headers()));
  } catch {
    return { error: "We could not save your enquiry. Please try again later or use the contact details on this page." };
  }
}
