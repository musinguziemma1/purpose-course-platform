import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Database, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getRoleMatrix } from "@/db/learning";

export const dynamic = "force-dynamic";

export const metadata = { title: "Data architecture" };

const MODULES: { name: string; tables: { table: string; purpose: string }[] }[] = [
  {
    name: "Identity",
    tables: [
      { table: "users", purpose: "Authentication credentials (scrypt hashes)" },
      { table: "profiles", purpose: "Public identity, role and organisation" },
      { table: "roles", purpose: "Programme roles with levels" },
      { table: "permissions", purpose: "Permission catalogue by module" },
      { table: "role_permissions", purpose: "Role → permission join" },
      { table: "organizations", purpose: "Multi-tenant organisation records" },
      { table: "org_memberships", purpose: "Person ↔ organisation scoped role" },
    ],
  },
  {
    name: "Content",
    tables: [
      { table: "articles", purpose: "Journal content with editorial workflow" },
      { table: "pages", purpose: "Website pages" },
      { table: "media_assets", purpose: "Images and files" },
      { table: "resources", purpose: "Downloadable learning materials" },
      { table: "categories", purpose: "Five purpose principles as taxonomies" },
      { table: "tags", purpose: "Article classification" },
    ],
  },
  {
    name: "Learning",
    tables: [
      { table: "course_levels", purpose: "Foundation → Intermediate → Advanced" },
      { table: "courses", purpose: "Structured course container" },
      { table: "course_sessions", purpose: "The 15 programme sessions" },
      { table: "course_modules", purpose: "Modules in progression order" },
      { table: "lessons", purpose: "Video, audio, illustration, download, practice" },
      { table: "learning_activities", purpose: "Practice tasks attached to lessons" },
      { table: "live_sessions", purpose: "Classes, group work, discussions" },
    ],
  },
  {
    name: "Learners",
    tables: [
      { table: "enrollments", purpose: "Learner ↔ level with cohort" },
      { table: "learning_progress", purpose: "Session completion" },
      { table: "lesson_progress", purpose: "Lesson-level progression state" },
      { table: "learner_goals", purpose: "Development goals with mentor review" },
      { table: "reflections", purpose: "Journal entries with visibility" },
      { table: "achievements", purpose: "Achievement catalogue" },
      { table: "learner_achievements", purpose: "Awarded achievements" },
      { table: "certificates", purpose: "Verified completion credentials" },
    ],
  },
  {
    name: "Assessments",
    tables: [
      { table: "assessments", purpose: "Session quizzes and level exams" },
      { table: "assessment_questions", purpose: "Five-choice items" },
      { table: "assessment_attempts", purpose: "Auto-graded submissions" },
      { table: "assessment_answers", purpose: "Per-item responses" },
      { table: "instruments", purpose: "Eight proprietary instruments" },
      { table: "instrument_dimensions", purpose: "Construct domains" },
      { table: "instrument_items", purpose: "Reverse-scored, weighted items" },
      { table: "instrument_sessions", purpose: "Consent + version per attempt" },
      { table: "instrument_responses", purpose: "Raw and scored values" },
      { table: "instrument_results", purpose: "Band + trace + recommendations" },
      { table: "scoring_rules", purpose: "Versioned scoring expressions" },
    ],
  },
  {
    name: "Mentorship",
    tables: [
      { table: "mentor_assignments", purpose: "Mentor ↔ learner caseload" },
      { table: "coaching_sessions", purpose: "Scheduled clarity sessions" },
      { table: "mentoring_notes", purpose: "Session notes shared with learner" },
      { table: "learner_flags", purpose: "Follow-up flags and resolution" },
      { table: "assignment_submissions", purpose: "Work submitted for feedback" },
      { table: "group_submissions", purpose: "Collaborative deliverables scored" },
    ],
  },
  {
    name: "Community",
    tables: [
      { table: "communities", purpose: "Purpose communities by category" },
      { table: "community_members", purpose: "Membership and facilitator role" },
      { table: "discussion_threads", purpose: "Discussions and questions" },
      { table: "discussion_posts", purpose: "Replies" },
      { table: "discussion_comments", purpose: "Nested comments" },
      { table: "reactions", purpose: "Reactions on threads and posts" },
      { table: "content_reports", purpose: "Moderation queue" },
    ],
  },
  {
    name: "Communication",
    tables: [
      { table: "notifications", purpose: "In-app notification rows" },
      { table: "notification_preferences", purpose: "Per-category channel settings" },
      { table: "notification_outbox", purpose: "Email / push queue" },
      { table: "email_events", purpose: "Queued, sent, opened lifecycle" },
      { table: "messages", purpose: "Direct mentor ↔ learner messages" },
    ],
  },
  {
    name: "Analytics",
    tables: [
      { table: "events", purpose: "Platform event stream" },
      { table: "learning_events", purpose: "Learning activity stream" },
      { table: "engagement", purpose: "Daily engagement snapshots" },
      { table: "reports", purpose: "Defined M&E report catalogue" },
    ],
  },
  {
    name: "Audit",
    tables: [
      { table: "activity_logs", purpose: "Editorial and platform actions" },
      { table: "security_events", purpose: "Auth, role and export events" },
      { table: "data_changes", purpose: "Before/after record changes" },
    ],
  },
];

export default async function ArchitecturePage() {
  await requireAdminPage("/admin/architecture");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!can(user, "analytics.view") && !can(user, "people.manage")) redirect("/admin");

  const [counts, roles] = await Promise.all([
    db.execute(sql`select relname as table_name from pg_stat_user_tables order by relname`),
    getRoleMatrix(),
  ]);
  const tableCounts = new Map(
    (counts.rows as { table_name: string }[]).map((row) => [row.table_name, 1]),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-dark">Enterprise data architecture</p>
          <h1 className="mt-1.5 font-serif text-2xl text-navy">Eleven modules, one schema</h1>
          <p className="max-w-2xl text-[12.5px] leading-relaxed text-stone-600">
            One Postgres schema organised by domain, with consistent UUID identities, foreign keys, versioned content and
            a full audit trail. Every table below is live in this environment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/analytics" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-3.5 text-[11.5px] font-semibold text-paper hover:bg-navy-700">
            Learning analytics <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/admin/people" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 bg-paper px-3.5 text-[11.5px] font-medium text-navy hover:bg-cream">
            RBAC & people
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="admin-card p-4">
          <Database className="h-4 w-4 text-gold-dark" />
          <p className="mt-2 font-serif text-2xl text-navy">{tableCounts.size}</p>
          <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">tables across 11 modules</p>
        </div>
        <div className="admin-card p-4">
          <ShieldCheck className="h-4 w-4 text-gold-dark" />
          <p className="mt-2 font-serif text-2xl text-navy">{roles.length}</p>
          <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">roles with permission sets</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-dark">Audit</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-stone-600">
            activity_logs · security_events · data_changes — every mutation is attributable.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {MODULES.map((module) => (
          <div key={module.name} className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy/10 bg-cream/40 px-4 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">{module.name}</p>
              <span className="text-[9.5px] uppercase tracking-[0.08em] text-stone-500">{module.tables.length} tables</span>
            </div>
            <ul className="divide-y divide-navy/8">
              {module.tables.map((entry) => (
                <li key={entry.table} className="flex items-start justify-between gap-3 px-4 py-1.5">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-navy">{entry.table}</p>
                    <p className="text-[10px] leading-relaxed text-stone-500">{entry.purpose}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${tableCounts.has(entry.table) ? "bg-source/10 text-source" : "bg-rose-50 text-rose-600"}`}
                  >
                    {tableCounts.has(entry.table) ? "live" : "missing"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
