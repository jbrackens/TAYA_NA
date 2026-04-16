package main

import (
	"context"
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
	cfg := runtime.LoadServiceConfig("gateway", "18080")

	// Initialize structured logging (JSON in production, text in dev)
	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
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

	// Public paths that do not require authentication
	publicPrefixes := []string{
		"/healthz",
		"/readyz",
		"/metrics",
		"/api/v1/status",
		"/api/v1/auth/",
		"/auth/",
		"/ws",              // WebSocket has its own auth
		"/api/v1/content/", // CMS content delivery (public)
		"/api/v1/banners",  // CMS banner delivery (public)
	}

	// CSRF-exempt prefixes (auth endpoints handle their own CSRF)
	csrfSkipPrefixes := []string{
		"/api/v1/auth/",
		"/auth/",
		"/healthz",
		"/readyz",
		"/metrics",
		"/api/v1/status",
	}

	// Build middleware chain — execution order is right-to-left:
	// Recovery -> Metrics -> AccessLog -> CSRF -> Auth -> RequestID -> handler
	authEnabled := strings.ToLower(strings.TrimSpace(os.Getenv("GATEWAY_AUTH_ENABLED"))) != "false"

	middlewares := []httpx.Middleware{
		httpx.RequestID(),
		tracing.Middleware(),
		httpx.SecurityHeaders(),
		httpx.AccessLog(log.Default()),
		httpx.Metrics(metricsRegistry),
		httpx.Recovery(log.Default()),
		httpx.MaxBodySize(1 << 20), // 1 MB — applied first (outermost)
	}

	if authEnabled {
		middlewares = []httpx.Middleware{
			httpx.RequestID(),
			tracing.Middleware(),
			httpx.SecurityHeaders(),
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
