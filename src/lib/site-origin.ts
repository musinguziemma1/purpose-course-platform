import { publicOrigin } from "@/lib/site-url";

/**
 * The origin external providers (Google) must call back to. Deployments use
 * the configured APP_URL / Vercel production domain; local development without
 * APP_URL uses the address the browser actually used, including its port.
 */
export function canonicalOrigin(request: { nextUrl: { origin: string } }) {
  if (process.env.APP_URL?.trim() || process.env.VERCEL) {
    try {
      return publicOrigin();
    } catch {
      /* invalid APP_URL: fall back to the request below */
    }
  }
  return request.nextUrl.origin;
}
