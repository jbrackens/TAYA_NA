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
		if !strings.Contains(rec.Body.String(), "cannot access another user's") {
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

// LC-22 / D-6 parity: the KYC verify + submit-document mutations also took a
// body userId. Now that the player UI drives a real verification flow, an
// attacker must not be able to verify/submit on another user's behalf.
func TestKYCMutations_SessionBound(t *testing.T) {
	newStack := func() *http.ServeMux {
		mux := http.NewServeMux()
		registerKYCRoutes(mux, NewMockKYCService())
		return mux
	}
	post := func(mux *http.ServeMux, path, body, sessionUID string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		if sessionUID != "" {
			req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		}
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}
	status := func(mux *http.ServeMux, uid string) string {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/compliance/kyc/status?userId="+uid, nil)
		req = req.WithContext(httpx.WithTestUser(context.Background(), uid, uid, "player"))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		var out struct {
			Status struct {
				Status string `json:"status"`
			} `json:"status"`
		}
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		return out.Status.Status
	}

	t.Run("cross-user verify is forbidden, victim stays unverified", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/kyc/verify",
			`{"userId":"u-victim","documents":[{"type":"passport"}]}`, "u-attacker")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("cross-user kyc/verify must be 403, got %d (%s)", rec.Code, rec.Body.String())
		}
		if s := status(mux, "u-victim"); s != "unverified" {
			t.Fatalf("victim must remain unverified, got %q", s)
		}
	})

	t.Run("self verify succeeds", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/kyc/verify",
			`{"userId":"u-self","documents":[{"type":"passport"}]}`, "u-self")
		if rec.Code != http.StatusOK {
			t.Fatalf("self kyc/verify must be 200, got %d (%s)", rec.Code, rec.Body.String())
		}
		if s := status(mux, "u-self"); s != "approved" {
			t.Fatalf("self verify must approve (mock), got %q", s)
		}
	})

	t.Run("cross-user submit-document is forbidden", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/kyc/submit-document",
			`{"userId":"u-victim","type":"passport"}`, "u-attacker")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("cross-user submit-document must be 403, got %d (%s)", rec.Code, rec.Body.String())
		}
	})

	t.Run("unauthenticated verify is forbidden", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/kyc/verify",
			`{"userId":"u-x","documents":[{"type":"passport"}]}`, "")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("no-session kyc/verify must be 403, got %d (%s)", rec.Code, rec.Body.String())
		}
	})
}

// GET-disclosure residual (2026-05-17): the RG/KYC *read* endpoints
// historically trusted an arbitrary ?userId=, so any authenticated user
// could enumerate another user's compliance state (limits + usage, KYC
// status/documents, restrictions). They must now be session-bound like the
// D-6 mutations: a mismatched ?userId= is 403 with no data; an absent one
// defaults to the session user; no session is 403.
func TestRGKYCReads_SessionBound(t *testing.T) {
	get := func(mux *http.ServeMux, path, sessionUID string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		if sessionUID != "" {
			req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		}
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}

	rgMux := func() *http.ServeMux {
		mux := http.NewServeMux()
		registerResponsibleGamblingRoutes(mux, NewMockResponsibleGamblingService())
		return mux
	}
	kycMux := func() *http.ServeMux {
		mux := http.NewServeMux()
		registerKYCRoutes(mux, NewMockKYCService())
		return mux
	}

	// path is split into base + the extra required params so the
	// cross-user case can omit them and still prove the ownership check
	// runs BEFORE param validation.
	cases := []struct {
		name        string
		mux         func() *http.ServeMux
		base, extra string
	}{
		{"rg/restrictions", rgMux, "/api/v1/compliance/rg/restrictions", ""},
		{"rg/bet-limits", rgMux, "/api/v1/compliance/rg/bet-limits", ""},
		{"rg/deposit-limits", rgMux, "/api/v1/compliance/rg/deposit-limits", ""},
		{"rg/check-bet", rgMux, "/api/v1/compliance/rg/check-bet", "&stakeCents=100"},
		{"rg/check-deposit", rgMux, "/api/v1/compliance/rg/check-deposit", "&amountCents=100"},
		{"kyc/status", kycMux, "/api/v1/compliance/kyc/status", ""},
		{"kyc/documents", kycMux, "/api/v1/compliance/kyc/documents", ""},
	}

	for _, tc := range cases {
		t.Run(tc.name+" cross-user is forbidden and leaks nothing", func(t *testing.T) {
			mux := tc.mux()
			rec := get(mux, tc.base+"?userId=u-victim"+tc.extra, "u-attacker")
			if rec.Code != http.StatusForbidden {
				t.Fatalf("cross-user read must be 403, got %d (%s)", rec.Code, rec.Body.String())
			}
			if !strings.Contains(rec.Body.String(), "cannot access another user's") {
				t.Fatalf("expected ownership rejection, got %s", rec.Body.String())
			}
			// A 200 response echoes "userId":"u-victim"; a correct 403
			// must not carry the victim id back at all.
			if strings.Contains(rec.Body.String(), "u-victim") {
				t.Fatalf("403 body must not echo the victim userId: %s", rec.Body.String())
			}
		})

		t.Run(tc.name+" own session succeeds", func(t *testing.T) {
			mux := tc.mux()
			rec := get(mux, tc.base+"?userId=u-self"+tc.extra, "u-self")
			if rec.Code != http.StatusOK {
				t.Fatalf("own read must be 200, got %d (%s)", rec.Code, rec.Body.String())
			}
		})

		t.Run(tc.name+" absent userId defaults to session", func(t *testing.T) {
			mux := tc.mux()
			q := ""
			if tc.extra != "" {
				q = "?" + tc.extra[1:] // drop the leading '&'
			}
			rec := get(mux, tc.base+q, "u-self")
			if rec.Code != http.StatusOK {
				t.Fatalf("absent-userId read must be 200 (session user), got %d (%s)", rec.Code, rec.Body.String())
			}
		})

		t.Run(tc.name+" unauthenticated is forbidden", func(t *testing.T) {
			mux := tc.mux()
			rec := get(mux, tc.base+"?userId=u-x"+tc.extra, "")
			if rec.Code != http.StatusForbidden {
				t.Fatalf("no-session read must be 403, got %d (%s)", rec.Code, rec.Body.String())
			}
		})
	}
}
