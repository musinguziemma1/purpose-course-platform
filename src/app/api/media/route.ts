import { isSameOriginRequest } from "@/lib/request-origin";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listLibraryAssets, beginMediaUpload } from "@/db/media-library";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const assets = await listLibraryAssets(
    await getSessionUser(),
    request.nextUrl.searchParams.get("q") ?? "",
    Number(request.nextUrl.searchParams.get("offset")) || 0,
    request.nextUrl.searchParams.get("kind") ?? "",
  );
  return NextResponse.json(
    assets ? { assets } : { error: "Staff media library access required." },
    {
      status: assets ? 200 : 403,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request))
    return NextResponse.json(
      { error: "Same-origin upload required." },
      { status: 403 },
    );
  const viewer = await getSessionUser();
  if (!viewer)
    return NextResponse.json(
      { error: "Sign in to upload files." },
      { status: 401 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 8192)
      return NextResponse.json(
        { error: "Upload details are too large." },
        { status: 413 },
      );
    const input = JSON.parse(raw);
    if (
      typeof input.name !== "string" ||
      typeof input.byteSize !== "number" ||
      typeof input.purpose !== "string"
    )
      return NextResponse.json(
        { error: "Invalid upload details." },
        { status: 400 },
      );
    const result = await beginMediaUpload(input, viewer);
    return NextResponse.json(result, {
      status: "ok" in result && result.ok ? 200 : 400,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "The upload could not be prepared. Try again later." },
      { status: 503 },
    );
  }
}
