# MS-001 / MS-002 Foundation Progress

Date: 2026-03-06  
Scope: Phase 1 multi-sport foundation in sportsbook feed integration layer.

## Delivered

1. Added canonical sport registry for sportsbook feed resolution:
   - file: `phoenix-frontend-brand-viegg/packages/app/pages/api/odds-feed/sport-registry.ts`
   - canonical keys: `esports`, `mlb`, `nfl`, `ncaa_baseball`, `nba`, `ufc`
   - supports:
     - alias matching
     - enabled-sports gating
     - provider sport-slug override mapping
2. Added provider adapter contract:
   - file: `phoenix-frontend-brand-viegg/packages/app/pages/api/odds-feed/provider-adapter.ts`
3. Added concrete Odds API adapter implementing the contract:
   - file: `phoenix-frontend-brand-viegg/packages/app/pages/api/odds-feed/odds-api-adapter.ts`
4. Refactored odds-feed fixture APIs to use adapter contract:
   - files:
     - `.../fixtures/index.ts`
     - `.../fixtures/[fixtureId].ts`
5. Added registry discovery endpoint:
   - file: `.../sports/index.ts`
   - route: `GET /api/odds-feed/sports`
6. Updated integration documentation:
   - file: `phoenix-frontend-brand-viegg/docs/odds-feed-integration.md`
7. Added multi-sport route scaffolding (compatibility redirects into existing sportsbook shell):
   - `/sports`
   - `/sports/[sportKey]`
   - `/sports/[sportKey]/[leagueKey]`
   - `/sports/[sportKey]/[leagueKey]/match/[eventKey]`
   - `/sports/[sportKey]/[leagueKey]/match/[eventKey]/markets/[marketKey]`
   - all currently redirect to existing `/esports-bets/...` pages with `sport` query context.

## Environment Variables Added (Optional)

1. `ODDS_API_ENABLED_SPORTS`
2. `ODDS_API_SPORT_MAP`

## Validation Commands

```bash
curl -sS 'http://127.0.0.1:3002/api/odds-feed/sports/' | jq '.provider, .selectedSport, (.sports | length)'
curl -sS 'http://127.0.0.1:3002/api/odds-feed/fixtures/?page=1&itemsPerPage=20&gameFilter=home' | jq '{totalCount, dataCount:(.data|length), warning, source}'
curl -sS 'http://127.0.0.1:3002/api/odds-feed/fixtures/?page=1&itemsPerPage=20&sport=mlb' | jq '{totalCount, dataCount:(.data|length), warning, source}'
curl -I 'http://127.0.0.1:3002/sports/mlb'
curl -I 'http://127.0.0.1:3002/sports/nfl/american-football/match/demo-event-001'
```

## Notes

1. This is a compatibility-safe foundation layer; existing esports behavior remains active.
2. Route scaffolding is now in place; native sport-specific page composition (non-redirect rendering) is the next slice.
