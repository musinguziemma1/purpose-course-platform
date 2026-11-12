# Password-protected dashboard demo accounts

The owner requested three accounts for prelaunch dashboard exploration on
12 November 2026. These are normal application logins for Super Admin, Mentor
and Student. They use Supabase PostgreSQL through the existing application
authentication; they are not Supabase Auth users or anonymous review identities.

Run `npm run demo:manage -- provision` against the intended runtime database.
The script creates unique random passwords and writes them only to the ignored
`.local/credentials/demo-accounts.json` file. It reports account identifiers,
role/hash verification and the credential-file path without printing passwords.
Keep the file private. Repeat runs preserve credentials and practice edits;
missing or changed credentials and reserved-address collisions cause an error,
never a silent password reset or takeover. The owner account is unchanged.

| Role | Login identifier | Dashboard |
| --- | --- | --- |
| Super Admin | `demo.super-admin@purposecourse.invalid` | `/admin` |
| Mentor | `demo.mentor@purposecourse.invalid` | `/mentor` |
| Student | `demo.student@purposecourse.invalid` | `/learn` |

Use `/login` and the password in the private file. These reserved-domain
identifiers are not deliverable mailboxes. Verification means the password
hash, account state, role and browser sign-in work; no email-ownership claim is
made. Public sign-up and anonymous production review remain disabled.

The Student receives an enrolled place in the first published level, membership
in a clearly labelled practice cohort, an active assignment to the Demo Mentor,
and a development goal. Content comes from the existing published curriculum.
No exam passes, assessment scores, progress or certificates are fabricated.
The three accounts join the launch organization. The Super Admin has its normal
full permissions, so use practice records for edits while reviewing navigation.

`users.is_demo_account` explicitly identifies these accounts. Normal learning
reports exclude demo learners. Demo staff reports include practice learners
instead, and dashboards display a demo banner. Mentor permissions still require
active learner assignments. Operational email to demo profiles is cancelled
before calling the provider. Their password-protected sessions follow the normal
authentication path; the separate local anonymous-review flag is unchanged.

`npm run demo:manage -- check` verifies roles, active states and locally retained
credentials without changing data. `npm run demo:manage -- disable` deactivates
these three logins and revokes all their sessions while preserving practice
records. Provision refuses to reactivate disabled accounts automatically.
Disable them before public launch. Disable does not alter the owner's login or
reenable any of the old publicly documented seed passwords.

Provision and disable each save a checksummed private backup before mutation.
Account creation, profiles, memberships, enrolment, cohort, mentoring assignment,
goal and audit record commit together. Credentials are saved before commit so
a lost database response cannot lose the password. A pending file after failure
is not evidence that an account exists; use the check command.

Local regressions cover preservation, collisions, transaction rollback, report
separation, disabled-state/session handling and outbound email suppression.
Browser checks exercise actual password sign-in, dashboard navigation, role
boundaries and logout. Credentials and verification artifacts are not committed.
