package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type AuthClaims struct {
	UserID      string   `json:"user_id"`
	Email       string   `json:"email"`
	Username    string   `json:"username"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
}

type Bet struct {
	BetID           string           `json:"bet_id"`
	UserID          string           `json:"user_id"`
	MarketID        *string          `json:"market_id,omitempty"`
	OutcomeID       *string          `json:"outcome_id,omitempty"`
	FreebetID       *string          `json:"freebet_id,omitempty"`
	OddsBoostID     *string          `json:"odds_boost_id,omitempty"`
	FreebetApplied  int64            `json:"freebet_applied_cents,omitempty"`
	Stake           decimal.Decimal  `json:"stake"`
	Odds            decimal.Decimal  `json:"odds"`
	PotentialPayout decimal.Decimal  `json:"potential_payout"`
	Status          string           `json:"status"`
	PlacedAt        time.Time        `json:"placed_at"`
	SettledAt       *time.Time       `json:"settled_at,omitempty"`
	Result          *string          `json:"result,omitempty"`
	ReservationID   string           `json:"-"`
	BetType         string           `json:"bet_type,omitempty"`
	ParlayID        *string          `json:"parlay_id,omitempty"`
	CashoutAmount   *decimal.Decimal `json:"cashout_amount,omitempty"`
	Legs            []BetLeg         `json:"legs,omitempty"`
}

type BetLeg struct {
	LegID     string          `json:"leg_id"`
	MarketID  string          `json:"market_id"`
	OutcomeID string          `json:"outcome_id"`
	Odds      decimal.Decimal `json:"odds"`
	Status    string          `json:"status"`
}

type PlaceBetRequest struct {
	UserID              string          `json:"user_id"`
	MarketID            string          `json:"market_id"`
	OutcomeID           string          `json:"outcome_id"`
	Stake               decimal.Decimal `json:"stake"`
	OddsType            string          `json:"odds_type"`
	Acceptance          string          `json:"acceptance"`
	Odds                decimal.Decimal `json:"odds"`
	FreebetID           *string         `json:"freebet_id,omitempty"`
	FreebetAppliedCents *int64          `json:"freebet_applied_cents,omitempty"`
	OddsBoostID         *string         `json:"odds_boost_id,omitempty"`
}

type PlaceParlayRequest struct {
	UserID              string          `json:"user_id"`
	Legs                []ParlayLeg     `json:"legs"`
	Stake               decimal.Decimal `json:"stake"`
	FreebetID           *string         `json:"freebet_id,omitempty"`
	FreebetAppliedCents *int64          `json:"freebet_applied_cents,omitempty"`
	OddsBoostID         *string         `json:"odds_boost_id,omitempty"`
}

type BetPrecheckSelection struct {
	MarketID  string          `json:"market_id"`
	OutcomeID string          `json:"outcome_id"`
	Stake     decimal.Decimal `json:"stake"`
	Odds      decimal.Decimal `json:"odds"`
}

type BetPrecheckRequest struct {
	UserID string                 `json:"user_id"`
	Bets   []BetPrecheckSelection `json:"bets"`
}

type BetPrecheckResponse struct {
	ShouldBlockPlacement bool     `json:"should_block_placement"`
	ErrorCodes           []string `json:"error_codes"`
}

type BetBuilderQuoteLegRequest struct {
	MarketID      string           `json:"marketId"`
	SelectionID   string           `json:"selectionId"`
	RequestedOdds *decimal.Decimal `json:"requestedOdds,omitempty"`
}

type BetBuilderQuoteRequest struct {
	UserID    string                      `json:"userId"`
	RequestID string                      `json:"requestId"`
	Legs      []BetBuilderQuoteLegRequest `json:"legs"`
}

type BetBuilderQuoteLeg struct {
	MarketID      string           `json:"marketId"`
	SelectionID   string           `json:"selectionId"`
	FixtureID     string           `json:"fixtureId"`
	RequestedOdds *decimal.Decimal `json:"requestedOdds,omitempty"`
	CurrentOdds   decimal.Decimal  `json:"currentOdds"`
}

type BetBuilderQuoteResponse struct {
	QuoteID              string               `json:"quoteId"`
	UserID               string               `json:"userId"`
	RequestID            string               `json:"requestId"`
	ComboType            *string              `json:"comboType,omitempty"`
	Combinable           bool                 `json:"combinable"`
	ReasonCode           *string              `json:"reasonCode,omitempty"`
	CombinedOdds         *decimal.Decimal     `json:"combinedOdds,omitempty"`
	ImpliedProbability   *decimal.Decimal     `json:"impliedProbability,omitempty"`
	ExpiresAt            *time.Time           `json:"expiresAt,omitempty"`
	Legs                 []BetBuilderQuoteLeg `json:"legs"`
	Status               string               `json:"status"`
	CreatedAt            *time.Time           `json:"createdAt,omitempty"`
	UpdatedAt            *time.Time           `json:"updatedAt,omitempty"`
	AcceptedAt           *time.Time           `json:"acceptedAt,omitempty"`
	AcceptedBetID        *string              `json:"acceptedBetId,omitempty"`
	AcceptRequestID      *string              `json:"acceptRequestId,omitempty"`
	AcceptIdempotencyKey *string              `json:"acceptIdempotencyKey,omitempty"`
	LastReason           *string              `json:"lastReason,omitempty"`
}

type BetBuilderAcceptRequest struct {
	QuoteID        string `json:"quoteId"`
	UserID         string `json:"userId"`
	RequestID      string `json:"requestId"`
	StakeCents     int64  `json:"stakeCents"`
	IdempotencyKey string `json:"idempotencyKey,omitempty"`
	Reason         string `json:"reason,omitempty"`
}

type BetBuilderAcceptResponse struct {
	Bet   *Bet                     `json:"bet"`
	Quote *BetBuilderQuoteResponse `json:"quote"`
}

type FixedExoticQuoteLegRequest struct {
	Position      int              `json:"position"`
	MarketID      string           `json:"marketId"`
	SelectionID   string           `json:"selectionId"`
	FixtureID     string           `json:"fixtureId"`
	RequestedOdds *decimal.Decimal `json:"requestedOdds,omitempty"`
}

type FixedExoticQuoteRequest struct {
	UserID     string                       `json:"userId"`
	RequestID  string                       `json:"requestId"`
	ExoticType string                       `json:"exoticType"`
	StakeCents *int64                       `json:"stakeCents,omitempty"`
	Legs       []FixedExoticQuoteLegRequest `json:"legs"`
}

type FixedExoticQuoteLeg struct {
	Position      int              `json:"position"`
	MarketID      string           `json:"marketId"`
	SelectionID   string           `json:"selectionId"`
	FixtureID     string           `json:"fixtureId"`
	RequestedOdds *decimal.Decimal `json:"requestedOdds,omitempty"`
	CurrentOdds   decimal.Decimal  `json:"currentOdds"`
}

type FixedExoticQuoteResponse struct {
	QuoteID              string                `json:"quoteId"`
	UserID               string                `json:"userId"`
	RequestID            string                `json:"requestId"`
	ExoticType           string                `json:"exoticType"`
	Combinable           bool                  `json:"combinable"`
	ReasonCode           *string               `json:"reasonCode,omitempty"`
	CombinedOdds         *decimal.Decimal      `json:"combinedOdds,omitempty"`
	ImpliedProbability   *decimal.Decimal      `json:"impliedProbability,omitempty"`
	StakeCents           *int64                `json:"stakeCents,omitempty"`
	PotentialPayoutCents *int64                `json:"potentialPayoutCents,omitempty"`
	EncodedTicket        *string               `json:"encodedTicket,omitempty"`
	ExpiresAt            *time.Time            `json:"expiresAt,omitempty"`
	Legs                 []FixedExoticQuoteLeg `json:"legs"`
	Status               string                `json:"status"`
	CreatedAt            *time.Time            `json:"createdAt,omitempty"`
	UpdatedAt            *time.Time            `json:"updatedAt,omitempty"`
	AcceptedAt           *time.Time            `json:"acceptedAt,omitempty"`
	AcceptedBetID        *string               `json:"acceptedBetId,omitempty"`
	AcceptRequestID      *string               `json:"acceptRequestId,omitempty"`
	AcceptIdempotencyKey *string               `json:"acceptIdempotencyKey,omitempty"`
	LastReason           *string               `json:"lastReason,omitempty"`
}

type FixedExoticAcceptRequest struct {
	QuoteID        string `json:"quoteId"`
	UserID         string `json:"userId"`
	RequestID      string `json:"requestId"`
	StakeCents     *int64 `json:"stakeCents,omitempty"`
	IdempotencyKey string `json:"idempotencyKey,omitempty"`
	Reason         string `json:"reason,omitempty"`
}

type FixedExoticAcceptResponse struct {
	Bet   *Bet                      `json:"bet"`
	Quote *FixedExoticQuoteResponse `json:"quote"`
}

type AdvancedQuote struct {
	QuoteID              string
	QuoteType            string
	UserID               string
	RequestID            string
	ComboType            *string
	ExoticType           *string
	Combinable           bool
	ReasonCode           *string
	CombinedOdds         *decimal.Decimal
	ImpliedProbability   *decimal.Decimal
	StakeCents           *int64
	PotentialPayoutCents *int64
	EncodedTicket        *string
	ExpiresAt            *time.Time
	Legs                 []AdvancedQuoteLeg
	Status               string
	CreatedAt            *time.Time
	UpdatedAt            *time.Time
	AcceptedAt           *time.Time
	AcceptedBetID        *string
	AcceptRequestID      *string
	AcceptIdempotencyKey *string
	LastReason           *string
}

type AdvancedQuoteLeg struct {
	Position      *int
	MarketID      string
	SelectionID   string
	FixtureID     string
	RequestedOdds *decimal.Decimal
	CurrentOdds   decimal.Decimal
}

type PendingBetStatusRequest struct {
	BetIDs []string `json:"betIds"`
}

type PendingBetStatusItem struct {
	BetID  string  `json:"betId"`
	State  string  `json:"state"`
	Reason *string `json:"reason,omitempty"`
}

type ParlayLeg struct {
	MarketID  string          `json:"market_id"`
	OutcomeID string          `json:"outcome_id"`
	Odds      decimal.Decimal `json:"odds"`
}

type CashoutRequest struct {
	CashoutPrice decimal.Decimal `json:"cashout_price"`
}

type CancelBetRequest struct {
	CancellationReason string `json:"cancellationReason,omitempty"`
	Reason             string `json:"reason,omitempty"`
}

type AdminBetLifecycleRequest struct {
	Reason               string `json:"reason,omitempty"`
	WinningSelectionID   string `json:"winningSelectionId,omitempty"`
	WinningSelectionName string `json:"winningSelectionName,omitempty"`
	ResultSource         string `json:"resultSource,omitempty"`
}

type CashoutResponse struct {
	BetID         string          `json:"bet_id"`
	OriginalStake decimal.Decimal `json:"original_stake"`
	CashoutAmount decimal.Decimal `json:"cashout_amount"`
	Profit        decimal.Decimal `json:"profit"`
	Status        string          `json:"status"`
	CashedOutAt   time.Time       `json:"cashed_out_at"`
}

type CashoutOfferResponse struct {
	BetID        string          `json:"bet_id"`
	CurrentStake decimal.Decimal `json:"current_stake"`
	CashoutOffer decimal.Decimal `json:"cashout_offer"`
	Profit       decimal.Decimal `json:"profit"`
	ValidUntil   time.Time       `json:"valid_until"`
}

type BetLegContext struct {
	MarketID     string    `json:"marketId"`
	MarketName   string    `json:"marketName"`
	OutcomeID    string    `json:"outcomeId"`
	OutcomeName  string    `json:"outcomeName"`
	EventID      string    `json:"eventId"`
	EventName    string    `json:"eventName"`
	SportName    string    `json:"sportName"`
	LeagueName   string    `json:"leagueName"`
	EventStartAt time.Time `json:"eventStartAt"`
}

type ListBetsResponse struct {
	Data       []*Bet     `json:"data"`
	Pagination Pagination `json:"pagination"`
}

type TalonIDName struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type TalonDisplayOdds struct {
	Decimal float64 `json:"decimal"`
}

type TalonMoney struct {
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"`
}

type TalonBetLeg struct {
	ID          string           `json:"id"`
	Fixture     TalonFixture     `json:"fixture"`
	Market      TalonIDName      `json:"market"`
	Selection   TalonIDName      `json:"selection"`
	Sport       TalonIDName      `json:"sport"`
	Competitor  TalonIDName      `json:"competitor"`
	Tournament  TalonIDName      `json:"tournament"`
	Odds        float64          `json:"odds"`
	DisplayOdds TalonDisplayOdds `json:"displayOdds"`
	SettledAt   *time.Time       `json:"settledAt,omitempty"`
	Outcome     string           `json:"outcome,omitempty"`
	Status      string           `json:"status"`
	EventTime   *time.Time       `json:"eventTime,omitempty"`
}

type TalonFixture struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	StartTime time.Time `json:"startTime"`
}

type TalonBet struct {
	BetID         string           `json:"betId"`
	TransactionID string           `json:"transactionId,omitempty"`
	BetType       string           `json:"betType"`
	Stake         TalonMoney       `json:"stake"`
	PlacedAt      time.Time        `json:"placedAt"`
	SettledAt     *time.Time       `json:"settledAt,omitempty"`
	CancelledAt   *time.Time       `json:"cancelledAt,omitempty"`
	Odds          float64          `json:"odds"`
	DisplayOdds   TalonDisplayOdds `json:"displayOdds"`
	Sports        []TalonIDName    `json:"sports"`
	ProfitLoss    *float64         `json:"profitLoss,omitempty"`
	Legs          []TalonBetLeg    `json:"legs"`
	Outcome       string           `json:"outcome,omitempty"`
}

type TalonBetHistoryResponse struct {
	Data         []TalonBet `json:"data"`
	CurrentPage  int        `json:"currentPage"`
	ItemsPerPage int        `json:"itemsPerPage"`
	TotalCount   int        `json:"totalCount"`
}

type Pagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}

type BetFilters struct {
	UserID    string
	Status    string
	StartDate *time.Time
	EndDate   *time.Time
	Page      int
	Limit     int
}

type ExternalMarket struct {
	MarketID     string                     `json:"market_id"`
	EventID      string                     `json:"event_id"`
	MarketType   string                     `json:"market_type"`
	Status       string                     `json:"status"`
	Odds         map[string]decimal.Decimal `json:"odds"`
	Outcomes     []ExternalOutcome          `json:"outcomes"`
	TotalMatched decimal.Decimal            `json:"total_matched"`
}

type ExternalOutcome struct {
	OutcomeID string          `json:"outcome_id"`
	Name      string          `json:"name"`
	Odds      decimal.Decimal `json:"odds"`
	Status    string          `json:"status,omitempty"`
	Result    string          `json:"result,omitempty"`
}

type ReserveFundsRequest struct {
	Amount        decimal.Decimal `json:"amount"`
	ReferenceID   string          `json:"reference_id"`
	ReferenceType string          `json:"reference_type"`
}

type ReserveFundsResponse struct {
	UserID           string          `json:"user_id"`
	ReservedAmount   decimal.Decimal `json:"reserved_amount"`
	AvailableBalance decimal.Decimal `json:"available_balance"`
	ReservationID    string          `json:"reservation_id"`
}

type ReleaseReserveRequest struct {
	ReservationID string          `json:"reservation_id"`
	Amount        decimal.Decimal `json:"amount"`
}

type ReleaseReserveResponse struct {
	UserID              string          `json:"user_id"`
	ReleasedAmount      decimal.Decimal `json:"released_amount"`
	NewAvailableBalance decimal.Decimal `json:"new_available_balance"`
}

type DepositRequest struct {
	Amount        decimal.Decimal `json:"amount"`
	PaymentMethod string          `json:"payment_method"`
	PaymentToken  string          `json:"payment_token"`
	Currency      string          `json:"currency"`
}

type DepositResponse struct {
	DepositID string          `json:"deposit_id"`
	UserID    string          `json:"user_id"`
	Amount    decimal.Decimal `json:"amount"`
	Status    string          `json:"status"`
	CreatedAt time.Time       `json:"created_at"`
}

type WithdrawalRequest struct {
	Amount        decimal.Decimal `json:"amount"`
	BankAccountID string          `json:"bank_account_id"`
	Currency      string          `json:"currency"`
}

type WithdrawalResponse struct {
	WithdrawalID string          `json:"withdrawal_id"`
	UserID       string          `json:"user_id"`
	Amount       decimal.Decimal `json:"amount"`
	Status       string          `json:"status"`
	CreatedAt    time.Time       `json:"created_at"`
}

type GeoComplyPacketRequest struct {
	EncryptedString string `json:"encryptedString"`
}

type GeoComplyTroubleshooterReason struct {
	Retry     bool    `json:"retry"`
	Message   string  `json:"message"`
	HelpLink  *string `json:"helpLink,omitempty"`
	OptInLink *string `json:"optInLink,omitempty"`
}

type GeoComplyPacketResponse struct {
	Result                      string                          `json:"result"`
	AnotherGeolocationInSeconds int                             `json:"anotherGeolocationInSeconds,omitempty"`
	Errors                      []string                        `json:"errors,omitempty"`
	Reasons                     []GeoComplyTroubleshooterReason `json:"reasons,omitempty"`
}
