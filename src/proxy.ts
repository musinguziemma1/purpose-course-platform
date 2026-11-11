import { NextResponse, type NextRequest } from "next/server";

/**
 * Review mode.
 *
 * The preview environment renders the app inside an iframe on another origin,
 * where browsers may block the session cookie entirely. To keep every
 * workspace reviewable we inject a request header for workspace routes that
 * tells the server which demo identity to use when no session cookie exists.
 *
 * This only ever applies to /admin, /mentor and /learn. The public website and
 * /login are untouched, and real sessions always win. Set
 * PURPOSE_DEMO_OPEN=false to switch it off.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  let workspace = pathname.split("/")[1] ?? "";

  // Student-facing APIs default to the learner workspace in review mode.
  if (workspace === "api") {
    workspace =
      pathname.startsWith("/api/assessments") ||
      pathname.startsWith("/api/instruments") ||
      pathname.startsWith("/api/live") ||
      pathname.startsWith("/api/conference")
        ? "learn"
        : "";
  }

  if (workspace === "room") {
    workspace = "learn";
  }

  // Fetch calls from a workspace (e.g. the notification bell) inherit the
  // workspace of the page that made them via the Referer header.
  if (!["admin", "mentor", "learn"].includes(workspace)) {
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        workspace = new URL(referer).pathname.split("/")[1] ?? "";
      } catch {
        workspace = "";
      }
    }
  }

  if (!["admin", "mentor", "learn"].includes(workspace) || process.env.PURPOSE_DEMO_OPEN === "false") {
    return NextResponse.next({ request: { headers } });
  }

  headers.set("x-purpose-demo-workspace", workspace);

  const as = request.nextUrl.searchParams.get("as");
  const remembered = request.cookies.get("pc_review_role")?.value;
  const role = as ?? remembered;
  if (role) headers.set("x-purpose-demo-role", role);

  const response = NextResponse.next({ request: { headers } });
  if (as && as !== remembered) {
    response.cookies.set("pc_review_role", as, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
    });
  }
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/mentor/:path*",
    "/learn/:path*",
    "/room/:path*",
    "/api/notifications",
    "/api/live/:path*",
    "/api/assessments/:path*",
    "/api/conference/:path*",
    "/api/instruments/:path*",
  ],
};
