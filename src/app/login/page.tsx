import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { isDemoEnabled } from "@/lib/demo";
import { profileIsComplete } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in", robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; password?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect(user.isDemo || profileIsComplete(user) ? homePathForRole(user.roleSlug) : "/account?complete=1");
  const params = await searchParams;
  return <AuthShell mode="login">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Keep moving with purpose</p>
    <h1 className="mt-3 font-serif text-4xl leading-tight text-navy sm:text-5xl">Welcome back.</h1>
    <p className="mt-4 text-sm leading-relaxed text-stone-600">Your learning, your people, your next step. Sign in to pick up where you left off.</p>
    {params.password === "changed" ? <p role="status" className="mt-5 rounded-xl bg-source/10 p-3 text-sm text-source">Your password has been changed. Sign in with your new password.</p> : null}
    {params.error ? <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Sign-in could not be completed. Please try again.</p> : null}
    {params.next ? <p className="mt-5 rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm text-stone-600">Sign in to continue to the page you requested.</p> : null}
    <div className="mt-8"><LoginForm next={params.next} /></div>
    <div className="mt-7 border-t border-navy/10 pt-5 text-center text-sm text-stone-600">New to Purpose Course? <Link href="/signup" className="font-semibold text-navy underline decoration-gold underline-offset-4">Apply for an account</Link></div>
    <p className="mt-4 text-center text-xs leading-relaxed text-stone-500">New applications require staff approval. Staff and mentors join through an administrator invitation.</p>
    {isDemoEnabled() ? <div className="mt-6 rounded-xl bg-cream p-4 text-xs text-stone-600"><p className="font-semibold">Local development review</p><div className="mt-2 flex flex-wrap gap-4"><Link href="/api/demo-login?role=super_admin">Admin</Link><Link href="/api/demo-login?role=mentor">Mentor</Link><Link href="/api/demo-login?role=student">Student</Link></div></div> : null}
  </AuthShell>;
}
