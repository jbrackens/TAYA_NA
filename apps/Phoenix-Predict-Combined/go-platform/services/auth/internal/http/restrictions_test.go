package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

// GAP-10 harness: a player + admin seeded in-memory, with the restriction
// lookup injectable per test.
func setupRestrictionHarness(t *testing.T) (*AuthService, http.Handler) {
	t.Helper()
	t.Setenv("AUTH_DEMO_USERNAME", "player@test.local")
	t.Setenv("AUTH_DEMO_PASSWORD", "PlayerPass123!")
	t.Setenv("AUTH_ADMIN_USERNAME", "admin@test.local")
	t.Setenv("AUTH_ADMIN_PASSWORD", "AdminPass123!")
	auth := NewAuthService()
	mux := http.NewServeMux()
	RegisterRoutes(mux, "auth", auth)
	return auth, httpx.Chain(mux, httpx.NormalizeTrailingSlash("/api/", "/auth/"), httpx.RequestID(), httpx.Recovery(nil))
}

// A restricted player presenting CORRECT credentials is refused a session.
func TestLoginBlockedForRestrictedPlayer(t *testing.T) {
	for _, reason := range []string{"self_excluded", "blocked", "status_suspended", "status_deactivated"} {
		t.Run(reason, func(t *testing.T) {
			auth, handler := setupRestrictionHarness(t)
			auth.restrictionLookup = func(string) (string, error) { return reason, nil }
			res := postJSON(t, handler, "/api/v1/auth/login",
				map[string]string{"username": "player@test.local", "password": "PlayerPass123!"}, nil)
			if res.Code != http.StatusForbidden {
				t.Fatalf("expected 403 for %s, got %d body=%s", reason, res.Code, res.Body.String())
			}
		})
	}
}

func TestLoginAllowedForUnrestrictedPlayer(t *testing.T) {
	auth, handler := setupRestrictionHarness(t)
	called := false
	auth.restrictionLookup = func(string) (string, error) { called = true; return "", nil }
	res := postJSON(t, handler, "/api/v1/auth/login",
		map[string]string{"username": "player@test.local", "password": "PlayerPass123!"}, nil)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if !called {
		t.Fatal("restriction lookup must run for player logins")
	}
}

// Admin logins never consult the player restriction lookup — staff standing
// is enforced by admin_users.status / auth_users role handling.
func TestLoginAdminSkipsRestrictionLookup(t *testing.T) {
	auth, handler := setupRestrictionHarness(t)
	auth.restrictionLookup = func(string) (string, error) {
		t.Fatal("restriction lookup must not run for admin logins")
		return "", nil
	}
	res := postJSON(t, handler, "/api/v1/auth/login",
		map[string]string{"username": "admin@test.local", "password": "AdminPass123!"}, nil)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200 admin login, got %d body=%s", res.Code, res.Body.String())
	}
}

// A lookup outage must fail CLOSED in deployed environments — an outage can
// never silently disable an exclusion — and open in development.
func TestLoginRestrictionLookupErrorFailsClosedWhenDeployed(t *testing.T) {
	cases := []struct {
		env      string
		wantCode int
	}{
		{"production", http.StatusInternalServerError},
		{"staging", http.StatusInternalServerError},
		{"prod", http.StatusInternalServerError}, // non-canonical deployed value (GAP-4 posture)
		{"development", http.StatusOK},
		{"", http.StatusOK},
	}
	for _, tc := range cases {
		t.Run("env="+tc.env, func(t *testing.T) {
			auth, handler := setupRestrictionHarness(t)
			t.Setenv("ENVIRONMENT", tc.env)
			auth.restrictionLookup = func(string) (string, error) { return "", errors.New("db down") }
			res := postJSON(t, handler, "/api/v1/auth/login",
				map[string]string{"username": "player@test.local", "password": "PlayerPass123!"}, nil)
			if res.Code != tc.wantCode {
				t.Fatalf("env %q: expected %d, got %d body=%s", tc.env, tc.wantCode, res.Code, res.Body.String())
			}
		})
	}
}

// Wrong credentials stay 401 regardless of restriction state: the gate runs
// only after authentication so it leaks nothing about account standing.
func TestLoginRestrictionNotLeakedToBadCredentials(t *testing.T) {
	auth, handler := setupRestrictionHarness(t)
	auth.restrictionLookup = func(string) (string, error) {
		t.Fatal("restriction lookup must not run for failed authentication")
		return "", nil
	}
	res := postJSON(t, handler, "/api/v1/auth/login",
		map[string]string{"username": "player@test.local", "password": "WrongPass!"}, nil)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", res.Code)
	}
}

// GAP-10 verification #6 fix: a restriction that lands AFTER login must take
// effect on the next refresh, and the denied refresh token is terminated.
func TestRefreshRestrictedPlayerDenied(t *testing.T) {
	auth, handler := setupRestrictionHarness(t)
	// Log in while unrestricted to obtain a refresh token.
	auth.restrictionLookup = func(string) (string, error) { return "", nil }
	loginRes := postJSON(t, handler, "/api/v1/auth/login",
		map[string]string{"username": "player@test.local", "password": "PlayerPass123!"}, nil)
	if loginRes.Code != http.StatusOK {
		t.Fatalf("login: expected 200, got %d body=%s", loginRes.Code, loginRes.Body.String())
	}
	var tokens tokenResponse
	if err := json.Unmarshal(loginRes.Body.Bytes(), &tokens); err != nil {
		t.Fatalf("decode tokens: %v", err)
	}

	// The player is now self-excluded — the next refresh must be refused.
	auth.restrictionLookup = func(string) (string, error) { return "self_excluded", nil }
	refreshRes := postJSON(t, handler, "/api/v1/auth/refresh",
		map[string]string{"refreshToken": tokens.RefreshToken}, nil)
	if refreshRes.Code != http.StatusForbidden {
		t.Fatalf("restricted refresh: expected 403, got %d body=%s", refreshRes.Code, refreshRes.Body.String())
	}
	// The refresh chain is terminated: reusing the same token fails as
	// invalid, not merely restricted.
	reuse := postJSON(t, handler, "/api/v1/auth/refresh",
		map[string]string{"refreshToken": tokens.RefreshToken}, nil)
	if reuse.Code != http.StatusUnauthorized {
		t.Fatalf("reused terminated token: expected 401, got %d body=%s", reuse.Code, reuse.Body.String())
	}
}

func TestRefreshAllowedForUnrestrictedPlayer(t *testing.T) {
	auth, handler := setupRestrictionHarness(t)
	auth.restrictionLookup = func(string) (string, error) { return "", nil }
	loginRes := postJSON(t, handler, "/api/v1/auth/login",
		map[string]string{"username": "player@test.local", "password": "PlayerPass123!"}, nil)
	var tokens tokenResponse
	_ = json.Unmarshal(loginRes.Body.Bytes(), &tokens)
	refreshRes := postJSON(t, handler, "/api/v1/auth/refresh",
		map[string]string{"refreshToken": tokens.RefreshToken}, nil)
	if refreshRes.Code != http.StatusOK {
		t.Fatalf("unrestricted refresh: expected 200, got %d body=%s", refreshRes.Code, refreshRes.Body.String())
	}
}

func TestRefreshFailsClosedByEnvOnLookupError(t *testing.T) {
	auth, handler := setupRestrictionHarness(t)
	auth.restrictionLookup = func(string) (string, error) { return "", nil }
	loginRes := postJSON(t, handler, "/api/v1/auth/login",
		map[string]string{"username": "player@test.local", "password": "PlayerPass123!"}, nil)
	var tokens tokenResponse
	_ = json.Unmarshal(loginRes.Body.Bytes(), &tokens)

	t.Setenv("ENVIRONMENT", "production")
	auth.restrictionLookup = func(string) (string, error) { return "", errors.New("db down") }
	refreshRes := postJSON(t, handler, "/api/v1/auth/refresh",
		map[string]string{"refreshToken": tokens.RefreshToken}, nil)
	if refreshRes.Code != http.StatusInternalServerError {
		t.Fatalf("outage refresh in prod: expected 500, got %d body=%s", refreshRes.Code, refreshRes.Body.String())
	}
}

// GAP-10 verification #6 fix: the OAuth callback gate refuses restricted
// players (previously it only blocked admins).
func TestOAuthSessionGateRestriction(t *testing.T) {
	auth, _ := setupRestrictionHarness(t)
	player := user{ID: "u-oauth-1", Username: "p@test.local", Role: rolePlayer}

	t.Run("restricted denied", func(t *testing.T) {
		auth.restrictionLookup = func(string) (string, error) { return "self_excluded", nil }
		if err := auth.oauthSessionGate("google", player); err == nil {
			t.Fatal("restricted player must be refused an OAuth session")
		}
	})
	t.Run("unrestricted allowed", func(t *testing.T) {
		auth.restrictionLookup = func(string) (string, error) { return "", nil }
		if err := auth.oauthSessionGate("google", player); err != nil {
			t.Fatalf("unrestricted player must be allowed: %v", err)
		}
	})
	t.Run("outage fails closed when deployed", func(t *testing.T) {
		t.Setenv("ENVIRONMENT", "production")
		auth.restrictionLookup = func(string) (string, error) { return "", errors.New("db down") }
		if err := auth.oauthSessionGate("google", player); err == nil {
			t.Fatal("lookup outage in prod must fail closed")
		}
	})
	t.Run("admin still denied", func(t *testing.T) {
		auth.restrictionLookup = func(string) (string, error) { t.Fatal("admin must not reach restriction lookup"); return "", nil }
		admin := user{ID: "a-1", Username: "admin@test.local", Role: roleAdmin}
		if err := auth.oauthSessionGate("google", admin); err == nil {
			t.Fatal("admin must still be denied OAuth sessions")
		}
	})
}

func TestDeployedAuthEnvironment(t *testing.T) {
	for env, deployed := range map[string]bool{
		"":            false,
		"development": false,
		"dev":         false,
		"test":        false,
		"ci":          false,
		"production":  true,
		"staging":     true,
		"prod":        true,
		"preprod":     true,
		" Production": true,
	} {
		t.Run("env="+env, func(t *testing.T) {
			t.Setenv("ENVIRONMENT", env)
			if got := deployedAuthEnvironment(); got != deployed {
				t.Fatalf("env %q: deployed=%v, want %v", env, got, deployed)
			}
		})
	}
}
