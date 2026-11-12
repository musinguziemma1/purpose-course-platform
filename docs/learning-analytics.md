# Learning analytics definitions

`/admin/analytics` reports recorded learning data for the initial organization.
`analytics.view` is checked against the current active account and role before
queries run. The report uses a read-only repeatable-read transaction so its
sections share one database snapshot. Cohort filters require active learner
memberships in an active or completed cohort and restrict curriculum to that
cohort's course/level when configured. Unknown scopes return 404.

The definitions below are implemented in `src/db/learning-metrics.ts` and shared
with learner and mentor progress reporting.

| Measure | Definition |
| --- | --- |
| Learner accounts | Active users whose current role is Student. Staff and inactive demonstration accounts are excluded. |
| Eligible curriculum | Distinct learner/course pairs granted by Enrolled or Completed level enrolments, with published parent courses. Duplicate enrolment aliases do not duplicate opportunities. Waitlist and paused enrolments grant none. |
| Lesson completion | Completed learner/lesson pairs divided by every published lesson opportunity in eligible curriculum, including unstarted lessons. Draft lessons, draft/archived courses and unrelated progress rows are excluded. |
| Course award rate | Non-revoked course awards divided by eligible learner/course pairs with at least one published lesson. This measures recorded awards, not a new assessment of historical certificate holders. |
| Valid certificates | Non-revoked course and level certificates belonging to eligible learner accounts in the selected scope. Historical awards can remain valid after enrolment ends. |
| Assessment attempts and average | Submitted attempts in the currently enrolled, published curriculum; void and future-dated attempts are excluded. Average score weights each attempt equally. |
| Assessment pass rate | Passed submitted attempts divided by all eligible submitted attempts. Repeat attempts are attempts, not unique learners. |
| Comparable score change | Mean first-to-latest score difference per learner/assessment/question-snapshot/pass-mark series with at least two submissions. Different assessments, learners, question versions and pass marks are never compared as one series. Legacy attempts without saved snapshots do not contribute a change estimate. |
| Active learners, 30 days | Distinct eligible learners with a supported, non-seed learning event during the rolling 30-day window. Reading without a recorded action does not qualify. |
| Daily actions | Recorded actions grouped by Africa/Kampala calendar date. Multiple actions by one learner count separately; active learner counts deduplicate that learner. The last 14 dates include zero-activity days. |
| Weekly active learners | Distinct active learners per Monday-based Kampala calendar week, including zero-activity weeks. The current week is partial. This is not a retention rate. |
| Goal achievement | Achieved goals divided by Active or Achieved goals for eligible learners. Cancelled/other goal states are excluded. |
| Mentor assignments | Active assignment records for eligible learners with an active mentor account. A learner can have more than one assignment. |

Supported events are `lesson_completed`, `lesson_reopened`,
`assessment_started`, `assessment_submitted` and `certificate_earned`.
Their existing application transactions record these events with the underlying
learning change. Entries marked `metadata.source = 'seed'` and future-dated
events are excluded. The historical `engagement` snapshots and generic `events`
seed records are preserved but do not power this report. No learning minutes,
dropout, satisfaction or retention rate is inferred from incomplete records or
assessment-instrument scores.

Learner dashboards show actual digital modules and their parent courses. Session
code suffixes are not treated as evidence of coverage of the five principles.
The separate programme-session checklist and final teaching/question-bank review
remain tracked in [launch readiness](launch-readiness.md).

Mentor reporting applies current assignment/oversight rules and excludes
inactive learner accounts. It uses the learner's assigned published curriculum,
valid attempts, comparable score changes, non-revoked certificates and actual
account email. Only reviewed group submissions contribute group scores (best
reviewed score per group). Follow-up indicators flag latest failed assessments:
one is Needs attention; two or more are Critical. These are review priorities,
not dropout predictions. New learners are not flagged solely for unstarted
lessons or missing scores; a later pass resolves that assessment's failure
indicator. Historic failures remain in valid attempt averages.

Assessment administration weights score averages by attempt count and omits
void results from submission lists. Authoring counts/history remain distinct
from the current-curriculum learning report. Historical report-definition rows
are retained as data, but the dashboard no longer presents those seed catalogue
descriptions as implemented measurements. New local seed definitions use the
current query names. No production seed routine was run.

Six local PostgreSQL regressions cover permission withdrawal, assignment scope,
unstarted/duplicate/draft eligibility, cohort membership, comparable score
series, certificates/goals and Kampala event boundaries. Chrome verifies the
staff cohort filter, learner module progress, mentor isolation, resolved failure
indicators, weighted administration average and mobile layout. Hosted checks use
only the restricted SQL runtime role, verified TLS and read-only queries.
