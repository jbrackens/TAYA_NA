package http

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/gateway/internal/risk"
	"phoenix-revival/platform/transport/httpx"
)

// stubRiskStore is an in-memory riskAdminStore for the route tests.
type stubRiskStore struct {
	ratings map[string]*risk.Rating
	getErr  error
}

func newStubRiskStore() *stubRiskStore {
	return &stubRiskStore{ratings: map[string]*risk.Rating{}}
}
func (s *stubRiskStore) Get(_ context.Context, subjectID string) (*risk.Rating, error) {
	if s.getErr != nil {
		return nil, s.getErr
	}
	r, ok := s.ratings[subjectID]
	if !ok {
		return nil, risk.ErrNotFound
	}
	return r, nil
}
func (s *stubRiskStore) List(_ context.Context, tier string, _, _ int) ([]risk.Rating, error) {
	out := []risk.Rating{}
	for _, r := range s.ratings {
		if tier == "" || string(r.EffectiveTier()) == tier {
			out = append(out, *r)
		}
	}
	return out, nil
}
func (s *stubRiskStore) SetOverride(_ context.Context, subjectID string, tier risk.Tier, by, reason string) error {
	if subjectID == "" || !risk.ValidTier(tier) || by == "" || strings.TrimSpace(reason) == "" {
		return risk.ErrInvalidInput
	}
	r := s.ratings[subjectID]
	if r == nil {
		r = &risk.Rating{SubjectID: subjectID, Tier: risk.TierLow}
	}
	r.OverrideTier = tier
	r.OverrideBy = by
	r.OverrideReason = reason
	s.ratings[subjectID] = r
	return nil
}
func (s *stubRiskStore) ClearOverride(_ context.Context, subjectID string) error {
	r, ok := s.ratings[subjectID]
	if !ok {
		return risk.ErrNotFound
	}
	r.OverrideTier = ""
	r.OverrideBy = ""
	r.OverrideReason = ""
	return nil
}

// stubRiskEngine records recompute calls and returns a canned rating.
type stubRiskEngine struct {
	store    *stubRiskStore
	tier     risk.Tier
	score    int
	recomps  int
	failWith error
}

func (e *stubRiskEngine) Recompute(_ context.Context, subjectID string) (*risk.Rating, error) {
	e.recomps++
	if e.failWith != nil {
		return nil, e.failWith
	}
	r := e.store.ratings[subjectID]
	if r == nil {
		r = &risk.Rating{SubjectID: subjectID}
	}
	r.Tier = e.tier
	r.Score = e.score
	e.store.ratings[subjectID] = r
	return r, nil
}

func newRiskHarness(store riskAdminStore, engine riskRecomputer) http.Handler {
	mux := http.NewServeMux()
	registerRiskAdminRoutes(mux, store, engine)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func riskReq(handler http.Handler, method, path, body string) *httptest.ResponseRecorder {
	var r *http.Request
	if body != "" {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	} else {
		r = httptest.NewRequest(method, path, nil)
	}
	r = r.WithContext(httpx.WithTestUser(r.Context(), "risk-officer", "risk@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, r)
	return res
}

func TestRiskGetRating(t *testing.T) {
	store := newStubRiskStore()
	store.ratings["u-1"] = &risk.Rating{SubjectID: "u-1", Tier: risk.TierHigh, Score: 120}
	h := newRiskHarness(store, &stubRiskEngine{store: store})

	ok := riskReq(h, http.MethodGet, "/api/v1/admin/risk/ratings/u-1", "")
	if ok.Code != http.StatusOK {
		t.Fatalf("get: expected 200, got %d body=%s", ok.Code, ok.Body.String())
	}
	if !strings.Contains(ok.Body.String(), `"effectiveTier":"high"`) {
		t.Fatalf("response should carry the effective tier, got %s", ok.Body.String())
	}
	missing := riskReq(h, http.MethodGet, "/api/v1/admin/risk/ratings/nobody", "")
	if missing.Code != http.StatusNotFound {
		t.Fatalf("unknown subject: expected 404, got %d", missing.Code)
	}
}

func TestRiskRecomputeAudited(t *testing.T) {
	store := newStubRiskStore()
	engine := &stubRiskEngine{store: store, tier: risk.TierMedium, score: 60}
	h := newRiskHarness(store, engine)
	res := riskReq(h, http.MethodPost, "/api/v1/admin/risk/ratings/u-1/recompute", "")
	if res.Code != http.StatusOK {
		t.Fatalf("recompute: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if engine.recomps != 1 {
		t.Fatalf("expected 1 recompute, got %d", engine.recomps)
	}
	assertAMLAudit(t, "risk.rating_recomputed", "u-1")
}

func TestRiskOverrideAudited(t *testing.T) {
	store := newStubRiskStore()
	h := newRiskHarness(store, &stubRiskEngine{store: store})

	// Valid override → 200, audited, effective tier reflects it.
	ok := riskReq(h, http.MethodPost, "/api/v1/admin/risk/ratings/u-1/override",
		`{"tier":"prohibited","reason":"SAR filed"}`)
	if ok.Code != http.StatusOK {
		t.Fatalf("override: expected 200, got %d body=%s", ok.Code, ok.Body.String())
	}
	if !strings.Contains(ok.Body.String(), `"effectiveTier":"prohibited"`) {
		t.Fatalf("override should drive the effective tier, got %s", ok.Body.String())
	}
	assertAMLAudit(t, "risk.rating_overridden", "u-1")

	// Invalid tier → 400.
	bad := riskReq(h, http.MethodPost, "/api/v1/admin/risk/ratings/u-1/override", `{"tier":"critical","reason":"x"}`)
	if bad.Code != http.StatusBadRequest {
		t.Fatalf("invalid tier: expected 400, got %d", bad.Code)
	}
	// Missing reason → 400 (a control decision must be justified).
	noReason := riskReq(h, http.MethodPost, "/api/v1/admin/risk/ratings/u-1/override", `{"tier":"high","reason":"  "}`)
	if noReason.Code != http.StatusBadRequest {
		t.Fatalf("missing reason: expected 400, got %d", noReason.Code)
	}
}

func TestRiskClearOverrideAudited(t *testing.T) {
	store := newStubRiskStore()
	store.ratings["u-1"] = &risk.Rating{SubjectID: "u-1", Tier: risk.TierLow, OverrideTier: risk.TierProhibited, OverrideBy: "x", OverrideReason: "y"}
	h := newRiskHarness(store, &stubRiskEngine{store: store})
	res := riskReq(h, http.MethodDelete, "/api/v1/admin/risk/ratings/u-1/override", "")
	if res.Code != http.StatusOK {
		t.Fatalf("clear: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if !strings.Contains(res.Body.String(), `"effectiveTier":"low"`) {
		t.Fatalf("clearing the override should restore the computed tier, got %s", res.Body.String())
	}
	assertAMLAudit(t, "risk.rating_override_cleared", "u-1")
}

func TestRiskRoutesRejectNonAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	store := newStubRiskStore()
	h := newRiskHarness(store, &stubRiskEngine{store: store})
	for _, tc := range []struct{ method, path string }{
		{http.MethodGet, "/api/v1/admin/risk/ratings"},
		{http.MethodGet, "/api/v1/admin/risk/ratings/u-1"},
		{http.MethodPost, "/api/v1/admin/risk/ratings/u-1/recompute"},
		{http.MethodPost, "/api/v1/admin/risk/ratings/u-1/override"},
		{http.MethodDelete, "/api/v1/admin/risk/ratings/u-1/override"},
	} {
		r := httptest.NewRequest(tc.method, tc.path, strings.NewReader(`{"tier":"high","reason":"x"}`))
		r = r.WithContext(httpx.WithTestUser(r.Context(), "u-p", "player@test.local", "player"))
		res := httptest.NewRecorder()
		h.ServeHTTP(res, r)
		if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s: expected rejection, got %d", tc.method, tc.path, res.Code)
		}
	}
}

// --- FactorSource adapter ---

type fakeAMLPoints struct {
	pts int
	err error
}

func (f fakeAMLPoints) OpenAlertRiskPoints(context.Context, string) (int, error) { return f.pts, f.err }

type fakeScreening struct {
	id  *compliance.KYCIdentity
	err error
}

func (f fakeScreening) GetIdentity(context.Context, string) (*compliance.KYCIdentity, error) {
	return f.id, f.err
}

func TestRiskFactorSourceGather(t *testing.T) {
	ctx := context.Background()

	// Points + screening status combine.
	src := newRiskFactorSource(fakeAMLPoints{pts: 80}, fakeScreening{id: &compliance.KYCIdentity{ScreeningStatus: "hit"}})
	f, err := src.Gather(ctx, "u-1")
	if err != nil || f.AMLOpenAlertPoints != 80 || f.ScreeningStatus != "hit" {
		t.Fatalf("gather combine: %+v err=%v", f, err)
	}

	// Nil KYC → neutral screening (no panic on the typed-nil path).
	srcNoKYC := newRiskFactorSource(fakeAMLPoints{pts: 10}, nil)
	f2, err := srcNoKYC.Gather(ctx, "u-1")
	if err != nil || f2.ScreeningStatus != "" || f2.AMLOpenAlertPoints != 10 {
		t.Fatalf("gather no-kyc: %+v err=%v", f2, err)
	}

	// Identity absent (nil, nil) → neutral screening.
	srcNoID := newRiskFactorSource(fakeAMLPoints{pts: 5}, fakeScreening{id: nil})
	f3, err := srcNoID.Gather(ctx, "u-1")
	if err != nil || f3.ScreeningStatus != "" {
		t.Fatalf("gather no-identity: %+v err=%v", f3, err)
	}

	// AML read error propagates (fail honestly, don't rate clean).
	if _, err := newRiskFactorSource(fakeAMLPoints{err: errors.New("aml down")}, nil).Gather(ctx, "u-1"); err == nil {
		t.Fatal("aml error must propagate")
	}
	// KYC read error propagates.
	if _, err := newRiskFactorSource(fakeAMLPoints{pts: 1}, fakeScreening{err: errors.New("kyc down")}).Gather(ctx, "u-1"); err == nil {
		t.Fatal("kyc error must propagate")
	}
}
