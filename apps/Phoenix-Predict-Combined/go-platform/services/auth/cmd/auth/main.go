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

	_ "github.com/lib/pq" // Register PostgreSQL driver so AUTH_STORE_MODE=db works

	authhttp "phoenix-revival/auth/internal/http"
	"phoenix-revival/platform/logging"
	"phoenix-revival/platform/runtime"
	"phoenix-revival/platform/transport/httpx"
)

func main() {
	cfg := runtime.LoadServiceConfig("auth", "18081")

	// Initialize structured logging
	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
	logging.Init(cfg.Name, env)

	mux := stdhttp.NewServeMux()
	metricsRegistry := httpx.NewMetricsRegistry()
	mux.Handle("/metrics", httpx.MetricsHandler(metricsRegistry, cfg.Name))
	authService := authhttp.NewAuthService()
	authhttp.RegisterRoutes(mux, cfg.Name, authService)
	handler := httpx.Chain(
		mux,
		httpx.RequestID(),
		httpx.NormalizeTrailingSlash("/api/", "/auth/"),
		httpx.AccessLog(log.Default()),
		httpx.Metrics(metricsRegistry),
		httpx.Recovery(log.Default()),
	)

	// Graceful shutdown on SIGINT/SIGTERM
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	slog.Info("starting service", "service", cfg.Name, "port", cfg.Port)
	if err := runtime.RunHTTPServer(ctx, cfg, handler); err != nil {
		log.Fatalf("%s service failed: %v", cfg.Name, err)
	}
	slog.Info("service stopped gracefully", "service", cfg.Name)
}
