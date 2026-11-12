# Deployment and operations

Prepared 12 November 2026. The application builds locally; a production Vercel
deployment, production domain, real Resend delivery, recurring scheduler and
restore rehearsal have not been verified. Keep these as launch prerequisites.

## Release target and build

Use the owner's Vercel team and link this repository explicitly. Confirm the
team, project, GitHub repository and production branch before linking or
deploying. The currently connected Vercel account has not been established as
the owner's target. Do not deploy into an unrelated team. Use a protected preview
with a separate staging database for review; previews must not write to the
production database or send operational emails.

`vercel.json` selects Next.js, `npm ci`, `npm run build` and Frankfurt functions
to match the Supabase database region. Set Node 24.x in project settings (also
declared in package.json). Deploy from Git integration after the verification
workflow passes. `.vercelignore` excludes private local state and environment
files from CLI uploads. The build command does not run seed routines or
database migrations.

GitHub Actions uses an ephemeral PostgreSQL 18 service on loopback port 54329,
an isolated test database, Node 24, immutable action commits and read-only
repository permission. It creates the test schema, seeds local fixtures, runs
database/password/migration/security checks, lint, build and the complete npm
audit. It receives no production database or email credentials. Configure branch
protection to require the `verify` job once the first hosted run succeeds.

## Production environment

Set these in Vercel's Production environment as server-side secrets. Use separate
values and a separate database for Preview. Do not paste values into GitHub,
source files, screenshots or logs. `.env.example` contains placeholders only.

| Variable | Required value |
| --- | --- |
| DATABASE_URL | Restricted `purpose_app` session-pooler URI, never the database administrator |
| DATABASE_SSL_CA | Supabase CA certificate, with verified TLS enabled |
| DATABASE_POOL_MAX | Start with 5; total pools across function instances must fit database capacity |
| PURPOSE_DEMO_OPEN | `false` |
| APP_URL | Final canonical HTTPS origin, without a path; used by invitation links, metadata, sharing, sitemap and certificates |
| RESEND_API_KEY | Sending key restricted to the verified sending domain |
| RESEND_FROM_EMAIL | Verified sender name/address |
| RESEND_WEBHOOK_SECRET | Signing secret for `/api/webhooks/resend` |
| EMAIL_OUTBOX_ENCRYPTION_KEY | Existing base64 32-byte key; preserve it so queued requests remain decryptable |
| CRON_SECRET | Existing random secret of at least 32 characters |
| CONTACT_RATE_LIMIT_SECRET | Optional separate HMAC secret; otherwise uses CRON_SECRET |

The public Supabase URL/publishable key are optional for the current backend SQL
flows; they do not replace DATABASE_URL. Do not supply the administrator URI,
Supabase management token or a service-role key to the browser or Vercel runtime.
Retain migration/admin credentials only in the private operator environment.

Set APP_URL before the production build, including the first `*.vercel.app`
release if a custom domain is not available. Rebuild after changing it because
some metadata is generated at build time. With no APP_URL, local review uses
localhost and Vercel uses its provided deployment host; that fallback is not
evidence that the intended production domain has been configured.

## Migrations, jobs and email

Run `npm run db:migrate:supabase -- plan` in the private operator environment.
Review the target, pending history and backup before applying through the same
migrator. Never run `db:push` or `db:seed` against hosted application data. Verify
restricted-role access, RLS and revoked public API grants after a schema change.
Keep the application revision compatible with the current schema for rollback.

Both GET and POST are supported for `/api/jobs/email` and
`/api/jobs/publishing`. Every request needs `Authorization: Bearer <CRON_SECRET>`;
a scheduler user-agent or dashboard login does not authorize it. Publishing is
safe under duplicate workers, and email uses durable leases and retry identity.
Do not put the secret in a query string. The email job returns 503 while provider
settings are missing. Configure jobs separately from provider delivery callbacks.

For a Vercel plan that supports the required frequency, merge the following
reviewed entries into `vercel.json` and deploy:

```json
{
  "crons": [
    { "path": "/api/jobs/email", "schedule": "*/5 * * * *" },
    { "path": "/api/jobs/publishing", "schedule": "* * * * *" }
  ]
}
```

Vercel Cron invokes GET and attaches the configured bearer secret. Its Hobby
plan permits daily runs only; that frequency is inadequate for timely email
retries and publishing. Confirm the selected plan or configure an existing
external scheduler with the same protected endpoints. No paid plan or recurring
job was installed by this change. See [Cron behavior](https://vercel.com/docs/schedules/cron-jobs),
[limits](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing) and
[securing jobs](https://vercel.com/docs/schedules/cron-jobs/manage-cron-jobs).

Confirm a real invitation to an owner-authorized mailbox: queued, provider
accepted, signed delivered callback, activation, password sign-in and rejection
of the used link. Validate bounce/retry visibility without manufacturing a
delivery status. Demo reserved-domain accounts are never email recipients.
See [email recovery](email-delivery.md).

## Backups and restore rehearsal

The migration snapshots in `.local/backups` are checksummed application records
for change verification. They are not complete PostgreSQL recovery backups.
Before launch, confirm the project's actual backup plan and retention in the
Supabase dashboard, agree acceptable data loss/recovery time with the owner,
and retain encrypted off-site exports where needed. Supabase's paid daily
backup/PITR availability depends on the selected plan; no plan was purchased.
Database backups omit Storage objects and do not retain custom-role passwords.
Back up uploaded files separately and retain a private role-credential recovery
procedure. See [Supabase backups](https://supabase.com/docs/guides/platform/backups).

Rehearse in a separately identified disposable target: restore a selected backup,
recreate/reset restricted runtime credentials, apply any compatible pending
migrations, then verify row counts, RLS/grants, owner login, learner enrolment,
assessments, certificates and file downloads. Keep outbound email and schedules
disabled during rehearsal; restored queue rows can otherwise send duplicates.
Revoke restored auth sessions and invitations before making a restored service
accessible. Record the backup timestamp, elapsed recovery time, verification
results and required manual steps. Do not test restoration over the live project.

## Monitoring and rollback

Monitor HTTPS `/api/health` for HTTP 200 and `{ "ok": true }`; it checks database
connectivity without exposing database identifiers or credentials. Configure an
external availability alert to the owner's selected destination. Inspect Vercel
function errors, Supabase database/pool utilization, job failures/last successful
runs, queued email age, failed or uncertain sends, signed delivery/bounce events,
and scheduled articles that remain overdue. A healthy web page alone does not
prove that jobs or email delivery work. Log record IDs rather than credentials,
activation tokens or message bodies. Alert routing has not yet been configured.

Before release, record the previous deployment ID and exact Git commit. Use
Vercel rollback/promotion for application regressions only after checking schema
compatibility. Database restore is a separate incident operation with a reviewed
target and data-loss window; do not automatically roll back migrations. After
rollback, recheck environment values, scheduled jobs, queue state and provider
retry identities. See [Vercel release controls](https://vercel.com/docs/deployments).

Disable the three password-protected demo accounts after owner review and before
public launch using `npm run demo:manage -- disable`, then check that their old
sessions fail and the real owner still signs in. Complete faculty/media review
in [curriculum review](curriculum-review.md) before accepting learners.
