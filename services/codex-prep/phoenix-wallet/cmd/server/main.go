package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	commonkafka "github.com/phoenixbot/phoenix-common/pkg/kafka"
	"github.com/phoenixbot/phoenix-common/pkg/outbox"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/phoenixbot/phoenix-wallet/internal/config"
	"github.com/phoenixbot/phoenix-wallet/internal/handlers"
	"github.com/phoenixbot/phoenix-wallet/internal/middleware"
	"github.com/phoenixbot/phoenix-wallet/internal/repository"
	"github.com/phoenixbot/phoenix-wallet/internal/service"
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

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var outboxProducer *commonkafka.Producer
	if cfg.OutboxEnabled {
		zapLogger, err := newZapLogger(cfg.Environment)
		if err != nil {
			logger.Error("create zap logger", slog.Any("error", err))
			os.Exit(1)
		}
		defer zapLogger.Sync()

		outboxProducer, err = commonkafka.NewProducer(strings.Join(cfg.KafkaBrokers, ","), &commonkafka.ProducerConfig{Logger: zapLogger})
		if err != nil {
			logger.Error("create outbox producer", slog.Any("error", err))
			os.Exit(1)
		}
		defer outboxProducer.Close()

		pollInterval, err := time.ParseDuration(cfg.OutboxPoll)
		if err != nil {
			logger.Error("parse outbox poll interval", slog.Any("error", err))
			os.Exit(1)
		}
		worker := outbox.NewWorker(dbPool, outboxProducer, outbox.Config{
			Logger:       zapLogger.Named("outbox"),
			PollInterval: pollInterval,
			BatchSize:    cfg.OutboxBatch,
		})
		go worker.Start(ctx)
	}

	walletRepo := repository.NewWalletRepository(dbPool)
	walletService := service.NewWalletService(logger, cfg, walletRepo)
	h := handlers.NewHandlers(logger, walletService)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.LoggingMiddleware(logger))
	r.Use(chimw.Recoverer)

	r.Get("/health", h.HealthCheck)
	r.Get("/ready", h.ReadinessCheck)

	r.Group(func(r chi.Router) {
		r.Use(basicAuthMiddleware(cfg.PXPWebhookUsername, cfg.PXPWebhookPassword))
		r.Post("/pxp/payment-state-changed/handlePaymentStateChangedNotification", h.HandlePaymentStateChangedNotification)
		r.Post("/pxp/verify-cash-deposit", h.VerifyCashDeposit)
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.Post("/wallets/{userID}", h.CreateWallet)
		r.Get("/wallets/{userID}", h.GetWalletSummary)
		r.Post("/wallets/{userID}/deposits", h.CreateDeposit)
		r.Post("/wallets/{userID}/withdrawals", h.CreateWithdrawal)
		r.Get("/wallets/{userID}/transactions", h.ListTransactions)
		r.Post("/wallets/{userID}/apply-referral-reward", h.ApplyReferralReward)
		r.Post("/wallets/{userID}/reserve", h.ReserveFunds)
		r.Post("/wallets/{userID}/release-reserve", h.ReleaseReservedFunds)
	})

	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.Post("/payments/deposit", h.CreateLegacyDeposit)
		r.Post("/payments/withdrawal", h.CreateLegacyChequeWithdrawal)
		r.Post("/payments/cash-withdrawal", h.CreateLegacyCashWithdrawal)
		r.Post("/payments/cheque-withdrawal", h.CreateLegacyChequeWithdrawal)
		r.Get("/payments/transactions/{transactionID}", h.GetLegacyTransactionDetails)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRoles("admin", "operator", "internal"))
			r.Get("/admin/payments/transactions", h.ListAdminPaymentTransactions)
			r.Get("/admin/payments/transactions/export", h.ExportAdminPaymentTransactions)
			r.Get("/admin/payments/transactions/summary", h.ListAdminPaymentSummary)
			r.Get("/admin/payments/transactions/reconciliation-queue", h.ListAdminReconciliationQueue)
			r.Get("/admin/payments/transactions/reconciliation-queue/export", h.ExportAdminReconciliationQueue)
			r.Get("/admin/payments/transactions/by-provider-reference/{providerReference}", h.GetAdminPaymentTransactionDetailsByProviderReference)
			r.Get("/admin/payments/transactions/by-provider-reference/{providerReference}/events", h.ListAdminPaymentTransactionEventsByProviderReference)
			r.Post("/admin/payments/transactions/by-provider-reference/{providerReference}/assign", h.AssignAdminPaymentTransactionByProviderReference)
			r.Post("/admin/payments/transactions/by-provider-reference/{providerReference}/notes", h.AddAdminPaymentTransactionNoteByProviderReference)
			r.Post("/admin/payments/transactions/reconcile/preview", h.PreviewAdminPaymentReconciliation)
			r.Post("/admin/payments/transactions/by-provider-reference/{providerReference}/status", h.UpdateAdminPaymentTransactionStatusByProviderReference)
			r.Post("/admin/payments/transactions/by-provider-reference/{providerReference}/approve", h.ApproveAdminPaymentTransactionByProviderReference)
			r.Post("/admin/payments/transactions/by-provider-reference/{providerReference}/decline", h.DeclineAdminPaymentTransactionByProviderReference)
			r.Post("/admin/payments/transactions/by-provider-reference/{providerReference}/settle", h.SettleAdminPaymentTransactionByProviderReference)
			r.Post("/admin/payments/transactions/by-provider-reference/{providerReference}/refund", h.RefundAdminPaymentTransactionByProviderReference)
			r.Post("/admin/payments/transactions/by-provider-reference/{providerReference}/reverse", h.ReverseAdminPaymentTransactionByProviderReference)
			r.Post("/admin/payments/transactions/by-provider-reference/{providerReference}/chargeback", h.ChargebackAdminPaymentTransactionByProviderReference)
			r.Post("/admin/payments/transactions/by-provider-reference/{providerReference}/retry", h.RetryAdminPaymentTransactionByProviderReference)
			r.Get("/admin/payments/transactions/{transactionID}", h.GetAdminPaymentTransactionDetails)
			r.Get("/admin/payments/transactions/{transactionID}/events", h.ListAdminPaymentTransactionEvents)
			r.Post("/admin/payments/transactions/{transactionID}/assign", h.AssignAdminPaymentTransaction)
			r.Post("/admin/payments/transactions/{transactionID}/notes", h.AddAdminPaymentTransactionNote)
			r.Post("/admin/payments/transactions/reconcile", h.ReconcileAdminPaymentTransaction)
			r.Post("/admin/payments/transactions/{transactionID}/status", h.UpdateAdminPaymentTransactionStatus)
			r.Post("/admin/payments/transactions/{transactionID}/refund", h.RefundAdminPaymentTransaction)
			r.Post("/admin/payments/transactions/{transactionID}/reverse", h.ReverseAdminPaymentTransaction)
			r.Post("/admin/payments/transactions/{transactionID}/chargeback", h.ChargebackAdminPaymentTransaction)
			r.Post("/admin/payments/transactions/{transactionID}/retry", h.RetryAdminPaymentTransaction)
			r.Post("/admin/payments/transactions/{transactionID}/approve", h.ApproveAdminPaymentTransaction)
			r.Post("/admin/payments/transactions/{transactionID}/decline", h.DeclineAdminPaymentTransaction)
			r.Post("/admin/payments/transactions/{transactionID}/settle", h.SettleAdminPaymentTransaction)
			r.Get("/admin/users/{userID}/transactions", h.ListAdminUserTransactions)
			r.Get("/admin/punters/{userID}/transactions", h.ListAdminUserTransactions)
			r.Get("/admin/users/{userID}/financial-summary", h.GetFinancialSummary)
			r.Get("/admin/punters/{userID}/financial-summary", h.GetFinancialSummary)
			r.Post("/admin/users/{userID}/funds/credit", h.CreateAdminFundsCredit)
			r.Post("/admin/punters/{userID}/funds/credit", h.CreateAdminFundsCredit)
			r.Post("/admin/users/{userID}/funds/debit", h.CreateAdminFundsDebit)
			r.Post("/admin/punters/{userID}/funds/debit", h.CreateAdminFundsDebit)
		})
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRoles("admin", "operator", "trader"))
			r.Post("/admin/provider/cancel", h.CancelProviderRequest)
		})
	})

	server := &http.Server{Addr: fmt.Sprintf(":%d", cfg.Port), Handler: r, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		logger.Info("starting phoenix-wallet", slog.Int("port", cfg.Port))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("listen", slog.Any("error", err))
			os.Exit(1)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown", slog.Any("error", err))
		os.Exit(1)
	}
}

func basicAuthMiddleware(username, password string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, pass, ok := r.BasicAuth()
			if !ok || user != username || pass != password {
				w.Header().Set("WWW-Authenticate", `Basic realm="phoenix-wallet-pxp"`)
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func newZapLogger(environment string) (*zap.Logger, error) {
	if environment == "development" {
		return zap.NewDevelopment()
	}
	return zap.NewProduction()
}
