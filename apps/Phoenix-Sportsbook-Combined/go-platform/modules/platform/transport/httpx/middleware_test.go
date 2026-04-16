package httpx

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRequestIDUsesIncomingHeader(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = WriteJSON(w, http.StatusOK, map[string]string{
			"requestId": RequestIDFromContext(r.Context()),
		})
	})

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	req.Header.Set("X-Request-Id", "incoming-id")
	rec := httptest.NewRecorder()

	Chain(handler, RequestID()).ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Request-Id"); got != "incoming-id" {
		t.Fatalf("expected response request id incoming-id, got %q", got)
	}
}

func TestRequestIDGeneratesWhenMissing(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	Chain(handler, RequestID()).ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Request-Id"); got == "" {
		t.Fatalf("expected generated request id")
	}
}

func TestRecoveryReturnsStructuredInternalError(t *testing.T) {
	handler := http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("kaboom")
	})

	req := httptest.NewRequest(http.MethodGet, "/panic", nil)
	rec := httptest.NewRecorder()
	Chain(handler, RequestID(), Recovery(log.New(&bytes.Buffer{}, "", 0))).ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", rec.Code)
	}

	var envelope ErrorEnvelope
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if envelope.Error.Code != CodeInternalError {
		t.Fatalf("expected code %q, got %q", CodeInternalError, envelope.Error.Code)
	}
}

func TestAccessLogWritesStatusAndRequestInfo(t *testing.T) {
	logBuf := &bytes.Buffer{}
	logger := log.New(logBuf, "", 0)

	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = WriteJSON(w, http.StatusAccepted, map[string]string{"status": "ok"})
	})

	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()
	Chain(handler, RequestID(), AccessLog(logger)).ServeHTTP(rec, req)

	logOutput := logBuf.String()
	for _, expected := range []string{"method=GET", "path=/readyz", "status=202"} {
		if !strings.Contains(logOutput, expected) {
			t.Fatalf("expected log to contain %q, got: %s", expected, logOutput)
		}
	}
}

func TestMetricsMiddlewareCapturesRequestCountsAndDurations(t *testing.T) {
	registry := NewMetricsRegistry()
	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = WriteJSON(w, http.StatusCreated, map[string]string{"status": "created"})
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/example", nil)
	rec := httptest.NewRecorder()
	Chain(handler, Metrics(registry)).ServeHTTP(rec, req)

	snapshot := registry.Snapshot()
	if len(snapshot) != 1 {
		t.Fatalf("expected one metric row, got %d", len(snapshot))
	}
	if snapshot[0].Method != http.MethodPost || snapshot[0].Path != "/api/v1/example" || snapshot[0].StatusCode != http.StatusCreated {
		t.Fatalf("unexpected metric row: %+v", snapshot[0])
	}
	if snapshot[0].Count != 1 {
		t.Fatalf("expected metric count 1, got %d", snapshot[0].Count)
	}
}

func TestMetricsHandlerOutputsPrometheusFormat(t *testing.T) {
	registry := NewMetricsRegistry()
	registry.Observe(http.MethodGet, "/readyz", http.StatusOK, 5)
	registry.Observe(http.MethodGet, "/readyz", http.StatusOK, 7)

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec := httptest.NewRecorder()
	MetricsHandler(registry, "gateway").ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	body := rec.Body.String()
	for _, expected := range []string{
		"phoenix_http_requests_total",
		`service="gateway",method="GET",path="/readyz",status="200"`,
		"phoenix_http_request_duration_ms_sum",
	} {
		if !strings.Contains(body, expected) {
			t.Fatalf("expected metrics output to contain %q, got: %s", expected, body)
		}
	}
}

func TestMaxBodySizeRejectsOversized(t *testing.T) {
	handler := MaxBodySize(100)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "too large", http.StatusRequestEntityTooLarge)
			return
		}
		w.Write(body)
	}))

	// Small body — should pass
	small := httptest.NewRequest("POST", "/", strings.NewReader("hello"))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, small)
	if rec.Code != 200 {
		t.Fatalf("expected 200 for small body, got %d", rec.Code)
	}

	// Oversized body — should be rejected
	big := httptest.NewRequest("POST", "/", strings.NewReader(strings.Repeat("x", 200)))
	big.ContentLength = 200
	rec2 := httptest.NewRecorder()
	handler.ServeHTTP(rec2, big)
	if rec2.Code != 413 {
		t.Fatalf("expected 413 for oversized body, got %d", rec2.Code)
	}
}
