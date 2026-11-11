import { NextResponse } from "next/server";
import { submitAssessmentAttempt } from "@/app/actions/assessments";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessmentId = Number(id);
  if (!assessmentId) return NextResponse.json({ error: "Invalid assessment." }, { status: 400 });

  let payload: { selections?: { questionId: number; selectedIndex: number }[] };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const selections = Array.isArray(payload.selections) ? payload.selections : [];
  if (selections.length === 0) {
    return NextResponse.json({ error: "Answer at least one question before submitting." }, { status: 422 });
  }

  const result = await submitAssessmentAttempt({ assessmentId, selections });
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
