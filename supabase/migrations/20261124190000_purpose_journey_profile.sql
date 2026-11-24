-- Purpose Journey and Purpose Profile (README sections 2 and 3).
-- Modules and reflections may name the principle they develop; learners keep an
-- evolving Purpose Profile with a snapshot per saved version.

alter table public.course_modules add column if not exists principle varchar(16);
alter table public.course_modules drop constraint if exists course_modules_principle_check;
alter table public.course_modules add constraint course_modules_principle_check
  check (principle is null or principle in ('identity', 'source', 'purpose', 'potential', 'destiny'));

alter table public.reflections add column if not exists principle varchar(16);
alter table public.reflections drop constraint if exists reflections_principle_check;
alter table public.reflections add constraint reflections_principle_check
  check (principle is null or principle in ('identity', 'source', 'purpose', 'potential', 'destiny'));

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

alter table public.purpose_profiles enable row level security;
alter table public.purpose_profile_snapshots enable row level security;

revoke all on table public.purpose_profiles, public.purpose_profile_snapshots from public, anon, authenticated;
revoke all on sequence public.purpose_profile_snapshots_id_seq from public, anon, authenticated;
grant select, insert, update, delete on table public.purpose_profiles, public.purpose_profile_snapshots to purpose_app;
grant usage, select on sequence public.purpose_profile_snapshots_id_seq to purpose_app;

create policy purpose_profiles_backend_access on public.purpose_profiles for all to purpose_app using (true) with check (true);
create policy purpose_profile_snapshots_backend_access on public.purpose_profile_snapshots for all to purpose_app using (true) with check (true);
