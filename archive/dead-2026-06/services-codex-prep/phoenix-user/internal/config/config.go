package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port                    int
	Environment             string
	DatabaseURL             string
	RedisAddr               string
	RedisPassword           string
	LogLevel                string
	JWTSecret               string
	JWTIssuer               string
	JWTAudience             string
	AccessTokenTTL          time.Duration
	RefreshTokenTTL         time.Duration
	VerificationCodeTTL     time.Duration
	PasswordResetTokenTTL   time.Duration
	DefaultReferralPrefix   string
	IDPVRedirectURL         string
	KBAProvider             string
	IDPVProvider            string
	IDComplyWebhookUsername string
	IDComplyWebhookPassword string
}

func Load() (*Config, error) {
	port := 8001
	if p := os.Getenv("PORT"); p != "" {
		parsed, err := strconv.Atoi(p)
		if err != nil {
			return nil, fmt.Errorf("invalid PORT: %w", err)
		}
		port = parsed
	}

	cfg := &Config{
		Port:                    port,
		Environment:             getEnv("ENVIRONMENT", "development"),
		DatabaseURL:             getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/phoenix_platform?sslmode=disable"),
		RedisAddr:               getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:           getEnv("REDIS_PASSWORD", ""),
		LogLevel:                getEnv("LOG_LEVEL", "info"),
		JWTSecret:               getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		JWTIssuer:               getEnv("JWT_ISSUER", "phoenix-user"),
		JWTAudience:             getEnv("JWT_AUDIENCE", "phoenix-platform"),
		AccessTokenTTL:          getEnvDuration("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL:         getEnvDuration("REFRESH_TOKEN_TTL", 7*24*time.Hour),
		VerificationCodeTTL:     getEnvDuration("VERIFICATION_CODE_TTL", 30*time.Minute),
		PasswordResetTokenTTL:   getEnvDuration("PASSWORD_RESET_TOKEN_TTL", 30*time.Minute),
		DefaultReferralPrefix:   getEnv("DEFAULT_REFERRAL_PREFIX", "REF"),
		IDPVRedirectURL:         getEnv("IDPV_REDIRECT_URL", "/account?verification=idpv"),
		KBAProvider:             getEnv("KBA_PROVIDER", "idcomply"),
		IDPVProvider:            getEnv("IDPV_PROVIDER", "idcomply"),
		IDComplyWebhookUsername: getEnv("IDCOMPLY_WEBHOOK_USERNAME", "idcomply"),
		IDComplyWebhookPassword: getEnv("IDCOMPLY_WEBHOOK_PASSWORD", "idcomply-secret"),
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}
