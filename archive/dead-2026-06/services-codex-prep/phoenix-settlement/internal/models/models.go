package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type AuthClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type CreateSettlementBatchRequest struct {
	MarketIDs       []string          `json:"market_ids"`
	WinningOutcomes map[string]string `json:"winning_outcomes"`
	SettlementType  string            `json:"settlement_type"`
}

type PayoutState struct {
	Processing int `json:"processing"`
	Completed  int `json:"completed"`
	Failed     int `json:"failed"`
}

type SettlementBatchResponse struct {
	BatchID      string          `json:"batch_id"`
	Status       string          `json:"status"`
	MarketCount  int             `json:"market_count"`
	BetCount     int             `json:"bet_count"`
	SettledCount int             `json:"settled_count,omitempty"`
	PendingCount int             `json:"pending_count,omitempty"`
	TotalPayout  decimal.Decimal `json:"total_payout"`
	PayoutState  *PayoutState    `json:"payout_state,omitempty"`
	CreatedAt    time.Time       `json:"created_at,omitempty"`
	StartedAt    *time.Time      `json:"started_at,omitempty"`
	CompletedAt  *time.Time      `json:"completed_at,omitempty"`
}

type ListSettlementBatchesResponse struct {
	Data       []SettlementBatchResponse `json:"data"`
	Pagination Pagination                `json:"pagination"`
}

type ManualPayoutRequest struct {
	UserID      string          `json:"user_id"`
	Amount      decimal.Decimal `json:"amount"`
	Reason      string          `json:"reason"`
	ReferenceID string          `json:"reference_id"`
}

type ManualPayoutResponse struct {
	PayoutID  string          `json:"payout_id"`
	UserID    string          `json:"user_id"`
	Amount    decimal.Decimal `json:"amount"`
	Status    string          `json:"status"`
	CreatedAt time.Time       `json:"created_at"`
}

type CreateReconciliationRequest struct {
	BatchID            string `json:"batch_id"`
	ReconciliationType string `json:"reconciliation_type"`
}

type ReconciliationDetail struct {
	BetID           string          `json:"bet_id"`
	DiscrepancyType string          `json:"discrepancy_type"`
	Expected        decimal.Decimal `json:"expected"`
	Actual          decimal.Decimal `json:"actual"`
	Variance        decimal.Decimal `json:"variance"`
}

type ReconciliationResponse struct {
	ReconciliationID      string                 `json:"reconciliation_id"`
	BatchID               string                 `json:"batch_id"`
	Status                string                 `json:"status"`
	DiscrepanciesFound    int                    `json:"discrepancies_found,omitempty"`
	ReconciliationDetails []ReconciliationDetail `json:"reconciliation_details,omitempty"`
	StartedAt             time.Time              `json:"started_at,omitempty"`
	CompletedAt           *time.Time             `json:"completed_at,omitempty"`
}

type Pagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}
