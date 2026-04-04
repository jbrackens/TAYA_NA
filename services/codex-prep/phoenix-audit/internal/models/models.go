package models

import "time"

type AuthClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type Pagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}

type AuditLogFilters struct {
	Action   string
	ActorID  string
	TargetID string
	UserID   string
	Product  string
	SortBy   string
	SortDir  string
	Page     int
	Limit    int
}

type AuditLogEntry struct {
	ID         string    `json:"id"`
	ActorID    *string   `json:"actor_id,omitempty"`
	Action     string    `json:"action"`
	EntityType string    `json:"entity_type"`
	EntityID   *string   `json:"entity_id,omitempty"`
	Product    string    `json:"product"`
	OldValue   any       `json:"old_value,omitempty"`
	NewValue   any       `json:"new_value,omitempty"`
	IPAddress  *string   `json:"ip_address,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

type AuditLogsResponse struct {
	Data       []AuditLogEntry `json:"data"`
	Pagination Pagination      `json:"pagination"`
}
