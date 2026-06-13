package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type AuthClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type TrackEventRequest struct {
	EventType  string         `json:"event_type"`
	UserID     string         `json:"user_id"`
	Properties map[string]any `json:"properties"`
	Timestamp  time.Time      `json:"timestamp"`
}

type TrackEventResponse struct {
	EventID    string    `json:"event_id"`
	Status     string    `json:"status"`
	ReceivedAt time.Time `json:"received_at"`
}

type UserStats struct {
	TotalBets    int             `json:"total_bets"`
	TotalStake   decimal.Decimal `json:"total_stake"`
	TotalReturns decimal.Decimal `json:"total_returns"`
	Profit       decimal.Decimal `json:"profit"`
	WinRate      decimal.Decimal `json:"win_rate"`
	ROI          decimal.Decimal `json:"roi"`
}

type UserReportResponse struct {
	UserID string    `json:"user_id"`
	Period string    `json:"period"`
	Stats  UserStats `json:"stats"`
}

type PlatformMetrics struct {
	ActiveUsers    int             `json:"active_users"`
	NewUsers       int             `json:"new_users"`
	TotalBets      int             `json:"total_bets"`
	TotalMatched   decimal.Decimal `json:"total_matched"`
	TotalReturns   decimal.Decimal `json:"total_returns"`
	PlatformProfit decimal.Decimal `json:"platform_profit"`
}

type PlatformDashboardResponse struct {
	Date    string          `json:"date"`
	Metrics PlatformMetrics `json:"metrics"`
}

type MarketReportItem struct {
	MarketID         string                     `json:"market_id"`
	MarketType       string                     `json:"market_type"`
	TotalMatched     decimal.Decimal            `json:"total_matched"`
	MatchedByOutcome map[string]decimal.Decimal `json:"matched_by_outcome"`
	TotalBets        int                        `json:"total_bets"`
	HouseProfit      decimal.Decimal            `json:"house_profit"`
}

type MarketReportResponse struct {
	Data []MarketReportItem `json:"data"`
}

type CohortRetention struct {
	Day1  decimal.Decimal `json:"day1"`
	Day7  decimal.Decimal `json:"day7"`
	Day30 decimal.Decimal `json:"day30"`
}

type CohortItem struct {
	CohortID   string          `json:"cohort_id"`
	UsersCount int             `json:"users_count"`
	Retention  CohortRetention `json:"retention"`
	LTV        decimal.Decimal `json:"ltv"`
}

type CohortsResponse struct {
	Cohorts []CohortItem `json:"cohorts"`
}

type TransactionExportRow struct {
	TransactionID string          `json:"transaction_id"`
	UserID        string          `json:"user_id"`
	Username      string          `json:"username"`
	Email         string          `json:"email"`
	Type          string          `json:"type"`
	Product       string          `json:"product"`
	Amount        decimal.Decimal `json:"amount"`
	Reference     string          `json:"reference,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
}

type ExcludedPunterExportRow struct {
	UserID        string     `json:"user_id"`
	Username      string     `json:"username"`
	Email         string     `json:"email"`
	ExclusionType string     `json:"exclusion_type"`
	Reason        string     `json:"reason"`
	Status        string     `json:"status"`
	EffectiveAt   time.Time  `json:"effective_at"`
	ExpiresAt     *time.Time `json:"expires_at,omitempty"`
}

type DailyTransactionSummary struct {
	DepositsCount     int             `json:"deposits_count"`
	DepositsAmount    decimal.Decimal `json:"deposits_amount"`
	WithdrawalsCount  int             `json:"withdrawals_count"`
	WithdrawalsAmount decimal.Decimal `json:"withdrawals_amount"`
	NetCash           decimal.Decimal `json:"net_cash"`
}

type DailyReportsResponse struct {
	Date               string                    `json:"date"`
	GeneratedAt        time.Time                 `json:"generated_at"`
	Dashboard          PlatformDashboardResponse `json:"dashboard"`
	MarketReport       MarketReportResponse      `json:"market_report"`
	ActiveExclusions   int                       `json:"active_exclusions"`
	TransactionSummary DailyTransactionSummary   `json:"transaction_summary"`
}

type WalletCorrectionTask struct {
	TaskID                   string    `json:"taskId"`
	UserID                   string    `json:"userId"`
	Type                     string    `json:"type"`
	Status                   string    `json:"status"`
	CurrentBalanceCents      int64     `json:"currentBalanceCents"`
	SuggestedAdjustmentCents int64     `json:"suggestedAdjustmentCents"`
	Reason                   string    `json:"reason"`
	ResolvedBy               string    `json:"resolvedBy,omitempty"`
	UpdatedAt                time.Time `json:"updatedAt"`
}

type WalletCorrectionSummary struct {
	Total              int   `json:"total"`
	Open               int   `json:"open"`
	Resolved           int   `json:"resolved"`
	NegativeBalance    int   `json:"negativeBalance"`
	LedgerDrift        int   `json:"ledgerDrift"`
	ManualReview       int   `json:"manualReview"`
	SuggestedAdjustSum int64 `json:"suggestedAdjustSum"`
}

type WalletCorrectionTasksResponse struct {
	Items   []WalletCorrectionTask  `json:"items"`
	Summary WalletCorrectionSummary `json:"summary"`
}

type PromoUsageBreakdown struct {
	ID                       string `json:"id"`
	BetCount                 int64  `json:"betCount"`
	TotalStakeCents          int64  `json:"totalStakeCents"`
	TotalFreebetAppliedCents int64  `json:"totalFreebetAppliedCents"`
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

type PromoUsageFilters struct {
	UserID         string
	FreebetID      string
	OddsBoostID    string
	BreakdownLimit int
	From           *time.Time
	To             *time.Time
}

type PromoUsageAppliedFilters struct {
	UserID         string `json:"userId,omitempty"`
	FreebetID      string `json:"freebetId,omitempty"`
	OddsBoostID    string `json:"oddsBoostId,omitempty"`
	From           string `json:"from,omitempty"`
	To             string `json:"to,omitempty"`
	BreakdownLimit int    `json:"breakdownLimit"`
}

type PromoUsageResponse struct {
	Summary PromoUsageSummary        `json:"summary"`
	Filters PromoUsageAppliedFilters `json:"filters"`
}

type RiskPlayerScore struct {
	UserID       string    `json:"userId"`
	ChurnScore   float64   `json:"churnScore"`
	LTVScore     float64   `json:"ltvScore"`
	RiskScore    float64   `json:"riskScore"`
	ModelVersion string    `json:"modelVersion"`
	GeneratedAt  time.Time `json:"generatedAt"`
}

type RiskSegmentProfile struct {
	UserID            string    `json:"userId"`
	SegmentID         string    `json:"segmentId"`
	SegmentReason     string    `json:"segmentReason"`
	RiskScore         float64   `json:"riskScore"`
	HasManualOverride bool      `json:"hasManualOverride"`
	GeneratedAt       time.Time `json:"generatedAt"`
}

type RiskSegmentsResponse struct {
	Items []RiskSegmentProfile `json:"items"`
	Total int                  `json:"total"`
}

type RiskFeatureSnapshot struct {
	UserID                   string
	SportsbookPlacedCount    int
	SportsbookSettledCount   int
	SportsbookVoidedCount    int
	PredictionPlacedCount    int
	PredictionSettledCount   int
	PredictionCancelledCount int
	TotalStake               decimal.Decimal
	LifetimeDeposits         decimal.Decimal
	CurrentBalance           decimal.Decimal
	PendingReviewCount       int
	LastActivityAt           time.Time
}

type ProviderFeedThresholds struct {
	MaxLagMs          int `json:"maxLagMs"`
	MaxGapCount       int `json:"maxGapCount"`
	MaxDuplicateCount int `json:"maxDuplicateCount"`
}

type ProviderFeedSummary struct {
	StreamCount      int `json:"streamCount"`
	UnhealthyStreams int `json:"unhealthyStreams"`
	TotalApplied     int `json:"totalApplied"`
	TotalErrors      int `json:"totalErrors"`
	MaxLagMs         int `json:"maxLagMs"`
}

type ProviderCancelMetrics struct {
	TotalAttempts int `json:"totalAttempts"`
	TotalRetries  int `json:"totalRetries"`
	TotalFallback int `json:"totalFallback"`
	TotalSuccess  int `json:"totalSuccess"`
	TotalFailed   int `json:"totalFailed"`
}

type ProviderFeedStreamStatus struct {
	Adapter        string `json:"adapter"`
	Stream         string `json:"stream"`
	State          string `json:"state"`
	Applied        int    `json:"applied"`
	Skipped        int    `json:"skipped"`
	ReplayCount    int    `json:"replayCount"`
	DuplicateCount int    `json:"duplicateCount"`
	GapCount       int    `json:"gapCount"`
	ErrorCount     int    `json:"errorCount"`
	LastLagMs      int    `json:"lastLagMs"`
	LastRevision   int    `json:"lastRevision"`
	LastSequence   int    `json:"lastSequence"`
	LastBetID      string `json:"lastBetId,omitempty"`
	LastPlayerID   string `json:"lastPlayerId,omitempty"`
	LastRequestID  string `json:"lastRequestId,omitempty"`
	LastEventAt    string `json:"lastEventAt,omitempty"`
	LastError      string `json:"lastError,omitempty"`
	UpdatedAt      string `json:"updatedAt,omitempty"`
}

type FeedHealthResponse struct {
	Enabled    bool                       `json:"enabled"`
	Thresholds ProviderFeedThresholds     `json:"thresholds"`
	Summary    ProviderFeedSummary        `json:"summary"`
	Cancel     ProviderCancelMetrics      `json:"cancel"`
	Streams    []ProviderFeedStreamStatus `json:"streams"`
}

type ProviderStreamAcknowledgement struct {
	StreamKey      string `json:"streamKey"`
	Adapter        string `json:"adapter"`
	Stream         string `json:"stream"`
	Operator       string `json:"operator"`
	Note           string `json:"note"`
	Status         string `json:"status"`
	LastAction     string `json:"lastAction"`
	AcknowledgedAt string `json:"acknowledgedAt"`
	UpdatedBy      string `json:"updatedBy"`
}

type ProviderStreamAcknowledgementsResponse struct {
	Items []ProviderStreamAcknowledgement `json:"items"`
}

type ProviderStreamAcknowledgementRequest struct {
	StreamKey string `json:"streamKey"`
	Adapter   string `json:"adapter"`
	Stream    string `json:"stream"`
	Action    string `json:"action"`
	Operator  string `json:"operator"`
	Note      string `json:"note"`
}

type ProviderAcknowledgementSLASetting struct {
	Adapter         string `json:"adapter"`
	WarningMinutes  int    `json:"warningMinutes"`
	CriticalMinutes int    `json:"criticalMinutes"`
	UpdatedAt       string `json:"updatedAt"`
	UpdatedBy       string `json:"updatedBy"`
	Source          string `json:"source"`
}

type ProviderAcknowledgementSLASettingsResponse struct {
	Default   ProviderAcknowledgementSLASetting   `json:"default"`
	Overrides []ProviderAcknowledgementSLASetting `json:"overrides"`
	Effective []ProviderAcknowledgementSLASetting `json:"effective"`
}

type ProviderAcknowledgementSLAUpdateRequest struct {
	Adapter         string `json:"adapter,omitempty"`
	WarningMinutes  int    `json:"warningMinutes"`
	CriticalMinutes int    `json:"criticalMinutes"`
}
