import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

export async function POST(request: Request) {
  let payload: { email?: string; fullName?: string; principle?: string; source?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const fullName = (payload.fullName ?? "").trim() || null;
  const principle = (payload.principle ?? "").trim() || null;
  const source = (payload.source ?? "website").slice(0, 60);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 422 });
  }

  try {
    const insert = db.insert(subscribers).values({ email, fullName, principle, source });
    if (fullName || principle) {
      await insert.onConflictDoUpdate({
        target: subscribers.email,
        set: { fullName: fullName ?? undefined, principle: principle ?? undefined },
      });
    } else {
      await insert.onConflictDoNothing({ target: subscribers.email });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Could not save your subscription." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Welcome to the circle. Look for the next Purpose Letter in your inbox.",
  });
}
