package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	stdhttp "net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"phoenix-revival/gateway/internal/alphacashier"
	gatewayhttp "phoenix-revival/gateway/internal/http"
	"phoenix-revival/gateway/internal/tenant"
	"phoenix-revival/gateway/internal/tracing"
	"phoenix-revival/platform/logging"
	"phoenix-revival/platform/runtime"
	"phoenix-revival/platform/transport/httpx"

	_ "github.com/lib/pq" // Register PostgreSQL driver for database/sql
)

func main() {
	// Subcommand dispatch runs before any server bootstrap. Keep this list
	// small — the gateway is primarily a server; subcommands are narrow
	// admin tools that happen to ship in the same binary so they inherit
	// the same build + deps. See PLAN-loyalty-leaderboards.md §8.
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "migrate-legacy-loyalty":
			os.Exit(runMigrateLegacyLoyalty(os.Args[2:]))
		case "rbac-bootstrap":
			os.Exit(runRBACBootstrap(os.Args[2:]))
		}
	}

	cfg := runtime.LoadServiceConfig("gateway", "18080")

	// Initialize structured logging (JSON in production, text in dev)
	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
	if err := validateGatewayRuntimeConfig(os.Getenv); err != nil {
		log.Fatalf("gateway configuration error: %v", err)
	}
	logging.Init(cfg.Name, env)

	// Initialize OpenTelemetry tracing (configured via OTEL_* env vars)
	tracingCtx := context.Background()
	shutdownTracing, err := tracing.Init(tracingCtx, cfg.Name, "1.0.0")
	if err != nil {
		slog.Warn("tracing initialization failed", "error", err)
	}
	defer func() {
		if err := shutdownTracing(tracingCtx); err != nil {
			slog.Warn("tracing shutdown error", "error", err)
		}
	}()

	mux := stdhttp.NewServeMux()
	metricsRegistry := httpx.NewMetricsRegistry()
	// Fold gateway infrastructure counters (geo-gate denials, WS fan-out drops)
	// into the canonical /metrics scrape alongside HTTP request metrics (P3-05).
	metricsRegistry.RegisterCollector(gatewayhttp.GatewayInfraMetrics)
	mux.Handle("/metrics", httpx.MetricsHandler(metricsRegistry, cfg.Name))
	gatewayhttp.RegisterRoutes(mux, cfg.Name)

	// Auth service URL for token validation
	authServiceURL := os.Getenv("AUTH_SERVICE_URL")
	if authServiceURL == "" {
		authServiceURL = "http://localhost:18081"
	}

	// Public paths that do not require authentication.
	// The payments webhook is intentionally public so providers can reach it,
	// but the handler performs its own HMAC verification before processing.
	publicPrefixes := gatewayPublicPrefixes()

	// CSRF-exempt prefixes (auth endpoints and provider-to-provider webhooks
	// handle their own verification).
	csrfSkipPrefixes := gatewayCSRFSkipPrefixes()

	// CORS origins. Comma-separated list; credentials require exact origin match
	// (no "*"). Defaults cover the local dev ports for the player app and the
	// backoffice. For production set GATEWAY_CORS_ORIGINS to real domains.
	corsOrigins := os.Getenv("GATEWAY_CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "http://localhost:3000,http://localhost:3001"
	}
	corsMW := httpx.CORS(strings.Split(corsOrigins, ","))

	// Build middleware chain — execution order is right-to-left:
	// Recovery -> Metrics -> AccessLog -> CSRF -> Auth -> RequestID -> handler
	authEnabled := strings.ToLower(strings.TrimSpace(os.Getenv("GATEWAY_AUTH_ENABLED"))) != "false"

	middlewares := []httpx.Middleware{
		tenant.Middleware, // innermost: resolves the active tenant after auth (ADR-0005 step 2)
		httpx.RequestID(),
		httpx.NormalizeTrailingSlash("/api/", "/admin/", "/auth/"),
		tracing.Middleware(),
		httpx.SecurityHeaders(),
		corsMW,
		httpx.AccessLog(log.Default()),
		httpx.Metrics(metricsRegistry),
		httpx.Recovery(log.Default()),
		httpx.MaxBodySize(1 << 20), // 1 MB — applied first (outermost)
	}

	if authEnabled {
		middlewares = []httpx.Middleware{
			httpx.RequestID(),
			httpx.NormalizeTrailingSlash("/api/", "/admin/", "/auth/"),
			tracing.Middleware(),
			httpx.SecurityHeaders(),
			corsMW,
			httpx.Auth(authServiceURL, publicPrefixes),
			httpx.CSRF(csrfSkipPrefixes),
			httpx.AccessLog(log.Default()),
			httpx.Metrics(metricsRegistry),
			httpx.Recovery(log.Default()),
			httpx.MaxBodySize(1 << 20), // 1 MB — applied first (outermost)
		}
		slog.Info("auth middleware enabled", "auth_service", authServiceURL)
	} else {
		slog.Warn("auth middleware DISABLED — all routes are unprotected", "reason", "GATEWAY_AUTH_ENABLED=false")
	}
	slog.Info("CORS configured", "origins", corsOrigins)

	handler := httpx.Chain(mux, middlewares...)

	// Graceful shutdown on SIGINT/SIGTERM
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	slog.Info("starting service", "service", cfg.Name, "port", cfg.Port)
	if err := runtime.RunHTTPServer(ctx, cfg, handler); err != nil {
		log.Fatalf("%s service failed: %v", cfg.Name, err)
	}
	slog.Info("service stopped gracefully", "service", cfg.Name)
}

func gatewayPublicPrefixes() []string {
	return []string{
		"/healthz",
		"/readyz",
		"/metrics",
		"/api/v1/status",
		"/api/v1/auth/",
		"/auth/",
		"/ws",              // WebSocket has its own auth
		"/api/v1/content/", // CMS content delivery (public)
		"/api/v1/banners",  // CMS banner delivery (public)

		// Prediction platform — public read-only endpoints
		"/api/v1/discover", // demo product feed (imported_markets); pre-launch behind app auth, but no session needed for the read
		"/api/v1/discovery",
		"/api/v1/live-markets",
		"/api/v1/categories",
		"/api/v1/events",
		"/api/v1/markets",
		"/api/v1/payments/webhook",
		"/v1/provider-callbacks/", // Non-custodial cashier provider callbacks verify raw-body signatures in-handler.

		// Leaderboards — board list + per-board entries are public; the
		// per-user /api/v1/me/leaderboards endpoint sits outside this prefix
		// and still requires a session.
		"/api/v1/leaderboards",

		// Bot API uses its own API-key auth middleware, not the session auth
		"/api/v1/bot/",
	}
}

func gatewayCSRFSkipPrefixes() []string {
	return []string{
		"/api/v1/auth/",
		"/auth/",
		"/healthz",
		"/readyz",
		"/metrics",
		"/api/v1/status",
		"/api/v1/payments/webhook",
		"/v1/provider-callbacks/",
	}
}

func validateGatewayRuntimeConfig(getenv func(string) string) error {
	if err := alphacashier.ValidateRuntimeConfig(getenv); err != nil {
		return err
	}

	env := strings.ToLower(strings.TrimSpace(getenv("ENVIRONMENT")))
	realEnv := env == "production" || env == "staging"

	// The auth kill switch is a local-dev convenience only. Refuse to boot with
	// it disabled in any deployed environment.
	if strings.EqualFold(strings.TrimSpace(getenv("GATEWAY_AUTH_ENABLED")), "false") && realEnv {
		return fmt.Errorf("GATEWAY_AUTH_ENABLED=false is not permitted when ENVIRONMENT=%s", env)
	}

	// The admin anonymous bypass skips BOTH the admin-role check and RBAC
	// permission enforcement (see requireAdminRole / requireRBACPermission). It
	// is a local-dev convenience only — refuse to boot with it enabled in any
	// deployed environment so it can never silently disable back-office
	// authorization in prod/staging.
	if strings.EqualFold(strings.TrimSpace(getenv("GATEWAY_ALLOW_ADMIN_ANON")), "true") && realEnv {
		return fmt.Errorf("GATEWAY_ALLOW_ADMIN_ANON=true is not permitted when ENVIRONMENT=%s", env)
	}

	// Everything below applies only to deployed environments. Local dev and the
	// demo box (ENVIRONMENT unset) keep the convenient docker-compose defaults.
	if !realEnv {
		return nil
	}

	// Payments webhook secret must be set, and must not be the dev placeholder
	// baked into docker-compose. Reaching a deployed environment with it is a
	// deploy mistake we fail fast on rather than run with a guessable HMAC key.
	switch strings.TrimSpace(getenv("PAYMENTS_WEBHOOK_SECRET")) {
	case "":
		return fmt.Errorf("PAYMENTS_WEBHOOK_SECRET must be set when ENVIRONMENT=%s", env)
	case "whsec_local":
		return fmt.Errorf("PAYMENTS_WEBHOOK_SECRET is the dev placeholder 'whsec_local'; set a real secret when ENVIRONMENT=%s", env)
	}

	// Refuse the dev database password in a deployed environment. The local
	// docker-compose bakes in 'localdev' for convenience; a DSN still carrying
	// it in prod/staging is a leftover dev config, not a real credential.
	for _, dsnVar := range []string{"GATEWAY_DB_DSN", "WALLET_DB_DSN"} {
		if strings.Contains(getenv(dsnVar), ":localdev@") {
			return fmt.Errorf("%s uses the dev database password 'localdev'; use real credentials when ENVIRONMENT=%s", dsnVar, env)
		}
	}

	// P3-06: the provider-ops audit trail is append-only (migration 036) and is
	// the system of record for compliance actions, so in a deployed environment
	// it must be DB-backed. The JSON-file fallback is mutable and per-instance —
	// it cannot be authoritative — so fail closed rather than silently degrade.
	// (Mirrors buildProviderOpsAuditStoreFromEnv's DB-selection branch.)
	auditMode := strings.ToLower(strings.TrimSpace(getenv("PROVIDER_OPS_AUDIT_STORE_MODE")))
	auditDSN := strings.TrimSpace(getenv("PROVIDER_OPS_AUDIT_DB_DSN"))
	if auditDSN == "" {
		auditDSN = strings.TrimSpace(getenv("GATEWAY_DB_DSN"))
	}
	auditDB := auditMode == "db" || auditMode == "sql" || auditMode == "postgres" || auditMode == "shared" || (auditMode == "" && auditDSN != "")
	if !auditDB {
		return fmt.Errorf("provider-ops audit store must be DB-backed when ENVIRONMENT=%s: set PROVIDER_OPS_AUDIT_STORE_MODE=db (or leave it unset with a valid GATEWAY_DB_DSN); the JSON-file fallback is mutable and per-instance and cannot be the audit system of record", env)
	}

	for _, key := range []string{"CRYPTO_RPC_URL", "CRYPTO_ASSET_CONTRACT", "CRYPTO_DEPOSIT_ADDRESS_SOURCE"} {
		if strings.TrimSpace(getenv(key)) != "" {
			return fmt.Errorf("%s must not be set in production: legacy custodial cashier rail is prototype-only; use non-custodial cashier services instead", key)
		}
	}

	complianceMode := strings.ToLower(strings.TrimSpace(getenv("BETA_COMPLIANCE_MODE")))
	if complianceMode == "" {
		complianceMode = strings.ToLower(strings.TrimSpace(getenv("COMPLIANCE_MODE")))
	}
	ackedPermissive := false
	switch complianceMode {
	case "permissive", "permissive_beta", "beta_permissive":
		// The permissive bypass disables the jurisdiction and trading-KYC
		// gates entirely. That is a staging/demo posture only — production
		// must never run ungated, ack or no ack.
		if env == "production" {
			return fmt.Errorf("BETA_COMPLIANCE_MODE=%s is not permitted when ENVIRONMENT=production; permissive mode is for staging/demo only", complianceMode)
		}
		if !strings.EqualFold(strings.TrimSpace(getenv("COMPLIANCE_STARTUP_ACK")), "true") {
			return fmt.Errorf("permissive beta compliance mode disables KYC/geofence gates; set COMPLIANCE_STARTUP_ACK=true when ENVIRONMENT=%s to acknowledge this beta policy", env)
		}
		ackedPermissive = true
	}

	// Deny-by-default jurisdiction + KYC posture: a deployed environment that
	// is not in acked-permissive mode must enforce the geo gate in allowlist
	// mode and state its KYC posture explicitly. The boot checks demand the
	// canonical value "true" (stricter than the runtime parsers, which also
	// accept 1/yes) so a deploy can never pass validation with a value the
	// runtime might not honor.
	if !ackedPermissive {
		if !strings.EqualFold(strings.TrimSpace(getenv("GEO_GATE_ENABLED")), "true") {
			return fmt.Errorf("GEO_GATE_ENABLED=true is required when ENVIRONMENT=%s (deny-by-default jurisdiction posture); use BETA_COMPLIANCE_MODE=permissive + COMPLIANCE_STARTUP_ACK=true on staging if the bypass is intended", env)
		}
		if !hasCountryEntries(getenv("GEO_ALLOWED_COUNTRIES")) {
			return fmt.Errorf("GEO_ALLOWED_COUNTRIES must list the permitted ISO-3166 countries when ENVIRONMENT=%s — allowlist mode is mandatory for launch (a blocklist is too easy to under-specify)", env)
		}
		for _, kycVar := range []string{"KYC_ENFORCEMENT", "KYC_REQUIRED_FOR_TRADING"} {
			v := strings.TrimSpace(getenv(kycVar))
			ack := strings.EqualFold(strings.TrimSpace(getenv(kycVar+"_ACK_DISABLED")), "true")
			if !strings.EqualFold(v, "true") && !ack {
				return fmt.Errorf("%s must be explicitly 'true' or explicitly acknowledged off via %s_ACK_DISABLED=true when ENVIRONMENT=%s — KYC posture must not default off silently", kycVar, kycVar, env)
			}
		}
		// Anti-spoof edge-auth (audit SEC-03): in a trusted-edge deploy the
		// gateway origin must not be reachable with a forged country header.
		// If GEO_TRUSTED_PROXY_MODE=require, EDGE_SHARED_SECRET must be set so
		// the gate can prove a request transited the edge — otherwise
		// require-mode is a no-op and the bypass stays open.
		if strings.EqualFold(strings.TrimSpace(getenv("GEO_TRUSTED_PROXY_MODE")), "require") &&
			strings.TrimSpace(getenv("EDGE_SHARED_SECRET")) == "" {
			return fmt.Errorf("EDGE_SHARED_SECRET must be set when GEO_TRUSTED_PROXY_MODE=require and ENVIRONMENT=%s — without it the origin can be hit directly with a spoofed country header (audit SEC-03); set it here and stamp it at the edge (Caddy: header_up X-Edge-Auth)", env)
		}
	}
	return nil
}

// hasCountryEntries reports whether a comma-separated country list contains at
// least one non-empty entry (mirrors compliance.parseCountrySet's tokenizing).
func hasCountryEntries(raw string) bool {
	for _, tok := range strings.Split(raw, ",") {
		if strings.TrimSpace(tok) != "" {
			return true
		}
	}
	return false
}

// CORS configuration moved to platform/transport/httpx as httpx.CORS — see
// that package for the implementation and security notes (it ships with a
// strict allowlist contract that route handlers must not bypass).
