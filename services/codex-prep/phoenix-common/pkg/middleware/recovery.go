package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"go.uber.org/zap"
)

// Recovery returns a middleware that recovers from panics and logs the stack trace.
// It returns a 500 Internal Server Error response to the client.
func Recovery(logger *zap.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					// Log the panic with full stack trace
					logger.Error("panic_recovered",
						zap.String("method", r.Method),
						zap.String("path", r.RequestURI),
						zap.String("remote_addr", r.RemoteAddr),
						zap.String("panic", fmt.Sprintf("%v", err)),
						zap.String("stack_trace", string(debug.Stack())),
					)

					// Send a 500 error response
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusInternalServerError)
					fmt.Fprintf(w, `{"error":"internal server error","message":"an unexpected error occurred"}`)
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}

// SafeHandler wraps a handler function to safely recover from panics.
// This is useful for wrapping individual route handlers.
func SafeHandler(logger *zap.Logger, handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				// Log the panic
				logger.Error("panic_in_handler",
					zap.String("method", r.Method),
					zap.String("path", r.RequestURI),
					zap.String("panic", fmt.Sprintf("%v", err)),
					zap.String("stack_trace", string(debug.Stack())),
				)

				// Send error response
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				fmt.Fprintf(w, `{"error":"internal server error"}`)
			}
		}()

		handler(w, r)
	}
}
