package tracing

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestInitNoEnvVarsReturnsNoopShutdown(t *testing.T) {
	// Unset any OTEL env vars to ensure noop mode
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
	t.Setenv("OTEL_TRACES_EXPORTER", "")

	shutdown, err := Init(context.Background(), "test-service", "0.0.1")
	if err != nil {
		t.Fatalf("Init returned error: %v", err)
	}
	if shutdown == nil {
		t.Fatal("expected non-nil shutdown function")
	}

	// Shutdown should succeed without error (it's a noop)
	if err := shutdown(context.Background()); err != nil {
		t.Fatalf("noop shutdown returned error: %v", err)
	}
}

func TestTraceIDFromContextWithBackgroundReturnsEmpty(t *testing.T) {
	traceID := TraceIDFromContext(context.Background())
	if traceID != "" {
		t.Fatalf("expected empty trace id from background context, got %q", traceID)
	}
}

func TestMiddlewareWrapsHandlerAndPropagatesContext(t *testing.T) {
	// Ensure noop mode so we don't need a real exporter
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
	t.Setenv("OTEL_TRACES_EXPORTER", "")

	var handlerCtx context.Context
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCtx = r.Context()
		w.WriteHeader(http.StatusOK)
	})

	wrapped := Middleware()(inner)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	rec := httptest.NewRecorder()

	wrapped.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if handlerCtx == nil {
		t.Fatal("expected handler to receive non-nil context")
	}
}

func TestStartSpanDoesNotPanic(t *testing.T) {
	// Ensure noop mode
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
	t.Setenv("OTEL_TRACES_EXPORTER", "")

	ctx, span := StartSpan(context.Background(), "test-span")
	if ctx == nil {
		t.Fatal("expected non-nil context from StartSpan")
	}
	if span == nil {
		t.Fatal("expected non-nil span from StartSpan")
	}
	span.End()
}

func TestSpanFromContextReturnsNonNil(t *testing.T) {
	span := SpanFromContext(context.Background())
	if span == nil {
		t.Fatal("expected non-nil span from SpanFromContext with background context")
	}
}

func TestMiddlewareWithStdoutExporter(t *testing.T) {
	// Configure stdout exporter to exercise that code path (Init will set up a real provider)
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
	t.Setenv("OTEL_TRACES_EXPORTER", "stdout")

	shutdown, err := Init(context.Background(), "test-svc-stdout", "0.0.2")
	if err != nil {
		t.Fatalf("Init with stdout exporter: %v", err)
	}
	defer func() {
		_ = shutdown(context.Background())
	}()

	var receivedTraceID string
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedTraceID = TraceIDFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	wrapped := Middleware()(inner)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/bets", nil)
	rec := httptest.NewRecorder()

	wrapped.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	// With a real tracer provider (stdout), we should get a trace ID
	if receivedTraceID == "" {
		t.Fatal("expected non-empty trace id with stdout exporter enabled")
	}

	// Verify X-Trace-Id response header is set
	headerTraceID := rec.Header().Get("X-Trace-Id")
	if headerTraceID == "" {
		t.Fatal("expected X-Trace-Id response header to be set")
	}
	if headerTraceID != receivedTraceID {
		t.Fatalf("expected response header trace id %q to match context trace id %q", headerTraceID, receivedTraceID)
	}
}
