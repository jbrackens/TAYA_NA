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
// (see PLAN-loyalty-leaderboards.md §8).
type LoyaltyAdapter interface {
	AccrueSettledWithTx(ctx context.Context, tx *sql.Tx, req LoyaltyAccrualRequest) error
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
