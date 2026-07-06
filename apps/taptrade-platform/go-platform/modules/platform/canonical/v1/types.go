package v1

import "time"

type StreamType string

const (
	StreamDelta       StreamType = "delta"
	StreamSettlement  StreamType = "settlement"
	StreamMetadata    StreamType = "metadata"
	StreamTranslation StreamType = "translation"
	StreamSnapshot    StreamType = "snapshot"
)

type EntityType string

const (
	EntityFixture             EntityType = "fixture"
	EntityMarket              EntityType = "market"
	EntitySelection           EntityType = "selection"
	EntityBet                 EntityType = "bet"
	EntitySettlement          EntityType = "settlement"
	EntityCashoutQuote        EntityType = "cashout_quote"
	EntityMatchTracker        EntityType = "match_tracker"
	EntityFixtureStats        EntityType = "fixture_stats"
	EntityFreebet             EntityType = "freebet"
	EntityOddsBoost           EntityType = "odds_boost"
	EntityLoyaltyAccount      EntityType = "loyalty_account"
	EntityLoyaltyLedger       EntityType = "loyalty_ledger_entry"
	EntityLeaderboard         EntityType = "leaderboard"
	EntityLeaderboardEvent    EntityType = "leaderboard_event"
	EntityLeaderboardStanding EntityType = "leaderboard_standing"
	EntityTranslation         EntityType = "translation"
)

type ChangeAction string

const (
	ActionUpsert ChangeAction = "upsert"
	ActionDelete ChangeAction = "delete"
	ActionPatch  ChangeAction = "patch"
)

type FixtureStatus string

const (
	FixtureStatusUnknown   FixtureStatus = "unknown"
	FixtureStatusScheduled FixtureStatus = "scheduled"
	FixtureStatusInPlay    FixtureStatus = "in_play"
	FixtureStatusFinished  FixtureStatus = "finished"
	FixtureStatusCancelled FixtureStatus = "cancelled"
	FixtureStatusSuspended FixtureStatus = "suspended"
)

type MarketStatus string

const (
	MarketStatusUnknown   MarketStatus = "unknown"
	MarketStatusOpen      MarketStatus = "open"
	MarketStatusSuspended MarketStatus = "suspended"
	MarketStatusClosed    MarketStatus = "closed"
	MarketStatusSettled   MarketStatus = "settled"
	MarketStatusCancelled MarketStatus = "cancelled"
)

type BetStatus string

const (
	BetStatusPending     BetStatus = "pending"
	BetStatusAccepted    BetStatus = "accepted"
	BetStatusRejected    BetStatus = "rejected"
	BetStatusSettledWon  BetStatus = "settled_won"
	BetStatusSettledLost BetStatus = "settled_lost"
	BetStatusCancelled   BetStatus = "cancelled"
	BetStatusRefunded    BetStatus = "refunded"
	BetStatusCashedOut   BetStatus = "cashed_out"
)

type SettlementOutcome string

const (
	SettlementOutcomeWin      SettlementOutcome = "win"
	SettlementOutcomeLose     SettlementOutcome = "lose"
	SettlementOutcomeVoid     SettlementOutcome = "void"
	SettlementOutcomeDeadHeat SettlementOutcome = "dead_heat"
	SettlementOutcomePush     SettlementOutcome = "push"
)

type ProviderRef struct {
	Name string `json:"name"`
	Feed string `json:"feed,omitempty"`
}

type Participant struct {
	ParticipantID string `json:"participantId"`
	Name          string `json:"name"`
	Role          string `json:"role,omitempty"`
}

type Fixture struct {
	FixtureID    string            `json:"fixtureId"`
	SportID      string            `json:"sportId"`
	TournamentID string            `json:"tournamentId,omitempty"`
	Name         string            `json:"name"`
	StartsAt     time.Time         `json:"startsAt"`
	Status       FixtureStatus     `json:"status"`
	Participants []Participant     `json:"participants,omitempty"`
	ProviderRefs map[string]string `json:"providerRefs,omitempty"`
	UpdatedAt    time.Time         `json:"updatedAt"`
}

type Selection struct {
	SelectionID string  `json:"selectionId"`
	Name        string  `json:"name"`
	OddsDecimal float64 `json:"oddsDecimal"`
	Active      bool    `json:"active"`
}

type Market struct {
	MarketID      string            `json:"marketId"`
	FixtureID     string            `json:"fixtureId"`
	Name          string            `json:"name"`
	Status        MarketStatus      `json:"status"`
	Specifiers    map[string]string `json:"specifiers,omitempty"`
	Selections    []Selection       `json:"selections,omitempty"`
	MinStakeCents int64             `json:"minStakeCents,omitempty"`
	MaxStakeCents int64             `json:"maxStakeCents,omitempty"`
	UpdatedAt     time.Time         `json:"updatedAt"`
}

type Money struct {
	Currency    string `json:"currency"`
	AmountCents int64  `json:"amountCents"`
}

type BetContext struct {
	SegmentID string `json:"segmentId,omitempty"`
	DeviceID  string `json:"deviceId,omitempty"`
	IPAddress string `json:"ipAddress,omitempty"`
}

type BetLeg struct {
	FixtureID      string  `json:"fixtureId"`
	MarketID       string  `json:"marketId"`
	SelectionID    string  `json:"selectionId"`
	OddsDecimal    float64 `json:"oddsDecimal"`
	StakeCents     int64   `json:"stakeCents"`
	IsInPlay       bool    `json:"isInPlay"`
	AppliedLTDMsec int64   `json:"appliedLtdMsec,omitempty"`
}

type Bet struct {
	BetID        string     `json:"betId"`
	PlayerID     string     `json:"playerId"`
	RequestID    string     `json:"requestId"`
	Status       BetStatus  `json:"status"`
	Stake        Money      `json:"stake"`
	Payout       Money      `json:"payout,omitempty"`
	PlacedAt     time.Time  `json:"placedAt"`
	SettledAt    *time.Time `json:"settledAt,omitempty"`
	Legs         []BetLeg   `json:"legs"`
	Context      BetContext `json:"context,omitempty"`
	RejectReason string     `json:"rejectReason,omitempty"`
}

type Settlement struct {
	BetID                 string            `json:"betId"`
	Outcome               SettlementOutcome `json:"outcome"`
	WinningSelectionIDs   []string          `json:"winningSelectionIds,omitempty"`
	DeadHeatFactor        *float64          `json:"deadHeatFactor,omitempty"`
	Reason                string            `json:"reason,omitempty"`
	ResultSource          string            `json:"resultSource,omitempty"`
	SettledAt             time.Time         `json:"settledAt"`
	ResettlementOfEventID string            `json:"resettlementOfEventId,omitempty"`
}

type CashoutQuoteUpdate struct {
	BetID            string    `json:"betId"`
	PlayerID         string    `json:"playerId"`
	RequestID        string    `json:"requestId,omitempty"`
	QuoteID          string    `json:"quoteId,omitempty"`
	Amount           Money     `json:"amount"`
	ExpiresAt        time.Time `json:"expiresAt"`
	ProviderRevision int64     `json:"providerRevision,omitempty"`
	ProviderSource   string    `json:"providerSource,omitempty"`
}

type MatchIncidentType string

const (
	MatchIncidentKickoff     MatchIncidentType = "kickoff"
	MatchIncidentGoal        MatchIncidentType = "goal"
	MatchIncidentRedCard     MatchIncidentType = "red_card"
	MatchIncidentYellowCard  MatchIncidentType = "yellow_card"
	MatchIncidentPeriodStart MatchIncidentType = "period_start"
	MatchIncidentPeriodEnd   MatchIncidentType = "period_end"
	MatchIncidentMarketShift MatchIncidentType = "market_shift"
)

type MatchScore struct {
	Home int `json:"home"`
	Away int `json:"away"`
}

type MatchIncident struct {
	IncidentID    string            `json:"incidentId"`
	FixtureID     string            `json:"fixtureId"`
	Type          MatchIncidentType `json:"type"`
	Period        string            `json:"period,omitempty"`
	ClockSeconds  int64             `json:"clockSeconds,omitempty"`
	ParticipantID string            `json:"participantId,omitempty"`
	Score         MatchScore        `json:"score,omitempty"`
	Details       map[string]string `json:"details,omitempty"`
	OccurredAt    time.Time         `json:"occurredAt"`
}

type MatchTimeline struct {
	FixtureID    string          `json:"fixtureId"`
	Status       FixtureStatus   `json:"status"`
	Period       string          `json:"period,omitempty"`
	ClockSeconds int64           `json:"clockSeconds,omitempty"`
	Score        MatchScore      `json:"score"`
	Incidents    []MatchIncident `json:"incidents,omitempty"`
	UpdatedAt    time.Time       `json:"updatedAt"`
}

type FixtureStatPair struct {
	Home float64 `json:"home"`
	Away float64 `json:"away"`
	Unit string  `json:"unit,omitempty"`
}

type FixtureStats struct {
	FixtureID    string                     `json:"fixtureId"`
	Status       FixtureStatus              `json:"status"`
	Period       string                     `json:"period,omitempty"`
	ClockSeconds int64                      `json:"clockSeconds,omitempty"`
	Metrics      map[string]FixtureStatPair `json:"metrics,omitempty"`
	UpdatedAt    time.Time                  `json:"updatedAt"`
}

type FreebetStatus string

const (
	FreebetStatusAvailable FreebetStatus = "available"
	FreebetStatusReserved  FreebetStatus = "reserved"
	FreebetStatusConsumed  FreebetStatus = "consumed"
	FreebetStatusExpired   FreebetStatus = "expired"
	FreebetStatusCancelled FreebetStatus = "cancelled"
)

type Freebet struct {
	FreebetID              string        `json:"freebetId"`
	PlayerID               string        `json:"playerId"`
	CampaignID             string        `json:"campaignId,omitempty"`
	Currency               string        `json:"currency"`
	TotalAmountCents       int64         `json:"totalAmountCents"`
	RemainingAmountCents   int64         `json:"remainingAmountCents"`
	MinOddsDecimal         float64       `json:"minOddsDecimal,omitempty"`
	AppliesToSportIDs      []string      `json:"appliesToSportIds,omitempty"`
	AppliesToTournamentIDs []string      `json:"appliesToTournamentIds,omitempty"`
	ExpiresAt              time.Time     `json:"expiresAt"`
	Status                 FreebetStatus `json:"status"`
	CreatedAt              time.Time     `json:"createdAt"`
	UpdatedAt              time.Time     `json:"updatedAt"`
}

type OddsBoostStatus string

const (
	OddsBoostStatusAvailable OddsBoostStatus = "available"
	OddsBoostStatusAccepted  OddsBoostStatus = "accepted"
	OddsBoostStatusExpired   OddsBoostStatus = "expired"
	OddsBoostStatusCancelled OddsBoostStatus = "cancelled"
)

type OddsBoost struct {
	OddsBoostID     string          `json:"oddsBoostId"`
	PlayerID        string          `json:"playerId"`
	CampaignID      string          `json:"campaignId,omitempty"`
	MarketID        string          `json:"marketId"`
	SelectionID     string          `json:"selectionId"`
	Currency        string          `json:"currency"`
	OriginalOdds    float64         `json:"originalOdds"`
	BoostedOdds     float64         `json:"boostedOdds"`
	MaxStakeCents   int64           `json:"maxStakeCents,omitempty"`
	MinOddsDecimal  float64         `json:"minOddsDecimal,omitempty"`
	Status          OddsBoostStatus `json:"status"`
	ExpiresAt       time.Time       `json:"expiresAt"`
	AcceptedAt      *time.Time      `json:"acceptedAt,omitempty"`
	AcceptRequestID string          `json:"acceptRequestId,omitempty"`
	AcceptReason    string          `json:"acceptReason,omitempty"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

type LoyaltyTierCode string

const (
	LoyaltyTierBronze LoyaltyTierCode = "bronze"
	LoyaltyTierSilver LoyaltyTierCode = "silver"
	LoyaltyTierGold   LoyaltyTierCode = "gold"
	LoyaltyTierVIP    LoyaltyTierCode = "vip"
)

type LoyaltyLedgerEntryType string

const (
	LoyaltyLedgerEntryAccrual       LoyaltyLedgerEntryType = "accrual"
	LoyaltyLedgerEntryAdjustment    LoyaltyLedgerEntryType = "adjustment"
	LoyaltyLedgerEntryReferralBonus LoyaltyLedgerEntryType = "referral_bonus"
	LoyaltyLedgerEntryPromoBonus    LoyaltyLedgerEntryType = "promo_bonus"
	LoyaltyLedgerEntryReversal      LoyaltyLedgerEntryType = "reversal"
	LoyaltyLedgerEntryExpiration    LoyaltyLedgerEntryType = "expiration"
	LoyaltyLedgerEntryRedemption    LoyaltyLedgerEntryType = "redemption"
)

type LoyaltyLedgerSourceType string

const (
	LoyaltyLedgerSourceBetSettlement LoyaltyLedgerSourceType = "bet_settlement"
	LoyaltyLedgerSourceAdminManual   LoyaltyLedgerSourceType = "admin_manual"
	LoyaltyLedgerSourceReferral      LoyaltyLedgerSourceType = "referral"
	LoyaltyLedgerSourceCampaign      LoyaltyLedgerSourceType = "campaign"
	LoyaltyLedgerSourceSystemRecalc  LoyaltyLedgerSourceType = "system_recalc"
)

type LoyaltyQualificationState string

const (
	LoyaltyQualificationPending   LoyaltyQualificationState = "pending"
	LoyaltyQualificationQualified LoyaltyQualificationState = "qualified"
	LoyaltyQualificationRejected  LoyaltyQualificationState = "rejected"
)

type LoyaltyAccount struct {
	AccountID                string          `json:"accountId"`
	PlayerID                 string          `json:"playerId"`
	PointsBalance            int64           `json:"pointsBalance"`
	PointsEarnedLifetime     int64           `json:"pointsEarnedLifetime"`
	PointsEarned7D           int64           `json:"pointsEarned7d,omitempty"`
	PointsEarned30D          int64           `json:"pointsEarned30d,omitempty"`
	PointsEarnedCurrentMonth int64           `json:"pointsEarnedCurrentMonth,omitempty"`
	CurrentTier              LoyaltyTierCode `json:"currentTier"`
	CurrentTierAssignedAt    *time.Time      `json:"currentTierAssignedAt,omitempty"`
	PointsToNextTier         int64           `json:"pointsToNextTier,omitempty"`
	NextTier                 LoyaltyTierCode `json:"nextTier,omitempty"`
	LastAccrualAt            *time.Time      `json:"lastAccrualAt,omitempty"`
	CreatedAt                time.Time       `json:"createdAt"`
	UpdatedAt                time.Time       `json:"updatedAt"`
}

type LoyaltyLedgerEntry struct {
	EntryID      string                  `json:"entryId"`
	AccountID    string                  `json:"accountId"`
	PlayerID     string                  `json:"playerId"`
	EntryType    LoyaltyLedgerEntryType  `json:"entryType"`
	EntrySubtype string                  `json:"entrySubtype,omitempty"`
	SourceType   LoyaltyLedgerSourceType `json:"sourceType"`
	SourceID     string                  `json:"sourceId,omitempty"`
	PointsDelta  int64                   `json:"pointsDelta"`
	BalanceAfter int64                   `json:"balanceAfter"`
	Metadata     map[string]string       `json:"metadata,omitempty"`
	CreatedBy    string                  `json:"createdBy,omitempty"`
	CreatedAt    time.Time               `json:"createdAt"`
}

type LoyaltyTier struct {
	TierCode            LoyaltyTierCode   `json:"tierCode"`
	DisplayName         string            `json:"displayName"`
	Rank                int               `json:"rank"`
	MinLifetimePoints   int64             `json:"minLifetimePoints"`
	MinRolling30DPoints int64             `json:"minRolling30dPoints,omitempty"`
	Benefits            map[string]string `json:"benefits,omitempty"`
	Active              bool              `json:"active"`
}

type LoyaltyAccrualRule struct {
	RuleID                 string     `json:"ruleId"`
	Name                   string     `json:"name"`
	SourceType             string     `json:"sourceType"`
	Active                 bool       `json:"active"`
	Multiplier             float64    `json:"multiplier"`
	MinQualifiedStakeCents int64      `json:"minQualifiedStakeCents,omitempty"`
	EligibleSportIDs       []string   `json:"eligibleSportIds,omitempty"`
	EligibleBetTypes       []string   `json:"eligibleBetTypes,omitempty"`
	MaxPointsPerEvent      int64      `json:"maxPointsPerEvent,omitempty"`
	EffectiveFrom          *time.Time `json:"effectiveFrom,omitempty"`
	EffectiveTo            *time.Time `json:"effectiveTo,omitempty"`
}

type ReferralReward struct {
	ReferralID         string                    `json:"referralId"`
	ReferrerPlayerID   string                    `json:"referrerPlayerId"`
	ReferredPlayerID   string                    `json:"referredPlayerId"`
	QualificationState LoyaltyQualificationState `json:"qualificationState"`
	QualifiedAt        *time.Time                `json:"qualifiedAt,omitempty"`
	LedgerEntryID      string                    `json:"ledgerEntryId,omitempty"`
	CreatedAt          time.Time                 `json:"createdAt"`
	UpdatedAt          time.Time                 `json:"updatedAt"`
}

type LeaderboardRankingMode string

const (
	LeaderboardRankingModeSum LeaderboardRankingMode = "sum"
	LeaderboardRankingModeMin LeaderboardRankingMode = "min"
	LeaderboardRankingModeMax LeaderboardRankingMode = "max"
)

type LeaderboardOrder string

const (
	LeaderboardOrderAscending  LeaderboardOrder = "asc"
	LeaderboardOrderDescending LeaderboardOrder = "desc"
)

type LeaderboardStatus string

const (
	LeaderboardStatusDraft  LeaderboardStatus = "draft"
	LeaderboardStatusActive LeaderboardStatus = "active"
	LeaderboardStatusClosed LeaderboardStatus = "closed"
)

type LeaderboardDefinition struct {
	LeaderboardID  string                 `json:"leaderboardId"`
	Slug           string                 `json:"slug,omitempty"`
	Name           string                 `json:"name"`
	Description    string                 `json:"description,omitempty"`
	MetricKey      string                 `json:"metricKey"`
	EventType      string                 `json:"eventType,omitempty"`
	RankingMode    LeaderboardRankingMode `json:"rankingMode"`
	Order          LeaderboardOrder       `json:"order"`
	Status         LeaderboardStatus      `json:"status"`
	Currency       string                 `json:"currency,omitempty"`
	PrizeSummary   string                 `json:"prizeSummary,omitempty"`
	WindowStartsAt *time.Time             `json:"windowStartsAt,omitempty"`
	WindowEndsAt   *time.Time             `json:"windowEndsAt,omitempty"`
	LastComputedAt *time.Time             `json:"lastComputedAt,omitempty"`
	CreatedBy      string                 `json:"createdBy,omitempty"`
	CreatedAt      time.Time              `json:"createdAt"`
	UpdatedAt      time.Time              `json:"updatedAt"`
}

type LeaderboardEvent struct {
	EventID        string            `json:"eventId"`
	LeaderboardID  string            `json:"leaderboardId"`
	PlayerID       string            `json:"playerId"`
	Score          float64           `json:"score"`
	SourceType     string            `json:"sourceType,omitempty"`
	SourceID       string            `json:"sourceId,omitempty"`
	IdempotencyKey string            `json:"idempotencyKey,omitempty"`
	Metadata       map[string]string `json:"metadata,omitempty"`
	RecordedAt     time.Time         `json:"recordedAt"`
}

type LeaderboardStanding struct {
	LeaderboardID string            `json:"leaderboardId"`
	PlayerID      string            `json:"playerId"`
	Rank          int               `json:"rank"`
	Score         float64           `json:"score"`
	EventCount    int               `json:"eventCount"`
	LastEventAt   *time.Time        `json:"lastEventAt,omitempty"`
	Metadata      map[string]string `json:"metadata,omitempty"`
}

type Translation struct {
	Locale     string            `json:"locale"`
	EntityType EntityType        `json:"entityType"`
	EntityID   string            `json:"entityId"`
	Fields     map[string]string `json:"fields"`
	UpdatedAt  time.Time         `json:"updatedAt"`
}
