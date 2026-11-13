-- Additive scheduling and cohort controls. Legacy text cohort labels are retained.
alter table public.enrollments add column cohort_id integer references public.cohorts(id) on delete set null, add column updated_at timestamptz not null default now();
create index enrollments_cohort_idx on public.enrollments(cohort_id);
alter table public.cohorts add column updated_at timestamptz not null default now();
alter table public.live_sessions add column timezone varchar(80) not null default 'Africa/Kampala', add column is_public boolean not null default true,
 add column created_by_id uuid references public.profiles(id) on delete set null, add column schedule_key uuid unique, add column updated_at timestamptz not null default now();
alter table public.live_sessions add constraint live_sessions_cohort_id_fkey foreign key(cohort_id) references public.cohorts(id) on delete set null;
create index live_sessions_calendar_idx on public.live_sessions(status,starts_at);
create index live_sessions_cohort_idx on public.live_sessions(cohort_id);
create index cohort_members_profile_status_idx on public.cohort_members(profile_id,status);
update public.enrollments e set cohort_id=c.id from public.cohorts c where e.cohort=c.name and e.level_id=c.level_id
 and not exists(select 1 from public.cohorts other where other.id<>c.id and other.name=c.name and other.level_id=c.level_id);
create table public.live_session_requests (
 id uuid primary key default gen_random_uuid(), requested_by_id uuid not null references public.profiles(id) on delete cascade, request_key uuid not null unique,
 title varchar(220) not null, description text not null, agenda text, type public.live_session_type not null default 'class',
 course_id integer references public.courses(id) on delete set null, cohort_id integer references public.cohorts(id) on delete set null,
 starts_at timestamptz not null, timezone varchar(80) not null default 'Africa/Kampala', duration_minutes integer not null default 60,
 status varchar(24) not null default 'pending' constraint live_session_requests_status_check check(status in ('pending','approved','declined','withdrawn')),
 scheduled_session_id integer unique references public.live_sessions(id) on delete set null, reviewed_by_id uuid references public.profiles(id) on delete set null,
 review_note text, reviewed_at timestamptz, updated_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index live_session_requests_status_idx on public.live_session_requests(status,created_at);
create index live_session_requests_author_idx on public.live_session_requests(requested_by_id,created_at);
alter table public.live_session_requests enable row level security;
revoke all on public.live_session_requests from public,anon,authenticated;
grant select,insert,update,delete on public.live_session_requests to purpose_app;
create policy purpose_backend_access on public.live_session_requests for all to purpose_app using(true) with check(true);
