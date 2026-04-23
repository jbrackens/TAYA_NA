package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	stdhttp "net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"

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
	allowedOrigins := map[string]struct{}{}
	for _, o := range strings.Split(corsOrigins, ",") {
		allowedOrigins[strings.TrimSpace(o)] = struct{}{}
	}
	corsMW := cors(allowedOrigins)

	// Build middleware chain — execution order is right-to-left:
	// Recovery -> Metrics -> AccessLog -> CSRF -> Auth -> RequestID -> handler
	authEnabled := strings.ToLower(strings.TrimSpace(os.Getenv("GATEWAY_AUTH_ENABLED"))) != "false"

	middlewares := []httpx.Middleware{
		httpx.RequestID(),
		httpx.NormalizeTrailingSlash("/api/", "/admin/", "/auth/"),
		tracing.Middleware(),
		httpx.SecurityHeaders(),
		corsMW,
		httpx.AccessLog(log.Default()),
		httpx.Metrics(metricsRegistry),
		httpx.Recovery(log.Default()),
		httpx.MaxBodySize(1 << 20), // 1 MB — applied first (outermost)
	}

	if authEnabled {
		middlewares = []httpx.Middleware{
			httpx.RequestID(),
			httpx.NormalizeTrailingSlash("/api/", "/admin/", "/auth/"),
			tracing.Middleware(),
			httpx.SecurityHeaders(),
			corsMW,
			httpx.Auth(authServiceURL, publicPrefixes),
			httpx.CSRF(csrfSkipPrefixes),
			httpx.AccessLog(log.Default()),
			httpx.Metrics(metricsRegistry),
			httpx.Recovery(log.Default()),
			httpx.MaxBodySize(1 << 20), // 1 MB — applied first (outermost)
		}
		slog.Info("auth middleware enabled", "auth_service", authServiceURL)
	} else {
		slog.Warn("auth middleware DISABLED — all routes are unprotected", "reason", "GATEWAY_AUTH_ENABLED=false")
	}
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

// cors returns a middleware that attaches CORS headers for allowed origins.
// The preflight OPTIONS request short-circuits with 204 before any route
// handler runs. Credentials are allowed so cookie-based auth works cross-origin
// — this REQUIRES an exact origin match (not "*") per the CORS spec, which is
// why the caller provides an allow-list instead of a wildcard.
func cors(allowed map[string]struct{}) httpx.Middleware {
	return func(next stdhttp.Handler) stdhttp.Handler {
		return stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" {
				if _, ok := allowed[origin]; ok {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Vary", "Origin")
					w.Header().Set("Access-Control-Allow-Credentials", "true")
					w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
					w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, X-User-ID")
					w.Header().Set("Access-Control-Max-Age", "86400")
				}
			}
			if r.Method == stdhttp.MethodOptions {
				w.WriteHeader(stdhttp.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
