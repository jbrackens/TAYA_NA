package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/phoenixbot/phoenix-notification/internal/models"
)

type fakeRepo struct{}

func (f *fakeRepo) CreateNotification(ctx context.Context, actorID string, req models.SendNotificationRequest) (*models.SendNotificationResponse, error) {
	return &models.SendNotificationResponse{NotificationID: "notif_1", UserID: req.UserID, Status: "queued", QueuedAt: time.Now().UTC()}, nil
}
func (f *fakeRepo) ListTemplates(ctx context.Context) (*models.TemplatesResponse, error) {
	return &models.TemplatesResponse{Data: []models.Template{{TemplateID: "bet_settled_win"}}}, nil
}
func (f *fakeRepo) UpdateNotificationStatus(ctx context.Context, actorID, notificationID string, req models.UpdateNotificationStatusRequest) (*models.UpdateNotificationStatusResponse, error) {
	return &models.UpdateNotificationStatusResponse{NotificationID: notificationID, ChannelStatuses: map[string]string{req.Channel: req.Status}}, nil
}
func (f *fakeRepo) GetPreferences(ctx context.Context, userID string) (*models.NotificationPreferencesResponse, error) {
	return &models.NotificationPreferencesResponse{UserID: userID}, nil
}
func (f *fakeRepo) UpdatePreferences(ctx context.Context, userID string, req models.UpdateNotificationPreferencesRequest) (*models.UpdateNotificationPreferencesResponse, error) {
	return &models.UpdateNotificationPreferencesResponse{UserID: userID, UpdatedAt: time.Now().UTC()}, nil
}
func (f *fakeRepo) GetNotification(ctx context.Context, notificationID string) (*models.NotificationDetail, error) {
	return &models.NotificationDetail{NotificationID: notificationID}, nil
}

func TestCreateNotificationRequiresSystemOrAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.CreateNotification(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, &models.SendNotificationRequest{UserID: "u2", NotificationType: "bet_settled", Channels: []string{"email"}})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestGetPreferencesAllowsOwner(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.GetPreferences(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, "u1")
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
}

func TestListTemplatesRequiresAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.ListTemplates(context.Background(), models.AuthClaims{UserID: "u1", Role: "system"})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestUpdateStatusAllowsSystem(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.UpdateNotificationStatus(context.Background(), models.AuthClaims{UserID: "svc", Role: "system"}, "notif_1", &models.UpdateNotificationStatusRequest{Channel: "email", Status: "delivered"})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
}
