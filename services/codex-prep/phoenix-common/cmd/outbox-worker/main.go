package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	commonkafka "github.com/phoenixbot/phoenix-common/pkg/kafka"
	"github.com/phoenixbot/phoenix-common/pkg/outbox"
	"go.uber.org/zap"
)

type config struct {
	Environment string
	DatabaseURL string
	KafkaBrokers []string
	PollInterval string
	BatchSize int
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := loadConfig()
	if err != nil {
		logger.Error("load config", slog.Any("error", err))
		os.Exit(1)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	dbPool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("create database pool", slog.Any("error", err))
		os.Exit(1)
	}
	defer dbPool.Close()
	if err := dbPool.Ping(ctx); err != nil {
		logger.Error("ping database", slog.Any("error", err))
		os.Exit(1)
	}

	zapLogger, err := newZapLogger(cfg.Environment)
	if err != nil {
		logger.Error("create zap logger", slog.Any("error", err))
		os.Exit(1)
	}
	defer zapLogger.Sync()

	producer, err := commonkafka.NewProducer(strings.Join(cfg.KafkaBrokers, ","), &commonkafka.ProducerConfig{Logger: zapLogger})
	if err != nil {
		logger.Error("create kafka producer", slog.Any("error", err))
		os.Exit(1)
	}
	defer producer.Close()

	pollInterval, err := time.ParseDuration(cfg.PollInterval)
	if err != nil {
		logger.Error("parse outbox poll interval", slog.Any("error", err))
		os.Exit(1)
	}

	worker := outbox.NewWorker(dbPool, producer, outbox.Config{
		Logger:       zapLogger.Named("outbox"),
		PollInterval: pollInterval,
		BatchSize:    cfg.BatchSize,
	})

	logger.Info("starting phoenix-outbox-worker",
		slog.String("database", redactDatabaseURL(cfg.DatabaseURL)),
		slog.Any("kafka_brokers", cfg.KafkaBrokers),
		slog.String("poll_interval", cfg.PollInterval),
		slog.Int("batch_size", cfg.BatchSize),
	)

	worker.Start(ctx)

	logger.Info("phoenix-outbox-worker stopped")
}

func loadConfig() (config, error) {
	cfg := config{
		Environment:  getEnv("ENVIRONMENT", "production"),
		DatabaseURL:  strings.TrimSpace(os.Getenv("DATABASE_URL")),
		KafkaBrokers: csvEnv("KAFKA_BROKERS", []string{"localhost:9092"}),
		PollInterval: getEnv("OUTBOX_POLL_INTERVAL", "1s"),
		BatchSize:    intEnv("OUTBOX_BATCH_SIZE", 100),
	}
	if cfg.DatabaseURL == "" {
		return config{}, fmt.Errorf("DATABASE_URL is required")
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func intEnv(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func csvEnv(key string, fallback []string) []string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	if len(result) == 0 {
		return fallback
	}
	return result
}

func redactDatabaseURL(value string) string {
	if idx := strings.Index(value, "@"); idx != -1 {
		if scheme := strings.Index(value, "://"); scheme != -1 && scheme+3 < idx {
			return value[:scheme+3] + "****@" + value[idx+1:]
		}
	}
	return value
}

func newZapLogger(environment string) (*zap.Logger, error) {
	if environment == "development" {
		return zap.NewDevelopment()
	}
	return zap.NewProduction()
}
