package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port        int
	Environment string
	DatabaseURL string
	JWTSecret   string
	JWTIssuer   string
	JWTAudience string
}

func Load() (Config, error) {
	cfg := Config{
		Port:        intEnv("PORT", 8017),
		Environment: stringEnv("ENVIRONMENT", "development"),
		DatabaseURL: stringEnv("DATABASE_URL", "postgres://phoenix:phoenix@localhost:5432/phoenix?sslmode=disable"),
		JWTSecret:   stringEnv("JWT_SECRET", "phoenix-dev-secret"),
		JWTIssuer:   stringEnv("JWT_ISSUER", "phoenix-user"),
		JWTAudience: stringEnv("JWT_AUDIENCE", "phoenix-platform"),
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
