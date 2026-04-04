package http

import (
	"context"
	"log"
	stdhttp "net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"phoenix-revival/gateway/internal/bets"
	"phoenix-revival/gateway/internal/cache"
	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/freebets"
	"phoenix-revival/gateway/internal/matchtracker"
	"phoenix-revival/gateway/internal/oddsboosts"
	"phoenix-revival/gateway/internal/payments"
	"phoenix-revival/gateway/internal/provider"
	"phoenix-revival/gateway/internal/riskintel"
	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/gateway/internal/ws"
	"phoenix-revival/platform/transport/httpx"
)

func RegisterRoutes(mux *stdhttp.ServeMux, service string) {
	repository := createReadRepository()
	walletService := wallet.NewServiceFromEnv()
	betService := bets.NewServiceFromEnv(repository, walletService)
	riskService := riskintel.NewService(repository, betService)
	freebetService := freebets.NewService()
	oddsBoostService := oddsboosts.NewService()
	betService.SetPromotionServices(freebetService, oddsBoostService)
	matchTrackerService := matchtracker.NewService()
	providerRuntime, err := provider.BootstrapRuntimeFromEnv(
		context.Background(),
		newProviderEventSink(betService, matchTrackerService),
	)
	if err != nil {
		log.Printf("warning: failed to bootstrap provider runtime: %v", err)
	}
	registerFeedMetricsRoute(mux, service, providerRuntime, betService)

	// Initialize WebSocket hub
	wsHub := ws.NewHub()
	go wsHub.Run(context.Background())
	registerWebSocketRoutes(mux, wsHub)

	mux.Handle("/healthz", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		w.WriteHeader(stdhttp.StatusOK)
		_, _ = w.Write([]byte("ok"))
		return nil
	}))

	mux.Handle("/readyz", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{
			"service": service,
			"status":  "ready",
		})
	}))

	mux.Handle("/api/v1/status", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{
			"service": service,
			"status":  "up",
		})
	}))

	registerMarketRoutes(mux, repository)
	registerSportRoutes(mux, repository)
	registerMatchTrackerRoutes(mux, repository, matchTrackerService)
	registerStatsCenterRoutes(mux, repository)
	registerFreebetRoutes(mux, freebetService)
	registerOddsBoostRoutes(mux, oddsBoostService)
	registerPersonalizationRoutes(mux, riskService)
	registerAdminRiskRoutes(mux, "/admin/risk", riskService)
	registerAdminRiskRoutes(mux, "/api/v1/admin/risk", riskService)
	registerAdminRoutes(mux, repository, walletService, betService, providerRuntime)
	registerWalletRoutes(mux, walletService)
	registerBetRoutes(mux, betService)
	registerAdminBetRoutes(mux, betService)

	// Register payment and compliance services
	paymentService := payments.NewMockPaymentService(walletService)
	payments.RegisterPaymentRoutes(mux, paymentService)

	// Reverse proxy auth routes to the auth service
	registerAuthProxy(mux)

	geoService := compliance.NewMockGeoComplianceService()
	kycService := compliance.NewMockKYCService()
	rgService := compliance.NewMockResponsibleGamblingService()
	compliance.RegisterComplianceRoutes(mux, geoService, kycService, rgService)
}

func registerWebSocketRoutes(mux *stdhttp.ServeMux, hub *ws.Hub) {
	mux.HandleFunc("/ws", ws.NewHandler(hub))
}

func createReadRepository() domain.ReadRepository {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("GATEWAY_READ_REPO_MODE")))
	var repository domain.ReadRepository

	if mode == "db" || mode == "sql" || mode == "postgres" {
		driver := strings.TrimSpace(os.Getenv("GATEWAY_DB_DRIVER"))
		if driver == "" {
			driver = "postgres"
		}
		dsn := strings.TrimSpace(os.Getenv("GATEWAY_DB_DSN"))
		if dsn == "" {
			log.Printf("warning: GATEWAY_READ_REPO_MODE=%s requested, but GATEWAY_DB_DSN is empty; falling back to non-db repository", mode)
		} else {
			r, err := domain.OpenSQLReadRepository(driver, dsn)
			if err != nil {
				log.Printf("warning: failed to initialize SQL read repository driver=%s: %v; falling back to non-db repository", driver, err)
			} else {
				log.Printf("gateway read repository initialized in db mode using driver=%s", driver)
				repository = r
			}
		}
	}

	if repository == nil {
		if snapshotPath := os.Getenv("GATEWAY_READ_MODEL_FILE"); snapshotPath != "" {
			r, err := domain.NewFileReadRepository(snapshotPath)
			if err != nil {
				log.Printf("warning: failed to load GATEWAY_READ_MODEL_FILE=%s: %v; falling back to in-memory seed data", snapshotPath, err)
			} else {
				log.Printf("gateway read repository initialized from snapshot file: %s", snapshotPath)
				repository = r
			}
		}
	}

	if repository == nil {
		repository = domain.NewInMemoryReadRepository()
	}

	// Wrap with Redis caching if REDIS_URL is set
	if redisURL := strings.TrimSpace(os.Getenv("REDIS_URL")); redisURL != "" || os.Getenv("ENABLE_CACHE") != "" {
		redisClient, err := cache.NewRedisClientFromEnv()
		if err != nil {
			log.Printf("warning: failed to initialize Redis cache: %v; using uncached repository", err)
		} else {
			cachedRepo := cache.NewCachedReadRepository(repository, redisClient)
			log.Printf("gateway read repository wrapped with Redis cache")
			repository = cachedRepo
		}
	}

	return repository
}

func registerAuthProxy(mux *stdhttp.ServeMux) {
	authURL := os.Getenv("AUTH_SERVICE_URL")
	if authURL == "" {
		authURL = "http://localhost:18081"
	}
	target, err := url.Parse(authURL)
	if err != nil {
		log.Printf("warning: invalid AUTH_SERVICE_URL %q: %v; auth proxy disabled", authURL, err)
		return
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.ErrorHandler = func(w stdhttp.ResponseWriter, r *stdhttp.Request, err error) {
		log.Printf("auth proxy error: %v", err)
		stdhttp.Error(w, `{"error":{"code":"service_unavailable","message":"auth service unreachable"}}`, stdhttp.StatusBadGateway)
	}

	authHandler := func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == stdhttp.MethodOptions {
			w.WriteHeader(stdhttp.StatusNoContent)
			return
		}
		// Rewrite /auth/* → /api/v1/auth/* so the auth service receives the right path
		if strings.HasPrefix(r.URL.Path, "/auth/") {
			r.URL.Path = "/api/v1" + r.URL.Path
		}
		proxy.ServeHTTP(w, r)
	}
	mux.HandleFunc("/api/v1/auth/", authHandler)
	mux.HandleFunc("/auth/", authHandler)
	log.Printf("auth proxy registered: /auth/* and /api/v1/auth/* → %s", authURL)
}
