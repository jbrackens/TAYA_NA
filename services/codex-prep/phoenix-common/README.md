# Phoenix Common Library

A shared Go library for the Phoenix Bot Revival project containing reusable types, helpers, utilities, and middleware for all 14 Phoenix microservices.

## Package Structure

### `/pkg/models`
Core domain models shared across all services:
- **user.go** - User account types, roles (Admin, Operator, Player, Bot), and KYC status
- **wallet.go** - Wallet and transaction types with decimal precision for financial operations
- **market.go** - Betting market, outcome, and bet types

### `/pkg/kafka`
Kafka integration utilities:
- **producer.go** - Generic Kafka producer with error handling and delivery reports
- **consumer.go** - Generic Kafka consumer with graceful shutdown and offset management
- **events.go** - Event envelope types and common domain events (user, wallet, market, bet)

### `/pkg/middleware`
HTTP middleware for chi router:
- **auth.go** - JWT authentication middleware with role/scope validation
- **logging.go** - Request logging middleware using structured logging (zap)
- **recovery.go** - Panic recovery with stack trace logging
- **cors.go** - CORS header management with configurable origins
- **ratelimit.go** - Token bucket rate limiting per IP address

### `/pkg/errors`
Standardized error handling:
- **errors.go** - AppError type with HTTP status codes, common error definitions, and JSON response helpers

### `/pkg/config`
Configuration management:
- **config.go** - Environment variable-based configuration loader with sensible defaults for server, database, Kafka, Redis, and JWT

### `/pkg/health`
Health check utilities:
- **health.go** - Health check handler supporting liveness, readiness, and detailed component status

## Usage Examples

### Importing the Library

```go
import (
    "github.com/phoenixbot/phoenix-common/pkg/models"
    "github.com/phoenixbot/phoenix-common/pkg/middleware"
    "github.com/phoenixbot/phoenix-common/pkg/config"
    "github.com/phoenixbot/phoenix-common/pkg/health"
    "github.com/phoenixbot/phoenix-common/pkg/kafka"
    "github.com/phoenixbot/phoenix-common/pkg/errors"
)
```

### Setting Up a Service

```go
package main

import (
    "github.com/phoenixbot/phoenix-common/pkg/config"
    "github.com/phoenixbot/phoenix-common/pkg/health"
    "github.com/phoenixbot/phoenix-common/pkg/middleware"
    "github.com/go-chi/chi/v5"
    "go.uber.org/zap"
)

func main() {
    // Load configuration
    cfg, err := config.Load()
    if err != nil {
        panic(err)
    }

    // Setup logging
    logger, _ := zap.NewProduction()
    defer logger.Sync()

    // Create router
    router := chi.NewRouter()

    // Add middleware
    router.Use(middleware.RequestLogger(logger))
    router.Use(middleware.Recovery(logger))
    router.Use(middleware.CORS(nil)) // Use defaults
    router.Use(middleware.RateLimiter(nil)) // 100 req/sec per IP

    // Setup health checks
    healthChecker := health.NewHealthChecker(logger, "1.0.0")
    router.Get("/health", healthChecker.Handler())
    router.Get("/health/ready", healthChecker.ReadinessHandler())
    router.Get("/health/live", healthChecker.LivenessHandler())

    // Protected routes
    router.Route("/api", func(r chi.Router) {
        r.Use(middleware.JWTAuth(cfg.JWT.SecretKey))
        r.Get("/profile", getUserProfile)
    })
}
```

### Working with Models

```go
// Create a user
user := models.NewUser("user-1", "john@example.com", "johndoe", models.RolePlayer)

// Create a wallet
wallet := models.NewWallet("wallet-1", "user-1", "USD")
wallet.Deposit(decimal.NewFromInt(100))

// Place a bet
odds := decimal.NewFromString("2.5")
stake := decimal.NewFromInt(50)
bet := models.NewBet("bet-1", "user-1", "market-1", "outcome-1", stake, odds)
```

### Kafka Event Publishing

```go
// Create producer
producer, err := kafka.NewProducer(cfg.Kafka.Brokers, &kafka.ProducerConfig{
    Logger:  logger,
    Timeout: 10000,
})
defer producer.Close()

// Publish a domain event
eventPayload := &kafka.UserCreatedPayload{
    EventPayload: kafka.EventPayload{
        EntityID:  "user-1",
        Timestamp: time.Now(),
        Version:   1,
    },
    Email:    "john@example.com",
    Username: "johndoe",
    Role:     "player",
}

event, err := kafka.NewEvent(kafka.EventUserCreated, "user-service", eventPayload)
err = producer.PublishJSON(ctx, "user-events", event.ID, event)
```

### Kafka Event Consumption

```go
// Create consumer
consumer, err := kafka.NewConsumer(
    cfg.Kafka.Brokers,
    cfg.Kafka.ConsumerGroup,
    []string{"user-events"},
    &kafka.ConsumerConfig{Logger: logger},
)
defer consumer.Close()

// Subscribe and handle events
err = consumer.Subscribe(ctx, func(ctx context.Context, topic string, key, value []byte) error {
    var event kafka.Event
    json.Unmarshal(value, &event)

    // Process event based on type
    switch event.Type {
    case kafka.EventUserCreated:
        var payload kafka.UserCreatedPayload
        event.UnmarshalData(&payload)
        // Handle user creation
    }
    return nil
})
```

### Error Handling

```go
// Return a standard error
if wallet.Balance.LessThan(amount) {
    errors.WriteErrorResponse(w, errors.ErrInsufficientFunds)
    return
}

// Create custom error with details
err := errors.NewAppError("CUSTOM_ERROR", "something went wrong", http.StatusBadRequest)
err.WithDetails("field", "invalid value")
errors.WriteErrorResponse(w, err)

// Wrap errors
if err != nil {
    appErr := errors.Wrap(err, "DB_ERROR", "failed to save user", http.StatusInternalServerError)
    errors.WriteErrorResponse(w, appErr)
}
```

### JWT Authentication

```go
// In chi router
router.Route("/api", func(r chi.Router) {
    r.Use(middleware.JWTAuth(cfg.JWT.SecretKey))

    // Role-based access control
    r.Group(func(r chi.Router) {
        r.Use(middleware.RequireRole("admin", "operator"))
        r.Post("/markets", createMarket)
    })

    // Scope-based access control
    r.Group(func(r chi.Router) {
        r.Use(middleware.RequireScope("read:bets"))
        r.Get("/bets", listBets)
    })
})

// Extract user claims in handlers
func myHandler(w http.ResponseWriter, r *http.Request) {
    claims := middleware.GetUserFromContext(r)
    if claims == nil {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }

    userID := claims.UserID
    role := claims.Role
}
```

## Environment Variables

The library reads configuration from environment variables:

```bash
# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
SERVER_READ_TIMEOUT=15s
SERVER_WRITE_TIMEOUT=15s
ENVIRONMENT=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_NAME=phoenix
DB_SSL_MODE=disable
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_VERSION=3.6.0
KAFKA_CONSUMER_GROUP=phoenix-default
KAFKA_COMPRESSION=snappy

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# JWT
JWT_SECRET_KEY=your-secret-key
JWT_EXPIRATION_HOURS=24
JWT_ISSUER=phoenix-bot
```

## Dependencies

- `github.com/go-chi/chi/v5` - HTTP router
- `github.com/jackc/pgx/v5` - PostgreSQL driver
- `github.com/confluentinc/confluent-kafka-go/v2` - Kafka client
- `github.com/redis/go-redis/v9` - Redis client
- `github.com/golang-jwt/jwt/v5` - JWT tokens
- `github.com/shopspring/decimal` - Decimal arithmetic
- `go.uber.org/zap` - Structured logging
- `github.com/google/uuid` - UUID generation

## Best Practices

1. **Always use decimal for financial amounts** - Never use float64 for money
2. **Validate input early** - Use the error types for consistent error responses
3. **Log with context** - Use request IDs and structured logging
4. **Handle panics** - Use the Recovery middleware in production
5. **Rate limit** - Protect APIs with per-IP rate limiting
6. **Health checks** - Expose liveness and readiness endpoints
7. **JWT secret management** - Use strong secrets and environment variables
8. **Graceful shutdown** - Close Kafka connections cleanly on shutdown

## License

Internal use only - Phoenix Bot Revival project
