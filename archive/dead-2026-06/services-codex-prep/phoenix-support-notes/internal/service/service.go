package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/phoenixbot/phoenix-support-notes/internal/models"
	"github.com/phoenixbot/phoenix-support-notes/internal/repository"
)

var (
	ErrForbidden    = errors.New("forbidden")
	ErrInvalidInput = errors.New("invalid input")
	ErrNotFound     = errors.New("not found")
)

type Service interface {
	ListNotes(ctx context.Context, claims models.AuthClaims, ownerUserID string, page, limit int) (*models.ListNotesResponse, error)
	ListTimeline(ctx context.Context, claims models.AuthClaims, ownerUserID string, page, limit int, filters models.TimelineFilters) (*models.ListTimelineResponse, error)
	ExportTimelineCSV(ctx context.Context, claims models.AuthClaims, ownerUserID string, filters models.TimelineFilters) ([]byte, error)
	AddManualNote(ctx context.Context, claims models.AuthClaims, ownerUserID, noteText string) error
}

type service struct {
	logger *slog.Logger
	repo   repository.Repository
}

func NewService(logger *slog.Logger, repo repository.Repository) Service {
	return &service{logger: logger, repo: repo}
}

func (s *service) ListNotes(ctx context.Context, claims models.AuthClaims, ownerUserID string, page, limit int) (*models.ListNotesResponse, error) {
	if !canManageNotes(claims.Role) {
		return nil, ErrForbidden
	}
	if err := validateUserID(ownerUserID); err != nil {
		return nil, err
	}
	page, limit = normalizePagination(page, limit)
	data, total, err := s.repo.ListNotes(ctx, ownerUserID, page, limit)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &models.ListNotesResponse{Data: data, Pagination: models.Pagination{Page: page, Limit: limit, Total: total}}, nil
}

func (s *service) ListTimeline(ctx context.Context, claims models.AuthClaims, ownerUserID string, page, limit int, filters models.TimelineFilters) (*models.ListTimelineResponse, error) {
	if !canManageNotes(claims.Role) {
		return nil, ErrForbidden
	}
	if err := validateUserID(ownerUserID); err != nil {
		return nil, err
	}
	if err := validateTimelineFilters(filters); err != nil {
		return nil, err
	}
	page, limit = normalizePagination(page, limit)
	data, total, err := s.repo.ListTimeline(ctx, ownerUserID, page, limit, filters)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &models.ListTimelineResponse{Data: data, Pagination: models.Pagination{Page: page, Limit: limit, Total: total}}, nil
}

func (s *service) ExportTimelineCSV(ctx context.Context, claims models.AuthClaims, ownerUserID string, filters models.TimelineFilters) ([]byte, error) {
	if !canManageNotes(claims.Role) {
		return nil, ErrForbidden
	}
	if err := validateUserID(ownerUserID); err != nil {
		return nil, err
	}
	if err := validateTimelineFilters(filters); err != nil {
		return nil, err
	}
	data, err := s.repo.ExportTimeline(ctx, ownerUserID, filters)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return buildTimelineCSV(data)
}

func (s *service) AddManualNote(ctx context.Context, claims models.AuthClaims, ownerUserID, noteText string) error {
	if !canManageNotes(claims.Role) {
		return ErrForbidden
	}
	if err := validateUserID(ownerUserID); err != nil {
		return err
	}
	if err := validateUserID(claims.UserID); err != nil {
		return fmt.Errorf("actor id invalid: %w", err)
	}
	noteText = strings.TrimSpace(noteText)
	if noteText == "" {
		return fmt.Errorf("%w: note_text is required", ErrInvalidInput)
	}
	if len(noteText) > 2000 {
		return fmt.Errorf("%w: note_text exceeds 2000 characters", ErrInvalidInput)
	}
	if err := s.repo.CreateManualNote(ctx, ownerUserID, claims.UserID, noteText); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return ErrNotFound
		}
		s.logger.Error("create manual note failed", slog.Any("error", err), slog.String("owner_user_id", ownerUserID), slog.String("author_user_id", claims.UserID))
		return err
	}
	return nil
}

func canManageNotes(role string) bool {
	switch strings.TrimSpace(strings.ToLower(role)) {
	case "admin", "operator", "trader", "moderator":
		return true
	default:
		return false
	}
}

func validateUserID(value string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%w: user id is required", ErrInvalidInput)
	}
	if _, err := uuid.Parse(strings.TrimSpace(value)); err != nil {
		return fmt.Errorf("%w: invalid user id", ErrInvalidInput)
	}
	return nil
}

func normalizePagination(page, limit int) (int, int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	return page, limit
}

func validateTimelineFilters(filters models.TimelineFilters) error {
	if filters.StartDate != nil && filters.EndDate != nil && filters.StartDate.After(*filters.EndDate) {
		return fmt.Errorf("%w: start_date must be before end_date", ErrInvalidInput)
	}
	return nil
}

func buildTimelineCSV(entries []*models.SupportTimelineEntry) ([]byte, error) {
	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)
	if err := writer.Write([]string{"occurred_at", "entry_type", "entry_id", "title", "description", "status", "amount", "currency"}); err != nil {
		return nil, err
	}
	for _, entry := range entries {
		status := ""
		if entry.Status != nil {
			status = *entry.Status
		}
		amount := ""
		if entry.Amount != nil {
			amount = *entry.Amount
		}
		currency := ""
		if entry.Currency != nil {
			currency = *entry.Currency
		}
		if err := writer.Write([]string{
			entry.OccurredAt.UTC().Format(time.RFC3339),
			entry.EntryType,
			entry.EntryID,
			entry.Title,
			entry.Description,
			status,
			amount,
			currency,
		}); err != nil {
			return nil, err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}
