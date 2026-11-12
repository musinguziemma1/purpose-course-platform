import "./load-env.mjs";
import pg from "pg";
import { databaseConfig } from "./database-config.mjs";

// Content inventory only: never selects learner data or prints answer keys.
const client = new pg.Client(databaseConfig());
await client.connect();
try {
  await client.query("begin isolation level repeatable read read only");
  const sessions = (await client.query("select s.id,s.code,s.title,s.level_id,l.name as level from course_sessions s join course_levels l on l.id=s.level_id order by l.level_number,s.sort_order,s.id")).rows;
  const modules = (await client.query("select m.id,m.session_code,m.title,c.level_id,c.slug as course_slug,count(l.id)::int as published_lessons from course_modules m join courses c on c.id=m.course_id left join lessons l on l.module_id=m.id and l.status='published' where c.status='published' group by m.id,c.id order by c.sort_order,m.sort_order,m.id")).rows;
  const assessments = (await client.query("select a.*,c.level_id as parent_level,m.course_id as module_course from assessments a left join courses c on c.id=a.course_id left join course_modules m on m.id=a.module_id where a.status='published' order by a.id")).rows;
  const questions = (await client.query("select q.* from assessment_questions q join assessments a on a.id=q.assessment_id where a.status='published' order by q.assessment_id,q.sort_order,q.id")).rows;
  const media = (await client.query("select l.id,l.kind,l.title,l.video_url,l.audio_url,l.download_url,l.image_url from lessons l join course_modules m on m.id=l.module_id join courses c on c.id=m.course_id where l.status='published' and c.status='published'")).rows;
  const errors = [], review = [], normalize = value => value?.trim().toLowerCase().replace(/\s+/g," ");
  const mapping = sessions.map(s => ({code:s.code,title:s.title,level:s.level,modules:modules.filter(m=>m.session_code===s.code&&m.level_id===s.level_id).map(m=>({title:m.title,course:m.course_slug,publishedLessons:m.published_lessons}))}));
  for (const m of modules) if (!sessions.some(s=>s.code===m.session_code&&s.level_id===m.level_id)) errors.push(`Module ${m.id} has no matching programme session in its level.`);
  for (const a of assessments) {
    const bank=questions.filter(q=>q.assessment_id===a.id), seen=new Set();
    if (a.course_id && a.parent_level!==a.level_id || a.module_id && a.module_course!==a.course_id) errors.push(`Assessment ${a.id} has inconsistent scope.`);
    if (a.pass_mark<1||a.pass_mark>100||a.max_attempts<1||a.time_limit_minutes<1||a.time_limit_minutes>240) errors.push(`Assessment ${a.id} has invalid settings.`);
    if (!bank.length) errors.push(`Assessment ${a.id} has no questions.`);
    if (bank.length!==(a.kind==='session'?5:20)) review.push(`Assessment ${a.id} differs from the intended ${a.kind==='session'?5:20}-question format.`);
    for (const q of bank) {
      const prompt=normalize(q.prompt), opts=q.options;
      if (!prompt || seen.has(prompt)) errors.push(`Question ${q.id} has an empty or repeated prompt in assessment ${a.id}.`);seen.add(prompt);
      if (!Array.isArray(opts)||opts.length<2||opts.some(o=>typeof o!=='string'||!o.trim())||new Set(opts.map(normalize)).size!==opts.length||!Number.isInteger(q.correct_index)||q.correct_index<0||q.correct_index>=opts.length) errors.push(`Question ${q.id} has invalid answer options or key.`);
      if (!q.explanation?.trim()) review.push(`Question ${q.id} needs an explanatory teaching rationale.`);
    }
  }
  for(const l of media){const field={video:'video_url',audio:'audio_url',download:'download_url',illustration:'image_url'}[l.kind];if(field&&!l[field])review.push(`Lesson ${l.id} (${l.title}) has no ${l.kind} asset.`);}
  const report={readOnly:true,programmeSessions:sessions.length,publishedModules:modules.length,publishedLessons:media.length,publishedAssessments:assessments.length,questions:questions.length,mapping,missingDigitalSessions:mapping.filter(s=>!s.modules.length).map(s=>s.code),integrityErrors:errors,facultyReviewItems:review,approval:'Structural checks do not establish teaching accuracy, coverage or faculty approval. Level exams include topics without published digital modules; review before launch.'};
  console.log(JSON.stringify(report,null,2));await client.query("rollback");if(errors.length)process.exitCode=1;
} finally {await client.end();}
