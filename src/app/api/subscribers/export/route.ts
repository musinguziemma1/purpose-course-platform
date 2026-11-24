import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getSubscribers } from "@/db/queries";
import { csvRow } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !can(user, "audience.view")) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const rows = await getSubscribers(2000);
  const header = "email,full_name,principle,source,status,subscribed_at";
  const csv = [
    header,
    ...rows.map((row) => csvRow([row.email, row.fullName ?? "", row.principle ?? "", row.source, row.status, row.createdAt.toISOString()])),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="purpose-course-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
