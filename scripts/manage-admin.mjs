import "./load-env.mjs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { databaseConfig } from "./database-config.mjs";
import { hashPassword, initialPassword, verifyPassword } from "./password-security.mjs";

const [action = "check", ...args] = process.argv.slice(2);
const value = (key) => args[args.indexOf(key) + 1];
const email = (args.includes("--email") ? value("--email") ?? "" : "").trim().toLowerCase();
const credentialPath = ".local/credentials/super-admin.json";
const seedEmails = ["admin", "editor", "author", "writer", "mentor", "student"].map((name) => `${name}@purposecourse.org`);

async function main() {
  if (!["check", "provision", "reset-password"].includes(action)) throw new Error("Use check, provision --email ADDRESS, or reset-password --email ADDRESS.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Provide the owner's email with --email.");
  if (seedEmails.includes(email)) throw new Error("Use a real owner address rather than a seeded demo account.");
  const client = new pg.Client(databaseConfig());
  await client.connect();
  try {
    if (action === "check") {
      const result = await client.query("select u.is_active,r.slug as role from users u join profiles p on p.user_id=u.id join roles r on r.id=p.role_id where u.email=$1", [email]);
      const seeds = await client.query("select count(*)::int as active from users where email=any($1::text[]) and is_active", [seedEmails]);
      console.log(JSON.stringify({ owner_exists: result.rowCount === 1, owner_active: result.rows[0]?.is_active ?? false, role: result.rows[0]?.role ?? null, active_seeded_logins: seeds.rows[0].active }));
      return;
    }
    mkdirSync(".local/backups", { recursive: true });
    mkdirSync(".local/credentials", { recursive: true });
    await client.query("begin");
    try {
      await client.query("select pg_advisory_xact_lock(725104, 2)");
      const [owner] = (await client.query("select u.*,p.id as profile_id,r.slug as role from users u left join profiles p on p.user_id=u.id left join roles r on r.id=p.role_id where u.email=$1 for update of u", [email])).rows;
      if (owner && owner.role !== "super_admin") throw new Error("An existing non-owner account uses that address. Review its role before provisioning.");
      if (action === "reset-password" && !owner) throw new Error("Owner account does not exist; use provision first.");
      const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
      const backup = {};
      for (const table of ["users", "profiles", "auth_sessions", "org_memberships"]) {
        backup[table] = (await client.query(`select coalesce(json_agg(row_to_json(t)),'[]'::json)::text as rows from public.${table} t`)).rows[0].rows;
      }
      writeFileSync(`.local/backups/identity-before-hardening-${stamp}.json`, JSON.stringify({ createdAt: new Date().toISOString(), tables: backup }), { mode: 0o600 });
      let ownerId = owner?.id;
      let profileId = owner?.profile_id;
      let credentials;
      if (!owner || action === "reset-password") {
        const password = initialPassword();
        credentials = { email, password, createdAt: new Date().toISOString(), status: "pending", signInPath: "/login" };
        if (existsSync(credentialPath)) writeFileSync(`.local/backups/super-admin-credentials-${stamp}.json`, readFileSync(credentialPath), { mode: 0o600 });
        // Write before commit so a network interruption cannot lose the password.
        writeFileSync(credentialPath, JSON.stringify(credentials, null, 2), { mode: 0o600 });
        if (owner) {
          await client.query("update users set password_hash=$1,is_active=true where id=$2", [hashPassword(password), ownerId]);
          await client.query("delete from auth_sessions where user_id=$1", [ownerId]);
        } else {
          const role = (await client.query("select id from roles where slug='super_admin'")).rows[0];
          if (!role) throw new Error("Super Admin role is missing.");
          ownerId = (await client.query("insert into users(email,password_hash,is_active) values($1,$2,true) returning id", [email, hashPassword(password)])).rows[0].id;
          const organization = (await client.query("select id from organizations where status='active' order by id limit 1")).rows[0];
          profileId = (await client.query("insert into profiles(user_id,role_id,full_name,slug,title,organization_id) values($1,$2,$3,$4,'Super Admin',$5) returning id", [ownerId, role.id, "Platform Owner", `owner-${randomUUID().slice(0, 12)}`, organization?.id ?? null])).rows[0].id;
          if (organization) await client.query("insert into org_memberships(organization_id,profile_id,role_slug,status) values($1,$2,'super_admin','active') on conflict(organization_id,profile_id) do update set role_slug='super_admin',status='active'", [organization.id, profileId]);
        }
      } else if (!owner.is_active) {
        throw new Error("Owner account is inactive. Use reset-password to reactivate it and revoke its sessions.");
      }
      if (!profileId) throw new Error("Owner account has no profile.");
      if (args.includes("--disable-seeded")) {
        await client.query("delete from auth_sessions where user_id in (select id from users where email=any($1::text[]))", [seedEmails]);
        for (const seedEmail of seedEmails) {
          await client.query("update users set is_active=false,password_hash=$1 where email=$2", [hashPassword(initialPassword()), seedEmail]);
        }
      }
      const verified = (await client.query("select u.password_hash,u.is_active,r.slug from users u join profiles p on p.user_id=u.id join roles r on r.id=p.role_id where u.id=$1", [ownerId])).rows[0];
      if (!verified?.is_active || verified.slug !== "super_admin" || (credentials && !verifyPassword(credentials.password, verified.password_hash))) throw new Error("Owner verification failed.");
      await client.query("insert into activity_logs(actor_id,action,entity_type,entity_id,description) values($1,'security.owner_provisioned','user',$2,$3)", [profileId, ownerId, args.includes("--disable-seeded") ? "Verified the platform owner and disabled seeded logins." : "Verified the platform owner account."]);
      await client.query("commit");
      if (credentials) writeFileSync(credentialPath, JSON.stringify({ ...credentials, status: "active" }, null, 2), { mode: 0o600 });
      console.log(JSON.stringify({ owner_ready: true, existing_password_preserved: !credentials, seeded_logins_disabled: args.includes("--disable-seeded"), credentials_file: credentials ? credentialPath : null }));
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    }
  } finally { await client.end(); }
}

main().catch((error) => {
  console.error(error.code ? `Account operation failed (${error.code}). No credentials were logged.` : error.message);
  process.exitCode = 1;
});
