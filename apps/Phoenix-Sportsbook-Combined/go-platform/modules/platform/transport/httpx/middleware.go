package httpx

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"time"
)

type Middleware func(http.Handler) http.Handler

type contextKey string

const (
	headerRequestID      = "X-Request-Id"
	requestIDContextKey  = contextKey("request_id")
	defaultLoggerPrefix  = "[httpx]"
	generatedRequestSize = 16
)

func Chain(handler http.Handler, middlewares ...Middleware) http.Handler {
	chained := handler
	for i := len(middlewares) - 1; i >= 0; i-- {
		chained = middlewares[i](chained)
	}
	return chained
}

func RequestID() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := r.Header.Get(headerRequestID)
			if requestID == "" {
				requestID = generateRequestID()
			}

			w.Header().Set(headerRequestID, requestID)
			ctx := context.WithValue(r.Context(), requestIDContextKey, requestID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequestIDFromContext(ctx context.Context) string {
	value := ctx.Value(requestIDContextKey)
	if value == nil {
		return ""
	}

	requestID, _ := value.(string)
	return requestID
}

func Recovery(logger *log.Logger) Middleware {
	l := withFallbackLogger(logger)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if recovered := recover(); recovered != nil {
					l.Printf("panic recovered request_id=%s method=%s path=%s panic=%v",
						RequestIDFromContext(r.Context()),
						r.Method,
						r.URL.Path,
						recovered,
					)
					WriteError(w, r, Internal("internal server error", fmt.Errorf("%v", recovered)))
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}

func AccessLog(logger *log.Logger) Middleware {
	l := withFallbackLogger(logger)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			started := time.Now()
			recorder := newStatusRecorder(w)

			next.ServeHTTP(recorder, r)

			l.Printf(
				"request_id=%s method=%s path=%s status=%d duration_ms=%d bytes=%d",
				RequestIDFromContext(r.Context()),
				r.Method,
				r.URL.Path,
				recorder.statusCode,
				time.Since(started).Milliseconds(),
				recorder.bytes,
			)
		})
	}
}

func generateRequestID() string {
	randomBytes := make([]byte, generatedRequestSize)
	if _, err := rand.Read(randomBytes); err != nil {
		return fmt.Sprintf("fallback-%d", time.Now().UnixNano())
	}

	return hex.EncodeToString(randomBytes)
}

func withFallbackLogger(logger *log.Logger) *log.Logger {
	if logger != nil {
		return logger
	}
	return log.Default()
}

type statusRecorder struct {
	http.ResponseWriter
	statusCode int
	bytes      int
}

func newStatusRecorder(w http.ResponseWriter) *statusRecorder {
	return &statusRecorder{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
	}
}

func (r *statusRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

func (r *statusRecorder) Write(data []byte) (int, error) {
	written, err := r.ResponseWriter.Write(data)
	r.bytes += written
	return written, err
}
