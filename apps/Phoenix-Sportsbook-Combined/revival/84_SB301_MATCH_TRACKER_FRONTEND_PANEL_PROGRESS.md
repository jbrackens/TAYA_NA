# SB-301 Match Tracker Frontend Panel Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 19 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added typed sportsbook API helper for fixture match-tracker timeline endpoint:
   - `matchTrackerFixturePath(fixtureId)`
   - `useMatchTrackerFixtureApi(fixtureId)`
2. Extended app-core API contract types with match-tracker response models and guards:
   - `MatchTrackerTimelineResponse`
   - `MatchTrackerIncident`
   - `MatchTrackerScore`
   - `isMatchTrackerTimelineResponse`
3. Added match-tracker fixture JSON and response-shape guard coverage tests.
4. Wired sportsbook fixture page (`/esports-bets/[gameFilter]/match/[fixtureId]`) to:
   - call the new match-tracker endpoint
   - validate payload shape with contract guard
   - render a basic live tracker card (status, period, clock, updatedAt, incident timeline)
5. Added fixture-page translation keys for match-tracker panel labels.

## Key Files

1. Match-tracker API helper + tests:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/match-tracker-service.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/match-tracker-service.test.ts`
2. Contract models/guards + fixtures/tests:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/contracts.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/response-shapes.test.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/fixtures/match-tracker.json`
3. Fixture-page UI integration:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/fixture/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/translations/en/fixture.js`

## Validation

1. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath services/api/__tests__/response-shapes.test.ts services/api/__tests__/match-tracker-service.test.ts --passWithNoTests`
   - pass
2. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app tsc --noEmit --pretty false`
   - fail (pre-existing legacy test/type issues outside this slice; no reported errors in modified match-tracker files)

## Remaining

1. Integrate SB-302 stats-centre payloads into fixture page beside the new provider-driven timeline panel.
2. Expand fixture UI timeline rendering with richer incident taxonomy presentation and filtering controls.
