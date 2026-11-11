import { Resend } from "resend";
import { recordEmailWebhook } from "@/db/email-delivery";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook is not configured.", { status: 503 });
  const reader = request.body?.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  if (!reader) return new Response("Missing body.", { status: 400 });
  for (;;) {
    const next = await reader.read(); if (next.done) break;
    size += next.value.byteLength;
    if (size > 128_000) { await reader.cancel(); return new Response("Payload too large.", { status: 413 }); }
    chunks.push(next.value);
  }
  const payload = Buffer.concat(chunks).toString("utf8");
  let event;
  try {
    event = new Resend(process.env.RESEND_API_KEY ?? "webhook-verification").webhooks.verify({ payload, headers: { id: request.headers.get("svix-id") ?? "", timestamp: request.headers.get("svix-timestamp") ?? "", signature: request.headers.get("svix-signature") ?? "" }, webhookSecret: secret });
  } catch { return new Response("Invalid signature.", { status: 400 }); }
  if (typeof event.type !== "string" || !event.type.startsWith("email.") || !event.data || !("email_id" in event.data)) return Response.json({ received: true });
  try {
    await recordEmailWebhook(request.headers.get("svix-id") ?? "", { type: event.type, created_at: event.created_at, data: { email_id: String(event.data.email_id) } });
    return Response.json({ received: true });
  } catch { return new Response("Event persistence failed. Retry required.", { status: 503 }); }
}
