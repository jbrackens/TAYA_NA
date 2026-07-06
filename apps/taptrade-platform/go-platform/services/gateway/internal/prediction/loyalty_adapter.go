package prediction

import (
	"context"
	"database/sql"
)

// LoyaltyAdapter is the prediction platform's view of the loyalty service.
// Kept as an interface to avoid coupling the prediction domain to the loyalty
// implementation — same pattern as WalletAdapter.
//
// Accrual participates in the same *sql.Tx as the settlement's wallet credit,
// so a mid-flight failure rolls both wallet and loyalty writes back together
// (see PLAN-loyalty-leaderboards.md §8). The returned LoyaltyAccrualResult
// tells the caller whether the accrual crossed a tier threshold — after
// commit, the caller publishes a TierPromoted event over WebSocket so the
// frontend pill blooms immediately instead of waiting for the 60s poll.
type LoyaltyAdapter interface {
	AccrueSettledWithTx(ctx context.Context, tx *sql.Tx, req LoyaltyAccrualRequest) (*LoyaltyAccrualResult, error)
}

// LoyaltyAccrualRequest is the settlement-time input to the loyalty service.
// The loyalty service computes raw points from VolumeCents + IsCorrect using
// its own formula — this package stays ignorant of the math.
type LoyaltyAccrualRequest struct {
	UserID         string
	VolumeCents    int64
	IsCorrect      bool
	MarketID       string
	TradeID        string
	IdempotencyKey string
}

// LoyaltyAccrualResult reports what happened. Only Promoted==true calls for a
// WebSocket event; the rest is useful telemetry.
type LoyaltyAccrualResult struct {
	UserID     string
	Promoted   bool
	FromTier   int
	ToTier     int
	NewBalance int64
}
