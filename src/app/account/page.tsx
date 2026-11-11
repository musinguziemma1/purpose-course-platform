import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { PasswordForm } from "@/components/auth/password-form";

export const metadata = { title: "Your account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");
  return <main className="min-h-screen bg-cream px-5 py-12">
    <div className="mx-auto max-w-lg rounded-2xl border border-navy/10 bg-paper p-6">
      <Link href={homePathForRole(user.roleSlug)} className="text-sm font-semibold text-gold-dark">← Back to your workspace</Link>
      <h1 className="mt-6 font-serif text-3xl text-navy">Your account</h1>
      <p className="mt-2 text-sm text-stone-600">{user.email} · {user.roleName}</p>
      <h2 className="mt-7 font-serif text-xl text-navy">Change your password</h2>
      <PasswordForm />
    </div>
  </main>;
}
