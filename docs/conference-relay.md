# Project-controlled conference relay

The platform's live classroom uses authenticated WebRTC signalling and room
authorization inside this application. Production audio, video and screen
sharing also need a TURN relay that is operated for this project. Supabase
stores room state and signals; it is not a media relay. Vercel Functions cannot
serve long-lived UDP/TCP TURN traffic.

Do not disable the production guard or add an external meeting URL. Doing so
would publish sessions that may fail for learners behind mobile, institutional
or carrier-grade NAT networks.

## Infrastructure requirements

Provision a small public Linux host under the project's control and assign a
dedicated DNS name such as `relay.example.org`. Install Coturn from the host's
maintained package repository and configure:

- authenticated long-term credentials and a realm matching the relay domain;
- TLS certificate and key owned by the TURN service account;
- UDP and TCP listeners on 3478, plus TLS/TCP on 5349;
- a deliberately small UDP relay range, for example 49160-49200, opened in the
  host and provider firewalls;
- the public/private address mapping when the host itself is behind NAT;
- `fingerprint`, stale nonces, no anonymous access, no CLI listener and no
  multicast peer access;
- monitoring, security updates and log retention appropriate to production.

Create a dedicated strong username and password for this application. Keep the
credential in the deployment platform's encrypted environment settings, never
in Git, screenshots, client-side variables or `NEXT_PUBLIC_*` values.

## Application settings

Set these server-only production variables and redeploy the application:

```text
CONFERENCE_ENABLED=true
TURN_URL=turn:relay.example.org:3478?transport=udp,turn:relay.example.org:3478?transport=tcp,turns:relay.example.org:5349?transport=tcp
TURN_USERNAME=<deployment secret>
TURN_CREDENTIAL=<deployment secret>
CONFERENCE_MAX_SEATS=8
```

The scheduler becomes available only when all three TURN settings pass server
validation. The browser receives the ICE configuration only after the signed-in
participant passes the event and cohort authorization checks.

## Acceptance test

Before opening a cohort, verify all of the following with test accounts:

1. `/admin/operations` reports **in-platform room available**.
2. An administrator schedules a private cohort session without an external URL.
3. The assigned host starts the session and an enrolled cohort learner joins.
4. Audio, video, chat, hand raise and screen sharing work between two different
   networks, including at least one mobile-data connection.
5. An unrelated learner and a signed-out browser cannot enter the room.
6. TCP/TLS fallback works from a network that blocks outbound UDP.
7. Ending the session closes further joins and preserves attendance/history.

Retain the relay host, DNS name, firewall evidence and test date in the private
operations record. Do not store its credential in that record.
