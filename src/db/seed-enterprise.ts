import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  achievements,
  assessmentAttempts,
  courses,
  dataChanges,
  discussionThreads,
  emailEvents,
  engagementSnapshots,
  learnerAchievements,
  learningActivities,
  learningEvents,
  lessons,
  messages,
  notificationOutbox,
  permissions,
  platformEvents,
  profiles,
  rolePermissions,
  roles,
  scoringRules,
  securityEvents,
} from "./schema";
import { analyticsReports } from "./schema";
import { PERMISSION_LIST, ROLE_DEFINITIONS } from "../lib/rbac";

const daysAgo = (days: number, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

export async function seedEnterprise() {
  /* ---------------- permissions + role_permissions ---------------- */
  const perms = await db
    .insert(permissions)
    .values(
      PERMISSION_LIST.map((permission) => ({
        key: permission.key,
        label: permission.label,
        module: permission.key.split(".")[0],
        description: permission.label,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: permissions.id, key: permissions.key });

  const roleRows = await db.select().from(roles);
  const rolePermissionValues = ROLE_DEFINITIONS.flatMap((definition) => {
    const role = roleRows.find((row) => row.slug === definition.slug);
    if (!role) return [];
    return definition.permissions.map((permission) => ({ roleId: role.id, permissionKey: permission }));
  });
  if (rolePermissionValues.length) await db.insert(rolePermissions).values(rolePermissionValues).onConflictDoNothing();

  /* ---------------- achievements ---------------- */
  const achievementRows = await db
    .insert(achievements)
    .values([
      { slug: "first-steps", name: "First Steps", description: "Completed your first academy lesson.", icon: "book", criteria: "1 lesson completed", points: 10, category: "learning" },
      { slug: "identity-explorer", name: "Identity Explorer", description: "Completed the Identity principle sessions.", icon: "user", criteria: "All Identity lessons completed", points: 25, category: "learning" },
      { slug: "assessment-pass", name: "Tested and True", description: "Passed a session assessment at 80% or above.", icon: "target", criteria: "1 passed assessment", points: 20, category: "assessments" },
      { slug: "instrument-honesty", name: "Honest Mirror", description: "Completed a Purpose Course assessment instrument.", icon: "compass", criteria: "1 instrument completed", points: 15, category: "assessments" },
      { slug: "community-voice", name: "Community Voice", description: "Opened a discussion that received a reply.", icon: "message", criteria: "1 thread with replies", points: 15, category: "community" },
      { slug: "cohort-faithful", name: "Cohort Faithful", description: "Attended three live sessions.", icon: "calendar", criteria: "3 present or late attendance records", points: 25, category: "sessions" },
      { slug: "goal-achieved", name: "Goal Achieved", description: "Completed a development goal with your mentor.", icon: "flag", criteria: "1 achieved goal", points: 30, category: "mentorship" },
      { slug: "certified", name: "Certified for Impact", description: "Earned a verified certificate of completion.", icon: "award", criteria: "1 certificate issued", points: 50, category: "learning" },
    ])
    .onConflictDoNothing()
    .returning({ id: achievements.id, slug: achievements.slug });

  const profileRows = await db
    .select({ id: profiles.id, slug: profiles.slug, roleSlug: roles.slug, fullName: profiles.fullName })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id));
  const student = profileRows.find((row) => row.roleSlug === "student");
  const mentor = profileRows.find((row) => row.roleSlug === "mentor");
  const admin = profileRows.find((row) => row.roleSlug === "super_admin");
  if (!student) return { achievements: achievementRows.length };

  const award = (slug: string, evidence: string, days: number) => {
    const achievement = achievementRows.find((row) => row.slug === slug);
    if (!achievement) return null;
    return { profileId: student.id, achievementId: achievement.id, evidence, awardedAt: daysAgo(days) };
  };
  const awards = ["first-steps", "identity-explorer", "assessment-pass", "instrument-honesty", "community-voice", "cohort-faithful", "certified"]
    .map((slug, index) => award(slug, "Auto-awarded by the analytics service", 21 - index * 3))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  if (awards.length) await db.insert(learnerAchievements).values(awards).onConflictDoNothing();

  /* ---------------- learning activities ---------------- */
  const lessonRows = await db.select({ id: lessons.id, title: lessons.title }).from(lessons).limit(9);
  if (lessonRows.length) {
    await db.insert(learningActivities).values(
      lessonRows.map((lesson, index) => ({
        lessonId: lesson.id,
        title: `Practice: ${lesson.title.slice(0, 80)}`,
        kind: index % 3 === 0 ? "reflection" : index % 3 === 1 ? "practice" : "collaboration",
        instruction:
          index % 3 === 1
            ? "Complete the practice prompt and submit one paragraph of evidence to your mentor."
            : "Work through the activity, then record what changed in your reflection journal.",
        estimatedMinutes: 15 + index * 2,
        sortOrder: index + 1,
      })),
    );
  }

  /* ---------------- scoring rules ---------------- */
  const { instruments } = await import("./schema");
  const instrumentRows = await db.select({ id: instruments.id, title: instruments.title }).from(instruments);
  await db.insert(scoringRules).values(
    instrumentRows.map((instrument) => ({
      instrumentId: instrument.id,
      name: `${instrument.title} — weighted mean bands`,
      ruleType: "weighted_mean",
      expression: "percent = ((sum(scored_i * weight_i) / sum(weight_i)) - 1) / 4 * 100",
      bandDefinition: { emerging: [0, 39], developing: [40, 69], established: [70, 84], strong: [85, 100] },
      version: "1.0",
    })),
  );

  /* ---------------- communication ---------------- */
  if (mentor && admin) {
    await db.insert(messages).values([
      {
        senderId: mentor.id,
        recipientId: student.id,
        subject: "Before our clarity session",
        body: "Bring the two drafts plus the gifting evidence. We will run the four-part test together and rewrite once — not five times.",
        createdAt: daysAgo(2, 15),
      },
      {
        senderId: admin.id,
        recipientId: student.id,
        subject: "Welcome to Cohort 04",
        body: "Your cohort runs eight weeks: Tuesday live class, Thursday group work, weekly reflection. Attendance is recorded in your cohort page.",
        createdAt: daysAgo(21, 9),
      },
    ]);
    await db.insert(emailEvents).values([
      { profileId: student.id, event: "queued", provider: "internal", detail: "mentor.reviewed_reflection" },
      { profileId: student.id, event: "sent", provider: "internal", detail: "session.reminder", createdAt: daysAgo(1) },
      { profileId: student.id, event: "opened", provider: "internal", detail: "learning.assessment_result", createdAt: daysAgo(2) },
    ]);
  }

  /* ---------------- events + engagement ---------------- */
  const eventNames = [
    ["lesson.viewed", "learning"],
    ["lesson.completed", "learning"],
    ["assessment.submitted", "assessments"],
    ["instrument.completed", "assessments"],
    ["discussion.replied", "community"],
    ["session.joined", "sessions"],
    ["cohort.week_opened", "cohorts"],
    ["search.performed", "search"],
  ] as const;
  const eventValues: { name: string; module: string; profileId: string; properties: Record<string, unknown>; occurredAt: Date }[] = [];
  for (let day = 0; day < 28; day += 1) {
    for (const [index, [name, module]] of eventNames.entries()) {
      if ((day + index) % 3 === 0) continue;
      eventValues.push({
        name,
        module,
        profileId: student.id,
        properties: { platform: "web", cohort: "cohort-04-2026" },
        occurredAt: daysAgo(day, 8 + (index % 8)),
      });
    }
  }
  await db.insert(platformEvents).values(eventValues);

  const assessmentRows = await db.select({ id: assessmentAttempts.assessmentId, score: assessmentAttempts.score }).from(assessmentAttempts).where(eq(assessmentAttempts.profileId, student.id));
  const learningEventValues = eventValues.slice(0, 40).map((event, index) => ({
    profileId: student.id,
    eventType: event.name,
    courseId: null as number | null,
    lessonId: lessonRows[index % Math.max(lessonRows.length, 1)]?.id ?? null,
    assessmentId: assessmentRows[index % Math.max(assessmentRows.length, 1)]?.id ?? null,
    durationSeconds: 300 + ((index * 137) % 2400),
    score: assessmentRows[index % Math.max(assessmentRows.length, 1)]?.score ?? null,
    metadata: { source: "seed" },
    occurredAt: event.occurredAt,
  }));
  if (learningEventValues.length) await db.insert(learningEvents).values(learningEventValues);

  const engagementValues = Array.from({ length: 21 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (20 - index));
    return {
      snapshotDate: date.toISOString().slice(0, 10),
      profileId: student.id,
      minutesLearned: 20 + ((index * 17) % 70),
      lessonsCompleted: index % 4 === 0 ? 2 : index % 3 === 0 ? 1 : 0,
      discussions: index % 5 === 0 ? 2 : 0,
      activeFlag: index % 7 !== 3,
    };
  });
  await db.insert(engagementSnapshots).values(engagementValues).onConflictDoNothing();

  /* ---------------- reports ---------------- */
  await db.insert(analyticsReports).values(analyticsReportSeed()).onConflictDoNothing();

  /* ---------------- audit ---------------- */
  await db.insert(securityEvents).values([
    { eventType: "auth.login", profileId: admin?.id ?? null, severity: "info", detail: "Administrator signed in", ipAddress: "102.68.x.x" },
    { eventType: "auth.login_failed", profileId: null, severity: "warning", detail: "Three failed attempts for an unknown email", ipAddress: "41.210.x.x" },
    { eventType: "role.changed", profileId: student.id, severity: "notice", detail: "Role reviewed by administrator" },
    { eventType: "data.export", profileId: admin?.id ?? null, severity: "info", detail: "Subscriber CSV exported" },
    { eventType: "conference.join", profileId: student.id, severity: "info", detail: "Joined a live video room" },
  ]);

  const [firstCourse] = await db.select({ id: courses.id, title: courses.title }).from(courses).limit(1);
  if (instrumentRows.length === 0) return { achievements: achievementRows.length, permissions: perms.length, events: eventValues.length };
  await db.insert(dataChanges).values([
    { tableName: "articles", recordId: "seed", changeType: "update", actorId: admin?.id ?? null, before: { status: "approved" }, after: { status: "published" } },
    { tableName: "courses", recordId: String(firstCourse?.id ?? 1), changeType: "update", actorId: admin?.id ?? null, before: { status: "draft" }, after: { status: "published" } },
    { tableName: "profiles", recordId: student.id, changeType: "update", actorId: admin?.id ?? null, before: { role: "guest" }, after: { role: "student" } },
    { tableName: "cohorts", recordId: "cohort-04-2026", changeType: "update", actorId: admin?.id ?? null, before: { status: "draft" }, after: { status: "active" } },
  ]);

  return { achievements: achievementRows.length, permissions: perms.length, events: eventValues.length };
}

function analyticsReportSeed() {
  return [
    { slug: "platform-overview", title: "Learning overview", scope: "platform", definition: "Active learner accounts, published lesson opportunities, valid awards and recorded activity.", queryRef: "getLearningReport" },
    { slug: "programme-performance", title: "Cohort learning", scope: "programme", definition: "Active cohort membership, current enrolled curriculum and comparable assessment score changes.", queryRef: "getLearningReport" },
    { slug: "learner-progress", title: "Learner progress", scope: "individual", definition: "Enrolled digital module progress, comparable assessment scores, goals and achievements.", queryRef: "getLearnerAnalytics" },
  ];
}
