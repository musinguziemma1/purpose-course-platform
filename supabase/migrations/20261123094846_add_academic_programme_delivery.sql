-- Link the academic catalogue to learner delivery and make curriculum sync idempotent.
alter table public.programme_levels
  add column introduction text not null default '',
  add column outcomes jsonb not null default '[]'::jsonb,
  add column exam_prompts jsonb not null default '[]'::jsonb;

alter table public.programme_modules
  add column code varchar(24),
  add column introduction text not null default '',
  add column outcomes jsonb not null default '[]'::jsonb,
  add column formative_prompts jsonb not null default '[]'::jsonb,
  add column assignment_brief text not null default '';

alter table public.course_levels
  add column programme_level_id integer references public.programme_levels(id) on delete set null;
alter table public.course_levels
  add constraint course_levels_programme_level_id_unique unique (programme_level_id);

alter table public.course_modules
  add column programme_module_id integer references public.programme_modules(id) on delete set null;
alter table public.course_modules
  add constraint course_modules_programme_module_id_unique unique (programme_module_id);

alter table public.assignments
  add column curriculum_key varchar(240),
  add column module_id integer references public.course_modules(id) on delete cascade;
alter table public.assignments
  add constraint assignments_curriculum_key_unique unique (curriculum_key);
create index assignments_module_idx on public.assignments(module_id);

alter table public.assessments add column curriculum_key varchar(240);
alter table public.assessments
  add constraint assessments_curriculum_key_unique unique (curriculum_key);

alter table public.course_sessions drop constraint if exists course_sessions_code_unique;
create unique index course_sessions_level_code_idx on public.course_sessions(level_id, code);

-- Preserve the original adult delivery URLs while bringing it under the academic catalogue.
update public.course_levels cl
set programme_level_id = pl.id
from public.programme_levels pl
join public.programmes p on p.id = pl.programme_id
where p.slug = 'purpose-program-adults'
  and pl.slug = cl.slug
  and cl.programme_level_id is null;

update public.course_modules cm
set programme_module_id = pm.id
from public.courses c
join public.course_levels cl on cl.id = c.level_id
join public.programme_levels pl on pl.id = cl.programme_level_id
join public.programme_modules pm on pm.programme_level_id = pl.id
where cm.course_id = c.id
  and pm.sort_order = cm.sort_order
  and cm.programme_module_id is null;

update public.assessments a
set curriculum_key = 'quiz:' || p.slug || ':' || pl.slug || ':' ||
  trim(both '-' from regexp_replace(lower(coalesce(cm.session_code, pm.code, pm.slug)), '[^a-z0-9]+', '-', 'g'))
from public.course_modules cm
join public.programme_modules pm on pm.id = cm.programme_module_id
join public.programme_levels pl on pl.id = pm.programme_level_id
join public.programmes p on p.id = pl.programme_id
where a.module_id = cm.id
  and a.kind = 'session'
  and a.curriculum_key is null;

update public.assessments a
set curriculum_key = 'exam:' || p.slug || ':' || pl.slug
from public.course_levels cl
join public.programme_levels pl on pl.id = cl.programme_level_id
join public.programmes p on p.id = pl.programme_id
where a.level_id = cl.id
  and a.kind = 'level'
  and a.curriculum_key is null;
