"use server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { enrollInNextLevel } from "@/db/level-progression";
export type ProgressionState = {
  ok?: boolean;
  error?: string;
  message?: string;
};
export async function activateNextLevel(
  _previous: ProgressionState,
  form: FormData,
): Promise<ProgressionState> {
  const result = await enrollInNextLevel(
    Number(form.get("levelId")),
    await getSessionUser(),
  );
  if ("ok" in result && result.ok) revalidatePath("/learn", "layout");
  return result;
}
