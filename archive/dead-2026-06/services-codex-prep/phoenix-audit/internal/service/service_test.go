package service

import (
	"context"
	"io"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/phoenixbot/phoenix-audit/internal/models"
)

type stubRepo struct {
	filters models.AuditLogFilters
	resp    *models.AuditLogsResponse
	rows    []models.AuditLogEntry
}

func (s *stubRepo) GetAuditLogs(_ context.Context, filters models.AuditLogFilters) (*models.AuditLogsResponse, error) {
	s.filters = filters
	if s.resp != nil {
		return s.resp, nil
	}
	return &models.AuditLogsResponse{}, nil
}

func (s *stubRepo) ExportAuditLogs(_ context.Context, filters models.AuditLogFilters) ([]models.AuditLogEntry, error) {
	s.filters = filters
	return s.rows, nil
}

func TestGetAuditLogsAllowsAdmin(t *testing.T) {
	repo := &stubRepo{resp: &models.AuditLogsResponse{Pagination: models.Pagination{Page: 1, Limit: 50, Total: 1}}}
	svc := NewService(silentLogger(), repo)
	response, err := svc.GetAuditLogs(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, models.AuditLogFilters{})
	if err != nil {
		t.Fatalf("GetAuditLogs() error = %v", err)
	}
	if response.Pagination.Total != 1 {
		t.Fatalf("unexpected response: %+v", response)
	}
}

func TestGetAuditLogsAllowsPredictionViewerOnlyForPrediction(t *testing.T) {
	repo := &stubRepo{}
	svc := NewService(silentLogger(), repo)
	if _, err := svc.GetAuditLogs(context.Background(), models.AuthClaims{UserID: "trader-1", Role: "trader"}, models.AuditLogFilters{Product: "prediction"}); err != nil {
		t.Fatalf("expected prediction audit access, got %v", err)
	}
	if repo.filters.Product != "prediction" {
		t.Fatalf("expected normalized product filter, got %+v", repo.filters)
	}
	if _, err := svc.GetAuditLogs(context.Background(), models.AuthClaims{UserID: "trader-1", Role: "trader"}, models.AuditLogFilters{}); err == nil {
		t.Fatal("expected missing product filter to be rejected for non-admin")
	}
	if _, err := svc.GetAuditLogs(context.Background(), models.AuthClaims{UserID: "trader-1", Role: "trader"}, models.AuditLogFilters{Product: "sportsbook"}); err == nil {
		t.Fatal("expected sportsbook audit access to be rejected for non-admin")
	}
}

func TestGetUserAuditLogsAllowsOpsReviewRoles(t *testing.T) {
	repo := &stubRepo{resp: &models.AuditLogsResponse{Pagination: models.Pagination{Page: 1, Limit: 50, Total: 2}}}
	svc := NewService(silentLogger(), repo)
	response, err := svc.GetUserAuditLogs(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, "550e8400-e29b-41d4-a716-446655440000", models.AuditLogFilters{})
	if err != nil {
		t.Fatalf("GetUserAuditLogs() error = %v", err)
	}
	if response.Pagination.Total != 2 {
		t.Fatalf("unexpected response: %+v", response)
	}
	if repo.filters.UserID != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("expected user filter to be forwarded, got %+v", repo.filters)
	}
}

func TestGetUserAuditLogsRejectsUnauthorizedViewer(t *testing.T) {
	repo := &stubRepo{}
	svc := NewService(silentLogger(), repo)
	if _, err := svc.GetUserAuditLogs(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "550e8400-e29b-41d4-a716-446655440000", models.AuditLogFilters{}); err == nil {
		t.Fatal("expected user audit access to be rejected for non-admin review viewer")
	}
}

func TestExportAuditLogsCSV(t *testing.T) {
	actorID := "admin-1"
	entityID := "bet-1"
	ip := "127.0.0.1"
	repo := &stubRepo{
		rows: []models.AuditLogEntry{
			{
				ID:         "audit-1",
				ActorID:    &actorID,
				Action:     "bet.settled",
				EntityType: "bet",
				EntityID:   &entityID,
				Product:    "sportsbook",
				OldValue:   map[string]any{"status": "open"},
				NewValue:   map[string]any{"status": "settled"},
				IPAddress:  &ip,
				CreatedAt:  time.Date(2026, time.March, 15, 12, 30, 0, 0, time.UTC),
			},
		},
	}
	svc := NewService(silentLogger(), repo)
	data, err := svc.ExportAuditLogsCSV(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, models.AuditLogFilters{Action: "bet.settled"})
	if err != nil {
		t.Fatalf("ExportAuditLogsCSV() error = %v", err)
	}
	output := string(data)
	if !strings.Contains(output, "id,created_at,actor_id,action,entity_type,entity_id,product,ip_address,old_value,new_value") {
		t.Fatalf("unexpected csv header: %s", output)
	}
	if !strings.Contains(output, "audit-1,2026-03-15T12:30:00Z,admin-1,bet.settled,bet,bet-1,sportsbook,127.0.0.1,") {
		t.Fatalf("unexpected csv body: %s", output)
	}
	if repo.filters.Action != "bet.settled" {
		t.Fatalf("expected filters to be forwarded, got %+v", repo.filters)
	}
}

func TestExportAuditLogsCSVRejectsForbiddenViewer(t *testing.T) {
	repo := &stubRepo{}
	svc := NewService(silentLogger(), repo)
	if _, err := svc.ExportAuditLogsCSV(context.Background(), models.AuthClaims{UserID: "trader-1", Role: "trader"}, models.AuditLogFilters{Product: "sportsbook"}); err == nil {
		t.Fatal("expected sportsbook audit export to be rejected for non-admin")
	}
}

func silentLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}
