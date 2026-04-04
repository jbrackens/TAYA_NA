# SB-303 Integrated Stream Refresh Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 23 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added fixture-page integrated refresh orchestration for live data cards:
   - polls match-tracker and stats-centre endpoints every 10 seconds during in-play context
   - keeps timeline/stats panel updates synchronized without depending only on initial load
2. Added stale-data UX fallback for live panels:
   - detects stale `updatedAt` timestamps (>45 seconds old)
   - surfaces warning alert to the operator/punter when live cards appear outdated
3. Preserved existing fixture timeline/stats endpoint integrations and translation coverage.

## Key Files

1. Fixture-page live refresh + stale fallback:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/fixture/index.tsx`
2. Translation key for stale-data warning:
   - `phoenix-frontend-brand-viegg/packages/app-core/translations/en/fixture.js`

## Validation

1. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath services/api/__tests__/response-shapes.test.ts services/api/__tests__/stats-center-service.test.ts services/api/__tests__/match-tracker-service.test.ts --passWithNoTests`
   - pass

## Remaining

1. Start SB-305 odds-boost lifecycle foundation so promotion primitives cover both freebets and boosted offers.
