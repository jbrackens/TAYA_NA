package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type AuthClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type ProfileStats struct {
	TotalBets   int             `json:"total_bets"`
	WinRate     decimal.Decimal `json:"win_rate"`
	TotalProfit decimal.Decimal `json:"total_profit"`
}

type UserProfile struct {
	UserID         string       `json:"user_id"`
	Username       string       `json:"username"`
	DisplayName    string       `json:"display_name"`
	AvatarURL      string       `json:"avatar_url,omitempty"`
	Bio            string       `json:"bio,omitempty"`
	FollowerCount  int          `json:"follower_count"`
	FollowingCount int          `json:"following_count"`
	Stats          ProfileStats `json:"stats"`
	IsFollowed     bool         `json:"is_followed"`
}

type Follow struct {
	FollowerID  string    `json:"follower_id"`
	FollowingID string    `json:"following_id"`
	FollowedAt  time.Time `json:"followed_at"`
}

type FollowerPreview struct {
	UserID       string `json:"user_id"`
	Username     string `json:"username"`
	AvatarURL    string `json:"avatar_url,omitempty"`
	FollowStatus string `json:"follow_status"`
}

type Pagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}

type FollowersResponse struct {
	Data       []FollowerPreview `json:"data"`
	Pagination Pagination        `json:"pagination"`
}

type FeedDetails struct {
	BetID   string          `json:"bet_id,omitempty"`
	Market  string          `json:"market,omitempty"`
	Stake   decimal.Decimal `json:"stake,omitempty"`
	Odds    decimal.Decimal `json:"odds,omitempty"`
	Outcome string          `json:"outcome,omitempty"`
}

type FeedItem struct {
	ActivityID   string      `json:"activity_id"`
	UserID       string      `json:"user_id"`
	Username     string      `json:"username"`
	ActivityType string      `json:"activity_type"`
	Details      FeedDetails `json:"details"`
	Timestamp    time.Time   `json:"timestamp"`
}

type FeedResponse struct {
	Data []FeedItem `json:"data"`
}

type SendMessageRequest struct {
	ToUserID    string `json:"to_user_id"`
	Message     string `json:"message"`
	MessageType string `json:"message_type"`
}

type Message struct {
	MessageID  string    `json:"message_id"`
	FromUserID string    `json:"from_user_id"`
	ToUserID   string    `json:"to_user_id"`
	Message    string    `json:"message"`
	SentAt     time.Time `json:"sent_at"`
	Read       bool      `json:"read"`
}

type Conversation struct {
	ConversationID string    `json:"conversation_id"`
	WithUserID     string    `json:"with_user_id"`
	Messages       []Message `json:"messages"`
}
