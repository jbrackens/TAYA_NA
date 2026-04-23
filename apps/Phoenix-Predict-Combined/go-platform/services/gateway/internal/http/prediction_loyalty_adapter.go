package http

import (
	"context"
	"database/sql"

	"phoenix-revival/gateway/internal/loyalty"
	"phoenix-revival/gateway/internal/prediction"
)

// predictionLoyaltyAdapter bridges loyalty.PredictService to the
// prediction.LoyaltyAdapter interface, keeping the prediction package
// domain-decoupled from loyalty (mirrors prediction_wallet_adapter.go).
type predictionLoyaltyAdapter struct {
	svc *loyalty.PredictService
}

// newPredictionLoyaltyAdapter wires the bridge over the given service.
// A nil svc returns nil so callers can conditionally enable loyalty.
func newPredictionLoyaltyAdapter(svc *loyalty.PredictService) prediction.LoyaltyAdapter {
	if svc == nil {
		return nil
	}
	return &predictionLoyaltyAdapter{svc: svc}
}

// AccrueSettledWithTx forwards the settlement-time accrual to the loyalty
// service, participating in the caller-owned tx (see plan §8).
func (a *predictionLoyaltyAdapter) AccrueSettledWithTx(ctx context.Context, tx *sql.Tx, req prediction.LoyaltyAccrualRequest) error {
	_, err := a.svc.AccrueSettledWithTx(ctx, tx, loyalty.PredictSettlementAccrual{
		UserID:         req.UserID,
		VolumeCents:    req.VolumeCents,
		IsCorrect:      req.IsCorrect,
		MarketID:       req.MarketID,
		TradeID:        req.TradeID,
		IdempotencyKey: req.IdempotencyKey,
	})
	return err
}
