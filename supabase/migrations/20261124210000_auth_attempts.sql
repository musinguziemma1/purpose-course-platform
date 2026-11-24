-- Sign-in throttling (README: secure authentication). Stores only a SHA-256 of
-- the email and an HMAC of the client address, and is purged after a day.

create table if not exists public.auth_attempts (
  id serial primary key,
  email_hash varchar(64) not null,
  rate_key varchar(64),
  succeeded boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists auth_attempts_email_idx on public.auth_attempts (email_hash, created_at);
create index if not exists auth_attempts_rate_idx on public.auth_attempts (rate_key, created_at);

alter table public.auth_attempts enable row level security;

revoke all on table public.auth_attempts from public, anon, authenticated;
revoke all on sequence public.auth_attempts_id_seq from public, anon, authenticated;
grant select, insert, update, delete on table public.auth_attempts to purpose_app;
grant usage, select on sequence public.auth_attempts_id_seq to purpose_app;

create policy auth_attempts_backend_access on public.auth_attempts for all to purpose_app using (true) with check (true);
