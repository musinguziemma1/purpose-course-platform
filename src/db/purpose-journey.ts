import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  courseModules,
  courses,
  enrollments,
  instrumentResults,
  instruments,
  learnerGoals,
  lessonProgress,
  lessons,
  modulePrinciples,
  purposeProfileSnapshots,
  purposeProfiles,
  reflectionPrinciples,
  reflections,
} from "@/db/schema";
import { whenSchemaReady } from "@/db/schema-readiness";
import type { SessionUser } from "@/lib/auth";
import { currentActor } from "@/db/actor";
import { canReadLearner } from "@/db/learner-access";
import {
  EMPTY_PURPOSE_PROFILE,
  INSTRUMENT_PRINCIPLES,
  PRINCIPLE_INFO,
  PRINCIPLE_KEYS,
  goalIsDone,
  inferPrinciple,
  journeyStages,
  principleScore,
  profileChecks,
  type EvidenceScores,
  type PrincipleKey,
  type PurposeProfileFields,
} from "@/lib/purpose-journey";

export type PurposeProfileRecord = PurposeProfileFields & { sharedWithMentor: boolean; version: number; updatedAt: Date | null };
export type ProfileSaveState = { ok?: boolean; error?: string; message?: string; version?: number };

const TEXT_LIMITS: Record<string, number> = {
  identityStatement: 1200, story: 3000, influences: 1500, purposeStatement: 600, contribution: 1500,
  developmentObjectives: 1500, vision: 2000, careerDirection: 1200, impactAspirations: 1500,
};
const LIST_FIELDS = ["coreValues", "strengths", "interests", "skills", "developmentAreas"] as const;
const LIST_LABELS: Record<(typeof LIST_FIELDS)[number], string> = {
  coreValues: "core values", strengths: "strengths", interests: "interests", skills: "skills", developmentAreas: "development areas",
};

function fieldsFrom(row: typeof purposeProfiles.$inferSelect | undefined): PurposeProfileRecord {
  if (!row) return { ...EMPTY_PURPOSE_PROFILE, sharedWithMentor: false, version: 0, updatedAt: null };
  return {
    identityStatement: row.identityStatement, coreValues: row.coreValues, strengths: row.strengths, interests: row.interests,
    story: row.story, influences: row.influences, purposeStatement: row.purposeStatement, contribution: row.contribution,
    skills: row.skills, developmentAreas: row.developmentAreas, developmentObjectives: row.developmentObjectives,
    vision: row.vision, careerDirection: row.careerDirection, impactAspirations: row.impactAspirations,
    sharedWithMentor: row.sharedWithMentor, version: row.version, updatedAt: row.updatedAt,
  };
}

/** Normalises a comma/line separated list: trimmed, de-duplicated, bounded. */
export function parseList(value: string) {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const raw of value.split(/[\n,]/)) {
    const item = raw.trim().replace(/\s+/g, " ");
    if (!item || seen.has(item.toLowerCase())) continue;
    seen.add(item.toLowerCase());
    items.push(item);
  }
  return items;
}

/** null when signed out or while the Purpose Profile migration is pending. */
export async function getOwnPurposeProfile(viewer: SessionUser | null) {
  if (!viewer) return null;
  return whenSchemaReady("Purpose Profile", async () => {
    const [row] = await db.select().from(purposeProfiles).where(eq(purposeProfiles.profileId, viewer.profileId)).limit(1);
    return fieldsFrom(row);
  }, null);
}

/** Another person's profile is visible only to their mentors/staff, and only when they chose to share it. */
export async function getSharedPurposeProfile(learnerId: string, viewer: SessionUser | null) {
  if (!viewer) return { profile: null, reason: "signed-out" as const };
  if (viewer.profileId === learnerId) {
    const own = await getOwnPurposeProfile(viewer);
    return own ? { profile: own, reason: null } : { profile: null, reason: "unavailable" as const };
  }
  if (!(await canReadLearner(learnerId, viewer))) return { profile: null, reason: "forbidden" as const };
  const row = await whenSchemaReady("Purpose Profile", async () => (await db.select().from(purposeProfiles).where(eq(purposeProfiles.profileId, learnerId)).limit(1))[0] ?? null, undefined);
  if (row === undefined) return { profile: null, reason: "unavailable" as const };
  if (!row?.sharedWithMentor) return { profile: null, reason: "not-shared" as const };
  return { profile: fieldsFrom(row), reason: null };
}

export async function getPurposeProfileHistory(learnerId: string, viewer: SessionUser | null) {
  const access = await getSharedPurposeProfile(learnerId, viewer);
  if (!access.profile) return [];
  const rows = await whenSchemaReady("Purpose Profile", () => db.select({ version: purposeProfileSnapshots.version, snapshot: purposeProfileSnapshots.snapshot, createdAt: purposeProfileSnapshots.createdAt })
    .from(purposeProfileSnapshots).where(eq(purposeProfileSnapshots.profileId, learnerId)).orderBy(desc(purposeProfileSnapshots.version)).limit(12), []);
  return rows.map((row) => ({
    version: row.version,
    createdAt: row.createdAt,
    purposeStatement: typeof row.snapshot.purposeStatement === "string" ? row.snapshot.purposeStatement : null,
    vision: typeof row.snapshot.vision === "string" ? row.snapshot.vision : null,
  }));
}

export async function savePurposeProfile(input: Record<string, string>, viewer: SessionUser | null): Promise<ProfileSaveState> {
  if (!viewer || viewer.isDemo) return { error: "Sign in to save your Purpose Profile." };
  const expectedVersion = Number(input.version);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) return { error: "Refresh the page before saving." };
  const values: PurposeProfileFields = { ...EMPTY_PURPOSE_PROFILE };
  for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
    const text = (input[field] ?? "").trim().replaceAll("\r\n", "\n");
    if (text.length > limit) return { error: `Keep ${field.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)} within ${limit.toLocaleString()} characters.` };
    (values as Record<string, unknown>)[field] = text || null;
  }
  for (const field of LIST_FIELDS) {
    const items = parseList(input[field] ?? "");
    if (items.length > 12) return { error: `List up to 12 ${LIST_LABELS[field]}.` };
    if (items.some((item) => item.length > 60)) return { error: `Keep each of your ${LIST_LABELS[field]} within 60 characters.` };
    values[field] = items;
  }
  const sharedWithMentor = input.sharedWithMentor === "on" || input.sharedWithMentor === "true";

  return whenSchemaReady<ProfileSaveState>("Purpose Profile", () => db.transaction(async (tx) => {
    const actor = await currentActor(tx, viewer);
    if (!actor) return { error: "Your session has ended. Sign in again to save." };
    const [current] = await tx.select({ version: purposeProfiles.version }).from(purposeProfiles).where(eq(purposeProfiles.profileId, actor.profileId)).for("update").limit(1);
    if ((current?.version ?? 0) !== expectedVersion) return { error: "Your profile changed in another window. Refresh to see the latest version before saving." };
    const version = expectedVersion + 1, now = new Date();
    await tx.insert(purposeProfiles).values({ profileId: actor.profileId, ...values, sharedWithMentor, version, updatedAt: now })
      .onConflictDoUpdate({ target: purposeProfiles.profileId, set: { ...values, sharedWithMentor, version, updatedAt: now } });
    await tx.insert(purposeProfileSnapshots).values({ profileId: actor.profileId, version, snapshot: { ...values, sharedWithMentor } });
    await tx.insert(activityLogs).values({ actorId: actor.profileId, action: "purpose_profile.updated", entityType: "purpose_profile", entityId: actor.profileId, description: `Saved Purpose Profile version ${version}${sharedWithMentor ? " (shared with mentors)" : ""}.` });
    return { ok: true, version, message: "Your Purpose Profile is saved." };
  }), { error: "Purpose Profiles are still being set up on this site. Please try again later." });
}

export type JourneyRecommendation = { title: string; detail: string; href: string; principle?: PrincipleKey };

/** Purpose Journey for a learner the viewer may see (themselves, an assigned mentor or staff). */
export async function getPurposeJourney(learnerId: string, viewer: SessionUser | null) {
  if (!viewer) return null;
  if (viewer.profileId !== learnerId && !(await canReadLearner(learnerId, viewer))) return null;
  return whenSchemaReady("Purpose Journey", () => computeJourney(learnerId), null);
}

async function computeJourney(learnerId: string) {

  const enrolledLevels = db.select({ levelId: enrollments.levelId }).from(enrollments)
    .where(and(eq(enrollments.profileId, learnerId), inArray(enrollments.status, ["enrolled", "completed"])));

  const [moduleRows, resultRows, instrumentRows, reflectionRows, profileRow, goalRows] = await Promise.all([
    db.select({
      id: courseModules.id, title: courseModules.title, principle: modulePrinciples.principle, sortOrder: courseModules.sortOrder,
      courseSlug: courses.slug, courseTitle: courses.title,
      lessonCount: sql<number>`count(${lessons.id})::int`,
      completedCount: sql<number>`count(${lessonProgress.lessonId}) filter (where ${lessonProgress.status} = 'completed')::int`,
    }).from(courseModules)
      .innerJoin(courses, eq(courseModules.courseId, courses.id))
      .innerJoin(lessons, and(eq(lessons.moduleId, courseModules.id), eq(lessons.status, "published")))
      .leftJoin(lessonProgress, and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.profileId, learnerId)))
      .leftJoin(modulePrinciples, eq(modulePrinciples.moduleId, courseModules.id))
      .where(and(eq(courses.status, "published"), inArray(courses.levelId, enrolledLevels)))
      .groupBy(courseModules.id, courses.id, modulePrinciples.principle)
      .orderBy(asc(courses.id), asc(courseModules.sortOrder)),
    db.select({ slug: instruments.slug, score: instrumentResults.overallScore, band: instrumentResults.bandLabel, createdAt: instrumentResults.createdAt })
      .from(instrumentResults).innerJoin(instruments, eq(instrumentResults.instrumentId, instruments.id))
      .where(eq(instrumentResults.profileId, learnerId)).orderBy(desc(instrumentResults.createdAt)),
    db.select({ slug: instruments.slug, title: instruments.title }).from(instruments).where(eq(instruments.status, "published")).orderBy(asc(instruments.sortOrder)),
    db.select({ principle: reflectionPrinciples.principle, prompt: reflections.prompt }).from(reflections).leftJoin(reflectionPrinciples, eq(reflectionPrinciples.reflectionId, reflections.id)).where(eq(reflections.authorProfileId, learnerId)),
    db.select().from(purposeProfiles).where(eq(purposeProfiles.profileId, learnerId)).limit(1),
    db.select({ title: learnerGoals.title, status: learnerGoals.status, progress: learnerGoals.progress, dueAt: learnerGoals.dueAt }).from(learnerGoals).where(eq(learnerGoals.studentId, learnerId)),
  ]);

  const profile = fieldsFrom(profileRow[0]);
  const checks = profileChecks(profile);
  const latestResult = new Map<string, { score: number; band: string; createdAt: Date }>();
  for (const row of resultRows) if (!latestResult.has(row.slug)) latestResult.set(row.slug, row);

  const principles = PRINCIPLE_KEYS.map((key) => {
    const modules = moduleRows
      .filter((module) => (module.principle ?? inferPrinciple(module.title)) === key)
      .map((module) => ({ ...module, lessonCount: Number(module.lessonCount), completedCount: Math.min(Number(module.completedCount), Number(module.lessonCount)) }));
    const lessonTotal = modules.reduce((sum, module) => sum + module.lessonCount, 0);
    const lessonDone = modules.reduce((sum, module) => sum + module.completedCount, 0);
    const principleInstruments = instrumentRows
      .filter((instrument) => INSTRUMENT_PRINCIPLES[instrument.slug] === key)
      .map((instrument) => ({ ...instrument, result: latestResult.get(instrument.slug) ?? null }));
    const taken = principleInstruments.filter((instrument) => instrument.result).length;
    const reflectionCount = reflectionRows.filter((row) => (row.principle ?? inferPrinciple(row.prompt)) === key).length;
    const profileDone = checks[key].filter((check) => check.done).length;
    const evidence: EvidenceScores = {
      learn: lessonTotal ? lessonDone / lessonTotal : null,
      assess: principleInstruments.length ? taken / principleInstruments.length : null,
      reflect: Math.min(reflectionCount, 2) / 2,
      profile: profileDone / checks[key].length,
    };
    return {
      key, ...PRINCIPLE_INFO[key], score: principleScore(evidence), evidence,
      learning: { done: lessonDone, total: lessonTotal, modules },
      assessments: principleInstruments, reflections: reflectionCount, checks: checks[key],
    };
  });

  const goals = goalRows.map((goal) => ({ ...goal, progress: Number(goal.progress) }));
  const stages = journeyStages(profile, goals);
  const overall = Math.round(principles.reduce((sum, principle) => sum + principle.score, 0) / principles.length);

  const recommendations: JourneyRecommendation[] = [];
  const profileStarted = Object.values(checks).some((items) => items.some((item) => item.done));
  if (!profileStarted) recommendations.push({ title: "Start your Purpose Profile", detail: "Capture your values, strengths, story and vision. It anchors every other step.", href: "/learn/profile" });
  for (const principle of [...principles].sort((a, b) => a.score - b.score).slice(0, 2)) {
    const nextModule = principle.learning.modules.find((module) => module.completedCount < module.lessonCount);
    const untaken = principle.assessments.find((instrument) => !instrument.result);
    const missingCheck = principle.checks.find((check) => !check.done);
    const options: [number, JourneyRecommendation | null][] = [
      [principle.evidence.learn ?? 1, nextModule ? { title: `Continue ${nextModule.title}`, detail: `${nextModule.completedCount} of ${nextModule.lessonCount} lessons complete · ${principle.name}`, href: `/learn/courses/${nextModule.courseSlug}`, principle: principle.key } : null],
      [principle.evidence.assess ?? 1, untaken ? { title: `Take the ${untaken.title} assessment`, detail: `Measures your ${principle.name.toLowerCase()} development · about 10 minutes`, href: `/learn/instruments/${untaken.slug}`, principle: principle.key } : null],
      [principle.evidence.profile ?? 1, missingCheck ? { title: missingCheck.label, detail: `${principle.name} section of your Purpose Profile`, href: `/learn/profile#principle-${principle.key}`, principle: principle.key } : null],
      [principle.evidence.reflect ?? 1, { title: `Reflect on ${principle.name}: ${principle.question}`, detail: principle.focus, href: `/learn/reflections?principle=${principle.key}`, principle: principle.key }],
    ];
    const best = options.filter((option): option is [number, JourneyRecommendation] => option[1] !== null).sort((a, b) => a[0] - b[0])[0];
    if (best && best[0] < 1 && !recommendations.some((item) => item.href === best[1].href)) recommendations.push(best[1]);
  }
  const now = Date.now();
  const overdue = goals.find((goal) => goal.status === "active" && !goalIsDone(goal) && goal.dueAt && goal.dueAt.getTime() < now);
  if (overdue) recommendations.push({ title: `Review your goal “${overdue.title}”`, detail: "This goal is past its review date. Update progress or agree a new date with your mentor.", href: "/learn/goals" });
  else if (!goals.length) recommendations.push({ title: "Set your first goal", detail: "Turn your vision into a goal your mentor can help you review.", href: "/learn/goals" });

  return { principles, overall, stages, recommendations: recommendations.slice(0, 4), profileStarted, profileUpdatedAt: profile.updatedAt };
}

export type PurposeJourney = NonNullable<Awaited<ReturnType<typeof getPurposeJourney>>>;
