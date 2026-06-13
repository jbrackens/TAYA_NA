package models

import (
	"time"

	"github.com/shopspring/decimal"
)

// MarketStatus represents the status of a betting market.
type MarketStatus string

const (
	// MarketOpen indicates the market is open for betting.
	MarketOpen MarketStatus = "open"
	// MarketSuspended indicates the market is temporarily suspended.
	MarketSuspended MarketStatus = "suspended"
	// MarketClosed indicates the market is closed for new bets.
	MarketClosed MarketStatus = "closed"
	// MarketSettled indicates the market has been settled and results are final.
	MarketSettled MarketStatus = "settled"
	// MarketVoid indicates the market has been voided and all bets refunded.
	MarketVoid MarketStatus = "void"
)

// IsValid checks if the MarketStatus is one of the valid statuses.
func (m MarketStatus) IsValid() bool {
	return m == MarketOpen || m == MarketSuspended || m == MarketClosed ||
		m == MarketSettled || m == MarketVoid
}

// MarketType represents the type of betting market.
type MarketType string

const (
	// MarketTypeWinner represents a match/event winner market.
	MarketTypeWinner MarketType = "winner"
	// MarketTypeHandicap represents a handicap market.
	MarketTypeHandicap MarketType = "handicap"
	// MarketTypeOverUnder represents an over/under total market.
	MarketTypeOverUnder MarketType = "over_under"
	// MarketTypeCorrectScore represents a correct score market.
	MarketTypeCorrectScore MarketType = "correct_score"
	// MarketTypePropBet represents a proposition bet market.
	MarketTypePropBet MarketType = "prop_bet"
)

// IsValid checks if the MarketType is one of the valid types.
func (m MarketType) IsValid() bool {
	return m == MarketTypeWinner || m == MarketTypeHandicap ||
		m == MarketTypeOverUnder || m == MarketTypeCorrectScore ||
		m == MarketTypePropBet
}

// Market represents a betting market for a sporting or other event.
type Market struct {
	// ID is the unique identifier for the market.
	ID string `db:"id" json:"id"`
	// EventID is the ID of the event this market is associated with.
	EventID string `db:"event_id" json:"event_id"`
	// Name is the human-readable name of the market.
	Name string `db:"name" json:"name"`
	// Type is the type of market (winner, handicap, over_under, etc.).
	Type MarketType `db:"type" json:"type"`
	// Status is the current status of the market (open, suspended, closed, settled, void).
	Status MarketStatus `db:"status" json:"status"`
	// CreatedAt is the timestamp when the market was created.
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	// UpdatedAt is the timestamp when the market was last updated.
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// NewMarket creates a new Market instance.
func NewMarket(id, eventID, name string, marketType MarketType) *Market {
	now := time.Now().UTC()
	return &Market{
		ID:        id,
		EventID:   eventID,
		Name:      name,
		Type:      marketType,
		Status:    MarketOpen,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// UpdateTimestamp updates the UpdatedAt field to the current time.
func (m *Market) UpdateTimestamp() {
	m.UpdatedAt = time.Now().UTC()
}

// Outcome represents a possible outcome within a market.
type Outcome struct {
	// ID is the unique identifier for the outcome.
	ID string `db:"id" json:"id"`
	// MarketID is the ID of the market this outcome belongs to.
	MarketID string `db:"market_id" json:"market_id"`
	// Name is the human-readable name of the outcome.
	Name string `db:"name" json:"name"`
	// Odds is the decimal odds for this outcome.
	Odds decimal.Decimal `db:"odds" json:"odds"`
	// Status is the current status of the outcome (active, void, etc.).
	Status string `db:"status" json:"status"`
	// CreatedAt is the timestamp when the outcome was created.
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	// UpdatedAt is the timestamp when the outcome was last updated.
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// NewOutcome creates a new Outcome instance.
func NewOutcome(id, marketID, name string, odds decimal.Decimal) *Outcome {
	now := time.Now().UTC()
	return &Outcome{
		ID:        id,
		MarketID:  marketID,
		Name:      name,
		Odds:      odds,
		Status:    "active",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// BetStatus represents the status of a bet.
type BetStatus string

const (
	// BetPending indicates the bet is pending (market still open).
	BetPending BetStatus = "pending"
	// BetSettledWin indicates the bet was settled as a winner.
	BetSettledWin BetStatus = "settled_win"
	// BetSettledLoss indicates the bet was settled as a loss.
	BetSettledLoss BetStatus = "settled_loss"
	// BetCancelled indicates the bet was cancelled.
	BetCancelled BetStatus = "cancelled"
	// BetVoid indicates the bet was voided.
	BetVoid BetStatus = "void"
)

// IsValid checks if the BetStatus is one of the valid statuses.
func (b BetStatus) IsValid() bool {
	return b == BetPending || b == BetSettledWin || b == BetSettledLoss ||
		b == BetCancelled || b == BetVoid
}

// Bet represents a user's bet on a market outcome.
type Bet struct {
	// ID is the unique identifier for the bet.
	ID string `db:"id" json:"id"`
	// UserID is the ID of the user who placed the bet.
	UserID string `db:"user_id" json:"user_id"`
	// MarketID is the ID of the market the bet was placed on.
	MarketID string `db:"market_id" json:"market_id"`
	// OutcomeID is the ID of the outcome the bet is on.
	OutcomeID string `db:"outcome_id" json:"outcome_id"`
	// Stake is the amount staked on this bet.
	Stake decimal.Decimal `db:"stake" json:"stake"`
	// PotentialPayout is the potential payout if the bet wins (stake * odds).
	PotentialPayout decimal.Decimal `db:"potential_payout" json:"potential_payout"`
	// Status is the current status of the bet (pending, settled_win, settled_loss, etc.).
	Status BetStatus `db:"status" json:"status"`
	// CreatedAt is the timestamp when the bet was placed.
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	// UpdatedAt is the timestamp when the bet was last updated.
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// NewBet creates a new Bet instance.
func NewBet(id, userID, marketID, outcomeID string, stake, odds decimal.Decimal) *Bet {
	now := time.Now().UTC()
	potentialPayout := stake.Mul(odds)
	return &Bet{
		ID:              id,
		UserID:          userID,
		MarketID:        marketID,
		OutcomeID:       outcomeID,
		Stake:           stake,
		PotentialPayout: potentialPayout,
		Status:          BetPending,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}

// UpdateTimestamp updates the UpdatedAt field to the current time.
func (b *Bet) UpdateTimestamp() {
	b.UpdatedAt = time.Now().UTC()
}

// CalculateProfit returns the profit or loss for a settled bet.
func (b *Bet) CalculateProfit() decimal.Decimal {
	if b.Status == BetSettledWin {
		return b.PotentialPayout.Sub(b.Stake)
	}
	if b.Status == BetSettledLoss || b.Status == BetCancelled || b.Status == BetVoid {
		return decimal.NewFromInt(-1).Mul(b.Stake)
	}
	return decimal.Zero
}
