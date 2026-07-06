package httpx

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

// fakeLimiter lets tests force allow/deny without touching real backends.
type fakeLimiter struct {
	mu     sync.Mutex
	calls  int
	allow  bool
	keys   []string
	limits []int
}

func (f *fakeLimiter) Allow(key string, limit int, _ time.Duration) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls++
	f.keys = append(f.keys, key)
	f.limits = append(f.limits, limit)
	return f.allow
}

func newRateLimitTestHandler(cfg RateLimitConfig) http.Handler {
	mw := RateLimit(cfg)
	final := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	return mw(final)
}

func TestRateLimitAllowsUnderLimit(t *testing.T) {
	limiter := &fakeLimiter{allow: true}
	h := newRateLimitTestHandler(RateLimitConfig{
		Limiter: limiter,
		Limit:   10,
		Window:  time.Minute,
	})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets", nil)
	req.RemoteAddr = "203.0.113.5:1234"
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if limiter.calls != 1 {
		t.Fatalf("expected limiter.Allow called once, got %d", limiter.calls)
	}
	if got := limiter.keys[0]; got != "203.0.113.5" {
		t.Fatalf("expected key=203.0.113.5, got %q", got)
	}
}

func TestRateLimitRejectsOverLimit(t *testing.T) {
	limiter := &fakeLimiter{allow: false}
	h := newRateLimitTestHandler(RateLimitConfig{
		Limiter: limiter,
		Limit:   10,
		Window:  30 * time.Second,
	})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets", nil)
	req.RemoteAddr = "203.0.113.5:1234"
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec.Code)
	}
	retry := rec.Header().Get("Retry-After")
	if retry == "" {
		t.Fatal("expected Retry-After header")
	}
	if n, err := strconv.Atoi(retry); err != nil || n != 30 {
		t.Fatalf("expected Retry-After=30, got %q", retry)
	}
}

func TestRateLimitRetryAfterClampsToOne(t *testing.T) {
	limiter := &fakeLimiter{allow: false}
	h := newRateLimitTestHandler(RateLimitConfig{
		Limiter: limiter,
		Limit:   1,
		Window:  500 * time.Millisecond, // sub-second
	})
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "203.0.113.5:1234"
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Header().Get("Retry-After") != "1" {
		t.Fatalf("expected Retry-After=1 (clamped), got %q", rec.Header().Get("Retry-After"))
	}
}

func TestRateLimitOnlyAppliesToConfiguredPrefixes(t *testing.T) {
	limiter := &fakeLimiter{allow: false}
	h := newRateLimitTestHandler(RateLimitConfig{
		Limiter:      limiter,
		Limit:        1,
		Window:       time.Minute,
		PathPrefixes: []string{"/api/v1/markets"},
	})

	// Outside the prefix — should bypass.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/portfolio", nil)
	req.RemoteAddr = "203.0.113.5:1234"
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected bypass=200 for unrelated path, got %d", rec.Code)
	}
	if limiter.calls != 0 {
		t.Fatalf("expected limiter NOT called for non-matching prefix, got %d calls", limiter.calls)
	}

	// Inside the prefix — should hit the limiter and 429.
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/markets/foo", nil)
	req2.RemoteAddr = "203.0.113.5:1234"
	rec2 := httptest.NewRecorder()
	h.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 inside matching prefix, got %d", rec2.Code)
	}
}

func TestRateLimitSkipPrefixesOverridePathPrefixes(t *testing.T) {
	limiter := &fakeLimiter{allow: false}
	h := newRateLimitTestHandler(RateLimitConfig{
		Limiter:          limiter,
		Limit:            1,
		Window:           time.Minute,
		PathPrefixes:     []string{"/"},                                  // limit everything
		SkipPathPrefixes: []string{"/healthz", "/readyz", "/api/v1/status"},
	})

	for _, p := range []string{"/healthz", "/readyz", "/api/v1/status"} {
		req := httptest.NewRequest(http.MethodGet, p, nil)
		req.RemoteAddr = "203.0.113.5:1234"
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s: expected skip=200, got %d", p, rec.Code)
		}
	}
	if limiter.calls != 0 {
		t.Fatalf("expected limiter never called for skipped prefixes, got %d", limiter.calls)
	}

	// Non-skipped path should still be limited.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets", nil)
	req.RemoteAddr = "203.0.113.5:1234"
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 for non-skipped path, got %d", rec.Code)
	}
}

func TestRateLimitFailsOpenWhenKeyEmpty(t *testing.T) {
	limiter := &fakeLimiter{allow: false}
	h := newRateLimitTestHandler(RateLimitConfig{
		Limiter: limiter,
		Limit:   1,
		Window:  time.Minute,
		KeyFunc: func(r *http.Request) string { return "" },
	})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets", nil)
	req.RemoteAddr = "203.0.113.5:1234"
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected fail-open=200 when key is empty, got %d", rec.Code)
	}
	if limiter.calls != 0 {
		t.Fatalf("limiter should not be called when key is empty, got %d", limiter.calls)
	}
}

func TestRateLimitDefaultIgnoresXForwardedFor(t *testing.T) {
	// Default ClientIP must NOT trust XFF — that header is caller-supplied
	// and lets attackers rotate apparent IPs to bypass the limiter unless
	// the deployment opts in via TrustedProxyClientIP.
	limiter := &fakeLimiter{allow: true}
	h := newRateLimitTestHandler(RateLimitConfig{
		Limiter: limiter,
		Limit:   100,
		Window:  time.Minute,
	})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets", nil)
	req.RemoteAddr = "10.0.0.1:1234"
	req.Header.Set("X-Forwarded-For", "198.51.100.7, 10.0.0.1, 10.0.0.2")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if got := limiter.keys[0]; got != "10.0.0.1" {
		t.Fatalf("expected RemoteAddr key (XFF must be ignored by default), got %q", got)
	}
}

func TestRateLimitPanicsOnInvalidConfig(t *testing.T) {
	cases := []struct {
		name string
		cfg  RateLimitConfig
	}{
		{"missing limiter", RateLimitConfig{Limit: 1, Window: time.Second}},
		{"zero limit", RateLimitConfig{Limiter: &fakeLimiter{}, Limit: 0, Window: time.Second}},
		{"zero window", RateLimitConfig{Limiter: &fakeLimiter{}, Limit: 1, Window: 0}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			defer func() {
				if r := recover(); r == nil {
					t.Fatal("expected panic")
				}
			}()
			_ = RateLimit(tc.cfg)
		})
	}
}

func TestMemoryRateLimiterAllowsThenRejects(t *testing.T) {
	rl := NewMemoryRateLimiter()
	defer rl.Stop()
	const limit = 3
	window := time.Minute

	for i := 0; i < limit; i++ {
		if !rl.Allow("k", limit, window) {
			t.Fatalf("call %d: expected allow", i)
		}
	}
	if rl.Allow("k", limit, window) {
		t.Fatal("expected reject after limit hit")
	}
}

func TestMemoryRateLimiterSlidingWindowDecays(t *testing.T) {
	rl := NewMemoryRateLimiter()
	defer rl.Stop()
	const limit = 2
	window := 50 * time.Millisecond

	if !rl.Allow("k", limit, window) {
		t.Fatal("first should allow")
	}
	if !rl.Allow("k", limit, window) {
		t.Fatal("second should allow")
	}
	if rl.Allow("k", limit, window) {
		t.Fatal("third should reject within window")
	}
	time.Sleep(70 * time.Millisecond)
	if !rl.Allow("k", limit, window) {
		t.Fatal("after window, should allow again")
	}
}

func TestMemoryRateLimiterIsolatesKeys(t *testing.T) {
	rl := NewMemoryRateLimiter()
	defer rl.Stop()
	const limit = 1
	window := time.Minute

	if !rl.Allow("a", limit, window) {
		t.Fatal("a first should allow")
	}
	if rl.Allow("a", limit, window) {
		t.Fatal("a second should reject")
	}
	// Different key — independent counter.
	if !rl.Allow("b", limit, window) {
		t.Fatal("b first should allow despite a being rejected")
	}
}

func TestMemoryRateLimiterConcurrent(t *testing.T) {
	rl := NewMemoryRateLimiter()
	defer rl.Stop()
	const goroutines = 50
	const limit = 10
	window := time.Minute

	var allowed int64
	var wg sync.WaitGroup
	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		go func() {
			defer wg.Done()
			if rl.Allow("shared", limit, window) {
				atomic.AddInt64(&allowed, 1)
			}
		}()
	}
	wg.Wait()
	if allowed != int64(limit) {
		t.Fatalf("expected exactly %d allowed under contention, got %d", limit, allowed)
	}
}

func newTestRedis(t *testing.T) *redis.Client {
	t.Helper()
	mr := miniredis.RunT(t)
	return redis.NewClient(&redis.Options{Addr: mr.Addr()})
}

func TestRedisRateLimiterCountsAcrossCalls(t *testing.T) {
	client := newTestRedis(t)
	rl := NewRedisRateLimiter(client, "rl:test")
	const limit = 3
	window := time.Minute

	for i := 0; i < limit; i++ {
		if !rl.Allow("k", limit, window) {
			t.Fatalf("call %d: expected allow", i)
		}
	}
	if rl.Allow("k", limit, window) {
		t.Fatal("expected reject after limit hit")
	}
	if rl.Allow("k", limit, window) {
		t.Fatal("expected continued reject — TTL must persist within window")
	}
}

func TestRedisRateLimiterTTLIsAtomic(t *testing.T) {
	// Verify the Lua script set PEXPIRE on the key so it doesn't live
	// forever even if a race between INCR and a separate EXPIRE call
	// would have left it unbounded in the old impl.
	client := newTestRedis(t)
	rl := NewRedisRateLimiter(client, "rl:test")
	if !rl.Allow("k", 5, 250*time.Millisecond) {
		t.Fatal("first call must allow")
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	ttl, err := client.PTTL(ctx, "rl:test:k").Result()
	if err != nil {
		t.Fatalf("PTTL failed: %v", err)
	}
	if ttl <= 0 || ttl > 250*time.Millisecond {
		t.Fatalf("expected TTL in (0, 250ms], got %v", ttl)
	}
}

func TestRedisRateLimiterFailsOpenOnError(t *testing.T) {
	// Unreachable client → EVAL errors → Allow must fail open.
	// Tight DialTimeout/MaxRetries keep this test fast (~ms not seconds).
	client := redis.NewClient(&redis.Options{
		Addr:        "127.0.0.1:1",
		DialTimeout: 50 * time.Millisecond,
		MaxRetries:  -1,
	})
	rl := NewRedisRateLimiter(client, "rl:test")
	for i := 0; i < 3; i++ {
		if !rl.Allow("k", 1, time.Minute) {
			t.Fatalf("call %d: expected fail-open allow", i)
		}
	}
}

func TestRedisRateLimiterIsolatesKeys(t *testing.T) {
	client := newTestRedis(t)
	rl := NewRedisRateLimiter(client, "rl:test")
	if !rl.Allow("a", 1, time.Minute) {
		t.Fatal("a first allow")
	}
	if rl.Allow("a", 1, time.Minute) {
		t.Fatal("a second reject")
	}
	if !rl.Allow("b", 1, time.Minute) {
		t.Fatal("b independent allow")
	}
}

func TestClientIPAlwaysReturnsRemoteAddr(t *testing.T) {
	// ClientIP must NOT honor caller-supplied headers. Spoofable XFF
	// would defeat IP-based rate limiting whenever the gateway is
	// directly reachable.
	cases := []struct {
		name    string
		headers map[string]string
		remote  string
		want    string
	}{
		{"xff ignored", map[string]string{"X-Forwarded-For": "1.2.3.4, 10.0.0.1"}, "10.0.0.5:5000", "10.0.0.5"},
		{"x-real-ip ignored", map[string]string{"X-Real-IP": "5.6.7.8"}, "10.0.0.5:5000", "10.0.0.5"},
		{"remote addr with port", nil, "9.8.7.6:1234", "9.8.7.6"},
		{"remote addr no port", nil, "9.8.7.6", "9.8.7.6"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.RemoteAddr = tc.remote
			for k, v := range tc.headers {
				req.Header.Set(k, v)
			}
			if got := ClientIP(req); got != tc.want {
				t.Fatalf("want %q got %q", tc.want, got)
			}
		})
	}
}

func TestTrustedProxyClientIPRejectsBadCIDR(t *testing.T) {
	if _, err := TrustedProxyClientIP([]string{"not-a-cidr"}); err == nil {
		t.Fatal("expected error for invalid CIDR")
	}
}

func TestTrustedProxyClientIPEmptyListBehavesLikeClientIP(t *testing.T) {
	keyFn, err := TrustedProxyClientIP(nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "9.8.7.6:1234"
	req.Header.Set("X-Forwarded-For", "1.2.3.4")
	if got := keyFn(req); got != "9.8.7.6" {
		t.Fatalf("want 9.8.7.6 (XFF ignored, peer not trusted), got %q", got)
	}
}

func TestTrustedProxyClientIPHonorsXFFOnlyFromTrustedPeer(t *testing.T) {
	keyFn, err := TrustedProxyClientIP([]string{"10.0.0.0/8"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	cases := []struct {
		name   string
		remote string
		xff    string
		want   string
	}{
		{"trusted peer with xff", "10.0.0.5:1234", "203.0.113.10, 10.0.0.5", "203.0.113.10"},
		{"trusted peer with chain ending in trusted", "10.0.0.5:1234", "203.0.113.10, 10.0.0.7", "203.0.113.10"},
		{"trusted peer with all trusted hops returns leftmost", "10.0.0.5:1234", "10.0.0.6, 10.0.0.7", "10.0.0.6"},
		{"untrusted peer ignores xff", "203.0.113.99:1234", "1.2.3.4", "203.0.113.99"},
		{"trusted peer no xff", "10.0.0.5:1234", "", "10.0.0.5"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.RemoteAddr = tc.remote
			if tc.xff != "" {
				req.Header.Set("X-Forwarded-For", tc.xff)
			}
			if got := keyFn(req); got != tc.want {
				t.Fatalf("want %q got %q", tc.want, got)
			}
		})
	}
}

func TestTrustedProxyClientIPSpoofedXFFFromAttackerIsIgnored(t *testing.T) {
	// Attacker connects directly to the gateway from 203.0.113.99 and
	// sets X-Forwarded-For: <victim IP> trying to frame the victim or
	// rotate apparent IPs. The function must ignore the header because
	// the peer isn't a trusted proxy.
	keyFn, err := TrustedProxyClientIP([]string{"10.0.0.0/8", "172.16.0.0/12"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "203.0.113.99:5000"
	req.Header.Set("X-Forwarded-For", "198.51.100.42, 10.0.0.1") // spoofed
	if got := keyFn(req); got != "203.0.113.99" {
		t.Fatalf("want attacker IP 203.0.113.99 (XFF ignored), got %q", got)
	}
}
