package http

import (
	"context"
	"database/sql"
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

type socialWriteLimiter interface {
	AllowWrite(ctx context.Context, key string) (bool, error)
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

func (l *userRateLimiter) AllowWrite(_ context.Context, key string) (bool, error) {
	return l.Allow(key), nil
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

// commsSendRateLimitPerMin reads COMMS_SEND_RATE_LIMIT_PER_MIN (default 20). It
// throttles the per-actor rate of agent-initiated player communications
// (GAP-75, §27 Security): compliance sends are infrequent, so a generous cap
// stops a compromised admin session or a looping caller from spamming a player /
// the mail relay without hindering legitimate one-off sends.
func commsSendRateLimitPerMin() int {
	if v := strings.TrimSpace(os.Getenv("COMMS_SEND_RATE_LIMIT_PER_MIN")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return 20
}

func socialWriteRateLimitPerMin() int {
	if v := strings.TrimSpace(os.Getenv("SOCIAL_WRITE_RATE_LIMIT_PER_MIN")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return 30
}

func socialWriteRateLimitBurst() int {
	if v := strings.TrimSpace(os.Getenv("SOCIAL_WRITE_RATE_LIMIT_BURST")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return 10
}

func socialWriteIPRateLimiter() *userRateLimiter {
	perMinute := socialWriteIPRateLimitPerMin()
	if perMinute < 1 {
		return nil
	}
	return newUserRateLimiter(perMinute, socialWriteIPRateLimitBurst())
}

func socialWriteIPRateLimitPerMin() int {
	if v := strings.TrimSpace(os.Getenv("SOCIAL_WRITE_IP_RATE_LIMIT_PER_MIN")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return 0
}

func socialWriteIPRateLimitBurst() int {
	if v := strings.TrimSpace(os.Getenv("SOCIAL_WRITE_IP_RATE_LIMIT_BURST")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return 1
}

func socialWriteUserLimiter(db *sql.DB) socialWriteLimiter {
	return newSocialWriteLimiter(db, socialWriteRateLimitPerMin(), socialWriteRateLimitBurst())
}

func socialWriteIPLimiter(db *sql.DB) socialWriteLimiter {
	perMinute := socialWriteIPRateLimitPerMin()
	if perMinute < 1 {
		return nil
	}
	return newSocialWriteLimiter(db, perMinute, socialWriteIPRateLimitBurst())
}

func newSocialWriteLimiter(db *sql.DB, perMinute, burst int) socialWriteLimiter {
	if db == nil {
		return newUserRateLimiter(perMinute, burst)
	}
	return newSQLSocialWriteLimiter(db, perMinute, burst)
}

type sqlSocialWriteLimiter struct {
	db         *sql.DB
	ratePerSec float64
	burst      float64
	once       sync.Once
	schemaErr  error
	now        func() time.Time
}

func newSQLSocialWriteLimiter(db *sql.DB, perMinute, burst int) *sqlSocialWriteLimiter {
	if perMinute < 1 {
		perMinute = 1
	}
	if burst < 1 {
		burst = 1
	}
	return &sqlSocialWriteLimiter{
		db:         db,
		ratePerSec: float64(perMinute) / 60.0,
		burst:      float64(burst),
		now:        time.Now,
	}
}

func (l *sqlSocialWriteLimiter) AllowWrite(ctx context.Context, key string) (bool, error) {
	if err := l.ensureSchema(ctx); err != nil {
		return false, err
	}
	tx, err := l.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback()
		}
	}()

	now := l.now().UTC()
	var tokens float64
	var lastSeen time.Time
	err = tx.QueryRowContext(ctx, `
SELECT tokens, last_seen
FROM prediction_social_write_limits
WHERE limiter_key = $1
FOR UPDATE`, key).Scan(&tokens, &lastSeen)
	if err == sql.ErrNoRows {
		_, err = tx.ExecContext(ctx, `
INSERT INTO prediction_social_write_limits (limiter_key, tokens, last_seen, updated_at)
VALUES ($1, $2, $3, $3)`, key, l.burst-1, now)
		if err != nil {
			return false, err
		}
		if err := tx.Commit(); err != nil {
			return false, err
		}
		tx = nil
		return true, nil
	}
	if err != nil {
		return false, err
	}

	tokens += now.Sub(lastSeen).Seconds() * l.ratePerSec
	if tokens > l.burst {
		tokens = l.burst
	}
	allowed := tokens >= 1
	if allowed {
		tokens--
	}
	_, err = tx.ExecContext(ctx, `
UPDATE prediction_social_write_limits
SET tokens = $2, last_seen = $3, updated_at = $3
WHERE limiter_key = $1`, key, tokens, now)
	if err != nil {
		return false, err
	}
	if err := tx.Commit(); err != nil {
		return false, err
	}
	tx = nil
	return allowed, nil
}

func (l *sqlSocialWriteLimiter) ensureSchema(ctx context.Context) error {
	l.once.Do(func() {
		_, l.schemaErr = l.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS prediction_social_write_limits (
  limiter_key TEXT PRIMARY KEY,
  tokens DOUBLE PRECISION NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prediction_social_write_limits_updated
  ON prediction_social_write_limits (updated_at);`)
	})
	return l.schemaErr
}
