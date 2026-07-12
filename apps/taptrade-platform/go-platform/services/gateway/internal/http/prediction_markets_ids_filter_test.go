package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"taptrade/gateway/internal/prediction"
	"taptrade/platform/transport/httpx"
)

// marketIDsCaptureRepo wraps the shared admin fake so route tests can assert
// exactly which MarketFilter the public /api/v1/markets handler hands to the
// service for the batched `ids` lookup.
type marketIDsCaptureRepo struct {
	*predictionAdminRepo
	lastFilter *prediction.MarketFilter
}

func (r *marketIDsCaptureRepo) ListMarkets(ctx context.Context, filter prediction.MarketFilter) ([]prediction.Market, int, error) {
	captured := filter
	r.lastFilter = &captured
	return r.predictionAdminRepo.ListMarkets(ctx, filter)
}

func newMarketsIDsHandler(repo prediction.Repository) http.Handler {
	svc := prediction.NewService(repo, predictionAdminWallet{})
	mux := http.NewServeMux()
	registerPredictionRoutes(mux, svc)
	return httpx.Chain(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			mux.ServeHTTP(w, r)
		}),
		httpx.RequestID(),
	)
}

// The public markets list accepts a comma-separated `ids` filter (batched
// hydration, cap 50). It must parse messy input, stay capped, and pass the id
// set through WITHOUT opting out of the unopened/launch-scrub safety gates —
// the ids predicate composes into the same WHERE as every other filter.
func TestPublicMarketsListParsesIDsFilter(t *testing.T) {
	repo := &marketIDsCaptureRepo{predictionAdminRepo: newPredictionAdminRepo()}
	repo.markets["mkt-a"] = &prediction.Market{
		ID: "mkt-a", EventID: "evt-1", Ticker: "MKT-A",
		Title: "Will turnout exceed 60%?", Status: prediction.MarketStatusOpen,
	}
	repo.markets["mkt-b"] = &prediction.Market{
		ID: "mkt-b", EventID: "evt-1", Ticker: "MKT-B",
		Title: "Cash payout market", Status: prediction.MarketStatusOpen,
	}
	handler := newMarketsIDsHandler(repo)

	cases := []struct {
		name     string
		query    string
		wantIDs  []string
		wantCode int
	}{
		{"plain list", "?ids=mkt-a,mkt-b", []string{"mkt-a", "mkt-b"}, http.StatusOK},
		{"whitespace and empty segments dropped", "?ids=%20mkt-a%20,,%20,mkt-b", []string{"mkt-a", "mkt-b"}, http.StatusOK},
		{"single id", "?ids=mkt-a", []string{"mkt-a"}, http.StatusOK},
		{"no ids param leaves filter unset", "", nil, http.StatusOK},
		{"only separators leaves filter unset", "?ids=,%20,", nil, http.StatusOK},
		{"exactly the cap is accepted", "?ids=" + strings.Repeat("x,", 49) + "x", nil, http.StatusOK},
		{"over the cap is rejected", "?ids=" + strings.Repeat("x,", 50) + "x", nil, http.StatusBadRequest},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo.lastFilter = nil
			req := httptest.NewRequest(http.MethodGet, "/api/v1/markets"+tc.query, nil)
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != tc.wantCode {
				t.Fatalf("status = %d, want %d (body=%s)", res.Code, tc.wantCode, res.Body.String())
			}
			if tc.wantCode != http.StatusOK {
				if repo.lastFilter != nil {
					t.Fatalf("rejected request must not reach the repository, captured %+v", *repo.lastFilter)
				}
				return
			}
			if repo.lastFilter == nil {
				t.Fatalf("expected the handler to query the repository")
			}
			if tc.name == "exactly the cap is accepted" {
				if len(repo.lastFilter.IDs) != 50 {
					t.Fatalf("cap-sized request should pass all 50 ids, got %d", len(repo.lastFilter.IDs))
				}
			} else if tc.wantIDs == nil {
				if repo.lastFilter.IDs != nil {
					t.Fatalf("filter.IDs should stay unset, got %#v", repo.lastFilter.IDs)
				}
			}
			if tc.wantIDs != nil {
				if len(repo.lastFilter.IDs) != len(tc.wantIDs) {
					t.Fatalf("filter.IDs = %#v, want %#v", repo.lastFilter.IDs, tc.wantIDs)
				}
				for i, id := range tc.wantIDs {
					if repo.lastFilter.IDs[i] != id {
						t.Fatalf("filter.IDs = %#v, want %#v", repo.lastFilter.IDs, tc.wantIDs)
					}
				}
			}
			// Launch-scrub semantics: the public ids path must never opt in
			// to unopened or scrub-excluded content — the SQL layer composes
			// its safety gates only when these stay false.
			if repo.lastFilter.IncludeUnopened || repo.lastFilter.IncludeLaunchScrubbed {
				t.Fatalf("public ids lookup must not bypass safety gates, got %+v", *repo.lastFilter)
			}
		})
	}
}

// Even when a market row reaches the payload layer (the fake repo does not run
// the SQL scrub gate), an ids-filtered response must still redact prohibited
// copy — the same scrub regex applies to the batched path as to every list.
func TestPublicMarketsListIDsFilterStillScrubsPayloads(t *testing.T) {
	repo := &marketIDsCaptureRepo{predictionAdminRepo: newPredictionAdminRepo()}
	repo.markets["mkt-safe"] = &prediction.Market{
		ID: "mkt-safe", EventID: "evt-1", Ticker: "MKT-SAFE",
		Title: "Will turnout exceed 60%?", Status: prediction.MarketStatusOpen,
	}
	repo.markets["mkt-unsafe"] = &prediction.Market{
		ID: "mkt-unsafe", EventID: "evt-1", Ticker: "MKT-UNSAFE",
		Title: "Cash payout market", Status: prediction.MarketStatusOpen,
	}
	handler := newMarketsIDsHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets?ids=mkt-safe,mkt-unsafe", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("ids lookup failed: status=%d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Data []struct {
			ID    string `json:"id"`
			Title string `json:"title"`
		} `json:"data"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode markets: %v (body=%s)", err, res.Body.String())
	}
	titles := map[string]string{}
	for _, m := range payload.Data {
		titles[m.ID] = m.Title
	}
	if titles["mkt-safe"] != "Will turnout exceed 60%?" {
		t.Fatalf("clean market title should pass through, got %+v", titles)
	}
	if titles["mkt-unsafe"] != launchRedactedUserText {
		t.Fatalf("prohibited copy must be redacted on the ids path, got %+v", titles)
	}
	if strings.Contains(res.Body.String(), "Cash payout") {
		t.Fatalf("ids response leaked prohibited copy: %s", res.Body.String())
	}
}
