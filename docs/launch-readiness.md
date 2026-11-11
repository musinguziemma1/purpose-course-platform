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

## 1. Access control and learner privacy — in progress

- [ ] Enforce permission checks on every administrative page and action.
- [x] Keep members-only communities, removed discussions, and their search results private.
- [ ] Scope mentor reads and writes to assigned learners and respect assessment sharing consent.
- [ ] Bind conference signals and controls to the authenticated participant and actual host.
- [ ] Enforce learner enrollment and publication checks on learning endpoints.
- [ ] Limit the first launch to one organization; disable additional-organization provisioning (user decision, 11 November 2026).
- [ ] Replace or disable seeded production credentials with a usable administrator recovery path.
- [ ] Prevent stored script injection in structured metadata.

## 2. Publishing correctness

- [ ] Map workflow commands to valid review event values.
- [ ] Make state changes, revision history, audit events, and notifications atomic.
- [ ] Enforce permitted transitions and concurrent update protection.
- [ ] Verify scheduling, publishing, revision requests, and author ownership.

## 3. Learning and assessment correctness

- [ ] Enforce assessment publication, prerequisites, timing, and attempt limits on the server.
- [ ] Make grading and result persistence atomic and safe under concurrent submissions.
- [ ] Issue course/level certificates only for the intended completed scope.
- [ ] Resolve certificate uniqueness and verify the complete learner journey.
- [ ] Reconcile programme structure, question banks, and missing resource files.

## 4. Production operations and experience

- [ ] Resolve dependency vulnerabilities and validate upgrades.
- [ ] Deliver invitations and operational email through a configured provider.
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
