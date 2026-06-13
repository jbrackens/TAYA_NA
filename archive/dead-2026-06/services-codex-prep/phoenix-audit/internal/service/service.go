package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/phoenixbot/phoenix-audit/internal/models"
	"github.com/phoenixbot/phoenix-audit/internal/repository"
)

var (
	ErrInvalidInput = errors.New("invalid input")
	ErrForbidden    = errors.New("forbidden")
)

type Service interface {
	GetAuditLogs(ctx context.Context, actor models.AuthClaims, filters models.AuditLogFilters) (*models.AuditLogsResponse, error)
	GetUserAuditLogs(ctx context.Context, actor models.AuthClaims, userID string, filters models.AuditLogFilters) (*models.AuditLogsResponse, error)
	ExportAuditLogsCSV(ctx context.Context, actor models.AuthClaims, filters models.AuditLogFilters) ([]byte, error)
}

type auditService struct {
	logger *slog.Logger
	repo   repository.Repository
}

func NewService(logger *slog.Logger, repo repository.Repository) Service {
	return &auditService{logger: logger, repo: repo}
}

func (s *auditService) GetAuditLogs(ctx context.Context, actor models.AuthClaims, filters models.AuditLogFilters) (*models.AuditLogsResponse, error) {
	normalizeAuditFilters(&filters)
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.Limit < 1 || filters.Limit > 100 {
		filters.Limit = 50
	}

	if err := validateAuditAccess(actor, filters); err != nil {
		return nil, err
	}
	return s.repo.GetAuditLogs(ctx, filters)
}

func (s *auditService) GetUserAuditLogs(ctx context.Context, actor models.AuthClaims, userID string, filters models.AuditLogFilters) (*models.AuditLogsResponse, error) {
	normalizeAuditFilters(&filters)
	filters.UserID = strings.TrimSpace(userID)
	if filters.UserID == "" {
		return nil, fmt.Errorf("%w: user id is required", ErrInvalidInput)
	}
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.Limit < 1 || filters.Limit > 100 {
		filters.Limit = 50
	}
	if !canViewUserAudit(actor.Role) {
		return nil, ErrForbidden
	}
	return s.repo.GetAuditLogs(ctx, filters)
}

func (s *auditService) ExportAuditLogsCSV(ctx context.Context, actor models.AuthClaims, filters models.AuditLogFilters) ([]byte, error) {
	normalizeAuditFilters(&filters)
	if err := validateAuditAccess(actor, filters); err != nil {
		return nil, err
	}

	rows, err := s.repo.ExportAuditLogs(ctx, filters)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)
	if err := writer.Write([]string{"id", "created_at", "actor_id", "action", "entity_type", "entity_id", "product", "ip_address", "old_value", "new_value"}); err != nil {
		return nil, err
	}
	for _, row := range rows {
		if err := writer.Write([]string{
			row.ID,
			row.CreatedAt.UTC().Format(time.RFC3339),
			valueOrEmpty(row.ActorID),
			row.Action,
			row.EntityType,
			valueOrEmpty(row.EntityID),
			row.Product,
			valueOrEmpty(row.IPAddress),
			marshalAuditPayload(row.OldValue),
			marshalAuditPayload(row.NewValue),
		}); err != nil {
			return nil, err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func normalizeAuditFilters(filters *models.AuditLogFilters) {
	filters.Action = strings.TrimSpace(filters.Action)
	filters.ActorID = strings.TrimSpace(filters.ActorID)
	filters.TargetID = strings.TrimSpace(filters.TargetID)
	filters.Product = normalizeProduct(filters.Product)
	filters.SortBy = strings.TrimSpace(filters.SortBy)
	filters.SortDir = strings.TrimSpace(filters.SortDir)
}

func validateAuditAccess(actor models.AuthClaims, filters models.AuditLogFilters) error {
	if !canViewAudit(actor, filters.Product) {
		return ErrForbidden
	}
	if filters.Product == "" && !isAdmin(actor.Role) {
		return fmt.Errorf("%w: product filter required for non-admin viewers", ErrInvalidInput)
	}
	return nil
}

func marshalAuditPayload(value any) string {
	if value == nil {
		return ""
	}
	payload, err := json.Marshal(value)
	if err != nil {
		return fmt.Sprintf("%v", value)
	}
	return string(payload)
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func canViewAudit(actor models.AuthClaims, product string) bool {
	if isAdmin(actor.Role) {
		return true
	}
	if product == "prediction" && hasAnyRole(actor.Role, "operator", "trader", "moderator") {
		return true
	}
	return false
}

func canViewUserAudit(role string) bool {
	return hasAnyRole(role, "admin", "operator", "trader")
}

func isAdmin(role string) bool {
	return normalizeRole(role) == "admin"
}

func hasAnyRole(role string, allowed ...string) bool {
	normalized := normalizeRole(role)
	for _, candidate := range allowed {
		if normalized == normalizeRole(candidate) {
			return true
		}
	}
	return false
}

func normalizeRole(role string) string {
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(role)), "_", "-")
}

func normalizeProduct(product string) string {
	switch strings.ToLower(strings.TrimSpace(product)) {
	case "prediction", "prediction-market", "prediction_markets":
		return "prediction"
	case "sportsbook", "sports", "betting":
		return "sportsbook"
	default:
		return ""
	}
}
