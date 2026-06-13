package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-retention/internal/client"
	"github.com/phoenixbot/phoenix-retention/internal/models"
	"github.com/phoenixbot/phoenix-retention/internal/repository"
)

var ErrInvalidInput = errors.New("invalid input")
var ErrForbidden = errors.New("forbidden")

type Service interface {
	UnlockAchievement(ctx context.Context, userID string, req models.UnlockAchievementRequest) (*models.UnlockAchievementResponse, error)
	GetUserAchievements(ctx context.Context, claims *models.AuthClaims, userID string) (*models.UserAchievementsResponse, error)
	ListLeaderboards(ctx context.Context, filters models.LeaderboardFilters) (*models.LeaderboardResponse, error)
	CreateCampaign(ctx context.Context, claims *models.AuthClaims, req models.CreateCampaignRequest) (*models.CreateCampaignResponse, error)
	GetLoyaltyPoints(ctx context.Context, claims *models.AuthClaims, userID string) (*models.LoyaltyPointsResponse, error)
	RedeemLoyaltyPoints(ctx context.Context, claims *models.AuthClaims, authHeader, userID string, req models.RedeemPointsRequest) (*models.RedeemPointsResponse, error)
	ListFreebets(ctx context.Context, claims *models.AuthClaims, userID, status string) (*models.FreebetListResponse, error)
	GetFreebet(ctx context.Context, claims *models.AuthClaims, freebetID string) (*models.FreebetResponse, error)
	ListOddsBoosts(ctx context.Context, claims *models.AuthClaims, userID, status string) (*models.OddsBoostListResponse, error)
	GetOddsBoost(ctx context.Context, claims *models.AuthClaims, oddsBoostID string) (*models.OddsBoostResponse, error)
	AcceptOddsBoost(ctx context.Context, claims *models.AuthClaims, oddsBoostID string, req models.OddsBoostAcceptRequest) (*models.OddsBoostResponse, error)
}

type retentionService struct {
	logger   *slog.Logger
	repo     repository.Repository
	wallet   client.WalletClient
	redis    *redis.Client
	cacheTTL time.Duration
}

func NewService(logger *slog.Logger, repo repository.Repository, wallet client.WalletClient, redisClient *redis.Client, leaderboardTTL time.Duration) Service {
	return &retentionService{logger: logger, repo: repo, wallet: wallet, redis: redisClient, cacheTTL: leaderboardTTL}
}

func (s *retentionService) UnlockAchievement(ctx context.Context, userID string, req models.UnlockAchievementRequest) (*models.UnlockAchievementResponse, error) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(req.AchievementID) == "" {
		return nil, ErrInvalidInput
	}
	if req.RewardPoints < 0 {
		return nil, ErrInvalidInput
	}
	return s.repo.UnlockAchievement(ctx, userID, req)
}

func (s *retentionService) GetUserAchievements(ctx context.Context, claims *models.AuthClaims, userID string) (*models.UserAchievementsResponse, error) {
	if !canAccessUser(claims, userID) {
		return nil, ErrForbidden
	}
	items, err := s.repo.ListUserAchievements(ctx, userID)
	if err != nil {
		return nil, err
	}
	loyalty, err := s.repo.GetLoyaltyState(ctx, userID, 10)
	if err != nil {
		return nil, err
	}
	response := &models.UserAchievementsResponse{UserID: userID, Achievements: make([]models.UserAchievement, 0, len(items)), TotalPoints: loyalty.TotalPoints}
	for _, item := range items {
		response.Achievements = append(response.Achievements, models.UserAchievement{
			AchievementID: item.AchievementID,
			Description:   item.Description,
			UnlockedAt:    item.UnlockedAt,
			RewardPoints:  item.RewardPoints,
			BadgeImage:    item.BadgeImage,
		})
	}
	return response, nil
}

func (s *retentionService) ListLeaderboards(ctx context.Context, filters models.LeaderboardFilters) (*models.LeaderboardResponse, error) {
	if filters.Limit <= 0 || filters.Limit > 100 {
		filters.Limit = 20
	}
	if filters.Offset < 0 {
		filters.Offset = 0
	}
	cacheKey := fmt.Sprintf("retention:leaderboard:%s:%s:%d:%d", strings.ToLower(filters.Period), strings.ToLower(filters.Metric), filters.Limit, filters.Offset)
	if s.redis != nil {
		if cached, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
			var response models.LeaderboardResponse
			if jsonErr := json.Unmarshal([]byte(cached), &response); jsonErr == nil {
				return &response, nil
			}
		}
	}
	response, err := s.repo.ListLeaderboard(ctx, filters)
	if err != nil {
		return nil, err
	}
	if s.redis != nil {
		if payload, err := json.Marshal(response); err == nil {
			_ = s.redis.Set(ctx, cacheKey, payload, s.cacheTTL).Err()
		}
	}
	return response, nil
}

func (s *retentionService) CreateCampaign(ctx context.Context, claims *models.AuthClaims, req models.CreateCampaignRequest) (*models.CreateCampaignResponse, error) {
	if claims == nil || !hasOneOfRoles(claims.Role, "admin", "moderator", "marketing") {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(req.Name) == "" || req.StartDate.IsZero() || req.EndDate.IsZero() || req.EndDate.Before(req.StartDate) {
		return nil, ErrInvalidInput
	}
	actorID := "system"
	if claims.UserID != "" {
		actorID = claims.UserID
	}
	return s.repo.CreateCampaign(ctx, req, actorID)
}

func (s *retentionService) GetLoyaltyPoints(ctx context.Context, claims *models.AuthClaims, userID string) (*models.LoyaltyPointsResponse, error) {
	if !canAccessUser(claims, userID) {
		return nil, ErrForbidden
	}
	return s.repo.GetLoyaltyState(ctx, userID, 20)
}

func (s *retentionService) RedeemLoyaltyPoints(ctx context.Context, claims *models.AuthClaims, authHeader, userID string, req models.RedeemPointsRequest) (*models.RedeemPointsResponse, error) {
	if !canAccessUser(claims, userID) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(req.RewardID) == "" || req.PointsToRedeem <= 0 {
		return nil, ErrInvalidInput
	}
	state, err := s.repo.GetLoyaltyState(ctx, userID, 20)
	if err != nil {
		return nil, err
	}
	if state.AvailablePoints < req.PointsToRedeem {
		return nil, ErrInvalidInput
	}
	rewardValue := decimal.NewFromInt(int64(req.PointsToRedeem)).Div(decimal.NewFromInt(100))
	if err := s.wallet.CreditReward(ctx, authHeader, userID, req.RewardID, rewardValue); err != nil {
		return nil, err
	}
	return s.repo.RedeemLoyaltyPoints(ctx, userID, req, rewardValue)
}

func (s *retentionService) ListFreebets(ctx context.Context, claims *models.AuthClaims, userID, status string) (*models.FreebetListResponse, error) {
	if userID == "" && claims != nil {
		userID = claims.UserID
	}
	if !canAccessUser(claims, userID) {
		return nil, ErrForbidden
	}
	return s.repo.ListFreebets(ctx, userID, status)
}

func (s *retentionService) GetFreebet(ctx context.Context, claims *models.AuthClaims, freebetID string) (*models.FreebetResponse, error) {
	if strings.TrimSpace(freebetID) == "" {
		return nil, ErrInvalidInput
	}
	item, err := s.repo.GetFreebet(ctx, freebetID)
	if err != nil {
		return nil, err
	}
	if !canAccessUser(claims, item.PlayerID) {
		return nil, ErrForbidden
	}
	return item, nil
}

func (s *retentionService) ListOddsBoosts(ctx context.Context, claims *models.AuthClaims, userID, status string) (*models.OddsBoostListResponse, error) {
	if userID == "" && claims != nil {
		userID = claims.UserID
	}
	if !canAccessUser(claims, userID) {
		return nil, ErrForbidden
	}
	return s.repo.ListOddsBoosts(ctx, userID, status)
}

func (s *retentionService) GetOddsBoost(ctx context.Context, claims *models.AuthClaims, oddsBoostID string) (*models.OddsBoostResponse, error) {
	if strings.TrimSpace(oddsBoostID) == "" {
		return nil, ErrInvalidInput
	}
	item, err := s.repo.GetOddsBoost(ctx, oddsBoostID)
	if err != nil {
		return nil, err
	}
	if !canAccessUser(claims, item.PlayerID) {
		return nil, ErrForbidden
	}
	return item, nil
}

func (s *retentionService) AcceptOddsBoost(ctx context.Context, claims *models.AuthClaims, oddsBoostID string, req models.OddsBoostAcceptRequest) (*models.OddsBoostResponse, error) {
	if strings.TrimSpace(oddsBoostID) == "" || strings.TrimSpace(req.UserID) == "" || strings.TrimSpace(req.RequestID) == "" {
		return nil, ErrInvalidInput
	}
	if !canAccessUser(claims, req.UserID) {
		return nil, ErrForbidden
	}
	item, err := s.repo.GetOddsBoost(ctx, oddsBoostID)
	if err != nil {
		return nil, err
	}
	if item.PlayerID != req.UserID {
		return nil, ErrForbidden
	}
	if strings.ToLower(item.Status) != "available" {
		return nil, repository.ErrConflict
	}
	return s.repo.AcceptOddsBoost(ctx, oddsBoostID, req)
}

func canAccessUser(claims *models.AuthClaims, userID string) bool {
	if claims == nil {
		return false
	}
	if claims.UserID == userID {
		return true
	}
	return hasOneOfRoles(claims.Role, "admin", "moderator")
}

func hasOneOfRoles(role string, allowed ...string) bool {
	role = strings.ToLower(strings.TrimSpace(role))
	for _, candidate := range allowed {
		if role == strings.ToLower(candidate) {
			return true
		}
	}
	return false
}
