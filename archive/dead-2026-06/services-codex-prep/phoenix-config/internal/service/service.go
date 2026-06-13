package service

import (
	"context"
	"errors"
	"log/slog"
	"strings"

	"github.com/phoenixbot/phoenix-config/internal/models"
	"github.com/phoenixbot/phoenix-config/internal/repository"
)

var (
	ErrForbidden    = errors.New("forbidden")
	ErrInvalidInput = errors.New("invalid input")
	ErrNotFound     = errors.New("not found")
	ErrConflict     = errors.New("conflict")
)

type Service interface {
	GetCurrentTerms(ctx context.Context, actor *models.AuthClaims) (*models.TermsDocument, error)
	CreateTerms(ctx context.Context, actor models.AuthClaims, request models.UpsertTermsRequest) error
}

type termsService struct {
	logger *slog.Logger
	repo   repository.Repository
}

func NewService(logger *slog.Logger, repo repository.Repository) Service {
	return &termsService{logger: logger, repo: repo}
}

func (s *termsService) GetCurrentTerms(ctx context.Context, actor *models.AuthClaims) (*models.TermsDocument, error) {
	if actor != nil && !hasAnyRole(actor.Role, "admin", "operator", "trader", "moderator") {
		return nil, ErrForbidden
	}
	doc, err := s.repo.GetCurrentTerms(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return doc, nil
}

func (s *termsService) CreateTerms(ctx context.Context, actor models.AuthClaims, request models.UpsertTermsRequest) error {
	if !hasAnyRole(actor.Role, "admin") {
		return ErrForbidden
	}
	version := strings.TrimSpace(request.CurrentTermsVersion)
	content := strings.TrimSpace(request.TermsContent)
	threshold := 365
	if request.TermsDaysThreshold != nil {
		threshold = *request.TermsDaysThreshold
	}
	if version == "" || content == "" || threshold <= 0 {
		return ErrInvalidInput
	}
	if err := s.repo.CreateTerms(ctx, actor.UserID, version, content, threshold); err != nil {
		switch {
		case errors.Is(err, repository.ErrAlreadyExists):
			return ErrConflict
		case errors.Is(err, repository.ErrNotFound):
			return ErrNotFound
		default:
			return err
		}
	}
	return nil
}

func hasAnyRole(role string, allowed ...string) bool {
	normalized := strings.ReplaceAll(strings.ToLower(strings.TrimSpace(role)), "_", "-")
	for _, candidate := range allowed {
		if normalized == strings.ReplaceAll(strings.ToLower(strings.TrimSpace(candidate)), "_", "-") {
			return true
		}
	}
	return false
}
