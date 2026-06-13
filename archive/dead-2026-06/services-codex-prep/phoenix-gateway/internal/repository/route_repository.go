package repository

import (
	"context"
	"sort"
	"strings"

	"github.com/phoenixbot/phoenix-gateway/internal/models"
)

type RouteRepository interface {
	List(context.Context) ([]models.Route, error)
	Match(ctx context.Context, method, path string) (models.Route, bool, error)
}

type StaticRouteRepository struct {
	routes []models.Route
}

func NewStaticRouteRepository() *StaticRouteRepository {
	routes := []models.Route{
		{Name: "user-register", Method: "POST", Path: "/api/v1/users", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "auth-login", ExactMatch: true},
		{Name: "auth-login-api", Method: "POST", Path: "/api/v1/auth/login", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "auth-login", ExactMatch: true},
		{Name: "auth-login", Method: "POST", Path: "/auth/login", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "auth-login", ExactMatch: true},
		{Name: "auth-login-with-verification-api", Method: "POST", Path: "/api/v1/auth/login-with-verification", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "auth-login", ExactMatch: true},
		{Name: "auth-login-with-verification", Method: "POST", Path: "/login-with-verification", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "auth-login", ExactMatch: true},
		{Name: "password-forgot-api", Method: "POST", Path: "/api/v1/password/forgot", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "auth-login", ExactMatch: true},
		{Name: "password-forgot", Method: "POST", Path: "/password/forgot", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "auth-login", ExactMatch: true},
		{Name: "password-reset-api", Method: "POST", Path: "/api/v1/password/reset/{token}", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "auth-login", ExactMatch: true},
		{Name: "password-reset", Method: "POST", Path: "/password/reset/{token}", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "auth-login", ExactMatch: true},
		{Name: "auth-refresh", Method: "POST", Path: "/auth/refresh", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "auth-refresh", ExactMatch: true},
		{Name: "token-refresh", Method: "POST", Path: "/token/refresh", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "auth-refresh", ExactMatch: true},
		{Name: "auth-logout", Method: "POST", Path: "/auth/logout", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "auth-logout", ExactMatch: true},
		{Name: "auth-verify-email", Method: "POST", Path: "/api/v1/auth/verify-email", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "auth-login", ExactMatch: true},
		{Name: "account-activate", Method: "PUT", Path: "/account/activate/{token}", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "auth-login", ExactMatch: true},
		{Name: "verification-by-email-code", Method: "POST", Path: "/verification/request-by-verification-code/{verificationCode}", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "auth-login", ExactMatch: true},
		{Name: "verification-request-api", Method: "POST", Path: "/api/v1/verification/request", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "verification-request", Method: "POST", Path: "/verification/request", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "verification-request-by-phone-api", Method: "POST", Path: "/api/v1/verification/request-by-phone", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "verification-request-by-phone", Method: "POST", Path: "/verification/request-by-phone", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "verification-check-api", Method: "POST", Path: "/api/v1/verification/check", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "verification-check", Method: "POST", Path: "/verification/check", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "registration-answer-kba-api", Method: "POST", Path: "/api/v1/registration/answer-kba-questions", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "registration-answer-kba", Method: "POST", Path: "/registration/answer-kba-questions", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "registration-check-idpv-api", Method: "POST", Path: "/api/v1/registration/check-idpv-status", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "registration-check-idpv", Method: "POST", Path: "/registration/check-idpv-status", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "registration-start-idpv-api", Method: "POST", Path: "/api/v1/registration/start-idpv", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "registration-start-idpv", Method: "POST", Path: "/registration/start-idpv", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "provider-idcomply-session-status", Method: "POST", Path: "/providers/idcomply/verification-sessions/{sessionID}/status", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "provider-idcomply-session-status-by-case", Method: "POST", Path: "/providers/idcomply/verification-sessions/by-case/{providerCaseID}/status", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "provider-idcomply-session-status-by-reference", Method: "POST", Path: "/providers/idcomply/verification-sessions/status", TargetService: "phoenix-user", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "geocomply-license-key", Method: "GET", Path: "/geo-comply/license-key", TargetService: "phoenix-compliance", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "geocomply-geo-packet", Method: "POST", Path: "/geo-comply/geo-packet", TargetService: "phoenix-compliance", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "geocomply-license-key-api", Method: "GET", Path: "/api/v1/geo-comply/license-key", TargetService: "phoenix-compliance", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "geocomply-geo-packet-api", Method: "POST", Path: "/api/v1/geo-comply/geo-packet", TargetService: "phoenix-compliance", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "terms-public-legacy", Method: "GET", Path: "/terms", TargetService: "phoenix-config", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "terms-current-public", Method: "GET", Path: "/api/v1/terms/current", TargetService: "phoenix-config", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "terms-accept-legacy", Method: "PUT", Path: "/terms/accept", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "terms-accept", Method: "PUT", Path: "/api/v1/terms/accept", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "current-session-legacy", Method: "GET", Path: "/punters/current-session", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "punter-deposit-limits", Method: "POST", Path: "/punters/deposit-limits", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "punter-stake-limits", Method: "POST", Path: "/punters/stake-limits", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "punter-session-limits", Method: "POST", Path: "/punters/session-limits", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "punter-limits-history", Method: "GET", Path: "/punters/limits-history", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "punter-cool-off", Method: "POST", Path: "/punters/cool-off", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "punter-self-exclude", Method: "POST", Path: "/punters/self-exclude", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "punter-cool-offs-history", Method: "GET", Path: "/punters/cool-offs-history", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "responsibility-check-accept", Method: "PUT", Path: "/responsibility-check/accept", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "profile-me", Method: "GET", Path: "/profile/me", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "profile-update", Method: "PUT", Path: "/profile", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "profile-preferences-update", Method: "PUT", Path: "/profile/preferences", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "profile-mfa-update", Method: "PUT", Path: "/profile/multi-factor-authentication", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "password-change-api", Method: "POST", Path: "/api/v1/password/change", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "password-change", Method: "POST", Path: "/password/change", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "punter-delete-api", Method: "POST", Path: "/api/v1/punters/delete", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "punter-delete", Method: "POST", Path: "/punters/delete", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "compliance-set-limit", Method: "POST", Path: "/api/v1/users/{userID}/limits", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "compliance-get-limits", Method: "GET", Path: "/api/v1/users/{userID}/limits", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "compliance-get-limit-history", Method: "GET", Path: "/api/v1/users/{userID}/limits/history", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "compliance-self-exclude", Method: "POST", Path: "/api/v1/users/{userID}/self-exclude", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "compliance-cool-off-history", Method: "GET", Path: "/api/v1/users/{userID}/cool-offs/history", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "compliance-restrictions", Method: "GET", Path: "/api/v1/users/{userID}/restrictions", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "notification-preferences-get", Method: "GET", Path: "/api/v1/users/{userID}/notification-preferences", TargetService: "phoenix-notification", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "notification-preferences-update", Method: "PUT", Path: "/api/v1/users/{userID}/notification-preferences", TargetService: "phoenix-notification", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "aml-check-create", Method: "POST", Path: "/api/v1/aml-check", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "aml-check-get", Method: "GET", Path: "/api/v1/aml-check/{checkID}", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "compliance-alert-create", Method: "POST", Path: "/api/v1/compliance-alerts", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "users", Method: "*", Path: "/api/v1/users", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "kyc", Method: "*", Path: "/api/v1/kyc", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "wallets", Method: "*", Path: "/api/v1/wallets", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "payments-deposit", Method: "POST", Path: "/payments/deposit", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "payments-withdrawal", Method: "POST", Path: "/payments/withdrawal", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "payments-cash-withdrawal", Method: "POST", Path: "/payments/cash-withdrawal", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "payments-cheque-withdrawal", Method: "POST", Path: "/payments/cheque-withdrawal", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "payments-transaction-details", Method: "GET", Path: "/payments/transactions/{transactionID}", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "admin-payments-transactions", Method: "GET", Path: "/admin/payments/transactions", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transactions-export", Method: "GET", Path: "/admin/payments/transactions/export", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-summary", Method: "GET", Path: "/admin/payments/transactions/summary", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-reconciliation-queue", Method: "GET", Path: "/admin/payments/transactions/reconciliation-queue", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-reconciliation-queue-export", Method: "GET", Path: "/admin/payments/transactions/reconciliation-queue/export", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-reconcile-preview", Method: "POST", Path: "/admin/payments/transactions/reconcile/preview", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-reconcile", Method: "POST", Path: "/admin/payments/transactions/reconcile", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-by-provider-reference", Method: "GET", Path: "/admin/payments/transactions/by-provider-reference/{providerReference}", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-events-by-provider-reference", Method: "GET", Path: "/admin/payments/transactions/by-provider-reference/{providerReference}/events", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-assign-by-provider-reference", Method: "POST", Path: "/admin/payments/transactions/by-provider-reference/{providerReference}/assign", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-note-by-provider-reference", Method: "POST", Path: "/admin/payments/transactions/by-provider-reference/{providerReference}/notes", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-status-by-provider-reference", Method: "POST", Path: "/admin/payments/transactions/by-provider-reference/{providerReference}/status", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-approve-by-provider-reference", Method: "POST", Path: "/admin/payments/transactions/by-provider-reference/{providerReference}/approve", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-decline-by-provider-reference", Method: "POST", Path: "/admin/payments/transactions/by-provider-reference/{providerReference}/decline", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-settle-by-provider-reference", Method: "POST", Path: "/admin/payments/transactions/by-provider-reference/{providerReference}/settle", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-refund-by-provider-reference", Method: "POST", Path: "/admin/payments/transactions/by-provider-reference/{providerReference}/refund", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-reverse-by-provider-reference", Method: "POST", Path: "/admin/payments/transactions/by-provider-reference/{providerReference}/reverse", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-chargeback-by-provider-reference", Method: "POST", Path: "/admin/payments/transactions/by-provider-reference/{providerReference}/chargeback", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-retry-by-provider-reference", Method: "POST", Path: "/admin/payments/transactions/by-provider-reference/{providerReference}/retry", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-details", Method: "GET", Path: "/admin/payments/transactions/{transactionID}", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-events", Method: "GET", Path: "/admin/payments/transactions/{transactionID}/events", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-assign", Method: "POST", Path: "/admin/payments/transactions/{transactionID}/assign", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-note", Method: "POST", Path: "/admin/payments/transactions/{transactionID}/notes", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-approve", Method: "POST", Path: "/admin/payments/transactions/{transactionID}/approve", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-decline", Method: "POST", Path: "/admin/payments/transactions/{transactionID}/decline", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-status", Method: "POST", Path: "/admin/payments/transactions/{transactionID}/status", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-refund", Method: "POST", Path: "/admin/payments/transactions/{transactionID}/refund", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-reverse", Method: "POST", Path: "/admin/payments/transactions/{transactionID}/reverse", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-chargeback", Method: "POST", Path: "/admin/payments/transactions/{transactionID}/chargeback", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-retry", Method: "POST", Path: "/admin/payments/transactions/{transactionID}/retry", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-payments-transaction-settle", Method: "POST", Path: "/admin/payments/transactions/{transactionID}/settle", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "pxp-payment-state-changed", Method: "POST", Path: "/pxp/payment-state-changed/handlePaymentStateChangedNotification", TargetService: "phoenix-wallet", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "pxp-verify-cash-deposit", Method: "POST", Path: "/pxp/verify-cash-deposit", TargetService: "phoenix-wallet", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "transactions", Method: "*", Path: "/api/v1/transactions", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "deposits", Method: "*", Path: "/api/v1/deposits", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "withdrawals", Method: "*", Path: "/api/v1/withdrawals", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "rewards", Method: "*", Path: "/api/v1/rewards", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "market-liquidity", Method: "GET", Path: "/api/v1/markets/{marketID}/liquidity", TargetService: "phoenix-market-engine", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "market-odds-update", Method: "PUT", Path: "/api/v1/markets/{marketID}/odds", TargetService: "phoenix-market-engine", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "market-status-update", Method: "PUT", Path: "/api/v1/markets/{marketID}/status", TargetService: "phoenix-market-engine", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "market-settle", Method: "POST", Path: "/api/v1/markets/{marketID}/settle", TargetService: "phoenix-market-engine", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "market-create", Method: "POST", Path: "/api/v1/markets", TargetService: "phoenix-market-engine", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "markets", Method: "GET", Path: "/api/v1/markets", TargetService: "phoenix-market-engine", RequiresAuth: false, RateLimitPolicy: "proxy"},
		{Name: "bets-status", Method: "POST", Path: "/api/v1/bets/status", TargetService: "phoenix-betting-engine", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "punter-bets-status", Method: "POST", Path: "/punters/bets/status", TargetService: "phoenix-betting-engine", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "bets", Method: "*", Path: "/api/v1/bets", TargetService: "phoenix-betting-engine", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "parlays", Method: "*", Path: "/api/v1/parlays", TargetService: "phoenix-betting-engine", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "user-bets", Method: "GET", Path: "/api/v1/users/{userID}/bets", TargetService: "phoenix-betting-engine", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "events", Method: "*", Path: "/api/v1/events", TargetService: "phoenix-events", RequiresAuth: false, RateLimitPolicy: "proxy"},
		{Name: "sports", Method: "*", Path: "/api/v1/sports", TargetService: "phoenix-events", RequiresAuth: false, RateLimitPolicy: "proxy"},
		{Name: "match-tracker-fixture", Method: "GET", Path: "/api/v1/match-tracker/fixtures/{fixtureID}", TargetService: "phoenix-events", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "fixture-stats", Method: "GET", Path: "/api/v1/stats/fixtures/{fixtureID}", TargetService: "phoenix-events", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "leagues", Method: "GET", Path: "/api/v1/leagues/{sport}", TargetService: "phoenix-events", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "provider-event-upsert", Method: "POST", Path: "/api/v1/providers/events/upsert", TargetService: "phoenix-events", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "provider-mockdata-events-sync", Method: "POST", Path: "/api/v1/providers/mockdata/events/sync", TargetService: "phoenix-events", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "scores", Method: "*", Path: "/api/v1/scores", TargetService: "phoenix-events", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "prediction-overview", Method: "GET", Path: "/api/v1/prediction/overview", TargetService: "phoenix-prediction", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "prediction-categories", Method: "GET", Path: "/api/v1/prediction/categories", TargetService: "phoenix-prediction", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "prediction-markets", Method: "GET", Path: "/api/v1/prediction/markets", TargetService: "phoenix-prediction", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "prediction-market-detail", Method: "GET", Path: "/api/v1/prediction/markets/{marketID}", TargetService: "phoenix-prediction", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "prediction-ticket-preview", Method: "POST", Path: "/api/v1/prediction/ticket/preview", TargetService: "phoenix-prediction", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "prediction-bot-keys-legacy", Method: "POST", Path: "/v1/bot/keys", TargetService: "phoenix-prediction", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "prediction-bot-keys-api", Method: "POST", Path: "/api/v1/bot/keys", TargetService: "phoenix-prediction", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "prediction-player", Method: "*", Path: "/api/v1/prediction/orders", TargetService: "phoenix-prediction", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "prediction-admin", Method: "*", Path: "/admin/prediction", TargetService: "phoenix-prediction", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "bonuses", Method: "*", Path: "/api/v1/bonuses", TargetService: "phoenix-retention", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "campaigns", Method: "*", Path: "/api/v1/campaigns", TargetService: "phoenix-retention", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "leaderboards", Method: "*", Path: "/api/v1/leaderboards", TargetService: "phoenix-retention", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "achievement-unlock", Method: "POST", Path: "/api/v1/achievements/{userID}/unlock", TargetService: "phoenix-retention", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "user-achievements", Method: "GET", Path: "/api/v1/users/{userID}/achievements", TargetService: "phoenix-retention", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "user-loyalty-points", Method: "GET", Path: "/api/v1/users/{userID}/loyalty-points", TargetService: "phoenix-retention", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "user-loyalty-redeem", Method: "POST", Path: "/api/v1/users/{userID}/loyalty-points/redeem", TargetService: "phoenix-retention", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "freebets", Method: "GET", Path: "/api/v1/freebets", TargetService: "phoenix-retention", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "freebet-detail", Method: "GET", Path: "/api/v1/freebets/{freebetID}", TargetService: "phoenix-retention", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "odds-boosts", Method: "GET", Path: "/api/v1/odds-boosts", TargetService: "phoenix-retention", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "odds-boost-detail", Method: "GET", Path: "/api/v1/odds-boosts/{oddsBoostID}", TargetService: "phoenix-retention", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "odds-boost-accept", Method: "POST", Path: "/api/v1/odds-boosts/{oddsBoostID}/accept", TargetService: "phoenix-retention", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "user-profile", Method: "GET", Path: "/api/v1/users/{userID}/profile", TargetService: "phoenix-social", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "user-follow", Method: "POST", Path: "/api/v1/users/{userID}/follow/{targetUserID}", TargetService: "phoenix-social", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "user-followers", Method: "GET", Path: "/api/v1/users/{userID}/followers", TargetService: "phoenix-social", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "feed", Method: "GET", Path: "/api/v1/feed", TargetService: "phoenix-social", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "messages", Method: "*", Path: "/api/v1/messages", TargetService: "phoenix-social", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "notification-templates", Method: "GET", Path: "/api/v1/templates", TargetService: "phoenix-notification", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "notifications", Method: "*", Path: "/api/v1/notifications", TargetService: "phoenix-notification", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "analytics", Method: "*", Path: "/api/v1/analytics", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "reports", Method: "*", Path: "/api/v1/reports", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "analytics-dashboard-platform", Method: "GET", Path: "/api/v1/dashboards/platform", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "analytics-cohorts", Method: "GET", Path: "/api/v1/cohorts", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "settlement-batches", Method: "*", Path: "/api/v1/settlement-batches", TargetService: "phoenix-settlement", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "settlement-manual-payout", Method: "POST", Path: "/api/v1/payouts/manual", TargetService: "phoenix-settlement", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "settlement-reconciliation", Method: "*", Path: "/api/v1/reconciliation", TargetService: "phoenix-settlement", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "cms-pages", Method: "*", Path: "/api/v1/pages", TargetService: "phoenix-cms", RequiresAuth: false, RateLimitPolicy: "proxy"},
		{Name: "cms-banners", Method: "*", Path: "/api/v1/banners", TargetService: "phoenix-cms", RequiresAuth: false, RateLimitPolicy: "proxy"},
		{Name: "cms-promotions", Method: "*", Path: "/api/v1/promotions", TargetService: "phoenix-cms", RequiresAuth: false, RateLimitPolicy: "proxy"},
		{Name: "cms", Method: "*", Path: "/api/v1/cms", TargetService: "phoenix-cms", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "content", Method: "*", Path: "/api/v1/content", TargetService: "phoenix-cms", RequiresAuth: true, RateLimitPolicy: "proxy"},
		{Name: "admin-audit-logs", Method: "GET", Path: "/admin/audit-logs", TargetService: "phoenix-audit", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-audit-logs-export", Method: "GET", Path: "/admin/audit-logs/export", TargetService: "phoenix-audit", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-terms-current", Method: "GET", Path: "/admin/terms/current", TargetService: "phoenix-config", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-upload-terms", Method: "POST", Path: "/admin/upload-terms", TargetService: "phoenix-config", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-notes-get", Method: "GET", Path: "/admin/users/{userID}/notes", TargetService: "phoenix-support-notes", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-notes-post", Method: "POST", Path: "/admin/users/{userID}/notes", TargetService: "phoenix-support-notes", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-timeline-get", Method: "GET", Path: "/admin/users/{userID}/timeline", TargetService: "phoenix-support-notes", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-timeline-export", Method: "GET", Path: "/admin/users/{userID}/timeline/export", TargetService: "phoenix-support-notes", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-lifecycle-action", Method: "POST", Path: "/admin/users/{userID}/lifecycle/{action}", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-session-history", Method: "GET", Path: "/admin/users/{userID}/session-history", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-notes-get", Method: "GET", Path: "/admin/punters/{punterID}/notes", TargetService: "phoenix-support-notes", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-notes-post", Method: "POST", Path: "/admin/punters/{punterID}/notes", TargetService: "phoenix-support-notes", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-timeline-get", Method: "GET", Path: "/admin/punters/{punterID}/timeline", TargetService: "phoenix-support-notes", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-timeline-export", Method: "GET", Path: "/admin/punters/{punterID}/timeline/export", TargetService: "phoenix-support-notes", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-lifecycle-action", Method: "POST", Path: "/admin/punters/{userID}/lifecycle/{action}", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-deposit-limit-update", Method: "PUT", Path: "/admin/users/{userID}/limits/deposit", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-deposit-limit-update", Method: "PUT", Path: "/admin/punters/{userID}/limits/deposit", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-stake-limit-update", Method: "PUT", Path: "/admin/users/{userID}/limits/stake", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-stake-limit-update", Method: "PUT", Path: "/admin/punters/{userID}/limits/stake", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-session-limit-update", Method: "PUT", Path: "/admin/users/{userID}/limits/session", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-session-limit-update", Method: "PUT", Path: "/admin/punters/{userID}/limits/session", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-cool-off-lifecycle", Method: "PUT", Path: "/admin/users/{userID}/lifecycle/cool-off", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-cool-off-lifecycle", Method: "PUT", Path: "/admin/punters/{userID}/lifecycle/cool-off", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-session-history", Method: "GET", Path: "/admin/punters/{userID}/session-history", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-bet-cancel", Method: "POST", Path: "/admin/bets/{betID}/cancel", TargetService: "phoenix-betting-engine", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-bet-lifecycle-action", Method: "POST", Path: "/admin/bets/{betID}/lifecycle/{action}", TargetService: "phoenix-betting-engine", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-logs", Method: "GET", Path: "/admin/users/{userID}/logs", TargetService: "phoenix-audit", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-logs", Method: "GET", Path: "/admin/punters/{userID}/logs", TargetService: "phoenix-audit", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-transactions", Method: "GET", Path: "/admin/users/{userID}/transactions", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-transactions", Method: "GET", Path: "/admin/punters/{userID}/transactions", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-limits-history", Method: "GET", Path: "/admin/users/{userID}/limits-history", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-limits-history", Method: "GET", Path: "/admin/punters/{userID}/limits-history", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-cool-offs-history", Method: "GET", Path: "/admin/users/{userID}/cool-offs-history", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-cool-offs-history", Method: "GET", Path: "/admin/punters/{userID}/cool-offs-history", TargetService: "phoenix-compliance", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-financial-summary", Method: "GET", Path: "/admin/users/{userID}/financial-summary", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-financial-summary", Method: "GET", Path: "/admin/punters/{userID}/financial-summary", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-funds-credit", Method: "POST", Path: "/admin/users/{userID}/funds/credit", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-funds-credit", Method: "POST", Path: "/admin/punters/{userID}/funds/credit", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-funds-debit", Method: "POST", Path: "/admin/users/{userID}/funds/debit", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-funds-debit", Method: "POST", Path: "/admin/punters/{userID}/funds/debit", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-bets", Method: "GET", Path: "/admin/users/{userID}/bets", TargetService: "phoenix-betting-engine", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-bets", Method: "GET", Path: "/admin/punters/{userID}/bets", TargetService: "phoenix-betting-engine", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-transactions-export", Method: "GET", Path: "/admin/users/{userID}/transactions/export", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-transactions-export", Method: "GET", Path: "/admin/punters/{userID}/transactions/export", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-punter-exclusions-export", Method: "POST", Path: "/admin/punters/exclusions/export", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-daily-reports", Method: "POST", Path: "/admin/reports/daily", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-repeat-daily-reports", Method: "GET", Path: "/admin/reports/daily/repeat", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-promo-usage", Method: "GET", Path: "/admin/promotions/usage", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-wallet-correction-tasks", Method: "GET", Path: "/admin/wallet/corrections/tasks", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-risk-player-scores", Method: "GET", Path: "/admin/risk/player-scores", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-risk-segments", Method: "GET", Path: "/admin/risk/segments", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-feed-health", Method: "GET", Path: "/admin/feed-health", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-provider-cancel", Method: "POST", Path: "/admin/provider/cancel", TargetService: "phoenix-wallet", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-provider-acknowledgements-get", Method: "GET", Path: "/admin/provider/acknowledgements", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-provider-acknowledgements-post", Method: "POST", Path: "/admin/provider/acknowledgements", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-provider-acknowledgement-sla-get", Method: "GET", Path: "/admin/provider/acknowledgement-sla", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-provider-acknowledgement-sla-post", Method: "POST", Path: "/admin/provider/acknowledgement-sla", TargetService: "phoenix-analytics", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-user-verification-sessions", Method: "GET", Path: "/admin/users/{userID}/verification-sessions", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-verification-session-detail", Method: "GET", Path: "/admin/users/verification-sessions/{sessionID}", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-idcomply-session-by-reference", Method: "GET", Path: "/admin/providers/idcomply/verification-sessions/by-reference/{providerReference}", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-idcomply-session-by-case", Method: "GET", Path: "/admin/providers/idcomply/verification-sessions/by-case/{providerCaseID}", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-idcomply-review-queue-export", Method: "GET", Path: "/admin/providers/idcomply/verification-sessions/review-queue/export", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-idcomply-review-queue", Method: "GET", Path: "/admin/providers/idcomply/verification-sessions/review-queue", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-verification-session-events", Method: "GET", Path: "/admin/users/verification-sessions/{sessionID}/events", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-verification-session-decision", Method: "POST", Path: "/admin/users/verification-sessions/{sessionID}/decision", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-idcomply-verification-decision", Method: "POST", Path: "/admin/providers/idcomply/verification-sessions/{sessionID}/decision", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-idcomply-verification-decision-by-reference", Method: "POST", Path: "/admin/providers/idcomply/verification-sessions/by-reference/{providerReference}/decision", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-idcomply-verification-decision-by-case", Method: "POST", Path: "/admin/providers/idcomply/verification-sessions/by-case/{providerCaseID}/decision", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-idcomply-session-status", Method: "POST", Path: "/admin/providers/idcomply/verification-sessions/{sessionID}/status", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-idcomply-session-status-by-case", Method: "POST", Path: "/admin/providers/idcomply/verification-sessions/by-case/{providerCaseID}/status", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-idcomply-session-status-by-reference", Method: "POST", Path: "/admin/providers/idcomply/verification-sessions/status", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin", ExactMatch: true},
		{Name: "admin-users", Method: "*", Path: "/admin/users", TargetService: "phoenix-user", RequiresAuth: true, RateLimitPolicy: "admin"},
		{Name: "admin-bets", Method: "*", Path: "/admin/bets", TargetService: "phoenix-betting-engine", RequiresAuth: true, RateLimitPolicy: "admin"},
		{Name: "admin-markets", Method: "*", Path: "/admin/markets", TargetService: "phoenix-market-engine", RequiresAuth: true, RateLimitPolicy: "admin"},
		{Name: "provider-oddin-events-sync", Method: "POST", Path: "/api/v1/providers/oddin/events/sync", TargetService: "phoenix-events", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "provider-betgenius-events-sync", Method: "POST", Path: "/api/v1/providers/betgenius/events/sync", TargetService: "phoenix-events", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "provider-mockdata-markets-sync", Method: "POST", Path: "/api/v1/providers/mockdata/markets/sync", TargetService: "phoenix-market-engine", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "provider-oddin-markets-sync", Method: "POST", Path: "/api/v1/providers/oddin/markets/sync", TargetService: "phoenix-market-engine", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "provider-betgenius-markets-sync", Method: "POST", Path: "/api/v1/providers/betgenius/markets/sync", TargetService: "phoenix-market-engine", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "admin-fixtures", Method: "*", Path: "/admin/fixtures", TargetService: "phoenix-events", RequiresAuth: true, RateLimitPolicy: "admin"},
		{Name: "admin-tournaments", Method: "*", Path: "/admin/tournaments", TargetService: "phoenix-events", RequiresAuth: true, RateLimitPolicy: "admin"},
		{Name: "engagement-achievement-stream", Method: "POST", Path: "/api/v1/achievements/stream", TargetService: "stella-engagement", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "engagement-points-calculate", Method: "POST", Path: "/api/v1/points/calculate", TargetService: "stella-engagement", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "engagement-aggregations-compute", Method: "POST", Path: "/api/v1/aggregations/compute", TargetService: "stella-engagement", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "engagement-score", Method: "GET", Path: "/api/v1/engagement-score/{userID}", TargetService: "stella-engagement", RequiresAuth: true, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "engagement-achievements-ws", Method: "GET", Path: "/api/v1/stream/achievements/{userID}", TargetService: "stella-engagement", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
		{Name: "engagement-leaderboard-ws", Method: "GET", Path: "/api/v1/stream/leaderboard", TargetService: "stella-engagement", RequiresAuth: false, RateLimitPolicy: "proxy", ExactMatch: true},
	}

	sort.SliceStable(routes, func(i, j int) bool {
		if routes[i].ExactMatch != routes[j].ExactMatch {
			return routes[i].ExactMatch
		}
		if isTemplateRoute(routes[i].Path) != isTemplateRoute(routes[j].Path) {
			return !isTemplateRoute(routes[i].Path)
		}
		return len(routes[i].Path) > len(routes[j].Path)
	})

	return &StaticRouteRepository{routes: routes}
}

func (r *StaticRouteRepository) List(_ context.Context) ([]models.Route, error) {
	out := make([]models.Route, len(r.routes))
	copy(out, r.routes)
	return out, nil
}

func (r *StaticRouteRepository) Match(_ context.Context, method, path string) (models.Route, bool, error) {
	for _, route := range r.routes {
		if route.Method != "*" && !strings.EqualFold(route.Method, method) {
			continue
		}
		if route.ExactMatch {
			if route.Path == path || matchTemplate(route.Path, path) {
				return route, true, nil
			}
			continue
		}
		if strings.HasPrefix(path, route.Path) {
			return route, true, nil
		}
	}
	return models.Route{}, false, nil
}

func isTemplateRoute(path string) bool {
	return strings.Contains(path, "{") && strings.Contains(path, "}")
}

func matchTemplate(pattern, path string) bool {
	if !isTemplateRoute(pattern) {
		return false
	}
	patternParts := strings.Split(strings.Trim(pattern, "/"), "/")
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(patternParts) != len(pathParts) {
		return false
	}
	for i := range patternParts {
		if strings.HasPrefix(patternParts[i], "{") && strings.HasSuffix(patternParts[i], "}") {
			if pathParts[i] == "" {
				return false
			}
			continue
		}
		if patternParts[i] != pathParts[i] {
			return false
		}
	}
	return true
}
