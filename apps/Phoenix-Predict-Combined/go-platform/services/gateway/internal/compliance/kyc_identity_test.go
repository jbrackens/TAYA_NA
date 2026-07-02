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

// fakePersonScreener returns a canned result/error.
type fakePersonScreener struct {
	result PersonScreeningResult
	err    error
	called bool
}

func (f *fakePersonScreener) ScreenPerson(context.Context, SanctionsSubject) (PersonScreeningResult, error) {
	f.called = true
	return f.result, f.err
}

func identityRequest(t *testing.T, mux *http.ServeMux, sessionUID, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/compliance/kyc/identity", strings.NewReader(body))
	if sessionUID != "" {
		req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
	}
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)
	return res
}

// P0-4 slice 2: intake screens, persists the verdict, and NEVER discloses it
// to the subject (tipping-off guard).
func TestKYCIdentityIntakeScreensAndPersists(t *testing.T) {
	svc := NewMockKYCService()
	screener := &fakePersonScreener{result: PersonScreeningResult{
		Status: PersonScreeningHit, Score: 0.97, MatchIDs: []string{"Q-123"}, Provider: "yente",
	}}
	mux := http.NewServeMux()
	registerKYCRoutes(mux, svc, screener)

	res := identityRequest(t, mux, "u-1",
		`{"fullName":"Jane Doe","dateOfBirth":"1980-02-01","country":"ph"}`)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if !screener.called {
		t.Fatal("screener must run at intake")
	}
	// Tipping-off guard: no verdict material in the response.
	body := res.Body.String()
	for _, leak := range []string{"hit", "screening", "Q-123", "0.97", "yente"} {
		if strings.Contains(strings.ToLower(body), leak) {
			t.Fatalf("response leaks screening material (%q): %s", leak, body)
		}
	}
	stored, err := svc.GetIdentity(context.Background(), "u-1")
	if err != nil || stored == nil {
		t.Fatalf("identity not stored: %v %v", stored, err)
	}
	if stored.FullName != "Jane Doe" || stored.Country != "PH" || stored.DateOfBirth != "1980-02-01" {
		t.Fatalf("identity fields wrong: %+v", stored)
	}
	if stored.ScreeningStatus != string(PersonScreeningHit) || stored.ScreeningScore != 0.97 ||
		len(stored.ScreeningMatchIDs) != 1 || stored.ScreeningMatchIDs[0] != "Q-123" {
		t.Fatalf("verdict not persisted: %+v", stored)
	}
	if stored.ScreenedAt.IsZero() {
		t.Fatal("screenedAt must be set")
	}
}

// A screening outage persists the fail-closed verdict (unavailable), never
// clear — and intake still accepts the identity.
func TestKYCIdentityIntakeScreeningOutageFailsClosed(t *testing.T) {
	svc := NewMockKYCService()
	screener := &fakePersonScreener{
		result: PersonScreeningResult{Status: PersonScreeningUnavailable, Provider: "yente"},
		err:    context.DeadlineExceeded,
	}
	mux := http.NewServeMux()
	registerKYCRoutes(mux, svc, screener)

	res := identityRequest(t, mux, "u-2", `{"fullName":"John Roe"}`)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	stored, _ := svc.GetIdentity(context.Background(), "u-2")
	if stored == nil || stored.ScreeningStatus != string(PersonScreeningUnavailable) {
		t.Fatalf("outage must persist unavailable, got %+v", stored)
	}
}

// With screening explicitly off (nil screener) the identity stores as
// unscreened — which slice-3 enforcement treats as blocking, not clear.
func TestKYCIdentityIntakeNilScreenerStoresUnscreened(t *testing.T) {
	svc := NewMockKYCService()
	mux := http.NewServeMux()
	registerKYCRoutes(mux, svc, nil)

	res := identityRequest(t, mux, "u-3", `{"fullName":"Ann Poe"}`)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.Code)
	}
	stored, _ := svc.GetIdentity(context.Background(), "u-3")
	if stored == nil || stored.ScreeningStatus != "unscreened" {
		t.Fatalf("want unscreened, got %+v", stored)
	}
}

// The fail-closed KYC service does not implement the identity store: intake
// must refuse (503), not silently drop data.
func TestKYCIdentityIntakeUnavailableStoreRefuses(t *testing.T) {
	mux := http.NewServeMux()
	registerKYCRoutes(mux, NewFailClosedKYCService(), &fakePersonScreener{})

	res := identityRequest(t, mux, "u-4", `{"fullName":"Jane Doe"}`)
	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestKYCIdentityIntakeValidation(t *testing.T) {
	svc := NewMockKYCService()
	mux := http.NewServeMux()
	registerKYCRoutes(mux, svc, nil)

	cases := []struct {
		name string
		uid  string
		body string
		want int
	}{
		{"missing name", "u-5", `{"fullName":"  "}`, http.StatusBadRequest},
		{"name too long", "u-5", `{"fullName":"` + strings.Repeat("a", 201) + `"}`, http.StatusBadRequest},
		{"bad dob", "u-5", `{"fullName":"Jane","dateOfBirth":"01/02/1980"}`, http.StatusBadRequest},
		{"bad country", "u-5", `{"fullName":"Jane","country":"USA"}`, http.StatusBadRequest},
		{"cross-user", "u-5", `{"fullName":"Jane","userId":"someone-else"}`, http.StatusForbidden},
		{"unauthenticated", "", `{"fullName":"Jane"}`, http.StatusForbidden},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			res := identityRequest(t, mux, tc.uid, tc.body)
			if res.Code != tc.want {
				t.Fatalf("expected %d, got %d body=%s", tc.want, res.Code, res.Body.String())
			}
		})
	}
	if stored, _ := svc.GetIdentity(context.Background(), "u-5"); stored != nil {
		t.Fatalf("invalid submissions must not persist: %+v", stored)
	}
}

// The response is exactly {"accepted":true} — belt-and-braces on the
// tipping-off guard.
func TestKYCIdentityResponseShape(t *testing.T) {
	svc := NewMockKYCService()
	mux := http.NewServeMux()
	registerKYCRoutes(mux, svc, &fakePersonScreener{result: PersonScreeningResult{Status: PersonScreeningClear}})
	res := identityRequest(t, mux, "u-6", `{"fullName":"Jane Doe"}`)
	var parsed map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &parsed); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(parsed) != 1 || parsed["accepted"] != true {
		t.Fatalf("response must be exactly {accepted:true}, got %v", parsed)
	}
}
