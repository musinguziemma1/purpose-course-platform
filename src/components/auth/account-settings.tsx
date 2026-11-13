import Link from "next/link";
import { CheckCircle2, UserRound } from "lucide-react";
import { ProfileForm } from "@/components/auth/profile-form";
import { PasswordForm } from "@/components/auth/password-form";
import { profileIsComplete } from "@/lib/profile";
import { homePathForRole, type SessionUser } from "@/lib/auth";

export function AccountSettings({ user }: { user: SessionUser }) {
  const complete = profileIsComplete(user);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-dark">
            Your account
          </p>
          <h1 className="mt-2 font-serif text-3xl text-navy">
            Profile &amp; settings
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Keep your details current so your course team can support you.
          </p>
        </div>
        <Link
          href={homePathForRole(user.roleSlug)}
          className="rounded-full border border-navy/15 px-4 py-2 text-sm font-semibold text-navy"
        >
          Continue to workspace →
        </Link>
      </div>
      <div
        role="status"
        className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${complete ? "border-source/20 bg-source/5 text-source" : "border-gold/30 bg-gold/10 text-navy"}`}
      >
        {complete ? (
          <CheckCircle2 className="h-5 w-5 shrink-0" />
        ) : (
          <UserRound className="h-5 w-5 shrink-0" />
        )}
        <div>
          <p className="font-semibold">
            {complete
              ? "Your profile is complete"
              : "Complete your profile to continue"}
          </p>
          <p className="mt-1">
            {complete
              ? "You can update these details at any time."
              : "Your name, phone, location, time zone and introduction are required. This reminder remains until you save them."}
          </p>
        </div>
      </div>
      <section className="admin-card p-5 sm:p-7">
        <h2 className="font-serif text-xl text-navy">Personal details</h2>
        <p className="mt-1 text-sm text-stone-500">
          {user.email} · {user.roleName}
        </p>
        <ProfileForm
          profile={{
            fullName: user.fullName,
            title: user.title ?? "",
            bio: user.bio ?? "",
            phone: user.phone ?? "",
            location: user.location ?? "",
            timezone: user.timezone ?? "Africa/Kampala",
            avatarUrl: user.avatarUrl ?? "",
          }}
        />
      </section>
      <section className="admin-card p-5 sm:p-7">
        <h2 className="mb-4 font-serif text-xl text-navy">
          Password &amp; security
        </h2>
        <PasswordForm />
      </section>
    </div>
  );
}
