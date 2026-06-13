package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/phoenixbot/stella-engagement/internal/models"
)

type fakeRepo struct{}

func (f *fakeRepo) RecordAchievement(ctx context.Context, actorID string, req models.AchievementStreamRequest) (*models.AchievementStreamResponse, error) {
	return &models.AchievementStreamResponse{AchievementID: req.AchievementID, UserID: req.UserID, RewardPoints: req.RewardPoints, Timestamp: time.Now().UTC()}, nil
}
func (f *fakeRepo) CalculatePoints(ctx context.Context, actorID string, req models.PointsCalculateRequest) (*models.PointsCalculateResponse, error) {
	return &models.PointsCalculateResponse{UserID: req.UserID, PointsAwarded: 75, CalculationID: "calc_1"}, nil
}
func (f *fakeRepo) ComputeAggregation(ctx context.Context, actorID string, req models.AggregationComputeRequest) (*models.AggregationComputeResponse, error) {
	return &models.AggregationComputeResponse{AggregationID: "agg_1", UserID: req.UserID, Status: "processing"}, nil
}
func (f *fakeRepo) GetEngagementScore(ctx context.Context, userID string) (*models.EngagementScoreResponse, error) {
	return &models.EngagementScoreResponse{UserID: userID, EngagementScore: 100, Components: map[string]int{"betting_activity": 75, "social_engagement": 0, "achievements": 25}}, nil
}
func (f *fakeRepo) GetLeaderboard(ctx context.Context, limit int) ([]models.LeaderboardEntry, error) { return []models.LeaderboardEntry{}, nil }

func TestRecordAchievementRequiresSystemOrAdmin(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, NewBroadcaster())
	_, err := svc.RecordAchievement(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, &models.AchievementStreamRequest{UserID: "u2", AchievementID: "ach_first", RewardPoints: 10})
	if err == nil || !errors.Is(err, ErrInvalidInput) { t.Fatalf("expected invalid input, got %v", err) }
}

func TestCalculatePointsReturnsCalculation(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, NewBroadcaster())
	resp, err := svc.CalculatePoints(context.Background(), models.AuthClaims{UserID: "sys", Role: "system"}, &models.PointsCalculateRequest{UserID: "u1", EventType: "bet_placed", EventData: map[string]any{"stake": 50}})
	if err != nil { t.Fatalf("unexpected error: %v", err) }
	if resp.CalculationID == "" || resp.PointsAwarded == 0 { t.Fatalf("expected points response, got %+v", resp) }
}

func TestGetEngagementScoreRequiresOwnershipOrPrivilege(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{}, NewBroadcaster())
	_, err := svc.GetEngagementScore(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, "u2")
	if err == nil || !errors.Is(err, ErrInvalidInput) { t.Fatalf("expected invalid input, got %v", err) }
}
