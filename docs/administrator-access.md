# Administrator access and recovery

The live platform uses the existing application login at `/login`, backed by
the Supabase database. The owner account has the `super_admin` role. A Supabase
dashboard login is a separate account and does not sign in to the application.

Initial owner credentials are generated locally and saved to the ignored file
`.local/credentials/super-admin.json`. They are never printed by the management
command or committed to GitHub. Sign in, open **Account & password** at `/account`,
and replace the generated password with one stored in your password manager.
The change requires the current password and signs out all existing sessions.

Recovery requires trusted server/database access; there is no unauthenticated
password-reset endpoint. With the verified runtime database configuration in
`.env.local`, run:

```powershell
npm run admin:manage -- check --email OWNER_EMAIL
npm run admin:manage -- reset-password --email OWNER_EMAIL
```

The reset command updates the existing Super Admin password, reactivates the
account if necessary, revokes its sessions, and writes replacement credentials
to the same ignored file. It does not send an email. Copy the new password into
your password manager and remove plaintext credential copies when no longer
needed. Identity backups created before changes are also private and ignored.

To provision a new installation once the database schema exists:

```powershell
npm run admin:manage -- provision --email OWNER_EMAIL --disable-seeded
```

Provisioning an existing active owner preserves its password. Existing accounts
with a different role are not silently promoted. `--disable-seeded` deactivates
the six example logins, replaces their password hashes and revokes their
sessions, while preserving their profiles, articles and learning history.

Administrative pages check permissions before loading data. Sidebar and mobile
links use the same route policy. Publishing access is based on publishing
permissions rather than numeric role seniority. Authors can only query their
own article drafts. Only a Super Admin can grant or alter Super Admin access;
role changes invalidate the affected account's sessions.

This release serves one organization. Provisioning additional organizations is
disabled until the platform has a reviewed organization-isolation model.
