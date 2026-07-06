package http

import (
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"taptrade/gateway/internal/prediction/feed"
	"taptrade/platform/transport/httpx"
)

func TestResolutionSourceHealthRouteRedactsUnsafeLastErrorOnRead(t *testing.T) {
	reporter := &fakeResolutionHealthReporter{items: []feed.SourceHealth{
		{
			Source:              "legacy-price-source",
			Healthy:             false,
			ConsecutiveFailures: 3,
			TotalFailures:       5,
			LastError:           "legacy adapter returned cash payout destination",
		},
		{
			Source:         "manual-review",
			Healthy:        true,
			TotalSuccesses: 7,
			LastError:      "temporary timeout",
		},
	}}
	mux := stdhttp.NewServeMux()
	registerResolutionSourceRoutes(mux, reporter)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/admin/resolution-sources", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-health", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("expected resolution source health status 200, got %d body=%s", res.Code, res.Body.String())
	}
	if strings.Contains(res.Body.String(), "cash payout") {
		t.Fatalf("resolution source health response leaked unsafe lastError: %s", res.Body.String())
	}

	var payload struct {
		Items []feed.SourceHealth `json:"items"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Items) != 2 {
		t.Fatalf("expected two health items, got %+v", payload.Items)
	}
	if payload.Items[0].LastError != launchRedactedUserText {
		t.Fatalf("expected unsafe lastError redacted, got %+v", payload.Items[0])
	}
	if payload.Items[0].Source != "legacy-price-source" || payload.Items[0].ConsecutiveFailures != 3 || payload.Items[0].TotalFailures != 5 {
		t.Fatalf("redaction should preserve operational health fields, got %+v", payload.Items[0])
	}
	if payload.Items[1].LastError != "temporary timeout" {
		t.Fatalf("safe lastError should remain unchanged, got %+v", payload.Items[1])
	}
	if reporter.items[0].LastError != "legacy adapter returned cash payout destination" {
		t.Fatalf("redaction should not mutate reporter health snapshot, got %+v", reporter.items[0])
	}
}

type fakeResolutionHealthReporter struct {
	items []feed.SourceHealth
}

func (r *fakeResolutionHealthReporter) Health() []feed.SourceHealth {
	return r.items
}
