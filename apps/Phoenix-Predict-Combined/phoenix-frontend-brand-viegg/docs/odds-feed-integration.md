# Odds Feed Integration (odds-api.io)

This app now supports a feed-driven mode for sportsbook fixture/market display.

## What was added

- Next API proxy routes (server-side key usage only):
  - `GET /api/odds-feed/fixtures/`
  - `GET /api/odds-feed/fixtures/:fixtureId/`
- `odds_feed` mode wiring in:
  - fixture list page (`/esports-bets`)
  - fixture details page (`/esports-bets/:gameFilter/match/:fixtureId`)
- Legacy Vie shutdown banners removed from:
  - `packages/app-core/components/account-status-bar/index.tsx`
  - `packages/app-core/components/auth/register/index.tsx`
  - `../talon-backoffice/packages/app/components/account-status-bar/index.tsx`
  - `../talon-backoffice/packages/app/components/auth/register/index.tsx`

## Environment variables

Set these in `packages/app/.env.local`:

```env
SPORTSBOOK_INTEGRATION_MODE=odds_feed
ODDS_API_KEY=<your odds-api key>
ODDS_API_SPORT=esports
ODDS_API_BOOKMAKERS=Bet365
# optional but recommended for non-esports canonical sports:
# (go-gateway service that exposes /api/v1/sports/*)
CANONICAL_GATEWAY_ENDPOINT=http://localhost:18080
# optional: enabled canonical sports (comma-separated canonical keys)
ODDS_API_ENABLED_SPORTS=esports,mlb,nfl,ncaa_baseball,nba,ufc
# optional: provider sport-slug overrides by canonical key
ODDS_API_SPORT_MAP={"mlb":"baseball_mlb","nfl":"americanfootball_nfl","nba":"basketball_nba","ufc":"mma_mixed_martial_arts","ncaa_baseball":"baseball_ncaa","esports":"esports"}
```

## Local run

```bash
source ~/.nvm/nvm.sh
nvm use 20
cd /Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app
PORT=3012 NODE_OPTIONS=--openssl-legacy-provider yarn run-local:dev
```

## Quick checks

```bash
curl -sSL 'http://localhost:3012/api/odds-feed/fixtures/?page=1&itemsPerPage=3'
curl -sSL 'http://localhost:3012/api/odds-feed/fixtures/69575558/'
curl -sSL 'http://localhost:3012/api/odds-feed/sports/'
curl -sSL 'http://localhost:3012/api/odds-feed/fixtures/?sport=mlb&page=1&itemsPerPage=1'
```

## Notes

- Feed mode currently prioritizes event/market visibility over bet placement.
- Fixture data is mapped from Odds API structures to existing Phoenix UI contracts.
- When Odds API rate limits are hit, routes return a fallback sample fixture so UI still renders market structures.
- `odds/multi` requests are batched in chunks of 10 event IDs to match provider limits and avoid fallback market responses.
- If an invalid sport slug is requested, the fixtures route retries automatically using `ODDS_API_SPORT` before falling back.
- In `odds_feed` mode, the fixture list requests the canonical `esports` sport slug to avoid invalid legacy filter slugs.
- Sport selection now resolves through a canonical sport registry (`esports`, `mlb`, `nfl`, `ncaa_baseball`, `nba`, `ufc`) with alias support and optional env overrides.
- Provider calls are behind an adapter contract (`OddsFeedProviderAdapter`) to keep feed integration modular for additional providers.
- Canonical adapter endpoint resolution order is now: `CANONICAL_GATEWAY_ENDPOINT` -> `API_GLOBAL_ENDPOINT` -> `http://localhost:18080`.
- Multi-sport URL routing is native under `/sports/...` (sport/league/match pages render directly; no redirect stubs).
- In `odds_feed` mode, non-esports sports (for example `/sports/mlb`) now resolve through the canonical gateway sports APIs (`/api/v1/sports/*`) via the local Next API adapter, while esports keeps the existing Odds API path for non-regression safety.
- Reference docs: [docs.odds-api.io](https://docs.odds-api.io/).
