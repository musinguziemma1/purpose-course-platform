import { authorizeJob } from "@/lib/job-auth";
import { expireLiveSessions } from "@/db/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!authorizeJob(request)) return new Response("Unauthorized", { status: 401 });
  return Response.json(await expireLiveSessions(), { headers: { "Cache-Control": "no-store" } });
}
export const POST = GET;
