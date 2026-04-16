package content

import (
	"encoding/json"
	"time"
)

// Page represents a CMS-managed content page.
type Page struct {
	ID              int64      `json:"page_id"`
	Slug            string     `json:"slug"`
	Title           string     `json:"title"`
	Content         string     `json:"content"`
	MetaTitle       string     `json:"meta_title,omitempty"`
	MetaDescription string     `json:"meta_description,omitempty"`
	Status          string     `json:"status"` // draft, published, archived
	PublishedAt     *time.Time `json:"published_at,omitempty"`
	Blocks          []Block    `json:"blocks,omitempty"`
	CreatedBy       string     `json:"created_by,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// Block represents a composable content block within a page.
type Block struct {
	ID        int64           `json:"block_id"`
	PageID    int64           `json:"page_id"`
	BlockType string          `json:"block_type"` // text, banner_ref, promo_ref, html, faq
	Content   json.RawMessage `json:"content"`
	SortOrder int             `json:"sort_order"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

// Banner represents a promotional banner displayed on the site.
type Banner struct {
	ID        int64      `json:"banner_id"`
	Title     string     `json:"title"`
	ImageURL  string     `json:"image_url"`
	LinkURL   string     `json:"link_url,omitempty"`
	Position  string     `json:"position"`
	SortOrder int        `json:"sort_order"`
	Active    bool       `json:"active"`
	StartAt   *time.Time `json:"start_at,omitempty"`
	EndAt     *time.Time `json:"end_at,omitempty"`
	CreatedBy string     `json:"created_by,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// CreatePageRequest is the input for creating a new page.
type CreatePageRequest struct {
	Slug            string `json:"slug"`
	Title           string `json:"title"`
	Content         string `json:"content"`
	MetaTitle       string `json:"meta_title"`
	MetaDescription string `json:"meta_description"`
	Status          string `json:"status"` // defaults to "draft"
	CreatedBy       string `json:"-"`
}

// UpdatePageRequest is the input for updating a page.
type UpdatePageRequest struct {
	Title           *string `json:"title"`
	Content         *string `json:"content"`
	MetaTitle       *string `json:"meta_title"`
	MetaDescription *string `json:"meta_description"`
}

// CreateBannerRequest is the input for creating a new banner.
type CreateBannerRequest struct {
	Title     string     `json:"title"`
	ImageURL  string     `json:"image_url"`
	LinkURL   string     `json:"link_url"`
	Position  string     `json:"position"`
	SortOrder int        `json:"sort_order"`
	Active    bool       `json:"active"`
	StartAt   *time.Time `json:"start_at"`
	EndAt     *time.Time `json:"end_at"`
	CreatedBy string     `json:"-"`
}

// UpdateBannerRequest is the input for updating a banner.
type UpdateBannerRequest struct {
	Title     *string    `json:"title"`
	ImageURL  *string    `json:"image_url"`
	LinkURL   *string    `json:"link_url"`
	Position  *string    `json:"position"`
	SortOrder *int       `json:"sort_order"`
	Active    *bool      `json:"active"`
	StartAt   *time.Time `json:"start_at"`
	EndAt     *time.Time `json:"end_at"`
}
