package prediction

import (
	"context"
	"testing"
)

// tradesLimitRepo records the limit the service forwards to the repository.
type tradesLimitRepo struct {
	memRepo
	gotLimit int
}

func (r *tradesLimitRepo) ListTrades(_ context.Context, _ string, limit int) ([]Trade, error) {
	r.gotLimit = limit
	return nil, nil
}

// TestListTradesLimitClampMatchesAPIContract pins the service-side ceiling to
// the documented contract (openapi.yaml /trades limit maximum: 200) and the
// handler clamp. The previous >100 reset silently served 50 rows for
// limit=101..200 requests the handler had already accepted.
func TestListTradesLimitClampMatchesAPIContract(t *testing.T) {
	cases := []struct {
		name      string
		limit     int
		wantLimit int
	}{
		{name: "zero falls back to default", limit: 0, wantLimit: 50},
		{name: "negative falls back to default", limit: -5, wantLimit: 50},
		{name: "small passthrough", limit: 25, wantLimit: 25},
		{name: "legacy ceiling passthrough", limit: 100, wantLimit: 100},
		{name: "just above legacy ceiling honored", limit: 101, wantLimit: 101},
		{name: "mid-range honored", limit: 150, wantLimit: 150},
		{name: "documented maximum honored", limit: 200, wantLimit: 200},
		{name: "beyond maximum falls back to default", limit: 201, wantLimit: 50},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := &tradesLimitRepo{}
			svc := NewService(repo, nil)
			if _, err := svc.ListTrades(context.Background(), "m-1", tc.limit); err != nil {
				t.Fatalf("ListTrades(%d): %v", tc.limit, err)
			}
			if repo.gotLimit != tc.wantLimit {
				t.Fatalf("ListTrades(%d) forwarded limit %d, want %d", tc.limit, repo.gotLimit, tc.wantLimit)
			}
		})
	}
}
