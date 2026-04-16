// Package logging provides structured logging using Go's log/slog.
// In production, logs are emitted as JSON. In development, logs use
// human-readable text format. Request-scoped fields (request_id, user_id)
// are propagated via context.
package logging

import (
	"context"
	"log/slog"
	"os"
	"strings"
)

type contextKey string

const (
	requestIDKey contextKey = "request_id"
	userIDKey    contextKey = "user_id"
	serviceKey   contextKey = "service"
)

// Init configures the global slog logger based on the environment.
// Call once at service startup.
//
//	logging.Init("gateway", "production")  // JSON output
//	logging.Init("gateway", "development") // text output
func Init(serviceName string, environment string) {
	var handler slog.Handler

	opts := &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}

	if strings.EqualFold(strings.TrimSpace(os.Getenv("LOG_LEVEL")), "debug") {
		opts.Level = slog.LevelDebug
	}

	if strings.ToLower(strings.TrimSpace(environment)) == "production" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	// Add service name as default attribute
	logger := slog.New(handler).With(slog.String("service", serviceName))
	slog.SetDefault(logger)
}

// WithRequestContext returns a logger enriched with request-scoped fields
// extracted from the context (request_id, user_id).
func WithRequestContext(ctx context.Context) *slog.Logger {
	logger := slog.Default()

	if reqID, ok := ctx.Value(requestIDKey).(string); ok && reqID != "" {
		logger = logger.With(slog.String("request_id", reqID))
	}
	if userID, ok := ctx.Value(userIDKey).(string); ok && userID != "" {
		logger = logger.With(slog.String("user_id", userID))
	}

	return logger
}

// ContextWithRequestID stores a request ID in the context for logging.
func ContextWithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDKey, requestID)
}

// ContextWithUserID stores a user ID in the context for logging.
func ContextWithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// Info logs at INFO level with structured fields.
func Info(msg string, args ...any) {
	slog.Info(msg, args...)
}

// Warn logs at WARN level with structured fields.
func Warn(msg string, args ...any) {
	slog.Warn(msg, args...)
}

// Error logs at ERROR level with structured fields.
func Error(msg string, args ...any) {
	slog.Error(msg, args...)
}

// Debug logs at DEBUG level with structured fields.
func Debug(msg string, args ...any) {
	slog.Debug(msg, args...)
}
