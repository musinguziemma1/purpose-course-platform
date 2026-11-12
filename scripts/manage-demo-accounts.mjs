import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import pg from "pg";
import { databaseConfig } from "./database-config.mjs";
import { hashPassword, initialPassword, verifyPassword } from "./password-security.mjs";

const definitions = [
  { role: "super_admin", name: "Demo Super Admin", path: "/admin" },
  { role: "mentor", name: "Demo Mentor", path: "/mentor" },
  { role: "student", name: "Demo Student", path: "/learn" },
];
const digest = (value) => createHash("sha256").update(value).digest("hex");
function settings(options = {}) {
  const prefix = options.prefix ?? "demo";
  if (!/^[a-z0-9-]{1,60}$/.test(prefix)) throw new Error("Invalid demo namespace.");
  return { prefix, credentialsFile: options.credentialsFile ?? ".local/credentials/demo-accounts.json", backupDirectory: options.backupDirectory ?? ".local/backups", target: options.target ?? "project-local" };
}
const accountsFor = (config) => definitions.map((item) => ({ ...item, email: `${config.prefix}.${item.role.replaceAll("_", "-")}@purposecourse.invalid`, slug: `${config.prefix}-${item.role.replaceAll("_", "-")}` }));

async function snapshot(client, config) {
  const tables = {};
  for (const table of ["users", "profiles", "auth_sessions", "org_memberships", "enrollments", "cohorts", "cohort_members", "mentor_assignments", "learner_goals", "coaching_sessions", "lesson_progress"]) tables[table] = (await client.query(`select coalesce(json_agg(row_to_json(t)),'[]'::json) as rows from public.${table} t`)).rows[0].rows;
  const data = JSON.stringify({ format: "purpose-demo-provision-backup-v1", target: config.target, createdAt: new Date().toISOString(), tables });
  mkdirSync(config.backupDirectory, { recursive: true });
  const path = resolve(config.backupDirectory, `before-demo-accounts-${Date.now()}.json`);
  writeFileSync(path, data, { mode: 0o600 }); writeFileSync(path + ".sha256", digest(data) + "\n", { mode: 0o600 });
  if (digest(readFileSync(path)) !== digest(data)) throw new Error("Demo backup verification failed.");
}

export async function checkDemoAccounts(client, options = {}) {
  const config = settings(options), definitions = accountsFor(config);
  const records = (await client.query("select u.id,u.email,u.is_active,u.is_demo_account,u.password_hash,p.id as profile_id,r.slug as role from users u join profiles p on p.user_id=u.id join roles r on r.id=p.role_id where u.email=any($1::text[])", [definitions.map((item) => item.email)])).rows;
  const credentials = existsSync(config.credentialsFile) ? JSON.parse(readFileSync(config.credentialsFile, "utf8")) : null;
  if (credentials && credentials.target !== config.target) throw new Error("Credential file belongs to a different database target.");
  return definitions.map((item) => {
    const record = records.find((row) => row.email === item.email), saved = credentials?.accounts.find((row) => row.email === item.email);
    return { role: item.role, email: item.email, active: Boolean(record?.is_active), markedDemo: Boolean(record?.is_demo_account), roleMatches: record?.role === item.role, passwordVerified: Boolean(saved && record && verifyPassword(saved.password, record.password_hash)), dashboard: item.path };
  });
}

export async function provisionDemoAccounts(client, options = {}) {
  const config = settings(options), definitions = accountsFor(config);
  let saved = existsSync(config.credentialsFile) ? JSON.parse(readFileSync(config.credentialsFile, "utf8")) : { target: config.target, accounts: [], status: "pending" };
  if (saved.target !== config.target) throw new Error("Credential file belongs to a different database target.");
  mkdirSync(dirname(config.credentialsFile), { recursive: true });
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,8530))", [config.prefix]);
    const org = (await client.query("select id from organizations where status='active' order by id limit 1")).rows[0];
    const existingCohort = (await client.query("select level_id from cohorts where slug=$1", [`${config.prefix}-review-cohort`])).rows[0];
    const course = (await client.query("select c.id,c.level_id,cl.name from courses c join course_levels cl on cl.id=c.level_id where c.status='published' and ($1::int is null or c.level_id=$1) and exists(select 1 from course_modules m join lessons l on l.module_id=m.id where m.course_id=c.id and l.status='published') order by cl.level_number,cl.sort_order,c.sort_order,c.id limit 1 for share of c,cl", [existingCohort?.level_id ?? null])).rows[0];
    if (!org || !course) throw new Error("An active organization and published course are required for dashboard review.");
    await snapshot(client, config);
    const identities = {};
    for (const definition of definitions) {
      const previous = (await client.query("select u.*,p.id as profile_id,r.slug as role from users u left join profiles p on p.user_id=u.id left join roles r on r.id=p.role_id where u.email=$1 for update of u", [definition.email])).rows[0];
      let credential = saved.accounts.find((item) => item.email === definition.email);
      if (previous && (!previous.is_demo_account || previous.role !== definition.role || !previous.profile_id)) throw new Error("A nonmatching account uses a reserved demo address; it was not changed.");
      if (previous && (!credential || !verifyPassword(credential.password, previous.password_hash))) throw new Error("Existing demo credentials have changed or are missing. They were not reset.");
      if (!previous) {
        if (!credential) { credential = { email: definition.email, password: initialPassword(), role: definition.role, name: definition.name, dashboard: definition.path }; saved.accounts.push(credential); }
        // Persist first so a lost database response never loses the password.
        writeFileSync(config.credentialsFile, JSON.stringify({ ...saved, status: "pending", signInPath: "/login" }, null, 2), { mode: 0o600 });
        const role = (await client.query("select id from roles where slug=$1", [definition.role])).rows[0];
        if (!role) throw new Error("Required dashboard role is missing.");
        const user = (await client.query("insert into users(email,password_hash,is_demo_account) values($1,$2,true) returning id", [definition.email, hashPassword(credential.password)])).rows[0];
        const profile = (await client.query("insert into profiles(user_id,role_id,full_name,slug,title,organization_id) values($1,$2,$3,$4,$3,$5) returning id", [user.id, role.id, definition.name, definition.slug, org.id])).rows[0];
        identities[definition.role] = { userId: user.id, profileId: profile.id };
      } else {
        if (!previous.is_active) throw new Error("Demo accounts are disabled. Provision does not reactivate disabled credentials.");
        identities[definition.role] = { userId: previous.id, profileId: previous.profile_id };
      }
      await client.query("insert into org_memberships(organization_id,profile_id,role_slug,status)values($1,$2,$3,'active')on conflict(organization_id,profile_id)do nothing", [org.id, identities[definition.role].profileId, definition.role]);
    }
    const student = identities.student.profileId, mentor = identities.mentor.profileId, admin = identities.super_admin.profileId;
    const cohortSlug = `${config.prefix}-review-cohort`;
    let cohort = (await client.query("select id from cohorts where slug=$1", [cohortSlug])).rows[0];
    if (!cohort) cohort = (await client.query("insert into cohorts(slug,name,level_id,description,status,starts_at,ends_at,capacity,cadence)values($1,'Demo review cohort',$2,'Practice records for dashboard exploration. No real class booking.','active',now()-interval '1 day',now()+interval '35 days',3,'Self-paced dashboard review')returning id", [cohortSlug, course.level_id])).rows[0];
    for (const [profile, role] of [[student, "learner"], [mentor, "facilitator"]]) await client.query("insert into cohort_members(cohort_id,profile_id,role)values($1,$2,$3)on conflict(cohort_id,profile_id)do nothing", [cohort.id, profile, role]);
    await client.query("insert into enrollments(profile_id,email,full_name,level_id,cohort,status)values($1,$2,'Demo Student',$3,'Demo review cohort','enrolled')on conflict(email,level_id)do nothing", [student, definitions.find((item) => item.role === "student").email, course.level_id]);
    await client.query("insert into mentor_assignments(mentor_id,student_id,assigned_by_id,focus)values($1,$2,$3,'Practice coaching and learner progress review')on conflict(mentor_id,student_id)do nothing", [mentor, student, admin]);
    if (!(await client.query("select id from learner_goals where student_id=$1", [student])).rowCount) await client.query("insert into learner_goals(student_id,mentor_id,title,description)values($1,$2,'Demo: build a weekly learning habit','Practice updating this goal while exploring your dashboard.')", [student, mentor]);
    await client.query("insert into activity_logs(actor_id,action,entity_type,description)values($1,'security.demo_accounts_verified','demo_accounts','Provisioned or verified three password-protected demo accounts and practice enrolment.')", [admin]);
    const checked = await checkDemoAccounts(client, config);
    if (!checked.every((item) => item.active && item.markedDemo && item.roleMatches && item.passwordVerified)) throw new Error("Demo credential verification failed.");
    await client.query("commit");
    saved = { ...saved, status: "active", verifiedAt: new Date().toISOString(), signInPath: "/login" };
    writeFileSync(config.credentialsFile, JSON.stringify(saved, null, 2), { mode: 0o600 });
    return { accounts: checked, credentialsFile: config.credentialsFile };
  } catch (error) { await client.query("rollback"); throw error; }
}

export async function disableDemoAccounts(client, options = {}) {
  const config = settings(options), emails = accountsFor(config).map((item) => item.email);
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,8530))", [config.prefix]);
    await snapshot(client, config);
    await client.query("delete from auth_sessions where user_id in(select id from users where email=any($1::text[]) and is_demo_account)", [emails]);
    await client.query("update users set is_active=false where email=any($1::text[]) and is_demo_account", [emails]);
    await client.query("commit");
    if (existsSync(config.credentialsFile)) { const saved = JSON.parse(readFileSync(config.credentialsFile)); if (saved.target === config.target) writeFileSync(config.credentialsFile, JSON.stringify({ ...saved, status: "disabled" }, null, 2), { mode: 0o600 }); }
    return { disabled: true };
  } catch (error) { await client.query("rollback"); throw error; }
}

async function main() {
  const action = process.argv[2] ?? "check";
  if (!["check", "provision", "disable"].includes(action)) throw new Error("Use check, provision or disable.");
  await import("./load-env.mjs");
  const url = new URL(process.env.DATABASE_URL), target = digest([url.hostname, url.port, url.pathname, decodeURIComponent(url.username).split(".").at(-1)].join("|"));
  const client = new pg.Client(databaseConfig()); await client.connect();
  try {
    const result = action === "provision" ? await provisionDemoAccounts(client, { target }) : action === "disable" ? await disableDemoAccounts(client, { target }) : await checkDemoAccounts(client, { target });
    console.log(JSON.stringify(result));
  } finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { console.error(error.code ? `Demo operation failed (${error.code}); no credentials logged.` : error.message); process.exitCode = 1; });
