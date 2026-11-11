# Purpose Course — publishing platform & learning community

The first release of the Purpose Course digital platform: a professional public website and blog with a
multi-author editorial workflow, structured course content, newsletter capture, downloadable resources, and the
first real-time community features.

Built with **Next.js 16 (App Router)**, **PostgreSQL + Drizzle ORM**, **Tailwind CSS v4**, shadcn-style UI primitives,
**Framer Motion** and **lucide-react**. (The brief mentioned Convex; this sandbox runs PostgreSQL, so the data layer is
Drizzle. The schema and server-action mutations are structured so they can be ported to Convex functions without
changing the UI contracts.)

## What is implemented

### Public site
- `/` — editorial homepage with a **three-slide auto-rotating hero** (programme → assessment engine → live community),
  five purpose principles, programme rail, featured journal, live community preview, testimonials, resources,
  roadmap and newsletter. The carousel auto-advances every 7s, pauses on hover/focus, supports arrow keys,
  dots, prev/next and play/pause, and respects `prefers-reduced-motion`.
- `/course` — the full programme from the database: 3 levels, 15 sessions, outcomes, formats, cohort interest form.
- `/blog` — search, principle categories, tag filters, pagination, newsletter capture.
- `/blog/[slug]` — rendered article, reading progress, author card, share links, tags, related reading, JSON-LD.
- `/resources` — resource library with download routes that count and log downloads.
- `/community` — real-time discussion board (polling), new threads and replies, group list, round-table rules.
- `/about` — page content from the database, team/roles, contact details.
- `/contact` — seeded page content plus a working enquiry form that writes to the faculty inbox (`messages`) and the
  audit log, with a notification to the programme desk.
- `/search` — unified search across articles, courses, lessons, resources, discussions, people and events.
- `/community/[slug]` and `/community/thread/[id]` — purpose communities with threads, replies, reactions, reports
  and moderation, plus deep-linkable discussion pages.
- `/sitemap.xml`, `/robots.txt`, per-page metadata, OpenGraph and structured data.

### Academy: assessments, group work & certificates
- **Auto-graded assessments** — 5 five-choice questions after every session (seeded for all 9 modules) and 20 questions after every level (3 exams, 108 questions total). Submission is graded instantly; the percentage, pass/fail, per-question review and explanation appear immediately, and the attempt is stored against the learner.
- **Configurable pass marks** — 80% default; per level in the database (Foundation 80, Intermediate 80, Advanced 85) and editable from `/admin/academy/assessments`. Level exams stay locked until the level's lessons are complete.
- **Mentor & admin insight** — `/mentor/assessments` shows a cohort performance matrix (lesson %, average/best/last score, trend, pass counts, group score, certificates) with an automatic follow-up queue for anyone below the pass mark, a failed attempt notification, or a falling trend; `/admin/academy/assessments` shows question banks, averages, pass rates and recent results.
- **Group work** — mentors form groups (`/mentor/groups`), students submit one shared deliverable (`/learn/groups`), mentors score it out of 100 with informative feedback that every member receives.
- **Certificates** — issued automatically when verified completion is reached (all lessons complete, or the level exam passed). Each carries a unique code, a downloadable 1600×1130 gold-foil SVG certificate (`/api/certificates/[code]/download`) and a public register page at `/verify/[code]`.

### Design system (UX/UI)
- **Tokens** — brand palette, 6-step elevation scale (`xs → pop`), 6 radii, soft easing curve, tabular numerals
  for all metrics. Compiled into one global stylesheet.
- **Primitives** (`src/components/ui`) — `Button` (9 variants, 6 sizes, loading state), `Badge` (9 tones, optional dot),
  `Card`/`CardHeader`/`CardFooter`, `Stat` tiles, `Progress` (accessible `role="progressbar"`), `EmptyState`,
  `PageHeader`, `Skeleton`, `Input`/`Select`/`Textarea`/`Field`/`CheckboxRow` with hover, focus-ring and error states.
- **Consistent surfaces** — `.surface`, `.admin-card`, `.interactive` (lift + gold border on hover), `.chip`, `.meter`,
  `.skeleton`, `.paper-texture`, so all 40+ screens share one visual language.
- **Navigation** — a global **⌘K command palette** (live search across articles, lessons, people, events) in the public
  header and every workspace, sidebar items with `aria-current` and a gold inset indicator, mobile nav rails.
- **Accessibility** — a skip link, one unified gold focus ring on every interactive element, `aria-label`s on icon
  buttons, live regions for carousel state, `role="progressbar"` meters, and full `prefers-reduced-motion` support.
- **Rhythm** — section spacing normalised via `.section`, balanced headings (`text-wrap: balance`), reading measure
  and typography tuned for long-form articles.

### Live video conferencing (real WebRTC, no third-party service)
- **Own signalling layer** in Postgres — `conference_participants` (presence, mute/camera/hand state, seat mode) and `conference_signals` (single-delivery offer/answer/ICE envelopes). `POST /api/conference/[code]` handles `join`, `poll`, `signal`, `host` and `leave`; each poll consumes its signal inbox transactionally, so no message is delivered twice.
- **Direct peer-to-peer media** — `RTCPeerConnection` mesh with deterministic initiator selection (lexicographic peer-id comparison) to prevent offer glare, ICE-candidate queuing until remote description is set, automatic ICE restart on failure, `max-bundle` and `rtcpMux` for a light SDP.
- **Scales beyond the mesh** — the first `CONFERENCE_MAX_SEATS` (default 8) participants get interactive seats; later joiners automatically enter **audience mode** and receive the host's stage stream, so a large class can join without multiplying uplink. Hosts can grant a seat, remove a participant, mute everyone and lower hands from inside the room.
- **In-call controls** — mic/camera toggles with echo cancellation and noise suppression, screen share via `replaceTrack` (no renegotiation), raise hand, live attendance count, mesh-seat counter and signalling latency readout, plus a one-click copy of the invite link.
- **Room page** `/room/[code]` embeds the stage beside the existing live feed (chat/questions) and the session agenda, so teaching and the backchannel sit in one screen. Session rooms are created automatically when a live session is viewed or scheduled.
- **TURN (optional)** — set `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` for restrictive networks; Google STUN is used by default. `CONFERENCE_MAX_SEATS` tunes the interactive capacity.

### Enterprise data architecture (11 modules, 86 tables)
`Identity` (users, profiles, roles, permissions, role_permissions, organizations, org_memberships) · `Content`
(articles, pages, media_assets, resources, categories, tags) · `Learning` (course_levels, courses, course_sessions,
course_modules, lessons, learning_activities, live_sessions) · `Learners` (enrollments, learning_progress,
lesson_progress, learner_goals, reflections, achievements, learner_achievements, certificates) · `Assessments`
(assessments, questions, attempts, answers, instruments, dimensions, items, responses, results, scoring_rules) ·
`Mentorship` (mentor_assignments, coaching_sessions, mentoring_notes, learner_flags, assignment_submissions,
group_submissions) · `Community` (communities, members, threads, posts, comments, reactions, reports) ·
`Communication` (notifications, preferences, outbox, email_events, messages) · `Analytics` (events, learning_events,
engagement, reports) · `Audit` (activity_logs, security_events, data_changes). Live map at `/admin/architecture`.

### Learning analytics (`/admin/analytics`)
- **Platform level** — registered users, active learners (30d), lesson and course completion, certificates,
  assessment pass rate, principle coverage across the curriculum.
- **Programme level** — cohort performance and capacity, assessment improvement (last 7 days vs prior), goal
  achievement rate, mentor engagement, mentoring notes, dropout by course, engagement trend chart, retention.
- **Individual level** — per-principle progress bars (Identity → Destiny), lesson completion, assessment trajectory
  (first/last/improvement), goal progress, achievements, group-work score and automatic follow-up reasons.
  The same panel is shown to learners on `/learn`.

### Unified search
`/search` and `GET /api/search?q=&type=` search **articles, courses, lessons, resources, discussions, people and
events** in one query, with type facets, grouped results and snippets. A search icon sits in the site header.

### Completed platform sections
- `/learn/notifications` — in-app inbox, direct messages, achievement wallet and delivery preferences.
- `/admin/notifications` — template registry, outbox dispatch and email lifecycle events.
- `/mentor/attendance` — session register with attendance marking and history.
- `/learn/goals` — goals, mentor notes, attendance and notification preferences.
- Lesson pages now render the **learning activities** attached to each lesson (previously seeded but unused).
- `/admin/analytics` includes the **M&E report catalogue** (platform, programme, individual definitions).
- `/mentor/mentees` and `/admin/cohorts` are aliases that redirect to the consolidated pages.

### Editorial dashboard (`/admin`, staff only)
- Overview: pipeline counts, review queue, recent activity, publish-due action.
- Articles: status filters, search, editorial table.
- Article editor: body markdown subset, category, tags, cover image, SEO fields, revisions, review timeline.
- Workflow panel: **draft → submitted → in review → approved → scheduled → published**, plus revision requests,
  rejection with comments, archiving, restore and featuring — each transition records an `article_reviews` row, an
  `activity_logs` entry and a notification for the author.
- Review queue, audience & students, community moderation (pin / lock / remove), activity log, site settings.

### Five workspaces, one identity system
Open `/login` and use **one-click sign in** (or `/api/demo-login?role=mentor` directly). The demo sign-in
self-heals the accounts if the database was freshly provisioned.

| Account | Role | Workspace | What is inside |
| --- | --- | --- | --- |
| admin@purposecourse.org | Administrator | `/admin` | publishing control, review queue, people & roles, audience, community moderation, activity log, site settings, academy oversight, links into the mentor and student workspaces |
| editor@purposecourse.org | Editor | `/admin` | review/approval queue, scheduling and publishing, assignments to authors, community moderation |
| author@purposecourse.org | Author | `/admin` | own drafts, revision history, submit for review, editorial feedback |
| mentor@purposecourse.org | Mentor | `/mentor` | confirm/decline coaching requests, record session notes, schedule follow-ups, review assignment submissions, mentee progress, shared reflections |
| student@purposecourse.org | Student | `/learn` | 15-session programme with completion tracking, progress ring, assignment submissions and mentor feedback, reflection journal with visibility controls, coaching requests and history |

All accounts use the password `Purpose2026!` for the manual sign-in form.

Credentials live in `users` (scrypt hashes); public identity lives in `profiles`; permissions are attached to `roles`.
Sessions are server-side rows with an http-only cookie (SameSite=None + Partitioned in production so the preview
works inside an embedded frame).

## Database modules
`roles`, `users`, `profiles`, `auth_sessions` · `categories`, `tags`, `articles`, `article_tags`,
`article_revisions`, `article_reviews` · `pages`, `site_settings`, `navigation`, `media_assets`, `resources`,
`resource_downloads` · `course_levels`, `course_sessions`, `enrollments`, `learning_progress`, `testimonials` ·
`coaching_sessions`, `reflections`, `assignments`, `assignment_submissions` ·
`discussion_groups`, `discussion_threads`, `discussion_posts` · `subscribers`, `notifications`, `activity_logs`.

Enrolments link to both an email (waitlist) and a `profile_id` once a student account exists, so a learner can move
from interest list to portal without duplicating identity.

Foreign keys use consistent UUID profile/article identities. Course content is fully data-driven — no session copy is
hardcoded in pages.

## Commands

### Run locally

Install Node.js and run these commands from the project folder:

```bash
npm install
npm run setup:local
npm run dev
```

Open http://localhost:3000. In Windows PowerShell, use `npm.cmd` instead of
`npm` if your execution policy blocks `npm.ps1`.

`setup:local` creates `.env` from `.env.example`, starts portable PostgreSQL on
`127.0.0.1:54329`, applies the schema, and seeds a new database with demo content.
It skips the seed when profiles already exist. PostgreSQL binaries are installed
through the [embedded-postgres package](https://github.com/leinelissen/embedded-postgres);
Docker and a system PostgreSQL installation are not required.

Database files persist in `.local/postgres`. Development and production startup
automatically start this database when needed. Use `npm run db:stop` to stop it.
The website binds to `127.0.0.1` for local use.

```bash
npm run typecheck
npm run lint
npm run build
npm start
```

Schema commands and the application both use `DATABASE_URL` from `.env`.
`npm run db:push` applies schema changes; `npm run db:seed` **resets application
data** and restores the demo dataset. Do not run the seed against a database
whose contents you want to preserve. `setup:local` only provisions the local
database on port 54329.

The original source archive omitted its image files. Replacement stock photos
are included in `public/images`, using the existing filenames so seeded content
works without resetting the database. These are representative photos, not
photographs of actual Purpose Course participants or faculty. See
[image sources](public/images/README.md) for credits and replacement details.

### Original development commands
```bash
npx drizzle-kit push      # apply schema
npx tsx src/db/seed.ts    # reset + seed demo content (15 articles, 15 sessions, community, subscribers)
npm run dev               # local development
npm run build && npm start
```

## Roadmap encoded in the architecture
1. **Publishing** (this release) — audience, authority, editorial rigour.
2. **Academy** — enrolments, lesson completion, quizzes, certificates (tables and waitlist already present).
3. **Learning community** — live classes, mentorships, collaborative work, analytics; real-time discussions and
   in-app notifications are already live as the first slice.
