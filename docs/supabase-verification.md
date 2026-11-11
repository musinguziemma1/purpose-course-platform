# Supabase migration verification

Verified on 11 November 2026 for project `bxtkkibcpyiynvxniflp`.

## Database

| Check | Result |
| --- | --- |
| PostgreSQL connection | Session pooler, certificate and hostname verified |
| Application data | 86 tables, 1,107 records matched to a consistent local snapshot |
| Columns | Names, PostgreSQL types and nullability matched |
| Constraints | All 235 primary key, unique and foreign key definitions matched |
| Indexes | All 174 definitions matched |
| Enums | All 79 labels and their order matched |
| Sequences | All 76 values matched before application write tests |
| RLS | Enabled on all 86 tables |
| Public Data API roles | No application table or sequence access |
| Runtime role | `purpose_app`, no superuser, role creation, database creation or RLS bypass |
| Runtime read/write | Insert, read, update and delete succeeded; verification transaction rolled back |
| Runtime DDL | Creating a public table was denied |
| Runtime escalation | `SET ROLE postgres` was denied |
| Publishable key | Auth settings endpoint returned HTTP 200 |
| Direct users Data API request | HTTP 401, PostgreSQL permission error `42501` |

The original local PostgreSQL data is preserved. The active `.env.local` uses
the restricted Supabase role; the administrator URI remains in ignored
`.env.supabase.local`. Backups, generated credentials, and checksums are ignored
by Git. Both versioned migrations were committed to the hosted database's
migration history in the same transaction as the import.

## Application

The final production build and TypeScript checks passed. ESLint passed with
21 existing warnings and no errors. Four database configuration/demo isolation
tests passed via `npm run test:database`.

The production app was exercised in Chrome on `127.0.0.1:3001`:

- `/api/health` returned HTTP 200 with a successful database query.
- Forged `x-purpose-demo-*` headers on subscriber export returned HTTP 401.
- `/api/demo-login` returned HTTP 404.
- The sign-in form had no prefilled password or demo links.
- Manual sign-in opened the administrator dashboard and created the session
  in Supabase. The authenticated export returned HTTP 200.
- A browser newsletter submission showed its success message and created the
  corresponding Supabase row. A second submission updated that row; a repeated
  email-only submission preserved its name and did not create a duplicate.
- No browser JavaScript errors occurred in these flows.
- Test subscriber/session records were removed, and the test account's prior
  login timestamp was restored. The temporary verification server was stopped.

Verification exposed an existing email-only newsletter failure: Drizzle rejected
an empty conflict update. The handler now uses `ON CONFLICT DO NOTHING` when
neither optional field is provided. Missing application utility exports were
also restored while retaining the newly installed `cn` helper.

## Limits

These checks verify the database cutover and the flows above. They do not
certify every application feature or complete the earlier launch audit.
The subsequent administrator-hardening work disabled all six seeded logins
and provisioned the real owner account; see [administrator access](administrator-access.md).
Other authorization, publishing, assessment,
dependency and operational findings remain. Supabase Auth, Storage, Realtime,
hosted backups/PITR and deployment configuration were not migrated or configured
by this database change.

See [database operation and rollback notes](supabase-database.md).
