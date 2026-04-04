package repository

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/phoenixbot/phoenix-gateway/internal/models"
)

type RateLimitRepository interface {
	Allow(ctx context.Context, key string, limit int64, window time.Duration) (models.RateLimitDecision, error)
}

type RedisRateLimitRepository struct {
	client *redis.Client
	now    func() time.Time
}

func NewRedisRateLimitRepository(client *redis.Client) *RedisRateLimitRepository {
	return &RedisRateLimitRepository{client: client, now: time.Now}
}

func (r *RedisRateLimitRepository) Allow(ctx context.Context, key string, limit int64, window time.Duration) (models.RateLimitDecision, error) {
	bucketStart, bucketKey, resetAt := rateLimitBucket(key, window, r.now())
	count, err := r.client.Incr(ctx, bucketKey).Result()
	if err != nil {
		return models.RateLimitDecision{}, err
	}
	if count == 1 {
		if err := r.client.ExpireAt(ctx, bucketKey, resetAt).Err(); err != nil {
			return models.RateLimitDecision{}, err
		}
	}
	remaining := limit - count
	if remaining < 0 {
		remaining = 0
	}
	_ = bucketStart
	return models.RateLimitDecision{
		Allowed:    count <= limit,
		Remaining:  remaining,
		ResetAt:    resetAt,
		RetryAfter: int64(time.Until(resetAt).Seconds()),
	}, nil
}

type MemoryRateLimitRepository struct {
	mu       sync.Mutex
	counters map[string]int64
	now      func() time.Time
}

func NewMemoryRateLimitRepository() *MemoryRateLimitRepository {
	return &MemoryRateLimitRepository{counters: map[string]int64{}, now: time.Now}
}

func (m *MemoryRateLimitRepository) Allow(_ context.Context, key string, limit int64, window time.Duration) (models.RateLimitDecision, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	_, bucketKey, resetAt := rateLimitBucket(key, window, m.now())
	m.counters[bucketKey]++
	count := m.counters[bucketKey]
	remaining := limit - count
	if remaining < 0 {
		remaining = 0
	}
	return models.RateLimitDecision{
		Allowed:    count <= limit,
		Remaining:  remaining,
		ResetAt:    resetAt,
		RetryAfter: int64(time.Until(resetAt).Seconds()),
	}, nil
}

func rateLimitBucket(key string, window time.Duration, now time.Time) (time.Time, string, time.Time) {
	windowSeconds := int64(window.Seconds())
	if windowSeconds <= 0 {
		windowSeconds = 60
	}
	current := now.UTC().Unix()
	bucket := current / windowSeconds
	bucketStart := time.Unix(bucket*windowSeconds, 0).UTC()
	resetAt := bucketStart.Add(window)
	bucketKey := fmt.Sprintf("gateway:ratelimit:%s:%d", key, bucket)
	return bucketStart, bucketKey, resetAt
}
