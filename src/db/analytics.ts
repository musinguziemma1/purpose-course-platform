import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { canReadLearner, instrumentReadable } from "@/db/learner-access";
import { getLearnerMetrics } from "@/db/learning-metrics";
import {
  achievements,
  certificates,
  instrumentResults,
  learnerAchievements,
  learnerGoals,
  learningEvents,
  platformEvents,
  profiles,
  reflections,
} from "@/db/schema";

/* ------------------------------------------------------------------ *
 * Individual level — authorized digital curriculum progress
 * ------------------------------------------------------------------ */

export async function getLearnerAnalytics(profileId: string) {
  const viewer = await getSessionUser();
  if (!(await canReadLearner(profileId, viewer))) throw new Error("Learner access required.");
  const [metrics, goalRows, reflectionRows, achievementRows, certificateRows, instrumentRows, eventRows] = await Promise.all([
    getLearnerMetrics(viewer, [profileId]),
    db.select().from(learnerGoals).where(and(eq(learnerGoals.studentId, profileId), sql`${learnerGoals.status} in ('active','achieved')`)),
    db.select({ value: sql<number>`count(*)::int` }).from(reflections).where(eq(reflections.authorProfileId, profileId)),
    db
      .select({ achievement: achievements, awardedAt: learnerAchievements.awardedAt })
      .from(learnerAchievements)
      .innerJoin(achievements, eq(learnerAchievements.achievementId, achievements.id))
      .where(eq(learnerAchievements.profileId, profileId)),
    db.select({ value: sql<number>`count(*)::int` }).from(certificates).where(and(eq(certificates.profileId, profileId), isNull(certificates.revokedAt))),
    db.select().from(instrumentResults).where(and(eq(instrumentResults.profileId, profileId), instrumentReadable(viewer))).orderBy(desc(instrumentResults.createdAt)).limit(8),
    db.select({ value: sql<number>`count(*)::int` }).from(learningEvents).where(and(eq(learningEvents.profileId, profileId), sql`${learningEvents.metadata}->>'source' is distinct from 'seed'`)),
  ]);

  const progress = metrics[0];
  const attemptRows = progress?.attempts ?? [];
  const scores = attemptRows.map((row) => Number(row.score));
  return {
    lessons: { total: progress?.lessonsTotal ?? 0, completed: progress?.lessonsCompleted ?? 0, percent: progress?.lessonsTotal ? Math.round((progress.lessonsCompleted / progress.lessonsTotal) * 100) : 0 },
    modules: (progress?.modules ?? []).map((module) => ({ ...module, percent: module.total ? Math.round(module.completed / module.total * 100) : 0 })),
    assessments: {
      attempts: attemptRows.length,
      average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      best: scores.length ? Math.max(...scores) : null,
      first: scores.length ? scores[0] : null,
      last: scores.length ? scores[scores.length - 1] : null,
      improvement: progress?.improvement ?? null,
      history: attemptRows.map((row) => ({ title: row.title, score: Number(row.score), passed: row.passed })),
    },
    goals: {
      total: goalRows.length,
      achieved: goalRows.filter((row) => row.status === "achieved").length,
      averageProgress: goalRows.length ? Math.round(goalRows.reduce((sum, row) => sum + row.progress, 0) / goalRows.length) : 0,
    },
    reflections: Number(reflectionRows[0]?.value ?? 0),
    achievements: achievementRows.map((row) => ({ name: row.achievement.name, description: row.achievement.description, icon: row.achievement.icon, points: row.achievement.points, awardedAt: row.awardedAt })),
    certificates: Number(certificateRows[0]?.value ?? 0),
    instruments: instrumentRows.map((row) => ({
      title: row.instrumentId,
      score: row.overallScore,
      band: row.bandLabel,
      createdAt: row.createdAt,
      dimensions: row.dimensions,
    })),
    learningEvents: Number(eventRows[0]?.value ?? 0),
  };
}

/* ------------------------------------------------------------------ *
 * Audit & security
 * ------------------------------------------------------------------ */

export async function getAuditTrail(limit = 60) {
  const [changes, security, events] = await Promise.all([
    db
      .select({ change: sql<Record<string, unknown>>`json_build_object('id', data_changes.id, 'table', data_changes.table_name, 'record', data_changes.record_id, 'type', data_changes.change_type, 'at', data_changes.created_at)`, actor: profiles.fullName })
      .from(sql`data_changes`)
      .leftJoin(profiles, sql`profiles.id = data_changes.actor_id`)
      .orderBy(sql`data_changes.created_at desc`)
      .limit(limit),
    db
      .select({ detail: sql<string>`event_type || ' · ' || severity`, profileId: sql<string | null>`profile_id`, at: sql<Date>`created_at` })
      .from(sql`security_events`)
      .orderBy(sql`created_at desc`)
      .limit(20),
    db
      .select({ name: platformEvents.name, module: platformEvents.module, at: platformEvents.occurredAt })
      .from(platformEvents)
      .orderBy(desc(platformEvents.occurredAt))
      .limit(20),
  ]);
  return { changes, security, events };
}

export async function getAchievements(profileId?: string) {
  const rows = await db.select().from(achievements).orderBy(achievements.points);
  if (!profileId) return rows.map((row) => ({ achievement: row, awardedAt: null as Date | null }));
  const awarded = await db.select().from(learnerAchievements).where(eq(learnerAchievements.profileId, profileId));
  return rows.map((row) => ({
    achievement: row,
    awardedAt: awarded.find((entry) => entry.achievementId === row.id)?.awardedAt ?? null,
  }));
}

