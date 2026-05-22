package prediction

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// SettlementEngine handles resolving markets and distributing payouts.
type SettlementEngine struct {
	repo              Repository
	wallet            WalletAdapter
	loyalty           LoyaltyAdapter         // optional; nil means no loyalty accrual on settlement
	onTierPromoted    TierPromotedHandler    // optional; fired post-commit per plan §8
	onMarketLifecycle MarketLifecycleHandler // optional; fired post-commit on settle/void
	// Optional Prometheus-format counter registry. Wired through from the
	// parent Service via SetMetrics so a settle records a counter. nil is
	// safe — the Record* helpers no-op.
	metrics *Metrics
	// Optional settlement audit recorder. nil disables auditing. The concrete
	// implementation lives in internal/http (same decoupling rationale as
	// WalletAdapter — keeps the prediction package transport-agnostic).
	auditor SettlementAuditor
	// Optional resolution store for the propose -> finalize seam (ADR-0003/0004).
	// nil disables ProposeResolution/FinalizeResolution; ResolveMarket (the
	// immediate path) is unaffected. Concrete impl is wired in internal/http.
	resolutions ResolutionStore
}

// SettlementAuditor records an audit-log entry for a completed settlement,
// whether admin-triggered or resolved by the AutoSettler. Optional; a nil
// auditor disables auditing.
type SettlementAuditor interface {
	RecordSettlement(actorID, marketID string, details map[string]any)
}

// TierPromotedHandler is a post-commit callback invoked once per user whose
// tier changed during the settlement. Handlers are called in a goroutine,
// fire-and-forget — a failed WebSocket push is expected OK per plan §8.
type TierPromotedHandler func(userID string, fromTier, toTier int)

// NewSettlementEngine creates a new settlement engine.
// If wallet is nil, payouts are logged but not credited (useful for tests).
func NewSettlementEngine(repo Repository, wallet WalletAdapter) *SettlementEngine {
	if wallet == nil {
		wallet = NoopWallet{}
	}
	return &SettlementEngine{repo: repo, wallet: wallet}
}

// SetLoyaltyAdapter enables loyalty accrual on the atomic settlement path.
// Pass nil to disable again. Safe to call before or after the engine has
// started handling requests (callers typically wire it at startup).
func (s *SettlementEngine) SetLoyaltyAdapter(adapter LoyaltyAdapter) {
	s.loyalty = adapter
}

// SetTierPromotedHandler wires the post-commit callback fired whenever an
// accrual advances the user's tier. Pass nil to disable. See plan §8.
func (s *SettlementEngine) SetTierPromotedHandler(fn TierPromotedHandler) {
	s.onTierPromoted = fn
}

// SetMarketLifecycleHandler wires the post-commit callback fired after a
// market is resolved or voided. Pass nil to disable. Same hook is fired
// from Service.TransitionMarketStatus for open/halt/close/void via a
// non-settlement path; this engine fires it for settle (ResolveMarket)
// and void (VoidMarket).
func (s *SettlementEngine) SetMarketLifecycleHandler(fn MarketLifecycleHandler) {
	s.onMarketLifecycle = fn
}

// SetSettlementAuditor wires the optional settlement audit recorder. Pass nil
// to disable.
func (s *SettlementEngine) SetSettlementAuditor(a SettlementAuditor) {
	s.auditor = a
}

// SetResolutionStore wires the optional propose -> finalize resolution store.
// Pass nil to disable the windowed path.
func (s *SettlementEngine) SetResolutionStore(store ResolutionStore) {
	s.resolutions = store
}

// ProposeResolution records a proposed result for a closed market and moves it
// into the challenge window (status proposed_resolution). Payouts are NOT
// credited until FinalizeResolution. Requires a configured ResolutionStore.
func (s *SettlementEngine) ProposeResolution(ctx context.Context, req ResolveMarketRequest, marketID string, proposedBy *string, window time.Duration) (*ResolutionProposal, error) {
	if s.resolutions == nil {
		return nil, fmt.Errorf("resolution store not configured")
	}
	market, err := s.repo.GetMarket(ctx, marketID)
	if err != nil {
		return nil, fmt.Errorf("get market: %w", err)
	}
	if market.Status != MarketStatusClosed {
		return nil, fmt.Errorf("market %s is not closed (status: %s), cannot propose", market.Ticker, market.Status)
	}
	if window <= 0 {
		window = DefaultChallengeWindow
	}

	var digest *string
	if req.AttestationData != nil {
		h := sha256.Sum256(req.AttestationData)
		d := fmt.Sprintf("%x", h)
		digest = &d
	}
	now := time.Now().UTC()
	proposal := &ResolutionProposal{
		MarketID:          marketID,
		Result:            req.Result,
		Status:            "proposed",
		AttestationSource: req.AttestationSource,
		AttestationID:     req.AttestationID,
		AttestationDigest: digest,
		AttestationData:   defaultJSONObject(req.AttestationData),
		ProposedBy:        proposedBy,
		ChallengeEndsAt:   now.Add(window),
		ProposedAt:        now,
	}
	result := req.Result
	market.Result = &result
	if err := TransitionMarket(market, MarketStatusProposedResolution); err != nil {
		return nil, fmt.Errorf("transition market: %w", err)
	}
	lifecycle := &LifecycleEvent{
		MarketID:   marketID,
		EventType:  string(MarketStatusProposedResolution),
		ActorID:    proposedBy,
		ActorType:  actorType(proposedBy),
		OccurredAt: now,
	}

	// Persist the proposal + the closed -> proposed_resolution transition + the
	// lifecycle event atomically when the repo supports it (production), so a
	// crash can't strand an unrecoverable orphan proposal. Fall back to separate
	// writes for in-memory test repos (effectively atomic there anyway).
	if ap, ok := s.repo.(AtomicProposalPersister); ok {
		if err := ap.PersistProposalAtomic(ctx, proposal, lifecycle); err != nil {
			return nil, fmt.Errorf("persist proposal: %w", err)
		}
	} else {
		if err := s.resolutions.CreateProposal(ctx, proposal); err != nil {
			return nil, fmt.Errorf("create resolution proposal: %w", err)
		}
		if err := s.repo.UpdateMarket(ctx, market); err != nil {
			return nil, fmt.Errorf("update market: %w", err)
		}
		_ = s.repo.CreateLifecycleEvent(ctx, lifecycle)
	}

	s.fireMarketLifecycle(market, lifecycle)
	return proposal, nil
}

// FinalizeResolution finalizes a proposed resolution once the challenge window
// has elapsed and no dispute is open: it credits payouts and settles the market
// (reusing ResolveMarket). Idempotency for payouts is handled by the existing
// per-position idempotency keys.
func (s *SettlementEngine) FinalizeResolution(ctx context.Context, marketID string, finalizedBy *string) (*Settlement, []Payout, error) {
	if s.resolutions == nil {
		return nil, nil, fmt.Errorf("resolution store not configured")
	}

	// The whole check -> claim -> pay critical section runs under a per-market
	// lock so it cannot interleave with another finalizer (second admin, another
	// replica, the worker) or a concurrently-filed dispute. This is what makes
	// the windowed money path race-free; the CAS claim below is belt-and-braces.
	var settlement *Settlement
	var payouts []Payout
	err := s.resolutions.WithMarketLock(ctx, marketID, func() error {
		proposal, err := s.resolutions.GetActiveProposal(ctx, marketID)
		if err != nil {
			return fmt.Errorf("get resolution proposal: %w", err)
		}
		if proposal == nil {
			return fmt.Errorf("no active resolution proposal for market %s", marketID)
		}

		// Reconcile a proposal stranded on an already-terminal market (e.g. the
		// market was voided by an upheld dispute or settled out-of-band): void
		// the proposal so the auto-finalizer stops retrying it forever.
		if market, merr := s.repo.GetMarket(ctx, marketID); merr == nil && IsTerminal(market.Status) {
			_ = s.resolutions.MarkProposalVoided(ctx, marketID)
			return fmt.Errorf("market %s is already %s; proposal reconciled", marketID, market.Status)
		}

		// Dual-control (ADR-0003 #5): a human finalizer must differ from the
		// proposer. The automated path (finalizedBy == nil) is exempt — it only
		// finalizes system-proposed resolutions (ListFinalizableProposals
		// filters proposed_by IS NULL), so a self-approval is impossible there.
		if finalizedBy != nil && proposal.ProposedBy != nil && *finalizedBy == *proposal.ProposedBy {
			return fmt.Errorf("dual-control: the finalizing admin must differ from the proposer")
		}
		if time.Now().UTC().Before(proposal.ChallengeEndsAt) {
			return fmt.Errorf("challenge window for market %s has not elapsed", marketID)
		}
		// Authoritative under the lock: a dispute cannot be filed between this
		// check and the payout, because FileDispute takes the same lock.
		if openDisputes, derr := s.resolutions.CountOpenDisputes(ctx, marketID); derr != nil {
			return fmt.Errorf("count open disputes: %w", derr)
		} else if openDisputes > 0 {
			return fmt.Errorf("market %s has %d open dispute(s); cannot finalize", marketID, openDisputes)
		}

		// Claim (proposed -> finalized CAS) so even a same-process double-call
		// pays once; reopen if the settle that follows fails.
		claimed, err := s.resolutions.MarkProposalFinalized(ctx, marketID)
		if err != nil {
			return fmt.Errorf("claim resolution proposal: %w", err)
		}
		if !claimed {
			return fmt.Errorf("resolution for market %s is already being finalized", marketID)
		}

		st, po, serr := s.resolveMarket(ctx, ResolveMarketRequest{
			Result:            proposal.Result,
			AttestationSource: proposal.AttestationSource,
			AttestationID:     proposal.AttestationID,
			AttestationData:   proposal.AttestationData,
		}, marketID, finalizedBy, true)
		if serr != nil {
			_ = s.resolutions.ReopenProposal(ctx, marketID)
			return serr
		}
		settlement, payouts = st, po
		return nil
	})
	if err != nil {
		return nil, nil, err
	}
	return settlement, payouts, nil
}

// FileDispute records a user dispute against a proposed resolution under the
// per-market lock, so it cannot interleave with a concurrent FinalizeResolution
// (closing the dispute-then-finalize race). Eligibility (the user holds a
// position) is the caller's responsibility; this re-verifies the market is
// disputable under the lock, inserts the dispute, and transitions
// proposed_resolution -> disputed. Returns ErrMarketNotDisputable if the market
// is no longer disputable (e.g. it finalized in the race).
func (s *SettlementEngine) FileDispute(ctx context.Context, marketID, userID, reason string) (*Dispute, error) {
	if s.resolutions == nil {
		return nil, fmt.Errorf("resolution store not configured")
	}
	dispute := &Dispute{MarketID: marketID, UserID: userID, Reason: reason, Status: "open"}
	err := s.resolutions.WithMarketLock(ctx, marketID, func() error {
		market, err := s.repo.GetMarket(ctx, marketID)
		if err != nil {
			return fmt.Errorf("get market: %w", err)
		}
		if market.Status != MarketStatusProposedResolution && market.Status != MarketStatusDisputed {
			return ErrMarketNotDisputable
		}
		if err := s.resolutions.CreateDispute(ctx, dispute); err != nil {
			return fmt.Errorf("create dispute: %w", err)
		}
		// Reflect the first dispute in the FSM (proposed_resolution -> disputed).
		if market.Status == MarketStatusProposedResolution {
			if err := TransitionMarket(market, MarketStatusDisputed); err != nil {
				return fmt.Errorf("transition market: %w", err)
			}
			if err := s.repo.UpdateMarket(ctx, market); err != nil {
				return fmt.Errorf("update market: %w", err)
			}
			actor := userID
			lifecycle := &LifecycleEvent{
				MarketID:   marketID,
				EventType:  string(MarketStatusDisputed),
				ActorID:    &actor,
				ActorType:  "user",
				OccurredAt: time.Now().UTC(),
			}
			_ = s.repo.CreateLifecycleEvent(ctx, lifecycle)
			s.fireMarketLifecycle(market, lifecycle)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return dispute, nil
}

// MarkMarketDisputed moves a market from proposed_resolution to disputed when
// the first dispute is filed, so the state is visible to users and ops. It is
// idempotent and best-effort: a no-op when the market is not in
// proposed_resolution (already disputed, settled, or no longer disputable).
// The finalize gate itself is CountOpenDisputes, not this status — so a missed
// transition never lets a disputed market settle.
func (s *SettlementEngine) MarkMarketDisputed(ctx context.Context, marketID, disputerID string) error {
	market, err := s.repo.GetMarket(ctx, marketID)
	if err != nil {
		return fmt.Errorf("get market: %w", err)
	}
	if market.Status != MarketStatusProposedResolution {
		return nil
	}
	if err := TransitionMarket(market, MarketStatusDisputed); err != nil {
		return fmt.Errorf("transition market: %w", err)
	}
	if err := s.repo.UpdateMarket(ctx, market); err != nil {
		return fmt.Errorf("update market: %w", err)
	}
	actor := disputerID
	lifecycle := &LifecycleEvent{
		MarketID:   marketID,
		EventType:  string(MarketStatusDisputed),
		ActorID:    &actor,
		ActorType:  "user",
		OccurredAt: time.Now().UTC(),
	}
	_ = s.repo.CreateLifecycleEvent(ctx, lifecycle)
	s.fireMarketLifecycle(market, lifecycle)
	return nil
}

// ResolveDispute records an admin decision on a dispute (ADR-0004 review queue).
//
//	uphold=true  → the proposed result was wrong: VOID the market (refund stakes,
//	               no clawback since payouts were held) and terminate the
//	               proposal so the auto-finalizer skips it. Every open dispute on
//	               the market is marked upheld — the void vindicates all of them.
//	uphold=false → reject this dispute as without merit; the market stays
//	               disputed until all open disputes clear, then finalize settles.
//
// Dual-control: the reviewing admin must differ from the resolution proposer.
func (s *SettlementEngine) ResolveDispute(ctx context.Context, disputeID string, uphold bool, note string, resolvedBy *string) (*Dispute, error) {
	if s.resolutions == nil {
		return nil, fmt.Errorf("resolution store not configured")
	}
	dispute, err := s.resolutions.GetDispute(ctx, disputeID)
	if err != nil {
		return nil, fmt.Errorf("get dispute: %w", err)
	}
	if dispute == nil {
		return nil, fmt.Errorf("dispute %s not found", disputeID)
	}
	if dispute.Status != "open" {
		return nil, fmt.Errorf("dispute %s is already resolved (%s)", disputeID, dispute.Status)
	}
	// Dual-control: the reviewing admin must differ from the proposer. A read
	// error here must NOT silently skip the check (that would let the proposer
	// review their own dispute on a transient DB blip) — fail the operation.
	proposal, perr := s.resolutions.GetActiveProposal(ctx, dispute.MarketID)
	if perr != nil {
		return nil, fmt.Errorf("get active proposal: %w", perr)
	}
	if proposal != nil && proposal.ProposedBy != nil && resolvedBy != nil && *resolvedBy == *proposal.ProposedBy {
		return nil, fmt.Errorf("dual-control: the reviewing admin must differ from the proposer")
	}

	if !uphold {
		if err := s.resolutions.ResolveDispute(ctx, disputeID, "rejected", note, resolvedBy); err != nil {
			return nil, fmt.Errorf("resolve dispute: %w", err)
		}
		dispute.Status = "rejected"
		dispute.ResolvedBy = resolvedBy
		return dispute, nil
	}

	reason := "resolution dispute upheld"
	if note != "" {
		reason = note
	}
	if _, err := s.VoidMarket(ctx, dispute.MarketID, reason, resolvedBy); err != nil {
		return nil, fmt.Errorf("void market: %w", err)
	}
	if err := s.resolutions.MarkProposalVoided(ctx, dispute.MarketID); err != nil {
		return nil, fmt.Errorf("mark proposal voided: %w", err)
	}
	// The void resolves the whole market: mark every open dispute upheld.
	open, _ := s.resolutions.ListDisputes(ctx, dispute.MarketID)
	for _, d := range open {
		if d.Status == "open" {
			_ = s.resolutions.ResolveDispute(ctx, d.ID, "upheld", reason, resolvedBy)
		}
	}
	dispute.Status = "upheld"
	dispute.ResolvedBy = resolvedBy
	return dispute, nil
}

// recordSettlementAudit emits a post-commit audit entry for a settlement. The
// actor is the admin who settled, or "auto-settler" when the AutoSettler
// resolved the market (settledBy == nil).
func (s *SettlementEngine) recordSettlementAudit(settledBy *string, settlement *Settlement) {
	if s.auditor == nil || settlement == nil {
		return
	}
	actor := "auto-settler"
	if settledBy != nil && *settledBy != "" {
		actor = *settledBy
	}
	s.auditor.RecordSettlement(actor, settlement.MarketID, map[string]any{
		"settlementId":      settlement.ID,
		"result":            settlement.Result,
		"totalPayoutCents":  settlement.TotalPayoutCents,
		"positionsSettled":  settlement.PositionsSettled,
		"attestationSource": settlement.AttestationSource,
	})
}

// ResolveMarket is the DIRECT (immediate) settle path: admin "settle now" and
// the backward-compat AutoSettler path when no resolution store is wired. It
// only accepts a `closed` market. A market already in the windowed resolution
// flow (proposed_resolution / disputed) must settle through FinalizeResolution
// so the challenge window, dual-control, and dispute gates cannot be bypassed
// by hitting the legacy settle endpoint.
func (s *SettlementEngine) ResolveMarket(ctx context.Context, req ResolveMarketRequest, marketID string, settledBy *string) (*Settlement, []Payout, error) {
	return s.resolveMarket(ctx, req, marketID, settledBy, false)
}

// resolveMarket is the shared settle implementation. allowWindowed=true is the
// FinalizeResolution path (settling out of proposed_resolution / disputed once
// the gates have passed); allowWindowed=false is the direct path (closed only).
// In DB mode, settlement records, payout records, wallet credits, market
// status, and lifecycle logging can commit as one shared transaction.
func (s *SettlementEngine) resolveMarket(ctx context.Context, req ResolveMarketRequest, marketID string, settledBy *string, allowWindowed bool) (*Settlement, []Payout, error) {
	market, err := s.repo.GetMarket(ctx, marketID)
	if err != nil {
		return nil, nil, fmt.Errorf("get market: %w", err)
	}

	switch market.Status {
	case MarketStatusClosed:
		// Always settle-eligible (immediate / backward-compat).
	case MarketStatusProposedResolution, MarketStatusDisputed:
		// Only reachable via FinalizeResolution, never the direct endpoint.
		if !allowWindowed {
			return nil, nil, fmt.Errorf("market %s is in the resolution challenge flow (status: %s); settle it via finalize, not direct settle", market.Ticker, market.Status)
		}
	default:
		return nil, nil, fmt.Errorf("market %s is not settle-eligible (status: %s)", market.Ticker, market.Status)
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
		// Override reason flows from the back-office settlement modal
		// through ResolveMarketRequest. Empty string is treated the same
		// as nil — the back-office sends "" when the field is untouched
		// rather than omitting it. The CHECK constraint on the
		// prediction_settlements table requires either a non-empty
		// override_reason and the override flag set together, or both
		// absent; normalising to nil keeps that invariant honest.
	}
	if req.OverrideReason != nil && strings.TrimSpace(*req.OverrideReason) != "" {
		trimmed := strings.TrimSpace(*req.OverrideReason)
		settlement.OverrideReason = &trimmed
	}

	// Get all positions for this market
	positions, err := s.repo.ListPositionsByMarket(ctx, marketID)
	if err != nil {
		return nil, nil, fmt.Errorf("list positions: %w", err)
	}

	// Calculate payouts and the wallet credits they imply.
	var payouts []Payout
	var credits []WalletCreditRequest
	var accruals []LoyaltyAccrualRequest
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

		if s.loyalty != nil && pos.TotalCostCents > 0 {
			won := (pos.Side == OrderSideYes && result == MarketResultYes) ||
				(pos.Side == OrderSideNo && result == MarketResultNo)
			accruals = append(accruals, LoyaltyAccrualRequest{
				UserID:         pos.UserID,
				VolumeCents:    pos.TotalCostCents,
				IsCorrect:      won,
				MarketID:       marketID,
				IdempotencyKey: fmt.Sprintf("accrual:%s:%s", marketID, pos.ID),
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
			loyaltyResults, err := atomicRepo.PersistResolvedMarketAtomic(ctx, s.wallet, market, settlement, payouts, credits, s.loyalty, accruals, lifecycle)
			if err != nil {
				return nil, nil, fmt.Errorf("persist resolved market atomically: %w", err)
			}
			// Post-commit: fire tier-promoted callbacks. Fire-and-forget per
			// plan §8 — WS loss is expected to happen occasionally and the
			// TierPill's 60s poll is the safety net.
			if s.onTierPromoted != nil {
				for _, res := range loyaltyResults {
					if res.Promoted {
						go s.onTierPromoted(res.UserID, res.FromTier, res.ToTier)
					}
				}
			}
			s.metrics.RecordSettlement(marketID, string(result), settlement.OverrideReason != nil)
			s.fireMarketLifecycle(market, lifecycle)
			s.recordSettlementAudit(settledBy, settlement)
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
	// Loyalty accrual requires the atomic (shared-tx) settlement path — the
	// non-atomic path is only reachable from tests with in-memory repos.
	// Silently skip accrual here; production always uses the atomic path.
	_ = accruals
	if err := s.repo.UpdateMarket(ctx, market); err != nil {
		return nil, nil, fmt.Errorf("update market: %w", err)
	}
	_ = s.repo.CreateLifecycleEvent(ctx, lifecycle)

	// TODO: thread override flag through ResolveMarketRequest once the
	// HTTP layer pipes overrideReason from the back-office settlement
	// modal into the request body. Until then, every settlement records
	// override=false even when the admin filled in the override field.
	s.metrics.RecordSettlement(marketID, string(result), false)
	s.fireMarketLifecycle(market, lifecycle)
	s.recordSettlementAudit(settledBy, settlement)
	return settlement, payouts, nil
}

// fireMarketLifecycle dispatches the post-commit lifecycle callback if one
// is registered. Always fires in a goroutine so a slow / blocking handler
// (e.g. a stuck WebSocket publish) cannot stall the settlement caller.
// Safe to call with nil handler.
func (s *SettlementEngine) fireMarketLifecycle(market *Market, lifecycle *LifecycleEvent) {
	if s.onMarketLifecycle == nil || market == nil || lifecycle == nil {
		return
	}
	go s.onMarketLifecycle(market, *lifecycle)
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
			s.fireMarketLifecycle(market, lifecycle)
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

	s.fireMarketLifecycle(market, lifecycle)
	return payouts, nil
}

func actorType(actorID *string) string {
	if actorID != nil {
		return "admin"
	}
	return "system"
}
