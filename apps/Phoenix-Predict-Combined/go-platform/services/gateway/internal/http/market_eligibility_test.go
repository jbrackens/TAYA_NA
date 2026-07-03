package http

import (
	"context"
	"errors"
	stdhttp "net/http"
	"net/http/httptest"
	"testing"
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
