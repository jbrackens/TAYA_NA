# Phoenix Go Microservices Implementation Status

Date updated: 2026-03-17

## Current State

The codex-prep rebuild has completed the initial implementation pass for all 14
target Go backend services plus the shared `phoenix-common` library. Parity
expansion work has now added `phoenix-prediction`, `phoenix-audit`,
`phoenix-support-notes`, `phoenix-config`, `phoenix-realtime`, and the first
Go-native admin route slices for users, bets, markets, prediction ops,
audit-log query, support notes, terms/config, dedicated realtime fanout, and
regulated account/session parity plus MFA/verification, password lifecycle, and
account deletion parity in `phoenix-user`.

## Delivery Status By Phase

### Phase 1
- `phoenix-gateway`: complete

### Phase 2
- `phoenix-user`: complete
- `phoenix-wallet`: complete

### Phase 3
- `phoenix-market-engine`: complete
- `phoenix-betting-engine`: complete

### Phase 4
- `phoenix-events`: complete
- `phoenix-retention`: complete
- `phoenix-social`: complete

### Phase 5
- `phoenix-compliance`: complete
- `phoenix-analytics`: complete
- `phoenix-notification`: complete
- `phoenix-settlement`: complete
- `phoenix-cms`: complete
- `stella-engagement`: complete

### Parity Expansion
- `phoenix-prediction`: implemented and being integrated across gateway/demo/runtime
- `phoenix-audit`: implemented and wired through gateway/demo runtime
- `phoenix-audit`: admin audit-log JSON query plus filtered CSV export now implemented and wired through gateway/demo runtime
- `phoenix-support-notes`: implemented and wired through gateway/demo/runtime
- operator timeline parity: `phoenix-support-notes` now exposes `GET /admin/users/{userID}/timeline` and `GET /admin/punters/{punterID}/timeline` over notes, wallet activity, bets, verification sessions, exclusions, limits, and responsibility checks
- operator timeline export depth: `phoenix-support-notes` now supports timeline filtering by type/date and CSV export for both `users` and `punters` aliases
- `phoenix-config`: implemented and wired through gateway/demo/runtime
- `phoenix-realtime`: implemented as a dedicated Kafka-backed sportsbook fanout service for `market`, `fixture`, `bets`, and `wallets`, with gateway websocket proxying behind a feature flag
- Initial Go admin plane: implemented for user, bet, market, prediction, audit, and support-note workflows
- Regulated account/session parity: current-session, logout, profile aliases, legacy refresh, account activation token flow, terms acceptance, MFA verification flows, MFA toggle, password change/forgot/reset, account deletion, and persisted device/session capture implemented in `phoenix-user`
- Cashier parity slice: legacy `payments/*` player routes and single transaction lookup implemented in `phoenix-wallet`
- Compliance alias parity: legacy `punters/*-limits`, `punters/limits-history`, `punters/cool-offs-history`, `punters/cool-off`, and `responsibility-check/accept` implemented in `phoenix-compliance`
- Admin lifecycle cool-off alias: `phoenix-compliance` now also exposes `PUT /admin/users/{userID}/lifecycle/cool-off` and `PUT /admin/punters/{userID}/lifecycle/cool-off`; `enable=true` creates a temporary exclusion and `enable=false` now cancels the active temporary cool-off with truthful `404` behavior when none exists
- Admin limit-update alias depth: `phoenix-compliance` now also exposes `PUT /admin/users|punters/{userID}/limits/deposit|stake|session`; deposit/stake accept both Talon's `{daily, weekly, monthly}` body and legacy `{daily_limit, weekly_limit, monthly_limit}` payloads and fan those writes into the real periodized keys `daily_deposit` / `weekly_deposit` / `monthly_deposit` and `daily_stake` / `weekly_stake` / `monthly_stake`
- Admin and legacy session-limit aliases now persist periodized session keys `daily_session` / `weekly_session` / `monthly_session`, with current-period utilization computed from overlapping `user_sessions` duration in hours
- Target A classification note: Talon's user-details session-limit edit transport still exists in the container, but the only current UI entry point to open that modal is commented out, so session-limit writes are not a mounted demo-visible action and do not presently block demo completion
- Compliance history normalization fix: admin limit history now correctly maps stored values like `daily_deposit` and `weekly_stake` back to Talon period/type labels
- GeoComply compatibility parity: legacy `geo-comply/license-key` and `geo-comply/geo-packet` routes implemented in `phoenix-compliance`
- Betting geolocation parity: `phoenix-betting-engine` now supports configurable `X-Geolocation` enforcement on bet and parlay placement
- Betting pre-validation parity: `phoenix-betting-engine` now exposes `POST /api/v1/bets/precheck` with normalized blocking error codes for the rebuilt betslip flow
- Betting status parity: `phoenix-betting-engine` now exposes batch bet-status polling via `POST /api/v1/bets/status` and legacy alias `POST /punters/bets/status`
- Advanced betting parity: `phoenix-betting-engine` now exposes persisted quote/get/accept flows for bet builder and fixed exotics
- Sportsbook websocket parity: `phoenix-gateway` now exposes `GET /api/v1/ws/web-socket` with frontend-compatible `market`, `fixture`, `bets`, and `wallets` channels
- Match-tracker parity: `phoenix-events` now exposes `GET /api/v1/match-tracker/fixtures/{fixtureID}` with provider-incident and fallback timeline support
- Profile email parity: `phoenix-user` now exposes `PUT /profile/email` and accepts `email` on generic profile updates
- KBA / IDPV provider seam: `phoenix-user` now persists verification sessions plus provider references for `registration/answer-kba-questions`, `registration/start-idpv`, and `registration/check-idpv-status`
- Verification admin/provider depth: `phoenix-user` now exposes admin verification-session reads, provider-event history, and IdComply-compatible status updates
- Cashier/provider orchestration: `phoenix-wallet` now supports provider-mode pending deposits/withdrawals plus PXP-style callback compatibility routes
- Cashier/backoffice export depth: `phoenix-wallet` now supports `GET /admin/payments/transactions/reconciliation-queue/export` using the same provider/assignment filters as the reconciliation queue
- Cashier admin parity: `phoenix-wallet` now exposes `GET /admin/payments/transactions`, `GET /admin/payments/transactions/{transactionID}`, `GET /admin/payments/transactions/{transactionID}/events`, and explicit `refund` / `reverse` / `chargeback` admin actions in addition to generic status updates
- Cashier reconciliation parity: `phoenix-wallet` now exposes `GET /admin/payments/transactions/reconciliation-queue` plus explicit `approve` / `decline` admin review actions for provider transactions
- Cashier provider-state depth: `phoenix-wallet` now persists transaction event history and supports `PROCESSING`, `CANCELLED`, `REFUNDED`, `REVERSED`, `CHARGEBACK`, and `RETRYING` transitions with balance-safe reversals/refunds/chargebacks
- Cashier provider-reference admin depth: `phoenix-wallet` now supports direct provider-reference lookup for both transaction detail and transaction event history
- Verification provider callback depth: `phoenix-user` now normalizes richer external IdComply/KBA/IDPV status vocabularies into the stable internal verification lifecycle before persisting sessions and provider events
- Verification provider-detail depth: `phoenix-user` now persists `providerDecision` and `providerCaseId` on verification sessions and carries them through admin reads and provider-event payloads
- Verification provider-reference admin depth: `phoenix-user` now supports direct admin/operator verification-session lookup by provider reference
- Verification provider-case operational depth: `phoenix-user` now supports direct admin lookup and provider-authenticated callback updates by `providerCaseID`
- Verification review workflow depth: `phoenix-user` review queue now supports `assigned_to` filtering plus explicit admin/operator assignment and note creation on verification sessions
- Verification review decision depth: `phoenix-user` now also exposes `POST /admin/users/verification-sessions/{sessionID}/decision` so admin/operator/trader users can record human review outcomes without using provider-only callback endpoints
- Verification review export depth: `phoenix-user` now supports `flow_type` / `status` filtering on the review queue plus CSV export via `GET /admin/providers/idcomply/verification-sessions/review-queue/export`
- Bet admin lifecycle alias: `phoenix-betting-engine` now also exposes `POST /admin/bets/{betID}/lifecycle/{action}` for the active provider-ops compatibility path; `cancel` delegates to the real admin cancel flow, `refund` now voids open bets with reservation release, and `settle` now supports truthful manual single-bet settlement for open bets while multi-leg/parlay settlement remains explicitly unsupported
- Bet schema alignment: migration `039_add_cancelled_to_bet_status.sql` adds the missing `cancelled` enum values for sportsbook bet tables so the delivered admin cancel path matches the shipped schema, and the repo no longer compares bet-leg status against a nonexistent `matched` enum value
- Prediction bot auth parity: `phoenix-prediction` now exposes persisted admin bot-key issuance via `POST /v1/bot/keys` and `POST /api/v1/bot/keys`
- Reporting/admin export parity: `phoenix-analytics` now exposes `GET /admin/punters/{userID}/transactions/export`, `POST /admin/punters/exclusions/export`, `POST /admin/reports/daily`, and `GET /admin/reports/daily/repeat`
- Risk-summary analytics parity: `phoenix-analytics` now also exposes `GET /admin/promotions/usage`, `GET /admin/wallet/corrections/tasks`, `GET /admin/risk/player-scores`, and `GET /admin/risk/segments`
- Provider-ops triage parity: `phoenix-analytics` now also exposes `GET /admin/feed-health`, `GET|POST /admin/provider/acknowledgements`, and `GET|POST /admin/provider/acknowledgement-sla` with persisted acknowledgement/SLA storage
- Provider-ops manual cancel compatibility: `phoenix-wallet` now also exposes `POST /admin/provider/cancel` for `admin` / `operator` / `trader`, resolving Talon `requestId` values against provider-backed wallet transactions and applying a real `CANCELLED` transition when the request still maps to a cancellable payment transaction; narrow provider-ops audit rows now emit `provider.cancel.succeeded` and best-effort `provider.cancel.failed` actions
- Cashier provider-reference admin depth: `phoenix-wallet` now supports direct admin event-history lookup by provider reference in addition to transaction detail lookup
- Cashier provider-detail depth: `phoenix-wallet` transaction detail now exposes `provider_updated_at` and persisted provider metadata, and admin users can preview reconciliation effects before mutating provider transactions
- Cashier review assignment depth: `phoenix-wallet` admin payment queue, summary, and reconciliation reads now accept `assigned_to`, and payment review items can be assigned/noted by transaction ID or provider reference
- Cashier export depth: `phoenix-wallet` now exposes `GET /admin/payments/transactions/export` so cashier-review queues can be exported as CSV using the same server-side filters as the on-screen queue
- Player wallet-history hardening: `phoenix-wallet` list-transactions runtime bug is fixed, player transaction history now supports `product` filtering, and transaction list responses now expose derived `product` for the migrated Go frontend path
- Responsibility-check trigger parity: `phoenix-user` profile and current-session responses now expose `has_to_accept_responsibility_check` / `hasToAcceptResponsibilityCheck` so the player frontend can show the deposit-threshold modal only when required
- Player geolocation and win/loss hardening: the migrated player frontend now uses the Go compliance client for GeoComply license/packet calls, and the win/loss page now uses Go betting filters for status plus `start_date` / `end_date` while correctly treating `matched` bets as open in the UI
- Player demo-critical test refresh: transaction-history, win/loss, session-timer, and deposit-threshold tests were rewritten around current Go-based contracts instead of legacy `useApi` assumptions, and the package-scoped Node 20 Jest batch for those four paths is green

## Validation Status

- Service-level `go test ./...` coverage is green for the implemented services.
- Gateway integration coverage is green.
- Compose-backed integration currently validates live flows across:
  - gateway
  - user
  - wallet
  - events
  - market-engine
  - betting-engine
  - social
  - compliance
  - analytics
  - settlement
  - notification
  - cms
  - stella-engagement
  - prediction
- Compose-backed resilience coverage is green for:
  - gateway auth rate-limit exhaustion and recovery after Redis reset
  - downstream social-service outage and gateway recovery
- Compose-backed failure-path coverage is green for:
  - settlement validation failures without invalid batch persistence
  - reconciliation permission failures without invalid reconciliation persistence
  - reconciliation requests for missing batches without invalid reconciliation persistence
  - manual payout requests for missing users without invalid payout or wallet transaction persistence
  - wallet outage during bet placement without invalid bet persistence
  - wallet outage during cashout without invalid cashout persistence
  - settlement transaction rollback when a later wallet dependency fails inside a batch

### Wave M21
- reporting/admin export parity landed in `phoenix-analytics`
- Go admin plane now covers punter transaction CSV export, excluded-punter export, and daily report generation/repeat endpoints
  - settlement rollback when a later bet would drive a wallet negative inside a batch
  - settlement rollback when a later bet carries an invalid reservation id inside a batch
  - settlement rollback when a later bet has already had part of its reservation released before batch settlement
  - withdrawal blocked by reserved funds without invalid withdrawal persistence
  - missing-user deposits without invalid wallet persistence
  - invalid release-reserve requests without invalid wallet release persistence
  - full reservation release without duplicate release persistence on exhausted reservations
  - over-reserve requests without extra reserve event persistence
  - outbox retry and publish recovery through `phoenix-common/pkg/outbox`
  - outbox backlog and retry growth across multiple unpublished rows
- Docker build verification is green for:
  - all 19 service images
  - `phoenix-outbox-worker`
- Kubernetes overlays are present for:
  - local
  - staging
  - production
- Kubernetes overlay render validation is green for:
  - local
  - staging
  - production

## Important Completed Milestones

- Shared PostgreSQL migration chain expanded through:
  - `011_create_social.sql`
  - `012_create_compliance.sql`
  - `013_create_analytics.sql`
  - `014_create_notifications.sql`
  - `015_create_settlement.sql`
  - `016_create_cms.sql`
  - `017_create_stella_engagement.sql`
- Shared outbox publishing pattern is in place via `phoenix-common/pkg/outbox`.
- Standalone outbox runtime is implemented via `phoenix-common/cmd/outbox-worker`.
- Gateway contract routing covers all currently implemented services.
- Prediction market schema is present via:
  - `018_create_prediction.sql`
- Support-notes schema is present via:
  - `019_create_support_notes.sql`
- Compose-backed validation covers both happy-path and resilience flows through the full implemented stack.
- Productionization assets now exist:
  - `.env.production.example`
  - `scripts/verify_docker_builds.sh`
  - `scripts/validate_k8s_overlays.sh`
  - `scripts/release/promote_overlay_tags.sh`
  - `deploy/k8s/base/*`
  - `deploy/k8s/overlays/*`
  - `docs/runbooks/*`
  - `.github/workflows/*`

## Current Productionization Position

The implementation phase is complete and the current productionization plan is
materially in place.

### Completed
- Wave A: failure and recovery coverage
- Wave B: outbox runtime extraction
- Wave C: productionization assets
- Wave D: deeper integration coverage (initial failure semantics pass)
- Wave E: deployment hardening baseline
- Wave F: operations and release baseline
- Wave G: expanded failure semantics for cashout rollback and outbox backpressure
- Wave H: release automation scaffolding defined
- Wave I: executable local release rehearsal passed and artifact was archived
- Wave J: deeper cashout compensation-branch coverage added in betting service tests
- Wave J2: settlement not-found rollback coverage and loss-side cashout reversal coverage added
- Wave J3: wallet missing-user and invalid release guardrail coverage added
- Wave J4: settlement rollback coverage added for later-bet negative-balance failure inside a batch
- Wave J5: settlement now validates reservation ledger state and rolls back cleanly on invalid later-bet reservation ids
- Wave J6: wallet reservation ledger idempotency coverage added for full release plus exhausted-reservation guardrails
- Wave J7: partial-reservation settlement rollback and over-reserve wallet guardrails added to compose coverage
- Wave L: full-capability demo environment (Docker Compose, single-VM, all 18 core backend services + frontend + infra)
- Wave M1: `phoenix-prediction` service implemented and gateway/demo integration in progress
- Wave M2: initial Go admin plane delivered for `/admin/users`, `/admin/bets`, `/admin/markets`, and prediction admin routes
- Wave M3: `phoenix-audit` service delivered with `GET /admin/audit-logs` plus audit emission from market and prediction admin mutations
- Wave M4: `phoenix-support-notes` service delivered with `/admin/users/{id}/notes` and `/admin/punters/{id}/notes` plus transactional audit emission
- Wave M5: `phoenix-config` service delivered with `POST /admin/upload-terms`, `GET /admin/terms/current`, and public `GET /api/v1/terms/current`
- Wave M6: `phoenix-user` parity slice delivered with `GET /punters/current-session`, `PUT /terms/accept`, `GET /profile/me`, `PUT /profile`, login session metadata, and persistent user session / terms-acceptance storage
- Wave M7: `phoenix-user` device/session slice delivered with persistent `device_id` and `device_fingerprint` capture in `user_sessions` and `GET /punters/current-session`
- Wave M8: `phoenix-compliance` GeoComply compatibility slice delivered with `GET /geo-comply/license-key`, `POST /geo-comply/geo-packet`, and `/api/v1/geo-comply/*` aliases
- Wave M9: `phoenix-betting-engine` geolocation enforcement slice delivered with configurable `X-Geolocation` validation backed by `phoenix-compliance`
- Wave M10: `phoenix-betting-engine` precheck slice delivered with `POST /api/v1/bets/precheck` for batch single-bet validation before placement
- Wave M11: `phoenix-betting-engine` batch bet-status slice delivered with `POST /api/v1/bets/status` and `POST /punters/bets/status`
- Wave M12: `phoenix-retention` promo slice delivered with free bets and odds boosts (`GET /api/v1/freebets`, `GET /api/v1/freebets/{id}`, `GET /api/v1/odds-boosts`, `GET /api/v1/odds-boosts/{id}`, `POST /api/v1/odds-boosts/{id}/accept`)
- Wave M13: `phoenix-events` stats-centre slice delivered with `GET /api/v1/stats/fixtures/{fixtureID}` backed by event metadata and live-score/result fallbacks
- Wave M14: `phoenix-betting-engine` advanced-betting slice delivered with persisted `bet builder` and `fixed exotics` quote/get/accept flows
- Wave M15: `phoenix-gateway` sportsbook websocket slice delivered with `GET /api/v1/ws/web-socket` and frontend-compatible `market`, `fixture`, `bets`, and `wallets` channels
- Wave M16: `phoenix-events` provider/trading slice delivered with `POST /api/v1/providers/events/upsert`, `/admin/fixtures`, `/admin/fixtures/{id}`, `/admin/fixtures/{id}/status`, and `/admin/tournaments`
- Wave M17: first real supplier adapter slice delivered with `POST /api/v1/providers/mockdata/events/sync` in `phoenix-events` and `POST /api/v1/providers/mockdata/markets/sync` in `phoenix-market-engine`
- Wave M18: provider-specific Oddin adapter shape delivered with `POST /api/v1/providers/oddin/events/sync` in `phoenix-events` and `POST /api/v1/providers/oddin/markets/sync` in `phoenix-market-engine`
- Wave M19: provider-specific Betgenius adapter shape delivered with `POST /api/v1/providers/betgenius/events/sync` in `phoenix-events` and `POST /api/v1/providers/betgenius/markets/sync` in `phoenix-market-engine`
- Wave M20: `phoenix-prediction` bot-auth slice delivered with persisted admin bot-key issuance, audit emission, and gateway routing for `POST /v1/bot/keys` and `POST /api/v1/bot/keys`
- Wave M21: `phoenix-analytics` reporting/admin export slice delivered with punter transaction CSV export, excluded-punter export, and daily report generation/repeat endpoints
- Wave M22: `phoenix-user` verification review export slice delivered with `flow_type` / `status` queue filtering and `GET /admin/providers/idcomply/verification-sessions/review-queue/export`
- Wave M23: player-hardening slice delivered with Go-backed transaction-history filters plus responsibility-check trigger wiring across `phoenix-wallet`, `phoenix-user`, and the migrated player frontend
- Wave M24: player-hardening slice delivered with GeoComply frontend migration onto the Go compliance client and Go-backed win/loss filtering over `phoenix-betting-engine`
- Wave M25: player-hardening slice delivered with refreshed demo-critical frontend tests for transaction-history, win/loss, session-timer, and deposit-threshold flows
- Wave M26: Wave 4 realtime-core slice delivered with `phoenix-realtime`, Kafka-driven websocket fanout for market/fixture/bet/wallet domains, gateway websocket proxying behind `WEBSOCKET_REALTIME_PROXY_ENABLED`, and settlement-emitted `phoenix.bet.settled` events
- Wave M27: seeded realtime rehearsal path delivered with `phoenix-realtime/cmd/rehearsal` plus `scripts/realtime-rehearsal.sh`, covering deterministic gateway-websocket validation for `market`, `fixture`, `bets`, and `wallets`
- Wave M28: deterministic Wave 5 provider-rehearsal tooling delivered via `scripts/payment-provider-simulator.sh`, `scripts/verification-provider-simulator.sh`, and expanded ops-case seeding in `scripts/demo-seed.sh`
- Wave M29: live Wave 5 rehearsal evidence captured on the running Go stack, with green cashier/provider and verification/provider artifacts plus runtime fixes for callback routing, provider-reference lookup casting, nullable assignee scans, provider-only seed idempotency, and `PENDING_APPROVAL` cashier review normalization
- Wave M30: investor-demo runtime gained configurable frontend ports plus host-run player/Talon fallback scripts, removing `${HOME}/.npmrc` as a hard local rehearsal blocker; player local production build/start was also repaired via targeted frontend TypeScript fixes in the migrated branch
- Wave M31: investor-demo host fallback was hardened further: frontend host mode now defaults to Node `20.20.0`, Talon host launch repairs the incompatible `next`/`http-errors`/`statuses` dependency chain locally, launcher build/start now call the repo-local Next CLI directly, and Talon `packages/office/next.config.js` now gates `I18NextHMRPlugin` to dev-only; remaining local blocker is Talon production build completion because `packages/office/.next/BUILD_ID` is still not being emitted
- Wave M32: `phoenix-audit` audit/export slice delivered with `GET /admin/audit-logs/export`, sharing the same filters and authorization semantics as `GET /admin/audit-logs` while returning CSV for Talon/reporting workflows
- Wave M33: `phoenix-analytics` risk-summary slice delivered with `GET /admin/wallet/corrections/tasks`, `GET /admin/risk/player-scores`, and `GET /admin/risk/segments` for Talon
- Wave M34: truthful promo-usage slice delivered with bet-level promo linkage on `bets` plus `GET /admin/promotions/usage` in `phoenix-analytics`
- Wave M35: provider-ops triage slice delivered with derived `GET /admin/feed-health` plus persisted stream acknowledgements and acknowledgement SLA settings in `phoenix-analytics`
- Wave M36: verification review decision slice delivered with `POST /admin/users/verification-sessions/{sessionID}/decision`, enabling admin/operator/trader human review actions over the existing `phoenix-user` decision normalization path without widening provider-only callback endpoints
- Wave M37: M2 users list contract completion delivered in `phoenix-user`:
  - `AdminUserSummary` response now includes `first_name`, `last_name`, `date_of_birth` (ISO string) — populating Talon users list name columns
  - Handler now parses Talon nested query params (`filter.punterId`, `filter.username`, `filter.firstName`, `filter.lastName`, `filter.dateOfBirth`, `pagination.currentPage`, `pagination.itemsPerPage`) alongside existing flat params; param prefix corrected from `query.filter.*` to `filter.*` in Wave M39 after live Playwright trace revealed actual qs.stringify output
  - Repository now supports individual column filters: `UserID` (exact), `Username` (ILIKE), `FirstName` (ILIKE), `LastName` (ILIKE), `DateOfBirth` (exact date match)
  - Focused handler tests added for Talon nested query parsing, flat param preservation, and enriched response verification
  - Service tests added for enriched field mapping, filter correctness (username, firstName, lastName, dateOfBirth, userID), authorization rejection, and pagination
  - Known remaining follow-up: ~~Talon `renderDateOfBirth` expects `{day, month, year}` object but Go returns ISO date string~~ — **CLOSED** in Wave M38
- Wave M38: Talon DOB normalizer delivered in `usersSlice.ts`:
  - `normalizeGoUser` now converts Go `date_of_birth` ISO string (e.g., `"1990-03-15T00:00:00Z"`) into `{ year: 1990, month: 3, day: 15 }` using timezone-safe string parsing (regex on date portion, no `new Date()` drift)
  - Existing camelCase `dateOfBirth` objects pass through unchanged
  - Missing or unparseable DOB safely returns `undefined` (renders as `"-"`)
  - 10 focused unit tests added in `usersSlice.test.ts`; TypeScript clean; 26/26 userDetailsContainer regression green
  - **Milestone 2 exit gate is now fully met** — all mounted Talon surfaces are backed by Go with no dead or semantically false controls
- Wave M39: M2 closure smoke — param name correction and live Playwright validation (see earlier entry)
- Wave M40: M3-S1 market status lifecycle — suspend/reopen:
  - Backend: `phoenix-market-engine` `UpdateStatus` now enforces a state machine via `isValidTransition()` — terminal states (closed, voided, settled) cannot transition; open↔suspended allowed; idempotent same-state transitions allowed
  - Backend: invalid transitions return clear `ErrInvalidInput` with descriptive message (e.g., `cannot transition market from "closed" to "open"`)
  - Backend: 13 state machine transition tests added covering valid, invalid, and terminal cases
  - Frontend: market-specific `MarketLifecycleSuspend` component created using `PUT admin/markets/:id/status` instead of the shared `LifecycleSuspend` POST component — avoids regressing other domains
  - Frontend: `canSuspend` visibility logic tightened from disallow-only-CANCELLED to allow-only-BETTABLE/NOT_BETTABLE — prevents showing suspend on settled/closed/unknown markets
  - Frontend: market detail container ungated for suspend/reopen only; settle/cancel/edit/history remain gated
  - Live Playwright evidence: suspend BETTABLE→NOT_BETTABLE and reopen NOT_BETTABLE→BETTABLE both work; SETTLED market correctly hides the button; network trace confirms `PUT /admin/markets/:id/status` with correct body
- Wave M41: M3-S1 correctness follow-up — atomic transitions + role-aligned visibility:
  - Backend: transition validation moved from service pre-read into repository transaction via `validateTransition` callback — eliminates race window between read and update
  - Backend: `UpdateStatus` interface now accepts `func(from, to string) error` validator called inside tx; `ErrInvalidTransition` propagated as `ErrInvalidInput` for 400 responses
  - Frontend: suspend/reopen button now gated by `canMutateMarketStatus` role check (operator + admin only) — trader can view market detail but does not see mutation controls
  - Frontend: uses same `resolveToken` + `validateAndCheckEligibility` pattern as prediction-ops
  - M3-S1 correctness nearly closed; remaining fix: `loadMarket` inside `UpdateStatus` tx used unlocked `SELECT` — concurrent tx could still modify status between read and write
- Wave M42: M3-S1 final atomicity fix:
  - Repository `UpdateStatus` now uses `SELECT status FROM markets WHERE id = $1 FOR UPDATE` to lock the row before transition validation
  - The unlocked `loadMarket` call was replaced with an explicit locked status read; `loadMarket` is still used for the post-update reload (row already locked)
  - Live smoke verified: suspend/reopen works, closed→open correctly rejected with 400
  - **M3-S1 is now fully closed** — row-level lock eliminates the last race window
- Wave M43: M3-S2 single-winner market settle:
  - Backend: `SettleMarket` repo now uses `SELECT status FROM markets WHERE id = $1 FOR UPDATE` — atomic settlement with row lock
  - Backend: state validation rejects settlement from terminal states (settled, voided, closed); only open/suspended → settled allowed
  - Backend: `SettleMarketRequest` now includes optional `reason` field; reason propagated to Kafka event and audit log
  - Backend: 6 settle tests added (open→settled, suspended→settled, already-settled rejected, voided rejected, closed rejected, missing outcome rejected)
  - Frontend: new `GoMarketSettle` component using `POST admin/markets/:id/settle` with single-select outcome picker (NOT multi-select), reason field, and `winning_outcome_id` field mapping
  - Frontend: settle button visible only for BETTABLE markets and operator/admin roles; hidden after settlement
  - Frontend: no resettle path exposed; legacy multi-winner settle modal NOT used
  - Live Playwright evidence: settle modal → single outcome select → confirm → BETTABLE→SETTLED; network trace confirms `POST /admin/markets/:id/settle` with 202 response; no settle/suspend buttons shown on settled market
- Wave M44: M3-S2 correctness follow-up:
  - Handler `SettleMarket` now decodes `reason` field from request body and passes it through `decodeSettleRequest` to the service layer
  - 5 handler-level tests added for `decodeSettleRequest`: reason propagation, whitespace trimming, valid/invalid `settled_at`, empty outcome passthrough
  - `SERVICE_CONTRACTS.md` corrected: removed false `Calls: phoenix-settlement, phoenix-notification`; replaced with truthful side-effects description (market/outcome state change, audit, Kafka event, no payout trigger)
  - Added `reason` field and `admin` role to the settle contract in `SERVICE_CONTRACTS.md`
  - **M3-S2 is now fully closed**
- Wave M45: M3-S4 multi-leg settle UI guard:
  - Provider-ops bet intervention form now detects multi-leg bets via debounced `GET /admin/bets/:id` lookup when operator enters a bet ID
  - Settle action is disabled in the dropdown for multi-leg bets with label "(multi-leg not supported)"
  - If settle was already selected when multi-leg is detected, action auto-switches to cancel
  - Cancel and refund remain available for all bet types
  - No backend changes — backend already rejects multi-leg settle with `400: "manual settlement only supports single bets"`
  - Frontend-only fix closes the M3 exit gate: no exposed admin mutation remains with intentionally unsupported semantics
  - TypeScript clean; 26/26 provider-ops tests green
- Wave M39: M2 closure smoke — param name correction and live Playwright validation:
  - Handler param prefix corrected from `query.filter.*` / `query.pagination.*` to `filter.*` / `pagination.*` (matching actual Talon `qs.stringify({allowDots:true})` output)
  - Handler tests updated to use correct param names
  - phoenix-user rebuilt and deployed to running stack
  - Live Talon browser smoke via Playwright: login → `/users/` → all columns (username, firstName, lastName, DOB) render truthfully → username filter returns exactly 1 matching user → 0 console errors
  - Gotcha logged: always verify actual network request shapes via browser trace, not by reading code and guessing serialization output
  - **Milestone 2 is now closed with live browser evidence**

## Demo Environment

A single-VM investor-demo deployment is now being hardened via Docker Compose:

- Canonical board: `INVESTOR_DEMO_READINESS_BOARD.md`
- Canonical runbook: `docs/runbooks/investor-demo-setup.md`
- Compose overlay: `docker-compose.demo.yml` (adds the real player frontend, real Talon backoffice, all implemented Go services, `phoenix-outbox-worker`, and `migrate` to the base infra)
- Env template: `.env.demo`
- Bootstrap: `scripts/demo-bootstrap.sh` (build, start, migrate, seed, warmup)
- Warmup: `scripts/investor-demo-warmup.sh`
- Reset: `scripts/investor-demo-reset.sh`
- Smoke tests: `scripts/demo-smoke.sh` (player root, Talon root, gateway, direct health including `phoenix-realtime`, outbox)
- Local validation status: Target A smoke closure is complete. On 2026-03-17 a live local Go demo stack was rebuilt, reseeded, warmed, and revalidated with `scripts/demo-smoke.sh`, which passed 34/34 checks with `0` failures and `0` skips.
- Target A closure fixes in that live validation pass:
  - `phoenix-realtime`: demo compose now builds on the working `linux/arm64` path on Apple Silicon, and the runtime image now includes `wget` so the shipped `/health` check is truthful instead of permanently unhealthy
  - `phoenix-prediction`: removed the duplicate `/api/v1` mount that caused the service to panic-loop during demo bootstrap
  - `phoenix-gateway`: mounted `/api/v1/terms/current` on the public proxy path so warmup/smoke no longer fall through to JWT auth
  - responsibility-check schema repair: standardized `023_create_responsibility_checks.sql` to the current demo migration runner format and added `040_restore_responsibility_checks.sql` so support-note timeline reads no longer fail on a missing table
- Seeded realtime rehearsal: `scripts/realtime-rehearsal.sh` (logs in demo users, subscribes through gateway websocket, triggers one update per realtime domain, writes a markdown artifact)
- Seeded payment rehearsal: `scripts/payment-provider-simulator.sh` (reseeds provider-backed cashier cases, exercises callback plus admin-review flows, writes a markdown artifact)
- Seeded verification rehearsal: `scripts/verification-provider-simulator.sh` (reseeds IdComply-style review cases, exercises callback plus review flows, writes a markdown artifact)
- Latest live cashier rehearsal artifact: `docs/runbooks/artifacts/payment_provider_simulator_20260315_181314.md`
- Latest live verification rehearsal artifact: `docs/runbooks/artifacts/verification_provider_simulator_20260315_181123.md`
- Compose config validation: target is now 28 containers (5 infra + 1 migrate + 19 backend/runtime services + 2 frontends + 1 outbox worker)
- Minimum VM: 8 vCPU / 16 GB RAM / 150 GB SSD / Ubuntu 24.04 x86_64
- VM status: not yet cut over to the new investor-demo runtime
- Player frontend: real migrated frontend repo via `phoenix-player-web`
- Talon frontend: real `talon-backoffice` repo via `phoenix-talon-web`
- Legacy thin demo frontend: `phoenix-demo-web` (fallback only, no longer the target investor-demo runtime)
- Gateway websocket origin hardening now uses `WEBSOCKET_ALLOWED_ORIGINS`
- Gateway websocket routing can now proxy `/api/v1/ws/web-socket` to `phoenix-realtime` via `WEBSOCKET_REALTIME_PROXY_ENABLED`, with the old polling path retained as a temporary fallback
- Wallet admin payment routes now require explicit roles instead of JWT-only access
- Talon Wave 2 is now in progress in `talon-backoffice` with Go auth route normalization, Go role-aware session eligibility, Go refresh-payload compatibility, and users recent-activity preview normalization onto `/admin/punters/{id}/timeline`
- Talon users notes now align with Go `phoenix-support-notes` contracts, including flat `page` / `limit` query params, Go `note_text` request bodies, and nested support-note pagination normalization
- Talon `provider-ops` now includes a Go-backed verification review queue over `phoenix-user` admin routes, including queue filters, session detail, provider event history, assignment, and note actions
- Talon `provider-ops` now includes a Go-backed cashier review panel over `phoenix-wallet` admin routes, including payment queue filters, queue and reconciliation CSV exports, queue summary, reconciliation preview/mutation, transaction detail, event history, assignment, notes, and dedicated approve / decline / retry / settle / refund / reverse / chargeback actions
- Talon `risk-management-summary` now includes Go-backed analytics reporting and risk-summary actions over `phoenix-analytics`, including daily report generation/repeat, exclusion and per-user transaction CSV exports, truthful promo-usage reads, wallet correction task reads, player risk scores, risk segments, and provider-ops triage reads
- Talon user-wallet row actions remapped: legacy `admin/punters/{id}/transactions/{txId}/confirm` and `reject` now point to Go `admin/payments/transactions/{txId}/approve` and `decline` (shown only for PENDING + CHEQUE rows); per-user transaction export already compatible via `admin/punters/{userID}/transactions/export` → `phoenix-analytics`
- Talon user-wallet action truthfulness: approve/decline buttons now track actioned transaction IDs locally to prevent showing stale action buttons after Go's `legacyWalletStatus` mapping returns PROCESSING as PENDING; limitation: hard page reload still shows buttons because the Go compatibility mapping is backend-side
- Talon financial-summary tab now normalizes Go snake_case flat-decimal responses (`current_balance`, `opened_bets`, `product_breakdown.sportsbook.open_exposure`, etc.) to Talon's expected camelCase `{amount, currency}` shape; both Go and legacy formats accepted
- Talon per-user audit tab now normalizes Go snake_case audit rows (`actor_id`, `entity_type`, `entity_id`, `old_value`, `new_value`, `created_at`, `ip_address`) and Go pagination (`{page, limit, total}`) using the same normalization logic as the global audit page
- Talon user-details verified compatible without code changes: session-history, limits-history, cool-offs-history (Go returns camelCase + standard pagination matching existing Talon reducers)
- Talon bets-history tab verified compatible without code changes: `admin/punters/:id/bets` route, query shape (`pagination.currentPage`/`pagination.itemsPerPage`), response shape (camelCase `TalonBetHistoryResponse`), expanded leg fields (fixture/market/selection/sport/tournament), and cancel flow (`admin/bets/:id/cancel` with `cancellationReason`) all align with Go's Talon compatibility layer; no unsupported lifecycle actions (settle/refund) are exposed in the UI
- Talon per-user audit tab is now live: re-enabled in `activity-details` tab bar with `MonitorOutlined` icon, backed by `admin/punters/:id/logs` → `phoenix-audit`; reducer normalizes Go snake_case rows and `{page, limit, total}` pagination (from previous pass)
- Talon prediction-orders tab now aligned to Go: fixed query param from `punterId` to `user_id` (matching Go's `phoenix-prediction` filter), added Go snake_case→camelCase normalization in shared `normalizePredictionOrders` (`order_id`→`orderId`, `market_title`→`marketTitle`, `stake_usd`→`stakeUsd`, `placed_at`→`createdAt`, `total_count`→`totalCount`, etc.); settlement fields absent from Go render as `-` which is truthful
- Talon bets expanded-row key fix: nested leg table `rowKey` now uses `nestedRecord.id` (the actual leg field) instead of `nestedRecord.betId` (which was undefined on leg objects)
- Talon Target A mounted-surface closure: all 8 mounted user-details activity tabs (betsHistory, walletHistory, predictionOrders, sessionHistory, notes, limitsHistory, coolOffsHistory, auditLogs) now verified truthful against Go; `userDetailsContainer` test suite is 26/26 green including prediction-orders tab test (previously failing due to missing auth mock)
- Talon app-wide Target A closure pass:
  - Users list: route fixed from `admin/punters` to `admin/users` (Go wildcard route); reducer now normalizes Go snake_case `{user_id, created_at}` and Go pagination `{pagination: {page, limit, total}}`; recent-activities route fixed from `admin/punters/:id/recent-activities` to `admin/punters/:id/timeline`
  - Terms: GET route fixed from `terms` to `admin/terms/current` (Go gateway exact-match route); upload route `admin/upload-terms` was already correct
  - Trading surfaces fully gated: fixtures, markets, market-categories, fixed-exotics removed from sidebar navigation; deep links from user bets expanded row (fixture name, market name) converted from `<Link>` to plain `<span>` text to eliminate the last reachable in-app navigation path into broken trading detail pages; Go backends exist at `/admin/fixtures` and `/admin/markets` but Talon containers use incompatible `admin/trading/` prefix and expect camelCase while Go returns snake_case; pages remain as code but are unreachable via any normal mounted UI path
  - Remaining mounted surfaces verified without changes: risk-management summary (all Go analytics routes exist), provider-ops (already verified), prediction-ops (already verified), global audit logs (already verified), auth/login (Wave 2 aligned), root redirect (no API), not-authorized (static)
  - Users list limitation: Go `ListAdminUsers` returns summary fields (`user_id`, `email`, `username`, `status`) but not `firstName`, `lastName`, `dateOfBirth`; those table columns will be empty until Go adds full user detail to the list response
- Talon Target B trading surface restoration pass:
  - Fixtures list: RESTORED — route fixed from `admin/trading/fixtures` to `admin/fixtures`; reducer normalizes Go snake_case Event (`event_id`→`fixtureId`, `name`→`fixtureName`, `home_team`/`away_team`→`competitors[]`, `live_score`→`score`, `scheduled_start`→`startTime`) and Go pagination (`page`/`limit`/`total`→`currentPage`/`itemsPerPage`/`totalCount`); fixture detail drill-down removed (detail page still gated); re-added to sidebar navigation
  - Fixture detail: GATED — Go fixture response does not embed markets (page's primary content is the markets/selections list); lifecycle actions (`freeze`/`unfreeze` via `admin/trading/fixtures/:id/lifecycle/:action`) not compatible with Go's `PUT /admin/fixtures/{id}/status` which only accepts `scheduled`/`postponed`/`cancelled`; edit (rename) has no Go endpoint
  - Markets list: RESTORED — route fixed from `admin/trading/markets` to `admin/markets`; reducer normalizes Go snake_case market (`market_id`→`marketId`, `market_type`→`marketName`, `outcomes[]`→`selectionOdds[]`, `status`→`currentLifecycle.type` via status-to-lifecycle mapping, `total_matched`→`exposure`); re-added to sidebar navigation
  - Market detail: RESTORED (read-only) — route fixed from `admin/trading/markets/:id` to `admin/markets/:id`; normalizer same as list; lifecycle actions (suspend/settle/cancel), edit (rename), fixture details link, and history drawer all gated because Go uses different routes/methods/payloads (`PUT /admin/markets/{id}/status` vs Talon's `POST admin/trading/markets/:id/lifecycle/:action`)
  - Market categories: GATED — no Go gateway route (`admin/trading/markets/categories/:id` and `admin/trading/markets/visibility/change` have no Go equivalents)
  - Fixed exotics: GATED — no Go gateway route for `admin/exotics/fixed/quotes`
  - User bets market link re-enabled: market name in user bets expanded row restored from plain text back to `<Link>` targeting the now-restored market detail page; fixture name remains plain text (fixture detail still gated)
  - Fixtures list known gap: `marketsTotalCount` column will show 0 — Go fixture list does not return market counts
  - Markets list known gap: `score` and `competitors` columns will show defaults — Go market list does not return fixture score/competitor data
- Target A re-closure (trading truthfulness fixes):
  - Market `settled` status mapping fixed: Go `SettleMarket` sets status to literal `"settled"` (not `"closed"`); added `case "settled": return "SETTLED"` to `mapGoStatusToLifecycle` in both `marketsSlice.ts` and `marketsDetailsSlice.ts`; `closed` also retained as `SETTLED` fallback
  - Fixture status mapping added: Go fixture statuses (`scheduled`/`live`/`completed`/`cancelled`/`postponed`/`abandoned`) now map to Talon `FixtureStatusEnum` values (`PRE_GAME`/`IN_PLAY`/`POST_GAME`/`GAME_ABANDONED`/`UNKNOWN`) via `mapGoFixtureStatus` in `fixturesSlice.ts`; previously all Go fixture statuses fell through to `UNKNOWN`
  - Fixture status color rendering note: `resolveFixtureStatusColor` has a pre-existing key mismatch between `FixtureStatusEnum` keys and `TalonFixtureStatusColor` keys; this is a pre-existing Talon bug unrelated to Go alignment and degrades gracefully to gray/UNKNOWN
  - Jest config note: focused test suite `userDetailsContainer.test.tsx` passes 26/26 when run with `--config packages/office/jest.config.js`; bare `npx jest` uses root config which lacks TS transform
- Demo seed script: `scripts/demo-seed.sh`
- Demo credentials:
  - player: `demoplayer / Password123!`
  - admin: `demoadmin / Password123!`

## Next Wave

### Wave M: Backend Parity and Frontend Migration
- Current restart handoff:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/SESSION_HANDOFF_2026-03-13.md`
- Backend parity execution plan:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/BACKEND_PARITY_EXECUTION_PLAN.md`
- Frontend migration execution plan:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/FRONTEND_GO_MIGRATION_PLAN.md`
- Current backend parity status:
  - `phoenix-prediction` player/admin core flows exist in Go
  - initial Go admin plane exists for users, bets, markets, prediction ops, audit-log query, support notes, and terms/config
  - `phoenix-user` now covers current-session, MFA verification, password lifecycle, and account deletion workflows
  - `phoenix-compliance` now covers legacy RG aliases including limits history, cool-off history, and GeoComply compatibility routes
  - `phoenix-betting-engine` now covers batch bet-status polling used by the rebuilt betslip
  - `phoenix-gateway` now covers sportsbook websocket compatibility for market, fixture, bet, and wallet updates
  - `phoenix-events` now covers provider upsert, mockdata batch sync, oddin batch sync, betgenius batch sync, and admin fixtures/tournaments read models for the trading surface
  - `phoenix-market-engine` now covers mockdata, oddin, and betgenius market sync with provider `external_id` tracking
  - `phoenix-wallet` now includes a dedicated admin settle action for provider transactions in addition to status/review/refund/reversal/chargeback workflows
  - `phoenix-user` now includes direct admin verification-session detail reads in addition to user-level verification-session lists and provider-event history
  - `phoenix-prediction` now covers legacy bot-key issuance for admin-operated prediction automation
  - remaining largest backend gaps are full third-party identity-provider depth beyond the delivered IdComply-compatible seam, richer reporting families beyond the first export slice, provider-backed geolocation/jurisdiction depth, and deeper push-fidelity / supplier-specific automation behind the websocket compatibility layer
- Frontend reconciliation matrix (2026-03-12):
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/FRONTEND_RECONCILIATION_MATRIX.md`
  - 32 previously disabled features assessed — all 32 confirmed re-enableable against current Go backend
  - use with caution: this is stale relative to newer backend slices and the latest frontend branch state
- Frontend re-enablement pass (2026-03-12):
  - Branch `feature/go-backend-migration` updated with 32 re-enabled features
  - New Go API client modules: compliance, terms, verification, retention
  - Betslip: precheck, batch status, freebets, odds boosts re-enabled
  - RG: deposit/stake/session limits, cool-off, self-exclude, RG history, session timer, deposit threshold
  - Auth: MFA login modal, registration phone verification (step 3 restored to 4-step flow), MFA toggle
  - Identity: KBA questions, IDPV status polling
  - Compliance: terms acceptance modal, terms page, terms version display
  - Prediction: already fully wired via BFF proxy layer — no changes needed
  - this frontend report predates later backend additions; the current corrective next step is to reconcile disabled/stubbed frontend features against the current Go backend and re-enable what is now unblocked

### Wave G2: Additional Failure Semantics
- Extend integration coverage for:
  - additional wallet/betting partial-failure handling beyond place-bet and cashout
  - deeper settlement rollback edge cases beyond the current transaction rollback case

### Wave H: Release Automation Adoption
- Execute image publish/versioning automation in the real repo pipeline
- Execute CI validation for overlay rendering in the real repo pipeline
- Execute release promotion workflow expectations in the real repo pipeline

### Wave I: Operational Rehearsal
- Promote the local rehearsal to staged-cluster rehearsal
- Capture incident drill outcomes
- Close gaps found during rehearsal

### Wave K: CRM and Loyalty Productization Backlog
- Add loyalty tiers and VIP modeling
- Add saved audiences and segment definitions
- Add campaign execution and lifecycle orchestration
- Add CRM automation and operator workflows
- Add notification scheduling and quiet-hours enforcement
- Source of truth:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/CRM_LOYALTY_GAP_ANALYSIS.md`

### Most Recent Verified Artifact
- Local release rehearsal:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/artifacts/local_release_rehearsal_20260310_114608.md`
- Scope covered:
  - overlay validation
  - compose-backed happy path
  - compose-backed failure/recovery path
  - outbox retry/recovery path

## Open Risks

- Multi-service integration coverage is broader now, but still not exhaustive on failure semantics.
- The standalone outbox worker exists, but service-local publisher disablement still needs to be enforced consistently during real deployment rollout.
- Overlay structure and runbooks exist, and CI/publish/promotion workflow scaffolding is now in place, but they still need staged rehearsal and eventual registry-integrated release adoption.
- The in-process compose integration harness can still hit transient free-port races during startup; the 2026-03-10 local rehearsal completed cleanly, but the harness should be hardened if transient startup collisions become frequent.
- A real staged-cluster rehearsal is still blocked on environment access, not code. Current blocker record:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/staging-rehearsal-status-2026-03-10.md`
