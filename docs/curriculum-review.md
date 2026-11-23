# Curriculum coverage and review

## Current aligned curriculum — 23 November 2026

The attached programme specification is now represented as four linked academic
and digital pathways: Purpose Program for Adults, Purpose Program for Students,
YouLead!, and Purpose-to-Peace. The delivery model contains 12 programme-specific
levels and 51 modules. Existing adult URLs and rich lessons are retained, while
each module now also has five aligned teaching-principle lessons, five formative
prompts, one applied assignment and one five-question quiz.

The 12 level examinations cover every module. Five-module and four-module levels
use 20 questions; three-module Purpose-to-Peace levels use 15. The complete
aligned bank contains 480 questions: 255 module-quiz questions and 225 level-exam
questions. Every question has a teaching explanation and maps to a published
digital module and lesson. Programme-scoped level progression prevents an adult,
student, YouLead! or Purpose-to-Peace certificate from unlocking another pathway.

Run `npm run curriculum:sync` to apply the idempotent academic release, then
`npm run curriculum:audit` for a read-only check. The verified local audit reports
4 programmes, 12 digital levels, 51 modules, 255 aligned lessons, 51 assignments,
63 assessments, 480 questions, zero missing explanations and zero structural
integrity errors.

Structural alignment is not academic approval. Faculty must still review the
teaching claims, contextual examples, distractor quality, marking expectations,
pass marks and safeguarding language before opening enrolment. The platform must
record that governance decision separately from automated technical checks.

## Historical baseline — superseded by the aligned curriculum above

The attached 2026 programme specification defines four pathways: Purpose
Program for Adults, Purpose Program for Students, YouLead!, and
Purpose-to-Peace. The public programme catalogue exposes all four pathways and
their level/module structure. The Academy stores all four pathways with their
levels and module titles as editable programme outlines. Academy authors can
save changes as drafts or publish an outline to the public catalogue; outline
publishing does not create or publish learner-facing lessons. The database's
published digital course remains the 15-session adult PURP programme; student,
YouLead! and Purpose-to-Peace digital lesson delivery requires a separate
faculty-approved digital build.

Read-only Supabase inventory, 12 November 2026: 15 programme sessions, eight
published digital modules, 24 published lessons, eight five-question session
checks and three twenty-question level exams (100 questions). Run
`npm run curriculum:audit` to repeat the inventory without changing records or
printing answer keys. Structural validation is not faculty approval.

| Level | Programme session | Published digital module |
| --- | --- | --- |
| Foundation | PURP 101 Understanding Purpose | What purpose actually is — 3 lessons |
| Foundation | PURP 102 Becoming a Person of Value | Becoming a person of value — 3 lessons |
| Foundation | PURP 103 Purpose and Career | Purpose and work — 3 lessons |
| Foundation | PURP 104 Purpose and Predestination | Missing |
| Foundation | PURP 105 Purpose, Ministry and Calling | Missing |
| Intermediate | PURP 201 Discovering Your Purpose | Discovering Your Purpose — 3 lessons |
| Intermediate | PURP 202 Understanding and Liberating Your Potential | Limits and liberating potential — 3 lessons |
| Intermediate | PURP 203 How Will You Be Remembered? | Missing |
| Intermediate | PURP 204 Defining Your Purpose Statement | Defining Your Purpose Statement — 3 lessons |
| Intermediate | PURP 205 Transformation Story | Missing |
| Advanced | PURP 301 Understanding Vision | Understanding vision — 3 lessons |
| Advanced | PURP 302 Principles of Vision | Missing |
| Advanced | PURP 303 Positioning for Emergence | Positioning for emergence — 3 lessons |
| Advanced | PURP 304 Purpose, Time and Relationships | Missing |
| Advanced | PURP 305 Becoming Relevant and Impactful | Missing |

The learner programme page links available modules and identifies missing
digital coverage. Its attendance/review checklist is self-reported and distinct
from recorded digital lesson completion, assessment passes and certificate
requirements. Checking every session cannot award a certificate or establish
capstone readiness. Totals include valid current/completed enrolments; paused
and waitlisted entries do not count. Retried checklist submissions set the
intended state atomically instead of toggling twice.

All 100 questions have nonempty distinct options, valid answer indexes and
non-repeated prompts within each assessment. Assessment scope and settings
pass structural checks. The 60 level-exam questions lack explanatory teaching
rationales. Some examination prompts refer to sessions without digital modules
(including PURP 104, 205 and 304). Faculty must confirm teaching coverage, answer
accuracy, ambiguity, explanation text and pass marks before learner launch.
The current 80/80/85 pass marks are seeded configuration, not an approval record.
Review content in the protected Academy assessment editor; keep answer-key
exports private. No assessment answers were added or approved by this audit.

Three starter PDFs are supplied in `docs/resources` and `public/resources`.
The journal, career guide and audio series remain unavailable until approved
files are supplied. Replace teaching/media assets through the existing lesson
editor using valid hosted URLs; a managed media upload workflow is still pending.
Do not present starter content or placeholder listings as approved faculty media.
