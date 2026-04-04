package repository

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/phoenixbot/phoenix-cms/internal/models"
)

var ErrNotFound = errors.New("not found")

type Repository interface {
	CreatePage(ctx context.Context, actorID string, req models.CreatePageRequest) (*models.PageResponse, error)
	GetPage(ctx context.Context, pageID string) (*models.PageResponse, error)
	ListPages(ctx context.Context, published bool, page, limit int) (*models.ListPagesResponse, error)
	CreatePromotion(ctx context.Context, actorID string, req models.CreatePromotionRequest) (*models.PromotionResponse, error)
	ListPromotions(ctx context.Context, activeOnly bool) (*models.ListPromotionsResponse, error)
	CreateBanner(ctx context.Context, actorID string, req models.CreateBannerRequest) (*models.BannerResponse, error)
	ListBanners(ctx context.Context, position string) (*models.ListBannersResponse, error)
}

type PostgresRepository struct{ pool *pgxpool.Pool }

func NewRepository(pool *pgxpool.Pool) Repository { return &PostgresRepository{pool: pool} }

func (r *PostgresRepository) CreatePage(ctx context.Context, actorID string, req models.CreatePageRequest) (*models.PageResponse, error) {
	now := time.Now().UTC()
	pageID := uuid.NewString()
	var publishedAt *time.Time
	if req.Published {
		publishedAt = &now
	}
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil { return nil, err }
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, actorID); err != nil { return nil, err }
	_, err = tx.Exec(ctx, `INSERT INTO cms_pages (id, title, slug, content, meta_title, published, published_at, created_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NULLIF($8,'')::uuid,$9,$9)`, pageID, req.Title, req.Slug, req.Content, req.MetaTitle, req.Published, publishedAt, actorID, now)
	if err != nil { return nil, err }
	if err := appendEventTx(ctx, tx, "cms-page", pageID, "PageCreated", map[string]any{"page_id": pageID, "slug": req.Slug, "published": req.Published, "created_at": now.Format(time.RFC3339)}); err != nil { return nil, err }
	if req.Published {
		if err := appendOutboxTx(ctx, tx, "cms-page", pageID, "PagePublished", map[string]any{"page_id": pageID, "slug": req.Slug, "published_at": now.Format(time.RFC3339)}, "phoenix.cms.page-published"); err != nil { return nil, err }
	}
	if err := tx.Commit(ctx); err != nil { return nil, err }
	return &models.PageResponse{PageID: pageID, Title: req.Title, Slug: req.Slug, Published: req.Published, CreatedAt: now}, nil
}

func (r *PostgresRepository) GetPage(ctx context.Context, pageID string) (*models.PageResponse, error) {
	item := &models.PageResponse{}
	if err := r.pool.QueryRow(ctx, `SELECT id, title, slug, content, meta_title, published_at FROM cms_pages WHERE id = $1 AND published = TRUE`, pageID).Scan(&item.PageID, &item.Title, &item.Slug, &item.Content, &item.MetaTitle, &item.PublishedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
		return nil, err
	}
	return item, nil
}

func (r *PostgresRepository) ListPages(ctx context.Context, published bool, page, limit int) (*models.ListPagesResponse, error) {
	if page < 1 { page = 1 }
	if limit < 1 || limit > 100 { limit = 20 }
	offset := (page - 1) * limit
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM cms_pages WHERE published = $1`, published).Scan(&total); err != nil { return nil, err }
	rows, err := r.pool.Query(ctx, `SELECT id, title, slug, published_at FROM cms_pages WHERE published = $1 ORDER BY COALESCE(published_at, created_at) DESC LIMIT $2 OFFSET $3`, published, limit, offset)
	if err != nil { return nil, err }
	defer rows.Close()
	resp := &models.ListPagesResponse{Data: []models.PageResponse{}, Pagination: models.Pagination{Page: page, Limit: limit, Total: total}}
	for rows.Next() {
		var item models.PageResponse
		if err := rows.Scan(&item.PageID, &item.Title, &item.Slug, &item.PublishedAt); err != nil { return nil, err }
		resp.Data = append(resp.Data, item)
	}
	return resp, rows.Err()
}

func (r *PostgresRepository) CreatePromotion(ctx context.Context, actorID string, req models.CreatePromotionRequest) (*models.PromotionResponse, error) {
	now := time.Now().UTC()
	promotionID := uuid.NewString()
	status := promotionStatus(req.Active, req.StartDate, req.EndDate, now)
	rules := defaultMap(req.Rules)
	body, err := json.Marshal(rules)
	if err != nil { return nil, err }
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil { return nil, err }
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, actorID); err != nil { return nil, err }
	_, err = tx.Exec(ctx, `INSERT INTO cms_promotions (id, name, description, promotion_type, rules, start_date, end_date, active, created_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULLIF($9,'')::uuid,$10,$10)`, promotionID, req.Name, req.Description, req.PromotionType, body, req.StartDate.UTC(), req.EndDate.UTC(), req.Active, actorID, now)
	if err != nil { return nil, err }
	if err := appendEventTx(ctx, tx, "cms-promotion", promotionID, "PromotionCreated", map[string]any{"promotion_id": promotionID, "promotion_type": req.PromotionType, "status": status, "created_at": now.Format(time.RFC3339)}); err != nil { return nil, err }
	if err := appendOutboxTx(ctx, tx, "cms-promotion", promotionID, "PromotionCreated", map[string]any{"promotion_id": promotionID, "status": status, "start_date": req.StartDate.UTC().Format(time.RFC3339)}, "stella.campaign.triggered"); err != nil { return nil, err }
	if err := tx.Commit(ctx); err != nil { return nil, err }
	return &models.PromotionResponse{PromotionID: promotionID, Name: req.Name, Status: status, CreatedAt: now}, nil
}

func (r *PostgresRepository) ListPromotions(ctx context.Context, activeOnly bool) (*models.ListPromotionsResponse, error) {
	now := time.Now().UTC()
	query := `SELECT id, name, promotion_type, active, start_date, end_date, created_at FROM cms_promotions`
	args := []any{}
	if activeOnly {
		query += ` WHERE active = TRUE AND start_date <= $1 AND end_date >= $1`
		args = append(args, now)
	}
	query += ` ORDER BY created_at DESC`
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil { return nil, err }
	defer rows.Close()
	resp := &models.ListPromotionsResponse{Data: []models.PromotionResponse{}}
	for rows.Next() {
		var item models.PromotionResponse
		var startDate, endDate time.Time
		if err := rows.Scan(&item.PromotionID, &item.Name, &item.PromotionType, &item.Active, &startDate, &endDate, &item.CreatedAt); err != nil { return nil, err }
		item.Status = promotionStatus(item.Active, startDate, endDate, now)
		resp.Data = append(resp.Data, item)
	}
	return resp, rows.Err()
}

func (r *PostgresRepository) CreateBanner(ctx context.Context, actorID string, req models.CreateBannerRequest) (*models.BannerResponse, error) {
	now := time.Now().UTC()
	bannerID := uuid.NewString()
	active := !now.Before(req.StartDate.UTC()) && !now.After(req.EndDate.UTC())
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil { return nil, err }
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, actorID); err != nil { return nil, err }
	_, err = tx.Exec(ctx, `INSERT INTO cms_banners (id, title, image_url, link, position, start_date, end_date, active, created_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULLIF($9,'')::uuid,$10,$10)`, bannerID, req.Title, req.ImageURL, req.Link, req.Position, req.StartDate.UTC(), req.EndDate.UTC(), active, actorID, now)
	if err != nil { return nil, err }
	if err := appendEventTx(ctx, tx, "cms-banner", bannerID, "BannerCreated", map[string]any{"banner_id": bannerID, "position": req.Position, "active": active, "created_at": now.Format(time.RFC3339)}); err != nil { return nil, err }
	if err := appendOutboxTx(ctx, tx, "cms-banner", bannerID, "BannerCreated", map[string]any{"banner_id": bannerID, "position": req.Position, "active": active}, "phoenix.cms.banner-created"); err != nil { return nil, err }
	if err := tx.Commit(ctx); err != nil { return nil, err }
	return &models.BannerResponse{BannerID: bannerID, Title: req.Title, Active: active, CreatedAt: now}, nil
}

func (r *PostgresRepository) ListBanners(ctx context.Context, position string) (*models.ListBannersResponse, error) {
	now := time.Now().UTC()
	position = strings.TrimSpace(position)
	query := `SELECT id, title, image_url, link, position, active, created_at FROM cms_banners WHERE active = TRUE AND start_date <= $1 AND end_date >= $1`
	args := []any{now}
	if position != "" {
		query += ` AND position = $2`
		args = append(args, position)
	}
	query += ` ORDER BY created_at DESC`
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil { return nil, err }
	defer rows.Close()
	resp := &models.ListBannersResponse{Data: []models.BannerResponse{}}
	for rows.Next() {
		var item models.BannerResponse
		if err := rows.Scan(&item.BannerID, &item.Title, &item.ImageURL, &item.Link, &item.Position, &item.Active, &item.CreatedAt); err != nil { return nil, err }
		resp.Data = append(resp.Data, item)
	}
	return resp, rows.Err()
}

func ensureUserExists(ctx context.Context, tx pgx.Tx, userID string) error {
	var id string
	if err := tx.QueryRow(ctx, `SELECT id FROM users WHERE id = $1`, userID).Scan(&id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) { return ErrNotFound }
		return err
	}
	return nil
}

func appendEventTx(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID, eventType string, payload map[string]any) error {
	body, err := json.Marshal(payload)
	if err != nil { return err }
	var version int
	if err := tx.QueryRow(ctx, `SELECT COALESCE(MAX(version), 0) + 1 FROM event_store WHERE aggregate_type = $1 AND aggregate_id = $2`, aggregateType, aggregateID).Scan(&version); err != nil { return err }
	_, err = tx.Exec(ctx, `INSERT INTO event_store (aggregate_type, aggregate_id, event_type, version, payload, metadata) VALUES ($1,$2,$3,$4,$5,'{}'::jsonb)`, aggregateType, aggregateID, eventType, version, body)
	return err
}

func appendOutboxTx(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID, eventType string, payload map[string]any, topic string) error {
	body, err := json.Marshal(payload)
	if err != nil { return err }
	_, err = tx.Exec(ctx, `INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload, kafka_topic, kafka_key) VALUES ($1,$2,$3,$4,$5,$6)`, aggregateType, aggregateID, eventType, body, topic, aggregateID)
	return err
}

func defaultMap(value map[string]any) map[string]any {
	if value == nil { return map[string]any{} }
	return value
}

func promotionStatus(active bool, startDate, endDate, now time.Time) string {
	if !active { return "inactive" }
	if now.Before(startDate) { return "scheduled" }
	if now.After(endDate) { return "expired" }
	return "active"
}
