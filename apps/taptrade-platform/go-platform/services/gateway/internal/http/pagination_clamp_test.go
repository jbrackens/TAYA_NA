package http

import (
	"net/http/httptest"
	"testing"
)

// TestClampedQueryParam guards audit PERF-01: list endpoints must cap page
// size so a public ?pageSize=1000000 cannot turn one request into a full scan.
func TestClampedQueryParam(t *testing.T) {
	cases := []struct {
		name  string
		query string
		def   int
		max   int
		want  int
	}{
		{"absurd value clamps to max", "pageSize=1000000", 20, 100, 100},
		{"in-range passes through", "pageSize=50", 20, 100, 50},
		{"exactly max passes", "pageSize=100", 20, 100, 100},
		{"missing uses default", "", 20, 100, 20},
		{"zero falls back to default", "pageSize=0", 20, 100, 20},
		{"negative falls back to default", "pageSize=-5", 20, 100, 20},
		{"garbage falls back to default", "pageSize=abc", 20, 100, 20},
		{"authed list ceiling", "pageSize=999", 20, 200, 200},
		{"admin list ceiling", "pageSize=999", 20, 500, 500},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest("GET", "/?"+tc.query, nil)
			if got := clampedQueryParam(r, "pageSize", tc.def, tc.max); got != tc.want {
				t.Fatalf("clampedQueryParam(%q, def=%d, max=%d) = %d, want %d", tc.query, tc.def, tc.max, got, tc.want)
			}
		})
	}
}
