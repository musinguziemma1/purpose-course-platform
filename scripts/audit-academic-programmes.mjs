import "./load-env.mjs";
import pg from "pg";
import { databaseConfig } from "./database-config.mjs";

// Content inventory only: never selects learner data or prints answer keys.
const client = new pg.Client(databaseConfig());
await client.connect();

try {
  await client.query("begin isolation level repeatable read read only");
  const programmes = (await client.query(`
    select p.slug, p.name, p.status, count(distinct pl.id)::int as levels,
      count(distinct pm.id)::int as modules
    from programmes p
    left join programme_levels pl on pl.programme_id = p.id
    left join programme_modules pm on pm.programme_level_id = pl.id
    group by p.id
    order by p.sort_order, p.id
  `)).rows;
  const levels = (await client.query(`
    select cl.id, cl.slug, cl.name, p.slug as programme_slug,
      count(distinct pm.id)::int as outline_modules,
      count(distinct cm.id)::int as digital_modules
    from course_levels cl
    join programme_levels pl on pl.id = cl.programme_level_id
    join programmes p on p.id = pl.programme_id
    left join programme_modules pm on pm.programme_level_id = pl.id
    left join course_modules cm on cm.programme_module_id = pm.id
    group by cl.id, p.id
    order by p.sort_order, cl.level_number
  `)).rows;
  const modules = (await client.query(`
    select pm.id, pm.code, p.slug as programme_slug, pl.slug as level_slug,
      cm.id as digital_module_id, c.id as course_id,
      count(distinct l.id) filter (where l.status = 'published' and l.slug like 'academic-principle-%')::int as aligned_lessons,
      count(distinct a.id) filter (where a.curriculum_key like 'assignment:%')::int as assignments,
      count(distinct q.id) filter (where q.curriculum_key like 'quiz:%' and q.status = 'published')::int as quizzes
    from programme_modules pm
    join programme_levels pl on pl.id = pm.programme_level_id
    join programmes p on p.id = pl.programme_id
    left join course_modules cm on cm.programme_module_id = pm.id
    left join courses c on c.id = cm.course_id and c.status = 'published'
    left join lessons l on l.module_id = cm.id
    left join assignments a on a.module_id = cm.id
    left join assessments q on q.module_id = cm.id and q.kind = 'session'
    group by pm.id, pl.id, p.id, cm.id, c.id
    order by p.sort_order, pl.sort_order, pm.sort_order
  `)).rows;
  const assessments = (await client.query(`
    select a.id, a.curriculum_key, a.kind, a.pass_mark, a.max_attempts, a.time_limit_minutes,
      count(distinct q.id)::int as questions,
      count(distinct q.id) filter (where nullif(trim(q.explanation), '') is null)::int as missing_explanations,
      count(distinct lower(trim(q.prompt)))::int as distinct_prompts,
      count(distinct pm.id)::int as level_modules
    from assessments a
    left join assessment_questions q on q.assessment_id = a.id
    left join course_levels cl on cl.id = a.level_id
    left join programme_levels pl on pl.id = cl.programme_level_id
    left join programme_modules pm on pm.programme_level_id = pl.id
    where a.status = 'published' and a.curriculum_key is not null
    group by a.id
    order by a.id
  `)).rows;

  const errors = [];
  if (programmes.length !== 4) errors.push(`Expected 4 programmes; found ${programmes.length}.`);
  if (levels.length !== 12) errors.push(`Expected 12 linked digital levels; found ${levels.length}.`);
  if (modules.length !== 51) errors.push(`Expected 51 academic modules; found ${modules.length}.`);

  for (const programme of programmes) {
    if (programme.status !== "published") errors.push(`${programme.name} is not published.`);
    if (programme.levels !== 3) errors.push(`${programme.name} has ${programme.levels} levels instead of 3.`);
  }
  for (const level of levels) {
    if (level.outline_modules !== level.digital_modules) {
      errors.push(`${level.programme_slug}/${level.slug} has ${level.outline_modules} outline modules and ${level.digital_modules} digital modules.`);
    }
  }
  for (const curriculumModule of modules) {
    const label = `${curriculumModule.programme_slug}/${curriculumModule.level_slug}/${curriculumModule.code}`;
    if (!curriculumModule.digital_module_id || !curriculumModule.course_id) errors.push(`${label} has no published digital module.`);
    if (curriculumModule.aligned_lessons !== 5) errors.push(`${label} has ${curriculumModule.aligned_lessons} aligned teaching lessons instead of 5.`);
    if (curriculumModule.assignments !== 1) errors.push(`${label} has ${curriculumModule.assignments} curriculum assignments instead of 1.`);
    if (curriculumModule.quizzes !== 1) errors.push(`${label} has ${curriculumModule.quizzes} published quizzes instead of 1.`);
  }
  for (const assessment of assessments) {
    const expected = assessment.kind === "session" ? 5 : assessment.level_modules === 3 ? 15 : 20;
    if (assessment.questions !== expected) errors.push(`${assessment.curriculum_key} has ${assessment.questions} questions instead of ${expected}.`);
    if (assessment.distinct_prompts !== assessment.questions) errors.push(`${assessment.curriculum_key} repeats one or more prompts.`);
    if (assessment.missing_explanations) errors.push(`${assessment.curriculum_key} has ${assessment.missing_explanations} questions without teaching explanations.`);
    if (assessment.pass_mark < 1 || assessment.pass_mark > 100 || assessment.max_attempts < 1 || assessment.time_limit_minutes < 1 || assessment.time_limit_minutes > 240) {
      errors.push(`${assessment.curriculum_key} has invalid assessment settings.`);
    }
  }
  if (assessments.length !== 63) errors.push(`Expected 63 aligned assessments; found ${assessments.length}.`);

  const report = {
    readOnly: true,
    programmes,
    digitalLevels: levels.length,
    academicModules: modules.length,
    alignedTeachingLessons: modules.reduce((total, curriculumModule) => total + curriculumModule.aligned_lessons, 0),
    curriculumAssignments: modules.reduce((total, curriculumModule) => total + curriculumModule.assignments, 0),
    alignedAssessments: assessments.length,
    alignedQuestions: assessments.reduce((total, assessment) => total + assessment.questions, 0),
    questionsMissingExplanations: assessments.reduce((total, assessment) => total + assessment.missing_explanations, 0),
    integrityErrors: errors,
    academicReview: "Structural alignment is complete. Faculty approval of teaching claims, contextual examples and marking expectations remains an academic governance responsibility.",
  };
  console.log(JSON.stringify(report, null, 2));
  await client.query("rollback");
  if (errors.length) process.exitCode = 1;
} finally {
  await client.end();
}
