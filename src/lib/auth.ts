import "server-only";
import { cookies, headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { verifyPassword } from "../../scripts/password-security.mjs";
export { hashPassword, verifyPassword } from "../../scripts/password-security.mjs";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, profiles, roles, users } from "@/db/schema";
import { ROLE_LEVEL, homePathForRole } from "@/lib/roles";
import { can } from "@/lib/rbac";
import { isDemoEnabled } from "@/lib/demo";

export const SESSION_COOKIE = "pc_session";
const SESSION_DAYS = 14;

export type SessionUser = {
  profileId: string;
  userId: string;
  email: string;
  fullName: string;
  slug: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
  roleSlug: string;
  roleName: string;
  roleLevel: number;
  permissions: string[];
  /** True when the identity came from review mode rather than a real session. */
  isDemo?: boolean;
  /** A password-protected practice account, distinct from local anonymous review. */
  isDemoAccount?: boolean;
};

const WORKSPACE_ROLE: Record<string, string> = {
  admin: "super_admin",
  mentor: "mentor",
  learn: "student",
};

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(authSessions).values({ token, userId, expiresAt });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  const jar = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.token, token));
  }
  jar.delete(SESSION_COOKIE);
}

const sessionSelection = {
  profileId: profiles.id,
  userId: users.id,
  email: users.email,
  fullName: profiles.fullName,
  slug: profiles.slug,
  title: profiles.title,
  bio: profiles.bio,
  avatarUrl: profiles.avatarUrl,
  roleSlug: roles.slug,
  roleName: roles.name,
  roleLevel: roles.level,
  permissions: roles.permissions,
  isDemoAccount: users.isDemoAccount,
};

async function findByRoleSlug(roleSlug: string): Promise<SessionUser | null> {
  const rows = await db
    .select(sessionSelection)
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(and(eq(roles.slug, roleSlug), eq(users.isActive, true)))
    .orderBy(profiles.createdAt)
    .limit(1);
  const row = rows[0];
  return row ? { ...row, isDemo: true } : null;
}

/**
 * Resolves the acting user. A real session cookie always wins; otherwise, for
 * workspace routes only, middleware may supply a review identity so the
 * dashboards can be inspected in environments that block third-party cookies.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      const rows = await db
        .select(sessionSelection)
        .from(authSessions)
        .innerJoin(users, eq(authSessions.userId, users.id))
        .innerJoin(profiles, eq(profiles.userId, users.id))
        .innerJoin(roles, eq(profiles.roleId, roles.id))
        .where(and(eq(authSessions.token, token), gt(authSessions.expiresAt, new Date()), eq(users.isActive, true)))
        .limit(1);
      if (rows[0]) return rows[0];
    } catch {
      return null;
    }
  }

  if (!isDemoEnabled()) return null;

  try {
    const headerBag = await headers();
    const workspace = headerBag.get("x-purpose-demo-workspace");
    if (!workspace) return null;
    const override = headerBag.get("x-purpose-demo-role");
    const roleSlug = override && override.length > 0 ? override : WORKSPACE_ROLE[workspace];
    if (!roleSlug) return null;

    const demo = await findByRoleSlug(roleSlug);
    if (demo) return demo;

    // Fresh database: provision the demo accounts, then retry once.
    const { ensureDemoAccounts } = await import("@/db/accounts");
    await ensureDemoAccounts();
    return findByRoleSlug(roleSlug);
  } catch {
    return null;
  }
});

export async function authenticate(email: string, password: string) {
  const rows = await db
    .select({ id: users.id, passwordHash: users.passwordHash, isActive: users.isActive })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  const user = rows[0];
  if (!user || !user.isActive) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user.id;
}

const LEGACY_MINIMUM: Record<string, string> = { admin: "platform_admin" };

export function roleAtLeast(user: SessionUser | null, role: string) {
  if (!user) return false;
  const target = LEGACY_MINIMUM[role] ?? role;
  return (ROLE_LEVEL[user.roleSlug] ?? 0) >= (ROLE_LEVEL[target] ?? 0);
}

export function canReviewArticles(user: SessionUser | null) {
  return can(user, "content.review");
}

export function canPublishArticles(user: SessionUser | null) {
  return can(user, "content.publish");
}

export function canManageSettings(user: SessionUser | null) {
  return can(user, "org.manage");
}

export function canManagePeople(user: SessionUser | null) {
  return can(user, "people.manage");
}

export function canAuthorAcademy(user: SessionUser | null) {
  return can(user, "academy.author");
}

export function canManageAssessments(user: SessionUser | null) {
  return can(user, "academy.assess");
}

export function canModerateCommunity(user: SessionUser | null) {
  return can(user, "community.moderate");
}

export function isStaff(user: SessionUser | null) {
  return Boolean(
    user &&
      ["super_admin", "platform_admin", "program_manager", "editor", "author", "moderator"].includes(user.roleSlug),
  );
}

export function isMentor(user: SessionUser | null) {
  return Boolean(user && ["mentor", "instructor", "program_manager", "platform_admin", "super_admin"].includes(user.roleSlug));
}

export function isStudent(user: SessionUser | null) {
  return user?.roleSlug === "student";
}

export { homePathForRole };
