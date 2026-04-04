# Odds88 vs Phoenix Sportsbook Gap Analysis

Date: 2026-03-04

## 1) Scope and Method
This assessment compares the local Phoenix sportsbook stack (legacy Scala/Akka backend + sportsbook frontend + Go migration scaffold) against the requirements documented in:

- `/Users/johnb/Desktop/Razed Dump/Odds88 Integration document.pdf`

Code and docs reviewed:

- `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-backend`
- `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg`
- `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/talon-backoffice`
- `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/go-platform`
- `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival`

Severity scale:

- `Critical`: launch blocker for Odds88 integration.
- `High`: major functionality or operational risk.
- `Medium`: important but can be phased after core launch.
- `Low`: optimization/documentation/testing improvements.

## 2) Current Phoenix Baseline (What We Have)

### Legacy backend/runtime

- Internal sportsbook API is Phoenix-specific (`punters/*`, `sports/*`, etc.), not Odds88 contract shape.
  - `phoenix-backend/services/src/main/scala/phoenix/bets/infrastructure/http/BetEndpoints.scala`
- Internal websocket endpoint is `/web-socket` with Phoenix channels (`bets`, `market`, `fixture`, `wallets`).
  - `phoenix-backend/services/src/main/scala/phoenix/websockets/WebSocketRoutes.scala`
  - `phoenix-backend/services/src/main/scala/phoenix/websockets/messages/WebSocketJsonFormats.scala`
- Supplier ingestion is centered on Oddin/Betgenius streams and collectors.
  - `phoenix-backend/services/src/main/scala/phoenix/suppliers/oddin/*`
  - `phoenix-backend/services/src/main/scala/phoenix/suppliers/common/PhoenixSharedFlows.scala`

### Frontend behavior

- Sportsbook frontend calls Phoenix API endpoints like `punters/bets`, `punters/bets/status`, `sports/{id}/fixtures/{fixtureId}`, `profile/me`, etc.
  - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/index.tsx`
- Frontend websocket client expects Phoenix channel protocol, not provider feeds.
  - `phoenix-frontend-brand-viegg/packages/app-core/services/websocket/websocket-service.ts`
  - `phoenix-frontend-brand-viegg/packages/app-core/services/websocket/channels-map.ts`

### Go migration scaffold

- Go gateway currently exposes internal sportsbook-style endpoints (e.g., `/api/v1/bets/place`, admin lifecycle routes), not Odds88 API/feed surfaces.
  - `go-platform/services/gateway/internal/http/bet_handlers.go`
  - `go-platform/services/gateway/internal/http/handlers.go`

## 3) Gap Matrix: Odds88 Requirement vs Phoenix

| Domain | Odds88 Requirement | Phoenix Current State | Status | Severity |
|---|---|---|---|---|
| Provider auth | `POST /api/Account/login` token lifecycle for provider API/feed access | No Odds88 login/token client implemented | Missing | Critical |
| Provider REST surface | `/api/players/{playerId}/Bets/V2*` family (place/get/settlements/max/cancel/cashOut) | Phoenix has internal `punters/bets` + `punters/bets/status`; contract mismatch | Missing (as Odds88 adapter) | Critical |
| Feed websocket: Delta | `wss ... /api/v2/feed?revision=` with revision recovery | Phoenix has internal `/web-socket` channel model; supplier ingestion exists but not Odds88 external feed contract | Partial | Critical |
| Feed websocket: Settlement | Dedicated settlement feed with revision replay rules | Settlement is handled internally via supplier flows and lifecycle APIs; no Odds88 settlement-feed connector | Partial | Critical |
| Feed websocket: Metadata | Dedicated metadata feed + nullable/null/empty handling | No metadata feed implementation for Odds88 in current stack | Missing | High |
| Feed websocket: Translation changes | Translation change feed + follow-up translation endpoint fetches | No Odds88 translation-feed connector in current stack | Missing | High |
| Snapshot/recovery APIs | Events/metadata/schema/translations snapshot recovery endpoints | Phoenix has its own market/fixture reads; no Odds88 snapshot endpoint client | Missing | High |
| Request-limit compliance | Endpoint/feed rate limits enforced per account | No Odds88 rate-limit policy layer implemented | Missing | High |
| Bet placement data contract | Requires provider payload fields (playerId, requestId, segmentId, deviceId, ip, amount precision, items) | Current bet contract is simplified (`marketId`, `selectionId`, `stake`, `odds`, `acceptBetterOdds`) | Missing | Critical |
| Player identity constraints | `playerId` regex and cross-currency stability | Not implemented as Odds88-specific constraint | Missing | High |
| Odds-change behavior | Reject/accept-all-odds-change flow with canonical reject reasons | Phoenix has `acceptBetterOdds` concept; no Odds88 reject-info contract | Partial | High |
| LTD behavior | Live time delay rules (including multi/LTD edge cases) | No explicit Odds88 LTD semantics implemented | Missing | High |
| Bet cancellation fallback | Provider cancellation endpoint semantics and reasons | Phoenix has internal cancellation, but not Odds88 cancel contract mapping | Partial | High |
| Cashout | Subscribe/unsubscribe + cashout-feed + cashout request flow | No cashout feed/endpoint implementation found in sportsbook stack | Missing | Critical |
| BetBuilder | bet-builder-price flow + final placement via bet endpoint | No BetBuilder implementation found in current codebase | Missing | Critical |
| Racing Fixed Exotics | Fixed exotics market handling + `/api/FixedExotics/price` + racingSelection format | No fixed exotics integration found | Missing | Critical |
| Alternative Odds | `alternativeOddsId` / `alternativePrice` rejection-retry flow | No alternative-odds contract implementation found | Missing | High |
| DeadHeatFactor settlements | Multi-result/deadheat handling | Current settlement flow fails on multiple winners (`TooManyWinningSelections`) | Missing | High |
| Backoffice manual settlement parity | Manual intervention paths for skipped settlements/resettlements | Phoenix backoffice has market/bet lifecycle actions; not mapped to Odds88 ticket semantics | Partial | Medium |
| Integration test suite | Odds88 section 8 test pack (general/delta/metadata/bets/settlement) | No dedicated Odds88 conformance test suite exists | Missing | High |

## 4) Notable Evidence (Key Findings)

### A) Contract mismatch at core betting API

- Odds88 expects `/api/players/{playerId}/Bets/V2` style.
- Phoenix exposes internal endpoints under `punters/bets`.
- Phoenix bet request model:
  - `marketId`, `selectionId`, `stake`, `odds`, `acceptBetterOdds`.
- Evidence:
  - `phoenix-backend/services/src/main/scala/phoenix/bets/infrastructure/http/BetEndpoints.scala`
  - `phoenix-backend/services/src/main/scala/phoenix/bets/BetProtocol.scala`

### B) Realtime protocol mismatch

- Odds88 requires dedicated provider feeds (delta, settlement, metadata, translation changes) with revision strategies.
- Phoenix websocket is a product-facing internal bus (`market`, `fixture`, `bets`, `wallets`), not provider feed transport.
- Evidence:
  - `phoenix-backend/services/src/main/scala/phoenix/websockets/WebSocketRoutes.scala`
  - `phoenix-backend/services/src/main/scala/phoenix/websockets/messages/WebSocketJsonFormats.scala`
  - `phoenix-frontend-brand-viegg/packages/app-core/services/websocket/channels-map.ts`

### C) Supplier model is Oddin/Betgenius-centric

- Existing ingestion and recovery logic is provider-specific to Oddin/Betgenius.
- No Odds88 provider module exists.
- Evidence:
  - `phoenix-backend/services/src/main/scala/phoenix/suppliers/oddin/OddinCoordinator.scala`
  - `phoenix-backend/services/src/main/scala/phoenix/suppliers/oddin/OddinCollectors.scala`
  - `phoenix-backend/services/src/main/scala/phoenix/suppliers/common/PhoenixSharedFlows.scala`

### D) Advanced Odds88 features absent

Repo-wide search found no implementation for:

- cashout feed/request contract
- BetBuilder pricing/placement flow
- Fixed Exotics pricing flow
- Alternative odds retry contract

Also, current settlement flow explicitly rejects multiple winning selections:

- `TooManyWinningSelections` in:
  - `phoenix-backend/services/src/main/scala/phoenix/suppliers/oddin/PhoenixOddinFlows.scala`
  - `phoenix-backend/services/src/main/scala/phoenix/suppliers/common/PhoenixSharedFlows.scala`

## 5) Overall Readiness Score for Odds88 Integration

- Core provider integration readiness: `20%`
- Core user sportsbook readiness (without Odds88 adapter): `70%` (Phoenix internal flow exists)
- Odds88 feature completeness (cashout/betbuilder/exotics/alt odds): `10%`

Interpretation:

- The platform is a working sportsbook, but **not** an Odds88-native integration today.
- The largest risk is not frontend UX; it is the absence of a provider-adapter layer and protocol contract compliance.

## 6) Recommended Execution Plan (Provider-Adapter Strategy)

### Phase A: Odds88 Adapter Foundation (Critical path)

1. Create an `odds88-adapter` service (Go recommended to align with migration target).
2. Implement account login/token rotation.
3. Implement delta + settlement feed consumers with revision persistence/replay.
4. Map provider entities to internal canonical model used by sportsbook frontend/backend.

### Phase B: Betting Transaction Bridge

1. Implement Odds88 bet placement/max/cancel/get/settlement endpoints in adapter.
2. Add strict request/response mapping between Phoenix betslip flow and Odds88 contract.
3. Add idempotency and reject-reason mapping.
4. Implement LTD, odds-change policy, and player identity constraints.

### Phase C: Advanced Feature Pack

1. Cashout subscribe/unsubscribe + feed + cashout endpoint.
2. BetBuilder price + placement flow.
3. Fixed Exotics price and selection encoding.
4. Alternative Odds accept/decline retry flow.
5. DeadHeatFactor settlement support.

### Phase D: Certification and Launch Hardening

1. Build automated conformance tests from Odds88 section 8 test cases.
2. Execute replay/recovery chaos tests (disconnect/reconnect/revision drift).
3. Add operational dashboards for feed lag, revision drift, reject-rate, reconciliation.

## 7) Proposed Backlog (Prioritized)

### P0 (must-have before launch)

1. Odds88 auth + delta + settlement connectivity.
2. Odds88-to-Phoenix bet placement bridge.
3. Revision persistence and deterministic replay.
4. Reject-reason and cancellation mapping.

### P1 (launch-quality)

1. Metadata + translation feeds and snapshot recovery endpoints.
2. Request-limit governance and adaptive throttling.
3. Cashout flow.

### P2 (commercial completeness)

1. BetBuilder.
2. Fixed Exotics.
3. Alternative Odds.
4. Deep racing metadata UX.

## 8) Conclusion
Phoenix currently has a functional sportsbook platform but **does not yet implement Odds88 integration contracts**. The main gaps are at provider-protocol boundaries (auth, feed semantics, endpoint contracts, and advanced bet features), not basic sportsbook UI/backend plumbing.

To reach Odds88 parity, the fastest low-risk path is a dedicated adapter layer that preserves existing frontend/internal contracts while progressively implementing Odds88 feed/API compatibility.
