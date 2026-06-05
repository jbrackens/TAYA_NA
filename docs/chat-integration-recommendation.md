# Chat Integration Technical Recommendation

## Status

Recommendation: keep Rocket.Chat as the preferred v1 candidate, but treat it as
a blocking feasibility spike before product launch. The implementation in this
repo is fail-closed: chat remains disabled unless `CHAT_ENABLED=true`,
`NEXT_PUBLIC_FEATURE_CHAT=true`, a same-site chat origin, and Rocket.Chat admin
credentials are explicitly configured.
The v1 product rule is public read and authenticated write: any visitor can
watch the global conversation in real time, while the signed-out composer is
disabled and displays `Login to chat`.

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
tight `frame-ancestors` CSP for the Tiangge app origin.
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
- Shell: the prediction app uses a top nav and centered market content inside a
  persistent app shell. Chat is implemented as a left-side sticky leaf panel on
  desktop so it feels like product UI while still keeping provider failures from
  blocking market, wallet, or trade actions.
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
  a same-site subdomain such as `chat.tiangge.com`.
- Rocket.Chat REST login returns a provider auth token. Phase 0 must confirm
  whether token lifetime, password rotation, logout, and user deactivation meet
  Tiangge's short-lived session and revocation requirements before public launch.
- Chat report writes are durable Tiangge-owned `audit_log` rows when the gateway
  has `DATABASE_URL`; launch must verify the rows are visible in Talon/admin
  audit views with `product=prediction`.

Integration notes:

- Gateway endpoints:
  - `GET /api/v1/chat/rooms/resolve`
  - `POST /api/v1/chat/session`
  - `POST /api/v1/chat/report`
  - `POST /api/v1/chat/users/{userID}/deactivate` for admin/user-lifecycle
    flows that need synchronous provider-side chat deactivation.
- Blocked Tiangge users (`suspended`, `deactivated`, `disabled`, `inactive`,
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
- Required provider public-read posture:
  - `Accounts_AllowAnonymousRead=true`
  - `Accounts_AllowAnonymousWrite=false`
  - Signed-out users use the public room URL only; Tiangge-owned session tokens are
    issued only to authenticated, unrestricted users.

## Option B: Converse.js + XMPP

Pros:

- More protocol-native and less tied to a collaboration-suite product.
- Stronger long-term customization potential.

Cons:

- Tiangge would own substantially more admin UX, abuse reporting, role sync,
  moderation workflow, retention, and room provisioning.
- XMPP operational expertise becomes a production dependency.
- V1 moderation readiness is weaker than Rocket.Chat unless scope expands.

## Duel-Style Chat Architecture Requirement

Tiangge community chat should follow the persistent left-side community chat
pattern common in Duel-style sportsbook/casino interfaces, adapted to a
prediction market surface. The chat should live in the application shell beside
markets, portfolio, account, and wallet controls rather than as a support
widget or standalone page.

Desktop layout:

- Mount chat at the app-shell level, before the primary prediction-market
  content area.
- Use a predictable sidebar width of roughly 320px, with a compact collapsed
  rail allowed when the user hides chat.
- Keep the panel sticky or fixed for the current viewport so it remains
  available across route transitions.
- Do not allow chat to cover order entry, wallet controls, market resolution
  information, or confirmation actions.

Mobile layout:

- Do not reserve permanent horizontal space for chat.
- Use a mobile action, slide-over drawer, bottom-nav entry, or market-page tab.
- For v1, opening the approved chat origin externally is acceptable until the
  embedded mobile UX is explicitly designed and QA'd.

Realtime and storage expectations:

- V1 should use provider-managed realtime transport, fan-out, durable history,
  presence, rate limits, and moderation controls where possible.
- Rocket.Chat satisfies this through its realtime and room infrastructure if
  the launch spike confirms edition, iframe, auth, and moderation behavior.
- Converse.js/XMPP can satisfy realtime and presence through XMPP MUC, but Tiangge
  would likely own more role sync, report UX, admin tooling, and audit workflow.
- A custom WebSocket/Postgres/Redis/queue stack remains a fallback only after
  Rocket.Chat and Converse.js/XMPP are shown to be unsuitable.

Message metadata mapping:

```json
{
  "messageId": "...",
  "userId": "...",
  "username": "player123",
  "rank": "regular",
  "avatar": "...",
  "message": "...",
  "createdAt": "...",
  "room": "global"
}
```

Tiangge rank should map from existing user/account state where available:

- `regular`: authenticated user without elevated status.
- `verified`: future KYC/profile verification mapping when exposed to the
  prediction app.
- `market_creator`: future creator identity when market creation is user-owned.
- `moderator`: Tiangge moderator role synced to the provider.
- `admin`: Tiangge admin role synced to the provider.
- `vip` or community tier: future loyalty, token, NFT, or community role.

Moderation baseline:

- Chat identity must come from Tiangge auth, not provider self-registration.
- Visitors can read public global chat before login, but the message composer
  must be disabled and display `Login to chat`.
- Suspended, banned, muted, deactivated, disabled, inactive, or closed Tiangge
  users must not be able to create new chat sessions.
- Required workflows are client-side validation, server-side profanity/spam
  filtering hooks, rate limits, mute, ban, moderator roles, message deletion,
  reporting, and Tiangge-owned audit records.
- Moderation policy must account for spam, phishing and wallet-drainer links,
  market manipulation attempts, coordinated brigading, harassment, illegal
  content, active-market misinformation, and abuse of creators or moderators.

Provider fit against Duel-style requirements:

| Requirement | Rocket.Chat | Converse.js/XMPP |
| --- | --- | --- |
| Persistent sidebar embed | Strong via iframe if CSP/cookie behavior passes | Strong client embed, more UI customization work |
| App-shell integration | Strong as isolated iframe leaf panel | Strong as embedded JS client |
| WebSocket/realtime support | Built-in realtime infrastructure | XMPP BOSH/WebSocket depending server config |
| Tiangge auth mapping | REST user sync plus iframe/session handoff | Custom auth bridge and XMPP account sync |
| Message metadata mapping | User custom fields/roles can map rank/badges | XMPP vCard/roles/plugins likely needed |
| Global room support | Native channels | Native MUC |
| Market-specific room support | Native channels plus provisioning API | MUC rooms plus custom provisioning |
| Moderator roles | Mature built-in roles | Server/MUC roles; less turnkey admin UX |
| Mute/ban controls | Built-in | Available through MUC/admin controls, varies by server |
| Message deletion | Built-in | Supported with MAM/moderation extensions, varies |
| Rate limits | Built-in settings plus gateway limits | Server modules plus gateway limits |
| Profanity/spam filtering hooks | Provider apps/settings plus gateway/reporting hooks | Server modules/plugins/custom hooks |
| Durable message history | MongoDB-backed provider history | MAM archive with Prosody/ejabberd storage |
| Audit logs | Provider audit plus Tiangge report audit; gaps must be documented | More custom audit work likely |
| Presence | Built-in | Protocol-native |
| Redis/pub-sub or equivalent fan-out | Provider-managed realtime fan-out | XMPP server-managed fan-out |
| Admin tooling | Strongest v1 fit | More operational/admin build-out |
| Mobile adaptation | External or iframe/drawer after QA | Embedded/drawer possible with custom styling |
| Operational complexity | MongoDB plus Rocket.Chat operations | XMPP server operations and custom admin UX |

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
5. Configure Rocket.Chat for anonymous read and no anonymous writes, then verify
   signed-out users can read `#global` without receiving provider credentials.
6. Launch v1 with global chat only. Do not launch market rooms until compliance
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
  MongoDB and Tiangge data systems.
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
