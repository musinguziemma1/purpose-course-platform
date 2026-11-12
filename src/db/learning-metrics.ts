import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { profiles, roles, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { learnerReadable } from "@/db/learner-access";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function currentActor(tx: Tx, actor: SessionUser | null) {
  if (!actor || actor.isDemo) return null;
  const [account] = await tx
    .select({ roleSlug: roles.slug, permissions: roles.permissions, isDemoAccount: users.isDemoAccount })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(and(eq(profiles.id, actor.profileId), eq(users.isActive, true)))
    .limit(1);
  return account ? { ...actor, ...account } : null;
}

// One denominator shared by platform, learner and mentor reporting. Enrolments
// grant access by level, so each published course in that level is an opportunity.
function metricsCtes(
  scope: SQL,
  levelId: number | null = null,
  cohortId: number | null = null,
  demoAccounts = false,
) {
  return sql`with eligible_learners as (
    select profiles.id as profile_id, profiles.full_name, users.email, profiles.title
    from profiles join users on users.id=profiles.user_id join roles on roles.id=profiles.role_id
    where users.is_active and users.is_demo_account=${demoAccounts} and roles.slug='student' and (${scope})
  ), learner_courses as (
    select distinct el.profile_id,c.id as course_id,c.title,c.level_id
    from eligible_learners el join enrollments e on e.profile_id=el.profile_id
    join courses c on c.level_id=e.level_id and c.status='published'
    where e.status in ('enrolled','completed') and (${levelId}::int is null or c.level_id=${levelId})
      and (${cohortId}::int is null or exists (select 1 from cohorts co where co.id=${cohortId}
        and (co.course_id is null or co.course_id=c.id) and (co.level_id is null or co.level_id=c.level_id)))
  ), opportunities as (
    select lc.profile_id,lc.course_id,m.id as module_id,m.title as module_title,l.id as lesson_id,
      coalesce(lp.status='completed',false) as completed
    from learner_courses lc join course_modules m on m.course_id=lc.course_id
    join lessons l on l.module_id=m.id and l.status='published'
    left join lesson_progress lp on lp.lesson_id=l.id and lp.profile_id=lc.profile_id
  ), course_progress as (
    select lc.profile_id,lc.course_id,lc.title,count(o.lesson_id)::int as total,
      count(o.lesson_id) filter(where o.completed)::int as completed,
      exists(select 1 from certificates ce where ce.profile_id=lc.profile_id and ce.course_id=lc.course_id
        and ce.kind='course' and ce.revoked_at is null) as awarded
    from learner_courses lc left join opportunities o on o.course_id=lc.course_id and o.profile_id=lc.profile_id
    group by lc.profile_id,lc.course_id,lc.title
  ), valid_attempts as (
    select aa.*,a.title as assessment_title from assessment_attempts aa
    join eligible_learners el on el.profile_id=aa.profile_id join assessments a on a.id=aa.assessment_id
    where aa.status='submitted' and a.status='published' and aa.submitted_at<=now()
      and exists(select 1 from learner_courses lc where lc.profile_id=aa.profile_id and lc.level_id=a.level_id
        and (a.course_id is null or a.course_id=lc.course_id))
  ), comparisons as (
    select aa.profile_id,aa.assessment_id,
      (array_agg(aa.score order by aa.submitted_at desc,aa.id desc))[1]
        - (array_agg(aa.score order by aa.submitted_at,aa.id))[1] as improvement
    from valid_attempts aa join assessment_sessions s on s.attempt_id=aa.id
      and s.profile_id=aa.profile_id and s.assessment_id=aa.assessment_id and s.status='submitted'
    group by aa.profile_id,aa.assessment_id,s.questions,s.pass_mark having count(*)>1
  ), recorded_events as (
    select ev.* from learning_events ev join eligible_learners el on el.profile_id=ev.profile_id
    where ev.metadata->>'source' is distinct from 'seed' and ev.occurred_at<=now()
      and ev.event_type in ('lesson_completed','lesson_reopened','assessment_started','assessment_submitted','certificate_earned')
      and (${cohortId}::int is null or exists(select 1 from learner_courses lc where lc.profile_id=ev.profile_id
        and (lc.course_id=ev.course_id or (ev.course_id is null and lc.level_id::text=ev.metadata->>'levelId'))))
  ), valid_certificates as (
    select ce.* from certificates ce join eligible_learners el on el.profile_id=ce.profile_id
    where ce.revoked_at is null and (${levelId}::int is null or ce.level_id=${levelId})
      and (${cohortId}::int is null or exists(select 1 from cohorts co where co.id=${cohortId}
        and (co.course_id is null or co.course_id=ce.course_id) and (co.level_id is null or co.level_id=ce.level_id)))
  )`;
}

export type LearnerMetrics = {
  profileId: string;
  fullName: string;
  email: string;
  levelName: string | null;
  lessonsTotal: number;
  lessonsCompleted: number;
  certificates: number;
  improvement: number | null;
  comparisons: number;
  attempts: {
    id: number;
    assessmentId: number;
    title: string;
    score: number;
    passed: boolean;
    passMark: number;
    at: string;
  }[];
  modules: {
    id: number;
    title: string;
    courseTitle: string;
    total: number;
    completed: number;
  }[];
};

export async function getLearnerMetrics(
  actor: SessionUser | null,
  profileIds: string[],
  levelId: number | null = null,
): Promise<LearnerMetrics[]> {
  if (!profileIds.length) return [];
  return db.transaction(
    async (tx) => {
      const viewer = await currentActor(tx, actor);
      if (!viewer) return [];
      const ctes = metricsCtes(
        and(
          inArray(profiles.id, profileIds),
          learnerReadable(profiles.id, viewer),
        )!,
        levelId, null, Boolean(viewer.isDemoAccount),
      );
      const result =
        await tx.execute(sql`${ctes} select el.profile_id as "profileId",el.full_name as "fullName",el.email,
      (select string_agg(distinct cl.name,', ' order by cl.name) from course_levels cl
        join learner_courses lc on lc.level_id=cl.id where lc.profile_id=el.profile_id) as "levelName",
      coalesce((select sum(cp.total)::int from course_progress cp where cp.profile_id=el.profile_id),0) as "lessonsTotal",
      coalesce((select sum(cp.completed)::int from course_progress cp where cp.profile_id=el.profile_id),0) as "lessonsCompleted",
      (select count(*)::int from valid_certificates ce where ce.profile_id=el.profile_id) as certificates,
      (select round(avg(c.improvement))::int from comparisons c where c.profile_id=el.profile_id) as improvement,
      (select count(*)::int from comparisons c where c.profile_id=el.profile_id) as comparisons,
      coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'assessmentId',a.assessment_id,'title',a.assessment_title,
        'score',a.score,'passed',a.passed,'passMark',a.pass_mark,'at',a.submitted_at) order by a.submitted_at,a.id)
        from valid_attempts a where a.profile_id=el.profile_id),'[]'::jsonb) as attempts,
      coalesce((select jsonb_agg(module_row order by module_row."courseTitle",module_row.id) from (
        select o.module_id as id,o.module_title as title,lc.title as "courseTitle",count(*)::int as total,
          count(*) filter(where o.completed)::int as completed
        from opportunities o join learner_courses lc on lc.course_id=o.course_id and lc.profile_id=o.profile_id
        where o.profile_id=el.profile_id group by o.module_id,o.module_title,lc.title
      ) module_row),'[]'::jsonb) as modules from eligible_learners el order by el.full_name,el.profile_id`);
      return result.rows as LearnerMetrics[];
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export type LearningReport = {
  summary: {
    learners: number;
    activeLearners: number;
    opportunities: number;
    completed: number;
    coursePairs: number;
    courseAwards: number;
    certificates: number;
    attempts: number;
    passed: number;
    average: number | null;
    improvement: number | null;
    comparisons: number;
    goals: number;
    achievedGoals: number;
    mentors: number;
  };
  courses: {
    id: number;
    title: string;
    learners: number;
    total: number;
    completed: number;
    awarded: number;
  }[];
  cohorts: { id: number; name: string; status: string; learners: number }[];
  daily: { date: string; active: number; actions: number }[];
  weekly: { date: string; active: number }[];
};

export async function getLearningReport(
  actor: SessionUser | null,
  cohortId: number | null = null,
): Promise<LearningReport | null> {
  if (cohortId !== null && (!Number.isSafeInteger(cohortId) || cohortId <= 0))
    return null;
  return db.transaction(
    async (tx) => {
      const viewer = await currentActor(tx, actor);
      if (!can(viewer, "analytics.view")) return null;
      const cohortRows =
        await tx.execute(sql`select co.id,co.name,co.status,count(distinct p.id)::int as learners from cohorts co
      left join cohort_members cm on cm.cohort_id=co.id and cm.role='learner' and cm.status='active'
      left join (profiles p join users u on u.id=p.user_id and u.is_active and u.is_demo_account=${Boolean(viewer?.isDemoAccount)} join roles r on r.id=p.role_id and r.slug='student') on p.id=cm.profile_id
      where co.status in ('active','completed') group by co.id,co.name,co.status order by co.starts_at desc,co.id`);
      const cohorts = cohortRows.rows as LearningReport["cohorts"];
      if (
        cohortId !== null &&
        !cohorts.some((cohort) => cohort.id === cohortId)
      )
        return null;
      const scope =
        cohortId === null
          ? sql`true`
          : sql`exists(select 1 from cohort_members cm where cm.profile_id=profiles.id and cm.cohort_id=${cohortId} and cm.role='learner' and cm.status='active')`;
      const ctes = metricsCtes(scope, null, cohortId, Boolean(viewer?.isDemoAccount));
      const summaryRows = await tx.execute(sql`${ctes} select
      (select count(*)::int from eligible_learners) as learners,
      (select count(distinct profile_id)::int from recorded_events where occurred_at>=now()-interval '30 days') as "activeLearners",
      (select count(*)::int from opportunities) as opportunities,
      (select count(*)::int from opportunities where completed) as completed,
      (select count(*)::int from course_progress where total>0) as "coursePairs",
      (select count(*)::int from course_progress where total>0 and awarded) as "courseAwards",
      (select count(*)::int from valid_certificates) as certificates,
      (select count(*)::int from valid_attempts) as attempts,
      (select count(*)::int from valid_attempts where passed) as passed,
      (select round(avg(score))::int from valid_attempts) as average,
      (select round(avg(improvement))::int from comparisons) as improvement,
      (select count(*)::int from comparisons) as comparisons,
      (select count(*)::int from learner_goals g join eligible_learners el on el.profile_id=g.student_id where g.status in('active','achieved')) as goals,
      (select count(*)::int from learner_goals g join eligible_learners el on el.profile_id=g.student_id where g.status='achieved') as "achievedGoals",
      (select count(*)::int from mentor_assignments ma join eligible_learners el on el.profile_id=ma.student_id
        join profiles mp on mp.id=ma.mentor_id join users mu on mu.id=mp.user_id and mu.is_active where ma.status='active') as mentors`);
      const courseRows =
        await tx.execute(sql`${ctes} select course_id as id,title,count(*)::int as learners,
      sum(total)::int as total,sum(completed)::int as completed,count(*) filter(where awarded)::int as awarded
      from course_progress group by course_id,title order by title,course_id`);
      const dailyRows = await tx.execute(sql`${ctes}, days as (
      select generate_series((now() at time zone 'Africa/Kampala')::date-13,(now() at time zone 'Africa/Kampala')::date,interval '1 day')::date as day
    ) select to_char(d.day,'YYYY-MM-DD') as date,count(distinct ev.profile_id)::int as active,count(ev.id)::int as actions from days d
      left join recorded_events ev on (ev.occurred_at at time zone 'Africa/Kampala')::date=d.day group by d.day order by d.day`);
      const weeklyRows = await tx.execute(sql`${ctes}, weeks as (
      select generate_series(date_trunc('week',now() at time zone 'Africa/Kampala')-interval '7 weeks',date_trunc('week',now() at time zone 'Africa/Kampala'),interval '1 week')::date as week
    ) select to_char(w.week,'YYYY-MM-DD') as date,count(distinct ev.profile_id)::int as active from weeks w
      left join recorded_events ev on ev.occurred_at>=(w.week::timestamp at time zone 'Africa/Kampala')
        and ev.occurred_at<((w.week+7)::timestamp at time zone 'Africa/Kampala') group by w.week order by w.week`);
      return {
        summary: summaryRows.rows[0] as LearningReport["summary"],
        courses: courseRows.rows as LearningReport["courses"],
        cohorts,
        daily: dailyRows.rows as LearningReport["daily"],
        weekly: weeklyRows.rows as LearningReport["weekly"],
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
