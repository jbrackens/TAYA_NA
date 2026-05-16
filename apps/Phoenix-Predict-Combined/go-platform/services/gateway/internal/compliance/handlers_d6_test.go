package compliance

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

// D-6: the RG self-service mutation handlers historically trusted a body
// `userId`, so any authenticated user could set another user's limits /
// cool-off / (irreversible) self-exclusion by guessing their deterministic
// userID. They must now bind the mutation to the authenticated session.
func TestRGMutations_SessionBound(t *testing.T) {
	newStack := func() *http.ServeMux {
		mux := http.NewServeMux()
		registerResponsibleGamblingRoutes(mux, NewMockResponsibleGamblingService())
		return mux
	}
	post := func(mux *http.ServeMux, path, body string, sessionUID string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		if sessionUID != "" {
			req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		}
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}
	excluded := func(mux *http.ServeMux, uid string) bool {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/compliance/rg/restrictions?userId="+uid, nil)
		req = req.WithContext(httpx.WithTestUser(context.Background(), uid, uid, "player"))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		var out struct {
			Restrictions struct {
				IsExcluded bool `json:"isExcluded"`
			} `json:"restrictions"`
		}
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		return out.Restrictions.IsExcluded
	}

	t.Run("self-exclude cross-user is forbidden and has no effect", func(t *testing.T) {
		mux := newStack()
		// Attacker session tries to self-exclude an unrelated victim.
		rec := post(mux, "/api/v1/compliance/rg/self-exclude",
			`{"userId":"u-victim","permanent":true}`, "u-attacker")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("cross-user self-exclude must be 403, got %d (%s)", rec.Code, rec.Body.String())
		}
		if !strings.Contains(rec.Body.String(), "cannot modify another user's") {
			t.Fatalf("expected ownership rejection, got %s", rec.Body.String())
		}
		if excluded(mux, "u-victim") {
			t.Fatal("victim must NOT be self-excluded by another user (irreversible griefing)")
		}
	})

	t.Run("self-exclude for own session succeeds", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/rg/self-exclude",
			`{"userId":"u-self","permanent":false}`, "u-self")
		if rec.Code != http.StatusCreated {
			t.Fatalf("self self-exclude must be 201, got %d (%s)", rec.Code, rec.Body.String())
		}
		if !excluded(mux, "u-self") {
			t.Fatal("own self-exclusion must take effect")
		}
	})

	t.Run("cool-off for own session succeeds and reflects the session userId", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/rg/cool-off",
			`{"userId":"u-self","durationHours":24}`, "u-self")
		if rec.Code != http.StatusCreated {
			t.Fatalf("self cool-off must be 201, got %d (%s)", rec.Code, rec.Body.String())
		}
		if !strings.Contains(rec.Body.String(), `"userId":"u-self"`) {
			t.Fatalf("response must reflect the session userId, got %s", rec.Body.String())
		}
	})

	t.Run("unauthenticated context is forbidden", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/rg/bet-limit",
			`{"userId":"u-x","period":"daily","amountCents":500}`, "")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("no session must be 403, got %d (%s)", rec.Code, rec.Body.String())
		}
	})

	t.Run("bet-limit cross-user is forbidden", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/rg/bet-limit",
			`{"userId":"u-victim","period":"daily","amountCents":1}`, "u-attacker")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("cross-user bet-limit must be 403, got %d (%s)", rec.Code, rec.Body.String())
		}
	})
}
