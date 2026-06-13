package middleware

import (
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"
)

// RequestLogger returns a middleware that logs HTTP request details using zap.
// It logs method, path, status code, duration, and a unique request ID.
func RequestLogger(logger *zap.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Wrap the response writer to capture status code
			wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

			// Get or create a request ID
			requestID := r.Header.Get("X-Request-ID")
			if requestID == "" {
				requestID = fmt.Sprintf("%d", time.Now().UnixNano())
			}

			// Record the start time
			startTime := time.Now()

			// Add request ID to response headers
			wrapped.Header().Set("X-Request-ID", requestID)

			// Call the next handler
			next.ServeHTTP(wrapped, r)

			// Calculate request duration
			duration := time.Since(startTime)

			// Log the request details
			logger.Info("http_request",
				zap.String("request_id", requestID),
				zap.String("method", r.Method),
				zap.String("path", r.RequestURI),
				zap.String("remote_addr", r.RemoteAddr),
				zap.Int("status_code", wrapped.statusCode),
				zap.Duration("duration", duration),
				zap.String("user_agent", r.Header.Get("User-Agent")),
			)
		})
	}
}

// responseWriter wraps http.ResponseWriter to capture the status code.
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	written    bool
}

// WriteHeader captures the status code before writing it.
func (rw *responseWriter) WriteHeader(code int) {
	if !rw.written {
		rw.statusCode = code
		rw.written = true
		rw.ResponseWriter.WriteHeader(code)
	}
}

// Write captures writes and ensures WriteHeader is called with a default status.
func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.written {
		rw.written = true
	}
	return rw.ResponseWriter.Write(b)
}

// LogRequest logs a custom message with request context.
// This is useful for logging additional details within a handler.
func LogRequest(logger *zap.Logger, r *http.Request, msg string, fields ...zap.Field) {
	requestID := r.Header.Get("X-Request-ID")
	if requestID == "" {
		requestID = "unknown"
	}

	// Prepend standard request fields
	standardFields := []zap.Field{
		zap.String("request_id", requestID),
		zap.String("method", r.Method),
		zap.String("path", r.RequestURI),
	}
	standardFields = append(standardFields, fields...)

	logger.Info(msg, standardFields...)
}
