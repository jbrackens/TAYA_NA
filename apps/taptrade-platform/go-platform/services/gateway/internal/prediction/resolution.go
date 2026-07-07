package prediction

import (
	"context"
	"encoding/json"
	"errors"
	"time"
)

// ErrMarketNotDisputable is returned by FileDispute when, under the per-market
// lock, the market is no longer in a disputable state (e.g. it finalized in a
// race between the eligibility check and the dispute insert).
var ErrMarketNotDisputable = errors.New("market is not in a disputable state")

// ADR-0003/0004 foundation: the propose -> finalize resolution seam.
//
// A market resolution is first PROPOSED (with source attestation evidence) and
// held for a challenge window; payouts are only credited at FinalizeResolution.
// During the window a holder may file a dispute, which blocks finalization until
// reviewed. This eliminates clawbacks (funds are never paid before finalize).

// DefaultChallengeWindow is the default hold between proposing a resolution and
// finalizing payouts. ADR-0004 makes this a per-category business dial; one hour
// is a safe default until that policy is set.
const DefaultChallengeWindow = time.Hour

// ResolutionProposal is a pending proposed result awaiting the challenge window
// (and any dispute review) before it finalizes into a Settlement.
type ResolutionProposal struct {
	ID                string          `json:"id"`
	MarketID          string          `json:"marketId"`
	Result            MarketResult    `json:"result"`
	Status            string          `json:"status"` // proposed|finalized|voided|disputed
	AttestationSource string          `json:"attestationSource"`
	AttestationID     *string         `json:"attestationId,omitempty"`
	AttestationDigest *string         `json:"attestationDigest,omitempty"`
	AttestationData   json.RawMessage `json:"attestationData,omitempty"`
	ProposedBy        *string         `json:"proposedBy,omitempty"`
	ChallengeEndsAt   time.Time       `json:"challengeEndsAt"`
	ProposedAt        time.Time       `json:"proposedAt"`
	FinalizedAt       *time.Time      `json:"finalizedAt,omitempty"`
}

// Dispute is a user-filed challenge against a proposed resolution.
type Dispute struct {
	ID             string     `json:"id"`
	MarketID       string     `json:"marketId"`
	UserID         string     `json:"userId"`
	Reason         string     `json:"reason"`
	Status         string     `json:"status"` // open|upheld|rejected|withdrawn
	ResolutionNote *string    `json:"resolutionNote,omitempty"`
	BondPoints     int64      `json:"bondPoints"`
	CreatedAt      time.Time  `json:"createdAt"`
	ResolvedAt     *time.Time `json:"resolvedAt,omitempty"`
	ResolvedBy     *string    `json:"resolvedBy,omitempty"`
}

// ResolutionStore persists proposals and disputes for the propose -> finalize
// seam. Optional on the SettlementEngine: a nil store disables the windowed
// path (ProposeResolution/FinalizeResolution return an error), leaving the
// immediate ResolveMarket path unaffected. Concrete impl is wired in main/http;
// tests use an in-memory fake. Same decoupling rationale as WalletAdapter.
type ResolutionStore interface {
	CreateProposal(ctx context.Context, p *ResolutionProposal) error
	GetActiveProposal(ctx context.Context, marketID string) (*ResolutionProposal, error)
	// MarkProposalFinalized atomically claims a proposal for finalization
	// (proposed -> finalized) and reports whether THIS call won the claim
	// (true) or another finalizer already took it (false). The compare-and-swap
	// is the serialization point that makes payouts execute exactly once even
	// with concurrent finalizers (a second admin, another replica, the worker).
	MarkProposalFinalized(ctx context.Context, marketID string) (bool, error)
	// ReopenProposal reverts a claimed proposal (finalized -> proposed) when the
	// settle that follows the claim fails, so the funds aren't stranded — a
	// later tick or admin can retry instead.
	ReopenProposal(ctx context.Context, marketID string) error
	// MarkProposalVoided terminates a proposal without finalizing — e.g. an
	// upheld dispute voids the market — so the auto-finalizer won't retry it.
	MarkProposalVoided(ctx context.Context, marketID string) error
	// ListFinalizableProposals returns proposals whose challenge window has
	// elapsed and that are eligible for AUTOMATED finalize (proposed_by IS
	// NULL). Manually-proposed resolutions are intentionally excluded: ADR-0003
	// dual-control requires a second admin to finalize them via the office.
	ListFinalizableProposals(ctx context.Context, asOf time.Time) ([]ResolutionProposal, error)
	CountOpenDisputes(ctx context.Context, marketID string) (int, error)
	CreateDispute(ctx context.Context, d *Dispute) error
	ListDisputes(ctx context.Context, marketID string) ([]Dispute, error)
	// ListOpenDisputes returns every open dispute across all markets — the
	// office dispute-review queue (ADR-0004 #6).
	ListOpenDisputes(ctx context.Context) ([]Dispute, error)
	GetDispute(ctx context.Context, id string) (*Dispute, error)
	// ResolveDispute records an admin decision on a dispute (status upheld|
	// rejected|withdrawn) with a resolution note and the resolving admin.
	ResolveDispute(ctx context.Context, id, status, note string, resolvedBy *string) error
	// WithMarketLock runs fn while holding a cluster-wide per-market lock
	// (Postgres advisory lock), serializing finalize and dispute-filing for the
	// same market across goroutines AND gateway replicas. This is mutual
	// exclusion, not write-atomicity: fn's own statements still autocommit; the
	// lock guarantees no two critical sections for one market interleave, which
	// is what closes the double-finalize and dispute-then-finalize races.
	WithMarketLock(ctx context.Context, marketID string, fn func() error) error
}
