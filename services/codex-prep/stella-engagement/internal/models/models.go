package models

import "time"

type AuthClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type AchievementStreamRequest struct {
	EventType    string `json:"event_type"`
	AchievementID string `json:"achievement_id"`
	UserID       string `json:"user_id"`
	RewardPoints int    `json:"reward_points"`
}

type AchievementStreamResponse struct {
	EventType     string    `json:"event_type"`
	AchievementID string    `json:"achievement_id"`
	UserID        string    `json:"user_id"`
	RewardPoints  int       `json:"reward_points"`
	Timestamp     time.Time `json:"timestamp"`
}

type PointsCalculateRequest struct {
	UserID    string         `json:"user_id"`
	EventType string         `json:"event_type"`
	EventData map[string]any `json:"event_data"`
}

type PointsCalculateResponse struct {
	UserID         string `json:"user_id"`
	PointsAwarded  int    `json:"points_awarded"`
	CalculationID  string `json:"calculation_id"`
}

type AggregationComputeRequest struct {
	UserID          string `json:"user_id"`
	AggregationType string `json:"aggregation_type"`
	Period          string `json:"period"`
}

type AggregationComputeResponse struct {
	AggregationID string `json:"aggregation_id"`
	UserID        string `json:"user_id"`
	Status        string `json:"status"`
}

type EngagementScoreResponse struct {
	UserID          string         `json:"user_id"`
	EngagementScore int            `json:"engagement_score"`
	Components      map[string]int `json:"components"`
	LastUpdated     time.Time      `json:"last_updated"`
}

type LeaderboardEntry struct {
	Rank      int       `json:"rank"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	Value     int       `json:"value"`
	Timestamp time.Time `json:"timestamp"`
}

type LeaderboardMessage struct {
	EventType       string             `json:"event_type"`
	LeaderboardType string             `json:"leaderboard_type"`
	Entries         []LeaderboardEntry `json:"entries"`
}
