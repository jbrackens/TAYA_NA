package main

import (
	"context"
	"log"
	stdhttp "net/http"

	gatewayhttp "phoenix-revival/gateway/internal/http"
	"phoenix-revival/platform/runtime"
	"phoenix-revival/platform/transport/httpx"
)

func main() {
	cfg := runtime.LoadServiceConfig("gateway", "18080")

	mux := stdhttp.NewServeMux()
	metricsRegistry := httpx.NewMetricsRegistry()
	mux.Handle("/metrics", httpx.MetricsHandler(metricsRegistry, cfg.Name))
	gatewayhttp.RegisterRoutes(mux, cfg.Name)
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
