# Embedded Community Chat Launch Runbook

## Scope

V1 is global community chat only. Rocket.Chat is isolated behind the gateway
chat adapter and the Next.js app-shell chat leaf UI. Public visitors can read
the global conversation in real time, but posting requires a TapTrade session.
Market-specific rooms, embedded mobile chat, file uploads, rich previews, and
broad provider-swapping are out of scope for v1.

## Phase 0: Blocking Feasibility

Run the local spike stack:

```sh
docker compose --profile chat-spike \
  -f services/codex-prep/docker-compose.yml \
  up -d rocketchat rocketchat-mongo rocketchat-mongo-init
```

Expected local health check:

```sh
curl -fsS http://localhost:3002/api/info
```

Repeatable validation:

```sh
services/codex-prep/scripts/chat-spike-validate.sh
```

The validation script waits for Rocket.Chat, logs in using the configured
initial admin credentials, creates `#global` when needed, verifies the key
settings used by v1, and writes local gateway credentials to
`services/codex-prep/.env.chat-spike`. That file is ignored by git.

Local browser validation has confirmed that a normal localhost page can render
the Rocket.Chat iframe after the spike sets `Iframe_X_Frame_Options=ALLOW-FROM
http://localhost:3000`. Treat this as a local smoke test only: modern Chromium
does not provide strong origin allowlisting through `ALLOW-FROM`, so production
must enforce the embed allowlist at the edge with CSP `frame-ancestors`.

Production/staging origin validation:

```sh
CHAT_PUBLIC_URL=https://chat.staging.taptrade.com \
CHAT_PARENT_ORIGIN=https://staging.taptrade.com \
services/codex-prep/scripts/chat-origin-validate.sh
```

This must pass before public enablement. It requires a CSP header with
`frame-ancestors` that includes the TapTrade parent origin.

The local spike has been verified to boot Rocket.Chat `8.4.2`. The Compose
profile uses MongoDB 8.0 to avoid Rocket.Chat 9's planned removal of MongoDB
7.x support.

Required go/no-go checks:

- Confirm the exact Rocket.Chat version and edition allow iframe embedding,
  REST user administration, REST login, and the needed moderation controls
  without unacceptable paid-tier requirements.
- Confirm first-admin provisioning via `INITIAL_USER`, `ADMIN_USERNAME`,
  `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASS` remains supported for the
  selected Rocket.Chat image tag.
- Configure iframe embedding so the TapTrade app origin is allowed and no other
  origin is allowed.
- Confirm the Rocket.Chat response headers allow the TapTrade app origin to embed
  chat. The local validator fails when Rocket.Chat returns
  `X-Frame-Options: sameorigin` while `CHAT_PUBLIC_URL` and
  `CHAT_PARENT_ORIGIN` are different origins. Production should prefer an edge
  header policy that removes legacy `X-Frame-Options` for the chat app and adds
  a tight `Content-Security-Policy: frame-ancestors 'self' https://<taptrade-app-origin>`.
- Confirm a same-site deployment plan: production should use a subdomain such
  as `chat.taptrade.com`, not a third-party origin.
- Verify Chrome behavior with default cookie/privacy settings for the iframe
  and for the mobile external-chat flow.
- Verify REST login returns a usable user session token and define its lifetime,
  logout, password rotation, and deactivation behavior.
- Confirm admin credentials are only present in gateway server env, never in the
  browser bundle, browser network response, or application logs.
- Confirm the feature can be fully disabled with `CHAT_ENABLED=false` and
  `NEXT_PUBLIC_FEATURE_CHAT=false`.
- Confirm anonymous visitors can read `#global`, anonymous writes are disabled,
  and the signed-out TapTrade composer is greyed out with the exact text
  `Login to chat`.

Do not enable public chat until all Phase 0 checks pass.

Record evidence in `docs/chat-launch-evidence.md`. Use
`docs/chat-staging-env.example` as the staging/default env map.

Evidence gate:

```sh
services/codex-prep/scripts/chat-launch-gate-check.sh
```

This intentionally fails until the required launch evidence checkboxes are
complete. It requires sections 1-5 and rollback evidence. The optional post-v1
backlog can be included with `REQUIRE_OPTIONAL_POST_V1=true`.

## Phase 1: UI Shell

Implemented:

- Desktop Duel-style left-side sticky sidebar mounted in the app shell beside
  the main market content, with a compact collapsed rail.
- Open/collapsed state persisted in `localStorage`.
- Signed-out visitors load the public global room and see a disabled composer
  labeled `Login to chat`.
- Mobile shows an external "Chat" action instead of embedding the iframe.
- Provider load timeout and unavailable state.
- Chat is hidden unless `NEXT_PUBLIC_FEATURE_CHAT=true`.

QA checklist:

- Market pages remain usable with chat open and closed.
- Trade, wallet, and confirmation controls are not obscured on desktop.
- Chat remains available while navigating market listing, market detail,
  portfolio, account, and other app-shell routes.
- Mobile opens `${NEXT_PUBLIC_CHAT_PUBLIC_URL}/channel/global` in a new tab.
- Chat provider outage never blocks market rendering or actions.

## Phase 2: Provider Integration

Implemented gateway endpoints:

- `GET /api/v1/chat/rooms/resolve`
- `POST /api/v1/chat/session`
- `POST /api/v1/chat/report`
- `POST /api/v1/chat/users/{userID}/deactivate`

Server env:

- `DATABASE_URL`
- `CHAT_ENABLED`
- `CHAT_PROVIDER=rocketchat`
- `CHAT_PUBLIC_URL`
- `CHAT_INTERNAL_URL`
- `CHAT_DEFAULT_ROOM=global`
- `CHAT_IFRAME_PATH`
- `CHAT_SESSION_TOKEN_TTL`
- `CHAT_PARENT_ORIGIN`
- `CHAT_IFRAME_X_FRAME_OPTIONS`
- `ROCKETCHAT_ADMIN_USER_ID`
- `ROCKETCHAT_ADMIN_AUTH_TOKEN`

Frontend env:

- `NEXT_PUBLIC_FEATURE_CHAT`
- `NEXT_PUBLIC_CHAT_PUBLIC_URL`

Rocket.Chat public-read settings:

- `OVERWRITE_SETTING_Accounts_AllowAnonymousRead=true`
- `OVERWRITE_SETTING_Accounts_AllowAnonymousWrite=false`

Security checks:

- `POST /api/v1/chat/session` must reject unauthenticated users.
- Unauthenticated users must still be able to view the public global room
  through the configured public chat origin; they must not receive a TapTrade-owned
  provider session token.
- Suspended, deactivated, disabled, inactive, banned, or closed TapTrade users must
  be denied and the matching Rocket.Chat user must be deactivated when present.
- TapTrade suspension/deactivation flows should call
  `POST /api/v1/chat/users/{userID}/deactivate` synchronously as part of the
  account-status transition.
- Gateway rate limiting must apply to chat session/report endpoints.
- Admin tokens must never be returned to the browser.

## Phase 3: Moderation and Compliance

Rocket.Chat admin configuration required before launch:

- Provision `global`.
- Provision `announcements` only if read-only behavior is confirmed cleanly.
- Disable uploads, attachments, link previews, and high-risk rich content.
- Assign TapTrade `admin` and `moderator` mapped roles and verify delete, mute,
  ban, and pin capabilities.
- Configure room slow mode or rate limiting for launch.
- Confirm moderator actions are auditable in Rocket.Chat and document any gaps.

TapTrade-owned reporting:

- Authenticated users can submit reports from the chat sidebar.
- Reports write `prediction.chat.reported` rows into `audit_log` with
  `entity_type='prediction_chat_report'`.
- Compliance must verify reports are retrievable through the audit/admin tools.

Retention and deletion:

- Define Rocket.Chat MongoDB message retention before launch.
- Define export workflow for legal/compliance requests.
- Define deletion workflow across Rocket.Chat data and TapTrade audit records.

## Phase 4: Market-Specific Readiness

V1 intentionally resolves only `global`. Market-specific rooms are deferred.

Before v1.1:

- Complete legal/compliance review for content policy and market-manipulation
  risk.
- Define room lifecycle for created, paused, resolved, and archived markets.
- Add automated room provisioning and moderator assignment.
- Add category/market-level disable and read-only controls.

## Phase 5: QA and Rollback

Run:

```sh
go test ./...
yarn --cwd apps/taptrade-platform/frontend/packages/app typecheck:full
docker compose --profile chat-spike \
  -f services/codex-prep/docker-compose.yml \
  -f services/codex-prep/docker-compose.demo.yml \
  config
services/codex-prep/scripts/chat-launch-gate-check.sh
```

Manual QA:

- Signed-out user sees live public global chat and a greyed-out
  `Login to chat` composer; posting is unavailable.
- Signed-in user can establish a chat session without admin credential exposure.
- Suspended/deactivated user is denied and provider access is deactivated.
- Iframe timeout shows a non-blocking unavailable state.
- Chat report creates a durable TapTrade audit row.
- CSP allows only the configured chat origin for frame/connect traffic.

Rollback:

1. Set `CHAT_ENABLED=false`.
2. Set `NEXT_PUBLIC_FEATURE_CHAT=false`.
3. Redeploy gateway and frontend.
4. Keep Rocket.Chat running only if moderation/export work is needed; otherwise
   take it out of user-facing DNS.

Local spike cleanup:

```sh
docker compose --profile chat-spike \
  -f services/codex-prep/docker-compose.yml down
docker volume rm codex-prep_rocketchat_mongo_data
rm -f services/codex-prep/.env.chat-spike
```
