# Enrolment, release and live-service operations

## Enrolment integrity

Changing a person's role does not admit them to a level. In **Enrolment management**, staff can create a level request for an active approved Student using their actual account email. Requests begin on the waitlist. Staff then activate the record and optionally select a cohort; activation retains the existing previous-level certificate, identity, course and capacity checks. Existing requests cannot be duplicated through the creation form.

A role change, organization-membership role update, session revocation, notification and audit entry commit together. A Student with an active enrolment must first be paused or completed through the learning workflow before changing to another role. Existing results and learning progress are retained.

For legacy data, run the read-only plan first:

```powershell
npm run ops:enrolments -- plan --env-file .env.supabase.local --project YOUR_PROJECT_REFERENCE
```

`apply` pauses active records without a valid active Student identity/level and aligns unambiguous account-email mismatches. It does not invent identities, merge conflicting records, award levels or delete progress. It writes an encrypted before-change snapshot using `.local/credentials/recovery-backup.key` and commits audit records in the same transaction as the reconciliation. A completed encrypted backup must already have established that key. Conflicting identities require staff review. Review and protect a verified backup before a hosted application.

## Release safeguards

The `verify` GitHub Actions job must pass for the exact commit before `main` is updated. Branch protection requires the GitHub Actions application check, strict up-to-date checks, administrator enforcement, linear history, and disallows force-pushes and deletion. These are hosted repository settings; changing workflow YAML alone does not enable protection.

Verification runs on feature-branch pushes as well as pull requests and `main`. The release procedure is:

1. Commit only reviewed application changes, excluding environment files, credentials, runtime state and snapshots.
2. Push the commit to a working branch and wait for its `verify` job to succeed. Inspect failed checks instead of bypassing them.
3. Integrate the verified revision into `main` through the protected process. A direct fast-forward update must use the already verified commit and remain based on the current `main`.
4. Confirm the production deployment's repository, commit and Ready state. Verify public health and the affected role workflows, and record the previous deployment for rollback.

Vercel continues to build Git commits. The protection on `main` gates the normal Git production path. Privileged manual CLI releases and force-promotion remain operator actions and must independently use an already verified revision. Do not disable protection to make a release succeed.

## Live sessions

Without authenticated TURN configuration, production scheduling requires an HTTPS external meeting link. Mentors can still request sessions without a link; an administrator adds the link when approving. Joining links remain protected by enrolment/cohort authorization, while calendar metadata is discoverable according to the shared public/account policy. Event search uses `/events/:id` for every role.

Native rooms are available for local development. In production, they become available only with valid server-side `TURN_URL`, `TURN_USERNAME` and `TURN_CREDENTIAL`. `TURN_URL` accepts comma-separated `turn:`/`turns:` endpoints, optionally with a port and `?transport=udp` or `tcp`. `CONFERENCE_ENABLED=false` disables native rooms even if TURN is configured. Keep these values out of Git and `NEXT_PUBLIC_*` variables. TURN configuration is necessary but does not establish class-size capacity; test representative devices/networks before enabling native calls. Use short-lived provider credentials where supported by the selected service.

The default eight interactive mesh seats and direct host-to-viewer streams are intended for small tested groups. External meeting providers are the first-launch option until relay connectivity and a class-size target are verified. Do not advertise an untested broadcast audience size.

Events close after their planned duration plus a 15-minute overrun window. Calendars, feeds, room joins, chat posting and RSVPs enforce this window, so a stale `live` row cannot keep an event open indefinitely. Hosts should still explicitly end sessions. The protected maintenance job persists expired live states and removes abandoned signalling records. If more time is needed, schedule a new session.

## Monitoring and maintenance

**Settings → Service health and operational exceptions** opens `/admin/operations`, restricted to organization administrators. It shows aggregate enrolment inconsistencies, expired live states awaiting housekeeping, overdue publishing, old queued email and failed/uncertain/bounced delivery. It displays configuration readiness separately from evidence of successful delivery or recovery.

- `/api/health` returns uncached HTTP 200 and `{ "ok": true }` only when the database query succeeds; failure returns 503 without connection details.
- `/api/health/operations` provides aggregate operational counts only to a caller with the configured `CRON_SECRET` bearer token.
- `/api/jobs/maintenance` requires the same bearer authorization for GET or POST. It is idempotent for expired live sessions.
- `vercel.json` schedules maintenance daily at 03:00 Africa/Kampala (00:00 UTC), compatible with the inspected Hobby plan. Event expiry is enforced immediately on access and does not depend on cron punctuality. This schedule does not configure the separate email/publishing workers.
- The **Monitor production** GitHub workflow checks the database health endpoint, public event calendar and sign-in page every 15 minutes and supports manual dispatch. The origin defaults to the production Vercel domain; set the repository variable `PRODUCTION_ORIGIN` when the canonical domain changes. A failed check fails the workflow. GitHub schedules may be delayed and are not an availability guarantee.

The operator must enable GitHub Actions notifications for the monitored repository and verify delivery to the intended person. This is separate from application email through Resend. For stronger response-time guarantees, connect an independent uptime/incident service. Inspect Vercel cron/function failures and review the operations page; successful public health alone does not certify queue delivery, backups or every learning workflow.

## Encrypted application backup and isolated recovery

The recovery tool exports the application's `public` schema/data and, when present, Supabase migration history using `pg_dump` and an exported consistent snapshot. It separately downloads the `purpose-course-media` objects, checks for inventory changes during export, and encrypts the dump, each object and the manifest with AES-256-GCM. It is an application recovery archive, not a full Supabase cluster/platform backup or a replacement for managed PITR. Supabase Auth and other platform-managed schemas are outside its scope.

Requirements are a PostgreSQL client version compatible with the source server, the private matching operator environment and verified CA, and server-only Storage credentials when objects exist. On Windows, `--pg-bin` may identify a private directory containing official `pg_dump.exe` and `pg_restore.exe`. The rehearsal uses the already installed embedded PostgreSQL package. Do not check binaries into Git.

```powershell
# Hosted export: use only after authorization for production data and this destination.
npm run ops:recovery -- backup --env-file .env.supabase.local --project YOUR_PROJECT_REFERENCE --pg-bin PATH_TO_POSTGRES_TOOLS

# Authenticate and verify every archive entry without restoring it.
npm run ops:recovery -- verify --archive .local/recovery/BACKUP_DIRECTORY

# Create a fresh random-password loopback-only PostgreSQL cluster, restore, compare and remove it.
npm run ops:recovery -- rehearse --archive .local/recovery/BACKUP_DIRECTORY --pg-bin PATH_TO_POSTGRES_TOOLS
```

The default key is generated once in `.local/credentials/recovery-backup.key`. Keep a separately secured copy; loss of the key makes the archive unrecoverable. `--key-file` and `--output-dir` select private destinations. A Storage environment can be supplied through `--storage-env-file`; never put credential values on the command line. The backup command fails if it cannot include required media, and a partial directory without a verified encrypted manifest is not a completed backup.

The rehearsal accepts no remote restore target. It creates a disposable local cluster with a random password and no application/email workers, verifies table row counts and content digests, RLS-table counts and every media object's hash, revokes restored sessions and deactivates restored accounts before cleanup. It retains a private aggregate result in `.local/recovery-rehearsals`. Encryption/authentication failures, restore failures or differing contents fail the operation. No live project is overwritten.

A successful synthetic-data rehearsal verifies tooling, not production recovery. Before marking recovery readiness complete, obtain the authorized production archive, verify a real rehearsal, confirm the actual Supabase backup/PITR retention, store encrypted archives at an approved independent destination, and test access to the separately secured key. Agree the required backup frequency, acceptable data-loss window and recovery time with the owner. Verify runtime role grants, actual owner access, learner workflows and media delivery in the intended recovery environment before reopening service. Database backups alone omit Storage files; see [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups).
