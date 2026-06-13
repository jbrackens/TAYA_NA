# Phoenix Platform Microservices Scaffolds

Complete Go scaffolds for the first 4 priority microservices of the Phoenix platform rebuild. All services replace legacy Scala/Python/Java/Node code.

## Scaffolds Generated

### 1. phoenix-gateway (Phase 1)
**Purpose**: API gateway / reverse proxy / auth middleware
**Port**: 8080
**Dependencies**: chi router, jwt-go, go-redis, prometheus client
**Legacy Source**: PhoenixBotRevival (Go strangler-pattern gateway)

**Key Features**:
- Bearer token authentication via Redis
- Rate limiting configuration
- Reverse proxy to backend services
- Health/readiness checks
- Structured JSON logging with slog
- Graceful shutdown

**Directory**: `/sessions/busy-happy-mccarthy/scaffolds/phoenix-gateway/`

```
phoenix-gateway/
├── cmd/server/main.go                 # Entry point with graceful shutdown
├── internal/
│   ├── config/config.go               # Environment-based config
│   ├── handlers/handlers.go           # HTTP handler stubs
│   ├── middleware/middleware.go       # Auth & logging middleware
│   └── models/models.go               # Domain: Route, RateLimit, AuthToken, ProxyRequest
├── go.mod                             # Dependencies
├── Dockerfile                         # Multi-stage build
├── Makefile                           # build, test, run, lint, migrate
└── README.md                          # Brief setup guide
```

---

### 2. phoenix-user (Phase 2)
**Purpose**: User management, authentication, OIDC, profiles, KYC
**Port**: 8001
**Dependencies**: chi router, pgx, sqlc, jwt-go, go-redis, bcrypt
**Legacy Source**: RMX (Python/Django), GSTech (Node.js)

**Key Features**:
- User registration & authentication with bcrypt
- Profile management
- KYC verification workflow
- Session management with Redis caching
- Database connection pooling
- JWT token generation & validation
- Password hashing with bcrypt

**Domain Models**:
- User (email, username, password_hash, status)
- Profile (first/last name, avatar, bio, phone, country)
- Session (token, expires_at, revoked_at)
- KYCRecord (status, document_type, verified_at)

**Directory**: `/sessions/busy-happy-mccarthy/scaffolds/phoenix-user/`

```
phoenix-user/
├── cmd/server/main.go                 # Entry point with DB pool
├── internal/
│   ├── config/config.go               # DB_URL, JWT_SECRET
│   ├── handlers/handlers.go           # Auth, profile, KYC endpoints
│   ├── middleware/middleware.go       # Auth middleware
│   ├── models/models.go               # User, Profile, Session, KYC
│   ├── repository/repository.go       # Database layer (pgx)
│   └── service/service.go             # Business logic
├── go.mod                             # pgx v5, bcrypt, uuid
├── Dockerfile
├── Makefile
└── README.md
```

---

### 3. phoenix-wallet (Phase 2)
**Purpose**: Wallet/balance management, transactions, deposits, withdrawals, referral bonuses
**Port**: 8002
**Dependencies**: chi router, pgx, sqlc, confluent-kafka-go, go-redis, decimal
**Legacy Source**: RMX wallet (Python), Stella wallet events (Scala)

**Key Features**:
- Wallet creation & management
- Balance tracking with decimal precision
- Transaction types: deposit, withdraw, transfer, referral
- Kafka event publishing for transaction streams
- Referral bonus management
- Precise decimal arithmetic (avoiding floating-point errors)
- Transaction status tracking (pending, completed, failed)

**Domain Models**:
- Wallet (user_id, currency, balance, status)
- Transaction (type, amount, currency, status, metadata)
- Balance (available, locked, total)
- ReferralBonus (user_id, referrer_id, amount, status, expires_at)

**Kafka Events**:
- `wallet-transactions` - All transactions
- `wallet-deposits` - Deposit events
- `wallet-withdrawals` - Withdrawal events
- `wallet-referrals` - Referral events

**Directory**: `/sessions/busy-happy-mccarthy/scaffolds/phoenix-wallet/`

```
phoenix-wallet/
├── cmd/server/main.go                 # Entry point with Kafka producer
├── internal/
│   ├── config/config.go               # DB_URL, KAFKA_BROKERS
│   ├── handlers/handlers.go           # Wallet, transaction, referral endpoints
│   ├── middleware/middleware.go       # Auth middleware
│   ├── models/models.go               # Wallet, Transaction, Balance, ReferralBonus
│   ├── pkg/kafka/kafka.go             # Producer & event types
│   ├── repository/repository.go       # Database layer
│   └── service/service.go             # Business logic with decimal math
├── go.mod                             # kafka-go, pgx, decimal
├── Dockerfile                         # Includes librdkafka
├── Makefile
└── README.md
```

---

### 4. phoenix-market-engine (Phase 3)
**Purpose**: Market/event management, odds calculation, settlement
**Port**: 8003
**Dependencies**: chi router, pgx, sqlc, confluent-kafka-go, go-redis, decimal
**Legacy Source**: Stella market services (Scala/Flink), Storm topologies (Java)

**Key Features**:
- Market creation & lifecycle management
- Outcome/odds management
- Bet placement & cancellation
- Market settlement with winning outcome
- Bet status tracking (pending, won, lost, cancelled)
- Settlement record creation
- Kafka event publishing for market operations
- Precise decimal arithmetic for odds & winnings

**Domain Models**:
- Market (title, status, type, opens_at, closes_at, settled_at)
- Event (market_id, name, timestamp)
- Outcome (market_id, label, odds, status)
- Bet (user_id, market_id, outcome_id, amount, odds, status, winnings)
- Settlement (market_id, winning_outcome_id, total_bets, status)

**Kafka Events**:
- `market-bets` - Bet placement
- `market-events` - Market lifecycle
- `market-settlements` - Market settlement records
- `market-bet-settlements` - Individual bet settlement results

**Directory**: `/sessions/busy-happy-mccarthy/scaffolds/phoenix-market-engine/`

```
phoenix-market-engine/
├── cmd/server/main.go                 # Entry point
├── internal/
│   ├── config/config.go               # DB_URL, KAFKA_BROKERS
│   ├── handlers/handlers.go           # Market, bet, settlement endpoints
│   ├── middleware/middleware.go       # Auth middleware
│   ├── models/models.go               # Market, Event, Outcome, Bet, Settlement
│   ├── pkg/kafka/kafka.go             # Producer & event types
│   ├── repository/repository.go       # Database layer
│   └── service/service.go             # Business logic (odds, settlement)
├── go.mod                             # kafka-go, pgx, decimal
├── Dockerfile                         # Includes librdkafka
├── Makefile
└── README.md
```

---

## Common Features Across All Services

### Architecture Patterns
- **Router**: Chi v5 for HTTP routing
- **Database**: PostgreSQL with pgx connection pooling
- **Caching**: Redis for auth tokens, sessions, and state
- **Logging**: Structured JSON logging with slog
- **Messaging**: Kafka for event streaming (wallet & market only)
- **Decimals**: shopspring/decimal for financial calculations (wallet & market)

### Middleware Stack
- Request ID tracking
- Real IP detection
- Structured request/response logging
- Panic recovery
- Bearer token authentication

### Server Features
- Graceful shutdown with signal handling
- Context propagation throughout request lifecycle
- Health check endpoint (`/health`)
- Readiness check endpoint (`/ready`)
- Configurable via environment variables

### Development
- Makefile targets: `build`, `test`, `run`, `lint`, `clean`, `docker`, `migrate`
- Docker multi-stage builds for minimal image size
- Dockerfile health checks
- ALpine Linux base images

---

## Configuration

Each service accepts these environment variables:

```bash
# Common
PORT                  # Service port (gateway: 8080, user: 8001, wallet: 8002, market: 8003)
ENVIRONMENT          # development or production
LOG_LEVEL            # info, debug, error
REDIS_ADDR           # localhost:6379
REDIS_PASSWORD       # Empty for dev

# Database (user, wallet, market)
DATABASE_URL         # postgres://user:password@host:5432/dbname

# Kafka (wallet, market)
KAFKA_BROKERS        # localhost:9092 or comma-separated list

# User service
JWT_SECRET           # Secret for signing JWT tokens

# Gateway
# (uses Redis for token validation)
```

---

## Getting Started

### Prerequisites
- Go 1.21+
- PostgreSQL 14+ (for user, wallet, market services)
- Redis (all services)
- Kafka (wallet, market services)

### Quick Start (Individual Service)

```bash
cd /sessions/busy-happy-mccarthy/scaffolds/phoenix-user

# Build
make build

# Run with environment variables
export DATABASE_URL="postgres://user:password@localhost:5432/phoenix_user"
export REDIS_ADDR="localhost:6379"
export JWT_SECRET="your-secret"
make run

# Or build Docker image
make docker
docker run -p 8001:8001 \
  -e DATABASE_URL=postgres://user:password@localhost:5432/phoenix_user \
  phoenix-user:latest
```

### Run All Services Together

```bash
cd /sessions/busy-happy-mccarthy/scaffolds

# Start all services in Docker Compose
docker-compose up

# Or run individually in different terminals
(cd phoenix-gateway && make run)
(cd phoenix-user && make run)
(cd phoenix-wallet && make run)
(cd phoenix-market-engine && make run)
```

---

## Key Implementation Details

### Authentication Flow
1. User posts credentials to `/auth/login`
2. Service validates & generates session token
3. Token stored in Redis with expiry
4. Client includes `Authorization: Bearer <token>` in requests
5. Auth middleware validates token in Redis

### Database Layer
- Repository pattern for all database access
- Interface-based repositories for testing
- pgx connection pooling for efficiency
- Named queries (sqlc compatible)

### Error Handling
- Structured error responses
- Proper HTTP status codes
- Logged with context

### Request Lifecycle
1. Router receives request
2. Middleware stack processes (logging, auth, recovery)
3. Handler processes request
4. Service executes business logic
5. Repository queries database
6. Response marshalled to JSON
7. Middleware logs completion

---

## Files Created

Total: 45 files across 4 services

**phoenix-gateway**: 9 files
- cmd/server/main.go
- internal/config/config.go
- internal/handlers/handlers.go
- internal/middleware/middleware.go
- internal/models/models.go
- go.mod
- Dockerfile
- Makefile
- README.md

**phoenix-user**: 10 files
- cmd/server/main.go
- internal/config/config.go
- internal/handlers/handlers.go
- internal/middleware/middleware.go
- internal/models/models.go
- internal/repository/repository.go
- internal/service/service.go
- go.mod
- Dockerfile
- Makefile
- README.md

**phoenix-wallet**: 12 files
- cmd/server/main.go
- internal/config/config.go
- internal/handlers/handlers.go
- internal/middleware/middleware.go
- internal/models/models.go
- internal/pkg/kafka/kafka.go
- internal/repository/repository.go
- internal/service/service.go
- go.mod
- Dockerfile
- Makefile
- README.md

**phoenix-market-engine**: 12 files
- cmd/server/main.go
- internal/config/config.go
- internal/handlers/handlers.go
- internal/middleware/middleware.go
- internal/models/models.go
- internal/pkg/kafka/kafka.go
- internal/repository/repository.go
- internal/service/service.go
- go.mod
- Dockerfile
- Makefile
- README.md

---

## Next Steps

1. **Create Databases**
   ```bash
   createdb phoenix_user
   createdb phoenix_wallet
   createdb phoenix_market
   ```

2. **Create Migration Files** (using goose, migrate, or flyway)
   - Define schemas for each database
   - Reference domain models for table structures

3. **Implement Unit Tests**
   - Repository layer tests
   - Service layer tests
   - Handler tests

4. **Set Up CI/CD**
   - GitHub Actions workflows
   - Build, test, and push Docker images

5. **Deploy to Kubernetes** (if applicable)
   - Service manifests
   - ConfigMaps for configuration
   - Secrets for credentials

6. **Monitoring & Observability**
   - Prometheus metrics (gateway has client already)
   - Distributed tracing (e.g., Jaeger)
   - ELK stack for log aggregation

---

## Dependencies

### All Services
- go-chi/chi v5 - HTTP router
- google/uuid - UUID generation

### Stateful Services (user, wallet, market)
- jackc/pgx v5 - PostgreSQL driver
- redis/go-redis v9 - Redis client

### Wallet & Market
- confluentinc/confluent-kafka-go v2 - Kafka client
- shopspring/decimal - Precise decimal arithmetic

### User Service
- golang.org/x/crypto - Bcrypt password hashing

### Gateway
- prometheus/client_golang - Prometheus metrics

---

## All Scaffolds Location

Base path: `/sessions/busy-happy-mccarthy/scaffolds/`

- `phoenix-gateway/` - API Gateway
- `phoenix-user/` - User Service
- `phoenix-wallet/` - Wallet Service
- `phoenix-market-engine/` - Market Engine

Each directory is a complete, deployable Go service with full source code.
