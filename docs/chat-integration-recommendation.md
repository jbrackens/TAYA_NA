# Chat Integration Technical Recommendation

## Status

Recommendation: keep Rocket.Chat as the preferred v1 candidate, but treat it as
a blocking feasibility spike before product launch. The implementation in this
repo is fail-closed: chat remains disabled unless `CHAT_ENABLED=true`,
`NEXT_PUBLIC_FEATURE_CHAT=true`, a same-site chat origin, and Rocket.Chat admin
credentials are explicitly configured.

Launch runbook: see `docs/chat-launch-runbook.md`.
Launch evidence gate: see `docs/chat-launch-evidence.md`.
Staging env template: see `docs/chat-staging-env.example`.

Local spike result: Docker Compose successfully booted Rocket.Chat `8.4.2` at
`http://localhost:3002`, and `/api/info` returned successfully. The first boot
with MongoDB 7.0 produced a Rocket.Chat warning that MongoDB versions below 8.0
will lose support in Rocket.Chat 9, so the spike profile now uses MongoDB 8.0.
`services/codex-prep/scripts/chat-spike-validate.sh` also verified first-admin
REST login, `#global` provisioning, `FileUpload_Enabled=false`, and
`Accounts_iframe_enabled=true` on the local spike.
The validator now also blocks cross-origin launch if Rocket.Chat serves
`X-Frame-Options: sameorigin`; production must resolve that with Rocket.Chat
settings or, preferably, an edge policy that removes legacy XFO and sets a
tight `frame-ancestors` CSP for the Hula app origin.
An in-browser localhost iframe probe loaded the Rocket.Chat login screen
successfully after the local spike set `Iframe_X_Frame_Options=ALLOW-FROM
http://localhost:3000`. Because `ALLOW-FROM` is legacy and ignored by modern
Chromium rather than a strong allowlist, production should not rely on it as the
only embedding control.

## Codebase Findings

- Frontend: the active player surface is the Next.js App Router app at
  `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app`, running Next
  16 and React 19. The older React 17 branded app remains in the repo but is
  not the first v1 target.
- Shell: the prediction app uses a top nav and centered `main` content. Chat is
  implemented as a right-side leaf overlay so a provider outage cannot block
  market, wallet, or trade actions.
- Auth: the web app restores sessions through HttpOnly cookies plus a readable
  CSRF cookie. The gateway validates bearer JWTs and exposes user claims to
  protected handlers.
- Backend: Go services already include `phoenix-user`, `phoenix-social`,
  `phoenix-realtime`, `phoenix-audit`, and Redis-backed gateway rate limiting.
  The realtime service is market/wallet fanout, not chat.
- Deployment: local infrastructure is Docker Compose with Postgres, Redis, and
  Kafka. A `chat-spike` Compose profile adds Rocket.Chat and MongoDB only for
  feasibility testing.

## Option A: Rocket.Chat

Pros:

- Fastest path to mature room and moderator operations.
- Official docs describe iframe SSO with `resumeToken` and REST API login.
- Official docs expose iframe postMessage settings for parent/child origin
  control.
- REST APIs support user create/update/login workflows.

Cons and launch blockers:

- Edition/licensing must be confirmed against the exact Rocket.Chat version and
  deployment plan before enabling chat.
- Rocket.Chat adds MongoDB, its own websocket footprint, and its own
  operational runbook.
- Iframe auth is sensitive to third-party cookie behavior; production must use
  a same-site subdomain such as `chat.hulana.com`.
- Rocket.Chat REST login returns a provider auth token. Phase 0 must confirm
  whether token lifetime, password rotation, logout, and user deactivation meet
  Hula's short-lived session and revocation requirements before public launch.
- Chat report writes are durable Hula-owned `audit_log` rows when the gateway
  has `DATABASE_URL`; launch must verify the rows are visible in Talon/admin
  audit views with `product=prediction`.

Integration notes:

- Gateway endpoints:
  - `GET /api/v1/chat/rooms/resolve`
  - `POST /api/v1/chat/session`
  - `POST /api/v1/chat/report`
  - `POST /api/v1/chat/users/{userID}/deactivate` for admin/user-lifecycle
    flows that need synchronous provider-side chat deactivation.
- Blocked Hula users (`suspended`, `deactivated`, `disabled`, `inactive`,
  `banned`, or `closed`) are denied new chat sessions and the gateway attempts
  to deactivate the matching Rocket.Chat account when it exists.
- Required server env:
  - `DATABASE_URL`
  - `CHAT_ENABLED`
  - `CHAT_PROVIDER=rocketchat`
  - `CHAT_PUBLIC_URL`
  - `CHAT_INTERNAL_URL`
  - `CHAT_DEFAULT_ROOM=global`
  - `ROCKETCHAT_ADMIN_USER_ID`
  - `ROCKETCHAT_ADMIN_AUTH_TOKEN`
- Required frontend env:
  - `NEXT_PUBLIC_FEATURE_CHAT`
  - `NEXT_PUBLIC_CHAT_PUBLIC_URL`

## Option B: Converse.js + XMPP

Pros:

- More protocol-native and less tied to a collaboration-suite product.
- Stronger long-term customization potential.

Cons:

- Hula would own substantially more admin UX, abuse reporting, role sync,
  moderation workflow, retention, and room provisioning.
- XMPP operational expertise becomes a production dependency.
- V1 moderation readiness is weaker than Rocket.Chat unless scope expands.

## Recommendation

Chosen path: Rocket.Chat iframe integration for the feasibility spike and v1
global chat, provided the spike passes.

Reason: prediction-market chat needs moderation before customization. Rocket.Chat
is the fastest candidate to a moderated MVP, but only if iframe/session behavior
and edition/licensing are acceptable.

Implementation plan:

1. Run the `chat-spike` Compose profile and configure Rocket.Chat manually.
2. Confirm iframe embedding, REST login, `resumeToken`, cookie behavior, and
   same-site subdomain assumptions in Chrome.
3. Configure Rocket.Chat admin API credentials in the gateway and enable
   `CHAT_ENABLED=true`.
4. Enable the frontend with `NEXT_PUBLIC_FEATURE_CHAT=true` and
   `NEXT_PUBLIC_CHAT_PUBLIC_URL`.
5. Launch v1 with global chat only. Do not launch market rooms until compliance
   signs off on content policy, room lifecycle, and manipulation risk.

Fallback plan:

- If Rocket.Chat fails the spike, pause product UI rollout and re-evaluate paid
  Rocket.Chat, Rocket.Chat Livechat, or a thin custom chat service using the
  existing Kafka/WebSocket stack.
- Do not switch to Converse.js/ejabberd without explicitly budgeting admin UX,
  moderation tooling, and XMPP operations.

## Moderation and Compliance Launch Blockers

- Disable file uploads, link previews, and rich content in Rocket.Chat admin.
- Confirm moderator mute, ban, delete, and report workflows.
- Verify `POST /api/v1/chat/report` writes `prediction.chat.reported` rows to
  `audit_log` and that moderators can retrieve them.
- Define message retention, export, and deletion workflows across Rocket.Chat
  MongoDB and Hula data systems.
- Document provider outage rollback: turn off `CHAT_ENABLED` and
  `NEXT_PUBLIC_FEATURE_CHAT`.

## References

- Rocket.Chat iframe SSO:
  https://docs.rocket.chat/docs/iframe-based-single-sign-on
- Rocket.Chat iframe settings:
  https://docs.rocket.chat/docs/general
- Rocket.Chat user API:
  https://developer.rocket.chat/apidocs/users-api
- Rocket.Chat Docker Compose deployment:
  https://docs.rocket.chat/docs/deploy-with-docker-docker-compose
