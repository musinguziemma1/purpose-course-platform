-- Additive changes; existing users, uploaded URLs, assignments and grades are preserved.
alter table public.profiles add column phone varchar(32), add column location varchar(160), add column profile_completed_at timestamptz;
alter table public.media_assets add column file_name varchar(240), add column mime_type varchar(120), add column byte_size integer,
  add column storage_bucket varchar(80), add column storage_path text, add column purpose varchar(24) not null default 'library', add column state varchar(24) not null default 'ready';
alter table public.media_assets add constraint media_assets_size_check check (byte_size is null or byte_size between 1 and 52428800),
  add constraint media_assets_purpose_check check (purpose in ('library','submission')),
  add constraint media_assets_state_check check (state in ('pending','ready','failed'));
create unique index media_assets_storage_path_idx on public.media_assets(storage_bucket,storage_path) where storage_path is not null;
create index media_assets_library_idx on public.media_assets(purpose,state,created_at desc);
create index media_assets_uploader_idx on public.media_assets(uploaded_by,created_at desc);
alter table public.assignments add column created_by_id uuid references public.profiles(id) on delete set null,
  add column assignee_id uuid references public.profiles(id) on delete cascade,
  add column attachment_id uuid references public.media_assets(id) on delete restrict;
create index assignments_assignee_idx on public.assignments(assignee_id,level_id);
alter table public.assignment_submissions add column score integer check(score between 0 and 100),
  add column attachment_id uuid references public.media_assets(id) on delete restrict;
create table public.admission_requests (
  id uuid primary key default gen_random_uuid(), email varchar(255) not null unique, full_name varchar(160) not null,
  password_hash text, notes text, rate_key varchar(64) not null, status varchar(24) not null default 'pending',
  reviewed_by_id uuid references public.profiles(id) on delete set null, reviewed_at timestamptz, created_at timestamptz not null default now(),
  constraint admission_requests_status_check check(status in ('pending','approved','declined')),
  constraint admission_requests_pending_hash_check check(status <> 'pending' or password_hash is not null)
);
create index admission_requests_rate_idx on public.admission_requests(rate_key,created_at desc);
create index admission_requests_pending_idx on public.admission_requests(status,created_at);
alter table public.admission_requests enable row level security;
revoke all on public.admission_requests from public, anon, authenticated;
grant select,insert,update,delete on public.admission_requests to purpose_app;
create policy purpose_backend_access on public.admission_requests for all to purpose_app using(true) with check(true);
