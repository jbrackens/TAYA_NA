# Phoenix Sportsbook Platform

A production-ready, multi-sport sportsbook platform built with Go, Next.js, PostgreSQL, and Redis. Designed for high-volume betting operations with real-time market updates, comprehensive risk management, and full compliance framework.

## What is Phoenix Sportsbook?

Phoenix is a complete sportsbook solution featuring:

- **Real-time Betting** — WebSocket-powered live market updates and instant bet placement
- **Multi-Sport Support** — Football, Basketball, Tennis, Cricket, and more with sport-specific market types
- **Player App** — Modern React/Next.js frontend for bettors with dark theme and responsive design
- **Backoffice Dashboard** — Administrative interface for risk management, user control, and market settlement
- **Trading View** — Advanced market analytics and trading controls
- **Payment Integration** — Stub payment processing for account deposits/withdrawals
- **Compliance Framework** — Audit logging, KYC/AML hooks, and regulatory compliance tools
- **High Performance** — Gateway designed for 10K+ concurrent WebSocket connections

## Quick Start

### Prerequisites
- Go 1.24+
- Node.js 18+ (with npm)
- Docker and Docker Compose
- PostgreSQL 16 (via Docker)
- Redis 7 (via Docker)

### One Command Setup

```bash
make bootstrap && make start
```

This will:
1. Install all dependencies (Go, Node, npm)
2. Set up local environment files
3. Start PostgreSQL, Redis, and all services via Docker
4. Run database migrations
5. Load seed data

### Service URLs

Once running, access the platform at:

- **Player App** — http://localhost:3000
- **Backoffice** — http://localhost:3001
- **Gateway API** — http://localhost:18080/api/v1
- **Auth Service** — http://localhost:18081/auth
- **PostgreSQL** — localhost:5432 (user: `phoenix`, password: `localdev`)
- **Redis** — localhost:6379

### Demo Credentials

Log in with these test accounts:

- **Username:** demo@phoenix.local
- **Password:** demo123
- **Account Balance:** 1000 credits

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Client Layer                                                 │
├──────────────────────┬──────────────────────┐────────────────┤
│ Player App (Next.js) │ Backoffice (Next.js) │ External APIs  │
│ :3000                │ :3001                │                │
└──────────┬───────────┴──────────┬───────────┴────────────────┘
           │                      │
           └──────────┬───────────┘
                      │ REST/WebSocket
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Service Layer                                                │
├─────────────────────────┬─────────────────────┬──────────────┤
│ Gateway (:18080)        │ Auth (:18081)       │ Cache Layer  │
│ - Bet placement         │ - Token validation  │ (Redis)      │
│ - Market updates        │ - User auth         │              │
│ - Real-time WebSocket   │ - Session mgmt      │              │
└──────────┬──────────────┴────────────┬────────┴──────────────┘
           │                          │
           │        PostgreSQL        │
           └──────────┬───────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Data Layer                                                   │
├────────────┬────────────┬────────────┬──────────┬────────────┤
│ Punters    │ Markets    │ Bets       │ Wallets  │ Audit Logs │
│ Fixtures   │ Selections │ Freebets   │ Ledger   │ Timelines  │
└────────────┴────────────┴────────────┴──────────┴────────────┘
```

For detailed architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design, data flow, database schema, deployment topology
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Developer setup, running services locally, common tasks
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Production deployment, K8s configuration, monitoring setup
- **[RUNBOOKS.md](./RUNBOOKS.md)** — Operational procedures for market settlement, troubleshooting, incident response
- **[CHANGELOG.md](./CHANGELOG.md)** — Release notes and version history
- **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)** — Pre-launch verification checklist

## Project Structure

```
Phoenix-Sportsbook-Combined/
├── go-platform/                    # Go backend services
│   ├── modules/platform/           # Shared platform libraries
│   ├── services/
│   │   ├── gateway/                # Main API gateway & WebSocket
│   │   └── auth/                   # Authentication service
│   └── go.work                     # Go workspace config
│
├── talon-backoffice/               # Frontend applications
│   └── packages/
│       ├── app/                    # Player app (Next.js, port 3000)
│       ├── office/                 # Admin backoffice (Next.js, port 3001)
│       ├── api-client/             # TypeScript API client
│       ├── design-system/          # Shared UI components
│       └── utils/                  # Utility functions
│
├── scripts/                        # Automation and operations
│   ├── local-stack.sh              # Local development setup
│   ├── data/                       # Database migrations & seeds
│   ├── qa/                         # Testing scripts
│   └── release/                    # Release & deployment scripts
│
├── docker-compose.yml              # Local development stack
├── Makefile                        # Build and deployment targets
└── README.md                       # This file
```

## Common Commands

### Development

```bash
# Start all services locally
make start

# View service status and logs
make status
make logs

# Run Go tests
make go-test

# Run full verification (compile, test, build)
make verify

# Run E2E tests
make qa-e2e-critical
```

### Production

```bash
# Build Docker images for all services
make docker-build

# Validate database migrations
make validate-migrations

# Run load testing
make qa-load-baseline

# Launch readiness checklist
make release-launch-readiness
```

## Key Features

### Real-Time Betting
- WebSocket-powered live odds updates
- Instant bet placement and confirmation
- Live market suspend/resume controls

### Market Management
- Multi-market types per fixture (moneyline, spread, totals, props)
- Automatic odds calculation
- Live odds adjustment and trading
- Market suspension and manual settlement

### User Management
- Account creation and KYC verification
- Wallet management with deposit/withdrawal
- Bonus and freebet allocation
- Self-exclusion and responsible gaming

### Risk Management
- Live exposure tracking
- Automatic suspension on threshold breach
- Manual account suspension
- Bet limits and time-based restrictions

### Compliance
- Comprehensive audit logging
- User action tracking
- Data retention policies
- Export for regulatory reporting

## Technology Stack

- **Backend** — Go 1.24, PostgreSQL 16, Redis 7
- **Frontend** — Next.js 16, React 19, TypeScript
- **API** — REST + WebSocket (RFC 6455)
- **Database** — PostgreSQL with JSON support
- **Caching** — Redis with pub/sub
- **Infrastructure** — Docker, Kubernetes (production)
- **DevOps** — GitHub Actions, Makefile automation

## Getting Help

- Check [DEVELOPMENT.md](./DEVELOPMENT.md) for setup issues
- See [RUNBOOKS.md](./RUNBOOKS.md) for operational procedures
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for infrastructure questions
- Check service logs: `make logs`
- Review migrations: `go-platform/services/gateway/migrations/`

## License

Phoenix Sportsbook Platform. All rights reserved.
