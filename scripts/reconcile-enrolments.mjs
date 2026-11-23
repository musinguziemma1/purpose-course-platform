import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import pg from "pg";
import { databaseConfig } from "./database-config.mjs";
import { operatorEnvironment } from "./operator-environment.mjs";
import { encryptBuffer } from "./backup-crypto.mjs";

export async function reconcileEnrolments(client, { apply = false, backupDirectory = ".local/backups", onlyIds, encryptionKey } = {}) {
  await client.query(apply ? "begin isolation level serializable" : "begin isolation level repeatable read read only");
  try {
    if (apply) await client.query("select pg_advisory_xact_lock(725104, 6)");
    const rows = (await client.query(`select e.*,u.email as account_email,u.is_active,r.slug as account_role,
      exists(select 1 from enrollments other where other.id<>e.id and lower(other.email)=lower(u.email) and other.level_id=e.level_id) as email_conflict
      from enrollments e left join profiles p on p.id=e.profile_id left join users u on u.id=p.user_id left join roles r on r.id=p.role_id
      where e.status='enrolled' ${onlyIds ? "and e.id=any($1::uuid[])" : ""} order by e.id ${apply ? "for update of e" : ""}`, onlyIds ? [onlyIds] : [])).rows;
    const plan = rows.map(row => ({ row,
      pause: !row.profile_id || !row.level_id || !row.is_active || row.account_role !== "student" || row.email_conflict,
      email: row.account_email && !row.email_conflict && row.email !== row.account_email ? row.account_email : null,
    })).filter(change => change.pause || change.email);
    const membershipRows = (await client.query(`select cm.*,c.level_id,
      (select e.status::text from enrollments e where e.profile_id=cm.profile_id and e.level_id=c.level_id order by e.updated_at desc,e.id limit 1) as enrolment_status
      from cohort_members cm join cohorts c on c.id=cm.cohort_id
      where cm.role='learner' and cm.status='active'
      and not exists(select 1 from enrollments e where e.profile_id=cm.profile_id and e.level_id=c.level_id and e.status='enrolled')
      ${onlyIds ? "and exists(select 1 from enrollments selected where selected.id=any($1::uuid[]) and selected.profile_id=cm.profile_id)" : ""}
      order by cm.id ${apply ? "for update of cm" : ""}`, onlyIds ? [onlyIds] : [])).rows;
    const membershipPlan = membershipRows.map(row => ({
      row,
      status: row.enrolment_status === "paused" ? "paused" : "removed",
    }));
    const summary = {
      mode: apply ? "apply" : "plan",
      inspected: rows.length,
      pause: plan.filter(x => x.pause).length,
      canonicalEmail: plan.filter(x => x.email).length,
      manualReview: plan.filter(x => x.row.email_conflict).length,
      cohortMemberships: membershipPlan.length,
      cohortPaused: membershipPlan.filter(x => x.status === "paused").length,
      cohortRemoved: membershipPlan.filter(x => x.status === "removed").length,
    };
    if (apply && (plan.length || membershipPlan.length)) {
      mkdirSync(backupDirectory, { recursive: true });
      const memberships = (await client.query(
        "select * from cohort_members where id=any($1::int[]) or profile_id=any($2::uuid[])",
        [
          membershipPlan.map(change => change.row.id),
          plan.map(change => change.row.profile_id).filter(Boolean),
        ],
      )).rows;
      const snapshot = JSON.stringify({ createdAt: new Date().toISOString(), enrolments: plan.map(x => x.row), memberships });
      const key = encryptionKey ?? readFileSync(".local/credentials/recovery-backup.key");
      encryptBuffer(Buffer.from(JSON.stringify({ sha256: createHash("sha256").update(snapshot).digest("hex"), snapshot })), key, resolve(backupDirectory, `enrolments-before-reconciliation-${Date.now()}.enc`));
      for (const change of plan) {
        await client.query("update enrollments set status=case when $2 then 'paused'::enrollment_status else status end,email=coalesce($3,email),updated_at=now() where id=$1", [change.row.id, change.pause, change.email]);
        if (change.pause && change.row.profile_id) await client.query("update cohort_members cm set status='paused' where cm.profile_id=$1 and cm.role='learner' and cm.status='active' and exists(select 1 from cohorts c where c.id=cm.cohort_id and (c.level_id=$2 or c.id=$3))", [change.row.profile_id, change.row.level_id, change.row.cohort_id]);
        await client.query("insert into activity_logs(action,entity_type,entity_id,description) values('enrolment.reconciled','enrollment',$1,$2)", [change.row.id, change.pause ? "Paused an invalid active placement; learning records preserved for staff review." : "Aligned enrolment email with its linked account."]);
      }
      for (const change of membershipPlan) {
        await client.query(
          "update cohort_members set status=$2 where id=$1",
          [change.row.id, change.status],
        );
        await client.query(
          "insert into activity_logs(action,entity_type,entity_id,description) values('cohort.membership_reconciled','cohort_member',$1,$2)",
          [
            String(change.row.id),
            change.status === "paused"
              ? "Paused a learner membership to match the level enrolment."
              : "Removed an active learner membership without an active level enrolment; learning history was preserved.",
          ],
        );
      }
    }
    await client.query(apply ? "commit" : "rollback");
    return summary;
  } catch (error) { await client.query("rollback"); throw error; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), value = name => args[args.indexOf(name) + 1];
  try {
    const mode = args[0] ?? "plan";
    if (!["plan", "apply"].includes(mode)) throw new Error("Use plan or apply.");
    const { env } = operatorEnvironment(args.includes("--env-file") ? value("--env-file") : ".env", args.includes("--project") ? value("--project") : undefined);
    const client = new pg.Client(databaseConfig(env)); await client.connect();
    try { console.log(JSON.stringify(await reconcileEnrolments(client, { apply: mode === "apply", encryptionKey: mode === "apply" && args.includes("--key-file") ? readFileSync(value("--key-file")) : undefined }), null, 2)); } finally { await client.end(); }
  } catch { console.error("Enrolment reconciliation failed. No uncommitted changes were retained. Check the target, database access and private backup directory."); process.exitCode = 1; }
}
