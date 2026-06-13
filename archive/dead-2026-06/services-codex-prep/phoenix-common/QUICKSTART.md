# Phoenix Common Library - Quick Start Guide

## Installation

Add to your microservice's `go.mod`:

```bash
require github.com/phoenixbot/phoenix-common v0.1.0
```

Then run:
```bash
go get github.com/phoenixbot/phoenix-common
```

## 5-Minute Setup

### 1. Load Configuration

```go
package main

import (
    "log"
    "github.com/phoenixbot/phoenix-common/pkg/config"
)

func main() {
    cfg, err := config.Load()
    if err != nil {
        log.Fatal(err)
    }

    // Access config values
    serverAddr := cfg.Server.Address()      // "0.0.0.0:8080"
    dbConnStr := cfg.Database.ConnectionString()
    kafkaBrokers := cfg.Kafka.Brokers       // "localhost:9092"
}
```

### 2. Initialize Router with Middleware

```go
import (
    "github.com/go-chi/chi/v5"
    "github.com/phoenixbot/phoenix-common/pkg/middleware"
    "go.uber.org/zap"
)

func setupRouter(logger *zap.Logger) chi.Router {
    r := chi.NewRouter()

    // Add middleware stack
    r.Use(middleware.RequestLogger(logger))
    r.Use(middleware.Recovery(logger))
    r.Use(middleware.CORS(nil))  // Use defaults
    r.Use(middleware.RateLimiter(nil))  // 100 req/sec per IP

    return r
}
```

### 3. Add Health Checks

```go
import "github.com/phoenixbot/phoenix-common/pkg/health"

func setupHealth(logger *zap.Logger, r chi.Router) {
    healthChecker := health.NewHealthChecker(logger, "1.0.0")

    r.Get("/health", healthChecker.Handler())
    r.Get("/health/ready", healthChecker.ReadinessHandler())
    r.Get("/health/live", healthChecker.LivenessHandler())
}
```

### 4. Protect Routes with JWT

```go
func setupRoutes(r chi.Router, jwtSecret string) {
    // Public routes
    r.Post("/auth/login", handleLogin)

    // Protected routes
    r.Route("/api", func(r chi.Router) {
        r.Use(middleware.JWTAuth(jwtSecret))

        r.Get("/profile", handleProfile)
        r.Post("/bet", handlePlaceBet)
    })

    // Admin-only routes
    r.Route("/admin", func(r chi.Router) {
        r.Use(middleware.JWTAuth(jwtSecret))
        r.Use(middleware.RequireRole("admin", "operator"))

        r.Post("/markets", handleCreateMarket)
    })
}
```

### 5. Extract User Claims

```go
func handleProfile(w http.ResponseWriter, r *http.Request) {
    claims := middleware.GetUserFromContext(r)
    if claims == nil {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }

    userID := claims.UserID
    role := claims.Role
    email := claims.Email
}
```

### 6. Use Domain Models

```go
import "github.com/phoenixbot/phoenix-common/pkg/models"

// Create a user
user := models.NewUser("user-123", "john@example.com", "johndoe", models.RolePlayer)

// Create a wallet
wallet := models.NewWallet("wallet-123", "user-123", "USD")

// Check balance
if wallet.CanWithdraw(amount) {
    wallet.Withdraw(amount)
}

// Place a bet
odds := decimal.NewFromString("2.5")
bet := models.NewBet("bet-123", "user-123", "market-123", "outcome-123", stake, odds)
```

### 7. Publish Kafka Events

```go
import (
    "github.com/phoenixbot/phoenix-common/pkg/kafka"
)

producer, err := kafka.NewProducer(cfg.Kafka.Brokers, nil)
defer producer.Close()

// Create event payload
payload := &kafka.BetPlacedPayload{
    EventPayload: kafka.EventPayload{
        EntityID: "bet-123",
    },
    UserID:    "user-123",
    MarketID:  "market-123",
    OutcomeID: "outcome-123",
    Stake:     "50.00",
}

// Publish as event
event, _ := kafka.NewEvent(kafka.EventBetPlaced, "betting-service", payload)
producer.PublishJSON(ctx, "bet-events", event.ID, event)
```

### 8. Consume Kafka Events

```go
consumer, err := kafka.NewConsumer(
    cfg.Kafka.Brokers,
    "my-service-group",
    []string{"bet-events", "market-events"},
    nil,
)
defer consumer.Close()

// Subscribe to events
consumer.Subscribe(ctx, func(ctx context.Context, topic string, key, value []byte) error {
    var event kafka.Event
    json.Unmarshal(value, &event)

    switch event.Type {
    case kafka.EventBetPlaced:
        var payload kafka.BetPlacedPayload
        event.UnmarshalData(&payload)
        // Handle bet placed
    }

    return nil
})
```

### 9. Handle Errors Consistently

```go
import "github.com/phoenixbot/phoenix-common/pkg/errors"

func handleDeposit(w http.ResponseWriter, r *http.Request) {
    wallet := getWallet(userID)

    if wallet.Status == models.WalletFrozen {
        errors.WriteErrorResponse(w, errors.ErrWalletFrozen)
        return
    }

    if amount.IsNegative() {
        errors.WriteErrorResponse(w,
            errors.ErrBadRequest.WithDetails("field", "amount must be positive"))
        return
    }
}
```

## Environment Variables Reference

```bash
# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
ENVIRONMENT=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_NAME=phoenix

# Kafka
KAFKA_BROKERS=kafka-1:9092,kafka-2:9092
KAFKA_CONSUMER_GROUP=my-service

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_EXPIRATION_HOURS=24
```

## Common Patterns

### Pattern 1: REST Endpoint with Auth

```go
r.Route("/api/users", func(r chi.Router) {
    r.Use(middleware.JWTAuth(cfg.JWT.SecretKey))

    r.Get("/{id}", func(w http.ResponseWriter, r *http.Request) {
        userID := chi.URLParam(r, "id")
        user, err := getUser(userID)

        if err != nil {
            errors.WriteErrorResponse(w, errors.ErrNotFound)
            return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(user)
    })
})
```

### Pattern 2: Admin Action with Audit

```go
r.Post("/admin/markets/{id}/settle", func(w http.ResponseWriter, r *http.Request) {
    claims := middleware.GetUserFromContext(r)

    marketID := chi.URLParam(r, "id")

    // Update market
    market.Status = models.MarketSettled

    // Publish event for audit trail
    event, _ := kafka.NewEvent(kafka.EventMarketSettled, "market-service", market)
    producer.PublishJSON(ctx, "market-events", event.ID, event)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(market)
})
```

### Pattern 3: Async Processing with Consumer

```go
// In separate goroutine
consumer.Subscribe(ctx, func(ctx context.Context, topic string, key, value []byte) error {
    var event kafka.Event
    json.Unmarshal(value, &event)

    switch event.Type {
    case kafka.EventBetPlaced:
        // Process bet - update odds, check market exposure, etc.
        handleBetPlaced(event)
    case kafka.EventMarketClosed:
        // Settle all bets on this market
        handleMarketClosed(event)
    }

    return nil
})
```

### Pattern 4: Request with User Context

```go
func handlePlaceBet(w http.ResponseWriter, r *http.Request) {
    claims := middleware.GetUserFromContext(r)

    var req struct {
        MarketID  string `json:"market_id"`
        OutcomeID string `json:"outcome_id"`
        Stake     string `json:"stake"`
    }

    json.NewDecoder(r.Body).Decode(&req)

    // Get user's wallet
    wallet, _ := getWallet(claims.UserID)

    // Validate bet
    stake, _ := decimal.NewFromString(req.Stake)
    if !wallet.CanWithdraw(stake) {
        errors.WriteErrorResponse(w, errors.ErrInsufficientFunds)
        return
    }

    // Place bet
    wallet.Withdraw(stake)
    bet := models.NewBet("...", claims.UserID, req.MarketID, req.OutcomeID, stake, odds)

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(bet)
}
```

## Testing Tips

Use interfaces for testability:

```go
// Define interface for your service
type UserStore interface {
    GetUser(ctx context.Context, id string) (*models.User, error)
}

// Mock in tests
type mockUserStore struct {
    users map[string]*models.User
}

// Use in handler
func handleGetUser(store UserStore) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        userID := chi.URLParam(r, "id")
        user, _ := store.GetUser(r.Context(), userID)
        json.NewEncoder(w).Encode(user)
    }
}
```

## Troubleshooting

### "invalid token" error
- Ensure JWT_SECRET_KEY matches what signed the token
- Check token format: `Authorization: Bearer <token>`
- Verify token hasn't expired

### Rate limit errors
- Default: 100 requests per second per IP
- Configure with `RateLimiterConfig{Capacity: 1000, TokensPerSec: 200}`
- Remember it's per-IP, so load balancers may need adjustment

### Kafka connection errors
- Verify KAFKA_BROKERS is comma-separated: `kafka1:9092,kafka2:9092`
- Check firewall rules and network connectivity
- Look for Kafka broker logs

### Database connection errors
- Verify DB credentials and network access
- Check SSL mode matches your setup: disable/require/verify-ca/verify-full
- Increase MaxOpenConns for high concurrency

## Next Steps

1. Check `/examples/example-service.go` for complete implementation
2. Read the full README.md for advanced features
3. Review domain models in `/pkg/models` for your service needs
4. Set up health checks with component-specific checks
5. Implement custom error types for your domain

## Support

See IMPLEMENTATION_SUMMARY.md for detailed documentation.
