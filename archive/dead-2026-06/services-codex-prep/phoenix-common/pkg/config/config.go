package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds the complete application configuration.
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Kafka    KafkaConfig
	Redis    RedisConfig
	JWT      JWTConfig
}

// ServerConfig holds server-specific configuration.
type ServerConfig struct {
	// Host is the server bind address (default: "0.0.0.0").
	Host string
	// Port is the server listen port (default: 8080).
	Port int
	// ReadTimeout is the read timeout duration (default: 15 seconds).
	ReadTimeout time.Duration
	// WriteTimeout is the write timeout duration (default: 15 seconds).
	WriteTimeout time.Duration
	// ShutdownTimeout is the graceful shutdown timeout (default: 30 seconds).
	ShutdownTimeout time.Duration
	// Environment is the deployment environment (dev, staging, prod).
	Environment string
}

// DatabaseConfig holds database connection configuration.
type DatabaseConfig struct {
	// Host is the database host (default: "localhost").
	Host string
	// Port is the database port (default: 5432).
	Port int
	// User is the database user (default: "postgres").
	User string
	// Password is the database password.
	Password string
	// DBName is the database name.
	DBName string
	// SSLMode is the SSL mode (disable, require, verify-ca, verify-full).
	SSLMode string
	// MaxOpenConns is the maximum number of open connections (default: 25).
	MaxOpenConns int
	// MaxIdleConns is the maximum number of idle connections (default: 5).
	MaxIdleConns int
	// ConnMaxLifetime is the maximum connection lifetime (default: 5 minutes).
	ConnMaxLifetime time.Duration
}

// KafkaConfig holds Kafka broker configuration.
type KafkaConfig struct {
	// Brokers is a comma-separated list of broker addresses.
	Brokers string
	// Version is the Kafka broker version (default: "3.6.0").
	Version string
	// ConsumerGroup is the default consumer group ID.
	ConsumerGroup string
	// Compression is the compression codec (gzip, snappy, lz4, zstd).
	Compression string
	// SessionTimeoutMs is the session timeout in milliseconds (default: 30000).
	SessionTimeoutMs int
}

// RedisConfig holds Redis configuration.
type RedisConfig struct {
	// Host is the Redis host (default: "localhost").
	Host string
	// Port is the Redis port (default: 6379).
	Port int
	// DB is the Redis database number (default: 0).
	DB int
	// Password is the Redis password (empty if not required).
	Password string
	// MaxRetries is the maximum number of retries (default: 3).
	MaxRetries int
	// PoolSize is the connection pool size (default: 10).
	PoolSize int
	// ReadTimeout is the read timeout (default: 3 seconds).
	ReadTimeout time.Duration
	// WriteTimeout is the write timeout (default: 3 seconds).
	WriteTimeout time.Duration
}

// JWTConfig holds JWT token configuration.
type JWTConfig struct {
	// SecretKey is the secret key for signing tokens.
	SecretKey string
	// ExpirationHours is the token expiration time in hours (default: 24).
	ExpirationHours int
	// RefreshExpirationHours is the refresh token expiration time (default: 168, 7 days).
	RefreshExpirationHours int
	// Issuer is the token issuer claim (default: "phoenix-bot").
	Issuer string
	// Audience is the token audience claim.
	Audience string
}

// Load reads configuration from environment variables and returns a Config struct.
// It applies sensible defaults for values not specified in environment variables.
func Load() (*Config, error) {
	return &Config{
		Server:   loadServerConfig(),
		Database: loadDatabaseConfig(),
		Kafka:    loadKafkaConfig(),
		Redis:    loadRedisConfig(),
		JWT:      loadJWTConfig(),
	}, nil
}

// loadServerConfig loads server configuration from environment variables.
func loadServerConfig() ServerConfig {
	return ServerConfig{
		Host:            getEnvStr("SERVER_HOST", "0.0.0.0"),
		Port:            getEnvInt("SERVER_PORT", 8080),
		ReadTimeout:     getEnvDuration("SERVER_READ_TIMEOUT", 15*time.Second),
		WriteTimeout:    getEnvDuration("SERVER_WRITE_TIMEOUT", 15*time.Second),
		ShutdownTimeout: getEnvDuration("SERVER_SHUTDOWN_TIMEOUT", 30*time.Second),
		Environment:     getEnvStr("ENVIRONMENT", "development"),
	}
}

// loadDatabaseConfig loads database configuration from environment variables.
func loadDatabaseConfig() DatabaseConfig {
	return DatabaseConfig{
		Host:            getEnvStr("DB_HOST", "localhost"),
		Port:            getEnvInt("DB_PORT", 5432),
		User:            getEnvStr("DB_USER", "postgres"),
		Password:        getEnvStr("DB_PASSWORD", ""),
		DBName:          getEnvStr("DB_NAME", "phoenix"),
		SSLMode:         getEnvStr("DB_SSL_MODE", "disable"),
		MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
		MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 5),
		ConnMaxLifetime: getEnvDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
	}
}

// loadKafkaConfig loads Kafka configuration from environment variables.
func loadKafkaConfig() KafkaConfig {
	return KafkaConfig{
		Brokers:          getEnvStr("KAFKA_BROKERS", "localhost:9092"),
		Version:          getEnvStr("KAFKA_VERSION", "3.6.0"),
		ConsumerGroup:    getEnvStr("KAFKA_CONSUMER_GROUP", "phoenix-default"),
		Compression:      getEnvStr("KAFKA_COMPRESSION", "snappy"),
		SessionTimeoutMs: getEnvInt("KAFKA_SESSION_TIMEOUT_MS", 30000),
	}
}

// loadRedisConfig loads Redis configuration from environment variables.
func loadRedisConfig() RedisConfig {
	return RedisConfig{
		Host:         getEnvStr("REDIS_HOST", "localhost"),
		Port:         getEnvInt("REDIS_PORT", 6379),
		DB:           getEnvInt("REDIS_DB", 0),
		Password:     getEnvStr("REDIS_PASSWORD", ""),
		MaxRetries:   getEnvInt("REDIS_MAX_RETRIES", 3),
		PoolSize:     getEnvInt("REDIS_POOL_SIZE", 10),
		ReadTimeout:  getEnvDuration("REDIS_READ_TIMEOUT", 3*time.Second),
		WriteTimeout: getEnvDuration("REDIS_WRITE_TIMEOUT", 3*time.Second),
	}
}

// loadJWTConfig loads JWT configuration from environment variables.
func loadJWTConfig() JWTConfig {
	return JWTConfig{
		SecretKey:              getEnvStr("JWT_SECRET_KEY", "your-secret-key-change-in-production"),
		ExpirationHours:        getEnvInt("JWT_EXPIRATION_HOURS", 24),
		RefreshExpirationHours: getEnvInt("JWT_REFRESH_EXPIRATION_HOURS", 168),
		Issuer:                 getEnvStr("JWT_ISSUER", "phoenix-bot"),
		Audience:               getEnvStr("JWT_AUDIENCE", ""),
	}
}

// Helper functions for reading environment variables

// getEnvStr reads a string environment variable with a default value.
func getEnvStr(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// getEnvInt reads an integer environment variable with a default value.
func getEnvInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	intValue, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}

	return intValue
}

// getEnvDuration reads a duration environment variable with a default value.
// The environment variable should be a valid duration string (e.g., "15s", "1m").
func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	duration, err := time.ParseDuration(value)
	if err != nil {
		return defaultValue
	}

	return duration
}

// ConnectionString builds a database connection string for PostgreSQL.
func (c DatabaseConfig) ConnectionString() string {
	connStr := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode,
	)
	return connStr
}

// Address returns the server address in host:port format.
func (c ServerConfig) Address() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

// RedisAddr returns the Redis address in host:port format.
func (c RedisConfig) RedisAddr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

// IsDevelopment returns true if the environment is development.
func (c ServerConfig) IsDevelopment() bool {
	return c.Environment == "development" || c.Environment == "dev"
}

// IsProduction returns true if the environment is production.
func (c ServerConfig) IsProduction() bool {
	return c.Environment == "production" || c.Environment == "prod"
}
