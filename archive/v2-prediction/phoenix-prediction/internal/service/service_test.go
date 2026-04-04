package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-prediction/internal/client"
	"github.com/phoenixbot/phoenix-prediction/internal/models"
	"github.com/phoenixbot/phoenix-prediction/internal/repository"
)

type mockRepository struct {
	getOverviewFn         func(context.Context) (*models.PredictionOverviewResponse, error)
	listCategoriesFn      func(context.Context) ([]models.PredictionCategoryView, error)
	listMarketsFn         func(context.Context, models.PredictionMarketFilters) ([]*models.PredictionMarketView, error)
	getMarketDetailFn     func(context.Context, string) (*models.PredictionMarketDetailResponse, error)
	previewTicketFn       func(context.Context, *models.PredictionTicketPreviewRequest) (*models.PredictionTicketPreviewResponse, error)
	createOrderFn         func(context.Context, repository.CreateOrderParams) (*models.PredictionOrderView, error)
	cancelOrderFn         func(context.Context, string, string, time.Time) (*models.PredictionOrderView, error)
	updateReservationFn   func(context.Context, string, string, time.Time) error
	listUserOrdersFn      func(context.Context, string, string, string) ([]*models.PredictionOrderView, error)
	getOrderFn            func(context.Context, string) (*models.PredictionOrderView, error)
	listAllOrdersFn       func(context.Context, models.AdminOrderFilters) ([]*models.PredictionOrderView, error)
	getAdminSummaryFn     func(context.Context) (*models.PredictionAdminSummaryResponse, error)
	getLifecycleHistoryFn func(context.Context, string) (*models.PredictionLifecycleHistoryResponse, error)
	executeLifecycleFn    func(context.Context, repository.LifecycleCommand) (*models.PredictionMarketDetailResponse, error)
	issueBotAPIKeyFn      func(context.Context, repository.IssueBotAPIKeyParams) error
	writeAuditLogFn       func(context.Context, repository.AuditLogEntry) error
}

func (m *mockRepository) GetOverview(ctx context.Context) (*models.PredictionOverviewResponse, error) {
	if m.getOverviewFn != nil {
		return m.getOverviewFn(ctx)
	}
	return &models.PredictionOverviewResponse{}, nil
}

func (m *mockRepository) ListCategories(ctx context.Context) ([]models.PredictionCategoryView, error) {
	if m.listCategoriesFn != nil {
		return m.listCategoriesFn(ctx)
	}
	return nil, nil
}

func (m *mockRepository) ListMarkets(ctx context.Context, filters models.PredictionMarketFilters) ([]*models.PredictionMarketView, error) {
	if m.listMarketsFn != nil {
		return m.listMarketsFn(ctx, filters)
	}
	return nil, nil
}

func (m *mockRepository) GetMarketDetail(ctx context.Context, marketID string) (*models.PredictionMarketDetailResponse, error) {
	if m.getMarketDetailFn != nil {
		return m.getMarketDetailFn(ctx, marketID)
	}
	return nil, repository.ErrNotFound
}

func (m *mockRepository) PreviewTicket(ctx context.Context, req *models.PredictionTicketPreviewRequest) (*models.PredictionTicketPreviewResponse, error) {
	if m.previewTicketFn != nil {
		return m.previewTicketFn(ctx, req)
	}
	return nil, repository.ErrNotFound
}

func (m *mockRepository) CreateOrder(ctx context.Context, params repository.CreateOrderParams) (*models.PredictionOrderView, error) {
	if m.createOrderFn != nil {
		return m.createOrderFn(ctx, params)
	}
	return nil, errors.New("not implemented")
}

func (m *mockRepository) CancelOrder(ctx context.Context, userID, orderID string, cancelledAt time.Time) (*models.PredictionOrderView, error) {
	if m.cancelOrderFn != nil {
		return m.cancelOrderFn(ctx, userID, orderID, cancelledAt)
	}
	return nil, errors.New("not implemented")
}

func (m *mockRepository) UpdateOrderReservationID(ctx context.Context, orderID, reservationID string, updatedAt time.Time) error {
	if m.updateReservationFn != nil {
		return m.updateReservationFn(ctx, orderID, reservationID, updatedAt)
	}
	return nil
}

func (m *mockRepository) ListUserOrders(ctx context.Context, userID, status, category string) ([]*models.PredictionOrderView, error) {
	if m.listUserOrdersFn != nil {
		return m.listUserOrdersFn(ctx, userID, status, category)
	}
	return nil, nil
}

func (m *mockRepository) GetOrder(ctx context.Context, orderID string) (*models.PredictionOrderView, error) {
	if m.getOrderFn != nil {
		return m.getOrderFn(ctx, orderID)
	}
	return nil, repository.ErrNotFound
}

func (m *mockRepository) ListAllOrders(ctx context.Context, filters models.AdminOrderFilters) ([]*models.PredictionOrderView, error) {
	if m.listAllOrdersFn != nil {
		return m.listAllOrdersFn(ctx, filters)
	}
	return nil, nil
}

func (m *mockRepository) GetAdminSummary(ctx context.Context) (*models.PredictionAdminSummaryResponse, error) {
	if m.getAdminSummaryFn != nil {
		return m.getAdminSummaryFn(ctx)
	}
	return &models.PredictionAdminSummaryResponse{}, nil
}

func (m *mockRepository) GetLifecycleHistory(ctx context.Context, marketID string) (*models.PredictionLifecycleHistoryResponse, error) {
	if m.getLifecycleHistoryFn != nil {
		return m.getLifecycleHistoryFn(ctx, marketID)
	}
	return &models.PredictionLifecycleHistoryResponse{}, nil
}

func (m *mockRepository) ExecuteLifecycle(ctx context.Context, cmd repository.LifecycleCommand) (*models.PredictionMarketDetailResponse, error) {
	if m.executeLifecycleFn != nil {
		return m.executeLifecycleFn(ctx, cmd)
	}
	return &models.PredictionMarketDetailResponse{}, nil
}

func (m *mockRepository) IssueBotAPIKey(ctx context.Context, params repository.IssueBotAPIKeyParams) error {
	if m.issueBotAPIKeyFn != nil {
		return m.issueBotAPIKeyFn(ctx, params)
	}
	return nil
}

func (m *mockRepository) WriteAuditLog(ctx context.Context, entry repository.AuditLogEntry) error {
	if m.writeAuditLogFn != nil {
		return m.writeAuditLogFn(ctx, entry)
	}
	return nil
}

type mockWalletClient struct {
	reserveFn func(context.Context, string, string, *client.ReserveFundsRequest) (*client.ReserveFundsResponse, error)
	releaseFn func(context.Context, string, string, *client.ReleaseReserveRequest) (*client.ReleaseReserveResponse, error)
}

func (m *mockWalletClient) ReserveFunds(ctx context.Context, authHeader, userID string, req *client.ReserveFundsRequest) (*client.ReserveFundsResponse, error) {
	if m.reserveFn != nil {
		return m.reserveFn(ctx, authHeader, userID, req)
	}
	return nil, errors.New("not implemented")
}

func (m *mockWalletClient) ReleaseReservedFunds(ctx context.Context, authHeader, userID string, req *client.ReleaseReserveRequest) (*client.ReleaseReserveResponse, error) {
	if m.releaseFn != nil {
		return m.releaseFn(ctx, authHeader, userID, req)
	}
	return nil, errors.New("not implemented")
}

func TestPlaceOrderReservesAndCreatesOrder(t *testing.T) {
	preview := &models.PredictionTicketPreviewResponse{
		MarketID:     "market-1",
		OutcomeID:    "outcome-1",
		PriceCents:   63,
		StakeUSD:     decimal.RequireFromString("15.00"),
		Shares:       decimal.RequireFromString("23.8095"),
		MaxPayoutUSD: decimal.RequireFromString("23.81"),
		MaxProfitUSD: decimal.RequireFromString("8.81"),
	}
	var reserved bool
	var created repository.CreateOrderParams
	repo := &mockRepository{
		previewTicketFn: func(_ context.Context, req *models.PredictionTicketPreviewRequest) (*models.PredictionTicketPreviewResponse, error) {
			if req.MarketID != preview.MarketID || req.OutcomeID != preview.OutcomeID {
				t.Fatalf("unexpected preview request: %+v", req)
			}
			return preview, nil
		},
		createOrderFn: func(_ context.Context, params repository.CreateOrderParams) (*models.PredictionOrderView, error) {
			created = params
			return &models.PredictionOrderView{OrderID: "order-1", UserID: params.UserID, MarketID: params.MarketID, OutcomeID: params.OutcomeID, StakeUSD: params.StakeUSD, PriceCents: params.PriceCents, ReservationID: &params.ReservationID, Status: "open"}, nil
		},
	}
	wallet := &mockWalletClient{
		reserveFn: func(_ context.Context, authHeader, userID string, req *client.ReserveFundsRequest) (*client.ReserveFundsResponse, error) {
			reserved = true
			if authHeader != "Bearer token" || userID != "user-1" {
				t.Fatalf("unexpected reserve call: %s %s", authHeader, userID)
			}
			if !req.Amount.Equal(preview.StakeUSD) || req.ReferenceType != "prediction" {
				t.Fatalf("unexpected reserve payload: %+v", req)
			}
			return &client.ReserveFundsResponse{ReservationID: "res-1"}, nil
		},
	}
	svc := NewPredictionService(silentLogger(), repo, wallet)

	response, err := svc.PlaceOrder(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "user"}, &models.PredictionPlaceOrderRequest{MarketID: "market-1", OutcomeID: "outcome-1", StakeUSD: decimal.RequireFromString("15.00")})
	if err != nil {
		t.Fatalf("PlaceOrder() error = %v", err)
	}
	if !reserved {
		t.Fatal("expected wallet reserve to be called")
	}
	if created.ReservationID != "res-1" || created.UserID != "user-1" {
		t.Fatalf("unexpected create params: %+v", created)
	}
	if response.Order == nil || response.Order.OrderID != "order-1" {
		t.Fatalf("unexpected response: %+v", response)
	}
}

func TestPlaceOrderReleasesReservationOnRepositoryFailure(t *testing.T) {
	preview := &models.PredictionTicketPreviewResponse{MarketID: "market-1", OutcomeID: "outcome-1", PriceCents: 51, StakeUSD: decimal.RequireFromString("10.00"), Shares: decimal.RequireFromString("19.6078"), MaxPayoutUSD: decimal.RequireFromString("19.61"), MaxProfitUSD: decimal.RequireFromString("9.61")}
	var released bool
	repo := &mockRepository{
		previewTicketFn: func(_ context.Context, _ *models.PredictionTicketPreviewRequest) (*models.PredictionTicketPreviewResponse, error) {
			return preview, nil
		},
		createOrderFn: func(_ context.Context, _ repository.CreateOrderParams) (*models.PredictionOrderView, error) {
			return nil, errors.New("insert failed")
		},
	}
	wallet := &mockWalletClient{
		reserveFn: func(_ context.Context, _, _ string, _ *client.ReserveFundsRequest) (*client.ReserveFundsResponse, error) {
			return &client.ReserveFundsResponse{ReservationID: "res-2"}, nil
		},
		releaseFn: func(_ context.Context, _, _ string, req *client.ReleaseReserveRequest) (*client.ReleaseReserveResponse, error) {
			released = req.ReservationID == "res-2"
			return &client.ReleaseReserveResponse{}, nil
		},
	}
	svc := NewPredictionService(silentLogger(), repo, wallet)

	_, err := svc.PlaceOrder(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "user"}, &models.PredictionPlaceOrderRequest{MarketID: "market-1", OutcomeID: "outcome-1", StakeUSD: decimal.RequireFromString("10.00")})
	if err == nil {
		t.Fatal("expected error")
	}
	if !released {
		t.Fatal("expected released reservation on repository failure")
	}
}

func TestCancelOrderRestoresReservationWhenRepositoryCancelFails(t *testing.T) {
	order := &models.PredictionOrderView{OrderID: "order-1", UserID: "user-1", MarketID: "market-1", StakeUSD: decimal.RequireFromString("12.00"), Status: "open", ReservationID: stringPtr("res-1")}
	var restored bool
	var updated bool
	repo := &mockRepository{
		getOrderFn: func(_ context.Context, orderID string) (*models.PredictionOrderView, error) {
			if orderID != "order-1" {
				t.Fatalf("unexpected order id %s", orderID)
			}
			return order, nil
		},
		cancelOrderFn: func(_ context.Context, _, _ string, _ time.Time) (*models.PredictionOrderView, error) {
			return nil, errors.New("update failed")
		},
		updateReservationFn: func(_ context.Context, orderID, reservationID string, _ time.Time) error {
			if orderID != "order-1" || reservationID != "res-2" {
				t.Fatalf("unexpected reservation update: %s %s", orderID, reservationID)
			}
			updated = true
			return nil
		},
	}
	wallet := &mockWalletClient{
		releaseFn: func(_ context.Context, _, userID string, req *client.ReleaseReserveRequest) (*client.ReleaseReserveResponse, error) {
			if userID != "user-1" || req.ReservationID != "res-1" {
				t.Fatalf("unexpected release request: %s %+v", userID, req)
			}
			return &client.ReleaseReserveResponse{}, nil
		},
		reserveFn: func(_ context.Context, _, userID string, req *client.ReserveFundsRequest) (*client.ReserveFundsResponse, error) {
			if userID != "user-1" || !req.Amount.Equal(order.StakeUSD) {
				t.Fatalf("unexpected reserve request: %s %+v", userID, req)
			}
			restored = true
			return &client.ReserveFundsResponse{ReservationID: "res-2"}, nil
		},
	}
	svc := NewPredictionService(silentLogger(), repo, wallet)

	_, err := svc.CancelOrder(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "user"}, "order-1")
	if err == nil {
		t.Fatal("expected error")
	}
	if !restored || !updated {
		t.Fatalf("expected compensation path to run, restored=%v updated=%v", restored, updated)
	}
}

func TestIssueBotAPIKeyPersistsHashedToken(t *testing.T) {
	var persisted repository.IssueBotAPIKeyParams
	repo := &mockRepository{
		issueBotAPIKeyFn: func(_ context.Context, params repository.IssueBotAPIKeyParams) error {
			persisted = params
			return nil
		},
	}
	svc := NewPredictionService(silentLogger(), repo, &mockWalletClient{})

	expiresAt := time.Now().UTC().Add(2 * time.Hour)
	response, err := svc.IssueBotAPIKey(context.Background(), models.AuthClaims{
		UserID: "550e8400-e29b-41d4-a716-446655440000",
		Role:   "admin",
	}, &models.IssuePredictionBotAPIKeyRequest{
		AccountKey:  "acct-demo",
		DisplayName: "Demo Bot",
		Scopes:      []string{" READ:markets ", "trade:prediction", "trade:prediction"},
		ExpiresAt:   &expiresAt,
	})
	if err != nil {
		t.Fatalf("IssueBotAPIKey() error = %v", err)
	}
	if response == nil || response.Token == "" || response.KeyID == "" {
		t.Fatalf("unexpected response: %+v", response)
	}
	if persisted.KeyID != response.KeyID {
		t.Fatalf("expected key id %s, got %s", response.KeyID, persisted.KeyID)
	}
	if persisted.AccountKey != "acct-demo" || persisted.DisplayName != "Demo Bot" {
		t.Fatalf("unexpected persisted identity fields: %+v", persisted)
	}
	if len(persisted.Scopes) != 2 || persisted.Scopes[0] != "read:markets" || persisted.Scopes[1] != "trade:prediction" {
		t.Fatalf("unexpected scopes: %+v", persisted.Scopes)
	}
	if persisted.TokenHash == "" || persisted.TokenHash == response.Token {
		t.Fatalf("expected hashed token, got %+v", persisted)
	}
	if persisted.ExpiresAt == nil || !persisted.ExpiresAt.Equal(expiresAt) {
		t.Fatalf("unexpected expires_at: %+v", persisted.ExpiresAt)
	}
}

func TestIssueBotAPIKeyRequiresAdmin(t *testing.T) {
	svc := NewPredictionService(silentLogger(), &mockRepository{}, &mockWalletClient{})
	_, err := svc.IssueBotAPIKey(context.Background(), models.AuthClaims{
		UserID: "user-1",
		Role:   "trader",
	}, &models.IssuePredictionBotAPIKeyRequest{
		AccountKey:  "acct-demo",
		DisplayName: "Demo Bot",
		Scopes:      []string{"read:markets"},
	})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestListAdminOrdersBlocksUnauthorized(t *testing.T) {
	svc := NewPredictionService(silentLogger(), &mockRepository{}, &mockWalletClient{})

	_, err := svc.ListAdminOrders(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, models.AdminOrderFilters{})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestExecuteLifecycleAuthorization(t *testing.T) {
	repo := &mockRepository{
		getMarketDetailFn: func(_ context.Context, marketID string) (*models.PredictionMarketDetailResponse, error) {
			return &models.PredictionMarketDetailResponse{Market: &models.PredictionMarketView{MarketID: marketID, Status: "open"}}, nil
		},
		executeLifecycleFn: func(_ context.Context, cmd repository.LifecycleCommand) (*models.PredictionMarketDetailResponse, error) {
			return &models.PredictionMarketDetailResponse{Market: &models.PredictionMarketView{MarketID: cmd.MarketID, Status: cmd.Action}}, nil
		},
	}
	svc := NewPredictionService(silentLogger(), repo, &mockWalletClient{})

	tests := []struct {
		name      string
		actor     models.AuthClaims
		action    string
		outcomeID string
		wantErr   error
	}{
		{name: "user cannot suspend", actor: models.AuthClaims{UserID: "u1", Role: "user"}, action: "suspend", wantErr: ErrForbidden},
		{name: "trader can suspend", actor: models.AuthClaims{UserID: "u2", Role: "trader"}, action: "suspend"},
		{name: "trader cannot resolve", actor: models.AuthClaims{UserID: "u2", Role: "trader"}, action: "resolve", outcomeID: "outcome-1", wantErr: ErrForbidden},
		{name: "admin can resolve", actor: models.AuthClaims{UserID: "u3", Role: "admin"}, action: "resolve", outcomeID: "outcome-1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := svc.ExecuteLifecycle(context.Background(), tt.actor, repository.LifecycleCommand{Action: tt.action, MarketID: "market-1", OutcomeID: tt.outcomeID})
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("ExecuteLifecycle() error = %v, want %v", err, tt.wantErr)
			}
		})
	}
}

func silentLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func stringPtr(value string) *string {
	return &value
}
