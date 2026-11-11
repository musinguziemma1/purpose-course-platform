import { NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/auth";
import { ensureDemoAccounts } from "@/db/accounts";
import { DEMO_ACCOUNTS, homePathForRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

/**
 * Demo-only entry point so every workspace can be opened with a plain link.
 * This survives environments where a client-side server-action redirect is
 * awkward (embedded previews, blocked cookies) and recreates the demo accounts
 * if the database has been freshly provisioned.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = url.searchParams.get("role") ?? "";
  const account = DEMO_ACCOUNTS.find((item) => item.role === role) ?? DEMO_ACCOUNTS[0];

  await ensureDemoAccounts().catch(() => undefined);
  const userId = await authenticate(account.email, account.password);

  if (!userId) {
    return new NextResponse(null, { status: 307, headers: { Location: "/login?error=demo-unavailable" } });
  }

  await createSession(userId);
  // Relative redirect: the browser resolves it against the public preview host
  // rather than the container's internal origin.
  return new NextResponse(null, { status: 307, headers: { Location: homePathForRole(account.role) } });
}
