package examples

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"

	"github.com/phoenixbot/phoenix-common/pkg/config"
	"github.com/phoenixbot/phoenix-common/pkg/errors"
	"github.com/phoenixbot/phoenix-common/pkg/health"
	"github.com/phoenixbot/phoenix-common/pkg/kafka"
	"github.com/phoenixbot/phoenix-common/pkg/middleware"
	"github.com/phoenixbot/phoenix-common/pkg/models"
)

// ExampleService demonstrates how to use the phoenix-common library
type ExampleService struct {
	config        *config.Config
	logger        *zap.Logger
	router        chi.Router
	healthChecker *health.HealthChecker
	kafkaProducer *kafka.Producer
	kafkaConsumer *kafka.Consumer
}

// NewExampleService creates a new example service
func NewExampleService(cfg *config.Config, logger *zap.Logger) (*ExampleService, error) {
	// Create router
	router := chi.NewRouter()

	// Setup middleware
	router.Use(middleware.RequestLogger(logger))
	router.Use(middleware.Recovery(logger))
	router.Use(middleware.CORS(&middleware.CORSConfig{
		AllowedOrigins: []string{"http://localhost:3000", "https://example.com"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization", "X-Request-ID"},
	}))
	router.Use(middleware.RateLimiter(&middleware.RateLimiterConfig{
		Capacity:     100,
		TokensPerSec: 100,
	}))

	// Setup health checks
	healthChecker := health.NewHealthChecker(logger, "1.0.0")

	// Setup Kafka producer
	producer, err := kafka.NewProducer(cfg.Kafka.Brokers, &kafka.ProducerConfig{
		Logger:      logger,
		Timeout:     10000,
		Compression: "snappy",
	})
	if err != nil {
		logger.Error("failed to create Kafka producer", zap.Error(err))
		return nil, err
	}

	service := &ExampleService{
		config:        cfg,
		logger:        logger,
		router:        router,
		healthChecker: healthChecker,
		kafkaProducer: producer,
	}

	// Setup routes
	service.setupRoutes()

	return service, nil
}

// setupRoutes configures all routes for the service
func (s *ExampleService) setupRoutes() {
	// Health check endpoints
	s.router.Get("/health", s.healthChecker.Handler())
	s.router.Get("/health/ready", s.healthChecker.ReadinessHandler())
	s.router.Get("/health/live", s.healthChecker.LivenessHandler())

	// Public endpoints
	s.router.Post("/auth/login", s.login)

	// Protected endpoints
	s.router.Route("/api", func(r chi.Router) {
		r.Use(middleware.JWTAuth(s.config.JWT.SecretKey))

		r.Get("/profile", s.getProfile)
		r.Get("/wallet", s.getWallet)
		r.Post("/bet", s.placeBet)

		// Admin-only endpoints
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRole("admin", "operator"))
			r.Post("/markets", s.createMarket)
			r.Put("/markets/{id}", s.updateMarket)
		})
	})
}

// login handles user authentication
func (s *ExampleService) login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.WriteErrorResponse(w, errors.ErrBadRequest.WithDetails("error", "invalid request body"))
		return
	}

	// Validate credentials (simplified example)
	if req.Email == "" || req.Password == "" {
		errors.WriteErrorResponse(w, errors.ErrBadRequest)
		return
	}

	// Create a mock JWT token (in real service, sign with JWT library)
	token := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"token": token,
	})

	s.logger.Info("user login successful", zap.String("email", req.Email))
}

// getProfile retrieves the current user's profile
func (s *ExampleService) getProfile(w http.ResponseWriter, r *http.Request) {
	// Get user claims from context
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		errors.WriteErrorResponse(w, errors.ErrUnauthorized)
		return
	}

	// Mock user retrieval
	user := &models.User{
		ID:        claims.UserID,
		Email:     claims.Email,
		Username:  claims.Username,
		Role:      models.UserRole(claims.Role),
		KYCStatus: models.KYCApproved,
		CreatedAt: time.Now().Add(-24 * time.Hour),
		UpdatedAt: time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// getWallet retrieves the user's wallet
func (s *ExampleService) getWallet(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		errors.WriteErrorResponse(w, errors.ErrUnauthorized)
		return
	}

	// Mock wallet retrieval
	wallet := &models.Wallet{
		ID:       "wallet-1",
		UserID:   claims.UserID,
		Balance:  models.NewWallet("wallet-1", claims.UserID, "USD").Balance,
		Currency: "USD",
		Status:   models.WalletActive,
		CreatedAt: time.Now().Add(-24 * time.Hour),
		UpdatedAt: time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(wallet)
}

// placeBet handles bet placement
func (s *ExampleService) placeBet(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		errors.WriteErrorResponse(w, errors.ErrUnauthorized)
		return
	}

	var req struct {
		MarketID  string `json:"market_id"`
		OutcomeID string `json:"outcome_id"`
		Stake     string `json:"stake"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.WriteErrorResponse(w, errors.ErrBadRequest)
		return
	}

	// Validate market is open (mock check)
	// In real service, query database

	// Create bet
	bet := models.NewBet(
		"bet-1",
		claims.UserID,
		req.MarketID,
		req.OutcomeID,
		models.NewWallet("", "", "").Balance, // Use actual stake parsing
		models.NewWallet("", "", "").Balance, // Use actual odds from market
	)

	// Publish event to Kafka
	eventPayload := &kafka.BetPlacedPayload{
		EventPayload: kafka.EventPayload{
			EntityID:  bet.ID,
			Timestamp: time.Now().UTC(),
			Version:   1,
		},
		UserID:    claims.UserID,
		MarketID:  req.MarketID,
		OutcomeID: req.OutcomeID,
		Stake:     req.Stake,
		BetID:     bet.ID,
	}

	event, err := kafka.NewEvent(kafka.EventBetPlaced, "betting-service", eventPayload)
	if err != nil {
		s.logger.Error("failed to create event", zap.Error(err))
		errors.WriteErrorResponse(w, errors.ErrInternalServer)
		return
	}

	err = s.kafkaProducer.PublishJSON(r.Context(), "bet-events", event.ID, event)
	if err != nil {
		s.logger.Error("failed to publish event", zap.Error(err))
		errors.WriteErrorResponse(w, errors.ErrInternalServer)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(bet)
}

// createMarket creates a new betting market (admin only)
func (s *ExampleService) createMarket(w http.ResponseWriter, r *http.Request) {
	var req struct {
		EventID string `json:"event_id"`
		Name    string `json:"name"`
		Type    string `json:"type"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.WriteErrorResponse(w, errors.ErrBadRequest)
		return
	}

	// Create market
	market := models.NewMarket(
		"market-1",
		req.EventID,
		req.Name,
		models.MarketType(req.Type),
	)

	// Publish event
	event, err := kafka.NewEvent(kafka.EventMarketCreated, "market-service", market)
	if err != nil {
		errors.WriteErrorResponse(w, errors.ErrInternalServer)
		return
	}

	s.kafkaProducer.PublishJSON(r.Context(), "market-events", event.ID, event)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(market)
}

// updateMarket updates a betting market (admin only)
func (s *ExampleService) updateMarket(w http.ResponseWriter, r *http.Request) {
	marketID := chi.URLParam(r, "id")

	var req struct {
		Status string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.WriteErrorResponse(w, errors.ErrBadRequest)
		return
	}

	// Update market status
	// In real service: query database, update, publish event

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"market_id": marketID,
		"status":    req.Status,
	})
}

// Run starts the HTTP server
func (s *ExampleService) Run(ctx context.Context) error {
	server := &http.Server{
		Addr:         s.config.Server.Address(),
		Handler:      s.router,
		ReadTimeout:  s.config.Server.ReadTimeout,
		WriteTimeout: s.config.Server.WriteTimeout,
	}

	s.logger.Info("starting server", zap.String("addr", server.Addr))

	// Start server in goroutine
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.logger.Error("server error", zap.Error(err))
		}
	}()

	// Wait for context cancellation
	<-ctx.Done()

	// Graceful shutdown
	shutdownCtx, cancel := context.WithTimeout(context.Background(), s.config.Server.ShutdownTimeout)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		s.logger.Error("shutdown error", zap.Error(err))
		return err
	}

	// Close Kafka producer
	if err := s.kafkaProducer.Close(); err != nil {
		s.logger.Error("failed to close Kafka producer", zap.Error(err))
	}

	s.logger.Info("server stopped")
	return nil
}

// Example main function
/*
func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("failed to load config", zap.Error(err))
	}

	service, err := NewExampleService(cfg, logger)
	if err != nil {
		logger.Fatal("failed to create service", zap.Error(err))
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := service.Run(ctx); err != nil {
		logger.Fatal("service error", zap.Error(err))
	}
}
*/
