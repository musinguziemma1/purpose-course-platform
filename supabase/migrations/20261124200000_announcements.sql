-- Staff announcements to everyone, a role group or one cohort (README sections 9 and 15).

create table if not exists public.announcements (
  id serial primary key,
  title varchar(160) not null,
  body text not null,
  audience varchar(16) not null default 'everyone',
  cohort_id integer references public.cohorts(id) on delete cascade,
  href varchar(240),
  status varchar(16) not null default 'draft',
  pinned boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_audience_check check (audience in ('everyone', 'learners', 'mentors', 'staff', 'cohort')),
  constraint announcements_status_check check (status in ('draft', 'published', 'archived')),
  constraint announcements_cohort_check check ((audience = 'cohort') = (cohort_id is not null)),
  constraint announcements_version_check check (version >= 0)
);

create index if not exists announcements_active_idx on public.announcements (status, published_at);

alter table public.announcements enable row level security;

revoke all on table public.announcements from public, anon, authenticated;
revoke all on sequence public.announcements_id_seq from public, anon, authenticated;
grant select, insert, update, delete on table public.announcements to purpose_app;
grant usage, select on sequence public.announcements_id_seq to purpose_app;

create policy announcements_backend_access on public.announcements for all to purpose_app using (true) with check (true);
