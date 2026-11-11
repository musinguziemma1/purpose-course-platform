import { NextResponse } from "next/server";
import { searchPlatform, type SearchType } from "@/db/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const type = url.searchParams.get("type");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 6) || 6, 20);

  const result = await searchPlatform(query, {
    types: type ? [type as SearchType] : undefined,
    limit,
  });

  return NextResponse.json({
    query: result.query,
    total: result.total,
    groups: result.groups,
  });
}
