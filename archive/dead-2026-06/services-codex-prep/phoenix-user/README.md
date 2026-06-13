# Phoenix User Service

`phoenix-user` implements Phase 2 identity and account workflows for the Phoenix Platform.

## Current scope

Implemented against the prep migrations and service contracts with:

- public registration: `POST /api/v1/users`
- login: `POST /api/v1/auth/login`
- refresh: `POST /api/v1/auth/refresh`
- email verification: `POST /api/v1/auth/verify-email`
- current session: `GET /punters/current-session`
- admin session history:
  - `GET /admin/users/{userID}/session-history`
  - `GET /admin/punters/{userID}/session-history`
- admin lifecycle actions:
  - `POST /admin/users/{userID}/lifecycle/{action}`
  - `POST /admin/punters/{userID}/lifecycle/{action}`
  - supported actions: `suspend`, `unsuspend`, `logout`
- current profile read: `GET /profile/me`
- current profile update: `PUT /profile`
- current profile email update: `PUT /profile/email`
- profile preferences: `PUT /profile/preferences`
- KBA compatibility flow: `POST /registration/answer-kba-questions`
- IDPV compatibility flow: `POST /registration/start-idpv`, `POST /registration/check-idpv-status`
- admin verification sessions: `GET /admin/users/{userID}/verification-sessions`
- admin verification session detail: `GET /admin/users/verification-sessions/{sessionID}`
- admin verification session by provider reference: `GET /admin/providers/idcomply/verification-sessions/by-reference/{providerReference}`
- admin verification session by provider case ID: `GET /admin/providers/idcomply/verification-sessions/by-case/{providerCaseID}`
- admin verification review queue: `GET /admin/providers/idcomply/verification-sessions/review-queue`
- admin verification review queue export: `GET /admin/providers/idcomply/verification-sessions/review-queue/export`
- admin verification provider events: `GET /admin/users/verification-sessions/{sessionID}/events`
- admin verification assignment: `POST /admin/users/verification-sessions/{sessionID}/assign`
- admin verification notes: `POST /admin/users/verification-sessions/{sessionID}/notes`
- admin verification decision: `POST /admin/users/verification-sessions/{sessionID}/decision`
- admin/provider verification status update: `POST /admin/providers/idcomply/verification-sessions/{sessionID}/status`
- provider callback status update by session/case/reference:
  - `POST /providers/idcomply/verification-sessions/{sessionID}/status`
  - `POST /providers/idcomply/verification-sessions/by-case/{providerCaseID}/status`
  - `POST /providers/idcomply/verification-sessions/status`
- KYC submission: `POST /api/v1/auth/kyc`
- user detail: `GET /api/v1/users/{userID}`
- user update: `PUT /api/v1/users/{userID}`
- roles: `GET/POST /api/v1/users/{userID}/roles`
- permissions: `GET /api/v1/users/{userID}/permissions`

## Runtime

- router: Chi v5
- database: PostgreSQL via `pgx`
- ephemeral auth state: Redis
- auth: HMAC JWT access tokens + Redis-backed refresh tokens
- logging: `slog`

## Schema alignment

The service now uses the actual prep schema instead of the original scaffold assumptions:

- `users`
- `referral_codes`

It does not assume separate `profiles`, `sessions`, or `kyc_records` tables, because those are not present in the prep migrations.

It now also persists legacy-compatible KBA and IDPV verification sessions in `user_verification_sessions`, so the frontend registration flow has durable backend state even before full third-party provider integration exists.

It now also uses a provider-backed verification adapter seam for KBA and IDPV:

- default provider names are `idcomply`
- KBA sessions now persist provider references
- IDPV sessions now persist provider references and provider-oriented redirect state
- verification sessions now persist provider decision and provider case identifiers
- provider event history now persists in `verification_provider_events`
- admin/operator users can inspect verification session detail and provider event history
- admin/operator users can filter the verification review queue by assignee, flow type, and status, then export it as CSV for review handoff
- admin/operator users can attach direct notes to verification sessions during review
- admin/operator/trader users can apply human review decisions directly on verification sessions without using provider-only status endpoints
- admin/operator/trader users can now suspend, unsuspend, or terminate an active session from the Talon-compatible admin lifecycle route
- admin/internal roles can apply provider-style verification status updates
- provider-authenticated callbacks now work by internal session ID, provider reference, or provider case ID
- provider callback status aliases are normalized before persistence so external decisions like `completed`, `verified`, `manual_review`, `in_progress`, and `questionnaire` resolve into the stable internal KBA / IDPV lifecycle
- the external frontend contract remains stable while provider depth is improved underneath

Current lifecycle limitation:

- `cool-off` is still handled by `phoenix-compliance`; the new admin lifecycle route intentionally covers only `suspend`, `unsuspend`, and `logout`

## Role model

Primary system roles come from `users.role`:

- `admin`
- `moderator`
- `user`
- `guest`

Affiliate capability is derived from `referral_codes`. Assigning `affiliate` creates a referral code when missing.

## Configuration

```bash
export PORT=8001
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/phoenix_platform?sslmode=disable
export REDIS_ADDR=localhost:6379
export JWT_SECRET=dev-secret-change-in-production
export JWT_ISSUER=phoenix-user
export JWT_AUDIENCE=phoenix-platform
export ACCESS_TOKEN_TTL=15m
export REFRESH_TOKEN_TTL=168h
export VERIFICATION_CODE_TTL=30m
export KBA_PROVIDER=idcomply
export IDPV_PROVIDER=idcomply
```

## Validation

```bash
go test ./...
go test -race ./...
```

Current status:

- compiles cleanly
- table-driven service tests pass
- race-enabled tests pass
- `POST /token/refresh`
- `PUT /account/activate/{token}`
