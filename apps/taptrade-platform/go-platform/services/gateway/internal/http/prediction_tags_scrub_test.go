package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"taptrade/gateway/internal/prediction"
	"taptrade/platform/transport/httpx"
)

// The tag rail is list content: a tag with prohibited copy must be dropped,
// never replaced with the scrub sentinel — the sentinel is not a real tag
// value, so emitting it offers a browsable chip that can never match a
// market (P-002/003 shipped this filter client-side; this is the server-side
// contract).
func TestTagEndpointsDropProhibitedTagsInsteadOfSentinel(t *testing.T) {
	repo := newPredictionAdminRepo()
	repo.series = []prediction.Series{
		{
			ID:         "ser-scrub-1",
			Slug:       "politics-weekly",
			Title:      "Politics Weekly",
			CategoryID: "cat-politics",
			Tags:       []string{"Politics", "Cash Prizes", "Elections"},
			Active:     true,
		},
		{
			ID:         "ser-scrub-2",
			Slug:       "loyalty-drops",
			Title:      "Loyalty Drops",
			CategoryID: "cat-politics",
			Tags:       []string{"redeemable rewards", "non-redeemable points"},
			Active:     true,
		},
	}
	svc := prediction.NewService(repo, predictionAdminWallet{})

	mux := http.NewServeMux()
	registerPredictionRoutes(mux, svc)
	registerSettlementRoutes(mux, svc)
	handler := httpx.Chain(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			mux.ServeHTTP(w, r)
		}),
		httpx.RequestID(),
	)

	assertTags := func(t *testing.T, body []byte) {
		t.Helper()
		var payload struct {
			Tags []string `json:"tags"`
		}
		if err := json.Unmarshal(body, &payload); err != nil {
			t.Fatalf("decode tags: %v (body=%s)", err, body)
		}
		got := strings.Join(payload.Tags, "|")
		for _, banned := range []string{launchRedactedUserText, "Cash Prizes", "redeemable rewards"} {
			if strings.Contains(got, banned) {
				t.Fatalf("tags must drop prohibited entries, got %v", payload.Tags)
			}
		}
		for _, want := range []string{"Politics", "Elections", "non-redeemable points"} {
			if !strings.Contains(got, want) {
				t.Fatalf("clean tag %q missing from %v", want, payload.Tags)
			}
		}
	}

	publicReq := httptest.NewRequest(http.MethodGet, "/api/v1/tags", nil)
	publicRes := httptest.NewRecorder()
	handler.ServeHTTP(publicRes, publicReq)
	if publicRes.Code != http.StatusOK {
		t.Fatalf("public tags failed: status=%d body=%s", publicRes.Code, publicRes.Body.String())
	}
	assertTags(t, publicRes.Body.Bytes())

	adminReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/tags", nil)
	adminReq = adminReq.WithContext(httpx.WithTestUser(adminReq.Context(), "admin-tags", "tags@taptrade.local", "admin"))
	adminRes := httptest.NewRecorder()
	handler.ServeHTTP(adminRes, adminReq)
	if adminRes.Code != http.StatusOK {
		t.Fatalf("admin tags failed: status=%d body=%s", adminRes.Code, adminRes.Body.String())
	}
	assertTags(t, adminRes.Body.Bytes())
}

// Series payloads carry the same tag lists; prohibited entries are dropped
// there too so the sentinel can't leak in as series metadata.
func TestPublicSeriesPayloadDropsProhibitedTags(t *testing.T) {
	repo := newPredictionAdminRepo()
	repo.series = []prediction.Series{
		{
			ID:         "ser-scrub-3",
			Slug:       "mixed-tags",
			Title:      "Mixed Tags",
			CategoryID: "cat-politics",
			Tags:       []string{"Politics", "$100 stakes"},
			Active:     true,
		},
	}
	svc := prediction.NewService(repo, predictionAdminWallet{})

	mux := http.NewServeMux()
	registerPredictionRoutes(mux, svc)
	handler := httpx.Chain(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			mux.ServeHTTP(w, r)
		}),
		httpx.RequestID(),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/series", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("series list failed: status=%d body=%s", res.Code, res.Body.String())
	}
	var series []prediction.Series
	if err := json.Unmarshal(res.Body.Bytes(), &series); err != nil {
		t.Fatalf("decode series: %v (body=%s)", err, res.Body.String())
	}
	if len(series) != 1 {
		t.Fatalf("expected one series, got %d", len(series))
	}
	if len(series[0].Tags) != 1 || series[0].Tags[0] != "Politics" {
		t.Fatalf("series tags must drop prohibited entries without a sentinel, got %v", series[0].Tags)
	}
	if strings.Contains(res.Body.String(), launchRedactedUserText) {
		t.Fatalf("series payload leaked the scrub sentinel: %s", res.Body.String())
	}
}
