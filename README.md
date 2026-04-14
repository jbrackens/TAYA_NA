# TAYA NA! Sportsbook

A real-time sports betting platform targeting the Philippine market. Live odds, instant bet placement, competition leaderboards, and a rewards program built on a dark, high-energy interface.

## What It Does

TAYA NA! is a full-stack sportsbook with a player-facing web app and an admin backoffice. Players browse live and upcoming fixtures across 17+ sports, place bets with real-time odds, track their bet history, climb competition leaderboards, and earn loyalty rewards. The platform supports English and German localization.

### Player Features

- **Live Betting** - Real-time odds updates via WebSocket with visual price movement indicators
- **Sports Coverage** - Football, Basketball, Boxing, Tennis, Cricket, MMA, Esports (CS2, Dota 2, LoL, Valorant), and more
- **Betslip** - Sliding side-sheet with single and accumulator bet support, odds change confirmation
- **Bet History** - Filterable by status (Open, Won, Lost, Cashed Out) with cashout offers
- **Leaderboards** - Weekly competitions ranked by net profit, total stake, wins, and referrals
- **Rewards Program** - Points-based tier system (Bronze, Silver, Gold, VIP) with earning mechanics
- **Match Detail** - Market board with Popular, Game Lines, Player Props, and All tabs per fixture
- **Account Management** - Profile, transaction history, responsible gaming controls, session management
- **Search** - Debounced event search with live dropdown results
- **i18n** - Full English and German localization across 60+ namespace files

### Security

- HttpOnly cookie authentication (access + refresh tokens)
- CSRF protection via double-submit cookie pattern
- Route-level middleware protection for authenticated pages
- Structured error boundaries (sanitized in production)

## Tech Stack

### Frontend (Player App)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS |
| State | Redux Toolkit v1 (client), React Query (server) |
| Real-time | WebSocket for live odds, fixtures, bet updates |
| i18n | react-i18next with fetch backend |
| Icons | lucide-react |
| Typography | IBM Plex Sans |
| Analytics | Google Tag Manager |

### Backend

| Service | Technology | Port |
|---------|-----------|------|
| Gateway | Go | 18080 |
| Auth | Go | 18081 |
| Database | PostgreSQL 16 | 5432 |
| Cache | Redis 7 | 6379 |
| Odds Feed | BetConstruct Swarm WebSocket | - |

### Frontend (Admin Backoffice)

Same Next.js 16 / React 19 stack as the player app, with Ant Design components for admin interfaces.

## Repository Structure

```
TAYA_NA/
├── apps/Phoenix-Sportsbook-Combined/
│   ├── talon-backoffice/packages/
│   │   ├── app/                    # Player app (Next.js, port 3000)
│   │   └── office/                 # Admin backoffice (port 3001)
│   ├── go-platform/
│   │   ├── services/gateway/       # API gateway (Go, port 18080)
│   │   ├── services/auth/          # Auth service (Go, port 18081)
│   │   └── modules/platform/       # Shared Go libraries
│   └── docker-compose.yml          # PostgreSQL + Redis + services
├── .claude/launch.json             # Dev server configurations
├── CLAUDE.md                       # Project instructions and patterns
├── DESIGN.md                       # Design system specification
└── PRIMER.md                       # Session primer and architecture
```

## Getting Started

### Prerequisites

- Node.js 18+
- Go 1.24+
- Docker (for PostgreSQL and Redis)

### Quick Start

**1. Start the database and cache:**

```bash
cd apps/Phoenix-Sportsbook-Combined
docker compose up -d postgres redis
```

**2. Start the Go backend:**

```bash
# Auth service (in one terminal)
cd apps/Phoenix-Sportsbook-Combined/go-platform/services/auth
AUTH_COOKIE_SECURE=false go run ./cmd/auth

# Gateway (in another terminal)
cd apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway
go run ./cmd/gateway
```

**3. Start the player app:**

```bash
cd apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app
npm install --legacy-peer-deps
NEXT_PUBLIC_API_URL=http://localhost:18080 npm run dev
```

**4. Open http://localhost:3000**

Demo login: `demo@phoenix.local` / `demo123`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:18080` | Go gateway URL |
| `NEXT_PUBLIC_AUTH_URL` | `http://localhost:18081` | Auth service URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:18080/ws` | WebSocket URL |
| `AUTH_COOKIE_SECURE` | `true` | Set to `false` for localhost HTTP |
| `AUTH_DEMO_PASSWORD` | `demo123` | Demo account password |
| `GATEWAY_PORT` | `18080` | Gateway listen port |
| `AUTH_PORT` | `18081` | Auth service listen port |

## Quality Standards

The project enforces quality via an 8-gate script (`gate.sh`):

1. TypeScript zero errors
2. No phantom imports (`@phoenix-ui/design-system`)
3. No mock classes in production code
4. No TODO/FIXME in critical paths
5. Feature manifest coverage (135 features tracked)
6. No `@ts-nocheck` in app code
7. No Pages/App Router route conflicts
8. Next.js build passes

All catch blocks use `(err: unknown)` with `instanceof Error` checks. No `console.*` statements in production code. Structured logging via `app/lib/logger.ts`.

## Design System

Dark, high-contrast interface with neon green (`#39ff14`) brand energy on deep navy (`#0b0e1c`) surfaces. IBM Plex Sans typography. Designed to feel fast, live, and technically confident.

See [DESIGN.md](DESIGN.md) for the complete design system specification including color palette, typography scale, spacing tokens, and component patterns.

## License

Proprietary. All rights reserved.
