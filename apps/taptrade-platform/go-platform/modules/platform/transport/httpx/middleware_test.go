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

func TestAuthStripsClientSuppliedIdentityHeaders(t *testing.T) {
	var sawUserID, sawAdminRole string
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sawUserID = r.Header.Get("X-User-ID")
		sawAdminRole = r.Header.Get("X-Admin-Role")
		w.WriteHeader(http.StatusOK)
	})

	// A public route skips session validation, so this exercises the ingress
	// strip without an auth service — and it is exactly the route shape where a
	// forged identity header would otherwise reach a handler.
	handler := Chain(inner, Auth("http://127.0.0.1:1", []string{"/public"}))

	req := httptest.NewRequest(http.MethodGet, "/public/markets", nil)
	req.Header.Set("X-User-ID", "victim")
	req.Header.Set("X-Admin-Role", "admin")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if sawUserID != "" {
		t.Fatalf("X-User-ID must be stripped at ingress, handler saw %q", sawUserID)
	}
	if sawAdminRole != "" {
		t.Fatalf("X-Admin-Role must be stripped at ingress, handler saw %q", sawAdminRole)
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

func TestNormalizeTrailingSlashTrimsConfiguredPrefixes(t *testing.T) {
	handler := NormalizeTrailingSlash("/api/", "/admin/")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = WriteJSON(w, http.StatusOK, map[string]string{
			"path":  r.URL.Path,
			"query": r.URL.RawQuery,
		})
	}))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/deposit/?foo=bar", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var payload map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload["path"] != "/api/v1/payments/deposit" {
		t.Fatalf("expected normalized path, got %q", payload["path"])
	}
	if payload["query"] != "foo=bar" {
		t.Fatalf("expected query string to be preserved, got %q", payload["query"])
	}
}

func TestNormalizeTrailingSlashLeavesNonMatchingPathsUntouched(t *testing.T) {
	handler := NormalizeTrailingSlash("/api/")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = WriteJSON(w, http.StatusOK, map[string]string{"path": r.URL.Path})
	}))

	req := httptest.NewRequest(http.MethodGet, "/docs/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	var payload map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload["path"] != "/docs/" {
		t.Fatalf("expected non-matching path to stay unchanged, got %q", payload["path"])
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

func TestMetricsHandlerAppendsRegisteredCollectors(t *testing.T) {
	registry := NewMetricsRegistry()
	registry.Observe(http.MethodGet, "/readyz", http.StatusOK, 5)
	registry.RegisterCollector(func() string {
		return "# HELP gateway_demo_total A demo collector counter.\n" +
			"# TYPE gateway_demo_total counter\n" +
			"gateway_demo_total 42\n"
	})
	// A collector returning "" must contribute nothing (and not panic).
	registry.RegisterCollector(func() string { return "" })
	// A nil collector is ignored at registration.
	registry.RegisterCollector(nil)

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec := httptest.NewRecorder()
	MetricsHandler(registry, "gateway").ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	body := rec.Body.String()
	// HTTP metrics still present.
	if !strings.Contains(body, "phoenix_http_requests_total") {
		t.Fatalf("expected built-in HTTP metrics, got: %s", body)
	}
	// Collector output appended.
	if !strings.Contains(body, "gateway_demo_total 42") {
		t.Fatalf("expected collector output in body, got: %s", body)
	}
	// Collector text must come AFTER the HTTP metrics block.
	if strings.Index(body, "gateway_demo_total") < strings.Index(body, "phoenix_http_requests_total") {
		t.Fatalf("expected collector output after HTTP metrics, got: %s", body)
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

// CORS allowlist tests. Critical for production — these encode the contract
// that route handlers MUST NOT set their own Access-Control-Allow-Origin.
// Regressing any of these means a handler can leak authenticated responses
// cross-origin.

func TestCORSAllowedOriginGetsACAOReflectedAndCredentials(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := CORS([]string{"https://allowed.example", "https://office.example"})
	wrapped := Chain(handler, mw)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets", nil)
	req.Header.Set("Origin", "https://allowed.example")
	rec := httptest.NewRecorder()
	wrapped.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://allowed.example" {
		t.Errorf("expected ACAO https://allowed.example, got %q", got)
	}
	if got := rec.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Errorf("expected ACAC true, got %q", got)
	}
	if got := rec.Header().Get("Vary"); got != "Origin" {
		t.Errorf("expected Vary Origin, got %q", got)
	}
}

func TestCORSDisallowedOriginEmitsNoCORSHeaders(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := CORS([]string{"https://allowed.example"})
	wrapped := Chain(handler, mw)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec := httptest.NewRecorder()
	wrapped.ServeHTTP(rec, req)

	// The browser will refuse to expose the response to JS on this origin
	// because no ACAO header matches. This is the correct same-origin-policy
	// outcome for a disallowed origin.
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("expected no ACAO for disallowed origin, got %q", got)
	}
	if got := rec.Header().Get("Access-Control-Allow-Credentials"); got != "" {
		t.Errorf("expected no ACAC for disallowed origin, got %q", got)
	}
}

func TestCORSPreflightOPTIONSShortCircuitsWith204(t *testing.T) {
	handlerCalled := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	})

	mw := CORS([]string{"https://allowed.example"})
	wrapped := Chain(handler, mw)

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/markets", nil)
	req.Header.Set("Origin", "https://allowed.example")
	req.Header.Set("Access-Control-Request-Method", "POST")
	rec := httptest.NewRecorder()
	wrapped.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected 204 for preflight, got %d", rec.Code)
	}
	if handlerCalled {
		t.Error("preflight should short-circuit before route handler runs")
	}
	if got := rec.Header().Get("Access-Control-Allow-Methods"); got == "" {
		t.Error("preflight missing Access-Control-Allow-Methods")
	}
}

func TestCORSEmptyOriginEmitsNoCORSHeaders(t *testing.T) {
	// Same-origin requests from the browser don't send Origin. The middleware
	// should pass through without adding CORS headers.
	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := CORS([]string{"https://allowed.example"})
	wrapped := Chain(handler, mw)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets", nil)
	// no Origin header
	rec := httptest.NewRecorder()
	wrapped.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("expected no ACAO for empty Origin, got %q", got)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("expected request to pass through, got %d", rec.Code)
	}
}

func TestCORSTrimsWhitespaceInAllowlist(t *testing.T) {
	// Real-world: allowlist often comes from a comma-split env var. Whitespace
	// around values must not break exact-match.
	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := CORS([]string{"  https://padded.example  ", ""})
	wrapped := Chain(handler, mw)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets", nil)
	req.Header.Set("Origin", "https://padded.example")
	rec := httptest.NewRecorder()
	wrapped.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://padded.example" {
		t.Errorf("expected ACAO https://padded.example for trimmed allowlist entry, got %q", got)
	}
}
