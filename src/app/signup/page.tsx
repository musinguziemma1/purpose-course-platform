import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getSessionUser, homePathForRole } from "@/lib/auth";
export const metadata = {
  title: "Apply for a student account",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect(homePathForRole(user.roleSlug));
  return (
    <AuthShell mode="signup">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
        Your journey starts here
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight text-navy">
        Make room for
        <br />
        your purpose.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-stone-600">
        Apply to join a community of learners finding clarity and putting it
        into practice.
      </p>
      <SignupForm />
    </AuthShell>
  );
}
