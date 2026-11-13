"use server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import {
  changeCohortMember,
  manageEnrolment,
  saveCohortSetup,
  type CohortInput,
} from "@/db/cohort-enrolments";
export type CohortState = {
  ok?: boolean;
  error?: string;
  message?: string;
  id?: number;
};
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
async function refresh() {
  for (const path of [
    "/admin/cohorts",
    "/admin/programme",
    "/admin/enrollments",
    "/admin/students",
    "/learn/cohort",
    "/learn/courses",
    "/learn/live",
    "/mentor/live",
    "/events",
  ])
    revalidatePath(path);
  revalidatePath("/admin/cohorts/[id]", "page");
}
export async function saveCohort(
  _prev: CohortState,
  form: FormData,
): Promise<CohortState> {
  const input: CohortInput = {
    id: Number(form.get("cohortId")) || undefined,
    version: text(form, "version"),
    name: text(form, "name"),
    description: text(form, "description"),
    levelId: Number(form.get("levelId")),
    courseId: Number(form.get("courseId")) || null,
    capacity: Number(form.get("capacity")),
    startsAt: text(form, "startsAt"),
    endsAt: /^\d{4}-\d{2}-\d{2}$/.test(text(form, "endsAt"))
      ? text(form, "endsAt") + "T23:59:59.999Z"
      : text(form, "endsAt"),
    cadence: text(form, "cadence"),
    status: text(form, "status") || "draft",
    weeks: text(form, "weeks"),
  };
  const result = await saveCohortSetup(input, await getSessionUser());
  if ("ok" in result && result.ok) await refresh();
  return result;
}
export async function saveCohortMember(
  _prev: CohortState,
  form: FormData,
): Promise<CohortState> {
  const result = await changeCohortMember(
    {
      cohortId: Number(form.get("cohortId")),
      profileId: text(form, "profileId"),
      role: text(form, "role"),
      status: text(form, "status") || "active",
    },
    await getSessionUser(),
  );
  if ("ok" in result && result.ok) await refresh();
  return result;
}
export async function saveEnrolment(
  _prev: CohortState,
  form: FormData,
): Promise<CohortState> {
  const result = await manageEnrolment(
    {
      id: text(form, "enrolmentId"),
      version: text(form, "version"),
      status: text(form, "status"),
      cohortId: Number(form.get("cohortId")) || null,
      notes: text(form, "notes"),
    },
    await getSessionUser(),
  );
  if ("ok" in result && result.ok) await refresh();
  return result;
}
