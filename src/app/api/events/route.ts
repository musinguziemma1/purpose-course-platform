import { NextRequest, NextResponse } from "next/server";
import { getEventCalendar } from "@/db/live-events";
import { getSessionUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const limit = Math.max(
    1,
    Math.min(
      100,
      Math.floor(Number(request.nextUrl.searchParams.get("limit"))) || 60,
    ),
  );
  const events = await getEventCalendar(await getSessionUser(), {
    past: request.nextUrl.searchParams.get("past") === "1",
    limit,
  });
  return NextResponse.json(
    { events },
    { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
  );
}
