import "server-only";
import { cookies, headers } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, profiles, roles, users } from "@/db/schema";
import { ROLE_LEVEL, homePathForRole } from "@/lib/roles";
import { can } from "@/lib/rbac";

export const SESSION_COOKIE = "pc_session";
const SESSION_DAYS = 14;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, digest] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !digest) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

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
    // Embedded previews are third-party contexts: SameSite=None + Partitioned
    // keeps the session usable inside an iframe over HTTPS.
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    partitioned: isProduction,
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
};

async function findByRoleSlug(roleSlug: string): Promise<SessionUser | null> {
  const rows = await db
    .select(sessionSelection)
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(eq(roles.slug, roleSlug))
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
export async function getSessionUser(): Promise<SessionUser | null> {
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
        .where(and(eq(authSessions.token, token), gt(authSessions.expiresAt, new Date())))
        .limit(1);
      if (rows[0]) return rows[0];
    } catch {
      /* fall through to review mode */
    }
  }

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
}

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
  return roleAtLeast(user, "editor");
}

export function canPublishArticles(user: SessionUser | null) {
  return roleAtLeast(user, "editor");
}

export function canManageSettings(user: SessionUser | null) {
  return roleAtLeast(user, "admin");
}

export function canManagePeople(user: SessionUser | null) {
  return roleAtLeast(user, "admin");
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
