package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/phoenixbot/phoenix-social/internal/models"
	"github.com/phoenixbot/phoenix-social/internal/repository"
)

var ErrInvalidInput = errors.New("invalid input")

type Service interface {
	GetProfile(ctx context.Context, viewer models.AuthClaims, targetID string) (*models.UserProfile, error)
	FollowUser(ctx context.Context, actor models.AuthClaims, actorUserID, targetUserID string) (*models.Follow, error)
	ListFollowers(ctx context.Context, userID string, page, limit int) (*models.FollowersResponse, error)
	ListFeed(ctx context.Context, actor models.AuthClaims, feedType string, page, limit int) (*models.FeedResponse, error)
	CreateMessage(ctx context.Context, actor models.AuthClaims, req *models.SendMessageRequest) (*models.Message, error)
	GetConversation(ctx context.Context, actor models.AuthClaims, conversationID string, page, limit int) (*models.Conversation, error)
}

type socialService struct {
	logger *slog.Logger
	repo   repository.Repository
}

func NewService(logger *slog.Logger, repo repository.Repository) Service {
	return &socialService{logger: logger, repo: repo}
}

func (s *socialService) GetProfile(ctx context.Context, viewer models.AuthClaims, targetID string) (*models.UserProfile, error) {
	targetID = strings.TrimSpace(targetID)
	if targetID == "" {
		return nil, fmt.Errorf("%w: user_id is required", ErrInvalidInput)
	}
	return s.repo.GetProfile(ctx, viewer.UserID, targetID)
}

func (s *socialService) FollowUser(ctx context.Context, actor models.AuthClaims, actorUserID, targetUserID string) (*models.Follow, error) {
	actorUserID = strings.TrimSpace(actorUserID)
	targetUserID = strings.TrimSpace(targetUserID)
	if actor.UserID == "" {
		return nil, fmt.Errorf("%w: authentication required", ErrInvalidInput)
	}
	if actorUserID == "" || targetUserID == "" {
		return nil, fmt.Errorf("%w: user ids are required", ErrInvalidInput)
	}
	if actorUserID == targetUserID {
		return nil, fmt.Errorf("%w: cannot follow yourself", ErrInvalidInput)
	}
	if actor.UserID != actorUserID && !canModerate(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.FollowUser(ctx, actorUserID, targetUserID)
}

func (s *socialService) ListFollowers(ctx context.Context, userID string, page, limit int) (*models.FollowersResponse, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, fmt.Errorf("%w: user_id is required", ErrInvalidInput)
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	items, total, err := s.repo.ListFollowers(ctx, userID, page, limit)
	if err != nil {
		return nil, err
	}
	return &models.FollowersResponse{Data: items, Pagination: models.Pagination{Page: page, Limit: limit, Total: total}}, nil
}

func (s *socialService) ListFeed(ctx context.Context, actor models.AuthClaims, feedType string, page, limit int) (*models.FeedResponse, error) {
	if actor.UserID == "" {
		return nil, fmt.Errorf("%w: authentication required", ErrInvalidInput)
	}
	feedType = strings.ToLower(strings.TrimSpace(feedType))
	if feedType == "" {
		feedType = "friends"
	}
	if feedType != "friends" && feedType != "all" {
		return nil, fmt.Errorf("%w: feed_type must be friends or all", ErrInvalidInput)
	}
	items, err := s.repo.ListFeed(ctx, actor.UserID, feedType, page, limit)
	if err != nil {
		return nil, err
	}
	return &models.FeedResponse{Data: items}, nil
}

func (s *socialService) CreateMessage(ctx context.Context, actor models.AuthClaims, req *models.SendMessageRequest) (*models.Message, error) {
	if actor.UserID == "" {
		return nil, fmt.Errorf("%w: authentication required", ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	req.ToUserID = strings.TrimSpace(req.ToUserID)
	req.Message = strings.TrimSpace(req.Message)
	req.MessageType = strings.ToLower(strings.TrimSpace(req.MessageType))
	if req.ToUserID == "" || req.Message == "" {
		return nil, fmt.Errorf("%w: to_user_id and message are required", ErrInvalidInput)
	}
	if req.ToUserID == actor.UserID {
		return nil, fmt.Errorf("%w: cannot message yourself", ErrInvalidInput)
	}
	if req.MessageType == "" {
		req.MessageType = "text"
	}
	if req.MessageType != "text" && req.MessageType != "system" {
		return nil, fmt.Errorf("%w: unsupported message_type", ErrInvalidInput)
	}
	return s.repo.CreateMessage(ctx, actor.UserID, *req)
}

func (s *socialService) GetConversation(ctx context.Context, actor models.AuthClaims, conversationID string, page, limit int) (*models.Conversation, error) {
	if actor.UserID == "" {
		return nil, fmt.Errorf("%w: authentication required", ErrInvalidInput)
	}
	conversationID = strings.TrimSpace(conversationID)
	if conversationID == "" {
		return nil, fmt.Errorf("%w: conversation_id is required", ErrInvalidInput)
	}
	return s.repo.GetConversation(ctx, actor.UserID, conversationID, page, limit)
}

func canModerate(role string) bool {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "admin", "moderator":
		return true
	default:
		return false
	}
}
