package http

// Step 11: per-comment position disclosure — opt-in snapshot at post
// time. The property that matters: the disclosure is captured ONCE, and
// a later position change (including a full exit) never rewrites it. A
// comment claiming a live position the author has since exited is worse
// than no disclosure; an exited position staying disclosed is the point.
import (
	"bytes"
	"context"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"testing"

	"taptrade/gateway/internal/prediction"
	"taptrade/platform/transport/httpx"
)

type fakePositionLister struct {
	positions []prediction.Position
}

func (f *fakePositionLister) ListPositions(_ context.Context, _ string) ([]prediction.Position, error) {
	return f.positions, nil
}

func TestCommentPositionDisclosureSnapshot(t *testing.T) {
	store := &memoryMarketSocialStore{
		reactions: map[string]map[string]struct{}{},
		reports:   map[string]map[string]socialReport{},
		follows:   map[string]map[string]struct{}{},
	}
	lister := &fakePositionLister{positions: []prediction.Position{
		{MarketID: "mkt-1", Side: prediction.OrderSideYes, Quantity: 8, TotalCostPoints: 496},
		{MarketID: "mkt-2", Side: prediction.OrderSideNo, Quantity: 3, TotalCostPoints: 120}, // other market — never disclosed
	}}
	mux := stdhttp.NewServeMux()
	registerMarketSocialRoutes(mux, store, nil, nil, lister)

	post := func(body string) map[string]any {
		t.Helper()
		req := httptest.NewRequest("POST", "/api/v1/social/markets/mkt-1/comments", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(
			httpx.WithTestUser(req.Context(), "u-author", "author", "player"),
		)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		if rec.Code != 201 {
			t.Fatalf("POST comment = %d: %s", rec.Code, rec.Body.String())
		}
		var envelope struct {
			Comment map[string]any `json:"comment"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
			t.Fatal(err)
		}
		return envelope.Comment
	}

	// Opt-in: unchecked posts carry NO disclosure even while holding.
	plain := post(`{"body":"no disclosure here"}`)
	if _, ok := plain["positionDisclosure"]; ok {
		t.Fatalf("unchecked comment must not disclose: %v", plain)
	}

	// Checked: the held side on THIS market is snapshotted.
	disclosed := post(`{"body":"disclosed comment","disclosePosition":true}`)
	raw, ok := disclosed["positionDisclosure"]
	if !ok {
		t.Fatalf("checked comment must disclose: %v", disclosed)
	}
	entries, ok := raw.([]any)
	if !ok || len(entries) != 1 {
		t.Fatalf("expected exactly the mkt-1 side, got %v", raw)
	}
	entry := entries[0].(map[string]any)
	if entry["side"] != "yes" || entry["quantity"] != float64(8) || entry["costPoints"] != float64(496) {
		t.Fatalf("snapshot mismatch: %v", entry)
	}

	// THE property: the author exits; the stored disclosure is untouched.
	lister.positions = nil
	listed, err := store.ListComments(context.Background(), "mkt-1", 10)
	if err != nil {
		t.Fatal(err)
	}
	var still json.RawMessage
	for _, c := range listed {
		if c.Body == "disclosed comment" {
			still = c.PositionDisclosure
		}
	}
	if len(still) == 0 {
		t.Fatal("disclosure vanished after the position exited — deleting it retroactively is its own kind of dishonesty")
	}

	// And a checked post with NO position held posts cleanly, chipless.
	chipless := post(`{"body":"checked but holding nothing","disclosePosition":true}`)
	if _, ok := chipless["positionDisclosure"]; ok {
		t.Fatalf("no position → no chip: %v", chipless)
	}
}
