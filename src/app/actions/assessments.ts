"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, max } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  assessmentQuestions,
  assessments,
  courseGroups,
  courseLevels,
  courseModules,
  courses,
  groupMembers,
  groupSubmissions,
  notifications,
  profiles,
} from "@/db/schema";
import { canManageAssessments, getSessionUser, isMentor, isStudent } from "@/lib/auth";
import { canCoachLearner, groupReviewable } from "@/db/learner-access";
import { issueCertificate } from "@/db/assessments";
import { completeAssessment } from "@/db/assessment-taking";

export type AssessmentState = { ok?: boolean; error?: string; message?: string };

async function log(actorId: string | undefined, action: string, description: string, entityId?: string) {
  await db.insert(activityLogs).values({
    actorId: actorId ?? null,
    action,
    entityType: "assessment",
    entityId: entityId ?? null,
    description,
  });
}

function refreshPaths() {
  revalidatePath("/learn");
  revalidatePath("/learn/assessments");
  revalidatePath("/learn/certificates");
  revalidatePath("/learn/groups");
  revalidatePath("/mentor/assessments");
  revalidatePath("/mentor/groups");
  revalidatePath("/admin/academy/assessments");
  revalidatePath("/admin/people");
}

/* ------------------------------------------------------------------ *
 * Student submission (auto-graded)
 * ------------------------------------------------------------------ */

export async function submitAssessmentAttempt(input: {
  assessmentId: number; sessionId: string; selections: { questionId: number; selectedIndex: number }[];
}) {
  const user = await getSessionUser();
  if (!user || !isStudent(user)) return { error: "Sign in with a student account to submit an assessment." } as const;
  const result = await completeAssessment(input, user).catch(() => ({ error: "Your attempt could not be saved. No result was committed; retry with the same session." } as const));
  if ("error" in result) return { error: result.error ?? "The assessment could not be submitted." } as const;
  refreshPaths();
  return { ok: true as const, attemptId: result.attempt.id, score: result.attempt.score, passed: result.attempt.passed,
    passMark: result.attempt.passMark, correctCount: result.attempt.correctCount, totalCount: result.attempt.totalCount,
    certificateCode: result.certificate?.code ?? null, newlyIssued: result.newlyIssued };
}

/* ------------------------------------------------------------------ *
 * Admin authoring
 * ------------------------------------------------------------------ */

export async function createAssessment(_prev: AssessmentState, formData: FormData): Promise<AssessmentState> {
  const user = await getSessionUser();
  if (!user || !canManageAssessments(user)) return { error: "Administrator access required." };

  const kind = String(formData.get("kind") ?? "session");
  const title = String(formData.get("title") ?? "").trim();
  let levelId = Number(formData.get("levelId") ?? 0) || null;
  const courseId = Number(formData.get("courseId") ?? 0) || null;
  const moduleId = Number(formData.get("moduleId") ?? 0) || null;
  const passMark = Number(formData.get("passMark") ?? 80) || 80;
  const timeLimitMinutes = Number(formData.get("timeLimitMinutes") ?? 15);
  const maxAttempts = Number(formData.get("maxAttempts") ?? 3);

  if (title.length < 4) return { error: "Give the assessment a title." };
  if (!levelId && !courseId) return { error: "Choose a level or a course." };
  if (!["session", "level"].includes(kind) || !Number.isInteger(passMark) || passMark < 50 || passMark > 100 || !Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 1 || timeLimitMinutes > 240 || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) return { error: "Choose valid assessment settings (1–240 minutes and 1–20 attempts)." };
  if (courseId) {
    const [course] = await db.select({ levelId: courses.levelId }).from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course || levelId && levelId !== course.levelId) return { error: "The course must belong to the selected level." };
    levelId = course.levelId;
  }
  if (moduleId) {
    const [module] = await db.select({ courseId: courseModules.courseId }).from(courseModules).where(eq(courseModules.id, moduleId)).limit(1);
    if (!module || module.courseId !== courseId) return { error: "The module must belong to the selected course." };
  }

  const [orderRow] = await db
    .select({ value: max(assessments.sortOrder) })
    .from(assessments)
    .where(levelId ? eq(assessments.levelId, levelId) : eq(assessments.courseId, courseId as number));

  const [created] = await db
    .insert(assessments)
    .values({
      kind: kind === "level" ? "level" : "session",
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      levelId,
      courseId,
      moduleId: kind === "level" ? null : moduleId,
      passMark: Math.min(100, Math.max(50, passMark)),
      timeLimitMinutes,
      maxAttempts,
      status: "published",
      sortOrder: Number(orderRow?.value ?? 0) + 1,
    })
    .returning({ id: assessments.id });

  await log(user.profileId, "assessment.created", `Created the assessment “${title}”.`, String(created.id));
  refreshPaths();
  redirect(`/admin/academy/assessments/${created.id}`);
}

export async function addQuestion(_prev: AssessmentState, formData: FormData): Promise<AssessmentState> {
  const user = await getSessionUser();
  if (!user || !canManageAssessments(user)) return { error: "Administrator access required." };

  const assessmentId = Number(formData.get("assessmentId"));
  const prompt = String(formData.get("prompt") ?? "").trim();
  const options = [0, 1, 2, 3, 4]
    .map((index) => String(formData.get(`option${index}`) ?? "").trim())
    .filter(Boolean);
  const correctIndex = Number(formData.get("correctIndex") ?? 0);

  if (!assessmentId) return { error: "Missing assessment." };
  if (prompt.length < 10) return { error: "Write the question in full." };
  if (options.length < 2) return { error: "Provide at least two answer options." };
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) return { error: "Choose which option is correct." };

  const [orderRow] = await db
    .select({ value: max(assessmentQuestions.sortOrder) })
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessmentId));

  await db.insert(assessmentQuestions).values({
    assessmentId,
    prompt,
    options,
    correctIndex,
    explanation: String(formData.get("explanation") ?? "").trim() || null,
    sortOrder: Number(orderRow?.value ?? 0) + 1,
  });

  await log(user.profileId, "assessment.question_added", `Added a question to assessment #${assessmentId}.`);
  revalidatePath(`/admin/academy/assessments/${assessmentId}`);
  refreshPaths();
  return { ok: true, message: "Question added and auto-grading will include it." };
}

export async function deleteQuestion(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !canManageAssessments(user)) return;
  const questionId = Number(formData.get("questionId"));
  const assessmentId = Number(formData.get("assessmentId"));
  if (!questionId) return;
  await db.delete(assessmentQuestions).where(eq(assessmentQuestions.id, questionId));
  revalidatePath(`/admin/academy/assessments/${assessmentId}`);
}

export async function updatePassMark(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !canManageAssessments(user)) return;
  const levelId = Number(formData.get("levelId"));
  const passMark = Math.min(100, Math.max(50, Number(formData.get("passMark") ?? 80)));
  if (!levelId || !Number.isInteger(passMark)) return;
  await db.update(courseLevels).set({ passMark }).where(eq(courseLevels.id, levelId));
  await db.update(assessments).set({ passMark }).where(and(eq(assessments.levelId, levelId), eq(assessments.kind, "level")));
  await log(user.profileId, "assessment.pass_mark", `Set level #${levelId} pass mark to ${passMark}%.`);
  refreshPaths();
  revalidatePath("/admin/academy");
}

/* ------------------------------------------------------------------ *
 * Group work
 * ------------------------------------------------------------------ */

export async function createGroup(_prev: AssessmentState, formData: FormData): Promise<AssessmentState> {
  const user = await getSessionUser();
  if (!user || (!canManageAssessments(user) && !isMentor(user))) return { error: "Mentor or administrator access required." };

  const name = String(formData.get("name") ?? "").trim();
  const courseId = Number(formData.get("courseId") ?? 0) || null;
  const memberIds = formData.getAll("memberIds").map((value) => String(value)).filter(Boolean).slice(0, 8);
  if (name.length < 3) return { error: "Give the group a name." };
  if (memberIds.length < 2) return { error: "Select at least two students for collaborative work." };
  for (const memberId of memberIds) if (!(await canCoachLearner(memberId, user))) return { error: "A selected learner is not assigned to you." };

  const [group] = await db
    .insert(courseGroups)
    .values({
      name,
      brief: String(formData.get("brief") ?? "").trim() || null,
      courseId,
      mentorId: user.profileId,
    })
    .returning({ id: courseGroups.id });

  await db
    .insert(groupMembers)
    .values(memberIds.map((profileId) => ({ groupId: group.id, profileId, role: memberIds[0] === profileId ? "lead" : "member" })))
    .onConflictDoNothing();

  await db.insert(notifications).values(
    memberIds.map((profileId) => ({
      recipientId: profileId,
      type: "community" as const,
      title: "You have been added to a group",
      body: `${user.fullName} placed you in “${name}” for collaborative work.`,
      href: "/learn/groups",
    })),
  );

  await log(user.profileId, "academy.group_created", `Created the group “${name}” with ${memberIds.length} members.`);
  refreshPaths();
  return { ok: true, message: `“${name}” formed. Students have been notified.` };
}

export async function saveGroupSubmission(_prev: AssessmentState, formData: FormData): Promise<AssessmentState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." };
  const groupId = Number(formData.get("groupId"));
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const asDraft = String(formData.get("intent") ?? "submit") === "draft";
  if (!groupId) return { error: "Missing group." };
  if (title.length < 5) return { error: "Give the group deliverable a title." };
  if (body.length < 40) return { error: "Write at least a paragraph (40+ characters) of group output." };

  const membership = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.profileId, user.profileId)))
    .limit(1);
  if (!membership[0] && !canManageAssessments(user) && !isMentor(user)) return { error: "You are not a member of that group." };

  const existing = await db.select().from(groupSubmissions).where(eq(groupSubmissions.groupId, groupId)).limit(1);

  if (existing[0]) {
    await db
      .update(groupSubmissions)
      .set({
        title,
        body,
        status: asDraft ? "draft" : "submitted",
        submittedById: user.profileId,
        submittedAt: asDraft ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(groupSubmissions.id, existing[0].id));
  } else {
    await db.insert(groupSubmissions).values({
      groupId,
      title,
      body,
      status: asDraft ? "draft" : "submitted",
      submittedById: user.profileId,
      submittedAt: asDraft ? null : new Date(),
    });
  }

  const groupRows = await db.select().from(courseGroups).where(eq(courseGroups.id, groupId)).limit(1);
  if (!asDraft && groupRows[0]?.mentorId) {
    await db.insert(notifications).values({
      recipientId: groupRows[0].mentorId,
      type: "review",
      title: "Group work submitted",
      body: `“${groupRows[0].name}” submitted “${title}”.`,
      href: "/mentor/groups",
    });
  }

  await log(user.profileId, asDraft ? "academy.group_draft" : "academy.group_submitted", `${asDraft ? "Drafted" : "Submitted"} group work “${title}”.`);
  refreshPaths();
  revalidatePath("/mentor/groups");
  return { ok: true, message: asDraft ? "Group draft saved." : "Group work submitted to your mentor." };
}

export async function gradeGroupSubmission(_prev: AssessmentState, formData: FormData): Promise<AssessmentState> {
  const user = await getSessionUser();
  if (!user || (!isMentor(user) && !canManageAssessments(user))) return { error: "Mentor access required." };
  const submissionId = Number(formData.get("submissionId"));
  const score = Math.min(100, Math.max(0, Number(formData.get("score") ?? 0)));
  const feedback = String(formData.get("feedback") ?? "").trim();
  if (!submissionId) return { error: "Missing submission." };
  if (!Number.isFinite(score)) return { error: "Choose a valid score." };
  if (feedback.length < 15) return { error: "Add informative feedback (15+ characters) alongside the score." };

  const rows = await db
    .select({ submission: groupSubmissions, group: courseGroups })
    .from(groupSubmissions)
    .innerJoin(courseGroups, eq(groupSubmissions.groupId, courseGroups.id))
    .where(and(eq(groupSubmissions.id, submissionId), groupReviewable(user)))
    .limit(1);
  const record = rows[0];
  if (!record) return { error: "Submission not found." };

  await db
    .update(groupSubmissions)
    .set({ score, feedback, status: "reviewed", reviewedById: user.profileId, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(groupSubmissions.id, submissionId));

  const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, record.group.id));
  if (members.length) {
    await db.insert(notifications).values(
      members.map((member) => ({
        recipientId: member.profileId,
        type: "review" as const,
        title: `Group work scored ${score}%`,
        body: `“${record.submission.title}” has been reviewed with feedback.`,
        href: "/learn/groups",
      })),
    );
  }

  await log(user.profileId, "academy.group_scored", `Scored “${record.submission.title}” at ${score}%.`);
  refreshPaths();
  revalidatePath("/mentor/groups");
  return { ok: true, message: `Scored ${score}% and shared feedback with ${members.length} group members.` };
}

export async function issueCertificateForCourse(_prev: AssessmentState, formData: FormData): Promise<AssessmentState> {
  const user = await getSessionUser();
  if (!user || !canManageAssessments(user)) return { error: "Administrator access required." };
  const profileId = String(formData.get("profileId") ?? "");
  const courseId = Number(formData.get("courseId") ?? 0);
  if (!profileId || !courseId) return { error: "Choose a student and course." };
  if (!(await canCoachLearner(profileId, user))) return { error: "Learner oversight or assignment is required." };

  const courseRows = await db
    .select({ course: courses, levelName: courseLevels.name })
    .from(courses)
    .innerJoin(courseLevels, eq(courses.levelId, courseLevels.id))
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!courseRows[0]) return { error: "Course not found." };

  const certificate = await issueCertificate({
    profileId,
    kind: "course",
    courseId,
    levelId: courseRows[0].course.levelId,
    title: courseRows[0].course.title,
    levelName: courseRows[0].levelName,
    score: Number(formData.get("score") ?? 0) || null,
    hours: courseRows[0].course.estimatedHours,
  });

  refreshPaths();
  return certificate
    ? { ok: true, message: `Certificate ${certificate.code} issued.` }
    : { error: "Could not issue that certificate." };
}

