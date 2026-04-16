package prediction

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"time"
)

// SettlementEngine handles resolving markets and distributing payouts.
type SettlementEngine struct {
	repo   Repository
	wallet WalletAdapter
}

// NewSettlementEngine creates a new settlement engine.
// If wallet is nil, payouts are logged but not credited (useful for tests).
func NewSettlementEngine(repo Repository, wallet WalletAdapter) *SettlementEngine {
	if wallet == nil {
		wallet = NoopWallet{}
	}
	return &SettlementEngine{repo: repo, wallet: wallet}
}

// ResolveMarket settles a market with the given result and attestation.
// It transitions the market to settled, creates a settlement record,
// calculates payouts for all positions, and returns the total payout.
//
// The caller is responsible for crediting wallets with payout amounts.
func (s *SettlementEngine) ResolveMarket(ctx context.Context, req ResolveMarketRequest, marketID string, settledBy *string) (*Settlement, []Payout, error) {
	market, err := s.repo.GetMarket(ctx, marketID)
	if err != nil {
		return nil, nil, fmt.Errorf("get market: %w", err)
	}

	// Market must be closed to settle
	if market.Status != MarketStatusClosed {
		return nil, nil, fmt.Errorf("market %s is not closed (status: %s), cannot settle", market.Ticker, market.Status)
	}

	// Compute attestation digest
	var digest string
	if req.AttestationData != nil {
		h := sha256.Sum256(req.AttestationData)
		digest = fmt.Sprintf("%x", h)
	}

	// Create settlement record
	result := req.Result
	settlement := &Settlement{
		MarketID:          marketID,
		Result:            result,
		AttestationSource: req.AttestationSource,
		AttestationID:     req.AttestationID,
		AttestationDigest: &digest,
		AttestationData:   req.AttestationData,
		SettledBy:         settledBy,
		SettledAt:         time.Now().UTC(),
	}

	if err := s.repo.CreateSettlement(ctx, settlement); err != nil {
		return nil, nil, fmt.Errorf("create settlement: %w", err)
	}

	// Get all positions for this market
	positions, err := s.repo.ListPositionsByMarket(ctx, marketID)
	if err != nil {
		return nil, nil, fmt.Errorf("list positions: %w", err)
	}

	// Calculate and create payouts
	var payouts []Payout
	var totalPayout int64
	var positionsSettled int

	for _, pos := range positions {
		if pos.Quantity <= 0 {
			continue
		}

		payout := s.calculatePayout(pos, result, settlement.ID)
		if err := s.repo.CreatePayout(ctx, &payout); err != nil {
			return nil, nil, fmt.Errorf("create payout for position %s: %w", pos.ID, err)
		}

		// Credit the winner's wallet. Losers get 0 — no credit needed.
		// Idempotency key scopes the credit to this settlement + position so
		// re-runs of a settle operation don't double-credit.
		if payout.PayoutCents > 0 {
			idempKey := fmt.Sprintf("prediction_payout:%s:%s", settlement.ID, pos.ID)
			reason := fmt.Sprintf("prediction settlement: market %s resolved %s, %s position won",
				marketID, result, pos.Side)
			if err := s.wallet.Credit(pos.UserID, payout.PayoutCents, idempKey, reason); err != nil {
				return nil, nil, fmt.Errorf("wallet credit failed for user %s: %w", pos.UserID, err)
			}
		}

		payouts = append(payouts, payout)
		totalPayout += payout.PayoutCents
		positionsSettled++
	}

	// Update settlement totals
	settlement.TotalPayoutCents = totalPayout
	settlement.PositionsSettled = positionsSettled

	// Transition market to settled
	marketResult := result
	market.Result = &marketResult
	if err := TransitionMarket(market, MarketStatusSettled); err != nil {
		return nil, nil, fmt.Errorf("transition market: %w", err)
	}
	if err := s.repo.UpdateMarket(ctx, market); err != nil {
		return nil, nil, fmt.Errorf("update market: %w", err)
	}

	// Log lifecycle event
	reason := "market settled"
	if req.Reason != nil {
		reason = *req.Reason
	}
	metadata, _ := json.Marshal(map[string]interface{}{
		"result":             string(result),
		"attestation_source": req.AttestationSource,
		"total_payout_cents": totalPayout,
		"positions_settled":  positionsSettled,
	})
	s.repo.CreateLifecycleEvent(ctx, &LifecycleEvent{
		MarketID:   marketID,
		EventType:  "settled",
		ActorID:    settledBy,
		ActorType:  actorType(settledBy),
		Reason:     &reason,
		Metadata:   metadata,
		OccurredAt: time.Now().UTC(),
	})

	return settlement, payouts, nil
}

// calculatePayout determines the payout for a single position.
// Winners get 100¢ per contract; losers get 0.
func (s *SettlementEngine) calculatePayout(pos Position, result MarketResult, settlementID string) Payout {
	won := (pos.Side == OrderSideYes && result == MarketResultYes) ||
		(pos.Side == OrderSideNo && result == MarketResultNo)

	var exitPriceCents int
	var payoutCents int64
	if won {
		exitPriceCents = 100
		payoutCents = int64(pos.Quantity) * 100
	} else {
		exitPriceCents = 0
		payoutCents = 0
	}

	pnl := payoutCents - pos.TotalCostCents

	return Payout{
		SettlementID:    settlementID,
		PositionID:      pos.ID,
		UserID:          pos.UserID,
		MarketID:        pos.MarketID,
		Side:            pos.Side,
		Quantity:        pos.Quantity,
		EntryPriceCents: pos.AvgPriceCents,
		ExitPriceCents:  exitPriceCents,
		PnlCents:        pnl,
		PayoutCents:     payoutCents,
		PaidAt:          time.Now().UTC(),
	}
}

// VoidMarket voids a market and refunds all positions at their entry cost.
func (s *SettlementEngine) VoidMarket(ctx context.Context, marketID string, reason string, actorID *string) ([]Payout, error) {
	market, err := s.repo.GetMarket(ctx, marketID)
	if err != nil {
		return nil, fmt.Errorf("get market: %w", err)
	}

	if IsTerminal(market.Status) {
		return nil, fmt.Errorf("market %s is already in terminal state: %s", market.Ticker, market.Status)
	}

	// Transition to voided
	if err := TransitionMarket(market, MarketStatusVoided); err != nil {
		return nil, fmt.Errorf("transition market: %w", err)
	}
	if err := s.repo.UpdateMarket(ctx, market); err != nil {
		return nil, fmt.Errorf("update market: %w", err)
	}

	// Refund all positions at entry cost
	positions, err := s.repo.ListPositionsByMarket(ctx, marketID)
	if err != nil {
		return nil, fmt.Errorf("list positions: %w", err)
	}

	var payouts []Payout
	for _, pos := range positions {
		if pos.Quantity <= 0 {
			continue
		}
		payout := Payout{
			PositionID:      pos.ID,
			UserID:          pos.UserID,
			MarketID:        pos.MarketID,
			Side:            pos.Side,
			Quantity:        pos.Quantity,
			EntryPriceCents: pos.AvgPriceCents,
			ExitPriceCents:  pos.AvgPriceCents, // refund at entry
			PnlCents:        0,
			PayoutCents:     pos.TotalCostCents,
			PaidAt:          time.Now().UTC(),
		}
		// Refund the stake to the user's wallet. Idempotency scopes to this
		// void operation + position so re-runs don't double-refund.
		idempKey := fmt.Sprintf("prediction_void:%s:%s", marketID, pos.ID)
		refundReason := fmt.Sprintf("prediction refund: market %s voided, returning stake", market.Ticker)
		if err := s.wallet.Credit(pos.UserID, pos.TotalCostCents, idempKey, refundReason); err != nil {
			return nil, fmt.Errorf("wallet refund failed for user %s: %w", pos.UserID, err)
		}
		payouts = append(payouts, payout)
	}

	// Log lifecycle event
	metadata, _ := json.Marshal(map[string]interface{}{
		"reason":            reason,
		"positions_refunded": len(payouts),
	})
	s.repo.CreateLifecycleEvent(ctx, &LifecycleEvent{
		MarketID:   marketID,
		EventType:  "voided",
		ActorID:    actorID,
		ActorType:  actorType(actorID),
		Reason:     &reason,
		Metadata:   metadata,
		OccurredAt: time.Now().UTC(),
	})

	return payouts, nil
}

func actorType(actorID *string) string {
	if actorID != nil {
		return "admin"
	}
	return "system"
}
