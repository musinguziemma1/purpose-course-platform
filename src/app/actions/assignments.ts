"use server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import {
  createLearningAssignment,
  gradeAssignment,
  saveAssignmentResponse,
} from "@/db/assignment-workflow";
export type AssignmentState = {
  ok?: boolean;
  error?: string;
  message?: string;
};
function refresh() {
  revalidatePath("/mentor", "layout");
  revalidatePath("/learn", "layout");
  revalidatePath("/admin/assignments");
}
export async function publishAssignment(
  _previous: AssignmentState,
  form: FormData,
): Promise<AssignmentState> {
  const text = (key: string) => String(form.get(key) ?? "");
  const result = await createLearningAssignment(
    {
      title: text("title"),
      brief: text("brief"),
      levelId: Number(form.get("levelId")),
      assigneeId: text("assigneeId"),
      dueAt: text("dueAt"),
      attachmentId: text("attachmentId"),
    },
    await getSessionUser(),
  );
  if ("ok" in result && result.ok) refresh();
  return result;
}
export async function saveResponse(
  _previous: AssignmentState,
  form: FormData,
): Promise<AssignmentState> {
  const result = await saveAssignmentResponse(
    {
      assignmentId: Number(form.get("assignmentId")),
      body: String(form.get("body") ?? ""),
      asDraft: form.get("intent") === "draft",
      attachmentId: String(form.get("attachmentId") ?? ""),
      version: String(form.get("version") ?? ""),
    },
    await getSessionUser(),
  );
  if ("ok" in result && result.ok) refresh();
  return result;
}
export async function reviewResponse(
  _previous: AssignmentState,
  form: FormData,
): Promise<AssignmentState> {
  const result = await gradeAssignment(
    {
      submissionId: Number(form.get("submissionId")),
      feedback: String(form.get("feedback") ?? ""),
      score:
        form.get("score") === null || form.get("score") === ""
          ? NaN
          : Number(form.get("score")),
      version: String(form.get("version") ?? ""),
    },
    await getSessionUser(),
  );
  if ("ok" in result && result.ok) refresh();
  return result;
}
