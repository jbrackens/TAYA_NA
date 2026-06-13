package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-retention/internal/models"
	"github.com/phoenixbot/phoenix-retention/internal/repository"
)

type repoStub struct {
	unlockResp   *models.UnlockAchievementResponse
	achievements []models.AchievementRecord
	loyalty      *models.LoyaltyPointsResponse
	campaignResp *models.CreateCampaignResponse
	redeemResp   *models.RedeemPointsResponse
	redeemCalled bool
	freebets     *models.FreebetListResponse
	freebet      *models.FreebetResponse
	oddsBoosts   *models.OddsBoostListResponse
	oddsBoost    *models.OddsBoostResponse
	acceptedOdds *models.OddsBoostResponse
	acceptCalled bool
}

func (r *repoStub) ValidateUserExists(context.Context, string) error { return nil }
func (r *repoStub) UnlockAchievement(_ context.Context, _ string, _ models.UnlockAchievementRequest) (*models.UnlockAchievementResponse, error) {
	return r.unlockResp, nil
}
func (r *repoStub) ListUserAchievements(context.Context, string) ([]models.AchievementRecord, error) {
	return r.achievements, nil
}
func (r *repoStub) ListLeaderboard(context.Context, models.LeaderboardFilters) (*models.LeaderboardResponse, error) {
	return &models.LeaderboardResponse{LeaderboardType: "weekly", Metric: "points"}, nil
}
func (r *repoStub) CreateCampaign(context.Context, models.CreateCampaignRequest, string) (*models.CreateCampaignResponse, error) {
	return r.campaignResp, nil
}
func (r *repoStub) GetLoyaltyState(context.Context, string, int) (*models.LoyaltyPointsResponse, error) {
	return r.loyalty, nil
}
func (r *repoStub) RedeemLoyaltyPoints(_ context.Context, _ string, _ models.RedeemPointsRequest, _ decimal.Decimal) (*models.RedeemPointsResponse, error) {
	r.redeemCalled = true
	return r.redeemResp, nil
}
func (r *repoStub) ListFreebets(context.Context, string, string) (*models.FreebetListResponse, error) {
	return r.freebets, nil
}
func (r *repoStub) GetFreebet(context.Context, string) (*models.FreebetResponse, error) {
	return r.freebet, nil
}
func (r *repoStub) ListOddsBoosts(context.Context, string, string) (*models.OddsBoostListResponse, error) {
	return r.oddsBoosts, nil
}
func (r *repoStub) GetOddsBoost(context.Context, string) (*models.OddsBoostResponse, error) {
	return r.oddsBoost, nil
}
func (r *repoStub) AcceptOddsBoost(_ context.Context, _ string, _ models.OddsBoostAcceptRequest) (*models.OddsBoostResponse, error) {
	r.acceptCalled = true
	return r.acceptedOdds, nil
}

type walletStub struct {
	err    error
	called bool
	amount decimal.Decimal
}

func (w *walletStub) CreditReward(_ context.Context, _ string, _ string, _ string, amount decimal.Decimal) error {
	w.called = true
	w.amount = amount
	return w.err
}

func testService(repo *repoStub, wallet *walletStub) Service {
	return NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo, wallet, nil, 30*time.Second)
}

func TestRedeemLoyaltyPointsSuccess(t *testing.T) {
	repo := &repoStub{loyalty: &models.LoyaltyPointsResponse{UserID: "u1", AvailablePoints: 500, TotalPoints: 500}, redeemResp: &models.RedeemPointsResponse{UserID: "u1", RewardID: "reward", PointsRedeemed: 500}}
	wallet := &walletStub{}
	svc := testService(repo, wallet)
	resp, err := svc.RedeemLoyaltyPoints(context.Background(), &models.AuthClaims{UserID: "u1", Role: "user"}, "Bearer token", "u1", models.RedeemPointsRequest{RewardID: "reward", PointsToRedeem: 500})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !wallet.called {
		t.Fatal("wallet client was not called")
	}
	if wallet.amount.StringFixed(2) != "5.00" {
		t.Fatalf("reward value = %s, want 5.00", wallet.amount.StringFixed(2))
	}
	if !repo.redeemCalled || resp == nil {
		t.Fatal("redeem repository was not called")
	}
}

func TestRedeemLoyaltyPointsRejectsInsufficientBalance(t *testing.T) {
	repo := &repoStub{loyalty: &models.LoyaltyPointsResponse{UserID: "u1", AvailablePoints: 100, TotalPoints: 100}}
	wallet := &walletStub{}
	svc := testService(repo, wallet)
	_, err := svc.RedeemLoyaltyPoints(context.Background(), &models.AuthClaims{UserID: "u1", Role: "user"}, "", "u1", models.RedeemPointsRequest{RewardID: "reward", PointsToRedeem: 500})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("error = %v, want ErrInvalidInput", err)
	}
	if wallet.called {
		t.Fatal("wallet should not be called")
	}
}

func TestGetUserAchievementsRequiresOwnership(t *testing.T) {
	repo := &repoStub{}
	svc := testService(repo, &walletStub{})
	_, err := svc.GetUserAchievements(context.Background(), &models.AuthClaims{UserID: "u2", Role: "user"}, "u1")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("error = %v, want ErrForbidden", err)
	}
}

func TestCreateCampaignRequiresPrivilegedRole(t *testing.T) {
	repo := &repoStub{campaignResp: &models.CreateCampaignResponse{CampaignID: "c1", Name: "Spring", Status: "scheduled", CreatedAt: time.Now().UTC()}}
	svc := testService(repo, &walletStub{})
	_, err := svc.CreateCampaign(context.Background(), &models.AuthClaims{UserID: "u1", Role: "user"}, models.CreateCampaignRequest{Name: "Spring", StartDate: time.Now().Add(time.Hour), EndDate: time.Now().Add(2 * time.Hour)})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("error = %v, want ErrForbidden", err)
	}
}

func TestListFreebetsRequiresOwnership(t *testing.T) {
	repo := &repoStub{}
	svc := testService(repo, &walletStub{})
	_, err := svc.ListFreebets(context.Background(), &models.AuthClaims{UserID: "u2", Role: "user"}, "u1", "active")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("error = %v, want ErrForbidden", err)
	}
}

func TestAcceptOddsBoostSuccess(t *testing.T) {
	item := &models.OddsBoostResponse{OddsBoostID: "ob1", PlayerID: "u1", Status: "available"}
	repo := &repoStub{
		oddsBoost:    item,
		acceptedOdds: &models.OddsBoostResponse{OddsBoostID: "ob1", PlayerID: "u1", Status: "accepted"},
	}
	svc := testService(repo, &walletStub{})
	resp, err := svc.AcceptOddsBoost(context.Background(), &models.AuthClaims{UserID: "u1", Role: "user"}, "ob1", models.OddsBoostAcceptRequest{UserID: "u1", RequestID: "req-1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !repo.acceptCalled {
		t.Fatal("expected repo accept to be called")
	}
	if resp == nil || resp.Status != "accepted" {
		t.Fatalf("unexpected response: %+v", resp)
	}
}

func TestAcceptOddsBoostRejectsUnavailableItem(t *testing.T) {
	repo := &repoStub{
		oddsBoost: &models.OddsBoostResponse{OddsBoostID: "ob1", PlayerID: "u1", Status: "accepted"},
	}
	svc := testService(repo, &walletStub{})
	_, err := svc.AcceptOddsBoost(context.Background(), &models.AuthClaims{UserID: "u1", Role: "user"}, "ob1", models.OddsBoostAcceptRequest{UserID: "u1", RequestID: "req-1"})
	if !errors.Is(err, repository.ErrConflict) {
		t.Fatalf("error = %v, want repository.ErrConflict", err)
	}
}
