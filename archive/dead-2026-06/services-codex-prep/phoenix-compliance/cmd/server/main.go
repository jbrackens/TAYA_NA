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

	"github.com/phoenixbot/phoenix-compliance/internal/config"
	"github.com/phoenixbot/phoenix-compliance/internal/handlers"
	"github.com/phoenixbot/phoenix-compliance/internal/middleware"
	"github.com/phoenixbot/phoenix-compliance/internal/repository"
	"github.com/phoenixbot/phoenix-compliance/internal/service"
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
	svc := service.NewService(logger, repo, service.GeoComplyConfig{
		LicenseKey:               cfg.GeoComplyLicenseKey,
		ResultMode:               cfg.GeoComplyResultMode,
		AnotherGeolocationInSecs: cfg.GeoComplyAnotherGeolocationInSecs,
		RejectCode:               cfg.GeoComplyRejectCode,
		RejectMessage:            cfg.GeoComplyRejectMessage,
	})
	h := handlers.NewHandlers(logger, svc)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.LoggingMiddleware(logger))
	r.Use(chimw.Recoverer)

	r.Get("/health", h.HealthCheck)
	r.Get("/ready", h.ReadinessCheck)
	r.Get("/geo-comply/license-key", h.GetGeoComplyLicense)
	r.Post("/geo-comply/geo-packet", h.EvaluateGeoPacket)
	r.Get("/api/v1/geo-comply/license-key", h.GetGeoComplyLicense)
	r.Post("/api/v1/geo-comply/geo-packet", h.EvaluateGeoPacket)

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.Post("/users/{userID}/limits", h.SetLimit)
		r.Get("/users/{userID}/limits", h.GetLimits)
		r.Get("/users/{userID}/limits/history", h.GetLimitHistory)
		r.Post("/users/{userID}/self-exclude", h.CreateSelfExclusion)
		r.Get("/users/{userID}/cool-offs/history", h.GetCoolOffHistory)
		r.Get("/users/{userID}/restrictions", h.GetRestrictions)
		r.Post("/aml-check", h.CreateAMLCheck)
		r.Get("/aml-check/{checkID}", h.GetAMLCheck)
		r.Post("/compliance-alerts", h.CreateAlert)
	})

	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.Post("/punters/deposit-limits", h.SetLegacyDepositLimit)
		r.Post("/punters/stake-limits", h.SetLegacyStakeLimit)
		r.Post("/punters/session-limits", h.SetLegacySessionLimit)
		r.Get("/punters/limits-history", h.GetLegacyLimitHistory)
		r.Post("/punters/cool-off", h.CreateLegacyCoolOff)
		r.Post("/punters/self-exclude", h.CreateLegacySelfExclude)
		r.Get("/punters/cool-offs-history", h.GetLegacyCoolOffHistory)
		r.Put("/responsibility-check/accept", h.AcceptLegacyResponsibilityCheck)
	})

	r.Route("/admin", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Put("/users/{userID}/limits/deposit", h.SetAdminDepositLimit)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Put("/punters/{userID}/limits/deposit", h.SetAdminDepositLimit)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Put("/users/{userID}/limits/stake", h.SetAdminStakeLimit)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Put("/punters/{userID}/limits/stake", h.SetAdminStakeLimit)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Put("/users/{userID}/limits/session", h.SetAdminSessionLimit)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Put("/punters/{userID}/limits/session", h.SetAdminSessionLimit)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/users/{userID}/limits-history", h.GetAdminLimitHistory)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/punters/{userID}/limits-history", h.GetAdminLimitHistory)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/users/{userID}/cool-offs-history", h.GetAdminCoolOffHistory)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/punters/{userID}/cool-offs-history", h.GetAdminCoolOffHistory)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Put("/users/{userID}/lifecycle/cool-off", h.SetAdminCoolOff)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Put("/punters/{userID}/lifecycle/cool-off", h.SetAdminCoolOff)
	})

	server := &http.Server{Addr: fmt.Sprintf(":%d", cfg.Port), Handler: r, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		logger.Info("starting phoenix-compliance", slog.Int("port", cfg.Port))
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
