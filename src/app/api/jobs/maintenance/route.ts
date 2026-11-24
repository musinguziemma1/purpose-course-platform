import { authorizeJob } from "@/lib/job-auth";
import { expireLiveSessions } from "@/db/operations";
import { purgeLoginAttempts } from "@/db/login-throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!authorizeJob(request)) return new Response("Unauthorized", { status: 401 });
  const live = await expireLiveSessions();
  return Response.json({ ...live, purgedLoginAttempts: await purgeLoginAttempts() }, { headers: { "Cache-Control": "no-store" } });
}
export const POST = GET;
