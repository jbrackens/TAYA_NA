package content

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

const dbTimeout = 5 * time.Second

// Service provides CMS content management and delivery.
type Service struct {
	db *sql.DB
}

// NewService creates a content service backed by the provided database.
func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

// --- Page Operations ---

func (s *Service) CreatePage(ctx context.Context, req CreatePageRequest) (Page, error) {
	slug := strings.TrimSpace(req.Slug)
	title := strings.TrimSpace(req.Title)
	if slug == "" || title == "" {
		return Page{}, fmt.Errorf("slug and title are required")
	}
	if req.Status == "" {
		req.Status = "draft"
	}

	var page Page
	var publishedAt *time.Time
	if req.Status == "published" {
		now := time.Now().UTC()
		publishedAt = &now
	}

	err := s.db.QueryRowContext(ctx, `
INSERT INTO content_pages (slug, title, content, meta_title, meta_description, status, published_at, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, slug, title, content, meta_title, meta_description, status, published_at, created_by, created_at, updated_at`,
		slug, title, req.Content, req.MetaTitle, req.MetaDescription,
		req.Status, publishedAt, req.CreatedBy,
	).Scan(
		&page.ID, &page.Slug, &page.Title, &page.Content,
		&page.MetaTitle, &page.MetaDescription, &page.Status, &page.PublishedAt,
		&page.CreatedBy, &page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		return Page{}, fmt.Errorf("create page: %w", err)
	}
	return page, nil
}

func (s *Service) UpdatePage(ctx context.Context, id int64, req UpdatePageRequest) (Page, error) {
	sets := []string{}
	args := []any{}
	argIdx := 1

	if req.Title != nil {
		sets = append(sets, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, *req.Title)
		argIdx++
	}
	if req.Content != nil {
		sets = append(sets, fmt.Sprintf("content = $%d", argIdx))
		args = append(args, *req.Content)
		argIdx++
	}
	if req.MetaTitle != nil {
		sets = append(sets, fmt.Sprintf("meta_title = $%d", argIdx))
		args = append(args, *req.MetaTitle)
		argIdx++
	}
	if req.MetaDescription != nil {
		sets = append(sets, fmt.Sprintf("meta_description = $%d", argIdx))
		args = append(args, *req.MetaDescription)
		argIdx++
	}

	if len(sets) == 0 {
		return s.GetPageByID(ctx, id)
	}

	sets = append(sets, "updated_at = NOW()")
	query := fmt.Sprintf("UPDATE content_pages SET %s WHERE id = $%d", strings.Join(sets, ", "), argIdx)
	args = append(args, id)

	_, err := s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return Page{}, fmt.Errorf("update page: %w", err)
	}
	return s.GetPageByID(ctx, id)
}

func (s *Service) PublishPage(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `
UPDATE content_pages SET status = 'published', published_at = NOW(), updated_at = NOW()
WHERE id = $1`, id)
	return err
}

func (s *Service) UnpublishPage(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `
UPDATE content_pages SET status = 'draft', published_at = NULL, updated_at = NOW()
WHERE id = $1`, id)
	return err
}

func (s *Service) DeletePage(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM content_pages WHERE id = $1`, id)
	return err
}

// GetPageBySlug returns a published page by its slug (player-facing delivery).
func (s *Service) GetPageBySlug(ctx context.Context, slug string) (Page, error) {
	var page Page
	err := s.db.QueryRowContext(ctx, `
SELECT id, slug, title, content, meta_title, meta_description, status, published_at, created_by, created_at, updated_at
FROM content_pages WHERE slug = $1 AND status = 'published'`, slug).Scan(
		&page.ID, &page.Slug, &page.Title, &page.Content,
		&page.MetaTitle, &page.MetaDescription, &page.Status, &page.PublishedAt,
		&page.CreatedBy, &page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Page{}, fmt.Errorf("page not found: %s", slug)
		}
		return Page{}, err
	}

	// Load blocks
	page.Blocks, _ = s.listBlocks(ctx, page.ID)
	return page, nil
}

// GetPageByID returns a page by ID (admin access, any status).
func (s *Service) GetPageByID(ctx context.Context, id int64) (Page, error) {
	var page Page
	err := s.db.QueryRowContext(ctx, `
SELECT id, slug, title, content, meta_title, meta_description, status, published_at, created_by, created_at, updated_at
FROM content_pages WHERE id = $1`, id).Scan(
		&page.ID, &page.Slug, &page.Title, &page.Content,
		&page.MetaTitle, &page.MetaDescription, &page.Status, &page.PublishedAt,
		&page.CreatedBy, &page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Page{}, fmt.Errorf("page %d not found", id)
		}
		return Page{}, err
	}
	page.Blocks, _ = s.listBlocks(ctx, page.ID)
	return page, nil
}

func (s *Service) ListPages(ctx context.Context, status string, limit int) ([]Page, error) {
	if limit <= 0 {
		limit = 50
	}

	var rows *sql.Rows
	var err error
	if status != "" {
		rows, err = s.db.QueryContext(ctx, `
SELECT id, slug, title, content, meta_title, meta_description, status, published_at, created_by, created_at, updated_at
FROM content_pages WHERE status = $1 ORDER BY updated_at DESC LIMIT $2`, status, limit)
	} else {
		rows, err = s.db.QueryContext(ctx, `
SELECT id, slug, title, content, meta_title, meta_description, status, published_at, created_by, created_at, updated_at
FROM content_pages ORDER BY updated_at DESC LIMIT $1`, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pages []Page
	for rows.Next() {
		var p Page
		if err := rows.Scan(
			&p.ID, &p.Slug, &p.Title, &p.Content,
			&p.MetaTitle, &p.MetaDescription, &p.Status, &p.PublishedAt,
			&p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		pages = append(pages, p)
	}
	return pages, rows.Err()
}

// --- Block Operations ---

func (s *Service) AddBlock(ctx context.Context, pageID int64, blockType string, blockContent json.RawMessage, sortOrder int) (Block, error) {
	var block Block
	err := s.db.QueryRowContext(ctx, `
INSERT INTO content_blocks (page_id, block_type, content, sort_order)
VALUES ($1, $2, $3, $4)
RETURNING id, page_id, block_type, content, sort_order, created_at, updated_at`,
		pageID, blockType, blockContent, sortOrder,
	).Scan(&block.ID, &block.PageID, &block.BlockType, &block.Content,
		&block.SortOrder, &block.CreatedAt, &block.UpdatedAt)
	if err != nil {
		return Block{}, fmt.Errorf("add block: %w", err)
	}
	return block, nil
}

func (s *Service) DeleteBlock(ctx context.Context, blockID int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM content_blocks WHERE id = $1`, blockID)
	return err
}

func (s *Service) listBlocks(ctx context.Context, pageID int64) ([]Block, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id, page_id, block_type, content, sort_order, created_at, updated_at
FROM content_blocks WHERE page_id = $1 ORDER BY sort_order`, pageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var blocks []Block
	for rows.Next() {
		var b Block
		if err := rows.Scan(&b.ID, &b.PageID, &b.BlockType, &b.Content,
			&b.SortOrder, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		blocks = append(blocks, b)
	}
	return blocks, rows.Err()
}

// --- Banner Operations ---

func (s *Service) CreateBanner(ctx context.Context, req CreateBannerRequest) (Banner, error) {
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.ImageURL) == "" {
		return Banner{}, fmt.Errorf("title and image_url are required")
	}
	if req.Position == "" {
		req.Position = "hero"
	}

	var banner Banner
	err := s.db.QueryRowContext(ctx, `
INSERT INTO banners (title, image_url, link_url, position, sort_order, active, start_at, end_at, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, title, image_url, link_url, position, sort_order, active, start_at, end_at, created_by, created_at, updated_at`,
		req.Title, req.ImageURL, req.LinkURL, req.Position,
		req.SortOrder, req.Active, req.StartAt, req.EndAt, req.CreatedBy,
	).Scan(
		&banner.ID, &banner.Title, &banner.ImageURL, &banner.LinkURL,
		&banner.Position, &banner.SortOrder, &banner.Active,
		&banner.StartAt, &banner.EndAt, &banner.CreatedBy,
		&banner.CreatedAt, &banner.UpdatedAt,
	)
	if err != nil {
		return Banner{}, fmt.Errorf("create banner: %w", err)
	}
	return banner, nil
}

func (s *Service) UpdateBanner(ctx context.Context, id int64, req UpdateBannerRequest) (Banner, error) {
	sets := []string{}
	args := []any{}
	argIdx := 1

	if req.Title != nil {
		sets = append(sets, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, *req.Title)
		argIdx++
	}
	if req.ImageURL != nil {
		sets = append(sets, fmt.Sprintf("image_url = $%d", argIdx))
		args = append(args, *req.ImageURL)
		argIdx++
	}
	if req.LinkURL != nil {
		sets = append(sets, fmt.Sprintf("link_url = $%d", argIdx))
		args = append(args, *req.LinkURL)
		argIdx++
	}
	if req.Position != nil {
		sets = append(sets, fmt.Sprintf("position = $%d", argIdx))
		args = append(args, *req.Position)
		argIdx++
	}
	if req.SortOrder != nil {
		sets = append(sets, fmt.Sprintf("sort_order = $%d", argIdx))
		args = append(args, *req.SortOrder)
		argIdx++
	}
	if req.Active != nil {
		sets = append(sets, fmt.Sprintf("active = $%d", argIdx))
		args = append(args, *req.Active)
		argIdx++
	}
	if req.StartAt != nil {
		sets = append(sets, fmt.Sprintf("start_at = $%d", argIdx))
		args = append(args, *req.StartAt)
		argIdx++
	}
	if req.EndAt != nil {
		sets = append(sets, fmt.Sprintf("end_at = $%d", argIdx))
		args = append(args, *req.EndAt)
		argIdx++
	}

	if len(sets) == 0 {
		return s.GetBanner(ctx, id)
	}

	sets = append(sets, "updated_at = NOW()")
	query := fmt.Sprintf("UPDATE banners SET %s WHERE id = $%d", strings.Join(sets, ", "), argIdx)
	args = append(args, id)

	_, err := s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return Banner{}, fmt.Errorf("update banner: %w", err)
	}
	return s.GetBanner(ctx, id)
}

func (s *Service) DeleteBanner(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM banners WHERE id = $1`, id)
	return err
}

func (s *Service) GetBanner(ctx context.Context, id int64) (Banner, error) {
	var b Banner
	err := s.db.QueryRowContext(ctx, `
SELECT id, title, image_url, link_url, position, sort_order, active, start_at, end_at, created_by, created_at, updated_at
FROM banners WHERE id = $1`, id).Scan(
		&b.ID, &b.Title, &b.ImageURL, &b.LinkURL,
		&b.Position, &b.SortOrder, &b.Active,
		&b.StartAt, &b.EndAt, &b.CreatedBy,
		&b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Banner{}, fmt.Errorf("banner %d not found", id)
		}
		return Banner{}, err
	}
	return b, nil
}

// ListActiveBanners returns active banners for a given position, respecting
// start_at/end_at scheduling windows.
func (s *Service) ListActiveBanners(ctx context.Context, position string) ([]Banner, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id, title, image_url, link_url, position, sort_order, active, start_at, end_at, created_by, created_at, updated_at
FROM banners
WHERE active = TRUE AND position = $1
  AND (start_at IS NULL OR start_at <= NOW())
  AND (end_at IS NULL OR end_at >= NOW())
ORDER BY sort_order`, position)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var banners []Banner
	for rows.Next() {
		var b Banner
		if err := rows.Scan(
			&b.ID, &b.Title, &b.ImageURL, &b.LinkURL,
			&b.Position, &b.SortOrder, &b.Active,
			&b.StartAt, &b.EndAt, &b.CreatedBy,
			&b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, err
		}
		banners = append(banners, b)
	}
	return banners, rows.Err()
}

// ListBanners returns all banners for admin (any status).
func (s *Service) ListBanners(ctx context.Context, limit int) ([]Banner, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT id, title, image_url, link_url, position, sort_order, active, start_at, end_at, created_by, created_at, updated_at
FROM banners ORDER BY position, sort_order LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var banners []Banner
	for rows.Next() {
		var b Banner
		if err := rows.Scan(
			&b.ID, &b.Title, &b.ImageURL, &b.LinkURL,
			&b.Position, &b.SortOrder, &b.Active,
			&b.StartAt, &b.EndAt, &b.CreatedBy,
			&b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, err
		}
		banners = append(banners, b)
	}
	return banners, rows.Err()
}
