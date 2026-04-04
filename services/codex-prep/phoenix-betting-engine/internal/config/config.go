package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port                       int
	Environment                string
	DatabaseURL                string
	KafkaBrokers               []string
	OutboxEnabled              bool
	OutboxPoll                 string
	OutboxBatch                int
	JWTSecret                  string
	JWTIssuer                  string
	JWTAudience                string
	MarketEngineURL            string
	WalletURL                  string
	ComplianceURL              string
	GeolocationEnforcementMode string
	HTTPTimeoutSec             int
	LogLevel                   string
}

func Load() (*Config, error) {
	port := 8004
	if value := os.Getenv("PORT"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil {
			return nil, fmt.Errorf("invalid PORT: %w", err)
		}
		port = parsed
	}
	timeout := 10
	if value := os.Getenv("HTTP_TIMEOUT_SEC"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil {
			return nil, fmt.Errorf("invalid HTTP_TIMEOUT_SEC: %w", err)
		}
		timeout = parsed
	}
	return &Config{
		Port:            port,
		Environment:     getEnv("ENVIRONMENT", "development"),
		DatabaseURL:     getEnv("DATABASE_URL", "postgres://user:password@localhost:5432/phoenix_platform?sslmode=disable"),
		KafkaBrokers:    splitCSVEnv("KAFKA_BROKERS", "localhost:9092"),
		OutboxEnabled:   getEnvBool("OUTBOX_ENABLED", true),
		OutboxPoll:      getEnv("OUTBOX_POLL_INTERVAL", "1s"),
		OutboxBatch:     getEnvInt("OUTBOX_BATCH_SIZE", 50),
		JWTSecret:       getEnv("JWT_SECRET", "phoenix-secret"),
		JWTIssuer:       getEnv("JWT_ISSUER", "phoenix-user"),
		JWTAudience:     getEnv("JWT_AUDIENCE", "phoenix-platform"),
		MarketEngineURL: getEnv("MARKET_ENGINE_URL", "http://localhost:8003"),
		WalletURL:       getEnv("WALLET_URL", "http://localhost:8002"),
		ComplianceURL:   getEnv("COMPLIANCE_URL", "http://localhost:8008"),
		GeolocationEnforcementMode: getEnv(
			"GEOLOCATION_ENFORCEMENT_MODE",
			"disabled",
		),
		HTTPTimeoutSec: timeout,
		LogLevel:       getEnv("LOG_LEVEL", "info"),
	}, nil
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

func splitCSVEnv(key, fallback string) []string {
	value := getEnv(key, fallback)
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}
