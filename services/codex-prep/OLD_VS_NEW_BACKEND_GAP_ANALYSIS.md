# Old Phoenix Backend vs New Go Backend Gap Analysis

Date: 2026-03-10

## Scope

This compares:

- Old backend: `Phoenix-Sportsbook-Combined/phoenix-backend`
- New backend: `codex-prep`

The goal is capability parity analysis, not code-style comparison.

## Source of truth used

- Old route aggregation:
  - `phoenix/http/routes/PhoenixRestRoutes.scala`
  - `phoenix/http/routes/backoffice/BackofficeRoutes.scala`
- Old exposed route modules:
  - `phoenix/*/infrastructure/http/*Routes.scala`
  - `phoenix/websockets/WebSocketRoutes.scala`
- New service contracts and concrete handlers:
  - `SERVICE_CONTRACTS.md`
  - `phoenix-*/cmd/server/main.go`
  - `stella-engagement/cmd/server/main.go`

## Executive summary

The new Go platform is not at old-backend parity yet.

It is strong on:

- core sportsbook player flows
- wallet basics
- content/promotions
- retention/social foundations
- settlement
- analytics foundations
- deployment/runtime structure

It is materially behind the old backend on:

- prediction markets
- backoffice/admin operations
- audit/support tooling
- payment gateway orchestration
- geolocation / GeoComply
- regulated account/session flows
- provider feed integrations
- real-time player websockets
- legacy reporting/regulatory surface

## Bottom-line parity estimate

These are rough engineering estimates, not audited contract counts.

- Core sportsbook player capability parity: `~70%`
- Platform operations and admin parity: `~60%`
- Prediction market parity: `~45-55%` after initial `phoenix-prediction` service delivery
- Overall old-backend functional parity: `~64-72%`

The largest remaining slice is now config/reporting depth plus regulated account and cashier parity. Prediction has moved from missing to partial, and the Go platform now has an initial admin plane for users, bets, markets, prediction ops, audit-log query, and support notes.

## Capability matrix

| Domain | Old backend | New Go backend | Status | Gap |
|---|---|---|---|---|
| API gateway | Monolith-mounted route aggregation | Dedicated `phoenix-gateway` | Improved architecture | No major gap at gateway layer |
| Player auth/account | Rich punter flows in `PunterRoutes.scala` | `phoenix-user` | Partial | Current-session, logout, legacy refresh, account activation by token, terms acceptance, profile aliases, MFA/login-with-verification, verification challenge flows, MFA toggle, password change/forgot/reset, account deletion, and basic device/session capture now exist; richer device/session policy still remains |
| KYC / identity | Old punter + `idcomply` integration | `phoenix-user` basic KYC, legacy-facing verification/login/password/profile/account-activation aliases, provider-backed KBA/IDPV compatibility sessions with persisted provider refs, provider case IDs, direct admin verification-session detail/history, provider-event history, provider-reference and provider-case lookup, provider-authenticated callback paths, assignee-aware review queue, assignment/note workflow, filtered review-queue CSV export, external-status normalization for provider callbacks, plus `phoenix-compliance` AML + legacy-facing limit/cool-off/self-exclude/responsibility/RG-history aliases | Partial | Legacy-facing account restriction, self-exclusion, and verification routes now exist; KBA/IDPV now persist backend session state, provider references, provider case IDs, provider-event history, direct admin review detail, provider-reference/provider-case lookup, review assignment/notes/export, and normalize richer external callback vocabularies through an IdComply-style adapter seam. Remaining gap is full third-party IdComply / IDPV / KBA provider depth |
| Wallet core | Wallet bounded context + payment transaction integration | `phoenix-wallet` | Partial | Basic wallet works; old platform had richer transaction/payment coupling |
| Payments | `PaymentsRoutes.scala` with deposit, withdrawal, cash, cheque, transaction details, gateway failure handling | `phoenix-wallet` plus legacy-compatible `payments/*` aliases, provider-aware pending transaction / PXP-style callback handling, admin payment queue/detail/event/status/settle operations, reconciliation preview, provider-reference detail/event lookup, explicit refund/reversal/chargeback workflows, transaction event history, provider timestamp/metadata visibility, assignment-aware review queues/summary, filtered CSV export, and richer provider state transitions | Partial | Player-facing cashier endpoints, provider-style callbacks, provider-reference support visibility, event history, provider detail visibility, assignment-aware review workflow, queue export, and meaningful admin payment workflows now exist in Go; remaining gap is fuller payment-provider orchestration and deeper provider-specific admin tooling |
| Sportsbook markets | `MarketRoutes.scala`, fixtures/tournaments/trading | `phoenix-market-engine`, `phoenix-events` | Partial | Core market CRUD now includes provider event upsert, mockdata and oddin supplier sync for fixtures and markets, and admin fixtures/tournaments reads in Go; full Betgenius adapter parity and deeper provider push depth are still missing |
| Betting | `BetRoutes.scala`, validation, geolocation hooks, richer domain integration | `phoenix-betting-engine` | Partial | Core place/cashout/parlay/precheck/batch-status plus bet-builder and fixed-exotics quote flows exist; provider-side and realtime depth is still thinner |
| Settlement | Existing monolith settlement and wallet linkage | `phoenix-settlement` | Partial to strong | Core batch settlement exists, but long-tail legacy cases still thinner |
| Prediction markets | `PredictionPlayerRoutes.scala`, `PredictionBackofficeRoutes.scala`, prediction orders/settlement/history/projection tooling | `phoenix-prediction` | Partial | Player/admin prediction flows now exist in Go; bot-key issuance, richer projections, and frontend adoption still remain |
| Bot auth for prediction | `PredictionBotRoutes.scala` | `phoenix-prediction` bot-key issuance via `/v1/bot/keys` and `/api/v1/bot/keys` | Ready | Legacy issue-key route now exists in Go with persisted hashed token storage and audit/outbox emission |
| Backoffice/admin | Unified `/admin` route family for punters, markets, fixtures, tournaments, bets, config, notes, reports, audit, prediction ops | Initial admin routes in `phoenix-user`, `phoenix-betting-engine`, `phoenix-market-engine`, `phoenix-prediction`, `phoenix-audit`, `phoenix-support-notes`, `phoenix-config`, `phoenix-events`, `phoenix-wallet`, and `phoenix-analytics` via gateway | Partial | First Talon-critical slices exist; fixtures, tournaments, operator timelines, verification review assignment, payment review assignment, and initial report/export routes now exist in Go, but broader ops families are still missing |
| Audit log | `AuditLogBackofficeRoutes.scala` | `phoenix-audit` + `GET /admin/audit-logs` | Partial | Query parity exists; mutation breadth, support notes, and richer admin tooling still missing |
| Support notes | `NoteBackofficeRoutes.scala` | `phoenix-support-notes` + `/admin/users/{id}/notes` + `/admin/punters/{id}/notes` + `/admin/users/{id}/timeline` + `/admin/punters/{id}/timeline` + timeline CSV export/filtering | Partial | Core note list/create parity exists and the first unified operator timeline now exists in Go with filtering/export; broader Talon workflow depth still remains |
| Config/terms ops | `ConfigBackOfficeRoutes.scala` + terms repositories | `phoenix-config` + `/admin/upload-terms` + `/admin/terms/current` + `/api/v1/terms/current` + `/terms`, with `phoenix-user` handling `/terms/accept` | Partial | Core terms admin and acceptance surface now exists; broader config parity still remains |
| GeoComply / geolocation | `GeoComplyRoutes.scala` and `geolocationValidator` wired into betting | `phoenix-compliance` GeoComply compatibility routes + configurable betting enforcement in `phoenix-betting-engine` | Partial | Legacy GeoComply license/packet routes exist in Go, and betting can now enforce `X-Geolocation`; provider-backed license issuance and deeper jurisdiction logic still remain |
| Websockets | `/web-socket` for markets, fixtures, bets, wallets | Gateway websocket compatibility endpoint at `/api/v1/ws/web-socket` plus `stella-engagement` achievement streams and direct `phoenix-events` match-tracker / stats routes | Partial | Frontend-critical websocket parity now exists for market, fixture, bet, and wallet subscriptions; match-tracker and stats routes also exist directly. Remaining gap is provider-backed push depth and richer realtime event fidelity |
| Reports / regulatory | `reports` module + backoffice report access + DGE-style reporting in old platform | `phoenix-analytics` dashboards/cohorts/events plus admin transaction/exclusion export and daily report endpoints | Partial | Initial report/export parity now exists; richer DGE/regulatory families and delivery workflows still remain |
| CMS / promotions | Legacy config/content surfaces mixed into monolith/backoffice | `phoenix-cms` | Improved for isolation | No major demo blocker |
| Retention / loyalty | Partial/legacy mixed features | `phoenix-retention` + `stella-engagement` | Improved foundation | Loyalty, campaigns, free bets, and odds boosts now exist in Go; still not a full CRM or journey engine |
| Social | Very limited in old Phoenix backend | `phoenix-social` | New capability | Not a parity gap; this is additive |

## What the old backend has that the new backend still does not

### 1. Prediction market bounded context

The old backend contains a full prediction domain:

- `phoenix/prediction/infrastructure/http/PredictionPlayerRoutes.scala`
- `phoenix/prediction/infrastructure/http/PredictionBackofficeRoutes.scala`
- `phoenix/prediction/orders`
- `phoenix/prediction/settlement`
- `phoenix/prediction/tools`

The Go stack now has an initial `phoenix-prediction` service, but it is still the first parity slice rather than full replacement parity.

Current Go coverage now includes:

- public prediction overview, category, and market discovery APIs
- player order placement, cancellation, and order history
- admin lifecycle actions: suspend, open, cancel, resolve, resettle
- wallet-safe reservation and release behavior

Still missing or incomplete:

- richer prediction projections/analytics
- backoffice integration beyond service-level APIs
- frontend product adoption on the public demo

Prediction is no longer absent, but it is not yet full parity.

### 2. Backoffice/admin API surface

The old backend exposes a large admin surface via:

- `phoenix/http/routes/backoffice/BackofficeRoutes.scala`
- `BetBackofficeRoutes.scala`
- `MarketBackofficeRoutes.scala`
- `FixtureBackofficeRoutes.scala`
- `TournamentBackofficeRoutes.scala`
- `PunterBackofficeRoutes.scala`
- `ConfigBackOfficeRoutes.scala`
- `NoteBackofficeRoutes.scala`
- `AuditLogBackofficeRoutes.scala`
- `PredictionBackofficeRoutes.scala`

The Go stack now has an initial admin/backend layer exposed through the domain
services and `phoenix-gateway`, but it is still narrower than the old
consolidated admin surface.

Current Go coverage:

- punter/user admin reads
- bet admin reads
- market admin reads and core mutations
- fixture/tournament admin reads and fixture status control
- prediction admin lifecycle and reads
- audit-log query
- support note list/create plus unified operator timeline with filtering/export
- payment review queue, reconciliation queue, and CSV export
- terms/config admin surface

Still missing:

- deeper audit/search backend breadth beyond the initial query surface
- full report/export backend depth

### 3. Regulated account/session depth

Old `PunterRoutes.scala` is materially richer than `phoenix-user`:

- login with verification
- MFA verification workflows
- refresh/logout/session handling
- cool-off flows
- richer device/session policy beyond the now-persisted fingerprint capture
- terms and conditions handling
- excluded player flows
- IdComply / IDPV / KBA integration
- session timer support

The Go stack currently covers:

- registration
- login
- token refresh
- logout
- email verification
- basic KYC submission
- roles/permissions
- persistent session tracking and `GET /punters/current-session`
- terms acceptance via `PUT /terms/accept`
- legacy-compatible `GET /profile/me` and `PUT /profile`
- self-exclusion / limits / cool-off / RG history / AML basics

Impact:

- demo works
- regulated production behavior is not at old parity

### 4. Payment orchestration depth

Old `PaymentsRoutes.scala` supports:

- deposit
- withdrawal
- cash withdrawal
- cheque withdrawal
- transaction detail lookup
- provider-origin aware payment flows
- richer payment gateway error mapping

The Go stack currently routes most monetary movement through `phoenix-wallet`.

Current Go coverage now includes:

- legacy-compatible cashier aliases:
  - `POST /payments/deposit`
  - `POST /payments/withdrawal`
  - `POST /payments/cash-withdrawal`
  - `POST /payments/cheque-withdrawal`
  - `GET /payments/transactions/{transactionId}`
- provider-oriented pending transaction handling when `PAYMENT_PROVIDER_MODE` is enabled
- PXP-style callback compatibility routes:
  - `POST /pxp/payment-state-changed/handlePaymentStateChangedNotification`
  - `POST /pxp/verify-cash-deposit`
- admin reconciliation and review routes:
  - `GET /admin/payments/transactions/reconciliation-queue`
  - `POST /admin/payments/transactions/{transactionID}/approve`
  - `POST /admin/payments/transactions/{transactionID}/decline`

Impact:

- good for demo and internal platform flows
- first provider orchestration slice is now present, including review/reconciliation workflow depth
- still not equivalent to the richer cashier/payment-gateway depth of the old backend

### 5. GeoComply and location-sensitive betting

The old backend has:

- `phoenix/geocomply/infrastructure/http/GeoComplyRoutes.scala`
- geolocation validation wired into betting route construction in `PhoenixRestRoutes.scala`

The Go stack now has an initial GeoComply compatibility surface in `phoenix-compliance`:

- `GET /geo-comply/license-key`
- `POST /geo-comply/geo-packet`
- `/api/v1/geo-comply/*` aliases

What is still missing is the deeper regulated behavior:

- provider-backed license issuance
- GeoComply-backed packet evaluation instead of compatibility-mode evaluation
- frontend propagation of the encrypted GeoComply packet when enforcement is enabled

Impact:

- no provider-backed regulated geofence parity yet

### 6. Supplier/feed integration depth

Old backend includes explicit supplier integration packages:

- `phoenix/suppliers/oddin`
- `phoenix/suppliers/betgenius`
- `phoenix/suppliers/mockdata`

The Go stack has `phoenix-events` and `phoenix-market-engine`, now exposes a minimal stats-centre read surface, provider-event upsert, mockdata fixture sync, oddin fixture sync, betgenius fixture sync, mockdata market sync, oddin market sync, betgenius market sync, and admin fixture/tournament reads. It is no longer just CRUD/manual update, but it still lacks richer provider-backed push fidelity and deeper supplier-specific automation.

Impact:

- demo markets/events work
- old ingestion/provider breadth is not yet ported
- provider/trading control surface is now present, and real supplier adapters (`mockdata`, `oddin`) are delivered
- remaining supplier gap is richer provider-backed push depth and deeper supplier-specific automation

### 7. Real-time player websocket parity

Old backend websocket route:

- `phoenix/websockets/WebSocketRoutes.scala`

It streams:

- market updates
- fixture updates
- bet updates
- wallet updates

The Go stack now exposes a gateway websocket compatibility route:

- `GET /api/v1/ws/web-socket`

Current Go sportsbook coverage:

- market subscriptions via `market^{marketID}`
- fixture subscriptions via `fixture^{gameID}^{fixtureID}`
- authenticated bet subscriptions via `bets`
- authenticated wallet subscriptions via `wallets`
- `stella-engagement` achievement and leaderboard streams remain separate

Impact:

- frontend-critical sportsbook realtime is now present, but deeper provider push fidelity and richer event breadth are still missing

### 8. Reporting and audit parity

Old backend includes:

- audit log backend routes
- reports module
- dbviews/projections
- richer backoffice reporting

The Go stack includes:

- `phoenix-analytics`
- dashboards
- cohorts
- market/user reporting foundations
- `phoenix-audit`
- admin audit-log query and filtering

Impact:

- analytics foundation exists
- legacy ops/regulatory/report-export surface does not

## What the new backend does better already

### 1. Service isolation and deployability

The Go stack is materially better structured for deployment:

- each domain is a service
- explicit service contracts
- Dockerized runtime
- compose demo path
- outbox worker
- better path toward independent scaling

### 2. Demo readiness

The new Go platform now has a real live public demo path:

- gateway
- player-facing thin frontend
- compose deployment
- smoke tests
- failure-path hardening

The old backend was richer functionally, but harder to package as a clean modern demo runtime.

### 3. Modernized operational baseline

The Go stack already has:

- service-local tests
- compose integration
- resilience/failure tests
- Docker verification
- deployment overlays
- runbooks

The old backend was richer in domain coverage, not richer in modern service-operability.

## Recommended parity roadmap

### Tier 1: required for true old-backend parity

1. Advance `phoenix-prediction` from initial delivery to full parity
2. Build a Go admin/backoffice backend surface
3. Port geolocation / GeoComply equivalent
4. Port richer payment orchestration
5. Add sportsbook realtime websocket parity

### Tier 2: required for regulated/ops parity

1. Port richer punter/account session flows
2. Port reporting/regulatory exports
3. Port support notes + expand audit/report ops
4. Finish terms acceptance workflows and broader config parity

### Tier 3: required for provider/market parity

1. Port supplier/provider feed integrations
2. Port full market trading/tournament/fixture ops parity

## Related documents

- **[FRONTEND_API_DEPENDENCY_INVENTORY.md](./FRONTEND_API_DEPENDENCY_INVENTORY.md)** — Concrete frontend endpoint-by-endpoint migration matrix mapping old Scala calls to Go equivalents (70 endpoints audited, 2026-03-10)

## Practical conclusion

The new Go backend is already a valid sportsbook demo platform.

It is not yet a full replacement for the old Phoenix backend.

The biggest remaining replacements are:

1. backoffice/admin APIs
2. regulated integrations and operational tooling
3. full prediction parity beyond the initial Go service slice

If the goal is "demo the new platform", the Go backend is already good enough.

If the goal is "replace the old backend end to end", the new backend still has major missing bounded contexts.
