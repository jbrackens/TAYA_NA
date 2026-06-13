package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/phoenixbot/phoenix-cms/internal/models"
	"github.com/phoenixbot/phoenix-cms/internal/repository"
)

var ErrInvalidInput = errors.New("invalid input")

type Service interface {
	CreatePage(ctx context.Context, actor models.AuthClaims, req *models.CreatePageRequest) (*models.PageResponse, error)
	GetPage(ctx context.Context, pageID string) (*models.PageResponse, error)
	ListPages(ctx context.Context, page, limit int) (*models.ListPagesResponse, error)
	CreatePromotion(ctx context.Context, actor models.AuthClaims, req *models.CreatePromotionRequest) (*models.PromotionResponse, error)
	ListPromotions(ctx context.Context) (*models.ListPromotionsResponse, error)
	CreateBanner(ctx context.Context, actor models.AuthClaims, req *models.CreateBannerRequest) (*models.BannerResponse, error)
	ListBanners(ctx context.Context, position string) (*models.ListBannersResponse, error)
}

type cmsService struct {
	logger *slog.Logger
	repo   repository.Repository
}

func NewService(logger *slog.Logger, repo repository.Repository) Service {
	return &cmsService{logger: logger, repo: repo}
}

func (s *cmsService) CreatePage(ctx context.Context, actor models.AuthClaims, req *models.CreatePageRequest) (*models.PageResponse, error) {
	if !canManagePages(actor.Role) { return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput) }
	if req == nil { return nil, fmt.Errorf("%w: request is required", ErrInvalidInput) }
	req.Title = strings.TrimSpace(req.Title)
	req.Slug = strings.TrimSpace(req.Slug)
	req.Content = strings.TrimSpace(req.Content)
	req.MetaTitle = strings.TrimSpace(req.MetaTitle)
	if req.Title == "" || req.Slug == "" || req.Content == "" || req.MetaTitle == "" {
		return nil, fmt.Errorf("%w: title, slug, content, and meta_title are required", ErrInvalidInput)
	}
	return s.repo.CreatePage(ctx, actor.UserID, *req)
}

func (s *cmsService) GetPage(ctx context.Context, pageID string) (*models.PageResponse, error) {
	return s.repo.GetPage(ctx, strings.TrimSpace(pageID))
}

func (s *cmsService) ListPages(ctx context.Context, page, limit int) (*models.ListPagesResponse, error) {
	return s.repo.ListPages(ctx, true, page, limit)
}

func (s *cmsService) CreatePromotion(ctx context.Context, actor models.AuthClaims, req *models.CreatePromotionRequest) (*models.PromotionResponse, error) {
	if !canManagePromotions(actor.Role) { return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput) }
	if req == nil { return nil, fmt.Errorf("%w: request is required", ErrInvalidInput) }
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	req.PromotionType = strings.TrimSpace(req.PromotionType)
	if req.Name == "" || req.Description == "" || req.PromotionType == "" || req.StartDate.IsZero() || req.EndDate.IsZero() || !req.EndDate.After(req.StartDate) {
		return nil, fmt.Errorf("%w: invalid promotion payload", ErrInvalidInput)
	}
	return s.repo.CreatePromotion(ctx, actor.UserID, *req)
}

func (s *cmsService) ListPromotions(ctx context.Context) (*models.ListPromotionsResponse, error) {
	return s.repo.ListPromotions(ctx, true)
}

func (s *cmsService) CreateBanner(ctx context.Context, actor models.AuthClaims, req *models.CreateBannerRequest) (*models.BannerResponse, error) {
	if !canManagePages(actor.Role) { return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput) }
	if req == nil { return nil, fmt.Errorf("%w: request is required", ErrInvalidInput) }
	req.Title = strings.TrimSpace(req.Title)
	req.ImageURL = strings.TrimSpace(req.ImageURL)
	req.Link = strings.TrimSpace(req.Link)
	req.Position = strings.TrimSpace(req.Position)
	if req.Title == "" || req.ImageURL == "" || req.Link == "" || req.Position == "" || req.StartDate.IsZero() || req.EndDate.IsZero() || !req.EndDate.After(req.StartDate) {
		return nil, fmt.Errorf("%w: invalid banner payload", ErrInvalidInput)
	}
	return s.repo.CreateBanner(ctx, actor.UserID, *req)
}

func (s *cmsService) ListBanners(ctx context.Context, position string) (*models.ListBannersResponse, error) {
	return s.repo.ListBanners(ctx, strings.TrimSpace(position))
}

func canManagePages(role string) bool {
	n := normalizeRole(role)
	return n == "content-editor" || n == "admin"
}

func canManagePromotions(role string) bool {
	n := normalizeRole(role)
	return n == "marketing" || n == "operator" || n == "admin"
}

func normalizeRole(role string) string {
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(role)), "_", "-")
}
