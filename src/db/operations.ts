import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, conferenceParticipants, conferenceSignals, liveSessions } from "@/db/schema";
import { sessionOpen, sessionWithinEndWindow } from "@/db/live-lifecycle";
import { nativeConferenceAvailable } from "@/lib/conference-config";
import { emailConfigurationError } from "@/lib/email";

export async function expireLiveSessions(onlyIds?: number[]) {
  return db.transaction(async tx => {
    const expired = await tx.update(liveSessions).set({ status: "ended", updatedAt: new Date() })
      .where(and(eq(liveSessions.status, "live"), sql`not (${sessionWithinEndWindow()})`, onlyIds ? inArray(liveSessions.id, onlyIds) : undefined)).returning({ id: liveSessions.id });
    if (expired.length) await tx.insert(activityLogs).values(expired.map(row => ({ action: "live.expired", entityType: "live_session", entityId: String(row.id), description: "Ended automatically after the scheduled duration and 15-minute overrun window." })));
    // Removal markers outlive presence so a removed participant cannot rejoin until the session closes.
    await tx.delete(conferenceParticipants).where(and(sql`${conferenceParticipants.lastSeenAt} < now() - interval '2 minutes'`,
      or(ne(conferenceParticipants.mode, "removed"), sql`not exists (select 1 from ${liveSessions} where ${liveSessions.roomCode} = ${conferenceParticipants.roomCode} and ${sessionOpen()})`)));
    await tx.delete(conferenceSignals).where(sql`${conferenceSignals.createdAt} < now() - interval '2 minutes'`);
    return { ended: expired.length };
  });
}

/** Counts only. Never return learner identities, provider requests or credentials. */
export async function getOperationsStatus() {
  const result = await db.execute<{
    invalid_enrolments: number; email_mismatches: number; stale_live_sessions: number;
    overdue_publications: number; email_attention: number; old_queued_email: number;
  }>(sql`select
    (select count(*)::int from enrollments e left join profiles p on p.id=e.profile_id left join users u on u.id=p.user_id left join roles r on r.id=p.role_id
      where e.status='enrolled' and (e.profile_id is null or e.level_id is null or u.is_active is distinct from true or r.slug is distinct from 'student')) as invalid_enrolments,
    (select count(*)::int from enrollments e join profiles p on p.id=e.profile_id join users u on u.id=p.user_id where e.status='enrolled' and e.email<>u.email) as email_mismatches,
    (select count(*)::int from live_sessions where status='live' and starts_at+make_interval(mins=>duration_minutes+15)<now()) as stale_live_sessions,
    (select count(*)::int from articles where status='scheduled' and scheduled_for < now()-interval '5 minutes') as overdue_publications,
    (select count(*)::int from notification_outbox where channel='email' and status in ('failed','needs_review','bounced','complained')) as email_attention,
    (select count(*)::int from notification_outbox where channel='email' and status='queued' and created_at < now()-interval '15 minutes') as old_queued_email`);
  return { checkedAt: new Date().toISOString(), counts: result.rows[0], emailConfigured: !emailConfigurationError(), nativeVideoReady: nativeConferenceAvailable() };
}
