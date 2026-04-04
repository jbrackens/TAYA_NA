package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Server     ServerConfig
	Redis      RedisConfig
	Auth       AuthConfig
	Services   map[string]ServiceConfig
	Realtime   ServiceConfig
	Features   FeatureFlags
	Limits     PlatformLimits
	RateLimits map[string]RateLimitPolicy
}

type ServerConfig struct {
	Host                    string
	Port                    int
	ReadTimeout             time.Duration
	WriteTimeout            time.Duration
	ShutdownTimeout         time.Duration
	Environment             string
	HTTPAllowedOrigins      []string
	WebsocketAllowedOrigins []string
	WebsocketRealtimeProxy  bool
}

type RedisConfig struct {
	Addr         string
	Password     string
	DB           int
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
}

type AuthConfig struct {
	JWTSecretKey string
	JWTIssuer    string
	JWTAudience  string
}

type ServiceConfig struct {
	Name       string `json:"name"`
	BaseURL    string `json:"base_url"`
	HealthPath string `json:"health_path"`
}

type FeatureFlags struct {
	ParlaysEnabled     bool `json:"parlays_enabled"`
	LiveBettingEnabled bool `json:"live_betting_enabled"`
	CashoutEnabled     bool `json:"cashout_enabled"`
}

type PlatformLimits struct {
	MaxBetAmount  int `json:"max_bet_amount"`
	MinBetAmount  int `json:"min_bet_amount"`
	MaxParlayLegs int `json:"max_parlay_legs"`
}

type RateLimitPolicy struct {
	Name     string        `json:"name"`
	Requests int64         `json:"requests"`
	Window   time.Duration `json:"window"`
}

func Load() (*Config, error) {
	cfg := &Config{
		Server: ServerConfig{
			Host:                    getEnv("SERVER_HOST", "0.0.0.0"),
			Port:                    getEnvInt("PORT", getEnvInt("SERVER_PORT", 8080)),
			ReadTimeout:             getEnvDuration("SERVER_READ_TIMEOUT", 15*time.Second),
			WriteTimeout:            getEnvDuration("SERVER_WRITE_TIMEOUT", 30*time.Second),
			ShutdownTimeout:         getEnvDuration("SERVER_SHUTDOWN_TIMEOUT", 20*time.Second),
			Environment:             getEnv("ENVIRONMENT", "development"),
			HTTPAllowedOrigins:      httpAllowedOrigins(getEnvCSV("HTTP_ALLOWED_ORIGINS"), getEnv("ENVIRONMENT", "development")),
			WebsocketAllowedOrigins: getEnvCSV("WEBSOCKET_ALLOWED_ORIGINS"),
			WebsocketRealtimeProxy:  getEnvBool("WEBSOCKET_REALTIME_PROXY_ENABLED", false),
		},
		Redis: RedisConfig{
			Addr:         getEnv("REDIS_ADDR", fmt.Sprintf("%s:%d", getEnv("REDIS_HOST", "localhost"), getEnvInt("REDIS_PORT", 6379))),
			Password:     getEnv("REDIS_PASSWORD", ""),
			DB:           getEnvInt("REDIS_DB", 0),
			ReadTimeout:  getEnvDuration("REDIS_READ_TIMEOUT", 3*time.Second),
			WriteTimeout: getEnvDuration("REDIS_WRITE_TIMEOUT", 3*time.Second),
		},
		Auth: AuthConfig{
			JWTSecretKey: getEnv("JWT_SECRET_KEY", "phoenix-dev-secret-change-me"),
			JWTIssuer:    getEnv("JWT_ISSUER", "phoenix-gateway"),
			JWTAudience:  getEnv("JWT_AUDIENCE", "phoenix-platform"),
		},
		Features: FeatureFlags{
			ParlaysEnabled:     getEnvBool("FEATURE_PARLAYS_ENABLED", true),
			LiveBettingEnabled: getEnvBool("FEATURE_LIVE_BETTING_ENABLED", true),
			CashoutEnabled:     getEnvBool("FEATURE_CASHOUT_ENABLED", true),
		},
		Limits: PlatformLimits{
			MaxBetAmount:  getEnvInt("LIMIT_MAX_BET_AMOUNT", 10000),
			MinBetAmount:  getEnvInt("LIMIT_MIN_BET_AMOUNT", 1),
			MaxParlayLegs: getEnvInt("LIMIT_MAX_PARLAY_LEGS", 12),
		},
		Services: map[string]ServiceConfig{
			"phoenix-user":           serviceConfig("PHOENIX_USER_URL", "http://localhost:8001"),
			"phoenix-wallet":         serviceConfig("PHOENIX_WALLET_URL", "http://localhost:8002"),
			"phoenix-market-engine":  serviceConfig("PHOENIX_MARKET_ENGINE_URL", "http://localhost:8003"),
			"phoenix-betting-engine": serviceConfig("PHOENIX_BETTING_ENGINE_URL", "http://localhost:8004"),
			"phoenix-events":         serviceConfig("PHOENIX_EVENTS_URL", "http://localhost:8005"),
			"phoenix-retention":      serviceConfig("PHOENIX_RETENTION_URL", "http://localhost:8006"),
			"phoenix-social":         serviceConfig("PHOENIX_SOCIAL_URL", "http://localhost:8007"),
			"phoenix-compliance":     serviceConfig("PHOENIX_COMPLIANCE_URL", "http://localhost:8008"),
			"phoenix-analytics":      serviceConfig("PHOENIX_ANALYTICS_URL", "http://localhost:8009"),
			"phoenix-settlement":     serviceConfig("PHOENIX_SETTLEMENT_URL", "http://localhost:8010"),
			"phoenix-notification":   serviceConfig("PHOENIX_NOTIFICATION_URL", "http://localhost:8011"),
			"phoenix-cms":            serviceConfig("PHOENIX_CMS_URL", "http://localhost:8012"),
			"stella-engagement":      serviceConfig("STELLA_ENGAGEMENT_URL", "http://localhost:8013"),
			"phoenix-prediction":     serviceConfig("PHOENIX_PREDICTION_URL", "http://localhost:8014"),
			"phoenix-audit":          serviceConfig("PHOENIX_AUDIT_URL", "http://localhost:8015"),
			"phoenix-support-notes":  serviceConfig("PHOENIX_SUPPORT_NOTES_URL", "http://localhost:8016"),
			"phoenix-config":         serviceConfig("PHOENIX_CONFIG_URL", "http://localhost:8017"),
		},
		Realtime: serviceConfig("PHOENIX_REALTIME_URL", "http://localhost:8018"),
		RateLimits: map[string]RateLimitPolicy{
			"auth-login":   {Name: "auth-login", Requests: 5, Window: time.Minute},
			"auth-refresh": {Name: "auth-refresh", Requests: 20, Window: time.Minute},
			"auth-logout":  {Name: "auth-logout", Requests: 20, Window: time.Minute},
			"admin":        {Name: "admin", Requests: 60, Window: time.Minute},
			"proxy":        {Name: "proxy", Requests: 300, Window: time.Minute},
		},
	}

	if cfg.Auth.JWTSecretKey == "" {
		return nil, fmt.Errorf("JWT_SECRET_KEY is required")
	}

	return cfg, nil
}

func serviceConfig(envKey, defaultURL string) ServiceConfig {
	return ServiceConfig{
		Name:       strings.ToLower(strings.TrimPrefix(envKey, "PHOENIX_")),
		BaseURL:    strings.TrimRight(getEnv(envKey, defaultURL), "/"),
		HealthPath: getEnv(envKey+"_HEALTH_PATH", "/health"),
	}
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

func getEnvBool(key string, fallback bool) bool {
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

func getEnvCSV(key string) []string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return nil
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

func httpAllowedOrigins(origins []string, environment string) []string {
	if len(origins) > 0 {
		return origins
	}
	if strings.EqualFold(environment, "development") {
		return []string{
			"http://localhost:3000",
			"http://localhost:3001",
			"http://localhost:3100",
			"http://localhost:3101",
			"http://127.0.0.1:3000",
			"http://127.0.0.1:3001",
			"http://127.0.0.1:3100",
			"http://127.0.0.1:3101",
		}
	}
	return nil
}
