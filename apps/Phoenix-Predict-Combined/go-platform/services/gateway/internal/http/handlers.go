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

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/gateway/internal/leaderboards"
	"phoenix-revival/gateway/internal/loyalty"
	"phoenix-revival/gateway/internal/payments"
	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/gateway/internal/prediction/feed"
	"phoenix-revival/gateway/internal/prediction/workers"
	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/gateway/internal/ws"
	"phoenix-revival/platform/transport/httpx"
)

func RegisterRoutes(mux *stdhttp.ServeMux, service string) {
	walletService := wallet.NewServiceFromEnv()

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

	// Initialize WebSocket hub
	wsHub := ws.NewHub()
	go wsHub.Run(context.Background())
	registerWebSocketRoutes(mux, wsHub)

	// --- Health & Status (keep from sportsbook) ---

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

	// --- Prediction Platform Routes ---
	var predRepo prediction.Repository
	var predictLoyaltyService *loyalty.PredictService
	var predictLBRepo *leaderboards.PredictSQLRepo
	var predictLBService *leaderboards.PredictService
	if walletDB := walletService.DB(); walletDB != nil {
		predRepo = prediction.NewSQLRepository(walletDB)
		slog.Info("prediction: SQL repository initialized")
		predictLoyaltyService = loyalty.NewPredictService(loyalty.NewPredictSQLRepo(walletDB))
		slog.Info("loyalty: Predict-native service initialized")
		predictLBRepo = leaderboards.NewPredictSQLRepo(walletDB)
		predictLBService = leaderboards.NewPredictService(predictLBRepo, predictionCategoryLister(predRepo))
		slog.Info("leaderboards: Predict-native service initialized")
	} else {
		slog.Warn("prediction: no DB available, prediction service will not function")
	}
	predWallet := newPredictionWalletAdapter(walletService)
	predictionService := prediction.NewService(predRepo, predWallet)
	if predictLoyaltyService != nil {
		predictionService.SetLoyaltyAdapter(newPredictionLoyaltyAdapter(predictLoyaltyService))
		// Post-commit tier-up → WebSocket. Fire-and-forget per plan §8;
		// the TierPill poll is the fallback if the push is lost.
		predictionService.SetTierPromotedHandler(func(userID string, fromTier, toTier int) {
			wsHub.NotifyLoyaltyTierPromoted(userID, map[string]any{
				"userId":   userID,
				"fromTier": fromTier,
				"toTier":   toTier,
			})
		})
	}
	registerPredictionRoutes(mux, predictionService)
	registerOrderRoutes(mux, predictionService)
	registerPortfolioRoutes(mux, predictionService)
	registerSettlementRoutes(mux, predictionService)

	// --- Feed Adapters & Background Workers ---
	if predRepo != nil {
		feedRegistry := feed.NewRegistry()
		feedRegistry.Register(&feed.ManualAdapter{})
		feedRegistry.Register(feed.NewCryptoFeedAdapter())

		// Market closer: check every 30 seconds for markets past close_at
		closer := workers.NewMarketCloser(predRepo, 30*time.Second)
		go closer.Run(context.Background())

		// Auto-settler: check every 60 seconds for closed markets with automated sources
		settler := workers.NewAutoSettler(predRepo, feedRegistry, predWallet, 60*time.Second)
		go settler.Run(context.Background())

		slog.Info("prediction: background workers started (closer, settler)")

		// Leaderboards recomputer: 5-minute tick per PLAN §8. First tick runs
		// immediately so the boards populate at startup.
		if predictLBRepo != nil {
			recomputer := leaderboards.NewPredictRecomputer(
				predictLBRepo,
				predictionCategoryLister(predRepo),
				5*time.Minute,
			)
			go recomputer.Run(context.Background())
			slog.Info("leaderboards: recomputer started")
		}

		// --- Bot API Routes ---
		registerBotRoutes(mux, predictionService, predRepo)
	}

	// --- Wallet Routes (kept from sportsbook — adapt for prediction stakes) ---
	registerWalletRoutes(mux, walletService)

	// --- Account/User Routes ---
	registerUserRoutes(mux)

	// --- Compliance Routes ---
	geoComplianceService := compliance.NewMockGeoComplianceServiceFromEnv()
	kycService := compliance.NewMockKYCService()
	rgService := compliance.NewMockResponsibleGamblingService()
	compliance.RegisterComplianceRoutes(mux, geoComplianceService, kycService, rgService)

	// --- Payments Routes ---
	var paymentService payments.PaymentService
	if walletDB := walletService.DB(); walletDB != nil {
		dbPaymentService, err := payments.NewDBPaymentService(walletDB, walletService)
		if err != nil {
			slog.Warn("payments: failed to initialize DB payment service, falling back to mock", "error", err)
			paymentService = payments.NewMockPaymentService(walletService)
		} else {
			paymentService = dbPaymentService
		}
	} else {
		paymentService = payments.NewMockPaymentService(walletService)
	}
	payments.DepositComplianceChecker = rgService
	payments.RegisterPaymentRoutes(mux, paymentService)

	// --- Loyalty / Rewards ---
	// Prefer the Predict-native Postgres-backed service when a DB is wired.
	// Fall back to the legacy sportsbook in-memory service otherwise (tests +
	// local dev without a DB). The two can't coexist on the same paths.
	if predictLoyaltyService != nil {
		registerPredictLoyaltyRoutes(mux, predictLoyaltyService)
		registerPredictPrivacyRoutes(mux, walletService.DB())
	} else {
		registerLoyaltyRoutes(mux, loyalty.NewServiceFromEnv())
	}

	// --- Leaderboards ---
	// Same swap pattern as loyalty: Predict-native handlers when a DB is
	// wired, sportsbook in-memory handlers otherwise.
	if predictLBService != nil {
		registerPredictLeaderboardRoutes(mux, predictLBService)
	} else {
		registerLeaderboardRoutes(mux, leaderboards.NewServiceFromEnv())
	}

	// --- Auth Proxy (kept from sportsbook) ---
	registerAuthProxy(mux)

	slog.Info("Taya NA Predict gateway initialized",
		"service", service,
		"routes", "prediction, orders, portfolio, settlement, wallet, users, compliance, payments, loyalty, leaderboards, auth",
	)
}

func registerWebSocketRoutes(mux *stdhttp.ServeMux, hub *ws.Hub) {
	mux.HandleFunc("/ws", ws.NewHandler(hub))
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
		if strings.HasPrefix(r.URL.Path, "/auth/") {
			r.URL.Path = "/api/v1" + r.URL.Path
		}
		proxy.ServeHTTP(w, r)
	}
	mux.HandleFunc("/api/v1/auth/", authHandler)
	mux.HandleFunc("/auth/", authHandler)
	slog.Info("auth proxy registered", "target", authURL)
}
