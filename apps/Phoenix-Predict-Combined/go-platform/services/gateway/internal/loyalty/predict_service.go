package loyalty

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// PredictService is the Predict-native loyalty service. It wraps PredictRepo
// with the tier math from tiers.go and exposes the operations the HTTP layer
// and the settlement dispatcher call.
//
// Kept deliberately parallel to the sportsbook Service (service.go) — the two
// coexist during the un-orphaning transition. The HTTP handlers and settlement
// engine will switch over to this service in a follow-up commit.
type PredictService struct {
	repo PredictRepo
}

// NewPredictService wires the service on top of the given repo.
func NewPredictService(repo PredictRepo) *PredictService {
	return &PredictService{repo: repo}
}

// PredictStanding is the combined "what does the user see" payload the tier
// pill, rank chip, and /rewards page all consume.
type PredictStanding struct {
	UserID           string
	PointsBalance    int64
	Tier             PredictTier
	TierName         string
	NextTier         PredictTier
	NextTierName     string
	PointsToNextTier int64
	LastActivity     *time.Time
}

// PredictSettlementAccrual is the high-level input the settlement dispatcher
// hands to AccrueSettled. The service computes the raw points delta from the
// volume × correctness formula defined in tiers.go.
type PredictSettlementAccrual struct {
	UserID         string
	VolumeCents    int64
	IsCorrect      bool
	MarketID       string
	TradeID        string
	IdempotencyKey string
}

// PredictAdjustment is the high-level input admin tools use to manually add
// or remove points (e.g. legacy-state migration, customer-service corrections).
type PredictAdjustment struct {
	UserID         string
	DeltaPoints    int64
	Reason         string
	IdempotencyKey string
	EventType      string // "adjustment" (default) or "migration"
}

// Standing reads the user's current state. If the user has never accrued a
// point, a zero-state standing is returned (Tier 0, no next-tier hint hidden).
// Callers shouldn't need to distinguish ErrPredictAccountNotFound themselves.
func (s *PredictService) Standing(ctx context.Context, userID string) (PredictStanding, error) {
	standing := PredictStanding{UserID: userID}
	acct, err := s.repo.GetAccount(ctx, userID)
	if err != nil && err != ErrPredictAccountNotFound {
		return PredictStanding{}, err
	}
	if acct != nil {
		standing.PointsBalance = acct.PointsBalance
		standing.Tier = acct.Tier
		ts := acct.LastActivity
		standing.LastActivity = &ts
	}
	standing.TierName = PredictTierName(standing.Tier)
	pointsToNext, nextName := PredictPointsToNextTier(standing.PointsBalance)
	standing.PointsToNextTier = pointsToNext
	standing.NextTierName = nextName
	if standing.Tier < PredictTierLegend {
		standing.NextTier = standing.Tier + 1
	}
	return standing, nil
}

// Ledger returns the most-recent ledger entries for the user.
func (s *PredictService) Ledger(ctx context.Context, userID string, limit int) ([]PredictLedgerEntry, error) {
	return s.repo.ListLedger(ctx, userID, limit)
}

// Tiers returns the static tier table. Frontend caches this.
func (s *PredictService) Tiers() []PredictTierDefinition {
	return PredictTiers()
}

// AccrueSettled is called from the settlement path — either standalone (admin
// resettle) or via AccrueSettledWithTx when participating in the shared
// settlement transaction.
func (s *PredictService) AccrueSettled(ctx context.Context, in PredictSettlementAccrual) (*PredictAccrualResult, error) {
	input, err := buildSettlementInput(in)
	if err != nil {
		return nil, err
	}
	return s.repo.Accrue(ctx, input)
}

// AccrueSettledWithTx is the hot path: the settlement engine passes its own
// *sql.Tx so wallet credit + loyalty accrual commit atomically per the plan §8.
func (s *PredictService) AccrueSettledWithTx(ctx context.Context, tx *sql.Tx, in PredictSettlementAccrual) (*PredictAccrualResult, error) {
	input, err := buildSettlementInput(in)
	if err != nil {
		return nil, err
	}
	return s.repo.AccrueWithTx(ctx, tx, input)
}

// Adjust applies a manual points delta. Used by the legacy-state migration
// command and any admin-initiated corrections.
func (s *PredictService) Adjust(ctx context.Context, in PredictAdjustment) (*PredictAccrualResult, error) {
	if in.UserID == "" || in.IdempotencyKey == "" || in.Reason == "" || in.DeltaPoints == 0 {
		return nil, fmt.Errorf("loyalty: adjustment requires user_id, delta_points, reason, idempotency_key")
	}
	eventType := in.EventType
	if eventType == "" {
		eventType = "adjustment"
	}
	return s.repo.Accrue(ctx, PredictAccrualInput{
		UserID:         in.UserID,
		DeltaPoints:    in.DeltaPoints,
		EventType:      eventType,
		Reason:         in.Reason,
		IdempotencyKey: in.IdempotencyKey,
	})
}

func buildSettlementInput(in PredictSettlementAccrual) (PredictAccrualInput, error) {
	if in.UserID == "" || in.IdempotencyKey == "" {
		return PredictAccrualInput{}, fmt.Errorf("loyalty: settlement accrual requires user_id + idempotency_key")
	}
	delta := PredictAccrualPoints(in.VolumeCents, in.IsCorrect)
	if delta <= 0 {
		// Zero-volume trades earn nothing — shouldn't happen in practice but
		// guards against accidental zero-accrual ledger churn.
		return PredictAccrualInput{}, fmt.Errorf("loyalty: non-positive accrual delta for volume=%d", in.VolumeCents)
	}
	reason := "settled trade (lost)"
	if in.IsCorrect {
		reason = "settled trade (won)"
	}
	input := PredictAccrualInput{
		UserID:         in.UserID,
		DeltaPoints:    delta,
		EventType:      "accrual",
		Reason:         reason,
		IdempotencyKey: in.IdempotencyKey,
	}
	if in.MarketID != "" {
		m := in.MarketID
		input.MarketID = &m
	}
	if in.TradeID != "" {
		t := in.TradeID
		input.TradeID = &t
	}
	return input, nil
}
