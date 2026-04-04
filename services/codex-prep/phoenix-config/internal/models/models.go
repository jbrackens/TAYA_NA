package models

import "time"

type AuthClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type TermsDocument struct {
	ID                  string    `json:"id"`
	CurrentTermsVersion string    `json:"current_terms_version"`
	TermsContent        string    `json:"terms_content"`
	TermsDaysThreshold  int       `json:"terms_days_threshold"`
	CreatedBy           string    `json:"created_by,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
}

type UpsertTermsRequest struct {
	CurrentTermsVersion string `json:"current_terms_version"`
	TermsContent        string `json:"terms_content"`
	TermsDaysThreshold  *int   `json:"terms_days_threshold,omitempty"`
}
