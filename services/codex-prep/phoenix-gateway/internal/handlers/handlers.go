package handlers

import (
	"context"
	"fmt"
	"html"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/phoenixbot/phoenix-gateway/internal/middleware"
	"github.com/phoenixbot/phoenix-gateway/internal/models"
	"github.com/phoenixbot/phoenix-gateway/internal/service"
)

type Handlers struct {
	logger      *slog.Logger
	redisClient *redis.Client
	service     *service.GatewayService
}

func NewHandlers(logger *slog.Logger, redisClient *redis.Client, gatewayService *service.GatewayService) *Handlers {
	return &Handlers{logger: logger, redisClient: redisClient, service: gatewayService}
}

func (h *Handlers) RootLanding(w http.ResponseWriter, r *http.Request) {
	baseURL := fmt.Sprintf("%s://%s", forwardedProto(r), r.Host)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = fmt.Fprintf(w, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Phoenix Platform Demo</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f1720; color: #ecf3fb; }
    main { max-width: 900px; margin: 0 auto; padding: 48px 24px 64px; }
    h1 { margin: 0 0 12px; font-size: 32px; }
    p { color: #b5c6d8; line-height: 1.55; }
    .card { margin-top: 24px; padding: 20px 24px; background: #162230; border: 1px solid #243445; border-radius: 14px; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
    code { background: #0b1219; padding: 2px 6px; border-radius: 6px; }
    a { color: #7dd3fc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <main>
    <h1>Phoenix Platform Demo</h1>
    <p>This domain fronts the Phoenix Go API gateway. Public read endpoints are available directly. Protected routes require a bearer token and will correctly return <code>401 UNAUTHORIZED</code> without one.</p>
    <div class="card">
      <h2>Public endpoints</h2>
      <ul>
        <li><a href="%[1]s/health">%[1]s/health</a></li>
        <li><a href="%[1]s/ready">%[1]s/ready</a></li>
        <li><a href="%[1]s/api/v1/markets">%[1]s/api/v1/markets</a></li>
        <li><a href="%[1]s/api/v1/events">%[1]s/api/v1/events</a></li>
        <li><a href="%[1]s/api/v1/sports">%[1]s/api/v1/sports</a></li>
        <li><a href="%[1]s/api/v1/pages">%[1]s/api/v1/pages</a></li>
        <li><a href="%[1]s/api/v1/promotions">%[1]s/api/v1/promotions</a></li>
      </ul>
    </div>
    <div class="card">
      <h2>Protected endpoints</h2>
      <p>Player, wallet, betting, settlement, analytics, and admin routes require <code>Authorization: Bearer &lt;jwt&gt;</code>.</p>
      <p>If you reached this page after seeing a raw auth error, the demo is healthy. You were hitting an authenticated API route directly.</p>
    </div>
    <div class="card">
      <h2>Request host</h2>
      <p><code>%[2]s</code></p>
    </div>
  </main>
</body>
</html>`, html.EscapeString(baseURL), html.EscapeString(r.Host))
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, h.service.Health(r.Context()))
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	redisReady := true
	if h.redisClient != nil {
		ctx, cancel := context.WithTimeout(r.Context(), time.Second)
		defer cancel()
		redisReady = h.redisClient.Ping(ctx).Err() == nil
	}
	response, status := h.service.Readiness(r.Context(), redisReady)
	_ = middleware.WriteJSON(w, status, response)
}

func (h *Handlers) LivenessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status":    "alive",
		"timestamp": time.Now().UTC(),
	})
}

func (h *Handlers) GetRoutes(w http.ResponseWriter, r *http.Request) {
	routes, err := h.service.ListRoutes(r.Context())
	if err != nil {
		_ = middleware.WriteError(w, http.StatusInternalServerError, "ROUTE_LOOKUP_FAILED", "failed to list routes", nil)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]any{"data": routes, "count": len(routes)})
}

func (h *Handlers) GetRateLimits(w http.ResponseWriter, r *http.Request) {
	limits := h.service.ListRateLimits()
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]any{"data": limits, "count": len(limits)})
}

func (h *Handlers) GetMetrics(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, h.service.MetricsSnapshot())
}

func (h *Handlers) GetConfig(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, h.service.ConfigSnapshot())
}

func (h *Handlers) ProxyAuthRequest(w http.ResponseWriter, r *http.Request) {
	route, found, err := h.service.ResolveRoute(r.Context(), r.Method, r.URL.Path)
	if err != nil {
		_ = middleware.WriteError(w, http.StatusInternalServerError, "ROUTE_LOOKUP_FAILED", "failed to resolve route", nil)
		return
	}
	if !found {
		_ = middleware.WriteError(w, http.StatusNotFound, "ROUTE_NOT_FOUND", "route not found", nil)
		return
	}
	h.proxyToRoute(w, r, route)
}

func (h *Handlers) ProxyRequest(w http.ResponseWriter, r *http.Request) {
	route, found, err := h.service.ResolveRoute(r.Context(), r.Method, r.URL.Path)
	if err != nil {
		_ = middleware.WriteError(w, http.StatusInternalServerError, "ROUTE_LOOKUP_FAILED", "failed to resolve route", nil)
		return
	}
	if !found {
		_ = middleware.WriteError(w, http.StatusNotFound, "ROUTE_NOT_FOUND", "route not found", nil)
		return
	}
	identifier := middleware.ClientIP(r)
	if claims := middleware.GetClaims(r); claims != nil && claims.UserID != "" {
		identifier = claims.UserID
	}
	decision, err := h.service.EnforceRateLimit(r.Context(), route.RateLimitPolicy, service.ExtractClientIdentifier(identifier, ""))
	if err != nil {
		h.logger.Warn("proxy rate limit check failed", slog.Any("error", err), slog.String("route", route.Name))
	} else if !decision.Allowed {
		if decision.RetryAfter > 0 {
			w.Header().Set("Retry-After", fmt.Sprintf("%d", decision.RetryAfter))
		}
		_ = middleware.WriteError(w, http.StatusTooManyRequests, "RATE_LIMITED", "rate limit exceeded", map[string]any{"route": route.Name})
		return
	}
	h.proxyToRoute(w, r, route)
}

func (h *Handlers) proxyToRoute(w http.ResponseWriter, r *http.Request, route models.Route) {
	target, err := url.Parse(route.TargetURL)
	if err != nil {
		h.logger.Error("invalid target url", slog.String("route", route.Name), slog.Any("error", err))
		_ = middleware.WriteError(w, http.StatusInternalServerError, "PROXY_CONFIG_ERROR", "invalid proxy target", nil)
		return
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.ErrorHandler = func(rw http.ResponseWriter, req *http.Request, proxyErr error) {
		h.logger.Error("proxy request failed", slog.String("route", route.Name), slog.Any("error", proxyErr))
		_ = middleware.WriteError(rw, http.StatusBadGateway, "DOWNSTREAM_UNAVAILABLE", "downstream service unavailable", map[string]any{"service": route.TargetService})
	}
	proxy.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Set("X-Gateway-Service", route.TargetService)
		return nil
	}
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.URL.Path = singleJoiningSlash(target.Path, r.URL.Path)
		req.URL.RawQuery = r.URL.RawQuery
		req.Host = target.Host
		req.Header.Set("X-Forwarded-Host", r.Host)
		req.Header.Set("X-Forwarded-Proto", forwardedProto(r))
		req.Header.Set("X-Request-ID", w.Header().Get("X-Request-ID"))
		req.Header.Set("X-Correlation-ID", w.Header().Get("X-Correlation-ID"))
		if claims := middleware.GetClaims(r); claims != nil {
			if claims.UserID != "" {
				req.Header.Set("X-User-ID", claims.UserID)
			}
			if claims.Role != "" {
				req.Header.Set("X-User-Role", claims.Role)
			}
			if len(claims.Scopes) > 0 {
				req.Header.Set("X-User-Scopes", strings.Join(claims.Scopes, ","))
			}
		}
	}
	proxy.FlushInterval = 100 * time.Millisecond
	proxy.ServeHTTP(w, r)
}

func singleJoiningSlash(a, b string) string {
	aslash := strings.HasSuffix(a, "/")
	bslash := strings.HasPrefix(b, "/")
	switch {
	case aslash && bslash:
		return a + b[1:]
	case !aslash && !bslash:
		return a + "/" + b
	default:
		return a + b
	}
}

func forwardedProto(r *http.Request) string {
	if proto := r.Header.Get("X-Forwarded-Proto"); proto != "" {
		return proto
	}
	if r.TLS != nil {
		return "https"
	}
	return "http"
}
