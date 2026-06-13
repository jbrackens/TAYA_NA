package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port                  int
	Environment           string
	DatabaseURL           string
	RedisAddr             string
	RedisPassword         string
	KafkaBrokers          []string
	OutboxEnabled         bool
	OutboxPoll            string
	OutboxBatch           int
	JWTSecret             string
	JWTIssuer             string
	JWTAudience           string
	WalletURL             string
	HTTPTimeoutSec        int
	LogLevel              string
	LeaderboardTTLSeconds int
}

func Load() (*Config, error) {
	port := 8006
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
		Port:                  port,
		Environment:           getEnv("ENVIRONMENT", "development"),
		DatabaseURL:           getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/phoenix_platform?sslmode=disable"),
		RedisAddr:             getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:         getEnv("REDIS_PASSWORD", ""),
		KafkaBrokers:          splitCSVEnv("KAFKA_BROKERS", "localhost:9092"),
		OutboxEnabled:         getEnvBool("OUTBOX_ENABLED", true),
		OutboxPoll:            getEnv("OUTBOX_POLL_INTERVAL", "1s"),
		OutboxBatch:           getEnvInt("OUTBOX_BATCH_SIZE", 50),
		JWTSecret:             getEnv("JWT_SECRET", "phoenix-secret"),
		JWTIssuer:             getEnv("JWT_ISSUER", "phoenix-user"),
		JWTAudience:           getEnv("JWT_AUDIENCE", "phoenix-platform"),
		WalletURL:             getEnv("WALLET_URL", "http://localhost:8002"),
		HTTPTimeoutSec:        timeout,
		LogLevel:              getEnv("LOG_LEVEL", "info"),
		LeaderboardTTLSeconds: getEnvInt("LEADERBOARD_CACHE_TTL_SECONDS", 30),
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
