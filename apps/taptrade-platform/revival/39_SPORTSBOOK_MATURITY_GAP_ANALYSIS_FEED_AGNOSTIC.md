# Sportsbook Maturity Gap Analysis (Feed-Agnostic)

Date: 2026-03-04

## 1) Reframed Objective
This document reframes the previous Odds88-specific gap analysis into a **provider-agnostic sportsbook maturity assessment**.

- Odds88 is treated as one useful benchmark profile, not a platform dependency.
- The real blockers are missing maturity capabilities required for any enterprise-grade feed/provider strategy.

Reference benchmark used:

- `/Users/johnb/Desktop/Razed Dump/Odds88 Integration document.pdf`

## 2) North Star Architecture (Provider-Agnostic)

1. Canonical sportsbook domain model (events, markets, selections, bets, wallet, settlement).
2. Pluggable provider adapters (`provider -> canonical`) for each feed/vendor.
3. Provider-independent sportsbook APIs consumed by frontend/backoffice.
4. Deterministic event processing with replay/recovery and reconciliation.
5. Advanced product features (cashout, BetBuilder, exotics, alt odds) implemented against canonical model.

## 3) Current Baseline (What Exists)

1. Working sportsbook frontend + backoffice + legacy backend.
2. Internal API/websocket contracts already in place.
   - `phoenix-backend/services/src/main/scala/phoenix/bets/infrastructure/http/BetEndpoints.scala`
   - `phoenix-backend/services/src/main/scala/phoenix/websockets/WebSocketRoutes.scala`
3. Existing supplier ingestion is currently provider-specific (Oddin/Betgenius), not pluginized.
   - `phoenix-backend/services/src/main/scala/phoenix/suppliers/oddin/*`
   - `phoenix-backend/services/src/main/scala/phoenix/suppliers/common/PhoenixSharedFlows.scala`
4. Go platform scaffold exists but is still early and not yet full-feature complete.
   - `go-platform/services/gateway/internal/http/handlers.go`

## 4) Maturity Capability Gaps

| Capability | Current State | Gap | Severity |
|---|---|---|---|
| Provider adapter framework | Ingestion logic tied to current providers | No formal adapter contract or plugin boundary for multiple vendors | Critical |
| Canonical feed event model | Implicit and scattered across supplier flows | No explicit canonical schema/versioning strategy | High |
| Replay/recovery discipline | Some recovery logic exists in supplier collectors | No platform-wide revision checkpointing and replay invariants | Critical |
| Feed health + lag observability | Basic logs and status pages | Missing feed SLOs, lag dashboards, gap detection alerts | High |
| Snapshot reconciliation tooling | Partial via provider-specific endpoints | Missing generic snapshot-diff and state-healing framework | High |
| Contract governance | Internal contracts exist | Missing provider-conformance layer and compatibility test packs | High |
| Betting core robustness | Single/multi placement exists | Missing mature handling across provider odds/LTD semantics at adapter layer | High |
| Cashout capability | Not implemented as full product capability | Missing real-time cashout pricing lifecycle and execution safety | Critical |
| BetBuilder capability | Not implemented | Missing combinability matrix, price service, and placement flow | Critical |
| Racing exotics capability | Not implemented | Missing exotic selection encoding, pricing, and settlement model | Critical |
| Alternative odds workflow | Not implemented as full flow | Missing offer lifecycle, expiry, user accept/decline semantics | High |
| Settlement maturity | Core settlement exists | Missing deadheat/multi-result and robust resettlement conflict model | High |
| Wallet/ledger resilience | Core wallet flows exist | Need stronger negative-balance/resettlement and audit invariants | High |
| Backoffice operational controls | Good baseline controls | Missing mature provider-ops controls and incident tooling | Medium |
| Performance and scale gates | Some scripts exist in revival docs | Missing defined throughput/latency SLO gates per capability | High |
| Chaos/failure testing | Limited | Missing disconnect/replay/duplication/ordering chaos suite | High |

## 5) Why These Are Real Blockers

These blockers are not about one provider. They are maturity blockers because they affect:

1. Time-to-integrate any new feed partner.
2. Reliability during outages/reconnect/recovery.
3. Correctness of customer balance and settlement outcomes.
4. Ability to safely add premium sportsbook features.

## 6) Priority Program (Feed-Agnostic)

### Track A: Platform Core (P0)

1. Define canonical event and settlement schemas with versioning.
2. Define provider adapter interface and implement one adapter end-to-end as reference.
3. Add revision checkpoint store + deterministic replay service.
4. Add feed health telemetry (lag, gaps, duplicates, replay count).

### Track B: Product Maturity (P0/P1)

1. Cashout end-to-end (price stream, accept/reject semantics, wallet safety).
2. BetBuilder pricing + placement + settlement support.
3. Exotics pricing/placement/settlement support.
4. Alternative odds offer lifecycle.

### Track C: Settlement + Ledger Hardening (P1)

1. Deadheat and multi-result settlement support.
2. Resettlement idempotency and conflict policies.
3. Negative-balance and correction workflows with audit guarantees.

### Track D: Quality Gates (P0/P1)

1. Provider conformance test packs (adapter-level).
2. Canonical regression tests (platform-level).
3. Chaos suite for reorder/drop/duplicate/disconnect scenarios.
4. Launch gate with explicit SLO criteria.

## 7) Immediate Backlog (Next 2 Sprints)

1. Publish adapter interface spec and canonical event schemas.
2. Implement revision checkpointing service with replay command.
3. Add feed reliability metrics and Grafana baseline dashboard.
4. Design cashout domain model and API contracts.
5. Design BetBuilder domain model and pricing API contract.
6. Define settlement extension for deadheat and multi-result outcomes.

## 8) Conclusion
The key blockers are correctly understood as **sportsbook maturity gaps**, not “Odds88-only tasks.”

Odds88 remains a valid benchmark to validate completeness, but the platform target should be:

- feed/vendor agnostic,
- operationally resilient,
- feature-complete for modern sportsbook expectations.
