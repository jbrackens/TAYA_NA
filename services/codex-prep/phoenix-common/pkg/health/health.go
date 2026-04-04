package health

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// HealthStatus represents the overall health status of the service.
type HealthStatus string

const (
	// HealthUp indicates the service is healthy and operational.
	HealthUp HealthStatus = "up"
	// HealthDegraded indicates the service is partially operational.
	HealthDegraded HealthStatus = "degraded"
	// HealthDown indicates the service is not operational.
	HealthDown HealthStatus = "down"
)

// ComponentHealth represents the health status of a single component.
type ComponentHealth struct {
	// Status is the current health status.
	Status HealthStatus `json:"status"`
	// Message is a human-readable status message.
	Message string `json:"message"`
	// LastCheck is the timestamp of the last health check.
	LastCheck time.Time `json:"last_check"`
	// ResponseTime is the time taken to perform the health check in milliseconds.
	ResponseTime int64 `json:"response_time_ms"`
}

// HealthCheckResponse is the JSON response structure for health checks.
type HealthCheckResponse struct {
	// Status is the overall service health status.
	Status HealthStatus `json:"status"`
	// Timestamp is when the health check was performed.
	Timestamp time.Time `json:"timestamp"`
	// Components contains health status for individual components.
	Components map[string]ComponentHealth `json:"components"`
	// Uptime is the service uptime in seconds.
	Uptime int64 `json:"uptime_seconds"`
	// Version is the application version (if provided).
	Version string `json:"version,omitempty"`
}

// Checker is an interface for custom health checks.
type Checker interface {
	Check(ctx context.Context) (ComponentHealth, error)
}

// HealthChecker manages health checks for the service.
type HealthChecker struct {
	logger       *zap.Logger
	dbConn       *pgx.Conn
	redisClient  *redis.Client
	customChecks map[string]Checker
	startTime    time.Time
	version      string
}

// NewHealthChecker creates a new HealthChecker instance.
func NewHealthChecker(logger *zap.Logger, version string) *HealthChecker {
	if logger == nil {
		logger = zap.NewNop()
	}

	return &HealthChecker{
		logger:       logger,
		customChecks: make(map[string]Checker),
		startTime:    time.Now(),
		version:      version,
	}
}

// WithPostgres adds a PostgreSQL database connection for health checks.
func (hc *HealthChecker) WithPostgres(conn *pgx.Conn) *HealthChecker {
	hc.dbConn = conn
	return hc
}

// WithRedis adds a Redis client for health checks.
func (hc *HealthChecker) WithRedis(client *redis.Client) *HealthChecker {
	hc.redisClient = client
	return hc
}

// AddCheck registers a custom health check.
func (hc *HealthChecker) AddCheck(name string, checker Checker) {
	hc.customChecks[name] = checker
}

// Check performs all registered health checks and returns the overall status.
func (hc *HealthChecker) Check(ctx context.Context) *HealthCheckResponse {
	components := make(map[string]ComponentHealth)

	// Check PostgreSQL
	if hc.dbConn != nil {
		components["postgres"] = hc.checkPostgres(ctx)
	}

	// Check Redis
	if hc.redisClient != nil {
		components["redis"] = hc.checkRedis(ctx)
	}

	// Run custom checks
	for name, checker := range hc.customChecks {
		health, err := checker.Check(ctx)
		if err != nil {
			health.Status = HealthDown
			health.Message = fmt.Sprintf("check failed: %v", err)
		}
		components[name] = health
	}

	// Determine overall status
	overallStatus := hc.determineOverallStatus(components)

	return &HealthCheckResponse{
		Status:     overallStatus,
		Timestamp:  time.Now().UTC(),
		Components: components,
		Uptime:     int64(time.Since(hc.startTime).Seconds()),
		Version:    hc.version,
	}
}

// checkPostgres checks the PostgreSQL database connection.
func (hc *HealthChecker) checkPostgres(ctx context.Context) ComponentHealth {
	start := time.Now()

	health := ComponentHealth{
		Status:    HealthUp,
		Message:   "postgres is healthy",
		LastCheck: time.Now().UTC(),
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err := hc.dbConn.Ping(ctx)
	if err != nil {
		health.Status = HealthDown
		health.Message = fmt.Sprintf("postgres ping failed: %v", err)
		hc.logger.Error("postgres health check failed", zap.Error(err))
	}

	health.ResponseTime = time.Since(start).Milliseconds()
	return health
}

// checkRedis checks the Redis connection.
func (hc *HealthChecker) checkRedis(ctx context.Context) ComponentHealth {
	start := time.Now()

	health := ComponentHealth{
		Status:    HealthUp,
		Message:   "redis is healthy",
		LastCheck: time.Now().UTC(),
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err := hc.redisClient.Ping(ctx).Err()
	if err != nil {
		health.Status = HealthDown
		health.Message = fmt.Sprintf("redis ping failed: %v", err)
		hc.logger.Error("redis health check failed", zap.Error(err))
	}

	health.ResponseTime = time.Since(start).Milliseconds()
	return health
}

// determineOverallStatus determines the overall service health based on component statuses.
func (hc *HealthChecker) determineOverallStatus(components map[string]ComponentHealth) HealthStatus {
	if len(components) == 0 {
		return HealthUp
	}

	hasDown := false
	hasDegraded := false

	for _, health := range components {
		if health.Status == HealthDown {
			hasDown = true
			break
		}
		if health.Status == HealthDegraded {
			hasDegraded = true
		}
	}

	if hasDown {
		return HealthDown
	}

	if hasDegraded {
		return HealthDegraded
	}

	return HealthUp
}

// Handler returns an HTTP handler function for health checks.
// It can be registered with chi or any other HTTP router.
func (hc *HealthChecker) Handler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		response := hc.Check(r.Context())

		w.Header().Set("Content-Type", "application/json")

		// Set appropriate HTTP status code based on health status
		switch response.Status {
		case HealthUp:
			w.WriteHeader(http.StatusOK)
		case HealthDegraded:
			w.WriteHeader(http.StatusOK) // Still 200 but with degraded status
		case HealthDown:
			w.WriteHeader(http.StatusServiceUnavailable)
		}

		json.NewEncoder(w).Encode(response)
	}
}

// ReadinessHandler returns an HTTP handler for readiness checks.
// Returns 200 only if the service is fully up, 503 otherwise.
func (hc *HealthChecker) ReadinessHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		response := hc.Check(r.Context())

		w.Header().Set("Content-Type", "application/json")

		if response.Status == HealthUp {
			w.WriteHeader(http.StatusOK)
		} else {
			w.WriteHeader(http.StatusServiceUnavailable)
		}

		json.NewEncoder(w).Encode(response)
	}
}

// LivenessHandler returns an HTTP handler for liveness checks.
// Simply checks if the service is running.
func (hc *HealthChecker) LivenessHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		response := HealthCheckResponse{
			Status:    HealthUp,
			Timestamp: time.Now().UTC(),
			Uptime:    int64(time.Since(hc.startTime).Seconds()),
			Version:   hc.version,
		}

		json.NewEncoder(w).Encode(response)
	}
}
