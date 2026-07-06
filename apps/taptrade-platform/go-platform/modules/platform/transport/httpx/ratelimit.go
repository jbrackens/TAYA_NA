package httpx

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// RateLimiter is the abstraction the RateLimit middleware needs to decide
// whether a request is allowed. Allow returns true if the call should
// proceed, false if it should be rejected with 429.
//
// Implementations must be safe for concurrent use and must fail-OPEN: if
// the backend is unavailable (e.g. Redis down), Allow should return true
// and log the error. The alternative (fail-closed) turns a Redis blip into
// a site outage.
type RateLimiter interface {
	Allow(key string, limit int, window time.Duration) bool
}

// MemoryRateLimiter is an in-memory sliding-window rate limiter. Safe for
// single-instance deployments; for horizontal scale use NewRedisRateLimiter
// so all replicas share the same counters.
//
// Note the implementations differ in window semantics: this one is a true
// sliding window (timestamps trimmed each call), while RedisRateLimiter is
// a fixed window (counter reset by PEXPIRE). Both honor the same Limit but
// the Redis variant allows up to 2*Limit at the boundary.
//
// Memory: stores a slice of timestamps per key. A background sweeper
// reclaims memory for keys that have been idle for the window. Bounded by
// active-key cardinality * limit.
type MemoryRateLimiter struct {
	mu      sync.Mutex
	windows map[string][]time.Time
	stop    chan struct{}
}

// NewMemoryRateLimiter creates an in-memory rate limiter with a background
// sweeper. Call Stop to release the sweeper goroutine in tests.
func NewMemoryRateLimiter() *MemoryRateLimiter {
	rl := &MemoryRateLimiter{
		windows: make(map[string][]time.Time),
		stop:    make(chan struct{}),
	}
	go rl.runSweeper()
	return rl
}

// Allow records a hit and returns whether the key is under its limit for
// the given sliding window.
func (rl *MemoryRateLimiter) Allow(key string, limit int, window time.Duration) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-window)
	recent := make([]time.Time, 0, len(rl.windows[key]))
	for _, t := range rl.windows[key] {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}
	if len(recent) >= limit {
		rl.windows[key] = recent
		return false
	}
	rl.windows[key] = append(recent, now)
	return true
}

// Stop terminates the background sweeper.
func (rl *MemoryRateLimiter) Stop() {
	close(rl.stop)
}

func (rl *MemoryRateLimiter) runSweeper() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			rl.sweep()
		case <-rl.stop:
			return
		}
	}
}

func (rl *MemoryRateLimiter) sweep() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	cutoff := time.Now().Add(-5 * time.Minute)
	for key, times := range rl.windows {
		recent := make([]time.Time, 0, len(times))
		for _, t := range times {
			if t.After(cutoff) {
				recent = append(recent, t)
			}
		}
		if len(recent) == 0 {
			delete(rl.windows, key)
		} else {
			rl.windows[key] = recent
		}
	}
}

// RedisRateLimiter is a Redis-backed fixed-window rate limiter using an
// atomic Lua script (INCR + PEXPIRE in one round-trip). Safe for horizontal
// scaling — all instances share counters keyed in Redis. Fails OPEN if Redis
// is unreachable.
//
// Window semantics: the counter expires Window after the FIRST hit, not on
// a sliding window. This means a burst at the end of one window plus the
// start of the next can deliver up to 2*Limit requests in a Window-long
// span. For most public-API rate limiting this is fine; for stricter
// guarantees use a sorted-set sliding-window implementation (left as a
// follow-up — needs benchmarking against the higher Redis cost).
type RedisRateLimiter struct {
	client *redis.Client
	prefix string
}

// rateLimitScript atomically increments a counter and, on first hit, sets a
// PEXPIRE matching the sliding-window duration. Returns the post-increment
// count. Doing this as a single EVAL eliminates the race where INCR succeeds
// but a follow-up EXPIRE fails or is skipped, leaving a non-expiring key
// that blocks the IP forever.
var rateLimitScript = redis.NewScript(`
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return current
`)

// NewRedisRateLimiter creates a Redis-backed rate limiter. The prefix is
// prepended to every key (e.g. "rl:public").
func NewRedisRateLimiter(client *redis.Client, prefix string) *RedisRateLimiter {
	return &RedisRateLimiter{client: client, prefix: prefix}
}

// Allow checks whether the key is within its limit. Atomic INCR + PEXPIRE via
// EVAL. Fails OPEN on Redis errors so a backend blip doesn't take down the
// site — callers that need fail-closed semantics for mutating endpoints must
// layer their own check on top.
func (r *RedisRateLimiter) Allow(key string, limit int, window time.Duration) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	rkey := fmt.Sprintf("%s:%s", r.prefix, key)
	count, err := rateLimitScript.Run(ctx, r.client, []string{rkey}, window.Milliseconds()).Int64()
	if err != nil {
		slog.Error("redis rate limiter: EVAL failed, allowing request (fail-open)",
			"key", rkey, "error", err)
		return true
	}
	return count <= int64(limit)
}

// RateLimitConfig configures the RateLimit middleware.
type RateLimitConfig struct {
	// Limiter is the backend (memory or Redis). Required.
	Limiter RateLimiter
	// Limit is the max requests per Window per key. Required.
	Limit int
	// Window is the sliding-window duration. Required.
	Window time.Duration
	// PathPrefixes restricts which request paths are subject to the limit.
	// If empty, all paths are limited. Match is by prefix; use "/api/v1/"
	// to limit every /api/v1/* path.
	PathPrefixes []string
	// SkipPathPrefixes is an exclusion list applied AFTER PathPrefixes.
	// Useful for carving out healthchecks: path matches a PathPrefix
	// but should still be allowed unconditionally.
	SkipPathPrefixes []string
	// KeyFunc derives the rate-limit key from the request. Default is the
	// client IP (X-Forwarded-For first hop, falling back to RemoteAddr).
	KeyFunc func(*http.Request) string
}

// RateLimit returns a middleware that rejects requests over the configured
// rate limit with HTTP 429 Too Many Requests + a Retry-After header.
//
// Default behavior:
//   - Key is the client IP (see ClientIP).
//   - Limit applies to all paths unless PathPrefixes is set.
//   - Healthcheck paths (/healthz, /readyz, /metrics) should be excluded
//     by callers via SkipPathPrefixes — load balancers poll them at
//     high frequency and must not be throttled.
//
// Operational note: this middleware should sit OUTSIDE the auth middleware
// so unauthenticated abuse traffic is rejected before any DB or session-
// service work happens.
func RateLimit(cfg RateLimitConfig) Middleware {
	if cfg.Limiter == nil {
		panic("httpx.RateLimit: Limiter is required")
	}
	if cfg.Limit <= 0 {
		panic("httpx.RateLimit: Limit must be > 0")
	}
	if cfg.Window <= 0 {
		panic("httpx.RateLimit: Window must be > 0")
	}
	keyFunc := cfg.KeyFunc
	if keyFunc == nil {
		keyFunc = ClientIP
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// PathPrefixes scopes the limiter. Empty = limit everything.
			if len(cfg.PathPrefixes) > 0 && !hasAnyPrefix(r.URL.Path, cfg.PathPrefixes) {
				next.ServeHTTP(w, r)
				return
			}
			// SkipPathPrefixes carves out exceptions (healthchecks, etc.).
			// Empty = nothing to skip.
			if len(cfg.SkipPathPrefixes) > 0 && hasAnyPrefix(r.URL.Path, cfg.SkipPathPrefixes) {
				next.ServeHTTP(w, r)
				return
			}
			key := keyFunc(r)
			if key == "" {
				// Couldn't derive a key — fail OPEN so a missing
				// X-Forwarded-For doesn't take down the site.
				next.ServeHTTP(w, r)
				return
			}
			if !cfg.Limiter.Allow(key, cfg.Limit, cfg.Window) {
				retryAfter := int(cfg.Window.Seconds())
				if retryAfter < 1 {
					retryAfter = 1
				}
				w.Header().Set("Retry-After", fmt.Sprintf("%d", retryAfter))
				WriteError(w, r, TooManyRequests("rate limit exceeded"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ClientIP returns the safe default: the IP from r.RemoteAddr only.
// X-Forwarded-For and X-Real-IP are ignored because they are caller-supplied
// and trivially spoofed when the gateway is reachable directly. For
// deployments behind a known reverse proxy that sanitizes XFF, build a
// trusting KeyFunc with TrustedProxyClientIP and pass it via
// RateLimitConfig.KeyFunc.
func ClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return strings.TrimSpace(r.RemoteAddr)
	}
	return strings.TrimSpace(host)
}

// TrustedProxyClientIP returns a KeyFunc that honors X-Forwarded-For ONLY
// when the immediate peer (r.RemoteAddr) is in one of the supplied
// trusted-proxy CIDR ranges. If the peer is not trusted, the peer IP itself
// is returned, so attackers connecting directly to the gateway cannot
// rotate apparent IPs by varying XFF. X-Real-IP is intentionally NOT
// honored — it duplicates XFF semantics with weaker convention and simply
// expands the spoofing surface.
//
// Returns an error if any cidr fails to parse — wire this at startup so a
// typo in the trusted-proxy env var is a fail-fast, not a silent bypass.
//
// XFF parsing: walks right-to-left and returns the rightmost IP that is NOT
// itself a trusted proxy. That is the closest UNTRUSTED address, which by
// XFF convention is the real originating client (each proxy in the path
// appends its peer's IP). If every hop is a trusted proxy, returns the
// leftmost (the head of the chain). Behind a single ingress like ALB or
// Cloudflare, pass that proxy's CIDR. Behind nested proxies, pass each
// hop's CIDR.
func TrustedProxyClientIP(cidrs []string) (func(*http.Request) string, error) {
	nets := make([]*net.IPNet, 0, len(cidrs))
	for _, c := range cidrs {
		c = strings.TrimSpace(c)
		if c == "" {
			continue
		}
		_, n, err := net.ParseCIDR(c)
		if err != nil {
			return nil, fmt.Errorf("invalid trusted-proxy CIDR %q: %w", c, err)
		}
		nets = append(nets, n)
	}
	if len(nets) == 0 {
		// Same as the safe default — the user explicitly opted in but
		// gave us no trust list, so trust nothing.
		return ClientIP, nil
	}
	return func(r *http.Request) string {
		peer := ClientIP(r)
		peerIP := net.ParseIP(peer)
		if peerIP == nil || !ipInAny(peerIP, nets) {
			// Peer isn't a trusted proxy. Ignore XFF entirely.
			return peer
		}
		// Peer is trusted. Walk XFF right-to-left and return the
		// rightmost IP that is NOT itself a trusted proxy. That is
		// the closest untrusted address — typically the real client.
		// X-Real-IP is intentionally ignored: it duplicates XFF
		// semantics with weaker convention and only widens the
		// header-spoof surface.
		xff := r.Header.Get("X-Forwarded-For")
		if xff == "" {
			return peer
		}
		hops := strings.Split(xff, ",")
		for i := len(hops) - 1; i >= 0; i-- {
			h := strings.TrimSpace(hops[i])
			if h == "" {
				continue
			}
			ip := net.ParseIP(h)
			if ip == nil {
				continue
			}
			if !ipInAny(ip, nets) {
				return h
			}
		}
		// Every hop is a trusted proxy — take the leftmost as the
		// original client (XFF convention).
		return strings.TrimSpace(hops[0])
	}, nil
}

func ipInAny(ip net.IP, nets []*net.IPNet) bool {
	for _, n := range nets {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

// hasAnyPrefix reports whether path is prefixed by any non-empty entry in
// prefixes. Returns false on an empty list — callers must decide what
// "no prefixes" means for their use case (limit everything vs. skip nothing).
func hasAnyPrefix(path string, prefixes []string) bool {
	for _, p := range prefixes {
		if p == "" {
			continue
		}
		if strings.HasPrefix(path, p) {
			return true
		}
	}
	return false
}
