import { authorizeJob } from "@/lib/job-auth";
import { getOperationsStatus } from "@/db/operations";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!authorizeJob(request)) return new Response("Unauthorized", { status: 401 });
  try {
    return Response.json(await getOperationsStatus(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
