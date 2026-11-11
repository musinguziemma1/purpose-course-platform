import "server-only";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { canAccessAdminPath } from "@/lib/admin-access";

export async function requireAdminPage(path: string) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!canAccessAdminPath(user, path)) {
    if (path === "/admin") redirect(homePathForRole(user.roleSlug));
    notFound();
  }
  return user;
}
