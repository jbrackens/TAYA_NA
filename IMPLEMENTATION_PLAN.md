# Phoenix Sportsbook — Production Implementation Plan

**Date:** April 2, 2026
**Scope:** Go backend completion, all-sports market expansion, frontend redesign
**Target:** 8 weeks to production-ready

---

## What's Already Built

### Go Backend — ~80% Complete
The Go backend is not a stub. It's a working sportsbook engine with 32+ public API routes and 15+ admin routes already implemented:

**Done:** Auth service (token-based, session management, metrics), fixtures/markets/selections CRUD with pagination, bet placement with full validation + idempotency, cashout (quote → accept flow), freebets and odds boosts, wallet/ledger with idempotent credits/debits, match tracking with live timelines, risk intelligence (player scores, combo suggestions, segment management), admin endpoints (punter management, audit logs, wallet corrections, market cancellation), provider adapter system with canonical event schema and replay engine, Prometheus metrics throughout, pluggable storage (PostgreSQL, file, in-memory).

**Sports catalog already defined:** 30+ football leagues (Premier League through World Cup), MLB, NFL, NCAA Baseball, NBA, UFC, esports. The `sports_handlers.go` already serves these.

**Not done:** WebSocket real-time transport, DB migration framework, Redis caching, message queue, payment gateway, GeoComply/IdComply compliance integrations, DGE reporting.

### Scala Backend — Reference for What's Missing
The Scala backend adds: Akka event sourcing + cluster sharding, Kafka data pipeline with Oddin/BetGenius feeds, WebSocket via Akka Streams, 48 Flyway migrations, PXP Financial payments, GeoComply geolocation, IdComply KYC, DGE regulatory reports, device fingerprinting, responsible gambling (deposit limits, cool-offs, self-exclusion), and 47+ esports market types.

### Frontends — Functional but Dated
Both Next.js 13 apps (Player + Backoffice) work against the mock server. Core page structures exist. But they're tightly coupled to the old API contract, use antd 4's dated look, and need the MG dark theme redesign.

### Design Reference — MG-live-score-app
Next.js 14, styled-components, dark sports theme. Key tokens: `#1a1a2e` background, `#2d2d44` cards, `#f5c842` live, `#4cd964` finished, Barlow font, 56px scores, responsive grid, animated pulsing live indicators.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Clients                           │
│  ┌───────────────┐          ┌──────────────────────┐ │
│  │  Player App   │          │  Talon Backoffice     │ │
│  │  Next.js 14   │          │  Next.js 14           │ │
│  └───────┬───────┘          └──────────┬───────────┘ │
└──────────┼──────────────────────────────┼────────────┘
           │ REST + WS                    │ REST + WS
           ▼                              ▼
┌──────────────────────────────────────────────────────┐
│            API Gateway (Go)  :18080                   │
│  ┌────────┐ ┌──────┐ ┌────────┐ ┌─────────────────┐ │
│  │Markets │ │ Bets │ │ Wallet │ │ Admin / Trading  │ │
│  └────────┘ └──────┘ └────────┘ └─────────────────┘ │
│            Auth Service  :18081                       │
├──────────────────────────────────────────────────────┤
│  PostgreSQL · Redis · Provider Adapters · Prometheus  │
└──────────────────────────────────────────────────────┘
```

---

## Phase 1: Backend Gap Closure (Days 1–10)

The Go backend is already feature-rich. This phase fills the infrastructure gaps only — no new business logic needed.

### 1.1 WebSocket Transport (Days 1–3)

The Go backend already has all the data (fixtures, markets, match timelines, bet states) — it just can't push it in real time yet.

- Add `nhooyr.io/websocket` to the gateway service
- Four channel types, matching Scala's model:
  - `markets:{fixtureId}` — odds changes, suspensions, settlements
  - `fixtures:{sportKey}` — status changes, score updates
  - `bets:{userId}` — settlement, cashout confirmations
  - `wallet:{userId}` — balance updates
- JWT auth on upgrade handshake (reuse existing auth middleware)
- In-process pub/sub initially (Go channels), Redis pub/sub later for multi-instance
- Heartbeat ping/pong with 30s timeout

### 1.2 Database Migrations (Days 2–4)

The Go backend already has domain models and repository interfaces. This just formalizes the schema.

- Integrate `goose` for versioned migrations
- Port schema from Scala's Flyway migrations for: punters, fixtures, tournaments, markets, selections, bets, wallets, ledger_entries, freebets, odds_boosts, audit_logs, match_timelines
- Indexes: (fixture_id, status), (sport_key, status), (user_id, bet_status), (market_id)
- Seed data script for dev/test environments
- Wire `SQLReadRepository` (already exists) to migration-managed schema

### 1.3 Redis Caching (Days 4–5)

- Add `go-redis/redis` client to gateway
- Cache hot paths: fixture lists (5s), market odds (1s), sports catalog (1hr), user sessions (5min)
- Cache-aside with invalidation on write
- Prometheus hit/miss counters (extend existing metrics)

### 1.4 Sport-Specific Market Types (Days 5–8)

The sports catalog and fixture/market infrastructure already exist. This extends the canonical schema with sport-specific market definitions and settlement rules.

- Extend `canonical/v1` market type enum:
  - Football: 1X2, BTTS, over/under, corners, cards, halftime result, Asian handicap
  - NFL/NCAAF: spread, total, moneyline, player props (passing yards, TDs)
  - NBA/NCAAB: spread, total, quarter lines, player props (points, rebounds, assists)
  - MLB: run line, total, innings markets, player props (hits, strikeouts)
  - NHL: puck line, total, period markets
  - Tennis: match winner, set betting, game handicap, total games
  - UFC/Boxing: method of victory, round betting, fight props
  - Esports: already complete (47+ types from Scala reference)
- Add sport-specific settlement resolvers (winner determination per market type)
- Provider adapter config per sport (which feed supplies which sport)
- Odds validation ranges per market type

### 1.5 Payment Gateway Stub + Compliance Hooks (Days 8–10)

Full PXP Financial integration is a production deployment concern. For now, build the interfaces so the frontend can be wired up.

- Payment service interface: `Deposit(userId, amount, method)`, `Withdraw(userId, amount, method)`, `GetMethods(userId)`
- In-memory implementation for dev (instant approve, mirrors wallet service)
- Webhook handler structure for async payment callbacks
- GeoComply/IdComply: interface definitions + mock implementations
- Responsible gambling controls: deposit/bet limits enforcement in bet placement handler (the wallet already tracks balances — this adds ceiling checks)
- DGE reporting endpoint stubs that query existing audit_logs + bets tables

---

## Phase 2: Design System + Frontend Foundation (Days 5–15, overlaps with Phase 1)

### 2.1 Design Tokens & Shared Components (Days 5–8)

Create a `design-system` package in the existing monorepo. No framework migration yet — these components work in both Pages Router and App Router.

**Design tokens from MG reference:**
```
Colors:      #1a1a2e (bg), #2d2d44 (surface), #4a4a5e (card), #3d3d5c (border)
             #ffffff (text), #9a9aad (secondary), #f5c842 (live), #4cd964 (done), #e85a71 (error)
Typography:  Barlow 700/56px (score), 700/28px (heading), 600/18px (subhead), 400/14px (body)
Spacing:     4/8/16/24/32px scale
Radius:      8/12/16px
Motion:      0.2s ease transitions, 2s pulsing for live indicators
Breakpoints: 640px (mobile), 900px (tablet), 1200px (desktop)
```

**Core components (styled-components, dark theme):**
- Button, Card, Badge (status-colored), Table (sortable/paginated)
- Sidebar (collapsible), Header (with nav + search + user menu)
- Modal, Tabs, Form inputs, Toast, Loading skeleton
- ScoreDisplay (large typography, team logos, live animation)
- OddsButton (with movement indicator: up/down/steady)
- MatchCard (dark card with status badge, quick-bet buttons)

### 2.2 API Client Layer (Days 8–10)

- Write OpenAPI 3.0 spec for Go backend's existing routes (or generate with `swaggo/swag`)
- Generate TypeScript client with `orval` (type-safe, includes request/response types)
- WebSocket client class: connect, subscribe to channels, typed event handlers, auto-reconnect
- Auth interceptor: inject Bearer token, handle 401 → refresh → retry
- Shared between both apps as `@phoenix-ui/api-client` package

### 2.3 App Router Migration Scaffold (Days 10–15)

Migrate both apps to Next.js 14 App Router in place (same monorepo, new `app/` directories alongside existing `pages/`).

**Player App — new `app/` routes:**
- `app/layout.tsx` — dark theme shell, Barlow font, sidebar + header
- `app/page.tsx` — home (featured, live, upcoming)
- `app/sports/[sport]/page.tsx` — sport landing
- `app/sports/[sport]/[league]/page.tsx` — league fixtures
- `app/match/[id]/page.tsx` — match detail with markets
- `app/live/page.tsx` — all live matches
- `app/cashier/page.tsx` — deposit/withdraw
- `app/profile/page.tsx` — account settings
- `app/bets/page.tsx` — bet history

**Backoffice — new `app/` routes:**
- `app/layout.tsx` — dark theme admin shell
- `app/dashboard/page.tsx` — overview widgets
- `app/trading/page.tsx` — live market management
- `app/risk-management/page.tsx` — risk dashboard
- `app/risk-management/fixtures/page.tsx` — fixture list
- `app/risk-management/fixtures/[id]/page.tsx` — fixture detail
- `app/risk-management/markets/[id]/page.tsx` — market detail
- `app/users/page.tsx` — punter search
- `app/users/[id]/page.tsx` — punter detail
- `app/audit-logs/page.tsx` — audit trail
- `app/reports/page.tsx` — reporting

---

## Phase 3: Player App Build-Out (Days 15–30)

### 3.1 Core Experience (Days 15–20)

**Home page:** Featured matches grid (MG-style cards), live now section with pulsing indicators, upcoming matches by sport. WebSocket-connected for live score updates.

**Sport/League browsing:** Left sidebar with sport icons and live match counts. Click sport → league list → fixture list. Filter by live/upcoming/finished (MG-style filter badges with count pills).

**Match detail:** Full market list grouped by category (main, totals, handicaps, props). Each market expandable with selection buttons showing decimal/American odds. Live match: timeline with incidents, animated score, period clock.

### 3.2 Betting Flow (Days 20–25)

**Betslip:** Right sidebar (desktop) / slide-up panel (mobile). Single and multi/parlay toggle. Each leg shows: teams, market name, selection, odds with live movement indicator. Stake input with quick buttons ($5/$10/$25/$50/$100). Potential return calculator. Freebet dropdown (if eligible). Odds boost indicator (boosted in green, original struck through). Place bet → confirmation → receipt.

**Bet history:** Filterable by status (open, won, lost, cashed out), sport, date range. Each bet expandable to show legs, stake, return, settlement details.

### 3.3 Account & Cashier (Days 25–30)

**Cashier:** Deposit (card input, saved methods, amount presets) and withdraw (method, amount, processing time). Transaction history.

**Profile:** Personal details, password change, responsible gambling settings (deposit limits, session limits, cool-off, self-exclusion), verification status, notification preferences.

**Auth flow:** Login/register modals. Token management (access + refresh). Protected routes. Session timeout warning.

---

## Phase 4: Backoffice Build-Out (Days 15–30, parallel with Phase 3)

### 4.1 Dashboard (Days 15–18)

Dark theme admin dashboard with data widgets: revenue (today/week/MTD with sparkline), active bets count, live matches by sport, risk alerts feed, top markets by handle, recent admin activity. All WebSocket-connected for real-time updates.

### 4.2 Trading View (Days 18–23)

The core value of the backoffice — real-time market management.

- Live fixture board: grid of in-play matches, one card per fixture
- Each card: current score, match clock, market count, suspension status
- Click fixture → market list with: odds, bet count, liability, suspend/resume toggle
- Settlement panel: select winning selection → confirm → view affected bets
- Bulk actions: suspend all markets, cancel fixture
- Manual odds adjustment with audit trail
- All updates via WebSocket — no polling

### 4.3 Risk & User Management (Days 23–28)

**Risk dashboard:** Player risk scores (from existing `/admin/risk/` endpoints), high-stake bet alerts, liability by fixture/market, combo exposure, segment management (VIP/standard/restricted), manual overrides with notes.

**User management:** Punter search (name, email, status, risk score), profile view (details, verification, segment), account actions (suspend, activate, reset password, add notes), per-punter bet history with P&L, wallet view (balance, ledger, pending withdrawals), responsible gambling overrides.

### 4.4 Audit & Reporting (Days 28–30)

**Audit logs:** Full trail from existing `/admin/audit-logs` endpoint. Filterable by action type, user, date range. Detail view with before/after state.

**Reports:** Revenue by sport/league/market type, settlement breakdown (win/loss/void/push), user acquisition metrics, promotional ROI (freebet/boost campaigns). Export to CSV/PDF.

---

## Phase 5: Integration, Testing & Polish (Days 30–40)

### 5.1 Frontend ↔ Go Backend Wiring (Days 30–33)

- Point both apps to Go backend (gateway :18080, auth :18081)
- Verify every API contract: request shapes, response shapes, error codes
- WebSocket integration: live odds flow end-to-end, bet settlement notifications
- Auth flow: login → store tokens → refresh cycle → session guard
- Error boundaries: API failures, network drops, token expiration

### 5.2 End-to-End Test Suites (Days 33–37)

**Player App critical paths (Playwright):**
1. Browse → select match → add to betslip → place bet → verify in bet history
2. Login → deposit → place bet → match settles → verify payout → withdraw
3. Set deposit limit → attempt over-limit → verify rejection
4. Live match: verify score updates arrive via WebSocket within 1s

**Backoffice critical paths (Playwright):**
1. Login → dashboard loads → drill into fixture → suspend market → verify player app reflects
2. Search user → view profile → suspend account → verify login blocked
3. Settle market → verify all bets update → verify wallet payouts
4. Generate report → verify data matches bet/settlement records

### 5.3 Performance & Security (Days 37–40)

**Performance targets:**
- API: <100ms p95 reads, <200ms p95 writes
- WebSocket: <50ms event-to-client latency
- Frontend: Lighthouse >90, LCP <2.5s
- Load: 10K concurrent WebSocket connections, 1K bets/second

**Security:**
- OWASP Top 10 review
- Auth token rotation and storage audit
- CSRF + CSP headers
- Dependency vulnerability scan
- Admin privilege escalation tests
- Payment flow penetration testing

---

## Phase 6: Production Deployment (Days 40–45)

### 6.1 Infrastructure

- Kubernetes manifests (extend existing `k8s-operations/`)
- PostgreSQL with read replica for reporting queries
- Redis for caching + WebSocket pub/sub fan-out
- CDN for player app static assets
- Load balancer with WebSocket sticky sessions
- TLS everywhere, automated cert management
- Environment configs: staging → production promotion

### 6.2 Observability

- Prometheus + Grafana dashboards (extend existing `ops/prometheus/`)
- Alerts: error rate >1%, p95 >500ms, WebSocket disconnect spikes, settlement backlog
- Business alerts: liability threshold breach, unusual bet patterns
- Structured logging with correlation IDs
- Distributed tracing (OpenTelemetry)

### 6.3 Launch Checklist

- [ ] All Playwright E2E suites green
- [ ] Performance targets met under load test
- [ ] Security audit — no critical/high findings
- [ ] Responsible gambling controls verified
- [ ] Runbooks: market settlement, user suspension, incident response, rollback
- [ ] Data migration plan (if preserving Scala-era history)
- [ ] DNS cutover with rollback procedure
- [ ] On-call rotation + PagerDuty configured

---

## Timeline Summary — 8 Weeks

| Days | Phase | Deliverables |
|------|-------|-------------|
| 1–5 | Backend | WebSocket transport, DB migrations, Redis caching |
| 5–10 | Backend + Design | Sport market types, payment/compliance stubs, design tokens + components |
| 10–15 | Frontend Foundation | API client generation, App Router scaffolds for both apps |
| 15–25 | Player App | Home, sport browsing, match detail, betslip, live experience |
| 15–25 | Backoffice (parallel) | Dashboard, trading view, risk management |
| 25–30 | Both Apps | Cashier, profile, user management, audit/reporting |
| 30–37 | Integration | Backend wiring, E2E test suites |
| 37–40 | Polish | Performance optimization, security audit |
| 40–45 | Deploy | Infrastructure, monitoring, launch |

**Critical path:** WebSocket transport (blocks live features) → Design system (blocks both app builds) → Trading view (highest-value backoffice feature).

**Parallelizable:** Player App and Backoffice build-out run concurrently (Days 15–30). Backend gaps and design system overlap (Days 5–10).

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Provider feed integration delays | No live data for non-esports | Medium | Use mock feeds for dev, real feeds only needed for production launch |
| WebSocket scaling under load | Dropped connections, stale data | Low | In-process pub/sub for MVP, Redis fan-out before launch |
| Next.js 14 migration breaks existing pages | Lost functionality during transition | Medium | Keep Pages Router running alongside App Router, feature-flag switch |
| Payment gateway certification timeline | Can't accept real money at launch | High | Launch with demo/play-money mode, payment integration as fast-follow |
| Regulatory review delays | Launch blocked pending approval | High | Submit for review at Day 20, don't gate engineering work on it |
| Design system scope creep | Frontend delayed | Medium | Ship with core 12 components, add more post-launch |

---

## What's NOT in Scope (Post-Launch)

- Native mobile apps (iOS/Android) — web-first, PWA for mobile
- Social features (chat, tipping, leaderboards)
- Live streaming integration
- Advanced analytics dashboard (BI tool integration)
- Multi-currency / multi-language beyond EN
- Affiliate/referral system
- Full OAuth/SSO (current token auth is sufficient for launch)
