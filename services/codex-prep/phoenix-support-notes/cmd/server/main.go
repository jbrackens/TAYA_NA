package main

import (
	"context"
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

	"github.com/phoenixbot/phoenix-support-notes/internal/config"
	"github.com/phoenixbot/phoenix-support-notes/internal/handlers"
	"github.com/phoenixbot/phoenix-support-notes/internal/middleware"
	"github.com/phoenixbot/phoenix-support-notes/internal/repository"
	"github.com/phoenixbot/phoenix-support-notes/internal/service"
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

	repo := repository.NewRepository(dbPool)
	svc := service.NewService(logger, repo)
	h := handlers.NewHandlers(logger, svc)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.LoggingMiddleware(logger))
	r.Use(chimw.Recoverer)

	r.Get("/health", h.HealthCheck)
	r.Get("/ready", h.ReadinessCheck)
	r.Route("/admin", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
		r.Get("/users/{userID}/timeline", h.ListTimeline)
		r.Get("/users/{userID}/timeline/export", h.ExportTimeline)
		r.Get("/users/{userID}/notes", h.ListNotes)
		r.Post("/users/{userID}/notes", h.AddManualNote)
		r.Get("/punters/{punterID}/timeline", h.ListTimeline)
		r.Get("/punters/{punterID}/timeline/export", h.ExportTimeline)
		r.Get("/punters/{punterID}/notes", h.ListNotes)
		r.Post("/punters/{punterID}/notes", h.AddManualNote)
	})

	server := &http.Server{Addr: fmt.Sprintf(":%d", cfg.Port), Handler: r, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		logger.Info("starting phoenix-support-notes", slog.Int("port", cfg.Port))
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
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown", slog.Any("error", err))
		os.Exit(1)
	}
}
