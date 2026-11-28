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

Provision a small public Linux host under the project's control with a stable
public IPv4 address. Use the address directly or assign a DNS name such as
`relay.example.org`. Install Coturn from the host's maintained package
repository and configure:

- authenticated long-term credentials and a realm matching the relay hostname
  or public IP address;
- TLS certificate and key owned by the TURN service account;
- UDP and TCP listeners on 3478, plus TLS/TCP on 5349;
- a deliberately small UDP relay range, for example 49160-49200, opened in the
  host and provider firewalls;
- the public/private address mapping when the host itself is behind NAT;
- `fingerprint`, stale nonces, no anonymous access, no CLI listener and no
  multicast peer access;
- monitoring, security updates and log retention appropriate to production.

Prefer Coturn's REST-API mode (`use-auth-secret` with a `static-auth-secret`).
The application then signs a short-lived credential for each participant, so a
browser never sees a reusable relay password. Keep the shared secret in the
deployment platform's encrypted environment settings, never in Git,
screenshots, client-side variables or `NEXT_PUBLIC_*` values.

### Relay without a custom domain

For a connectivity check, set `realm` to the public IPv4 address and use that
address in the `turn:` UDP and TCP endpoints. For this initial check, set
`no-tls` and `no-dtls` in Coturn and omit the TLS listener and certificate
settings. Verify that Trickle ICE gathers a `relay` candidate.

Before opening live sessions to cohorts, enable the `turns:` endpoint and
test it on representative browsers and networks. For an IP-only deployment,
use a trusted certificate with the public IP address in its subject
alternative names. Let's Encrypt issues short-lived IP certificates. Automate
renewal and install the renewed certificate for Coturn with a deploy hook.
See [Let's Encrypt's Certbot instructions](https://letsencrypt.org/2026/03/11/shorter-certs-certbot).

### Example Coturn configuration (`/etc/turnserver.conf`)

```text
listening-port=3478
tls-listening-port=5349
realm=relay.example.org
use-auth-secret
static-auth-secret=<same value as TURN_SECRET>
cert=/etc/turnserver/fullchain.pem
pkey=/etc/turnserver/privkey.pem
min-port=49160
max-port=49200
external-ip=<public IPv4>            # use PUBLIC/PRIVATE if the host is behind NAT
fingerprint
stale-nonce=600
no-cli
no-multicast-peers
# Never relay into private or loopback networks
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=100.64.0.0-100.127.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
```

Generate the shared secret with `openssl rand -hex 32`. To test the relay before
configuring the application, create a one-hour credential on any machine:

```bash
SECRET='<shared secret>'
USERNAME="$(( $(date +%s) + 3600 )):relay-test"
PASSWORD="$(printf '%s' "$USERNAME" | openssl dgst -sha1 -hmac "$SECRET" -binary | base64)"
echo "$USERNAME"; echo "$PASSWORD"
```

Enter `turn:relay.example.org:3478` with that username and password in
<https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/> and
select **Gather candidates**: a `relay` candidate proves the relay works.

## Application settings

Set these server-only production variables and redeploy the application:

```text
CONFERENCE_ENABLED=true
TURN_URL=turn:relay.example.org:3478?transport=udp,turn:relay.example.org:3478?transport=tcp,turns:relay.example.org:5349?transport=tcp
TURN_SECRET=<deployment secret, at least 32 characters, equal to Coturn's static-auth-secret>
CONFERENCE_MAX_SEATS=8
# Optional: STUN for direct connections before relaying, e.g. the relay itself
STUN_URLS=stun:relay.example.org:3478
```

Existing relays configured with long-term static credentials still work with
`TURN_USERNAME` and `TURN_CREDENTIAL` instead of `TURN_SECRET`, but every
participant then receives the same reusable password. When `TURN_SECRET` is set
it takes precedence; a secret shorter than 32 characters disables rooms rather
than silently falling back.

Credentials issued from the secret follow the TURN REST convention: username
`<unix expiry>:<profile id>` and password `base64(HMAC-SHA1(secret, username))`,
valid for six hours. The browser receives the ICE configuration only after the
signed-in participant passes the event and cohort authorization checks.

## How the room behaves

- **Lobby.** Participants preview their camera and microphone, choose devices
  and see who is already inside before joining. Media is only sent after Join.
- **Mesh.** Up to `CONFERENCE_MAX_SEATS` (default 8) participants are on stage
  and connect directly to each other. Later arrivals join the audience and
  connect to the host only; the host can give them a seat.
- **Signalling.** Offers, answers and batched ICE candidates are stored in
  `conference_signals` and delivered in insertion order on each heartbeat.
  Heartbeats run every 0.7 s while a connection is negotiating and every 2.5 s
  once stable.
- **Recovery.** A connection that fails is ICE-restarted twice and then rebuilt.
  A participant whose heartbeat lapsed (for example a suspended laptop) rejoins
  automatically with the same peer id. Closing the tab sends a leave beacon so
  others see the departure within a heartbeat.
- **Host controls.** Mute one person or everyone, lower hands, give a seat, and
  remove a participant. A removed participant cannot rejoin until the session
  closes.
- **Diagnostics.** In a participant's browser console run
  `localStorage.setItem("purpose:room-debug", "1")` and reload the room to log
  connection, restart and signalling events.

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
