# Redis Caching Layer - Quick Start Guide

## 5-Minute Setup

### 1. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or locally if installed
redis-server
```

### 2. Set Environment Variable

```bash
export REDIS_URL=localhost:6379
```

### 3. That's It!

The gateway service automatically enables caching when REDIS_URL is set. No code changes needed.

## Verify Caching is Working

### Check Logs

Look for this message at startup:
```
gateway read repository wrapped with Redis cache
```

If Redis is unavailable, you'll see:
```
warning: failed to initialize Redis cache: ...
```
The service will continue working without caching.

### Test Cache Performance

Make repeated requests for the same fixture:

```bash
curl http://localhost:18080/api/v1/fixtures/f1

# First request: Redis MISS, reads from underlying repo
# Second request: Redis HIT, returns cached data

# Check metrics
curl http://localhost:18080/metrics | grep cache
```

### View Metrics

The cached repository tracks:
- `gateway_cache_hits_total`: Number of successful cache hits
- `gateway_cache_misses_total`: Number of cache misses
- `gateway_cache_errors_total`: Number of cache errors
- `gateway_cache_hit_rate`: Current cache hit rate (0.0-1.0)

Example output:
```
gateway_cache_hits_total{entity="fixture"} 42
gateway_cache_misses_total{entity="fixture"} 8
gateway_cache_errors_total{entity="fixture"} 0
gateway_cache_hit_rate{entity="fixture"} 0.8400
```

## Cache Invalidation

When you need to clear specific cached data (e.g., after an update):

### In Bet Service

```go
// After placing a bet, invalidate affected caches
invalidator := cache.NewInvalidationHandler(cachedRepo)
invalidator.InvalidateOnBetPlaced(punterID, marketID)
```

### In Market Update Handler

```go
// After updating market odds
invalidator.InvalidateOnOddsUpdate(marketID)
```

### In Wallet/Account Update

```go
// After wallet change
invalidator.InvalidateOnWalletChange(punterID)
```

## Configuration Options

### Option 1: Simple (Recommended)
```bash
export REDIS_URL=localhost:6379
```

### Option 2: With Explicit Enable
```bash
export REDIS_URL=redis.prod.example.com:6379
export ENABLE_CACHE=true
```

### Option 3: Disable Cache (use original repo)
```bash
unset REDIS_URL
unset ENABLE_CACHE
```

## Cache TTLs

Default TTL values (configured in code):

| Data Type | TTL | Why |
|---|---|---|
| Fixtures | 5-10 sec | Relatively static |
| Markets | 1 sec | Odds change often |
| Punters | 5 min | Account data |
| Sports Catalog | 1 hour | Reference data |

To adjust TTLs, modify constants in `internal/cache/cached_repo.go`:

```go
const (
    FixtureListTTL   = 5 * time.Second    // Adjust here
    SingleFixtureTTL = 10 * time.Second   // Adjust here
    MarketWithSelTTL = 1 * time.Second    // Adjust here
    // ... etc
)
```

## Troubleshooting

### "Cache hits are zero"

**Problem**: Redis is running but no cache hits

**Check**:
```bash
redis-cli ping
# Should return: PONG
```

**Solution**: Wait a few seconds for warm-up, then make repeated requests

### "Redis connection refused"

**Problem**: Service can't reach Redis

**Check**:
```bash
# Verify Redis is running
redis-cli ping

# Check REDIS_URL is set correctly
echo $REDIS_URL
```

**Solution**: Start Redis or fix the connection string

### "Cache is stale"

**Problem**: Cached data doesn't match underlying data

**Solution**: Implement invalidation on write operations

```go
invalidator := cache.NewInvalidationHandler(cachedRepo)
invalidator.InvalidateOnMarketUpdate(marketID, fixtureID)
```

## Performance Tips

### 1. Monitor Hit Rate

```bash
# Check hit rate for each entity type
curl http://localhost:18080/metrics | grep cache_hit_rate
```

Target: >60% hit rate for production

### 2. Adjust TTLs if Needed

- **Low hit rate** (< 40%): Increase TTL values
- **Stale data** issues: Decrease TTL values
- **Market data**: 1 sec is usually right (odds change fast)

### 3. Co-locate Redis

Keep Redis on the same network as gateway for latency. Single-digit ms is ideal.

## Testing Cache Layer

### Run Tests

```bash
# All tests (requires Redis)
go test ./internal/cache/... -v

# Just metrics tests (no Redis needed)
go test ./internal/cache/... -run Metrics -v

# With coverage report
go test ./internal/cache/... -cover
```

### Test Without Redis

Some tests skip Redis if unavailable:

```bash
# Stop Redis
redis-cli shutdown

# Tests will skip Redis tests, run mock tests
go test ./internal/cache/... -v
```

## Production Checklist

- [ ] Redis deployed and accessible
- [ ] REDIS_URL set in environment
- [ ] Service starts without errors
- [ ] Metrics show cache hits after warm-up
- [ ] Hit rate > 50% observed in logs
- [ ] Invalidation working correctly
- [ ] Monitoring alerts configured for low hit rates

## Next Steps

- Read `CACHE_INTEGRATION.md` for detailed integration guide
- Check `CACHE_IMPLEMENTATION_SUMMARY.md` for architecture details
- Review code in `internal/cache/` for implementation details

## Support

If you encounter issues:

1. Check service logs for errors
2. Verify Redis is running: `redis-cli ping`
3. Review configuration in `CACHE_INTEGRATION.md`
4. Check metrics endpoint for hit/miss statistics
5. Enable debug logging if needed

## Files Overview

```
internal/cache/
├── redis.go                 # Redis client wrapper
├── cached_repo.go          # Cached repository (main logic)
├── metrics.go              # Cache statistics tracking
├── invalidation.go         # Cache invalidation helpers
├── doc.go                  # Package documentation
├── redis_test.go           # Redis client tests
├── cached_repo_test.go     # Repository cache tests
└── metrics_test.go         # Metrics tests
```

That's it! Your gateway service now has Redis caching enabled.
