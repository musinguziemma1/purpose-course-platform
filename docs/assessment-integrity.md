# Assessment and certificate integrity

Learners need active or completed level enrolment and published assessment/course
content. Session quizzes require the published lessons in their module (or course
when no module is selected). Level examinations require all published lessons
and required session quizzes in the level.

Questions are released by the authenticated start endpoint. Starting reserves an
attempt and records a database-clock deadline plus a private question/answer
snapshot. Another tab resumes the same active session. Leaving does not pause
the timer; expired sessions consume an attempt. Previous submitted attempts also
count toward the limit. Repeated submissions of one session return its saved
result. Duplicate, foreign, missing and out-of-range answer selections are rejected.

Grading commits the result, answers, session state, audit event, learning event,
assigned-mentor notification and earned awards together. Reviews use the question
snapshot rather than a subsequently edited question bank. Instrument scoring
also commits its session, responses and result together; sharing defaults to
private and requires explicit consent.

A course award requires every published lesson and required session quiz in that
course. A level award requires all published courses and required assessments,
including at least one published required level examination. Two course awards
in one level have separate scope from the level award. Existing revoked awards
are not automatically reissued. Public verification and downloads reject revoked
awards. Staff issuing a certificate must have learner oversight/assignment and
must meet the same completion criteria; supplied score fields cannot override it.

Migration `20261111193018_secure_assessment_sessions.sql` adds backend-only timed
sessions, fixes certificate uniqueness and changes the instrument sharing default
without changing existing sharing choices. The single demonstration certificate
identified by the audit is retained and revoked because its owner is a disabled
seed account. Genuine learner records are preserved.

Nine PostgreSQL assessment regressions cover prerequisites, snapshot grading,
expiry, concurrent starts/submissions, rollback, distinct award scopes and
revocation. Four instrument tests cover validation and rollback after a forced
late result failure. Chrome verification follows lessons through session quizzes,
course completion, a level examination, verification and download; it also tests
expired submissions, retries, private question release and another account's access.

Approved curriculum and real resource files still need the separate content
readiness review in [launch readiness](launch-readiness.md).
