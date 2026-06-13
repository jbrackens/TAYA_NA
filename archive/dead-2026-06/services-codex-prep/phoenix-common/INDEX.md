# Phoenix Common Library - File Index

Complete reference guide to all 19 files in the phoenix-common shared library.

## Documentation Files (4 files)

| File | Purpose | Lines |
|------|---------|-------|
| [README.md](./README.md) | Main documentation with usage examples and best practices | 289 |
| [QUICKSTART.md](./QUICKSTART.md) | 5-minute setup guide with common patterns | 396 |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Detailed technical summary of all components | 350 |
| [INDEX.md](./INDEX.md) | This file - directory reference | - |

## Configuration Files (2 files)

| File | Purpose | Lines |
|------|---------|-------|
| [go.mod](./go.mod) | Go module definition with 7 dependencies | 26 |
| [.gitignore](./.gitignore) | Standard Go project gitignore | - |

## Domain Models Package (3 files, 416 total lines)
Path: `/pkg/models/`

| File | Purpose | Lines | Types |
|------|---------|-------|-------|
| [user.go](./pkg/models/user.go) | User accounts, roles, KYC status | 78 | User, UserRole, KYCStatus |
| [wallet.go](./pkg/models/wallet.go) | Wallets and financial transactions | 140 | Wallet, Transaction, TransactionType, WalletStatus |
| [market.go](./pkg/models/market.go) | Betting markets, outcomes, bets | 198 | Market, Outcome, Bet, MarketStatus, MarketType, BetStatus |

## Kafka Integration Package (3 files, 535 total lines)
Path: `/pkg/kafka/`

| File | Purpose | Lines | Types |
|------|---------|-------|-------|
| [producer.go](./pkg/kafka/producer.go) | Kafka producer wrapper with delivery reports | 144 | Producer, ProducerConfig |
| [consumer.go](./pkg/kafka/consumer.go) | Kafka consumer with graceful shutdown | 203 | Consumer, ConsumerConfig, MessageHandler |
| [events.go](./pkg/kafka/events.go) | Domain event types and envelopes | 188 | Event, EventPayload, 7 domain payload types |

## HTTP Middleware Package (5 files, 575 total lines)
Path: `/pkg/middleware/`

| File | Purpose | Lines | Key Functions |
|------|---------|-------|---|
| [auth.go](./pkg/middleware/auth.go) | JWT authentication with role/scope validation | 166 | JWTAuth, GetUserFromContext, RequireRole, RequireScope |
| [logging.go](./pkg/middleware/logging.go) | Structured request logging with zap | 92 | RequestLogger, LogRequest |
| [recovery.go](./pkg/middleware/recovery.go) | Panic recovery with stack traces | 62 | Recovery, SafeHandler |
| [cors.go](./pkg/middleware/cors.go) | CORS header management | 83 | CORS, CORSWithOrigins |
| [ratelimit.go](./pkg/middleware/ratelimit.go) | Token bucket rate limiting per IP | 172 | RateLimiter, TokenBucket, getClientIP |

## Error Handling Package (1 file, 172 lines)
Path: `/pkg/errors/`

| File | Purpose | Lines | Error Types |
|------|---------|-------|---|
| [errors.go](./pkg/errors/errors.go) | Standardized error types with HTTP status codes | 172 | AppError, 21 predefined errors |

## Configuration Package (1 file, 249 lines)
Path: `/pkg/config/`

| File | Purpose | Lines | Types |
|------|---------|-------|-------|
| [config.go](./pkg/config/config.go) | Environment-based configuration management | 249 | Config, ServerConfig, DatabaseConfig, KafkaConfig, RedisConfig, JWTConfig |

## Health Checks Package (1 file, 269 lines)
Path: `/pkg/health/`

| File | Purpose | Lines | Types |
|------|---------|-------|-------|
| [health.go](./pkg/health/health.go) | Kubernetes-style health checks | 269 | HealthChecker, HealthCheckResponse, ComponentHealth, Checker |

## Examples (1 file, 366 lines)
Path: `/examples/`

| File | Purpose | Lines |
|------|---------|-------|
| [example-service.go](./examples/example-service.go) | Complete working service example | 366 |

## Summary Statistics

### Code Lines
- Go source code: 2,582 lines
- Documentation: 1,061 lines
- Total: 3,643 lines

### Components
- Packages: 6
- Go files: 16
- Documentation files: 4
- Config files: 2

### Types & Definitions
- Structs: 30+
- Interfaces: 2
- Enums: 8
- Error types: 21
- Kafka event types: 14+

### Features
- Middleware components: 5
- Domain models: 3
- Configuration sections: 5
- Health check types: 3
- Example implementations: 1

## Quick Navigation

### By Feature

**Authentication & Authorization**
- [middleware/auth.go](./pkg/middleware/auth.go) - JWT middleware
- [middleware/ratelimit.go](./pkg/middleware/ratelimit.go) - Rate limiting

**Data Models**
- [models/user.go](./pkg/models/user.go) - User management
- [models/wallet.go](./pkg/models/wallet.go) - Financial transactions
- [models/market.go](./pkg/models/market.go) - Betting markets

**Event Streaming**
- [kafka/producer.go](./pkg/kafka/producer.go) - Publish events
- [kafka/consumer.go](./pkg/kafka/consumer.go) - Consume events
- [kafka/events.go](./pkg/kafka/events.go) - Event types

**Error Handling**
- [errors/errors.go](./pkg/errors/errors.go) - Error types and responses

**Configuration**
- [config/config.go](./pkg/config/config.go) - Config management

**Observability**
- [middleware/logging.go](./pkg/middleware/logging.go) - Request logging
- [middleware/recovery.go](./pkg/middleware/recovery.go) - Panic recovery
- [health/health.go](./pkg/health/health.go) - Health checks

**HTTP Handling**
- [middleware/cors.go](./pkg/middleware/cors.go) - CORS support

### By Use Case

**Setting up a new microservice**
1. Start with [QUICKSTART.md](./QUICKSTART.md)
2. Reference [config/config.go](./pkg/config/config.go) for configuration
3. Use [middleware/auth.go](./pkg/middleware/auth.go) for JWT
4. Add health checks from [health/health.go](./pkg/health/health.go)

**Handling domain events**
1. Define event types in [kafka/events.go](./pkg/kafka/events.go)
2. Publish with [kafka/producer.go](./pkg/kafka/producer.go)
3. Consume with [kafka/consumer.go](./pkg/kafka/consumer.go)

**Working with financial operations**
1. Use [models/wallet.go](./pkg/models/wallet.go)
2. Track with decimal precision (shopspring/decimal)
3. Log transactions via Kafka events

**API development**
1. Load config from [config/config.go](./pkg/config/config.go)
2. Apply middleware from [middleware/](./pkg/middleware/)
3. Use models from [models/](./pkg/models/)
4. Return errors from [errors/errors.go](./pkg/errors/errors.go)

**Rate limiting**
1. Add middleware from [middleware/ratelimit.go](./pkg/middleware/ratelimit.go)
2. Configure TokensPerSec and Capacity
3. Per-IP tracking is automatic

## Environment Variables

See [config/config.go](./pkg/config/config.go) for:
- 30+ environment variables
- Sensible defaults
- Connection string builders

## Dependencies

See [go.mod](./go.mod) for:
- 7 direct dependencies
- 7 indirect dependencies
- All pinned to stable versions

## Next Steps

1. **Get Started**: Read [QUICKSTART.md](./QUICKSTART.md)
2. **Deep Dive**: See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
3. **Learn by Example**: Study [examples/example-service.go](./examples/example-service.go)
4. **Best Practices**: Review [README.md](./README.md)
