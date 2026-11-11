import { NextResponse } from "next/server";
import { submitAssessmentAttempt } from "@/app/actions/assessments";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessmentId = Number(id);
  if (!Number.isSafeInteger(assessmentId) || assessmentId < 1) return NextResponse.json({ error: "Invalid assessment." }, { status: 400 });

  let payload: { sessionId?: string; selections?: { questionId: number; selectedIndex: number }[] };
  try {
    payload = await request.json();
    if (!payload || typeof payload !== "object") throw new Error("Invalid body");
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const selections = Array.isArray(payload.selections) ? payload.selections : [];
  if (selections.length === 0 || selections.length > 500 || selections.some((value) => !value || !Number.isSafeInteger(value.questionId) || !Number.isSafeInteger(value.selectedIndex) || value.questionId < 1 || value.selectedIndex < 0)) {
    return NextResponse.json({ error: "Answer at least one question before submitting." }, { status: 422 });
  }

  const result = await submitAssessmentAttempt({ assessmentId, sessionId: typeof payload.sessionId === "string" ? payload.sessionId : "", selections });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({
    attemptId: result.attemptId,
    score: result.score,
    passed: result.passed,
    passMark: result.passMark,
    correctCount: result.correctCount,
    totalCount: result.totalCount,
    certificateCode: result.certificateCode,
    newlyIssued: result.newlyIssued,
  });
}
