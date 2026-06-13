package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type AuthClaims struct {
	UserID string
	Role   string
}

type UnlockAchievementRequest struct {
	AchievementID string `json:"achievement_id"`
	Description   string `json:"description"`
	RewardPoints  int    `json:"reward_points"`
	BadgeImage    string `json:"badge_image"`
}

type UnlockAchievementResponse struct {
	UserID        string    `json:"user_id"`
	AchievementID string    `json:"achievement_id"`
	UnlockedAt    time.Time `json:"unlocked_at"`
	RewardPoints  int       `json:"reward_points"`
}

type UserAchievement struct {
	AchievementID string     `json:"achievement_id"`
	Description   string     `json:"description"`
	UnlockedAt    *time.Time `json:"unlocked_at,omitempty"`
	RewardPoints  int        `json:"reward_points"`
	BadgeImage    string     `json:"badge_image,omitempty"`
}

type UserAchievementsResponse struct {
	UserID       string            `json:"user_id"`
	Achievements []UserAchievement `json:"achievements"`
	TotalPoints  int               `json:"total_points"`
}

type LeaderboardFilters struct {
	Period string
	Metric string
	Limit  int
	Offset int
}

type LeaderboardEntry struct {
	Rank       int       `json:"rank"`
	UserID     string    `json:"user_id"`
	Username   string    `json:"username"`
	Value      float64   `json:"value"`
	LastUpdate time.Time `json:"last_update"`
}

type LeaderboardPeriod struct {
	Start *time.Time `json:"start,omitempty"`
	End   *time.Time `json:"end,omitempty"`
}

type LeaderboardResponse struct {
	LeaderboardType string             `json:"leaderboard_type"`
	Metric          string             `json:"metric"`
	Entries         []LeaderboardEntry `json:"entries"`
	Period          LeaderboardPeriod  `json:"period"`
}

type CreateCampaignRequest struct {
	Name         string         `json:"name"`
	Description  string         `json:"description"`
	CampaignType string         `json:"campaign_type"`
	Rules        map[string]any `json:"rules"`
	StartDate    time.Time      `json:"start_date"`
	EndDate      time.Time      `json:"end_date"`
}

type CreateCampaignResponse struct {
	CampaignID string    `json:"campaign_id"`
	Name       string    `json:"name"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
}

type LoyaltyHistoryItem struct {
	Event       string    `json:"event"`
	Points      int       `json:"points"`
	Multiplier  float64   `json:"multiplier"`
	EarnedAt    time.Time `json:"earned_at"`
	RewardID    string    `json:"reward_id,omitempty"`
	RewardValue string    `json:"reward_value,omitempty"`
}

type LoyaltyPointsResponse struct {
	UserID          string               `json:"user_id"`
	TotalPoints     int                  `json:"total_points"`
	AvailablePoints int                  `json:"available_points"`
	ReservedPoints  int                  `json:"reserved_points"`
	PointsHistory   []LoyaltyHistoryItem `json:"points_history"`
}

type FreebetResponse struct {
	FreebetID              string   `json:"freebetId"`
	PlayerID               string   `json:"playerId"`
	CampaignID             *string  `json:"campaignId,omitempty"`
	Currency               string   `json:"currency"`
	TotalAmountCents       int      `json:"totalAmountCents"`
	RemainingAmountCents   int      `json:"remainingAmountCents"`
	MinOddsDecimal         *float64 `json:"minOddsDecimal,omitempty"`
	AppliesToSportIDs      []string `json:"appliesToSportIds,omitempty"`
	AppliesToTournamentIDs []string `json:"appliesToTournamentIds,omitempty"`
	ExpiresAt              string   `json:"expiresAt"`
	Status                 string   `json:"status"`
	CreatedAt              string   `json:"createdAt"`
	UpdatedAt              string   `json:"updatedAt"`
}

type FreebetListResponse struct {
	Items      []FreebetResponse `json:"items"`
	TotalCount int               `json:"totalCount"`
}

type OddsBoostResponse struct {
	OddsBoostID     string   `json:"oddsBoostId"`
	PlayerID        string   `json:"playerId"`
	CampaignID      *string  `json:"campaignId,omitempty"`
	MarketID        string   `json:"marketId"`
	SelectionID     string   `json:"selectionId"`
	Currency        string   `json:"currency"`
	OriginalOdds    float64  `json:"originalOdds"`
	BoostedOdds     float64  `json:"boostedOdds"`
	MaxStakeCents   *int     `json:"maxStakeCents,omitempty"`
	MinOddsDecimal  *float64 `json:"minOddsDecimal,omitempty"`
	Status          string   `json:"status"`
	ExpiresAt       string   `json:"expiresAt"`
	AcceptedAt      *string  `json:"acceptedAt,omitempty"`
	AcceptRequestID *string  `json:"acceptRequestId,omitempty"`
	CreatedAt       string   `json:"createdAt"`
	UpdatedAt       string   `json:"updatedAt"`
}

type OddsBoostListResponse struct {
	Items      []OddsBoostResponse `json:"items"`
	TotalCount int                 `json:"totalCount"`
}

type OddsBoostAcceptRequest struct {
	UserID    string `json:"userId"`
	RequestID string `json:"requestId"`
	Reason    string `json:"reason,omitempty"`
}

type RedeemPointsRequest struct {
	RewardID       string `json:"reward_id"`
	PointsToRedeem int    `json:"points_to_redeem"`
}

type RedeemPointsResponse struct {
	UserID          string          `json:"user_id"`
	RewardID        string          `json:"reward_id"`
	PointsRedeemed  int             `json:"points_redeemed"`
	RewardValue     decimal.Decimal `json:"reward_value"`
	RemainingPoints int             `json:"remaining_points"`
	RedeemedAt      time.Time       `json:"redeemed_at"`
}

type LoyaltyState struct {
	TotalPoints     int
	AvailablePoints int
	ReservedPoints  int
	History         []LoyaltyHistoryItem
}

type AchievementRecord struct {
	AchievementID string
	Description   string
	RewardPoints  int
	BadgeImage    string
	UnlockedAt    *time.Time
}

type CampaignRecord struct {
	CampaignID string
	Name       string
	Status     string
	CreatedAt  time.Time
}
