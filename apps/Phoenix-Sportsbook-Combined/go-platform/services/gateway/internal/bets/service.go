package bets

import (
	"bytes"
	"context"
	"crypto/sha1"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/netip"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/freebets"
	"phoenix-revival/gateway/internal/loyalty"
	"phoenix-revival/gateway/internal/oddsboosts"
	"phoenix-revival/gateway/internal/wallet"
)

var (
	ErrInvalidBetRequest    = errors.New("invalid bet request")
	ErrMarketNotFound       = errors.New("market not found")
	ErrMarketNotOpen        = errors.New("market is not open")
	ErrIdempotencyReplay    = errors.New("bet idempotency replay payload conflict")
	ErrSelectionNotFound    = errors.New("selection does not exist in market")
	ErrStakeOutOfRange      = errors.New("stake is outside allowed range")
	ErrOddsOutOfRange       = errors.New("odds are outside allowed range")
	ErrOddsChanged          = errors.New("odds changed and were rejected by policy")
	ErrBetStateConflict     = errors.New("bet state transition conflict")
	ErrInvalidSettleRequest = errors.New("invalid settlement request")
	ErrFreebetNotFound      = errors.New("freebet not found")
	ErrFreebetForbidden     = errors.New("freebet does not belong to user")
	ErrFreebetNotEligible   = errors.New("freebet is not eligible for this bet")
	ErrOddsBoostNotFound    = errors.New("odds boost not found")
	ErrOddsBoostForbidden   = errors.New("odds boost does not belong to user")
	ErrOddsBoostNotEligible = errors.New("odds boost is not eligible for this bet")
)

const (
	betDBTimeout = 5 * time.Second

	statusPlaced      = "placed"
	statusSettledWon  = "settled_won"
	statusSettledLost = "settled_lost"
	statusCashedOut   = "cashed_out"
	statusCancelled   = "cancelled"
	statusRefunded    = "refunded"

	actionBetPlaced    = "bet.placed"
	actionBetSettled   = "bet.settled"
	actionBetCashedOut = "bet.cashed_out"
	actionBetCancelled = "bet.cancelled"
	actionBetRefunded  = "bet.refunded"

	defaultBetMinStakeCents int64   = 100
	defaultBetMaxStakeCents int64   = 1000000
	defaultMinOdds          float64 = 1.01
	defaultMaxOdds          float64 = 1000.0

	oddsPolicyAcceptRequested = "accept_requested"
	oddsPolicyAcceptLatest    = "accept_latest"
	oddsPolicyRejectOnChange  = "reject_on_change"
	oddsPolicyOnlyBetter      = "only_better"
)

type PlaceBetRequest struct {
	UserID             string
	RequestID          string
	DeviceID           string
	SegmentID          string
	IPAddress          string
	OddsPrecision      int
	AcceptAnyOdds      bool
	Items              []PlaceBetItem
	MarketID           string
	SelectionID        string
	StakeCents         int64
	Odds               float64
	ForceRequestedOdds bool
	FreebetID          string
	OddsBoostID        string
	IdempotencyKey     string
	ActorID            string
}

type PrecheckRequest struct {
	UserID        string
	RequestID     string
	DeviceID      string
	SegmentID     string
	IPAddress     string
	OddsPrecision int
	AcceptAnyOdds bool
	MarketID      string
	SelectionID   string
	StakeCents    int64
	Odds          float64
	FreebetID     string
	OddsBoostID   string
	Items         []PlaceBetItem
}

type PrecheckResponse struct {
	Allowed               bool   `json:"allowed"`
	ReasonCode            string `json:"reasonCode,omitempty"`
	MinStakeCents         int64  `json:"minStakeCents,omitempty"`
	MaxStakeCents         int64  `json:"maxStakeCents,omitempty"`
	RequiredStakeCents    int64  `json:"requiredStakeCents,omitempty"`
	AvailableBalanceCents int64  `json:"availableBalanceCents,omitempty"`

	RequestedOdds float64 `json:"requestedOdds,omitempty"`
	CurrentOdds   float64 `json:"currentOdds,omitempty"`
	AcceptedOdds  float64 `json:"acceptedOdds,omitempty"`
	OddsChanged   bool    `json:"oddsChanged,omitempty"`
	OddsPolicy    string  `json:"oddsPolicy,omitempty"`

	InPlay         bool  `json:"inPlay,omitempty"`
	AppliedLTDMsec int64 `json:"appliedLtdMsec,omitempty"`
}

type PlaceBetItem struct {
	MarketID      string
	SelectionID   string
	StakeCents    int64
	Odds          float64
	RequestLineID string
}

type BetLeg struct {
	LineID        string  `json:"lineId,omitempty"`
	MarketID      string  `json:"marketId"`
	SelectionID   string  `json:"selectionId"`
	FixtureID     string  `json:"fixtureId,omitempty"`
	RequestedOdds float64 `json:"requestedOdds,omitempty"`
	CurrentOdds   float64 `json:"currentOdds,omitempty"`
	FinalOdds     float64 `json:"finalOdds,omitempty"`
}

type SettleBetRequest struct {
	BetID                string
	WinningSelectionID   string
	WinningSelectionName string
	ResultSource         string
	DeadHeatFactor       *float64
	Reason               string
	ActorID              string
}

type settlementTransitionMeta struct {
	Resettled           bool
	Policy              string
	DeadHeatFactor      float64
	PreviousStatus      string
	PreviousOutcome     string
	PreviousReference   string
	PreviousPayoutCents int64
	NextPayoutCents     int64
	AdjustmentCents     int64
}

type LifecycleBetRequest struct {
	BetID   string
	Reason  string
	ActorID string
}

type Bet struct {
	BetID                   string   `json:"betId"`
	UserID                  string   `json:"userId"`
	RequestID               string   `json:"requestId,omitempty"`
	DeviceID                string   `json:"deviceId,omitempty"`
	SegmentID               string   `json:"segmentId,omitempty"`
	IPAddress               string   `json:"ipAddress,omitempty"`
	MarketID                string   `json:"marketId"`
	SelectionID             string   `json:"selectionId"`
	Legs                    []BetLeg `json:"legs,omitempty"`
	StakeCents              int64    `json:"stakeCents"`
	FreebetID               string   `json:"freebetId,omitempty"`
	FreebetAppliedCents     int64    `json:"freebetAppliedCents,omitempty"`
	OddsBoostID             string   `json:"oddsBoostId,omitempty"`
	RequestedOdds           float64  `json:"requestedOdds,omitempty"`
	CurrentOdds             float64  `json:"currentOdds,omitempty"`
	Odds                    float64  `json:"odds"`
	OddsChangePolicy        string   `json:"oddsChangePolicy,omitempty"`
	OddsChanged             bool     `json:"oddsChanged,omitempty"`
	InPlay                  bool     `json:"inPlay,omitempty"`
	AppliedLTDMsec          int64    `json:"appliedLtdMsec,omitempty"`
	PotentialPayoutCents    int64    `json:"potentialPayoutCents"`
	Status                  string   `json:"status"`
	WalletLedgerEntryID     string   `json:"walletLedgerEntryId"`
	WalletBalanceCents      int64    `json:"walletBalanceCents"`
	IdempotencyKey          string   `json:"idempotencyKey"`
	PlacedAt                string   `json:"placedAt"`
	SettledAt               string   `json:"settledAt,omitempty"`
	SettlementLedgerEntryID string   `json:"settlementLedgerEntryId,omitempty"`
	SettlementOutcome       string   `json:"settlementOutcome,omitempty"`
	SettlementReference     string   `json:"settlementReference,omitempty"`
}

type BetEvent struct {
	ID         string `json:"id"`
	BetID      string `json:"betId"`
	UserID     string `json:"userId"`
	Action     string `json:"action"`
	ActorID    string `json:"actorId"`
	Status     string `json:"status"`
	Reason     string `json:"reason,omitempty"`
	Details    string `json:"details,omitempty"`
	OccurredAt string `json:"occurredAt"`
}

type AlternativeOfferMetrics struct {
	Created   int64 `json:"created"`
	Repriced  int64 `json:"repriced"`
	Accepted  int64 `json:"accepted"`
	Declined  int64 `json:"declined"`
	Expired   int64 `json:"expired"`
	Committed int64 `json:"committed"`
}

type AlternativeOfferStatusMetrics struct {
	Total     int64 `json:"total"`
	Open      int64 `json:"open"`
	Accepted  int64 `json:"accepted"`
	Declined  int64 `json:"declined"`
	Expired   int64 `json:"expired"`
	Committed int64 `json:"committed"`
}

type CashoutMetrics struct {
	QuotesCreated       int64 `json:"quotesCreated"`
	QuotesAccepted      int64 `json:"quotesAccepted"`
	QuotesExpired       int64 `json:"quotesExpired"`
	StaleRejects        int64 `json:"staleRejects"`
	QuoteStateConflicts int64 `json:"quoteStateConflicts"`
}

type PromoUsageFilter struct {
	UserID      string
	FreebetID   string
	OddsBoostID string
	From        *time.Time
	To          *time.Time
}

type PromoUsageBreakdown struct {
	ID                       string `json:"id"`
	BetCount                 int64  `json:"betCount"`
	TotalStakeCents          int64  `json:"totalStakeCents"`
	TotalFreebetAppliedCents int64  `json:"totalFreebetAppliedCents,omitempty"`
}

type PromoUsageSummary struct {
	TotalBets                int64                 `json:"totalBets"`
	TotalStakeCents          int64                 `json:"totalStakeCents"`
	BetsWithFreebet          int64                 `json:"betsWithFreebet"`
	BetsWithOddsBoost        int64                 `json:"betsWithOddsBoost"`
	BetsWithBoth             int64                 `json:"betsWithBoth"`
	TotalFreebetAppliedCents int64                 `json:"totalFreebetAppliedCents"`
	TotalBoostedStakeCents   int64                 `json:"totalBoostedStakeCents"`
	UniqueUsers              int64                 `json:"uniqueUsers"`
	UniqueFreebets           int64                 `json:"uniqueFreebets"`
	UniqueOddsBoosts         int64                 `json:"uniqueOddsBoosts"`
	Freebets                 []PromoUsageBreakdown `json:"freebets"`
	OddsBoosts               []PromoUsageBreakdown `json:"oddsBoosts"`
}

type BetHistoryQuery struct {
	UserID   string
	Statuses []string
	Page     int
	PageSize int
}

type BetHistoryPage struct {
	CurrentPage  int   `json:"currentPage"`
	Data         []Bet `json:"data"`
	ItemsPerPage int   `json:"itemsPerPage"`
	TotalCount   int   `json:"totalCount"`
	HasNextPage  bool  `json:"hasNextPage"`
}

type persistedBetState struct {
	BetsByID                   map[string]Bet                  `json:"betsById"`
	BetsByIdempotent           map[string]Bet                  `json:"betsByIdempotent"`
	Sequence                   int64                           `json:"sequence"`
	Events                     []BetEvent                      `json:"events,omitempty"`
	EventSequence              int64                           `json:"eventSequence"`
	AlternativeOffersByID      map[string]AlternativeOddsOffer `json:"alternativeOffersById,omitempty"`
	AlternativeOffersByKey     map[string]AlternativeOddsOffer `json:"alternativeOffersByKey,omitempty"`
	AlternativeOfferSequence   int64                           `json:"alternativeOfferSequence"`
	AlternativeOfferMetrics    AlternativeOfferMetrics         `json:"alternativeOfferMetrics,omitempty"`
	CashoutQuotesByID          map[string]CashoutQuote         `json:"cashoutQuotesById,omitempty"`
	CashoutQuotesByKey         map[string]CashoutQuote         `json:"cashoutQuotesByKey,omitempty"`
	CashoutLatestRevisionByBet map[string]int64                `json:"cashoutLatestRevisionByBet,omitempty"`
	CashoutQuoteSequence       int64                           `json:"cashoutQuoteSequence"`
	CashoutMetrics             CashoutMetrics                  `json:"cashoutMetrics,omitempty"`
	BetBuilderQuotesByID       map[string]BetBuilderQuote      `json:"betBuilderQuotesById,omitempty"`
	BetBuilderQuotesByKey      map[string]BetBuilderQuote      `json:"betBuilderQuotesByKey,omitempty"`
	BetBuilderQuoteSequence    int64                           `json:"betBuilderQuoteSequence"`
	FixedExoticQuotesByID      map[string]FixedExoticQuote     `json:"fixedExoticQuotesById,omitempty"`
	FixedExoticQuotesByKey     map[string]FixedExoticQuote     `json:"fixedExoticQuotesByKey,omitempty"`
	FixedExoticQuoteSequence   int64                           `json:"fixedExoticQuoteSequence"`
}

type placementDecision struct {
	RequestedOdds  float64
	CurrentOdds    float64
	FinalOdds      float64
	OddsPolicy     string
	OddsChanged    bool
	IsInPlay       bool
	AppliedLTDMsec int64
}

type promotionPlacementDecision struct {
	FreebetID           string
	FreebetAppliedCents int64
	OddsBoostID         string
	WalletBalanceCents  int64
}

type Service struct {
	repository domain.ReadRepository
	wallet     *wallet.Service
	freebets   *freebets.Service
	oddsBoosts *oddsboosts.Service
	loyalty    *loyalty.Service

	mu                       sync.RWMutex
	betsByID                 map[string]Bet
	betsByIdempotent         map[string]Bet
	sequence                 int64
	events                   []BetEvent
	eventSequence            int64
	offersByID               map[string]AlternativeOddsOffer
	offersByKey              map[string]AlternativeOddsOffer
	offerSequence            int64
	offerMetrics             AlternativeOfferMetrics
	quotesByID               map[string]CashoutQuote
	quotesByKey              map[string]CashoutQuote
	quoteLatestRevisionByBet map[string]int64
	quoteSequence            int64
	cashoutMetrics           CashoutMetrics
	builderQuotesByID        map[string]BetBuilderQuote
	builderQuotesByKey       map[string]BetBuilderQuote
	builderQuoteSequence     int64
	fixedExoticQuotesByID    map[string]FixedExoticQuote
	fixedExoticQuotesByKey   map[string]FixedExoticQuote
	fixedExoticQuoteSequence int64
	now                      func() time.Time
	statePath                string
	db                       *sql.DB

	minStakeCents int64
	maxStakeCents int64
	minOdds       float64
	maxOdds       float64

	oddsChangePolicy string
	allowInPlay      bool
	ltdEnabled       bool
	ltdInPlayMsec    int64
}

func (s *Service) SetPromotionServices(freebetService *freebets.Service, oddsBoostService *oddsboosts.Service) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.freebets = freebetService
	s.oddsBoosts = oddsBoostService
}

func (s *Service) SetLoyaltyService(loyaltyService *loyalty.Service) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.loyalty = loyaltyService
}

func NewService(repository domain.ReadRepository, walletService *wallet.Service) *Service {
	return NewServiceWithPath(repository, walletService, "")
}

func NewServiceFromEnv(repository domain.ReadRepository, walletService *wallet.Service) *Service {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("BET_STORE_MODE")))
	if mode == "db" || mode == "sql" || mode == "postgres" {
		driver := strings.TrimSpace(os.Getenv("BET_DB_DRIVER"))
		if driver == "" {
			driver = "postgres"
		}
		dsn := strings.TrimSpace(os.Getenv("BET_DB_DSN"))
		if dsn == "" {
			log.Printf("warning: BET_STORE_MODE=%s requested, but BET_DB_DSN is empty; falling back to local bet store", mode)
		} else {
			svc, err := NewServiceWithDB(repository, walletService, driver, dsn)
			if err != nil {
				log.Printf("warning: failed to initialize bet db store driver=%s: %v; falling back to local bet store", driver, err)
			} else {
				log.Printf("bet service initialized in db mode using driver=%s", driver)
				return svc
			}
		}
	}

	return NewServiceWithPath(repository, walletService, os.Getenv("BET_STORE_FILE"))
}

func NewServiceWithPath(repository domain.ReadRepository, walletService *wallet.Service, statePath string) *Service {
	svc := &Service{
		repository:               repository,
		wallet:                   walletService,
		betsByID:                 map[string]Bet{},
		betsByIdempotent:         map[string]Bet{},
		offersByID:               map[string]AlternativeOddsOffer{},
		offersByKey:              map[string]AlternativeOddsOffer{},
		quotesByID:               map[string]CashoutQuote{},
		quotesByKey:              map[string]CashoutQuote{},
		quoteLatestRevisionByBet: map[string]int64{},
		builderQuotesByID:        map[string]BetBuilderQuote{},
		builderQuotesByKey:       map[string]BetBuilderQuote{},
		fixedExoticQuotesByID:    map[string]FixedExoticQuote{},
		fixedExoticQuotesByKey:   map[string]FixedExoticQuote{},
		events:                   []BetEvent{},
		now:                      time.Now,
		statePath:                strings.TrimSpace(statePath),
		minStakeCents:            parseInt64Env("BET_MIN_STAKE_CENTS", defaultBetMinStakeCents),
		maxStakeCents:            parseInt64Env("BET_MAX_STAKE_CENTS", defaultBetMaxStakeCents),
		minOdds:                  parseFloat64Env("BET_MIN_ODDS", defaultMinOdds),
		maxOdds:                  parseFloat64Env("BET_MAX_ODDS", defaultMaxOdds),
		oddsChangePolicy:         normalizeOddsPolicy(os.Getenv("BET_ODDS_CHANGE_POLICY")),
		allowInPlay:              parseBoolEnv("BET_ALLOW_INPLAY", false),
		ltdEnabled:               parseBoolEnv("BET_LTD_ENABLED", true),
		ltdInPlayMsec:            parseInt64Env("BET_LTD_INPLAY_MS", 0),
	}
	if svc.statePath != "" {
		_ = svc.loadFromDisk()
	}
	return svc
}

func NewServiceWithDB(repository domain.ReadRepository, walletService *wallet.Service, driver string, dsn string) (*Service, error) {
	if strings.TrimSpace(driver) == "" {
		driver = "postgres"
	}
	if strings.TrimSpace(dsn) == "" {
		return nil, fmt.Errorf("empty bet dsn")
	}

	db, err := sql.Open(driver, dsn)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), betDBTimeout)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}

	svc := &Service{
		repository:               repository,
		wallet:                   walletService,
		betsByID:                 map[string]Bet{},
		betsByIdempotent:         map[string]Bet{},
		offersByID:               map[string]AlternativeOddsOffer{},
		offersByKey:              map[string]AlternativeOddsOffer{},
		quotesByID:               map[string]CashoutQuote{},
		quotesByKey:              map[string]CashoutQuote{},
		quoteLatestRevisionByBet: map[string]int64{},
		builderQuotesByID:        map[string]BetBuilderQuote{},
		builderQuotesByKey:       map[string]BetBuilderQuote{},
		fixedExoticQuotesByID:    map[string]FixedExoticQuote{},
		fixedExoticQuotesByKey:   map[string]FixedExoticQuote{},
		events:                   []BetEvent{},
		now:                      time.Now,
		db:                       db,
		minStakeCents:            parseInt64Env("BET_MIN_STAKE_CENTS", defaultBetMinStakeCents),
		maxStakeCents:            parseInt64Env("BET_MAX_STAKE_CENTS", defaultBetMaxStakeCents),
		minOdds:                  parseFloat64Env("BET_MIN_ODDS", defaultMinOdds),
		maxOdds:                  parseFloat64Env("BET_MAX_ODDS", defaultMaxOdds),
		oddsChangePolicy:         normalizeOddsPolicy(os.Getenv("BET_ODDS_CHANGE_POLICY")),
		allowInPlay:              parseBoolEnv("BET_ALLOW_INPLAY", false),
		ltdEnabled:               parseBoolEnv("BET_LTD_ENABLED", true),
		ltdInPlayMsec:            parseInt64Env("BET_LTD_INPLAY_MS", 0),
	}
	if err := svc.ensureSchema(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return svc, nil
}

func (s *Service) Place(request PlaceBetRequest) (Bet, error) {
	if s.db != nil {
		return s.placeDB(request)
	}
	return s.placeMemory(request)
}

func (s *Service) Precheck(request PrecheckRequest) (PrecheckResponse, error) {
	placeRequest := PlaceBetRequest{
		UserID:         request.UserID,
		RequestID:      request.RequestID,
		DeviceID:       request.DeviceID,
		SegmentID:      request.SegmentID,
		IPAddress:      request.IPAddress,
		OddsPrecision:  request.OddsPrecision,
		AcceptAnyOdds:  request.AcceptAnyOdds,
		Items:          request.Items,
		MarketID:       request.MarketID,
		SelectionID:    request.SelectionID,
		StakeCents:     request.StakeCents,
		Odds:           request.Odds,
		FreebetID:      request.FreebetID,
		OddsBoostID:    request.OddsBoostID,
		IdempotencyKey: "precheck",
	}

	normalized, err := normalizePlacementEnvelope(placeRequest)
	if err != nil {
		return PrecheckResponse{Allowed: false, ReasonCode: RejectReasonCode(err)}, nil
	}

	market, fixture, selection, err := s.validatePlacementRequest(normalized)
	if err != nil {
		return PrecheckResponse{Allowed: false, ReasonCode: RejectReasonCode(err)}, nil
	}

	decision, err := s.applyPlacementPolicies(normalized, market, fixture, selection)
	if err != nil {
		return PrecheckResponse{Allowed: false, ReasonCode: RejectReasonCode(err)}, nil
	}
	if err := s.validateOddsBoostForPlacement(normalized, decision); err != nil {
		return PrecheckResponse{Allowed: false, ReasonCode: RejectReasonCode(err)}, nil
	}
	if err := s.validateFreebetForPrecheck(normalized, decision); err != nil {
		return PrecheckResponse{Allowed: false, ReasonCode: RejectReasonCode(err)}, nil
	}

	minStake := market.MinStakeCents
	if minStake <= 0 {
		minStake = s.minStakeCents
	}
	maxStake := market.MaxStakeCents
	if maxStake <= 0 {
		maxStake = s.maxStakeCents
	}

	response := PrecheckResponse{
		Allowed:               true,
		MinStakeCents:         minStake,
		MaxStakeCents:         maxStake,
		RequiredStakeCents:    normalized.StakeCents,
		AvailableBalanceCents: s.wallet.Balance(normalized.UserID),
		RequestedOdds:         decision.RequestedOdds,
		CurrentOdds:           decision.CurrentOdds,
		AcceptedOdds:          decision.FinalOdds,
		OddsChanged:           decision.OddsChanged,
		OddsPolicy:            decision.OddsPolicy,
		InPlay:                decision.IsInPlay,
		AppliedLTDMsec:        decision.AppliedLTDMsec,
	}
	if normalized.StakeCents < minStake || normalized.StakeCents > maxStake {
		response.Allowed = false
		response.ReasonCode = RejectReasonCode(ErrStakeOutOfRange)
		return response, nil
	}
	if response.AvailableBalanceCents < normalized.StakeCents {
		response.Allowed = false
		response.ReasonCode = RejectReasonCode(wallet.ErrInsufficientFunds)
	}

	return response, nil
}

func (s *Service) GetByID(betID string) (Bet, error) {
	if s.db != nil {
		return s.getBetByIDDB(strings.TrimSpace(betID))
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	bet, found := s.betsByID[betID]
	if !found {
		return Bet{}, domain.ErrNotFound
	}
	return bet, nil
}

func (s *Service) ListByUser(query BetHistoryQuery) (BetHistoryPage, error) {
	query.UserID = strings.TrimSpace(query.UserID)
	if query.UserID == "" {
		return BetHistoryPage{}, ErrInvalidBetRequest
	}
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PageSize <= 0 {
		query.PageSize = 20
	}
	if query.PageSize > 100 {
		query.PageSize = 100
	}
	query.Statuses = normalizeHistoryStatuses(query.Statuses)

	if s.db != nil {
		return s.listByUserDB(query)
	}
	return s.listByUserMemory(query), nil
}

func (s *Service) Settle(request SettleBetRequest) (Bet, error) {
	if strings.TrimSpace(request.BetID) == "" || strings.TrimSpace(request.WinningSelectionID) == "" {
		return Bet{}, ErrInvalidSettleRequest
	}
	if request.DeadHeatFactor != nil {
		factor := *request.DeadHeatFactor
		if factor <= 0 || factor > 1 {
			return Bet{}, ErrInvalidSettleRequest
		}
	}
	if s.db != nil {
		return s.settleDB(request)
	}
	return s.settleMemory(request)
}

func (s *Service) Cancel(request LifecycleBetRequest) (Bet, error) {
	if strings.TrimSpace(request.BetID) == "" {
		return Bet{}, ErrInvalidSettleRequest
	}
	if s.db != nil {
		return s.cancelDB(request)
	}
	return s.cancelMemory(request)
}

func (s *Service) Refund(request LifecycleBetRequest) (Bet, error) {
	if strings.TrimSpace(request.BetID) == "" {
		return Bet{}, ErrInvalidSettleRequest
	}
	if s.db != nil {
		return s.refundDB(request)
	}
	return s.refundMemory(request)
}

func (s *Service) ListEvents(limit int) ([]BetEvent, error) {
	if s.db != nil {
		return s.listEventsDB(limit)
	}
	return s.listEventsMemory(limit), nil
}

func (s *Service) PromoUsageSummary(filter PromoUsageFilter, breakdownLimit int) (PromoUsageSummary, error) {
	if breakdownLimit <= 0 {
		breakdownLimit = 20
	}
	if breakdownLimit > 100 {
		breakdownLimit = 100
	}
	if s.db != nil {
		return s.promoUsageSummaryDB(filter, breakdownLimit)
	}
	return s.promoUsageSummaryMemory(filter, breakdownLimit), nil
}

func (s *Service) placeMemory(request PlaceBetRequest) (Bet, error) {
	request, err := normalizePlacementEnvelope(request)
	if err != nil {
		return Bet{}, err
	}

	market, fixture, selection, err := s.validatePlacementRequest(request)
	if err != nil {
		return Bet{}, err
	}
	decision, err := s.applyPlacementPolicies(request, market, fixture, selection)
	if err != nil {
		return Bet{}, err
	}
	request.Odds = decision.FinalOdds
	if err := s.validateOddsBoostForPlacement(request, decision); err != nil {
		return Bet{}, err
	}
	if decision.AppliedLTDMsec > 0 {
		time.Sleep(time.Duration(decision.AppliedLTDMsec) * time.Millisecond)
	}

	idempotencyIndex := fmt.Sprintf("%s:%s", request.UserID, request.IdempotencyKey)

	s.mu.Lock()
	if existing, found := s.betsByIdempotent[idempotencyIndex]; found {
		s.mu.Unlock()
		if !samePlacement(existing, request) {
			return Bet{}, ErrIdempotencyReplay
		}
		return existing, nil
	}
	s.mu.Unlock()

	walletEntry, err := s.wallet.Debit(wallet.MutationRequest{
		UserID:         request.UserID,
		AmountCents:    request.StakeCents,
		IdempotencyKey: "bet:" + request.IdempotencyKey,
		Reason:         "bet placement " + request.MarketID,
	})
	if err != nil {
		return Bet{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, found := s.betsByIdempotent[idempotencyIndex]; found {
		if !samePlacement(existing, request) {
			return Bet{}, ErrIdempotencyReplay
		}
		return existing, nil
	}

	promotionDecision, err := s.applyFreebetForPlacement(request, decision, walletEntry.BalanceCents)
	if err != nil {
		s.refundPlacementDebitBestEffort(request, "promo-validation-failed")
		return Bet{}, err
	}
	walletEntry.BalanceCents = promotionDecision.WalletBalanceCents

	s.sequence++
	bet := buildPlacedBet(
		fmt.Sprintf("b:local:%06d", s.sequence),
		request,
		decision,
		promotionDecision,
		walletEntry,
		s.now(),
	)
	s.betsByID[bet.BetID] = bet
	s.betsByIdempotent[idempotencyIndex] = bet
	s.recordEventLocked(BetEvent{
		ID:         s.nextMemoryEventIDLocked(),
		BetID:      bet.BetID,
		UserID:     bet.UserID,
		Action:     actionBetPlaced,
		ActorID:    fallbackActor(request.ActorID, bet.UserID),
		Status:     bet.Status,
		Details:    placementEventDetails(request, decision, promotionDecision),
		OccurredAt: s.now().UTC().Format(time.RFC3339),
	})

	if err := s.saveToDiskLocked(); err != nil {
		log.Printf("warning: failed to persist bet state to disk: %v", err)
	}
	_ = market
	_ = fixture
	return bet, nil
}

func (s *Service) placeDB(request PlaceBetRequest) (Bet, error) {
	request, err := normalizePlacementEnvelope(request)
	if err != nil {
		return Bet{}, err
	}

	market, fixture, selection, err := s.validatePlacementRequest(request)
	if err != nil {
		return Bet{}, err
	}
	decision, err := s.applyPlacementPolicies(request, market, fixture, selection)
	if err != nil {
		return Bet{}, err
	}
	request.Odds = decision.FinalOdds
	if err := s.validateOddsBoostForPlacement(request, decision); err != nil {
		return Bet{}, err
	}
	if decision.AppliedLTDMsec > 0 {
		time.Sleep(time.Duration(decision.AppliedLTDMsec) * time.Millisecond)
	}

	existing, found, err := s.getBetByUserIdempotencyDB(request.UserID, request.IdempotencyKey)
	if err != nil {
		return Bet{}, err
	}
	if found {
		if !samePlacement(existing, request) {
			return Bet{}, ErrIdempotencyReplay
		}
		return existing, nil
	}

	walletEntry, err := s.wallet.Debit(wallet.MutationRequest{
		UserID:         request.UserID,
		AmountCents:    request.StakeCents,
		IdempotencyKey: "bet:" + request.IdempotencyKey,
		Reason:         "bet placement " + request.MarketID,
	})
	if err != nil {
		return Bet{}, err
	}

	promotionDecision, err := s.applyFreebetForPlacement(request, decision, walletEntry.BalanceCents)
	if err != nil {
		s.refundPlacementDebitBestEffort(request, "promo-validation-failed")
		return Bet{}, err
	}
	walletEntry.BalanceCents = promotionDecision.WalletBalanceCents

	now := s.now()
	betID := fmt.Sprintf("b:db:%d", now.UTC().UnixNano())
	bet := buildPlacedBet(
		betID,
		request,
		decision,
		promotionDecision,
		walletEntry,
		now,
	)
	if err := s.insertBetDB(bet); err != nil {
		existing, found, lookupErr := s.getBetByUserIdempotencyDB(request.UserID, request.IdempotencyKey)
		if lookupErr == nil && found {
			if !samePlacement(existing, request) {
				return Bet{}, ErrIdempotencyReplay
			}
			return existing, nil
		}
		return Bet{}, err
	}
	s.recordEventDBBestEffort(BetEvent{
		ID:         fmt.Sprintf("be:db:%d", now.UTC().UnixNano()),
		BetID:      bet.BetID,
		UserID:     bet.UserID,
		Action:     actionBetPlaced,
		ActorID:    fallbackActor(request.ActorID, bet.UserID),
		Status:     bet.Status,
		Details:    placementEventDetails(request, decision, promotionDecision),
		OccurredAt: now.UTC().Format(time.RFC3339),
	})

	return bet, nil
}

func (s *Service) settleMemory(request SettleBetRequest) (Bet, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	bet, found := s.betsByID[request.BetID]
	if !found {
		return Bet{}, domain.ErrNotFound
	}

	updated, transition, err := s.applySettlementTransition(bet, request)
	if err != nil {
		return Bet{}, err
	}
	s.betsByID[updated.BetID] = updated
	if index := fmt.Sprintf("%s:%s", updated.UserID, updated.IdempotencyKey); index != ":" {
		s.betsByIdempotent[index] = updated
	}
	if lifecycleTransitionChanged(bet, updated) {
		s.recordEventLocked(BetEvent{
			ID:         s.nextMemoryEventIDLocked(),
			BetID:      updated.BetID,
			UserID:     updated.UserID,
			Action:     actionBetSettled,
			ActorID:    fallbackActor(request.ActorID, "admin"),
			Status:     updated.Status,
			Reason:     normalizeReasonCode(request.Reason, "result_confirmed"),
			Details:    buildSettlementEventDetails(request, bet, updated, transition),
			OccurredAt: s.now().UTC().Format(time.RFC3339),
		})
	}
	if err := s.saveToDiskLocked(); err != nil {
		log.Printf("warning: failed to persist bet state to disk: %v", err)
	}
	return updated, nil
}

func (s *Service) cancelMemory(request LifecycleBetRequest) (Bet, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	bet, found := s.betsByID[request.BetID]
	if !found {
		return Bet{}, domain.ErrNotFound
	}

	updated, err := s.applyCancelTransition(bet, request.Reason)
	if err != nil {
		return Bet{}, err
	}
	s.betsByID[updated.BetID] = updated
	if index := fmt.Sprintf("%s:%s", updated.UserID, updated.IdempotencyKey); index != ":" {
		s.betsByIdempotent[index] = updated
	}
	if lifecycleTransitionChanged(bet, updated) {
		s.recordEventLocked(BetEvent{
			ID:         s.nextMemoryEventIDLocked(),
			BetID:      updated.BetID,
			UserID:     updated.UserID,
			Action:     actionBetCancelled,
			ActorID:    fallbackActor(request.ActorID, "admin"),
			Status:     updated.Status,
			Reason:     normalizeReasonCode(request.Reason, "cancelled_by_admin"),
			Details:    settlementReasonOrDefault(request.Reason, "bet cancelled and refunded"),
			OccurredAt: s.now().UTC().Format(time.RFC3339),
		})
	}
	if err := s.saveToDiskLocked(); err != nil {
		log.Printf("warning: failed to persist bet state to disk: %v", err)
	}
	return updated, nil
}

func (s *Service) refundMemory(request LifecycleBetRequest) (Bet, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	bet, found := s.betsByID[request.BetID]
	if !found {
		return Bet{}, domain.ErrNotFound
	}

	updated, err := s.applyRefundTransition(bet, request.Reason)
	if err != nil {
		return Bet{}, err
	}
	s.betsByID[updated.BetID] = updated
	if index := fmt.Sprintf("%s:%s", updated.UserID, updated.IdempotencyKey); index != ":" {
		s.betsByIdempotent[index] = updated
	}
	if lifecycleTransitionChanged(bet, updated) {
		s.recordEventLocked(BetEvent{
			ID:         s.nextMemoryEventIDLocked(),
			BetID:      updated.BetID,
			UserID:     updated.UserID,
			Action:     actionBetRefunded,
			ActorID:    fallbackActor(request.ActorID, "admin"),
			Status:     updated.Status,
			Reason:     normalizeReasonCode(request.Reason, "refunded_by_admin"),
			Details:    settlementReasonOrDefault(request.Reason, "bet refunded"),
			OccurredAt: s.now().UTC().Format(time.RFC3339),
		})
	}
	if err := s.saveToDiskLocked(); err != nil {
		log.Printf("warning: failed to persist bet state to disk: %v", err)
	}
	return updated, nil
}

func (s *Service) settleDB(request SettleBetRequest) (Bet, error) {
	bet, err := s.getBetByIDDB(request.BetID)
	if err != nil {
		return Bet{}, err
	}
	updated, transition, err := s.applySettlementTransition(bet, request)
	if err != nil {
		return Bet{}, err
	}
	if !lifecycleTransitionChanged(bet, updated) {
		return updated, nil
	}
	if err := s.updateBetLifecycleDB(updated); err != nil {
		return Bet{}, err
	}
	s.recordEventDBBestEffort(BetEvent{
		ID:         fmt.Sprintf("be:db:%d", s.now().UTC().UnixNano()),
		BetID:      updated.BetID,
		UserID:     updated.UserID,
		Action:     actionBetSettled,
		ActorID:    fallbackActor(request.ActorID, "admin"),
		Status:     updated.Status,
		Reason:     normalizeReasonCode(request.Reason, "result_confirmed"),
		Details:    buildSettlementEventDetails(request, bet, updated, transition),
		OccurredAt: s.now().UTC().Format(time.RFC3339),
	})
	return updated, nil
}

func (s *Service) cancelDB(request LifecycleBetRequest) (Bet, error) {
	bet, err := s.getBetByIDDB(request.BetID)
	if err != nil {
		return Bet{}, err
	}
	updated, err := s.applyCancelTransition(bet, request.Reason)
	if err != nil {
		return Bet{}, err
	}
	if !lifecycleTransitionChanged(bet, updated) {
		return updated, nil
	}
	if err := s.updateBetLifecycleDB(updated); err != nil {
		return Bet{}, err
	}
	s.recordEventDBBestEffort(BetEvent{
		ID:         fmt.Sprintf("be:db:%d", s.now().UTC().UnixNano()),
		BetID:      updated.BetID,
		UserID:     updated.UserID,
		Action:     actionBetCancelled,
		ActorID:    fallbackActor(request.ActorID, "admin"),
		Status:     updated.Status,
		Reason:     normalizeReasonCode(request.Reason, "cancelled_by_admin"),
		Details:    settlementReasonOrDefault(request.Reason, "bet cancelled and refunded"),
		OccurredAt: s.now().UTC().Format(time.RFC3339),
	})
	return updated, nil
}

func (s *Service) refundDB(request LifecycleBetRequest) (Bet, error) {
	bet, err := s.getBetByIDDB(request.BetID)
	if err != nil {
		return Bet{}, err
	}
	updated, err := s.applyRefundTransition(bet, request.Reason)
	if err != nil {
		return Bet{}, err
	}
	if !lifecycleTransitionChanged(bet, updated) {
		return updated, nil
	}
	if err := s.updateBetLifecycleDB(updated); err != nil {
		return Bet{}, err
	}
	s.recordEventDBBestEffort(BetEvent{
		ID:         fmt.Sprintf("be:db:%d", s.now().UTC().UnixNano()),
		BetID:      updated.BetID,
		UserID:     updated.UserID,
		Action:     actionBetRefunded,
		ActorID:    fallbackActor(request.ActorID, "admin"),
		Status:     updated.Status,
		Reason:     normalizeReasonCode(request.Reason, "refunded_by_admin"),
		Details:    settlementReasonOrDefault(request.Reason, "bet refunded"),
		OccurredAt: s.now().UTC().Format(time.RFC3339),
	})
	return updated, nil
}

func normalizePlacementEnvelope(request PlaceBetRequest) (PlaceBetRequest, error) {
	out := request

	out.UserID = strings.TrimSpace(out.UserID)
	out.IdempotencyKey = strings.TrimSpace(out.IdempotencyKey)
	out.RequestID = strings.TrimSpace(out.RequestID)
	out.DeviceID = strings.TrimSpace(out.DeviceID)
	out.SegmentID = strings.TrimSpace(out.SegmentID)
	out.IPAddress = strings.TrimSpace(out.IPAddress)
	out.MarketID = strings.TrimSpace(out.MarketID)
	out.SelectionID = strings.TrimSpace(out.SelectionID)
	out.FreebetID = strings.TrimSpace(out.FreebetID)
	out.OddsBoostID = strings.TrimSpace(out.OddsBoostID)

	if out.RequestID == "" {
		out.RequestID = out.IdempotencyKey
	}

	if len(out.Items) > 1 {
		return PlaceBetRequest{}, ErrInvalidBetRequest
	}

	if len(out.Items) == 1 {
		item := out.Items[0]
		item.MarketID = strings.TrimSpace(item.MarketID)
		item.SelectionID = strings.TrimSpace(item.SelectionID)
		item.RequestLineID = strings.TrimSpace(item.RequestLineID)

		if item.MarketID == "" || item.SelectionID == "" || item.StakeCents <= 0 || item.Odds <= 0 {
			return PlaceBetRequest{}, ErrInvalidBetRequest
		}

		if out.MarketID == "" {
			out.MarketID = item.MarketID
		} else if !strings.EqualFold(out.MarketID, item.MarketID) {
			return PlaceBetRequest{}, ErrInvalidBetRequest
		}

		if out.SelectionID == "" {
			out.SelectionID = item.SelectionID
		} else if !strings.EqualFold(out.SelectionID, item.SelectionID) {
			return PlaceBetRequest{}, ErrInvalidBetRequest
		}

		if out.StakeCents == 0 {
			out.StakeCents = item.StakeCents
		} else if out.StakeCents != item.StakeCents {
			return PlaceBetRequest{}, ErrInvalidBetRequest
		}

		if out.Odds == 0 {
			out.Odds = item.Odds
		} else if !sameOdds(out.Odds, item.Odds) {
			return PlaceBetRequest{}, ErrInvalidBetRequest
		}

		out.Items = []PlaceBetItem{item}
		return out, nil
	}

	if out.MarketID == "" || out.SelectionID == "" || out.StakeCents <= 0 || out.Odds <= 0 {
		return PlaceBetRequest{}, ErrInvalidBetRequest
	}

	out.Items = []PlaceBetItem{
		{
			MarketID:    out.MarketID,
			SelectionID: out.SelectionID,
			StakeCents:  out.StakeCents,
			Odds:        out.Odds,
		},
	}

	return out, nil
}

func (s *Service) validatePlacementRequest(request PlaceBetRequest) (domain.Market, domain.Fixture, domain.MarketSelection, error) {
	if strings.TrimSpace(request.UserID) == "" ||
		strings.TrimSpace(request.RequestID) == "" ||
		strings.TrimSpace(request.MarketID) == "" ||
		strings.TrimSpace(request.SelectionID) == "" ||
		strings.TrimSpace(request.IdempotencyKey) == "" {
		return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, ErrInvalidBetRequest
	}
	if len(request.RequestID) > 128 || len(request.DeviceID) > 128 || len(request.SegmentID) > 64 {
		return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, ErrInvalidBetRequest
	}
	if request.IPAddress != "" {
		if _, err := netip.ParseAddr(request.IPAddress); err != nil {
			return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, ErrInvalidBetRequest
		}
	}
	if request.StakeCents <= 0 {
		return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, ErrInvalidBetRequest
	}
	if request.OddsPrecision < 0 || request.OddsPrecision > 6 {
		return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, ErrInvalidBetRequest
	}
	if request.OddsPrecision > 0 && oddsDecimalPlaces(request.Odds) > request.OddsPrecision {
		return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, ErrInvalidBetRequest
	}
	if request.Odds <= 1.0 || !oddsPrecisionValid(request.Odds) {
		return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, ErrOddsOutOfRange
	}
	if request.Odds < s.minOdds || request.Odds > s.maxOdds {
		return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, ErrOddsOutOfRange
	}

	market, err := s.repository.GetMarketByID(request.MarketID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, ErrMarketNotFound
		}
		return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, err
	}
	if !strings.EqualFold(market.Status, "open") {
		return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, ErrMarketNotOpen
	}

	fixture, err := s.repository.GetFixtureByID(market.FixtureID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			fixture = domain.Fixture{
				ID:         market.FixtureID,
				HomeTeam:   "Home",
				AwayTeam:   "Away",
				Tournament: "Unknown Tournament",
				StartsAt:   market.StartsAt,
			}
		} else {
			return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, err
		}
	}

	selections := resolveSelections(market, fixture)
	selection, found := findSelection(selections, request.SelectionID)
	if !found {
		return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, ErrSelectionNotFound
	}

	minStake := market.MinStakeCents
	if minStake <= 0 {
		minStake = s.minStakeCents
	}
	maxStake := market.MaxStakeCents
	if maxStake <= 0 {
		maxStake = s.maxStakeCents
	}
	if request.StakeCents < minStake || request.StakeCents > maxStake {
		return domain.Market{}, domain.Fixture{}, domain.MarketSelection{}, ErrStakeOutOfRange
	}

	return market, fixture, selection, nil
}

func (s *Service) applySettlementTransition(bet Bet, request SettleBetRequest) (Bet, settlementTransitionMeta, error) {
	normalizedReference, winningSelectionSet := normalizeWinningSelectionSet(request.WinningSelectionID)
	if normalizedReference == "" {
		return Bet{}, settlementTransitionMeta{}, ErrInvalidSettleRequest
	}
	if len(bet.Legs) > 1 && !hasMultipleSettlementSelections(request.WinningSelectionID) {
		return Bet{}, settlementTransitionMeta{}, ErrInvalidSettleRequest
	}

	deadHeatFactor := 1.0
	if request.DeadHeatFactor != nil {
		deadHeatFactor = *request.DeadHeatFactor
	}

	meta := settlementTransitionMeta{
		Resettled:           bet.Status == statusSettledWon || bet.Status == statusSettledLost,
		Policy:              "deterministic_resettlement_adjust_wallet_delta",
		DeadHeatFactor:      deadHeatFactor,
		PreviousStatus:      bet.Status,
		PreviousOutcome:     bet.SettlementOutcome,
		PreviousReference:   bet.SettlementReference,
		PreviousPayoutCents: s.currentSettlementPayoutCents(bet),
	}

	switch bet.Status {
	case statusPlaced, statusSettledWon, statusSettledLost:
	default:
		return Bet{}, settlementTransitionMeta{}, ErrBetStateConflict
	}

	isWinningBet := isWinningSettlement(bet, winningSelectionSet)
	targetStatus := statusSettledLost
	targetOutcome := "lost"
	targetPayoutCents := int64(0)
	if isWinningBet {
		targetStatus = statusSettledWon
		targetOutcome = "won"
		targetPayoutCents = int64(math.Round(float64(bet.PotentialPayoutCents) * deadHeatFactor))
	}

	// Deterministic idempotent replay for the same settlement target.
	if bet.Status != statusPlaced &&
		bet.Status == targetStatus &&
		sameSettlementReference(bet.SettlementReference, normalizedReference) &&
		meta.PreviousPayoutCents == targetPayoutCents {
		meta.NextPayoutCents = targetPayoutCents
		return bet, meta, nil
	}

	adjustmentCents := targetPayoutCents - meta.PreviousPayoutCents
	settlementLedgerEntryID := bet.SettlementLedgerEntryID
	balanceCents := bet.WalletBalanceCents

	if adjustmentCents > 0 {
		idempotencyKey := "settle-win:" + bet.BetID
		if meta.Resettled {
			idempotencyKey = buildResettlementIdempotencyKey(
				"resettle-credit",
				bet,
				meta.PreviousPayoutCents,
				targetPayoutCents,
				normalizedReference,
			)
		}
		entry, err := s.wallet.Credit(wallet.MutationRequest{
			UserID:         bet.UserID,
			AmountCents:    adjustmentCents,
			IdempotencyKey: idempotencyKey,
			Reason:         settlementReasonOrDefault(request.Reason, "bet settlement win"),
		})
		if err != nil {
			return Bet{}, settlementTransitionMeta{}, err
		}
		settlementLedgerEntryID = entry.EntryID
		balanceCents = entry.BalanceCents
	} else if adjustmentCents < 0 {
		entry, err := s.wallet.Debit(wallet.MutationRequest{
			UserID:      bet.UserID,
			AmountCents: -adjustmentCents,
			IdempotencyKey: buildResettlementIdempotencyKey(
				"resettle-debit",
				bet,
				meta.PreviousPayoutCents,
				targetPayoutCents,
				normalizedReference,
			),
			Reason: settlementReasonOrDefault(request.Reason, "bet resettlement reversal"),
		})
		if err != nil {
			return Bet{}, settlementTransitionMeta{}, err
		}
		settlementLedgerEntryID = entry.EntryID
		balanceCents = entry.BalanceCents
	}

	bet.Status = targetStatus
	bet.SettledAt = s.now().UTC().Format(time.RFC3339)
	bet.SettlementOutcome = targetOutcome
	bet.SettlementReference = normalizedReference
	bet.SettlementLedgerEntryID = settlementLedgerEntryID
	bet.WalletBalanceCents = balanceCents

	meta.NextPayoutCents = targetPayoutCents
	meta.AdjustmentCents = adjustmentCents

	if s.loyalty != nil && !meta.Resettled {
		_, _, err := s.loyalty.AccrueSettledBet(loyalty.SettlementAccrualRequest{
			PlayerID:         bet.UserID,
			BetID:            bet.BetID,
			SettlementStatus: bet.Status,
			StakeCents:       bet.StakeCents,
			IdempotencyKey:   "loyalty:bet_settlement:" + bet.BetID,
			Reason:           settlementReasonOrDefault(request.Reason, "bet settlement loyalty accrual"),
			SettledAt:        s.now().UTC(),
		})
		if err != nil {
			return Bet{}, settlementTransitionMeta{}, err
		}
	}

	return bet, meta, nil
}

func (s *Service) applyCancelTransition(bet Bet, reason string) (Bet, error) {
	switch bet.Status {
	case statusCancelled:
		return bet, nil
	case statusPlaced:
	default:
		return Bet{}, ErrBetStateConflict
	}

	entry, err := s.wallet.Credit(wallet.MutationRequest{
		UserID:         bet.UserID,
		AmountCents:    bet.StakeCents,
		IdempotencyKey: "cancel:" + bet.BetID,
		Reason:         settlementReasonOrDefault(reason, "bet cancellation refund"),
	})
	if err != nil {
		return Bet{}, err
	}

	bet.Status = statusCancelled
	bet.SettledAt = s.now().UTC().Format(time.RFC3339)
	bet.SettlementOutcome = "cancelled"
	bet.SettlementReference = strings.TrimSpace(reason)
	bet.SettlementLedgerEntryID = entry.EntryID
	bet.WalletBalanceCents = entry.BalanceCents
	return bet, nil
}

func (s *Service) applyRefundTransition(bet Bet, reason string) (Bet, error) {
	switch bet.Status {
	case statusRefunded:
		return bet, nil
	case statusPlaced, statusSettledLost:
	default:
		return Bet{}, ErrBetStateConflict
	}

	entry, err := s.wallet.Credit(wallet.MutationRequest{
		UserID:         bet.UserID,
		AmountCents:    bet.StakeCents,
		IdempotencyKey: "refund:" + bet.BetID,
		Reason:         settlementReasonOrDefault(reason, "bet refund"),
	})
	if err != nil {
		return Bet{}, err
	}

	bet.Status = statusRefunded
	bet.SettledAt = s.now().UTC().Format(time.RFC3339)
	bet.SettlementOutcome = "refunded"
	bet.SettlementReference = strings.TrimSpace(reason)
	bet.SettlementLedgerEntryID = entry.EntryID
	bet.WalletBalanceCents = entry.BalanceCents
	return bet, nil
}

func normalizeWinningSelectionSet(raw string) (string, map[string]struct{}) {
	splitter := func(r rune) bool {
		return r == ',' || r == ';' || r == '|' || r == '\n' || r == '\t'
	}
	parts := strings.FieldsFunc(raw, splitter)
	if len(parts) == 0 {
		parts = []string{raw}
	}

	set := make(map[string]struct{}, len(parts))
	normalized := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.ToLower(strings.TrimSpace(part))
		if value == "" {
			continue
		}
		if _, exists := set[value]; exists {
			continue
		}
		set[value] = struct{}{}
		normalized = append(normalized, value)
	}
	sort.Strings(normalized)
	return strings.Join(normalized, ","), set
}

func hasMultipleSettlementSelections(raw string) bool {
	value := strings.TrimSpace(raw)
	if value == "" {
		return false
	}
	return strings.ContainsAny(value, ",;|")
}

func sameSettlementReference(left string, right string) bool {
	leftReference, _ := normalizeWinningSelectionSet(left)
	rightReference, _ := normalizeWinningSelectionSet(right)
	return leftReference != "" && leftReference == rightReference
}

func isWinningSettlement(bet Bet, winningSelectionSet map[string]struct{}) bool {
	if len(bet.Legs) > 0 {
		for _, leg := range bet.Legs {
			selectionID := strings.ToLower(strings.TrimSpace(leg.SelectionID))
			if selectionID == "" {
				return false
			}
			if _, ok := winningSelectionSet[selectionID]; !ok {
				return false
			}
		}
		return true
	}
	selectionID := strings.ToLower(strings.TrimSpace(bet.SelectionID))
	if selectionID == "" {
		return false
	}
	_, ok := winningSelectionSet[selectionID]
	return ok
}

func (s *Service) currentSettlementPayoutCents(bet Bet) int64 {
	if bet.Status != statusSettledWon {
		return 0
	}

	entries := s.wallet.Ledger(bet.UserID, 0)
	if len(entries) == 0 {
		if bet.PotentialPayoutCents > 0 {
			return bet.PotentialPayoutCents
		}
		return 0
	}

	var payoutCents int64
	baseKey := "settle-win:" + bet.BetID
	creditPrefix := "resettle-credit:" + bet.BetID + ":"
	debitPrefix := "resettle-debit:" + bet.BetID + ":"
	for _, entry := range entries {
		switch {
		case entry.IdempotencyKey == baseKey && strings.EqualFold(entry.Type, "credit"):
			payoutCents += entry.AmountCents
		case strings.HasPrefix(entry.IdempotencyKey, creditPrefix) && strings.EqualFold(entry.Type, "credit"):
			payoutCents += entry.AmountCents
		case strings.HasPrefix(entry.IdempotencyKey, debitPrefix) && strings.EqualFold(entry.Type, "debit"):
			payoutCents -= entry.AmountCents
		}
	}
	if payoutCents > 0 {
		return payoutCents
	}

	for _, entry := range entries {
		if entry.EntryID == bet.SettlementLedgerEntryID && strings.EqualFold(entry.Type, "credit") {
			return entry.AmountCents
		}
	}
	if bet.PotentialPayoutCents > 0 {
		return bet.PotentialPayoutCents
	}
	return 0
}

func buildResettlementIdempotencyKey(prefix string, bet Bet, previousPayoutCents int64, targetPayoutCents int64, targetReference string) string {
	previousReference, _ := normalizeWinningSelectionSet(bet.SettlementReference)
	source := fmt.Sprintf(
		"bet=%s status=%s previousRef=%s previousPayout=%d settledAt=%s targetRef=%s targetPayout=%d",
		bet.BetID,
		bet.Status,
		previousReference,
		previousPayoutCents,
		bet.SettledAt,
		targetReference,
		targetPayoutCents,
	)
	digest := sha1.Sum([]byte(source))
	return fmt.Sprintf("%s:%s:%x", prefix, bet.BetID, digest)
}

func (s *Service) applyPlacementPolicies(
	request PlaceBetRequest,
	market domain.Market,
	fixture domain.Fixture,
	selection domain.MarketSelection,
) (placementDecision, error) {
	currentOdds := selection.Odds
	if currentOdds <= 0 {
		currentOdds = request.Odds
	}
	requestedOdds := request.Odds

	now := s.now().UTC()
	inPlay := isInPlayMarket(now, market, fixture)
	if inPlay && !s.allowInPlay {
		return placementDecision{}, ErrMarketNotOpen
	}

	policy := s.oddsChangePolicy
	if request.ForceRequestedOdds {
		policy = oddsPolicyAcceptRequested
	}
	if request.AcceptAnyOdds && policy == oddsPolicyRejectOnChange {
		policy = oddsPolicyAcceptLatest
	}

	finalOdds := requestedOdds
	oddsChanged := !sameOdds(requestedOdds, currentOdds)
	switch policy {
	case oddsPolicyAcceptLatest:
		finalOdds = currentOdds
	case oddsPolicyRejectOnChange:
		if oddsChanged {
			return placementDecision{}, ErrOddsChanged
		}
	case oddsPolicyOnlyBetter:
		if currentOdds < requestedOdds && !sameOdds(currentOdds, requestedOdds) {
			return placementDecision{}, ErrOddsChanged
		}
		finalOdds = currentOdds
	case oddsPolicyAcceptRequested:
		fallthrough
	default:
		finalOdds = requestedOdds
	}

	appliedLtdMs := int64(0)
	if s.ltdEnabled && inPlay {
		appliedLtdMs = s.ltdInPlayMsec
		if appliedLtdMs < 0 {
			appliedLtdMs = 0
		}
	}

	return placementDecision{
		RequestedOdds:  requestedOdds,
		CurrentOdds:    currentOdds,
		FinalOdds:      finalOdds,
		OddsPolicy:     policy,
		OddsChanged:    oddsChanged,
		IsInPlay:       inPlay,
		AppliedLTDMsec: appliedLtdMs,
	}, nil
}

func (s *Service) validateOddsBoostForPlacement(request PlaceBetRequest, decision placementDecision) error {
	boostID := strings.TrimSpace(request.OddsBoostID)
	if boostID == "" {
		return nil
	}
	if s.oddsBoosts == nil {
		return ErrOddsBoostNotEligible
	}

	_, err := s.oddsBoosts.ValidateForBet(oddsboosts.ValidateForBetRequest{
		OddsBoostID:   boostID,
		UserID:        request.UserID,
		MarketID:      request.MarketID,
		SelectionID:   request.SelectionID,
		StakeCents:    request.StakeCents,
		RequestedOdds: decision.FinalOdds,
	})
	switch {
	case err == nil:
		return nil
	case errors.Is(err, oddsboosts.ErrOddsBoostNotFound):
		return ErrOddsBoostNotFound
	case errors.Is(err, oddsboosts.ErrOddsBoostForbidden):
		return ErrOddsBoostForbidden
	case errors.Is(err, oddsboosts.ErrOddsBoostInvalidRequest):
		return ErrInvalidBetRequest
	case errors.Is(err, oddsboosts.ErrOddsBoostNotAcceptable):
		return ErrOddsBoostNotEligible
	default:
		return err
	}
}

func (s *Service) validateFreebetForPrecheck(request PlaceBetRequest, decision placementDecision) error {
	freebetID := strings.TrimSpace(request.FreebetID)
	if freebetID == "" {
		return nil
	}
	if s.freebets == nil {
		return ErrFreebetNotEligible
	}

	item, exists := s.freebets.GetByID(freebetID)
	if !exists {
		return ErrFreebetNotFound
	}
	if !strings.EqualFold(item.PlayerID, request.UserID) {
		return ErrFreebetForbidden
	}
	if !item.ExpiresAt.After(s.now()) {
		return ErrFreebetNotEligible
	}
	status := strings.ToLower(strings.TrimSpace(string(item.Status)))
	if status != "available" && status != "reserved" {
		return ErrFreebetNotEligible
	}
	if item.MinOddsDecimal > 0 && decision.FinalOdds+0.0000001 < item.MinOddsDecimal {
		return ErrFreebetNotEligible
	}
	if item.RemainingAmountCents <= 0 {
		return ErrFreebetNotEligible
	}
	return nil
}

func (s *Service) applyFreebetForPlacement(
	request PlaceBetRequest,
	decision placementDecision,
	walletBalanceCents int64,
) (promotionPlacementDecision, error) {
	promotion := promotionPlacementDecision{
		FreebetID:          strings.TrimSpace(request.FreebetID),
		OddsBoostID:        strings.TrimSpace(request.OddsBoostID),
		WalletBalanceCents: walletBalanceCents,
	}
	if promotion.FreebetID == "" {
		return promotion, nil
	}
	if s.freebets == nil {
		return promotion, ErrFreebetNotEligible
	}

	applyRequestID := fmt.Sprintf("bet-freebet-apply:%s:%s", request.UserID, request.IdempotencyKey)
	applied, err := s.freebets.ApplyToBet(freebets.ApplyToBetRequest{
		FreebetID:  promotion.FreebetID,
		UserID:     request.UserID,
		RequestID:  applyRequestID,
		StakeCents: request.StakeCents,
		Odds:       decision.FinalOdds,
	})
	if err != nil {
		switch {
		case errors.Is(err, freebets.ErrFreebetNotFound):
			return promotion, ErrFreebetNotFound
		case errors.Is(err, freebets.ErrFreebetForbidden):
			return promotion, ErrFreebetForbidden
		case errors.Is(err, freebets.ErrFreebetInvalidRequest):
			return promotion, ErrInvalidBetRequest
		case errors.Is(err, freebets.ErrFreebetNotApplicable), errors.Is(err, freebets.ErrFreebetIdempotency):
			return promotion, ErrFreebetNotEligible
		default:
			return promotion, err
		}
	}

	promotion.FreebetAppliedCents = applied.AppliedAmountCents
	if promotion.FreebetAppliedCents <= 0 {
		return promotion, nil
	}

	creditEntry, err := s.wallet.Credit(wallet.MutationRequest{
		UserID:         request.UserID,
		AmountCents:    promotion.FreebetAppliedCents,
		IdempotencyKey: "bet-freebet-credit:" + request.IdempotencyKey,
		Reason:         "freebet applied " + promotion.FreebetID,
	})
	if err != nil {
		_ = s.freebets.RollbackApply(applyRequestID)
		if errors.Is(err, wallet.ErrIdempotencyConflict) {
			return promotion, ErrBetStateConflict
		}
		return promotion, err
	}
	promotion.WalletBalanceCents = creditEntry.BalanceCents
	return promotion, nil
}

func (s *Service) refundPlacementDebitBestEffort(request PlaceBetRequest, reasonSuffix string) {
	reason := strings.TrimSpace(reasonSuffix)
	if reason == "" {
		reason = "failed_promo_validation"
	}
	_, err := s.wallet.Credit(wallet.MutationRequest{
		UserID:         request.UserID,
		AmountCents:    request.StakeCents,
		IdempotencyKey: "bet-promo-refund:" + request.IdempotencyKey,
		Reason:         "bet placement rollback " + reason,
	})
	if err != nil {
		log.Printf("warning: failed to rollback placement debit user=%s idempotency=%s: %v", request.UserID, request.IdempotencyKey, err)
	}
}

func (s *Service) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), betDBTimeout)
	defer cancel()

	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS bets (
  bet_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  market_id TEXT NOT NULL,
  selection_id TEXT NOT NULL,
  stake_cents BIGINT NOT NULL,
  odds DOUBLE PRECISION NOT NULL,
  potential_payout_cents BIGINT NOT NULL,
  status TEXT NOT NULL,
  wallet_ledger_entry_id TEXT NOT NULL,
  wallet_balance_cents BIGINT NOT NULL,
  idempotency_key TEXT NOT NULL,
  placed_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ NULL,
  settlement_ledger_entry_id TEXT NULL,
  settlement_outcome TEXT NULL,
  settlement_reference TEXT NULL,
  freebet_id TEXT NULL,
  freebet_applied_cents BIGINT NOT NULL DEFAULT 0,
  odds_boost_id TEXT NULL,
  legs_json TEXT NULL,
  UNIQUE (user_id, idempotency_key)
);

ALTER TABLE bets
ADD COLUMN IF NOT EXISTS legs_json TEXT NULL;
ALTER TABLE bets
ADD COLUMN IF NOT EXISTS freebet_id TEXT NULL;
ALTER TABLE bets
ADD COLUMN IF NOT EXISTS freebet_applied_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE bets
ADD COLUMN IF NOT EXISTS odds_boost_id TEXT NULL;

CREATE TABLE IF NOT EXISTS bet_events (
  event_id TEXT PRIMARY KEY,
  bet_id TEXT NOT NULL REFERENCES bets(bet_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NULL,
  details TEXT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bet_events_occurred_at ON bet_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_bet_events_action ON bet_events(action);
CREATE INDEX IF NOT EXISTS idx_bet_events_actor_id ON bet_events(actor_id)
);`)
	return err
}

func (s *Service) getBetByIDDB(betID string) (Bet, error) {
	ctx, cancel := context.WithTimeout(context.Background(), betDBTimeout)
	defer cancel()

	var bet Bet
	var settledAt sql.NullString
	var settlementLedger sql.NullString
	var settlementOutcome sql.NullString
	var settlementReference sql.NullString
	var legsJSON sql.NullString

	err := s.db.QueryRowContext(ctx, `
SELECT
  bet_id,
  user_id,
  market_id,
  selection_id,
  stake_cents,
  freebet_id,
  freebet_applied_cents,
  odds_boost_id,
  odds,
  potential_payout_cents,
  status,
  wallet_ledger_entry_id,
  wallet_balance_cents,
  idempotency_key,
  CAST(placed_at AS TEXT),
  CAST(settled_at AS TEXT),
  settlement_ledger_entry_id,
  settlement_outcome,
  settlement_reference,
  legs_json
FROM bets
WHERE bet_id = $1
LIMIT 1`, betID).Scan(
		&bet.BetID,
		&bet.UserID,
		&bet.MarketID,
		&bet.SelectionID,
		&bet.StakeCents,
		&bet.FreebetID,
		&bet.FreebetAppliedCents,
		&bet.OddsBoostID,
		&bet.Odds,
		&bet.PotentialPayoutCents,
		&bet.Status,
		&bet.WalletLedgerEntryID,
		&bet.WalletBalanceCents,
		&bet.IdempotencyKey,
		&bet.PlacedAt,
		&settledAt,
		&settlementLedger,
		&settlementOutcome,
		&settlementReference,
		&legsJSON,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Bet{}, domain.ErrNotFound
		}
		return Bet{}, err
	}

	bet.SettledAt = strings.TrimSpace(settledAt.String)
	bet.SettlementLedgerEntryID = strings.TrimSpace(settlementLedger.String)
	bet.SettlementOutcome = strings.TrimSpace(settlementOutcome.String)
	bet.SettlementReference = strings.TrimSpace(settlementReference.String)
	decodedLegs, err := decodeBetLegs(legsJSON.String)
	if err != nil {
		return Bet{}, err
	}
	bet.Legs = decodedLegs
	return bet, nil
}

func (s *Service) getBetByUserIdempotencyDB(userID string, idempotencyKey string) (Bet, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), betDBTimeout)
	defer cancel()

	var bet Bet
	var settledAt sql.NullString
	var settlementLedger sql.NullString
	var settlementOutcome sql.NullString
	var settlementReference sql.NullString
	var legsJSON sql.NullString

	err := s.db.QueryRowContext(ctx, `
SELECT
  bet_id,
  user_id,
  market_id,
  selection_id,
  stake_cents,
  freebet_id,
  freebet_applied_cents,
  odds_boost_id,
  odds,
  potential_payout_cents,
  status,
  wallet_ledger_entry_id,
  wallet_balance_cents,
  idempotency_key,
  CAST(placed_at AS TEXT),
  CAST(settled_at AS TEXT),
  settlement_ledger_entry_id,
  settlement_outcome,
  settlement_reference,
  legs_json
FROM bets
WHERE user_id = $1 AND idempotency_key = $2
LIMIT 1`, userID, idempotencyKey).Scan(
		&bet.BetID,
		&bet.UserID,
		&bet.MarketID,
		&bet.SelectionID,
		&bet.StakeCents,
		&bet.FreebetID,
		&bet.FreebetAppliedCents,
		&bet.OddsBoostID,
		&bet.Odds,
		&bet.PotentialPayoutCents,
		&bet.Status,
		&bet.WalletLedgerEntryID,
		&bet.WalletBalanceCents,
		&bet.IdempotencyKey,
		&bet.PlacedAt,
		&settledAt,
		&settlementLedger,
		&settlementOutcome,
		&settlementReference,
		&legsJSON,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Bet{}, false, nil
		}
		return Bet{}, false, err
	}

	bet.SettledAt = strings.TrimSpace(settledAt.String)
	bet.SettlementLedgerEntryID = strings.TrimSpace(settlementLedger.String)
	bet.SettlementOutcome = strings.TrimSpace(settlementOutcome.String)
	bet.SettlementReference = strings.TrimSpace(settlementReference.String)
	decodedLegs, err := decodeBetLegs(legsJSON.String)
	if err != nil {
		return Bet{}, false, err
	}
	bet.Legs = decodedLegs
	return bet, true, nil
}

func (s *Service) listByUserDB(query BetHistoryQuery) (BetHistoryPage, error) {
	ctx, cancel := context.WithTimeout(context.Background(), betDBTimeout)
	defer cancel()

	whereParts := []string{"user_id = $1"}
	args := []any{query.UserID}
	argIndex := 2

	if len(query.Statuses) > 0 {
		placeholders := make([]string, 0, len(query.Statuses))
		for _, status := range query.Statuses {
			placeholders = append(placeholders, fmt.Sprintf("$%d", argIndex))
			args = append(args, status)
			argIndex++
		}
		whereParts = append(whereParts, "status IN ("+strings.Join(placeholders, ", ")+")")
	}

	whereClause := strings.Join(whereParts, " AND ")

	var totalCount int
	countQuery := `SELECT COUNT(*) FROM bets WHERE ` + whereClause
	if err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount); err != nil {
		return BetHistoryPage{}, err
	}

	offset := (query.Page - 1) * query.PageSize
	listArgs := append(append([]any{}, args...), query.PageSize, offset)
	rows, err := s.db.QueryContext(ctx, `
SELECT
  bet_id,
  user_id,
  market_id,
  selection_id,
  stake_cents,
  freebet_id,
  freebet_applied_cents,
  odds_boost_id,
  odds,
  potential_payout_cents,
  status,
  wallet_ledger_entry_id,
  wallet_balance_cents,
  idempotency_key,
  CAST(placed_at AS TEXT),
  CAST(settled_at AS TEXT),
  settlement_ledger_entry_id,
  settlement_outcome,
  settlement_reference,
  legs_json
FROM bets
WHERE `+whereClause+`
ORDER BY placed_at DESC
LIMIT $`+fmt.Sprintf("%d", argIndex)+` OFFSET $`+fmt.Sprintf("%d", argIndex+1), listArgs...)
	if err != nil {
		return BetHistoryPage{}, err
	}
	defer rows.Close()

	items := make([]Bet, 0, query.PageSize)
	for rows.Next() {
		bet, err := scanBetRow(rows)
		if err != nil {
			return BetHistoryPage{}, err
		}
		items = append(items, bet)
	}
	if err := rows.Err(); err != nil {
		return BetHistoryPage{}, err
	}

	return BetHistoryPage{
		CurrentPage:  query.Page,
		Data:         items,
		ItemsPerPage: query.PageSize,
		TotalCount:   totalCount,
		HasNextPage:  offset+len(items) < totalCount,
	}, nil
}

func (s *Service) insertBetDB(bet Bet) error {
	ctx, cancel := context.WithTimeout(context.Background(), betDBTimeout)
	defer cancel()

	legsJSON, err := encodeBetLegs(bet.Legs)
	if err != nil {
		return err
	}

	_, err = s.db.ExecContext(ctx, `
INSERT INTO bets (
  bet_id,
  user_id,
  market_id,
  selection_id,
  stake_cents,
  freebet_id,
  freebet_applied_cents,
  odds_boost_id,
  odds,
  potential_payout_cents,
  status,
  wallet_ledger_entry_id,
  wallet_balance_cents,
  idempotency_key,
  placed_at,
  legs_json
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
)`,
		bet.BetID,
		bet.UserID,
		bet.MarketID,
		bet.SelectionID,
		bet.StakeCents,
		nullIfEmpty(bet.FreebetID),
		bet.FreebetAppliedCents,
		nullIfEmpty(bet.OddsBoostID),
		bet.Odds,
		bet.PotentialPayoutCents,
		bet.Status,
		bet.WalletLedgerEntryID,
		bet.WalletBalanceCents,
		bet.IdempotencyKey,
		bet.PlacedAt,
		nullIfEmpty(legsJSON),
	)
	return err
}

func (s *Service) listByUserMemory(query BetHistoryQuery) BetHistoryPage {
	s.mu.RLock()
	defer s.mu.RUnlock()

	items := make([]Bet, 0, len(s.betsByID))
	for _, bet := range s.betsByID {
		if bet.UserID != query.UserID {
			continue
		}
		if !historyStatusMatches(bet.Status, query.Statuses) {
			continue
		}
		items = append(items, bet)
	}

	sort.Slice(items, func(i, j int) bool {
		return compareBetHistoryOrder(items[i], items[j])
	})

	totalCount := len(items)
	offset := (query.Page - 1) * query.PageSize
	if offset >= totalCount {
		return BetHistoryPage{
			CurrentPage:  query.Page,
			Data:         []Bet{},
			ItemsPerPage: query.PageSize,
			TotalCount:   totalCount,
			HasNextPage:  false,
		}
	}

	end := offset + query.PageSize
	if end > totalCount {
		end = totalCount
	}

	return BetHistoryPage{
		CurrentPage:  query.Page,
		Data:         items[offset:end],
		ItemsPerPage: query.PageSize,
		TotalCount:   totalCount,
		HasNextPage:  end < totalCount,
	}
}

func scanBetRow(scanner interface{ Scan(dest ...any) error }) (Bet, error) {
	var bet Bet
	var settledAt sql.NullString
	var settlementLedger sql.NullString
	var settlementOutcome sql.NullString
	var settlementReference sql.NullString
	var legsJSON sql.NullString

	err := scanner.Scan(
		&bet.BetID,
		&bet.UserID,
		&bet.MarketID,
		&bet.SelectionID,
		&bet.StakeCents,
		&bet.FreebetID,
		&bet.FreebetAppliedCents,
		&bet.OddsBoostID,
		&bet.Odds,
		&bet.PotentialPayoutCents,
		&bet.Status,
		&bet.WalletLedgerEntryID,
		&bet.WalletBalanceCents,
		&bet.IdempotencyKey,
		&bet.PlacedAt,
		&settledAt,
		&settlementLedger,
		&settlementOutcome,
		&settlementReference,
		&legsJSON,
	)
	if err != nil {
		return Bet{}, err
	}

	bet.SettledAt = strings.TrimSpace(settledAt.String)
	bet.SettlementLedgerEntryID = strings.TrimSpace(settlementLedger.String)
	bet.SettlementOutcome = strings.TrimSpace(settlementOutcome.String)
	bet.SettlementReference = strings.TrimSpace(settlementReference.String)
	decodedLegs, err := decodeBetLegs(legsJSON.String)
	if err != nil {
		return Bet{}, err
	}
	bet.Legs = decodedLegs
	return bet, nil
}

func normalizeHistoryStatuses(statuses []string) []string {
	if len(statuses) == 0 {
		return nil
	}

	normalized := make([]string, 0, len(statuses))
	seen := map[string]struct{}{}
	for _, raw := range statuses {
		for _, part := range strings.Split(raw, ",") {
			status := strings.ToLower(strings.TrimSpace(part))
			switch status {
			case "", "all":
				continue
			case "open", "pending", statusPlaced:
				status = statusPlaced
			case "won", statusSettledWon:
				status = statusSettledWon
			case "lost", statusSettledLost:
				status = statusSettledLost
			case "settled":
				for _, settledStatus := range []string{statusSettledWon, statusSettledLost} {
					if _, ok := seen[settledStatus]; !ok {
						seen[settledStatus] = struct{}{}
						normalized = append(normalized, settledStatus)
					}
				}
				continue
			case statusCashedOut:
				status = statusCashedOut
			case statusCancelled:
				status = statusCancelled
			case statusRefunded:
				status = statusRefunded
			default:
				continue
			}

			if _, ok := seen[status]; ok {
				continue
			}
			seen[status] = struct{}{}
			normalized = append(normalized, status)
		}
	}

	if len(normalized) == 0 {
		return nil
	}
	return normalized
}

func historyStatusMatches(status string, allowed []string) bool {
	if len(allowed) == 0 {
		return true
	}
	for _, candidate := range allowed {
		if status == candidate {
			return true
		}
	}
	return false
}

func compareBetHistoryOrder(left Bet, right Bet) bool {
	leftTime, leftOK := parseHistoryTime(left.PlacedAt)
	rightTime, rightOK := parseHistoryTime(right.PlacedAt)
	switch {
	case leftOK && rightOK:
		if leftTime.Equal(rightTime) {
			return left.BetID > right.BetID
		}
		return leftTime.After(rightTime)
	case leftOK:
		return true
	case rightOK:
		return false
	default:
		if left.PlacedAt == right.PlacedAt {
			return left.BetID > right.BetID
		}
		return left.PlacedAt > right.PlacedAt
	}
}

func parseHistoryTime(raw string) (time.Time, bool) {
	if strings.TrimSpace(raw) == "" {
		return time.Time{}, false
	}
	parsed, err := time.Parse(time.RFC3339Nano, raw)
	if err == nil {
		return parsed, true
	}
	parsed, err = time.Parse(time.RFC3339, raw)
	if err == nil {
		return parsed, true
	}
	return time.Time{}, false
}

func (s *Service) updateBetLifecycleDB(bet Bet) error {
	ctx, cancel := context.WithTimeout(context.Background(), betDBTimeout)
	defer cancel()

	_, err := s.db.ExecContext(ctx, `
UPDATE bets
SET
  status = $2,
  wallet_balance_cents = $3,
  settled_at = $4,
  settlement_ledger_entry_id = $5,
  settlement_outcome = $6,
  settlement_reference = $7
WHERE bet_id = $1`,
		bet.BetID,
		bet.Status,
		bet.WalletBalanceCents,
		nullIfEmpty(bet.SettledAt),
		nullIfEmpty(bet.SettlementLedgerEntryID),
		nullIfEmpty(bet.SettlementOutcome),
		nullIfEmpty(bet.SettlementReference),
	)
	return err
}

func (s *Service) listEventsMemory(limit int) []BetEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	total := len(s.events)
	if total == 0 {
		return []BetEvent{}
	}

	if limit <= 0 || limit > total {
		limit = total
	}
	start := total - limit
	window := make([]BetEvent, limit)
	copy(window, s.events[start:])
	return window
}

func (s *Service) listEventsDB(limit int) ([]BetEvent, error) {
	ctx, cancel := context.WithTimeout(context.Background(), betDBTimeout)
	defer cancel()

	if limit <= 0 {
		limit = 500
	}
	if limit > 5000 {
		limit = 5000
	}

	rows, err := s.db.QueryContext(ctx, `
SELECT
  event_id,
  bet_id,
  user_id,
  action,
  actor_id,
  status,
  reason,
  details,
  CAST(occurred_at AS TEXT)
FROM bet_events
ORDER BY occurred_at DESC, event_id DESC
LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]BetEvent, 0, limit)
	for rows.Next() {
		var event BetEvent
		var reason sql.NullString
		var details sql.NullString
		if err := rows.Scan(
			&event.ID,
			&event.BetID,
			&event.UserID,
			&event.Action,
			&event.ActorID,
			&event.Status,
			&reason,
			&details,
			&event.OccurredAt,
		); err != nil {
			return nil, err
		}
		event.Reason = strings.TrimSpace(reason.String)
		event.Details = strings.TrimSpace(details.String)
		events = append(events, event)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return events, nil
}

func (s *Service) promoUsageSummaryMemory(filter PromoUsageFilter, breakdownLimit int) PromoUsageSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()

	accumulator := newPromoUsageAccumulator()
	for _, bet := range s.betsByID {
		if !betMatchesPromoFilter(bet, filter) {
			continue
		}
		accumulator.Add(bet)
	}
	return accumulator.Finalize(breakdownLimit)
}

func (s *Service) promoUsageSummaryDB(filter PromoUsageFilter, breakdownLimit int) (PromoUsageSummary, error) {
	ctx, cancel := context.WithTimeout(context.Background(), betDBTimeout)
	defer cancel()

	query := `
SELECT
  user_id,
  stake_cents,
  freebet_id,
  freebet_applied_cents,
  odds_boost_id,
  CAST(placed_at AS TEXT)
FROM bets
WHERE 1=1`
	args := make([]any, 0, 6)
	argIndex := 1

	if userID := strings.TrimSpace(filter.UserID); userID != "" {
		query += fmt.Sprintf(" AND user_id = $%d", argIndex)
		args = append(args, userID)
		argIndex++
	}
	if freebetID := strings.TrimSpace(filter.FreebetID); freebetID != "" {
		query += fmt.Sprintf(" AND freebet_id = $%d", argIndex)
		args = append(args, freebetID)
		argIndex++
	}
	if oddsBoostID := strings.TrimSpace(filter.OddsBoostID); oddsBoostID != "" {
		query += fmt.Sprintf(" AND odds_boost_id = $%d", argIndex)
		args = append(args, oddsBoostID)
		argIndex++
	}
	if filter.From != nil {
		query += fmt.Sprintf(" AND placed_at >= $%d", argIndex)
		args = append(args, filter.From.UTC())
		argIndex++
	}
	if filter.To != nil {
		query += fmt.Sprintf(" AND placed_at <= $%d", argIndex)
		args = append(args, filter.To.UTC())
		argIndex++
	}
	query += " ORDER BY placed_at DESC"

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return PromoUsageSummary{}, err
	}
	defer rows.Close()

	accumulator := newPromoUsageAccumulator()
	for rows.Next() {
		var (
			userID              string
			stakeCents          int64
			freebetID           sql.NullString
			freebetAppliedCents int64
			oddsBoostID         sql.NullString
			placedAt            string
		)
		if err := rows.Scan(
			&userID,
			&stakeCents,
			&freebetID,
			&freebetAppliedCents,
			&oddsBoostID,
			&placedAt,
		); err != nil {
			return PromoUsageSummary{}, err
		}
		accumulator.Add(Bet{
			UserID:              userID,
			StakeCents:          stakeCents,
			FreebetID:           strings.TrimSpace(freebetID.String),
			FreebetAppliedCents: freebetAppliedCents,
			OddsBoostID:         strings.TrimSpace(oddsBoostID.String),
			PlacedAt:            strings.TrimSpace(placedAt),
		})
	}
	if err := rows.Err(); err != nil {
		return PromoUsageSummary{}, err
	}
	return accumulator.Finalize(breakdownLimit), nil
}

func (s *Service) nextMemoryEventIDLocked() string {
	s.eventSequence++
	return fmt.Sprintf("be:local:%06d", s.eventSequence)
}

func (s *Service) recordEventLocked(event BetEvent) {
	s.events = append(s.events, event)
}

func (s *Service) recordEventDBBestEffort(event BetEvent) {
	if s.db == nil {
		return
	}
	if err := s.insertEventDB(event); err != nil {
		log.Printf("warning: failed to persist bet event id=%s action=%s: %v", event.ID, event.Action, err)
	}
}

func (s *Service) insertEventDB(event BetEvent) error {
	ctx, cancel := context.WithTimeout(context.Background(), betDBTimeout)
	defer cancel()

	_, err := s.db.ExecContext(ctx, `
INSERT INTO bet_events (
  event_id,
  bet_id,
  user_id,
  action,
  actor_id,
  status,
  reason,
  details,
  occurred_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9
)`,
		event.ID,
		event.BetID,
		event.UserID,
		event.Action,
		event.ActorID,
		event.Status,
		nullIfEmpty(event.Reason),
		nullIfEmpty(event.Details),
		event.OccurredAt,
	)
	return err
}

func lifecycleTransitionChanged(before Bet, after Bet) bool {
	return before.Status != after.Status ||
		before.WalletBalanceCents != after.WalletBalanceCents ||
		before.SettledAt != after.SettledAt ||
		before.SettlementLedgerEntryID != after.SettlementLedgerEntryID ||
		before.SettlementOutcome != after.SettlementOutcome ||
		before.SettlementReference != after.SettlementReference
}

func buildPlacedBet(
	betID string,
	request PlaceBetRequest,
	decision placementDecision,
	promotion promotionPlacementDecision,
	walletEntry wallet.LedgerEntry,
	now time.Time,
) Bet {
	return Bet{
		BetID:                betID,
		UserID:               request.UserID,
		RequestID:            request.RequestID,
		DeviceID:             request.DeviceID,
		SegmentID:            request.SegmentID,
		IPAddress:            request.IPAddress,
		MarketID:             request.MarketID,
		SelectionID:          request.SelectionID,
		Legs:                 buildPlacedBetLegs(request, decision),
		StakeCents:           request.StakeCents,
		FreebetID:            promotion.FreebetID,
		FreebetAppliedCents:  promotion.FreebetAppliedCents,
		OddsBoostID:          promotion.OddsBoostID,
		RequestedOdds:        decision.RequestedOdds,
		CurrentOdds:          decision.CurrentOdds,
		Odds:                 request.Odds,
		OddsChangePolicy:     decision.OddsPolicy,
		OddsChanged:          decision.OddsChanged,
		InPlay:               decision.IsInPlay,
		AppliedLTDMsec:       decision.AppliedLTDMsec,
		PotentialPayoutCents: int64(math.Round(float64(request.StakeCents) * request.Odds)),
		Status:               statusPlaced,
		WalletLedgerEntryID:  walletEntry.EntryID,
		WalletBalanceCents:   walletEntry.BalanceCents,
		IdempotencyKey:       request.IdempotencyKey,
		PlacedAt:             now.UTC().Format(time.RFC3339),
	}
}

func buildPlacedBetLegs(request PlaceBetRequest, decision placementDecision) []BetLeg {
	if len(request.Items) > 0 {
		legs := make([]BetLeg, 0, len(request.Items))
		for _, item := range request.Items {
			legs = append(legs, BetLeg{
				LineID:        strings.TrimSpace(item.RequestLineID),
				MarketID:      strings.TrimSpace(item.MarketID),
				SelectionID:   strings.TrimSpace(item.SelectionID),
				RequestedOdds: item.Odds,
				CurrentOdds:   decision.CurrentOdds,
				FinalOdds:     decision.FinalOdds,
			})
		}
		return legs
	}
	return []BetLeg{
		{
			MarketID:      strings.TrimSpace(request.MarketID),
			SelectionID:   strings.TrimSpace(request.SelectionID),
			RequestedOdds: decision.RequestedOdds,
			CurrentOdds:   decision.CurrentOdds,
			FinalOdds:     decision.FinalOdds,
		},
	}
}

func placementEventDetails(request PlaceBetRequest, decision placementDecision, promotion promotionPlacementDecision) string {
	return fmt.Sprintf(
		"requestId=%s marketId=%s selectionId=%s stakeCents=%d requestedOdds=%.3f currentOdds=%.3f placedOdds=%.3f oddsPolicy=%s oddsChanged=%t inPlay=%t appliedLtdMsec=%d items=%d segmentId=%s deviceId=%s ipAddress=%s oddsPrecision=%d freebetId=%s freebetAppliedCents=%d oddsBoostId=%s",
		request.RequestID,
		request.MarketID,
		request.SelectionID,
		request.StakeCents,
		decision.RequestedOdds,
		decision.CurrentOdds,
		decision.FinalOdds,
		decision.OddsPolicy,
		decision.OddsChanged,
		decision.IsInPlay,
		decision.AppliedLTDMsec,
		len(request.Items),
		request.SegmentID,
		request.DeviceID,
		request.IPAddress,
		request.OddsPrecision,
		promotion.FreebetID,
		promotion.FreebetAppliedCents,
		promotion.OddsBoostID,
	)
}

func samePlacement(existing Bet, request PlaceBetRequest) bool {
	return existing.UserID == request.UserID &&
		request.RequestID != "" &&
		existing.MarketID == request.MarketID &&
		existing.SelectionID == request.SelectionID &&
		existing.StakeCents == request.StakeCents &&
		sameOdds(existing.Odds, request.Odds) &&
		strings.EqualFold(strings.TrimSpace(existing.FreebetID), strings.TrimSpace(request.FreebetID)) &&
		strings.EqualFold(strings.TrimSpace(existing.OddsBoostID), strings.TrimSpace(request.OddsBoostID))
}

func sameOdds(left float64, right float64) bool {
	return math.Abs(left-right) <= 0.0000001
}

func oddsPrecisionValid(odds float64) bool {
	scaled := math.Round(odds * 1000)
	return math.Abs((odds*1000)-scaled) <= 0.000001
}

func oddsDecimalPlaces(odds float64) int {
	value := strconv.FormatFloat(math.Abs(odds), 'f', -1, 64)
	parts := strings.Split(value, ".")
	if len(parts) < 2 {
		return 0
	}
	return len(strings.TrimRight(parts[1], "0"))
}

func parseMarketTime(raw string) (time.Time, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return time.Time{}, false
	}
	layouts := []string{time.RFC3339, time.RFC3339Nano, "2006-01-02T15:04:05"}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed.UTC(), true
		}
	}
	return time.Time{}, false
}

func resolveSelections(market domain.Market, fixture domain.Fixture) []domain.MarketSelection {
	if len(market.Selections) > 0 {
		return market.Selections
	}

	name := strings.ToLower(market.Name)
	switch {
	case strings.Contains(name, "both teams to score"):
		return []domain.MarketSelection{
			{ID: "yes", Name: "Yes", Odds: 2.1, Active: true},
			{ID: "no", Name: "No", Odds: 1.72, Active: true},
		}
	case strings.Contains(name, "over/under"):
		return []domain.MarketSelection{
			{ID: "over", Name: "Over 2.5", Odds: 1.94, Active: true},
			{ID: "under", Name: "Under 2.5", Odds: 1.91, Active: true},
		}
	default:
		home := strings.TrimSpace(fixture.HomeTeam)
		away := strings.TrimSpace(fixture.AwayTeam)
		if home == "" {
			home = "Home"
		}
		if away == "" {
			away = "Away"
		}
		return []domain.MarketSelection{
			{ID: "home", Name: home, Odds: 1.8, Active: true},
			{ID: "away", Name: away, Odds: 2.2, Active: true},
			{ID: "draw", Name: "Draw", Odds: 3.2, Active: true},
		}
	}
}

func findSelection(selections []domain.MarketSelection, selectionID string) (domain.MarketSelection, bool) {
	target := strings.ToLower(strings.TrimSpace(selectionID))
	for _, selection := range selections {
		if !selection.Active {
			continue
		}
		if strings.ToLower(strings.TrimSpace(selection.ID)) == target {
			return selection, true
		}
	}
	return domain.MarketSelection{}, false
}

func parseInt64Env(name string, fallback int64) int64 {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func parseFloat64Env(name string, fallback float64) float64 {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}
	parsed, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func parseBoolEnv(name string, fallback bool) bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv(name)))
	if raw == "" {
		return fallback
	}
	switch raw {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func normalizeOddsPolicy(raw string) string {
	value := strings.TrimSpace(strings.ToLower(raw))
	switch value {
	case oddsPolicyAcceptRequested, oddsPolicyAcceptLatest, oddsPolicyRejectOnChange, oddsPolicyOnlyBetter:
		return value
	default:
		return oddsPolicyAcceptRequested
	}
}

func isInPlayMarket(now time.Time, market domain.Market, fixture domain.Fixture) bool {
	if startsAt, ok := parseMarketTime(market.StartsAt); ok && !now.Before(startsAt) {
		return true
	}
	if startsAt, ok := parseMarketTime(fixture.StartsAt); ok && !now.Before(startsAt) {
		return true
	}
	return false
}

func settlementReasonOrDefault(reason string, fallback string) string {
	trimmed := strings.TrimSpace(reason)
	if trimmed == "" {
		return fallback
	}
	return trimmed
}

func fallbackActor(actorID string, fallback string) string {
	actor := strings.TrimSpace(actorID)
	if actor != "" {
		return actor
	}
	value := strings.TrimSpace(fallback)
	if value != "" {
		return value
	}
	return "system"
}

func normalizeReasonCode(reason string, fallback string) string {
	value := strings.ToLower(strings.TrimSpace(reason))
	if value == "" {
		return fallback
	}
	value = strings.ReplaceAll(value, "-", "_")
	value = strings.ReplaceAll(value, " ", "_")
	return value
}

func RejectReasonCode(err error) string {
	switch {
	case errors.Is(err, ErrInvalidBetRequest):
		return "invalid_request"
	case errors.Is(err, ErrInvalidSettleRequest):
		return "invalid_lifecycle_request"
	case errors.Is(err, ErrInvalidAlternativeOfferRequest):
		return "invalid_alternative_offer_request"
	case errors.Is(err, ErrInvalidBetBuilderRequest):
		return "invalid_builder_request"
	case errors.Is(err, ErrInvalidFixedExoticRequest):
		return "invalid_fixed_exotic_request"
	case errors.Is(err, ErrUnsupportedFixedExoticType):
		return "fixed_exotic_type_unsupported"
	case errors.Is(err, ErrBetBuilderQuoteNotFound):
		return "builder_quote_not_found"
	case errors.Is(err, ErrBetBuilderQuoteExpired):
		return "builder_quote_expired"
	case errors.Is(err, ErrBetBuilderQuoteConflict):
		return "builder_quote_conflict"
	case errors.Is(err, ErrFixedExoticQuoteNotFound):
		return "fixed_exotic_quote_not_found"
	case errors.Is(err, ErrFixedExoticQuoteExpired):
		return "fixed_exotic_quote_expired"
	case errors.Is(err, ErrFixedExoticQuoteConflict):
		return "fixed_exotic_quote_conflict"
	case errors.Is(err, ErrMarketNotFound):
		return "market_not_found"
	case errors.Is(err, ErrMarketNotOpen):
		return "market_not_open"
	case errors.Is(err, ErrBetBuilderNotCombinable):
		return "builder_not_combinable"
	case errors.Is(err, ErrSameGameComboFixtureMismatch):
		return "same_game_combo_fixture_mismatch"
	case errors.Is(err, ErrSameGameComboDuplicateMarket):
		return "same_game_combo_duplicate_market"
	case errors.Is(err, ErrFixedExoticFixtureMismatch):
		return "fixed_exotic_fixture_mismatch"
	case errors.Is(err, ErrFixedExoticDuplicateMarket):
		return "fixed_exotic_duplicate_market"
	case errors.Is(err, ErrAlternativeOfferNotFound):
		return "alternative_offer_not_found"
	case errors.Is(err, ErrAlternativeOfferExpired):
		return "alternative_offer_expired"
	case errors.Is(err, ErrAlternativeOfferStateConflict):
		return "alternative_offer_state_conflict"
	case errors.Is(err, ErrInvalidCashoutRequest):
		return "invalid_cashout_request"
	case errors.Is(err, ErrCashoutNotEligible):
		return "cashout_not_eligible"
	case errors.Is(err, ErrCashoutQuoteNotFound):
		return "cashout_quote_not_found"
	case errors.Is(err, ErrCashoutQuoteExpired):
		return "cashout_quote_expired"
	case errors.Is(err, ErrCashoutQuoteStale):
		return "cashout_quote_stale"
	case errors.Is(err, ErrCashoutQuoteConflict):
		return "cashout_quote_conflict"
	case errors.Is(err, ErrSelectionNotFound):
		return "selection_not_found"
	case errors.Is(err, ErrStakeOutOfRange):
		return "stake_out_of_range"
	case errors.Is(err, ErrOddsOutOfRange):
		return "odds_out_of_range"
	case errors.Is(err, ErrOddsChanged):
		return "odds_changed"
	case errors.Is(err, ErrFreebetNotFound):
		return "freebet_not_found"
	case errors.Is(err, ErrFreebetForbidden):
		return "freebet_forbidden"
	case errors.Is(err, ErrFreebetNotEligible):
		return "freebet_not_eligible"
	case errors.Is(err, ErrOddsBoostNotFound):
		return "odds_boost_not_found"
	case errors.Is(err, ErrOddsBoostForbidden):
		return "odds_boost_forbidden"
	case errors.Is(err, ErrOddsBoostNotEligible):
		return "odds_boost_not_eligible"
	case errors.Is(err, ErrIdempotencyReplay):
		return "idempotency_conflict"
	case errors.Is(err, ErrBetStateConflict):
		return "state_conflict"
	case errors.Is(err, wallet.ErrInsufficientFunds):
		return "insufficient_funds"
	case errors.Is(err, wallet.ErrIdempotencyConflict):
		return "wallet_idempotency_conflict"
	case errors.Is(err, domain.ErrNotFound):
		return "not_found"
	default:
		return "internal_error"
	}
}

func buildSettlementEventDetails(request SettleBetRequest, before Bet, after Bet, meta settlementTransitionMeta) string {
	parts := []string{
		fmt.Sprintf("winningSelectionId=%s", strings.TrimSpace(request.WinningSelectionID)),
		fmt.Sprintf("outcome=%s", strings.TrimSpace(after.SettlementOutcome)),
		fmt.Sprintf("deadHeatFactor=%.3f", meta.DeadHeatFactor),
		fmt.Sprintf("resettled=%t", meta.Resettled),
		fmt.Sprintf("policy=%s", meta.Policy),
		fmt.Sprintf("previousStatus=%s", strings.TrimSpace(before.Status)),
		fmt.Sprintf("previousOutcome=%s", strings.TrimSpace(meta.PreviousOutcome)),
		fmt.Sprintf("previousReference=%s", strings.TrimSpace(meta.PreviousReference)),
		fmt.Sprintf("previousPayoutCents=%d", meta.PreviousPayoutCents),
		fmt.Sprintf("targetPayoutCents=%d", meta.NextPayoutCents),
		fmt.Sprintf("adjustmentCents=%d", meta.AdjustmentCents),
	}
	if name := strings.TrimSpace(request.WinningSelectionName); name != "" {
		parts = append(parts, fmt.Sprintf("winningSelectionName=%s", name))
	}
	if source := strings.TrimSpace(request.ResultSource); source != "" {
		parts = append(parts, fmt.Sprintf("resultSource=%s", source))
	}
	return strings.Join(parts, " ")
}

func nullIfEmpty(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

func encodeBetLegs(legs []BetLeg) (string, error) {
	if len(legs) == 0 {
		return "", nil
	}
	raw, err := json.Marshal(legs)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func decodeBetLegs(raw string) ([]BetLeg, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return nil, nil
	}
	var legs []BetLeg
	if err := json.Unmarshal([]byte(value), &legs); err != nil {
		return nil, err
	}
	return legs, nil
}

type promoUsageAccumulator struct {
	summary      PromoUsageSummary
	uniqueUsers  map[string]struct{}
	freebetStats map[string]PromoUsageBreakdown
	boostStats   map[string]PromoUsageBreakdown
}

func newPromoUsageAccumulator() *promoUsageAccumulator {
	return &promoUsageAccumulator{
		summary: PromoUsageSummary{
			Freebets:   []PromoUsageBreakdown{},
			OddsBoosts: []PromoUsageBreakdown{},
		},
		uniqueUsers:  map[string]struct{}{},
		freebetStats: map[string]PromoUsageBreakdown{},
		boostStats:   map[string]PromoUsageBreakdown{},
	}
}

func (a *promoUsageAccumulator) Add(bet Bet) {
	a.summary.TotalBets++
	a.summary.TotalStakeCents += bet.StakeCents

	if userID := strings.TrimSpace(bet.UserID); userID != "" {
		a.uniqueUsers[userID] = struct{}{}
	}

	freebetID := strings.TrimSpace(bet.FreebetID)
	oddsBoostID := strings.TrimSpace(bet.OddsBoostID)
	hasFreebet := freebetID != ""
	hasBoost := oddsBoostID != ""

	if hasFreebet {
		a.summary.BetsWithFreebet++
		a.summary.TotalFreebetAppliedCents += bet.FreebetAppliedCents

		entry := a.freebetStats[freebetID]
		entry.ID = freebetID
		entry.BetCount++
		entry.TotalStakeCents += bet.StakeCents
		entry.TotalFreebetAppliedCents += bet.FreebetAppliedCents
		a.freebetStats[freebetID] = entry
	}

	if hasBoost {
		a.summary.BetsWithOddsBoost++
		a.summary.TotalBoostedStakeCents += bet.StakeCents

		entry := a.boostStats[oddsBoostID]
		entry.ID = oddsBoostID
		entry.BetCount++
		entry.TotalStakeCents += bet.StakeCents
		a.boostStats[oddsBoostID] = entry
	}

	if hasFreebet && hasBoost {
		a.summary.BetsWithBoth++
	}
}

func (a *promoUsageAccumulator) Finalize(limit int) PromoUsageSummary {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	a.summary.UniqueUsers = int64(len(a.uniqueUsers))
	a.summary.UniqueFreebets = int64(len(a.freebetStats))
	a.summary.UniqueOddsBoosts = int64(len(a.boostStats))
	a.summary.Freebets = sortedPromoUsageBreakdown(a.freebetStats, limit)
	a.summary.OddsBoosts = sortedPromoUsageBreakdown(a.boostStats, limit)
	return a.summary
}

func sortedPromoUsageBreakdown(values map[string]PromoUsageBreakdown, limit int) []PromoUsageBreakdown {
	if len(values) == 0 {
		return []PromoUsageBreakdown{}
	}

	out := make([]PromoUsageBreakdown, 0, len(values))
	for _, value := range values {
		out = append(out, value)
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].BetCount == out[j].BetCount {
			return out[i].ID < out[j].ID
		}
		return out[i].BetCount > out[j].BetCount
	})

	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out
}

func betMatchesPromoFilter(bet Bet, filter PromoUsageFilter) bool {
	if userID := strings.TrimSpace(filter.UserID); userID != "" && !strings.EqualFold(strings.TrimSpace(bet.UserID), userID) {
		return false
	}
	if freebetID := strings.TrimSpace(filter.FreebetID); freebetID != "" && !strings.EqualFold(strings.TrimSpace(bet.FreebetID), freebetID) {
		return false
	}
	if oddsBoostID := strings.TrimSpace(filter.OddsBoostID); oddsBoostID != "" && !strings.EqualFold(strings.TrimSpace(bet.OddsBoostID), oddsBoostID) {
		return false
	}
	if filter.From == nil && filter.To == nil {
		return true
	}

	placedAt, err := time.Parse(time.RFC3339, strings.TrimSpace(bet.PlacedAt))
	if err != nil {
		if parsed, parseErr := time.Parse(time.RFC3339Nano, strings.TrimSpace(bet.PlacedAt)); parseErr == nil {
			placedAt = parsed
		} else {
			return false
		}
	}
	if filter.From != nil && placedAt.Before(filter.From.UTC()) {
		return false
	}
	if filter.To != nil && placedAt.After(filter.To.UTC()) {
		return false
	}
	return true
}

func (s *Service) loadFromDisk() error {
	raw, err := os.ReadFile(s.statePath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}

	var state persistedBetState
	if err := json.Unmarshal(raw, &state); err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if state.BetsByID != nil {
		s.betsByID = state.BetsByID
	}
	if state.BetsByIdempotent != nil {
		s.betsByIdempotent = state.BetsByIdempotent
	}
	s.sequence = state.Sequence
	if state.Events != nil {
		s.events = state.Events
	}
	s.eventSequence = state.EventSequence
	if state.AlternativeOffersByID != nil {
		s.offersByID = state.AlternativeOffersByID
	}
	if state.AlternativeOffersByKey != nil {
		s.offersByKey = state.AlternativeOffersByKey
	}
	s.offerSequence = state.AlternativeOfferSequence
	s.offerMetrics = state.AlternativeOfferMetrics
	if state.CashoutQuotesByID != nil {
		s.quotesByID = state.CashoutQuotesByID
	}
	if state.CashoutQuotesByKey != nil {
		s.quotesByKey = state.CashoutQuotesByKey
	}
	if state.CashoutLatestRevisionByBet != nil {
		s.quoteLatestRevisionByBet = state.CashoutLatestRevisionByBet
	}
	s.quoteSequence = state.CashoutQuoteSequence
	s.cashoutMetrics = state.CashoutMetrics
	if state.BetBuilderQuotesByID != nil {
		s.builderQuotesByID = state.BetBuilderQuotesByID
	}
	if state.BetBuilderQuotesByKey != nil {
		s.builderQuotesByKey = state.BetBuilderQuotesByKey
	}
	s.builderQuoteSequence = state.BetBuilderQuoteSequence
	if state.FixedExoticQuotesByID != nil {
		s.fixedExoticQuotesByID = state.FixedExoticQuotesByID
	}
	if state.FixedExoticQuotesByKey != nil {
		s.fixedExoticQuotesByKey = state.FixedExoticQuotesByKey
	}
	s.fixedExoticQuoteSequence = state.FixedExoticQuoteSequence
	return nil
}

func (s *Service) saveToDiskLocked() error {
	if strings.TrimSpace(s.statePath) == "" {
		return nil
	}

	state := persistedBetState{
		BetsByID:                   s.betsByID,
		BetsByIdempotent:           s.betsByIdempotent,
		Sequence:                   s.sequence,
		Events:                     s.events,
		EventSequence:              s.eventSequence,
		AlternativeOffersByID:      s.offersByID,
		AlternativeOffersByKey:     s.offersByKey,
		AlternativeOfferSequence:   s.offerSequence,
		AlternativeOfferMetrics:    s.offerMetrics,
		CashoutQuotesByID:          s.quotesByID,
		CashoutQuotesByKey:         s.quotesByKey,
		CashoutLatestRevisionByBet: s.quoteLatestRevisionByBet,
		CashoutQuoteSequence:       s.quoteSequence,
		CashoutMetrics:             s.cashoutMetrics,
		BetBuilderQuotesByID:       s.builderQuotesByID,
		BetBuilderQuotesByKey:      s.builderQuotesByKey,
		BetBuilderQuoteSequence:    s.builderQuoteSequence,
		FixedExoticQuotesByID:      s.fixedExoticQuotesByID,
		FixedExoticQuotesByKey:     s.fixedExoticQuotesByKey,
		FixedExoticQuoteSequence:   s.fixedExoticQuoteSequence,
	}

	raw, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}

	dir := filepath.Dir(s.statePath)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}

	tempPath := s.statePath + ".tmp"
	if err := os.WriteFile(tempPath, raw, 0o600); err != nil {
		return err
	}

	if !bytes.HasSuffix(raw, []byte("\n")) {
		fh, err := os.OpenFile(tempPath, os.O_APPEND|os.O_WRONLY, 0)
		if err == nil {
			_, _ = fh.Write([]byte("\n"))
			_ = fh.Close()
		}
	}

	return os.Rename(tempPath, s.statePath)
}
