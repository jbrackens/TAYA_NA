package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-settlement/internal/models"
	"github.com/phoenixbot/phoenix-settlement/internal/repository"
)

var ErrInvalidInput = errors.New("invalid input")

type Service interface {
	CreateSettlementBatch(ctx context.Context, actor models.AuthClaims, req *models.CreateSettlementBatchRequest) (*models.SettlementBatchResponse, error)
	GetSettlementBatch(ctx context.Context, actor models.AuthClaims, batchID string) (*models.SettlementBatchResponse, error)
	ListSettlementBatches(ctx context.Context, actor models.AuthClaims, status string, startDate, endDate *time.Time, page, limit int) (*models.ListSettlementBatchesResponse, error)
	CreateManualPayout(ctx context.Context, actor models.AuthClaims, req *models.ManualPayoutRequest) (*models.ManualPayoutResponse, error)
	CreateReconciliation(ctx context.Context, actor models.AuthClaims, req *models.CreateReconciliationRequest) (*models.ReconciliationResponse, error)
	GetReconciliation(ctx context.Context, actor models.AuthClaims, reconciliationID string) (*models.ReconciliationResponse, error)
}

type settlementService struct {
	logger *slog.Logger
	repo   repository.Repository
}

func NewService(logger *slog.Logger, repo repository.Repository) Service {
	return &settlementService{logger: logger, repo: repo}
}

func (s *settlementService) CreateSettlementBatch(ctx context.Context, actor models.AuthClaims, req *models.CreateSettlementBatchRequest) (*models.SettlementBatchResponse, error) {
	if !canOperate(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if len(req.MarketIDs) == 0 || len(req.WinningOutcomes) == 0 {
		return nil, fmt.Errorf("%w: market_ids and winning_outcomes are required", ErrInvalidInput)
	}
	req.SettlementType = strings.TrimSpace(req.SettlementType)
	if req.SettlementType == "" {
		req.SettlementType = "automatic"
	}
	return s.repo.CreateSettlementBatch(ctx, actor.UserID, *req)
}

func (s *settlementService) GetSettlementBatch(ctx context.Context, actor models.AuthClaims, batchID string) (*models.SettlementBatchResponse, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.GetSettlementBatch(ctx, strings.TrimSpace(batchID))
}

func (s *settlementService) ListSettlementBatches(ctx context.Context, actor models.AuthClaims, status string, startDate, endDate *time.Time, page, limit int) (*models.ListSettlementBatchesResponse, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.ListSettlementBatches(ctx, strings.TrimSpace(status), startDate, endDate, page, limit)
}

func (s *settlementService) CreateManualPayout(ctx context.Context, actor models.AuthClaims, req *models.ManualPayoutRequest) (*models.ManualPayoutResponse, error) {
	if !canOperate(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	req.UserID = strings.TrimSpace(req.UserID)
	req.Reason = strings.TrimSpace(req.Reason)
	req.ReferenceID = strings.TrimSpace(req.ReferenceID)
	if req.UserID == "" || req.Reason == "" || req.Amount.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("%w: invalid manual payout payload", ErrInvalidInput)
	}
	return s.repo.CreateManualPayout(ctx, actor.UserID, *req)
}

func (s *settlementService) CreateReconciliation(ctx context.Context, actor models.AuthClaims, req *models.CreateReconciliationRequest) (*models.ReconciliationResponse, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	req.BatchID = strings.TrimSpace(req.BatchID)
	req.ReconciliationType = strings.TrimSpace(req.ReconciliationType)
	if req.BatchID == "" || req.ReconciliationType == "" {
		return nil, fmt.Errorf("%w: batch_id and reconciliation_type are required", ErrInvalidInput)
	}
	return s.repo.CreateReconciliation(ctx, actor.UserID, *req)
}

func (s *settlementService) GetReconciliation(ctx context.Context, actor models.AuthClaims, reconciliationID string) (*models.ReconciliationResponse, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.GetReconciliation(ctx, strings.TrimSpace(reconciliationID))
}

func canOperate(role string) bool {
	normalized := normalizeRole(role)
	return normalized == "settlement-operator" || normalized == "admin"
}
func isAdmin(role string) bool { return normalizeRole(role) == "admin" }
func normalizeRole(role string) string {
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(role)), "_", "-")
}
