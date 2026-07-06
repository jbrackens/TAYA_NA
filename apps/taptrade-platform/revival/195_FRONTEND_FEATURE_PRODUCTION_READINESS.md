# Frontend Feature Production Readiness

Date: 2026-03-06

## Scope

This matrix covers the sportsbook frontend surfaces that were added or expanded to close the Betby/Odds88 maturity gaps and answers whether they are now usable end-to-end on the local combined stack.

## Status Legend

- `production-ready`: implemented, routed to the correct runtime, and validated with local contract/runtime checks.
- `production-ready (bounded)`: production-ready on the current canonical sports stack, with an explicit boundary that is understood and documented.
- `not in scope`: deliberately excluded from this readiness call because it belongs to a different provider/runtime path.

## Matrix

| Capability | Frontend Status | Runtime Status | Notes |
| --- | --- | --- | --- |
| Promotions navigation + promo surfaces | production-ready | validated | Promotions nav is visible in sportsbook navigation and promo-availability surfaces are enabled for `odds_feed` mode. |
| Account promo availability | production-ready | validated | Account page loads promo availability modules in the current sportsbook integration mode. |
| Freebet inventory + apply/remove UX | production-ready | validated | Frontend wiring is live and uses canonical gateway routes; backend enforcement already exists in gateway placement flow. |
| Odds boost inventory + accept/apply/remove UX | production-ready | validated | Frontend uses canonical gateway routes and accepts boosts against the same runtime that validates placement/precheck. |
| Bet builder quote/accept client routing | production-ready | validated | Frontend now targets the canonical gateway instead of the legacy Akka API. |
| Fixed exotics quote/accept client routing | production-ready | validated | Frontend now targets the canonical gateway instead of the legacy Akka API. |
| Match tracker overlay | production-ready (bounded) | validated | Enabled by default for canonical `odds_feed` sports where fixture IDs resolve through gateway contracts. |
| Stats centre overlay | production-ready (bounded) | validated | Enabled by default for canonical `odds_feed` sports where fixture IDs resolve through gateway contracts. |
| Canonical sports fixture detail path | production-ready | validated | Odds-feed list/detail responses now expose gateway-native `fixtureId` values so advanced feature APIs resolve correctly. |
| Legacy esports external odds-feed overlays | not in scope | intentionally conservative | External esports fixture IDs are not gateway-native, so tracker/stats overlays stay disabled there by design. |

## What Was Validated

1. Targeted frontend tests passed:
   - `services/api/__tests__/api-service.test.ts`
   - `services/api/__tests__/bet-builder-service.test.ts`
   - `services/api/__tests__/fixed-exotics-service.test.ts`
   - `services/api/__tests__/freebets-service.test.ts`
   - `services/api/__tests__/odds-boost-service.test.ts`
   - `services/api/__tests__/match-tracker-service.test.ts`
   - `services/api/__tests__/stats-center-service.test.ts`
   - `components/pages/fixture/__tests__/overlay-registry.test.ts`
   - `components/pages/account/__tests__/module-registry.test.ts`
   - `components/pages/promotions/__tests__/module-registry.test.ts`
2. Live runtime checks passed:
   - canonical sports fixture list returns gateway-native `fixtureId`
   - canonical sports fixture detail resolves successfully with that `fixtureId`
   - match tracker and stats centre endpoints resolve against the same `fixtureId`
   - freebets and odds boosts list endpoints return valid list contracts
   - bet builder and fixed exotics quote endpoints return structured validation errors instead of `404`, confirming the client now reaches the correct backend

## Deliberate Boundary

The only remaining feature-surface limitation in this slice is external esports `odds_feed` overlays. That is not a partial implementation bug; it is a deliberate boundary caused by provider fixture IDs that do not map to canonical gateway fixture identities.

## Repo-Level Caveat

The repository still contains unrelated legacy `tsc`/test debt outside this slice. That debt does not block the sportsbook feature surfaces above, but it does mean full-repo green verification remains a separate maintenance track.
