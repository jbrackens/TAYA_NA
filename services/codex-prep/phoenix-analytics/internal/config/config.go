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
	JWTSecret     string
	JWTIssuer     string
	JWTAudience   string
	KafkaBrokers  []string
	OutboxEnabled bool
	OutboxPoll    string
	OutboxBatch   int
}

func Load() (Config, error) {
	cfg := Config{
		Port:          intEnv("PORT", 8009),
		Environment:   stringEnv("ENVIRONMENT", "development"),
		DatabaseURL:   stringEnv("DATABASE_URL", "postgres://phoenix:phoenix@localhost:5432/phoenix?sslmode=disable"),
		JWTSecret:     stringEnv("JWT_SECRET", "phoenix-dev-secret"),
		JWTIssuer:     stringEnv("JWT_ISSUER", "phoenix-user"),
		JWTAudience:   stringEnv("JWT_AUDIENCE", "phoenix-platform"),
		KafkaBrokers:  csvEnv("KAFKA_BROKERS", []string{"localhost:9092"}),
		OutboxEnabled: boolEnv("OUTBOX_ENABLED", true),
		OutboxPoll:    stringEnv("OUTBOX_POLL_INTERVAL", "1s"),
		OutboxBatch:   intEnv("OUTBOX_BATCH_SIZE", 50),
	}
	if strings.TrimSpace(cfg.DatabaseURL) == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	return cfg, nil
}

func stringEnv(key, fallback string) string {
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

func boolEnv(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
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
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	if len(result) == 0 {
		return fallback
	}
	return result
}
