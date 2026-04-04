# Phoenix Go Backend Parity Execution Plan

Date: 2026-03-10
Owner: Codex
Scope: Close the capability gap between the old Scala Phoenix backend and the new Go backend in `codex-prep`.

## Objective

Replace the old Scala/Akka Phoenix backend end to end with the new Go platform without requiring the old backend for any player, prediction, or backoffice workflow.

This plan is driven by:

- [OLD_VS_NEW_BACKEND_GAP_ANALYSIS.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/OLD_VS_NEW_BACKEND_GAP_ANALYSIS.md)
- [SERVICE_CONTRACTS.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/SERVICE_CONTRACTS.md)

## Current state

Already strong:

- gateway
- user basics
- wallet basics
- market engine
- betting engine
- settlement
- cms
- compliance basics
- analytics basics
- retention/social foundations
- retention promo parity (free bets + odds boosts)
- full demo/runtime/deployment baseline
- betting pre-validation
- betting batch status polling
- advanced betting quote lifecycle (bet builder + fixed exotics)

Major missing bounded contexts:

1. admin/backoffice API plane
2. prediction markets (active parity slice)
3. regulated account/session parity
4. payment orchestration parity
5. geolocation / GeoComply parity
6. sportsbook realtime websocket parity
7. provider feed integration parity
8. audit/reporting/support parity

## Success definition

The backend is considered parity-complete when:

1. the old player-facing Scala routes are no longer required for sportsbook or prediction
2. the old `/admin` backoffice backend is no longer required for Talon
3. the rebuilt frontend can run entirely against Go services
4. prediction markets exist as a first-class Go product
5. regulated account/payment/location/reporting flows are present at acceptable parity

## Execution principles

- Do not emulate the old monolith wholesale inside `phoenix-gateway`
- Build missing bounded contexts as explicit Go services or modules
- Keep service boundaries clean; do not re-monolith the Go stack
- Prefer parity on behavior and operator outcomes, not URL nostalgia
- Only add compatibility endpoints where they meaningfully reduce migration risk

## Workstreams

## Workstream 1: Prediction Markets

Priority: Critical
Why first: This is the single biggest capability gap and the reason the new live demo is sportsbook-only.

### Deliverables

Status: In progress. Initial service implemented and wired through gateway/demo runtime.

1. New service: `phoenix-prediction`
2. Player APIs for:
   - list markets
   - market detail
   - place prediction order
   - cancel order
   - user order history
   - leaderboard / standings as needed
3. Admin APIs for:
   - market lifecycle
   - suspension/reopen
   - settlement / resettlement
   - history / audit visibility
4. Persistence model:
   - prediction markets
   - outcomes
   - orders
   - settlement state
   - projections
5. Gateway routes for prediction product

### Implementation steps

1. Extract the concrete route and model inventory from the old prediction packages:
   - `phoenix/prediction/infrastructure/http/*`
   - `phoenix/prediction/orders`
   - `phoenix/prediction/settlement`
2. Define the Go service contract
3. Add SQL migrations for prediction tables
4. Implement command + query services
5. Wire settlement and wallet effects
6. Add admin endpoints and audit events
7. Add compose integration coverage

### Acceptance criteria

Delivered so far:
- prediction orders can be placed and cancelled through Go
- prediction settlement updates wallet state correctly
- prediction admin lifecycle works without Scala services
- prediction bot-key issuance now exists through `POST /v1/bot/keys` and `POST /api/v1/bot/keys`
- gateway exposes prediction endpoints

Remaining to close the workstream:
- compose/live validation that includes prediction in the public demo walkthrough
- prediction analytics/reporting depth comparable to the old platform
- Talon/admin adoption against the Go prediction surface

## Workstream 2: Backoffice / Admin API Plane

Priority: Critical
Why second: Talon cannot move to the new platform without a Go-native admin surface.

### Deliverables

1. New Go admin backend surface, either:
   - `phoenix-admin`, or
   - admin routes hosted in `phoenix-gateway` with service delegation
2. Coverage for these old admin families:
   - punters/users
   - bets
   - markets
   - fixtures
   - tournaments/leagues
   - config/terms
   - notes/support timeline
   - audit logs
   - reports
   - prediction ops
3. Role model:
   - operator
   - trader
   - admin

### Delivered so far

- `GET /admin/users`
- `GET /admin/users/{userID}`
- `GET /admin/bets`
- `GET /admin/bets/{betID}`
- `GET /admin/markets`
- `GET /admin/markets/{marketID}`
- `POST /admin/markets`
- `PUT /admin/markets/{marketID}/status`
- `PUT /admin/markets/{marketID}/odds`
- `POST /admin/markets/{marketID}/settle`
- `phoenix-prediction` admin lifecycle/read routes remain part of this same Go admin plane

These routes are now hosted through the domain services and exposed through
`phoenix-gateway`. They cover the first Talon-critical slice, but do not yet
replace the full old `/admin` backend.

### Implementation steps

1. Map every route group in old `BackofficeRoutes.scala`
2. Partition them by target Go service
3. Decide which endpoints belong in gateway-admin vs domain services
4. Implement admin auth/permissions middleware
5. Add audit/logging requirements to every mutation route
6. Add compose coverage for operator/trader/admin behavior

### Acceptance criteria

- Talon can fetch and mutate the required data from Go services only
- audit trail exists for admin mutations
- no Scala admin API dependency remains for covered workflows

### Current gap after initial delivery

Still missing from the Go admin plane:

- fixtures
- tournaments/leagues
- deeper audit support beyond the initial query surface
- richer report/regulatory export families
- compose role-matrix coverage for operator/trader/admin against the new routes

Delivered in the latest Talon user-review slice:

- `GET /admin/users/{userID}/transactions`
- `GET /admin/punters/{userID}/transactions`
- `PUT /admin/users/{userID}/limits/deposit`
- `PUT /admin/punters/{userID}/limits/deposit`
- `PUT /admin/users/{userID}/limits/stake`
- `PUT /admin/punters/{userID}/limits/stake`
- `GET /admin/users/{userID}/limits-history`
- `GET /admin/punters/{userID}/limits-history`
- `GET /admin/users/{userID}/cool-offs-history`
- `GET /admin/punters/{userID}/cool-offs-history`
- `GET /admin/users/{userID}/financial-summary`
- `GET /admin/punters/{userID}/financial-summary`
- `GET /admin/users/{userID}/session-history`
- `GET /admin/punters/{userID}/session-history`
- `POST /admin/users/{userID}/lifecycle/{action}`
- `POST /admin/punters/{userID}/lifecycle/{action}`
- `PUT /admin/users/{userID}/lifecycle/cool-off`
- `PUT /admin/punters/{userID}/lifecycle/cool-off`
- `POST /admin/users/{userID}/funds/credit`
- `POST /admin/punters/{userID}/funds/credit`
- `POST /admin/users/{userID}/funds/debit`
- `POST /admin/punters/{userID}/funds/debit`

Notes:
- The admin deposit/stake limit aliases accept Talon's legacy `{daily, weekly, monthly}` request shape and fan those writes into the existing periodized compliance limits.
- The admin and legacy limit aliases now share a compatibility parser across deposit, stake, and session requests, accepting both Talon's `{daily, weekly, monthly}` body and the legacy `{daily_limit, weekly_limit, monthly_limit}` payload.
- Deposit and stake persist through the real enum-backed keys `daily_deposit`, `weekly_deposit`, `monthly_deposit`, `daily_stake`, `weekly_stake`, and `monthly_stake`.
- Session limit aliases now persist through periodized compliance keys `daily_session`, `weekly_session`, and `monthly_session`, with utilization computed from overlapping `user_sessions` time within the active period.
- `GET /admin/users/{userID}/bets`
- `GET /admin/punters/{userID}/bets`
- `POST /admin/bets/{betID}/cancel`
- `POST /admin/bets/{betID}/lifecycle/{action}`

This closes the Talon per-user bets read surface on Go. Remaining bet-admin parity work is still write-side:

- legacy phone-bet placement compatibility
- broader admin bet lifecycle compatibility beyond the delivered `cancel` / open-bet `refund` / single-bet `settle` support, especially multi-leg/parlay settlement and any richer resettle/refund semantics

## Workstream 3: Regulated Account and Session Parity

Priority: High

### Gaps to close

- MFA / login-with-verification
- session timer/session state endpoints
- deeper device/session policy beyond basic fingerprint capture
  - richer cool-off/self-exclusion history
- terms-and-conditions acceptance workflows
- provider-backed IdComply / IDPV / KBA depth beyond the persisted compatibility endpoints, provider event history, provider case/reference lookup, and provider-authenticated callback paths

### Deliverables

1. Extend `phoenix-user`
2. Extend `phoenix-compliance`
3. Add missing session/account endpoints to gateway contract

### Acceptance criteria

- frontend auth/session flows do not require old `PunterRoutes`
- compliance/account restrictions have usable parity for demo + staged migration

### Delivered in current wave

- `GET /punters/current-session`
- `POST /auth/logout`
- `GET /profile/me`
- `PUT /profile`
- `PUT /profile/email`
- `GET /terms`
- `PUT /terms/accept`
- `POST /login-with-verification`
- `POST /api/v1/auth/login-with-verification`
- `POST /verification/request`
- `POST /api/v1/verification/request`
- `POST /verification/request-by-phone`
- `POST /api/v1/verification/request-by-phone`
- `POST /verification/request-by-verification-code/{verificationCode}`
- `POST /verification/check`
- `POST /api/v1/verification/check`
- `POST /registration/answer-kba-questions`
- `POST /api/v1/registration/answer-kba-questions`
- `POST /registration/check-idpv-status`
- `POST /api/v1/registration/check-idpv-status`
- `POST /registration/start-idpv`
- `POST /api/v1/registration/start-idpv`
- persisted `user_verification_sessions` state for KBA and IDPV compatibility flows
- `GET /admin/users/{userID}/verification-sessions`
- `GET /admin/users/verification-sessions/{sessionID}`
- `GET /admin/providers/idcomply/verification-sessions/by-reference/{providerReference}`
- `GET /admin/providers/idcomply/verification-sessions/review-queue`
- `GET /admin/providers/idcomply/verification-sessions/review-queue/export`
- `GET /admin/users/verification-sessions/{sessionID}/events`
- `POST /admin/users/verification-sessions/{sessionID}/assign`
- `POST /admin/users/verification-sessions/{sessionID}/notes`
- `POST /admin/providers/idcomply/verification-sessions/{sessionID}/status`
- persisted `verification_provider_events` history for provider-backed KBA / IDPV state changes
- `PUT /profile/multi-factor-authentication`
- `PUT /profile/preferences`
- `POST /password/change`
- `POST /api/v1/password/change`
- `POST /password/forgot`
- `POST /api/v1/password/forgot`
- `POST /password/reset/{token}`
- `POST /api/v1/password/reset/{token}`
- `POST /punters/delete`
- `POST /api/v1/punters/delete`
- persistent `user_sessions`, `user_terms_acceptance`, `mfa_enabled`, `phone_verified_at`, and `device_id` / `device_fingerprint`

### Remaining in this workstream

- deeper device/session policy beyond the delivered fingerprint capture
- richer self-exclusion history beyond the delivered cool-off / RG history aliases
- full third-party IdComply / IDPV / KBA depth beyond the delivered provider-backed admin/session/event seam, persisted provider decision/case detail, provider-authenticated callback paths, and external-status normalization layer

### Delivered in current wave

- `POST /punters/deposit-limits`
- `POST /punters/stake-limits`
- `POST /punters/session-limits`
- `POST /punters/cool-off`
- `PUT /responsibility-check/accept`
- `POST /password/change`
- `POST /password/forgot`
- `POST /password/reset/{token}`
- `POST /punters/delete`

## Workstream 4: Payments and Cashier Orchestration

Priority: High

### Gaps to close

- dedicated payment initiation flows
- transaction detail lookups
- cash withdrawal / cheque withdrawal semantics
- provider-origin-aware cashier logic
- richer error mapping

### Deliverables

1. New `phoenix-payments` service, or equivalent extension of `phoenix-wallet`
2. Cashier API contract for frontend and admin
3. Transaction detail/history parity where needed

### Recommendation

Create `phoenix-payments` instead of overloading `phoenix-wallet`.

Reason:

- keeps wallet ledger clean
- mirrors old separation of concerns better
- reduces future provider integration coupling

### Acceptance criteria

- cashier flows no longer depend on old payments APIs
- wallet remains ledger-centric, payments owns orchestration

### Delivered in current wave

- `POST /payments/deposit`
- `POST /payments/withdrawal`
- `POST /payments/cash-withdrawal`
- `POST /payments/cheque-withdrawal`
- `GET /payments/transactions/{transactionId}`
- legacy cashier aliases now resolve against the Go wallet ledger and expose single-transaction cashier status reads
- provider-mode pending payment flows are now in place
- PXP-style callback handling is now in place
- admin payment operations now include queue/filter reads, a dedicated reconciliation queue, direct transaction detail, event history, manual status override, explicit approve/decline review actions, an explicit settle action, and explicit refund/reversal/chargeback actions
- admin payment operations now also include direct transaction detail and event-history lookup by provider reference for reconciliation/support workflows
- admin payment operations now also include reconciliation preview plus provider timestamp/metadata visibility on transaction detail
- admin payment queue, summary, and reconciliation reads now accept `assigned_to`, and payment transactions can be assigned/noted by transaction ID or provider reference
- admin payment operations now also include `GET /admin/payments/transactions/export` for filtered CSV export of the cashier-review queue
- admin payment operations now also include `GET /admin/payments/transactions/reconciliation-queue/export` for filtered CSV export of the reconciliation queue
- per-user wallet-history review now includes `GET /admin/users/{userID}/transactions` and `GET /admin/punters/{userID}/transactions`, accepting both modern flat query params and Talon's legacy nested pagination/filter params

### Remaining in this workstream

- extract provider/payment orchestration into a dedicated service instead of the current wallet-backed alias layer
- broader provider/state coverage beyond the delivered PXP-style callback compatibility routes
- cheque/cash operational workflows beyond the current player-facing alias surface
- deeper payment admin/backoffice tooling beyond the delivered transaction detail, provider timestamp/metadata visibility, assignment-aware review queues, reconciliation preview, reconciliation export, and refund/reversal/chargeback workflows

## Workstream 5: Geolocation / GeoComply

Priority: High for regulated readiness

### Deliverables

1. `phoenix-geolocation` or `phoenix-compliance` extension
2. betting-engine integration hook
3. gateway route exposure if needed
4. GeoComply compatibility endpoints:
   - `GET /geo-comply/license-key`
   - `POST /geo-comply/geo-packet`
   - `/api/v1/geo-comply/*` aliases

### Acceptance criteria

- bet placement can enforce location policy through Go-only services

### Delivered in current slice

- GeoComply compatibility routes now exist in `phoenix-compliance`
- gateway exposes both legacy and `/api/v1` GeoComply paths
- `phoenix-betting-engine` now supports configurable `X-Geolocation` enforcement on bet and parlay placement
- remaining gap is provider-backed license issuance, frontend packet propagation when enforcement is enabled, and deeper jurisdiction/rules depth

## Advanced Betting Product Parity

Priority: High for frontend sportsbook migration

### Delivered in current slice

- `POST /api/v1/bets/builder/quote`
- `GET /api/v1/bets/builder/quotes/{quoteID}`
- `POST /api/v1/bets/builder/accept`
- `POST /api/v1/bets/exotics/fixed/quote`
- `GET /api/v1/bets/exotics/fixed/quotes/{quoteID}`
- `POST /api/v1/bets/exotics/fixed/accept`
- persisted quote storage in `advanced_bet_quotes` and `advanced_bet_quote_legs`
- quote acceptance wired into the existing wallet reserve + parlay placement flow

### Remaining in this slice

- richer provider/trading combinability rules
- advanced quote refresh through realtime market movement
- sportsbook realtime/provider depth behind the quote engines

## Workstream 6: Websocket / Realtime Parity

Priority: Medium

### Gaps to close

- market updates
- fixture updates
- bet updates
- wallet updates

### Deliverables

1. Gateway websocket compatibility endpoint at `GET /api/v1/ws/web-socket`
2. auth-aware subscriptions for `bets` and `wallets`
3. sportsbook channel coverage for `market^...` and `fixture^...`
4. follow-up event fanout/provider push depth behind the compatibility stream

### Acceptance criteria

- sportsbook frontend can receive live market/fixture/wallet/bet updates from Go stack

## Workstream 7: Provider Feed / Trading Ops Parity

Priority: Medium

### Gaps to close

- supplier integrations from old `suppliers/*`
- richer fixture/tournament/trading workflows
- external odds/live feed ingestion beyond internal CRUD

### Deliverables

Delivered so far:

- `phoenix-events` stats-centre read endpoint: `GET /api/v1/stats/fixtures/{fixtureID}`
- provider event upsert: `POST /api/v1/providers/events/upsert`
- mockdata supplier event sync: `POST /api/v1/providers/mockdata/events/sync`
- oddin supplier event sync: `POST /api/v1/providers/oddin/events/sync`
- betgenius supplier event sync: `POST /api/v1/providers/betgenius/events/sync`
- mockdata supplier market sync: `POST /api/v1/providers/mockdata/markets/sync`
- oddin supplier market sync: `POST /api/v1/providers/oddin/markets/sync`
- betgenius supplier market sync: `POST /api/v1/providers/betgenius/markets/sync`
- admin fixture reads: `GET /admin/fixtures`, `GET /admin/fixtures/{fixtureID}`
- admin fixture scheduling-state mutation: `PUT /admin/fixtures/{fixtureID}/status`
- admin tournament summary read: `GET /admin/tournaments`
- gateway routing for the above

Remaining:

1. Extend `phoenix-events`
2. Extend `phoenix-market-engine`
3. Build provider adapters
   - delivered provider adapters: `mockdata`, `oddin`, and `betgenius` for fixture and market sync
4. Keep minimal frontend-critical read models available before full supplier depth

### Acceptance criteria

- event/market lifecycle no longer depends on manual seeding for real operation
- frontend-critical reads like stats-centre no longer block migration while provider depth is still in progress
- trading/admin workflows can inspect fixtures and tournament groupings from Go without falling back to the Scala backend
- the Go stack now has real supplier adapter seams instead of only normalized provider upsert endpoints
- the remaining provider gap is deeper supplier-specific automation and richer push fidelity, not missing sync routes

## Workstream 8: Audit / Notes / Reports / Regulatory Surface

Priority: Medium

### Gaps to close

- admin audit API
- operator notes/support timeline
- regulatory reporting exports
- old report families beyond analytics dashboards

### Deliverables

Delivered so far:

- `phoenix-audit`
- `GET /admin/audit-logs` through `phoenix-gateway`
- `GET /admin/audit-logs/export` through `phoenix-gateway`
- `GET /admin/users/{userID}/logs` through `phoenix-gateway`
- `GET /admin/punters/{userID}/logs` through `phoenix-gateway`
- direct audit-row emission from `phoenix-market-engine` admin mutations
- direct audit-row emission from `phoenix-prediction` admin lifecycle mutations
- `phoenix-support-notes`
- `GET/POST /admin/users/{userID}/notes`
- `GET/POST /admin/punters/{punterID}/notes`
- `GET /admin/users/{userID}/timeline`
- `GET /admin/punters/{punterID}/timeline`
- `GET /admin/users/{userID}/timeline/export`
- `GET /admin/punters/{punterID}/timeline/export`
- transactional note creation plus audit-log emission
- server-side timeline filtering by type/date plus CSV export
- `phoenix-config`
- `POST /admin/upload-terms`
- `GET /admin/terms/current`
- `GET /api/v1/terms/current`
- `GET /terms`
- `PUT /terms/accept`
- `GET /punters/current-session`
- `GET /profile/me`
- `PUT /profile`
- persistent `user_sessions` and `user_terms_acceptance` storage in `phoenix-user`
- `GET /admin/punters/{userID}/transactions/export`
- `GET /admin/users/{userID}/transactions/export`
- `POST /admin/punters/exclusions/export`
- `POST /admin/reports/daily`
- `GET /admin/reports/daily/repeat`

Still required:

1. richer report families beyond the initial analytics/admin export slice
2. deeper regulatory delivery/orchestration beyond immediate JSON/CSV generation
3. richer verification review and cashier review workflow depth beyond the delivered assignment/note/filtered-queue/export slice

### Acceptance criteria

- Talon can operate without old audit/note/report routes

## Sequencing

## Phase B1: Prediction Foundation

Build:

- `phoenix-prediction`
- player order flows
- admin lifecycle
- wallet integration

Gate:

- prediction module available to frontend

Status:

- initial prediction service, gateway wiring, demo runtime wiring, and container build are now in place
- remaining gap is full parity depth, not service absence

## Phase B2: Admin Plane

Build:

- Go admin route plane
- Talon-critical endpoints first

Gate:

- Talon can read/write core sportsbook and prediction workflows from Go

## Phase B3: Auth / Compliance / Session Depth

Build:

- MFA/session/device/terms
- compliance depth
- geolocation hook design

Gate:

- frontend auth/account workflows can migrate

## Phase B4: Payments / Cashier

Build:

- payment orchestration service
- richer cashier endpoints

Gate:

- frontend cashier no longer needs legacy semantics

## Phase B5: Realtime + Provider Feeds

Build:

- websocket parity
- supplier/provider adapters
- direct match-tracker/stats routes where the frontend already expects them

Gate:

- sportsbook feels live on Go stack

## Phase B6: Reports / Audit / Support

Build:

- admin support surface
- regulatory/reporting parity

Gate:

- operational parity for Talon and compliance teams

## Immediate backlog for Codex

Execute in this order:

1. Continue ops/backoffice depth for investor-demo readiness:
   - broader report families in `phoenix-analytics`
   - note: Talon risk-summary now has Go-backed promo usage, wallet correction task reads, and player risk scores/segments
   - note: Talon provider-ops now also has Go-backed feed health plus persisted stream acknowledgements and acknowledgement SLA settings
   - richer verification review workflow in `phoenix-user`
   - note: human review decisions now have an operator-facing Go route at `POST /admin/users/verification-sessions/{sessionID}/decision`; remaining work is frontend use plus deeper provider realism, not decision transport
   - remaining Talon-facing admin workflow depth
2. Continue payment-provider/state depth in `phoenix-wallet`:
   - reconciliation behavior
   - refund/reversal depth
   - note: Talon provider-ops now also has a Go-backed `POST /admin/provider/cancel` compatibility route for provider-backed wallet transactions, including narrow `provider.cancel.succeeded` / `provider.cancel.failed` audit rows; remaining depth is richer provider semantics, not missing transport or base audit visibility
   - richer admin/provider workflows
3. Continue true third-party IdComply / KBA / IDPV depth in `phoenix-user`
4. Continue provider/realtime fidelity after the ops/backoffice pass
5. Continue `phoenix-prediction` reporting/admin/public-product depth as needed for full dual-product parity

## Milestone definitions

This plan should not treat all remaining hardening as equally blocking. The work is complete in layers:

### Milestone 1: Investor demo backend done

Definition:

- every backend route used in the actual investor demo path exists on Go
- no demo-visible Talon or player flow hits a dead route
- no demo-visible action is fake:
  - if supported, it works truthfully
  - if unsupported, it is explicitly blocked or returns a known validation error
- touched service tests are green
- gateway route tests are green
- at least one scripted demo smoke passes against the Go stack

Included:

- wallet history
- financial summary
- session history
- limits history
- cool-offs history
- audit reads used in the demo
- manual funds
- verification review and decision
- provider cancel
- user lifecycle
- bets read plus cancel

Explicitly not required:

- full provider realism
- full reporting depth
- dormant phone-bet placement
- SSN detail
- deep geolocation or jurisdiction fidelity
- broad production hardening

Exit rule:

- if a route or screen is not used in the investor demo, it does not block Milestone 1

### Milestone 2: Active Talon surface parity done

Definition:

- every currently mounted Talon admin or user screen is either:
  - backed by Go and validated
  - or intentionally hidden/disabled with no broken controls
- no mounted Talon surface still depends on the old Scala backend

Included:

- all active mounted Talon pages and controls
- route truthfulness
- response-shape compatibility
- action semantics for exposed buttons

Explicitly not required:

- dormant or commented-out frontend paths
- legacy routes with no active caller
- non-mounted admin experiments

Exit rule:

- active surface means mounted and reachable in the current Talon build, not merely present in source

### Milestone 3: Semantic parity done

Definition:

- exposed high-risk business semantics are real, not just compatibility transport
- remaining admin mutations have truthful accounting, audit, and compensation behavior

Included:

- bet `settle`
- bet `refund`
- real periodized session-limit support if the UI path remains active
- any remaining exposed provider/payment semantics that still return deliberate unsupported errors

Explicitly not required:

- broad platform hardening
- scale and performance tuning beyond correctness

Exit rule:

- no exposed admin mutation remains in a state where transport exists but semantics are intentionally unsupported

### Milestone 4: Production hardening done

Definition:

- observability, role-matrix coverage, failure-mode testing, reporting breadth, provider fidelity, and operational polish are complete enough for production rollout

Included:

- role-matrix integration coverage
- replay and recovery paths
- export and reporting breadth
- provider and jurisdiction depth
- operational observability and runbook confidence

Exit rule:

- hardening is primary work only in this milestone, not before

## Completion targets

This program now has two explicit finish lines.

### Target A: Demo completion

This target is complete when:

- Milestone 1 is complete
- every demo-critical frontend path has a corresponding truthful Go backend path
- any non-demo backend gaps are explicitly classified as post-demo work and do not create broken demo-visible controls

This target is intended to stop open-ended hardening before the investor demo.

Target A does not require:

- Milestone 3 semantic closure on non-demo mutations
- Milestone 4 production hardening
- dormant or non-mounted backend compatibility work

### Target B: Full platform and backend parity completion

This target is complete when:

- Milestones 1 through 4 are complete
- player sportsbook and prediction flows run fully on Go
- Talon talks only to Go APIs
- the frontend migration can remove all old Phoenix backend dependencies

This target is the actual end-state for total backend replacement.

### Backlog classification rule

Every remaining backend item must be tagged before work starts as one of:

- blocks Target A
- blocks Target B only
- explicit non-goal for now

If an item does not block Target A and is not required to keep a demo-visible control truthful, it must not delay the demo track.

## Current status against milestones

- Milestone 1: complete for Target A
- Milestone 2: complete (M37 backend enrichment + M38 Talon DOB normalizer + M39 param name correction, live Playwright evidence)
- Milestone 3: incomplete
- Milestone 4: intentionally incomplete

## Current status against completion targets

- Target A: complete
  - a live local Go demo stack was rebuilt and revalidated on 2026-03-17
  - `scripts/demo-smoke.sh` passed with 34/34 checks green against the rebuilt stack
  - closure fixes included:
    - `phoenix-realtime` Apple Silicon compose/build alignment plus a truthful runtime healthcheck
    - `phoenix-prediction` duplicate `/api/v1` mount removal
    - `phoenix-gateway` public registration for `/api/v1/terms/current`
    - responsibility-check schema restoration for support-note timeline warmup/smoke parity
  - session-limit writes remain Target B only because the Talon edit entry point is still commented out and not mounted
- Target B: incomplete

## Plan complete criteria

This full backend parity plan is complete when:

- player sportsbook and prediction flows run fully on Go
- Talon talks only to Go APIs
- frontend migration can remove all old Phoenix backend dependencies
- Milestone 4 is complete
