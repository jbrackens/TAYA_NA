# Investor Demo Readiness Board

This is the canonical execution document for the investor-demo push.

All other handoff notes, migration matrices, and runbooks are supporting artifacts.

Last updated: 2026-04-02

## Outcome

Deliver a private investor demo that uses:

- the real Go backend
- the real migrated player frontend
- the real Talon backoffice
- deterministic golden demo data
- deterministic provider simulators
- real push for core sportsbook domains

## Runtime Topology

- Player UI: `phoenix-player-web`
- Talon UI: `phoenix-talon-web`
- API gateway: `phoenix-gateway`
- Core realtime target: dedicated fan-out service, proxied behind the gateway websocket contract
- Current fallback: polling websocket compatibility in `phoenix-gateway`, behind a feature flag while Wave 4 hardening completes

## Current Program Decision

- Platform direction: stay on Go
- Demo strategy: pivot away from `phoenix-demo-web`
- Demo access model: private only
- Demo infra target: hardened single VM
- Provider strategy: deterministic simulators for demo-critical flows
- Talon strategy: reuse existing `talon-backoffice`
- Talon execution order: ops-first strict waves

## Wave Board

### Wave 0 - Control Plane

Status: COMPLETE

Exit criteria:

- canonical readiness board exists and is referenced from repo entry docs
- investor-demo runbook supersedes thin public demo runbook
- runtime, frontend, backend, Talon, and test priorities are aligned in one place

Evidence:

- [INVESTOR_DEMO_READINESS_BOARD.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/INVESTOR_DEMO_READINESS_BOARD.md)
- [investor-demo setup runbook](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/investor-demo-setup.md)

Open blockers:

- none

### Wave 1 - Access and Runtime

Status: IN_PROGRESS

Exit criteria:

- player frontend is containerized and present in demo compose
- Talon frontend is present in demo compose
- `phoenix-demo-web` is no longer the primary investor-demo UI
- player and Talon are exposed as separate private origins
- websocket origin policy is explicit, not permissive
- admin payment routes are explicitly role-gated
- one-command reset/warmup/smoke path exists

Evidence:

- [docker-compose.demo.yml](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docker-compose.demo.yml)
- [demo bootstrap](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/demo-bootstrap.sh)
- [investor-demo common env](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-common.sh)
- [host frontend start](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-frontends-start.sh)
- [host frontend stop](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-frontends-stop.sh)
- [investor demo warmup](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-warmup.sh)
- [investor demo reset](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-reset.sh)
- [gateway websocket handler](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-gateway/internal/handlers/websocket.go)
- [wallet server](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-wallet/cmd/server/main.go)
- [investor-demo setup runbook](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/investor-demo-setup.md)

Open blockers:

- demo VM still needs private DNS/origin cutover
- local investor-demo fallback no longer hard-blocks on `${HOME}/.npmrc`
- player host fallback is green on Node `20.20.0`
- combined host-run player+Talon runtime is validated including terminal-close survival:
  - Next/http-errors dependency drift is repaired at launcher time with a local `statuses@1.5.0` safeguard
  - launcher no longer depends on Yarn PATH for `next`; it calls the repo-local Next CLI directly
  - Talon `packages/office/next.config.js` now gates `I18NextHMRPlugin` to dev-only
  - `@babel/runtime` resolution added to root `package.json`; launcher removes nested `rc-upload/@babel/runtime@7.13.9` (missing `regeneratorRuntime` export) so webpack resolves to root `@babel/runtime@7.28.6`
  - Talon production build completes cleanly, emits `packages/office/.next/BUILD_ID`
  - launcher uses `perl -MPOSIX=setsid` exec chain so each Node process runs in its own session (PGID = own PID, session leader) and is unreachable by terminal-close SIGHUP — this was the root cause of the previous process-disappearance bug (Node.js/libuv overrides `nohup`'s SIG_IGN, so processes in the launcher's session died when the terminal closed)
  - validated through 2 full pty-exit cycles via `script -q /dev/null`: launcher starts both, pty exits, both processes survive with HTTP 200 at t=0/10/30s, logs clean, stop script works

### Wave 2 - Ops-First Talon

Status: IN_PROGRESS

Vertical order:

1. auth/session/access
2. users plus notes plus unified timeline
3. verification review
4. cashier queue/reconciliation/detail/actions
5. audit plus reports plus provider ops
6. trading/fixtures/markets and remaining Talon pages

Exit criteria:

- Talon authenticates against the Go backend
- ops-first Talon pages point at Go routes only
- cashier workflow includes approve, decline, retry, reconcile, refund, reverse, chargeback — all seven mutation actions now use confirmation modals with action-specific wording and reason capture (required for decline/refund/reverse/chargeback, optional for approve/retry/settle)
- verification review workflow includes queue, detail, assign, note, event history, export, and operator decision submission (approve/reject/escalate/questions via `POST /admin/users/verification-sessions/{sessionID}/decision`)
- audit logs page now uses Go-compatible query params (`actor_id`, `target_id`, `limit`, `sort_by`, `sort_dir`) and normalizes Go response rows (snake_case → camelCase) and pagination (`page`/`limit`/`total` → `currentPage`/`itemsPerPage`/`totalCount`)

Evidence:

- [talon-backoffice](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice)
- [office API route normalization](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/services/api/api-service.ts)
- [office auth utilities](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/utils/auth.ts)
- [users recent-activity slice](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/lib/slices/usersSlice.ts)
- [users details slice](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/lib/slices/usersDetailsSlice.ts)
- [recent-activity normalization helper](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/lib/utils/recent-activities.ts)
- [users notes container](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/containers/users/notes/index.tsx)
- [users notes add modal](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/components/users/notes/add/index.tsx)
- [support-notes normalization helper](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/lib/utils/support-notes.ts)
- [provider ops container](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/containers/provider-ops/index.tsx)
- [verification review panel](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/containers/provider-ops/verification-review.tsx)
- [cashier review panel](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/containers/provider-ops/cashier-review.tsx)
- [risk management summary](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/containers/risk-management-summary/index.tsx)
- [phoenix-analytics risk-summary handlers](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-analytics/internal/handlers/handlers.go)
- [phoenix-analytics risk-summary service](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-analytics/internal/service/service.go)
- [phoenix-analytics risk-summary repository](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-analytics/internal/repository/repository.go)

Open blockers:

- Talon user wallet page (`admin/punters/:id/transactions`) is verified compatible with Go — request serialization (qs dot-notation), response shape (`data` + `currentPage`/`itemsPerPage`/`totalCount`), and row fields all match without frontend changes
- known wallet-adjacent gaps: per-user export route (`admin/punters/:id/transactions/export`) and per-user confirm/reject routes (`admin/punters/:punterId/transactions/:transactionId/confirm|reject`) do not exist on Go yet — these affect only the export button and PENDING cheque inline actions, not the main wallet table
- Talon office Jest harness is now fixed for focused investor-demo test suites (was blocked by missing babel-jest transform config and module-resolver/Jest resolution conflict) — 22 of 24 suites pass (131 of 132 tests), with `prediction-ops` timing out (pre-existing) and `userDetailsContainer` having 1 pre-existing test-level failure
- existing Talon surfaces remain broadly coupled to the legacy API layer
- broader Talon route-by-route Go migration still remains outside the completed risk-summary, provider-ops, and users slices

### Wave 3 - Player Completion

Status: IN_PROGRESS

Exit criteria:

- GeoComply frontend path migrated off legacy `useApi`
- transaction history uses Go wallet client with filter support
- win/loss uses Go client path
- deposit-threshold regression removed
- critical stale `useApi` tests replaced for demo-critical paths

Evidence:

- [frontend repo](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg)
- [GeoComply service](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/geocomply/index.tsx)
- [transaction history page](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/pages/transaction-history/index.tsx)
- [win/loss page](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/pages/win-loss-statistics/index.tsx)
- [transaction history test](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/transaction-history-list/__tests__/transaction-history.test.tsx)
- [win/loss test](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/win-loss-statistics-list/__tests__/win-loss-statistics-list.test.tsx)
- [session timer test](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/auth/session-timer/__tests__/session-timer.tests.tsx)
- [deposit-threshold test](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/auth/deposit-threshold-modal/__tests__/deposit-threshold-modal.test.tsx)
- [wallet Go transforms](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/go-api/wallet/wallet-transforms.ts)
- [deposit-threshold modal](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/auth/deposit-threshold-modal/index.tsx)
- [wallet transaction list repository](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-wallet/internal/repository/repository.go)
- [user responsibility-check profile/session wiring](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-user/internal/service/service.go)

Open blockers:

- player package TypeScript noise blocking local production build has been cleared for the investor-demo host path, but wider repo cleanup still exists outside the touched demo-critical files
- repo-root frontend Jest harness is still noisy, but the package-scoped Node 20 Jest batch for transaction-history, win/loss, session-timer, and deposit-threshold is green

### Wave 4 - Realtime Core

Status: IN_PROGRESS (contract validated)

Scope:

- market updates
- fixture updates
- bet updates
- wallet updates

Exit criteria:

- dedicated realtime service exists
- realtime service consumes persisted Kafka/outbox events
- gateway websocket traffic can route to the realtime service
- polling websocket path remains available only as a temporary fallback
- investor-demo default runs on real push
- websocket contract validated against all 4 channel types

Evidence:

- [phoenix-realtime](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-realtime)
- [gateway websocket handler](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-gateway/internal/handlers/websocket.go)
- [gateway config](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-gateway/internal/config/config.go)
- [settlement repository](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-settlement/internal/repository/repository.go)
- [seeded realtime rehearsal](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/realtime-rehearsal.sh)
- [demo smoke](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/demo-smoke.sh)
- [investor-demo warmup](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-warmup.sh)
- [mock-server websocket handler (upgraded to Go contract shape)](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/mock-server/src/websocketHandlers/websocket.ts)
- [Playwright websocket contract tests](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/e2e/b4-websocket-contract.spec.ts)

Completed (2026-04-02):

- mock-server websocket handler upgraded to match Go gateway contract shape (subscribe/unsubscribe/heartbeat + market/fixture/bets/wallets channel types)
- Playwright websocket contract validation suite: heartbeat, subscribe/unsubscribe, market update shape, fixture update shape, wallets auth guard + update shape, bets auth guard + update shape, error handling for unsupported events/channels
- Talon build fixed (Phase A: Next.js 11→13.5.7 upgrade)
- Cashier state-aware gating (Phase B1: 7 payment buttons now disabled by transaction status)
- Fixture detail route restored (Phase B2: admin/trading/fixtures → admin/fixtures)

Open blockers:

- realtime propagation coverage still needs seeded rehearsal evidence against the live Go stack for market, fixture, bet, and wallet updates
- polling fallback is still the default until live Kafka-driven push is validated end-to-end

### Wave 5 - Demo Simulation and Rehearsal

Status: IN_PROGRESS

Exit criteria:

- deterministic payment simulator path exists for callback and admin-review scenarios
- deterministic verification simulator path exists for provider-style callbacks and review flows
- golden seed covers player, RG, cashier, verification, sportsbook, prediction, and backoffice stories
- reset/warmup/smoke passes repeatedly from a dirty environment
- investor story and operator story are rehearsed end to end

Evidence:

- [demo seed](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/demo-seed.sh)
- [demo smoke](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/demo-smoke.sh)
- [payment provider simulator](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/payment-provider-simulator.sh)
- [verification provider simulator](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/verification-provider-simulator.sh)
- [live cashier artifact 2026-03-15](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/artifacts/payment_provider_simulator_20260315_181314.md)
- [live verification artifact 2026-03-15](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/artifacts/verification_provider_simulator_20260315_181123.md)

Completed (2026-04-02):

- Talon backoffice builds cleanly on Node v25.8.2 after Phase A upgrade (Next.js 13.5.7, React 18.2, TS 5.3)
- 27/27 Playwright e2e tests green across all admin surfaces
- Phase B critical fixes applied (cashier gating, fixture route)

Open blockers:

- full investor-demo runtime still needs combined player+Talon-backed rehearsal evidence on the Go stack
- golden rehearsal pack still needs expansion around reset/recovery and combined player-plus-operator story sequencing

## Cross-Cutting Validation Bar

### Browser / E2E

- player login, wallet, browse, precheck, bet placement, history, prediction
- Talon login, user review, notes, timeline, verification queue/detail, cashier queue/detail/actions
- realtime propagation for market, fixture, bet, wallet
- reset/recovery walkthrough

### Integration / Component

- accept terms
- email confirmation
- registration step 3 phone verification
- deposit threshold
- IDPV polling failure paths
- prediction trade rail
- websocket subscription state transitions
- transaction history filters
- win/loss client path

### Backend / Service

- explicit auth/role tests for admin routes
- realtime fan-out contract tests
- provider simulator lifecycle tests
- seed/reset idempotency tests

## Known Risks

- using the wrong player frontend at demo time
- Talon pages appearing complete while still hitting legacy contracts
- polling websocket being mistaken for production-grade live behavior
- public/shared credentials leaking admin or operator functions
- VM rebuild depending on image builds instead of immutable artifacts
- seed pack not covering awkward ops states

## Supporting Documents

- [README.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/README.md)
- [IMPLEMENTATION_STATUS.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/IMPLEMENTATION_STATUS.md)
- [SESSION_HANDOFF_2026-03-13.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/SESSION_HANDOFF_2026-03-13.md)
- [frontend reconciliation matrix](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/FRONTEND_RECONCILIATION_MATRIX.md)
- [frontend dependency inventory](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/FRONTEND_API_DEPENDENCY_INVENTORY.md)
- [investor-demo setup runbook](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/investor-demo-setup.md)
- [legacy thin-demo note](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/demo-setup.md)
