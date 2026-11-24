import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { isDemoEnabled } from "@/lib/demo";
import { profileIsComplete } from "@/lib/profile";
import { googleSignInAvailable } from "@/lib/google-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in", robots: { index: false, follow: false } };

const SIGN_IN_ERRORS: Record<string, string> = {
  "google-unavailable": "Google sign-in is not set up on this site yet. Please use your email and password.",
  "google-cancelled": "Google sign-in was cancelled. You can try again or use your email and password.",
  "google-expired": "That Google sign-in took too long or was started in another tab. Please try again.",
  "google-inactive": "This account is not active. Contact the Purpose Course team for help.",
  "google-failed": "Google sign-in could not be completed. Please try again or use your email and password.",
};

/** Google's multicolour "G", as required by its sign-in branding guidelines. */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; password?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect(user.isDemo || profileIsComplete(user) ? homePathForRole(user.roleSlug) : "/account?complete=1");
  const params = await searchParams;
  return <AuthShell mode="login">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Keep moving with purpose</p>
    <h1 className="mt-3 font-serif text-4xl leading-tight text-navy sm:text-5xl">Welcome back.</h1>
    <p className="mt-4 text-sm leading-relaxed text-stone-600">Your learning, your people, your next step. Sign in to pick up where you left off.</p>
    {params.password === "changed" ? <p role="status" className="mt-5 rounded-xl bg-source/10 p-3 text-sm text-source">Your password has been changed. Sign in with your new password.</p> : null}
    {params.error ? <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{SIGN_IN_ERRORS[params.error] ?? "Sign-in could not be completed. Please try again."}</p> : null}
    {params.next ? <p className="mt-5 rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm text-stone-600">Sign in to continue to the page you requested.</p> : null}
    {googleSignInAvailable() ? (
      <div className="mt-8">
        <a
          href={`/api/auth/google${params.next ? `?next=${encodeURIComponent(params.next)}` : ""}`}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-navy/20 bg-white text-sm font-semibold text-navy shadow-xs transition-[transform,background-color] duration-150 hover:bg-cream active:scale-[0.98]"
        >
          <GoogleMark /> Continue with Google
        </a>
        <p className="mt-2 text-center text-xs text-stone-600">For existing accounts. Use the Google account with the same email address.</p>
        <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-stone-500" aria-hidden><span className="h-px flex-1 bg-navy/10" />or with email<span className="h-px flex-1 bg-navy/10" /></div>
      </div>
    ) : null}
    <div className={googleSignInAvailable() ? "mt-6" : "mt-8"}><LoginForm next={params.next} /></div>
    <div className="mt-7 border-t border-navy/10 pt-5 text-center text-sm text-stone-600">New to Purpose Course? <Link href="/signup" className="font-semibold text-navy underline decoration-gold underline-offset-4">Apply for an account</Link></div>
    <p className="mt-4 text-center text-xs leading-relaxed text-stone-500">New applications require staff approval. Staff and mentors join through an administrator invitation.</p>
    {isDemoEnabled() ? <div className="mt-6 rounded-xl bg-cream p-4 text-xs text-stone-600"><p className="font-semibold">Local development review</p><div className="mt-2 flex flex-wrap gap-4"><Link href="/api/demo-login?role=super_admin">Admin</Link><Link href="/api/demo-login?role=mentor">Mentor</Link><Link href="/api/demo-login?role=student">Student</Link></div></div> : null}
  </AuthShell>;
}
