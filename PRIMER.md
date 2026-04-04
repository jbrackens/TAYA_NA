# Phoenix Sportsbook — Session Primer (2026-04-04)

## What This Is

Phoenix Sportsbook platform. Player-facing betting app (Next.js 13.5 App Router) with live BetConstruct odds feed integration. Monorepo at `/Users/john/Sandbox/PhoenixBotRevival/`.

## GitHub

Single repo: `jbrackens/PhoenixBotRevival` (consolidated from old separate repos, which were deleted).

## App Locations

- **Player app:** `apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app/`
- **Backoffice:** `apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/`
- Note: `phoenix-frontend` is a symlink to `talon-backoffice`

## How to Run

```bash
cd /Users/john/Sandbox/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice
yarn install   # NOT npm — project uses yarn workspaces + lerna
cd packages/app && PORT=3002 npx next dev -p 3002
# Port 3000 is used by another project (Swarm-QA)
```

If brotli crashes: `codesign --force --sign - /opt/homebrew/lib/libbrotlicommon.1.dylib` (and dec/enc)

## What Was Done This Session

### 1. Git setup (done)
- Initialized git at project root, pushed to `jbrackens/PhoenixBotRevival`
- Removed 122 nested .git dirs, fixed broken symlinks
- Deleted old repos: `PHXRevival`, `TalonRevival`

### 2. QA fixes (done)
- **i18n broken** — Middleware was intercepting `/static/locales/` requests. Fixed: added `static` to middleware matcher exclusion in `middleware.ts:81`
- **ToastProvider crash** — `AuthProvider` was outside `ToastProvider` in `layout.tsx`. Fixed: swapped nesting order
- **Conflicting pages/app routes** — 13 routes existed in both `pages/` and `app/`. Fixed: removed conflicting `pages/` files
- **Fallback data** — Added fallback sports data to `LandingPage.tsx` and `SportsSidebar.tsx` for when API is down
- **SVG sport icons** — Replaced emoji icons with clean monochrome SVG icons in `SportIcons.tsx`

### 3. BetConstruct odds feed integration (done, needs QA)
- **API key:** `6XgybGIXdXGKOA6` — this is the partner API key, NOT the Swarm `site_id`
- **Swarm site_id:** `175` — this is what the Swarm API uses for sessions
- **Swarm endpoint:** `wss://eu-swarm-springre.betconstruct.com`
- **How it works:**
  - `app/api/bc/swarm.ts` — Persistent WebSocket to BetConstruct Swarm API with 30s in-memory cache
  - `app/api/bc/sports/route.ts` — Proxy: returns all sports with game counts (filters 0-game sports)
  - `app/api/bc/regions/route.ts` — Proxy: returns competitions/regions for a sport (filters empty)
  - `app/api/bc/live/route.ts` — Proxy: returns all live games with nested sport/region/competition
  - `app/api/bc/game/route.ts` — Proxy: returns single game with all markets and odds (selections)
  - `app/lib/api/betconstruct-client.ts` — Browser-side client calls local proxy routes (trailing slashes!)
  - `app/lib/api/events-client.ts` — Tries BetConstruct first, falls back to Go backend, then fallback data

### 4. Known issues to fix in next session
- **Browser caching** — User's browser may show stale JS bundles. The `.next` cache was cleared. User should hard-refresh (Cmd+Shift+R) or use incognito
- **Trailing slash redirects** — Next.js App Router routes redirect non-trailing-slash to trailing-slash (308). Client fetch URLs were updated but need QA verification
- **Match detail page** — Was rewritten to use BetConstruct game proxy (`/api/bc/game/?id=`). Loads real markets with odds. Needs full QA
- **League page** — Uses `/api/bc/live/` to show live matches. Filters by sport alias. The alias mapping (`bcAliasCache` in events-client.ts) needs the reverse map populated from a prior `getSports()` call
- **Sport page** — Uses `LeagueNav` and `FixtureList` components that may still reference Go backend
- **`params` as Promise** — Next.js 13.5 passes `params` as plain objects, not Promises. Fixed in `[sport]/page.tsx`, `[sport]/[league]/page.tsx`, and `match/[id]/page.tsx`. Check for any others
- **env file has API key** — `.env.development` has `NEXT_PUBLIC_BC_API_KEY=6XgybGIXdXGKOA6`. This is committed. Consider moving to `.env.local` before pushing

## Uncommitted Changes (28 files)

### Modified
- `.gitignore` — Added stale build patterns
- `CLAUDE.md` — Updated repo URLs to monorepo
- `middleware.ts` — Added `static` to matcher exclusion
- `layout.tsx` — Swapped ToastProvider/AuthProvider order
- `LandingPage.tsx` — Fallback sports data, BC integration
- `SportsSidebar.tsx` — Fallback data, SVG icons, BC integration, 0-game filter
- `events-client.ts` — BC-first with alias cache + reverse mapping
- `match/[id]/page.tsx` — Rewritten for BetConstruct game proxy
- `sports/[sport]/page.tsx` — Fixed params (not Promise)
- `sports/[sport]/[league]/page.tsx` — Rewritten for BC live data, fixed params
- `package.json` (root) — Added @tanstack/react-query

### New files
- `app/api/bc/swarm.ts` — Persistent WebSocket Swarm client with cache
- `app/api/bc/sports/route.ts` — Sports proxy
- `app/api/bc/regions/route.ts` — Regions/competitions proxy
- `app/api/bc/live/route.ts` — Live games proxy
- `app/api/bc/game/route.ts` — Single game with markets/odds proxy
- `app/components/SportIcons.tsx` — SVG sport icons
- `app/lib/api/betconstruct-client.ts` — Browser-side BC client

### Deleted (13 files)
- `pages/account/index.tsx` and 12 other conflicting pages/ routes

## What to Do Next

1. **Hard refresh the browser** (Cmd+Shift+R) or open incognito to `http://localhost:3002`
2. **Run `/qa` on `http://localhost:3002`** — full QA of landing page, sidebar, sport drill-down, match detail with markets
3. **Fix any remaining issues** from the QA
4. **Run `gate.sh`** — `cd packages/app && bash gate.sh`
5. **Commit and push** all changes to `jbrackens/PhoenixBotRevival`

## BetConstruct Swarm API Quick Reference

- Session: `{"command":"request_session","params":{"language":"eng","site_id":"175","source":42}}`
- Query: `{"command":"get","params":{"source":"betting","what":{...},"where":{...}}}`
- Game types: 0=prematch, 1=live, 2=upcoming
- Data nests: sport > region > competition > game > market > event (selection)
- Docs PDF: https://console.springbme.com/assets/pdfs/swarmAPI.pdf
