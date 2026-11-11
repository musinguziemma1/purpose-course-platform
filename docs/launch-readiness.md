# Launch readiness work

This checklist tracks remediation of the project audit against the learner
journey in README.md: learn, reflect, develop, connect, and apply. A completed
item requires verification and a GitHub push. Database connectivity alone does
not establish launch readiness.

## Completed foundation

- [x] Move the application database to Supabase with a verified backup and data comparison.
- [x] Restrict SQL runtime credentials and block public Data API access to application tables.
- [x] Disable remote/production demo identities and account auto-provisioning; reject inactive sessions.
- [x] Fix email-only newsletter submissions and verify the browser-to-database flow.

## 1. Access control and learner privacy

- [x] Enforce administrative route permissions before data loading; align navigation and editorial/ownership actions with permissions.
- [x] Keep members-only communities, removed discussions, and their search results private.
- [x] Scope mentor reads and writes to assigned learners and respect assessment sharing consent.
- [x] Bind conference signals and controls to the authenticated participant and actual host.
- [x] Enforce learner enrollment and publication checks on learning endpoints.
- [x] Limit the first launch to one organization; disable additional-organization provisioning (user decision, 11 November 2026).
- [x] Replace or disable seeded production credentials with a usable administrator recovery path.
- [x] Prevent stored script injection in structured metadata.

## 2. Publishing correctness

- [x] Map workflow commands to valid review event values.
- [x] Make state changes, revision history, audit events, and notifications atomic.
- [x] Enforce permitted transitions and concurrent update protection.
- [x] Verify scheduling, publishing, revision requests, and author ownership.

## 3. Learning and assessment correctness

- [x] Enforce assessment publication, prerequisites, timing, and attempt limits on the server.
- [x] Make grading and result persistence atomic and safe under concurrent submissions.
- [x] Issue course/level certificates only for the intended completed scope.
- [x] Resolve certificate uniqueness and verify the complete learner journey.
- [ ] Reconcile programme structure, question banks, and missing resource files.

## 4. Production operations and experience

- [ ] Resolve dependency vulnerabilities and validate upgrades.
- [ ] Deliver invitations and operational email through Resend (selected by the user); configure a verified sender and API key.
  - [x] Implement expiring single-use invitations, account activation, durable delivery, signed callbacks and recovery controls.
  - [ ] Configure the verified sender/domain, production URL, API key, webhook and scheduler; confirm an authorized real delivery.
- [ ] Expose the staff contact inbox with appropriate access checks.
- [ ] Correct analytics definitions and record real learning events.
- [ ] Fix the identified mobile overflow, form labels, and missing public links.
- [ ] Document deployment, backup/restore, monitoring, and required external account settings.

External provider configuration and product decisions that cannot be completed
from this workspace will be recorded explicitly; they will not be marked done
based on placeholder configuration.

## Verification log

Community privacy: shared SQL authorization covers community pages, discussion
pages, feeds, search results/facets, membership, replies, reactions, and reports.
Reply insertion and count updates lock the thread and commit atomically. Five
local PostgreSQL regression tests cover guests, nonmembers, members, moderators,
removed/archived/orphaned content, and membership revocation. Test fixtures roll
back without modifying the hosted application database.

Administrator access: the owner account was created for the address supplied by
the user, and all six seeded logins were deactivated with their sessions revoked.
The generated password is stored only in an ignored local credentials file.
Every administrative page now runs a route permission check before loading data;
authors' article queries also enforce ownership. Numeric role seniority no
longer grants editorial privileges. Super Admin role changes are restricted to
Super Admins, with row locking and session revocation. Five role-policy tests
and two password tests pass. Live Chrome sign-in verified the owner account and
the HttpOnly/Secure/SameSite=Lax session cookie. See
[administrator access and recovery](administrator-access.md).

Local Chrome verification confirmed that authors cannot access audience,
review, activity, settings or academy pages; foreign drafts are absent from
their lists and direct links return 404. Password changes revoke prior sessions,
reject the old password and accept the new one. The sign-in form now retains
the email address after a rejected attempt. Test accounts and drafts were
removed after verification.

Mentor privacy: learner goals, notes, flags, attendance, coaching, group review,
assessment results and analytics now enforce active assignment or programme
oversight. Instrument results require explicit consent and sharing, including
summary counts and notifications. Six PostgreSQL regression tests cover these
scopes. Local Chrome/API verification confirmed that private results never reach
mentor HTML, shared results notify only the assigned mentor, a forged goal update
is rejected without changing the record, and revoked assignments immediately
lose access. All 16 authorization tests, type checking, lint and the production
build passed. Browser fixtures were removed afterward.

Conference security: every room API operation binds the peer to its authenticated
profile. Only the assigned host or programme oversight can control the room;
signals require a recipient in the same room. Joins and seat grants serialize
on the session row to enforce capacity. Course enrolment, publication and active
cohort membership apply to video rooms, live feeds, recordings, RSVPs and event
search. Paused enrolment blocks subsequent polling and room-page access. The
client closes media connections after access denial and handles host mute/hand
commands. Seven PostgreSQL tests cover peer impersonation, inbox isolation,
host privileges, revocation and concurrent joins.

Structured metadata uses escaped JSON serialization. A regression test and local
Chrome verification confirmed that a stored `</script>` payload remains data
without executing. Chrome/API checks also verified guest denial, forged peer
rejection, authorized signalling and chat with server-controlled identity. All
24 security tests, type checking, lint (21 existing warnings) and the production
build passed. Test accounts, sessions and the article payload were removed.

Learning access: completion writes verify active/completed level enrolment,
published course and lesson, and all earlier published lessons in the stable
course order. Concurrent writes serialize per learner and commit the progress
record with its audit event. Preview lessons remain readable without enrolment
but cannot award progress. Self-service admission requests stay on the waitlist
and cannot reactivate paused records or overwrite another level. Assignment
submission, legacy session completion and assessment questions also enforce
enrolment; cohort reads require active membership or programme oversight.
Reflection, assignment and failed-assessment notifications go only to active
assigned mentors. Private reflection titles are excluded from activity logs.

Seven additional PostgreSQL checks cover lesson and assessment access. Local
Chrome confirmed a forged completion identifier produces no progress row,
valid completion unlocks the next lesson, paused/draft content loses access,
and draft assessments return 404. All 31 security tests, type checking, lint
and the production build passed. Assessment timing/attempt limits and certificate
correctness remain in phase 3; they are not established by these access checks.

Publishing: a shared command map supplies valid states and database review-event
values. Article saves and workflow changes lock the article, verify permissions
and the version displayed to the editor, then commit content, revisions, tags,
history, audit and applicable notifications together. Authors cannot change
submitted/reviewed content without a revision request; editing approved or
scheduled content clears approval and scheduling. Scheduled publication uses
the same atomic path with skipped locks to prevent duplicate events.

Seven publishing regression tests cover all commands, withdrawn permissions,
invalid schedules, late-failure rollback, simultaneous edits and simultaneous
scheduled publishers. Chrome verification covered save, submit, review,
revision, resubmission, approval, scheduling and public publication. A stale tab
could not overwrite a newer draft. A 10:30 Africa/Kampala schedule was stored as
07:30 UTC. All 38 regression tests, type checking, lint and the production build
passed. Scheduling currently runs on public/article visits and the staff action;
a periodic production scheduler is part of the deployment configuration work.

Assessment integrity: explicit starts reserve a timed session using the database
clock. Questions and answer keys are snapshotted privately; only prompts/options
are released to the learner. Expiry consumes an attempt. Starts and submissions
serialize per learner; repeats return the existing result. Grading, answers,
session state, audit/learning events, assigned-mentor notices and earned awards
commit together. Lesson completion also commits earned awards atomically.
Reviews use stored question snapshots. Instrument sessions, responses and results
now commit together, including rollback after a forced late persistence failure.

Migration `20261111193018_secure_assessment_sessions.sql` was applied to Supabase
after local tests and a verified backup of 86 tables/1,109 rows. The resulting
87 tables have RLS and no public API table grants. Restricted `purpose_app` CRUD
passed in a rolled-back transaction. Separate partial unique indexes support
multiple courses in one level and a distinct level award. Sharing defaults to
private. The one disabled demo account's certificate was preserved and revoked.

Nine assessment and four instrument regressions bring the suite to 51 passing
tests; three migration-history checks also pass. Type checking, lint and the
production build pass. Chrome verified the complete lesson/quiz/course/exam/level
journey, private question release, expiry, retries, snapshot review, valid public
verification/download and revoked download denial. Official hosted advisors were
unavailable because the CLI has no management access token; direct SQL RLS/grant
checks passed. See [assessment integrity](assessment-integrity.md).

Invitations and email: 48-hour single-use activation links create credentials,
profiles and organization membership atomically, without granting enrollment.
Replacement/revocation invalidates prior links, and inviter permissions are
rechecked at redemption. Protected provider requests preserve retry identity;
the worker uses leases, backoff and a 23-hour retry cutoff. Signed, deduplicated
callbacks establish delivery separately from provider acceptance. Fake manual
dispatch controls were removed. Existing unverified dispatch claims are labeled
for review rather than treated as real delivery.

Twelve email/invitation regressions bring the suite to 63 passing tests. Chrome
verified staff invitation, corrected password validation, activation, sign-in,
revoked-link rejection and the absence of fake dispatch controls. Lint retains
21 existing warnings with no errors; type checking, production build and three
migration-history checks pass. Tests used local fixtures and fake provider
responses; no email was sent. Resend settings are still missing: verified
sender/API key, canonical application URL and webhook signing secret. Scheduler
installation and an authorized real delivery remain launch prerequisites. See
[email delivery and recovery](email-delivery.md).

Migration `20261111201335_implement_resend_invitations.sql` was applied to Supabase
after a verified snapshot of 87 tables/1,109 records. All resulting 88 application
tables have RLS and no public API grants. The restricted backend role passed
invitation/outbox/event CRUD checks in a rolled-back transaction. No test
invitation or delivery was left in the hosted database.
