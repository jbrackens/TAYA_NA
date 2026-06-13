package http

import (
	stdhttp "net/http"
	"net/http/httptest"
	"testing"
)

// TestBotRateLimitMiddleware covers the P3-02 acceptance "abusive key
// throttled": a single API key exceeding its burst gets 429s, while a separate
// key is unaffected (independent bucket). The key id is whatever botAuth.Wrap
// set in X-Bot-Key-ID upstream.
func TestBotRateLimitMiddleware(t *testing.T) {
	limiter := newUserRateLimiter(60, 2) // 60/min sustained, burst 2
	called := 0
	next := stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, _ *stdhttp.Request) {
		called++
		w.WriteHeader(stdhttp.StatusOK)
	})
	h := botRateLimitMiddleware(limiter, next)

	do := func(keyID string) (int, string) {
		r := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/bot/markets", nil)
		if keyID != "" {
			r.Header.Set("X-Bot-Key-ID", keyID)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w.Code, w.Header().Get("Retry-After")
	}

	// Burst of 2 succeeds for key-a, the 3rd in the same instant is throttled.
	if c, _ := do("key-a"); c != stdhttp.StatusOK {
		t.Fatalf("key-a req1: want 200, got %d", c)
	}
	if c, _ := do("key-a"); c != stdhttp.StatusOK {
		t.Fatalf("key-a req2: want 200, got %d", c)
	}
	if c, retry := do("key-a"); c != stdhttp.StatusTooManyRequests || retry == "" {
		t.Fatalf("key-a req3: want 429 + Retry-After, got %d retry=%q", c, retry)
	}

	// A different key has its own bucket and is unaffected.
	if c, _ := do("key-b"); c != stdhttp.StatusOK {
		t.Fatalf("key-b: want 200 (independent bucket), got %d", c)
	}

	// A request with no key id (shouldn't happen post-auth) is passed through.
	if c, _ := do(""); c != stdhttp.StatusOK {
		t.Fatalf("no-key: want 200 (not throttled), got %d", c)
	}

	// next was invoked for every non-throttled request (4), not the throttled one.
	if called != 4 {
		t.Fatalf("expected next called 4x, got %d", called)
	}
}

// TestBotRateLimitConfigDefaults verifies the env-overridable defaults so an
// operator can dial a partner's throughput without code changes (P3-02
// "onboarded without code changes").
func TestBotRateLimitConfigDefaults(t *testing.T) {
	if got := botRateLimitPerMin(); got != 600 {
		t.Fatalf("default per-min: want 600, got %d", got)
	}
	if got := botRateLimitBurst(); got != 120 {
		t.Fatalf("default burst: want 120, got %d", got)
	}
	t.Setenv("BOT_RATE_LIMIT_PER_MIN", "30")
	t.Setenv("BOT_RATE_LIMIT_BURST", "10")
	if got := botRateLimitPerMin(); got != 30 {
		t.Fatalf("override per-min: want 30, got %d", got)
	}
	if got := botRateLimitBurst(); got != 10 {
		t.Fatalf("override burst: want 10, got %d", got)
	}
}
