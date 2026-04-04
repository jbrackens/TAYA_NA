# Phoenix Sportsbook Platform Architecture

Comprehensive system design documentation for the Phoenix Sportsbook platform.

## System Overview

Phoenix Sportsbook is a distributed, event-driven betting platform consisting of specialized microservices handling authentication, bet placement, market management, and real-time updates.

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ Client Layer                                                     │
├──────────────────────────┬──────────────────────┬────────────────┤
│ Player App               │ Backoffice Admin     │ Third-party    │
│ (Next.js, React)         │ (Next.js, React)     │ Integrations   │
│ :3002                    │ :3000                │                │
└──────────┬───────────────┴──────────┬───────────┴────────────────┘
           │                          │
           └──────────┬───────────────┘
                      │ HTTP/WebSocket
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ Service Layer (Go)                                               │
├────────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ API Gateway (:18080)                                    │    │
│  │ - Request routing and validation                        │    │
│  │ - WebSocket connection management                       │    │
│  │ - Real-time event broadcasting                          │    │
│  │ - Rate limiting and DDoS protection                     │    │
│  └────────┬──────────────────────────────────────────────┬─┘    │
│           │                                              │       │
│  ┌────────▼───────────────┐              ┌──────────────▼────┐  │
│  │ Auth Service (:18081)  │              │ Cache Layer       │  │
│  │ - User login/logout    │              │ (Redis)           │  │
│  │ - JWT token validation │              │ - Session cache   │  │
│  │ - Session management   │              │ - Market cache    │  │
│  │ - Permissions check    │              │ - User balance    │  │
│  └────────────────────────┘              └───────────────────┘  │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ TCP/JDBC
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ Data Layer (PostgreSQL)                                          │
├──────────────────────────────────────────────────────────────────┤
│ - Schema: sports, tournaments, fixtures, markets, selections    │
│ - Transactional: bets, wallets, ledger                          │
│ - Audit: audit_logs, match_timelines                            │
│ - Indexes: on hot queries, partial indexes for status filters   │
└──────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────┐
                    │ Monitoring & Logging │
                    │ (Prometheus, Grafana)│
                    └──────────────────────┘
```

## Service Descriptions

### 1. API Gateway Service (:18080)

The primary entry point for all client requests. Handles request routing, validation, WebSocket management, and real-time event broadcasting.

**Key Responsibilities:**
- REST API endpoint for bet placement, market queries, and user operations
- WebSocket server for real-time market updates and live odds
- Authentication token validation (delegates to Auth Service)
- Request rate limiting and abuse prevention
- Real-time event broadcasting via Redis pub/sub
- Graceful connection handling for 10K+ concurrent WebSocket clients

**Dependencies:**
- PostgreSQL (read/write access to all tables)
- Redis (session cache, pub/sub for events)
- Auth Service (token validation)

**Configuration:**
```
GATEWAY_PORT=18080
GATEWAY_DB_DSN=postgres://user:pass@host/db
REDIS_URL=redis://host:6379/0
LOG_LEVEL=info
```

**Health Checks:**
- `/api/v1/status` — Returns 200 if database and Redis are connected

### 2. Auth Service (:18081)

Dedicated authentication and authorization service. Validates credentials, issues JWT tokens, and manages user sessions.

**Key Responsibilities:**
- User login and password verification
- JWT token generation with configurable TTL
- Session management and token refresh
- Permission and role validation
- Account suspension and lockout management

**Dependencies:**
- PostgreSQL (punters table only)
- Redis (session tokens and rate limiting)

**Configuration:**
```
AUTH_PORT=18081
AUTH_DB_DSN=postgres://user:pass@host/db
REDIS_URL=redis://host:6379/0
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h
```

**Token Format:**
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234571490,
  "roles": ["user"]
}
```

### 3. Player App Frontend (Next.js 14)

Modern, responsive React-based sportsbook interface for bettors. Features dark theme, live odds streaming, and complete bet lifecycle management.

**Key Features:**
- Live odds display with WebSocket updates
- Bet slip with accumulator support
- Account management and deposit/withdrawal
- Responsible gaming controls
- Mobile-responsive design

**Tech Stack:**
- Next.js 14 with App Router
- React 18
- TypeScript
- Ant Design 4 (component library)
- Real-time WebSocket client

**Environment Variables:**
```
ENV_NAME=local/staging/production
API_GLOBAL_ENDPOINT=http://gateway:18080
WS_GLOBAL_ENDPOINT=ws://gateway:18080/ws
CDN_URL=https://cdn.example.com
```

### 4. Backoffice Admin Dashboard (Next.js 14)

Administrative interface for risk managers, traders, and operators. Provides real-time exposure monitoring, market control, and user management.

**Key Features:**
- Live market suspension/resume
- Manual market settlement
- User account management
- Risk limit configuration
- Exposure and profit/loss tracking
- Audit log review
- System health monitoring

**Tech Stack:**
- Next.js 14 with App Router
- React 18
- TypeScript
- Ant Design 4
- Real-time API polling

**Environment Variables:**
```
API_ENDPOINT=http://gateway:18080
ADMIN_PANEL_SECRET=secret-key
REDIS_URL=redis://host:6379/0
```

## Data Flow: Bet Lifecycle

### 1. User Login

```
Player App
  └─> POST /auth/login
       ├─> Auth Service validates credentials
       ├─> Issues JWT token
       ├─> Stores session in Redis
       └─> Returns token to client
```

### 2. Viewing Markets

```
Player App
  └─> GET /api/v1/fixtures/:id/markets
       ├─> Gateway validates JWT token
       ├─> Queries PostgreSQL for markets
       ├─> Reads cached odds from Redis
       └─> Returns market data + current odds
```

### 3. Bet Placement

```
Player App
  └─> POST /api/v1/bets
       │
       ├─> Validate request & token (Auth Service)
       │
       ├─> Check user wallet balance (Redis cache)
       │
       ├─> Verify market is open (PostgreSQL)
       │
       ├─> Check selection exists & odds valid
       │
       ├─> Create bet record in database
       │   (Transaction: INSERT bets, UPDATE wallet, INSERT ledger_entry)
       │
       ├─> Broadcast bet placement event via Redis pub/sub
       │   └─> Backoffice receives live exposure update
       │
       ├─> Add to active bets cache (Redis)
       │
       └─> Return bet confirmation to player
```

### 4. Real-Time Market Updates

```
WebSocket Feed (External Provider)
  │
  ├─> Gateway receives odds update
  │
  ├─> Updates Redis cache (market odds)
  │
  ├─> Publishes update via Redis pub/sub
  │
  └─> All connected WebSocket clients receive live update
       ├─> Player App: Updates odds display
       └─> Backoffice: Updates trading view
```

### 5. Bet Settlement

```
Backoffice Admin
  │
  └─> POST /api/v1/admin/markets/:id/settle
       │
       ├─> Validate admin credentials
       │
       ├─> Mark market as settled (SETTLED status)
       │
       ├─> Calculate winning/losing bets
       │   FOR EACH bet ON this market:
       │     ├─> Determine selection result
       │     ├─> Calculate payout
       │     ├─> Update wallet if winning
       │     ├─> Create ledger entry for settlement
       │     └─> Update bet status
       │
       ├─> Update affected user wallets
       │
       ├─> Create audit log entry
       │
       ├─> Broadcast settlement via Redis pub/sub
       │
       └─> Player receives settlement notification
            └─> Account balance updates in real-time
```

## Real-Time Architecture: WebSocket Channels

### WebSocket Connection Flow

```
Client
  │
  └─> CONNECT ws://gateway:18080/ws?token=JWT
       │
       ├─> Gateway validates JWT token
       │
       ├─> Creates WebSocket connection in-memory
       │
       ├─> Subscribes to user's Redis channels:
       │   ├─> user:{user_id}:bets (bet confirmations)
       │   ├─> user:{user_id}:wallet (balance updates)
       │   ├─> market:{market_id}:odds (odds updates)
       │   ├─> market:{market_id}:status (market open/close)
       │   └─> notifications:admin (for backoffice users)
       │
       └─> Maintains connection until client disconnects
            or 24-hour idle timeout
```

### Redis Pub/Sub Channel Structure

```
user:{user_id}:bets
  Payload: {action: "bet_placed"|"bet_settled", bet_id, status, ...}
  Subscribers: Player App (WebSocket), Backoffice (WebSocket)

user:{user_id}:wallet
  Payload: {previous_balance, new_balance, transaction_id, reason}
  Subscribers: Player App (WebSocket), Backoffice

market:{market_id}:odds
  Payload: {selection_id, back_price, lay_price, timestamp}
  Subscribers: All Player App connections, Backoffice

market:{market_id}:status
  Payload: {market_id, status: "open"|"suspended"|"closed"|"settled"}
  Subscribers: All connected clients for this market

notifications:admin
  Payload: {event_type: "exposure_threshold"|"suspension"|"large_bet", data}
  Subscribers: Backoffice Admin connections
```

### Event Broadcasting Example

```
Market Odds Update Arrives
  ↓
Gateway receives from feed
  ↓
redis.Publish("market:12345:odds", {
  selection_id: "sel_001",
  back_price: 2.5,
  lay_price: 2.55,
  timestamp: 1234567890
})
  ↓
Redis pub/sub broadcasts to all subscribers
  ↓
Each Gateway instance receives event
  ↓
Gateway broadcasts to its connected WebSocket clients via
  WS.WriteJSON({
    type: "odds_update",
    market_id: "12345",
    odds: {...}
  })
  ↓
Client receives and updates UI immediately
```

## Database Schema Overview

### Core Tables

**punters** (Users)
```
id (UUID)           -- Primary key
email (TEXT)        -- Unique email address
password_hash       -- Bcrypt hash
status              -- active|suspended|locked
kyc_status          -- verified|pending|rejected
created_at          -- Timestamp
updated_at          -- Timestamp
```

**sports** (Reference Data)
```
id (UUID)           -- Primary key
name (TEXT)         -- "Football", "Basketball", etc.
code (TEXT)         -- "NFL", "NBA", etc.
```

**tournaments** (Reference Data)
```
id (UUID)           -- Primary key
sport_id (FK)       -- Links to sports
name (TEXT)         -- "Super Bowl", "Premier League", etc.
season (TEXT)       -- "2024", "2024-2025", etc.
```

**fixtures** (Matches/Games)
```
id (UUID)           -- Primary key
tournament_id (FK)
sport_id (FK)
team_a (TEXT)
team_b (TEXT)
scheduled_at        -- Match start time
status              -- scheduled|in_progress|completed|abandoned
```

**markets** (Betting Markets)
```
id (UUID)           -- Primary key
fixture_id (FK)
market_type         -- moneyline|spread|totals|props|player_props
status              -- open|suspended|closed|settled
settlement_type     -- auto|manual
created_at
closed_at
settled_at
```

**selections** (Outcomes/Options within a Market)
```
id (UUID)           -- Primary key
market_id (FK)
selection_type      -- team_a|team_b|draw|over|under|yes|no
odds (DECIMAL)      -- Current odds
result              -- null|win|loss|void (before settlement)
created_at
```

**bets** (User Bets)
```
id (UUID)           -- Primary key
punter_id (FK)      -- User who placed the bet
selection_id (FK)   -- What they bet on
fixture_id (FK)     -- Which fixture/market
stake (BIGINT)      -- In cents: 1000 = $10.00
odds (DECIMAL)      -- Odds at time of placement
status              -- pending|won|lost|void|pushed|cashout
payout (BIGINT)     -- Calculated payout (null until settled)
placed_at
settled_at
```

**wallets** (User Accounts)
```
id (UUID)           -- Primary key
punter_id (FK)      -- User account
balance (BIGINT)    -- Current balance in cents
created_at
updated_at
```

**ledger_entries** (Transaction History)
```
id (UUID)           -- Primary key
wallet_id (FK)
bet_id (FK)         -- Optional: links to bet settlement
transaction_type    -- deposit|withdrawal|bet_placement|settlement|bonus
amount (BIGINT)     -- Signed: positive=credit, negative=debit
previous_balance
new_balance
created_at
```

**freebets** & **odds_boosts** (Promotions)
```
id (UUID)
punter_id (FK)
amount/boost_multiplier
status              -- available|used|expired|cancelled
expires_at
created_at
```

**audit_logs** (Compliance)
```
id (UUID)           -- Primary key
punter_id (FK)      -- Null for admin actions
action_type         -- bet_placed|account_updated|suspension|etc
details (JSONB)     -- Action details
ip_address
user_agent
created_at
```

**match_timelines** (Live Match Events)
```
id (UUID)           -- Primary key
fixture_id (FK)
event_type          -- goal|card|substitution|injury_time|etc
minute (INT)        -- Match minute (0-120+)
team (TEXT)         -- Which team
player (TEXT)       -- Optional: player involved
details (JSONB)     -- Additional info
created_at
```

### Key Indexes

```sql
-- Hot path queries
CREATE INDEX idx_bets_punter_id ON bets(punter_id);
CREATE INDEX idx_bets_status ON bets(status) WHERE status != 'settled';
CREATE INDEX idx_markets_fixture_id ON markets(fixture_id);
CREATE INDEX idx_selections_market_id ON selections(market_id);
CREATE INDEX idx_wallets_punter_id ON wallets(punter_id);
CREATE INDEX idx_ledger_punter_id ON ledger_entries(wallet_id);
CREATE INDEX idx_audit_punter_id ON audit_logs(punter_id);

-- Historical queries
CREATE INDEX idx_bets_placed_at ON bets(placed_at DESC);
CREATE INDEX idx_fixtures_scheduled_at ON fixtures(scheduled_at DESC);
```

### Relationships and Cardinality

```
User (1) ──→ (N) Bets
User (1) ──→ (N) Wallets (actually 1-to-1, but designed for multi-wallet)
User (1) ──→ (N) Ledger Entries
User (1) ──→ (N) Audit Logs

Fixture (1) ──→ (N) Markets
Market (1) ──→ (N) Selections
Selection (1) ──→ (N) Bets

Fixture (1) ──→ (N) Match Timelines
Tournament (1) ──→ (N) Fixtures
Sport (1) ──→ (N) Tournaments
```

## Authentication Flow

### Token-Based Authentication

```
1. User Login
   POST /auth/login
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ↓
2. Auth Service validates credentials
   ├─> Query punters table by email
   ├─> Verify bcrypt password hash
   └─> Check account status (not suspended/locked)
   ↓
3. Issue JWT Token
   Token = JWT.Sign({
     sub: user_id,
     email: user@example.com,
     iat: now,
     exp: now + 24h,
     roles: ['user']
   }, SECRET)
   ↓
4. Store session in Redis
   SET session:{token_hash} {user_id}:{role}
   EXPIRE 86400 (24 hours)
   ↓
5. Return to client
   {
     "token": "eyJhbGc...",
     "expires_in": 86400,
     "user": {...}
   }
```

### Request Authentication

```
Client sends request with Authorization header:
  Authorization: Bearer eyJhbGc...

Gateway receives request:
  ├─> Extract token from header
  ├─> Verify JWT signature (using JWT_SECRET)
  ├─> Check expiration timestamp
  ├─> Query Auth Service for token validation
  │   (optional: bypass if token is fresh)
  ├─> Check Redis for session existence
  ├─> Validate user status (not suspended)
  └─> Proceed with request or return 401

Token Refresh:
  POST /auth/refresh
  {
    "token": "old_token"
  }
  ↓
  Auth Service validates old token
  ↓
  Issues new token with fresh expiration
  ↓
  Invalidates old token in Redis
```

## Deployment Topology

### Kubernetes Architecture (Production)

```
┌─────────────────────────────────────────────────────────────┐
│ Kubernetes Cluster                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Ingress Controller (nginx)                           │  │
│  │ - TLS termination                                    │  │
│  │ - Route /api to Gateway                              │  │
│  │ - Route /admin to Backoffice                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Service Mesh (optional: Istio)                       │  │
│  │ - Circuit breaking                                   │  │
│  │ - Retry policies                                     │  │
│  │ - Mutual TLS between services                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Gateway Deployment (Horizontal Pod Autoscaler)      │  │
│  │ Replicas: 3-10 (scales on CPU/memory)               │  │
│  │                                                      │  │
│  │ Pod:                                                │  │
│  │ ├─ Gateway container (Go binary)                    │  │
│  │ ├─ Sidecar: Prometheus exporter                     │  │
│  │ └─ Sidecar: Log aggregation agent                   │  │
│  │                                                      │  │
│  │ Probes:                                             │  │
│  │ ├─ Liveness: /healthz (2s, fails after 3x)         │  │
│  │ ├─ Readiness: /readyz (5s, fails after 3x)         │  │
│  │ └─ Startup: /startupz (30s, fails after 5x)        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Auth Service Deployment (HPA)                        │  │
│  │ Replicas: 2-5 (scales on CPU)                       │  │
│  │ Pod: Auth container + Prometheus exporter           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Player App Deployment                                │  │
│  │ Replicas: 2-4 (static or HPA)                       │  │
│  │ Pod: Next.js container + Nginx sidecar              │  │
│  │ CDN: CloudFront/Akamai for static assets            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Backoffice Deployment                                │  │
│  │ Replicas: 2 (admin tool, lower scale)               │  │
│  │ Pod: Next.js container + Nginx sidecar              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ConfigMaps & Secrets                                │  │
│  │ ├─ app-config: Service configs                      │  │
│  │ ├─ jwt-secret: JWT signing key (Secret)             │  │
│  │ ├─ db-credentials: Database password (Secret)       │  │
│  │ └─ tls-certs: TLS certificate/key (Secret)         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

                      External Services

┌──────────────────────┐  ┌──────────────────┐  ┌────────────┐
│  PostgreSQL 16       │  │  Redis 7         │  │  CloudSQL  │
│  (Cloud SQL)         │  │  (Cloud Memstore)│  │  Replica   │
│  - Read/Write        │  │  - Session cache │  │  (Read-only)
│  - 2+ replicas       │  │  - Pub/sub       │  │            │
│  - Automated backups │  │  - Cluster mode  │  │            │
└──────────────────────┘  └──────────────────┘  └────────────┘

┌──────────────────────────────────────────┐
│ Monitoring & Observability               │
├──────────────────────────────────────────┤
│ ├─ Prometheus (metrics scraping)         │
│ ├─ Grafana (dashboards & alerting)       │
│ ├─ ELK Stack (logs: Elasticsearch)       │
│ ├─ Jaeger (distributed tracing)          │
│ └─ PagerDuty (on-call alerting)          │
└──────────────────────────────────────────┘
```

### High Availability Configuration

**Gateway Service:**
- Deployed across 3+ availability zones
- Stateless design (sessions in Redis)
- Load balancing with connection affinity for WebSocket
- Auto-scaling on CPU > 70%, Memory > 80%
- Rolling updates with graceful shutdown (30s drain period)

**Database:**
- PostgreSQL 16 with streaming replication
- Automatic failover via patroni/etcd
- Daily automated backups with 30-day retention
- Point-in-time recovery capability

**Redis:**
- Redis Cluster mode for high availability
- Automatic failover on node failure
- Persistence (both RDB snapshots and AOF)
- Replication across 3+ nodes

## Technology Stack Summary

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Backend** | Go | 1.24+ | Core API services |
| **Database** | PostgreSQL | 16 | Primary data store |
| **Cache** | Redis | 7 | Session, cache, pub/sub |
| **Frontend** | Next.js | 14 | Server-side rendering, routing |
| **UI Framework** | React | 18 | Component library |
| **UI Components** | Ant Design | 4 | Pre-built components |
| **Language** | TypeScript | 5+ | Type-safe JavaScript |
| **Container** | Docker | 24+ | Containerization |
| **Orchestration** | Kubernetes | 1.28+ | Container orchestration |
| **Monitoring** | Prometheus | Latest | Metrics collection |
| **Visualization** | Grafana | Latest | Dashboards and alerting |
| **Logging** | ELK Stack | Latest | Centralized logging |
| **CI/CD** | GitHub Actions | Latest | Automated testing/deployment |
| **API Client** | TypeScript | 5+ | Type-safe HTTP client |

## Performance Characteristics

### Gateway Service
- **Throughput:** 10,000+ concurrent WebSocket connections
- **Latency:** < 100ms for bet placement (P95)
- **Database Queries:** < 50ms (P95) for standard queries
- **WebSocket Broadcast:** < 100ms for all subscribers

### Frontend
- **Page Load:** < 2s (First Contentful Paint)
- **Interactive:** < 3.5s (Time to Interactive)
- **WebSocket Reconnection:** Automatic with exponential backoff

### Database
- **Connection Pool:** 50-100 concurrent connections
- **Transaction Time:** < 100ms for bet placement
- **Query Optimization:** Indexes on all join columns and status filters
- **Backup Time:** < 30 minutes for full backup

## Scalability

### Horizontal Scaling
- **Gateway:** Add more pods to Kubernetes deployment; stateless design allows unlimited scale
- **Auth Service:** Add more pods; lightweight service with low resource usage
- **Frontend:** Add more pods; static assets cached in CDN

### Vertical Scaling
- **Database:** Increase instance class (compute/memory)
- **Redis:** Increase cluster node count or instance class
- **Monitoring:** Increase Prometheus retention or add more Grafana instances

### Key Bottlenecks and Solutions
1. **Database Connections:** Increase connection pool size, add read replicas for reporting
2. **Redis Memory:** Enable eviction policy, use Redis Cluster for sharding
3. **WebSocket CPU:** Increase Gateway pod count and replicas
4. **Network I/O:** Use edge caching (CDN), optimize payload sizes

## Security Architecture

### Network Security
- TLS 1.3 for all external communication
- Private VPC for internal service communication
- Network policies (Kubernetes) restrict pod-to-pod communication
- WAF (Cloud Armor) on Ingress for DDoS protection

### Authentication & Authorization
- JWT tokens with short TTL (24 hours, refresh via refresh token)
- Session validation on every request
- Role-based access control (RBAC) for backoffice
- API key authentication for third-party integrations

### Data Security
- Database encryption at rest (TDE)
- Encrypted data in transit (TLS)
- Secrets management (Kubernetes Secrets, HashiCorp Vault)
- PII redaction in logs
- Column-level encryption for sensitive data (passwords via bcrypt)

### Audit & Compliance
- Comprehensive audit logging (all user actions)
- Immutable log storage (cannot be modified after creation)
- Regular security scanning (dependencies, code)
- Penetration testing pre-launch
- GDPR/data residency compliance

## Disaster Recovery

### RTO and RPO Targets
- **RTO:** 15 minutes (Recovery Time Objective)
- **RPO:** 5 minutes (Recovery Point Objective)

### Backup Strategy
- **Database:** Automated daily backups, 30-day retention
- **Redis:** Snapshots every 6 hours, stored in Cloud Storage
- **Application:** Code stored in Git with tag-based releases

### Failover Procedures
1. **Database Failover:** Automatic via streaming replication (< 1 minute)
2. **Redis Failover:** Automatic in cluster mode (< 10 seconds)
3. **Service Failover:** Kubernetes automatically reschedules failed pods
4. **Region Failover:** Manual process, requires DNS update (~5 minutes)

## References

- See `go-platform/services/gateway/migrations/` for schema details
- See `go-platform/services/gateway/internal/http/` for API implementation
- See `talon-backoffice/packages/api-client/` for API client code
- See `DEPLOYMENT.md` for infrastructure setup guide
- See `RUNBOOKS.md` for operational procedures
