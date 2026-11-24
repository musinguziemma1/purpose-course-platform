"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { archiveAnnouncement, saveAnnouncement, type AnnouncementState } from "@/db/announcements";

function refresh() {
  for (const path of ["/admin/announcements", "/learn", "/mentor", "/admin"]) revalidatePath(path);
}

export async function saveAnnouncementAction(_previous: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  const input: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") input[key] = value;
  const result = await saveAnnouncement(input, await getSessionUser(), formData.get("intent") === "publish");
  if (result.ok) refresh();
  return result;
}

export async function archiveAnnouncementAction(_previous: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  const result = await archiveAnnouncement(Number(formData.get("id")), Number(formData.get("version")), await getSessionUser());
  if (result.ok) refresh();
  return result;
}
