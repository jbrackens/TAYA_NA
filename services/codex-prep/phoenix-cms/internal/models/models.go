package models

import "time"

type AuthClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type CreatePageRequest struct {
	Title     string `json:"title"`
	Slug      string `json:"slug"`
	Content   string `json:"content"`
	MetaTitle string `json:"meta_title"`
	Published bool   `json:"published"`
}

type PageResponse struct {
	PageID      string     `json:"page_id"`
	Title       string     `json:"title"`
	Slug        string     `json:"slug"`
	Content     string     `json:"content,omitempty"`
	MetaTitle   string     `json:"meta_title,omitempty"`
	Published   bool       `json:"published,omitempty"`
	PublishedAt *time.Time `json:"published_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at,omitempty"`
}

type ListPagesResponse struct {
	Data       []PageResponse `json:"data"`
	Pagination Pagination     `json:"pagination"`
}

type CreatePromotionRequest struct {
	Name          string                 `json:"name"`
	Description   string                 `json:"description"`
	PromotionType string                 `json:"promotion_type"`
	Rules         map[string]any         `json:"rules"`
	StartDate     time.Time              `json:"start_date"`
	EndDate       time.Time              `json:"end_date"`
	Active        bool                   `json:"active"`
}

type PromotionResponse struct {
	PromotionID   string    `json:"promotion_id"`
	Name          string    `json:"name"`
	Description   string    `json:"description,omitempty"`
	PromotionType string    `json:"promotion_type,omitempty"`
	Active        bool      `json:"active,omitempty"`
	Status        string    `json:"status,omitempty"`
	CreatedAt     time.Time `json:"created_at,omitempty"`
}

type ListPromotionsResponse struct {
	Data []PromotionResponse `json:"data"`
}

type CreateBannerRequest struct {
	Title     string    `json:"title"`
	ImageURL  string    `json:"image_url"`
	Link      string    `json:"link"`
	Position  string    `json:"position"`
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
}

type BannerResponse struct {
	BannerID   string    `json:"banner_id"`
	Title      string    `json:"title"`
	ImageURL   string    `json:"image_url,omitempty"`
	Link       string    `json:"link,omitempty"`
	Position   string    `json:"position,omitempty"`
	Active     bool      `json:"active"`
	CreatedAt  time.Time `json:"created_at,omitempty"`
}

type ListBannersResponse struct {
	Data []BannerResponse `json:"data"`
}

type Pagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}
