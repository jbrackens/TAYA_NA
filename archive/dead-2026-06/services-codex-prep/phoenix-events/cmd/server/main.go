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

	"github.com/phoenixbot/phoenix-events/internal/config"
	"github.com/phoenixbot/phoenix-events/internal/handlers"
	"github.com/phoenixbot/phoenix-events/internal/middleware"
	"github.com/phoenixbot/phoenix-events/internal/repository"
	"github.com/phoenixbot/phoenix-events/internal/service"
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
	r.Get("/api/v1/events", h.ListEvents)
	r.Get("/api/v1/events/{eventID}", h.GetEvent)
	r.Get("/api/v1/sports", h.ListSports)
	r.Get("/api/v1/match-tracker/fixtures/{fixtureID}", h.GetMatchTracker)
	r.Get("/api/v1/stats/fixtures/{fixtureID}", h.GetFixtureStats)
	r.Get("/api/v1/leagues/{sport}", h.ListLeagues)

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRoles("data-provider", "data_provider", "admin"))
			r.Post("/events", h.CreateEvent)
			r.Post("/providers/events/upsert", h.UpsertProviderEvent)
			r.Post("/providers/mockdata/events/sync", h.SyncMockDataEvents)
			r.Post("/providers/oddin/events/sync", h.SyncOddinEvents)
			r.Post("/providers/betgenius/events/sync", h.SyncBetgeniusEvents)
			r.Put("/events/{eventID}/live-score", h.UpdateLiveScore)
			r.Put("/events/{eventID}/result", h.UpdateResult)
		})
	})

	r.Route("/admin", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.With(middleware.RequireRoles("operator", "admin", "data-provider", "data_provider")).Get("/tournaments", h.ListTournaments)
		r.With(middleware.RequireRoles("operator", "admin", "data-provider", "data_provider")).Get("/fixtures", h.ListEvents)
		r.With(middleware.RequireRoles("operator", "admin", "data-provider", "data_provider")).Get("/fixtures/{eventID}", h.GetEvent)
		r.With(middleware.RequireRoles("operator", "admin", "data-provider", "data_provider")).Put("/fixtures/{fixtureID}/status", h.UpdateFixtureStatus)
	})

	server := &http.Server{Addr: fmt.Sprintf(":%d", cfg.Port), Handler: r, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		logger.Info("starting phoenix-events", slog.Int("port", cfg.Port))
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
