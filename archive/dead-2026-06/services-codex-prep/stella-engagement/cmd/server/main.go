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
	gozap "go.uber.org/zap"

	"github.com/phoenixbot/stella-engagement/internal/config"
	"github.com/phoenixbot/stella-engagement/internal/handlers"
	"github.com/phoenixbot/stella-engagement/internal/middleware"
	"github.com/phoenixbot/stella-engagement/internal/repository"
	"github.com/phoenixbot/stella-engagement/internal/service"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg, err := config.Load()
	if err != nil { logger.Error("load config", slog.Any("error", err)); os.Exit(1) }
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil { logger.Error("create database pool", slog.Any("error", err)); os.Exit(1) }
	defer pool.Close()
	if err := pool.Ping(context.Background()); err != nil { logger.Error("ping database", slog.Any("error", err)); os.Exit(1) }
	redisClient := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr, Password: cfg.RedisPassword})
	defer redisClient.Close()
	if err := redisClient.Ping(context.Background()).Err(); err != nil { logger.Error("ping redis", slog.Any("error", err)); os.Exit(1) }
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if cfg.OutboxEnabled {
		zapLogger, err := newZapLogger(cfg.Environment)
		if err != nil { logger.Error("create zap logger", slog.Any("error", err)); os.Exit(1) }
		defer zapLogger.Sync()
		producer, err := commonkafka.NewProducer(strings.Join(cfg.KafkaBrokers, ","), &commonkafka.ProducerConfig{Logger: zapLogger})
		if err != nil { logger.Error("create outbox producer", slog.Any("error", err)); os.Exit(1) }
		defer producer.Close()
		pollInterval, err := time.ParseDuration(cfg.OutboxPoll)
		if err != nil { logger.Error("parse outbox poll interval", slog.Any("error", err)); os.Exit(1) }
		worker := outbox.NewWorker(pool, producer, outbox.Config{Logger: zapLogger.Named("outbox"), PollInterval: pollInterval, BatchSize: cfg.OutboxBatch})
		go worker.Start(ctx)
	}
	repo := repository.NewRepository(pool, redisClient)
	broadcaster := service.NewBroadcaster()
	svc := service.NewService(logger, repo, broadcaster)
	h := handlers.NewHandlers(logger, svc)
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.LoggingMiddleware(logger))
	r.Use(chimw.Recoverer)
	r.Get("/health", h.HealthCheck)
	r.Get("/ready", h.ReadinessCheck)
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/stream/achievements/{userID}", h.AchievementStreamSocket)
		r.Get("/stream/leaderboard", h.LeaderboardStreamSocket)
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
			r.Post("/achievements/stream", h.StreamAchievement)
			r.Post("/points/calculate", h.CalculatePoints)
			r.Post("/aggregations/compute", h.ComputeAggregation)
			r.Get("/engagement-score/{userID}", h.GetEngagementScore)
		})
	})
	server := &http.Server{Addr: fmt.Sprintf(":%d", cfg.Port), Handler: r, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second}
	go func() { logger.Info("starting stella-engagement", slog.Int("port", cfg.Port)); if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed { logger.Error("listen", slog.Any("error", err)); os.Exit(1) } }()
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	cancel()
	if err := server.Shutdown(shutdownCtx); err != nil { logger.Error("shutdown", slog.Any("error", err)); os.Exit(1) }
}

func newZapLogger(environment string) (*gozap.Logger, error) { if environment == "development" { return gozap.NewDevelopment() }; return gozap.NewProduction() }
