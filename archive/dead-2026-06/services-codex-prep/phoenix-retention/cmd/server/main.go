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
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/phoenixbot/phoenix-retention/internal/client"
	"github.com/phoenixbot/phoenix-retention/internal/config"
	"github.com/phoenixbot/phoenix-retention/internal/handlers"
	"github.com/phoenixbot/phoenix-retention/internal/middleware"
	"github.com/phoenixbot/phoenix-retention/internal/repository"
	"github.com/phoenixbot/phoenix-retention/internal/service"
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

	redisClient := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr, Password: cfg.RedisPassword})
	defer redisClient.Close()
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		logger.Error("ping redis", slog.Any("error", err))
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

	walletClient := client.NewHTTPWalletClient(cfg.WalletURL, time.Duration(cfg.HTTPTimeoutSec)*time.Second)
	repo := repository.NewRepository(dbPool)
	svc := service.NewService(logger, repo, walletClient, redisClient, time.Duration(cfg.LeaderboardTTLSeconds)*time.Second)
	h := handlers.NewHandlers(logger, svc)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.LoggingMiddleware(logger))
	r.Use(chimw.Recoverer)

	r.Get("/health", h.HealthCheck)
	r.Get("/ready", h.ReadinessCheck)
	r.Get("/api/v1/leaderboards", h.ListLeaderboards)

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.Post("/achievements/{userID}/unlock", h.UnlockAchievement)
		r.Get("/users/{userID}/achievements", h.GetUserAchievements)
		r.Post("/campaigns", h.CreateCampaign)
		r.Get("/users/{userID}/loyalty-points", h.GetLoyaltyPoints)
		r.Post("/users/{userID}/loyalty-points/redeem", h.RedeemLoyaltyPoints)
		r.Get("/freebets", h.ListFreebets)
		r.Get("/freebets/{freebetID}", h.GetFreebet)
		r.Get("/odds-boosts", h.ListOddsBoosts)
		r.Get("/odds-boosts/{oddsBoostID}", h.GetOddsBoost)
		r.Post("/odds-boosts/{oddsBoostID}/accept", h.AcceptOddsBoost)
	})

	server := &http.Server{Addr: fmt.Sprintf(":%d", cfg.Port), Handler: r, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		logger.Info("starting phoenix-retention", slog.Int("port", cfg.Port))
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
