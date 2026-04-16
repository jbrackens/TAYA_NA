# MS-007 Multi-Sport Smoke Gate Foundation Progress

Date: 2026-03-06  
Scope: Phase 9 scale-out readiness (MS-007) by adding and executing a repeatable smoke gate for non-esports native sportsbook routes and canonical feed adapter responses.

## Delivered

1. Added a reusable QA script for cross-sport route/feed smoke checks:
   - `scripts/qa/sports-route-smoke.sh`
2. Script validates, per configured sport key:
   - gateway canonical event endpoint availability (`/api/v1/sports/{sport}/events`)
   - sportsbook native route availability (`/sports/{sport}`)
   - frontend feed proxy fixture list response (`/api/odds-feed/fixtures/?sport={sport}`)
   - fixture detail response for first returned fixture (`/api/odds-feed/fixtures/{fixtureId}/?sport={sport}`)
3. Added Makefile target:
   - `make qa-sports-route-smoke`
4. Added `make help` discoverability entry for the new smoke gate.
5. Hardened smoke assertions to fail on frontend feed fallback payloads/warnings so routing regressions are not silently masked by placeholder responses.
6. Added esports compatibility checks in the same gate:
   - `GET /api/v1/sports/esports/events`
   - `GET /api/v1/esports/events`
7. Added deterministic multi-sport seed fixtures/markets (`mlb`,`nfl`,`nba`,`ufc`,`ncaa_baseball`) so fixture-detail checks run against real sport-specific event IDs.
8. Updated local stack bootstrap/start behavior so sportsbook gets an explicit canonical feed endpoint and go-gateway is managed as a first-class local service:
   - sportsbook `.env.local` now includes `CANONICAL_GATEWAY_ENDPOINT=http://localhost:18080`
   - `scripts/local-stack.sh start` now starts go-gateway on port `18080` with deterministic read-model seed data.

## Files Changed

1. `scripts/qa/sports-route-smoke.sh`
2. `Makefile`
3. `scripts/local-stack.sh`
4. `go-platform/services/gateway/internal/http/testdata/seeds/read-model.seed.json`
5. `scripts/data/prepare-deterministic-seeds.sh` (executed to refresh `.runtime/seeds/*`)

## Validation

1. Shell syntax validation:

```bash
bash -n scripts/qa/sports-route-smoke.sh
```

Result: pass.

2. Sportsbook package compile sanity after gate additions:

```bash
source ~/.nvm/nvm.sh && nvm use 20
cd phoenix-frontend-brand-viegg/packages/app
npx tsc --noEmit --pretty false
```

Result: pass.

3. Gateway sport-route coverage suite:

```bash
cd go-platform/services/gateway
go test ./internal/http -run 'TestSportsCatalogReturnsAggregatedSports|TestSportLeaguesBySportKeyReturnsLeagues|TestSportEventsFiltersByLeagueAndPaginates|TestSportEventByKeyAndMarketsEndpoints|TestEsportsCompatibilityEventMarketsRoute|TestSportRouteUnknownSportReturnsNotFound'
```

Result: pass.

4. Live runtime smoke execution (frontend + go-gateway):

```bash
FRONTEND_BASE_URL=http://127.0.0.1:3000 \
GATEWAY_BASE_URL=http://127.0.0.1:18080 \
./scripts/qa/sports-route-smoke.sh
```

Result: pass for `mlb,nfl,nba,ufc,ncaa_baseball` + esports compatibility endpoints.

## Notes

1. Full runtime smoke execution requires local sportsbook + go-gateway processes to be running and reachable on configured URLs.
2. Default script sports set is `mlb,nfl,nba,ufc,ncaa_baseball`; use `SPORTS_CSV` to override.
3. `CHECK_ESPORTS_COMPAT=1` is enabled by default to enforce legacy esports wrapper parity as a release safety gate.
