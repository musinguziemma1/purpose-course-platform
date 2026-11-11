import { NextResponse } from "next/server";
import { canReviewArticles, getSessionUser } from "@/lib/auth";
import { getSubscribers } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !canReviewArticles(user)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const rows = await getSubscribers(2000);
  const header = "email,full_name,principle,source,status,subscribed_at";
  const csv = [
    header,
    ...rows.map((row) =>
      [
        row.email,
        row.fullName ?? "",
        row.principle ?? "",
        row.source,
        row.status,
        row.createdAt.toISOString(),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="purpose-course-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
