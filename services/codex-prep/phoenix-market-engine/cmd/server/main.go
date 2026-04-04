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
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/phoenixbot/phoenix-market-engine/internal/config"
	"github.com/phoenixbot/phoenix-market-engine/internal/handlers"
	"github.com/phoenixbot/phoenix-market-engine/internal/middleware"
	"github.com/phoenixbot/phoenix-market-engine/internal/pkg/kafka"
	"github.com/phoenixbot/phoenix-market-engine/internal/repository"
	"github.com/phoenixbot/phoenix-market-engine/internal/service"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config", slog.Any("error", err))
		os.Exit(1)
	}

	dbPool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		logger.Error("create database pool", slog.Any("error", err))
		os.Exit(1)
	}
	defer dbPool.Close()
	if err := dbPool.Ping(context.Background()); err != nil {
		logger.Error("ping database", slog.Any("error", err))
		os.Exit(1)
	}

	producer, err := kafka.NewProducer(cfg.KafkaBrokers)
	if err != nil {
		logger.Error("create kafka producer", slog.Any("error", err))
		os.Exit(1)
	}
	defer producer.Close()

	repo := repository.NewMarketRepository(dbPool)
	marketService := service.NewMarketService(logger, repo, producer, cfg.DefaultMinBet, cfg.DefaultMaxBet)
	h := handlers.NewHandlers(logger, marketService)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.LoggingMiddleware(logger))
	r.Use(chimw.Recoverer)

	r.Get("/health", h.HealthCheck)
	r.Get("/ready", h.ReadinessCheck)
	r.Get("/api/v1/markets", h.ListMarkets)
	r.Get("/api/v1/markets/{marketID}", h.GetMarket)

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))

		r.With(middleware.RequireRoles("operator", "admin")).Post("/markets", h.CreateMarket)
		r.With(middleware.RequireRoles("operator", "trader", "admin", "data-provider", "data_provider")).Post("/providers/mockdata/markets/sync", h.SyncMockDataMarkets)
		r.With(middleware.RequireRoles("operator", "trader", "admin", "data-provider", "data_provider")).Post("/providers/oddin/markets/sync", h.SyncOddinMarkets)
		r.With(middleware.RequireRoles("operator", "trader", "admin", "data-provider", "data_provider")).Post("/providers/betgenius/markets/sync", h.SyncBetgeniusMarkets)
		r.With(middleware.RequireRoles("operator", "admin")).Put("/markets/{marketID}/status", h.UpdateStatus)
		r.With(middleware.RequireRoles("operator", "admin")).Post("/markets/{marketID}/settle", h.SettleMarket)
		r.With(middleware.RequireRoles("operator", "admin")).Get("/markets/{marketID}/liquidity", h.GetLiquidity)
		r.With(middleware.RequireRoles("odds-manager", "operator", "admin")).Put("/markets/{marketID}/odds", h.UpdateOdds)
	})

	r.Route("/admin", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.With(middleware.RequireRoles("operator", "trader", "admin")).Get("/markets", h.ListMarkets)
		r.With(middleware.RequireRoles("operator", "trader", "admin")).Get("/markets/{marketID}", h.GetMarket)
		r.With(middleware.RequireRoles("operator", "trader", "admin", "data-provider", "data_provider")).Post("/providers/mockdata/markets/sync", h.SyncMockDataMarkets)
		r.With(middleware.RequireRoles("operator", "trader", "admin", "data-provider", "data_provider")).Post("/providers/oddin/markets/sync", h.SyncOddinMarkets)
		r.With(middleware.RequireRoles("operator", "trader", "admin", "data-provider", "data_provider")).Post("/providers/betgenius/markets/sync", h.SyncBetgeniusMarkets)
		r.With(middleware.RequireRoles("operator", "admin")).Post("/markets", h.CreateMarket)
		r.With(middleware.RequireRoles("operator", "admin")).Put("/markets/{marketID}/status", h.UpdateStatus)
		r.With(middleware.RequireRoles("odds-manager", "operator", "admin")).Put("/markets/{marketID}/odds", h.UpdateOdds)
		r.With(middleware.RequireRoles("operator", "admin")).Post("/markets/{marketID}/settle", h.SettleMarket)
	})

	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info("starting phoenix-market-engine", slog.Int("port", cfg.Port))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("listen", slog.Any("error", err))
			os.Exit(1)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("shutdown", slog.Any("error", err))
		os.Exit(1)
	}
}
