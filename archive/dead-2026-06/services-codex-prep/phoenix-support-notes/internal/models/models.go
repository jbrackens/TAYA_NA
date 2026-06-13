package models

import "time"

type AuthClaims struct {
	UserID      string   `json:"user_id"`
	Email       string   `json:"email"`
	Username    string   `json:"username"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
}

type Pagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}

type TimelineFilters struct {
	EntryType string     `json:"entry_type,omitempty"`
	StartDate *time.Time `json:"start_date,omitempty"`
	EndDate   *time.Time `json:"end_date,omitempty"`
}

type SupportNote struct {
	NoteID      string    `json:"note_id" db:"id"`
	OwnerUserID string    `json:"owner_user_id" db:"owner_user_id"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	Text        string    `json:"text" db:"note_text"`
	NoteType    string    `json:"note_type" db:"note_type"`
	AuthorID    *string   `json:"author_id,omitempty" db:"author_user_id"`
	AuthorName  *string   `json:"author_name,omitempty" db:"author_name"`
}

type ListNotesResponse struct {
	Data       []*SupportNote `json:"data"`
	Pagination Pagination     `json:"pagination"`
}

type SupportTimelineEntry struct {
	EntryID     string         `json:"entry_id"`
	EntryType   string         `json:"entry_type"`
	OccurredAt  time.Time      `json:"occurred_at"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Status      *string        `json:"status,omitempty"`
	Amount      *string        `json:"amount,omitempty"`
	Currency    *string        `json:"currency,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

type ListTimelineResponse struct {
	Data       []*SupportTimelineEntry `json:"data"`
	Pagination Pagination              `json:"pagination"`
}

type AddManualNoteRequest struct {
	NoteText string `json:"note_text"`
}
