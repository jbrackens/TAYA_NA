package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/shopspring/decimal"
)

type Config struct {
	Port          int
	Environment   string
	DatabaseURL   string
	KafkaBrokers  []string
	JWTSecret     string
	JWTIssuer     string
	JWTAudience   string
	LogLevel      string
	DefaultMinBet decimal.Decimal
	DefaultMaxBet decimal.Decimal
}

func Load() (*Config, error) {
	port := 8003
	if value := os.Getenv("PORT"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil {
			return nil, fmt.Errorf("invalid PORT: %w", err)
		}
		port = parsed
	}
	minBet, err := decimal.NewFromString(getEnv("DEFAULT_MIN_BET", "1.00"))
	if err != nil {
		return nil, fmt.Errorf("invalid DEFAULT_MIN_BET: %w", err)
	}
	maxBet, err := decimal.NewFromString(getEnv("DEFAULT_MAX_BET", "10000.00"))
	if err != nil {
		return nil, fmt.Errorf("invalid DEFAULT_MAX_BET: %w", err)
	}
	cfg := &Config{
		Port:          port,
		Environment:   getEnv("ENVIRONMENT", "development"),
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://user:password@localhost:5432/phoenix_platform?sslmode=disable"),
		KafkaBrokers:  splitCSV(getEnv("KAFKA_BROKERS", "localhost:9092")),
		JWTSecret:     getEnv("JWT_SECRET", "phoenix-secret"),
		JWTIssuer:     getEnv("JWT_ISSUER", "phoenix-user"),
		JWTAudience:   getEnv("JWT_AUDIENCE", "phoenix-platform"),
		LogLevel:      getEnv("LOG_LEVEL", "info"),
		DefaultMinBet: minBet,
		DefaultMaxBet: maxBet,
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	if len(result) == 0 {
		return []string{"localhost:9092"}
	}
	return result
}
