import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { isSameOriginRequest } from "@/lib/request-origin";
import { isPrincipleKey } from "@/lib/purpose-journey";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Subscribe from the Purpose Course website." }, { status: 403 });
  }
  let payload: { email?: unknown; fullName?: unknown; principle?: unknown; source?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const email = String(payload.email ?? "").trim().toLowerCase();
  const fullName = String(payload.fullName ?? "").trim().slice(0, 160) || null;
  const principleInput = String(payload.principle ?? "").trim().toLowerCase();
  const principle = isPrincipleKey(principleInput) ? principleInput : null;
  const source = String(payload.source ?? "website").replace(/[^a-z0-9_-]/gi, "").slice(0, 60) || "website";

  if (email.length > 255 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 422 });
  }

  try {
    // Never update an existing subscriber: anyone can submit any address, so details could be overwritten.
    await db.insert(subscribers).values({ email, fullName, principle, source }).onConflictDoNothing({ target: subscribers.email });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not save your subscription." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Welcome to the circle. Look for the next Purpose Letter in your inbox.",
  });
}
