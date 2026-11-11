import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, profiles, roles } from "@/db/schema";
import { submitInstrument } from "@/db/engine";
import { getSessionUser } from "@/lib/auth";
import { ensureDemoAccounts } from "@/db/accounts";
import { notify } from "@/lib/notifications";

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

  const result = await submitInstrument({
    instrumentId,
    profileId: user.profileId,
    consentGiven: Boolean(payload.consentGiven),
    sharedWithMentor: payload.sharedWithMentor !== false,
    responses: (payload.responses ?? []).map((row) => ({ itemId: Number(row.itemId), rawValue: Number(row.rawValue) })),
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 422 });

  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: "instrument.completed",
    entityType: "instrument",
    entityId: String(instrumentId),
    description: `Completed “${result.instrument.title}” v${result.instrument.version} — score ${result.result.overallScore} (${result.result.bandLabel}).`,
  });

  if (payload.sharedWithMentor !== false) {
    const mentors = await db
      .select({ id: profiles.id })
      .from(profiles)
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .where(eq(roles.slug, "mentor"));
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
