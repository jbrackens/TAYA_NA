package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/phoenixbot/phoenix-cms/internal/models"
)

type fakeRepo struct{}

func (f *fakeRepo) CreatePage(ctx context.Context, actorID string, req models.CreatePageRequest) (*models.PageResponse, error) {
	return &models.PageResponse{PageID: "page_1", Title: req.Title, Slug: req.Slug, Published: req.Published}, nil
}
func (f *fakeRepo) GetPage(ctx context.Context, pageID string) (*models.PageResponse, error) {
	return &models.PageResponse{PageID: pageID, Title: "How to Bet"}, nil
}
func (f *fakeRepo) ListPages(ctx context.Context, published bool, page, limit int) (*models.ListPagesResponse, error) {
	return &models.ListPagesResponse{}, nil
}
func (f *fakeRepo) CreatePromotion(ctx context.Context, actorID string, req models.CreatePromotionRequest) (*models.PromotionResponse, error) {
	return &models.PromotionResponse{PromotionID: "promo_1", Name: req.Name, Status: "scheduled"}, nil
}
func (f *fakeRepo) ListPromotions(ctx context.Context, activeOnly bool) (*models.ListPromotionsResponse, error) {
	return &models.ListPromotionsResponse{}, nil
}
func (f *fakeRepo) CreateBanner(ctx context.Context, actorID string, req models.CreateBannerRequest) (*models.BannerResponse, error) {
	return &models.BannerResponse{BannerID: "banner_1", Title: req.Title, Active: true}, nil
}
func (f *fakeRepo) ListBanners(ctx context.Context, position string) (*models.ListBannersResponse, error) {
	return &models.ListBannersResponse{}, nil
}

func TestCreatePageRequiresContentEditor(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.CreatePage(context.Background(), models.AuthClaims{UserID: "u1", Role: "user"}, &models.CreatePageRequest{Title: "A", Slug: "a", Content: "x", MetaTitle: "m"})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestCreatePromotionAllowsOperator(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	resp, err := svc.CreatePromotion(context.Background(), models.AuthClaims{UserID: "op", Role: "operator"}, &models.CreatePromotionRequest{Name: "Welcome", Description: "Promo", PromotionType: "deposit_bonus", StartDate: time.Now().UTC().Add(time.Hour), EndDate: time.Now().UTC().Add(2 * time.Hour), Active: true})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.PromotionID == "" {
		t.Fatalf("expected promotion id")
	}
}

func TestCreateBannerValidatesWindow(t *testing.T) {
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), &fakeRepo{})
	_, err := svc.CreateBanner(context.Background(), models.AuthClaims{UserID: "admin", Role: "admin"}, &models.CreateBannerRequest{Title: "Hero", ImageURL: "https://cdn.example/banner.jpg", Link: "/promo", Position: "homepage_hero", StartDate: time.Now().UTC(), EndDate: time.Now().UTC()})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}
