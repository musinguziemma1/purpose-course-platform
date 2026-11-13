"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requestAdmission, reviewAdmission } from "@/db/admissions";
import { getSessionUser } from "@/lib/auth";
import { contactRateKey } from "@/lib/contact";
export type AdmissionState = { ok?: boolean; error?: string; message?: string };
export async function applyForAccount(
  _previous: AdmissionState,
  form: FormData,
): Promise<AdmissionState> {
  const password = String(form.get("password") ?? "");
  if (password !== String(form.get("confirmPassword") ?? ""))
    return { error: "Your passwords do not match." };
  try {
    return await requestAdmission(
      {
        email: String(form.get("email") ?? ""),
        fullName: String(form.get("fullName") ?? ""),
        password,
        notes: String(form.get("notes") ?? ""),
        consent: form.get("consent") === "on",
        website: String(form.get("website") ?? ""),
      },
      contactRateKey(await headers()),
    );
  } catch {
    return {
      error:
        "Your application could not be saved. Please try again shortly or contact the course team.",
    };
  }
}
export async function decideAdmission(
  _previous: AdmissionState,
  form: FormData,
): Promise<AdmissionState> {
  const decision = String(form.get("decision") ?? "");
  if (decision !== "approve" && decision !== "decline")
    return { error: "Choose approve or decline." };
  const result = await reviewAdmission(
    String(form.get("id") ?? ""),
    decision,
    await getSessionUser(),
  );
  if ("ok" in result && result.ok) {
    revalidatePath("/admin/admissions");
    revalidatePath("/admin/people");
    revalidatePath("/admin/students");
  }
  return result;
}
