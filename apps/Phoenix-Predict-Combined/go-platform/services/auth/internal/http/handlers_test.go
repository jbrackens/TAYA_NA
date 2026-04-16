package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

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
