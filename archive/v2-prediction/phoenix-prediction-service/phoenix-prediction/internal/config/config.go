package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port          int
	Environment   string
	DatabaseURL   string
	WalletURL     string
	KafkaBrokers  []string
	OutboxEnabled bool
	OutboxPoll    string
	OutboxBatch   int
	LogLevel      string
	JWTSecret     string
	JWTIssuer     string
	JWTAudience   string
}

func Load() (*Config, error) {
	port := 8014
	if p := os.Getenv("PORT"); p != "" {
		parsed, err := strconv.Atoi(p)
		if err != nil {
			return nil, fmt.Errorf("invalid PORT: %w", err)
		}
		port = parsed
	}
	cfg := &Config{
		Port:          port,
		Environment:   getEnv("ENVIRONMENT", "development"),
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/phoenix_platform?sslmode=disable"),
		WalletURL:     getEnv("WALLET_URL", "http://localhost:8002"),
		KafkaBrokers:  []string{"localhost:9092"},
		OutboxEnabled: getEnvBool("OUTBOX_ENABLED", true),
		OutboxPoll:    getEnv("OUTBOX_POLL_INTERVAL", "1s"),
		OutboxBatch:   getEnvInt("OUTBOX_BATCH_SIZE", 50),
		LogLevel:      getEnv("LOG_LEVEL", "info"),
		JWTSecret:     getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		JWTIssuer:     getEnv("JWT_ISSUER", "phoenix-user"),
		JWTAudience:   getEnv("JWT_AUDIENCE", "phoenix-platform"),
	}
	if brokers := os.Getenv("KAFKA_BROKERS"); brokers != "" {
		cfg.KafkaBrokers = strings.Split(brokers, ",")
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseBool(value); err == nil {
			return parsed
		}
	}
	return fallback
}
