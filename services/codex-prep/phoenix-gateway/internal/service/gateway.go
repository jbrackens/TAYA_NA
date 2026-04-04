package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/phoenixbot/phoenix-gateway/internal/config"
	"github.com/phoenixbot/phoenix-gateway/internal/models"
	"github.com/phoenixbot/phoenix-gateway/internal/repository"
)

type GatewayService struct {
	logger   *slog.Logger
	cfg      *config.Config
	routes   repository.RouteRepository
	limiter  repository.RateLimitRepository
	client   *http.Client
	started  time.Time
	inflight atomic.Int64
	total    atomic.Int64
	errors   atomic.Int64
	limited  atomic.Int64
	duration atomic.Int64
}

func NewGatewayService(
	logger *slog.Logger,
	cfg *config.Config,
	routes repository.RouteRepository,
	limiter repository.RateLimitRepository,
) *GatewayService {
	return &GatewayService{
		logger:  logger,
		cfg:     cfg,
		routes:  routes,
		limiter: limiter,
		client: &http.Client{
			Timeout: 1500 * time.Millisecond,
		},
		started: time.Now(),
	}
}

func (s *GatewayService) ResolveRoute(ctx context.Context, method, path string) (models.Route, bool, error) {
	route, found, err := s.routes.Match(ctx, method, path)
	if err != nil || !found {
		return models.Route{}, found, err
	}
	serviceCfg, ok := s.cfg.Services[route.TargetService]
	if ok {
		route.TargetURL = serviceCfg.BaseURL
	}
	return route, true, nil
}

func (s *GatewayService) ListRoutes(ctx context.Context) ([]models.Route, error) {
	routes, err := s.routes.List(ctx)
	if err != nil {
		return nil, err
	}
	for i := range routes {
		if serviceCfg, ok := s.cfg.Services[routes[i].TargetService]; ok {
			routes[i].TargetURL = serviceCfg.BaseURL
		}
	}
	return routes, nil
}

func (s *GatewayService) ListRateLimits() []models.RateLimit {
	limits := make([]models.RateLimit, 0, len(s.cfg.RateLimits))
	for _, policy := range s.cfg.RateLimits {
		limits = append(limits, models.RateLimit{
			Name:      policy.Name,
			Requests:  policy.Requests,
			WindowSec: int64(policy.Window.Seconds()),
		})
	}
	sort.Slice(limits, func(i, j int) bool { return limits[i].Name < limits[j].Name })
	return limits
}

func (s *GatewayService) EnforceRateLimit(ctx context.Context, policyName, identifier string) (models.RateLimitDecision, error) {
	policy, ok := s.cfg.RateLimits[policyName]
	if !ok {
		return models.RateLimitDecision{Allowed: true}, nil
	}
	if s.limiter == nil {
		return models.RateLimitDecision{Allowed: true}, nil
	}
	decision, err := s.limiter.Allow(ctx, fmt.Sprintf("%s:%s", policyName, identifier), policy.Requests, policy.Window)
	if err != nil {
		s.logger.Warn("rate limit fallback", slog.String("policy", policyName), slog.Any("error", err))
		return models.RateLimitDecision{Allowed: true}, nil
	}
	if !decision.Allowed {
		s.limited.Add(1)
	}
	return decision, nil
}

func (s *GatewayService) ConfigSnapshot() models.ConfigResponse {
	return models.ConfigResponse{
		Features: map[string]bool{
			"parlays_enabled":      s.cfg.Features.ParlaysEnabled,
			"live_betting_enabled": s.cfg.Features.LiveBettingEnabled,
			"cashout_enabled":      s.cfg.Features.CashoutEnabled,
		},
		Limits: map[string]int{
			"max_bet_amount":  s.cfg.Limits.MaxBetAmount,
			"min_bet_amount":  s.cfg.Limits.MinBetAmount,
			"max_parlay_legs": s.cfg.Limits.MaxParlayLegs,
		},
	}
}

func (s *GatewayService) MetricsSnapshot() models.GatewayMetricsResponse {
	totalRequests := s.total.Load()
	totalErrors := s.errors.Load()
	avgResponseMs := int64(0)
	if totalRequests > 0 {
		avgResponseMs = time.Duration(s.duration.Load() / totalRequests).Milliseconds()
	}
	uptime := time.Since(s.started)
	rps := 0.0
	if uptime > 0 {
		rps = float64(totalRequests) / uptime.Seconds()
	}
	errorRate := 0.0
	if totalRequests > 0 {
		errorRate = float64(totalErrors) / float64(totalRequests)
	}
	return models.GatewayMetricsResponse{
		GatewayMetrics: models.GatewayMetrics{
			RequestsPerSecond:      rps,
			AvgResponseTimeMs:      avgResponseMs,
			ErrorRate:              errorRate,
			ActiveConnections:      s.inflight.Load(),
			RateLimitExceededCount: s.limited.Load(),
			TotalRequests:          totalRequests,
			TotalErrors:            totalErrors,
			UptimeSeconds:          int64(uptime.Seconds()),
		},
	}
}

func (s *GatewayService) RequestStarted() {
	s.inflight.Add(1)
}

func (s *GatewayService) RequestCompleted(status int, duration time.Duration) {
	s.inflight.Add(-1)
	s.total.Add(1)
	s.duration.Add(duration.Nanoseconds())
	if status >= http.StatusBadRequest {
		s.errors.Add(1)
	}
}

func (s *GatewayService) Health(ctx context.Context) models.HealthResponse {
	statuses := make(map[string]models.ServiceHealth, len(s.cfg.Services))
	var mu sync.Mutex
	var wg sync.WaitGroup
	for name, svc := range s.cfg.Services {
		wg.Add(1)
		go func(name string, svc config.ServiceConfig) {
			defer wg.Done()
			status := s.checkService(ctx, svc)
			mu.Lock()
			statuses[name] = status
			mu.Unlock()
		}(name, svc)
	}
	wg.Wait()
	overall := "healthy"
	for _, status := range statuses {
		if status.Status != "up" {
			overall = "degraded"
			break
		}
	}
	return models.HealthResponse{
		Status:    overall,
		Timestamp: time.Now().UTC(),
		Services:  statuses,
	}
}

func (s *GatewayService) Readiness(ctx context.Context, redisReady bool) (models.ReadinessResponse, int) {
	components := map[string]models.ServiceHealth{
		"redis": {
			Status: map[bool]string{true: "up", false: "down"}[redisReady],
		},
	}
	statusCode := http.StatusOK
	if !redisReady {
		components["redis"] = models.ServiceHealth{Status: "down", Error: "redis unavailable"}
		statusCode = http.StatusServiceUnavailable
	}
	for _, required := range []string{"phoenix-user", "phoenix-wallet", "phoenix-market-engine"} {
		serviceCfg, ok := s.cfg.Services[required]
		if !ok {
			continue
		}
		check := s.checkService(ctx, serviceCfg)
		components[required] = check
		if check.Status != "up" {
			statusCode = http.StatusServiceUnavailable
		}
	}
	status := "ready"
	if statusCode != http.StatusOK {
		status = "not_ready"
	}
	return models.ReadinessResponse{Status: status, Timestamp: time.Now().UTC(), Components: components}, statusCode
}

func (s *GatewayService) ServiceURL(serviceName string) (string, bool) {
	serviceCfg, ok := s.cfg.Services[serviceName]
	if !ok {
		return "", false
	}
	return serviceCfg.BaseURL, true
}

func (s *GatewayService) AuthConfig() config.AuthConfig {
	return s.cfg.Auth
}

func (s *GatewayService) Environment() string {
	return s.cfg.Server.Environment
}

func (s *GatewayService) WebsocketAllowedOrigins() []string {
	return append([]string(nil), s.cfg.Server.WebsocketAllowedOrigins...)
}

func (s *GatewayService) WebsocketRealtimeProxyEnabled() bool {
	return s.cfg.Server.WebsocketRealtimeProxy
}

func (s *GatewayService) RealtimeServiceURL() (string, bool) {
	if strings.TrimSpace(s.cfg.Realtime.BaseURL) == "" {
		return "", false
	}
	return s.cfg.Realtime.BaseURL, true
}

func (s *GatewayService) checkService(ctx context.Context, svc config.ServiceConfig) models.ServiceHealth {
	start := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(svc.BaseURL, "/")+svc.HealthPath, nil)
	if err != nil {
		return models.ServiceHealth{Status: "down", Error: err.Error()}
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return models.ServiceHealth{Status: "down", Error: err.Error()}
	}
	defer resp.Body.Close()
	status := "down"
	if resp.StatusCode < http.StatusBadRequest {
		status = "up"
	}
	return models.ServiceHealth{Status: status, StatusCode: resp.StatusCode, ResponseTime: time.Since(start).Milliseconds()}
}

func ExtractClientIdentifier(remoteAddr string, userID string) string {
	if userID != "" {
		return userID
	}
	if remoteAddr == "" {
		return "anonymous"
	}
	return remoteAddr
}

func ValidateAdminRoute(route models.Route) error {
	if !route.RequiresAuth {
		return errors.New("admin route must require auth")
	}
	if route.TargetService == "" {
		return errors.New("target service is required")
	}
	return nil
}
