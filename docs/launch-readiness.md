# Launch readiness work

This checklist tracks remediation of the project audit against the learner
journey in README.md: learn, reflect, develop, connect, and apply. A completed
item requires verification and a GitHub push. Database connectivity alone does
not establish launch readiness.

## Completed foundation

- [x] Move the application database to Supabase with a verified backup and data comparison.
- [x] Restrict SQL runtime credentials and block public Data API access to application tables.
- [x] Disable anonymous remote review and former public seed credentials; reject inactive sessions.
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
  - [x] Provide three owner-requested starter PDFs and remove fabricated download responses and demonstration counters for missing files.
  - [x] Map the published digital modules to programme sessions and distinguish self-reported attendance from assessed progress.
  - [ ] Complete missing teaching materials and obtain faculty review of question coverage and explanations; see [curriculum review](curriculum-review.md).

## 4. Production operations and experience

- [x] Resolve dependency vulnerabilities and validate upgrades.
  - [x] Patch all critical/high/moderate findings; verify zero production dependency findings.
  - [x] Remove the unused shadcn generator/CSS integration and its vulnerable deepmerge dependency path; both full and production audits report zero findings.
- [ ] Deliver invitations and operational email through Resend (selected by the user); configure a verified sender and API key.
  - [x] Implement expiring single-use invitations, account activation, durable delivery, signed callbacks and recovery controls.
  - [ ] Configure the verified sender/domain, production URL, API key, webhook and scheduler; confirm an authorized real delivery.
- [x] Expose the staff contact inbox with appropriate access checks.
- [x] Correct analytics definitions and report actual recorded learning events.
- [x] Fix the identified mobile overflow, form labels, and missing public links.
- [x] Document deployment, backup/restore, monitoring, and required external account settings; see [operations runbook](deployment-operations.md).
- [x] Identify the owner's production Vercel target, align Node 24.x, configure the canonical origin and operational secrets, and replace the exhausted session pool with a verified restricted-role transaction pool capped at one connection per instance.
- [ ] Verify production deployment, recurring jobs, availability alerts and an isolated restore rehearsal with the owner's account settings.
- [ ] Disable the three owner-requested password-protected demo logins after dashboard review and before public launch.

External provider configuration and product decisions that cannot be completed
from this workspace will be recorded explicitly; they will not be marked done
based on placeholder configuration.

## Verification log

13 November dashboard workflows: shared private media, mandatory personal
profiles, staff-approved student applications, mentor-authored assignments with
private drafts and scored reviews, and certificate-based next-level enrolment
are implemented. See [workflow and hosting details](dashboard-workflows.md).
These additions do not close the external email, curriculum or launch-operation
items above.

Vercel build configuration: database imports no longer validate credentials or
create a connection pool during route configuration collection. The first
database API call still validates the URI, verified remote CA and pool limits,
and bound methods retain normal Drizzle transactions and PostgreSQL behavior.
A production build with DATABASE_URL and DATABASE_SSL_CA explicitly cleared
passed, including `/api/community/posts`; CI now repeats that build condition.
Four new isolated-process regressions cover import safety, runtime failure,
remote CA enforcement and query construction without connecting, bringing the
security suite to 101 passing tests. Missing runtime configuration yields a
controlled failing health response. A restricted Supabase read-only transaction
passed with verified TLS. Vercel runtime environment configuration remains
required; local secret files are deliberately absent from GitHub deployments.

Curriculum and release preparation: the read-only hosted audit mapped all 15
programme sessions to eight digital modules and 24 lessons. The 100 questions
across 11 assessments pass structural validation; seven missing digital-session
mappings and 60 missing examination explanations remain explicitly open for
faculty review. Learner checklists now show their self-reported scope, retain
progress from eligible prior enrolments and cannot issue digital awards.
Four local regressions cover authorization, concurrent retries and separation
from lesson/certificate records. Chrome verified pending enrolment, prior/current
progress, a saved checklist change, paused access and 390-pixel layout.

Protected GET/POST job routes support scheduler invocation, and canonical links
use the configured production origin. The complete security suite passes 97
tests, with four database-config, two password and three migration-history tests
also passing. Both dependency audits report zero findings. A fresh disposable
local database and isolated checkout passed the CI prepare/schema/seed/security
sequence; this found and fixed config-loader interop and request-only seed
imports. GitHub-hosted execution, production deployment and external operational
checks remain distinct from that local rehearsal. No email or deployment was
triggered by verification.

Interface review: the community board wraps long discussion titles, prompts
and replies at 320, 390, 768 and 1,280 pixels without horizontal page overflow.
Anonymous readers see sign-in links, while authorized members can create a
discussion and reply using their server-bound profile. The shared field helper
associates labels, hints and errors with unique input identifiers; separate
learner, mentor, group, attendance, recording and editorial forms now use the
same association or labelled fieldsets. Chrome checked public enrolment and
learner, mentor and administrative forms for label targets and duplicate IDs.
The footer Privacy link opens a factual data-use notice, and the sitemap lists
Privacy and Contact while omitting the noindex sign-in page. Production build
and lint passed with 21 pre-existing warnings and no errors. Browser fixtures
used the local database and were removed; no email was sent.

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

Dependency security: Next.js and its lint configuration are 16.4.6, PostCSS is
8.5.32, and drizzle-kit is 0.31.11. Direct versions are pinned; the regenerated
lockfile replaces vulnerable esbuild/minimatch branches. Node 24.x is selected
for local/Vercel consistency. Production audit: zero findings. Full audit:
three low-severity findings from one unpatched deepmerge advisory in development
tooling; no moderate, high or critical findings remain. This limitation stays
tracked rather than being suppressed or reported as fully resolved.

All 63 security regressions, nine configuration/password/migration checks,
lint (21 existing warnings), type checking, the production build and schema
generation pass. Chrome reverified activation/sign-in, the complete learner
assessment/certificate journey and editorial publishing/concurrency/timezone
behavior under Next.js 16.4.6. See [dependency security](dependency-security.md).

Starter resources: the owner requested a few materials while the final media
are unavailable. Three tagged, selectable-text PDFs now provide the five-principle
overview, gifting evidence/peer-feedback worksheet, and twelve-month vision plan.
Editable HTML/CSS sources and a reusable renderer are committed. The renderer's
page/footer checks and prebuild PDF validation pass. Missing files show Coming
soon, return 404 and record no download. Request insertion and counter increment
are atomic; counts are labeled as requests rather than unique people or receipt.

All 68 regressions, lint (21 existing warnings), type checking and the production
build pass. Chrome downloaded each PDF and verified its exact bytes, and confirmed
the missing-file flow leaves metrics unchanged. The resource migration was
applied on 12 November 2026 after a verified snapshot of 88 tables/1,109 records.
It preserves uploaded URLs and their counters; historical request rows are
retained. Restricted runtime reads confirm three attached PDFs. The journal,
career guide and audio still need real files. See [starter resources](resources/README.md).

Contact inbox: public submissions now create one enquiry with bounded inputs,
idempotent retries, a honeypot and serialized hourly rate limiting. Generic staff
notifications and audit records commit with the enquiry. Only active users with
contact permission can read or manage the inbox; database checks revalidate
current permissions. Staff ownership and status changes reject stale versions.
Replies bind the submitted recipient, queue one encrypted provider request per
reply UUID and display real outbox status. Missing provider settings disable
reply controls without blocking staff access to enquiries.

Historical per-staff contact messages are preserved and imported once per
submission. Their unstructured email footers require staff confirmation before
replying. Legacy contact messages no longer appear in personal message screens,
and old contact notifications contain only a generic inbox link.

Ten contact regressions bring the suite to 78 passing tests. Migration-history
checks, type checking and the production build pass; lint has the same 21
warnings and no errors. Chrome verified anonymous submission, inert stored
markup, staff ownership, stale-update rejection, encrypted reply queuing,
editor/anonymous access denial, legacy-message privacy and disabled replies
without provider settings. No email was sent.

Migration `20261112070652_add_staff_contact_inbox.sql` was applied on 12 November
2026 after a verified snapshot of 88 tables/1,109 records. All 90 resulting
application tables have RLS and no anonymous/authenticated API grants. Restricted
runtime CRUD passed in a rolled-back transaction; hosted enquiry/reply counts
remain zero and migration history has no pending entries. See [contact inbox](contact-inbox.md).

Learning analytics: one shared query model counts distinct eligible enrolments
against all assigned published lessons, including unstarted lessons. It excludes
inactive/staff accounts, draft content, void attempts, revoked certificates,
future events and marked seed activity. Cohort filters use real active
memberships and their assigned curriculum. Score improvement compares first and
latest attempts only within the same learner, assessment, saved question set and
pass mark. Daily and weekly activity use Kampala calendar boundaries and include
zero-activity periods. Unsupported minutes, satisfaction, dropout and retention
claims were removed from the dashboard.

Learner dashboards show real digital modules rather than inferring principles
from session-code suffixes. Mentor progress uses each learner's enrolled
curriculum, real email and comparable score history, with current assignment
checks. Latest successful attempts resolve prior failure indicators; unstarted
learning alone does not classify new learners as at risk. Assessment history
omits void results, and administration averages weight individual attempts.

Six analytics regressions bring the suite to 84 passing tests. Type checking,
production build and lint (21 existing warnings, no errors) pass. Chrome verified
cohort switching, 1/4 versus 1/2 completion denominators, +40 comparable score
change, a 73% weighted average, learner module labels, mentor isolation,
editor denial, void-history exclusion and the mobile layout. The restricted
Supabase runtime executed the read-only report successfully with verified TLS:
zero active learner accounts, attempts, awards or recorded activity, rather
than the old demonstration figures. No hosted records or schema were changed
by this batch. See [learning analytics definitions](learning-analytics.md).

Owner-requested dashboard demo accounts: on 12 November 2026, three new
password-protected Super Admin, Mentor and Student accounts were provisioned
for prelaunch review. The owner login and the disabled public seed credentials
were preserved. A practice cohort, enrolment, mentor assignment and goal provide
a coherent starting experience; no scores, progress or awards were fabricated.
Credentials are unique and stored only in an ignored private file. Provisioning
is atomic and repeatable; disable revokes sessions and does not remove records.

The `is_demo_account` migration was applied after a verified snapshot of 90
tables/1,113 rows. Real staff learning reports exclude practice learners; demo
staff see practice reports. Email to demo profiles is cancelled before provider
dispatch. All 91 security regressions, three migration-history checks, type
checking, production build and lint (21 existing warnings, no errors) pass.
Chrome performed actual password sign-in, 16 admin/8 mentor/14 student navigation
routes, role boundaries and logout, without browser errors or email delivery.
Restricted runtime checks confirm the owner's production learning report still
has no eligible learner activity. These accounts remain available for the owner's
review and are an explicit prelaunch disable item. See [demo accounts](demo-accounts.md).
