package http

import (
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
