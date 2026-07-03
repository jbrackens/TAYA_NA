package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/platform/transport/httpx"
)

func adminPost(handler http.Handler, path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-kyc", "admin-kyc@tiangge.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	return res
}

// P0-4 slice 3: an approval blocked by unresolved screening surfaces as a
// state conflict (409), not a generic 400.
func TestKYCDecisionBlockedByScreeningIs409(t *testing.T) {
	for _, sentinel := range []error{compliance.ErrScreeningUnresolved, compliance.ErrIdentityRequired} {
		store := &stubKYCAdminStore{decisionErr: sentinel}
		handler := newKYCReviewHarness(store)
		res := adminPost(handler, "/api/v1/admin/kyc/decision", `{"userId":"u-1","approve":true}`)
		if res.Code != http.StatusConflict {
			t.Fatalf("%v: expected 409, got %d body=%s", sentinel, res.Code, res.Body.String())
		}
	}
}

func TestKYCScreeningReviewHappyPath(t *testing.T) {
	store := &stubKYCAdminStore{
		reviewPrev: string(compliance.PersonScreeningPotentialMatch),
		identity: &compliance.KYCIdentity{
			UserID: "u-1", FullName: "Jane Doe",
			ScreeningStatus: compliance.ScreeningClearedByReview,
		},
	}
	handler := newKYCReviewHarness(store)
	res := adminPost(handler, "/api/v1/admin/kyc/screening-review",
		`{"userId":"u-1","outcome":"cleared","reason":"name collision with listed person, DOB mismatch"}`)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if store.gotReviewUID != "u-1" || store.gotOutcome != "cleared" {
		t.Fatalf("review not plumbed: uid=%s outcome=%s", store.gotReviewUID, store.gotOutcome)
	}
	// Audited with previous status + reason.
	found := false
	for _, e := range providerOpsAuditSnapshot() {
		if e.Action == "kyc.screening_reviewed" && e.TargetID == "u-1" &&
			strings.Contains(e.Details, `"outcome":"cleared"`) &&
			strings.Contains(e.Details, `"previous":"potential_match"`) &&
			strings.Contains(e.Details, "DOB mismatch") {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("kyc.screening_reviewed audit entry with outcome/previous/reason not recorded")
	}
}

func TestKYCScreeningReviewValidation(t *testing.T) {
	cases := []struct {
		name string
		body string
		want int
	}{
		{"bad outcome", `{"userId":"u-1","outcome":"maybe","reason":"r"}`, http.StatusBadRequest},
		{"missing reason", `{"userId":"u-1","outcome":"cleared"}`, http.StatusBadRequest},
		{"missing userId", `{"outcome":"cleared","reason":"r"}`, http.StatusBadRequest},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			store := &stubKYCAdminStore{}
			handler := newKYCReviewHarness(store)
			res := adminPost(handler, "/api/v1/admin/kyc/screening-review", tc.body)
			if res.Code != tc.want {
				t.Fatalf("expected %d, got %d body=%s", tc.want, res.Code, res.Body.String())
			}
			if store.gotReviewUID != "" {
				t.Fatal("invalid request must not reach the store")
			}
		})
	}
}

func TestKYCScreeningReviewWithoutIdentityIs409(t *testing.T) {
	store := &stubKYCAdminStore{reviewErr: compliance.ErrIdentityRequired}
	handler := newKYCReviewHarness(store)
	res := adminPost(handler, "/api/v1/admin/kyc/screening-review",
		`{"userId":"u-9","outcome":"cleared","reason":"n/a"}`)
	if res.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestKYCScreeningReviewRejectsNonAdmins(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	handler := newKYCReviewHarness(&stubKYCAdminStore{})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/kyc/screening-review",
		strings.NewReader(`{"userId":"u-1","outcome":"cleared","reason":"r"}`))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized && res.Code != http.StatusForbidden {
		t.Fatalf("expected 401/403 for anonymous caller, got %d", res.Code)
	}
}

// The user detail now carries the identity + verdict for reviewers.
func TestKYCUserDetailIncludesIdentity(t *testing.T) {
	store := &stubKYCAdminStore{identity: &compliance.KYCIdentity{
		UserID: "u-1", FullName: "Jane Doe", ScreeningStatus: string(compliance.PersonScreeningHit),
	}}
	handler := newKYCReviewHarness(store)
	res := adminGet(handler, "/api/v1/admin/kyc/users/u-1")
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.Code)
	}
	body := res.Body.String()
	if !strings.Contains(body, `"identity"`) || !strings.Contains(body, `"screeningStatus":"hit"`) {
		t.Fatalf("detail missing identity/verdict: %s", body)
	}
}
