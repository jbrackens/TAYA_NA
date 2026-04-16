package http

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

// redisRateLimiter implements RateLimiterBackend using Redis INCR+EXPIRE.
// Safe for horizontal scaling — all auth instances share the same counters.
type redisRateLimiter struct {
	client *redis.Client
	prefix string
}

func newRedisRateLimiter(client *redis.Client, prefix string) *redisRateLimiter {
	return &redisRateLimiter{client: client, prefix: prefix}
}

// Allow checks whether key is within the rate limit using a Redis counter
// with a TTL equal to the sliding window. Uses INCR + EXPIRE for atomicity.
func (r *redisRateLimiter) Allow(key string, limit int, window time.Duration) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	rkey := fmt.Sprintf("%s:%s", r.prefix, key)
	count, err := r.client.Incr(ctx, rkey).Result()
	if err != nil {
		slog.Error("redis rate limiter: INCR failed, allowing request (fail-open)", "key", rkey, "error", err)
		return true // fail-open: allow the request if Redis is unavailable
	}

	if count == 1 {
		// First hit in window — set expiry
		r.client.Expire(ctx, rkey, window)
	}

	return count <= int64(limit)
}

// redisLockoutTracker implements LockoutBackend using Redis.
type redisLockoutTracker struct {
	client          *redis.Client
	maxAttempts     int
	lockoutDuration time.Duration
	failureWindow   time.Duration
}

func newRedisLockoutTracker(client *redis.Client) *redisLockoutTracker {
	return &redisLockoutTracker{
		client:          client,
		maxAttempts:     maxFailedAttempts,
		lockoutDuration: lockoutDuration,
		failureWindow:   failedAttemptWindow,
	}
}

// IsLocked checks whether the username is currently locked out.
func (r *redisLockoutTracker) IsLocked(username string) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	exists, err := r.client.Exists(ctx, "lockout:locked:"+username).Result()
	if err != nil {
		slog.Error("redis lockout: EXISTS failed, treating as not locked (fail-open)", "username", username, "error", err)
		return false
	}
	return exists > 0
}

// RecordFailure records a failed login attempt. Triggers lockout when threshold is reached.
func (r *redisLockoutTracker) RecordFailure(username string) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	failKey := "lockout:failures:" + username
	count, err := r.client.Incr(ctx, failKey).Result()
	if err != nil {
		slog.Error("redis lockout: INCR failed", "username", username, "error", err)
		return
	}

	if count == 1 {
		r.client.Expire(ctx, failKey, r.failureWindow)
	}

	if count >= int64(r.maxAttempts) {
		r.client.Set(ctx, "lockout:locked:"+username, "1", r.lockoutDuration)
		r.client.Del(ctx, failKey)
		slog.Warn("auth: account locked after failed attempts", "username", username, "attempts", count)
	}
}

// ClearFailures removes all failure history on successful login.
func (r *redisLockoutTracker) ClearFailures(username string) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	r.client.Del(ctx, "lockout:failures:"+username, "lockout:locked:"+username)
}
