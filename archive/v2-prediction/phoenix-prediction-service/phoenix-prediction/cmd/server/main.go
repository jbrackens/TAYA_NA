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

	"github.com/phoenixbot/phoenix-prediction/internal/client"
	"github.com/phoenixbot/phoenix-prediction/internal/config"
	"github.com/phoenixbot/phoenix-prediction/internal/handlers"
	"github.com/phoenixbot/phoenix-prediction/internal/middleware"
	"github.com/phoenixbot/phoenix-prediction/internal/repository"
	"github.com/phoenixbot/phoenix-prediction/internal/service"
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

	if cfg.OutboxEnabled {
		zapLogger, err := newZapLogger(cfg.Environment)
		if err != nil {
			logger.Error("create zap logger", slog.Any("error", err))
			os.Exit(1)
		}
		defer zapLogger.Sync()

		producer, err := commonkafka.NewProducer(strings.Join(cfg.KafkaBrokers, ","), &commonkafka.ProducerConfig{Logger: zapLogger})
		if err != nil {
			logger.Error("create outbox producer", slog.Any("error", err))
			os.Exit(1)
		}
		defer producer.Close()

		pollInterval, err := time.ParseDuration(cfg.OutboxPoll)
		if err != nil {
			logger.Error("parse outbox poll interval", slog.Any("error", err))
			os.Exit(1)
		}
		worker := outbox.NewWorker(dbPool, producer, outbox.Config{
			Logger:       zapLogger.Named("outbox"),
			PollInterval: pollInterval,
			BatchSize:    cfg.OutboxBatch,
		})
		go worker.Start(ctx)
	}

	repo := repository.NewRepository(dbPool)
	walletClient := client.NewHTTPWalletClient(cfg.WalletURL, 5*time.Second)
	predictionService := service.NewPredictionService(logger, repo, walletClient)
	h := handlers.NewHandlers(logger, predictionService)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.LoggingMiddleware(logger))
	r.Use(chimw.Recoverer)

	r.Get("/health", h.HealthCheck)
	r.Get("/ready", h.ReadinessCheck)
	r.Get("/api/v1/prediction/overview", h.GetOverview)
	r.Get("/api/v1/prediction/categories", h.ListCategories)
	r.Get("/api/v1/prediction/markets", h.ListMarkets)
	r.Get("/api/v1/prediction/markets/{marketID}", h.GetMarketDetail)
	r.Post("/api/v1/prediction/ticket/preview", h.PreviewTicket)

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))

		r.Route("/prediction", func(r chi.Router) {
			r.Get("/orders", h.ListOrders)
			r.Post("/orders", h.PlaceOrder)
			r.Get("/orders/{orderID}", h.GetOrder)
			r.Post("/orders/{orderID}/cancel", h.CancelOrder)
		})

		r.With(middleware.RequireRoles("admin")).Post("/bot/keys", h.IssueBotAPIKey)
	})

	r.Route("/admin/prediction", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.With(middleware.RequireRoles("admin", "operator", "trader", "moderator")).Get("/summary", h.GetAdminSummary)
		r.With(middleware.RequireRoles("admin", "operator", "trader", "moderator")).Get("/markets", h.ListAdminMarkets)
		r.With(middleware.RequireRoles("admin", "operator", "trader", "moderator")).Get("/markets/{marketID}", h.GetAdminMarket)
		r.With(middleware.RequireRoles("admin", "operator", "trader", "moderator")).Get("/markets/{marketID}/lifecycle", h.GetLifecycleHistory)
		r.With(middleware.RequireRoles("admin", "trader")).Get("/orders", h.ListAdminOrders)
		r.With(middleware.RequireRoles("admin", "trader")).Get("/orders/{orderID}", h.GetAdminOrder)
		r.With(middleware.RequireRoles("admin", "trader")).Post("/markets/{marketID}/suspend", h.SuspendMarket)
		r.With(middleware.RequireRoles("admin", "trader")).Post("/markets/{marketID}/open", h.OpenMarket)
		r.With(middleware.RequireRoles("admin")).Post("/markets/{marketID}/cancel", h.CancelMarket)
		r.With(middleware.RequireRoles("admin")).Post("/markets/{marketID}/resolve", h.ResolveMarket)
		r.With(middleware.RequireRoles("admin")).Post("/markets/{marketID}/resettle", h.ResettleMarket)
	})

	r.Route("/v1", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.With(middleware.RequireRoles("admin")).Post("/bot/keys", h.IssueBotAPIKey)
	})

	server := &http.Server{Addr: fmt.Sprintf(":%d", cfg.Port), Handler: r, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		logger.Info("starting phoenix-prediction", slog.Int("port", cfg.Port))
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
