import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { GoogleButton } from "@/components/auth/google-button";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { GOOGLE_APPLICANT_COOKIE, googleConfiguration, openApplicant } from "@/lib/google-auth";

export const metadata = {
  title: "Apply for a student account",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const { google } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(homePathForRole(user.roleSlug));
  const config = googleConfiguration();
  // A Google-verified name and email arrive in a short-lived sealed cookie; anything else is ignored.
  const applicant = config ? openApplicant((await cookies()).get(GOOGLE_APPLICANT_COOKIE)?.value, config.clientSecret) : null;

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
      {applicant ? (
        <p role="status" className="mt-5 rounded-xl border border-source/25 bg-source/5 p-3 text-sm leading-relaxed text-navy">
          Google confirmed your email address{google === "no-account" ? " (there is no account for it yet)" : ""}. Your name and email are filled in below:
          choose a password and submit your application. Staff review every new student; once approved you can sign in with Google too.
        </p>
      ) : google === "no-account" ? (
        <p role="status" className="mt-5 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm leading-relaxed text-navy">
          There is no Purpose Course account for that Google address yet. Apply below: staff review every new student, and once
          you are approved you can sign in with Google using the same email address.
        </p>
      ) : null}
      {config && !applicant ? (
        <div className="mt-7">
          <GoogleButton href="/api/auth/google?intent=apply" note="We use Google only to confirm your name and email. Staff still review your application." divider="or apply with email" />
        </div>
      ) : null}
      <SignupForm defaults={applicant ? { fullName: applicant.name, email: applicant.email } : undefined} emailVerified={Boolean(applicant)} />
    </AuthShell>
  );
}
