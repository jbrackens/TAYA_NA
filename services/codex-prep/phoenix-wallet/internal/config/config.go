package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port                 int
	Environment          string
	DatabaseURL          string
	RedisAddr            string
	RedisPassword        string
	KafkaBrokers         []string
	OutboxEnabled        bool
	OutboxPoll           string
	OutboxBatch          int
	LogLevel             string
	JWTSecret            string
	JWTIssuer            string
	JWTAudience          string
	PaymentProviderMode  string
	PXPWebhookUsername   string
	PXPWebhookPassword   string
}

func Load() (*Config, error) {
	port := 8002
	if p := os.Getenv("PORT"); p != "" {
		parsed, err := strconv.Atoi(p)
		if err != nil {
			return nil, fmt.Errorf("invalid PORT: %w", err)
		}
		port = parsed
	}
	cfg := &Config{
		Port:                port,
		Environment:         getEnv("ENVIRONMENT", "development"),
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/phoenix_platform?sslmode=disable"),
		RedisAddr:           getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:       getEnv("REDIS_PASSWORD", ""),
		KafkaBrokers:        []string{"localhost:9092"},
		OutboxEnabled:       getEnvBool("OUTBOX_ENABLED", true),
		OutboxPoll:          getEnv("OUTBOX_POLL_INTERVAL", "1s"),
		OutboxBatch:         getEnvInt("OUTBOX_BATCH_SIZE", 50),
		LogLevel:            getEnv("LOG_LEVEL", "info"),
		JWTSecret:           getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		JWTIssuer:           getEnv("JWT_ISSUER", "phoenix-user"),
		JWTAudience:         getEnv("JWT_AUDIENCE", "phoenix-platform"),
		PaymentProviderMode: getEnv("PAYMENT_PROVIDER_MODE", "inline"),
		PXPWebhookUsername:  getEnv("PXP_WEBHOOK_USERNAME", "pxp"),
		PXPWebhookPassword:  getEnv("PXP_WEBHOOK_PASSWORD", "pxp-secret"),
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
		parsed, err := strconv.Atoi(value)
		if err == nil {
			return parsed
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err == nil {
			return parsed
		}
	}
	return fallback
}
