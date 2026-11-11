# Invitations and Resend email

Staff can invite new people from **Admin → People**, review recent invitations,
and revoke pending links. Invitations expire after 48 hours. Creating a new
invitation for an address revokes its previous pending link. Existing accounts
use the administrator recovery procedure; an invitation cannot reset their
password or reactivate a disabled account.

The recipient sets a password of 15–128 characters. Activation creates credentials,
the assigned profile, organization membership, audit record, and token consumption
in one transaction. It does not grant course enrollment. The inviter's current
permissions are checked during creation and redemption; only a Super Admin can
invite another Super Admin. No email contains a password.

## Configure the provider

1. Verify a domain you control in Resend and complete its DNS records. A Gmail
   address can receive invitations but cannot be your verified sending domain.
2. Create a **Sending access** API key restricted to that domain.
3. Run `npm run email:prepare`. It generates missing encryption and worker
   secrets in ignored `.env.local`, preserving existing values. It prints names
   of missing settings, never their values.
4. Set these secrets in `.env.local` and the production hosting environment:

   | Variable | Value |
   | --- | --- |
   | `RESEND_API_KEY` | Domain-restricted Sending access key |
   | `RESEND_FROM_EMAIL` | `Purpose Course <accounts@your-verified-domain>` |
   | `APP_URL` | Canonical HTTPS origin, without a path/query/fragment |
   | `EMAIL_OUTBOX_ENCRYPTION_KEY` | Generated base64 32-byte key; preserve across deployments |
   | `CRON_SECRET` | Generated worker bearer secret, at least 32 characters |
   | `RESEND_WEBHOOK_SECRET` | Signing secret from the Resend webhook endpoint |

5. Create a Resend webhook for `https://YOUR_DOMAIN/api/webhooks/resend`. Subscribe
   to `email.sent`, `email.delivered`, `email.bounced`, `email.complained`,
   `email.failed`, `email.suppressed`, and `email.delivery_delayed`. Open/click
   events are supported if tracking is enabled. The endpoint verifies the raw
   body signature and timestamp before persisting anything.
6. Configure a scheduler to POST `/api/jobs/email` once per minute with
   `Authorization: Bearer YOUR_CRON_SECRET`. Each invocation processes at most
   three due emails, with a 12-second request timeout. Scale frequency to observed
   volume and provider limits. POST is required; ordinary page visits do not send
   email. Staff with notification permission can also dispatch due messages from
   **Admin → Notifications**.

Do not put secrets in chat, Git, client variables, scheduler URLs, or screenshots.
Back up the encryption key in your hosting secret manager: replacing it prevents
decryption of pending messages. Configuration alone does not prove domain
verification, production scheduling, or real delivery. Complete an authorized
test invitation and confirm the delivery callback before launch.

## Queue behavior and recovery

The worker claims due email with a database lock and a two-minute lease, then
releases the transaction before calling Resend. Retries use the same encrypted
request and the same `purpose-outbox/ID` idempotency key, including the original
sender, recipient, subject and body. Queued account notifications recheck current
email preferences and active status. Unsupported push messages remain unsent.

`accepted` means Resend accepted the request. Only a signed `email.delivered`
callback establishes `delivered`; it means acceptance by the recipient's mail
server, not that a person read it. Bounces, complaints and failures are recorded
separately. Duplicate callbacks do not duplicate history. Early callbacks are
reconciled when the provider receipt is persisted; delayed callbacks cannot
overwrite a terminal failure with an earlier acceptance claim.

Transient transport/429/5xx errors back off, at most eight attempts. Uncertain
delivery stops after 23 hours because Resend retains idempotency keys for only
24 hours. `needs_review` messages require reconciliation in the Resend dashboard;
there is no button to blindly reset them or claim delivery. Permanent HTTP errors
are `failed`, with no sent timestamp. Existing manually dispatched/demo records
are labeled unverified by the migration.

For a failed invitation, fix configuration and create a new invitation from
People. Its old token is invalidated. Already in-flight email cannot be recalled;
revoked links cannot activate accounts. General operational email failures need
provider reconciliation before a deliberate replacement message. A database
restore must preserve/reconcile provider receipts and the idempotency window
before restarting the scheduler.

Activation tokens are random 256-bit values. The invitation table stores only
their SHA-256 hashes. The provider request containing the link is protected with
AES-256-GCM; token-bearing plaintext is absent from the outbox body, audit and
staff UI. The link uses a URL fragment so the token is excluded from HTTP access
logs and referrers. The page removes it from browser history after reading it.

## Verification

`node --import tsx --test tests/email-invitations.test.mjs` exercises local
PostgreSQL with fake provider responses and signed callback fixtures. It never
sends email. Coverage includes concurrent activation/dispatch, permission
withdrawal, replacement/revocation/expiry, late-failure rollback, retry stability,
lease recovery, retry cutoff, recipient preferences, signature/timestamp failures,
duplicate/early/out-of-order callbacks, encryption integrity, and HTTP errors.

Provider references: [sending email](https://resend.com/docs/api-reference/emails/send-email),
[24-hour idempotency retention](https://resend.com/docs/dashboard/emails/idempotency-keys),
[webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests),
[event semantics](https://resend.com/docs/webhooks/event-types).
