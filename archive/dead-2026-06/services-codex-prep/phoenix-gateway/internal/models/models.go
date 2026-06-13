package models

import "time"

type Route struct {
	Name            string   `json:"name"`
	Method          string   `json:"method"`
	Path            string   `json:"path"`
	TargetService   string   `json:"target_service"`
	TargetURL       string   `json:"target_url,omitempty"`
	RequiresAuth    bool     `json:"requires_auth"`
	AllowedRoles    []string `json:"allowed_roles,omitempty"`
	RateLimitPolicy string   `json:"rate_limit_policy"`
	ExactMatch      bool     `json:"exact_match"`
}

type RateLimit struct {
	Name      string `json:"name"`
	Requests  int64  `json:"requests"`
	WindowSec int64  `json:"window_seconds"`
}

type ServiceHealth struct {
	Status       string `json:"status"`
	StatusCode   int    `json:"status_code,omitempty"`
	ResponseTime int64  `json:"response_time_ms,omitempty"`
	Error        string `json:"error,omitempty"`
}

type HealthResponse struct {
	Status    string                   `json:"status"`
	Timestamp time.Time                `json:"timestamp"`
	Services  map[string]ServiceHealth `json:"services,omitempty"`
}

type ReadinessResponse struct {
	Status     string                   `json:"status"`
	Timestamp  time.Time                `json:"timestamp"`
	Components map[string]ServiceHealth `json:"components"`
}

type GatewayMetrics struct {
	RequestsPerSecond      float64 `json:"requests_per_second"`
	AvgResponseTimeMs      int64   `json:"avg_response_time_ms"`
	ErrorRate              float64 `json:"error_rate"`
	ActiveConnections      int64   `json:"active_connections"`
	RateLimitExceededCount int64   `json:"rate_limit_exceeded_count"`
	TotalRequests          int64   `json:"total_requests"`
	TotalErrors            int64   `json:"total_errors"`
	UptimeSeconds          int64   `json:"uptime_seconds"`
}

type GatewayMetricsResponse struct {
	GatewayMetrics GatewayMetrics `json:"gateway_metrics"`
}

type ConfigResponse struct {
	Features map[string]bool `json:"features"`
	Limits   map[string]int  `json:"limits"`
}

type RateLimitDecision struct {
	Allowed    bool      `json:"allowed"`
	Remaining  int64     `json:"remaining"`
	ResetAt    time.Time `json:"reset_at"`
	RetryAfter int64     `json:"retry_after_seconds,omitempty"`
}
