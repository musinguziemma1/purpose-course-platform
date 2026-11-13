# Profiles, applications, media and learning workflows

## Accounts and personal settings

Visitors apply at `/signup` (also available from `/sign-up`). An application
does not create an active login. Staff with account-management access review it
under **Applications** in the administration workspace. Approval creates a
Student account and enrolment in the first course level. Staff and Mentor
accounts continue to require an administrator invitation. Duplicate applications
cannot replace an applicant's password. Passwords are hashed while a request
is pending and cleared from the request after approval or decline.

Each person must complete their own profile before entering their dashboard.
Required fields are full name, phone number, city/country, time zone and a short
biography. Title and profile image are optional. Personal settings are available
from `/account`, Student **Settings**, Mentor **Settings**, and the administrator
settings page. Administrators see which active accounts still need to complete
their profiles. Contact fields are not added to the public team listing.

The redesigned sign-in and application pages include password visibility
controls, accessible labels, clear errors and responsive layouts. Application
confirmation explains that staff approval is required; it does not promise an
email delivery before the email provider is fully configured.

## Shared media

Staff open **Media library** in their workspace. All recognized staff roles can
upload, search, preview, download and reuse files. Students and Guests cannot
browse or contribute to this library, even if a custom permission attempts to
grant that access.

Supported files include JPEG/PNG/GIF/WebP images, common video/audio formats,
PDF, Word, Excel, PowerPoint, OpenDocument, EPUB, text/CSV/RTF and ZIP files.
The maximum is **50 MiB per file**. Executables, HTML, SVG and scripts are not
accepted. Both metadata and file signatures are checked before a file becomes
available. Uploads go directly to private Supabase Storage, avoiding Vercel's
function request body limit. An upload is never permitted to replace an
existing object. Upload reservations are limited to 100 per person per hour.

The library supplies a stable `/api/media/<id>` link. Course and lesson editors,
article covers, and assignment authoring include a library picker. Temporary
Storage links expire after 60 seconds and are not saved in content records.
Students may read a library file explicitly attached to their assignment or
published learning content they can access. Public readers may read files
explicitly published in public content. This does not give either group access
to the library. Files no longer referenced by accessible content remain private.

## Mentor assignments

Mentors open **Assignments**, choose one of their active assigned students and
that student's enrolled level, then publish instructions, an optional due date,
and an optional library attachment. Administrators with learning oversight can
also assign work to a whole enrolled level.

Students write a response, optionally upload a private attachment, and save a
draft or submit for review. Drafts and draft attachments remain private to the
student. Submission makes the response available to the assigned mentor and
authorized learning administrators. Reviewers enter comments and a score from
0 to 100. The student sees both, and cannot overwrite a graded response.
Concurrent edits require a refresh instead of silently replacing newer work.
In-app notifications record assignment and review events.

## Progression to the next level

The **Courses** page shows completion and next-level eligibility. Passing the
published level examination and completing its required learning earns a level
certificate and completes the current enrolment. The immediately following
level unlocks when it has published courses. The student can then enrol without
another staff approval. Completed learning remains readable. Skipping levels,
revoked certificates and paused enrolments do not grant access. Eligible
historical results are reconciled when the student opens the Courses page.

## Hosting configuration and release

Keep all real credentials in ignored local files or Vercel environment settings.
The runtime database uses the existing restricted `purpose_app` account. Apply
the additive migration with `npm run db:migrate:supabase -- plan` followed by
`npm run db:migrate:supabase -- apply`; the latter makes a private checksummed
backup before applying changes. Never use a production seed or schema push.

Storage requires the matching project's `SUPABASE_URL` (or
`NEXT_PUBLIC_SUPABASE_URL`), a public publishable/anon key, and a server-only
`SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`. Never prefix a secret key
with `NEXT_PUBLIC_`. The server creates the private `purpose-course-media`
bucket on first upload, with MIME and size restrictions. Do not add public
read/write Storage policies: the application authorizes each signed operation.
`APP_URL` must contain the browser-facing production origin.

Resend sender/domain verification, webhook configuration, recurring scheduling,
faculty review of outstanding teaching materials and final launch operations
remain tracked separately in [launch readiness](launch-readiness.md).

Automated coverage lives in `tests/dashboard-workflows.test.mjs`,
`tests/media-library.test.mjs` and `tests/request-origin.test.mjs`. These use a
guarded local database and mock Storage transport, including role withdrawal,
cross-user access, draft privacy, concurrent saves, signup approval and real
exam grading through certificate issuance and next-level enrolment.
