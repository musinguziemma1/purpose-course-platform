import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Database, ScrollText, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getRoleMatrix } from "@/db/learning";
import { Led } from "@/components/admin/console/instruments";
import { ConsoleHeader, MetricTile, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

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
  const catalogued = MODULES.reduce((sum, module) => sum + module.tables.length, 0);
  const missingTotal = MODULES.reduce((sum, module) => sum + module.tables.filter((entry) => !tableCounts.has(entry.table)).length, 0);

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Enterprise data architecture"
        title="Eleven modules, one schema"
        description="One Postgres schema organised by domain, with consistent UUID identities, foreign keys, versioned content and a full audit trail. Every table below is live in this environment."
        actions={
          <>
            <Link href="/admin/analytics" className={keyClass("navy", "sm")}>
              Learning analytics <ArrowRight aria-hidden />
            </Link>
            <Link href="/admin/people" className={keyClass("paper", "sm")}>
              RBAC & people
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile label="Tables across 11 modules" value={tableCounts.size} icon={Database} />
        <MetricTile label="Roles with permission sets" value={roles.length} icon={ShieldCheck} tone="gold" />
        <MetricTile
          label="Catalogue check"
          value={missingTotal ? `${missingTotal} missing` : "All live"}
          icon={ScrollText}
          tone={missingTotal ? "rose" : "source"}
          led={missingTotal ? { tone: "red", pulse: true } : { tone: "green" }}
          hint={`${catalogued} catalogued tables. Audit: activity_logs · security_events · data_changes — every mutation is attributable.`}
        />
      </div>

      <section aria-labelledby="catalogue-heading">
        <h2 id="catalogue-heading" className="sr-only">
          Module catalogue
        </h2>
        <p className="mb-3 text-[13px] text-stone-600">Pull a drawer to see its tables. Drawers with a missing table open by themselves.</p>
        <div className="k-stagger grid gap-4 lg:grid-cols-2 lg:items-start">
          {MODULES.map((module, index) => {
            const missing = module.tables.filter((entry) => !tableCounts.has(entry.table)).length;
            return (
              <details key={module.name} open={missing > 0} style={staggerStyle(index)} className="admin-card k-drawer group overflow-hidden">
                <summary className="flex cursor-pointer flex-col items-center gap-3 px-5 pb-3 pt-5">
                  <span className="k-labelholder">
                    <span>
                      {module.name} · {module.tables.length} tables
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-[12.5px] text-stone-600">
                    <Led tone={missing ? "red" : "green"} pulse={missing > 0} />
                    {missing ? `${missing} missing` : "All live"}
                  </span>
                  <span aria-hidden className="k-pull" />
                </summary>
                <ul className="k-drawer-body divide-y divide-navy/8 border-t border-navy/10">
                  {module.tables.map((entry) => {
                    const live = tableCounts.has(entry.table);
                    return (
                      <li key={entry.table} className="flex items-start justify-between gap-3 px-5 py-2.5">
                        <div className="min-w-0">
                          <p className="k-mono text-navy">{entry.table}</p>
                          <p className="text-[12.5px] leading-relaxed text-stone-600">{entry.purpose}</p>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.08em] ${live ? "text-source" : "text-rose-700"}`}>
                          <Led tone={live ? "green" : "red"} />
                          {live ? "live" : "missing"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
