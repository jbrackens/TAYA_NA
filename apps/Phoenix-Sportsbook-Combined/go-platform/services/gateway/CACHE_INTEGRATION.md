# Redis Caching Layer Integration Guide

## Overview

This document describes the Redis caching layer that has been integrated into the Phoenix Sportsbook Gateway service. The caching layer wraps the existing repository pattern with transparent Redis-backed caching, improving read performance for high-frequency operations.

## Architecture

### Components

1. **RedisClient** (`internal/cache/redis.go`)
   - Wrapper around the redis/go-redis v9 client
   - Handles JSON serialization/deserialization
   - Provides simple Get, Set, Delete operations
   - Thread-safe with context support

2. **CachedReadRepository** (`internal/cache/cached_repo.go`)
   - Implements the same `domain.ReadRepository` interface
   - Wraps any existing ReadRepository implementation
   - Implements check-cache-first pattern for all read operations
   - Automatic cache invalidation on configured TTLs

3. **CacheMetrics** (`internal/cache/metrics.go`)
   - Tracks cache statistics (hits, misses, errors)
   - Calculates hit rates per entity type
   - Exports metrics in Prometheus format
   - Thread-safe concurrent updates

4. **InvalidationHandler** (`internal/cache/invalidation.go`)
   - Provides typed methods for cache invalidation
   - Invalidates affected caches on write operations
   - Middleware support for wrapping write operations

## Configuration

### Environment Variables

```bash
# Redis connection (default: localhost:6379)
REDIS_URL=redis.example.com:6379

# Explicitly enable caching (optional, uses REDIS_URL if set)
ENABLE_CACHE=true

# Existing repository configuration still applies
GATEWAY_READ_REPO_MODE=db|file|memory
GATEWAY_DB_DRIVER=postgres
GATEWAY_DB_DSN=postgresql://...
GATEWAY_READ_MODEL_FILE=/path/to/snapshot.json
```

### Cache TTLs

The following TTL strategy is configured:

| Entity Type | TTL | Rationale |
|---|---|---|
| Fixture list by sport | 5 seconds | Fixtures change relatively infrequently |
| Single fixture | 10 seconds | Individual fixture data is stable |
| Market with selections | 1 second | Odds change frequently, need fresh data |
| Sports catalog | 1 hour | Static reference data |
| Punter profile | 5 minutes | Account data changes less frequently |
| Bet by ID | 30 seconds | Bet data is mostly immutable once placed |

## Integration Points

### 1. Repository Creation (handlers.go)

The `createReadRepository()` function automatically wraps the underlying repository with caching:

```go
// Base repository (db, file, or in-memory)
baseRepo := createBaseRepository()

// Wrap with Redis cache if available
if redisURL := os.Getenv("REDIS_URL"); redisURL != "" {
    redisClient, err := cache.NewRedisClientFromEnv()
    if err != nil {
        log.Printf("warning: failed to initialize Redis cache: %v", err)
    } else {
        cachedRepo := cache.NewCachedReadRepository(baseRepo, redisClient)
        return cachedRepo
    }
}

return baseRepo
```

### 2. Cache Invalidation

The invalidation handler should be integrated into write operations:

```go
// In bet placement handler
invalidator := cache.NewInvalidationHandler(cachedRepo)
err := invalidator.WithBetPlacementInvalidation(
    punterID, marketID,
    func() error {
        return betService.PlaceBet(ctx, bet)
    },
)

// Or use the handler directly
invalidator.InvalidateOnBetPlaced(punterID, marketID)
```

### 3. Metrics Endpoint

Cache metrics are available and can be exposed via the existing metrics endpoint:

```go
// Get metrics from cached repository
metrics := cachedRepo.Metrics()

// Export as Prometheus format
prometheusOutput := metrics.FormatPrometheus()
```

## Usage Examples

### Basic Usage

The cached repository is a drop-in replacement for any ReadRepository:

```go
// These work identically, but cached version checks Redis first
fixtures, meta, err := cachedRepo.ListFixtures(filter, pageReq)
fixture, err := cachedRepo.GetFixtureByID("f123")
market, err := cachedRepo.GetMarketByID("m456")
punter, err := cachedRepo.GetPunterByID("p789")
```

### Cache Invalidation on Writes

When data changes, invalidate the affected caches:

```go
handler := cache.NewInvalidationHandler(cachedRepo)

// On bet placement
handler.InvalidateOnBetPlaced(punterID, marketID)

// On market update (e.g., odds change)
handler.InvalidateOnMarketUpdate(marketID, fixtureID)

// On wallet change
handler.InvalidateOnWalletChange(punterID)

// On fixture update
handler.InvalidateOnFixtureUpdate(fixtureID)
```

### Monitoring Cache Performance

```go
// Get current metrics
metrics := cachedRepo.Metrics()

// View snapshot
for _, metric := range metrics.Snapshot() {
    fmt.Printf("%s: %d hits, %d misses, %.2f%% hit rate\n",
        metric.Entity,
        metric.Hits,
        metric.Misses,
        metric.HitRate*100,
    )
}

// Export to Prometheus
prometheusText := metrics.FormatPrometheus()
```

## Testing

### Running Tests

Tests are provided for all cache components:

```bash
# Run all cache tests
cd services/gateway
go test ./internal/cache/...

# Run specific test
go test ./internal/cache/ -run TestCachedRepositoryFixtureCaching -v

# With coverage
go test ./internal/cache/... -cover
```

### Test Requirements

- Tests for Redis functionality require a running Redis server on localhost:6379
- Tests will skip Redis tests if the server is unavailable
- Mock repository tests run without external dependencies

### Test Coverage

- `cached_repo_test.go`: Cache hit/miss behavior, invalidation, list operations
- `redis_test.go`: Redis client operations, TTL handling, complex types
- `metrics_test.go`: Metrics collection, hit rate calculation, Prometheus format

## Performance Considerations

### Cache Hit Rate

Typical expected hit rates depend on query patterns:
- **High frequency reads** (same fixture repeatedly): 70-90% hit rate
- **Variable pagination** (different pages): Lower hit rate
- **Fresh reads** (new sports, new markets): Lower initial hit rate

### Memory Usage

Redis memory usage depends on:
- Number of unique queries
- Size of returned data (fixture lists, markets with selections)
- TTL values (longer TTLs = more total entries)

Typical production usage: 50-200MB for moderate traffic

### Network Overhead

- Each cache miss requires a round-trip to Redis
- JSON serialization/deserialization adds ~1-5ms per operation
- Break-even: Cache hits must be >20% to improve overall latency

## Troubleshooting

### Redis Connection Issues

```
warning: failed to initialize Redis cache: failed to connect to Redis at localhost:6379
```

**Solution**: Ensure Redis is running and accessible:
```bash
redis-cli ping  # Should return PONG
```

### High Cache Miss Rate

If hit rates are consistently low:
1. Check TTL values - they may be too short
2. Review query patterns - high variability reduces hit rates
3. Monitor with `metrics.Snapshot()` to identify problematic entities

### Memory Pressure

If Redis memory grows unexpectedly:
1. Reduce TTL values for high-volume caches (markets)
2. Monitor cache metrics to identify hot data
3. Consider cache key pruning or Redis eviction policies

## Future Enhancements

Potential improvements for production deployment:

1. **Distributed Cache Invalidation**: Multi-node support with pub/sub
2. **Cache Warming**: Pre-populate cache on startup for common queries
3. **Adaptive TTLs**: Adjust TTL based on data change frequency
4. **Cache Keys Tracking**: Track all keys to enable full invalidation
5. **Compression**: Compress large cached objects (fixture lists)
6. **Cache Coherence**: Ensure consistency across multiple instances

## Dependencies

- `github.com/redis/go-redis/v9`: Redis client library
- Standard library: `encoding/json`, `context`, `sync`, `crypto/md5`

## Files Modified

- `cmd/gateway/main.go`: No changes needed (uses RegisterRoutes)
- `internal/http/handlers.go`: Updated to wire cache layer
- `go.mod`: Added `github.com/redis/go-redis/v9` dependency

## Files Created

- `internal/cache/redis.go`: Redis client wrapper
- `internal/cache/cached_repo.go`: Cached repository implementation
- `internal/cache/metrics.go`: Cache metrics tracking
- `internal/cache/invalidation.go`: Cache invalidation helpers
- `internal/cache/doc.go`: Package documentation
- `internal/cache/cached_repo_test.go`: Repository cache tests
- `internal/cache/redis_test.go`: Redis client tests
- `internal/cache/metrics_test.go`: Metrics tests
