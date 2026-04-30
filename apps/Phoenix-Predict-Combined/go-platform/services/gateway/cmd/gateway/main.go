package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	stdhttp "net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"phoenix-revival/gateway/internal/cache"
	gatewayhttp "phoenix-revival/gateway/internal/http"
	"phoenix-revival/gateway/internal/tracing"
	"phoenix-revival/platform/logging"
	"phoenix-revival/platform/runtime"
	"phoenix-revival/platform/transport/httpx"

	_ "github.com/lib/pq" // Register PostgreSQL driver for database/sql
)

func main() {
	// Subcommand dispatch runs before any server bootstrap. Keep this list
	// small — the gateway is primarily a server; subcommands are narrow
	// admin tools that happen to ship in the same binary so they inherit
	// the same build + deps. See PLAN-loyalty-leaderboards.md §8.
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "migrate-legacy-loyalty":
			os.Exit(runMigrateLegacyLoyalty(os.Args[2:]))
		}
	}

	cfg := runtime.LoadServiceConfig("gateway", "18080")

	// Initialize structured logging (JSON in production, text in dev)
	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
	if err := validateGatewayRuntimeConfig(os.Getenv); err != nil {
		log.Fatalf("gateway configuration error: %v", err)
	}
	logging.Init(cfg.Name, env)

	// Initialize OpenTelemetry tracing (configured via OTEL_* env vars)
	tracingCtx := context.Background()
	shutdownTracing, err := tracing.Init(tracingCtx, cfg.Name, "1.0.0")
	if err != nil {
		slog.Warn("tracing initialization failed", "error", err)
	}
	defer func() {
		if err := shutdownTracing(tracingCtx); err != nil {
			slog.Warn("tracing shutdown error", "error", err)
		}
	}()

	mux := stdhttp.NewServeMux()
	metricsRegistry := httpx.NewMetricsRegistry()
	mux.Handle("/metrics", httpx.MetricsHandler(metricsRegistry, cfg.Name))
	gatewayhttp.RegisterRoutes(mux, cfg.Name)

	// Auth service URL for token validation
	authServiceURL := os.Getenv("AUTH_SERVICE_URL")
	if authServiceURL == "" {
		authServiceURL = "http://localhost:18081"
	}

	// Public paths that do not require authentication.
	// The payments webhook is intentionally public so providers can reach it,
	// but the handler performs its own HMAC verification before processing.
	publicPrefixes := gatewayPublicPrefixes()

	// CSRF-exempt prefixes (auth endpoints and provider-to-provider webhooks
	// handle their own verification).
	csrfSkipPrefixes := gatewayCSRFSkipPrefixes()

	// CORS origins. Comma-separated list; credentials require exact origin match
	// (no "*"). Defaults cover the local dev ports for the player app and the
	// backoffice. For production set GATEWAY_CORS_ORIGINS to real domains.
	corsOrigins := os.Getenv("GATEWAY_CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "http://localhost:3000,http://localhost:3001"
	}
	corsMW := httpx.CORS(strings.Split(corsOrigins, ","))

	// Rate limiting. Keyed by r.RemoteAddr by default (X-Forwarded-For is
	// honored only when GATEWAY_TRUSTED_PROXY_CIDRS lists the proxy that
	// terminated the TLS connection — see buildRateLimitMiddleware). Sits
	// OUTSIDE auth so unauthenticated abuse traffic is dropped before any
	// DB or session-service work happens. Scope is limited to public read
	// paths in v1 (see rateLimitedReadPrefixes); authenticated mutations
	// are bounded by the auth-service login limiter and per-user wallet
	// idempotency keys instead.
	//
	//   GATEWAY_RATELIMIT_ENABLED=false        → middleware not installed
	//   GATEWAY_RATELIMIT_RPM=120              → per-key requests per minute
	//   GATEWAY_TRUSTED_PROXY_CIDRS=10.0.0.0/8 → comma-list of proxy CIDRs
	//
	// Backend: Redis (fixed-window counter via atomic INCR+PEXPIRE Lua) when
	// REDIS_URL is reachable so all replicas share counters; in-memory
	// sliding-window fallback otherwise (single-instance deployments + dev).
	rateLimitMW, rateLimitInstalled := buildRateLimitMiddleware()

	authEnabled := strings.ToLower(strings.TrimSpace(os.Getenv("GATEWAY_AUTH_ENABLED"))) != "false"

	// httpx.Chain wraps so slice[0] is OUTERMOST (runs first on the way in),
	// slice[len-1] is INNERMOST (closest to handler). Rate limit must come
	// BEFORE Auth in the slice so abusive traffic is dropped before we hit
	// the auth service. Drop the rate-limit entry entirely when
	// GATEWAY_RATELIMIT_ENABLED=false.
	//
	// NOTE: AccessLog/Metrics/Recovery sit at the end of this slice (matching
	// the pre-existing convention) which means they run AFTER Auth/CSRF and
	// AFTER RateLimit on the way in. That is a pre-existing ordering quirk
	// — fixing it is out of scope for this PR. The practical implication is
	// that 429 responses do not appear in AccessLog or the request-count
	// metric. They are still observable via the gateway error logger and
	// the client-side Retry-After header.
	middlewares := []httpx.Middleware{
		httpx.RequestID(),
		httpx.NormalizeTrailingSlash("/api/", "/admin/", "/auth/"),
		tracing.Middleware(),
		httpx.SecurityHeaders(),
		corsMW,
	}
	if rateLimitInstalled {
		middlewares = append(middlewares, rateLimitMW)
	}
	if authEnabled {
		middlewares = append(middlewares,
			httpx.Auth(authServiceURL, publicPrefixes),
			httpx.CSRF(csrfSkipPrefixes),
		)
		slog.Info("auth middleware enabled", "auth_service", authServiceURL)
	} else {
		slog.Warn("auth middleware DISABLED — all routes are unprotected", "reason", "GATEWAY_AUTH_ENABLED=false")
	}
	middlewares = append(middlewares,
		httpx.AccessLog(log.Default()),
		httpx.Metrics(metricsRegistry),
		httpx.Recovery(log.Default()),
		httpx.MaxBodySize(1<<20), // 1 MB body cap (innermost)
	)
	slog.Info("CORS configured", "origins", corsOrigins)

	handler := httpx.Chain(mux, middlewares...)

	// Graceful shutdown on SIGINT/SIGTERM
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	slog.Info("starting service", "service", cfg.Name, "port", cfg.Port)
	if err := runtime.RunHTTPServer(ctx, cfg, handler); err != nil {
		log.Fatalf("%s service failed: %v", cfg.Name, err)
	}
	slog.Info("service stopped gracefully", "service", cfg.Name)
}

func gatewayPublicPrefixes() []string {
	return []string{
		"/healthz",
		"/readyz",
		"/metrics",
		"/api/v1/status",
		"/api/v1/auth/",
		"/auth/",
		"/ws",              // WebSocket has its own auth
		"/api/v1/content/", // CMS content delivery (public)
		"/api/v1/banners",  // CMS banner delivery (public)

		// Prediction platform — public read-only endpoints
		"/api/v1/discover", // demo product feed (imported_markets); pre-launch behind app auth, but no session needed for the read
		"/api/v1/discovery",
		"/api/v1/categories",
		"/api/v1/events",
		"/api/v1/markets",
		"/api/v1/payments/webhook",

		// Leaderboards — board list + per-board entries are public; the
		// per-user /api/v1/me/leaderboards endpoint sits outside this prefix
		// and still requires a session.
		"/api/v1/leaderboards",

		// Bot API uses its own API-key auth middleware, not the session auth
		"/api/v1/bot/",
	}
}

func gatewayCSRFSkipPrefixes() []string {
	return []string{
		"/api/v1/auth/",
		"/auth/",
		"/healthz",
		"/readyz",
		"/metrics",
		"/api/v1/status",
		"/api/v1/payments/webhook",
	}
}

// rateLimitedReadPrefixes are the public, unauthenticated read paths that
// are the prime abuse target — anyone on the internet can hit them, no
// session needed. We rate-limit ONLY these in v1 so a Redis blip
// (which fails open) cannot accidentally let through unbounded traffic on
// money-moving endpoints. Mutating + authenticated endpoints are bounded
// by the auth-service login limiter and per-user wallet idempotency
// rather than this IP-keyed gate; revisit when we need per-user write
// throttling (separate fail-closed policy).
//
// Keep this in sync with `gatewayPublicPrefixes` for the read-only entries.
func rateLimitedReadPrefixes() []string {
	return []string{
		"/api/v1/discovery",
		"/api/v1/discover",
		"/api/v1/categories",
		"/api/v1/events",
		"/api/v1/markets",
		"/api/v1/leaderboards",
		"/api/v1/content",
		"/api/v1/banners",
	}
}

// buildRateLimitMiddleware wires the rate-limit middleware. Returns the
// installed flag = false when GATEWAY_RATELIMIT_ENABLED=false. Falls back
// from Redis to in-memory when REDIS_URL is unset or unreachable.
func buildRateLimitMiddleware() (httpx.Middleware, bool) {
	if strings.ToLower(strings.TrimSpace(os.Getenv("GATEWAY_RATELIMIT_ENABLED"))) == "false" {
		slog.Warn("rate limiting DISABLED", "reason", "GATEWAY_RATELIMIT_ENABLED=false")
		return nil, false
	}

	rpm := 120
	if v := strings.TrimSpace(os.Getenv("GATEWAY_RATELIMIT_RPM")); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			rpm = parsed
		} else {
			slog.Warn("invalid GATEWAY_RATELIMIT_RPM, using default", "value", v, "default", rpm)
		}
	}

	var limiter httpx.RateLimiter
	backend := "memory"
	if redisClient, err := cache.NewRedisClientFromEnv(); err == nil {
		limiter = httpx.NewRedisRateLimiter(redisClient.Client(), "rl:gateway")
		backend = "redis"
	} else {
		slog.Warn("rate limiter falling back to in-memory (Redis unreachable)",
			"error", err,
			"impact", "counters not shared across replicas")
		limiter = httpx.NewMemoryRateLimiter()
	}

	// Trusted-proxy CIDRs let us safely honor X-Forwarded-For. If unset,
	// the limiter keys on r.RemoteAddr only — correct for direct-to-gateway
	// dev, and safe (but coarse) when deployed behind a proxy without
	// configuration: every request looks like it came from the proxy IP,
	// so the proxy itself gets rate-limited instead of individual clients.
	// Set GATEWAY_TRUSTED_PROXY_CIDRS to enable per-client keying.
	keyFunc := httpx.ClientIP
	if cidrs := strings.TrimSpace(os.Getenv("GATEWAY_TRUSTED_PROXY_CIDRS")); cidrs != "" {
		fn, err := httpx.TrustedProxyClientIP(strings.Split(cidrs, ","))
		if err != nil {
			// Fail-fast on misconfiguration — a bad CIDR string at startup
			// is far better than silently keying all requests on the proxy.
			log.Fatalf("invalid GATEWAY_TRUSTED_PROXY_CIDRS: %v", err)
		}
		keyFunc = fn
		slog.Info("rate limiter trusts X-Forwarded-For from configured proxies", "cidrs", cidrs)
	}

	cfg := httpx.RateLimitConfig{
		Limiter:      limiter,
		Limit:        rpm,
		Window:       time.Minute,
		PathPrefixes: rateLimitedReadPrefixes(),
		KeyFunc:      keyFunc,
	}
	slog.Info("rate limiting enabled",
		"backend", backend,
		"rpm", rpm,
		"scope", "public reads only",
		"prefixes", cfg.PathPrefixes,
	)
	return httpx.RateLimit(cfg), true
}

func validateGatewayRuntimeConfig(getenv func(string) string) error {
	env := strings.ToLower(strings.TrimSpace(getenv("ENVIRONMENT")))
	if env != "production" {
		return nil
	}
	if strings.TrimSpace(getenv("PAYMENTS_WEBHOOK_SECRET")) == "" {
		return fmt.Errorf("PAYMENTS_WEBHOOK_SECRET must be set in production")
	}
	return nil
}

// CORS configuration moved to platform/transport/httpx as httpx.CORS — see
// that package for the implementation and security notes (it ships with a
// strict allowlist contract that route handlers must not bypass).
