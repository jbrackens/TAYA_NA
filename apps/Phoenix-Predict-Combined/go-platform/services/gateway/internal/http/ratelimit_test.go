package http

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// TestUserRateLimiterBurstAndRefill verifies burst capacity, per-key isolation,
// and continuous refill (using an injected clock so the test is deterministic).
func TestUserRateLimiterBurstAndRefill(t *testing.T) {
	clk := time.Now()
	l := newUserRateLimiter(60, 2) // 60/min = 1 token/sec, burst 2
	l.now = func() time.Time { return clk }

	// Burst of 2 is allowed; the 3rd is denied.
	if !l.Allow("u1") || !l.Allow("u1") {
		t.Fatal("first two requests should be allowed (burst=2)")
	}
	if l.Allow("u1") {
		t.Fatal("third request should be denied (burst exhausted)")
	}

	// A different key has its own independent bucket.
	if !l.Allow("u2") {
		t.Fatal("a different key should not be throttled by u1's usage")
	}

	// After 1s, exactly one token refills (rate 1/sec).
	clk = clk.Add(time.Second)
	if !l.Allow("u1") {
		t.Fatal("one token should have refilled after 1s")
	}
	if l.Allow("u1") {
		t.Fatal("only one token refilled; the next should be denied")
	}
}

func TestDisputeRateLimitDefault(t *testing.T) {
	t.Setenv("DISPUTE_RATE_LIMIT_PER_MIN", "")
	if got := disputeRateLimitPerMin(); got != 5 {
		t.Fatalf("default dispute rate limit: got %d, want 5", got)
	}
	t.Setenv("DISPUTE_RATE_LIMIT_PER_MIN", "12")
	if got := disputeRateLimitPerMin(); got != 12 {
		t.Fatalf("env override: got %d, want 12", got)
	}
}

func TestSocialWriteLimiterMigrationOwnsPersistentStore(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "migrations", "049_prediction_social_write_limits.sql"))
	if err != nil {
		t.Fatalf("read social write limiter migration: %v", err)
	}
	body := string(raw)
	for _, want := range []string{
		"CREATE TABLE IF NOT EXISTS prediction_social_write_limits",
		"limiter_key TEXT PRIMARY KEY",
		"tokens DOUBLE PRECISION NOT NULL",
		"last_seen TIMESTAMPTZ NOT NULL",
		"idx_prediction_social_write_limits_updated",
		"DROP TABLE IF EXISTS prediction_social_write_limits",
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("social write limiter migration missing %q", want)
		}
	}
}
