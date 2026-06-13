package models

import "time"

type AuthClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type SendNotificationRequest struct {
	UserID           string         `json:"user_id"`
	NotificationType string         `json:"notification_type"`
	Channels         []string       `json:"channels"`
	TemplateID       string         `json:"template_id"`
	Variables        map[string]any `json:"variables"`
	Priority         string         `json:"priority"`
}

type SendNotificationResponse struct {
	NotificationID string    `json:"notification_id"`
	UserID         string    `json:"user_id"`
	Status         string    `json:"status"`
	QueuedAt       time.Time `json:"queued_at"`
}

type Template struct {
	TemplateID string `json:"template_id"`
	Name       string `json:"name"`
	Subject    string `json:"subject"`
	EmailBody  string `json:"email_body"`
	PushTitle  string `json:"push_title"`
	PushBody   string `json:"push_body"`
	SMSBody    string `json:"sms_body"`
}

type TemplatesResponse struct {
	Data []Template `json:"data"`
}

type UpdateNotificationStatusRequest struct {
	Channel     string     `json:"channel"`
	Status      string     `json:"status"`
	DeliveredAt *time.Time `json:"delivered_at,omitempty"`
}

type UpdateNotificationStatusResponse struct {
	NotificationID  string            `json:"notification_id"`
	ChannelStatuses map[string]string `json:"channel_statuses"`
}

type QuietHours struct {
	Enabled bool   `json:"enabled"`
	Start   string `json:"start,omitempty"`
	End     string `json:"end,omitempty"`
}

type NotificationPreferences struct {
	MarketingEmails   bool       `json:"marketing_emails"`
	BetNotifications  bool       `json:"bet_notifications"`
	PromotionalSMS    bool       `json:"promotional_sms"`
	PushNotifications bool       `json:"push_notifications"`
	QuietHours        QuietHours `json:"quiet_hours"`
}

type NotificationPreferencesResponse struct {
	UserID      string                  `json:"user_id"`
	Preferences NotificationPreferences `json:"preferences"`
}

type UpdateNotificationPreferencesRequest struct {
	MarketingEmails   *bool       `json:"marketing_emails,omitempty"`
	BetNotifications  *bool       `json:"bet_notifications,omitempty"`
	PromotionalSMS    *bool       `json:"promotional_sms,omitempty"`
	PushNotifications *bool       `json:"push_notifications,omitempty"`
	QuietHours        *QuietHours `json:"quiet_hours,omitempty"`
}

type UpdateNotificationPreferencesResponse struct {
	UserID    string    `json:"user_id"`
	UpdatedAt time.Time `json:"updated_at"`
}

type NotificationDetail struct {
	NotificationID   string            `json:"notification_id"`
	UserID           string            `json:"user_id"`
	NotificationType string            `json:"notification_type"`
	Status           string            `json:"status"`
	ChannelStatuses  map[string]string `json:"channel_statuses"`
	SentAt           time.Time         `json:"sent_at"`
	DeliveredAt      *time.Time        `json:"delivered_at,omitempty"`
}
