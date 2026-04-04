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
	gozap "go.uber.org/zap"

	"github.com/phoenixbot/phoenix-analytics/internal/config"
	"github.com/phoenixbot/phoenix-analytics/internal/handlers"
	"github.com/phoenixbot/phoenix-analytics/internal/middleware"
	"github.com/phoenixbot/phoenix-analytics/internal/repository"
	"github.com/phoenixbot/phoenix-analytics/internal/service"
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
		worker := outbox.NewWorker(dbPool, outboxProducer, outbox.Config{Logger: zapLogger.Named("outbox"), PollInterval: pollInterval, BatchSize: cfg.OutboxBatch})
		go worker.Start(ctx)
	}

	repo := repository.NewRepository(dbPool)
	svc := service.NewService(logger, repo)
	h := handlers.NewHandlers(logger, svc)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.LoggingMiddleware(logger))
	r.Use(chimw.Recoverer)

	r.Get("/health", h.HealthCheck)
	r.Get("/ready", h.ReadinessCheck)

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.Post("/events", h.TrackEvent)
		r.Get("/reports/user/{userID}", h.GetUserReport)
		r.Get("/dashboards/platform", h.GetPlatformDashboard)
		r.Get("/reports/markets", h.GetMarketReport)
		r.Get("/cohorts", h.GetCohorts)
	})

	r.Route("/admin", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.Get("/users/{userID}/transactions/export", h.ExportUserTransactions)
		r.Get("/punters/{userID}/transactions/export", h.ExportUserTransactions)
		r.Post("/punters/exclusions/export", h.ExportExcludedPunters)
		r.Post("/reports/daily", h.GenerateDailyReports)
		r.Get("/reports/daily/repeat", h.RepeatDailyReports)
		r.Get("/promotions/usage", h.GetPromoUsageSummary)
		r.Get("/wallet/corrections/tasks", h.GetWalletCorrectionTasks)
		r.Get("/risk/player-scores", h.GetRiskPlayerScore)
		r.Get("/risk/segments", h.GetRiskSegments)
		r.Get("/feed-health", h.GetProviderFeedHealth)
		r.Get("/provider/acknowledgements", h.ListProviderStreamAcknowledgements)
		r.Post("/provider/acknowledgements", h.UpsertProviderStreamAcknowledgement)
		r.Get("/provider/acknowledgement-sla", h.GetProviderAcknowledgementSLASettings)
		r.Post("/provider/acknowledgement-sla", h.UpsertProviderAcknowledgementSLASetting)
	})

	server := &http.Server{Addr: fmt.Sprintf(":%d", cfg.Port), Handler: r, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		logger.Info("starting phoenix-analytics", slog.Int("port", cfg.Port))
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

func newZapLogger(environment string) (*gozap.Logger, error) {
	if environment == "development" {
		return gozap.NewDevelopment()
	}
	return gozap.NewProduction()
}
