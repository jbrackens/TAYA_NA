package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisClient is a wrapper around the redis client that provides JSON serialization
type RedisClient struct {
	client *redis.Client
}

// NewRedisClientFromEnv creates a Redis client from environment variables
// REDIS_URL env var (default localhost:6379)
func NewRedisClientFromEnv() (*RedisClient, error) {
	redisURL := strings.TrimSpace(os.Getenv("REDIS_URL"))
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	// Parse redis URL in format "host:port"
	parts := strings.Split(redisURL, ":")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid REDIS_URL format: expected host:port, got %s", redisURL)
	}

	client := redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis at %s: %w", redisURL, err)
	}

	return &RedisClient{client: client}, nil
}

// NewRedisClient creates a Redis client with the specified address
func NewRedisClient(addr string) (*RedisClient, error) {
	client := redis.NewClient(&redis.Options{
		Addr: addr,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis at %s: %w", addr, err)
	}

	return &RedisClient{client: client}, nil
}

// Get retrieves a value from Redis and unmarshals it into v
func (r *RedisClient) Get(ctx context.Context, key string, v interface{}) error {
	val, err := r.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return ErrCacheMiss
	}
	if err != nil {
		return fmt.Errorf("redis get error: %w", err)
	}

	if err := json.Unmarshal([]byte(val), v); err != nil {
		return fmt.Errorf("failed to unmarshal cached value: %w", err)
	}

	return nil
}

// Set stores a value in Redis with the specified TTL
func (r *RedisClient) Set(ctx context.Context, key string, v interface{}, ttl time.Duration) error {
	data, err := json.Marshal(v)
	if err != nil {
		return fmt.Errorf("failed to marshal value for caching: %w", err)
	}

	if err := r.client.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("redis set error: %w", err)
	}

	return nil
}

// Delete removes a key from Redis
func (r *RedisClient) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}

	if err := r.client.Del(ctx, keys...).Err(); err != nil {
		return fmt.Errorf("redis delete error: %w", err)
	}

	return nil
}

// Close closes the Redis client connection
func (r *RedisClient) Close() error {
	return r.client.Close()
}

// ErrCacheMiss is returned when a key is not found in the cache
var ErrCacheMiss = fmt.Errorf("cache miss")
