package http

import (
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// userRateLimiter is a small per-key token-bucket limiter for authenticated
// endpoints — no external dependency. Buckets refill continuously; idle buckets
// are swept lazily so the map can't grow unbounded. Used to rate-limit dispute
// submissions (ADR-0004 #5: the dispute API must be authenticated AND
// rate-limited).
type userRateLimiter struct {
	mu         sync.Mutex
	buckets    map[string]*tokenBucket
	ratePerSec float64
	burst      float64
	now        func() time.Time // injectable for tests
	lastSweep  time.Time
}

type tokenBucket struct {
	tokens   float64
	lastSeen time.Time
}

// newUserRateLimiter builds a limiter allowing ~perMinute sustained actions per
// key with an initial burst capacity.
func newUserRateLimiter(perMinute, burst int) *userRateLimiter {
	if perMinute < 1 {
		perMinute = 1
	}
	if burst < 1 {
		burst = 1
	}
	return &userRateLimiter{
		buckets:    map[string]*tokenBucket{},
		ratePerSec: float64(perMinute) / 60.0,
		burst:      float64(burst),
		now:        time.Now,
	}
}

// Allow reports whether key may proceed, consuming one token if so.
func (l *userRateLimiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	l.sweepLocked(now)
	b := l.buckets[key]
	if b == nil {
		b = &tokenBucket{tokens: l.burst, lastSeen: now}
		l.buckets[key] = b
	}
	b.tokens += now.Sub(b.lastSeen).Seconds() * l.ratePerSec
	if b.tokens > l.burst {
		b.tokens = l.burst
	}
	b.lastSeen = now
	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}

// sweepLocked drops buckets idle long enough to have fully refilled (so dropping
// them changes nothing), bounding memory. Caller holds l.mu.
func (l *userRateLimiter) sweepLocked(now time.Time) {
	const sweepEvery = 5 * time.Minute
	const idleTTL = 10 * time.Minute
	if now.Sub(l.lastSweep) < sweepEvery {
		return
	}
	l.lastSweep = now
	for k, b := range l.buckets {
		if now.Sub(b.lastSeen) > idleTTL {
			delete(l.buckets, k)
		}
	}
}

// disputeRateLimitPerMin reads DISPUTE_RATE_LIMIT_PER_MIN (default 5). A user
// holding positions in many markets can still dispute each, just not in a rapid
// burst — this throttles spam/retry storms, not legitimate one-off disputes.
func disputeRateLimitPerMin() int {
	if v := strings.TrimSpace(os.Getenv("DISPUTE_RATE_LIMIT_PER_MIN")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return 5
}
