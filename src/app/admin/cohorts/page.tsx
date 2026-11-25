import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { ArrowRight, CalendarPlus, UsersRound } from "lucide-react";
import { db } from "@/db";
import { cohortMembers, cohorts, courses } from "@/db/schema";
import { getProgrammeLevelOptions } from "@/db/programme-options";
import { requireAdminPage } from "@/lib/page-access";
import { CohortSetupForm } from "@/components/academy/cohort-forms";
import { GlassMeter, Led, Odometer } from "@/components/admin/console/instruments";
import { ConsoleEmpty, ConsoleHeader, Panel, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cohort setup" };

const STATUS_LED = { active: "green", draft: "gold", completed: "blue", archived: "off" } as const;

export default async function AdminCohortsPage() {
  await requireAdminPage("/admin/cohorts");
  const [rows, levels, courseRows] = await Promise.all([
    db
      .select({ cohort: cohorts, size: count(cohortMembers.id) })
      .from(cohorts)
      .leftJoin(
        cohortMembers,
        and(
          eq(cohortMembers.cohortId, cohorts.id),
          eq(cohortMembers.role, "learner"),
          eq(cohortMembers.status, "active"),
        ),
      )
      .groupBy(cohorts.id)
      .orderBy(desc(cohorts.createdAt))
      .limit(100),
    getProgrammeLevelOptions(),
    db
      .select({ id: courses.id, title: courses.title, levelId: courses.levelId })
      .from(courses)
      .orderBy(courses.title),
  ]);
  const levelLabels = new Map(levels.map((level) => [level.id, level.name]));

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Academy"
        title="Cohort setup"
        description="Set learning dates, programme level and capacity, then place approved learners and authorised faculty. Account approval remains separate from level enrolment and cohort placement."
        actions={
          <Link href="/admin/enrollments" className={keyClass("paper")}>
            Manage enrolments <ArrowRight aria-hidden />
          </Link>
        }
      />
      <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section aria-label="Cohorts" className="k-stagger space-y-4">
          {rows.map(({ cohort, size }, index) => {
            const learners = Number(size);
            const open = Math.max(0, cohort.capacity - learners);
            return (
              <article key={cohort.id} style={staggerStyle(index)} className="k-ticket-wrap">
                <div className="k-ticket">
                  <div className="p-5 sm:p-6">
                    <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-source">
                      <Led tone={STATUS_LED[cohort.status as keyof typeof STATUS_LED] ?? "off"} />
                      {cohort.status} · {levelLabels.get(cohort.levelId ?? -1) ?? "Level needs review"}
                    </p>
                    <h2 className="mt-2 font-serif text-[1.5rem] leading-tight text-navy">{cohort.name}</h2>
                    <p className="numeric mt-1.5 text-[13px] text-stone-600">
                      {cohort.startsAt.toISOString().slice(0, 10)} → {cohort.endsAt.toISOString().slice(0, 10)}
                    </p>
                    {cohort.description ? <p className="mt-3 text-[14px] leading-relaxed text-stone-700">{cohort.description}</p> : null}
                    <Link href={`/admin/cohorts/${cohort.id}`} className={keyClass("navy", "sm", "mt-4")}>
                      Manage cohort <ArrowRight aria-hidden />
                    </Link>
                  </div>
                  <div className="k-ticket-stub flex flex-col justify-center gap-2 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-600">Seats taken</p>
                    <p className="text-[1.75rem] leading-none text-navy">
                      <Odometer value={`${learners}/${cohort.capacity}`} />
                    </p>
                    <GlassMeter value={learners} max={Math.max(cohort.capacity, 1)} tone={open === 0 ? "amber" : "source"} label={`${learners} of ${cohort.capacity} seats taken`} />
                    <p className="text-[12.5px] text-stone-600">{open ? `${open} places available` : "Cohort is full"}</p>
                  </div>
                </div>
              </article>
            );
          })}
          {!rows.length ? (
            <ConsoleEmpty icon={UsersRound} title="No cohorts yet." description="Create the first cohort, then add approved students and faculty." />
          ) : null}
        </section>
        <Panel title="Create a cohort" icon={CalendarPlus} riveted bodyClassName="px-5 pb-6 pt-4 sm:px-6">
          <CohortSetupForm levels={levels} courses={courseRows} />
        </Panel>
      </div>
    </div>
  );
}
