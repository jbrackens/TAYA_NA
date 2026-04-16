package http

import (
	"context"
	"log/slog"
	stdhttp "net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/bets"
	"phoenix-revival/gateway/internal/bonus"
	"phoenix-revival/gateway/internal/cache"
	"phoenix-revival/gateway/internal/content"
	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/events"
	"phoenix-revival/gateway/internal/freebets"
	"phoenix-revival/gateway/internal/leaderboards"
	"phoenix-revival/gateway/internal/loyalty"
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
	leaderboardService := leaderboards.NewServiceFromEnv()
	loyaltyService := loyalty.NewServiceFromEnv()
	betService.SetPromotionServices(freebetService, oddsBoostService)
	betService.SetLoyaltyService(loyaltyService)
	loyaltyService.SetLeaderboardService(leaderboardService)
	betService.SetLeaderboardService(leaderboardService)
	matchTrackerService := matchtracker.NewService()
	providerRuntime, err := provider.BootstrapRuntimeFromEnv(
		context.Background(),
		newProviderEventSink(betService, matchTrackerService),
	)
	if err != nil {
		slog.Warn("failed to bootstrap provider runtime", "error", err)
	}
	walletServiceForMetrics = walletService

	// Background job: expire stale wallet reservations every 60 seconds
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			expired, err := walletService.ExpireStaleReservations()
			if err != nil {
				slog.Warn("reservation expiry failed", "error", err)
			} else if expired > 0 {
				slog.Info("wallet: expired stale reservations", "count", expired)
			}
		}
	}()

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

		checks := map[string]string{}
		allReady := true

		// Check auth service reachability
		authURL := os.Getenv("AUTH_SERVICE_URL")
		if authURL == "" {
			authURL = "http://localhost:18081"
		}
		authCtx, authCancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer authCancel()
		authReq, _ := stdhttp.NewRequestWithContext(authCtx, stdhttp.MethodGet, authURL+"/healthz", nil)
		if authReq != nil {
			resp, err := stdhttp.DefaultClient.Do(authReq)
			if err != nil || resp.StatusCode != stdhttp.StatusOK {
				checks["auth"] = "unavailable"
				allReady = false
			} else {
				checks["auth"] = "ok"
				resp.Body.Close()
			}
		}

		// Check wallet DB connectivity (if DB mode)
		if walletDB := walletService.DB(); walletDB != nil {
			dbCtx, dbCancel := context.WithTimeout(r.Context(), 2*time.Second)
			defer dbCancel()
			if err := walletDB.PingContext(dbCtx); err != nil {
				checks["db"] = "unavailable"
				allReady = false
			} else {
				checks["db"] = "ok"
			}
		} else {
			checks["db"] = "memory_mode"
		}

		checks["service"] = service
		if allReady {
			checks["status"] = "ready"
			return httpx.WriteJSON(w, stdhttp.StatusOK, checks)
		}
		checks["status"] = "degraded"
		w.WriteHeader(stdhttp.StatusServiceUnavailable)
		return httpx.WriteJSON(w, stdhttp.StatusServiceUnavailable, checks)
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
	registerLoyaltyRoutes(mux, loyaltyService)
	registerLeaderboardRoutes(mux, leaderboardService)

	// Initialize bonus service if wallet DB is available
	eventBus := events.NewBus()
	if walletDB := walletService.DB(); walletDB != nil {
		bonusRepo := bonus.NewRepository(walletDB)
		bonusService := bonus.NewService(bonusRepo, walletService, eventBus)
		registerBonusRoutes(mux, bonusService)

		// Background job: expire active bonuses every 60 seconds
		go func() {
			ticker := time.NewTicker(60 * time.Second)
			defer ticker.Stop()
			for range ticker.C {
				expired, err := bonusService.ExpireActiveBonuses(context.Background())
				if err != nil {
					slog.Warn("bonus expiry scan failed", "error", err)
				} else if expired > 0 {
					slog.Info("bonus: expired active bonuses", "count", expired)
				}
			}
		}()

		// Background job: close expired campaigns every 5 minutes
		go func() {
			ticker := time.NewTicker(5 * time.Minute)
			defer ticker.Stop()
			for range ticker.C {
				closed, err := bonusService.CloseExpiredCampaigns(context.Background())
				if err != nil {
					slog.Warn("campaign auto-close failed", "error", err)
				} else if closed > 0 {
					slog.Info("bonus: auto-closed expired campaigns", "count", closed)
				}
			}
		}()

		// Bridge event bus → WebSocket hub for bonus lifecycle events
		eventBus.Subscribe("bonus.granted", func(ctx context.Context, event events.Event) error {
			wsHub.BroadcastEvent("bonus", event.Type, "update", map[string]any{
				"type": event.Type, "bonus_id": 0, "user_id": event.UserID,
			})
			return nil
		})
		eventBus.Subscribe("bonus.completed", func(ctx context.Context, event events.Event) error {
			wsHub.BroadcastEvent("bonus", event.Type, "update", map[string]any{
				"type": event.Type, "user_id": event.UserID,
			})
			return nil
		})
		eventBus.Subscribe("bonus.expired", func(ctx context.Context, event events.Event) error {
			wsHub.BroadcastEvent("bonus", event.Type, "update", map[string]any{
				"type": event.Type, "user_id": event.UserID,
			})
			return nil
		})
		eventBus.Subscribe("bonus.forfeited", func(ctx context.Context, event events.Event) error {
			wsHub.BroadcastEvent("bonus", event.Type, "update", map[string]any{
				"type": event.Type, "user_id": event.UserID,
			})
			return nil
		})

		slog.Info("bonus service initialized in DB mode")

		// Initialize content service (shares same DB)
		contentService := content.NewService(walletDB)
		registerContentRoutes(mux, contentService)
		slog.Info("content service initialized in DB mode")
	} else {
		slog.Info("bonus and content services skipped (no DB available)")
	}

	// File-backed persistence: auto-save state every 5 seconds
	loyaltyService.StartAutoSave(5 * time.Second)
	leaderboardService.StartAutoSave(5 * time.Second)
	registerPersonalizationRoutes(mux, riskService)
	registerAdminRiskRoutes(mux, "/admin/risk", riskService)
	registerAdminRiskRoutes(mux, "/api/v1/admin/risk", riskService)
	registerAdminRoutes(mux, repository, walletService, betService, providerRuntime)
	registerWalletRoutes(mux, walletService)
	registerBetRoutes(mux, betService)
	registerAdminBetRoutes(mux, betService)
	registerUserRoutes(mux)

	// Register payment service — use DB-backed when wallet DB is available
	var paymentService payments.PaymentService
	if walletDB := walletService.DB(); walletDB != nil {
		dbPayment, err := payments.NewDBPaymentService(walletDB, walletService)
		if err != nil {
			slog.Warn("failed to initialize DB payment service; falling back to mock", "error", err)
			paymentService = payments.NewMockPaymentService(walletService)
		} else {
			paymentService = dbPayment
			slog.Info("payments: DB-backed payment service initialized")
		}
	} else {
		paymentService = payments.NewMockPaymentService(walletService)
		slog.Info("payments: using mock payment service (no DB available)")
	}
	payments.RegisterPaymentRoutes(mux, paymentService)

	// Reverse proxy auth routes to the auth service
	registerAuthProxy(mux)

	// Geo and KYC: fail-closed in production (reject all), mock in development
	var geoService compliance.GeoComplianceService
	var kycService compliance.KYCService
	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
	if env == "production" || env == "staging" {
		geoService = compliance.NewFailClosedGeoComplianceService()
		kycService = compliance.NewFailClosedKYCService()
	} else {
		geoService = compliance.NewMockGeoComplianceServiceFromEnv()
		kycService = compliance.NewMockKYCService()
	}

	// Use PostgreSQL-backed Responsible Gaming service when wallet DB is available
	var rgService compliance.ResponsibleGamblingService
	if walletDB := walletService.DB(); walletDB != nil {
		pgRG, err := compliance.NewPostgresResponsibleGamblingService(walletDB)
		if err != nil {
			slog.Warn("failed to initialize PostgreSQL RG service; falling back to mock", "error", err)
			rgService = compliance.NewMockResponsibleGamblingService()
		} else {
			rgService = pgRG
			betService.SetComplianceService(pgRG)
			slog.Info("compliance: responsible gaming service initialized in DB mode")
		}
	} else {
		rgService = compliance.NewMockResponsibleGamblingService()
		slog.Info("compliance: using mock responsible gaming service (no DB available)")
	}
	// Wire RG service into deposit compliance checking
	payments.DepositComplianceChecker = rgService
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
			slog.Warn("GATEWAY_READ_REPO_MODE requested but GATEWAY_DB_DSN is empty; falling back to non-db repository", "mode", mode)
		} else {
			r, err := domain.OpenSQLReadRepository(driver, dsn)
			if err != nil {
				slog.Warn("failed to initialize SQL read repository; falling back to non-db repository", "driver", driver, "error", err)
			} else {
				slog.Info("gateway read repository initialized in db mode", "driver", driver)
				repository = r
			}
		}
	}

	if repository == nil {
		if snapshotPath := os.Getenv("GATEWAY_READ_MODEL_FILE"); snapshotPath != "" {
			r, err := domain.NewFileReadRepository(snapshotPath)
			if err != nil {
				slog.Warn("failed to load GATEWAY_READ_MODEL_FILE; falling back to in-memory seed data", "path", snapshotPath, "error", err)
			} else {
				slog.Info("gateway read repository initialized from snapshot file", "path", snapshotPath)
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
			slog.Warn("failed to initialize Redis cache; using uncached repository", "error", err)
		} else {
			cachedRepo := cache.NewCachedReadRepository(repository, redisClient)
			slog.Info("gateway read repository wrapped with Redis cache")
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
		slog.Warn("invalid AUTH_SERVICE_URL; auth proxy disabled", "url", authURL, "error", err)
		return
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.ErrorHandler = func(w stdhttp.ResponseWriter, r *stdhttp.Request, err error) {
		slog.Error("auth proxy error", "error", err)
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
	slog.Info("auth proxy registered", "target", authURL)
}
