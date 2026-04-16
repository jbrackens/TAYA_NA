// Package cache provides Redis caching capabilities for the gateway service.
//
// The cache package wraps existing repositories with a Redis-backed caching layer.
// It implements the same ReadRepository interface, allowing it to be used as a drop-in
// replacement with transparent caching.
//
// Key components:
//   - RedisClient: Wrapper around redis client with JSON serialization
//   - CachedReadRepository: Wraps any ReadRepository and adds caching
//   - CacheMetrics: Tracks cache hit/miss/error statistics
//   - InvalidationHandler: Provides methods to invalidate cache on write operations
//
// Configuration via environment variables:
//   - REDIS_URL: Redis server address (default: localhost:6379)
//   - ENABLE_CACHE: Set to enable caching (optional, used with REDIS_URL)
//
// TTL Configuration:
//   - Fixture lists: 5 seconds (high-frequency changes)
//   - Single fixture: 10 seconds
//   - Markets with selections: 1 second (odds change frequently)
//   - Sports catalog: 1 hour (static data)
//   - Punter profile: 5 minutes (account data)
//   - Bets by ID: 30 seconds
//
// Example usage:
//
//	redisClient, err := cache.NewRedisClientFromEnv()
//	if err != nil {
//		log.Fatal(err)
//	}
//	defer redisClient.Close()
//
//	baseRepo := domain.NewInMemoryReadRepository()
//	cachedRepo := cache.NewCachedReadRepository(baseRepo, redisClient)
//
//	// Use cachedRepo as a normal ReadRepository
//	fixtures, _, err := cachedRepo.ListFixtures(filter, page)
//
//	// Invalidate cache on write operations
//	invalidationHandler := cache.NewInvalidationHandler(cachedRepo)
//	invalidationHandler.InvalidateOnBetPlaced(punterID, marketID)
package cache
