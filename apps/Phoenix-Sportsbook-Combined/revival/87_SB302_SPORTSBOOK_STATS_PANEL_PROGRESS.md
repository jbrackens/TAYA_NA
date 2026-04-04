# SB-302 Sportsbook Stats Panel Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 22 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added typed sportsbook stats-centre API helper:
   - `fixtureStatsPath(fixtureId)`
   - `useFixtureStatsApi(fixtureId)`
2. Extended app-core API contracts with fixture-stats models + guard:
   - `FixtureStatMetric`
   - `FixtureStatsResponse`
   - `isFixtureStatsResponse`
3. Added fixture-stats JSON fixture and response-shape test coverage.
4. Wired sportsbook fixture page to:
   - request `GET /api/v1/stats/fixtures/{fixtureId}`
   - validate payload shape
   - render a new live stats-centre card with status/period/clock/updatedAt and metric tiles
5. Added fixture-page translation keys for stats-centre panel labels.

## Key Files

1. API helper + tests:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/stats-center-service.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/stats-center-service.test.ts`
2. Contracts + guard + fixtures:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/contracts.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/response-shapes.test.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/fixtures/fixture-stats.json`
3. Fixture-page integration:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/fixture/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/translations/en/fixture.js`

## Validation

1. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath services/api/__tests__/response-shapes.test.ts services/api/__tests__/stats-center-service.test.ts services/api/__tests__/match-tracker-service.test.ts --passWithNoTests`
   - pass
2. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app tsc --noEmit --pretty false`
   - fail (pre-existing unrelated legacy test/type issues; no failures introduced in new stats-centre files)

## Remaining

1. Start SB-305 odds-boost foundation to continue promotional feature parity after freebet read foundation.
