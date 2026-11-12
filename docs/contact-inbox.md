# Website contact inbox

Visitors submit `/contact`; authorized staff manage enquiries at
`/admin/contact`. The initial organization owns one shared inbox. Super Admin
and Platform Admin have `contact.manage`; other roles need an explicit grant.
Route checks run before loading data. Reads, status changes and replies also
recheck the actor's current role and active account in the database. Demo
identities cannot read or change enquiries.

Each submission has a UUID. Retries reuse that UUID; matching submissions from
the same client within ten minutes also collapse to one record. A transaction
stores the enquiry, generic staff notifications and a minimal audit record.
The subject, email and message are kept out of notification/audit descriptions.
Validation bounds input sizes; React renders enquiry and reply text escaped.

The server allows five new enquiries per client in a rolling hour, serialized
by a transaction advisory lock. A honeypot catches basic automated submissions.
`CONTACT_RATE_LIMIT_SECRET` (32+ random characters) hashes client addresses; it
falls back to `CRON_SECRET`. The database stores the HMAC, never the raw address.
Vercel's overwritten `x-forwarded-for` header supplies the address only when
`VERCEL=1`, following its [request-header documentation](https://vercel.com/docs/headers/request-headers#x-forwarded-for).
Local and other hosting environments share one rate bucket rather than trusting
arbitrary forwarded headers. A different host needs a reviewed trusted-proxy
implementation before launch. Platform request limits and bot protection remain
useful against traffic from many clients; this is a form-level control.

Staff can claim an enquiry and move it through New, In progress and Resolved.
Version checks reject stale status updates. Resolving a record indicates a
staff decision; it does not assert that email was delivered.

Replies use the [Resend outbox](email-delivery.md). A transaction stores the
reply, encrypted immutable provider request, ownership/status change and audit
record. Repeating the same reply UUID cannot queue a second message. Website
enquiries restrict replies to the submitted address. No provider request runs
inside this transaction. Missing Resend configuration disables reply queuing.
Queue processing and signed callbacks distinguish queued, accepted and delivered
states, and expose failures for staff follow-up. No automatic acknowledgement
email is sent on public submission.

The migration imports historical `messages.context_type='contact'` rows,
collapsing the former per-staff fanout by sender, subject, body and timestamp.
It preserves every original message. Imported email fields remain empty because
legacy addresses exist only in an unstructured footer; staff must confirm the
address before replying. Legacy contact messages are excluded from personal
message screens, and historic contact notifications are reduced to a generic
inbox link. The new tables have RLS, backend-only policies and no public API
grants. The backend's application checks enforce staff access.

Before public launch, configure the rate secret, Resend sender/API key,
application URL, encryption key, webhook and worker schedule. Agree an enquiry
retention period with the organization. Deleting an enquiry cascades its reply
history but retains the separate delivery records; any retention/erasure process
must address related outbox/events and preserved legacy messages explicitly.
Do not delete delivery records while a reply still references them.

Regression tests use temporary local PostgreSQL fixtures and fake email
transport. Browser verification covers anonymous submission, staff handling,
permission denial and reply history without contacting Resend.
