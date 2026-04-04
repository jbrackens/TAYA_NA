package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	commonkafka "github.com/phoenixbot/phoenix-common/pkg/kafka"
	"github.com/phoenixbot/phoenix-common/pkg/outbox"
	"go.uber.org/zap"

	"github.com/phoenixbot/phoenix-betting-engine/internal/client"
	"github.com/phoenixbot/phoenix-betting-engine/internal/config"
	"github.com/phoenixbot/phoenix-betting-engine/internal/handlers"
	"github.com/phoenixbot/phoenix-betting-engine/internal/middleware"
	"github.com/phoenixbot/phoenix-betting-engine/internal/repository"
	"github.com/phoenixbot/phoenix-betting-engine/internal/service"
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

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var outboxProducer *commonkafka.Producer
	if cfg.OutboxEnabled {
		zapLogger, err := newZapLogger(cfg.Environment)
		if err != nil {
			logger.Error("create zap logger", slog.Any("error", err))
			os.Exit(1)
		}
		defer zapLogger.Sync()

		outboxProducer, err = commonkafka.NewProducer(strings.Join(cfg.KafkaBrokers, ","), &commonkafka.ProducerConfig{Logger: zapLogger})
		if err != nil {
			logger.Error("create outbox producer", slog.Any("error", err))
			os.Exit(1)
		}
		defer outboxProducer.Close()

		pollInterval, err := time.ParseDuration(cfg.OutboxPoll)
		if err != nil {
			logger.Error("parse outbox poll interval", slog.Any("error", err))
			os.Exit(1)
		}
		worker := outbox.NewWorker(dbPool, outboxProducer, outbox.Config{
			Logger:       zapLogger.Named("outbox"),
			PollInterval: pollInterval,
			BatchSize:    cfg.OutboxBatch,
		})
		go worker.Start(ctx)
	}

	timeout := time.Duration(cfg.HTTPTimeoutSec) * time.Second
	marketClient := client.NewHTTPMarketClient(cfg.MarketEngineURL, timeout)
	walletClient := client.NewHTTPWalletClient(cfg.WalletURL, timeout)
	complianceClient := client.NewHTTPComplianceClient(cfg.ComplianceURL, timeout)
	repo := repository.NewBettingRepository(dbPool)
	bettingService := service.NewBettingService(
		logger,
		repo,
		marketClient,
		walletClient,
		service.WithComplianceClient(complianceClient),
		service.WithGeolocationEnforcementMode(cfg.GeolocationEnforcementMode),
	)
	h := handlers.NewHandlers(logger, bettingService)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.LoggingMiddleware(logger))
	r.Use(chimw.Recoverer)

	r.Get("/health", h.HealthCheck)
	r.Get("/ready", h.ReadinessCheck)

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.Post("/bets/precheck", h.PrecheckBets)
		r.Post("/bets/builder/quote", h.QuoteBetBuilder)
		r.Get("/bets/builder/quotes/{quoteID}", h.GetBetBuilderQuote)
		r.Post("/bets/builder/accept", h.AcceptBetBuilderQuote)
		r.Post("/bets/exotics/fixed/quote", h.QuoteFixedExotic)
		r.Get("/bets/exotics/fixed/quotes/{quoteID}", h.GetFixedExoticQuote)
		r.Post("/bets/exotics/fixed/accept", h.AcceptFixedExoticQuote)
		r.Post("/bets/status", h.GetPendingBetStatuses)
		r.Post("/bets", h.PlaceBet)
		r.Post("/parlays", h.PlaceParlay)
		r.Get("/bets/{betID}", h.GetBet)
		r.Get("/users/{userID}/bets", h.ListUserBets)
		r.Post("/bets/{betID}/cashout", h.CashoutBet)
		r.Get("/bets/{betID}/cashout-offer", h.GetCashoutOffer)
	})

	r.Route("/admin", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/bets", h.ListAdminBets)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/bets/{betID}", h.GetAdminBet)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Post("/bets/{betID}/cancel", h.CancelAdminBet)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Post("/bets/{betID}/lifecycle/{action}", h.ApplyAdminBetLifecycleAction)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/users/{userID}/bets", h.ListAdminUserBets)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/punters/{userID}/bets", h.ListAdminUserBets)
	})

	r.With(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience)).
		Post("/punters/bets/status", h.GetPendingBetStatuses)

	server := &http.Server{Addr: fmt.Sprintf(":%d", cfg.Port), Handler: r, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		logger.Info("starting phoenix-betting-engine", slog.Int("port", cfg.Port))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("listen", slog.Any("error", err))
			os.Exit(1)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown", slog.Any("error", err))
		os.Exit(1)
	}
}

func newZapLogger(environment string) (*zap.Logger, error) {
	if environment == "development" {
		return zap.NewDevelopment()
	}
	return zap.NewProduction()
}
