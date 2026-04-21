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
// In DB mode, settlement records, payout records, wallet credits, market
// status, and lifecycle logging can commit as one shared transaction.
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

	result := req.Result
	settlement := &Settlement{
		MarketID:          marketID,
		Result:            result,
		AttestationSource: req.AttestationSource,
		AttestationID:     req.AttestationID,
		AttestationDigest: &digest,
		AttestationData:   defaultJSONObject(req.AttestationData),
		SettledBy:         settledBy,
		SettledAt:         time.Now().UTC(),
	}

	// Get all positions for this market
	positions, err := s.repo.ListPositionsByMarket(ctx, marketID)
	if err != nil {
		return nil, nil, fmt.Errorf("list positions: %w", err)
	}

	// Calculate payouts and the wallet credits they imply.
	var payouts []Payout
	var credits []WalletCreditRequest
	var totalPayout int64
	var positionsSettled int

	for _, pos := range positions {
		if pos.Quantity <= 0 {
			continue
		}

		payout := s.calculatePayout(pos, result, settlement.ID)
		if payout.PayoutCents > 0 {
			credits = append(credits, WalletCreditRequest{
				UserID:         pos.UserID,
				AmountCents:    payout.PayoutCents,
				IdempotencyKey: fmt.Sprintf("prediction_payout:%s:%s", marketID, pos.ID),
				Reason: fmt.Sprintf("prediction settlement: market %s resolved %s, %s position won",
					marketID, result, pos.Side),
			})
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
	lifecycle := &LifecycleEvent{
		MarketID:   marketID,
		EventType:  "settled",
		ActorID:    settledBy,
		ActorType:  actorType(settledBy),
		Reason:     &reason,
		Metadata:   metadata,
		OccurredAt: time.Now().UTC(),
	}

	if atomicRepo, ok := s.repo.(AtomicMarketSettlementPersister); ok {
		if _, walletIsTxCapable := s.wallet.(TxWalletAdapter); walletIsTxCapable {
			if err := atomicRepo.PersistResolvedMarketAtomic(ctx, s.wallet, market, settlement, payouts, credits, lifecycle); err != nil {
				return nil, nil, fmt.Errorf("persist resolved market atomically: %w", err)
			}
			return settlement, payouts, nil
		}
	}

	if err := s.repo.CreateSettlement(ctx, settlement); err != nil {
		return nil, nil, fmt.Errorf("create settlement: %w", err)
	}
	for i := range payouts {
		payouts[i].SettlementID = settlement.ID
		if err := s.repo.CreatePayout(ctx, &payouts[i]); err != nil {
			return nil, nil, fmt.Errorf("create payout for position %s: %w", payouts[i].PositionID, err)
		}
	}
	for _, credit := range credits {
		if err := s.wallet.Credit(credit.UserID, credit.AmountCents, credit.IdempotencyKey, credit.Reason); err != nil {
			return nil, nil, fmt.Errorf("wallet credit failed for user %s: %w", credit.UserID, err)
		}
	}
	if err := s.repo.UpdateMarket(ctx, market); err != nil {
		return nil, nil, fmt.Errorf("update market: %w", err)
	}
	_ = s.repo.CreateLifecycleEvent(ctx, lifecycle)

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
	// Refund all positions at entry cost.
	positions, err := s.repo.ListPositionsByMarket(ctx, marketID)
	if err != nil {
		return nil, fmt.Errorf("list positions: %w", err)
	}

	var payouts []Payout
	var credits []WalletCreditRequest
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
		credits = append(credits, WalletCreditRequest{
			UserID:         pos.UserID,
			AmountCents:    pos.TotalCostCents,
			IdempotencyKey: fmt.Sprintf("prediction_void:%s:%s", marketID, pos.ID),
			Reason:         fmt.Sprintf("prediction refund: market %s voided, returning stake", market.Ticker),
		})
		payouts = append(payouts, payout)
	}

	// Log lifecycle event
	metadata, _ := json.Marshal(map[string]interface{}{
		"reason":             reason,
		"positions_refunded": len(payouts),
	})
	lifecycle := &LifecycleEvent{
		MarketID:   marketID,
		EventType:  "voided",
		ActorID:    actorID,
		ActorType:  actorType(actorID),
		Reason:     &reason,
		Metadata:   metadata,
		OccurredAt: time.Now().UTC(),
	}

	if atomicRepo, ok := s.repo.(AtomicMarketSettlementPersister); ok {
		if _, walletIsTxCapable := s.wallet.(TxWalletAdapter); walletIsTxCapable {
			if err := atomicRepo.PersistVoidedMarketAtomic(ctx, s.wallet, market, payouts, credits, lifecycle); err != nil {
				return nil, fmt.Errorf("persist voided market atomically: %w", err)
			}
			return payouts, nil
		}
	}

	if err := s.repo.UpdateMarket(ctx, market); err != nil {
		return nil, fmt.Errorf("update market: %w", err)
	}
	for _, credit := range credits {
		if err := s.wallet.Credit(credit.UserID, credit.AmountCents, credit.IdempotencyKey, credit.Reason); err != nil {
			return nil, fmt.Errorf("wallet refund failed for user %s: %w", credit.UserID, err)
		}
	}
	_ = s.repo.CreateLifecycleEvent(ctx, lifecycle)

	return payouts, nil
}

func actorType(actorID *string) string {
	if actorID != nil {
		return "admin"
	}
	return "system"
}
