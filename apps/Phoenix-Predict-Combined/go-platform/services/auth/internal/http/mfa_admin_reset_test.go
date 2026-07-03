package http

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// TestMFAAdminResetEndpoint (GAP-15) exercises the fail-closed internal MFA-reset
// endpoint: inert without AUTH_INTERNAL_SECRET, 403 on a wrong secret, and a
// successful reset clears an active factor (idempotently) without needing the
// user's OTP — the lost-device recovery path. Memory mode (no DB required).
func TestMFAAdminResetEndpoint(t *testing.T) {
	auth := NewAuthService()
	mux := http.NewServeMux()
	RegisterRoutes(mux, "auth", auth)

	const target = "locked-out-user"
	seedActiveFactor := func() {
		now := time.Now().UTC()
		auth.mu.Lock()
		auth.mfaMem[target] = &mfaRecord{Secret: "SEEDSECRET23456", ActivatedAt: &now}
		auth.mu.Unlock()
	}
	seedActiveFactor()

	post := func(secretHeader, bodyJSON string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(http.MethodPost, "/api/v1/auth/internal/mfa/reset", bytes.NewBufferString(bodyJSON))
		if secretHeader != "" {
			r.Header.Set("X-Internal-Auth", secretHeader)
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}

	// 1. No AUTH_INTERNAL_SECRET -> endpoint inert (404); factor untouched.
	t.Setenv("AUTH_INTERNAL_SECRET", "")
	if w := post("anything", `{"userId":"`+target+`"}`); w.Code != http.StatusNotFound {
		t.Fatalf("unset secret: want 404, got %d", w.Code)
	}
	if enrolled, _, _ := auth.mfaStatus(target); !enrolled {
		t.Fatal("factor must be untouched while the endpoint is inert")
	}

	// 2. Secret set, wrong header -> 403; factor untouched.
	t.Setenv("AUTH_INTERNAL_SECRET", "s3cr3t-internal")
	if w := post("wrong", `{"userId":"`+target+`"}`); w.Code != http.StatusForbidden {
		t.Fatalf("wrong secret: want 403, got %d", w.Code)
	}
	if enrolled, _, _ := auth.mfaStatus(target); !enrolled {
		t.Fatal("factor must be untouched on a rejected call")
	}

	// 3. Correct secret -> 200; factor cleared (no OTP required).
	if w := post("s3cr3t-internal", `{"userId":"`+target+`","resetBy":"admin-7"}`); w.Code != http.StatusOK {
		t.Fatalf("valid reset: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	if enrolled, active, _ := auth.mfaStatus(target); enrolled || active {
		t.Fatalf("factor must be cleared after reset (enrolled=%v active=%v)", enrolled, active)
	}

	// 4. Idempotent: resetting again (no factor present) still succeeds.
	if w := post("s3cr3t-internal", `{"userId":"`+target+`"}`); w.Code != http.StatusOK {
		t.Fatalf("idempotent reset: want 200, got %d", w.Code)
	}

	// 5. Missing userId -> 400.
	if w := post("s3cr3t-internal", `{}`); w.Code != http.StatusBadRequest {
		t.Fatalf("missing userId: want 400, got %d", w.Code)
	}

	// 6. Non-POST -> 405.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/internal/mfa/reset", nil)
	req.Header.Set("X-Internal-Auth", "s3cr3t-internal")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET: want 405, got %d", w.Code)
	}
}
