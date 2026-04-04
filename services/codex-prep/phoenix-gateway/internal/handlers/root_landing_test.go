package handlers

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRootLandingReturnsPublicDemoPage(t *testing.T) {
	h := NewHandlers(slog.New(slog.NewTextHandler(io.Discard, nil)), nil, nil)
	req := httptest.NewRequest(http.MethodGet, "https://demo.99rtp.io/", nil)
	rec := httptest.NewRecorder()

	h.RootLanding(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if contentType := rec.Header().Get("Content-Type"); !strings.Contains(contentType, "text/html") {
		t.Fatalf("content-type = %q, want text/html", contentType)
	}
	body := rec.Body.String()
	for _, want := range []string{
		"Phoenix Platform Demo",
		"https://demo.99rtp.io/health",
		"https://demo.99rtp.io/api/v1/markets",
		"Authorization: Bearer",
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("body missing %q", want)
		}
	}
}

func TestRootLandingSupportsHeadRequests(t *testing.T) {
	h := NewHandlers(slog.New(slog.NewTextHandler(io.Discard, nil)), nil, nil)
	req := httptest.NewRequest(http.MethodHead, "https://demo.99rtp.io/", nil)
	rec := httptest.NewRecorder()

	h.RootLanding(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
}
