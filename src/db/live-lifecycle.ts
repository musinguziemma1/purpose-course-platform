import { and, eq, inArray, sql } from "drizzle-orm";
import { liveSessions } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";

/** Allow a short overrun, never an indefinitely live event after a host disconnects. */
export const sessionWithinEndWindow = () => sql`${liveSessions.startsAt} + make_interval(mins => ${liveSessions.durationMinutes} + 15) >= now()`;
export const sessionOpen = () => and(inArray(liveSessions.status, ["scheduled", "live"]), sessionWithinEndWindow())!;
export const calendarDiscovery = (viewer: SessionUser | null) => viewer ? sql`true` : eq(liveSessions.isPublic, true);
export const effectiveSessionStatus = () => sql<typeof liveSessions.$inferSelect.status>`case when ${liveSessions.status} in ('scheduled','live') and not (${sessionWithinEndWindow()}) then 'ended' else ${liveSessions.status} end`;

export function sessionStillOpen(session: { status: string; startsAt: Date; durationMinutes: number }) {
  return ["scheduled", "live"].includes(session.status) && session.startsAt.getTime() + (session.durationMinutes + 15) * 60000 >= Date.now();
}
