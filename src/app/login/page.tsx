import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  ClipboardCheck,
  Compass,
  GraduationCap,
  KeyRound,
  PenLine,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { ensureDemoAccounts } from "@/db/accounts";
import { DEMO_ACCOUNTS, ROLE_CATALOG } from "@/lib/roles";
import { isDemoEnabled } from "@/lib/demo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in to your workspace",
  robots: { index: false, follow: false },
};

const ROLE_ICONS: Record<string, typeof ShieldCheck> = {
  super_admin: ShieldCheck,
  platform_admin: ShieldCheck,
  program_manager: Workflow,
  editor: Workflow,
  instructor: Compass,
  mentor: Compass,
  moderator: BookOpenCheck,
  author: PenLine,
  student: GraduationCap,
  guest: BookOpenCheck,
};

const ROLE_HIGHLIGHTS: Record<string, string[]> = {
  super_admin: ["People, roles & organisations", "Full publishing control", "Academy oversight"],
  editor: ["Review & approval queue", "Scheduling and publishing", "Community moderation"],
  mentor: ["Coaching sessions", "Assignment feedback", "Mentee progress"],
  author: ["Drafts & revisions", "Submit for review", "Editorial feedback"],
  student: ["Courses & assessments", "Goals, cohort & mentor", "Verified certificates"],
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(homePathForRole(user.roleSlug));

  await ensureDemoAccounts().catch(() => undefined);
  const params = await searchParams;
  const demoEnabled = isDemoEnabled();

  return (
    <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.15fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-paper lg:flex">
        <img
          src="/images/mentorship.jpg"
          alt="A Purpose Course clarity coaching conversation"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/80 to-ink" aria-hidden />
        <div className="absolute inset-0 ink-grid opacity-30" aria-hidden />
        <div className="relative">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold text-ink">
              <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden>
                <path d="M16 3l3.2 8.1L28 14l-8.8 2.9L16 25l-3.2-8.1L4 14l8.8-2.9L16 3z" fill="currentColor" />
              </svg>
            </span>
            <span>
              <span className="block font-serif text-lg font-semibold tracking-tight">PURPOSE COURSE</span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.28em] text-gold">
                Discover · Clarify · Live · Impact
              </span>
            </span>
          </Link>
        </div>

        <div className="relative">
          <h1 className="font-serif text-4xl leading-tight">One identity. Five workspaces.</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-paper/60">
            Administrators run the platform, editors steward the journal, authors write, mentors coach and students
            learn. Every account signs in here and lands in the workspace its role is built for.
          </p>
          <div className="mt-8 space-y-2.5">
            {ROLE_CATALOG.map((role) => {
              const Icon = ROLE_ICONS[role.slug] ?? ShieldCheck;
              return (
                <div key={role.slug} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-gold" />
                  <div>
                    <p className="text-[12.5px] font-medium">
                      {role.name}
                      <span className="ml-2 rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-paper/50">
                        {role.workspace}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-paper/50">{role.blurb}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative text-[11px] text-paper/35">
          Session-based access · scrypt-hashed credentials · © {new Date().getFullYear()} Purpose Course
        </p>
      </div>

      <div className="bg-paper px-5 py-10 sm:px-10 lg:py-12">
        <div className="mx-auto w-full max-w-2xl">
          <Link href="/" className="inline-flex items-center gap-2 text-[12px] font-medium text-stone-600 hover:text-navy">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to the website
          </Link>

          {demoEnabled ? <div className="mt-5 rounded-2xl border border-gold/40 bg-gradient-to-br from-cream to-paper p-5">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
              <Sparkles className="h-3.5 w-3.5" /> Open for review
            </p>
            <h2 className="mt-1.5 font-serif text-2xl text-navy">Open the dashboards without signing in</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-stone-600">
              Review access is enabled in this preview, so these links open the seeded dashboards directly — even if your
              browser blocks cookies inside the preview frame.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                { href: "/admin", label: "Admin dashboard", hint: "Publishing + people" },
                { href: "/mentor", label: "Mentor desk", hint: "Coaching + reviews" },
                { href: "/learn", label: "Student portal", hint: "Programme + progress" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-xl border border-navy/15 bg-paper px-3.5 py-3 transition-colors hover:border-gold hover:bg-white"
                >
                  <p className="flex items-center justify-between text-[12.5px] font-semibold text-navy">
                    {item.label}
                    <ArrowRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-gold-dark" />
                  </p>
                  <p className="text-[10.5px] uppercase tracking-[0.08em] text-stone-500">{item.hint}</p>
                </Link>
              ))}
            </div>
          </div> : null}

          <h2 className="mt-7 font-serif text-3xl text-navy">{demoEnabled ? "Choose a workspace to enter" : "Sign in to your workspace"}</h2>
          {demoEnabled ? <p className="mt-1.5 text-sm text-stone-600">
            One click signs you in with a prepared demo account — no password needed. All five accounts are live in this
            environment.
          </p> : null}

          {params.error ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              That sign-in could not be completed. Try again, or use the manual form below.
            </p>
          ) : null}
          {params.next ? (
            <p className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-stone-700">
              Sign in to continue to <code className="text-navy">{params.next}</code>.
            </p>
          ) : null}

          {demoEnabled ? <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {ROLE_CATALOG.map((role) => {
              const account = DEMO_ACCOUNTS.find((item) => item.role === role.slug);
              if (!account) return null;
              const Icon = ROLE_ICONS[role.slug] ?? ShieldCheck;
              return (
                <a
                  key={role.slug}
                  href={`/api/demo-login?role=${role.slug}`}
                  className="interactive group flex h-full w-full flex-col rounded-xl border border-navy/12 bg-paper p-4 text-left"
                >
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream text-gold-dark">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400 group-hover:text-gold-dark">
                        Enter <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                    <p className="mt-2.5 font-serif text-lg text-navy">{role.name}</p>
                    <p className="text-[10.5px] uppercase tracking-[0.08em] text-stone-500">{role.workspaceLabel}</p>
                    <ul className="mt-2 space-y-1">
                      {ROLE_HIGHLIGHTS[role.slug].map((item) => (
                        <li key={item} className="flex gap-1.5 text-[11px] leading-snug text-stone-600">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 flex items-center justify-between border-t border-navy/8 pt-2 text-[10px] text-stone-400">
                      <span>{account.email}</span>
                      <span className="font-semibold uppercase tracking-[0.08em] text-gold-dark">One-click sign in</span>
                    </p>
                </a>
              );
            })}

            <div className="rounded-xl border border-dashed border-navy/15 bg-cream/40 p-4">
              <BookOpenCheck className="h-5 w-5 text-stone-400" />
              <p className="mt-2 text-[12.5px] font-medium text-navy">Need another account?</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">
                Administrators can invite colleagues and change roles from{" "}
                <span className="font-medium text-navy">People &amp; access</span>.
              </p>
              <p className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-stone-400">
                <ClipboardCheck className="h-3 w-3" /> every action is logged
              </p>
            </div>
          </div> : null}

          <div className="mt-7 rounded-2xl border border-navy/10 bg-paper p-5 shadow-lift">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-gold-dark" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy">Sign in with your account</p>
            </div>
            <div className="mt-3">
              <LoginForm />
            </div>
            {demoEnabled ? <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
              All demo accounts use the password <code className="rounded bg-cream px-1 py-0.5 text-navy">Purpose2026!</code>.
              Credentials are stored as scrypt hashes in the <code className="rounded bg-cream px-1 py-0.5 text-navy">users</code>{" "}
              table, separate from public profiles.
            </p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
