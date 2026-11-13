import { isSameOriginRequest } from "@/lib/request-origin";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { completeMediaUpload, readableMedia } from "@/db/media-library";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const url = await readableMedia(
      (await params).id,
      await getSessionUser(),
      request.nextUrl.searchParams.get("download") === "1",
    );
    if (!url)
      return NextResponse.json(
        { error: "File not available." },
        { status: 404, headers: { "Cache-Control": "private, no-store" } },
      );
    return new NextResponse(null, {
      status: 307,
      headers: {
        Location: url,
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The file is temporarily unavailable." },
      { status: 503 },
    );
  }
}
export async function POST(request: NextRequest, { params }: Context) {
  if (!isSameOriginRequest(request))
    return NextResponse.json(
      { error: "Same-origin upload required." },
      { status: 403 },
    );
  try {
    const result = await completeMediaUpload(
      (await params).id,
      await getSessionUser(),
    );
    return NextResponse.json(result, {
      status: "ok" in result && result.ok ? 200 : 400,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "The upload could not be verified. Retry to finish, or choose the file again.",
      },
      { status: 503 },
    );
  }
}
