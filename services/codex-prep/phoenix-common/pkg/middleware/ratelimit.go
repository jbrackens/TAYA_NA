package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"
)

// TokenBucket implements a simple token bucket rate limiting algorithm.
type TokenBucket struct {
	capacity       int64
	tokensPerSec   float64
	tokens         float64
	lastRefillTime time.Time
	mu             sync.Mutex
}

// NewTokenBucket creates a new token bucket with the specified capacity and refill rate.
// capacity is the maximum number of tokens.
// tokensPerSec is the number of tokens added per second.
func NewTokenBucket(capacity int64, tokensPerSec float64) *TokenBucket {
	return &TokenBucket{
		capacity:       capacity,
		tokensPerSec:   tokensPerSec,
		tokens:         float64(capacity),
		lastRefillTime: time.Now(),
	}
}

// Allow checks if a token can be consumed from the bucket.
// It returns true if tokens are available, false otherwise.
func (tb *TokenBucket) Allow(tokens int64) bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	// Refill tokens based on elapsed time
	now := time.Now()
	elapsed := now.Sub(tb.lastRefillTime).Seconds()
	tb.tokens = min(float64(tb.capacity), tb.tokens+elapsed*tb.tokensPerSec)
	tb.lastRefillTime = now

	// Check if enough tokens are available
	if tb.tokens >= float64(tokens) {
		tb.tokens -= float64(tokens)
		return true
	}

	return false
}

// min returns the minimum of two integers.
func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

// RateLimiterConfig holds configuration for the rate limiter middleware.
type RateLimiterConfig struct {
	Capacity     int64
	TokensPerSec float64
}

// DefaultRateLimiterConfig returns sensible rate limiter defaults.
// Allows 100 requests per second per IP.
func DefaultRateLimiterConfig() *RateLimiterConfig {
	return &RateLimiterConfig{
		Capacity:     100,
		TokensPerSec: 100,
	}
}

// RateLimiter returns a middleware that rate limits requests per IP address
// using the token bucket algorithm.
func RateLimiter(config *RateLimiterConfig) func(next http.Handler) http.Handler {
	if config == nil {
		config = DefaultRateLimiterConfig()
	}

	// Map to store token buckets per IP
	buckets := &sync.Map{}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract the client IP
			ip := getClientIP(r)

			// Get or create a token bucket for this IP
			bucketi, _ := buckets.LoadOrStore(ip, NewTokenBucket(config.Capacity, config.TokensPerSec))
			bucket := bucketi.(*TokenBucket)

			// Check if the request is allowed
			if !bucket.Allow(1) {
				w.Header().Set("Retry-After", "1")
				http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RateLimiterCustom returns a middleware with custom token consumption.
// The handler function is called to determine how many tokens to consume.
func RateLimiterCustom(config *RateLimiterConfig,
	tokenCounter func(*http.Request) int64) func(next http.Handler) http.Handler {

	if config == nil {
		config = DefaultRateLimiterConfig()
	}

	buckets := &sync.Map{}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := getClientIP(r)
			bucketi, _ := buckets.LoadOrStore(ip, NewTokenBucket(config.Capacity, config.TokensPerSec))
			bucket := bucketi.(*TokenBucket)

			tokensNeeded := tokenCounter(r)
			if !bucket.Allow(tokensNeeded) {
				w.Header().Set("Retry-After", "1")
				http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// getClientIP extracts the client IP address from the request.
// It checks X-Forwarded-For and X-Real-IP headers before falling back to RemoteAddr.
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (for proxied requests)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For can contain multiple IPs, use the first one
		if ip, _, err := net.SplitHostPort(xff); err == nil {
			return ip
		}
		return xff
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	if ip, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return ip
	}

	return r.RemoteAddr
}

// CleanupStaleIPs should be called periodically to clean up stale IP entries.
// This prevents unbounded memory growth in long-running services.
func CleanupStaleIPs(buckets *sync.Map, maxAge time.Duration) {
	buckets.Range(func(key, value interface{}) bool {
		bucket := value.(*TokenBucket)
		bucket.mu.Lock()
		if time.Since(bucket.lastRefillTime) > maxAge {
			buckets.Delete(key)
		}
		bucket.mu.Unlock()
		return true
	})
}
