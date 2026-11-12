import { publishScheduledArticles } from "@/db/publishing";
import { authorizeJob } from "@/lib/job-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorizeJob(request)) return new Response("Unauthorized", { status: 401 });
  return Response.json({ published: await publishScheduledArticles() }, { headers: { "Cache-Control": "no-store" } });
}

export const POST = GET;
