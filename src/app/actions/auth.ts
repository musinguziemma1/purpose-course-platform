"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, roles } from "@/db/schema";
import { authenticate, createSession, destroySession, getSessionUser } from "@/lib/auth";
import { ensureDemoAccounts } from "@/db/accounts";
import { DEMO_ACCOUNTS, homePathForRole } from "@/lib/roles";
import { isDemoEnabled } from "@/lib/demo";
import { profileIsComplete } from "@/lib/profile";

export type LoginState = { error?: string };

async function redirectToWorkspace(userId: string): Promise<string> {
  const rows = await db
    .select({ roleSlug: roles.slug, fullName: profiles.fullName, phone: profiles.phone, location: profiles.location, bio: profiles.bio, profileCompletedAt: profiles.profileCompletedAt })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(eq(profiles.userId, userId))
    .limit(1);
  return rows[0] && profileIsComplete(rows[0]) ? homePathForRole(rows[0].roleSlug) : "/account?complete=1";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password || email.length > 255 || password.length > 128) {
    return { error: "Enter your email address and password." };
  }

  await ensureDemoAccounts().catch(() => undefined);
  const userId = await authenticate(email, password);
  if (!userId) {
    return { error: "Those credentials do not match an active account." };
  }

  await createSession(userId);
  const home = await redirectToWorkspace(userId), next = String(formData.get("next") ?? "");
  const safeNext = /^\/(?:learn|mentor|admin|account|community|events)(?:[/?#]|$)/.test(next) && !/[\\\r\n]/.test(next);
  redirect(home.startsWith("/account?") ? home : safeNext ? next : home);
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
