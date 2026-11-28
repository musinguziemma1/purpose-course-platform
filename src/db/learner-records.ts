import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { certificates, learnerGoals, reflectionPrinciples, reflections } from "@/db/schema";
import { whenSchemaReady } from "@/db/schema-readiness";
import { inferPrinciple, isPrincipleKey, type PrincipleKey } from "@/lib/purpose-journey";
import type { SessionUser } from "@/lib/auth";

/**
 * The signed-in learner's own reflections, certificates and goals, for the
 * Purpose Journey and Purpose Profile dashboards. Self only: other viewers get
 * null (mentors and staff read learners through their own pages).
 */
export async function getOwnLearnerRecords(viewer: SessionUser | null, reflectionLimit = 12) {
  if (!viewer) return null;
  const learnerId = viewer.profileId;
  const own = eq(reflections.authorProfileId, learnerId);
  const columns = { id: reflections.id, prompt: reflections.prompt, body: reflections.body, createdAt: reflections.createdAt };

  const [reflectionRows, reflectionCount, certificateRows, goalRows] = await Promise.all([
    // Principle links arrive with the Purpose Journey migration; until then, infer from the prompt.
    whenSchemaReady(
      "Purpose Profile and Journey",
      () =>
        db
          .select({ ...columns, principle: reflectionPrinciples.principle })
          .from(reflections)
          .leftJoin(reflectionPrinciples, eq(reflectionPrinciples.reflectionId, reflections.id))
          .where(own)
          .orderBy(desc(reflections.createdAt))
          .limit(reflectionLimit),
      null,
    ).then(
      (rows) =>
        rows ??
        db
          .select(columns)
          .from(reflections)
          .where(own)
          .orderBy(desc(reflections.createdAt))
          .limit(reflectionLimit)
          .then((plain) => plain.map((row) => ({ ...row, principle: null as string | null }))),
    ),
    db.select({ value: count() }).from(reflections).where(own),
    db
      .select({ id: certificates.id, title: certificates.title, kind: certificates.kind, issuedAt: certificates.issuedAt })
      .from(certificates)
      .where(and(eq(certificates.profileId, learnerId), isNull(certificates.revokedAt)))
      .orderBy(desc(certificates.issuedAt)),
    db
      .select({
        id: learnerGoals.id,
        title: learnerGoals.title,
        description: learnerGoals.description,
        status: learnerGoals.status,
        progress: learnerGoals.progress,
        dueAt: learnerGoals.dueAt,
        updatedAt: learnerGoals.updatedAt,
      })
      .from(learnerGoals)
      .where(eq(learnerGoals.studentId, learnerId))
      .orderBy(desc(learnerGoals.updatedAt)),
  ]);

  return {
    reflections: reflectionRows.map((row) => {
      const principle: PrincipleKey | null = isPrincipleKey(row.principle) ? row.principle : inferPrinciple(row.prompt);
      return { id: row.id, prompt: row.prompt, body: row.body, createdAt: row.createdAt, principle };
    }),
    reflectionCount: Number(reflectionCount[0]?.value ?? 0),
    certificates: certificateRows,
    goals: goalRows.map((goal) => ({ ...goal, progress: Math.max(0, Math.min(100, Number(goal.progress))) })),
  };
}

export type LearnerRecords = NonNullable<Awaited<ReturnType<typeof getOwnLearnerRecords>>>;
