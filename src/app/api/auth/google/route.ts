import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_STATE_COOKIE, authorizationUrl, googleConfiguration, redirectUriFor, sealFlow, startFlow } from "@/lib/google-auth";
import { canonicalOrigin } from "@/lib/site-origin";

export const dynamic = "force-dynamic";

/** Starts "Continue with Google" on the canonical origin registered with Google. */
export async function GET(request: NextRequest) {
  const origin = canonicalOrigin(request);
  const config = googleConfiguration();
  if (!config) return NextResponse.redirect(new URL("/login?error=google-unavailable", origin));
  // Google only redirects back to registered addresses: run the whole flow on the canonical host.
  // Compare the Host the browser used (request.url can be normalised), and hop at most once.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host && host !== new URL(origin).host && !request.nextUrl.searchParams.has("canonical")) {
    const target = new URL("/api/auth/google", origin);
    const next = request.nextUrl.searchParams.get("next"), intent = request.nextUrl.searchParams.get("intent");
    if (intent) target.searchParams.set("intent", intent);
    if (next) target.searchParams.set("next", next);
    target.searchParams.set("canonical", "1");
    return NextResponse.redirect(target);
  }
  const { flow, challenge } = startFlow(request.nextUrl.searchParams.get("next") ?? "", request.nextUrl.searchParams.get("intent") ?? undefined);
  const response = NextResponse.redirect(authorizationUrl({ clientId: config.clientId, redirectUri: redirectUriFor(origin), state: flow.state, nonce: flow.nonce, challenge }));
  response.cookies.set(GOOGLE_STATE_COOKIE, sealFlow(flow, config.clientSecret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
