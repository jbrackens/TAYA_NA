package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port            int
	Environment     string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
	KafkaBrokers    []string
	KafkaGroupID    string
	JWTSecret       string
	JWTIssuer       string
	JWTAudience     string
	MarketURL       string
	EventsURL       string
	WalletURL       string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:            getEnvInt("PORT", getEnvInt("SERVER_PORT", 8018)),
		Environment:     getEnv("ENVIRONMENT", "development"),
		ReadTimeout:     getEnvDuration("SERVER_READ_TIMEOUT", 15*time.Second),
		WriteTimeout:    getEnvDuration("SERVER_WRITE_TIMEOUT", 30*time.Second),
		ShutdownTimeout: getEnvDuration("SERVER_SHUTDOWN_TIMEOUT", 20*time.Second),
		KafkaBrokers:    getEnvCSV("KAFKA_BROKERS", []string{"localhost:9092"}),
		KafkaGroupID:    getEnv("KAFKA_GROUP_ID", "phoenix-realtime"),
		JWTSecret:       getEnv("JWT_SECRET", getEnv("JWT_SECRET_KEY", "phoenix-dev-secret-change-me")),
		JWTIssuer:       getEnv("JWT_ISSUER", "phoenix-gateway"),
		JWTAudience:     getEnv("JWT_AUDIENCE", "phoenix-platform"),
		MarketURL:       strings.TrimRight(getEnv("PHOENIX_MARKET_ENGINE_URL", "http://localhost:8003"), "/"),
		EventsURL:       strings.TrimRight(getEnv("PHOENIX_EVENTS_URL", "http://localhost:8005"), "/"),
		WalletURL:       strings.TrimRight(getEnv("PHOENIX_WALLET_URL", "http://localhost:8002"), "/"),
	}
	if len(cfg.KafkaBrokers) == 0 {
		return nil, fmt.Errorf("KAFKA_BROKERS is required")
	}
	if strings.TrimSpace(cfg.JWTSecret) == "" {
		return nil, fmt.Errorf("JWT_SECRET or JWT_SECRET_KEY is required")
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
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

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func getEnvCSV(key string, fallback []string) []string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
