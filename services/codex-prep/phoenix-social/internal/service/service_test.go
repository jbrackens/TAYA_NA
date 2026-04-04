package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-social/internal/models"
	"github.com/phoenixbot/phoenix-social/internal/repository"
)

type fakeRepo struct {
	followCalled bool
	feedType     string
	messageReq   models.SendMessageRequest
}

func (f *fakeRepo) GetProfile(ctx context.Context, viewerID, targetID string) (*models.UserProfile, error) {
	if targetID == "missing" {
		return nil, repository.ErrNotFound
	}
	return &models.UserProfile{UserID: targetID, Username: "target", Stats: models.ProfileStats{WinRate: decimal.Zero, TotalProfit: decimal.Zero}}, nil
}

func (f *fakeRepo) FollowUser(ctx context.Context, followerID, targetID string) (*models.Follow, error) {
	f.followCalled = true
	return &models.Follow{FollowerID: followerID, FollowingID: targetID, FollowedAt: time.Now().UTC()}, nil
}

func (f *fakeRepo) ListFollowers(ctx context.Context, userID string, page, limit int) ([]models.FollowerPreview, int, error) {
	return []models.FollowerPreview{{UserID: "u2", Username: "other", FollowStatus: "mutual"}}, 1, nil
}

func (f *fakeRepo) ListFeed(ctx context.Context, userID, feedType string, page, limit int) ([]models.FeedItem, error) {
	f.feedType = feedType
	return []models.FeedItem{{ActivityID: "act_1", UserID: userID, Username: "user", ActivityType: "bet_placed", Details: models.FeedDetails{Stake: decimal.NewFromInt(10), Odds: decimal.RequireFromString("2.50")}, Timestamp: time.Now().UTC()}}, nil
}

func (f *fakeRepo) CreateMessage(ctx context.Context, fromUserID string, req models.SendMessageRequest) (*models.Message, error) {
	f.messageReq = req
	if req.ToUserID == "missing" {
		return nil, repository.ErrNotFound
	}
	return &models.Message{MessageID: "m1", FromUserID: fromUserID, ToUserID: req.ToUserID, Message: req.Message, SentAt: time.Now().UTC()}, nil
}

func (f *fakeRepo) GetConversation(ctx context.Context, requesterID, conversationID string, page, limit int) (*models.Conversation, error) {
	if conversationID == "missing" {
		return nil, repository.ErrNotFound
	}
	return &models.Conversation{ConversationID: conversationID, WithUserID: "u2"}, nil
}

func TestFollowUserRequiresActorOwnership(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.FollowUser(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, "u2", "u3")
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestFollowUserAllowsAdminOverride(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo)
	_, err := svc.FollowUser(context.Background(), models.AuthClaims{UserID: "admin", Role: "admin"}, "u2", "u3")
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if !repo.followCalled {
		t.Fatalf("expected follow repository to be called")
	}
}

func TestListFeedDefaultsToFriends(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo)
	_, err := svc.ListFeed(context.Background(), models.AuthClaims{UserID: "u1"}, "", 1, 20)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if repo.feedType != "friends" {
		t.Fatalf("expected default feed type friends, got %s", repo.feedType)
	}
}

func TestListFeedRejectsInvalidType(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.ListFeed(context.Background(), models.AuthClaims{UserID: "u1"}, "weird", 1, 20)
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestCreateMessageRejectsSelf(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.CreateMessage(context.Background(), models.AuthClaims{UserID: "u1"}, &models.SendMessageRequest{ToUserID: "u1", Message: "hi"})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestGetConversationRequiresAuth(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.GetConversation(context.Background(), models.AuthClaims{}, "conv_1", 1, 20)
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}
