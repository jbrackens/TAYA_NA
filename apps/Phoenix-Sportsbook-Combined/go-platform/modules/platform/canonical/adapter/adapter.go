package adapter

import (
	"context"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

type PlaceBetItem struct {
	FixtureID     string  `json:"fixtureId"`
	MarketID      string  `json:"marketId"`
	SelectionID   string  `json:"selectionId"`
	OddsDecimal   float64 `json:"oddsDecimal"`
	StakeCents    int64   `json:"stakeCents"`
	IsInPlay      bool    `json:"isInPlay"`
	RequestLineID string  `json:"requestLineId,omitempty"`
}

type PlaceBetRequest struct {
	PlayerID      string            `json:"playerId"`
	RequestID     string            `json:"requestId"`
	SegmentID     string            `json:"segmentId,omitempty"`
	DeviceID      string            `json:"deviceId,omitempty"`
	IPAddress     string            `json:"ipAddress,omitempty"`
	AcceptAnyOdds bool              `json:"acceptAnyOdds"`
	Stake         canonicalv1.Money `json:"stake"`
	Items         []PlaceBetItem    `json:"items"`
}

type PlaceBetResponse struct {
	Bet              canonicalv1.Bet `json:"bet"`
	ProviderBetID    string          `json:"providerBetId,omitempty"`
	ProviderRevision int64           `json:"providerRevision,omitempty"`
}

type CancelBetRequest struct {
	PlayerID  string `json:"playerId"`
	BetID     string `json:"betId"`
	RequestID string `json:"requestId,omitempty"`
	Reason    string `json:"reason,omitempty"`
}

type CancelBetResponse struct {
	Bet              canonicalv1.Bet `json:"bet"`
	ProviderRevision int64           `json:"providerRevision,omitempty"`
}

type MaxStakeRequest struct {
	PlayerID    string  `json:"playerId"`
	FixtureID   string  `json:"fixtureId"`
	MarketID    string  `json:"marketId"`
	SelectionID string  `json:"selectionId"`
	OddsDecimal float64 `json:"oddsDecimal"`
}

type MaxStakeResponse struct {
	Allowed       bool   `json:"allowed"`
	MaxStakeCents int64  `json:"maxStakeCents"`
	Reason        string `json:"reason,omitempty"`
}

type CashoutQuoteRequest struct {
	PlayerID string `json:"playerId"`
	BetID    string `json:"betId"`
}

type CashoutQuoteResponse struct {
	BetID            string            `json:"betId"`
	Quote            canonicalv1.Money `json:"quote"`
	QuoteID          string            `json:"quoteId"`
	ExpiresAtUTC     string            `json:"expiresAtUtc"`
	ProviderRevision int64             `json:"providerRevision,omitempty"`
}

type CashoutAcceptRequest struct {
	PlayerID string `json:"playerId"`
	BetID    string `json:"betId"`
	QuoteID  string `json:"quoteId"`
}

type CashoutAcceptResponse struct {
	Bet              canonicalv1.Bet `json:"bet"`
	ProviderRevision int64           `json:"providerRevision,omitempty"`
}

// ProviderAdapter defines the canonical integration contract that each feed/provider
// implementation must satisfy.
type ProviderAdapter interface {
	Name() string
	CanonicalSchema() canonicalv1.SchemaInfo

	SupportedStreams() []canonicalv1.StreamType
	SubscribeStream(
		ctx context.Context,
		stream canonicalv1.StreamType,
		fromRevision int64,
	) (<-chan canonicalv1.Envelope, <-chan error, error)
	FetchSnapshot(
		ctx context.Context,
		stream canonicalv1.StreamType,
		atRevision int64,
	) ([]canonicalv1.Envelope, error)

	PlaceBet(ctx context.Context, request PlaceBetRequest) (PlaceBetResponse, error)
	CancelBet(ctx context.Context, request CancelBetRequest) (CancelBetResponse, error)
	MaxStake(ctx context.Context, request MaxStakeRequest) (MaxStakeResponse, error)
	CashoutQuote(ctx context.Context, request CashoutQuoteRequest) (CashoutQuoteResponse, error)
	CashoutAccept(ctx context.Context, request CashoutAcceptRequest) (CashoutAcceptResponse, error)
}
