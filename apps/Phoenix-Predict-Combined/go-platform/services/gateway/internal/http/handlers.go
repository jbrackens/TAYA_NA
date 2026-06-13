package http

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	stdhttp "net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/alphacashier"
	"phoenix-revival/gateway/internal/bonus"
	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/gateway/internal/content"
	"phoenix-revival/gateway/internal/discover"
	"phoenix-revival/gateway/internal/events"
	"phoenix-revival/gateway/internal/leaderboards"
	"phoenix-revival/gateway/internal/livemarkets"
	"phoenix-revival/gateway/internal/loyalty"
	"phoenix-revival/gateway/internal/notify"
	"phoenix-revival/gateway/internal/payments"
	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/gateway/internal/prediction/feed"
	"phoenix-revival/gateway/internal/prediction/workers"
	"phoenix-revival/gateway/internal/rbac"
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
	liveMarketService := livemarkets.NewServiceFromEnv()
	liveMarketService.Start(context.Background())
	registerLiveMarketRoutes(mux, liveMarketService)

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
	// Concrete handle kept alongside the interface var so the prediction-
	// native admin read routes (punters + audit logs) can call methods that
	// live only on *SQLRepository, without widening the shared Repository
	// interface (which a caching decorator + workers also implement).
	var predSQLRepo *prediction.SQLRepository
	var predictLoyaltyService *loyalty.PredictService
	var predictLBRepo *leaderboards.PredictSQLRepo
	var predictLBService *leaderboards.PredictService
	if walletDB := walletService.DB(); walletDB != nil {
		predSQLRepo = prediction.NewSQLRepository(walletDB)
		predRepo = predSQLRepo
		slog.Info("prediction: SQL repository initialized")
		predictLoyaltyService = loyalty.NewPredictService(loyalty.NewPredictSQLRepo(walletDB))
		slog.Info("loyalty: Predict-native service initialized")
		predictLBRepo = leaderboards.NewPredictSQLRepo(walletDB)
		predictLBService = leaderboards.NewPredictService(predictLBRepo, predictionCategoryLister(predRepo))
		slog.Info("leaderboards: Predict-native service initialized")
	} else {
		slog.Warn("prediction: no DB available, prediction service will not function")
	}
	predWallet := NewPredictionWalletAdapter(walletService)
	predictionService := prediction.NewService(predRepo, predWallet)
	predictionService.SetSettlementAuditor(settlementAuditRecorder{})
	// ADR-0003/0004: wire the propose -> finalize resolution store + dispute API
	// when a DB is available (the windowed path requires persistence). Hoisted
	// out of the if so the AutoSettler (below) can share the same store.
	var predResolutionStore prediction.ResolutionStore
	if predDB := walletService.DB(); predDB != nil {
		predResolutionStore = prediction.NewSQLResolutionStore(predDB)
		predictionService.SetResolutionStore(predResolutionStore)
		registerDisputeRoutes(mux, predictionService, predResolutionStore, wsHub)
		registerAdminDisputeRoutes(mux, predictionService, predResolutionStore)
	}
	// Prediction-domain counters: orders placed (by status + side + action +
	// type), trades produced, reconciler runs (clean/drift/error), drift
	// events per market, settlements (by result + override). Mounted at
	// /metrics/prediction so a single Prometheus scrape config can pull
	// both this and the platform-level /metrics. nil-safe — the service +
	// reconciler still function if SetMetrics is never called (e.g. in
	// tests).
	predictionMetrics := prediction.NewMetrics()
	predictionService.SetMetrics(predictionMetrics)
	mux.Handle("/metrics/prediction", predictionMetrics.Handler())
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
	// Post-commit market lifecycle → WebSocket. Covers both HTTP-triggered
	// admin actions (halt/close/void/settle from registerSettlementRoutes)
	// and background-worker auto-transitions (closer, settler, discover.
	// promote — they all flow through Service.TransitionMarketStatus and
	// SettlementEngine.{ResolveMarket,VoidMarket}). Fire-and-forget; a
	// dropped push is recoverable on the client by refetching market state.
	// Out-of-band notification channel (email today; SMS/push later). Reaches
	// users/ops even when not connected to the WebSocket. Defaults to a
	// structured-log transport until SMTP_HOST is configured, so resolution
	// events are recorded rather than dropped.
	resolutionNotifier := notify.NewFromEnv()
	resolutionRecipients := notify.ResolutionRecipients()
	slog.Info("notifications: resolution channel ready", "transport", resolutionNotifier.Name(), "recipients", len(resolutionRecipients))
	predictionService.SetMarketLifecycleHandler(func(market *prediction.Market, _ prediction.LifecycleEvent) {
		payload := buildMarketUpdatePayload(market)
		wsHub.NotifyPredictionMarketUpdate(market.ID, payload)
		// ADR-0004 #7: surface resolution-phase transitions (proposed-result,
		// under-review, finalized/settled, voided) on a typed channel for the
		// player UI and the office review queue. Status is authoritative;
		// richer proposal detail (challenge end time) is fetched on receipt.
		switch market.Status {
		case prediction.MarketStatusProposedResolution,
			prediction.MarketStatusDisputed,
			prediction.MarketStatusSettled,
			prediction.MarketStatusVoided:
			wsHub.NotifyResolutionUpdate(market.ID, string(market.Status), payload)
		}
		// Terminal resolutions (settled / voided) also fire an out-of-band
		// notification so users/ops are reached off-WebSocket. Fire-and-forget
		// in its own goroutine with a bounded timeout.
		if market.Status == prediction.MarketStatusSettled || market.Status == prediction.MarketStatusVoided {
			go func(m prediction.Market) {
				nctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
				defer cancel()
				subject, body := resolutionMessage(&m)
				if err := resolutionNotifier.Notify(nctx, resolutionRecipients, subject, body); err != nil {
					slog.Warn("notify: resolution notification failed", "market_id", m.ID, "error", err)
				}
			}(*market)
		}
	})
	registerPredictionRoutes(mux, predictionService)
	registerOrderRoutes(mux, predictionService, wsHub)
	registerPortfolioRoutes(mux, predictionService)
	registerSettlementRoutes(mux, predictionService)
	registerDashboardRoutes(mux, predictionService)
	registerDiscoverRoutes(mux, walletService.DB())
	// Prediction-native admin read APIs (office /users + /audit-logs). Only
	// registered when the SQL repo is live (DB present); the legacy
	// sportsbook registerAdminRoutes in admin_handlers.go stays unwired.
	if predSQLRepo != nil {
		registerPredictionAdminRoutes(mux, predSQLRepo, walletService)
		registerPredictionRiskRoutes(mux, predSQLRepo)
		slog.Info("prediction: admin read routes registered (punters, audit-logs, risk)")
	}

	// Back-office RBAC (Access Control) admin API — staff users, roles, and
	// granular permissions (migration 027). Independent of the prediction repo;
	// needs only the shared DB. Permission enforcement maps the session email to
	// an admin_users record, so it fails closed when no DB is wired.
	var rbacService *rbac.Service
	if rbacDB := walletService.DB(); rbacDB != nil {
		rbacService = rbac.NewService(rbac.NewSQLRepository(rbacDB))
		registerRBACAdminRoutes(mux, rbacService)
	}

	// --- Feed Adapters & Background Workers ---
	if predRepo != nil {
		feedRegistry := feed.NewRegistry()
		// Register both 'admin-manual' (canonical) and 'manual' (legacy
		// seed-data key) so auto-settler doesn't WARN every tick on
		// either set. Both route to the same CanSettle=false behavior.
		feedRegistry.Register(feed.NewManualAdapter("admin-manual"))
		feedRegistry.Register(feed.NewManualAdapter("manual"))
		feedRegistry.Register(feed.NewCryptoFeedAdapter())

		// Market closer: check every 30 seconds for markets past close_at
		closer := workers.NewMarketCloser(predRepo, 30*time.Second)
		go closer.Run(context.Background())

		// Auto-settler: check every 60 seconds for closed markets with automated sources
		settler := workers.NewAutoSettler(predRepo, feedRegistry, predWallet, 60*time.Second)
		settler.SetSettlementAuditor(settlementAuditRecorder{})
		// ADR-0003/0004: when a resolution store is wired, the settler proposes
		// resolutions and finalizes them after the challenge window instead of
		// settling immediately (no clawbacks; disputes can block finalize).
		if predResolutionStore != nil {
			settler.SetResolutionStore(predResolutionStore)
		}
		go settler.Run(context.Background())
		// ADR-0003: per-source resolution health for the office (don't let a
		// degraded single source stall silently).
		registerResolutionSourceRoutes(mux, settler)

		// Resting-order expirer: every 60s, finalize resting orders left on
		// markets that became inactive (closed/settled/voided) — no
		// transition path does this, so their RG committed stake + wallet
		// reservation would otherwise stay counted forever.
		expirer := workers.NewRestingOrderExpirer(predictionService, 60*time.Second)
		go expirer.Run(context.Background())

		// Reconciler: 15-minute two-phase collateral check across all open
		// order-book markets per the engine plan. Phase 1 reads without
		// taking the per-market advisory lock so healthy markets see zero
		// matching contention.
		reconciler := workers.NewReconciler(predRepo, 15*time.Minute)
		reconciler.SetMetrics(predictionMetrics)
		go reconciler.Run(context.Background())

		startHourlyMarketSyncWorker(walletService.DB(), predSQLRepo, predictionService)

		// Synthetic Market Maker (SMM) — provides resting two-sided
		// liquidity on order_book markets so users can actually trade
		// against a CLOB before external MMs sign. Disabled by default
		// (SMM_ENABLED=false). Operates as the seeded user-bot account.
		// See workers/smm.go for design + risk controls. Cancels any
		// leftover open orders from a prior run on startup, then
		// re-quotes on every tick. SetMetrics not yet implemented;
		// orders the bot places flow through the same RecordOrder path
		// as every other order so the existing dashboards capture them.
		smm := workers.NewSMMFromEnv(predictionService, predRepo)
		smm.SetMetrics(predictionMetrics)
		go smm.Run(context.Background())

		slog.Info("prediction: background workers started (closer, settler, reconciler, smm)")

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
		registerBotRoutes(mux, predictionService, predRepo, wsHub)
	}

	// --- Wallet Routes (kept from sportsbook — adapt for prediction stakes) ---
	registerWalletRoutes(mux, walletService)
	// Admin-gated wallet adjustments (requireAdminRole). The ungated public
	// credit/debit routes were removed per ADR-0002; this admin-only route is
	// the sole HTTP money-mutation surface.
	registerAdminWalletMutationRoutes(mux, "/api/v1/admin", walletService)

	alphaCashierConfig, err := alphacashier.LoadConfigFromEnv(os.Getenv)
	if err != nil {
		slog.Error("alpha cashier: invalid configuration", "error", err)
		alphaCashierConfig = alphacashier.Config{Enabled: false}
	}
	var alphaCashierRepo alphacashier.Repository
	if walletDB := walletService.DB(); walletDB != nil {
		alphaCashierRepo = alphacashier.NewSQLRepository(walletDB)
	} else {
		alphaCashierRepo = alphacashier.NewMemoryRepository()
	}
	alphaCashierService := alphacashier.NewService(alphaCashierConfig, alphaCashierRepo)
	alphaCashierService.SetWalletLedger(walletService)
	// Default address-screening seam (audit CMP-01). The manual-review screener
	// never auto-clears, so with ALPHA_CASHIER_SCREENING_ENFORCEMENT=true the
	// deposit/withdrawal addresses are blocked pending a real provider or human
	// review; with enforcement off it is observe-only (a sanctions hit still
	// blocks). A vendor screener is wired in place of the default here.
	alphaCashierService.SetScreener(alphacashier.DefaultScreener())
	if alphaCashierConfig.Enabled {
		if evmClient, err := alphacashier.NewJSONRPCEVMClient(context.Background(), alphaCashierConfig.RPCURL); err != nil {
			slog.Warn("alpha cashier: EVM RPC client unavailable; tx submission will fail closed", "error", err)
		} else {
			alphaCashierService.SetEVMClient(evmClient)
		}
	}
	alphacashier.RegisterRoutes(mux, alphaCashierService)
	registerAlphaCashierAdminRoutes(mux, alphaCashierService, rbacService)
	slog.Info("alpha cashier: routes registered", "enabled", alphaCashierConfig.Enabled, "chain", alphaCashierConfig.ChainName)

	// --- Account/User Routes ---
	registerUserRoutes(mux)

	// --- Compliance Routes ---
	geoComplianceService := compliance.NewMockGeoComplianceServiceFromEnv()
	// KYC + responsible-gambling are DB-backed (persistent across restarts) when
	// a database is wired; in-memory mock otherwise (tests / local dev without a
	// DB). DB-backed KYC routes identity decisions through a pluggable IDV
	// provider — default is back-office manual review (operable, never
	// auto-approves); a real vendor (Sumsub/Onfido/Persona) drops in via
	// KYC_IDV_PROVIDER + KYC_IDV_API_KEY without touching this wiring.
	var kycService compliance.KYCService
	var rgService compliance.ResponsibleGamblingService
	var pgKYC *compliance.PostgresKYCService
	if complianceDB := walletService.DB(); complianceDB != nil {
		if svc, err := compliance.NewPostgresKYCService(complianceDB, compliance.NewIDVProviderFromEnv()); err != nil {
			slog.Warn("compliance: Postgres KYC init failed, falling back to mock", "error", err)
			kycService = compliance.NewMockKYCService()
		} else {
			pgKYC = svc
			kycService = svc
			slog.Info("compliance: Postgres KYC service initialized", "idv_provider", svc.ProviderName())
		}
		if svc, err := compliance.NewPostgresResponsibleGamblingService(complianceDB); err != nil {
			slog.Warn("compliance: Postgres RG init failed, falling back to mock", "error", err)
			rgService = compliance.NewMockResponsibleGamblingService()
		} else {
			rgService = svc
			slog.Info("compliance: Postgres responsible-gambling service initialized")
		}
	} else {
		kycService = compliance.NewMockKYCService()
		rgService = compliance.NewMockResponsibleGamblingService()
	}
	profileKYCProvider = kycService // UAT D-8: profile reports real KYC status
	if pgKYC != nil {
		// Back-office KYC approve/reject (the operable half of manual review).
		registerKYCAdminRoutes(mux, pgKYC)
	}
	compliance.RegisterComplianceRoutes(mux, geoComplianceService, kycService, rgService)
	// Pre-trade jurisdiction + KYC gates (launch policy: crypto-native, outside
	// US). Both default OFF — wired here so a single env flag activates them
	// without a code change. See internal/http/pretrade_gate.go and
	// docs/compliance/geofencing-kyc.md (depth pending legal sign-off).
	tradeGeoGate = compliance.NewGeoGateFromEnv()
	tradeKYCGate = kycService
	// Money movement runs through the same gates: the geo gate covers the
	// deposit and withdraw surfaces in the alpha cashier and legacy payments
	// handlers (registration stays un-gated — account creation is fine,
	// money movement is not; see docs/compliance/geofencing-kyc.md).
	alphacashier.ComplianceGate = checkComplianceGates
	payments.ComplianceGate = checkComplianceGates
	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
	logPreTradeComplianceMode(env, tradeGeoGate)
	// The geo gate is intentionally default-off (depth pending legal), so a
	// missing GEO_GATE_ENABLED fails open. Make that loud in prod/staging so a
	// deploy that MEANT to enforce "outside-US only" but forgot the flag is a
	// visible misconfiguration, not a silent compliance gap.
	if (env == "production" || env == "staging") && !tradeGeoGate.Enabled() && !permissiveBetaComplianceMode() {
		slog.Warn("geo gate DISABLED — jurisdiction policy NOT enforced; set GEO_GATE_ENABLED=true once legal sign-off lands", "environment", env)
	}
	// Gate prediction order placement through the same RG service instance the
	// /api/v1/compliance/rg/* routes write to, so a user-set bet limit /
	// self-exclusion / cool-off actually blocks trades (UAT 2026-05-16 LC-17:
	// the prediction path previously had no compliance dependency at all).
	predictionService.SetComplianceChecker(rgService)

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
	payments.KYCGate = kycService // LC-22/D-8 KYC just-in-time withdrawal gate
	payments.RegisterPaymentRoutes(mux, paymentService)
	// Crypto (USDC) on-chain rail — launch policy is crypto-native. Wired behind
	// a clean adapter that fails CLOSED until CRYPTO_RPC_URL +
	// CRYPTO_ASSET_CONTRACT + CRYPTO_DEPOSIT_ADDRESS_SOURCE are configured
	// (no faked addresses). Exposes /api/v1/payments/crypto/{config,deposit-address};
	// on-chain deposit detection drives the existing payments webhook to credit
	// the wallet after N confirmations.
	if walletDB := walletService.DB(); walletDB != nil {
		if err := payments.EnsureCryptoSchema(walletDB); err != nil {
			slog.Warn("payments: crypto schema init failed", "error", err)
		}
		cryptoRail := payments.NewCryptoRailFromEnv(walletDB)
		payments.RegisterCryptoRoutes(mux, cryptoRail)
		slog.Info("payments: crypto rail registered", "network", cryptoRail.Network(), "asset", cryptoRail.Asset(), "configured", cryptoRail.Configured())
	}

	// --- Loyalty / Rewards ---
	// Prefer the Predict-native Postgres-backed service when a DB is wired.
	// Fall back to the legacy sportsbook in-memory service otherwise (tests +
	// local dev without a DB). The two can't coexist on the same paths.
	if predictLoyaltyService != nil {
		registerPredictLoyaltyRoutes(mux, predictLoyaltyService)
		// Office loyalty admin pages (/loyalty, /loyalty/[id], /loyalty/settings).
		// The sportsbook admin loyalty routes live in registerLoyaltyRoutes
		// (the else branch), so on a DB deployment they were 404 — this is the
		// Predict-native replacement.
		registerPredictLoyaltyAdminRoutes(mux, predictLoyaltyService)
		registerPredictPrivacyRoutes(mux, walletService.DB())
	} else {
		registerLoyaltyRoutes(mux, loyalty.NewServiceFromEnv())
	}

	// --- Leaderboards ---
	// Same swap pattern as loyalty: Predict-native handlers when a DB is
	// wired, sportsbook in-memory handlers otherwise.
	if predictLBService != nil {
		registerPredictLeaderboardRoutes(mux, predictLBService)
		// Office /leaderboards admin page. Predict-native admin list/entries
		// (the sportsbook admin leaderboard routes live in the else branch).
		registerPredictLeaderboardAdminRoutes(mux, predictLBService)
	} else {
		registerLeaderboardRoutes(mux, leaderboards.NewServiceFromEnv())
	}

	// --- Content / Banners CMS + Campaigns / Bonuses ---
	// Both are DB-backed, domain-agnostic services (content_pages/banners and
	// campaigns/player_bonuses tables, migrations 011 + 012) whose handlers
	// already cover the office /content + /campaigns admin pages — they just
	// were never wired into RegisterRoutes. Public delivery routes
	// (/api/v1/content/, /api/v1/banners) come along for the player app.
	// The bonus service's optional FreebetGranter is deliberately NOT set:
	// freebet/odds-boost issuance is a sportsbook concept (CLAUDE.md rule #2);
	// campaigns/bonuses CRUD works without it.
	if walletDB := walletService.DB(); walletDB != nil {
		registerContentRoutes(mux, content.NewService(walletDB))
		bonusSvc := bonus.NewService(bonus.NewRepository(walletDB), walletService, events.NewBus())
		registerBonusRoutes(mux, bonusSvc)
		slog.Info("content + bonus admin routes registered")
	}

	// --- Reports aggregates (office /reports page) ---
	// Wallet reconciliation is real; promo/feed/config are minimal/honest-zero
	// for the prediction domain (the page is sportsbook-shaped). Leaderboard
	// analytics on the same page use the admin leaderboard routes above.
	registerReportsRoutes(mux, walletService)

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

func startHourlyMarketSyncWorker(db *sql.DB, repo discover.PredictionRepo, svc discover.Service) {
	if db == nil || repo == nil || svc == nil {
		return
	}
	if strings.EqualFold(strings.TrimSpace(os.Getenv("MARKET_SYNC_ENABLED")), "false") {
		slog.Info("market sync worker disabled", "env", "MARKET_SYNC_ENABLED=false")
		return
	}

	interval := time.Hour
	if raw := strings.TrimSpace(os.Getenv("MARKET_SYNC_INTERVAL")); raw != "" {
		if parsed, err := time.ParseDuration(raw); err == nil && parsed > 0 {
			interval = parsed
		} else {
			slog.Warn("market sync: invalid MARKET_SYNC_INTERVAL, using default", "value", raw, "default", interval)
		}
	}

	limits := map[string]int{
		"polymarket": intEnv("MARKET_SYNC_POLYMARKET_LIMIT", 200),
		"kalshi":     intEnv("MARKET_SYNC_KALSHI_LIMIT", 200),
		"manifold":   intEnv("MARKET_SYNC_MANIFOLD_LIMIT", 100),
	}

	publicRoot := marketImagePublicRoot()
	var rehoster *discover.ImageRehoster
	if publicRoot != "" {
		rehoster = discover.NewImageRehoster(publicRoot)
	} else {
		slog.Warn("market sync: image rehosting disabled; set MARKET_IMAGE_PUBLIC_ROOT")
	}

	repoImport := discover.NewRepository(db)
	run := func(ctx context.Context) {
		t0 := time.Now()
		res, deduped, err := discover.Sync(ctx, repoImport, rehoster, limits)
		if err != nil {
			slog.Warn("market sync failed", "elapsed", time.Since(t0).Round(time.Millisecond), "error", err)
			return
		}
		promoteRes, err := discover.Promote(ctx, db, repo, svc, deduped)
		if err != nil {
			slog.Warn("market sync promote failed", "elapsed", time.Since(t0).Round(time.Millisecond), "error", err)
			return
		}
		slog.Info("market sync complete",
			"elapsed", time.Since(t0).Round(time.Millisecond),
			"fetched_polymarket", res.FetchedPolymarket,
			"fetched_kalshi", res.FetchedKalshi,
			"fetched_manifold", res.FetchedManifold,
			"after_dedupe", res.AfterDedupe,
			"created", promoteRes.Created,
			"resolved", promoteRes.Resolved+promoteRes.ResolvedExisting,
			"removed_expired", res.RemovedExpired,
			"removed_inactive", promoteRes.Removed,
			"skipped", promoteRes.Skipped,
			"failed", promoteRes.Failed,
		)
	}

	go func() {
		slog.Info("market sync worker started", "interval", interval, "limits", limits)
		run(context.Background())
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			run(context.Background())
		}
	}()
}

func intEnv(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	var out int
	if _, err := fmt.Sscanf(raw, "%d", &out); err != nil || out < 0 {
		slog.Warn("invalid integer env, using default", "key", key, "value", raw, "default", fallback)
		return fallback
	}
	return out
}

func marketImagePublicRoot() string {
	if root := strings.TrimSpace(os.Getenv("MARKET_IMAGE_PUBLIC_ROOT")); root != "" {
		return root
	}
	cwd, err := os.Getwd()
	if err != nil {
		return ""
	}
	candidates := []string{
		filepath.Join(cwd, "talon-backoffice", "packages", "app", "public"),
		filepath.Join(cwd, "..", "..", "..", "talon-backoffice", "packages", "app", "public"),
		filepath.Join(cwd, "..", "..", "talon-backoffice", "packages", "app", "public"),
	}
	for _, candidate := range candidates {
		abs, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}
		if info, err := os.Stat(abs); err == nil && info.IsDir() {
			return abs
		}
	}
	return ""
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

	// CORS and OPTIONS short-circuit are handled by httpx.CORS in the
	// outer middleware chain. Setting Access-Control-Allow-Origin here
	// would overwrite the allowlist check and let any origin read
	// auth-proxy responses with credentials — exactly the bypass this
	// retires. Same for the user_handlers.go callsites.
	authHandler := func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		if strings.HasPrefix(r.URL.Path, "/auth/") {
			r.URL.Path = "/api/v1" + r.URL.Path
		}
		proxy.ServeHTTP(w, r)
	}
	mux.HandleFunc("/api/v1/auth/", authHandler)
	mux.HandleFunc("/auth/", authHandler)
	slog.Info("auth proxy registered", "target", authURL)
}

// resolutionMessage renders the subject + body for a market-resolution
// notification (settled or voided).
func resolutionMessage(m *prediction.Market) (subject, body string) {
	if m.Status == prediction.MarketStatusVoided {
		return fmt.Sprintf("Market voided: %s", m.Ticker),
			fmt.Sprintf("Market %q (%s) was voided. Stakes are refunded at entry cost.", m.Title, m.Ticker)
	}
	result := "—"
	if m.Result != nil {
		result = strings.ToUpper(string(*m.Result))
	}
	return fmt.Sprintf("Market resolved %s: %s", result, m.Ticker),
		fmt.Sprintf("Market %q (%s) resolved %s. Winning positions pay 100¢/contract.", m.Title, m.Ticker, result)
}
