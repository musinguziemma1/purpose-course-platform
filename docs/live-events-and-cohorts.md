# Live events, media editing and cohort operations

## Schedule and discover sessions

Programme schedulers open **Live sessions** in the administration workspace.
Choose a current faculty host, date, time zone, duration, description and agenda.
The course and cohort fields are optional restrictions on who may join. A course
must be published; a cohort must be active and include the selected faculty host.
The course must match the cohort's level and any specific course scope. A session
must fit within the cohort dates. Overlapping sessions for the same host or cohort
are rejected, including concurrent scheduling attempts.

New schedules create an in-app notification for every active account and appear
in the account calendars. The home page and programme page also show upcoming
public events, with the full calendar at `/events`. Events are public by default;
the scheduler may turn off public website listing. Calendar lists refresh every
30 seconds while the page is visible and when the window regains focus.

Calendar discovery is separate from joining access. Public readers and other
accounts can see event descriptions and dates. Course enrolment and cohort
membership still protect agendas, meeting links, video rooms and recordings.
Student enrolment is not required for a properly assigned cohort mentor to teach.
Use an HTTPS external meeting link when delivering through another conferencing
service; otherwise the platform's existing video room is available.

Open an event to RSVP, enter its room or read preparation instructions. The host
or scheduler can start, end or cancel it. Schedulers can edit a scheduled event.
Changes and cancellations notify active accounts. Ended and cancelled sessions
retain their history and cannot be reopened. A recording may be attached to a
live or ended session by its host or scheduler and is shared only with eligible
participants. Recording publication and schedule changes use version checks.

## Mentor requests

Mentors open **Live teaching**, complete **Request a live session**, and submit
their proposed date, teaching scope and preparation. They can track the decision
and withdraw a pending request. A maximum of five pending requests per mentor
keeps the queue manageable.

Schedulers review requests under **Live sessions → Mentor session requests**.
Approval rechecks the host, course, cohort, dates and conflicts, then creates one
session and publishes its event notification. Declining requires an explanation
shared with the mentor. A pending request never appears as a scheduled event.
Conflicting or outdated proposals can be declined so the mentor can propose a
new time. Notifications are in-app; this workflow does not depend on email setup.

## Media in content

Article bodies, course descriptions and lesson bodies have **Insert media** and
**Preview content** controls. Place the cursor where the file should appear,
choose a ready library file, and save the article, course or lesson. Images,
audio and video render inline; documents render as downloadable material cards.
The lesson's separate media fields also support choosing from the library.

The stored text uses this block format:

```text
:::media image /api/media/<asset-id>
A descriptive caption
:::
```

Other kinds are `video`, `audio` and `document`. Raw HTML is not executed. Active
URL schemes are rejected, and external video iframes are limited to recognized
YouTube/Vimeo addresses. Public articles publish their referenced library files;
course and lesson files follow publication and learner access. Draft content
does not make its files public. Students and Guests still cannot browse the
shared library. See [dashboard workflows](dashboard-workflows.md).

## Cohorts and enrolments

Use **Cohorts** to create a level-scoped intake with dates, capacity, cadence and
an optional week plan or specific course. Open **Manage cohort** to edit settings,
add learners and faculty, remove or restore memberships, and view available seats.
Learners must have an active Student account and approved enrolment in that level.
Faculty placement requires a teaching role. Capacity checks serialize concurrent
placements. A transfer removes the old placement in the same level and updates
the enrolment's cohort reference together.

Use **Enrolments** to search by name or email, filter by status, approve eligible
admissions, manage internal notes, pause access or change placements. An interest
record without an approved Student account cannot become an active admission.
Higher levels require an unrevoked previous-level award. Completion requires the
actual learning and examination award; it cannot be fabricated with a status edit.

Pausing an enrolment suspends its learner memberships. Resuming rechecks eligibility
and capacity. Removing or transferring membership preserves lessons, examination
results and other learning records. Cohorts with members retain their level and
course scope. Capacity cannot drop below existing active placements. Completed
or cancelled cohorts stay closed; cancelling also cancels their remaining sessions.

The additive database migration is
`20261113130959_live_events_cohorts_enrolments.sql`. Apply through the existing
backup-and-migrate procedure, using the restricted application role at runtime.
The request table has RLS and no public Data API grants. Verification covers
request concurrency, publication privacy, scheduling conflicts, cohort capacity,
transfers, enrolment changes and embedded-content access.
