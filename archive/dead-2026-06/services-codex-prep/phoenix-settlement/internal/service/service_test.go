package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-settlement/internal/models"
)

type fakeRepo struct{}

func (f *fakeRepo) CreateSettlementBatch(ctx context.Context, actorID string, req models.CreateSettlementBatchRequest) (*models.SettlementBatchResponse, error) {
	return &models.SettlementBatchResponse{BatchID: "batch_1", Status: "processing"}, nil
}
func (f *fakeRepo) GetSettlementBatch(ctx context.Context, batchID string) (*models.SettlementBatchResponse, error) {
	return &models.SettlementBatchResponse{BatchID: batchID}, nil
}
func (f *fakeRepo) ListSettlementBatches(ctx context.Context, status string, startDate, endDate *time.Time, page, limit int) (*models.ListSettlementBatchesResponse, error) {
	return &models.ListSettlementBatchesResponse{}, nil
}
func (f *fakeRepo) CreateManualPayout(ctx context.Context, actorID string, req models.ManualPayoutRequest) (*models.ManualPayoutResponse, error) {
	return &models.ManualPayoutResponse{PayoutID: "p_1", UserID: req.UserID, Amount: req.Amount, Status: "processed"}, nil
}
func (f *fakeRepo) CreateReconciliation(ctx context.Context, actorID string, req models.CreateReconciliationRequest) (*models.ReconciliationResponse, error) {
	return &models.ReconciliationResponse{ReconciliationID: "r_1", BatchID: req.BatchID, Status: "in_progress"}, nil
}
func (f *fakeRepo) GetReconciliation(ctx context.Context, reconciliationID string) (*models.ReconciliationResponse, error) {
	return &models.ReconciliationResponse{ReconciliationID: reconciliationID}, nil
}

func TestSettlementBatchRequiresOperator(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.CreateSettlementBatch(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, &models.CreateSettlementBatchRequest{MarketIDs: []string{"m1"}, WinningOutcomes: map[string]string{"m1": "o1"}})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestManualPayoutValidation(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.CreateManualPayout(context.Background(), models.AuthClaims{UserID: "admin", Role: "admin"}, &models.ManualPayoutRequest{UserID: "", Amount: decimal.NewFromInt(10), Reason: "voided_bet"})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestReconciliationRequiresAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.CreateReconciliation(context.Background(), models.AuthClaims{UserID: "op", Role: "settlement_operator"}, &models.CreateReconciliationRequest{BatchID: "b1", ReconciliationType: "full_audit"})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}
