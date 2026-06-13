package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/phoenixbot/phoenix-notification/internal/models"
	"github.com/phoenixbot/phoenix-notification/internal/repository"
)

var ErrInvalidInput = errors.New("invalid input")

type Service interface {
	CreateNotification(ctx context.Context, actor models.AuthClaims, req *models.SendNotificationRequest) (*models.SendNotificationResponse, error)
	ListTemplates(ctx context.Context, actor models.AuthClaims) (*models.TemplatesResponse, error)
	UpdateNotificationStatus(ctx context.Context, actor models.AuthClaims, notificationID string, req *models.UpdateNotificationStatusRequest) (*models.UpdateNotificationStatusResponse, error)
	GetPreferences(ctx context.Context, actor models.AuthClaims, userID string) (*models.NotificationPreferencesResponse, error)
	UpdatePreferences(ctx context.Context, actor models.AuthClaims, userID string, req *models.UpdateNotificationPreferencesRequest) (*models.UpdateNotificationPreferencesResponse, error)
	GetNotification(ctx context.Context, actor models.AuthClaims, notificationID string) (*models.NotificationDetail, error)
}

type notificationService struct {
	logger *slog.Logger
	repo   repository.Repository
}

func NewService(logger *slog.Logger, repo repository.Repository) Service {
	return &notificationService{logger: logger, repo: repo}
}

func (s *notificationService) CreateNotification(ctx context.Context, actor models.AuthClaims, req *models.SendNotificationRequest) (*models.SendNotificationResponse, error) {
	if !canDispatch(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	req.UserID = strings.TrimSpace(req.UserID)
	req.NotificationType = strings.TrimSpace(req.NotificationType)
	req.TemplateID = strings.TrimSpace(req.TemplateID)
	req.Priority = strings.TrimSpace(req.Priority)
	if req.UserID == "" || req.NotificationType == "" || len(req.Channels) == 0 {
		return nil, fmt.Errorf("%w: user_id, notification_type, and channels are required", ErrInvalidInput)
	}
	if req.Priority == "" {
		req.Priority = "normal"
	}
	return s.repo.CreateNotification(ctx, actor.UserID, *req)
}

func (s *notificationService) ListTemplates(ctx context.Context, actor models.AuthClaims) (*models.TemplatesResponse, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.ListTemplates(ctx)
}

func (s *notificationService) UpdateNotificationStatus(ctx context.Context, actor models.AuthClaims, notificationID string, req *models.UpdateNotificationStatusRequest) (*models.UpdateNotificationStatusResponse, error) {
	if !canDispatch(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	req.Channel = strings.TrimSpace(req.Channel)
	req.Status = strings.TrimSpace(req.Status)
	if req.Channel == "" || req.Status == "" {
		return nil, fmt.Errorf("%w: channel and status are required", ErrInvalidInput)
	}
	return s.repo.UpdateNotificationStatus(ctx, actor.UserID, strings.TrimSpace(notificationID), *req)
}

func (s *notificationService) GetPreferences(ctx context.Context, actor models.AuthClaims, userID string) (*models.NotificationPreferencesResponse, error) {
	if !ownsOrAdmin(actor, userID) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.GetPreferences(ctx, strings.TrimSpace(userID))
}

func (s *notificationService) UpdatePreferences(ctx context.Context, actor models.AuthClaims, userID string, req *models.UpdateNotificationPreferencesRequest) (*models.UpdateNotificationPreferencesResponse, error) {
	if !ownsOrAdmin(actor, userID) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if req.QuietHours != nil {
		req.QuietHours.Start = strings.TrimSpace(req.QuietHours.Start)
		req.QuietHours.End = strings.TrimSpace(req.QuietHours.End)
	}
	return s.repo.UpdatePreferences(ctx, strings.TrimSpace(userID), *req)
}

func (s *notificationService) GetNotification(ctx context.Context, actor models.AuthClaims, notificationID string) (*models.NotificationDetail, error) {
	if !isAdmin(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.GetNotification(ctx, strings.TrimSpace(notificationID))
}

func canDispatch(role string) bool {
	normalized := normalizeRole(role)
	return normalized == "system" || normalized == "admin"
}

func ownsOrAdmin(actor models.AuthClaims, userID string) bool {
	return strings.TrimSpace(actor.UserID) == strings.TrimSpace(userID) || isAdmin(actor.Role)
}

func isAdmin(role string) bool {
	return normalizeRole(role) == "admin"
}

func normalizeRole(role string) string {
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(role)), "_", "-")
}
