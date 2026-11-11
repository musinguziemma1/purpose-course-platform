"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, roles } from "@/db/schema";
import { authenticate, createSession, destroySession, getSessionUser } from "@/lib/auth";
import { ensureDemoAccounts } from "@/db/accounts";
import { DEMO_ACCOUNTS, homePathForRole } from "@/lib/roles";
import { isDemoEnabled } from "@/lib/demo";

export type LoginState = { error?: string };

async function redirectToWorkspace(userId: string): Promise<string> {
  const rows = await db
    .select({ roleSlug: roles.slug })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(eq(profiles.userId, userId))
    .limit(1);
  return homePathForRole(rows[0]?.roleSlug);
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email address and password." };
  }

  await ensureDemoAccounts().catch(() => undefined);
  const userId = await authenticate(email, password);
  if (!userId) {
    return { error: "Those credentials do not match an active account." };
  }

  await createSession(userId);
  redirect(await redirectToWorkspace(userId));
}

/** One-click access to each workspace. Used by the demo panels on /login. */
export async function demoLoginAction(formData: FormData) {
  if (!isDemoEnabled()) redirect("/login?error=demo-unavailable");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const account = DEMO_ACCOUNTS.find((item) => item.email === email);
  if (!account) redirect("/login?error=unknown-account");

  await ensureDemoAccounts().catch(() => undefined);
  const userId = await authenticate(account.email, account.password);
  if (!userId) redirect("/login?error=demo-unavailable");

  await createSession(userId);
  redirect(homePathForRole(account.role));
}

export async function logoutAction() {
  const user = await getSessionUser();
  await destroySession();
  redirect(user?.roleSlug === "student" ? "/login?bye=1" : "/login");
}
