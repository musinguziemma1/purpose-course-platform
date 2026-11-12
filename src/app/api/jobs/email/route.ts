import { deliverQueuedEmails } from "@/db/email-delivery";
import { authorizeJob } from "@/lib/job-auth";
import { emailConfigurationError } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!authorizeJob(request)) return new Response("Unauthorized", { status: 401 });
  const error = emailConfigurationError();
  if (error) return Response.json({ error }, { status: 503 });
  return Response.json({ results: await deliverQueuedEmails() }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = POST;
