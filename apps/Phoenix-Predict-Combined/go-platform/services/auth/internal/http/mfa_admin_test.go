package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"phoenix-revival/platform/transport/httpx"
)

func TestMFAAdminRequiredFromEnv(t *testing.T) {
	cases := []struct {
		name      string
		env       string
		raw       string
		required  bool
		wantFatal bool
	}{
		{"prod default on", "production", "", true, false},
		{"prod explicit true", "production", "true", true, false},
		{"prod false is fatal", "production", "false", false, true},
		{"staging false is fatal", "staging", "false", false, true},
		{"staging default on", "staging", "", true, false},
		{"dev default off", "development", "", false, false},
		{"dev opt-in", "development", "true", true, false},
		{"dev explicit off", "development", "false", false, false},
		{"empty env default off", "", "", false, false},
		{"case/space tolerant", "production", "  FALSE ", false, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			required, fatalMsg := mfaAdminRequiredFromEnv(tc.env, tc.raw)
			if (fatalMsg != "") != tc.wantFatal {
				t.Fatalf("fatalMsg=%q, wantFatal=%v", fatalMsg, tc.wantFatal)
			}
			if !tc.wantFatal && required != tc.required {
				t.Fatalf("required=%v, want %v", required, tc.required)
			}
		})
	}
}

func setupMFAAdminHarness(t *testing.T) http.Handler {
	t.Helper()
	t.Setenv("AUTH_DEMO_USERNAME", "demo@test.local")
	t.Setenv("AUTH_DEMO_PASSWORD", "PlayerPass123!")
	t.Setenv("AUTH_ADMIN_USERNAME", "admin@test.local")
	t.Setenv("AUTH_ADMIN_PASSWORD", "AdminPass123!")
	auth := NewAuthService()
	mux := http.NewServeMux()
	RegisterRoutes(mux, "auth", auth)
	return httpx.Chain(mux, httpx.NormalizeTrailingSlash("/api/", "/auth/"), httpx.RequestID(), httpx.Recovery(nil))
}

func postJSON(t *testing.T, handler http.Handler, path string, payload map[string]string, header map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	var body *bytes.Buffer
	if payload != nil {
		raw, _ := json.Marshal(payload)
		body = bytes.NewBuffer(raw)
	} else {
		body = bytes.NewBuffer(nil)
	}
	req := httptest.NewRequest(http.MethodPost, path, body)
	for k, v := range header {
		req.Header.Set(k, v)
	}
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	return res
}

// The full forced-enrollment journey: an un-enrolled admin's correct password
// yields no session but an enrollment token; the token drives enroll +
// activate; then password+OTP logs in and the token is dead.
func TestAdminLoginRequiresEnrollmentWhenFlagOn(t *testing.T) {
	t.Setenv("AUTH_MFA_REQUIRED_FOR_ADMINS", "true")
	handler := setupMFAAdminHarness(t)
	adminLogin := map[string]string{"username": "admin@test.local", "password": "AdminPass123!"}

	// 1. Password-only login is refused with an enrollment token.
	res := postJSON(t, handler, "/api/v1/auth/login", adminLogin, nil)
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for un-enrolled admin, got %d, body=%s", res.Code, res.Body.String())
	}
	var envelope struct {
		Error struct {
			Details struct {
				MFAEnrollmentRequired bool   `json:"mfaEnrollmentRequired"`
				EnrollmentToken       string `json:"enrollmentToken"`
			} `json:"details"`
		} `json:"error"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode 403 envelope: %v", err)
	}
	if !envelope.Error.Details.MFAEnrollmentRequired || envelope.Error.Details.EnrollmentToken == "" {
		t.Fatalf("expected enrollment token in details, got %s", res.Body.String())
	}
	token := envelope.Error.Details.EnrollmentToken

	// 2. Wrong password must NOT mint a token.
	badRes := postJSON(t, handler, "/api/v1/auth/login", map[string]string{"username": "admin@test.local", "password": "wrong"}, nil)
	if badRes.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for bad password, got %d", badRes.Code)
	}

	// 3. Enroll via the token (no session).
	tokenHeader := map[string]string{mfaEnrollTokenHeader: token}
	enrollRes := postJSON(t, handler, "/api/v1/auth/2fa/enroll", nil, tokenHeader)
	if enrollRes.Code != http.StatusOK {
		t.Fatalf("expected enroll 200 via token, got %d, body=%s", enrollRes.Code, enrollRes.Body.String())
	}
	var enrollPayload struct {
		Secret string `json:"secret"`
	}
	if err := json.Unmarshal(enrollRes.Body.Bytes(), &enrollPayload); err != nil || enrollPayload.Secret == "" {
		t.Fatalf("expected secret, err=%v body=%s", err, enrollRes.Body.String())
	}

	// 4. A garbage token is refused.
	garbageRes := postJSON(t, handler, "/api/v1/auth/2fa/enroll", nil, map[string]string{mfaEnrollTokenHeader: "mfa-enroll_bogus"})
	if garbageRes.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for bogus token, got %d", garbageRes.Code)
	}

	// 5. Activate with a valid TOTP code, via the same token.
	code, err := totpCode(enrollPayload.Secret, time.Now())
	if err != nil {
		t.Fatalf("totpCode: %v", err)
	}
	activateRes := postJSON(t, handler, "/api/v1/auth/2fa/activate", map[string]string{"code": code}, tokenHeader)
	if activateRes.Code != http.StatusOK {
		t.Fatalf("expected activate 200, got %d, body=%s", activateRes.Code, activateRes.Body.String())
	}

	// 6. The token was consumed: reusing it is refused.
	reuseRes := postJSON(t, handler, "/api/v1/auth/2fa/enroll", nil, tokenHeader)
	if reuseRes.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 reusing consumed token, got %d", reuseRes.Code)
	}

	// 7. Password alone still does not log in — now it demands the OTP.
	noOTPRes := postJSON(t, handler, "/api/v1/auth/login", adminLogin, nil)
	if noOTPRes.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without OTP after activation, got %d, body=%s", noOTPRes.Code, noOTPRes.Body.String())
	}

	// 8. Password + OTP completes login.
	loginCode, err := totpCode(enrollPayload.Secret, time.Now())
	if err != nil {
		t.Fatalf("totpCode: %v", err)
	}
	okRes := postJSON(t, handler, "/api/v1/auth/login", map[string]string{
		"username": "admin@test.local", "password": "AdminPass123!", "otp": loginCode,
	}, nil)
	if okRes.Code != http.StatusOK {
		t.Fatalf("expected 200 with OTP, got %d, body=%s", okRes.Code, okRes.Body.String())
	}

	// 8b. GAP-2: replaying the SAME OTP is rejected (single-use), even though
	// it is still within its validity window.
	replayRes := postJSON(t, handler, "/api/v1/auth/login", map[string]string{
		"username": "admin@test.local", "password": "AdminPass123!", "otp": loginCode,
	}, nil)
	if replayRes.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 replaying a used OTP, got %d, body=%s", replayRes.Code, replayRes.Body.String())
	}

	// 9. Players are untouched by admin enforcement.
	playerRes := postJSON(t, handler, "/api/v1/auth/login", map[string]string{"username": "demo@test.local", "password": "PlayerPass123!"}, nil)
	if playerRes.Code != http.StatusOK {
		t.Fatalf("expected player login 200, got %d, body=%s", playerRes.Code, playerRes.Body.String())
	}
}

func TestAdminLoginLegacyWhenFlagOff(t *testing.T) {
	// Dev default: no flag set → un-enrolled admins keep logging in.
	handler := setupMFAAdminHarness(t)
	res := postJSON(t, handler, "/api/v1/auth/login", map[string]string{"username": "admin@test.local", "password": "AdminPass123!"}, nil)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200 with enforcement off, got %d, body=%s", res.Code, res.Body.String())
	}
}

func TestEnrollTokenExpiryAndRotation(t *testing.T) {
	t.Setenv("AUTH_ADMIN_USERNAME", "admin@test.local")
	t.Setenv("AUTH_ADMIN_PASSWORD", "AdminPass123!")
	auth := NewAuthService()

	tok1, err := auth.mfaIssueEnrollToken("user-admin", "admin@test.local")
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if _, ok := auth.mfaLookupEnrollToken(tok1); !ok {
		t.Fatal("fresh token should resolve")
	}

	// A second issue for the same user drops the first.
	tok2, err := auth.mfaIssueEnrollToken("user-admin", "admin@test.local")
	if err != nil {
		t.Fatalf("re-issue: %v", err)
	}
	if _, ok := auth.mfaLookupEnrollToken(tok1); ok {
		t.Fatal("old token should be dropped on re-issue")
	}

	// Expired tokens do not resolve.
	auth.mu.Lock()
	rec := auth.mfaEnrollTokens[tok2]
	rec.Expires = time.Now().Add(-time.Second)
	auth.mfaEnrollTokens[tok2] = rec
	auth.mu.Unlock()
	if _, ok := auth.mfaLookupEnrollToken(tok2); ok {
		t.Fatal("expired token should not resolve")
	}
}

func TestOAuthSessionGateDeniesAdmins(t *testing.T) {
	t.Setenv("AUTH_ADMIN_USERNAME", "admin@test.local")
	t.Setenv("AUTH_ADMIN_PASSWORD", "AdminPass123!")
	auth := NewAuthService()

	if err := auth.oauthSessionGate("google", user{ID: "u-p", Role: rolePlayer}); err != nil {
		t.Fatalf("player should pass the gate, got %v", err)
	}
	err := auth.oauthSessionGate("google", user{ID: "u-a", Role: roleAdmin})
	if err == nil {
		t.Fatal("admin should be denied OAuth session")
	}
	appErr := httpx.FromError(err)
	if appErr.Status != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", appErr.Status)
	}
}
