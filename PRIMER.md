# TAYA NA! Sportsbook — Session Primer (2026-04-05)

## What This Is

TAYA NA! Sportsbook platform targeting the Philippine market. Player-facing betting app (Next.js 13.5 App Router) with live BetConstruct odds feed. Monorepo at `/Users/john/Sandbox/PhoenixBotRevival/`.

## GitHub

Single repo: `jbrackens/PhoenixBotRevival` (branch: `main`)

## App Locations

- **Player app:** `apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app/`
- **Backoffice:** `apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/`
- **Go gateway:** `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/`
- **Go auth:** `apps/Phoenix-Sportsbook-Combined/go-platform/services/auth/`
- `phoenix-frontend` is a symlink to `talon-backoffice`

## How to Run

### Frontend
```bash
cd /Users/john/Sandbox/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice
yarn install
cd packages/app && PORT=3002 npx next dev -p 3002
```

### Go Backend (Docker)
```bash
cd /Users/john/Sandbox/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined
docker compose up -d
# postgres (5432), redis (6379), gateway (18080), auth (18081)
```

### Database Migrations (goose format, extract Up only)
```bash
MIGRATIONS_DIR="go-platform/services/gateway/migrations"
for f in $(ls "$MIGRATIONS_DIR"/0*.sql | sort); do
  sed -n '/^-- +goose Up$/,/^-- +goose Down$/{ /^-- +goose/d; p; }' "$f" | docker exec -i phoenix_postgres psql -U phoenix -d phoenix_sportsbook
done
cat "$MIGRATIONS_DIR/seed.sql" | docker exec -i phoenix_postgres psql -U phoenix -d phoenix_sportsbook
```

### Login Credentials
- **Username:** `demo@phoenix.local`
- **Password:** `demo123`
- Auth service uses in-memory users (not DB). Set via `AUTH_DEMO_USERNAME` / `AUTH_DEMO_PASSWORD` env vars. Plain text password comparison.
- Auth uses HttpOnly cookies (`access_token`, `refresh_token`) + CSRF double-submit cookie (`csrf_token`).
- For local HTTP dev, set `AUTH_COOKIE_SECURE=false` (cookies default to `Secure` flag which blocks HTTP).

## Architecture

### Frontend Stack
- Next.js 13.5 App Router, React 18, Redux Toolkit v1
- Styling: inline styles + CSS-in-JS via `dangerouslySetInnerHTML` in layout.tsx
- Brand: neon green `#39ff14` on dark navy `#0b0e1c`. Font: IBM Plex Sans.
- Icons: lucide-react
- Design tokens: `app/lib/theme.ts`
- i18n: react-i18next, locales at `public/static/locales/{en,de}/`
- API clients: `app/lib/api/` (auth, betting, wallet, compliance, events, markets, user, betconstruct)

### Backend Stack
- **Gateway (18080):** Go. Sports, markets, fixtures, bets, wallet, payments, compliance routes. Reverse proxy for auth (`/auth/*` -> auth:18081). Postgres + Redis.
- **Auth (18081):** Go. In-memory demo user. `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/session`.
- **BetConstruct:** Swarm WebSocket (`wss://eu-swarm-springre.betconstruct.com`). Proxied via Next.js API routes at `/api/bc/*`. Site ID: `175`.

### Layout Structure
```
.ps-shell (flex)
  SportsSidebar (fixed 220px left)
  .ps-main (margin-left: 220px)
    .ps-main-inner (max-width: 1440px, centered)
      HeaderBar
      AccountStatusBar
      .ps-page {children}
BetslipPanel (fixed overlay, 380px, slides from right)
OpenChatButton (fixed, bottom: 90px)
```

## What Was Done (2026-04-04 session)

### BetConstruct Integration
- Swarm WebSocket proxy at `/api/bc/*` (sports, regions, games, game, live)
- Fixed response nesting (Swarm returns region > competition, not sport > region)
- BC alias cache race condition fixed (getBcAlias now async)
- Sports -> Leagues -> Fixtures -> Match Detail flow works end-to-end
- Match detail shows real markets + odds in CSS grid layout

### Gap Analysis: 19 Issues Closed
**P0 Compliance:** deposit threshold modal, geo check before bets, cool-off login block, self-exclusion durations (1Y/5Y/Lifetime), bet precheck
**P1 Revenue:** transaction polling, payment redirect, cash out in bet history, odds change confirmation
**P2 UX:** search, KYC upload, session management, language/timezone, RG content
**P3:** about page, betting rules, communication prefs, CSV export, chat widget

### Philippine Market
- `PH_SPORTS_WHITELIST` in events-client.ts: 17 sports (was 56)
- Basketball first, then Boxing, Football, Volleyball, Esports, etc.

### UI Refactor
- Centered layout (max-width: 1440px)
- Betslip: static column -> sliding side-sheet overlay (380px, 100vw mobile)
- FAB trigger with selection count badge
- Auto-open on first selection, close via X/backdrop/Escape

### Gateway Auth Proxy
- `/auth/*` -> auth service with path rewrite to `/api/v1/auth/*`
- CORS headers for cross-origin frontend requests

### Test Infrastructure
- Pre-commit hook fixed (was hanging on jest coverage)
- Mocked next-i18next for jest 25, excluded node:test files
- Runs in ~7-15s now

## What's Broken / Needs Debugging

### Login Flow Issues
- Login API works (gateway proxies to auth service)
- After login redirect to `/`, some `ERR_FAILED` errors in console
- Cool-off check fires but endpoint doesn't exist on Go backend (fails open, logs warning)
- RSC payload fetch may fail during auth redirect

### Frontend Issues
- **Hydration mismatch:** i18n keys flash before translations load on SSR
- **Authenticated home page:** Shows heading but fixtures/sports may not load (Go backend fixture shape vs frontend expectations)
- **Betslip side-sheet:** Implemented but needs testing with actual bet selection
- **Many gap analysis features** call Go backend endpoints that are mock/stub implementations

### Backend Issues
- Redis URL format mismatch (gateway warns on startup, uses uncached repo)
- No register endpoint on auth — only hardcoded demo user
- Most compliance/wallet/betting endpoints are mock implementations

## Key Files

| Purpose | Path |
|---------|------|
| Layout + CSS | `app/layout.tsx` |
| Design tokens | `app/lib/theme.ts` |
| Sports whitelist + BC | `app/lib/api/events-client.ts` |
| Auth provider | `app/components/AuthProvider.tsx` |
| Betslip panel | `app/components/BetslipPanel.tsx` |
| Betslip state | `app/components/BetslipProvider.tsx` |
| BC proxy routes | `app/api/bc/` (sports, regions, games, game, live, swarm.ts) |
| Gateway handlers | `go-platform/services/gateway/internal/http/handlers.go` |
| Gateway auth proxy | same file, `registerAuthProxy()` |
| Docker compose | `apps/Phoenix-Sportsbook-Combined/docker-compose.yml` |
| Feature manifest | `FEATURE_MANIFEST.json` in packages/app/ |
| Gate script | `gate.sh` in packages/app/ (8 quality gates) |

## Docker Commands
```bash
cd /Users/john/Sandbox/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined
docker compose up -d                      # start all
docker compose up -d --build gateway      # rebuild gateway after Go changes
docker compose logs -f gateway            # tail logs
docker compose down                       # stop all
docker exec phoenix_postgres psql -U phoenix -d phoenix_sportsbook  # DB shell
```

## BetConstruct Quick Ref
- Session: `{"command":"request_session","params":{"language":"eng","site_id":"175","source":42}}`
- Query: `{"command":"get","params":{"source":"betting","what":{...},"where":{...}}}`
- Types: 0=prematch, 1=live, 2=upcoming
- Nesting: sport > region > competition > game > market > event
- PH whitelist: Basketball, Boxing, Soccer, Volleyball, CS2, LoL, Valorant, Dota2, Tennis, Mma, Baseball, Badminton, Motorsport, Cricket, IceHockey, RugbyUnion, RugbyLeague, VirtualHorseRacing

## Pre-commit Gotchas
- `(err: unknown)` in catch blocks, not `(err: any)`
- No `console.log` — use `logger` from `app/lib/logger`
- gate.sh must pass 8/8 before declaring done
- jest runs in ~7s, full pre-commit in ~15s
