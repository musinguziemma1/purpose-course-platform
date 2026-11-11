import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assignments,
  coachingSessions,
  courseLevels,
  courseSessions,
  enrollments,
  learningProgress,
  profiles,
  roles,
  users,
} from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { DEMO_ACCOUNTS, ROLE_CATALOG } from "@/lib/roles";
import { isDemoEnabled } from "@/lib/demo";

/**
 * Makes the demo workspaces resilient: if the database is freshly provisioned
 * (or a demo account was removed) visiting the sign-in page or calling a demo
 * action recreates every role, credential, profile and the sample academy data
 * needed to explore each dashboard. Safe to call repeatedly.
 */

let ensuring: Promise<void> | null = null;

export function ensureDemoAccounts(): Promise<void> {
  if (!isDemoEnabled()) return Promise.resolve();
  if (!ensuring) {
    ensuring = runEnsure().catch((error) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

async function runEnsure() {
  for (const role of ROLE_CATALOG) {
    await db
      .insert(roles)
      .values({
        slug: role.slug,
        name: role.name,
        level: role.level,
        description: role.blurb,
        permissions: [...role.permissions],
      })
      .onConflictDoUpdate({
        target: roles.slug,
        set: {
          name: role.name,
          level: role.level,
          description: role.blurb,
          permissions: [...role.permissions],
        },
      });
  }

  const roleRows = await db.select().from(roles);
  const roleBySlug = new Map(roleRows.map((role) => [role.slug, role]));

  for (const account of DEMO_ACCOUNTS) {
    const existingUsers = await db.select().from(users).where(eq(users.email, account.email)).limit(1);
    let userId = existingUsers[0]?.id;

    if (!userId) {
      const inserted = await db
        .insert(users)
        .values({ email: account.email, passwordHash: hashPassword(account.password) })
        .returning({ id: users.id });
      userId = inserted[0].id;
    } else if (!verifyPassword(account.password, existingUsers[0].passwordHash)) {
      await db.update(users).set({ passwordHash: hashPassword(account.password) }).where(eq(users.id, userId));
    }

    const role = roleBySlug.get(account.role);
    if (!role) continue;

    const existingProfile = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (existingProfile[0]) {
      if (existingProfile[0].roleId !== role.id) {
        await db.update(profiles).set({ roleId: role.id }).where(eq(profiles.id, existingProfile[0].id));
      }
    } else {
      await db
        .insert(profiles)
        .values({
          userId,
          roleId: role.id,
          fullName: account.fullName,
          slug: account.role,
          title: account.title,
          bio: account.bio,
        })
        .onConflictDoNothing();
    }
  }

  const allProfiles = await db
    .select({ id: profiles.id, slug: profiles.slug, fullName: profiles.fullName, roleSlug: roles.slug })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id));

  const studentProfile = allProfiles.find((profile) => profile.roleSlug === "student");
  const mentorProfile = allProfiles.find((profile) => profile.roleSlug === "mentor");
  if (!studentProfile || !mentorProfile) return;

  const levelRows = await db.select().from(courseLevels).orderBy(courseLevels.sortOrder);
  const level = levelRows[1] ?? levelRows[0] ?? null;

  const existingEnrollment = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.profileId, studentProfile.id))
    .limit(1);

  let enrollmentId = existingEnrollment[0]?.id;
  if (!enrollmentId) {
    const account = DEMO_ACCOUNTS.find((item) => item.role === "student");
    const created = await db
      .insert(enrollments)
      .values({
        profileId: studentProfile.id,
        email: account?.email ?? "student@purposecourse.org",
        fullName: account?.fullName ?? "Student",
        levelId: level?.id ?? null,
        cohort: level ? `${level.name} · Cohort 04` : "Cohort 04",
        status: "enrolled",
      })
      .onConflictDoNothing()
      .returning({ id: enrollments.id });
    enrollmentId =
      created[0]?.id ??
      (
        await db.select({ id: enrollments.id }).from(enrollments).where(eq(enrollments.profileId, studentProfile.id)).limit(1)
      )[0]?.id;
  }

  if (level && enrollmentId) {
    const sessionRows = await db
      .select({ id: courseSessions.id })
      .from(courseSessions)
      .where(eq(courseSessions.levelId, level.id))
      .orderBy(courseSessions.sortOrder)
      .limit(5);

    for (const [index, session] of sessionRows.entries()) {
      await db
        .insert(learningProgress)
        .values({
          enrollmentId,
          sessionId: session.id,
          completed: index < 1,
          completedAt: index < 1 ? new Date() : null,
        })
        .onConflictDoNothing();
    }

    for (const [index, seed] of [
      {
        title: "Define your purpose statement",
        brief:
          "Draft a single sentence that names who you serve, the transformation you bring and the evidence that this is yours. Bring two versions to your clarity session.",
        collaborative: false,
      },
      {
        title: "Gifting audit — peer evidence",
        brief:
          "Ask three people who have worked with you for one specific example of each gift you claim. Summarise the evidence and flag anything you cannot evidence.",
        collaborative: true,
      },
    ].entries()) {
      await db
        .insert(assignments)
        .values({
          levelId: level.id,
          sessionId: sessionRows[index]?.id ?? null,
          title: seed.title,
          brief: seed.brief,
          isCollaborative: seed.collaborative,
          dueAt: new Date(Date.now() + (index + 3) * 86400000),
          sortOrder: index + 1,
        })
        .onConflictDoNothing();
    }
  }

  const existingCoaching = await db
    .select({ id: coachingSessions.id })
    .from(coachingSessions)
    .where(eq(coachingSessions.studentId, studentProfile.id))
    .limit(1);

  if (!existingCoaching[0]) {
    await db.insert(coachingSessions).values([
      {
        mentorId: mentorProfile.id,
        studentId: studentProfile.id,
        enrollmentId: enrollmentId ?? null,
        title: "Clarity session — purpose statement review",
        focus: "Bring the two drafts of your purpose statement and the gifting evidence you gathered.",
        status: "scheduled",
        scheduledAt: new Date(Date.now() + 3 * 86400000),
        durationMinutes: 45,
      },
      {
        mentorId: mentorProfile.id,
        studentId: studentProfile.id,
        enrollmentId: enrollmentId ?? null,
        title: "Discovery call — why clarity feels urgent now",
        focus: "Naming the transitions that made this the right season to do the work.",
        status: "completed",
        scheduledAt: new Date(Date.now() - 12 * 86400000),
        durationMinutes: 45,
        mentorNotes:
          "Clear burden for vocational training. Gifts evidenced in teaching and administration. Homework: write the story in 300 words and remove every self-flattering adjective.",
      },
    ]);
  }

  await db.execute(sql`select 1`);
}
