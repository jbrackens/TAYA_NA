package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"phoenix-revival/platform/transport/httpx"
)

func TestRegisterAcceptsShortUsernameAndSevenCharacterPassword(t *testing.T) {
	auth := NewAuthService()
	mux := http.NewServeMux()
	RegisterRoutes(mux, "auth", auth)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	registerPayload, _ := json.Marshal(map[string]any{
		"username":                   "abc",
		"password":                   "Aa12345",
		"terms_accepted":             true,
		"terms_version":              "tiangge-launch-v1",
		"launch_disclosure_accepted": true,
		"launch_disclosure_version":  "points-no-cashout-v1",
	})
	registerReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBuffer(registerPayload))
	registerRes := httptest.NewRecorder()
	handler.ServeHTTP(registerRes, registerReq)

	if registerRes.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d, body=%s", registerRes.Code, registerRes.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(registerRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode register response: %v", err)
	}
	userID, _ := payload["userId"].(string)
	if userID == "" || payload["username"] != "abc" || payload["role"] != rolePlayer {
		t.Fatalf("unexpected register response: %#v", payload)
	}
	if payload["termsAccepted"] != true || payload["termsVersion"] != "tiangge-launch-v1" {
		t.Fatalf("expected persisted terms acceptance in register response: %#v", payload)
	}
	if payload["launchDisclosureAccepted"] != true || payload["launchDisclosureVersion"] != "points-no-cashout-v1" {
		t.Fatalf("expected persisted launch disclosure in register response: %#v", payload)
	}
	if payload["termsAcceptedAt"] == "" || payload["launchDisclosureAcceptedAt"] == "" {
		t.Fatalf("expected acceptance timestamps in register response: %#v", payload)
	}
}

func TestRegisterRequiresTianggeDisclosureAcceptance(t *testing.T) {
	auth := NewAuthService()
	mux := http.NewServeMux()
	RegisterRoutes(mux, "auth", auth)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	registerPayload, _ := json.Marshal(map[string]any{
		"username":       "nodisclosure",
		"password":       "Aa12345",
		"terms_accepted": true,
	})
	registerReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBuffer(registerPayload))
	registerRes := httptest.NewRecorder()
	handler.ServeHTTP(registerRes, registerReq)

	if registerRes.Code != http.StatusBadRequest {
		t.Fatalf("expected register status 400, got %d, body=%s", registerRes.Code, registerRes.Body.String())
	}
	if !strings.Contains(registerRes.Body.String(), "no-cashout disclosure acceptance is required") {
		t.Fatalf("expected launch disclosure validation message, got %s", registerRes.Body.String())
	}
}

func TestRegisterRejectsSixCharacterPassword(t *testing.T) {
	auth := NewAuthService()
	mux := http.NewServeMux()
	RegisterRoutes(mux, "auth", auth)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	registerPayload, _ := json.Marshal(map[string]any{
		"username":                   "newuser",
		"password":                   "Aa1234",
		"terms_accepted":             true,
		"launch_disclosure_accepted": true,
	})
	registerReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBuffer(registerPayload))
	registerRes := httptest.NewRecorder()
	handler.ServeHTTP(registerRes, registerReq)

	if registerRes.Code != http.StatusBadRequest {
		t.Fatalf("expected register status 400, got %d, body=%s", registerRes.Code, registerRes.Body.String())
	}
	if !strings.Contains(registerRes.Body.String(), "at least 7 characters") {
		t.Fatalf("expected minimum-length validation message, got %s", registerRes.Body.String())
	}
}

func TestRegisterSessionIncludesTianggeDisclosureAcceptance(t *testing.T) {
	auth := NewAuthService()
	mux := http.NewServeMux()
	RegisterRoutes(mux, "auth", auth)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	registerPayload, _ := json.Marshal(map[string]any{
		"username":                 "accepteduser",
		"password":                 "Aa12345",
		"termsAccepted":            true,
		"termsVersion":             "tiangge-launch-v1",
		"launchDisclosureAccepted": true,
		"launchDisclosureVersion":  "points-no-cashout-v1",
	})
	registerReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBuffer(registerPayload))
	registerRes := httptest.NewRecorder()
	handler.ServeHTTP(registerRes, registerReq)
	if registerRes.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d, body=%s", registerRes.Code, registerRes.Body.String())
	}

	loginPayload, _ := json.Marshal(map[string]string{
		"username": "accepteduser",
		"password": "Aa12345",
	})
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(loginPayload))
	loginRes := httptest.NewRecorder()
	handler.ServeHTTP(loginRes, loginReq)
	if loginRes.Code != http.StatusOK {
		t.Fatalf("expected login status 200, got %d, body=%s", loginRes.Code, loginRes.Body.String())
	}
	var tokens tokenResponse
	if err := json.Unmarshal(loginRes.Body.Bytes(), &tokens); err != nil {
		t.Fatalf("decode login response: %v", err)
	}

	sessionReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/session", nil)
	sessionReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	sessionRes := httptest.NewRecorder()
	handler.ServeHTTP(sessionRes, sessionReq)
	if sessionRes.Code != http.StatusOK {
		t.Fatalf("expected session status 200, got %d, body=%s", sessionRes.Code, sessionRes.Body.String())
	}
	var sessionPayload map[string]any
	if err := json.Unmarshal(sessionRes.Body.Bytes(), &sessionPayload); err != nil {
		t.Fatalf("decode session response: %v", err)
	}
	if sessionPayload["termsAccepted"] != true || sessionPayload["termsVersion"] != "tiangge-launch-v1" {
		t.Fatalf("expected terms acceptance in session response: %#v", sessionPayload)
	}
	if sessionPayload["launchDisclosureAccepted"] != true || sessionPayload["launchDisclosureVersion"] != "points-no-cashout-v1" {
		t.Fatalf("expected launch disclosure in session response: %#v", sessionPayload)
	}
}

func TestLoginSessionAndMetricsFlow(t *testing.T) {
	t.Setenv("AUTH_DEMO_USERNAME", "demo@phoenix.local")
	t.Setenv("AUTH_DEMO_PASSWORD", "Password123!")

	auth := NewAuthService()
	mux := http.NewServeMux()
	RegisterRoutes(mux, "auth", auth)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	loginPayload, _ := json.Marshal(map[string]string{
		"username": "demo@phoenix.local",
		"password": "Password123!",
	})
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(loginPayload))
	loginRes := httptest.NewRecorder()
	handler.ServeHTTP(loginRes, loginReq)

	if loginRes.Code != http.StatusOK {
		t.Fatalf("expected login status 200, got %d, body=%s", loginRes.Code, loginRes.Body.String())
	}

	var tokens tokenResponse
	if err := json.Unmarshal(loginRes.Body.Bytes(), &tokens); err != nil {
		t.Fatalf("decode login response: %v", err)
	}
	if tokens.AccessToken == "" || tokens.RefreshToken == "" {
		t.Fatalf("expected non-empty tokens in login response")
	}

	sessionReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/session", nil)
	sessionReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	sessionRes := httptest.NewRecorder()
	handler.ServeHTTP(sessionRes, sessionReq)

	if sessionRes.Code != http.StatusOK {
		t.Fatalf("expected session status 200, got %d, body=%s", sessionRes.Code, sessionRes.Body.String())
	}

	metricsReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/metrics", nil)
	metricsRes := httptest.NewRecorder()
	handler.ServeHTTP(metricsRes, metricsReq)

	if metricsRes.Code != http.StatusOK {
		t.Fatalf("expected metrics status 200, got %d, body=%s", metricsRes.Code, metricsRes.Body.String())
	}

	var metrics metricsResponse
	if err := json.Unmarshal(metricsRes.Body.Bytes(), &metrics); err != nil {
		t.Fatalf("decode metrics response: %v", err)
	}
	if metrics.LoginSuccess != 1 {
		t.Fatalf("expected loginSuccess=1, got %d", metrics.LoginSuccess)
	}
	if metrics.SessionSuccess != 1 {
		t.Fatalf("expected sessionSuccess=1, got %d", metrics.SessionSuccess)
	}
}

func TestRefreshRotatesTokensAndRevokesOldRefreshToken(t *testing.T) {
	t.Setenv("AUTH_DEMO_USERNAME", "demo@phoenix.local")
	t.Setenv("AUTH_DEMO_PASSWORD", "Password123!")

	auth := NewAuthService()
	mux := http.NewServeMux()
	RegisterRoutes(mux, "auth", auth)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	loginPayload, _ := json.Marshal(map[string]string{
		"username": "demo@phoenix.local",
		"password": "Password123!",
	})
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(loginPayload))
	loginRes := httptest.NewRecorder()
	handler.ServeHTTP(loginRes, loginReq)
	if loginRes.Code != http.StatusOK {
		t.Fatalf("expected login status 200, got %d, body=%s", loginRes.Code, loginRes.Body.String())
	}

	var loginTokens tokenResponse
	if err := json.Unmarshal(loginRes.Body.Bytes(), &loginTokens); err != nil {
		t.Fatalf("decode login tokens: %v", err)
	}

	refreshPayload, _ := json.Marshal(map[string]string{"refreshToken": loginTokens.RefreshToken})
	refreshReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewBuffer(refreshPayload))
	refreshRes := httptest.NewRecorder()
	handler.ServeHTTP(refreshRes, refreshReq)
	if refreshRes.Code != http.StatusOK {
		t.Fatalf("expected refresh status 200, got %d, body=%s", refreshRes.Code, refreshRes.Body.String())
	}

	var refreshed tokenResponse
	if err := json.Unmarshal(refreshRes.Body.Bytes(), &refreshed); err != nil {
		t.Fatalf("decode refresh tokens: %v", err)
	}
	if refreshed.AccessToken == loginTokens.AccessToken {
		t.Fatalf("expected refreshed access token to be rotated")
	}
	if refreshed.RefreshToken == loginTokens.RefreshToken {
		t.Fatalf("expected refreshed refresh token to be rotated")
	}

	replayReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewBuffer(refreshPayload))
	replayRes := httptest.NewRecorder()
	handler.ServeHTTP(replayRes, replayReq)
	if replayRes.Code != http.StatusUnauthorized {
		t.Fatalf("expected reused refresh token to fail with 401, got %d", replayRes.Code)
	}
}

func TestLoginRejectsInvalidCredentials(t *testing.T) {
	t.Setenv("AUTH_DEMO_USERNAME", "demo@phoenix.local")
	t.Setenv("AUTH_DEMO_PASSWORD", "Password123!")

	auth := NewAuthService()
	mux := http.NewServeMux()
	RegisterRoutes(mux, "auth", auth)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	loginPayload, _ := json.Marshal(map[string]string{
		"username": "demo@phoenix.local",
		"password": "wrong-password",
	})
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(loginPayload))
	loginRes := httptest.NewRecorder()
	handler.ServeHTTP(loginRes, loginReq)

	if loginRes.Code != http.StatusUnauthorized {
		t.Fatalf("expected login status 401, got %d, body=%s", loginRes.Code, loginRes.Body.String())
	}

	metricsReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/metrics", nil)
	metricsRes := httptest.NewRecorder()
	handler.ServeHTTP(metricsRes, metricsReq)

	var metrics metricsResponse
	if err := json.Unmarshal(metricsRes.Body.Bytes(), &metrics); err != nil {
		t.Fatalf("decode metrics response: %v", err)
	}
	if metrics.LoginFailure != 1 {
		t.Fatalf("expected loginFailure=1, got %d", metrics.LoginFailure)
	}
}

func TestChangePasswordMFAEnrollmentAndLoginGate(t *testing.T) {
	t.Setenv("AUTH_DEMO_USERNAME", "demo@phoenix.local")
	t.Setenv("AUTH_DEMO_PASSWORD", "Password123!")

	auth := NewAuthService()
	mux := http.NewServeMux()
	RegisterRoutes(mux, "auth", auth)
	handler := httpx.Chain(mux, httpx.NormalizeTrailingSlash("/api/", "/auth/"), httpx.RequestID(), httpx.Recovery(nil))

	loginPayload, _ := json.Marshal(map[string]string{
		"username": "demo@phoenix.local",
		"password": "Password123!",
	})
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(loginPayload))
	loginRes := httptest.NewRecorder()
	handler.ServeHTTP(loginRes, loginReq)
	if loginRes.Code != http.StatusOK {
		t.Fatalf("expected login status 200, got %d, body=%s", loginRes.Code, loginRes.Body.String())
	}

	var tokens tokenResponse
	if err := json.Unmarshal(loginRes.Body.Bytes(), &tokens); err != nil {
		t.Fatalf("decode login response: %v", err)
	}

	changePayload, _ := json.Marshal(map[string]string{
		"user_id":          "u-1",
		"current_password": "Password123!",
		"new_password":     "UpdatedPassword123",
	})
	changeReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/change-password/", bytes.NewBuffer(changePayload))
	changeReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	changeRes := httptest.NewRecorder()
	handler.ServeHTTP(changeRes, changeReq)
	if changeRes.Code != http.StatusOK {
		t.Fatalf("expected change-password status 200, got %d, body=%s", changeRes.Code, changeRes.Body.String())
	}

	oldLoginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(loginPayload))
	oldLoginRes := httptest.NewRecorder()
	handler.ServeHTTP(oldLoginRes, oldLoginReq)
	if oldLoginRes.Code != http.StatusUnauthorized {
		t.Fatalf("expected old password login to fail, got %d", oldLoginRes.Code)
	}

	newLoginPayload, _ := json.Marshal(map[string]string{
		"username": "demo@phoenix.local",
		"password": "UpdatedPassword123",
	})
	newLoginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(newLoginPayload))
	newLoginRes := httptest.NewRecorder()
	handler.ServeHTTP(newLoginRes, newLoginReq)
	if newLoginRes.Code != http.StatusOK {
		t.Fatalf("expected new password login to succeed, got %d, body=%s", newLoginRes.Code, newLoginRes.Body.String())
	}

	var refreshedTokens tokenResponse
	if err := json.Unmarshal(newLoginRes.Body.Bytes(), &refreshedTokens); err != nil {
		t.Fatalf("decode refreshed login response: %v", err)
	}

	// ── Real MFA enrollment (TOTP), replacing the former toggle stub ──
	enrollReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/2fa/enroll", nil)
	enrollReq.Header.Set("Authorization", "Bearer "+refreshedTokens.AccessToken)
	enrollRes := httptest.NewRecorder()
	handler.ServeHTTP(enrollRes, enrollReq)
	if enrollRes.Code != http.StatusOK {
		t.Fatalf("expected 2fa enroll status 200, got %d, body=%s", enrollRes.Code, enrollRes.Body.String())
	}
	var enrollPayload struct {
		Secret     string `json:"secret"`
		OtpauthURI string `json:"otpauthUri"`
	}
	if err := json.Unmarshal(enrollRes.Body.Bytes(), &enrollPayload); err != nil {
		t.Fatalf("decode enroll payload: %v", err)
	}
	if enrollPayload.Secret == "" || enrollPayload.OtpauthURI == "" {
		t.Fatalf("expected secret + otpauthUri, got %#v", enrollPayload)
	}

	activateCode, err := totpCode(enrollPayload.Secret, time.Now())
	if err != nil {
		t.Fatalf("totpCode: %v", err)
	}
	activateBody, _ := json.Marshal(map[string]string{"code": activateCode})
	activateReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/2fa/activate", bytes.NewBuffer(activateBody))
	activateReq.Header.Set("Authorization", "Bearer "+refreshedTokens.AccessToken)
	activateRes := httptest.NewRecorder()
	handler.ServeHTTP(activateRes, activateReq)
	if activateRes.Code != http.StatusOK {
		t.Fatalf("expected 2fa activate status 200, got %d, body=%s", activateRes.Code, activateRes.Body.String())
	}

	statusReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/2fa/status", nil)
	statusReq.Header.Set("Authorization", "Bearer "+refreshedTokens.AccessToken)
	statusRes := httptest.NewRecorder()
	handler.ServeHTTP(statusRes, statusReq)
	if statusRes.Code != http.StatusOK {
		t.Fatalf("expected 2fa status 200, got %d, body=%s", statusRes.Code, statusRes.Body.String())
	}
	var statusPayload map[string]any
	if err := json.Unmarshal(statusRes.Body.Bytes(), &statusPayload); err != nil {
		t.Fatalf("decode status payload: %v", err)
	}
	if active, _ := statusPayload["active"].(bool); !active {
		t.Fatalf("expected active=true after activation, got %#v", statusPayload)
	}

	// ── Login is now gated by the active second factor ──
	gatedLoginPayload, _ := json.Marshal(map[string]string{
		"username": "demo@phoenix.local",
		"password": "UpdatedPassword123",
	})
	gatedReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(gatedLoginPayload))
	gatedRes := httptest.NewRecorder()
	handler.ServeHTTP(gatedRes, gatedReq)
	if gatedRes.Code != http.StatusUnauthorized {
		t.Fatalf("expected login without OTP to be rejected (401), got %d, body=%s", gatedRes.Code, gatedRes.Body.String())
	}

	otp, err := totpCode(enrollPayload.Secret, time.Now())
	if err != nil {
		t.Fatalf("totpCode: %v", err)
	}
	mfaLoginPayload, _ := json.Marshal(map[string]string{
		"username": "demo@phoenix.local",
		"password": "UpdatedPassword123",
		"otp":      otp,
	})
	mfaReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(mfaLoginPayload))
	mfaRes := httptest.NewRecorder()
	handler.ServeHTTP(mfaRes, mfaReq)
	if mfaRes.Code != http.StatusOK {
		t.Fatalf("expected login with valid OTP to succeed, got %d, body=%s", mfaRes.Code, mfaRes.Body.String())
	}
}
