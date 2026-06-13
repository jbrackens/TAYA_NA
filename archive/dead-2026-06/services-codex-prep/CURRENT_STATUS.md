# Phoenix Go Rebuild — Current Status

Last updated: 2026-04-02

## TL;DR

All 17 Go sportsbook services are implemented. Milestones 1-3 are complete. The Talon build blocker has been resolved (Next.js 11→13.5.7 upgrade), M3 live Playwright validation is green (27/27), and critical Phase B fixes are in progress. Prediction market work has been shelved for v2.

## Milestone Status

| Milestone | Status | Summary |
|---|---|---|
| M1 — Demo Smoke | COMPLETE | 34/34 demo smoke checks pass. Every demo route exists on Go. |
| M2 — Surface Parity | COMPLETE | All mounted Talon surfaces backed by Go routes (M37-M39). |
| M3 — Semantic Parity | COMPLETE | 27/27 Playwright tests green. All admin surfaces render, market mutations validated, multi-leg settle guard confirmed. |
| M4 — Production Polish | NOT STARTED | Production hardening, scale testing, monitoring. |

## Talon Build: RESOLVED

The `ERR_OSSL_EVP_UNSUPPORTED` blocker was fixed by upgrading the frontend stack (Next.js 11→13.5.7, React 17→18.2, TypeScript 4.3→5.3, next-i18next 6→14). Build produces 22 office routes + 30 app routes. See `talon-backoffice/PHASE_A_COMPLETE.md` for full details.

## Investor Demo Waves

| Wave | Status | What's Done |
|---|---|---|
| Wave 0 — Control Plane | COMPLETE | Readiness board, runbooks, aligned priorities |
| Wave 1 — Access & Runtime | IN PROGRESS | Player + Talon in demo compose, host fallback validated, websocket origin policy set. Remaining: private DNS/origin cutover. |
| Wave 2 — Ops-First Talon | IN PROGRESS | Auth, users/notes/timeline, verification review, cashier queue/actions, audit logs, risk summary, provider ops migrated. Remaining: broader Talon route-by-route migration. |
| Wave 3 — Player Completion | IN PROGRESS | GeoComply, transaction history, win/loss, deposit-threshold all on Go client. Tests green. Remaining: wider repo cleanup. |
| Wave 4 — Realtime Core | IN PROGRESS | phoenix-realtime service exists, gateway websocket handler wired. Remaining: end-to-end websocket validation, seeded rehearsal evidence. |
| Wave 5 — Demo Simulation | IN PROGRESS | Payment + verification provider simulators exist with live artifacts. Remaining: full player+Talon rehearsal, golden rehearsal pack. |

## Phase B: Critical Fixes (In Progress)

| Item | Status | Summary |
|---|---|---|
| B1 — Cashier state-aware gating | COMPLETE | 7 payment buttons now disabled/enabled based on transaction status via `ALLOWED_ACTIONS_BY_STATUS` map. |
| B2 — Fixture detail route fix | COMPLETE | Routes changed from `admin/trading/fixtures/:id` to `admin/fixtures/:id` (3 files: detail container, update container, lifecycle constants). |
| B3 — Doc cleanup / close M3 | COMPLETE | This document updated. M3 formally closed. |
| B4 — Wave 4/5 completion | NOT STARTED | Websocket validation, full demo rehearsal. |

## Next Actions (Priority Order)

1. **Prediction-ops backend state validation** — Add state transition matrix to `ExecuteLifecycle()`. Lower priority since UI is already truthful.

2. **Wave 4/5 completion** — End-to-end websocket validation, full investor demo rehearsal.

3. **M4 — Production Polish** — Production hardening, scale testing, monitoring.

## Known False Controls (Remaining)

| Surface | Severity | Mounted? |
|---|---|---|
| ~~Cashier review: 7 unconditional payment actions~~ | ~~CRITICAL~~ | FIXED (B1) |
| Prediction-ops: backend lacks state validation | MEDIUM-HIGH | Yes (UI gated correctly) |
| Market cancel: allows cancel on settled | LOW | No (gated in container) |
| ~~Fixture lifecycle: freeze/unfreeze~~ | ~~LOW~~ | FIXED (B2 — route restored) |

## Test Status (as of 2026-03-20)

| Test Suite | Result |
|---|---|
| `go test -race ./...` phoenix-betting-engine | GREEN |
| `go test -race ./...` phoenix-market-engine | GREEN |
| `go test -race ./...` phoenix-gateway | GREEN (4 packages) |
| Jest: provider-ops (contracts + component + verification-review) | 34/34 GREEN |
| TSC: talon-backoffice | CLEAN |
| Jest: Talon office suites | 22/24 pass (131/132 tests) |
| Jest: Player (package-scoped, Node 20) | GREEN for transaction-history, win/loss, session-timer, deposit-threshold |

## Reference

For the implementation plan to finish the rebuild, see `../../PLAN.md`.
For detailed service-by-service status, see `IMPLEMENTATION_STATUS.md`.
For wave-by-wave demo progress, see `INVESTOR_DEMO_READINESS_BOARD.md`.
For API contracts, see `SERVICE_CONTRACTS.md`.
For archived prediction platform work, see `../../archive/v2-prediction/`.
