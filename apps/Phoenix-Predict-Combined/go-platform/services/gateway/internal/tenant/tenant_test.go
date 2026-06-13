package tenant

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestFromDefaultsWhenUnset(t *testing.T) {
	if got := From(context.Background()); got != Default {
		t.Fatalf("From(empty ctx) = %q, want %q", got, Default)
	}
}

func TestWithAndFromRoundTrip(t *testing.T) {
	ctx := With(context.Background(), "acme")
	if got := From(ctx); got != "acme" {
		t.Fatalf("From = %q, want acme", got)
	}
	// Empty id falls back to Default (never propagate an unscoped tenant).
	if got := From(With(context.Background(), "")); got != Default {
		t.Fatalf("With(\"\") then From = %q, want %q", got, Default)
	}
}

func TestMiddlewareSetsTenantOnContext(t *testing.T) {
	var seen string
	h := Middleware(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		seen = From(r.Context())
	}))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
	if seen != Default {
		t.Fatalf("handler saw tenant %q, want %q", seen, Default)
	}
}
