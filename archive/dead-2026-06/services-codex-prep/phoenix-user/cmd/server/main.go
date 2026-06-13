package main

import (
	"context"
	"crypto/subtle"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/phoenixbot/phoenix-user/internal/config"
	"github.com/phoenixbot/phoenix-user/internal/handlers"
	"github.com/phoenixbot/phoenix-user/internal/middleware"
	"github.com/phoenixbot/phoenix-user/internal/repository"
	"github.com/phoenixbot/phoenix-user/internal/service"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config", slog.Any("error", err))
		os.Exit(1)
	}

	dbPool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		logger.Error("create database pool", slog.Any("error", err))
		os.Exit(1)
	}
	defer dbPool.Close()
	if err := dbPool.Ping(context.Background()); err != nil {
		logger.Error("ping database", slog.Any("error", err))
		os.Exit(1)
	}

	redisClient := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr, Password: cfg.RedisPassword})
	defer redisClient.Close()
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		logger.Error("ping redis", slog.Any("error", err))
		os.Exit(1)
	}

	userRepo := repository.NewUserRepository(dbPool)
	tokenStore := repository.NewRedisTokenStore(redisClient)
	userService := service.NewUserService(logger, cfg, userRepo, tokenStore)
	h := handlers.NewHandlers(logger, userService)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.LoggingMiddleware(logger))
	r.Use(chimw.Recoverer)

	r.Get("/health", h.HealthCheck)
	r.Get("/ready", h.ReadinessCheck)
	r.Post("/api/v1/users", h.Register)
	r.Post("/api/v1/auth/login", h.Login)
	r.Post("/api/v1/auth/login-with-verification", h.LoginWithVerification)
	r.Post("/api/v1/auth/refresh", h.RefreshToken)
	r.Post("/api/v1/auth/verify-email", h.VerifyEmail)
	r.Post("/api/v1/password/forgot", h.ForgotPassword)
	r.Post("/api/v1/password/reset/{token}", h.ResetPassword)
	r.Post("/auth/login", h.Login)
	r.Post("/login-with-verification", h.LoginWithVerification)
	r.Post("/auth/refresh", h.RefreshToken)
	r.Post("/token/refresh", h.RefreshToken)
	r.Post("/auth/verify-email", h.VerifyEmail)
	r.Put("/account/activate/{token}", h.ActivateAccount)
	r.Post("/password/forgot", h.ForgotPassword)
	r.Post("/password/reset/{token}", h.ResetPassword)
	r.Post("/verification/request-by-verification-code/{verificationCode}", h.RequestVerificationByVerificationCode)
	r.Post("/registration/answer-kba-questions", h.AnswerKBAQuestions)
	r.Post("/registration/check-idpv-status", h.CheckIDPVStatus)

	r.Group(func(r chi.Router) {
		r.Use(basicAuthMiddleware(cfg.IDComplyWebhookUsername, cfg.IDComplyWebhookPassword))
		r.Post("/providers/idcomply/verification-sessions/{sessionID}/status", h.ApplyProviderVerificationWebhookUpdate)
		r.Post("/providers/idcomply/verification-sessions/by-case/{providerCaseID}/status", h.ApplyProviderVerificationWebhookUpdateByCaseID)
		r.Post("/providers/idcomply/verification-sessions/status", h.ApplyProviderVerificationWebhookUpdateByReference)
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/registration/answer-kba-questions", h.AnswerKBAQuestions)
		r.Post("/registration/check-idpv-status", h.CheckIDPVStatus)
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
			r.Post("/auth/kyc", h.SubmitKYC)
			r.Post("/auth/logout", h.Logout)
			r.Post("/password/change", h.ChangePassword)
			r.Post("/verification/request", h.RequestVerification)
			r.Post("/verification/request-by-phone", h.RequestVerificationByPhone)
			r.Post("/verification/check", h.CheckVerification)
			r.Post("/registration/start-idpv", h.StartIDPV)
			r.Put("/terms/accept", h.AcceptTerms)
			r.Post("/punters/delete", h.DeleteCurrentUser)
			r.Get("/users/{userID}", h.GetUser)
			r.Put("/users/{userID}", h.UpdateUser)
			r.Get("/users/{userID}/roles", h.GetRoles)
			r.Post("/users/{userID}/roles", h.AssignRole)
			r.Get("/users/{userID}/permissions", h.GetPermissions)
			r.Get("/punters/current-session", h.GetCurrentSession)
			r.Put("/profile/preferences", h.UpdatePreferences)
			r.Put("/profile/email", h.UpdateCurrentEmail)
		})
	})

	r.Route("/", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.Post("/auth/logout", h.Logout)
		r.Post("/password/change", h.ChangePassword)
		r.Post("/verification/request", h.RequestVerification)
		r.Post("/verification/request-by-phone", h.RequestVerificationByPhone)
		r.Post("/verification/check", h.CheckVerification)
		r.Post("/registration/start-idpv", h.StartIDPV)
		r.Put("/terms/accept", h.AcceptTerms)
		r.Post("/punters/delete", h.DeleteCurrentUser)
		r.Get("/punters/current-session", h.GetCurrentSession)
		r.Get("/profile/me", h.GetCurrentProfile)
		r.Put("/profile", h.UpdateCurrentProfile)
		r.Put("/profile/preferences", h.UpdatePreferences)
		r.Put("/profile/email", h.UpdateCurrentEmail)
		r.Put("/profile/multi-factor-authentication", h.UpdateMFA)
	})

	r.Route("/admin", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/users", h.ListAdminUsers)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/users/{userID}", h.GetAdminUser)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Post("/users/{userID}/lifecycle/{action}", h.ApplyAdminUserLifecycle)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Post("/punters/{userID}/lifecycle/{action}", h.ApplyAdminUserLifecycle)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/users/{userID}/session-history", h.ListAdminUserSessions)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/punters/{userID}/session-history", h.ListAdminUserSessions)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/users/{userID}/verification-sessions", h.ListAdminVerificationSessions)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/users/verification-sessions/{sessionID}", h.GetAdminVerificationSession)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/providers/idcomply/verification-sessions/by-reference/{providerReference}", h.GetAdminVerificationSessionByProviderReference)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/providers/idcomply/verification-sessions/by-case/{providerCaseID}", h.GetAdminVerificationSessionByProviderCaseID)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/providers/idcomply/verification-sessions/review-queue/export", h.ExportVerificationReviewQueue)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/providers/idcomply/verification-sessions/review-queue", h.ListVerificationReviewQueue)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Get("/users/verification-sessions/{sessionID}/events", h.ListVerificationProviderEvents)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Post("/users/verification-sessions/{sessionID}/assign", h.AssignVerificationSession)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Post("/users/verification-sessions/{sessionID}/notes", h.AddVerificationSessionNote)
		r.With(middleware.RequireRoles("admin", "operator", "trader")).Post("/users/verification-sessions/{sessionID}/decision", h.ApplyAdminVerificationDecision)
		r.With(middleware.RequireRoles("admin", "internal")).Post("/providers/idcomply/verification-sessions/{sessionID}/decision", h.ApplyProviderVerificationDecision)
		r.With(middleware.RequireRoles("admin", "internal")).Post("/providers/idcomply/verification-sessions/by-reference/{providerReference}/decision", h.ApplyProviderVerificationDecisionByReference)
		r.With(middleware.RequireRoles("admin", "internal")).Post("/providers/idcomply/verification-sessions/by-case/{providerCaseID}/decision", h.ApplyProviderVerificationDecisionByCaseID)
		r.With(middleware.RequireRoles("admin", "internal")).Post("/providers/idcomply/verification-sessions/{sessionID}/status", h.ApplyProviderVerificationUpdate)
		r.With(middleware.RequireRoles("admin", "internal", "data-provider")).Post("/providers/idcomply/verification-sessions/by-case/{providerCaseID}/status", h.ApplyProviderVerificationUpdateByCaseID)
		r.With(middleware.RequireRoles("admin", "internal", "data-provider")).Post("/providers/idcomply/verification-sessions/status", h.ApplyProviderVerificationUpdateByReference)
	})

	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info("starting phoenix-user", slog.Int("port", cfg.Port))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("listen", slog.Any("error", err))
			os.Exit(1)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("shutdown", slog.Any("error", err))
		os.Exit(1)
	}
}

func basicAuthMiddleware(username, password string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, pass, ok := r.BasicAuth()
			if !ok ||
				subtle.ConstantTimeCompare([]byte(user), []byte(username)) != 1 ||
				subtle.ConstantTimeCompare([]byte(pass), []byte(password)) != 1 {
				w.Header().Set("WWW-Authenticate", `Basic realm="phoenix-user-idcomply"`)
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
