-- Purpose Journey and Purpose Profile (README sections 2 and 3).
-- Additive only: new tables, no changes to existing ones, so the application
-- keeps working whether or not this migration has been applied yet.

create table if not exists public.purpose_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  identity_statement text,
  core_values jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  interests jsonb not null default '[]'::jsonb,
  story text,
  influences text,
  purpose_statement text,
  contribution text,
  skills jsonb not null default '[]'::jsonb,
  development_areas jsonb not null default '[]'::jsonb,
  development_objectives text,
  vision text,
  career_direction text,
  impact_aspirations text,
  shared_with_mentor boolean not null default false,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purpose_profiles_version_check check (version >= 0)
);

create table if not exists public.purpose_profile_snapshots (
  id serial primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists purpose_profile_snapshots_version_idx
  on public.purpose_profile_snapshots (profile_id, version);

-- Which principle a module develops (staff tag; title inference is the fallback).
create table if not exists public.module_principles (
  module_id integer primary key references public.course_modules(id) on delete cascade,
  principle varchar(16) not null,
  updated_at timestamptz not null default now(),
  constraint module_principles_principle_check check (principle in ('identity', 'source', 'purpose', 'potential', 'destiny'))
);

-- Which principle a learner was reflecting on.
create table if not exists public.reflection_principles (
  reflection_id integer primary key references public.reflections(id) on delete cascade,
  principle varchar(16) not null,
  constraint reflection_principles_principle_check check (principle in ('identity', 'source', 'purpose', 'potential', 'destiny'))
);

alter table public.purpose_profiles enable row level security;
alter table public.purpose_profile_snapshots enable row level security;
alter table public.module_principles enable row level security;
alter table public.reflection_principles enable row level security;

revoke all on table public.purpose_profiles, public.purpose_profile_snapshots, public.module_principles, public.reflection_principles from public, anon, authenticated;
revoke all on sequence public.purpose_profile_snapshots_id_seq from public, anon, authenticated;
grant select, insert, update, delete on table public.purpose_profiles, public.purpose_profile_snapshots, public.module_principles, public.reflection_principles to purpose_app;
grant usage, select on sequence public.purpose_profile_snapshots_id_seq to purpose_app;

create policy purpose_profiles_backend_access on public.purpose_profiles for all to purpose_app using (true) with check (true);
create policy purpose_profile_snapshots_backend_access on public.purpose_profile_snapshots for all to purpose_app using (true) with check (true);
create policy module_principles_backend_access on public.module_principles for all to purpose_app using (true) with check (true);
create policy reflection_principles_backend_access on public.reflection_principles for all to purpose_app using (true) with check (true);
