package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

func TestAdminContractFixtures(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	cases := []struct {
		name        string
		path        string
		admin       bool
		fixtureFile string
	}{
		{
			name:        "public fixtures",
			path:        "/api/v1/fixtures?pagination.currentPage=1&pagination.itemsPerPage=20&sortBy=startTime&sortDir=asc",
			admin:       false,
			fixtureFile: "public_fixtures.json",
		},
		{
			name:        "public markets",
			path:        "/api/v1/markets?fixtureId=f:local:001&status=open&pagination.currentPage=1&pagination.itemsPerPage=20&sortBy=marketName&sortDir=asc",
			admin:       false,
			fixtureFile: "public_markets.json",
		},
		{
			name:        "admin trading markets",
			path:        "/api/v1/admin/trading/markets?fixtureId=f:local:001&status=open&page=1&pageSize=1&sortBy=name&sortDir=asc",
			admin:       true,
			fixtureFile: "admin_trading_markets.json",
		},
		{
			name:        "admin punters",
			path:        "/api/v1/admin/punters?status=active&search=alice&page=1&pageSize=10&sortBy=email&sortDir=asc",
			admin:       true,
			fixtureFile: "admin_punters.json",
		},
		{
			name:        "admin audit logs",
			path:        "/api/v1/admin/audit-logs?action=market.updated&page=1&pageSize=10&sortBy=occurredAt&sortDir=asc",
			admin:       true,
			fixtureFile: "admin_audit_logs.json",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			if tc.admin {
				req.Header.Set("X-Admin-Role", "admin")
			}
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)

			if res.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
			}

			actual := parseJSONToAny(t, res.Body.Bytes())
			expectedPath := filepath.Join("testdata", "contracts", tc.fixtureFile)
			expectedRaw, err := os.ReadFile(expectedPath)
			if err != nil {
				t.Fatalf("read fixture %s: %v", expectedPath, err)
			}
			expected := parseJSONToAny(t, expectedRaw)

			if !reflect.DeepEqual(actual, expected) {
				actualPretty, _ := json.MarshalIndent(actual, "", "  ")
				expectedPretty, _ := json.MarshalIndent(expected, "", "  ")
				t.Fatalf("response does not match contract fixture\nexpected:\n%s\nactual:\n%s", string(expectedPretty), string(actualPretty))
			}
		})
	}
}

func parseJSONToAny(t *testing.T, raw []byte) any {
	t.Helper()
	var payload any
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("decode json: %v", err)
	}
	return payload
}
