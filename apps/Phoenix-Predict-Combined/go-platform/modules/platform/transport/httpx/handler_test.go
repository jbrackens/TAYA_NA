package httpx

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandleWritesStructuredAppError(t *testing.T) {
	handler := Handle(func(_ http.ResponseWriter, _ *http.Request) error {
		return Unauthorized("invalid credentials")
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/session", nil)
	req.Header.Set("X-Request-Id", "req-123")
	rec := httptest.NewRecorder()

	Chain(handler, RequestID()).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", rec.Code)
	}

	var envelope ErrorEnvelope
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error body: %v", err)
	}

	if envelope.Error.Code != CodeUnauthorized {
		t.Fatalf("expected code %q, got %q", CodeUnauthorized, envelope.Error.Code)
	}
	if envelope.Error.RequestID != "req-123" {
		t.Fatalf("expected request_id req-123, got %q", envelope.Error.RequestID)
	}
}

func TestHandleMapsUnknownErrorToInternalError(t *testing.T) {
	handler := Handle(func(_ http.ResponseWriter, _ *http.Request) error {
		return errors.New("boom")
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	Chain(handler, RequestID()).ServeHTTP(rec, req)

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
	if envelope.Error.RequestID == "" {
		t.Fatalf("expected request_id to be set")
	}
}
