# SB-008/SB-306 Surface Expansion Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 29 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

0. Added a separate Stake-benchmark shell redesign pass for the sportsbook frontend:
   - moved the visual benchmark from generic legacy shell cleanup to sportsbook-specific UX structure
   - tracked in `revival/196_STAKE_BENCHMARK_SHELL_REDESIGN.md`.
1. Added a shared preset parser/resolver utility for module/overlay runtime overrides:
   - one parser path for CSV split, validation, and dedupe
   - one resolver path for override-vs-mode-default selection.
2. Refactored existing landing + esports registries to use the shared parser:
   - keeps behavior identical while standardizing validation semantics.
3. Added SB-008/SB-306 registries for additional sportsbook surfaces:
   - account modules (`personal_details`, `promo_availability`)
   - promotions modules (`page_content`, `promo_availability`)
   - fixture overlays (`stale_warning`, `match_tracker`, `stats_centre`).
4. Wired runtime composition into target pages:
   - `/account` now gates personal details and promo availability blocks
   - `/promotions` now supports moduleized content + promo availability panel
   - `/esports-bets/[gameFilter]/match/[fixtureId]` now gates stale-warning, match-tracker, and stats-centre overlays, including live polling behavior.
5. Extended runtime config contract for operators:
   - `SPORTSBOOK_ACCOUNT_MODULES`
   - `SPORTSBOOK_PROMOTIONS_MODULES`
   - `SPORTSBOOK_FIXTURE_OVERLAYS`.
6. Added registry/parser tests for all new module/overlay surfaces and shared parser coverage.
7. Expanded operator preset docs with IDs, mode defaults, and parser validation semantics for new surfaces.
8. Adjusted revival-facing `odds_feed` defaults so the implemented promo surfaces are visible without manual overrides:
   - `/account` now shows promo availability by default in `odds_feed`
   - `/promotions` now shows promo availability by default in `odds_feed`.
9. Improved sportsbook discoverability for already-shipped features:
   - restored visible promotions navigation in the sidebar/mobile sidebar
   - upgraded the empty betslip state to advertise multi-leg, fixed-exotic, freebet, and odds-boost capabilities already wired into the slip.
10. Routed advanced sportsbook feature clients to the canonical Go gateway while preserving legacy auth/profile traffic on the Akka API:
   - bet builder
   - fixed exotics
   - freebets
   - odds boosts
   - match tracker
   - stats centre
   - betslip precheck / odds-boost accept.
11. Fixed canonical sports fixture identity mapping in the odds-feed adapter:
   - list/detail payloads now expose gateway-compatible `fixtureId` values
   - canonical event detail and markets fetches remain compatible with both `eventKey` and `fixtureId`.
12. Re-enabled fixture overlays for canonical `odds_feed` sports without regressing esports:
   - non-esports `odds_feed` routes now show stale-warning, match-tracker, and stats-centre overlays by default
   - esports `odds_feed` routes remain conservative because external provider fixture IDs are not gateway-native.
13. Added a hard timeout for canonical gateway fetches to prevent indefinite blocking on upstream sportsbook feature requests.
14. Extended contract coverage for the feature-base-url routing path and odds-feed overlay enablement behavior.

## Key Files

1. Shared parser foundation:
   - `phoenix-frontend-brand-viegg/packages/app-core/lib/module-config-parser.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/lib/__tests__/module-config-parser.test.ts`
2. Existing registry refactor to shared parser:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/landing-page/widget-registry.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/esports-bets/module-registry.ts`
3. New surface registries + tests:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/account/module-registry.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/account/__tests__/module-registry.test.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/promotions/module-registry.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/promotions/__tests__/module-registry.test.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/fixture/overlay-registry.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/fixture/__tests__/overlay-registry.test.ts`
4. Surface wiring + runtime config:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/account/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/promotions/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/promotions/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/fixture/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/api-service.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/bet-builder-service.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/fixed-exotics-service.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/freebets-service.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/odds-boost-service.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/match-tracker-service.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/stats-center-service.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/next.config.js`
   - `phoenix-frontend-brand-viegg/packages/app/next.config.js`
   - `phoenix-frontend-brand-viegg/packages/app-core/translations/en/page-promotions.js`
   - `phoenix-frontend-brand-viegg/packages/app/pages/api/odds-feed/canonical-gateway-adapter.ts`
5. Operator docs:
   - `revival/94_SB008_SB306_OPERATOR_PRESET_GUIDE.md`

## Validation

1. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath lib/__tests__/module-config-parser.test.ts components/pages/landing-page/__tests__/widget-registry.test.ts components/pages/esports-bets/__tests__/module-registry.test.ts components/pages/account/__tests__/module-registry.test.ts components/pages/promotions/__tests__/module-registry.test.ts components/pages/fixture/__tests__/overlay-registry.test.ts --passWithNoTests`
   - pass
2. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app run tsc --noEmit`
   - fails due pre-existing legacy type/test issues in unrelated files (same class of failures observed in prior slices)
3. `cd phoenix-frontend-brand-viegg/packages/app-core && yarn test --runTestsByPath services/api/__tests__/api-service.test.ts services/api/__tests__/bet-builder-service.test.ts services/api/__tests__/fixed-exotics-service.test.ts services/api/__tests__/freebets-service.test.ts services/api/__tests__/odds-boost-service.test.ts services/api/__tests__/match-tracker-service.test.ts services/api/__tests__/stats-center-service.test.ts components/pages/fixture/__tests__/overlay-registry.test.ts components/pages/account/__tests__/module-registry.test.ts components/pages/promotions/__tests__/module-registry.test.ts --coverage=false`
   - pass
4. Runtime gateway/odds-feed verification
   - `curl http://127.0.0.1:3002/api/odds-feed/fixtures/?sport=mlb&page=1&itemsPerPage=1`
     - returns canonical sports fixture with gateway-native `fixtureId` (`f:seed:1101`)
   - `curl http://127.0.0.1:3002/api/odds-feed/fixtures/f:seed:1101/?sport=mlb`
     - returns fixture details and markets successfully
   - `curl http://127.0.0.1:18080/api/v1/match-tracker/fixtures/f:seed:1101`
     - returns 200 with synthetic/live-compatible tracker payload
   - `curl http://127.0.0.1:18080/api/v1/stats/fixtures/f:seed:1101`
     - returns 200 with stats payload shape
   - `curl http://127.0.0.1:18080/api/v1/freebets?userId=punter`
     - returns 200 with list contract
   - `curl http://127.0.0.1:18080/api/v1/odds-boosts?userId=punter`
     - returns 200 with list contract
   - `curl -X POST http://127.0.0.1:18080/api/v1/bets/builder/quote -d '{}'`
     - returns structured `bad_request`, confirming endpoint reachability and validation path
   - `curl -X POST http://127.0.0.1:18080/api/v1/bets/exotics/fixed/quote -d '{}'`
     - returns structured `bad_request`, confirming endpoint reachability and validation path

## Remaining

1. Module-composition pattern is now extended to promotions/account/fixture overlays.
2. Canonical-sport fixture overlays are now live in `odds_feed`; only external esports odds-feed fixtures remain intentionally conservative because there is no gateway-native fixture identity to resolve tracker/stats contracts against them.
3. Full app-wide `tsc`/legacy test cleanup remains a repository-wide maintenance concern, but no slice-local contract/test failures remain for the surfaced sportsbook features covered here.
