import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { beginAssessment } from "@/db/assessment-taking";

export const dynamic = "force-dynamic";
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  const result = await beginAssessment(Number(id), viewer);
  return NextResponse.json(result, { status: "error" in result ? 422 : 200 });
}
