# Supabase database operation

The Next.js server uses Drizzle and `pg` to read and write Supabase PostgreSQL.
There is one active application database; writes are not mirrored to the old
local database. Existing application sessions and password hashes remain in
the application tables. This change does not migrate login to Supabase Auth or
files to Supabase Storage, or enable Realtime subscriptions.

## Configuration

`.env.local` is the ignored Next.js runtime configuration. It overrides the
preserved `.env` local development configuration, and database commands use
the same environment precedence. Restart a running Next.js process after a
database cutover.

Runtime variables:

- `DATABASE_URL`: the **purpose_app** role using the project's Session pooler.
  Passwords in a URI must be URL encoded. Use the dashboard's **Connect** panel
  for the project's actual host; do not infer the region.
- `DATABASE_SSL_CA`: the project's PEM CA certificate, with escaped `\n`
  newlines if stored on one line. Remote connections require verified TLS.
- `DATABASE_POOL_MAX`: maximum connections **per server process**, default 5.
  Budget connections across all deployed instances and the Supabase pool limit.
- `NEXT_PUBLIC_SUPABASE_URL`: base project URL, without `/rest/v1/`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public client key.
- `PURPOSE_DEMO_OPEN=false`: demo identities are also blocked for every remote
  database and in production, regardless of this flag.

Never put an administrator database URI, secret API key, or service-role key
in a `NEXT_PUBLIC_` variable. `.env.supabase.local` contains administrator
migration access only. It is not loaded by Next.js.

## Access model

All 86 application tables have RLS enabled. The `anon` and `authenticated`
Data API roles have no table or sequence privileges. The trusted server uses
`purpose_app`, which can select, insert, update, and delete application rows
through a policy restricted to that role. It cannot create schema objects,
truncate tables, create roles, or bypass RLS. Per-user and per-record
authorization remains the responsibility of the existing server application;
the backend policy does not provide user-level isolation.

Browser clients must call the application's authorized routes/actions. The
publishable key deliberately cannot read credential hashes or private records
from `/rest/v1`. The existing optional Supabase client helpers do not replace
the application's session system.

## Initial migration and verification

The versioned SQL baseline is in `supabase/migrations`. It was generated from
`src/db/schema.ts`, followed by a reviewed access-control migration. The
initial import script records both versions in
`supabase_migrations.schema_migrations`.

For migration commands, provide the administrator Session pooler `DATABASE_URL`,
project URL, and publishable key in ignored `.env.supabase.local`. Download the
project CA certificate from the dashboard's database SSL settings and save it
as `.local/certs/supabase-ca-2021.crt`. The administrator file is read only by
this explicit migration tool, never by the running application.

```powershell
node scripts/supabase-db.mjs check
node scripts/supabase-db.mjs migrate --apply
node scripts/supabase-db.mjs verify
node scripts/supabase-db.mjs activate
```

`migrate` is an **initial import only**. It refuses a destination with existing
application tables; it never truncates or reseeds a cloud database. It reads
the original local source from `.env`, creates a consistent JSON data snapshot
and schema copy under `.local/backups`, and verifies a SHA-256 checksum before
importing. Foreign keys determine insertion order. Schema creation, all data,
sequence restoration, access policies, the runtime role, and migration history
commit in one transaction. Before commit, every table's typed rows and counts
are compared with the source snapshot, and column names, types, and nullability
are checked.

Generated runtime credentials are retained in ignored
`.local/supabase-runtime.env`. `activate` independently connects as that
restricted role, repeats data/access verification, and writes `.env.local`.
It can be retried after a connection interruption. Migration metadata and
the backup checksum are in `.local/supabase-migration.json`.

`verify` is a comparison against the **initial snapshot**, intended before
normal application writes resume. After new records or updates, use operational
checks and new backups; an initial snapshot comparison will correctly differ.

Keep the ignored backups in encrypted, access-controlled backup storage before
production. They include private data, credentials, and session tokens. The
JSON snapshot covers application table data and a schema copy; it is not a
full Supabase backup, and does not contain managed Auth/Storage data, grants,
extensions, or WAL. Configure hosted backups/PITR and test restoration before
launch. No automatic restore or continuous replication is configured here.

## Development and future schema changes

`npm run db:seed` rejects remote/production databases. `setup:local` rejects
the cloud override. `db:push` runs as the restricted runtime role and cannot
change the cloud schema. Use reviewed, versioned migrations with separate
administrator credentials for future cloud changes.

Create a migration with `supabase migration new <name>`, review the resulting
SQL, and test it on a separate database before applying it through a deployment
process. Each new application table needs RLS, a backend policy, explicit
backend grants, and no public API privileges. Do not use `supabase db reset`
or a demo seed against the hosted project. Drizzle schema changes alone do
not update the hosted database.

For a local-only rollback, stop Next.js and rename `.env.local` to an ignored
backup name, then start again with `.env`. This selects the preserved local
database. It does **not** copy subsequent cloud writes back to local. Plan
reconciliation and a fresh backup before rolling back after live writes.

## Remaining launch work

This database migration does not resolve the broader application audit.
Rotate or disable all seeded accounts before deployment, then complete record
authorization, publishing and assessment workflow fixes, dependency updates,
operational email, content review, and production restore/deployment checks.

References: [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres),
[SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
