package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/redis/go-redis/v9"

	"github.com/phoenixbot/phoenix-gateway/internal/config"
	"github.com/phoenixbot/phoenix-gateway/internal/handlers"
	"github.com/phoenixbot/phoenix-gateway/internal/middleware"
	"github.com/phoenixbot/phoenix-gateway/internal/repository"
	"github.com/phoenixbot/phoenix-gateway/internal/service"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	logger := newLogger(cfg.Server.Environment)
	slog.SetDefault(logger)

	redisClient := redis.NewClient(&redis.Options{
		Addr:         cfg.Redis.Addr,
		Password:     cfg.Redis.Password,
		DB:           cfg.Redis.DB,
		ReadTimeout:  cfg.Redis.ReadTimeout,
		WriteTimeout: cfg.Redis.WriteTimeout,
	})
	defer redisClient.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	if err := redisClient.Ping(ctx).Err(); err != nil {
		cancel()
		logger.Error("failed to connect to redis", slog.Any("error", err))
		os.Exit(1)
	}
	cancel()

	routeRepo := repository.NewStaticRouteRepository()
	rateLimitRepo := repository.NewRedisRateLimitRepository(redisClient)
	gatewayService := service.NewGatewayService(logger, cfg, routeRepo, rateLimitRepo)
	h := handlers.NewHandlers(logger, redisClient, gatewayService)

	r := chi.NewRouter()
	r.Use(chiMiddleware.RealIP)
	r.Use(middleware.RequestContext())
	r.Use(middleware.CORS(cfg.Server.HTTPAllowedOrigins))
	r.Use(middleware.LoggingMiddleware(logger, gatewayService))
	r.Use(middleware.Recoverer(logger))

	r.Get("/", h.RootLanding)
	r.Head("/", h.RootLanding)
	r.Get("/health", h.HealthCheck)
	r.Head("/health", h.HealthCheck)
	r.Get("/ready", h.ReadinessCheck)
	r.Head("/ready", h.ReadinessCheck)
	r.Get("/live", h.LivenessCheck)
	r.Head("/live", h.LivenessCheck)
	r.Get("/api/v1/ws/web-socket", h.SportsbookWebSocket)
	r.Post("/api/v1/users", h.ProxyAuthRequest)
	r.Post("/api/v1/auth/verify-email", h.ProxyAuthRequest)
	r.Get("/api/v1/markets", h.ProxyAuthRequest)
	r.Get("/api/v1/markets/{marketID}", h.ProxyAuthRequest)
	r.Get("/api/v1/events", h.ProxyAuthRequest)
	r.Get("/api/v1/events/{eventID}", h.ProxyAuthRequest)
	r.Get("/api/v1/sports", h.ProxyAuthRequest)
	r.Get("/api/v1/leagues/{sport}", h.ProxyAuthRequest)
	r.Get("/api/v1/prediction/overview", h.ProxyAuthRequest)
	r.Get("/api/v1/prediction/categories", h.ProxyAuthRequest)
	r.Get("/api/v1/prediction/markets", h.ProxyAuthRequest)
	r.Get("/api/v1/prediction/markets/{marketID}", h.ProxyAuthRequest)
	r.Post("/api/v1/prediction/ticket/preview", h.ProxyAuthRequest)
	r.Get("/terms", h.ProxyAuthRequest)
	r.Get("/api/v1/terms/current", h.ProxyAuthRequest)
	r.Get("/api/v1/users/{userID}/profile", h.ProxyAuthRequest)
	r.Get("/api/v1/users/{userID}/followers", h.ProxyAuthRequest)
	r.Get("/api/v1/pages", h.ProxyAuthRequest)
	r.Get("/api/v1/pages/{pageID}", h.ProxyAuthRequest)
	r.Get("/api/v1/promotions", h.ProxyAuthRequest)
	r.Get("/api/v1/banners", h.ProxyAuthRequest)
	r.Get("/api/v1/stream/achievements/{userID}", h.ProxyAuthRequest)
	r.Get("/api/v1/stream/leaderboard", h.ProxyAuthRequest)
	r.Post("/providers/idcomply/verification-sessions/{sessionID}/status", h.ProxyAuthRequest)
	r.Post("/providers/idcomply/verification-sessions/by-case/{providerCaseID}/status", h.ProxyAuthRequest)
	r.Post("/providers/idcomply/verification-sessions/status", h.ProxyAuthRequest)
	r.Post("/pxp/payment-state-changed/handlePaymentStateChangedNotification", h.ProxyAuthRequest)
	r.Post("/pxp/verify-cash-deposit", h.ProxyAuthRequest)

	r.With(middleware.FixedRateLimit(logger, gatewayService, "auth-login")).Post("/auth/login", h.ProxyAuthRequest)

	r.Group(func(r chi.Router) {
		r.Use(middleware.JWTAuth(logger, cfg.Auth.JWTSecretKey, cfg.Auth.JWTIssuer, cfg.Auth.JWTAudience))
		r.With(middleware.FixedRateLimit(logger, gatewayService, "auth-refresh")).Post("/auth/refresh", h.ProxyAuthRequest)
		r.With(middleware.FixedRateLimit(logger, gatewayService, "auth-logout")).Post("/auth/logout", h.ProxyAuthRequest)

		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRoles("admin"))
			r.With(middleware.FixedRateLimit(logger, gatewayService, "admin")).Get("/api/v1/routes", h.GetRoutes)
			r.With(middleware.FixedRateLimit(logger, gatewayService, "admin")).Get("/api/v1/rate-limits", h.GetRateLimits)
			r.With(middleware.FixedRateLimit(logger, gatewayService, "admin")).Get("/api/v1/metrics", h.GetMetrics)
			r.With(middleware.FixedRateLimit(logger, gatewayService, "admin")).Get("/api/v1/config", h.GetConfig)
		})

		r.HandleFunc("/*", h.ProxyRequest)
	})

	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info("phoenix-gateway starting", slog.String("addr", server.Addr))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server stopped unexpectedly", slog.Any("error", err))
			os.Exit(1)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", slog.Any("error", err))
		os.Exit(1)
	}
	logger.Info("phoenix-gateway stopped")
}

func newLogger(environment string) *slog.Logger {
	level := slog.LevelInfo
	if environment == "development" {
		level = slog.LevelDebug
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level}))
}
