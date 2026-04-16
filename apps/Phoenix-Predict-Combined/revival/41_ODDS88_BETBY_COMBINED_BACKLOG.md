# Odds88 + Betby Combined Build Backlog

Date: 2026-03-04

## 1) Purpose
This backlog combines:

1. `revival/38_ODDS88_GAP_ANALYSIS.md` (provider contract and protocol depth)
2. `revival/40_BETBY_GAP_ANALYSIS.md` (market maturity and product competitiveness)
3. `revival/39_SPORTSBOOK_MATURITY_GAP_ANALYSIS_FEED_AGNOSTIC.md` (provider-agnostic north star)

The result is a single, deduplicated list of **features and functionality still to build**.

Legend:

- `O` = Odds88-driven requirement
- `B` = Betby benchmark requirement
- `Both` = required by both analyses

## 2) Prioritized Backlog

| ID | Capability to Build | Driver | Priority | Acceptance Criteria |
|---|---|---|---|---|
| SB-001 | Canonical sportsbook domain schema (events/markets/selections/bets/settlements/translations) with versioning | Both | P0 | Versioned canonical model published; adapters consume/emit canonical events without provider-specific leakage into frontend APIs |
| SB-002 | Provider adapter interface + plugin boundary (`provider -> canonical`) | Both | P0 | New provider can be added behind adapter contract without changing sportsbook UI contracts |
| SB-003 | Revision checkpoint + deterministic replay engine | O | P0 | Feed consumers can restart from stored revision and replay to consistent state with zero duplicate side effects |
| SB-004 | Multi-feed websocket/stream connectors (delta, settlement, metadata, translations) | O | P0 | Separate connector channels implemented with reconnect/revision handling and health metrics per channel |
| SB-005 | Snapshot recovery pipeline (events/metadata/schema/translations) | O | P0 | Snapshot pull + stream catch-up fully restores state from empty/local reset |
| SB-006 | Feed reliability SLO layer (lag/gap/duplicate/replay dashboards + alerts) | Both | P0 | Alerting for lag/gap breaches and per-feed SLO dashboards available to ops |
| SB-007 | Provider rate-limit governance and adaptive throttling | O | P0 | API/feed request limits enforced with backoff + observable throttle behavior |
| SB-008 | Integration mode support (full integration / module / odds-feed style) | B | P1 | Runtime configuration supports at least two integration modes without code fork |
| SB-101 | Canonical bet placement envelope (playerId/requestId/device/segment/ip/precision/items) | O | P0 | Bet placement path validates full envelope and maps to canonical/internal model with idempotency |
| SB-102 | Odds-change policy engine + standardized reject reason taxonomy | O | P0 | Accept/reject odds-change behavior configurable; reject reasons stable and surfaced to UI/backoffice |
| SB-103 | Live time delay (LTD) policy engine for live bets | O | P0 | LTD rules enforced for singles/multis and auditable at bet level |
| SB-104 | Provider cancellation and retry/fallback semantics | O | P1 | Cancel paths behave deterministically with clear final states and retry safety |
| SB-105 | Max-bet/eligibility precheck endpoint in canonical contract | O | P1 | Precheck returns stake/limit outcome before placement and is used by betslip flow |
| SB-106 | Alternative odds offer lifecycle (offer/create/expire/accept/decline/reprice) | O | P1 | Alternative odds flow supported end-to-end with expiry handling and audit trail |
| SB-201 | Cashout end-to-end (pricing stream, quote TTL, accept/reject, settlement/wallet safety) | Both | P0 | Cashout quotes stream in real time, accept path is idempotent, and wallet/ledger reconciliation stays balanced |
| SB-202 | Bet Builder pricing service + combinability engine + placement support | Both | P0 | Builder bets can be composed, priced, placed, and settled through canonical bet lifecycle |
| SB-203 | Same Game Combo (including esports use cases) | B | P1 | Same-game combinations supported with validation rules and clear betslip UX feedback |
| SB-204 | Fixed Exotics (racing) pricing, encoding, placement, and settlement | O | P1 | Exotic selections priced/placed/settled with canonical representation and settlement correctness |
| SB-301 | Match Tracker module (frontend + feed integration) | B | P1 | Real-time tracker available on fixture pages and synchronized with market state |
| SB-302 | Stats Centre module (team/player/event stats) | B | P1 | Stats view available in pre-match/in-play flows with stable data contracts |
| SB-303 | Integrated live-stream betting flow | B | P1 | Live stream can be embedded with synchronized event/market context and safe fallback when unavailable |
| SB-304 | Promotions engine for Freebets lifecycle | B | P1 | Freebet grants, eligibility, stake application, and settlement accounting implemented end-to-end |
| SB-305 | Odds Boost campaign lifecycle | B | P1 | Boost creation, targeting, expiry, and bet application supported with audit/reporting |
| SB-306 | Widgetized sportsbook modules + layout presets | B | P2 | Widget modules (promo/live/outright/combo-like blocks) configurable by brand/layout without code changes |
| SB-401 | Deadheat + multi-result settlement model | O | P0 | Settlement supports deadheat/multi-winner outcomes without failure modes like `TooManyWinningSelections` |
| SB-402 | Resettlement conflict policy + idempotent reprocessing | O | P0 | Resettlement can be replayed safely with deterministic conflict resolution and full audit trail |
| SB-403 | Negative-balance and correction workflows | Both | P1 | Correction flows prevent ledger drift and surface manual intervention tasks to backoffice |
| SB-404 | Backoffice manual settlement and provider-ops controls | O | P1 | Backoffice can inspect/replay/correct feed and settlement issues with role-based controls |
| SB-405 | Provider operations cockpit (feed health, revision control, gap recovery actions) | Both | P1 | Ops users can view feed status and trigger guarded remediation actions from one console |
| SB-501 | Provider conformance suite (Odds88-style contract certification generalized) | O | P0 | Automated conformance tests pass for adapter contract and block regressions in CI |
| SB-502 | Canonical regression packs for core bet/wallet/settlement flows | Both | P0 | Regression pack covers all critical state transitions and is mandatory in merge gates |
| SB-503 | Chaos suite for reconnect/reorder/drop/duplicate scenarios | Both | P1 | Feed chaos scenarios executed in CI/pre-release with pass/fail thresholds |
| SB-504 | Performance and latency SLO gates by capability | Both | P1 | Explicit p95/p99 and throughput targets defined and enforced for placement/cashout/realtime paths |
| SB-601 | Personalized event/market ranking | B | P2 | Ranking service can personalize listing order based on player behavior and policy constraints |
| SB-602 | Personalized combo suggestions | B | P2 | Suggestion engine returns eligible combos with explainable feature flags |
| SB-603 | Churn/LTV scoring integration hooks | B | P2 | Scores available for CRM/backoffice actions with auditability and model versioning |
| SB-604 | Suspicious behavior + risk segmentation automation | B | P2 | Automated risk signals and segment tags feed trader/backoffice controls with override capability |

## 2.1) Closure Update (2026-03-05, pass A)

The following backlog items were closed in the Go gateway and Talon risk-management surface:

1. `SB-403`: wallet correction task workflow APIs (scan/list/create/resolve) with optional correction mutation.
2. `SB-504`: strict capability SLO gate script (`make qa-capability-slo`) for placement/cashout/realtime p95/p99/throughput/success thresholds.
3. `SB-601`: personalized market ranking hook (`GET /api/v1/personalization/ranking`).
4. `SB-602`: personalized combo suggestion hook (`GET /api/v1/personalization/combo-suggestions`).
5. `SB-603`: churn/LTV/risk score hook (`GET /api/v1/admin/risk/player-scores`).
6. `SB-604`: automated risk segmentation + manual override hooks (`GET /api/v1/admin/risk/segments`, `POST /api/v1/admin/risk/segments/{userId}/override`).

## 2.2) Gap Rerun Snapshot (2026-03-05, pass B)

Rerun result after the pass-A closure set:

1. Total backlog items: `37`
2. Closed: `32`
3. Historical remaining open gaps at pass-B snapshot: `5` (`SB-401`, `SB-402`, `SB-501`, `SB-502`, `SB-503`)

Reference:

- `revival/177_GAP_ANALYSIS_RERUN_2026-03-05.md`

## 2.3) Final Gap Closure Snapshot (2026-03-05, pass C)

Final rerun result after closing `SB-401`, `SB-402`, `SB-501`, `SB-502`, `SB-503`:

1. Total backlog items: `37`
2. Closed: `37`
3. Remaining open gaps: `0`

Reference:

- `revival/183_GAP_ANALYSIS_FINAL_ZERO_GAP_CHECKPOINT_2026-03-05.md`

## 2.4) Pass-C Items Closed

1. `SB-401` deadheat + multi-result settlement model.
2. `SB-402` resettlement conflict policy + idempotent reprocessing.
3. `SB-501` provider conformance suite.
4. `SB-502` canonical regression packs.
5. `SB-503` chaos suite.

## 3) Delivery Waves (Suggested)

### Wave 1 (Launch-Critical Maturity)
1. SB-001, SB-002, SB-003, SB-004, SB-006
2. SB-101, SB-102, SB-103
3. SB-201
4. SB-401, SB-402
5. SB-501, SB-502

### Wave 2 (Commercial Competitiveness)
1. SB-005, SB-007, SB-105, SB-106
2. SB-202, SB-203, SB-204
3. SB-301, SB-302, SB-303, SB-304, SB-305
4. SB-404, SB-405
5. SB-503, SB-504

### Wave 3 (Differentiation)
1. SB-008, SB-306
2. SB-403
3. SB-601, SB-602, SB-603, SB-604

## 4) Definition of Done for Each Backlog Item
1. API contracts and DTOs are versioned and documented.
2. End-to-end tests exist for happy path and failure path.
3. Wallet/ledger reconciliation assertions cover financial side effects.
4. Observability (metrics/logs/traces) is in place for production operations.
5. Backoffice visibility/control exists where manual intervention is required.

## 5) Notes
1. This backlog is intentionally provider-agnostic; Odds88 is treated as a concrete certification profile, not a platform lock-in.
2. Betby items are used as maturity benchmarks for market competitiveness, not vendor coupling.
