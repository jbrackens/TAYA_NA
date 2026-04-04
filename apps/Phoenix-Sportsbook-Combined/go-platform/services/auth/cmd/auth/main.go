package main

import (
	"context"
	"log"
	stdhttp "net/http"

	authhttp "phoenix-revival/auth/internal/http"
	"phoenix-revival/platform/runtime"
	"phoenix-revival/platform/transport/httpx"
)

func main() {
	cfg := runtime.LoadServiceConfig("auth", "18081")

	mux := stdhttp.NewServeMux()
	metricsRegistry := httpx.NewMetricsRegistry()
	mux.Handle("/metrics", httpx.MetricsHandler(metricsRegistry, cfg.Name))
	authService := authhttp.NewAuthService()
	authhttp.RegisterRoutes(mux, cfg.Name, authService)
	handler := httpx.Chain(
		mux,
		httpx.RequestID(),
		httpx.AccessLog(log.Default()),
		httpx.Metrics(metricsRegistry),
		httpx.Recovery(log.Default()),
	)

	log.Printf("starting %s service on :%s", cfg.Name, cfg.Port)
	if err := runtime.RunHTTPServer(context.Background(), cfg, handler); err != nil {
		log.Fatalf("%s service failed: %v", cfg.Name, err)
	}
}
