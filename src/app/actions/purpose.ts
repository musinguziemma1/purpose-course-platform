"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { savePurposeProfile, type ProfileSaveState } from "@/db/purpose-journey";

export async function savePurposeProfileAction(_previous: ProfileSaveState, formData: FormData): Promise<ProfileSaveState> {
  const input: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") input[key] = value;
  const result = await savePurposeProfile(input, await getSessionUser());
  if (result.ok) {
    revalidatePath("/learn/profile");
    revalidatePath("/learn/journey");
    revalidatePath("/learn");
  }
  return result;
}
