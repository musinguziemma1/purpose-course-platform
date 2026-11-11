import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, mentorAssignments, profiles, users } from "@/db/schema";
import { submitInstrument } from "@/db/engine";
import { getSessionUser } from "@/lib/auth";
import { ensureDemoAccounts } from "@/db/accounts";
import { notify } from "@/lib/notifications";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const instrumentId = Number(id);
  if (!instrumentId) return NextResponse.json({ error: "Invalid instrument." }, { status: 400 });

  let payload: {
    responses?: { itemId: number; rawValue: number }[];
    consentGiven?: boolean;
    sharedWithMentor?: boolean;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let user = await getSessionUser();
  if (!user) {
    await ensureDemoAccounts().catch(() => undefined);
    user = await getSessionUser();
  }
  if (!user) return NextResponse.json({ error: "Sign in to save your assessment." }, { status: 401 });
  if (!can(user, "instrument.take")) return NextResponse.json({ error: "Learner assessment access required." }, { status: 403 });
  if (!payload || !Array.isArray(payload.responses) || payload.responses.length > 500 || !payload.responses.every((row) => row && Number.isInteger(row.itemId) && Number.isInteger(row.rawValue) && row.rawValue >= 1 && row.rawValue <= 5)) return NextResponse.json({ error: "Choose a valid response for each statement." }, { status: 422 });

  const result = await submitInstrument({
    instrumentId,
    profileId: user.profileId,
    consentGiven: payload.consentGiven === true,
    sharedWithMentor: payload.sharedWithMentor === true,
    responses: (payload.responses ?? []).map((row) => ({ itemId: Number(row.itemId), rawValue: Number(row.rawValue) })),
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 422 });

  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: "instrument.completed",
    entityType: "instrument",
    entityId: String(instrumentId),
    description: `Completed “${result.instrument.title}” v${result.instrument.version}.`,
  });

  if (payload.sharedWithMentor === true) {
    const mentors = await db
      .select({ id: profiles.id })
      .from(mentorAssignments)
      .innerJoin(profiles, eq(mentorAssignments.mentorId, profiles.id))
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(and(eq(mentorAssignments.studentId, user.profileId), eq(mentorAssignments.status, "active"), eq(users.isActive, true)));
    if (mentors.length) {
      await notify({
        recipientIds: mentors.map((mentor) => mentor.id),
        templateKey: "learning.instrument_ready",
        vars: { title: result.instrument.title, score: result.result.overallScore, band: result.result.bandLabel },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    result: result.result,
    dimensions: result.dimensions,
    weakest: result.weakest,
    strongest: result.strongest,
    version: result.instrument.version,
  });
}
