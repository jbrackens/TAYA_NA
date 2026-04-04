# Phoenix Sportsbook: Release Changelog

## [1.0.0] - 2026-04-02

### Initial Production Release

Phoenix Sportsbook platform reaching production-ready status. Complete sportsbook solution with real-time betting, market management, and comprehensive compliance framework.

### Major Features

#### Multi-Sport Support
- Football (including NFL, Premier League, La Liga, Serie A, Bundesliga)
- Basketball (NBA, EuroLeague)
- Tennis (Grand Slams, ATP, WTA)
- Cricket (Test, ODI, T20)
- American Football (NFL, College Football)
- Ice Hockey (NHL)
- Baseball (MLB)
- Extensible architecture for adding new sports

#### Market Types & Betting Options
- **Moneyline** — Simple win/loss/draw betting
- **Spread Betting** — Points/goals spread with -1.5/+1.5 style pricing
- **Totals** — Over/under betting on combined points
- **Props** — Player and game-specific prop bets
- **Player Props** — Individual player performance bets
- **Parlays** — Multi-leg accumulators with automatic odds calculation

#### Real-Time Betting Engine
- **WebSocket Architecture** — Instant odds and bet confirmations
- **Live Odds Updates** — Sub-100ms broadcast of odds changes to all connected clients
- **Concurrent User Support** — Designed for 10,000+ simultaneous WebSocket connections
- **Automatic Failover** — Graceful handling of connection drops with auto-reconnect
- **Multi-Market Streaming** — Subscribe to specific markets or all markets

#### Player Features
- **Dark Theme Interface** — Modern, eye-friendly design
- **Bet Slip Management** — Add/remove selections with live odds recalculation
- **Accumulator Builder** — Easy multi-leg bet construction
- **Live Betting** — Place bets during matches with in-play odds
- **Quick Bet** — One-click bet placement with customizable stake
- **Bet History** — View all past bets with detailed settlement information
- **Cash Out** — Early settlement of bets at current market prices
- **Responsible Gaming** — Session limits, deposit limits, self-exclusion options

#### Backoffice Administration
- **Real-Time Exposure Tracking** — Live P&L for each market
- **Market Control** — Manual suspend/resume of markets
- **Odds Management** — View and adjust odds across all markets
- **Settlement Tools** — Manual market settlement with result confirmation
- **User Management** — Account suspension, KYC verification, balance adjustment
- **Trading View** — Advanced trading interface for professional traders
- **Risk Monitoring** — Automatic alerts for exposure threshold breaches
- **Audit Logs** — Complete action trail for compliance

#### Financial Management
- **Wallet System** — User account balance and transaction tracking
- **Deposit Processing** — Credit card and bank transfer integration (stub implementation)
- **Withdrawal Management** — Approval workflow and fund transfer
- **Ledger** — Complete transaction history with detailed categorization
- **Free Bets** — Promotional freebet allocation and usage tracking
- **Odds Boosts** — Enhanced odds for selected markets
- **Settlement** — Automatic payout calculation and wallet credit

#### Compliance & Audit
- **KYC/AML Framework** — User identity verification hooks
- **Audit Logging** — All user actions logged with timestamp and IP
- **Data Retention Policies** — Configurable retention for different data types
- **Regulatory Reporting** — Export capabilities for regulatory submission
- **User Suspension** — Account restrictions and banning capability
- **Transaction Monitoring** — Suspicious pattern detection framework

#### Trading Features (Backoffice)
- **Live Market View** — Real-time odds and bet flow visualization
- **Odds Trading** — Move odds up/down to manage exposure
- **Market Suspension** — Instant market closure with queue management
- **Bet Acceptance/Rejection** — Manual control over bet placement
- **Risk Limit Configuration** — Set exposure limits per market, fixture, and user
- **Player Exposure** — View individual user's potential payout

### Technology Stack

#### Backend Services
- **Gateway Service** — Go 1.24, handles all API requests and WebSocket connections
- **Auth Service** — Go 1.24, dedicated authentication and token management
- **Database** — PostgreSQL 16 with comprehensive schema design
- **Cache** — Redis 7 for sessions, market data, and pub/sub
- **Container Runtime** — Docker with multi-stage builds
- **Orchestration** — Kubernetes 1.28+ for production deployment

#### Frontend Applications
- **Player App** — Next.js 14, React 18, TypeScript
- **Backoffice** — Next.js 14, React 18, TypeScript
- **Design System** — Shared component library, Ant Design 4
- **API Client** — TypeScript client with OpenAPI integration

#### DevOps & Infrastructure
- **CI/CD** — GitHub Actions for automated testing and deployment
- **Version Control** — Git with conventional commits
- **Container Registry** — Docker Hub, Google Artifact Registry, or equivalent
- **Infrastructure as Code** — Kubernetes manifests, Docker Compose for dev
- **Monitoring** — Prometheus for metrics, Grafana for dashboards
- **Logging** — Structured logging with ELK Stack support

### Performance Characteristics

- **Bet Placement Latency** — < 100ms (P95)
- **WebSocket Broadcast** — < 100ms for odds update to all subscribers
- **Database Query Time** — < 50ms (P95) for typical queries
- **Page Load Time** — < 2s (First Contentful Paint)
- **Concurrent WebSocket Connections** — 10,000+ per Gateway instance
- **Throughput** — 1,000+ API requests per second per Gateway instance

### Database Schema

Complete schema with 12 tables:
- `punters` — User accounts
- `sports` — Sport types
- `tournaments` — Leagues and tournaments
- `fixtures` — Individual matches/games
- `markets` — Betting markets
- `selections` — Market outcomes
- `bets` — User bets
- `wallets` — User account balances
- `ledger_entries` — Financial transactions
- `freebets` — Promotional free bets
- `audit_logs` — Action audit trail
- `match_timelines` — Live match events

See migrations in `go-platform/services/gateway/migrations/` for full schema details.

### Security Features

- **TLS 1.3** — All external communication encrypted
- **JWT Tokens** — Stateless authentication with configurable TTL
- **Password Security** — Bcrypt hashing with salt
- **Rate Limiting** — Per-IP request throttling
- **Input Validation** — All user inputs validated
- **SQL Injection Prevention** — Parameterized queries throughout
- **CORS Configuration** — Configurable allowed origins
- **Secrets Management** — Environment variables for sensitive data

### High Availability

- **Stateless Services** — Gateway and Auth can scale horizontally
- **Database Replication** — PostgreSQL streaming replication for failover
- **Connection Pooling** — PgBouncer or application-level pooling
- **Cache Redundancy** — Redis cluster with automatic failover
- **Load Balancing** — Session-aware load balancing for WebSocket
- **Graceful Shutdown** — 30-second drain period before termination

### Scalability

- **Horizontal Scaling** — Add more Kubernetes pods for Gateway/Auth
- **Vertical Scaling** — Increase instance resources as needed
- **Database Scaling** — Read replicas for reporting, sharding for large deployments
- **CDN Integration** — Static assets cached at edge
- **Caching Strategy** — Multi-layer caching (browser, CDN, application, database)

### Testing & Quality Assurance

- **Unit Tests** — Go tests for all business logic
- **Integration Tests** — Database and API integration testing
- **E2E Tests** — Playwright tests for critical user paths
- **Load Testing** — Apache JMeter/k6 baseline established
- **Security Testing** — Dependency scanning, secrets detection
- **Performance Testing** — Response time and throughput benchmarks

### Documentation

- **ARCHITECTURE.md** — System design and data flow
- **DEVELOPMENT.md** — Local development setup guide
- **DEPLOYMENT.md** — Production deployment procedures
- **RUNBOOKS.md** — Operational procedures and incident response
- **README.md** — Project overview and quick start

### Known Limitations

- **Payment Processing** — Stub implementation only, requires payment provider integration
- **Provider Integration** — Example provider integration, requires actual feed connection
- **Single Region** — Deployed in single cloud region, multi-region requires additional setup
- **Data Retention** — Default 90-day retention, configurable as needed
- **Support Hours** — Support during business hours (configurable)

### Bug Fixes & Improvements

- [CORE-001] Fixed WebSocket connection leak on client disconnect
- [CORE-002] Improved database query performance with additional indexes
- [CORE-003] Enhanced error handling for network timeouts
- [CORE-004] Fixed race condition in wallet debit/credit operations
- [CORE-005] Improved logging for debugging production issues
- [CORE-006] Fixed CORS configuration for cross-origin requests
- [CORE-007] Enhanced form validation in Player App
- [CORE-008] Fixed ledger decimal precision issues

### Migration Guide

**For users upgrading from beta:**
1. No breaking changes — all APIs are backward compatible
2. Database schema is stable — no migrations required from beta
3. Recommended: Update to latest client version for bug fixes

**For new installations:**
1. Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for infrastructure setup
2. See [DEVELOPMENT.md](./DEVELOPMENT.md) for local development
3. Review [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) before going live

### Breaking Changes

None. Full backward compatibility with beta releases.

### Deprecations

None at this time.

### Future Roadmap

#### v1.1.0 (Q2 2026)
- Live streaming integration
- Voice betting capability
- Enhanced analytics dashboard
- Mobile native apps

#### v1.2.0 (Q3 2026)
- Multi-currency support
- API webhooks for third-party integration
- Advanced trading algorithms
- Tier-based user rewards program

#### v2.0.0 (Q4 2026)
- Blockchain settlement (if regulatory approval obtained)
- Peer-to-peer betting
- Custom market creation by users
- Advanced visualization tools

### Contributors & Acknowledgments

Phoenix Sportsbook was developed by the Phoenix team. Special thanks to all testers and early users who provided feedback.

### License

All rights reserved. Phoenix Sportsbook Platform.

### Support

For issues or questions:
- **Technical Support** — support@phoenix-sportsbook.com
- **Bug Reports** — bugs@phoenix-sportsbook.com
- **Feature Requests** — features@phoenix-sportsbook.com

---

## Older Releases

### [0.9.0] - Beta Release

Initial beta release with core functionality for testing.

### [0.5.0] - Alpha Release

Early alpha with basic betting functionality.
