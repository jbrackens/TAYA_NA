# MS-006 MLB Pilot Canonical Frontend Wiring Progress

Date: 2026-03-06  
Scope: Phase 9 multi-sport expansion item 6 (pilot one non-esports vertical, MLB) by wiring native `/sports/mlb` fixture and market retrieval to canonical gateway sports endpoints.

## Delivered

1. Added a canonical gateway adapter for sportsbook feed mode (`phoenix-gateway-canonical`):
   - Calls gateway canonical endpoints:
     - `GET /api/v1/sports/{sportKey}/events`
     - `GET /api/v1/sports/{sportKey}/events/{eventKey}`
     - `GET /api/v1/sports/{sportKey}/events/{eventKey}/markets`
   - Maps canonical sport/event/market payloads into existing sportsbook odds-feed contracts used by fixture-list and fixture-detail components.
2. Updated odds-feed fixtures list API route to choose adapter by sport:
   - `esports` keeps existing Odds API adapter path (non-regression).
   - non-esports canonical keys (including `mlb`) use canonical gateway adapter.
3. Updated odds-feed fixture detail API route with the same adapter-selection behavior:
   - `esports` remains on Odds API adapter with fallback sample behavior.
   - non-esports canonical keys use canonical gateway adapter and return 5xx on upstream failure so sportsbook shows deterministic error state instead of stale sample data.
4. Preserved existing route/UI contracts by keeping response shape stable for frontend consumers (`FixtureListComponent`, `Fixture` page) while changing the data source under the hood.
5. Extended odds-feed mode sports navigation hydration in layout:
   - when `SPORTSBOOK_INTEGRATION_MODE=odds_feed`, sportsbook now fetches `/api/odds-feed/sports/` and merges enabled canonical sports into sidebar sport state to expose non-esports sections even when legacy `/sports` only returns esports.
6. Updated feed integration docs to reflect:
   - native `/sports/...` routing (no redirect stubs)
   - canonical gateway sourcing for non-esports sports in `odds_feed` mode.
7. Added dedicated canonical endpoint support for non-esports feed reads:
   - canonical adapter endpoint resolution now prefers `CANONICAL_GATEWAY_ENDPOINT` and falls back to `API_GLOBAL_ENDPOINT` only when explicit canonical endpoint config is absent.

## Files Changed

1. `phoenix-frontend-brand-viegg/packages/app/pages/api/odds-feed/canonical-gateway-adapter.ts`
2. `phoenix-frontend-brand-viegg/packages/app/pages/api/odds-feed/provider-adapter.ts`
3. `phoenix-frontend-brand-viegg/packages/app/pages/api/odds-feed/odds-api-adapter.ts`
4. `phoenix-frontend-brand-viegg/packages/app/pages/api/odds-feed/fixtures/index.ts`
5. `phoenix-frontend-brand-viegg/packages/app/pages/api/odds-feed/fixtures/[fixtureId].ts`
6. `phoenix-frontend-brand-viegg/packages/app-core/components/layout/index.tsx`
7. `phoenix-frontend-brand-viegg/docs/odds-feed-integration.md`
8. `phoenix-frontend-brand-viegg/packages/app/next.config.js`

## Validation

1. Sportsbook package compile sanity:

```bash
source ~/.nvm/nvm.sh && nvm use 20
cd phoenix-frontend-brand-viegg/packages/app
npx tsc --noEmit --pretty false
```

Result: pass.

2. Route-helper non-regression test sanity (from prior MS-005 path, rechecked):

```bash
source ~/.nvm/nvm.sh && nvm use 20
cd phoenix-frontend-brand-viegg/packages/app-core
npx jest lib/__tests__/sports-routing.test.ts --runInBand
```

Result: pass (1 suite, 4 tests).

## Notes

1. This pilot uses canonical gateway endpoints for non-esports sportsbook read flows while preserving esports via existing Odds API adapter to reduce migration risk.
2. Scale-out to `nfl`, `nba`, `ufc`, and `ncaa_baseball` plus live smoke validation is tracked in `revival/189_MS007_MULTI_SPORT_SMOKE_GATE_FOUNDATION_PROGRESS.md`.
