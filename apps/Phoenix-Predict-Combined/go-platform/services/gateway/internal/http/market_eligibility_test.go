package http

import (
	"context"
	"errors"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/prediction"
)

type fakeEligibility struct {
	eligible bool
	err      error
}

func (f fakeEligibility) IsEligible(context.Context, string, string) (bool, error) {
	return f.eligible, f.err
}

// TestCheckMarketEligibility (GAP-20): a nil checker is a no-op; an eligible
// user passes; an ineligible user is blocked; a lookup error fails CLOSED.
func TestCheckMarketEligibility(t *testing.T) {
	prev := marketEligibility
	t.Cleanup(func() { marketEligibility = prev })
	req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/orders", nil)

	marketEligibility = nil
	if err := checkMarketEligibility(req, "u-1", "m-1"); err != nil {
		t.Fatalf("nil checker must be a no-op, got %v", err)
	}
	marketEligibility = fakeEligibility{eligible: true}
	if err := checkMarketEligibility(req, "u-1", "m-1"); err != nil {
		t.Fatalf("eligible user must pass, got %v", err)
	}
	marketEligibility = fakeEligibility{eligible: false}
	if err := checkMarketEligibility(req, "u-2", "m-1"); err == nil {
		t.Fatal("ineligible user must be blocked")
	}
	marketEligibility = fakeEligibility{err: errors.New("db down")}
	if err := checkMarketEligibility(req, "u-3", "m-1"); err == nil {
		t.Fatal("a lookup error must fail closed (block)")
	}
}

// fakeEligibilityAdmin records config calls and returns injectable errors so the
// admin route can be exercised without a DB.
type fakeEligibilityAdmin struct {
	tags     []int64
	addErr   error
	rmErr    error
	listErr  error
	added    []int64
	removed  []int64
	profile  []MarketEligibilityStatus
	profErr  error
	profUser string
}

func (f *fakeEligibilityAdmin) ListRequiredTags(context.Context, string) ([]int64, error) {
	return f.tags, f.listErr
}

func (f *fakeEligibilityAdmin) AddRequiredTag(_ context.Context, _ string, tagID int64) error {
	if f.addErr != nil {
		return f.addErr
	}
	f.added = append(f.added, tagID)
	return nil
}

func (f *fakeEligibilityAdmin) RemoveRequiredTag(_ context.Context, _ string, tagID int64) error {
	if f.rmErr != nil {
		return f.rmErr
	}
	f.removed = append(f.removed, tagID)
	return nil
}

func (f *fakeEligibilityAdmin) UserMarketEligibility(_ context.Context, userID string) ([]MarketEligibilityStatus, error) {
	f.profUser = userID
	return f.profile, f.profErr
}

// TestMarketEligibilityAdminRoutes (GAP-20 slice 2): the admin config surface on
// /api/v1/admin/markets/{id}/eligibility-tags — GET lists, POST add/remove
// mutate, a nil store reports unavailable, and the store's sentinel errors map to
// 404 (unknown market) / 400 (unknown tag). RBAC is satisfied by the TestMain
// GATEWAY_ALLOW_ADMIN_ANON bypass; writes carry an identified actor via X-User-ID.
func TestMarketEligibilityAdminRoutes(t *testing.T) {
	repo := newPredictionAdminRepo()
	svc := prediction.NewService(repo, predictionAdminWallet{})
	mux := stdhttp.NewServeMux()
	registerSettlementRoutes(mux, svc)

	prev := marketEligibilityAdmin
	t.Cleanup(func() { marketEligibilityAdmin = prev })

	const mid = "11111111-1111-1111-1111-111111111111"
	base := "/api/v1/admin/markets/" + mid + "/eligibility-tags"

	do := func(method, body string) *httptest.ResponseRecorder {
		var r *stdhttp.Request
		if body == "" {
			r = httptest.NewRequest(method, base, nil)
		} else {
			r = httptest.NewRequest(method, base, strings.NewReader(body))
		}
		r.Header.Set("X-User-ID", "admin-elig") // identified actor for audited writes
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}

	// nil store → surface unavailable on both read and write.
	marketEligibilityAdmin = nil
	if w := do(stdhttp.MethodGet, ""); w.Code != stdhttp.StatusNotFound {
		t.Fatalf("nil store GET: want 404, got %d", w.Code)
	}
	if w := do(stdhttp.MethodPost, `{"tagId":1}`); w.Code != stdhttp.StatusNotFound {
		t.Fatalf("nil store POST: want 404, got %d", w.Code)
	}

	fake := &fakeEligibilityAdmin{tags: []int64{9001, 9002}}
	marketEligibilityAdmin = fake

	if w := do(stdhttp.MethodGet, ""); w.Code != stdhttp.StatusOK {
		t.Fatalf("GET list: want 200, got %d (%s)", w.Code, w.Body.String())
	} else if !strings.Contains(w.Body.String(), "9001") || !strings.Contains(w.Body.String(), "9002") {
		t.Fatalf("GET list body missing tags: %s", w.Body.String())
	}

	// POST add (default op) records the tag.
	if w := do(stdhttp.MethodPost, `{"tagId":9003}`); w.Code != stdhttp.StatusOK {
		t.Fatalf("POST add: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	if len(fake.added) != 1 || fake.added[0] != 9003 {
		t.Fatalf("POST add did not record tag: %v", fake.added)
	}

	// POST remove.
	if w := do(stdhttp.MethodPost, `{"tagId":9001,"op":"remove"}`); w.Code != stdhttp.StatusOK {
		t.Fatalf("POST remove: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	if len(fake.removed) != 1 || fake.removed[0] != 9001 {
		t.Fatalf("POST remove did not record tag: %v", fake.removed)
	}

	// Verification #14 fix: an unidentified admin (no X-User-ID) configuring tags
	// gets a config-specific 403, NOT the resolution/dual-control message — tag
	// config is an audited config action, not a resolution action.
	{
		r := httptest.NewRequest(stdhttp.MethodPost, base, strings.NewReader(`{"tagId":9003}`))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != stdhttp.StatusForbidden {
			t.Fatalf("unidentified admin POST: want 403, got %d", w.Code)
		}
		if strings.Contains(w.Body.String(), "resolution") {
			t.Fatalf("eligibility-tags 403 must not reuse the resolution dual-control message: %s", w.Body.String())
		}
	}

	// Validation: missing tagId and an unknown op are both 400.
	if w := do(stdhttp.MethodPost, `{}`); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("POST no tagId: want 400, got %d", w.Code)
	}
	if w := do(stdhttp.MethodPost, `{"tagId":9003,"op":"toggle"}`); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("POST bad op: want 400, got %d", w.Code)
	}

	// Sentinel error mapping: unknown market → 404, unknown tag → 400.
	fake.addErr = errEligMarketNotFound
	if w := do(stdhttp.MethodPost, `{"tagId":9003}`); w.Code != stdhttp.StatusNotFound {
		t.Fatalf("unknown market: want 404, got %d", w.Code)
	}
	fake.addErr = errEligTagNotFound
	if w := do(stdhttp.MethodPost, `{"tagId":9003}`); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("unknown tag: want 400, got %d", w.Code)
	}
}

// TestMarketEligibilityProfileRoute (GAP-20 slice 3): the Profile-360 read on
// /api/v1/admin/market-eligibility?userId= — requires userId (400 without),
// reports the store's per-market standing, 405s non-GET, and a nil store reports
// unavailable. RBAC via the TestMain GATEWAY_ALLOW_ADMIN_ANON bypass.
func TestMarketEligibilityProfileRoute(t *testing.T) {
	mux := stdhttp.NewServeMux()
	registerMarketEligibilityProfileRoutes(mux)

	prev := marketEligibilityAdmin
	t.Cleanup(func() { marketEligibilityAdmin = prev })

	const path = "/api/v1/admin/market-eligibility"
	get := func(query string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(stdhttp.MethodGet, path+query, nil)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}

	// nil store → unavailable (only after userId is validated present).
	marketEligibilityAdmin = nil
	if w := get("?userId=u-1"); w.Code != stdhttp.StatusNotFound {
		t.Fatalf("nil store: want 404, got %d", w.Code)
	}

	fake := &fakeEligibilityAdmin{profile: []MarketEligibilityStatus{
		{MarketID: "m-ok", RequiredTags: []int64{9001}, MissingTags: []int64{}, Eligible: true},
		{MarketID: "m-no", RequiredTags: []int64{9001, 9002}, MissingTags: []int64{9002}, Eligible: false},
	}}
	marketEligibilityAdmin = fake

	// missing userId → 400.
	if w := get(""); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("no userId: want 400, got %d", w.Code)
	}
	// non-GET → 405.
	if r := httptest.NewRequest(stdhttp.MethodPost, path+"?userId=u-1", nil); true {
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != stdhttp.StatusMethodNotAllowed {
			t.Fatalf("POST: want 405, got %d", w.Code)
		}
	}
	// happy path returns both markets and passes userId to the store.
	w := get("?userId=u-42")
	if w.Code != stdhttp.StatusOK {
		t.Fatalf("GET: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	if fake.profUser != "u-42" {
		t.Fatalf("store got userId %q, want u-42", fake.profUser)
	}
	body := w.Body.String()
	if !strings.Contains(body, "m-ok") || !strings.Contains(body, "m-no") || !strings.Contains(body, `"eligible":false`) {
		t.Fatalf("profile body missing expected content: %s", body)
	}
}
