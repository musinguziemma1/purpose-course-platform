import { NextResponse, type NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { APPLICANT_SECONDS, GOOGLE_APPLICANT_COOKIE, GOOGLE_STATE_COOKIE, exchangeCode, googleConfiguration, googleSigningKeys, openFlow, redirectUriFor, sealApplicant, statesMatch, verifyIdToken } from "@/lib/google-auth";
import { accountForGoogleEmail, recordGoogleSignIn, workspaceHomeForUser } from "@/db/google-sign-in";
import { canonicalOrigin } from "@/lib/site-origin";

export const dynamic = "force-dynamic";

/** Completes Google sign-in for an existing, active account with the same verified email. */
export async function GET(request: NextRequest) {
  const origin = canonicalOrigin(request);
  const finish = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  const config = googleConfiguration();
  if (!config) return finish("/login?error=google-unavailable");
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return finish("/login?error=google-cancelled");
  const flow = openFlow(request.cookies.get(GOOGLE_STATE_COOKIE)?.value, config.clientSecret);
  if (!flow || !statesMatch(flow.state, params.get("state"))) return finish("/login?error=google-expired");
  const code = params.get("code");
  if (!code || code.length > 2048) return finish("/login?error=google-failed");

  try {
    const idToken = await exchangeCode({ code, verifier: flow.verifier, redirectUri: redirectUriFor(origin), config });
    const claims = await verifyIdToken(idToken, { clientId: config.clientId, nonce: flow.nonce, keys: (refresh) => googleSigningKeys(fetch, refresh) });
    const account = await accountForGoogleEmail(claims.email);
    if (account.status === "no-account") {
      // No account yet: carry the verified name and email to the staff-reviewed application form.
      const response = finish("/signup?google=no-account");
      response.cookies.set(GOOGLE_APPLICANT_COOKIE, sealApplicant({ name: claims.name ?? "", email: claims.email }, config.clientSecret), {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: APPLICANT_SECONDS,
      });
      return response;
    }
    if (account.status === "inactive") return finish("/login?error=google-inactive");
    await createSession(account.userId);
    await recordGoogleSignIn(account.userId);
    const home = await workspaceHomeForUser(account.userId);
    return finish(home.startsWith("/account?") ? home : flow.next || home);
  } catch (error) {
    console.warn("[google] sign-in could not be completed:", error instanceof Error ? error.message : "unknown error");
    return finish("/login?error=google-failed");
  }
}
