package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/phoenixbot/stella-engagement/internal/models"
	"github.com/phoenixbot/stella-engagement/internal/repository"
)

var ErrInvalidInput = errors.New("invalid input")

type Service interface {
	RecordAchievement(ctx context.Context, actor models.AuthClaims, req *models.AchievementStreamRequest) (*models.AchievementStreamResponse, error)
	CalculatePoints(ctx context.Context, actor models.AuthClaims, req *models.PointsCalculateRequest) (*models.PointsCalculateResponse, error)
	ComputeAggregation(ctx context.Context, actor models.AuthClaims, req *models.AggregationComputeRequest) (*models.AggregationComputeResponse, error)
	GetEngagementScore(ctx context.Context, actor models.AuthClaims, userID string) (*models.EngagementScoreResponse, error)
	CurrentLeaderboard(ctx context.Context, limit int) ([]models.LeaderboardEntry, error)
	Broadcaster() Broadcaster
}

type engagementService struct { logger *slog.Logger; repo repository.Repository; broadcaster Broadcaster }

func NewService(logger *slog.Logger, repo repository.Repository, broadcaster Broadcaster) Service {
	return &engagementService{logger: logger, repo: repo, broadcaster: broadcaster}
}

func (s *engagementService) RecordAchievement(ctx context.Context, actor models.AuthClaims, req *models.AchievementStreamRequest) (*models.AchievementStreamResponse, error) {
	if !canProcess(actor.Role) { return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput) }
	if req == nil { return nil, fmt.Errorf("%w: request is required", ErrInvalidInput) }
	req.UserID = strings.TrimSpace(req.UserID)
	req.AchievementID = strings.TrimSpace(req.AchievementID)
	req.EventType = strings.TrimSpace(req.EventType)
	if req.UserID == "" || req.AchievementID == "" || req.RewardPoints <= 0 { return nil, fmt.Errorf("%w: invalid achievement payload", ErrInvalidInput) }
	resp, err := s.repo.RecordAchievement(ctx, actor.UserID, *req)
	if err != nil { return nil, err }
	s.broadcaster.PublishAchievement(req.UserID, resp)
	entries, err := s.repo.GetLeaderboard(ctx, 10)
	if err == nil { s.broadcaster.PublishLeaderboard(models.LeaderboardMessage{EventType: "leaderboard_update", LeaderboardType: "weekly_points", Entries: entries}) }
	return resp, nil
}

func (s *engagementService) CalculatePoints(ctx context.Context, actor models.AuthClaims, req *models.PointsCalculateRequest) (*models.PointsCalculateResponse, error) {
	if !canProcess(actor.Role) { return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput) }
	if req == nil { return nil, fmt.Errorf("%w: request is required", ErrInvalidInput) }
	req.UserID = strings.TrimSpace(req.UserID)
	req.EventType = strings.TrimSpace(req.EventType)
	if req.UserID == "" || req.EventType == "" { return nil, fmt.Errorf("%w: invalid points payload", ErrInvalidInput) }
	resp, err := s.repo.CalculatePoints(ctx, actor.UserID, *req)
	if err != nil { return nil, err }
	entries, err := s.repo.GetLeaderboard(ctx, 10)
	if err == nil { s.broadcaster.PublishLeaderboard(models.LeaderboardMessage{EventType: "leaderboard_update", LeaderboardType: "weekly_points", Entries: entries}) }
	return resp, nil
}

func (s *engagementService) ComputeAggregation(ctx context.Context, actor models.AuthClaims, req *models.AggregationComputeRequest) (*models.AggregationComputeResponse, error) {
	if !canAggregate(actor.Role) { return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput) }
	if req == nil { return nil, fmt.Errorf("%w: request is required", ErrInvalidInput) }
	req.UserID = strings.TrimSpace(req.UserID)
	req.AggregationType = strings.TrimSpace(req.AggregationType)
	req.Period = strings.TrimSpace(req.Period)
	if req.UserID == "" || req.AggregationType == "" || req.Period == "" { return nil, fmt.Errorf("%w: invalid aggregation payload", ErrInvalidInput) }
	return s.repo.ComputeAggregation(ctx, actor.UserID, *req)
}

func (s *engagementService) GetEngagementScore(ctx context.Context, actor models.AuthClaims, userID string) (*models.EngagementScoreResponse, error) {
	if !ownsOrPrivileged(actor, userID) { return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput) }
	return s.repo.GetEngagementScore(ctx, strings.TrimSpace(userID))
}

func (s *engagementService) CurrentLeaderboard(ctx context.Context, limit int) ([]models.LeaderboardEntry, error) {
	return s.repo.GetLeaderboard(ctx, limit)
}
func (s *engagementService) Broadcaster() Broadcaster { return s.broadcaster }

func canProcess(role string) bool { n := normalizeRole(role); return n == "system" || n == "admin" }
func canAggregate(role string) bool { n := normalizeRole(role); return n == "system" || n == "admin" || n == "analyst" }
func ownsOrPrivileged(actor models.AuthClaims, userID string) bool { n := normalizeRole(actor.Role); return strings.TrimSpace(actor.UserID) == strings.TrimSpace(userID) || n == "admin" || n == "analyst" || n == "system" }
func normalizeRole(role string) string { return strings.ToLower(strings.ReplaceAll(strings.TrimSpace(role), "_", "-")) }
